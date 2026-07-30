"""OpenRouter client — the only LLM touchpoint in the system.

Key precedence: Setting table override > .env OPENROUTER_API_KEY.
"""
from __future__ import annotations

import time
from typing import Any

import httpx

from ..config import settings as app_settings

OPENROUTER_BASE = "https://openrouter.ai/api/v1"
HTTP_TIMEOUT = 60.0

_models_cache: dict[str, Any] = {"data": None, "fetched_at": 0.0}
MODELS_CACHE_TTL = 3600


def get_api_key(session=None) -> str:
    if session is not None:
        try:
            from ..models import Setting

            row = session.get(Setting, "openrouter_api_key")
            if row and row.value:
                return row.value
        except Exception:
            pass
    return app_settings.openrouter_api_key


def get_model(session=None) -> str:
    if session is not None:
        try:
            from ..models import Setting

            row = session.get(Setting, "openrouter_model")
            if row and row.value:
                return row.value
        except Exception:
            pass
    return app_settings.openrouter_model


async def list_models() -> list[dict]:
    """GET /models is public — no API key required. Cached in-memory 1h."""
    now = time.time()
    if _models_cache["data"] is not None and now - _models_cache["fetched_at"] < MODELS_CACHE_TTL:
        return _models_cache["data"]

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
        resp = await client.get(f"{OPENROUTER_BASE}/models")
        resp.raise_for_status()
        raw = resp.json().get("data", [])

    models = []
    for m in raw:
        pricing = m.get("pricing", {})
        try:
            prompt_price = float(pricing.get("prompt", 0)) * 1_000_000
            completion_price = float(pricing.get("completion", 0)) * 1_000_000
        except (TypeError, ValueError):
            prompt_price = completion_price = 0.0
        models.append(
            {
                "id": m.get("id", ""),
                "name": m.get("name", m.get("id", "")),
                "prompt_price": round(prompt_price, 4),
                "completion_price": round(completion_price, 4),
                "context_length": m.get("context_length", 0),
            }
        )
    _models_cache["data"] = models
    _models_cache["fetched_at"] = now
    return models


async def _model_pricing(model_id: str) -> tuple[float, float]:
    models = await list_models()
    for m in models:
        if m["id"] == model_id:
            return m["prompt_price"], m["completion_price"]
    return 0.0, 0.0


class OpenRouterError(Exception):
    pass


async def chat_completion_json(
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    json_schema: dict,
    schema_name: str = "response",
) -> tuple[dict | None, int, float]:
    """Returns (parsed_json_or_None, tokens_used, est_cost_usd).
    Tries response_format=json_schema first, falls back to json_object with the
    schema embedded in the prompt if the model rejects structured outputs.
    Never raises — callers must handle None (skip this batch)."""
    if not api_key:
        return None, 0, 0.0

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    async def _attempt(response_format: dict, prompt_suffix: str = "") -> httpx.Response:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            return await client.post(
                f"{OPENROUTER_BASE}/chat/completions",
                headers=headers,
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt + prompt_suffix},
                    ],
                    "response_format": response_format,
                },
            )

    import json as _json

    resp = None
    for attempt in range(2):
        try:
            resp = await _attempt(
                {
                    "type": "json_schema",
                    "json_schema": {"name": schema_name, "strict": True, "schema": json_schema},
                }
            )
            if resp.status_code < 400:
                break
        except Exception:
            resp = None
        # fallback: json_object with schema described in the prompt
        try:
            resp = await _attempt(
                {"type": "json_object"},
                prompt_suffix=f"\n\nRespond with ONLY valid JSON matching this schema:\n{_json.dumps(json_schema)}",
            )
            if resp.status_code < 400:
                break
        except Exception:
            resp = None
        if attempt == 0:
            continue
    if resp is None or resp.status_code >= 400:
        return None, 0, 0.0

    try:
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        parsed = _json.loads(content)
        usage = data.get("usage", {})
        tokens = usage.get("total_tokens", 0)
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        prompt_price, completion_price = await _model_pricing(model)
        cost = (prompt_tokens / 1_000_000) * prompt_price + (
            completion_tokens / 1_000_000
        ) * completion_price
        return parsed, tokens, round(cost, 6)
    except Exception:
        return None, 0, 0.0
