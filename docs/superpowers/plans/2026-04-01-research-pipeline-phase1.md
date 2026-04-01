# Research Pipeline Phase 1: Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the research repo, kanban board, and config files so the monitoring and campaign skills have a place to store data and track work.

**Architecture:** Create the `gallegos-labs-research` GitHub repo with structured directories for findings, insights, outreach, and campaigns. Create a "Research Pipeline" kanban board with custom columns for the two-gate approval flow. Write config files for subreddit monitoring targets, product definitions, and synthesis thresholds.

**Tech Stack:** Git, GitHub API (via GitHub App), Kanban REST API, YAML config

**Spec:** `docs/superpowers/specs/2026-04-01-research-pipeline-design.md`

---

## File Structure

### New Repo: `gallegos-labs-research`
- `CLAUDE.md` — Repo conventions for agents
- `findings/raw/.gitkeep` — Directory for raw finding records
- `findings/schema.md` — Finding record format documentation
- `insights/nimbus/insights.md` — Living insights doc for Nimbus
- `insights/nimbus/archive/.gitkeep` — Archive for invalidated insights
- `insights/general/insights.md` — Cross-product insights
- `insights/general/archive/.gitkeep` — Archive
- `outreach/drafts/.gitkeep` — Outreach drafts awaiting approval
- `outreach/sent/.gitkeep` — Approved and sent outreach
- `outreach/schema.md` — Outreach record format documentation
- `campaigns/.gitkeep` — Campaign directories
- `config/subreddits.yaml` — Monitored subreddits and keywords
- `config/products.yaml` — Product definitions for tagging
- `config/thresholds.yaml` — Synthesis trigger configuration

### Modified in `gallegos-labs-agent-staff`
- `staff-projects.yaml` — Add research project entry

---

### Task 1: Create the gallegos-labs-research GitHub repo

- [ ] **Step 1: Create repo directory locally**

```bash
mkdir -p "C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-labs-research"
cd "C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-labs-research"
git init
```

- [ ] **Step 2: Create directory structure**

```bash
mkdir -p findings/raw
mkdir -p insights/nimbus/archive
mkdir -p insights/general/archive
mkdir -p outreach/drafts
mkdir -p outreach/sent
mkdir -p campaigns
mkdir -p config
```

Add `.gitkeep` files to empty directories:

```bash
touch findings/raw/.gitkeep
touch insights/nimbus/archive/.gitkeep
touch insights/general/archive/.gitkeep
touch outreach/drafts/.gitkeep
touch outreach/sent/.gitkeep
touch campaigns/.gitkeep
```

- [ ] **Step 3: Create CLAUDE.md**

```markdown
# Gallegos Labs Research

Structured UX research data for Gallegos Labs products.

## Structure
- findings/raw/ — Individual research findings (one file per finding)
- insights/<product>/insights.md — Living insights docs, synthesized from findings
- outreach/drafts/ — Outreach message drafts awaiting approval
- outreach/sent/ — Approved and sent outreach records
- campaigns/<date>-<slug>/ — Directed research campaign artifacts
- config/ — Monitoring and synthesis configuration

## Conventions
- Finding files: YYYY-MM-DD-<source>-<slug>.md with YAML frontmatter
- Outreach files: YYYY-MM-DD-<channel>-<slug>.md with YAML frontmatter
- All dates in ISO-8601 UTC
- Never delete raw findings — mark as processed, never remove
- Insights require 3+ independent findings to be promoted
- Git commit messages: "research: <action> — <detail>"
```

- [ ] **Step 4: Create findings/schema.md**

```markdown
# Finding Record Schema

Each finding is a markdown file in `findings/raw/` with YAML frontmatter.

## Filename Pattern
`YYYY-MM-DD-<source>-<slug>.md`

Example: `2026-04-01-reddit-voice-notes-editing-pain.md`

## Format

---
id: f-YYYY-MM-DD-NNN
date: 2026-04-01
source: reddit | in-app-feedback | email | survey | interview
source_url: https://reddit.com/r/productivity/comments/...
product: nimbus | dewlist | general
population: [description of the user/group]
methodology: passive-monitoring | survey | interview | outreach-response
category: pain-point | feature-request | competitor-mention | sentiment
processed: false
insight_ids: []
---

## Finding
[The actual observation — what was said, by whom, in what context]

## Context
[Thread title, surrounding discussion, user background if known]

## Field Definitions

| Field | Required | Values |
|-------|----------|--------|
| id | Yes | f-YYYY-MM-DD-NNN (NNN is sequential per day) |
| date | Yes | ISO-8601 date |
| source | Yes | reddit, in-app-feedback, email, survey, interview |
| source_url | Yes | URL to the original source (or "N/A" for in-app) |
| product | Yes | Product key from config/products.yaml |
| population | Yes | Free text description of the user/group |
| methodology | Yes | How this finding was obtained |
| category | Yes | pain-point, feature-request, competitor-mention, sentiment |
| processed | Yes | false until synthesis processes it |
| insight_ids | Yes | Empty array until linked to insights |
```

