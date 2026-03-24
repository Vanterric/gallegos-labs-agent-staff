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

## 2. Agent Results

[If any background agents completed work during this session, summarize:]
- **[Task name]**: [outcome — success/failure, what was done, what needs review]

[If no agents have run yet:]
No agent activity yet this session.

## 3. Research Context

[If any research has been conducted, summarize key findings relevant to current work]

[If no research yet:]
No active research briefs.

## 4. Recommended Next Actions

Based on project priorities and current state, I recommend:

1. **[Action]** — [reasoning, 1 sentence]
2. **[Action]** — [reasoning, 1 sentence]
3. **[Action]** — [reasoning, 1 sentence]

Prioritize based on:
- High-priority projects with empty `current_focus` need direction
- Cards stuck in "In Progress" or "Review" need attention
- Projects with dirty working trees may have unfinished work

## 5. Decisions Needed

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
