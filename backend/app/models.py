"""Shared data models — the contract between collectors, pipeline, API, and frontend.

JSON-typed columns are stored as TEXT and (de)serialized via helpers here.
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Category(str, Enum):
    breaking_news = "breaking_news"
    concept = "concept"
    utility = "utility"
    workflow = "workflow"
    learning = "learning"


class ItemStatus(str, Enum):
    collected = "collected"
    filtered_out = "filtered_out"
    evaluated = "evaluated"


class RunStatus(str, Enum):
    running = "running"
    completed = "completed"
    failed = "failed"


class Stage(str, Enum):
    collecting = "collecting"
    categorizing = "categorizing"
    filtering = "filtering"
    signals = "signals"
    evaluating = "evaluating"
    ranking = "ranking"
    done = "done"


class Run(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    started_at: datetime = Field(default_factory=utcnow)
    finished_at: Optional[datetime] = None
    status: RunStatus = RunStatus.running
    stage: Stage = Stage.collecting
    error: Optional[str] = None
    # {"collected": 120, "filtered": 45, "evaluated": 40, "per_source": {"hn": 30, ...}}
    counts_json: str = "{}"
    model_used: Optional[str] = None
    tokens_used: int = 0
    est_cost_usd: float = 0.0

    @property
    def counts(self) -> dict:
        return json.loads(self.counts_json)

    def set_counts(self, d: dict) -> None:
        self.counts_json = json.dumps(d)


class Item(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    run_id: int = Field(index=True, foreign_key="run.id")
    source: str = Field(index=True)  # rss | hackernews | github | arxiv | reddit
    source_name: str = ""  # e.g. feed title, subreddit name
    url: str
    title: str
    snippet: str = ""
    published_at: Optional[datetime] = None
    category: Optional[Category] = Field(default=None, index=True)
    status: ItemStatus = Field(default=ItemStatus.collected, index=True)
    dedup_hash: str = Field(default="", index=True)
    # source-specific engagement: {"points": 120, "comments": 45, "stars": 900, "stars_per_day": 30, "upvotes": ...}
    metrics_json: str = "{}"
    # measured trend signals: {"virality_score": 7.2, "engagement_velocity": 8.1, "trends_slope": 5.0,
    #                          "momentum": 2, "competition_level": "low", "competition_results": 4}
    signals_json: str = "{}"
    composite_score: float = 0.0
    hidden_gem: bool = False

    @property
    def metrics(self) -> dict:
        return json.loads(self.metrics_json)

    def set_metrics(self, d: dict) -> None:
        self.metrics_json = json.dumps(d)

    @property
    def signals(self) -> dict:
        return json.loads(self.signals_json)

    def set_signals(self, d: dict) -> None:
        self.signals_json = json.dumps(d)


class Evaluation(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    item_id: int = Field(index=True, foreign_key="item.id")
    # 1-10 qualitative scores from LLM
    educational_value: int = 0
    beginner_friendliness: int = 0
    community_interest: int = 0
    originality: int = 0
    brand_relevance: int = 0
    # virality is measured (signals) but LLM may adjust ±1; store final
    virality: int = 0
    competition: str = "medium"  # low | medium | high (measured, LLM annotates)
    urgency: str = "this_week"  # now | this_week | evergreen
    summary: str = ""
    why_it_matters: str = ""
    reasoning: str = ""
    recommendation: str = ""
    model_used: str = ""


class Setting(SQLModel, table=True):
    key: str = Field(primary_key=True)
    value_json: str = "{}"

    @property
    def value(self):
        return json.loads(self.value_json)
