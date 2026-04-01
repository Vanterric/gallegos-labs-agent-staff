# Autonomous UX Research Pipeline — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Author:** Chief of Staff + President Gallegos

## Overview

An autonomous UX research pipeline running on the same OpenClaw Mac mini as the software engine. It continuously monitors Reddit for user pain points, feature requests, and competitor mentions, logging structured findings to a dedicated research repo. On demand, it runs directed research campaigns with two human approval gates (research plan and outreach). Findings are synthesized into insights when thresholds are met. The pipeline feeds the product development cycle — insights inform what the software engine builds.

## Actors

| Actor | Research Role |
|-------|--------------|
| **Chief of Staff** | Surfaces research findings in briefings. Relays directed campaigns. Presents outreach drafts and research plans for approval. |
| **OpenClaw Mac** | Runs two crons: software engine (5 min) + research pipeline (30 min monitoring). Executes research skills. |
| **Kanban API** | Hosts the "Research Pipeline" board with custom columns for the two-gate approval flow. |

## Human Gates

Documented for future staffing. These roles can be filled by employees or delegated to other agents with human oversight.

| Gate | What's Reviewed | Current Owner | Future Owner |
|------|----------------|--------------|--------------|
| Research Plan Approval | Methodology, instruments, recruitment strategy | President | Research Lead (employee) or Product Manager Agent (with human oversight) |
| Outreach Approval | Draft messages before sending to real people | President | President or Research Lead |

## Research Board

Custom columns reflecting the two-gate approval flow:

| Column | Purpose |
|--------|---------|
| **Backlog** | Research questions and campaign ideas not yet prioritized |
| **To Do** | Next up for the pipeline to pick up |
| **In Progress** | Pipeline is actively working (campaign design) |
| **Plan Review** | Human Gate 1 — Research plan awaiting approval |
| **Recruiting** | Plan approved, outreach being drafted |
| **Outreach Review** | Human Gate 2 — Outreach messages awaiting approval |
| **Collecting** | Outreach sent, waiting for responses |
| **Analysis** | Data collected, pipeline is synthesizing |
| **Done** | Campaign complete, report delivered |

Continuous monitoring does NOT use the board — it runs on cron regardless of board state. The board is only for directed campaigns.

## Research Repo Structure

`gallegos-labs-research` — organized by type:

```
gallegos-labs-research/
├── CLAUDE.md
├── findings/
│   ├── raw/                           # Individual raw findings
│   │   └── YYYY-MM-DD-<source>-<slug>.md
│   └── schema.md                      # Finding record format
├── insights/
│   ├── nimbus/
│   │   ├── insights.md                # Living insights doc
│   │   └── archive/                   # Superseded/invalidated insights
│   ├── dewlist/
│   └── general/
├── outreach/
│   ├── drafts/                        # Structured records awaiting approval
│   │   └── YYYY-MM-DD-<channel>-<slug>.md
│   ├── sent/                          # Approved and sent
│   └── schema.md                      # Outreach record format
├── campaigns/
│   └── YYYY-MM-DD-<slug>/            # One dir per campaign
│       ├── plan.md
│       ├── survey.md
│       ├── discussion-guide.md
│       ├── recruitment.md
│       ├── data/
│       └── report.md
└── config/
    ├── subreddits.yaml                # Monitored subreddits and keywords
    ├── products.yaml                  # Product definitions for tagging
    └── thresholds.yaml                # Synthesis trigger thresholds
```

## Finding Record Format

```markdown
---
id: f-YYYY-MM-DD-NNN
date: 2026-04-01
source: reddit | in-app-feedback | email | survey | interview
source_url: https://reddit.com/r/productivity/comments/...
product: nimbus | dewlist | general
population: productivity professionals, 25-40
methodology: passive-monitoring | survey | interview | outreach-response
category: pain-point | feature-request | competitor-mention | sentiment
processed: false
insight_ids: []
---

## Finding
[The actual observation — what was said, by whom, in what context]

## Context
[Thread title, surrounding discussion, user background if known]
```

## Outreach Draft Record Format

