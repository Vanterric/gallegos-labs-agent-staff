---
name: staff:briefing
description: Generates the morning briefing for the President — project status, agent results, recommendations
---

# Morning Briefing Generator

You generate the morning briefing when the President invokes `/staff`. Gather data from git and kanban state, then present a concise, actionable report.

## Data Gathering

### Git State (per project in manifest)

For each project in `staff-projects.yaml` with `status: active`:

1. **Last 5 commits:**
```bash
cd {{project_path}} && git log --oneline -5 2>/dev/null || echo "No git history"
```

2. **Open branches:**
```bash
cd {{project_path}} && git branch --list 2>/dev/null || echo "Not a git repo"
```

3. **Working tree status:**
```bash
cd {{project_path}} && git status --short 2>/dev/null || echo "Not a git repo"
```

### Kanban State

Follow the `staff:kanban` instructions to read board state for each project. Use the kanban skill's board reading and formatting instructions.

### OpenClaw Queue

Pull queued messages from the OpenClaw Mac mini. Follow `skills/staff/openclaw.md` for the procedure:

1. Run `openclaw cron list`
2. Verify the `autonomous-pipeline` cron exists, is scheduled, and has a last-run time within 15 minutes
3. If the cron is missing or stale, note it in the briefing under `Decisions Needed`
4. Send a `status:request` to OpenClaw via the Gateway API
5. If OpenClaw responds, parse the response for:
   - Current task status
   - Queued messages (queue.md contents)
   - Any blockers or questions
6. If OpenClaw is unreachable (connection refused/timeout), note `OpenClaw Mac: offline` in the briefing
7. If there are queued messages, categorize them:
   - `review:ready` → present under "Agent Results" with card details, PR link, and demo link when available
   - `blocked` → present under "Decisions Needed"
   - `error` → present under "Decisions Needed" flagged as infrastructure issue
   - `question` → present under "Decisions Needed" with the question
   - `status:report` → summarize under "Agent Results"
8. After processing, tell OpenClaw to clear the queue

## Briefing Output

The briefing is rendered as a markdown document and pushed to the President's Dashboard MD Viewer — NOT dumped into the terminal. The terminal should only show a short status line like:

```
Briefing ready — pushed to your dashboard. [date]
```

### How to Push

Write the briefing to a temp file, then push it:

```bash
# Write briefing markdown to a temp file
cat > /tmp/staff-briefing.md << 'EOF'
{{briefing_content}}
EOF

# Push to dashboard viewer
bash scripts/viewer-show.sh "Morning Briefing — {{date}}" /tmp/staff-briefing.md
```

### Briefing Markdown Template

The briefing should be a clean, scannable document with clear visual hierarchy. Use horizontal rules, tables, and whitespace generously. The President reads this before coffee.

```markdown
# Morning Briefing — {{date}}

> {{one-line lab pulse: e.g. "3 projects active, 1 card in review, OpenClaw online"}}

---

## Decisions Needed

[This section goes FIRST — the most important thing. If nothing needs a decision, say so briefly.]

| # | Decision | Context | Urgency |
|---|----------|---------|---------|
| 1 | [what needs deciding] | [why it's blocked] | [high/medium/low] |

---

## Project Pulse

[One table for quick scanning. Only active projects.]

| Project | Priority | Focus | Last Commit | Dirty? | Board Summary |
|---------|----------|-------|-------------|--------|---------------|
| Nimbus | high | [focus] | [commit msg] | [yes/no] | [e.g. "1 review, 3 backlog"] |
| Agent Staff | high | [focus] | [commit msg] | [yes/no] | [summary] |
| ... | | | | | |

[For any project with notable detail — branches to clean, cards stuck, etc. — add a short callout below the table:]

> **Nimbus** — 22 branches, several stale `speed-opt/*` experiments. Cleanup candidate.

---

## OpenClaw

| Field | Status |
|-------|--------|
| Gateway | [online/offline] |
| Current Task | [task or "idle"] |
| Queue | [N messages / empty] |

[If there are queued messages, list them:]

| Type | Card | Detail |
|------|------|--------|
| review:ready | [title] | PR: [link], branch: [x] |
| blocked | [title] | [blocker] |

---

## Agent Results

[If any agents completed work:]

| Agent | Task | Outcome |
|-------|------|---------|
| [name] | [what] | [result] |

[If none:]
*No agent activity this session.*

---

## User Feedback

[If new feedback exists, show as a table. If not:]
*No new feedback since last session.*

---

## Research

[Brief summary or "No active briefs."]

---

## Recommended Actions

| # | Action | Why |
|---|--------|-----|
| 1 | [action] | [one sentence] |
| 2 | [action] | [one sentence] |
| 3 | [action] | [one sentence] |

---

*What would you like to focus on today?*
```

## Guidelines

- **Push to MD Viewer, not terminal** — the briefing is a document, not a chat message
- Keep each section tight — the President has ~2 hours and reads this pre-coffee
- **Decisions first** — don't bury blockers at the bottom
- Use tables for anything with 2+ items — they scan faster than bullet lists
- If a project has no recent activity and low priority, collapse it to one row in the table
- Recommendations should be specific and actionable, not vague
- The closing prompt ("What would you like to focus on today?") goes in the terminal, not the briefing
