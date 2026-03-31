# Autonomous Software Engine — Design Spec

**Date:** 2026-03-30
**Status:** Approved
**Author:** Chief of Staff + President Gallegos

## Overview

An always-on autonomous software engine powered by OpenClaw on a dedicated Mac. It watches a dedicated kanban board, pulls cards FIFO, and autonomously plans, implements, tests (Playwright MCP), records demo videos, and moves work to Review. The Chief of Staff (Claude Code) acts as the intermediary between the President and OpenClaw, directing complex work and relaying status. The engine's first project is building itself.

## Actors

| Actor | Where | Role |
|-------|-------|------|
| **Chief of Staff** | President's Windows machine (Claude Code) | Brain. Prioritizes work, creates cards, directs OpenClaw on complex tasks, reviews queue on startup, presents to President. |
| **OpenClaw Mac** | Dedicated Mac | Hands. Runs autonomous pipeline loop, executes implementation, testing, demo recording. Always on. |
| **Kanban API** | Render (public, authenticated) | Shared state. Both actors read/write boards via authenticated REST API. |

## Communication Protocol

### Staff to OpenClaw (Gateway API)

The Chief of Staff sends HTTP POST requests to OpenClaw's Gateway API (default port 18789). OpenClaw is always on, so it's always reachable.

Message types:

| Type | When | Payload |
|------|------|---------|
| `work:assign` | Staff wants OpenClaw to prioritize a specific card | Card ID, urgency level |
| `work:pause` | Stop autonomous loop temporarily | Reason |
| `work:resume` | Resume autonomous loop | — |
| `config:update` | Change behavior (polling cadence, review cap, etc.) | Key-value config |
| `status:request` | Staff wants current state | — |
| `review:approved` | President approved a card in Review | Card ID, merge instructions |
| `review:rejected` | President rejected, needs rework | Card ID, feedback |

### OpenClaw to Staff (Gateway API + queue.md fallback)

OpenClaw first attempts to reach the Chief of Staff via Gateway API. If that fails (connection refused — Staff is offline), it appends to `~/openclaw-staff/queue.md` on the Mac.

Queue message format:

```markdown
## [ISO-8601 timestamp] message_type
- **Card:** Card title
- **Card ID:** kanban card ID
- **Board:** Board name
- **Branch:** branch name (if applicable)
- **Plan:** path to plan file (if applicable)
- **Tests:** X passed, Y failed
- **Demo:** path to demo video (if applicable)
- **Summary:** One-paragraph description of what happened
---
```

Messages are appended with `---` delimiters. On `/staff` startup, the Chief of Staff sends a `status:request` to OpenClaw's Gateway API, which returns any queued messages and clears the file. If OpenClaw is unreachable (Mac offline), the queue persists until the next successful connection.

Message types OpenClaw can queue:

| Type | Meaning |
|------|---------|
| `review:ready` | Card completed, in Review, awaiting President |
| `blocked` | Card hit an issue OpenClaw can't resolve |
| `status:report` | Periodic health/progress update |
| `error` | Something broke (API down, test infra issue, etc.) |
| `question` | Ambiguous card, needs clarification before planning |

## Autonomous Pipeline Loop

OpenClaw runs this loop on a cron (every 5-10 minutes):

### Step 1: Check Review Queue
- Count cards in Review column
- If >= 3, STOP. Log "Review queue full" and wait for next cycle.

### Step 2: Pull Next Card
- GET board from kanban API
- Take top card from "To Do" column
- If no cards, STOP. Log "No work available."
- Move card to "In Progress"

### Step 3: Plan
- Read the card title + description
- Read the target repo's CLAUDE.md and relevant code
- Write an implementation plan as markdown in the repo (`docs/plans/YYYY-MM-DD-<card-slug>.md`)
- Update card description with link to plan

### Step 4: Implement
- Create feature branch from main
- Implement against the plan
- Commit with descriptive messages

### Step 5: Test
- Run existing test suite (if any)
- Write and run Playwright MCP functional tests for the new feature
- Write and run Playwright MCP visual regression tests
- If tests fail: attempt fix (max 2 retries). If still failing, move card to "Blocked", queue message to Staff, STOP this card.

### Step 6: Demo
- Use Playwright MCP to record a short video walkthrough of the feature
- Save video artifact, link it in the card description

### Step 7: Move to Review
- Update card with: branch name, plan link, test results summary, demo video link
- Move card to "Review"
- Queue message to Staff: "Card X ready for review"

### Step 8: Loop
- Return to step 1

### On Failure
OpenClaw writes a structured message to `queue.md` describing what happened, moves the card to "Blocked" (or back to To Do with a `[BLOCKED]` prefix), and continues to the next cycle.

## Kanban Web Deployment

The kanban moves from localhost to a public, authenticated API on Render.

