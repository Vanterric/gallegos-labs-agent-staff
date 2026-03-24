# Agent Staff System — Design Spec

**Date:** 2026-03-23
**Author:** Derri Gallegos + Claude (Chief of Staff)
**Status:** Approved

---

## 1. Overview

The Agent Staff system is a Claude Code skill (`/staff`) that transforms a Claude Code session into a Chief of Staff operating mode for Gallegos Labs — a single-person R&D lab building user-aligned AI products.

The system enables Derri to serve as President (vision and direction) while Claude operates as Chief of Staff (orchestration, dispatch, and management), spinning up subagents for execution tasks and managing them through completion.

### Core Constraints

- **Session-based:** All agents run within a Claude Code session. No external daemons or services.
- **Human-in-the-loop:** The President approves direction, merges, and production pushes. Routine work (research, tests, kanban updates) runs without prompting.
- **~2 hours/day active time:** The system maximizes leverage from limited daily engagement. Session can stay open all day for async approvals.
- **No application code in this repo:** This repo contains only skills, prompt templates, and configuration. Product code lives in its own project.

---

## 2. Architecture — Skill + Sub-Skills (Approach B)

A `/staff` master skill backed by composable sub-skills:

```
/staff (master)
  ├── staff:briefing    → reads git + kanban + agent state → presents briefing
  ├── staff:research    → web search + papers + OSS → research brief
  ├── staff:dispatch    → plans work → spins agents → tracks on kanban
  └── staff:kanban      → CRUD interface to kanban board API
```

The master skill is the only one invoked directly by the user. Sub-skills are invoked internally by the master as needed. Each sub-skill is a separate `.md` file that loads only when called.

---

## 3. Project Manifest (`staff-projects.yaml`)

The manifest is the staff's knowledge of what exists and what matters. Lives in the repo root.

```yaml
lab:
  name: Gallegos Labs
  mission: "Building highly user-aligned AI products and pushing the frontier of UX in the age of AI"

projects:
  nimbus:
    name: Nimbus
    path: ../Nimbus_POC
    description: "Voice-first AI companion with persistent memory and structured notes"
    status: active
    priority: high
    stack: [Next.js, MongoDB, OpenAI, Anthropic, ElevenLabs]
    current_focus: ""

  kanban:
    name: Gallegos Kanban
    path: ../gallegos-kanban
    description: "Project kanban board with agent-friendly REST API"
    status: active
    priority: medium
    stack: [Express, React, MongoDB, Vite]
    current_focus: "Integration with agent-staff system"

  agent-staff:
    name: Agent Staff
    path: .
    description: "The staff system itself — skills, manifest, and orchestration"
    status: active
    priority: high
    stack: [Claude Code Skills]
    current_focus: "Initial build"

  labs-site:
    name: Gallegos Labs Site
    path: ../gallegos-labs-site
    description: "Public website for Gallegos Labs"
    status: active
    priority: low
    stack: []
    current_focus: ""

kanban:
  api_url: "http://localhost:3001"
  default_columns: [Backlog, To Do, In Progress, Review, Done]
```

**Key decisions:**

- YAML for readability and comments
- Relative paths for portability
- `current_focus` as a lightweight steering mechanism, updatable conversationally
- Minimal fields — deep context comes from reading the actual project

---

## 4. Entry Point & Session Lifecycle

### Invocation

User invokes `/staff` in Claude Code. The master skill:

1. Reads `staff-projects.yaml`
2. Runs bootstrap (first run only — see Section 8)
3. Calls `staff:kanban` to read board state
4. Scans git state across all registered projects
5. Calls `staff:briefing` to generate and present the morning briefing
6. Enters CoS (Chief of Staff) mode

### CoS Mode

Once active, the staff operates as a proactive partner:

- Suggests what to work on based on priorities and project state
- Flags blockers and surfaces decisions
- Dispatches research and implementation agents
- Tracks everything on the kanban board
- Reports agent completions and review needs

### Session Flow

```
Invoke /staff
    → Briefing presented
    → President gives direction
    → Staff dispatches agents (background)
    → Agents work, staff tracks on kanban
    → Agents complete → staff presents summaries
    → President reviews and approves
    → Repeat
```

---

## 5. Morning Briefing (`staff:briefing`)

Generated on `/staff` invocation. Five sections:

1. **Project status snapshot** — per project: last commits, open branches, dirty working tree, failing tests
2. **Agent results** — any background agents that completed work, with summaries and review links
3. **Research context** — relevant findings from any research agents, tied to active features
4. **Recommended next actions** — prioritized list with reasoning, based on manifest priorities and project state
5. **Decisions needed** — anything blocking that only the President can unblock

---

## 6. Agent Dispatch & Lifecycle (`staff:dispatch`)

### Agent Types

| Task Type | Agent Config | Isolation |
|-----------|-------------|-----------|
| Feature implementation | `subagent_type: "general-purpose"`, `isolation: "worktree"` | Yes |
| Bug fix | `subagent_type: "general-purpose"`, `isolation: "worktree"` | Yes |
| Research | `subagent_type: "Explore"` or web search agent | No |
| Code review | `subagent_type: "superpowers:code-reviewer"` | No |
| Test running | `subagent_type: "general-purpose"`, `run_in_background: true` | No |

### Dispatch Flow

