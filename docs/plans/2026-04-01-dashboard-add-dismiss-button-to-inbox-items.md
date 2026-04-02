# Dashboard: Add dismiss button to inbox items — Implementation Plan

**Card ID:** 69cdade83f4440dae6881ead
**Date:** 2026-04-01
**Branch:** feature/dashboard-add-dismiss-button

## Goal
Add a dismiss action to the dashboard’s MD Viewer so the President can clear handled inbox items and keep them from reappearing.

## Approach
Implement dismissal end to end in the dashboard app by extending the pending item model with a stable dismissal key, persisting dismissed software/research items locally in the dashboard workspace, and moving outreach drafts into a dedicated `dismissed` directory. The UI will expose the action in the MD Viewer next to existing research-plan approval controls and refresh selection state after a successful dismiss.

## File Changes

### New Files
- `docs/plans/2026-04-01-dashboard-add-dismiss-button-to-inbox-items.md` — implementation plan for this card

### Modified Files
- `apps/dashboard/server/index.ts` — add dismissal storage, filtering, outreach file move, and `POST /api/dismiss/:itemId`
- `apps/dashboard/src/lib/types.ts` — extend item and response types for dismiss support
- `apps/dashboard/src/lib/api.ts` — add dismiss API client
- `apps/dashboard/src/hooks/usePending.ts` — expose local item removal helper after dismiss
- `apps/dashboard/src/App.tsx` — keep selection stable and remove dismissed items from local state immediately
- `apps/dashboard/src/components/RightPanel.tsx` — pass dismiss handler through to the MD Viewer
- `apps/dashboard/src/components/MarkdownViewer.tsx` — render Dismiss button and success/error states for all inbox item types

### Test Files
- No dedicated automated test harness exists yet in this app; verification will use `npm run build`, API checks, and browser-based functional validation against the running dashboard.

## Steps

### 1. Add backend dismissal support
- [ ] Persist dismissed non-file inbox items under `apps/dashboard/.inbox-state/`
- [ ] Filter dismissed software-review and research-plan items out of `/api/pending`
- [ ] Implement `POST /api/dismiss/:itemId` to move outreach drafts into `outreach/dismissed/` and record other dismissals
- [ ] Commit: `feat: add dashboard inbox dismiss endpoint`

### 2. Wire the dismiss action into the dashboard UI
- [ ] Add dismiss client helper and any supporting types
- [ ] Update `MarkdownViewer` to show a Dismiss button with loading/success/error states
- [ ] Update app state so dismissed items disappear immediately and selection advances cleanly
- [ ] Commit: `feat: add dismiss action to markdown viewer`

### 3. Validate the full flow
- [ ] Run `npm run build` in `apps/dashboard`
- [ ] Start the dashboard and verify dismissing an outreach draft moves the file into `outreach/dismissed/`
- [ ] Verify dismissing a software review removes it from inbox and it does not return on refresh
- [ ] Capture browser evidence/screenshots for the happy path
- [ ] Commit: `test: verify dashboard dismiss flow`

## Testing Strategy
- **Unit tests:** None currently configured in this app
- **Functional tests (browser/manual):** Load inbox, open MD Viewer, dismiss an outreach draft, dismiss a software review, refresh, verify both stay gone
- **Visual tests (browser/manual):** Capture the MD Viewer action area before and after dismissal

## Done Criteria
- [ ] Dismiss button visible in MD Viewer for all item types
- [ ] Clicking dismiss removes the item from inbox
- [ ] Outreach drafts are moved to a dismissed directory
- [ ] Dismissed items do not reappear on refresh
- [ ] Build passes
- [ ] Card description updated with plan/results
