import { Rss, MessageSquare, GitBranch, GraduationCap, Users2, Flame, Clock, Infinity as InfinityIcon } from "lucide-react";
import type { Category, Competition, Urgency } from "../lib/types";
import { Badge } from "./ui/primitives";

function XIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 19 19" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M1.893 1.98c.052.072 1.245 1.769 2.653 3.77l2.892 4.114c.183.261.333.48.333.486s-.068.089-.152.183l-.522.593-.765.867-3.597 4.087c-.375.426-.734.834-.798.905a1 1 0 0 0-.118.148c0 .01.236.017.664.017h.663l.729-.83c.4-.457.796-.906.879-.999a692 692 0 0 0 1.794-2.038c.034-.037.301-.34.594-.675l.551-.624.345-.392a7 7 0 0 1 .34-.374c.006 0 .93 1.306 2.052 2.903l2.084 2.965.045.063h2.275c1.87 0 2.273-.003 2.266-.021-.008-.02-1.098-1.572-3.894-5.547-2.013-2.862-2.28-3.246-2.273-3.266.008-.019.282-.332 2.085-2.38l2-2.274 1.567-1.782c.022-.028-.016-.03-.65-.03h-.674l-.3.342a871 871 0 0 1-1.782 2.025c-.067.075-.405.458-.75.852a100 100 0 0 1-.803.91c-.148.172-.299.344-.99 1.127-.304.343-.32.358-.345.327-.015-.019-.904-1.282-1.976-2.808L6.365 1.85H1.8zm1.782.91 8.078 11.294c.772 1.08 1.413 1.973 1.425 1.984.016.017.241.02 1.05.017l1.03-.004-2.694-3.766L7.796 5.75 5.722 2.852l-1.039-.004-1.039-.004z"
        clipRule="evenodd"
      />
    </svg>
  );
}

const SOURCE_META: Record<string, { label: string; color: string; icon: (props: { size?: number }) => React.ReactNode }> = {
  rss: { label: "RSS", color: "var(--src-rss)", icon: Rss },
  hackernews: { label: "Hacker News", color: "var(--src-hackernews)", icon: MessageSquare },
  github: { label: "GitHub", color: "var(--src-github)", icon: GitBranch },
  arxiv: { label: "arXiv", color: "var(--src-arxiv)", icon: GraduationCap },
  reddit: { label: "Reddit", color: "var(--src-reddit)", icon: Users2 },
  twitter: { label: "X", color: "var(--src-twitter)", icon: XIcon },
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
