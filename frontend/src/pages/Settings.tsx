import { useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Plus, Trash2, Search, Save, KeyRound, Sliders, Rss, Users2, ToggleLeft } from "lucide-react";
import { useModels, useSettings, useUpdateSettings } from "../lib/api";
import type { FeedConfig, SubredditConfig } from "../lib/types";
import { Button, Card, ErrorState, Input, Skeleton } from "../components/ui/primitives";
import { useToast } from "../lib/toast";

function fmtPrice(n: number): string {
  return `$${n.toFixed(2)}/1M`;
}

export default function Settings() {
  const { data, isLoading, isError, error, refetch } = useSettings();
  const { data: models, isLoading: modelsLoading } = useModels();
  const update = useUpdateSettings();
  const { push } = useToast();

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("");
  const [modelQuery, setModelQuery] = useState("");
  const [itemCap, setItemCap] = useState(60);
  const [feeds, setFeeds] = useState<FeedConfig[]>([]);
  const [subreddits, setSubreddits] = useState<SubredditConfig[]>([]);
  const [sourcesEnabled, setSourcesEnabled] = useState<Record<string, boolean>>({});
  const [newFeedName, setNewFeedName] = useState("");
  const [newFeedUrl, setNewFeedUrl] = useState("");
  const [newSubreddit, setNewSubreddit] = useState("");

  useEffect(() => {
    if (!data) return;
    setModel(data.openrouter_model);
    setItemCap(data.llm_item_cap);
    setFeeds(data.feeds);
    setSubreddits(data.subreddits);
    setSourcesEnabled(data.sources_enabled);
  }, [data]);

  const filteredModels = useMemo(() => {
    if (!models) return [];
    const q = modelQuery.toLowerCase();
    return models.filter((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q));
  }, [models, modelQuery]);

  async function handleSave() {
    try {
      await update.mutateAsync({
        openrouter_model: model,
        llm_item_cap: itemCap,
        feeds,
        subreddits,
        sources_enabled: sourcesEnabled,
        ...(apiKey ? { openrouter_api_key: apiKey } : {}),
      });
      setApiKey("");
      push("Settings saved.");
    } catch (e) {
      push((e as Error).message || "Failed to save settings.", "error");
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-10">
        <ErrorState message={(error as Error)?.message || "Failed to load settings."} onRetry={() => refetch()} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-8 pb-16">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
          Settings
        </h1>
        <Button variant="primary" onClick={handleSave} disabled={update.isPending}>
          <Save size={14} /> Save changes
        </Button>
      </div>

      <Card className="flex flex-col gap-4 p-5">
        <SectionTitle icon={KeyRound} title="OpenRouter API key" />
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              placeholder={data?.api_key_masked || "sk-or-..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-9"
            />
            <button
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
              type="button"
            >
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {data?.api_key_set ? `Currently set (${data.api_key_masked}). Enter a new key to replace it.` : "No key set — evaluation stage will be skipped until one is added."}
        </p>

        <div className="mt-2 flex flex-col gap-2">
          <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
            Model
          </label>
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-muted)" }} />
            <Input value={modelQuery} onChange={(e) => setModelQuery(e.target.value)} placeholder="Search models..." className="pl-8" />
          </div>
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto rounded-lg border p-1" style={{ borderColor: "var(--border)" }}>
            {modelsLoading && <Skeleton className="h-8 m-1" />}
            {!modelsLoading &&
              filteredModels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setModel(m.id)}
                  className="flex items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors"
                  style={
                    model === m.id
                      ? { background: "var(--accent-bg)", color: "var(--accent)" }
                      : { color: "var(--text-secondary)" }
                  }
                >
                  <span className="font-medium">{m.name}</span>
                  <span className="tabular-nums" style={{ color: "var(--text-muted)" }}>
                    {fmtPrice(m.prompt_price)} in / {fmtPrice(m.completion_price)} out
                  </span>
                </button>
              ))}
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Selected: <span style={{ color: "var(--text-primary)" }}>{model || "none"}</span>
          </p>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <SectionTitle icon={Sliders} title="LLM item cap" />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Maximum filtered items sent to the LLM per run — the main cost guard.
        </p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={150}
            value={itemCap}
            onChange={(e) => setItemCap(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-12 text-right text-sm font-semibold tabular-nums" style={{ color: "var(--text-primary)" }}>
            {itemCap}
          </span>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <SectionTitle icon={ToggleLeft} title="Sources" />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(sourcesEnabled).map(([src, enabled]) => (
            <label key={src} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)" }}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setSourcesEnabled((prev) => ({ ...prev, [src]: e.target.checked }))}
              />
              <span style={{ color: "var(--text-secondary)" }}>{src}</span>
            </label>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <SectionTitle icon={Rss} title="RSS feeds" />
        <div className="flex flex-col gap-1.5">
          {feeds.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "var(--border)" }}>
              <input
                type="checkbox"
                checked={f.enabled}
                onChange={(e) =>
                  setFeeds((prev) => prev.map((x, xi) => (xi === i ? { ...x, enabled: e.target.checked } : x)))
                }
              />
              <span className="w-40 shrink-0 font-medium" style={{ color: "var(--text-primary)" }}>
                {f.name}
              </span>
              <span className="flex-1 truncate" style={{ color: "var(--text-muted)" }}>
                {f.url}
              </span>
              <button onClick={() => setFeeds((prev) => prev.filter((_, xi) => xi !== i))} className="opacity-60 hover:opacity-100">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="Feed name" value={newFeedName} onChange={(e) => setNewFeedName(e.target.value)} className="w-40" />
          <Input placeholder="https://example.com/rss.xml" value={newFeedUrl} onChange={(e) => setNewFeedUrl(e.target.value)} />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!newFeedName || !newFeedUrl) return;
              setFeeds((prev) => [...prev, { name: newFeedName, url: newFeedUrl, enabled: true }]);
              setNewFeedName("");
              setNewFeedUrl("");
            }}
          >
            <Plus size={13} />
          </Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <SectionTitle icon={Users2} title="Subreddits" />
        <div className="flex flex-wrap gap-2">
          {subreddits.map((s, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs"
              style={{ borderColor: "var(--border)", background: s.enabled ? "var(--accent-bg)" : "transparent" }}
            >
              <input
                type="checkbox"
                checked={s.enabled}
                onChange={(e) =>
                  setSubreddits((prev) => prev.map((x, xi) => (xi === i ? { ...x, enabled: e.target.checked } : x)))
                }
              />
              <span style={{ color: s.enabled ? "var(--accent)" : "var(--text-secondary)" }}>r/{s.name}</span>
              <button onClick={() => setSubreddits((prev) => prev.filter((_, xi) => xi !== i))} className="opacity-60 hover:opacity-100">
                <Trash2 size={11} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="subreddit name" value={newSubreddit} onChange={(e) => setNewSubreddit(e.target.value)} className="max-w-xs" />
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (!newSubreddit) return;
              setSubreddits((prev) => [...prev, { name: newSubreddit, enabled: true }]);
              setNewSubreddit("");
            }}
          >
            <Plus size={13} />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function SectionTitle({ icon: Icon, title }: { icon: typeof KeyRound; title: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
      <Icon size={15} style={{ color: "var(--accent)" }} />
      {title}
    </div>
  );
}
