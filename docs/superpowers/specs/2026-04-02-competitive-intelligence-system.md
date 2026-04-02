# Competitive Intelligence System — Spec

**Date:** 2026-04-02

## Overview

A systematic competitor monitoring system that tracks product changes, pricing shifts, feature launches, and public sentiment across Nimbus's competitive landscape. Runs as an OpenClaw cron job alongside the existing research monitor, logging findings to the research repo and surfacing highlights in the President's daily briefing.

## Competitors to Track

### Primary (direct competitors — voice-first AI note-taking/companion)
- **Otter.ai** — AI meeting transcription and notes
- **Granola** — AI note-taking for meetings
- **Notion AI** — AI-augmented workspace with notes, docs, databases

### Secondary (adjacent — AI assistants and productivity)
- **Mem** — AI-powered personal knowledge base
- **Reflect** — AI note-taking with backlinks
- **Rewind/Limitless** — AI life capture and memory
- **ChatGPT (voice mode)** — OpenAI's voice companion
- **Google Gemini (live)** — Google's conversational AI

### Stored in Config
`gallegos-labs-research/config/competitors.yaml`:

```yaml
competitors:
  - name: Otter.ai
    tier: primary
    urls:
      product: https://otter.ai
      pricing: https://otter.ai/pricing
      changelog: https://blog.otter.ai
      app_store: https://apps.apple.com/app/otter-transcribe-voice-notes/id1276437113
      twitter: https://x.com/otter_ai
    keywords: [otter, otter.ai, otter ai]

  - name: Granola
    tier: primary
    urls:
      product: https://granola.ai
      pricing: https://granola.ai/pricing
      changelog: https://granola.ai/blog
      twitter: https://x.com/granola_ai
    keywords: [granola, granola.ai, granola ai]

  - name: Notion
    tier: primary
    urls:
      product: https://notion.so
      pricing: https://notion.so/pricing
      changelog: https://notion.so/releases
      twitter: https://x.com/NotionHQ
    keywords: [notion, notion ai, notion.so]

  - name: Mem
    tier: secondary
    urls:
      product: https://mem.ai
      pricing: https://mem.ai/pricing
      changelog: https://mem.ai/blog
      twitter: https://x.com/memdotai
    keywords: [mem, mem.ai]

  - name: Reflect
    tier: secondary
    urls:
      product: https://reflect.app
      pricing: https://reflect.app/pricing
      changelog: https://reflect.app/blog
      twitter: https://x.com/reflaboratory
    keywords: [reflect, reflect.app]

  - name: Rewind / Limitless
    tier: secondary
    urls:
      product: https://limitless.ai
      pricing: https://limitless.ai/pricing
      changelog: https://limitless.ai/blog
      twitter: https://x.com/limitaboratory
    keywords: [rewind, limitless, rewind.ai, limitless.ai]

  - name: ChatGPT Voice
    tier: secondary
    urls:
      product: https://openai.com/chatgpt
      changelog: https://openai.com/blog
      twitter: https://x.com/OpenAI
    keywords: [chatgpt voice, openai voice, chatgpt advanced voice]

  - name: Google Gemini Live
    tier: secondary
    urls:
      product: https://gemini.google.com
      changelog: https://blog.google/technology/google-deepmind/
      twitter: https://x.com/GoogleAI
    keywords: [gemini live, google gemini, gemini voice]

scan_interval_hours: 6
```

## Monitoring Surfaces

### 1. Product & Pricing Pages
**Method:** Playwright MCP — navigate to product/pricing URLs, snapshot content
**What to detect:**
- New features mentioned on product pages
- Pricing tier changes (price increases/decreases, new tiers, free tier changes)
- New integrations or platform support
- Messaging changes ("now with AI" type positioning shifts)

**How:** Compare current page content against the last snapshot. Store snapshots in `competitive-intel/snapshots/<competitor>/<date>.md` for diffing. If the content has meaningfully changed, log a finding.

### 2. Changelogs & Release Notes
**Method:** Playwright MCP — navigate to blog/changelog, extract recent entries
**What to detect:**
- New feature launches
- Major version releases
- API changes
- Deprecations

**How:** Check the most recent 3-5 entries on each changelog. Compare entry titles/dates against last scan. New entries get logged as findings.

### 3. App Store Monitoring
**Method:** Playwright MCP — scrape App Store listing pages
**What to detect:**
- Rating changes (significant drops or jumps)
- Recent review sentiment (look at last 5-10 reviews)
- Version update descriptions ("what's new")
- Download rank changes (if visible)

**How:** Snapshot the app page, extract rating, recent review snippets, and version info. Compare against last snapshot.

