import { Rss, MessageSquare, GitBranch, GraduationCap, Users2, Flame, Clock, Infinity as InfinityIcon } from "lucide-react";
import type { Category, Competition, Urgency } from "../lib/types";
import { Badge } from "./ui/primitives";

const SOURCE_META: Record<string, { label: string; color: string; icon: typeof Rss }> = {
  rss: { label: "RSS", color: "var(--src-rss)", icon: Rss },
  hackernews: { label: "Hacker News", color: "var(--src-hackernews)", icon: MessageSquare },
  github: { label: "GitHub", color: "var(--src-github)", icon: GitBranch },
  arxiv: { label: "arXiv", color: "var(--src-arxiv)", icon: GraduationCap },
  reddit: { label: "Reddit", color: "var(--src-reddit)", icon: Users2 },
};

export function SourceBadge({ source, sourceName }: { source: string; sourceName?: string }) {
  const meta = SOURCE_META[source] ?? { label: source, color: "var(--text-muted)", icon: Rss };
  const Icon = meta.icon;
  return (
    <Badge color={meta.color}>
      <Icon size={11} />
      {sourceName || meta.label}
    </Badge>
  );
}

const CATEGORY_COLOR: Record<Category, string> = {
  breaking_news: "var(--cat-breaking_news)",
  concept: "var(--cat-concept)",
  utility: "var(--cat-utility)",
  workflow: "var(--cat-workflow)",
  learning: "var(--cat-learning)",
};

const CATEGORY_SHORT: Record<Category, string> = {
  breaking_news: "News",
  concept: "Concept",
  utility: "Utility",
  workflow: "Workflow",
  learning: "Learning",
};

export function CategoryChip({ category }: { category: Category }) {
  return <Badge color={CATEGORY_COLOR[category]}>{CATEGORY_SHORT[category]}</Badge>;
}

const URGENCY_META: Record<Urgency, { label: string; color: string; icon: typeof Flame; pulse?: boolean }> = {
  now: { label: "Now", color: "var(--critical)", icon: Flame, pulse: true },
  this_week: { label: "This week", color: "var(--warning)", icon: Clock },
  evergreen: { label: "Evergreen", color: "var(--good)", icon: InfinityIcon },
};

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const meta = URGENCY_META[urgency];
  const Icon = meta.icon;
  return (
    <Badge color={meta.color} className={meta.pulse ? "pulse-now" : undefined}>
      <Icon size={11} />
      {meta.label}
    </Badge>
  );
}

const COMPETITION_META: Record<Competition, { label: string; color: string }> = {
  low: { label: "Low competition", color: "var(--good)" },
  medium: { label: "Medium competition", color: "var(--warning)" },
  high: { label: "High competition", color: "var(--serious)" },
};

export function CompetitionBadge({ level }: { level: Competition }) {
  const meta = COMPETITION_META[level];
  return <Badge color={meta.color}>{meta.label}</Badge>;
}
