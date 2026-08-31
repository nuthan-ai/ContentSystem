import type {
  Competition,
  DashboardOut,
  ModelInfo,
  RunOut,
  SettingsOut,
  Source,
  TopicOut,
  Urgency,
} from "./types";

interface MockTopicSeed {
  title: string;
  snippet: string;
  why: string;
  reasoning: string;
  recommendation: string;
  edu: number;
  vir: number;
  beg: number;
  com: number;
  orig: number;
  brand: number;
  comp: Competition;
  urg: Urgency;
  stars?: number;
  source: Source;
  sname: string;
  url: string;
}

let idCounter = 1;
const nextId = () => idCounter++;

function topic(partial: Omit<TopicOut, "id">): TopicOut {
  return { id: nextId(), ...partial };
}

const now = Date.now();
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString();

function evalFor(opts: {
  educational: number;
  virality: number;
  beginner: number;
  community: number;
  originality: number;
  brand: number;
  competition: "low" | "medium" | "high";
  urgency: "now" | "this_week" | "evergreen";
  summary: string;
  why: string;
  reasoning: string;
  recommendation: string;
}) {
  return {
    educational_value: opts.educational,
    beginner_friendliness: opts.beginner,
    community_interest: opts.community,
    originality: opts.originality,
    brand_relevance: opts.brand,
    virality: opts.virality,
    competition: opts.competition,
    urgency: opts.urgency,
    summary: opts.summary,
    why_it_matters: opts.why,
    reasoning: opts.reasoning,
    recommendation: opts.recommendation,
  };
}

function composite(e: ReturnType<typeof evalFor>): number {
  const penalty = e.competition === "low" ? 0 : e.competition === "medium" ? 0.5 : 1.0;
  const score =
    0.3 * e.educational_value +
    0.25 * e.virality +
    0.15 * e.community_interest +
    0.15 * e.originality +
    0.15 * e.brand_relevance -
    penalty;
  return Math.round(Math.max(0, Math.min(10, score)) * 10) / 10;
}

