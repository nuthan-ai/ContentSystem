"""RSS/Atom collector for company blogs and changelogs (zero-cost, no keys)."""
from __future__ import annotations

import asyncio
from datetime import datetime, timezone

import feedparser
import httpx

from .base import HTTP_TIMEOUT, USER_AGENT, RawItem, run_standalone

# Verified by direct request (2026-07-30). Anthropic has no public RSS feed as of
# this writing (all guessed paths 404); Microsoft AI's blog feed returned 410/404 on
# every URL tried — both left disabled below rather than pointed at a guess that will
# silently start failing. Meta AI's own blog has no feed either; using Meta Engineering
# instead, which does carry AI content.
DEFAULT_FEEDS = [
    {"name": "OpenAI News", "url": "https://openai.com/news/rss.xml", "enabled": True},
    {"name": "Anthropic News", "url": "https://www.anthropic.com/rss.xml", "enabled": False},
    {"name": "Google DeepMind Blog", "url": "https://deepmind.google/blog/rss.xml", "enabled": True},
    {"name": "Hugging Face Blog", "url": "https://huggingface.co/blog/feed.xml", "enabled": True},
    {"name": "NVIDIA Blog", "url": "https://blogs.nvidia.com/feed/", "enabled": True},
    {"name": "Vercel Blog", "url": "https://vercel.com/atom", "enabled": True},
    {"name": "GitHub Changelog", "url": "https://github.blog/changelog/feed/", "enabled": True},
    {"name": "Microsoft AI Blog", "url": "https://blogs.microsoft.com/ai/feed/", "enabled": False},
    {"name": "Meta Engineering Blog", "url": "https://engineering.fb.com/feed/", "enabled": True},
    {"name": "Google AI Blog", "url": "https://blog.google/technology/ai/rss/", "enabled": True},
    {"name": "Simon Willison", "url": "https://simonwillison.net/atom/everything/", "enabled": True},
]


def _entry_datetime(entry) -> datetime | None:
    for key in ("published_parsed", "updated_parsed"):
        t = entry.get(key)
        if t:
            return datetime(*t[:6], tzinfo=timezone.utc)
    return None


def _strip_html(text: str) -> str:
    import re

    return re.sub(r"<[^>]+>", " ", text or "").strip()


async def _fetch_feed(client: httpx.AsyncClient, feed: dict) -> list[RawItem]:
    try:
        resp = await client.get(feed["url"], headers={"User-Agent": USER_AGENT})
        resp.raise_for_status()
        parsed = feedparser.parse(resp.content)
        items = []
        for entry in parsed.entries[:20]:
            url = entry.get("link", "")
            title = entry.get("title", "").strip()
            if not url or not title:
                continue
            items.append(
                RawItem(
                    source="rss",
                    source_name=feed["name"],
                    url=url,
                    title=title,
                    snippet=_strip_html(entry.get("summary", ""))[:500],
                    published_at=_entry_datetime(entry),
                )
            )
        return items
    except Exception as e:
        print(f"[rss] {feed['name']} failed: {type(e).__name__}: {e}")
        return []


async def collect(cfg: dict | None = None) -> list[RawItem]:
    feeds = (cfg or {}).get("feeds") or DEFAULT_FEEDS
    feeds = [f for f in feeds if f.get("enabled", True)]
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
        results = await asyncio.gather(*(_fetch_feed(client, f) for f in feeds))
    return [item for sub in results for item in sub]


if __name__ == "__main__":
    run_standalone(collect())
