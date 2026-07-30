import { GraduationCap, TrendingUp, Star } from "lucide-react";

function scoreColor(score: number): string {
  // sequential blue ramp, low->high maps to lighter->stronger
  if (score >= 8) return "var(--accent-strong)";
  if (score >= 6) return "var(--accent)";
  return "var(--text-muted)";
}

function Pill({ icon: Icon, label, value }: { icon: typeof Star; label: string; value: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium tabular-nums"
      style={{ color: scoreColor(value) }}
      title={label}
    >
      <Icon size={11} />
      {value.toFixed(1)}
    </span>
  );
}

export function ScorePills({
  educational,
  virality,
  composite,
}: {
  educational: number;
  virality: number;
  composite: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <Pill icon={GraduationCap} label="Educational value" value={educational} />
      <Pill icon={TrendingUp} label="Virality" value={virality} />
      <span
        className="ml-0.5 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums"
        style={{ background: "var(--accent-bg)", color: "var(--accent)" }}
        title="Composite score"
      >
        <Star size={11} />
        {composite.toFixed(1)}
      </span>
    </div>
  );
}
