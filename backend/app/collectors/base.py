"""Collector protocol: every collector exposes `async collect(cfg) -> list[RawItem]`.

`cfg` is the merged settings dict (seeded defaults, editable via /api/settings).
Collectors must never raise — catch per-request errors and return what they got.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

HTTP_TIMEOUT = 20.0
USER_AGENT = "ContentSystem-Research/0.1 (personal research dashboard)"


@dataclass
class RawItem:
    source: str  # rss | hackernews | github | arxiv | reddit
    source_name: str
    url: str
    title: str
    snippet: str = ""
    published_at: Optional[datetime] = None
    metrics: dict = field(default_factory=dict)


def _print_sample(items: list[RawItem]) -> None:
    print(f"collected {len(items)} items")
    for it in items[:3]:
        print(f"  - [{it.source_name}] {it.title[:90]}")


def run_standalone(collect_coro) -> None:
    items = asyncio.run(collect_coro)
    _print_sample(items)