### 4. Social Media / Announcements
**Method:** Playwright MCP — check Twitter/X profiles and LinkedIn
**What to detect:**
- Product launch announcements
- Partnership announcements
- Funding/acquisition news
- Viral moments (high-engagement posts)

**How:** Navigate to the competitor's Twitter profile, check the 3-5 most recent posts. Look for announcements with high engagement or product keywords.

### 5. Reddit Mentions (Cross-Pollination)
**Method:** Leverage existing research monitor
**What to detect:**
- Reddit threads comparing competitors to each other
- "Switching from X to Y" posts
- Competitor complaints that Nimbus could address

**How:** The existing research monitor already scans r/productivity, r/AItools, etc. Add competitor keywords to the scan so competitor mentions are tagged as `source: competitor-mention` findings. This is already partially happening — just needs the keyword list expanded.

## Finding Schema

Competitor findings go to `gallegos-labs-research/findings/raw/` with the same schema as research findings, plus competitor-specific fields:

```yaml
---
id: f-2026-04-02-001
date: 2026-04-02
source: competitor-watch
source_url: "https://otter.ai/pricing"
product: nimbus
population: "Otter.ai users and prospects"
methodology: competitor-monitoring
category: competitor-pricing | competitor-feature | competitor-sentiment | competitor-announcement
competitor: otter-ai
change_type: pricing-change | feature-launch | messaging-shift | rating-change | announcement
processed: false
insight_ids: []
---

## Finding
Otter.ai reduced their Pro tier price from $16.99/mo to $12.99/mo and added unlimited transcription to the free tier.

## Context
Source: https://otter.ai/pricing
Previous price (last snapshot 2026-03-28): Pro at $16.99/mo, Free tier limited to 300 min/mo
Current price (2026-04-02): Pro at $12.99/mo, Free tier now unlimited
Change detected by: page content diff

## Implications
Aggressive pricing move that undercuts the voice transcription market. Nimbus should consider how this affects our pricing model for the transcription-heavy use case.
```

## Snapshot Storage

Previous page states are stored for diffing:

```
gallegos-labs-research/
  competitive-intel/
    snapshots/
      otter-ai/
        product-2026-04-01.md
        pricing-2026-04-01.md
      notion/
        product-2026-04-01.md
        pricing-2026-04-01.md
        changelog-2026-04-01.md
    summaries/
      weekly-2026-W14.md
```

Snapshots are plain markdown extracted from the page content. Diffs are computed by comparing the current snapshot against the most recent previous one.

## Cron Schedule

- **Primary competitors:** Every 6 hours (4x/day)
- **Secondary competitors:** Every 12 hours (2x/day)
- **App Store:** Daily (ratings don't change fast)
- **Social media:** Every 6 hours

The cron job `competitor-watch` runs on the same OpenClaw Mac mini as `research-monitor`.

## Briefing Integration

Add a new section to the staff briefing between "User Feedback" and "Research Context":

```markdown
## N. Competitive Intelligence

[If new competitor findings since last briefing:]

| Competitor | Change | Summary | Date |
|-----------|--------|---------|------|
| Otter.ai | pricing-change | Pro tier reduced to $12.99/mo | 2026-04-02 |
| Notion | feature-launch | Added voice input to mobile app | 2026-04-02 |

[If no changes:]
No competitor movements since last briefing.
```

## Weekly Digest

In addition to per-finding logging, the system produces a weekly competitive summary saved to `competitive-intel/summaries/weekly-YYYY-WNN.md`:
- What each tracked competitor did this week
- Trends (multiple competitors moving in the same direction)
- Opportunities for Nimbus (gaps exposed by competitor moves)
- Threats (competitors encroaching on Nimbus's positioning)

This digest is generated by the synthesis engine (same pattern as research insight synthesis) triggered weekly.

## Skill File

`gallegos-labs-agent-staff/skills/research/competitor-watch.md` — teaches OpenClaw how to:
1. Read competitors.yaml
2. Navigate to each URL surface
3. Snapshot current state
4. Diff against previous snapshot
5. Log findings for meaningful changes
6. Skip noise (minor text changes, footer updates, cookie banners)
7. Handle errors (site down, CAPTCHA, layout changes)

## What This Does Not Include

- **Automated strategic recommendations** — findings are surfaced, but strategic analysis is the President's domain
- **Competitor product testing** — no creating accounts on competitor products or using their APIs
- **Price scraping APIs** — just page snapshots via Playwright
- **Patent monitoring** — out of scope for now
- **Employee/hiring tracking** — not appropriate

## Target Repos
- `gallegos-labs-agent-staff` — skill file (skills/research/competitor-watch.md)
- `gallegos-labs-research` — config (config/competitors.yaml), findings, snapshots, summaries
