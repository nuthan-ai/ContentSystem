"""arXiv collector via the public Atom API (free, no key)."""
from __future__ import annotations

import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import httpx

from .base import HTTP_TIMEOUT, USER_AGENT, RawItem, run_standalone

ARXIV_API = "http://export.arxiv.org/api/query"
DEFAULT_CATEGORIES = ["cs.AI", "cs.CL", "cs.LG"]

ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}


async def _fetch(client: httpx.AsyncClient, categories: list[str], max_results: int) -> list[RawItem]:
    query = " OR ".join(f"cat:{c}" for c in categories)
    try:
        resp = await client.get(
            ARXIV_API,
            params={
                "search_query": query,
                "sortBy": "submittedDate",
                "sortOrder": "descending",
                "max_results": max_results,
            },
            headers={"User-Agent": USER_AGENT},
        )
        resp.raise_for_status()
        root = ET.fromstring(resp.content)
        items = []
        for entry in root.findall("atom:entry", ATOM_NS):
            title = (entry.findtext("atom:title", default="", namespaces=ATOM_NS) or "").strip().replace("\n", " ")
            url = entry.findtext("atom:id", default="", namespaces=ATOM_NS) or ""
            summary = (entry.findtext("atom:summary", default="", namespaces=ATOM_NS) or "").strip()
            published = entry.findtext("atom:published", default="", namespaces=ATOM_NS)
            published_at = None
            if published:
                published_at = datetime.strptime(published, "%Y-%m-%dT%H:%M:%SZ").replace(
                    tzinfo=timezone.utc
                )
            if not title or not url:
                continue
            items.append(
                RawItem(
                    source="arxiv",
                    source_name="arXiv",
                    url=url,
                    title=title,
                    snippet=summary[:500],
                    published_at=published_at,
                    metrics={},
                )
            )
        return items
    except Exception as e:
        print(f"[arxiv] fetch failed: {type(e).__name__}: {e}")
        return []


async def collect(cfg: dict | None = None) -> list[RawItem]:
    categories = (cfg or {}).get("arxiv_categories") or DEFAULT_CATEGORIES
    max_results = (cfg or {}).get("arxiv_max_results") or 40
    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
        return await _fetch(client, categories, max_results)


if __name__ == "__main__":
    run_standalone(collect())
