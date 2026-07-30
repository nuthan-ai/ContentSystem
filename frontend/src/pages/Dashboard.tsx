import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock, Coins, ListChecks } from "lucide-react";
import { useDashboard } from "../lib/api";
import type { Category, TopicOut } from "../lib/types";
import { CATEGORY_EMOJI, CATEGORY_LABELS } from "../lib/types";
import { RunResearchButton } from "../components/RunProgress";
import { SearchFilterBar } from "../components/SearchFilterBar";
import { Section, SectionSkeleton, TopTenList } from "../components/Section";
import { TopicDetailSheet } from "../components/TopicDetailSheet";
import { EmptyState, ErrorState } from "../components/ui/primitives";

function matches(topic: TopicOut, query: string, category: Category | null): boolean {
  if (category && topic.category !== category) return false;
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    topic.title.toLowerCase().includes(q) ||
    topic.snippet.toLowerCase().includes(q) ||
    topic.source_name.toLowerCase().includes(q)
  );
}

export default function Dashboard() {
  const [params] = useSearchParams();
  const runId = params.get("run_id") ? Number(params.get("run_id")) : undefined;
  const { data, isLoading, isError, error, refetch } = useDashboard(runId);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [selected, setSelected] = useState<TopicOut | null>(null);

  const filtered = useMemo(() => {
    if (!data) return null;
    const f = (list: TopicOut[]) => list.filter((t) => matches(t, query, category));
    return {
      breaking_news: f(data.breaking_news),
      concepts: f(data.concepts),
      utilities: f(data.utilities),
      workflows: f(data.workflows),
      learning: f(data.learning),
      hidden_gems: f(data.hidden_gems),
      top10: f(data.top10),
    };
  }, [data, query, category]);

  if (isError) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <ErrorState message={(error as Error)?.message || "Failed to load the dashboard."} onRetry={() => refetch()} />
      </div>
    );
  }

  const totalVisible = filtered
    ? filtered.breaking_news.length +
      filtered.concepts.length +
      filtered.utilities.length +
      filtered.workflows.length +
      filtered.learning.length
    : 0;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            Daily Research Dashboard
          </h1>
          {data && (
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs" style={{ color: "var(--text-muted)" }}>
              <span className="inline-flex items-center gap-1">
                <CalendarClock size={12} />
                {new Date(data.run.finished_at ?? data.run.started_at).toLocaleString()}
              </span>
              <span className="inline-flex items-center gap-1">
                <ListChecks size={12} />
                {data.run.counts.evaluated ?? 0} evaluated / {data.run.counts.collected ?? 0} collected
              </span>
              {data.run.est_cost_usd > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Coins size={12} />${data.run.est_cost_usd.toFixed(3)}
                </span>
              )}
            </div>
          )}
        </div>
        <RunResearchButton />
      </div>

      {!isLoading && data && (
        <SearchFilterBar query={query} onQuery={setQuery} active={category} onToggleCategory={setCategory} />
      )}

      {isLoading && (
        <div className="flex flex-col gap-8">
          <SectionSkeleton title="Breaking AI News" emoji={CATEGORY_EMOJI.breaking_news} count={3} />
          <SectionSkeleton title="Trending AI Concepts" emoji={CATEGORY_EMOJI.concept} />
          <SectionSkeleton title="Best AI Utilities" emoji={CATEGORY_EMOJI.utility} />
        </div>
      )}

      {!isLoading && data && filtered && (
        <>
          {totalVisible === 0 ? (
            <EmptyState title="No topics match your filters" description="Try clearing the search or category filter." />
          ) : (
            <>
              <Section
                emoji={CATEGORY_EMOJI.breaking_news}
                title={CATEGORY_LABELS.breaking_news}
                count={3}
                topics={filtered.breaking_news}
                onOpen={setSelected}
                cardSize="lg"
                columns="grid-cols-1 md:grid-cols-3"
              />
              <Section
                emoji={CATEGORY_EMOJI.concept}
                title={CATEGORY_LABELS.concept}
                count={5}
                topics={filtered.concepts}
                onOpen={setSelected}
              />
              <Section
                emoji={CATEGORY_EMOJI.utility}
                title={CATEGORY_LABELS.utility}
                count={5}
                topics={filtered.utilities}
                onOpen={setSelected}
              />
              <Section
                emoji={CATEGORY_EMOJI.workflow}
                title={CATEGORY_LABELS.workflow}
                count={5}
                topics={filtered.workflows}
                onOpen={setSelected}
              />
              <Section
                emoji={CATEGORY_EMOJI.learning}
                title={CATEGORY_LABELS.learning}
                count={5}
                topics={filtered.learning}
                onOpen={setSelected}
              />
              {filtered.hidden_gems.length > 0 && (
                <Section
                  emoji="⭐"
                  title="Hidden Gems"
                  count={3}
                  topics={filtered.hidden_gems}
                  onOpen={setSelected}
                  columns="grid-cols-1 md:grid-cols-3"
                />
              )}
              {filtered.top10.length > 0 && (
                <section className="flex flex-col gap-3">
                  <div className="flex items-baseline gap-2">
                    <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                      <span className="mr-1.5">{"\u{1F4C8}"}</span>
                      Overall Top 10 Content Opportunities
                    </h2>
                  </div>
                  <TopTenList topics={filtered.top10} onOpen={setSelected} />
                </section>
              )}
            </>
          )}
        </>
      )}

      {!isLoading && !data && (
        <EmptyState
          title="No run yet"
          description="Click Run Research to collect, filter, and rank today's AI content opportunities."
        />
      )}

      <TopicDetailSheet topic={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
