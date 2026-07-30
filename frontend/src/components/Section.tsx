import type { ReactNode } from "react";
import type { TopicOut } from "../lib/types";
import { TopicCard } from "./TopicCard";
import { Skeleton } from "./ui/primitives";

export function Section({
  emoji,
  title,
  count,
  topics,
  onOpen,
  cardSize = "md",
  columns = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  emptyMessage,
}: {
  emoji: string;
  title: string;
  count: number;
  topics: TopicOut[];
  onOpen: (t: TopicOut) => void;
  cardSize?: "sm" | "md" | "lg";
  columns?: string;
  emptyMessage?: string;
}) {
  if (topics.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          <span className="mr-1.5">{emoji}</span>
          {title}
        </h2>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          Top {count}
        </span>
      </div>
      <div className={`grid gap-3 ${columns}`}>
        {topics.map((t, i) => (
          <TopicCard key={t.id} topic={t} onOpen={onOpen} size={cardSize} index={i} />
        ))}
      </div>
      {emptyMessage && topics.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

export function SectionSkeleton({ title, emoji, count = 3 }: { title: string; emoji: string; count?: number }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
        <span className="mr-1.5">{emoji}</span>
        {title}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
    </section>
  );
}

export function TopTenList({ topics, onOpen }: { topics: TopicOut[]; onOpen: (t: TopicOut) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {topics.map((t, i) => (
        <RankRow key={t.id} rank={i + 1} topic={t} onOpen={onOpen} />
      ))}
    </div>
  );
}

function RankRow({ rank, topic, onOpen }: { rank: number; topic: TopicOut; onOpen: (t: TopicOut) => void }) {
  return (
    <button
      onClick={() => onOpen(topic)}
      className="flex items-center gap-4 rounded-xl border px-4 py-3 text-left transition-colors hover:border-[var(--accent)]"
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums"
        style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
      >
        {rank}
      </span>
      <span className="flex-1 truncate text-sm font-medium" style={{ color: "var(--text-primary)" }}>
        {topic.title}
      </span>
      <span className="shrink-0 text-xs font-semibold tabular-nums" style={{ color: "var(--accent)" }}>
        {topic.composite_score.toFixed(1)}
      </span>
    </button>
  );
}

export function PageHeading({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-semibold" style={{ color: "var(--text-primary)" }}>
        {children}
      </h1>
      {action}
    </div>
  );
}