### Changes Required
1. **Deploy to Render** — Express API + MongoDB (MongoDB Atlas or Render's managed DB)
2. **API authentication hardening** — Ensure all endpoints require Bearer token auth. Create dedicated service accounts: `staff-bot` (Chief of Staff), `openclaw-mac` (Mac agent), and later `openclaw-win`.
3. **Token refresh** — Long-lived tokens for service accounts with a refresh mechanism so always-on agents don't expire mid-work.
4. **Rate limiting** — Protect public endpoints from abuse.
5. **Dedicated engine board** — Separate board that OpenClaw watches, distinct from project boards the Chief of Staff manages for briefings.
6. **Update `staff-projects.yaml`** — Change `kanban.api_url` from `localhost:3002` to the Render production URL.

### What Stays the Same
- The kanban app already has JWT auth, boards, columns, cards, and a move API with version control.
- The React frontend deploys alongside for visual board inspection.

## Playwright MCP Integration

OpenClaw installs `@anthropic-ai/mcp-playwright` (or equivalent) into its MCP config.

### Functional Testing
- After implementation, Playwright runs end-to-end tests against the feature
- Tests interact with the actual running app (start dev server, navigate, assert)
- Test files saved alongside feature code

### Visual Regression Testing
- Playwright captures screenshots at key states
- Compare against baseline screenshots (first run creates baselines)
- Flag visual diffs as potential regressions

### Demo Recording
- After tests pass, Playwright records a short video walkthrough
- Script navigates through the happy path of the feature
- Video saved as artifact and linked in the kanban card
- President watches this during review

### Setup
- Installing and configuring Playwright MCP is one of the first cards the engine builds for itself.

## Hybrid Autonomy Model

OpenClaw operates in two modes:

### Autonomous Mode
- Polls the dedicated engine board on a cron
- Pulls cards FIFO from To Do
- Executes the full pipeline without human intervention
- Stops pulling new work when Review queue hits 3 cards

### Directed Mode
- Chief of Staff sends a `work:assign` message via Gateway API
- OpenClaw prioritizes that card immediately (interrupts autonomous queue)
- Used for complex or ambiguous work that needs Staff-level planning

The Chief of Staff decides which mode applies based on card complexity. Simple, well-defined cards flow autonomously. Complex or cross-cutting work gets directed.

## New Components in Agent-Staff Repo

| Component | Purpose |
|-----------|---------|
| `skills/staff/openclaw.md` | Sub-skill teaching Chief of Staff how to communicate with OpenClaw via Gateway API |
| `skills/openclaw/pipeline.md` | Main autonomous loop skill deployed to Mac |
| `skills/openclaw/planning.md` | How to write an implementation plan from a card |
| `skills/openclaw/testing.md` | Playwright MCP functional + visual testing |
| `skills/openclaw/demo.md` | Record demo video of feature |
| `skills/openclaw/queue.md` | How to write/read the message queue file |
| `queue-schema.md` | Defines the format both sides use for queue.md |

## Phased Rollout

### Phase 1: Foundation
- Deploy kanban to Render with authenticated API endpoints
- Create service accounts (staff-bot, openclaw-mac)
- Update `staff-projects.yaml` with production kanban URL
- Create the dedicated "Engine" board on the kanban
- Verify Chief of Staff can read/write the remote kanban

### Phase 2: OpenClaw Bridge
- Write `skills/staff/openclaw.md` (Chief of Staff sub-skill for Gateway API)
- Define `queue-schema.md` (message queue format)
- Test Staff to OpenClaw messaging (send a simple status request)
- Test OpenClaw to Staff fallback (queue.md write/read cycle)

### Phase 3: Pipeline Skills
- Write OpenClaw pipeline skills (pipeline.md, planning.md, testing.md, demo.md, queue.md)
- Deploy skills to the Mac
- Seed the Engine board with first cards (starting with "Install Playwright MCP")
- Run the pipeline manually once end-to-end to validate

### Phase 4: Autonomous Mode
- Configure OpenClaw cron to poll the board every 5-10 minutes
- Set the review queue cap (max 3)
- Let it run on a real card, observe the full cycle
- Chief of Staff pulls queue on startup, presents results to President

### Phase 5: Self-Improvement Loop
- Engine is now building itself — cards on the Engine board describe its own enhancements
- Chief of Staff creates cards, OpenClaw executes them, President reviews
- Iterate on pipeline quality, test coverage, demo quality

Each phase has a clear "it works" gate before moving to the next.

## Future Expansion

- **Windows OpenClaw** — Second machine for Windows-first development and macOS/iOS porting
- **Multiple boards** — OpenClaw watches project-specific boards (Nimbus, Labs Site, etc.)
- **Direct President notifications** — If needed later, OpenClaw can message via Telegram/Signal
- **Agent fleet** — Multiple OpenClaw instances specializing in different types of work
