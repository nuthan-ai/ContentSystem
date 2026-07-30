import { Search } from "lucide-react";
import type { Category } from "../lib/types";
import { CATEGORY_LABELS } from "../lib/types";
import { Chip, Input } from "./ui/primitives";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

export function SearchFilterBar({
  query,
  onQuery,
  active,
  onToggleCategory,
}: {
  query: string;
  onQuery: (v: string) => void;
  active: Category | null;
  onToggleCategory: (c: Category | null) => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
        <Input value={query} onChange={(e) => onQuery(e.target.value)} placeholder="Search topics..." className="pl-8" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Chip active={active === null} onClick={() => onToggleCategory(null)}>
          All
        </Chip>
        {CATEGORIES.map((c) => (
          <Chip key={c} active={active === c} onClick={() => onToggleCategory(active === c ? null : c)}>
            {CATEGORY_LABELS[c]}
          </Chip>
        ))}
      </div>
    </div>
  );
}
