"""Headless CLI entry point for Task Scheduler — runs one full research cycle
without the API server. Usage: python run_research.py"""
from __future__ import annotations

import sys

from app.api.settings import seed_defaults
from app.db import init_db, engine
from app.models import Run, RunStatus
from app.orchestrator import run_pipeline_sync
from sqlmodel import Session


def main() -> int:
    init_db()
    seed_defaults()

    with Session(engine) as session:
        run = Run(status=RunStatus.running)
        session.add(run)
        session.commit()
        session.refresh(run)
        run_id = run.id

    print(f"Starting research run #{run_id}...")
    ok = run_pipeline_sync(run_id)

    with Session(engine) as session:
        run = session.get(Run, run_id)
        print(f"Run #{run_id} finished: status={run.status.value} stage={run.stage.value}")
        if run.error:
            print(f"Error: {run.error}")
        print(f"Counts: {run.counts}")

    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
