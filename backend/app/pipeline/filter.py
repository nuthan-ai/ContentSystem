"""Dedupe + quality filtering. Runs after categorize; caps survivors per category
so the (paid) LLM stage only ever sees a small, high-signal set."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from urllib.parse import urlsplit, urlunsplit

from rapidfuzz import fuzz

from ..collectors.base import RawItem
from ..models import Category

RECENCY_WINDOWS = {
    Category.breaking_news: timedelta(hours=48),
    Category.concept: timedelta(days=7),
    Category.utility: timedelta(days=7),
    Category.workflow: timedelta(days=7),
    Category.learning: timedelta(days=7),
}

# Minimum raw engagement to survive (per source); items with no metrics (e.g. arXiv, RSS)
# always pass this floor since they have no popularity signal to floor on.
ENGAGEMENT_FLOORS = {
    "hackernews": {"points": 3},
    "github": {"stars": 5},
    "reddit": {"upvotes": 3},
}

DEFAULT_CATEGORY_CAP = 15
TITLE_DEDUPE_THRESHOLD = 90


def _canonical_url(url: str) -> str:
    parts = urlsplit(url)
    path = parts.path.rstrip("/")
    return urlunsplit((parts.scheme, parts.netloc.lower(), path, "", ""))


def _passes_engagement_floor(item: RawItem) -> bool:
    floor = ENGAGEMENT_FLOORS.get(item.source)
    if not floor:
        return True
    return all(item.metrics.get(k, 0) >= v for k, v in floor.items())


def _passes_recency(item: RawItem, category: Category, now: datetime) -> bool:
    if item.published_at is None:
        return True  # no date metadata (e.g. some GitHub repos) — don't punish
    window = RECENCY_WINDOWS.get(category, timedelta(days=7))
    published = item.published_at
    if published.tzinfo is None:
        published = published.replace(tzinfo=timezone.utc)
    return now - published <= window


def filter_items(
    categorized: list[tuple[RawItem, Category]],
    category_cap: int = DEFAULT_CATEGORY_CAP,
) -> list[tuple[RawItem, Category]]:
    now = datetime.now(tz=timezone.utc)

    # 1. URL dedupe
    seen_urls: set[str] = set()
    stage1: list[tuple[RawItem, Category]] = []
    for item, category in categorized:
        canon = _canonical_url(item.url)
        if canon in seen_urls:
            continue
        seen_urls.add(canon)
        stage1.append((item, category))

    # 2. Fuzzy title dedupe (within same category, O(n^2) but n is small post-URL-dedupe)
    stage2: list[tuple[RawItem, Category]] = []
    kept_titles: list[str] = []
    for item, category in stage1:
        title_norm = item.title.lower().strip()
        is_dupe = any(
            fuzz.token_set_ratio(title_norm, kept) >= TITLE_DEDUPE_THRESHOLD
            for kept in kept_titles
        )
        if is_dupe:
            continue
        kept_titles.append(title_norm)
        stage2.append((item, category))

    # 3. Recency + engagement floor
    stage3 = [
        (item, category)
        for item, category in stage2
        if _passes_recency(item, category, now) and _passes_engagement_floor(item)
    ]

    # 4. Per-category cap — keep highest raw engagement first as a cheap pre-signal proxy
    def _engagement_key(pair: tuple[RawItem, Category]) -> float:
        item, _ = pair
        m = item.metrics
        return float(
            m.get("points", 0) + m.get("stars", 0) * 0.5 + m.get("upvotes", 0)
            + m.get("comments", 0) * 2
        )

    by_category: dict[Category, list[tuple[RawItem, Category]]] = {}
    for pair in stage3:
        by_category.setdefault(pair[1], []).append(pair)

    survivors: list[tuple[RawItem, Category]] = []
    for category, pairs in by_category.items():
        pairs.sort(key=_engagement_key, reverse=True)
        survivors.extend(pairs[:category_cap])

    return survivors
