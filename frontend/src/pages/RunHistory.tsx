import { useNavigate } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, Coins, ListChecks } from "lucide-react";
import { useRuns } from "../lib/api";
import type { RunStatus } from "../lib/types";
import { Card, EmptyState, ErrorState, Skeleton } from "../components/ui/primitives";

const STATUS_META: Record<RunStatus, { icon: typeof CheckCircle2; color: string; label: string }> = {
  completed: { icon: CheckCircle2, color: "var(--good)", label: "Completed" },
  failed: { icon: XCircle, color: "var(--critical)", label: "Failed" },
  running: { icon: Loader2, color: "var(--accent)", label: "Running" },
};

export default function RunHistory() {
  const { data, isLoading, isError, error, refetch } = useRuns();
  const navigate = useNavigate();

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-6 py-8">
      <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
        Run History
      </h1>

      {isLoading && (
        <div className="flex flex-col gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      )}

      {isError && <ErrorState message={(error as Error)?.message || "Failed to load runs."} onRetry={() => refetch()} />}

      {!isLoading && !isError && data && data.length === 0 && (
        <EmptyState title="No runs yet" description="Trigger your first run from the dashboard." />
      )}

      {!isLoading && data && data.length > 0 && (
        <div className="flex flex-col gap-3">
          {data.map((run) => {
            const meta = STATUS_META[run.status];
            const Icon = meta.icon;
            return (
              <Card
                key={run.id}
                onClick={() => run.status === "completed" && navigate(`/?run_id=${run.id}`)}
                className={`flex items-center justify-between gap-4 p-4 ${
                  run.status === "completed" ? "cursor-pointer hover:border-[var(--accent)]" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} style={{ color: meta.color }} className={run.status === "running" ? "animate-spin" : ""} />
                  <div>
                    <p className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      Run #{run.id} · {meta.label}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(run.started_at).toLocaleString()}
                      {run.error ? ` — ${run.error}` : ""}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
                  {run.counts.evaluated !== undefined && (
                    <span className="inline-flex items-center gap-1">
                      <ListChecks size={12} />
                      {run.counts.evaluated}/{run.counts.collected ?? 0}
                    </span>
                  )}
                  {run.est_cost_usd > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Coins size={12} />${run.est_cost_usd.toFixed(3)}
                    </span>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
