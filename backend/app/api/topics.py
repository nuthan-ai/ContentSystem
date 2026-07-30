from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select

from ..db import engine
from ..models import Evaluation, Item
from .serializers import serialize_item

router = APIRouter(prefix="/api/topics", tags=["topics"])


@router.get("/{item_id}")
def get_topic(item_id: int):
    with Session(engine) as session:
        item = session.get(Item, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Topic not found")
        evaluation = session.exec(
            select(Evaluation).where(Evaluation.item_id == item_id)
        ).first()
        return serialize_item(item, evaluation)
