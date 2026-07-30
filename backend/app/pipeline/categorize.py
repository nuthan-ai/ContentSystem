"""Rule-based categorization into the 5 BRD categories. No LLM involved —
source priors set a default, keyword rules can override it."""
from __future__ import annotations

from ..collectors.base import RawItem
from ..models import Category

# Source priors: what a source is "usually" about.
SOURCE_PRIORS: dict[str, Category] = {
    "arxiv": Category.learning,
    "github": Category.utility,
    "rss": Category.breaking_news,
    "hackernews": Category.breaking_news,
    "reddit": Category.workflow,
}

# Keyword rules override the prior when matched, ordered by priority (first match wins).
# Concept keywords per BRD's "AI Concepts" examples.
CONCEPT_KEYWORDS = [
    "context engineering", "loop engineering", "graph engineering", "harness engineering",
    "memory system", "agentic workflow", "mcp", "model context protocol",
    "prompt engineering", "chain of thought", "reasoning model", "fine-tuning",
    "rag", "retrieval augmented", "embedding",
]

WORKFLOW_KEYWORDS = [
    "automation", "multi-agent", "multi agent", "workflow", "pipeline",
    "coding practice", "developer workflow", "orchestrat", "n8n", "zapier",
]

UTILITY_KEYWORDS = [
    "cli", "extension", "plugin", "tool", "skill", "cursor rule", "mcp server",
    "library", "sdk", "framework", "toolkit", "boilerplate",
]

BREAKING_KEYWORDS = [
    "launch", "release", "announc", "unveil", "new model", "now available",
    "general availability", "ga)", "introducing",
]

LEARNING_KEYWORDS = [
    "tutorial", "guide", "how to", "paper", "research", "study", "benchmark",
    "explained", "deep dive", "documentation",
]

_RULE_ORDER = [
    (CONCEPT_KEYWORDS, Category.concept),
    (WORKFLOW_KEYWORDS, Category.workflow),
    (UTILITY_KEYWORDS, Category.utility),
    (LEARNING_KEYWORDS, Category.learning),
    (BREAKING_KEYWORDS, Category.breaking_news),
]


def categorize_one(item: RawItem, keyword_rules: dict[str, list[str]] | None = None) -> Category:
    text = f"{item.title} {item.snippet}".lower()

    rule_order = _RULE_ORDER
    if keyword_rules:
        rule_order = [
            (keyword_rules.get(cat.value, default_kw), cat)
            for default_kw, cat in [
                (CONCEPT_KEYWORDS, Category.concept),
                (WORKFLOW_KEYWORDS, Category.workflow),
                (UTILITY_KEYWORDS, Category.utility),
                (LEARNING_KEYWORDS, Category.learning),
                (BREAKING_KEYWORDS, Category.breaking_news),
            ]
        ]

    for keywords, category in rule_order:
        if any(kw in text for kw in keywords):
            return category

    return SOURCE_PRIORS.get(item.source, Category.learning)


def categorize_all(
    items: list[RawItem], keyword_rules: dict[str, list[str]] | None = None
) -> list[tuple[RawItem, Category]]:
    return [(item, categorize_one(item, keyword_rules)) for item in items]
