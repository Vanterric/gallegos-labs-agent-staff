# Plan — Dashboard: Highlight text in MD Viewer to save as insight

## Goal
Add a focused MD Viewer workflow that lets the President highlight selected markdown text, annotate it, and save it as a finding record in `gallegos-labs-research/findings/raw/` via a new dashboard API endpoint.

## Scope
- Add text-selection detection in the markdown viewer.
- Show a floating “Save as Insight” affordance when text is selected.
- Open an inline form prefilled with the selected text and source document context.
- Load product options from `gallegos-labs-research/config/products.yaml`.
- Submit to a new `POST /api/insights/create` endpoint.
- Server writes a finding markdown file following the research schema, commits it in the research repo, and pushes it.

## Implementation steps
1. Inspect current dashboard markdown viewer and existing server/API patterns.
2. Add shared types + client API for insight creation and product options.
3. Extend the dashboard server with:
   - product config loading
   - finding ID / filename generation
   - markdown file rendering from the selected text + comment + source metadata
   - git add/commit/push in `../gallegos-labs-research`
   - `POST /api/insights/create`
4. Update `MarkdownViewer` to:
   - capture text selection inside the rendered article
   - position a floating toolbar near the selection
   - render a compact save form with product/category/comment/source details
   - handle save/loading/success/error states and clear selection after success
5. Run the relevant dashboard build / typecheck-equivalent checks and do a manual validation pass.
6. If there is no established functional test harness in this app, document that explicitly instead of inventing one.

## Risks / notes
- The repo currently has unrelated working tree changes; only card-specific files should be edited and committed.
- Product config is YAML, so the server will use a minimal parser for the current flat shape instead of adding a new dependency.
- Push can fail at runtime if git auth or network is unavailable; the endpoint should surface that clearly.
