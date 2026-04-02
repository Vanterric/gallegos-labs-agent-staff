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

## Briefing Format

Present the briefing in this exact structure:

---

# Good morning, President. Here's your briefing.

## 1. Project Status

For each active project:

### [Project Name] — [priority] priority
**Focus:** [current_focus from manifest, or "No focus set"]
**Last activity:** [most recent commit message and date]
**Branches:** [list of branches, highlight any that aren't main/master]
**Working tree:** [clean / N uncommitted changes]
**Board:** [N cards in Backlog, N in To Do, N in Progress, N in Review, N in Done]

## 2. OpenClaw Status

**Status:** [online/offline]
**Current task:** [what it's working on, or "idle"]
**Pipeline:** [N cards completed since last briefing, N in Review awaiting approval]

[If there are queued messages from OpenClaw, summarize each:]
- **[review:ready]** [Card title] — ready for review. Branch: [x], PR: [link], Tests: [x passed], Demo: [link]
- **[blocked]** [Card title] — [blocker summary]
- **[question]** [Card title] — [question]

[If no queue messages:]
No pending messages from OpenClaw.

## 3. Agent Results

[If any background agents completed work during this session, summarize:]
- **[Task name]**: [outcome — success/failure, what was done, what needs review]

[If no agents have run yet:]
No agent activity yet this session.

## 4. User Feedback

[If new feedback was returned by `bash scripts/check-feedback.sh`:]

| # | Category | Title | Summary | From | Date |
|---|----------|-------|---------|------|------|
| 1 | [category] | [title] | [first ~100 chars of content] | [userEmail or "anonymous"] | [date] |

[If no new feedback:]
No new user feedback since last session.

## 5. Research Context

[If any research has been conducted, summarize key findings relevant to current work]

[If no research yet:]
No active research briefs.

## 6. Recommended Next Actions

Based on project priorities and current state, I recommend:

1. **[Action]** — [reasoning, 1 sentence]
2. **[Action]** — [reasoning, 1 sentence]
3. **[Action]** — [reasoning, 1 sentence]

Prioritize based on:
- High-priority projects with empty `current_focus` need direction
- Cards stuck in "In Progress" or "Review" need attention
- Projects with dirty working trees may have unfinished work

## 7. Decisions Needed

[List anything that requires President approval to unblock:]
- [Decision needed] — [context]

[If nothing is blocked:]
No blockers — ready to execute on your direction.

---

## Guidelines

- Keep each section concise — the President has limited time
- Lead with what matters most — don't bury important items
- If a project has no recent activity and low priority, mention it briefly rather than giving it a full section
- Recommendations should be specific and actionable, not vague
- Always end with a prompt for direction: "What would you like to focus on today?"
