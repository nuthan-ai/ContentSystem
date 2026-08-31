# API Contract — Backend ⇄ Frontend

Base URL (dev): `http://localhost:8000`. All endpoints under `/api`. CORS open to `http://localhost:5173`.
Frontend reads base URL from `VITE_API_BASE` env (default `http://localhost:8000`).

## Shared types

```ts
type Category = "breaking_news" | "concept" | "utility" | "workflow" | "learning";
type RunStatus = "running" | "completed" | "failed";
type Stage = "collecting" | "categorizing" | "filtering" | "signals" | "evaluating" | "ranking" | "done";
type Urgency = "now" | "this_week" | "evergreen";
type Competition = "low" | "medium" | "high";

interface RunOut {
  id: number;
  started_at: string;          // ISO datetime
  finished_at: string | null;
  status: RunStatus;
  stage: Stage;
  error: string | null;
  counts: { collected?: number; filtered?: number; evaluated?: number; per_source?: Record<string, number> };
  model_used: string | null;
  tokens_used: number;
  est_cost_usd: number;
}

interface Signals {
  virality_score?: number;        // 1-10, measured blend
  engagement_velocity?: number;   // 1-10 normalized
  trends_slope?: number;          // 1-10 normalized (Google Trends 7d)
  momentum?: number;              // # of sources topic appeared on
  competition_level?: Competition;
  competition_results?: number;   // raw count of existing content found
}

interface EvaluationOut {
  educational_value: number;      // 1-10
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

interface TopicOut {
  id: number;
  title: string;
  url: string;
  source: string;                 // "rss" | "hackernews" | "github" | "arxiv" | "reddit" | "twitter"
  source_name: string;            // e.g. "OpenAI Blog", "r/LocalLLaMA"
  category: Category;
  snippet: string;
  published_at: string | null;
  metrics: Record<string, number>; // stars, points, comments, upvotes, stars_per_day...
  signals: Signals;
  evaluation: EvaluationOut | null;
  composite_score: number;        // 0-10
  hidden_gem: boolean;
}

interface DashboardOut {
  run: RunOut;
  breaking_news: TopicOut[];   // top 3
  concepts: TopicOut[];        // top 5
  utilities: TopicOut[];       // top 5
  workflows: TopicOut[];       // top 5
  learning: TopicOut[];        // top 5
  hidden_gems: TopicOut[];     // top 3
  top10: TopicOut[];           // overall top 10
}

interface SettingsOut {
  openrouter_model: string;
  api_key_set: boolean;          // never expose the key itself
  api_key_masked: string;        // "sk-or-...abcd" or ""
  llm_item_cap: number;
  feeds: { name: string; url: string; enabled: boolean }[];
  subreddits: { name: string; enabled: boolean }[];
  twitter_queries: { name: string; query: string; enabled: boolean }[]; // X search queries, e.g. "from:OpenAI"
  sources_enabled: Record<string, boolean>; // rss, hackernews, github, arxiv, reddit, twitter
}

interface ModelInfo {
  id: string;                    // "google/gemini-2.0-flash-001"
  name: string;
  prompt_price: number;          // USD per 1M tokens
  completion_price: number;
  context_length: number;
}
```

## Endpoints

| Method | Path | Request | Response |
|---|---|---|---|
| POST | `/api/runs` | — | `{ run_id: number }` · 409 `{detail}` if a run is already in progress |
| GET | `/api/runs` | — | `RunOut[]` newest first |
| GET | `/api/runs/{id}` | — | `RunOut` |
| GET | `/api/runs/{id}/events` | — | **SSE** stream, see below |
| GET | `/api/dashboard` | optional `?run_id=` (default: latest completed) | `DashboardOut` · 404 if no completed run |
| GET | `/api/topics/{id}` | — | `TopicOut` |
| GET | `/api/settings` | — | `SettingsOut` |
| PUT | `/api/settings` | Partial `SettingsOut` fields; plus optional `openrouter_api_key: string` to set the key | `SettingsOut` |
| GET | `/api/models` | — | `ModelInfo[]` (proxied from OpenRouter, cached 1h) |

## SSE events (`/api/runs/{id}/events`)

Server-Sent Events, `event: progress`, data is JSON:

```ts
interface ProgressEvent {
  stage: Stage;
  message: string;               // human-readable, e.g. "Collected 34 items from Hacker News"
  counts: RunOut["counts"];
  done: boolean;                 // true on final event (status completed or failed)
  status: RunStatus;
  error?: string;
}
```

Stream closes after the `done: true` event. If the run is already finished when the client connects, send one final event and close.
