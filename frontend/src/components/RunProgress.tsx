import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, Play, X } from "lucide-react";
import { fetchRunsOnce, useCreateRun, useRunProgress } from "../lib/api";
import { STAGE_ORDER, STAGE_LABELS, type Stage } from "../lib/types";
import { Button } from "./ui/primitives";
import { useToast } from "../lib/toast";

const VISIBLE_STAGES = STAGE_ORDER.filter((s) => s !== "done");

export function RunResearchButton() {
  const [activeRunId, setActiveRunId] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const createRun = useCreateRun();
  const progress = useRunProgress(activeRunId ?? undefined);
  const { push } = useToast();

  const isRunning = activeRunId !== null && !(progress.latest?.done ?? false);

  async function handleClick() {
    try {
      const { run_id } = await createRun.mutateAsync();
      setActiveRunId(run_id);
      setPanelOpen(true);
    } catch (e) {
      const err = e as Error & { status?: number };
      if (err.status === 409) {
        const runs = await fetchRunsOnce();
        const running = runs.find((r) => r.status === "running");
        if (running) {
          setActiveRunId(running.id);
          setPanelOpen(true);
          push("Attached to the run already in progress.", "success");
          return;
        }
      }
      push(err.message || "Could not start a run.", "error");
    }
  }

  function handleClosePanel() {
    setPanelOpen(false);
    if (progress.latest?.done) {
      if (progress.latest.status === "completed") push("Research run completed.", "success");
      else push(progress.latest.error || "Run failed.", "error");
    }
  }

  return (
    <>
      <Button variant="primary" onClick={handleClick} disabled={isRunning || createRun.isPending}>
        {isRunning ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
        {isRunning ? "Running..." : "Run Research"}
      </Button>

      <AnimatePresence>
        {panelOpen && activeRunId !== null && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              style={{ background: "rgba(0,0,0,0.45)" }}
              onClick={() => progress.latest?.done && handleClosePanel()}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.97 }}
              className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border p-6"
              style={{ background: "var(--surface-1)", borderColor: "var(--border)", boxShadow: "var(--shadow-pop)" }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  Research run #{activeRunId}
                </h3>
                {progress.latest?.done && (
                  <button onClick={handleClosePanel} className="rounded-lg p-1 hover:brightness-110" style={{ background: "var(--surface-2)" }}>
                    <X size={14} />
                  </button>
                )}
              </div>

              <ol className="flex flex-col gap-3">
                {VISIBLE_STAGES.map((stage) => (
                  <StepRow key={stage} stage={stage} currentStage={progress.latest?.stage} done={progress.latest?.done ?? false} />
                ))}
              </ol>

              {progress.latest && (
                <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
                  {progress.latest.message}
                  {progress.latest.counts.collected !== undefined && (
                    <span className="tabular-nums"> · {progress.latest.counts.collected} collected</span>
                  )}
                  {progress.latest.counts.filtered !== undefined && (
                    <span className="tabular-nums"> · {progress.latest.counts.filtered} filtered</span>
                  )}
                  {progress.latest.counts.evaluated !== undefined && (
                    <span className="tabular-nums"> · {progress.latest.counts.evaluated} evaluated</span>
                  )}
                </p>
              )}

              {progress.latest?.done && progress.latest.status === "completed" && (
                <Button variant="primary" className="mt-5 w-full" onClick={handleClosePanel}>
                  <Check size={14} /> View dashboard
                </Button>
              )}
              {progress.latest?.done && progress.latest.status === "failed" && (
                <div className="mt-5 rounded-lg border p-3 text-xs" style={{ borderColor: "var(--critical)", color: "var(--critical)" }}>
                  {progress.latest.error || "The run failed."}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function StepRow({
  stage,
  currentStage,
  done,
}: {
  stage: Stage;
  currentStage: Stage | undefined;
  done: boolean;
}) {
  const currentIdx = currentStage ? STAGE_ORDER.indexOf(currentStage) : -1;
  const stageIdx = STAGE_ORDER.indexOf(stage);
  const isDone = currentIdx > stageIdx || (done && currentIdx >= stageIdx);
  const isActive = stageIdx === currentIdx && !done;

  return (
    <li className="flex items-center gap-3">
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
        style={{
          background: isDone ? "var(--good)" : isActive ? "var(--accent)" : "var(--surface-2)",
          color: isDone || isActive ? "#fff" : "var(--text-muted)",
        }}
      >
        {isDone ? <Check size={12} /> : isActive ? <Loader2 size={12} className="animate-spin" /> : ""}
      </span>
      <span
        className="text-sm"
        style={{ color: isActive ? "var(--text-primary)" : isDone ? "var(--text-secondary)" : "var(--text-muted)" }}
      >
        {STAGE_LABELS[stage]}
      </span>
    </li>
  );
}
