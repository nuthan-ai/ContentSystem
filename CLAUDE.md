# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Phase 1 of a content system: an AI Research Intelligence dashboard that collects AI news/tools/concepts from free sources, filters and scores them with measured trend signals + an OpenRouter LLM, and presents ranked content opportunities. The BRD is `Requirements/Phase_1_AI_Research_Intelligence_System.md`. Phase 2 (content strategy) will consume this dashboard's output.

## Commands

```powershell
# Backend (FastAPI, Python 3.14) — from backend/
python -m venv .venv                      # once
.venv\Scripts\pip install -r requirements.txt
.venv\Scripts\uvicorn app.main:app --reload --port 8000

# Run one collector standalone (smoke test)
.venv\Scripts\python -m app.collectors.hackernews

# Headless full pipeline run (what Task Scheduler calls)
.venv\Scripts\python run_research.py

# Frontend (Vite + React + TS) — from frontend/
npm install
npm run dev        # http://localhost:5173, expects API at :8000 (VITE_API_BASE)
npm run build      # tsc + vite build; must pass clean

# Register daily 7AM auto-run (Windows Task Scheduler)
.\scripts\register_task.ps1
```

Secrets live in `.env` at repo root (copy `.env.example`); `OPENROUTER_API_KEY` is required for LLM evaluation — without it, runs still complete but skip the LLM stage and rank on measured signals only.

## Architecture

The system is a pipeline with a strict cost philosophy: **everything before the LLM stage is free** (public APIs, RSS, scraping via Jina Reader), and the LLM only sees the small filtered survivor set.

**Backend** (`backend/app/`), stages executed by `orchestrator.py`, all state in SQLite (`data/research.db`, SQLModel models in `models.py` — Run, Item, Evaluation, Setting):

1. `collectors/` — async, one module per source (rss, hackernews, github_trending, arxiv, reddit). Each returns normalized `RawItem`s; a source failing never fails the run. Each is runnable standalone via `python -m app.collectors.<name>`.
2. `pipeline/categorize.py` — rule/keyword-based (no LLM) mapping into the 5 BRD categories (breaking_news, concept, utility, workflow, learning).
3. `pipeline/filter.py` — URL + fuzzy-title dedupe (rapidfuzz), recency windows, engagement floors, per-category caps.
4. `pipeline/signals.py` — **measured** virality/competition (not LLM opinion): engagement velocity from source metrics, Google Trends slope (unofficial API, degrades gracefully when throttled), cross-platform momentum, competition via Jina search. Missing components renormalize the blend weights.
5. `pipeline/evaluate.py` — OpenRouter structured-output batches score qualitative axes only (educational value, beginner-friendliness, originality, brand relevance); measured signals are passed in as ground truth.
6. `pipeline/rank.py` — weighted composite → dashboard sections (top 3 news / 5 concepts / 5 utilities / 5 workflows / 5 learning / 3 hidden gems / top 10 overall). Hidden gems = high composite, low raw engagement.

`llm/openrouter.py` is the only LLM touchpoint (OpenAI-compatible; model list proxied to the frontend; key precedence: Setting table > .env). Progress streams to the UI via SSE (`/api/runs/{id}/events`).

**Frontend** (`frontend/`) — Vite/React/TS, Tailwind v4, hand-rolled UI primitives (`src/components/ui/primitives.tsx`), TanStack Query. Falls back to rich mock data automatically whenever the API is unreachable (or force with `VITE_USE_MOCKS=true`), showing a "Demo data" badge — this renders the full dashboard without a backend running.

**The contract**: `docs/API_CONTRACT.md` defines every endpoint and JSON shape shared by backend and frontend, mirrored in `frontend/src/lib/types.ts`. Change the contract file first, then both sides — never let them drift.

## Conventions

- Keep new research sources behind the `collectors/base.py` protocol and a `sources_enabled` settings toggle; login-required channels (Twitter/X, Reddit) are deliberately deferred.
- Cost guards are load-bearing: per-category filter caps and `llm_item_cap` exist so a run costs cents. Don't bypass them.
- Runtime settings (feeds, subreddits, keyword rules, model choice) belong in the Setting table via `/api/settings`, not hardcoded.

## Known live-source degradations (as of last verification)

These are handled gracefully by design — a source going down never fails a run, it just contributes fewer items:

- **Reddit's public JSON endpoint (`www.reddit.com/r/*/hot.json`) currently returns 403** from this environment. The collector returns 0 items rather than raising. Fixing this requires the login-based path (deferred, matches agent-reach's own findings on Reddit).
- **GitHub search API rate-limits (403) after ~4-5 unauthenticated requests** per run. Set `GITHUB_TOKEN` in `.env` to raise the ceiling (needs no scopes — public search only).
- **Google Trends and Jina competition search (`s.jina.ai`) throttle anonymous requests** in this environment. `signals.py` renormalizes its blend weights when a component is unavailable and defaults competition to `"medium"` rather than failing.
- 3 of the original default RSS feeds were dead and replaced/disabled: Anthropic has no public RSS feed (disabled), Microsoft AI Blog returned 404 on every URL tried (disabled), Meta AI Blog had no working feed (swapped for Meta Engineering Blog, which covers AI content and works).
