# Dashboard Phase 4: OpenClaw Log and Visual Playground — TDD Plan

**Card ID:** 69cd5c4ad4c6f73d0fe438c3  
**Date:** 2026-04-02  
**Branch:** feature/dashboard-phase-4-openclaw-log-playground

## Goal
Ship the real OpenClaw log viewer and Visual Playground described in the dashboard spec, with test coverage written before implementation and resumable state journaling throughout the card.

## Spec Inputs
- `docs/superpowers/specs/2026-04-01-president-dashboard-design.md`
- Kanban card `69cd5c4ad4c6f73d0fe438c3`

## Deliverables
1. `GET /api/openclaw/log` returns chronological log entries from `.openclaw-log/messages.jsonl`
2. `GET /api/openclaw/log/stream` emits initial state + incremental SSE updates
3. `GET /api/playground` and `POST /api/playground` manage the current playground HTML payload
4. `GET /api/playground/events` and `POST /api/playground/events` expose captured `[data-choice]` interactions and clear them on new pushes
5. Dashboard UI shows a dedicated OpenClaw log view and a functional Visual Playground in the right panel
6. Brainstorming/companion-compatible selection mechanics are injected into playground HTML

## Test-First Strategy
Because `apps/dashboard` did not have an existing test runner, phase 4 will add a lightweight Vitest setup and then write failing tests first.

### Baseline
- Confirm there is no existing `npm test` script for `apps/dashboard`
- Run `npm run build` to establish the pre-change baseline for the current app shell

### Failing tests to write first
1. **Server endpoint tests**
   - `GET /api/openclaw/log` reads JSONL entries and normalizes malformed rows away
   - `GET /api/playground` returns the latest HTML payload metadata
   - `POST /api/playground` stores HTML and clears prior events
   - `POST /api/playground/events` appends a captured event
2. **UI/helper tests**
   - OpenClaw log helper keeps entries ordered chronologically
   - Playground markup injector adds selection/toggle behavior and placeholder content

## Implementation Steps

### 1. Add test harness and write failing tests
- Add Vitest config and `npm test` script for `apps/dashboard`
- Add endpoint tests around extracted dashboard server app creation/helpers
- Add helper tests for log ordering and playground markup generation
- Run targeted tests and confirm they fail before implementation

### 2. Refactor server for testability and finish playground/log APIs
- Extract app creation/helpers from `server/index.ts` so endpoints can be tested without booting Vite
- Implement/finish OpenClaw log reader, SSE stream wiring, playground payload storage, and event clearing behavior
- Re-run tests until server cases pass

### 3. Finish the UI wiring
- Add missing log/playground API client and type definitions
- Keep `ChatView` staff-chat focused while preserving the dropdown affordance
- Finish `OpenClawLogView`, `VisualPlayground`, and `RightPanel` integration
- Re-run tests and build

### 4. Verification and demo
- Run full `npm test`
- Run `npm run build`
- Smoke-check the dashboard manually
- Record a short Playwright video demo into `artifacts/demos/`

## Files Expected To Change
- `apps/dashboard/package.json`
- `apps/dashboard/package-lock.json`
- `apps/dashboard/vitest.config.ts` (new)
- `apps/dashboard/server/index.ts`
- `apps/dashboard/server/*.test.ts` or `apps/dashboard/tests/*.test.ts` (new)
- `apps/dashboard/src/components/ChatView.tsx`
- `apps/dashboard/src/components/OpenClawLogView.tsx`
- `apps/dashboard/src/components/VisualPlayground.tsx`
- `apps/dashboard/src/components/RightPanel.tsx`
- `apps/dashboard/src/lib/api.ts`
- `apps/dashboard/src/lib/types.ts`
- helper/test files as needed

## Done Criteria
- Phase 4 spec behavior works end to end
- Failing tests were written before implementation and now pass
- `npm test` passes
- `npm run build` passes
- Demo recording exists and is ready for review