const breakingNews: TopicOut[] = [
  (() => {
    const ev = evalFor({
      educational: 8,
      virality: 9,
      beginner: 7,
      community: 9,
      originality: 7,
      brand: 9,
      competition: "high",
      urgency: "now",
      summary: "Anthropic shipped Claude Opus 5 with a large jump in agentic coding benchmarks and a new extended-context mode.",
      why: "Every creator in the space will cover this within 24h — being early with a clear technical breakdown wins the algorithm.",
      reasoning: "High engagement velocity (posted 3h ago, already 900+ HN points) plus cross-platform momentum (also trending on Reddit and GitHub discussions). Competition is high because every AI account will post about it, but a differentiated angle (real benchmark reproduction) still wins.",
      recommendation: "Publish a hands-on breakdown within 24 hours — a benchmark reproduction or migration guide, not just an announcement recap.",
    });
    return topic({
      title: "Anthropic releases Claude Opus 5 with major agentic coding gains",
      url: "https://www.anthropic.com/news/claude-opus-5",
      source: "rss",
      source_name: "Anthropic News",
      category: "breaking_news",
      snippet: "Opus 5 introduces a new extended reasoning mode and scores significantly higher on SWE-bench and agentic tool-use evals.",
      published_at: hoursAgo(3),
      metrics: { points: 912, comments: 340 },
      signals: { virality_score: 9.2, engagement_velocity: 9.4, trends_slope: 8.8, momentum: 3, competition_level: "high", competition_results: 41 },
      evaluation: ev,
      composite_score: composite(ev),
      hidden_gem: false,
    });
  })(),
  (() => {
    const ev = evalFor({
      educational: 7,
      virality: 8,
      beginner: 6,
      community: 7,
      originality: 6,
      brand: 8,
      competition: "medium",
      urgency: "now",
      summary: "GitHub Copilot adds a new background agent mode that can open and iterate on pull requests autonomously.",
      why: "Developer audiences want to know what autonomous PR workflows mean for day-to-day coding — practical, not hype.",
      reasoning: "Strong momentum across GitHub changelog and Hacker News; moderate competition since fewer creators have hands-on access yet.",
      recommendation: "Create content within 2 days — a workflow demo comparing it to existing agent tools.",
    });
    return topic({
      title: "GitHub Copilot ships autonomous background coding agent",
      url: "https://github.blog/changelog/copilot-background-agent",
      source: "rss",
      source_name: "GitHub Changelog",
      category: "breaking_news",
      snippet: "The new agent mode can pick up issues, open PRs, and respond to review comments without a human driving each step.",
      published_at: hoursAgo(6),
      metrics: { points: 540, comments: 210 },
      signals: { virality_score: 8.1, engagement_velocity: 8.0, trends_slope: 7.5, momentum: 2, competition_level: "medium", competition_results: 18 },
      evaluation: ev,
      composite_score: composite(ev),
      hidden_gem: false,
    });
  })(),
  (() => {
    const ev = evalFor({
      educational: 8,
      virality: 7,
      beginner: 5,
      community: 6,
      originality: 7,
      brand: 7,
      competition: "medium",
      urgency: "this_week",
      summary: "Google DeepMind published a technical report on a new mixture-of-experts routing method that cuts inference cost by 30%.",
      why: "Cost-efficient inference is a recurring pain point for indie builders running their own models.",
      reasoning: "Solid engagement on Hacker News, moderate cross-platform spread. Competition medium since it's a technical topic requiring some depth to cover well.",
      recommendation: "Good for a deeper-dive explainer within the week — pairs well with a cost-comparison chart.",
    });
    return topic({
      title: "DeepMind's new MoE routing method cuts inference cost 30%",
      url: "https://deepmind.google/blog/moe-routing-efficiency",
      source: "rss",
      source_name: "Google DeepMind Blog",
      category: "breaking_news",
      snippet: "The technique dynamically routes tokens to fewer experts without a meaningful quality drop, published alongside open benchmarks.",
      published_at: hoursAgo(14),
      metrics: { points: 410, comments: 96 },
      signals: { virality_score: 7.3, engagement_velocity: 6.8, trends_slope: 6.0, momentum: 2, competition_level: "medium", competition_results: 22 },
      evaluation: ev,
      composite_score: composite(ev),
      hidden_gem: false,
    });
  })(),
];

