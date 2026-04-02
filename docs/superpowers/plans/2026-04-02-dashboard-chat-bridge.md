# Dashboard Chat Bridge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the dashboard chat UI to the active Claude Code staff session so president messages trigger instant notification and staff replies appear in the dashboard in real time.

**Architecture:** Two new REST endpoints on the dashboard Express server — a long-poll `GET /api/chat/wait` that blocks until a president message arrives, and a `POST /api/chat/reply` that appends staff messages to `outbox.jsonl`. The staff skill starts a background bash long-poll loop at startup and restarts it after each received message.

**Tech Stack:** Express (existing dashboard server), curl (bash watcher), existing JSONL + file-watcher infrastructure.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `apps/dashboard/server/index.ts` | Modify (lines ~554-564, ~695+) | Add `GET /api/chat/wait` and `POST /api/chat/reply` endpoints |
| `skills/staff/staff.md` | Modify (Step 3 area, ~line 46) | Add dashboard chat bridge startup step |

---

### Task 1: Add `POST /api/chat/reply` endpoint

**Files:**
- Modify: `apps/dashboard/server/index.ts` (insert after the `/api/chat/history` route, ~line 564)

- [ ] **Step 1: Add the reply endpoint**

Insert after the `app.get("/api/chat/history", ...)` route block (after line 564):

```typescript
  app.post("/api/chat/reply", async (req, res) => {
    const body = (req.body ?? {}) as { content?: string; channel?: string };
    const content = typeof body.content === "string" ? body.content.trim() : "";
    if (!content) {
      return res.status(400).json({ error: "Missing message content" });
    }

    const channel = body.channel === "openclaw" ? "openclaw" : "staff";
    const message = createChatMessage("staff", channel as ChatChannel, content);
    await appendJsonLine(CHAT_OUTBOX_FILE, message);
    return res.json({ ok: true, message });
  });
```

- [ ] **Step 2: Verify the endpoint works**

Run (with dashboard already running — restart if needed):
```bash
curl -s -X POST http://localhost:5174/api/chat/reply \
  -H "Content-Type: application/json" \
  -d '{"content":"Test reply from staff","channel":"staff"}'
```

Expected: `200` with `{"ok":true,"message":{"type":"message","from":"staff","channel":"staff","content":"Test reply from staff","timestamp":"..."}}`

Verify it appeared in the dashboard chat UI (should show up via WebSocket broadcast from the outbox file watcher).

- [ ] **Step 3: Commit**

```bash
git add apps/dashboard/server/index.ts
git commit -m "feat: add POST /api/chat/reply endpoint for staff messages"
```

---

### Task 2: Add `GET /api/chat/wait` long-poll endpoint

**Files:**
- Modify: `apps/dashboard/server/index.ts` (insert after the `/api/chat/reply` route)

- [ ] **Step 1: Add the long-poll endpoint**

Insert after the `/api/chat/reply` route:

```typescript
  app.get("/api/chat/wait", async (req, res) => {
    const since = typeof req.query.since === "string" ? req.query.since : "";
    if (!since) {
      return res.status(400).json({ error: "Missing 'since' query parameter (ISO timestamp)" });
    }

    const timeoutSec = Math.min(Math.max(Number(req.query.timeout) || 60, 5), 120);
    const deadline = Date.now() + timeoutSec * 1000;

    const getNewMessages = async (): Promise<ChatMessage[]> => {
      const messages = await readJsonLines<ChatMessage>(CHAT_INBOX_FILE);
      return messages.filter((m) => m.from === "president" && m.timestamp > since);
    };

    // Check immediately
    const immediate = await getNewMessages();
    if (immediate.length > 0) {
      return res.json({ messages: immediate });
    }

    // Poll until deadline
    const interval = setInterval(async () => {
      try {
        const msgs = await getNewMessages();
        if (msgs.length > 0) {
          clearInterval(interval);
          if (!res.headersSent) {
            return res.json({ messages: msgs });
          }
        }
        if (Date.now() >= deadline) {
          clearInterval(interval);
          if (!res.headersSent) {
            return res.status(204).end();
          }
        }
      } catch {
        clearInterval(interval);
        if (!res.headersSent) {
          return res.status(500).json({ error: "Internal error while waiting" });
        }
      }
    }, 1500);

    // Clean up on client disconnect
    res.on("close", () => {
      clearInterval(interval);
    });
  });
```

- [ ] **Step 2: Verify immediate return when messages exist**

```bash
curl -s "http://localhost:5174/api/chat/wait?since=2000-01-01T00:00:00.000Z&timeout=5"
```

Expected: `200` with `{"messages":[...]}` containing all president messages in inbox.jsonl (since the `since` is far in the past).

- [ ] **Step 3: Verify timeout returns 204**

```bash
curl -s -o /dev/null -w "%{http_code}" "http://localhost:5174/api/chat/wait?since=2099-01-01T00:00:00.000Z&timeout=3"
```

Expected: `204` after ~3 seconds (no messages exist in the future).

- [ ] **Step 4: Verify live message detection**

In one terminal, start a long-poll:
```bash
curl -s "http://localhost:5174/api/chat/wait?since=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)&timeout=30"
```

