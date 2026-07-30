from __future__ import annotations

import asyncio
import json

from fastapi import APIRouter, HTTPException
from sqlmodel import Session, select
from sse_starlette.sse import EventSourceResponse

from .. import orchestrator
from ..db import engine
from ..models import Run, RunStatus
from .serializers import serialize_run

router = APIRouter(prefix="/api/runs", tags=["runs"])


@router.post("")
async def start_run():
    if orchestrator.is_run_active():
        raise HTTPException(status_code=409, detail="A run is already in progress")

    with Session(engine) as session:
        run = Run(status=RunStatus.running)
        session.add(run)
        session.commit()
        session.refresh(run)
        run_id = run.id

    asyncio.create_task(orchestrator.run_pipeline(run_id))
    return {"run_id": run_id}


@router.get("")
def list_runs():
    with Session(engine) as session:
        runs = session.exec(select(Run).order_by(Run.started_at.desc())).all()
        return [serialize_run(r) for r in runs]


@router.get("/{run_id}")
def get_run(run_id: int):
    with Session(engine) as session:
        run = session.get(Run, run_id)
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        return serialize_run(run)


@router.get("/{run_id}/events")
async def run_events(run_id: int):
    async def event_generator():
        with Session(engine) as session:
            run = session.get(Run, run_id)
            if not run:
                yield {"event": "progress", "data": json.dumps({"done": True, "error": "not found"})}
                return
            if run.status != RunStatus.running:
                yield {
                    "event": "progress",
                    "data": json.dumps(
                        {
                            "stage": run.stage.value,
                            "message": "Run already finished",
                            "counts": run.counts,
                            "done": True,
                            "status": run.status.value,
                        }
                    ),
                }
                return

        queue = orchestrator.get_queue(run_id)
        if queue is None:
            yield {
                "event": "progress",
                "data": json.dumps(
                    {"stage": "done", "message": "No active stream for this run", "counts": {}, "done": True, "status": "failed"}
                ),
            }
            return

        while True:
            event = await queue.get()
            yield {"event": "progress", "data": json.dumps(event)}
            if event.get("done"):
                break

    return EventSourceResponse(event_generator())
