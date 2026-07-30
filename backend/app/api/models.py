from __future__ import annotations

from fastapi import APIRouter

from ..llm.openrouter import list_models

router = APIRouter(prefix="/api/models", tags=["models"])


@router.get("")
async def get_models():
    return await list_models()
