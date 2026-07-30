"""Reddit collector via the public JSON endpoints (no login, no key; rate-limited
politely and tolerant of 429s since Reddit throttles anonymous traffic aggressively)."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import httpx

from .base import HTTP_TIMEOUT, RawItem, run_standalone

DEFAULT_SUBREDDITS = [
    {"name": "LocalLLaMA", "enabled": True},
    {"name": "ClaudeAI", "enabled": True},
    {"name": "MachineLearning", "enabled": True},
    {"name": "artificial", "enabled": True},
    {"name": "mcp", "enabled": True},
]

# Distinct UA per Reddit's API rules — generic UAs get rate-limited harder.
REDDIT_USER_AGENT = "ContentSystem-Research/0.1 by u/research-dashboard (personal, low-volume)"


async def _fetch_subreddit(client: httpx.AsyncClient, name: str) -> list[RawItem]:
    try:
        resp = await client.get(
            f"https://www.reddit.com/r/{name}/hot.json",
            params={"limit": 25},
            headers={"User-Agent": REDDIT_USER_AGENT},
        )
        if resp.status_code == 429:
            print(f"[reddit] r/{name} rate-limited (429), skipping this run")
            return []
        resp.raise_for_status()
        children = resp.json().get("data", {}).get("children", [])
        items = []
        for child in children:
            d = child.get("data", {})
            if d.get("stickied"):
                continue
            title = (d.get("title") or "").strip()
            url = d.get("url_overridden_by_dest") or f"https://reddit.com{d.get('permalink', '')}"
            if not title or not url:
                continue
            created = d.get("created_utc")
            published_at = (
                datetime.fromtimestamp(created, tz=timezone.utc) if created else None
            )
            items.append(
                RawItem(
                    source="reddit",
                    source_name=f"r/{name}",
                    url=url,
                    title=title,
                    snippet=(d.get("selftext") or "")[:500],
                    published_at=published_at,
                    metrics={
                        "upvotes": d.get("ups") or 0,
                        "comments": d.get("num_comments") or 0,
                        "upvote_ratio": d.get("upvote_ratio") or 0,
                    },
                )
            )
        return items
    except Exception as e:
        print(f"[reddit] r/{name} failed: {type(e).__name__}: {e}")
        return []


async def collect(cfg: dict | None = None) -> list[RawItem]:
    subs = (cfg or {}).get("subreddits") or DEFAULT_SUBREDDITS
    names = [s["name"] for s in subs if s.get("enabled", True)]
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
        results = []
        for name in names:
            results.append(await _fetch_subreddit(client, name))
            await asyncio.sleep(1.0)  # polite spacing between anonymous requests
    return [item for sub in results for item in sub]


if __name__ == "__main__":
    run_standalone(collect())
