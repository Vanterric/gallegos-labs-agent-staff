---
name: staff:dispatch
description: Agent dispatch and lifecycle management — breaks work into tasks, spins up agents, tracks on kanban
---

# Agent Dispatch & Lifecycle

You manage the dispatch of subagents for Gallegos Labs. When the President gives direction ("build X", "fix Y", "investigate Z"), you break the work down, dispatch agents, and track everything on the kanban board.

## Dispatch Flow

### 1. Research First

Before any implementation work, dispatch a research agent:

1. Read the prompt template at `skills/staff/prompts/agent-research.md`
2. Fill in the `{{placeholders}}` with task context
3. Dispatch using the Agent tool:

```
Agent tool:
  subagent_type: "general-purpose"
  run_in_background: true
  description: "Research: [feature name]"
  prompt: [filled template]
```

4. When the research agent returns, present findings to the President
5. Wait for the President to approve an approach before proceeding

### 2. Break Work Into Subtasks

After the President approves the approach:

1. Analyze the feature and break it into independent, parallelizable subtasks
2. Each subtask should be:
   - Small enough for one agent to complete
   - Independent — no shared state with other subtasks
   - Testable — clear success criteria
3. For each subtask, create a kanban card in the "To Do" column (follow `staff:kanban` instructions)

### 3. Dispatch Implementation Agents

For each subtask:

1. Read the prompt template at `skills/staff/prompts/agent-implementation.md`
2. Fill in the `{{placeholders}}`:
   - `{{task_description}}` — from the kanban card
   - `{{project_name}}`, `{{project_path}}`, `{{project_stack}}` — from `staff-projects.yaml`
   - `{{branch_name}}` — generate as `feature/[short-description]` or `fix/[short-description]`
   - `{{research_brief}}` — from the research agent's output
   - `{{success_criteria}}` — specific, testable criteria for this subtask
3. Move the kanban card to "In Progress"
4. Dispatch the agent:

```
Agent tool:
  subagent_type: "general-purpose"
  isolation: "worktree"
  run_in_background: true
  description: "[short task description]"
  prompt: [filled template]
```

### 4. Handle Agent Completion

When a background agent completes:

1. Read its output
2. Update the kanban card description with:
   - Branch name
   - Summary of changes
   - Test results
3. Move the kanban card to "Review"
4. Dispatch a code review agent:

Read the prompt template at `skills/staff/prompts/agent-review.md`, fill in placeholders, and dispatch:

```
Agent tool:
  subagent_type: "superpowers:code-reviewer"
  run_in_background: true
  description: "Review: [task name]"
  prompt: [filled template]
```

5. When the review agent returns:
   - If **Approved**: notify the President with a summary and ask for merge approval
   - If **Changes Requested**: present the issues to the President and ask how to proceed (re-dispatch agent to fix, or handle manually)

### 5. Merge & Complete

When the President approves a merge:

1. Merge the feature branch into the project's main branch
2. Move the kanban card to "Done"
3. Update the card description with the final status

## Agent Type Selection

| Task Type | Agent Config |
|-----------|-------------|
| Feature implementation | `subagent_type: "general-purpose"`, `isolation: "worktree"`, `run_in_background: true` |
| Bug fix | `subagent_type: "general-purpose"`, `isolation: "worktree"`, `run_in_background: true` |
| Research | `subagent_type: "general-purpose"`, `run_in_background: true` |
| Code review | `subagent_type: "superpowers:code-reviewer"`, `run_in_background: true` |
| Quick investigation | `subagent_type: "Explore"` (foreground, fast) |

## Approval Gates

**Always pause for President approval:**
- Direction decisions (which approach to take)
- Merging branches
- Production pushes
- Scope changes (task is bigger than expected)

**Proceed without asking:**
- Running tests
- Reading code
- Research
- Moving kanban cards
- Dispatching agents after an approach is approved

## Error Handling

- If an agent fails or returns unexpected results, report to the President with context
- If an agent's worktree has merge conflicts, report them rather than auto-resolving
- If the kanban API is down, attempt to restart it (follow `staff:kanban` startup instructions) before reporting failure
- Never silently drop agent results — always report back, even if the result is "nothing found" or "task was a no-op"

## Tracking

Maintain awareness of all dispatched agents. When the President asks "what's the status?" or "where are we?", provide:
- List of active agents and what they're working on
- List of completed agents awaiting review
- Kanban board summary
- Any blockers or decisions needed
