// Mirrors docs/API_CONTRACT.md exactly. Keep in lockstep with the backend contract.

export type Category = "breaking_news" | "concept" | "utility" | "workflow" | "learning";
export type RunStatus = "running" | "completed" | "failed";
export type Stage =
  | "collecting"
  | "categorizing"
  | "filtering"
  | "signals"
  | "evaluating"
  | "ranking"
  | "done";
export type Urgency = "now" | "this_week" | "evergreen";
export type Competition = "low" | "medium" | "high";

export interface RunCounts {
  collected?: number;
  filtered?: number;
  evaluated?: number;
  per_source?: Record<string, number>;
}

export interface RunOut {
  id: number;
  started_at: string;
  finished_at: string | null;
  status: RunStatus;
  stage: Stage;
  error: string | null;
  counts: RunCounts;
  model_used: string | null;
  tokens_used: number;
  est_cost_usd: number;
}

export interface Signals {
  virality_score?: number;
  engagement_velocity?: number;
  trends_slope?: number;
  momentum?: number;
  competition_level?: Competition;
  competition_results?: number;
}

export interface EvaluationOut {
  educational_value: number;
  beginner_friendliness: number;
  community_interest: number;
  originality: number;
  brand_relevance: number;
  virality: number;
  competition: Competition;
  urgency: Urgency;
  summary: string;
  why_it_matters: string;
  reasoning: string;
  recommendation: string;
}

export type Source = "rss" | "hackernews" | "github" | "arxiv" | "reddit";

export interface TopicOut {
  id: number;
  title: string;
  url: string;
  source: string;
  source_name: string;
  category: Category;
  snippet: string;
  published_at: string | null;
  metrics: Record<string, number>;
  signals: Signals;
  evaluation: EvaluationOut | null;
  composite_score: number;
  hidden_gem: boolean;
}

export interface DashboardOut {
  run: RunOut;
  breaking_news: TopicOut[];
  concepts: TopicOut[];
  utilities: TopicOut[];
  workflows: TopicOut[];
  learning: TopicOut[];
  hidden_gems: TopicOut[];
  top10: TopicOut[];
}

export interface FeedConfig {
  name: string;
  url: string;
  enabled: boolean;
}

export interface SubredditConfig {
  name: string;
  enabled: boolean;
}

export interface SettingsOut {
  openrouter_model: string;
  api_key_set: boolean;
  api_key_masked: string;
  llm_item_cap: number;
  feeds: FeedConfig[];
  subreddits: SubredditConfig[];
  sources_enabled: Record<string, boolean>;
}

export interface ModelInfo {
  id: string;
  name: string;
  prompt_price: number;
  completion_price: number;
  context_length: number;
}

export interface ProgressEvent {
  stage: Stage;
  message: string;
  counts: RunCounts;
  done: boolean;
  status: RunStatus;
  error?: string;
}

export const STAGE_ORDER: Stage[] = [
  "collecting",
  "categorizing",
  "filtering",
  "signals",
  "evaluating",
  "ranking",
  "done",
];

export const STAGE_LABELS: Record<Stage, string> = {
  collecting: "Collecting",
  categorizing: "Categorizing",
  filtering: "Filtering",
  signals: "Measuring signals",
  evaluating: "Evaluating",
  ranking: "Ranking",
  done: "Done",
};

export const CATEGORY_LABELS: Record<Category, string> = {
  breaking_news: "Breaking AI News",
  concept: "Trending AI Concepts",
  utility: "Best AI Utilities",
  workflow: "AI Workflow Ideas",
  learning: "Learning Resources",
};

export const CATEGORY_EMOJI: Record<Category, string> = {
  breaking_news: "\u{1F6A8}",
  concept: "\u{1F525}",
  utility: "\u{1F6E0}",
  workflow: "\u{1F4A1}",
  learning: "\u{1F4DA}",
};
