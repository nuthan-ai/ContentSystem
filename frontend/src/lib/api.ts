import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { setMockMode } from "./mode";
import {
  mockDashboard,
  mockModels,
  mockRun,
  mockRuns,
  mockSettings,
  findMockTopic,
} from "./mockData";
import type {
  DashboardOut,
  ModelInfo,
  ProgressEvent,
  RunOut,
  SettingsOut,
  Stage,
  TopicOut,
} from "./types";

export const API_BASE: string =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "http://localhost:8000";

const FORCE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

class ApiUnreachable extends Error {}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  if (FORCE_MOCKS) throw new ApiUnreachable("forced mock mode");
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
      ...init,
    });
  } catch {
    throw new ApiUnreachable(`network error reaching ${path}`);
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      /* ignore */
    }
    const err = new Error(detail) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** Wraps a real call with a mock fallback, flipping the shared mock-mode flag. */
async function withMockFallback<T>(real: () => Promise<T>, mock: () => T | Promise<T>): Promise<T> {
  try {
    const result = await real();
    setMockMode(false);
    return result;
  } catch (e) {
    if (e instanceof ApiUnreachable) {
      setMockMode(true);
      return mock();
    }
    throw e;
  }
}

// ---- Queries ----

export function useDashboard(runId?: number) {
  return useQuery({
    queryKey: ["dashboard", runId ?? "latest"],
    queryFn: () =>
      withMockFallback<DashboardOut>(
        () => request(`/api/dashboard${runId ? `?run_id=${runId}` : ""}`),
        () => (runId && runId !== mockRun.id ? { ...mockDashboard, run: { ...mockRun, id: runId } } : mockDashboard)
      ),
  });
}

export function useRuns() {
  return useQuery({
    queryKey: ["runs"],
    queryFn: () => withMockFallback<RunOut[]>(() => request("/api/runs"), () => mockRuns),
  });
}

/** Imperative one-off fetch — used to find the currently-active run after a 409. */
export async function fetchRunsOnce(): Promise<RunOut[]> {
  return withMockFallback<RunOut[]>(() => request("/api/runs"), () => mockRuns);
}

export function useRun(id: number | undefined) {
  return useQuery({
    queryKey: ["run", id],
    enabled: id !== undefined,
    queryFn: () =>
      withMockFallback<RunOut>(
        () => request(`/api/runs/${id}`),
        () => mockRuns.find((r) => r.id === id) ?? mockRun
      ),
  });
}

export function useTopic(id: number | undefined) {
  return useQuery({
    queryKey: ["topic", id],
    enabled: id !== undefined,
    queryFn: () =>
      withMockFallback<TopicOut>(
        () => request(`/api/topics/${id}`),
        () => {
          const t = id !== undefined ? findMockTopic(id) : undefined;
          if (!t) throw new Error("Topic not found");
          return t;
        }
      ),
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => withMockFallback<SettingsOut>(() => request("/api/settings"), () => mockSettings),
  });
}

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: () => withMockFallback<ModelInfo[]>(() => request("/api/models"), () => mockModels),
    staleTime: 60 * 60 * 1000,
  });
}

export function useUpdateSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<SettingsOut> & { openrouter_api_key?: string }) =>
      withMockFallback<SettingsOut>(
        () => request("/api/settings", { method: "PUT", body: JSON.stringify(patch) }),
        () => ({
          ...mockSettings,
          ...patch,
          api_key_set: patch.openrouter_api_key ? true : mockSettings.api_key_set,
          api_key_masked: patch.openrouter_api_key
            ? `sk-or-...${patch.openrouter_api_key.slice(-4)}`
            : mockSettings.api_key_masked,
        })
      ),
    onSuccess: (data) => {
      qc.setQueryData(["settings"], data);
    },
  });
}

