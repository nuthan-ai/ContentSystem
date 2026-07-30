# Phase 1 - AI Research Intelligence System

## Purpose

Build a research-first AI system that automatically discovers, filters,
ranks, and explains the best AI content opportunities every day.

The goal of Phase 1 is **not** to generate content. It is to eliminate
the need to manually browse dozens of platforms looking for ideas.

------------------------------------------------------------------------

# Primary Objective

At the end of each research cycle, the system should provide a
prioritized dashboard of high-quality AI topics that are ready for
content planning.

The output should answer questions such as:

-   What happened in AI today?
-   What new concepts are emerging?
-   Which open-source tools are worth covering?
-   Which GitHub repositories are trending?
-   Which utilities provide real value?
-   Which ideas have the highest educational and viral potential?

------------------------------------------------------------------------

# Core Principles

-   Research first, AI second.
-   Keep operating cost close to zero.
-   Use AI only after filtering the research.
-   Focus on quality over quantity.
-   Prioritize practical value for creators and developers.

------------------------------------------------------------------------

# Research Engine

## Primary Source

Use the **Agent Research** GitHub repository as the primary research
engine.

This repository will crawl multiple platforms and collect relevant AI
information without requiring expensive LLM calls.

Because research is handled externally, this stage remains almost
zero-cost.

------------------------------------------------------------------------

# Research Sources

## 1. Breaking AI News (Highest Priority)

Monitor announcements from:

-   OpenAI
-   Anthropic
-   Google DeepMind
-   Microsoft AI
-   Meta AI
-   xAI
-   NVIDIA
-   GitHub Copilot
-   Cursor
-   Claude Code
-   Gemini
-   Hugging Face
-   Vercel AI

Examples:

-   New model launches
-   New APIs
-   Product announcements
-   Major feature releases
-   Developer platform updates

------------------------------------------------------------------------

## 2. AI Concepts

Identify educational topics that creators should explain.

Examples:

-   Context Engineering
-   Loop Engineering
-   Graph Engineering
-   Harness Engineering
-   Memory Systems
-   Agentic Workflows
-   MCP
-   Prompt Engineering improvements

These topics should be surfaced even if they are not mainstream yet.

------------------------------------------------------------------------

## 3. AI Utilities

Discover practical tools including:

-   GitHub repositories
-   MCP servers
-   Claude Skills
-   Cursor Rules
-   Token optimization tools
-   AI productivity tools
-   Browser extensions
-   CLI utilities
-   Prompt libraries

Priority is based on usefulness, not popularity alone.

------------------------------------------------------------------------

## 4. AI Workflows

Research:

-   AI automation
-   Multi-agent systems
-   Developer workflows
-   AI coding practices
-   RAG architectures
-   End-to-end automation examples

------------------------------------------------------------------------

## 5. Learning Resources

Collect valuable educational material from:

-   Official documentation
-   Research papers
-   Tutorials
-   Engineering blogs
-   GitHub examples
-   Technical write-ups

------------------------------------------------------------------------

# Processing Pipeline

## Step 1

Collect research using Agent Research.

No LLM required.

------------------------------------------------------------------------

## Step 2

Categorize every finding into:

-   Breaking News
-   Concepts
-   Utilities
-   Workflows
-   Learning Resources

------------------------------------------------------------------------

## Step 3

Filter low-quality or duplicate items.

Only the most relevant topics move forward.

------------------------------------------------------------------------

## Step 4

Send only filtered topics to the LLM.

The LLM should evaluate:

-   Educational value
-   Practical usefulness
-   Beginner friendliness
-   Community interest
-   Originality
-   Virality potential
-   Brand relevance

This minimizes token usage and keeps operational cost low.

------------------------------------------------------------------------

# Topic Ranking

Each topic should include:

-   Topic name
-   Category
-   Source
-   Summary
-   Why it matters
-   Educational value
-   Virality potential
-   Competition level
-   Recommendation
-   Suggested publish urgency

Example:

Topic: Loop Engineering

Category: AI Concept

Educational Value: 10/10

Virality Potential: 9/10

Competition: Low

Recommendation: Create content within the next few days.

------------------------------------------------------------------------

# Daily Research Dashboard

The final output should contain:

## 🚨 Breaking AI News

Top 3

## 🔥 Trending AI Concepts

Top 5

## 🛠 Best AI Utilities

Top 5

## 💡 AI Workflow Ideas

Top 5

## 📚 Learning Resources

Top 5

## ⭐ Hidden Gems

Top 3

## 📈 Overall Top 10 Content Opportunities

Every recommendation should include reasoning, not just a title.

------------------------------------------------------------------------

# Expected Outcome

At the completion of Phase 1, the creator should no longer need to
manually research multiple platforms.

Instead, the system delivers:

-   Curated AI news
-   Emerging concepts
-   Useful tools
-   Workflow ideas
-   Learning resources
-   Ranked opportunities

This research dashboard becomes the single source of truth for deciding
what content to create next.

Phase 2 will consume this dashboard and determine the best content
strategy (Reel, Carousel, LinkedIn post, etc.).
