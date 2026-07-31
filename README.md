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

Everything before the LLM step is free — public APIs and feeds, no paid calls.
Only the small, already-filtered set of survivors ever reaches the LLM, so a
full run costs cents (or nothing, if you don't set an OpenRouter key — it
still ranks on measured signals alone).

**Sources today:** RSS/Atom (company blogs), Hacker News, GitHub trending
repos, arXiv. Reddit and X/Twitter are supported by the collector interface
but currently deferred/degraded — see [Known limitations](#known-limitations).

**Dashboard sections** (per the BRD): 🚨 Breaking AI News · 🔥 Trending AI
Concepts · 🛠 Best AI Utilities · 💡 AI Workflow Ideas · 📚 Learning Resources ·
⭐ Hidden Gems · 📈 Overall Top 10 Content Opportunities — every item includes
scores, measured signals, and written reasoning.

## Stack

- **Backend:** Python (FastAPI, SQLModel/SQLite, httpx), OpenRouter for LLM evaluation
- **Frontend:** Vite + React 19 + TypeScript + Tailwind v4, TanStack Query
- **Scheduling:** Windows Task Scheduler (daily headless run)
- **Contract:** [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) defines every endpoint/type shared by backend and frontend

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
OPENROUTER_API_KEY=      # optional — get one at openrouter.ai. Without it, runs still
                          # complete but skip LLM scoring, ranking on measured signals only.
OPENROUTER_MODEL=google/gemini-2.0-flash-001   # changeable later in the Settings UI
GITHUB_TOKEN=             # optional — raises GitHub search API rate limits (public data only)
LLM_ITEM_CAP=60           # cost guard: max items sent to the LLM per run
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

The API is now at `http://localhost:8000` (docs at `/docs`). SQLite database
is created automatically at `data/research.db`.

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
finishes.

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
backend/app/collectors/   one module per source (rss, hackernews, github_trending, arxiv, reddit)
backend/app/pipeline/     categorize → filter → signals → evaluate → rank
backend/app/llm/          OpenRouter client
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
- **X/Twitter**: not yet implemented — no free official search API exists
  today; the only path is a personal-account cookie export, which is
  deliberately deferred pending a decision on account risk.
- **GitHub search** rate-limits after a handful of unauthenticated requests
  per run — set `GITHUB_TOKEN` to raise the ceiling.
- **Google Trends / competition search** throttle anonymous requests; the
  signals blend renormalizes and degrades gracefully rather than failing.
