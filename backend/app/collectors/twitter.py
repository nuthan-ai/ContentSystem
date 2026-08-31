"""X/Twitter collector via twikit — an unauthenticated-free API does not exist on
X anymore, so this authenticates as a real account using session cookies saved by
`backend/login_twitter.py`. Unofficial reverse-engineered client: violates X's ToS
on automation and can get the account locked. Deferred until cookies exist; never
raises so a locked/missing session degrades to 0 items like any other source."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from pathlib import Path

from .base import RawItem, run_standalone

DEFAULT_QUERIES = [
    {"name": "OpenAI", "query": "from:OpenAI", "enabled": True},
    {"name": "AnthropicAI", "query": "from:AnthropicAI", "enabled": True},
    {"name": "GoogleDeepMind", "query": "from:GoogleDeepMind", "enabled": True},
    {"name": "xai", "query": "from:xai", "enabled": True},
    {
        "name": "AI/LLM keyword search",
        "query": "(AI OR LLM OR \"machine learning\") min_faves:100 -is:retweet lang:en",
        "enabled": True,
    },
]

QUERY_ITEM_LIMIT = 20
DELAY_BETWEEN_QUERIES = 2.0  # polite spacing for an authenticated-but-unofficial client


def _cookies_path() -> Path:
    from ..config import settings

    return Path(settings.twitter_cookies_path)


async def _search(client, query: str) -> list[RawItem]:
    try:
        tweets = await client.search_tweet(query, product="Latest", count=QUERY_ITEM_LIMIT)
        items = []
        for t in tweets:
            text = (t.full_text or t.text or "").strip()
            if not text:
                continue
            url = f"https://x.com/{t.user.screen_name}/status/{t.id}"
            items.append(
                RawItem(
                    source="twitter",
                    source_name=f"@{t.user.screen_name}",
                    url=url,
                    title=text[:200],
                    snippet=text[:500],
                    published_at=(
                        t.created_at_datetime.replace(tzinfo=timezone.utc)
                        if getattr(t, "created_at_datetime", None)
                        else None
                    ),
                    metrics={
                        "likes": t.favorite_count or 0,
                        "retweets": t.retweet_count or 0,
                        "replies": t.reply_count or 0,
                    },
                )
            )
        return items
    except Exception as e:
        print(f"[twitter] query '{query}' failed: {type(e).__name__}: {e}")
        return []


async def collect(cfg: dict | None = None) -> list[RawItem]:
    cookies_path = _cookies_path()
    if not cookies_path.exists():
        print(
            f"[twitter] no session cookies at {cookies_path} — run "
            "`backend/login_twitter.py` once to authenticate. Skipping."
        )
        return []

    from twikit import Client

    query_configs = (cfg or {}).get("twitter_queries") or DEFAULT_QUERIES
    queries = [q["query"] for q in query_configs if q.get("enabled", True)]
    client = Client(language="en-US")
    try:
        client.load_cookies(str(cookies_path))
    except Exception as e:
        print(f"[twitter] failed to load cookies: {type(e).__name__}: {e}")
        return []

    seen: dict[str, RawItem] = {}
    for query in queries:
        for item in await _search(client, query):
            seen.setdefault(item.url, item)
        await asyncio.sleep(DELAY_BETWEEN_QUERIES)
    return list(seen.values())


if __name__ == "__main__":
    run_standalone(collect())