const concepts: MockTopicSeed[] = [
  {
    title: "Loop Engineering",
    snippet: "Designing agent control loops — when to re-plan, when to retry, when to hand off to a human — as a discipline distinct from prompt engineering.",
    why: "Barely covered yet, but every serious agent builder runs into this exact problem within a week.",
    reasoning: "Low competition, high educational value; the term is trending in developer Twitter/HN threads but has almost no dedicated explainer content.",
    recommendation: "Create content within the next few days — first-mover advantage on the term.",
    edu: 10, vir: 9, beg: 6, com: 7, orig: 9, brand: 8, comp: "low" as const, urg: "now" as const,
    stars: 2400, source: "github" as const, sname: "trending repos", url: "https://github.com/example/loop-engineering-patterns",
  },
  {
    title: "Context Engineering",
    snippet: "The practice of deliberately curating what an LLM sees — retrieval, memory, tool outputs — rather than relying on prompt wording alone.",
    why: "Foundational concept creators keep referencing without ever fully explaining it — an evergreen educational gap.",
    reasoning: "Consistently referenced across arXiv papers and engineering blogs; moderate competition since a few creators have started covering it.",
    recommendation: "Strong evergreen piece — publish this week and update quarterly.",
    edu: 9, vir: 7, beg: 7, com: 8, orig: 6, brand: 7, comp: "medium" as const, urg: "this_week" as const,
    stars: 0, source: "rss" as const, sname: "Simon Willison", url: "https://simonwillison.net/2026/context-engineering",
  },
  {
    title: "Harness Engineering",
    snippet: "The scaffolding — tool definitions, permission models, sandboxing — that determines whether an agent is safe and effective, independent of the underlying model.",
    why: "As agent frameworks multiply, the harness (not the model) is becoming the real differentiator worth teaching.",
    reasoning: "Emerging term with low search competition and strong resonance with the CLI-agent builder audience.",
    recommendation: "High upside, low competition — good candidate for a flagship explainer.",
    edu: 9, vir: 8, beg: 5, com: 6, orig: 9, brand: 9, comp: "low" as const, urg: "now" as const,
    stars: 0, source: "hackernews" as const, sname: "Hacker News", url: "https://news.ycombinator.com/item?id=example1",
  },
  {
    title: "Memory Systems for Agents",
    snippet: "Comparing episodic, semantic, and procedural memory designs for long-running AI agents beyond simple vector-store RAG.",
    why: "Long-context models raise the question of what memory even means now — a timely reframe of a familiar topic.",
    reasoning: "Steady interest across Reddit and arXiv; medium competition given several existing explainers, but few connect it to Claude Code / agent CLIs specifically.",
    recommendation: "Publish within the week with a code-first angle to stand out from generic explainers.",
    edu: 8, vir: 6, beg: 6, com: 7, orig: 5, brand: 7, comp: "medium" as const, urg: "this_week" as const,
    stars: 890, source: "reddit" as const, sname: "r/LocalLLaMA", url: "https://reddit.com/r/LocalLLaMA/comments/example2",
  },
  {
    title: "MCP (Model Context Protocol) in practice",
    snippet: "A practical look at building and consuming MCP servers — beyond the spec, what actually breaks in production.",
    why: "MCP adoption is accelerating fast; a practical, mistakes-first guide is more valuable than another intro post.",
    reasoning: "High cross-platform momentum (GitHub, HN, Reddit all showing MCP-related spikes); competition rising as more intro content appears, so differentiation matters.",
    recommendation: "This week — focus specifically on debugging/production angle since intros are now saturated.",
    edu: 8, vir: 7, beg: 6, com: 8, orig: 6, brand: 8, comp: "medium" as const, urg: "this_week" as const,
    stars: 5200, source: "github" as const, sname: "trending repos", url: "https://github.com/example/mcp-production-guide",
  },
];

