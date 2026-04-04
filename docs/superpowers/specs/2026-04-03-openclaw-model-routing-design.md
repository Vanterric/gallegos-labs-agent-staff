# OpenClaw Model Routing — Design Spec

**Date:** 2026-04-03
**Author:** Staff CoS
**Priority:** High
**Status:** Planned

---

## Problem

OpenClaw currently sends every request through `gpt-5.4` regardless of task type. This is suboptimal — coding tasks benefit from purpose-built code models, reasoning-heavy planning benefits from o3, and trivial kanban updates waste expensive tokens on a flagship model.

## Goal

Implement quality-first model routing so that each OpenClaw task type automatically uses the best model for the job. The routing should be:

- **Configurable** — defined in a single config file, not hardcoded
- **Transparent** — logged so Staff and the President can see which model handled what
- **Overridable** — Staff can force a specific model per-request when needed

## Model Routing Table

| Task Type | Model | Rationale |
|-----------|-------|-----------|
| `conversation` | gpt-5.4 | Natural language back-and-forth, status checks, Q&A |
| `implementation` | codex | Purpose-built for code generation, multi-file edits, test writing |
| `planning` | o3 | Strong reasoning for decomposing specs into implementation plans |
| `research` | o3-mini | Good reasoning-to-cost ratio for analysis, synthesis, comparison |
| `triage` | gpt-4.1-mini | Fast + cheap for kanban CRUD, card updates, simple classification |

### Task Type Classification

Task types are determined by the message prefix in the Staff-to-OpenClaw protocol:

| Prefix | Task Type |
|--------|-----------|
| `status:request`, `status:report` | `conversation` |
| `work:assign` with implementation card | `implementation` |
| `work:assign` with planning/architecture card | `planning` |
| `work:assign` with research card | `research` |
| `queue:read`, `queue:clear`, card moves | `triage` |
| Untagged / ambiguous | `conversation` (default) |

## Architecture

### 1. Routing Config File

New file: `skills/staff/openclaw-models.yaml`

```yaml
# OpenClaw model routing — quality-first strategy
# Override per-task-type or force a model in the request

default: gpt-5.4

routes:
  conversation: gpt-5.4
  implementation: codex
  planning: o3
  research: o3-mini
  triage: gpt-4.1-mini
```

### 2. Staff-Side Routing (skills/staff/openclaw.md)

Update the OpenClaw bridge skill to:

1. Read the routing config on first OpenClaw call per session
2. Classify outgoing messages by task type (based on prefix/context)
3. Pass the routed model name in the `"model"` field of the chat completions request
4. Log the chosen model in the OpenClaw log entry (`messages.jsonl`)

### 3. OpenClaw Log Enhancement

Extend the log entry schema to include the model used:

```json
{
  "timestamp": "2026-04-03T20:00:00.000Z",
  "direction": "staff-to-openclaw",
  "message": "work:assign ...",
  "response": "...",
  "model": "codex",
  "taskType": "implementation"
}
```

The dashboard OpenClaw Log viewer should display the model badge per entry.

### 4. Gateway Session Isolation

Each model name creates a separate session on the OpenClaw gateway. This means:

- `codex` tasks get their own context window (no pollution from conversation history)
- `o3` planning sessions maintain planning context separately
- Staff can send a `status:request` (gpt-5.4) while a `codex` implementation runs in the background

This is a feature, not a bug — task isolation improves quality.

### 5. Override Mechanism

Staff can force a model by explicitly passing it:

```bash
# Force codex for a task that would normally route to conversation
curl ... -d '{"model": "codex", "messages": [...]}'
```

The routing config is only consulted when Staff doesn't explicitly specify a model.

## Implementation Cards

1. **Create routing config file** — `openclaw-models.yaml` with the routing table
2. **Update OpenClaw bridge skill** — add model classification + routing logic to `skills/staff/openclaw.md`
3. **Extend OpenClaw log schema** — add `model` and `taskType` fields, update dashboard viewer to show them
4. **Validate gateway model routing** — test that passing different model names actually creates separate sessions with the correct model

## Open Questions

- Does the gateway need any config changes to accept arbitrary model names, or does it auto-create sessions for any model string?
- Should we add cost tracking per model to surface in the briefing?
- Should failed model routing (e.g., model not available) fall back to `gpt-5.4` silently or alert Staff?

---

*Approved by President for planning. Cards to be created on Autonomous Engine board.*
