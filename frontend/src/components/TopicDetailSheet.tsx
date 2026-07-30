import { AnimatePresence, motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ExternalLink, X, Radar as RadarIcon, Gauge } from "lucide-react";
import type { TopicOut } from "../lib/types";
import { SourceBadge, CategoryChip, UrgencyBadge, CompetitionBadge } from "./badges";
import { Button } from "./ui/primitives";

export function TopicDetailSheet({ topic, onClose }: { topic: TopicOut | null; onClose: () => void }) {
  const ev = topic?.evaluation;

  const chartData = ev
    ? [
        { axis: "Educational", value: ev.educational_value },
        { axis: "Virality", value: ev.virality },
        { axis: "Beginner-friendly", value: ev.beginner_friendliness },
        { axis: "Community", value: ev.community_interest },
        { axis: "Originality", value: ev.originality },
        { axis: "Brand fit", value: ev.brand_relevance },
      ]
    : [];

  return (
    <AnimatePresence>
      {topic && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.5)" }}
          />
          <motion.div
            key="sheet"
            layoutId={`topic-${topic.id}`}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-y-auto border-l"
            style={{ background: "var(--surface-1)", borderColor: "var(--border)", boxShadow: "var(--shadow-pop)" }}
          >
            <div
              className="sticky top-0 flex items-start justify-between gap-3 border-b px-6 py-5 backdrop-blur"
              style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface-1) 88%, transparent)" }}
            >
              <div className="flex flex-1 flex-wrap items-center gap-1.5">
                <SourceBadge source={topic.source} sourceName={topic.source_name} />
                <CategoryChip category={topic.category} />
                {ev && <UrgencyBadge urgency={ev.urgency} />}
              </div>
              <button onClick={onClose} className="rounded-lg p-1.5 hover:brightness-110" style={{ background: "var(--surface-2)" }}>
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-6 px-6 py-5">
              <h2 className="text-lg font-semibold leading-snug" style={{ color: "var(--text-primary)" }}>
                {topic.title}
              </h2>

              {ev && (
                <section className="flex flex-col gap-2">
                  <SectionLabel icon={Gauge} label="Summary" />
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {ev.summary}
                  </p>
                </section>
              )}

              {ev && (
                <section className="flex flex-col gap-2">
                  <SectionLabel icon={Gauge} label="Why it matters" />
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {ev.why_it_matters}
                  </p>
                </section>
              )}

              {ev && (
                <section className="flex flex-col gap-3">
                  <SectionLabel icon={RadarIcon} label="Scores" />
                  <div style={{ width: "100%", height: 200 }}>
                    <ResponsiveContainer>
                      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                        <XAxis type="number" domain={[0, 10]} hide />
                        <YAxis
                          type="category"
                          dataKey="axis"
                          width={100}
                          tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          cursor={{ fill: "var(--surface-2)" }}
                          contentStyle={{
                            background: "var(--surface-2)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            fontSize: 12,
                            color: "var(--text-primary)",
                          }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={12}>
                          {chartData.map((_, i) => (
                            <Cell key={i} fill="var(--accent)" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      Competition:
                    </span>
                    <CompetitionBadge level={ev.competition} />
                  </div>
                </section>
              )}

              {ev && (
                <section className="flex flex-col gap-2">
                  <SectionLabel icon={Gauge} label="Reasoning" />
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {ev.reasoning}
                  </p>
                </section>
              )}

              {ev && (
                <section
                  className="flex flex-col gap-2 rounded-lg border p-4"
                  style={{ borderColor: "var(--accent-border, var(--border))", background: "var(--accent-bg)" }}
                >
                  <SectionLabel icon={Gauge} label="Recommendation" />
                  <p className="text-sm font-medium leading-relaxed" style={{ color: "var(--text-primary)" }}>
                    {ev.recommendation}
                  </p>
                </section>
              )}

              <Button
                variant="secondary"
                onClick={() => window.open(topic.url, "_blank", "noopener,noreferrer")}
                className="mt-auto"
              >
                <ExternalLink size={14} /> View source
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: typeof Gauge; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
      <Icon size={12} />
      {label}
    </div>
  );
}