In a second terminal (or from the dashboard chat UI), send a message. The first curl should return immediately with the new message.

- [ ] **Step 5: Commit**

```bash
git add apps/dashboard/server/index.ts
git commit -m "feat: add GET /api/chat/wait long-poll endpoint"
```

---

### Task 3: Restart the dashboard server

**Files:** None (operational step)

- [ ] **Step 1: Stop and restart the dashboard**

The running dashboard process needs to be restarted to pick up the new endpoints:

```bash
# Kill the existing dashboard process
pkill -f "tsx server/index.ts" 2>/dev/null || true
sleep 2

# Restart
cd apps/dashboard && npm run dev
```

Use `run_in_background: true` for the restart.

- [ ] **Step 2: Verify health**

```bash
sleep 4 && curl -s http://localhost:5174/api/health
```

Expected: `{"status":"ok"}`

---

### Task 4: Add dashboard chat bridge to staff skill

**Files:**
- Modify: `skills/staff/staff.md` (add a new Step 3d after the existing Step 3c)

- [ ] **Step 1: Add the dashboard chat bridge step**

In `skills/staff/staff.md`, find the section `#### 3c. Nimbus Hub` (around line 75). After the entire 3c block (after line 80), insert:

```markdown
#### 3d. Dashboard Chat Bridge (http://localhost:5174)
Check if the President Dashboard is running:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5174/api/health 2>/dev/null || echo "UNREACHABLE"
```

If the dashboard is up:

1. Send a connection greeting:
```bash
curl -s -X POST http://localhost:5174/api/chat/reply \
  -H "Content-Type: application/json" \
  -d '{"content":"Staff session connected. Standing by.","channel":"staff"}'
```

2. Start the chat watcher as a background task. This long-polls for president messages and exits when one arrives:
```bash
SINCE="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)"
while true; do
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:5174/api/chat/wait?since=$SINCE&timeout=60")
  HTTP_STATUS=$(echo "$RESPONSE" | tail -1 | sed 's/HTTP_STATUS://')
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "$RESPONSE" | sed '$d'
    exit 0
  fi
done
```
Use the Bash tool with `run_in_background: true`.

If the dashboard is not reachable, note it in the briefing but do not block startup.
```

- [ ] **Step 2: Add chat watcher lifecycle to CoS Mode section**

In `skills/staff/staff.md`, find the `### Managing Active Agents` section (around line 118). After that section, insert:

```markdown
### Dashboard Chat Bridge
When the dashboard chat watcher background task completes (you receive a task notification):
1. Parse the JSON response — it contains `{ messages: ChatMessage[] }` from the President
2. Surface the message content in the conversation naturally
3. Respond to the President's message
4. Send your response back to the dashboard:
```bash
curl -s -X POST http://localhost:5174/api/chat/reply \
  -H "Content-Type: application/json" \
  -d '{"content":"{{your_response}}","channel":"staff"}'
```
5. Restart the watcher with an updated `since` timestamp (use the latest message's timestamp):
```bash
SINCE="{{latest_message_timestamp}}"
while true; do
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:5174/api/chat/wait?since=$SINCE&timeout=60")
  HTTP_STATUS=$(echo "$RESPONSE" | tail -1 | sed 's/HTTP_STATUS://')
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "$RESPONSE" | sed '$d'
    exit 0
  fi
done
```
Use the Bash tool with `run_in_background: true`.
```

- [ ] **Step 3: Commit**

```bash
git add skills/staff/staff.md
git commit -m "feat: add dashboard chat bridge to staff skill startup and lifecycle"
```

---

### Task 5: End-to-end verification

**Files:** None (testing step)

- [ ] **Step 1: Send greeting to dashboard**

```bash
curl -s -X POST http://localhost:5174/api/chat/reply \
  -H "Content-Type: application/json" \
  -d '{"content":"Staff session connected. Standing by.","channel":"staff"}'
```

Verify the greeting appears in the dashboard chat UI at `http://localhost:5174` (click the Chat icon in sidebar).

- [ ] **Step 2: Start the long-poll watcher**

```bash
SINCE="$(date -u +%Y-%m-%dT%H:%M:%S.000Z)" && while true; do RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "http://localhost:5174/api/chat/wait?since=$SINCE&timeout=60"); HTTP_STATUS=$(echo "$RESPONSE" | tail -1 | sed 's/HTTP_STATUS://'); if [ "$HTTP_STATUS" = "200" ]; then echo "$RESPONSE" | sed '$d'; exit 0; fi; done
```

Use `run_in_background: true`.

- [ ] **Step 3: Send a message from the dashboard**

Open the dashboard at `http://localhost:5174`, go to Chat, type a message, and send it. The background task from Step 2 should complete immediately with the message content.

- [ ] **Step 4: Reply from staff**

After receiving the notification, send a reply:

```bash
curl -s -X POST http://localhost:5174/api/chat/reply \
  -H "Content-Type: application/json" \
  -d '{"content":"Got your message! The bridge is working.","channel":"staff"}'
```

Verify it appears in the dashboard chat UI as a staff message.

- [ ] **Step 5: Commit (if any fixes were needed)**

```bash
git add -A && git commit -m "fix: chat bridge adjustments from e2e testing"
```

Only commit if changes were made during testing.
