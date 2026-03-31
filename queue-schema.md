# Queue Message Schema

This document defines the format used by `queue.md` — the file-based message queue between OpenClaw and the Chief of Staff. Both sides must read and write this format.

## Location

On the Mac: `~/openclaw-staff/queue.md`

## Format

Each message is a markdown section delimited by `---`. Messages are appended to the end of the file. The file is cleared after the Chief of Staff reads all messages.

```markdown
## [ISO-8601 timestamp] message_type
- **Card:** Card title (or "N/A" if not card-related)
- **Card ID:** kanban card ID (or "N/A")
- **Board:** Board name
- **Branch:** branch name (or "N/A")
- **Plan:** path to plan file (or "N/A")
- **Tests:** X passed, Y failed (or "N/A")
- **Demo:** path to demo video (or "N/A")
- **Summary:** One-paragraph description of what happened
---
```

## Fields

| Field | Required | Description |
|-------|----------|-------------|
| Timestamp | Yes | ISO-8601 UTC (e.g., `2026-03-31T14:32:00Z`) |
| message_type | Yes | One of the types defined below |
| Card | Yes | Card title, or "N/A" |
| Card ID | Yes | Kanban API card ID, or "N/A" |
| Board | Yes | Kanban board name |
| Branch | Conditional | Git branch name. Required for `review:ready`. |
| Plan | Conditional | Path to implementation plan. Required for `review:ready`. |
| Tests | Conditional | Test summary. Required for `review:ready`. |
| Demo | Conditional | Path to demo video. Required for `review:ready`. |
| Summary | Yes | Human-readable description of what happened |

## Message Types

### review:ready

OpenClaw completed a card and moved it to Review. Waiting for President review.

```markdown
## [2026-03-31T14:32:00Z] review:ready
- **Card:** Write OpenClaw pipeline.md — main autonomous loop skill
- **Card ID:** 69cbb6a99fb7aec7124519d9
- **Board:** Autonomous Engine
- **Branch:** feature/pipeline-skill
- **Plan:** docs/plans/2026-03-31-pipeline-skill.md
- **Tests:** 8 passed, 0 failed
- **Demo:** artifacts/demos/2026-03-31-pipeline-skill.mp4
- **Summary:** Implemented the main autonomous pipeline loop skill. Polls the Engine board every 5 minutes, pulls top card from To Do, plans, implements, tests with Playwright, records demo, and moves to Review. Includes review queue cap (max 3) and blocked card handling.
---
```

### blocked

OpenClaw encountered an issue it can't resolve autonomously.

```markdown
## [2026-03-31T15:10:00Z] blocked
- **Card:** Install and configure Playwright MCP on OpenClaw Mac
- **Card ID:** 69cbb6ac9fb7aec7124519f7
- **Board:** Autonomous Engine
- **Branch:** N/A
- **Plan:** N/A
- **Tests:** N/A
- **Demo:** N/A
- **Summary:** Unable to install Playwright MCP — npm install fails with EACCES permission error on /usr/local/lib. Need sudo access or a different install path. Card moved back to To Do with [BLOCKED] prefix.
---
```

### status:report

Periodic health and progress update.

```markdown
## [2026-03-31T16:00:00Z] status:report
- **Card:** N/A
- **Card ID:** N/A
- **Board:** Autonomous Engine
- **Branch:** N/A
- **Plan:** N/A
- **Tests:** N/A
- **Demo:** N/A
- **Summary:** Autonomous loop running. 2 cards completed since last report. 1 card in Review, 3 in To Do, 7 in Backlog. No blockers. Next poll in 5 minutes.
---
```

### error

Something broke — infrastructure, API, or unexpected failure.

```markdown
## [2026-03-31T17:45:00Z] error
- **Card:** N/A
- **Card ID:** N/A
- **Board:** Autonomous Engine
- **Branch:** N/A
- **Plan:** N/A
- **Tests:** N/A
- **Demo:** N/A
- **Summary:** Kanban API unreachable (connection refused to gallegos-kanban-api.onrender.com). Autonomous loop paused. Will retry in 10 minutes.
---
```

### question

OpenClaw needs clarification before it can plan or implement a card.

```markdown
## [2026-03-31T18:20:00Z] question
- **Card:** Write OpenClaw testing.md — Playwright MCP test skill
- **Card ID:** 69cbb6ab9fb7aec7124519e5
- **Board:** Autonomous Engine
- **Branch:** N/A
- **Plan:** N/A
- **Tests:** N/A
- **Demo:** N/A
- **Summary:** Card says "visual regression testing" but doesn't specify where baseline screenshots should be stored or what the comparison threshold should be. Should baselines live in the repo (git-tracked) or in a separate artifacts directory? Need guidance before planning.
---
```

## Reading the Queue (Staff Side)

When the Chief of Staff starts up:

1. Send a `status:request` to OpenClaw via the bridge skill (`skills/staff/openclaw.md`)
2. Ask OpenClaw to return the contents of `~/openclaw-staff/queue.md`
3. Parse each `## [timestamp] type` section
4. Present messages in the briefing grouped by type:
   - `review:ready` → under "Agent Results" with review action needed
   - `blocked` → under "Decisions Needed" with blocker details
   - `error` → under "Decisions Needed" flagged as infrastructure issue
   - `question` → under "Decisions Needed" with the question
   - `status:report` → under "Agent Results" as summary
5. After processing, tell OpenClaw to clear the queue

## Writing to the Queue (OpenClaw Side)

OpenClaw writes to the queue when:

1. It completes a card (→ `review:ready`)
2. It hits a blocker (→ `blocked`)
3. On a periodic cadence, e.g., every hour (→ `status:report`)
4. Something breaks (→ `error`)
5. A card is ambiguous (→ `question`)

**Write procedure:**
1. Attempt to send the message to the Chief of Staff via Gateway API first
2. If the Staff is online and responds, no queue write needed
3. If connection refused or timeout, append the message to `~/openclaw-staff/queue.md`
4. Create the directory if it doesn't exist: `mkdir -p ~/openclaw-staff`

## Clearing the Queue

The Chief of Staff clears the queue after reading by telling OpenClaw:

```
[STAFF:queue:clear]
Messages processed. Clear ~/openclaw-staff/queue.md.
```

OpenClaw then truncates the file:

```bash
> ~/openclaw-staff/queue.md
```
