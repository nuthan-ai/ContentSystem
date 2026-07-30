from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api import dashboard, models, runs, settings, topics
from .api.settings import seed_defaults
from .db import init_db

app = FastAPI(title="AI Research Intelligence System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()
    seed_defaults()


app.include_router(runs.router)
app.include_router(dashboard.router)
app.include_router(topics.router)
app.include_router(settings.router)
app.include_router(models.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
