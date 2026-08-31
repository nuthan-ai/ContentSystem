# ContentSystem — AI Research Intelligence Dashboard

**Phase 1** of a content system: it automatically discovers, filters, scores, and
ranks AI news, tools, concepts, and workflows every day so you never have to
manually browse platforms looking for content ideas. It does **not** generate
content — it produces a prioritized research dashboard. A later phase will
consume this dashboard's output to plan actual content (Reel, Carousel,
LinkedIn post, etc.).

Full requirements: [`Requirements/Phase_1_AI_Research_Intelligence_System.md`](Requirements/Phase_1_AI_Research_Intelligence_System.md).

## How it works

```
Collect (free)  →  Categorize (rules)  →  Filter (dedupe/quality)  →  Signals (measured trend/competition)  →  Evaluate (LLM, small survivor set)  →  Rank  →  Dashboard
```

Everything before the LLM step is **free** — public APIs and feeds, no paid
calls. Only the small, already-filtered set of survivors ever reaches the LLM,
so a full run costs cents. The LLM step is **optional** — see
[The LLM API key](#the-llm-api-key-optional-but-recommended) below.

**Sources today:** RSS/Atom (company blogs), Hacker News, GitHub trending
repos, arXiv, X/Twitter (cookie-authenticated). Reddit is supported by the
collector interface but currently degraded — see
[Known limitations](#known-limitations).

**Dashboard sections** (per the BRD): 🚨 Breaking AI News · 🔥 Trending AI
Concepts · 🛠 Best AI Utilities · 💡 AI Workflow Ideas · 📚 Learning Resources ·
⭐ Hidden Gems · 📈 Overall Top 10 Content Opportunities.

## Stack

- **Backend:** Python (FastAPI, SQLModel/SQLite, httpx), OpenRouter for LLM evaluation
- **Frontend:** Vite + React 19 + TypeScript + Tailwind v4, TanStack Query
- **Scheduling:** Windows Task Scheduler (daily headless run)
- **Contract:** [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) defines every endpoint/type shared by backend and frontend

---

## The LLM API key (optional, but recommended)

This project uses **[OpenRouter](https://openrouter.ai)** as its single LLM
provider. OpenRouter is an OpenAI-compatible gateway that lets you pick from
hundreds of models (Gemini, GPT, Claude, Llama, DeepSeek, …) with one key and
one balance.

### Is it mandatory?

**No.** The pipeline is designed to run start-to-finish with no key at all.
Collection, categorization, dedupe/filtering, and the *measured* trend and
competition signals are all free and require nothing from you. If no key is
configured, the LLM evaluation stage is simply skipped and the dashboard is
still produced.

### What you get WITH a key

The LLM sees only the small filtered survivor set (capped by `LLM_ITEM_CAP`,
default 60) and, for each item, produces the **qualitative judgment and
written analysis** that the rest of the pipeline can't measure:

| Added with a key | Where it shows up |
| --- | --- |
| Scores for **educational value, beginner-friendliness, originality, brand relevance, community interest** (1–10) | Per-item score breakdown |
| **Urgency** classification (`now` / `this_week` / `evergreen`) | Item badge |
| **Summary**, **why it matters**, **reasoning**, and a concrete **content recommendation** | The written blurb under each item |
| A richer **composite score** that blends those qualitative axes with the measured signals | Ranking / ordering of every section |

The measured virality and competition numbers are still computed the same way
and are handed to the LLM as ground truth — it is told **not** to re-estimate
them. Its job is judgment + writing, nothing else.

**Cost:** the LLM only ever processes ~40–60 short items per run in batches of
10, so a daily run typically costs **a few cents or less**, depending on the
model you choose. You control the ceiling with `LLM_ITEM_CAP`.

### What happens WITHOUT a key

- The run still completes; every stage before evaluation is unaffected.
- The evaluate stage returns immediately (0 items, $0).
- `rank.py` falls back to a **signals-only composite**: roughly
  `0.6 × measured virality + 0.4 × cross-platform momentum`, minus a
  competition penalty. Sections, Hidden Gems, and the Top 10 are still
  ranked and populated.
- In the UI, each item's `evaluation` object is `null` — so there is **no
  written summary / reasoning / recommendation** and no qualitative
  sub-scores, just the item, its source metrics, and the measured signals.

In short: **without a key you get a ranked list; with a key you get a ranked
list plus the "why" and a suggested angle for each item.**

### How to add the key

You can do it either way — the Settings UI value takes precedence over `.env`.

**Option A — `.env` (picked up on backend start):**

```
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=google/gemini-2.0-flash-001
```

**Option B — Settings page (no restart needed):** start the app, open
**Settings**, paste the key into *OpenRouter API key*, pick a model from the
dropdown (the model list is pulled live from OpenRouter and shows per-token
pricing), and save. The key is stored in the local SQLite `Setting` table and
displayed masked (`sk-or-v...abcd`) afterwards.

> The key lives only on your machine — in `.env` or the local `data/research.db`.
> It is sent only to `openrouter.ai` when a run reaches the evaluate stage.

### Choosing a model

`OPENROUTER_MODEL` (or the Settings dropdown) accepts any OpenRouter model id.
Good cheap defaults for this workload are small fast models with structured
output support, e.g. `google/gemini-2.0-flash-001`,
`openai/gpt-4o-mini`, or `deepseek/deepseek-chat`. The client automatically
falls back from strict JSON-schema mode to plain JSON mode for models that
don't support structured outputs.

---

## Setup

### Prerequisites

- Python 3.11+ (developed/tested on 3.14)
- Node.js 18+
- Windows (for the Task Scheduler auto-run script; the app itself is cross-platform)

### 1. Environment variables

```bash
cp .env.example .env
```

Edit `.env` at the repo root:

```
OPENROUTER_API_KEY=      # OPTIONAL — see "The LLM API key" above. Without it,
                         # runs complete but skip LLM scoring/analysis.
OPENROUTER_MODEL=google/gemini-2.0-flash-001   # changeable later in the Settings UI
GITHUB_TOKEN=            # optional — raises GitHub search API rate limits (public data only)
LLM_ITEM_CAP=60          # cost guard: max items sent to the LLM per run
```

All of these (model, item cap, feeds, subreddits, source toggles) are also
editable at runtime from the **Settings** page once the app is running.

### 2. Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn app.main:app --reload --port 8000
```

The API is now at `http://localhost:8000` (docs at `/docs`). The SQLite
database is created automatically at `data/research.db`.

### 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`. It talks to the backend at
`http://localhost:8000` by default (override with `VITE_API_BASE` in
`frontend/.env.local`). If the backend isn't reachable, the UI automatically
falls back to realistic demo data with a "Demo data" badge, so you can
explore the dashboard without running the backend at all.

### 4. Run a research cycle

Click **Run Research** in the dashboard, or from the command line:

```powershell
cd backend
.venv\Scripts\python run_research.py
```

Progress streams live (Collecting → Categorizing → Filtering → Signals →
Evaluating → Ranking → Done); the dashboard updates automatically when it
finishes. If no OpenRouter key is set, the Evaluating step is marked skipped
and the run continues.

### 5. Daily auto-run (optional)

Registers a Windows Task Scheduler job that runs the pipeline every day at
7:00 AM, so the dashboard is fresh when you open it:

```powershell
.\scripts\register_task.ps1
```

Remove it later with:

```powershell
Unregister-ScheduledTask -TaskName "ContentSystem Daily Research" -Confirm:$false
```

## Project layout

```
backend/app/collectors/   one module per source (rss, hackernews, github_trending, arxiv, reddit, twitter)
backend/app/pipeline/     categorize → filter → signals → evaluate → rank
backend/app/llm/          OpenRouter client (the only LLM touchpoint)
backend/app/api/          FastAPI routers (runs, dashboard, topics, settings, models)
backend/app/orchestrator.py   runs the pipeline stages, streams progress via SSE
frontend/src/             dashboard, run history, and settings pages
docs/API_CONTRACT.md      the frozen contract between backend and frontend
scripts/register_task.ps1 daily auto-run registration
```

See [`CLAUDE.md`](CLAUDE.md) for a deeper architecture walkthrough.

## Known limitations

- **Reddit**: public JSON endpoints are currently blocked (403) from
  unauthenticated requests; the collector degrades to 0 items rather than
  failing the run. A proper fix (official OAuth app-only auth) is planned.
- **X/Twitter**: no free official search API exists today, so the collector
  authenticates as a real account via `twikit`/`twifork` (an unofficial
  client — this is against X's ToS on automation and carries account-lock
  risk, so it's meant to run against a dedicated secondary account, never
  your primary). As of 2026, X has retired the plain-HTTP login flow, so
  `backend/login_twitter.py`'s automated login will fail — obtain the
  session instead by logging into x.com in a real browser and exporting its
  cookies (e.g. with the "Cookie-Editor" extension) to
  `data/twitter_cookies.json`; the collector reuses that file on every run.
  Missing/expired cookies degrade to 0 items rather than failing the run.
- **GitHub search** rate-limits after a handful of unauthenticated requests
  per run — set `GITHUB_TOKEN` to raise the ceiling.
- **Google Trends / competition search** throttle anonymous requests; the
  signals blend renormalizes and degrades gracefully rather than failing.