```markdown
---
id: o-YYYY-MM-DD-NNN
date: 2026-04-01
channel: reddit | email | linkedin
status: draft | approved | sent
target_url: https://reddit.com/r/productivity/comments/...
target_user: u/example (or email address)
campaign_id: c-2026-04-01-calendar-reminders (or "monitoring" for organic)
---

## Responding To
[The message/post we're responding to — quoted text]

## Draft
[The outreach message content]

## Subject
[Email subject line, if email. N/A for Reddit.]
```

## Insight Format

```markdown
## [Insight title — one sentence describing the pattern]
- **Confidence:** Emerging (3-4) | Moderate (5-9) | Strong (10+)
- **Finding count:** N
- **Sources:** Reddit (X), In-app feedback (Y), Survey (Z)
- **Population:** [who these findings are about]
- **Product:** [product name]
- **First seen:** [date of earliest finding]
- **Last confirmed:** [date of most recent finding]
- **Category:** pain-point | feature-request | competitor-gap | sentiment
- **Finding IDs:** f-2026-04-01-001, f-2026-04-02-003, ...

### Summary
[2-3 sentence synthesis of what the findings collectively tell us]

### Representative Quotes
> "[direct quote from finding 1]" — [source]
> "[direct quote from finding 2]" — [source]
```

## Continuous Monitoring Pipeline

Runs on a 30-minute cron. No board cards needed.

### Cycle

1. **Scan Reddit** — For each subreddit + keyword combo in `config/subreddits.yaml`, search for new posts/comments since last scan. Use Reddit API or Playwright MCP. Filter for relevance: pain points, feature requests, competitor mentions, sentiment about voice AI / productivity / note-taking.

2. **Classify and Log** — For each relevant finding: classify category, tag with product/population/source, write finding record to `findings/raw/`, git commit.

3. **Check Synthesis Triggers** — Count unprocessed findings per product. If count >= 10 for any product, trigger synthesis. Also trigger if 7+ days since last synthesis.

4. **Draft Opportunistic Outreach** — If a finding looks like a potential beta tester (someone describing a problem Nimbus solves), draft an outreach record in `outreach/drafts/`. Queue message to Staff.

5. **Report** — If any new findings were logged, write summary to queue for Staff's next briefing.

### What monitoring does NOT do:
- Send any messages (drafts only)
- Modify insights (synthesis is a separate trigger)
- Create kanban cards (monitoring is boardless)

## Directed Campaign Pipeline

Runs on the Research board. Triggered by a card in To Do with a research question.

### Step 1: Pick Up Card
Pull top card from To Do, move to In Progress.

### Step 2: Design the Study
- Choose methodology based on question type:
  - Preference/opinion → Survey
  - Behavioral → Discussion guide / interview
  - Validation → Prototype + survey
  - Exploratory → Reddit thread analysis + survey
- Write research plan → `campaigns/YYYY-MM-DD-<slug>/plan.md`
- Write instruments → `survey.md`, `discussion-guide.md`, etc.
- Update card, move to **Plan Review**

### Step 3: Human Gate 1 — Plan Review
Card sits in Plan Review. Chief of Staff surfaces in briefing. President approves, requests changes, or rejects. On approval, Staff tells OpenClaw to proceed.

### Step 4: Draft Recruitment Outreach
- Identify targets: search Reddit for relevant threads, find matching users
- Draft outreach messages as structured records in `outreach/drafts/`
- Update card, move to **Outreach Review**

### Step 5: Human Gate 2 — Outreach Review
Card sits in Outreach Review. Staff surfaces drafts. President reviews, edits, approves. Eventually sends through dashboard using bot's credentials.

### Step 6: Collect Responses
Card moves to **Collecting**. Pipeline:
- Monitors for survey responses
- Monitors Reddit threads for replies
- Tracks in-app feedback matching the research question
- Logs each response as a finding tagged with campaign ID
- Waits until target sample size reached or deadline passes

### Step 7: Analyze and Report
Card moves to **Analysis**. Pipeline:
- Synthesizes all campaign findings
- Writes research report → `campaigns/YYYY-MM-DD-<slug>/report.md`
  - Executive summary, key findings, recommendation, raw data summary
- Updates or creates insights if findings meet 3+ threshold
- Updates card with report link, moves to **Done**
- Queues message to Staff

## Synthesis Engine

