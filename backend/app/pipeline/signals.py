"""Measured trend/competition signals — deliberately NOT LLM opinion.

virality_score blends three measured components (weights renormalize when a
component is unavailable, e.g. Google Trends throttled):
  - engagement_velocity: how fast the item is accumulating engagement, per-source
  - trends_slope: 7-day Google Trends search-interest slope for the topic keyword
  - momentum: how many distinct sources surfaced the same topic this run

competition_level comes from a live Jina search (s.jina.ai) result count for the
topic keyword — few quality hits = "low" competition. All network calls are
wrapped so failures degrade gracefully and never fail a run.
"""
from __future__ import annotations

import asyncio
import re
from datetime import datetime, timezone
from urllib.parse import quote

import httpx

from ..collectors.base import HTTP_TIMEOUT, USER_AGENT, RawItem
from ..models import Category

_STOPWORDS = {
    "the", "a", "an", "and", "or", "for", "to", "of", "in", "on", "with", "is",
    "how", "what", "why", "new", "vs", "your", "you", "this", "that", "from",
    "show", "hn", "ai", "using", "into", "now", "can", "will", "are", "be",
}


def _keyword_for(item: RawItem) -> str:
    """Best-effort main keyword/phrase for trend + competition lookups."""
    title = re.sub(r"[^\w\s]", " ", item.title.lower())
    words = [w for w in title.split() if w not in _STOPWORDS and len(w) > 2]
    return " ".join(words[:4]) if words else item.title[:40]


def _normalize(value: float, lo: float, hi: float) -> float:
    if hi <= lo:
        return 5.0
    pct = (value - lo) / (hi - lo)
    return max(1.0, min(10.0, 1 + pct * 9))


def compute_engagement_velocity(item: RawItem, now: datetime) -> float:
    m = item.metrics
    age_hours = 24.0
    if item.published_at:
        published = item.published_at
        if published.tzinfo is None:
            published = published.replace(tzinfo=timezone.utc)
        age_hours = max((now - published).total_seconds() / 3600, 1.0)

    if item.source == "hackernews":
        rate = m.get("points", 0) / age_hours
        return _normalize(rate, 0, 5)  # >5 pts/hr is very hot
    if item.source == "github":
        return _normalize(m.get("stars_per_day", 0), 0, 50)
    if item.source == "reddit":
        rate = m.get("upvotes", 0) / age_hours
        return _normalize(rate, 0, 10)
    # RSS/arXiv have no popularity metric — treat as moderate/neutral
    return 5.0


async def _get_trends_slope(client: httpx.AsyncClient, keyword: str) -> float | None:
    """Best-effort 7-day Google Trends slope via the unofficial widget API.
    Returns None (never raises) if Google throttles/blocks — very common for
    anonymous/datacenter traffic, so callers must treat None as "unavailable"."""
    try:
        await client.get("https://trends.google.com/", headers={"User-Agent": USER_AGENT})
        req = (
            '{"comparisonItem":[{"keyword":"%s","time":"today 7-d","geo":""}],'
            '"category":0,"property":""}' % keyword
        )
        explore = await client.get(
            "https://trends.google.com/trends/api/explore",
            params={"hl": "en-US", "tz": "0", "req": req},
            headers={"User-Agent": USER_AGENT},
        )
        explore.raise_for_status()
        body = explore.text.lstrip(")]}',\n")
        import json as _json

        data = _json.loads(body)
        widget = next(
            (w for w in data.get("widgets", []) if w.get("id") == "TIMESERIES"), None
        )
        if not widget:
            return None
        widget_req = _json.dumps(widget["request"])
        multiline = await client.get(
            "https://trends.google.com/trends/api/widgetdata/multiline",
            params={
                "hl": "en-US",
                "tz": "0",
                "req": widget_req,
                "token": widget["token"],
            },
            headers={"User-Agent": USER_AGENT},
        )
        multiline.raise_for_status()
        mbody = multiline.text.lstrip(")]}',\n")
        mdata = _json.loads(mbody)
        points = [
            p["value"][0]
            for p in mdata.get("default", {}).get("timelineData", [])
            if p.get("value")
        ]
        if len(points) < 2:
            return None
        first_half = sum(points[: len(points) // 2]) / max(len(points) // 2, 1)
        second_half = sum(points[len(points) // 2 :]) / max(len(points) - len(points) // 2, 1)
        slope = second_half - first_half
        return _normalize(slope, -50, 50)
    except Exception:
        return None  # Trends is frequently throttled for anonymous callers — expected


async def _get_competition(client: httpx.AsyncClient, keyword: str) -> tuple[str, int | None]:
    """Live competition scan via Jina's free search endpoint. Degrades to
    'medium'/None on any failure (rate limit, network, parsing)."""
    try:
        resp = await client.get(
            f"https://s.jina.ai/{quote(keyword)}",
            headers={"User-Agent": USER_AGENT, "Accept": "application/json", "X-Respond-With": "no-content"},
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("data", []) if isinstance(data, dict) else []
        count = len(results)
        if count <= 3:
            return "low", count
        if count <= 8:
            return "medium", count
        return "high", count
    except Exception:
        return "medium", None


def compute_momentum(items: list[RawItem]) -> dict[int, int]:
    """Cross-platform momentum: how many distinct sources mention overlapping
    keywords for each item, within this run. Returns id(item)->momentum count."""
    keyword_sets = [set(_keyword_for(it).split()) for it in items]
    momentum: dict[int, int] = {}
    for i, item in enumerate(items):
        sources_hit = {item.source}
        for j, other in enumerate(items):
            if i == j or other.source == item.source:
                continue
            overlap = keyword_sets[i] & keyword_sets[j]
            if len(overlap) >= 2:
                sources_hit.add(other.source)
        momentum[id(item)] = len(sources_hit)
    return momentum


async def compute_signals(
    survivors: list[tuple[RawItem, Category]],
) -> dict[int, dict]:
    """Returns id(item) -> signals dict per docs/API_CONTRACT.md Signals shape."""
    now = datetime.now(tz=timezone.utc)
    items = [pair[0] for pair in survivors]
    momentum_map = compute_momentum(items)

    keyword_cache: dict[str, tuple[float | None, str, int | None]] = {}
    results: dict[int, dict] = {}

    async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
        for item, _category in survivors:
            velocity = compute_engagement_velocity(item, now)
            keyword = _keyword_for(item)

            if keyword not in keyword_cache:
                trends_slope, (comp_level, comp_results) = await asyncio.gather(
                    _get_trends_slope(client, keyword), _get_competition(client, keyword)
                )
                keyword_cache[keyword] = (trends_slope, comp_level, comp_results)
            trends_slope, comp_level, comp_results = keyword_cache[keyword]

            momentum_raw = momentum_map.get(id(item), 1)
            momentum_norm = _normalize(momentum_raw, 1, 4)

            weights = {"velocity": 0.4, "trends": 0.3, "momentum": 0.3}
            components = {"velocity": velocity, "momentum": momentum_norm}
            if trends_slope is not None:
                components["trends"] = trends_slope
            else:
                del weights["trends"]

            total_weight = sum(weights.values())
            virality_score = sum(
                components[k] * (w / total_weight) for k, w in weights.items()
            )

            signals = {
                "virality_score": round(virality_score, 2),
                "engagement_velocity": round(velocity, 2),
                "momentum": momentum_raw,
                "competition_level": comp_level,
            }
            if trends_slope is not None:
                signals["trends_slope"] = round(trends_slope, 2)
            if comp_results is not None:
                signals["competition_results"] = comp_results

            results[id(item)] = signals

    return results