export function useCreateRun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      withMockFallback<{ run_id: number }>(
        () => request("/api/runs", { method: "POST" }),
        () => ({ run_id: mockRun.id })
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["runs"] });
    },
  });
}

// ---- SSE run progress ----

const MOCK_PROGRESSION: { stage: Stage; message: string }[] = [
  { stage: "collecting", message: "Collecting from RSS, Hacker News, GitHub, arXiv, Reddit..." },
  { stage: "categorizing", message: "Categorizing 187 collected items" },
  { stage: "filtering", message: "Deduplicating and filtering low-quality items" },
  { stage: "signals", message: "Measuring engagement velocity, trends, and competition" },
  { stage: "evaluating", message: "Scoring 40 survivors with the LLM" },
  { stage: "ranking", message: "Ranking and composing the dashboard" },
  { stage: "done", message: "Run complete" },
];

export interface RunProgressState {
  events: ProgressEvent[];
  latest: ProgressEvent | null;
  connected: boolean;
  isMock: boolean;
}

export function useRunProgress(runId: number | undefined): RunProgressState {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const qc = useQueryClient();

  useEffect(() => {
    if (runId === undefined) return;
    setEvents([]);
    setConnected(false);

    if (FORCE_MOCKS) {
      setIsMock(true);
      return runMockProgression(runId, setEvents, setConnected, qc);
    }

    let es: EventSource | null = null;
    let cancelled = false;
    let cleanupMock: (() => void) | null = null;

    try {
      es = new EventSource(`${API_BASE}/api/runs/${runId}/events`);
      es.addEventListener("open", () => {
        if (cancelled) return;
        setConnected(true);
        setIsMock(false);
        setMockMode(false);
      });
      es.addEventListener("progress", (ev: MessageEvent) => {
        if (cancelled) return;
        try {
          const data: ProgressEvent = JSON.parse(ev.data);
          setEvents((prev) => [...prev, data]);
          if (data.done) {
            qc.invalidateQueries({ queryKey: ["dashboard"] });
            qc.invalidateQueries({ queryKey: ["runs"] });
            qc.invalidateQueries({ queryKey: ["run", runId] });
            es?.close();
          }
        } catch {
          /* ignore malformed event */
        }
      });
      es.addEventListener("error", () => {
        if (cancelled) return;
        es?.close();
        setConnected(false);
        setIsMock(true);
        setMockMode(true);
        cleanupMock = runMockProgression(runId, setEvents, setConnected, qc);
      });
    } catch {
      setIsMock(true);
      setMockMode(true);
      cleanupMock = runMockProgression(runId, setEvents, setConnected, qc);
    }

    return () => {
      cancelled = true;
      es?.close();
      cleanupMock?.();
    };
  }, [runId, qc]);

  return { events, latest: events[events.length - 1] ?? null, connected, isMock };
}

function runMockProgression(
  runId: number,
  setEvents: Dispatch<SetStateAction<ProgressEvent[]>>,
  setConnected: (v: boolean) => void,
  qc: ReturnType<typeof useQueryClient>
) {
  setConnected(true);
  let i = 0;
  let cancelled = false;
  const counts = { collected: 0, filtered: 0, evaluated: 0, per_source: {} as Record<string, number> };

  const step = () => {
    if (cancelled) return;
    const { stage, message } = MOCK_PROGRESSION[i];
    if (stage === "collecting") counts.collected = 187;
    if (stage === "filtering") counts.filtered = 46;
    if (stage === "evaluating") counts.evaluated = 40;
    const done = stage === "done";
    setEvents((prev) => [
      ...prev,
      { stage, message, counts: { ...counts }, done, status: done ? "completed" : "running" },
    ]);
    if (done) {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["runs"] });
      qc.invalidateQueries({ queryKey: ["run", runId] });
      return;
    }
    i += 1;
    setTimeout(step, 700 + Math.random() * 500);
  };
  setTimeout(step, 400);

  return () => {
    cancelled = true;
  };
}