const utilities: MockTopicSeed[] = [
  {
    title: "agent-reach: zero-cost multi-platform research CLI",
    snippet: "A CLI that lets an AI agent search Twitter, Reddit, YouTube, GitHub and more without per-platform API keys.",
    why: "Directly solves the 'my agent can't see the internet' problem creators keep running into.",
    reasoning: "Fast-growing star count, low competition since it's still under the radar outside its own GitHub trending appearance.",
    recommendation: "Cover this week with a setup walkthrough — genuinely useful, not just novel.",
    edu: 7, vir: 8, beg: 8, com: 7, orig: 8, brand: 7, comp: "low" as const, urg: "this_week" as const,
    stars: 12400, source: "github" as const, sname: "trending repos", url: "https://github.com/example/agent-reach",
  },
  {
    title: "Claude Skill: repo-onboarding",
    snippet: "A packaged Claude Skill that auto-generates onboarding docs for any repo by tracing entrypoints and data flow.",
    why: "Skills are a new distribution surface for tools — early practical examples get outsized attention.",
    reasoning: "New format, low competition, decent early community interest on the Claude Skills marketplace discussions.",
    recommendation: "Good hidden-gem candidate — cover before it becomes obvious.",
    edu: 7, vir: 6, beg: 8, com: 5, orig: 8, brand: 8, comp: "low" as const, urg: "this_week" as const,
    stars: 640, source: "github" as const, sname: "trending repos", url: "https://github.com/example/repo-onboarding-skill",
  },
  {
    title: "token-diet: prompt token optimizer CLI",
    snippet: "Rewrites verbose prompts and system messages to cut token usage 20-40% with minimal quality loss, benchmarked per model.",
    why: "Cost control is a universal pain point for anyone running agents at scale.",
    reasoning: "Solid engagement velocity, medium competition as a few similar tools exist but this one has published benchmarks.",
    recommendation: "This week — a before/after cost breakdown format performs well.",
    edu: 6, vir: 6, beg: 7, com: 6, orig: 6, brand: 6, comp: "medium" as const, urg: "this_week" as const,
    stars: 1800, source: "hackernews" as const, sname: "Hacker News", url: "https://news.ycombinator.com/item?id=example3",
  },
  {
    title: "Cursor Rules pack: monorepo conventions",
    snippet: "A curated .cursor/rules set for enforcing monorepo conventions (imports, testing, package boundaries) across large codebases.",
    why: "Rules packs are an easy, practical win to share — high perceived usefulness for low reading effort.",
    reasoning: "Niche audience but very high relevance for teams; low competition since most rules content is generic.",
    recommendation: "Evergreen reference post — publish anytime this week.",
    edu: 6, vir: 5, beg: 7, com: 5, orig: 6, brand: 6, comp: "low" as const, urg: "evergreen" as const,
    stars: 320, source: "github" as const, sname: "trending repos", url: "https://github.com/example/cursor-monorepo-rules",
  },
  {
    title: "browser-mcp: control Chrome from any MCP client",
    snippet: "An MCP server exposing browser automation (click, fill, screenshot) to any compatible agent client.",
    why: "Browser control is one of the most-requested agent capabilities and this removes a lot of setup friction.",
    reasoning: "Rapid star growth this week, medium competition as similar tools exist but with worse DX.",
    recommendation: "Cover within the week with a live automation demo.",
    edu: 6, vir: 7, beg: 6, com: 6, orig: 6, brand: 7, comp: "medium" as const, urg: "this_week" as const,
    stars: 3100, source: "github" as const, sname: "trending repos", url: "https://github.com/example/browser-mcp",
  },
];

const workflows: MockTopicSeed[] = [
  {
    title: "Multi-agent code review pipelines",
    snippet: "Patterns for running a reviewer agent, a security agent, and a style agent in parallel before a human ever sees the diff.",
    why: "Teams are actively building these pipelines right now and want proven patterns, not theory.",
    reasoning: "Strong developer workflow interest across GitHub discussions and blog posts; medium competition.",
    recommendation: "Publish this week with a concrete pipeline diagram and example config.",
    edu: 8, vir: 7, beg: 5, com: 7, orig: 6, brand: 8, comp: "medium" as const, urg: "this_week" as const,
    stars: 0, source: "rss" as const, sname: "Vercel Blog", url: "https://vercel.com/blog/multi-agent-review",
  },
  {
    title: "RAG architecture for fast-changing docs",
    snippet: "A pattern for keeping retrieval-augmented generation fresh when source documentation changes daily, using incremental re-embedding.",
    why: "Most RAG tutorials assume static corpora — this addresses the much more common real-world case.",
    reasoning: "Steady arXiv and engineering-blog interest; low-medium competition since most content still targets static RAG.",
    recommendation: "Good evergreen workflow post — publish this week.",
    edu: 8, vir: 6, beg: 6, com: 6, orig: 7, brand: 7, comp: "low" as const, urg: "this_week" as const,
    stars: 0, source: "arxiv" as const, sname: "arXiv cs.CL", url: "https://arxiv.org/abs/2026.example4",
  },
  {
    title: "End-to-end AI content pipeline (research → draft → publish)",
    snippet: "A worked example of exactly this kind of system — automated research feeding an LLM-assisted drafting and scheduling pipeline.",
    why: "Meta and highly relevant — creators building their own systems want to see a full worked pipeline, not just pieces.",
    reasoning: "High brand relevance for this exact audience; low competition on the full-pipeline framing (most posts cover only one stage).",
    recommendation: "High priority — this is close to a flagship post for this channel.",
    edu: 8, vir: 8, beg: 6, com: 7, orig: 8, brand: 10, comp: "low" as const, urg: "now" as const,
    stars: 0, source: "rss" as const, sname: "Hugging Face Blog", url: "https://huggingface.co/blog/content-pipeline-example",
  },
  {
    title: "Automating PR triage with a coding agent",
    snippet: "A workflow for having an agent label, summarize, and route incoming pull requests before human maintainers look at them.",
    why: "Directly actionable for any maintainer drowning in PRs — high practical value.",
    reasoning: "Decent Hacker News traction; medium competition as similar posts exist but few show real automation configs.",
    recommendation: "This week, with an actual before/after triage-time metric if possible.",
    edu: 7, vir: 6, beg: 6, com: 6, orig: 5, brand: 6, comp: "medium" as const, urg: "this_week" as const,
    stars: 0, source: "hackernews" as const, sname: "Hacker News", url: "https://news.ycombinator.com/item?id=example5",
  },
  {
    title: "Agentic testing workflows: let the agent write and run its own tests",
    snippet: "A loop where a coding agent proposes a change, writes tests for it, runs them, and only then opens a PR.",
    why: "Addresses the single biggest trust gap in AI-assisted coding — 'but did it actually test it'.",
    reasoning: "Growing momentum across dev blogs and Reddit; low competition since most agentic-testing content is still shallow.",
    recommendation: "Strong candidate — publish this week with a real failure-and-recovery example.",
    edu: 8, vir: 7, beg: 5, com: 7, orig: 7, brand: 8, comp: "low" as const, urg: "this_week" as const,
    stars: 0, source: "reddit" as const, sname: "r/ClaudeAI", url: "https://reddit.com/r/ClaudeAI/comments/example6",
  },
];

