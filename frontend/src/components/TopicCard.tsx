import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import type { TopicOut } from "../lib/types";
import { Card } from "./ui/primitives";
import { SourceBadge, CategoryChip, UrgencyBadge } from "./badges";
import { ScorePills } from "./ScorePills";
import { MetricsRow } from "./MetricsRow";

export function TopicCard({
  topic,
  size = "md",
  onOpen,
  index = 0,
}: {
  topic: TopicOut;
  size?: "sm" | "md" | "lg";
  onOpen: (topic: TopicOut) => void;
  index?: number;
}) {
  const ev = topic.evaluation;
  return (
    <motion.div
      layoutId={`topic-${topic.id}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4), duration: 0.35, ease: "easeOut" }}
      whileHover={{ y: -2 }}
    >
      <Card
        onClick={() => onOpen(topic)}
        className={`flex h-full cursor-pointer flex-col gap-2.5 p-4 transition-colors hover:border-[var(--accent)] ${
          size === "lg" ? "p-5" : ""
        } ${topic.hidden_gem ? "relative overflow-hidden" : ""}`}
      >
        {topic.hidden_gem && (
          <div
            className="absolute right-0 top-0 flex items-center gap-1 rounded-bl-lg px-2 py-1 text-[10px] font-semibold"
            style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
          >
            <Sparkles size={11} /> HIDDEN GEM
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          <SourceBadge source={topic.source} sourceName={topic.source_name} />
          <CategoryChip category={topic.category} />
          {ev && <UrgencyBadge urgency={ev.urgency} />}
        </div>

        <h3
          className={`font-semibold leading-snug ${size === "lg" ? "text-base" : "text-sm"}`}
          style={{ color: "var(--text-primary)" }}
        >
          {topic.title}
        </h3>

        <p className="line-clamp-2 flex-1 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {ev?.summary || topic.snippet}
        </p>

        <div className="flex items-center justify-between pt-1">
          <MetricsRow metrics={topic.metrics} />
          {ev && (
            <ScorePills
              educational={ev.educational_value}
              virality={ev.virality}
              composite={topic.composite_score}
            />
          )}
        </div>
      </Card>
    </motion.div>
  );
}
