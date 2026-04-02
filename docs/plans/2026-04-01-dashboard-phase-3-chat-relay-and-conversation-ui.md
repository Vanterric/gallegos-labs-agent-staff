# Dashboard Phase 3: Chat relay and conversation UI

## Scope
Implement the President Dashboard Chat view with a filesystem-backed relay and WebSocket updates.

## Plan
1. Add backend relay support in `apps/dashboard/server/index.ts`:
   - create `.chat-relay/` and default `inbox.jsonl` / `outbox.jsonl`
   - expose `GET /api/chat/history`
   - stand up a WebSocket server at `/ws/chat`
   - on president messages, append JSONL entries to inbox and broadcast to connected clients
   - watch outbox changes and broadcast terminal/staff responses in real time
2. Add chat client types + API helpers for history and websocket payloads.
3. Replace stub `ChatView` with:
   - Staff Chat / OpenClaw Log dropdown
   - message list with left/right bubble alignment per spec
   - composer hidden in OpenClaw Log mode
   - real-time websocket send/receive flow
4. Keep OpenClaw Log nav view read-only by rendering the shared chat UI in log mode.
5. Run `npm run build` in `apps/dashboard` and smoke-check core endpoints where possible.