const learning: MockTopicSeed[] = [
  {
    title: "Anthropic's guide to building effective agents",
    snippet: "An engineering-blog deep dive into agent design patterns Anthropic uses internally — workflows vs. true agents, when to add tools.",
    why: "Primary-source material from the model maker itself carries outsized credibility for a summary/breakdown post.",
    reasoning: "Reliable long-tail traffic, low competition for a truly thorough breakdown despite the source being well known.",
    recommendation: "Evergreen reference — summarize with your own annotated examples.",
    edu: 9, vir: 5, beg: 6, com: 6, orig: 5, brand: 8, comp: "low" as const, urg: "evergreen" as const,
    source: "rss" as const, sname: "Anthropic News", url: "https://www.anthropic.com/engineering/building-effective-agents",
  },
  {
    title: "arXiv: A Survey of Retrieval-Augmented Generation Techniques",
    snippet: "A comprehensive 2026 survey paper cataloguing RAG variants, failure modes, and evaluation methods.",
    why: "A single well-organized reference saves creators from reading a dozen scattered papers.",
    reasoning: "Steady academic interest, low competition for an accessible non-academic summary of it.",
    recommendation: "Good evergreen distillation piece — publish anytime.",
    edu: 9, vir: 4, beg: 5, com: 5, orig: 4, brand: 6, comp: "low" as const, urg: "evergreen" as const,
    source: "arxiv" as const, sname: "arXiv cs.AI", url: "https://arxiv.org/abs/2026.example7",
  },
  {
    title: "Hugging Face: fine-tuning small models for tool use",
    snippet: "A tutorial-style blog post on fine-tuning sub-3B models specifically for reliable structured tool calling.",
    why: "Bridges the gap between 'use a giant model' and 'run something cheap and local' — high practical demand.",
    reasoning: "Consistent engagement from the local-LLM community, low-medium competition.",
    recommendation: "This week, paired with a cost comparison against API-based tool calling.",
    edu: 8, vir: 6, beg: 5, com: 7, orig: 6, brand: 6, comp: "medium" as const, urg: "this_week" as const,
    source: "rss" as const, sname: "Hugging Face Blog", url: "https://huggingface.co/blog/finetune-small-tool-use",
  },
  {
    title: "GitHub example: production-grade agent error handling",
    snippet: "A reference repo demonstrating retry policies, circuit breakers, and graceful degradation specifically for LLM agent pipelines.",
    why: "Error handling is the least glamorous, most requested topic once people move agents past demos.",
    reasoning: "Moderate but consistent star growth; low competition since most agent content skips reliability entirely.",
    recommendation: "Strong evergreen technical piece — publish this week.",
    edu: 8, vir: 5, beg: 5, com: 5, orig: 6, brand: 6, comp: "low" as const, urg: "this_week" as const,
    source: "github" as const, sname: "trending repos", url: "https://github.com/example/agent-error-handling",
  },
  {
    title: "NVIDIA technical blog: optimizing local inference on consumer GPUs",
    snippet: "A hands-on write-up covering quantization, batching, and KV-cache tricks for running larger models on consumer hardware.",
    why: "Directly actionable for the large audience running models locally on limited hardware.",
    reasoning: "High relevance, medium competition since hardware-optimization content is common but often outdated.",
    recommendation: "Publish this week with your own benchmark numbers to stand out from generic recaps.",
    edu: 8, vir: 5, beg: 4, com: 6, orig: 5, brand: 6, comp: "medium" as const, urg: "this_week" as const,
    source: "rss" as const, sname: "NVIDIA Blog", url: "https://blogs.nvidia.com/blog/local-inference-optimization",
  },
];

