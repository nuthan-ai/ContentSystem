"""Composite scoring + dashboard section composition.

composite = 0.30*educational + 0.25*virality + 0.15*community + 0.15*originality
            + 0.15*brand_relevance − competition_penalty(low=0, medium=0.5, high=1.0)

When no LLM evaluation ran (no API key), composite falls back to a signals-only
blend so the pipeline still produces a ranked dashboard.
"""
from __future__ import annotations

from sqlmodel import Session, select

from ..models import Category, Evaluation, Item

COMPETITION_PENALTY = {"low": 0.0, "medium": 0.5, "high": 1.0}

SECTION_CAPS = {
    Category.breaking_news: 3,
    Category.concept: 5,
    Category.utility: 5,
    Category.workflow: 5,
    Category.learning: 5,
}
HIDDEN_GEMS_CAP = 3
TOP10_CAP = 10

# An item counts as a "hidden gem" candidate when its raw engagement is low
# relative to peers but its composite score is still high — i.e. it's good but
# hasn't been widely seen yet.
HIDDEN_GEM_ENGAGEMENT_PERCENTILE = 0.4  # bottom 40% raw engagement
HIDDEN_GEM_COMPOSITE_MIN = 6.5


def _raw_engagement(item: Item) -> float:
    m = item.metrics
    return float(
        m.get("points", 0) + m.get("stars", 0) * 0.5 + m.get("upvotes", 0)
        + m.get("comments", 0) * 2
    )


def compute_composite(item: Item, evaluation: Evaluation | None) -> float:
    signals = item.signals
    competition = signals.get("competition_level", "medium")
    penalty = COMPETITION_PENALTY.get(competition, 0.5)

    if evaluation is not None:
        raw = (
            0.30 * evaluation.educational_value
            + 0.25 * evaluation.virality
            + 0.15 * evaluation.community_interest
            + 0.15 * evaluation.originality
            + 0.15 * evaluation.brand_relevance
        )
    else:
        # Signals-only fallback (no LLM key configured): blend measured signals,
        # weighting virality and momentum since qualitative axes are unavailable.
        virality = signals.get("virality_score", 5.0)
        momentum = min(signals.get("momentum", 1), 4) * 2.5  # scale 1-4 -> ~2.5-10
        raw = 0.6 * virality + 0.4 * momentum

    score = max(0.0, min(10.0, raw - penalty))
    return round(score, 2)


def rank_run(session: Session, run_id: int) -> dict:
    """Scores every Item for this run, sets composite_score + hidden_gem, and
    returns the section groupings (category name -> list[Item]) plus hidden_gems
    and top10, all as lists of Item ORM objects (caller serializes to TopicOut)."""
    items = session.exec(select(Item).where(Item.run_id == run_id)).all()
    evaluations = session.exec(
        select(Evaluation).where(Evaluation.item_id.in_([i.id for i in items] or [-1]))
    ).all()
    eval_by_item = {e.item_id: e for e in evaluations}

    for item in items:
        evaluation = eval_by_item.get(item.id)
        item.composite_score = compute_composite(item, evaluation)
        session.add(item)

    # Hidden gem detection: bottom-percentile raw engagement + high composite,
    # computed per-category so a quiet arXiv paper isn't compared to HN points.
    by_category: dict[Category, list[Item]] = {}
    for item in items:
        if item.category:
            by_category.setdefault(item.category, []).append(item)

    hidden_gem_candidates: list[Item] = []
    for category, cat_items in by_category.items():
        engagements = sorted(_raw_engagement(i) for i in cat_items)
        if not engagements:
            continue
        cutoff_idx = max(0, int(len(engagements) * HIDDEN_GEM_ENGAGEMENT_PERCENTILE) - 1)
        engagement_cutoff = engagements[cutoff_idx]
        for item in cat_items:
            if (
                item.composite_score >= HIDDEN_GEM_COMPOSITE_MIN
                and _raw_engagement(item) <= engagement_cutoff
            ):
                hidden_gem_candidates.append(item)

    hidden_gem_candidates.sort(key=lambda i: i.composite_score, reverse=True)
    hidden_gems = hidden_gem_candidates[:HIDDEN_GEMS_CAP]
    hidden_gem_ids = {i.id for i in hidden_gems}
    for item in hidden_gems:
        item.hidden_gem = True
        session.add(item)

    session.commit()

    sections: dict[str, list[Item]] = {}
    for category, cap in SECTION_CAPS.items():
        cat_items = sorted(
            by_category.get(category, []), key=lambda i: i.composite_score, reverse=True
        )
        sections[category.value] = cat_items[:cap]

    top10 = sorted(items, key=lambda i: i.composite_score, reverse=True)[:TOP10_CAP]

    return {
        "sections": sections,
        "hidden_gems": hidden_gems,
        "top10": top10,
    }