Triggered by volume (10 unprocessed findings per product) or time (weekly). Runs automatically, not on the board.

### Process

1. **Gather** unprocessed findings for the target product
2. **Cluster** by theme using category and content
3. **Evaluate** clusters — require 3+ independent findings to promote to insight
4. **Write or update** insights in `insights/<product>/insights.md`
5. **Mark findings** as processed, link to insight IDs
6. **Update confidence** levels on existing insights that received new findings
7. **Archive** insights with no new confirming findings in 90 days
8. **Commit and report** to Staff queue

### Confidence Levels
- **Emerging:** 3-4 independent findings
- **Moderate:** 5-9 independent findings
- **Strong:** 10+ independent findings

### What synthesis does NOT do:
- Create feature cards
- Make build/don't-build decisions
- Delete raw findings

## Channels (v1)

Reddit only for v1. Future channels: email, LinkedIn, Twitter/X, Discord/Slack communities, Product Hunt / Beta list.

### Reddit Configuration (`config/subreddits.yaml`)

```yaml
subreddits:
  - name: r/productivity
    keywords: [voice notes, AI assistant, note-taking, productivity app]
  - name: r/AItools
    keywords: [voice AI, AI companion, AI notes]
  - name: r/notetaking
    keywords: [voice, transcription, AI, smart notes]
  - name: r/voiceassistants
    keywords: [AI companion, personal assistant, voice-first]
  - name: r/Otter_ai
    keywords: [alternative, switching from, frustrated with]
  - name: r/Notion
    keywords: [voice, AI, note-taking, alternative]

scan_interval_minutes: 30
lookback_hours: 1
```

## Integration with Existing Systems

### Chief of Staff Briefing
Add a "Research Status" section to the briefing:
- Monitoring: N new findings since last briefing, N outreach drafts pending
- Campaigns: cards in Plan Review or Outreach Review needing approval
- Insights: any newly promoted or strengthened insights
- Pipeline health: cron status

### Software Engine
The software engine can read `insights/<product>/insights.md` to understand what users are asking for. When the product manager agent exists (future), it will translate Strong insights into feature cards on the Engine board.

### Staff-Projects Manifest
Add the research project to `staff-projects.yaml` with its board and current focus.

## New Skills

| Skill | Purpose |
|-------|---------|
| `skills/research/monitor.md` | Continuous Reddit monitoring loop |
| `skills/research/reddit.md` | Reddit search, scraping, thread analysis |
| `skills/research/campaign.md` | Directed research campaign pipeline |
| `skills/research/outreach.md` | Draft outreach as structured records |
| `skills/research/synthesis.md` | Threshold-triggered synthesis engine |

## Phased Rollout

### Phase 1: Foundation
- Create `gallegos-labs-research` repo with structure and schemas
- Create "Research Pipeline" board on kanban with custom columns
- Add OpenClaw-mac as collaborator
- Write config files (subreddits, products, thresholds)

### Phase 2: Monitoring Skills
- Write `skills/research/monitor.md`
- Write `skills/research/reddit.md`
- Write `skills/research/synthesis.md`
- Configure 30-minute monitoring cron on OpenClaw
- Manual monitoring cycle validation

### Phase 3: Campaign Skills
- Write `skills/research/campaign.md`
- Write `skills/research/outreach.md`
- Update Chief of Staff briefing for Research board
- Manual campaign end-to-end test

### Phase 4: Integration
- Update `staff-projects.yaml`
- Wire Research board into `/staff` briefing
- Document human gate roles
- Set up Reddit bot account
- Full autonomous test

### Phase 5: Feedback Loop (Future)
- Connect in-app Nimbus feedback as second data source
- Build outreach dashboard
- Enable product manager agent to trigger campaigns

## Future Expansion

- **Product Manager Agent** — Reads insights, proposes features, triggers research campaigns
- **Multi-channel outreach** — Email, LinkedIn, Twitter/X, Discord, Product Hunt
- **Outreach dashboard** — Review and send drafts from a UI
- **A/B testing research** — Test different outreach messages, survey formats
- **Automated survey platforms** — Integration with Typeform, Google Forms, etc.
- **Sentiment tracking** — Time-series sentiment for products and competitors
