"""LLM evaluation stage — scores ONLY qualitative axes (educational value,
beginner-friendliness, originality, brand relevance, community interest).
Virality and competition come from signals.py (measured) and are passed in as
context; the LLM's job is judgment + writing the reasoning/recommendation.

If no API key is configured, this stage is skipped entirely — the pipeline
must still complete, ranking on measured signals alone (see rank.py fallback)."""
from __future__ import annotations

import asyncio

from sqlmodel import Session

from ..llm.openrouter import chat_completion_json, get_api_key, get_model
from ..models import Evaluation, Item

BATCH_SIZE = 10

SYSTEM_PROMPT = """You are a research analyst for an AI content creator. You judge \
AI news, tools, and concepts for content-creation potential. You will be given \
already-measured trend/competition data for each item — treat those numbers as \
ground truth, do not re-estimate them. Your job is to score the QUALITATIVE axes \
and write concise, specific reasoning (never generic filler)."""

ITEM_SCHEMA = {
    "type": "object",
    "properties": {
        "item_id": {"type": "integer"},
        "educational_value": {"type": "integer", "minimum": 1, "maximum": 10},
        "beginner_friendliness": {"type": "integer", "minimum": 1, "maximum": 10},
        "community_interest": {"type": "integer", "minimum": 1, "maximum": 10},
        "originality": {"type": "integer", "minimum": 1, "maximum": 10},
        "brand_relevance": {"type": "integer", "minimum": 1, "maximum": 10},
        "urgency": {"type": "string", "enum": ["now", "this_week", "evergreen"]},
        "summary": {"type": "string"},
        "why_it_matters": {"type": "string"},
        "reasoning": {"type": "string"},
        "recommendation": {"type": "string"},
    },
    "required": [
        "item_id", "educational_value", "beginner_friendliness", "community_interest",
        "originality", "brand_relevance", "urgency", "summary", "why_it_matters",
        "reasoning", "recommendation",
    ],
    "additionalProperties": False,
}

BATCH_SCHEMA = {
    "type": "object",
    "properties": {"evaluations": {"type": "array", "items": ITEM_SCHEMA}},
    "required": ["evaluations"],
    "additionalProperties": False,
}


def _item_prompt_block(item: Item) -> str:
    signals = item.signals
    metrics = item.metrics
    return (
        f"item_id: {item.id}\n"
        f"title: {item.title}\n"
        f"category: {item.category}\n"
        f"source: {item.source_name}\n"
        f"snippet: {item.snippet[:300]}\n"
        f"measured metrics: {metrics}\n"
        f"measured virality_score (1-10): {signals.get('virality_score')}\n"
        f"measured competition_level: {signals.get('competition_level')}\n"
    )


async def evaluate_items(session: Session, items: list[Item]) -> tuple[int, float]:
    """Runs OpenRouter evaluation in batches. Returns (tokens_used, est_cost_usd).
    Mutates the DB by inserting Evaluation rows and updating Item.status/composite
    prerequisites. If no key is set, returns (0, 0.0) immediately — caller checks
    whether any evaluations exist to decide fallback ranking."""
    api_key = get_api_key(session)
    if not api_key:
        return 0, 0.0

    model = get_model(session)
    total_tokens = 0
    total_cost = 0.0

    for i in range(0, len(items), BATCH_SIZE):
        batch = items[i : i + BATCH_SIZE]
        user_prompt = "Evaluate these items:\n\n" + "\n---\n".join(
            _item_prompt_block(it) for it in batch
        )
        parsed, tokens, cost = await chat_completion_json(
            api_key, model, SYSTEM_PROMPT, user_prompt, BATCH_SCHEMA, "batch_evaluation"
        )
        total_tokens += tokens
        total_cost += cost
        if not parsed:
            continue  # skip this batch on repeated failure, don't fail the run

        by_id = {it.id: it for it in batch}
        for ev in parsed.get("evaluations", []):
            item = by_id.get(ev.get("item_id"))
            if not item:
                continue
            signals = item.signals
            evaluation = Evaluation(
                item_id=item.id,
                educational_value=ev.get("educational_value", 5),
                beginner_friendliness=ev.get("beginner_friendliness", 5),
                community_interest=ev.get("community_interest", 5),
                originality=ev.get("originality", 5),
                brand_relevance=ev.get("brand_relevance", 5),
                virality=round(signals.get("virality_score", 5)),
                competition=signals.get("competition_level", "medium"),
                urgency=ev.get("urgency", "this_week"),
                summary=ev.get("summary", ""),
                why_it_matters=ev.get("why_it_matters", ""),
                reasoning=ev.get("reasoning", ""),
                recommendation=ev.get("recommendation", ""),
                model_used=model,
            )
            session.add(evaluation)
            from ..models import ItemStatus

            item.status = ItemStatus.evaluated
            session.add(item)
        session.commit()

    return total_tokens, round(total_cost, 6)