function buildSimple(list: typeof concepts, category: TopicOut["category"]): TopicOut[] {
  return list.map((t) => {
    const ev = evalFor({
      educational: t.edu,
      virality: t.vir,
      beginner: t.beg,
      community: t.com,
      originality: t.orig,
      brand: t.brand,
      competition: t.comp,
      urgency: t.urg,
      summary: t.snippet,
      why: t.why,
      reasoning: t.reasoning,
      recommendation: t.recommendation,
    });
    return topic({
      title: t.title,
      url: t.url,
      source: t.source,
      source_name: t.sname,
      category,
      snippet: t.snippet,
      published_at: hoursAgo(Math.random() * 96 + 4),
      metrics: t.stars ? { stars: t.stars, stars_per_day: Math.round(t.stars / (Math.random() * 20 + 5)) } : {},
      signals: {
        virality_score: ev.virality,
        engagement_velocity: Math.min(10, ev.virality + (Math.random() * 2 - 1)),
        trends_slope: Math.min(10, ev.virality - 1 + Math.random() * 2),
        momentum: Math.round(Math.random() * 3) + 1,
        competition_level: t.comp,
        competition_results: t.comp === "low" ? Math.round(Math.random() * 6) : t.comp === "medium" ? Math.round(Math.random() * 15) + 10 : Math.round(Math.random() * 30) + 30,
      },
      evaluation: ev,
      composite_score: composite(ev),
      hidden_gem: false,
    });
  });
}

const allTopics: TopicOut[] = [
  ...breakingNews,
  ...buildSimple(concepts, "concept"),
  ...buildSimple(utilities, "utility"),
  ...buildSimple(workflows, "workflow"),
  ...buildSimple(learning, "learning"),
];

// Hidden gems: high composite, low raw engagement — pick a few and flag them.
const hiddenGemCandidates = allTopics
  .filter((t) => (t.metrics.stars ?? 0) < 1000 && (t.metrics.points ?? 0) < 500)
  .sort((a, b) => b.composite_score - a.composite_score)
  .slice(0, 3);
hiddenGemCandidates.forEach((t) => (t.hidden_gem = true));

const top10 = [...allTopics].sort((a, b) => b.composite_score - a.composite_score).slice(0, 10);

export const mockRun: RunOut = {
  id: 42,
  started_at: hoursAgo(1),
  finished_at: hoursAgo(0.92),
  status: "completed",
  stage: "done",
  error: null,
  counts: {
    collected: 187,
    filtered: 46,
    evaluated: 40,
    per_source: { rss: 52, hackernews: 38, github: 41, arxiv: 29, reddit: 27 },
  },
  model_used: "google/gemini-2.0-flash-001",
  tokens_used: 38400,
  est_cost_usd: 0.028,
};

