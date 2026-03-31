# Message Queue — OpenClaw

This skill teaches you how to read and write the message queue file that bridges communication between you and the Chief of Staff when the Staff is offline.

## Queue Location

```
~/openclaw-staff/queue.md
```

Create the directory if it doesn't exist:

```bash
mkdir -p ~/openclaw-staff
```

## When to Write to the Queue

Write to the queue when you need to notify the Chief of Staff:

| Event | Message Type |
|-------|-------------|
| Card completed and moved to Review | `review:ready` |
| Card blocked — can't resolve | `blocked` |
| Periodic health update (every hour) | `status:report` |
| Infrastructure failure | `error` |
| Card is ambiguous, need clarification | `question` |

## How to Write

**Always try the Staff first.** Before writing to the queue, attempt to send the message via the Gateway API. If the Staff is running, it will receive the message directly and no queue write is needed.

If the Staff is offline (connection refused, timeout), append to the queue file.

### Message Format

Follow the schema defined in `queue-schema.md` at the repo root. Every message uses this format:

```markdown
## [ISO-8601-timestamp] message_type
- **Card:** Card title (or "N/A")
- **Card ID:** kanban card ID (or "N/A")
- **Board:** Autonomous Engine
- **Branch:** branch name (or "N/A")
- **Plan:** plan file path (or "N/A")
- **Tests:** X passed, Y failed (or "N/A")
- **Demo:** demo file path (or "N/A")
- **Summary:** One paragraph describing what happened
---
```

### Appending a Message

```bash
cat >> ~/openclaw-staff/queue.md << 'QUEUE_MSG'
## [2026-03-31T14:32:00Z] review:ready
- **Card:** Example Card Title
- **Card ID:** 69cbb6a99fb7aec7124519d9
- **Board:** Autonomous Engine
- **Branch:** feature/example
- **Plan:** docs/plans/2026-03-31-example.md
- **Tests:** 8 passed, 0 failed
- **Demo:** artifacts/demos/2026-03-31-example.mp4
- **Summary:** Implemented the example feature. All tests passing, demo recorded.
---
QUEUE_MSG
```

**Important:** Use the current UTC timestamp, not local time. Generate with:

```bash
date -u +"%Y-%m-%dT%H:%M:%SZ"
```

## How to Read

When the Staff sends `[STAFF:queue:read]`:

```bash
cat ~/openclaw-staff/queue.md 2>/dev/null || echo "(empty)"
```

Return the contents exactly as-is.

## How to Clear

When the Staff sends `[STAFF:queue:clear]`:

```bash
> ~/openclaw-staff/queue.md
```

This truncates the file to empty. Only clear when the Staff explicitly asks — never auto-clear.

## Queue Discipline

- **Append only** — Never edit or delete individual messages
- **Never auto-clear** — Only clear on Staff instruction
- **One message per event** — Don't batch multiple events into one message
- **Timestamp everything** — Every message gets a UTC timestamp
- **Be concise** — The Summary field should be one paragraph, not a novel