- [ ] **Step 5: Create outreach/schema.md**

```markdown
# Outreach Record Schema

Each outreach draft is a markdown file in `outreach/drafts/` with YAML frontmatter.
After approval and sending, move to `outreach/sent/`.

## Filename Pattern
`YYYY-MM-DD-<channel>-<slug>.md`

Example: `2026-04-01-reddit-r-productivity-voice-user.md`

## Format

---
id: o-YYYY-MM-DD-NNN
date: 2026-04-01
channel: reddit | email | linkedin
status: draft | approved | sent
target_url: https://reddit.com/r/productivity/comments/...
target_user: u/example (or email address)
campaign_id: c-2026-04-01-calendar-reminders (or "monitoring" for organic outreach)
---

## Responding To
[The message/post we're responding to — quoted text]

## Draft
[The outreach message content]

## Subject
[Email subject line if email. N/A for Reddit.]

## Field Definitions

| Field | Required | Values |
|-------|----------|--------|
| id | Yes | o-YYYY-MM-DD-NNN (NNN is sequential per day) |
| date | Yes | ISO-8601 date |
| channel | Yes | reddit, email, linkedin |
| status | Yes | draft → approved → sent |
| target_url | Yes | URL where the message will be posted/sent |
| target_user | Yes | Username or email of the recipient |
| campaign_id | Yes | Campaign ID or "monitoring" for organic |
```

- [ ] **Step 6: Create insights/nimbus/insights.md**

```markdown
# Nimbus — Research Insights

Living document of validated insights from user research. Insights are promoted from raw findings when 3+ independent findings confirm a pattern.

Last synthesis: N/A
Total insights: 0

---

<!-- Insights will be added here by the synthesis engine -->
```

- [ ] **Step 7: Create insights/general/insights.md**

```markdown
# General — Research Insights

Cross-product insights not tied to a specific product.

Last synthesis: N/A
Total insights: 0

---

<!-- Insights will be added here by the synthesis engine -->
```

- [ ] **Step 8: Create .gitignore**

```
.env
.DS_Store
Thumbs.db
node_modules/
```

- [ ] **Step 9: Commit and push to GitHub**

```bash
cd "C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-labs-research"
git add -A
git commit -m "chore: initial commit — research repo structure, schemas, and conventions"
gh repo create Vanterric/gallegos-labs-research --private --source=. --push
```

---

### Task 2: Create config files

- [ ] **Step 1: Create config/subreddits.yaml**

```yaml
# Subreddits and keywords to monitor for Nimbus-related findings
# The research pipeline scans these on a 30-minute cadence

subreddits:
  - name: r/productivity
    keywords:
      - voice notes
      - AI assistant
      - note-taking app
      - productivity app
      - personal assistant
  - name: r/AItools
    keywords:
      - voice AI
      - AI companion
      - AI notes
      - AI assistant app
  - name: r/notetaking
    keywords:
      - voice
      - transcription
      - AI
      - smart notes
      - voice memo
  - name: r/voiceassistants
    keywords:
      - AI companion
      - personal assistant
      - voice-first
      - always listening
  - name: r/Otter_ai
    keywords:
      - alternative
      - switching from
      - frustrated
      - wish it could
  - name: r/Notion
    keywords:
      - voice
      - AI note
      - alternative
      - too complex

scan_interval_minutes: 30
lookback_hours: 1
max_results_per_subreddit: 25
```

- [ ] **Step 2: Create config/products.yaml**

```yaml
# Product definitions for tagging findings and insights

products:
  nimbus:
    name: Nimbus
    description: "Voice-first AI companion with persistent memory and structured notes"
    status: active
    keywords:
      - nimbus
      - voice companion
      - voice-first
      - AI companion
      - voice notes AI

  dewlist:
    name: DewList
    description: "Task management with AI prioritization"
    status: planned
    keywords:
      - dewlist

  general:
    name: General
    description: "Cross-product or market-level insights"
    status: active
    keywords: []
```

- [ ] **Step 3: Create config/thresholds.yaml**

```yaml
# Synthesis trigger thresholds

synthesis:
  # Trigger synthesis when unprocessed findings for a product reach this count
  volume_trigger: 10

  # Trigger synthesis if this many days pass since last synthesis (regardless of volume)
  time_trigger_days: 7

  # Minimum independent findings to promote a theme to an insight
  min_findings_for_insight: 3

  # Confidence levels based on finding count
  confidence_levels:
    emerging:
      min: 3
      max: 4
    moderate:
      min: 5
      max: 9
    strong:
      min: 10

  # Archive insights with no new findings after this many days
  archive_stale_days: 90

monitoring:
  # How often the continuous monitoring cron runs (minutes)
  scan_interval: 30

  # How far back to look for new posts/comments (hours)
  lookback_hours: 1
```

