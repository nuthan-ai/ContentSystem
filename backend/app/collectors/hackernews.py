"""Hacker News collector via the Algolia HN Search API (free, no key)."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import httpx

from .base import HTTP_TIMEOUT, USER_AGENT, RawItem, run_standalone

ALGOLIA_BASE = "https://hn.algolia.com/api/v1"

DEFAULT_QUERIES = [
    "AI", "LLM", "agent", "GPT", "Claude", "OpenAI", "Anthropic",
    "machine learning", "MCP", "RAG",
]

WINDOW_HOURS = 48


async def _search(client: httpx.AsyncClient, query: str, since_ts: int) -> list[dict]:
    try:
        resp = await client.get(
            f"{ALGOLIA_BASE}/search_by_date",
            params={
                "query": query,
                "tags": "story",
                "numericFilters": f"created_at_i>{since_ts}",
                "hitsPerPage": 30,
            },
            headers={"User-Agent": USER_AGENT},
        )
        resp.raise_for_status()
        return resp.json().get("hits", [])
    except Exception as e:
        print(f"[hackernews] query '{query}' failed: {type(e).__name__}: {e}")
        return []


def _to_item(hit: dict) -> RawItem | None:
    url = hit.get("url") or f"https://news.ycombinator.com/item?id={hit.get('objectID')}"
    title = (hit.get("title") or "").strip()
    if not title:
        return None
    created_i = hit.get("created_at_i")
    published_at = (
        datetime.fromtimestamp(created_i, tz=timezone.utc) if created_i else None
    )
    points = hit.get("points") or 0
    comments = hit.get("num_comments") or 0
    return RawItem(
        source="hackernews",
        source_name="Hacker News",
        url=url,
        title=title,
        snippet=hit.get("story_text") or "",
        published_at=published_at,
        metrics={"points": points, "comments": comments},
    )


async def collect(cfg: dict | None = None) -> list[RawItem]:
    queries = (cfg or {}).get("hn_queries") or DEFAULT_QUERIES
    since_ts = int(datetime.now(tz=timezone.utc).timestamp()) - WINDOW_HOURS * 3600
    seen: dict[str, RawItem] = {}
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
        results = await asyncio.gather(*(_search(client, q, since_ts) for q in queries))
    for hits in results:
        for hit in hits:
            item = _to_item(hit)
            if item and item.url not in seen:
                seen[item.url] = item
    return list(seen.values())


if __name__ == "__main__":
    run_standalone(collect())
