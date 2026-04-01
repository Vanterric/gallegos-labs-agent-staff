# [BLOCKED] Dashboard Phase 2: Inbox view and MD Viewer — Implementation Plan

**Card ID:** 69cd5c48d4c6f73d0fe438b7
**Date:** 2026-04-01
**Branch:** feature/dashboard-phase-2-inbox-md-viewer

## Goal
Finish the President Dashboard inbox and markdown viewer flow so pending items load from the research repo and kanban boards, render in the inbox with type-specific styling, and display their markdown content in the right panel with research-plan approval support.

## Approach
The repo already contains most of the Phase 2 scaffold, so this pass will verify the data flow end to end, close any obvious gaps against the approved spec, and document the implementation with bounded code changes only where needed. Focus stays on `/api/pending`, markdown loading/rendering, research-plan approval, and inbox presentation.

## File Changes

### New Files
- `docs/plans/2026-04-01-dashboard-phase-2-inbox-view-and-md-viewer.md` — implementation plan for this card

### Modified Files
- `apps/dashboard/src/components/InboxView.tsx` — tighten inbox presentation to better match spec
- `apps/dashboard/src/components/MarkdownViewer.tsx` — improve approval UX and markdown viewer states
- `apps/dashboard/src/lib/types.ts` — extend types if needed for inbox/viewer rendering
- `apps/dashboard/server/index.ts` — adjust pending/content endpoints only if verification exposes gaps

### Test Files
- No dedicated automated test files planned; verification will use the existing dashboard app, browser-based functional checks, and captured visual baselines per the pipeline instructions.

## Steps

### 1. Verify existing implementation against the card
- [ ] Read current dashboard server and UI files for inbox, pending API, markdown viewer, and approval flow
- [ ] Identify any gaps versus the approved Phase 2 spec
- [ ] Commit: "docs: add phase 2 dashboard implementation plan"

### 2. Close bounded UI/API gaps
- [ ] Update inbox presentation or data shaping where verification shows a mismatch
- [ ] Update markdown viewer behavior if approval or content rendering needs polish
- [ ] Commit: "feat: finish dashboard inbox and markdown viewer"

### 3. Validate the feature end to end
- [ ] Start the dashboard locally and verify `/api/pending`
- [ ] Use the browser to confirm inbox items render with correct type styling
- [ ] Click an item and verify markdown appears in the MD Viewer
- [ ] Verify research-plan approval POST works from the UI or API
- [ ] Capture visual baseline screenshots for the inbox and viewer states
- [ ] Commit: "test: capture dashboard phase 2 verification artifacts"

## Testing Strategy
- **Unit tests:** None currently configured in this app
- **Functional tests (Playwright):** Verify inbox loads pending items, item selection renders markdown, and research plan approval endpoint succeeds
- **Visual tests (Playwright):** Capture the inbox list and markdown viewer state at a consistent viewport

## Done Criteria
- [ ] All steps completed
- [ ] All tests passing / manual verification completed
- [ ] Demo video recorded or explicitly noted as not supported by available tooling
- [ ] Card description updated with results