```
President: "Let's add X to Nimbus"
    │
    ▼
staff:research (background)
    "How do others handle X? Check libs, papers, OSS repos"
    │
    ▼
Research brief presented → Staff recommends approach
    │
    ▼
President approves direction
    │
    ▼
staff:dispatch
    ├── Creates kanban cards (Backlog → To Do)
    ├── Agent 1: subtask A (worktree, background)
    ├── Agent 2: subtask B (worktree, background)
    ├── Agent 3: tests (worktree, background)
    │
    ├── As each completes:
    │   ├── Kanban card → Review
    │   ├── Code reviewer agent dispatched
    │   └── Summary presented to President
    │
    └── President approves → card → Done
```

### Approval Gates

Staff pauses for President approval on:

- Direction decisions (which approach, scope)
- Merging agent work (worktree branches into main)
- Production pushes
- Scope changes (task bigger than expected)

Routine work runs without asking: tests, research, reading code, moving kanban cards.

### Agent Prompts

Each agent receives a structured prompt including:

- Task description from the kanban card
- Project context from the manifest
- Research findings (if research was done)
- Project conventions (from target project's CLAUDE.md)
- Clear success criteria

Prompt templates live in `skills/staff/prompts/` with `{{variable}}` placeholders filled by the dispatch skill.

---

## 7. Research Workflow (`staff:research`)

Triggered as step one when a feature task begins. Given a feature description:

1. **Web search** — how others solve the problem (products, posts, discussions)
2. **Papers and OSS** — academic papers, open-source repos addressing the problem
3. **Evaluate reusability** — existing library? Fork? Build from scratch?
4. **Produce research brief** — findings, recommendations, links

The brief is presented to the President and attached to the relevant kanban card description.

---

## 8. Kanban Integration (`staff:kanban`)

### Board Structure

Each project in the manifest gets its own kanban project board with columns:

```
Backlog → To Do → In Progress → Review → Done
```

### Card Flow

| Actor | Action | Kanban Effect |
|-------|--------|--------------|
| President | "Add X to the backlog" | Card created in Backlog |
| Staff | Breaks feature into tasks | Cards created in To Do |
| Staff | Dispatches an agent | Card → In Progress |
| Agent | Completes work | Card → Review |
| Code reviewer | Passes review | Staff notifies President |
| President | Approves merge | Card → Done |

### Card Description Format

```markdown
## Task
[Task description]

## Research
[Research brief summary or link]

## Agent
Branch: [branch name]
Status: [Complete — awaiting review / In progress / etc.]

## Changes
- [Summary of changes made]
- [Test results]
```

### Auth

A `staff-bot` user is created in the kanban system on first run. Credentials stored in `.env` (gitignored).

---

## 9. Bootstrap (First Run)

On first `/staff` invocation, before the normal briefing flow:

1. **Start kanban infrastructure** — if the kanban API isn't reachable, run `docker compose up -d` in the gallegos-kanban directory to start MongoDB, then `npm run dev` in the background to start the API
2. **Create kanban projects** — one board per project in the manifest
3. **Create staff-bot user** — for API auth, save credentials to `.env`
4. **Validate project paths** — confirm each project directory exists
5. **Git init this repo** — if not already initialized, create initial commit

Bootstrap detects completion by checking for `.env`. If kanban goes down mid-session, the staff detects and restarts it.

---

## 10. File Structure

```
gallegos-labs-agent-staff/
├── staff-projects.yaml              # Project manifest
├── .env                             # Kanban API credentials (gitignored)
├── .gitignore
├── CLAUDE.md                        # Project conventions for Claude Code
├── skills/
│   └── staff/
│       ├── staff.md                 # Master skill — entry point, CoS persona
│       ├── dispatch.md              # Agent dispatch and lifecycle management
│       ├── research.md              # Prior art / competitive research workflow
│       ├── kanban.md                # Kanban API interface and card management
│       └── prompts/
│           ├── agent-implementation.md  # Template for implementation agents
│           ├── agent-research.md        # Template for research agents
│           └── agent-review.md          # Template for review agents
├── docs/
│   └── superpowers/
│       └── specs/                   # Design documents
└── README.md                        # (if needed)
```

**This repo contains no application code.** It is purely orchestration — skills, prompts, and configuration.

---

## 11. CLAUDE.md

```markdown
# Gallegos Labs Agent Staff

This is the orchestration layer for Gallegos Labs. It contains no application
code — only Claude Code skills, agent prompt templates, and project configuration.

## Key Files
- staff-projects.yaml — project manifest, source of truth for what exists
- skills/staff/staff.md — the /staff skill entry point

## Conventions
- All paths in the manifest are relative to this repo's root
- Agent prompts in skills/staff/prompts/ use {{variable}} placeholders
- The kanban API runs at the URL specified in staff-projects.yaml

## Working With Other Projects
When dispatching agents to work on other projects (Nimbus, kanban, etc.),
always read that project's CLAUDE.md first to respect its conventions.
```

---

## 12. Future Considerations (Not In Scope)

These are explicitly deferred:

- **Persistent daemon mode** — running agents outside of a Claude Code session
- **Nimbus integration** — pulling context from Nimbus notebooks (possible future enhancement)
- **Multi-user support** — this is a single-person lab
- **Dashboard UI** — the kanban board serves this role for now
- **Demo video generation** — deferred until the core loop is solid
- **GTM planning skills** — can be added as new sub-skills later
