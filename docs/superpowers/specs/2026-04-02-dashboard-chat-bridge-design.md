# Dashboard Chat Bridge — Design Spec

**Date:** 2026-04-02
**Status:** Approved

## Goal

Connect the President Dashboard's chat UI to the active Claude Code staff session so messages flow both directions in real time. When the President sends a message from the dashboard, the staff session is notified immediately. When staff responds, the reply appears in the dashboard instantly.

## Architecture

The dashboard server is the single source of truth. It already manages `inbox.jsonl` (president messages) and `outbox.jsonl` (staff/system messages) with WebSocket broadcast to the dashboard UI. This design adds two new REST endpoints for the staff session to consume, plus a long-poll watcher pattern that delivers instant notifications without polling overhead.

### Data Flow

```
President (Dashboard UI)
  → WebSocket → Dashboard Server → inbox.jsonl
  → GET /api/chat/wait (long-poll, blocks until message arrives)
  → Staff session receives task notification
  → Staff processes and responds
  → POST /api/chat/reply → outbox.jsonl
  → File watcher → WebSocket broadcast → Dashboard UI
```

## Server-Side Changes

### New Endpoint: `GET /api/chat/wait`

Long-poll endpoint that blocks until a new president message arrives or timeout is reached.

**Query Parameters:**
- `since` (required) — ISO 8601 timestamp. Only messages with `timestamp > since` are returned.
- `timeout` (optional, default `60`) — Maximum seconds to hold the connection open. Capped at 120.

**Behavior:**
- On request, check `inbox.jsonl` for messages from `president` with timestamp after `since`
- If matching messages exist: return immediately with `200` and `{ messages: ChatMessage[] }`
- If no matches: hold the connection, re-check every 1-2 seconds
- On timeout with no messages: return `204 No Content`
- Filter to `from: "president"` only — staff messages in inbox are ignored

**Response (200):**
```json
{
  "messages": [
    {
      "type": "message",
      "channel": "staff",
      "from": "president",
      "content": "Can you check the build?",
      "timestamp": "2026-04-02T13:35:52.574Z"
    }
  ]
}
```

### New Endpoint: `POST /api/chat/reply`

Staff sends a message that appears in the dashboard chat.

**Request Body:**
```json
{
  "content": "Build is passing. Ship it?",
  "channel": "staff"
}
```

- `content` (required) — The message text.
- `channel` (optional, default `"staff"`) — Which chat channel to post to.

**Behavior:**
- Creates a `ChatMessage` with `from: "staff"`, `channel`, `content`, and current `timestamp`
- Appends to `outbox.jsonl`
- The existing file watcher broadcasts it to connected WebSocket clients automatically

**Response (200):**
```json
{
  "ok": true,
  "message": {
    "type": "message",
    "channel": "staff",
    "from": "staff",
    "content": "Build is passing. Ship it?",
    "timestamp": "2026-04-02T14:01:23.000Z"
  }
}
```

## Staff Session Integration

### Watcher Script

A background bash command started during `/staff` startup. Uses a self-restarting loop that long-polls the wait endpoint:

```bash
SINCE="<current ISO timestamp>"
while true; do
  RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    "http://localhost:5174/api/chat/wait?since=$SINCE&timeout=60")
  HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE:" | cut -d: -f2)
  BODY=$(echo "$RESPONSE" | grep -v "HTTP_CODE:")
  if [ "$HTTP_CODE" = "200" ]; then
    echo "$BODY"
    exit 0
  fi
  # 204 timeout — loop and retry
done
```

- Loops silently on `204` timeouts (keep-alive)
- Exits with message payload on `200` (triggers Claude Code task notification)
- Staff session processes the message, replies via `POST /api/chat/reply`, restarts the watcher

### Staff Skill Changes

**Startup (in `/staff` skill, after dashboard health check):**
1. Check `GET /api/health` on `localhost:5174`
2. If dashboard is up: send a greeting via `POST /api/chat/reply` with a brief message like "Staff session connected."
3. Start the watcher script as a background bash task
4. Track the `since` timestamp (initialized to current time at startup)

**On watcher notification (task completes):**
1. Parse the returned messages
2. Surface the President's message in the conversation
3. Respond naturally in the session
4. Post the response via `POST /api/chat/reply`
5. Update `since` to the latest message timestamp
6. Restart the watcher with the new `since`

### Startup Greeting

When the staff session connects to the dashboard, it sends:
```json
{
  "content": "Staff session connected. Standing by.",
  "channel": "staff"
}
```
This appears in the President's chat view, confirming the bridge is live.

## What This Does Not Include

- **Authentication** — Local-only dashboard, same trust model as all existing endpoints
- **Offline queue** — If the staff session isn't running, messages sit in `inbox.jsonl` until the next session reads them
- **Multi-session support** — One staff session at a time; multiple sessions would compete for the same long-poll
- **Message persistence beyond JSONL** — No database; files are the store
- **Read receipts** — No "seen" indicators in the dashboard UI

## Files Changed

### Modified
- `apps/dashboard/server/index.ts` — Add `GET /api/chat/wait` and `POST /api/chat/reply` endpoints
- `skills/staff/staff.md` — Add dashboard connection step to startup, document watcher lifecycle
- `skills/staff/briefing.md` — Add dashboard chat status to briefing output

### No New Files
All changes fit in existing files. The watcher script is inline bash, not a separate file.
