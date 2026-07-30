from __future__ import annotations

from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel
from sqlmodel import Session

from ..collectors.reddit import DEFAULT_SUBREDDITS
from ..collectors.rss import DEFAULT_FEEDS
from ..config import settings as app_settings
from ..db import engine
from ..models import Setting

router = APIRouter(prefix="/api/settings", tags=["settings"])

DEFAULT_SOURCES_ENABLED = {
    "rss": True, "hackernews": True, "github": True, "arxiv": True, "reddit": True,
}
DEFAULT_KEYWORD_RULES: dict[str, list[str]] = {}


def _get(session: Session, key: str, default):
    row = session.get(Setting, key)
    return row.value if row else default


def _set(session: Session, key: str, value):
    import json

    row = session.get(Setting, key)
    if row:
        row.value_json = json.dumps(value)
    else:
        row = Setting(key=key, value_json=json.dumps(value))
    session.add(row)


def seed_defaults() -> None:
    """Called on startup if the Setting table is empty."""
    with Session(engine) as session:
        if session.get(Setting, "feeds") is None:
            _set(session, "feeds", DEFAULT_FEEDS)
        if session.get(Setting, "subreddits") is None:
            _set(session, "subreddits", DEFAULT_SUBREDDITS)
        if session.get(Setting, "sources_enabled") is None:
            _set(session, "sources_enabled", DEFAULT_SOURCES_ENABLED)
        if session.get(Setting, "llm_item_cap") is None:
            _set(session, "llm_item_cap", app_settings.llm_item_cap)
        if session.get(Setting, "category_cap") is None:
            _set(session, "category_cap", 15)
        if session.get(Setting, "openrouter_model") is None:
            _set(session, "openrouter_model", app_settings.openrouter_model)
        if session.get(Setting, "keyword_rules") is None:
            _set(session, "keyword_rules", DEFAULT_KEYWORD_RULES)
        session.commit()


def _mask_key(key: str) -> str:
    if not key:
        return ""
    if len(key) <= 8:
        return "*" * len(key)
    return f"{key[:7]}...{key[-4:]}"


def _current_settings_out(session: Session) -> dict:
    api_key = _get(session, "openrouter_api_key", "") or app_settings.openrouter_api_key
    return {
        "openrouter_model": _get(session, "openrouter_model", app_settings.openrouter_model),
        "api_key_set": bool(api_key),
        "api_key_masked": _mask_key(api_key),
        "llm_item_cap": _get(session, "llm_item_cap", app_settings.llm_item_cap),
        "feeds": _get(session, "feeds", DEFAULT_FEEDS),
        "subreddits": _get(session, "subreddits", DEFAULT_SUBREDDITS),
        "sources_enabled": _get(session, "sources_enabled", DEFAULT_SOURCES_ENABLED),
    }


@router.get("")
def get_settings():
    with Session(engine) as session:
        return _current_settings_out(session)


class SettingsIn(BaseModel):
    openrouter_model: str | None = None
    openrouter_api_key: str | None = None
    llm_item_cap: int | None = None
    feeds: list[dict[str, Any]] | None = None
    subreddits: list[dict[str, Any]] | None = None
    sources_enabled: dict[str, bool] | None = None


@router.put("")
def update_settings(payload: SettingsIn):
    with Session(engine) as session:
        if payload.openrouter_model is not None:
            _set(session, "openrouter_model", payload.openrouter_model)
        if payload.openrouter_api_key is not None:
            _set(session, "openrouter_api_key", payload.openrouter_api_key)
        if payload.llm_item_cap is not None:
            _set(session, "llm_item_cap", payload.llm_item_cap)
        if payload.feeds is not None:
            _set(session, "feeds", payload.feeds)
        if payload.subreddits is not None:
            _set(session, "subreddits", payload.subreddits)
        if payload.sources_enabled is not None:
            _set(session, "sources_enabled", payload.sources_enabled)
        session.commit()
        return _current_settings_out(session)