- [ ] **Step 4: Commit config files**

```bash
cd "C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-labs-research"
git add config/
git commit -m "feat: add monitoring config — subreddits, products, synthesis thresholds"
git push origin master
```

---

### Task 3: Create the Research Pipeline kanban board

- [ ] **Step 1: Create the board**

```bash
curl -s -X POST "$KANBAN_API/api/projects" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Research Pipeline"}'
```

Save the returned project ID.

- [ ] **Step 2: Fetch default columns**

```bash
curl -s "$KANBAN_API/api/projects/$RESEARCH_PROJECT_ID/board" \
  -H "Authorization: Bearer $STAFF_TOKEN"
```

Default columns: Backlog (pos 0), To Do (pos 1), In Progress (pos 2), Done (pos 3).

- [ ] **Step 3: Add custom columns**

Add the research-specific columns between In Progress and Done:

```bash
# Plan Review at position 3
curl -s -X POST "$KANBAN_API/api/columns" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"'$RESEARCH_PROJECT_ID'","title":"Plan Review","position":3}'

# Recruiting at position 4
curl -s -X POST "$KANBAN_API/api/columns" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"'$RESEARCH_PROJECT_ID'","title":"Recruiting","position":4}'

# Outreach Review at position 5
curl -s -X POST "$KANBAN_API/api/columns" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"'$RESEARCH_PROJECT_ID'","title":"Outreach Review","position":5}'

# Collecting at position 6
curl -s -X POST "$KANBAN_API/api/columns" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"'$RESEARCH_PROJECT_ID'","title":"Collecting","position":6}'

# Analysis at position 7
curl -s -X POST "$KANBAN_API/api/columns" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"'$RESEARCH_PROJECT_ID'","title":"Analysis","position":7}'
```

- [ ] **Step 4: Add collaborators**

Add the President and OpenClaw-mac as collaborators:

```bash
# Add President
curl -s -X POST "$KANBAN_API/api/projects/$RESEARCH_PROJECT_ID/collaborators" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"derrick@gallegoslabs.com"}'

# Add OpenClaw-mac
curl -s -X POST "$KANBAN_API/api/projects/$RESEARCH_PROJECT_ID/collaborators" \
  -H "Authorization: Bearer $STAFF_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"openclaw-mac@gallegos-labs.local"}'
```

- [ ] **Step 5: Verify board structure**

Fetch the board and confirm 9 columns in order: Backlog, To Do, In Progress, Plan Review, Recruiting, Outreach Review, Collecting, Analysis, Done.

---

### Task 4: Update staff-projects.yaml

- [ ] **Step 1: Add research project to manifest**

Add to `staff-projects.yaml` in the `projects` section:

```yaml
  research-pipeline:
    name: Research Pipeline
    path: ../gallegos-labs-research
    description: "Autonomous UX research — continuous Reddit monitoring, directed campaigns, synthesis"
    status: active
    priority: high
    stack: [OpenClaw, Reddit API, Playwright MCP]
    current_focus: "Phase 1 — Foundation setup"
    kanban_board: "Research Pipeline"
```

- [ ] **Step 2: Commit and push**

```bash
cd "C:/Users/derri/OneDrive/Documents/Software_Projects/gallegos-labs-agent-staff"
git add staff-projects.yaml
git commit -m "feat: add Research Pipeline project to manifest"
git push origin master
```

---

### Task 5: Have OpenClaw clone the research repo

- [ ] **Step 1: Tell OpenClaw to clone the research repo**

Send via Gateway API:

```
[STAFF:work:assign]
Clone the gallegos-labs-research repo to ~/gallegos-labs-research using your GitHub App token (~/openclaw-staff/github-token.sh). Confirm the clone succeeded and show the directory structure.
```

- [ ] **Step 2: Verify OpenClaw can access the repo**

Confirm OpenClaw reports the directory structure matches the spec.

---

### Task 6: Seed the Research board with Phase 2 cards

- [ ] **Step 1: Create Phase 2 cards in To Do**

Create cards for the monitoring skills that will be built next:

1. "Write skills/research/monitor.md — continuous monitoring skill"
2. "Write skills/research/reddit.md — Reddit search and scraping"
3. "Write skills/research/synthesis.md — threshold-triggered synthesis"
4. "Configure 30-minute research monitoring cron on OpenClaw"
5. "Manual monitoring cycle validation"

- [ ] **Step 2: Create Phase 3 cards in Backlog**

1. "Write skills/research/campaign.md — directed campaign pipeline"
2. "Write skills/research/outreach.md — outreach draft creation"
3. "Update Chief of Staff briefing for Research board"
4. "Manual campaign end-to-end test"

- [ ] **Step 3: Create Phase 4 cards in Backlog**

1. "Set up Reddit bot account for automated posting"
2. "Full autonomous research pipeline test"
