"""GitHub trending-repo collector via the public search API (free; token optional
for a higher rate limit — public data only, no private repo access)."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import httpx

from .base import HTTP_TIMEOUT, USER_AGENT, RawItem, run_standalone

SEARCH_URL = "https://api.github.com/search/repositories"

AI_TOPICS = ["llm", "agents", "mcp", "rag", "ai", "llm-agent", "generative-ai"]
WINDOW_DAYS = 14


def _headers() -> dict:
    headers = {"User-Agent": USER_AGENT, "Accept": "application/vnd.github+json"}
    try:
        from ..config import settings

        if settings.github_token:
            headers["Authorization"] = f"Bearer {settings.github_token}"
    except Exception:
        pass
    return headers


async def _search_topic(client: httpx.AsyncClient, topic: str, since: str) -> list[dict]:
    try:
        resp = await client.get(
            SEARCH_URL,
            params={
                "q": f"topic:{topic} created:>{since}",
                "sort": "stars",
                "order": "desc",
                "per_page": 20,
            },
            headers=_headers(),
        )
        if resp.status_code == 403:
            print("[github] rate-limited (403) — consider setting GITHUB_TOKEN")
            return []
        resp.raise_for_status()
        return resp.json().get("items", [])
    except Exception as e:
        print(f"[github] topic '{topic}' failed: {type(e).__name__}: {e}")
        return []


def _to_item(repo: dict) -> RawItem | None:
    url = repo.get("html_url")
    name = repo.get("full_name")
    if not url or not name:
        return None
    created_at = repo.get("created_at")
    published_at = None
    age_days = 1.0
    if created_at:
        published_at = datetime.strptime(created_at, "%Y-%m-%dT%H:%M:%SZ").replace(
            tzinfo=timezone.utc
        )
        age_days = max((datetime.now(tz=timezone.utc) - published_at).total_seconds() / 86400, 1.0)
    stars = repo.get("stargazers_count") or 0
    return RawItem(
        source="github",
        source_name="GitHub",
        url=url,
        title=name,
        snippet=(repo.get("description") or "")[:500],
        published_at=published_at,
        metrics={
            "stars": stars,
            "forks": repo.get("forks_count") or 0,
            "stars_per_day": round(stars / age_days, 2),
        },
    )


async def collect(cfg: dict | None = None) -> list[RawItem]:
    topics = (cfg or {}).get("github_topics") or AI_TOPICS
    since = (datetime.now(tz=timezone.utc).date().isoformat())
    from datetime import timedelta

    since = (datetime.now(tz=timezone.utc) - timedelta(days=WINDOW_DAYS)).date().isoformat()
    seen: dict[str, RawItem] = {}
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
        results = await asyncio.gather(*(_search_topic(client, t, since) for t in topics))
    for repos in results:
        for repo in repos:
            item = _to_item(repo)
            if item and item.url not in seen:
                seen[item.url] = item
    return list(seen.values())


if __name__ == "__main__":
    run_standalone(collect())
