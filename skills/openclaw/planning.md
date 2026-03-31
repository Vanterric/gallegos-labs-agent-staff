# Implementation Planning — OpenClaw

When you pull a card from the board, your first step is always to plan before you code. This skill teaches you how to produce a structured implementation plan from a kanban card.

## When to Use

Every card goes through planning before implementation. No exceptions — even "simple" cards get a brief plan. The plan is your contract with yourself and the reviewer.

## Input

You receive:
- **Card title** — what needs to be built
- **Card description** — task details, context, acceptance criteria
- **Target repo** — the project directory to work in

## Process

### 1. Understand the Card

Read the card title and description carefully. Identify:
- **What** needs to be built or changed
- **Why** it's needed (if stated)
- **Acceptance criteria** — how do we know it's done?
- **Constraints** — anything that limits the approach

If the card is ambiguous or missing critical details:
- Write a `question` message to the queue
- Move the card back to To Do with `[NEEDS CLARIFICATION]` prefix
- Move on to the next card

### 2. Explore the Codebase

Before planning, understand what you're working with:

```bash
# Read the project's CLAUDE.md for conventions
cat {{project_path}}/CLAUDE.md 2>/dev/null

# Check recent git history for context
cd {{project_path}} && git log --oneline -10

# Look at the project structure
ls -la {{project_path}}/src/ 2>/dev/null || ls -la {{project_path}}/

# Read any existing tests for patterns
find {{project_path}} -name "*.test.*" -o -name "*.spec.*" | head -10
```

Follow the project's existing patterns. Don't invent new conventions.

### 3. Write the Plan

Create `docs/plans/YYYY-MM-DD-<card-slug>.md` in the target repo.

The card slug is the card title converted to lowercase kebab-case, truncated to 50 chars. Example: "Write OpenClaw pipeline.md — main autonomous loop skill" → `write-openclaw-pipeline-md`

#### Plan Format

```markdown
# [Card Title] — Implementation Plan

**Card ID:** [kanban card ID]
**Date:** [YYYY-MM-DD]
**Branch:** feature/[card-slug] or fix/[card-slug]

## Goal
[One sentence: what this achieves when done]

## Approach
[2-3 sentences: how you'll build it, key decisions]

## File Changes

### New Files
- `path/to/new/file.ts` — [purpose]

### Modified Files
- `path/to/existing/file.ts` — [what changes and why]

### Test Files
- `tests/path/to/test.ts` — [what it tests]

## Steps

### 1. [First step name]
- [ ] [Specific action with file path]
- [ ] [Test to verify]
- [ ] Commit: "[commit message]"

### 2. [Second step name]
- [ ] [Specific action]
- [ ] [Test to verify]
- [ ] Commit: "[commit message]"

[Continue for each step...]

## Testing Strategy
- **Unit tests:** [what to unit test]
- **Functional tests (Playwright):** [E2E scenarios to cover]
- **Visual tests (Playwright):** [screenshots to capture]

## Done Criteria
- [ ] All steps completed
- [ ] All tests passing
- [ ] Demo video recorded
- [ ] Card description updated with results
```

### 4. Keep Plans Focused

- **Small plans** — If the card is straightforward (1-3 files, clear scope), the plan can be brief. Don't pad it.
- **No speculation** — Only plan what the card asks for. Don't add features.
- **Concrete steps** — Each step should name exact files and describe exact changes. No "implement the logic" hand-waving.
- **Test-first** — Each step should include what to test. Write tests before implementation when possible.

### 5. Update the Card

After writing the plan, update the kanban card description to include:

```markdown
## Plan
docs/plans/YYYY-MM-DD-<card-slug>.md

## Branch
feature/<card-slug>
```

Use the kanban API:

```bash
curl -s -X PATCH "$KANBAN_API/api/cards/$CARD_ID" \
  -H "Authorization: Bearer $KANBAN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "'"$(echo "$ORIGINAL_DESCRIPTION" | sed 's/"/\\"/g')"'\n\n## Plan\ndocs/plans/YYYY-MM-DD-<slug>.md\n\n## Branch\nfeature/<slug>"
  }'
```

### 6. Commit the Plan

```bash
cd {{project_path}}
git checkout -b feature/<card-slug>
git add docs/plans/YYYY-MM-DD-<card-slug>.md
git commit -m "docs: add implementation plan for <card-title>"
```

## Plan Quality Checklist

Before moving to implementation, verify:

- [ ] Every file that will be created or modified is listed
- [ ] Every step has a concrete action (not vague)
- [ ] Testing strategy covers the feature
- [ ] Done criteria match the card's acceptance criteria
- [ ] Plan follows the target repo's conventions (from CLAUDE.md)
- [ ] No over-engineering — plan only what the card requires
