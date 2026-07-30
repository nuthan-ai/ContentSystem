import { Star, ArrowBigUp, MessageCircle, TrendingUp } from "lucide-react";

function fmt(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return `${Math.round(n)}`;
}

export function MetricsRow({ metrics }: { metrics: Record<string, number> }) {
  const parts: { icon: typeof Star; value: string; title: string }[] = [];
  if (metrics.stars !== undefined) parts.push({ icon: Star, value: fmt(metrics.stars), title: "GitHub stars" });
  if (metrics.stars_per_day !== undefined)
    parts.push({ icon: TrendingUp, value: `${fmt(metrics.stars_per_day)}/day`, title: "Stars per day" });
  if (metrics.points !== undefined) parts.push({ icon: ArrowBigUp, value: fmt(metrics.points), title: "Points" });
  if (metrics.upvotes !== undefined) parts.push({ icon: ArrowBigUp, value: fmt(metrics.upvotes), title: "Upvotes" });
  if (metrics.comments !== undefined)
    parts.push({ icon: MessageCircle, value: fmt(metrics.comments), title: "Comments" });

  if (parts.length === 0) return null;

  return (
    <div className="flex items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
      {parts.map((p, i) => (
        <span key={i} className="inline-flex items-center gap-1 tabular-nums" title={p.title}>
          <p.icon size={12} />
          {p.value}
        </span>
      ))}
    </div>
  );
}
