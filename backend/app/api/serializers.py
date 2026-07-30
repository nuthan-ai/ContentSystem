"""Item/Run ORM -> API contract dict serializers (docs/API_CONTRACT.md)."""
from __future__ import annotations

from sqlmodel import Session, select

from ..models import Evaluation, Item, Run


def serialize_run(run: Run) -> dict:
    return {
        "id": run.id,
        "started_at": run.started_at.isoformat(),
        "finished_at": run.finished_at.isoformat() if run.finished_at else None,
        "status": run.status.value if hasattr(run.status, "value") else run.status,
        "stage": run.stage.value if hasattr(run.stage, "value") else run.stage,
        "error": run.error,
        "counts": run.counts,
        "model_used": run.model_used,
        "tokens_used": run.tokens_used,
        "est_cost_usd": run.est_cost_usd,
    }


def serialize_evaluation(ev: Evaluation | None) -> dict | None:
    if ev is None:
        return None
    return {
        "educational_value": ev.educational_value,
        "beginner_friendliness": ev.beginner_friendliness,
        "community_interest": ev.community_interest,
        "originality": ev.originality,
        "brand_relevance": ev.brand_relevance,
        "virality": ev.virality,
        "competition": ev.competition,
        "urgency": ev.urgency,
        "summary": ev.summary,
        "why_it_matters": ev.why_it_matters,
        "reasoning": ev.reasoning,
        "recommendation": ev.recommendation,
    }


def serialize_item(item: Item, evaluation: Evaluation | None) -> dict:
    return {
        "id": item.id,
        "title": item.title,
        "url": item.url,
        "source": item.source,
        "source_name": item.source_name,
        "category": item.category.value if hasattr(item.category, "value") else item.category,
        "snippet": item.snippet,
        "published_at": item.published_at.isoformat() if item.published_at else None,
        "metrics": item.metrics,
        "signals": item.signals,
        "evaluation": serialize_evaluation(evaluation),
        "composite_score": item.composite_score,
        "hidden_gem": item.hidden_gem,
    }


def evaluations_by_item_id(session: Session, item_ids: list[int]) -> dict[int, Evaluation]:
    if not item_ids:
        return {}
    rows = session.exec(select(Evaluation).where(Evaluation.item_id.in_(item_ids))).all()
    return {e.item_id: e for e in rows}