export const mockDashboard: DashboardOut = {
  run: mockRun,
  breaking_news: breakingNews,
  concepts: buildSimple(concepts, "concept"),
  utilities: buildSimple(utilities, "utility"),
  workflows: buildSimple(workflows, "workflow"),
  learning: buildSimple(learning, "learning"),
  hidden_gems: hiddenGemCandidates,
  top10,
};

export const mockRuns: RunOut[] = [
  mockRun,
  {
    ...mockRun,
    id: 41,
    started_at: hoursAgo(25),
    finished_at: hoursAgo(24.9),
    tokens_used: 35200,
    est_cost_usd: 0.026,
  },
  {
    ...mockRun,
    id: 40,
    started_at: hoursAgo(49),
    finished_at: hoursAgo(48.9),
    tokens_used: 41000,
    est_cost_usd: 0.031,
  },
  {
    ...mockRun,
    id: 39,
    status: "failed",
    started_at: hoursAgo(73),
    finished_at: hoursAgo(72.95),
    error: "GitHub API rate limit exceeded mid-run",
    tokens_used: 0,
    est_cost_usd: 0,
  },
];

export const mockSettings: SettingsOut = {
  openrouter_model: "google/gemini-2.0-flash-001",
  api_key_set: true,
  api_key_masked: "sk-or-...9f2a",
  llm_item_cap: 60,
  feeds: [
    { name: "OpenAI News", url: "https://openai.com/news/rss.xml", enabled: true },
    { name: "Anthropic News", url: "https://www.anthropic.com/rss.xml", enabled: true },
    { name: "Google DeepMind Blog", url: "https://deepmind.google/blog/rss.xml", enabled: true },
    { name: "Hugging Face Blog", url: "https://huggingface.co/blog/feed.xml", enabled: true },
    { name: "NVIDIA Blog", url: "https://blogs.nvidia.com/feed/", enabled: true },
    { name: "GitHub Changelog", url: "https://github.blog/changelog/feed/", enabled: true },
  ],
  subreddits: [
    { name: "LocalLLaMA", enabled: true },
    { name: "ClaudeAI", enabled: true },
    { name: "MachineLearning", enabled: true },
    { name: "artificial", enabled: false },
    { name: "mcp", enabled: true },
  ],
  twitter_queries: [
    { name: "OpenAI", query: "from:OpenAI", enabled: true },
    { name: "AnthropicAI", query: "from:AnthropicAI", enabled: true },
    { name: "GoogleDeepMind", query: "from:GoogleDeepMind", enabled: true },
    { name: "xai", query: "from:xai", enabled: true },
    {
      name: "AI/LLM keyword search",
      query: '(AI OR LLM OR "machine learning") min_faves:100 -is:retweet lang:en',
      enabled: true,
    },
  ],
  sources_enabled: { rss: true, hackernews: true, github: true, arxiv: true, reddit: true, twitter: true },
};

export const mockModels: ModelInfo[] = [
  { id: "google/gemini-2.0-flash-001", name: "Gemini 2.0 Flash", prompt_price: 0.1, completion_price: 0.4, context_length: 1000000 },
  { id: "deepseek/deepseek-chat", name: "DeepSeek Chat", prompt_price: 0.14, completion_price: 0.28, context_length: 64000 },
  { id: "anthropic/claude-3.5-haiku", name: "Claude 3.5 Haiku", prompt_price: 0.8, completion_price: 4.0, context_length: 200000 },
  { id: "openai/gpt-4o-mini", name: "GPT-4o mini", prompt_price: 0.15, completion_price: 0.6, context_length: 128000 },
  { id: "anthropic/claude-sonnet-4.5", name: "Claude Sonnet 4.5", prompt_price: 3.0, completion_price: 15.0, context_length: 200000 },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B Instruct", prompt_price: 0.12, completion_price: 0.3, context_length: 128000 },
];

export function findMockTopic(id: number): TopicOut | undefined {
  return allTopics.find((t) => t.id === id);
}
