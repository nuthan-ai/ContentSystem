"""Runs the full pipeline (collect -> categorize -> filter -> signals -> evaluate
-> rank) for one Run, updating DB state and streaming progress events over an
in-process asyncio.Queue per run_id (consumed by the SSE endpoint)."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from sqlmodel import Session, select

from .collectors import arxiv, github_trending, hackernews, reddit, rss
from .collectors.base import RawItem
from .db import engine
from .llm.openrouter import get_api_key
from .models import Item, ItemStatus, Run, RunStatus, Setting, Stage
from .pipeline.categorize import categorize_all
from .pipeline.evaluate import evaluate_items
from .pipeline.filter import filter_items
from .pipeline.rank import rank_run
from .pipeline.signals import compute_signals

COLLECTOR_MODULES = {
    "rss": rss,
    "hackernews": hackernews,
    "github": github_trending,
    "arxiv": arxiv,
    "reddit": reddit,
}

# run_id -> asyncio.Queue[dict] ; presence of a key means the run is (or was)
# active in this process. Cleared after the consumer reads the final event.
_progress_queues: dict[int, asyncio.Queue] = {}
_active_run_id: int | None = None


def is_run_active() -> bool:
    return _active_run_id is not None


def get_active_run_id() -> int | None:
    return _active_run_id


def get_queue(run_id: int) -> asyncio.Queue | None:
    return _progress_queues.get(run_id)


def _get_setting(session: Session, key: str, default):
    row = session.get(Setting, key)
    return row.value if row else default


async def _emit(run_id: int, stage: Stage, message: str, counts: dict, status: RunStatus, done: bool, error: str | None = None):
    queue = _progress_queues.get(run_id)
    event = {
        "stage": stage.value,
        "message": message,
        "counts": counts,
        "done": done,
        "status": status.value,
    }
    if error:
        event["error"] = error
    if queue:
        await queue.put(event)


def _load_settings_dict(session: Session) -> dict:
    return {
        "feeds": _get_setting(session, "feeds", None),
        "subreddits": _get_setting(session, "subreddits", None),
        "sources_enabled": _get_setting(
            session, "sources_enabled",
            {"rss": True, "hackernews": True, "github": True, "arxiv": True, "reddit": True},
        ),
        "llm_item_cap": _get_setting(session, "llm_item_cap", 60),
        "category_cap": _get_setting(session, "category_cap", 15),
        "keyword_rules": _get_setting(session, "keyword_rules", None),
    }


async def run_pipeline(run_id: int) -> None:
    global _active_run_id
    _active_run_id = run_id
    _progress_queues[run_id] = asyncio.Queue()

    with Session(engine) as session:
        run = session.get(Run, run_id)
        try:
            cfg = _load_settings_dict(session)
            sources_enabled = cfg["sources_enabled"]

            # --- Stage 1: collect ---
            run.stage = Stage.collecting
            session.add(run)
            session.commit()
            per_source: dict[str, int] = {}
            all_items: list[RawItem] = []
            for name, module in COLLECTOR_MODULES.items():
                if not sources_enabled.get(name, True):
                    continue
                try:
                    items = await module.collect(cfg)
                except Exception as e:
                    items = []
                    print(f"[orchestrator] collector '{name}' raised: {e}")
                per_source[name] = len(items)
                all_items.extend(items)
            counts = {"collected": len(all_items), "per_source": per_source}
            run.set_counts(counts)
            session.add(run)
            session.commit()
            await _emit(
                run_id, Stage.collecting,
                f"Collected {len(all_items)} items from {len(per_source)} sources",
                counts, RunStatus.running, False,
            )

            # --- Stage 2: categorize ---
            run.stage = Stage.categorizing
            session.add(run)
            session.commit()
            categorized = categorize_all(all_items, cfg.get("keyword_rules"))
            await _emit(run_id, Stage.categorizing, f"Categorized {len(categorized)} items", counts, RunStatus.running, False)

            # --- Stage 3: filter ---
            run.stage = Stage.filtering
            session.add(run)
            session.commit()
            survivors = filter_items(categorized, category_cap=cfg["category_cap"])
            counts["filtered"] = len(survivors)
            run.set_counts(counts)
            session.add(run)
            session.commit()
            await _emit(
                run_id, Stage.filtering,
                f"Filtered down to {len(survivors)} high-signal candidates",
                counts, RunStatus.running, False,
            )

            # --- Stage 4: signals ---
            run.stage = Stage.signals
            session.add(run)
            session.commit()
            signals_map = await compute_signals(survivors)
            await _emit(run_id, Stage.signals, "Computed trend + competition signals", counts, RunStatus.running, False)

            # Persist Items now (post-filter survivors only get full rows;
            # filtered-out items are not stored — they carry no downstream value).
            db_items: list[Item] = []
            for raw_item, category in survivors:
                item = Item(
                    run_id=run_id,
                    source=raw_item.source,
                    source_name=raw_item.source_name,
                    url=raw_item.url,
                    title=raw_item.title,
                    snippet=raw_item.snippet,
                    published_at=raw_item.published_at,
                    category=category,
                    status=ItemStatus.collected,
                )
                item.set_metrics(raw_item.metrics)
                item.set_signals(signals_map.get(id(raw_item), {}))
                session.add(item)
                db_items.append(item)
            session.commit()
            for item in db_items:
                session.refresh(item)

            # --- Stage 5: evaluate ---
            run.stage = Stage.evaluating
            session.add(run)
            session.commit()
            api_key = get_api_key(session)
            llm_cap = cfg["llm_item_cap"]
            eval_candidates = sorted(
                db_items, key=lambda i: i.signals.get("virality_score", 5), reverse=True
            )[:llm_cap]
            if api_key:
                tokens, cost = await evaluate_items(session, eval_candidates)
                run.tokens_used = tokens
                run.est_cost_usd = cost
                from .llm.openrouter import get_model

                run.model_used = get_model(session)
                counts["evaluated"] = sum(1 for i in eval_candidates if i.status == ItemStatus.evaluated)
                msg = f"Evaluated {counts['evaluated']} items via OpenRouter (~${cost:.4f})"
            else:
                counts["evaluated"] = 0
                msg = "No OpenRouter API key configured — ranking on measured signals only"
            run.set_counts(counts)
            session.add(run)
            session.commit()
            await _emit(run_id, Stage.evaluating, msg, counts, RunStatus.running, False)

            # --- Stage 6: rank ---
            run.stage = Stage.ranking
            session.add(run)
            session.commit()
            rank_run(session, run_id)
            await _emit(run_id, Stage.ranking, "Ranked and composed dashboard sections", counts, RunStatus.running, False)

            # --- Done ---
            run.stage = Stage.done
            run.status = RunStatus.completed
            run.finished_at = datetime.now(timezone.utc)
            session.add(run)
            session.commit()
            await _emit(run_id, Stage.done, "Run complete", counts, RunStatus.completed, True)

        except Exception as e:
            run.status = RunStatus.failed
            run.error = str(e)
            run.finished_at = datetime.now(timezone.utc)
            session.add(run)
            session.commit()
            await _emit(run_id, run.stage, f"Run failed: {e}", run.counts, RunStatus.failed, True, error=str(e))
        finally:
            _active_run_id = None


def run_pipeline_sync(run_id: int) -> bool:
    """Headless entry point for Task Scheduler (backend/run_research.py)."""
    asyncio.run(run_pipeline(run_id))
    with Session(engine) as session:
        run = session.get(Run, run_id)
        return run is not None and run.status == RunStatus.completed
