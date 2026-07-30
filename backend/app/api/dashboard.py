from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select

from ..db import engine
from ..models import Item, Run, RunStatus
from .serializers import evaluations_by_item_id, serialize_item, serialize_run

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("")
def get_dashboard(run_id: int | None = None):
    with Session(engine) as session:
        if run_id is not None:
            run = session.get(Run, run_id)
            if not run:
                raise HTTPException(status_code=404, detail="Run not found")
        else:
            run = session.exec(
                select(Run)
                .where(Run.status == RunStatus.completed)
                .order_by(Run.started_at.desc())
            ).first()
            if not run:
                raise HTTPException(status_code=404, detail="No completed run yet")

        items = session.exec(select(Item).where(Item.run_id == run.id)).all()
        evals = evaluations_by_item_id(session, [i.id for i in items])

        def section(category: str, cap: int) -> list[dict]:
            cat_items = sorted(
                (i for i in items if i.category == category),
                key=lambda i: i.composite_score,
                reverse=True,
            )[:cap]
            return [serialize_item(i, evals.get(i.id)) for i in cat_items]

        hidden_gems = sorted(
            (i for i in items if i.hidden_gem), key=lambda i: i.composite_score, reverse=True
        )[:3]
        top10 = sorted(items, key=lambda i: i.composite_score, reverse=True)[:10]

        return {
            "run": serialize_run(run),
            "breaking_news": section("breaking_news", 3),
            "concepts": section("concept", 5),
            "utilities": section("utility", 5),
            "workflows": section("workflow", 5),
            "learning": section("learning", 5),
            "hidden_gems": [serialize_item(i, evals.get(i.id)) for i in hidden_gems],
            "top10": [serialize_item(i, evals.get(i.id)) for i in top10],
        }
