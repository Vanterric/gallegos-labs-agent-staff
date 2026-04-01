# Gallegos Labs President Dashboard — Design Spec

**Date:** 2026-04-01
**Status:** Approved
**Author:** Chief of Staff + President Gallegos

## Overview

A local web dashboard that serves as the President's command center for Gallegos Labs. It surfaces pending work items (outreach drafts, research plans, software reviews), provides a chat interface to the Chief of Staff, shows a read-only log of Staff-to-OpenClaw communications, and includes a tabbed right panel with a markdown viewer and visual playground. The `/staff` skill starts it automatically on session init.

## Stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Express (bundled, same process as Vite dev server)
- **Styling:** Nimbus design language — Tailwind CSS with custom theme
- **Location:** `apps/dashboard/` in the `gallegos-labs-agent-staff` repo

## Design Language

Matches Nimbus exactly:

| Token | Value |
|-------|-------|
| Background | `#0a0e1a` |
| Background Secondary | `#111827` |
| Background Tertiary | `#1e293b` |
| Surface Elevated | `#080c16` |
| Text Primary | `#f1f5f9` |
| Text Muted | `#94a3b8` |
| Text Subtle | `#64748b` |
| Accent Primary | `#3b82f6` |
| Accent Cyan | `#06b6d4` |
| Border Primary | `#1e293b` |
| Border Accent | `rgba(59, 130, 246, 0.3)` |
| Success / Software | `#10b981` |
| Warning / Outreach | `#f59e0b` |
| Error | `#ef4444` |
| Research / Violet | `#8b5cf6` |
| Font | Geist (sans), Geist Mono (mono) |
| Border Radius Cards | `12px` |
| Border Radius Buttons | `8px` |
| Border Radius Inputs | `8px` |

## Layout

Icon sidebar (56px) + main content area + tabbed right panel.

```
┌──────┬─────────────────────┬──────────────────────┐
│      │                     │  [MD Viewer] [Visual] │
│  G   │                     │                       │
│      │                     │                       │
│  📥  │   Main Content      │   Right Panel         │
│  🔬  │   (changes per      │   (MD Viewer or       │
│  ⚙️  │    sidebar view)    │    Visual Playground)  │
│  💬  │                     │                       │
│  🔍  │                     │                       │
│      │                     │                       │
└──────┴─────────────────────┴──────────────────────┘
```

### Sidebar Icons

| Icon | View | Badge |
|------|------|-------|
| G (logo) | — | — |
| 📥 Inbox | Pending items list | Count of pending items |
| 🔬 Research | Research Pipeline board summary | Count of items needing review |
| ⚙️ Software | Engine board summary | Count of items in Review |
| 💬 Chat | Chat with Chief of Staff | Unread message indicator |
| 🔍 OpenClaw | Read-only OpenClaw communication log | — |

Active icon gets highlighted background (`#1e293b`) with accent border (`rgba(59, 130, 246, 0.3)`).

## Views

### Inbox View

Main area shows a list of all pending items that need the President's attention, pulled from both kanban boards.

**Item types and colors:**
- **Outreach Draft** — Amber (`#f59e0b`) border accent. Source: `outreach/drafts/` in research repo.
- **Research Plan** — Violet (`#8b5cf6`) border accent. Source: cards in "Plan Review" column on Research board.
- **Software Review** — Emerald (`#10b981`) border accent. Source: cards in "Review" column on Engine board.

Each item shows:
- Type badge (colored dot + uppercase label)
- Title
- Source context (subreddit, board name, etc.)
- Time since creation

Clicking an item loads its content in the MD Viewer tab on the right panel.

### Research View

Summary of the Research Pipeline:
- Board state (card counts per column)
- Recent findings count (last 24h, last 7d)
- Outreach drafts pending
- Active campaigns and their stage
- Latest insights (new or recently strengthened)

### Software View

Summary of the Autonomous Engine:
- Board state (card counts per column)
- OpenClaw current task
- Cards in Review awaiting approval
- Recent completions

### Chat View

Conversation interface with the Chief of Staff.

**Header:** "Chat" label + dropdown to switch between:
- "Staff Chat" — Read/write conversation with Chief of Staff
- "OpenClaw Log" — Read-only view of all Staff-to-OpenClaw messages

**Messages area:** Scrollable message history.
- Staff messages: Blue gradient avatar (🤖), left-aligned, dark card background
- President messages: Violet avatar (D), right-aligned, blue-tinted background
- OpenClaw messages (in log view): Cyan avatar, left-aligned

**Input area (Staff Chat only):**
- Text input with "Type a message..." placeholder
- Send button (accent blue)
- Input hidden when viewing OpenClaw Log (read-only)

**Chat relay mechanism:**
- Frontend sends messages via WebSocket to the Express backend
- Backend writes the message to a relay file that the Claude Code terminal session watches
- Terminal session responds, backend picks up the response and pushes via WebSocket
- Relay file location: `apps/dashboard/.chat-relay/`

### OpenClaw Log View

Same as selecting "OpenClaw Log" from the Chat dropdown. Read-only chronological log of all messages between Staff and OpenClaw.

**Data source:** `apps/dashboard/.openclaw-log/messages.jsonl` — the bridge skill appends each message exchange as a JSON line.

**Log entry format:**
```json
{
  "timestamp": "2026-04-01T12:00:00Z",
  "direction": "staff-to-openclaw",
  "message": "[STAFF:status:request]...",
  "response": "Current status: idle..."
}
```

## Right Panel (Tabbed)

Persistent right panel with two tabs:

### Tab 1: MD Viewer

Renders markdown content. Used for:
- Viewing outreach drafts when clicked from Inbox
- Viewing research plans when clicked from Inbox
- Viewing specs and plans when Staff pushes content
- Viewing software review details

**Features:**
- Full markdown rendering (headings, lists, code blocks, blockquotes, tables)
- YAML frontmatter displayed as metadata badges at the top
- Action buttons at the bottom (contextual):
  - "Approve Research Plan" button (when viewing a research plan card)
  - Future: "Send Outreach" button, "Merge" button

**Markdown rendering:** Use `react-markdown` with `remark-gfm` for GitHub-flavored markdown support.

### Tab 2: Visual Playground

Interactive HTML playground for brainstorming mockups.

**How it works:**
- The brainstorming skill (or Staff) POSTs HTML content to `POST /api/playground`
- The playground renders the HTML in an isolated container
- User clicks/selections are captured and sent back via `GET /api/playground/events`
- Same selection mechanics as the standalone visual companion (toggleSelect, data-choice attributes)

**Features:**
- Renders arbitrary HTML content pushed by Staff
- Captures click events on `[data-choice]` elements
- Selection indicator bar (matches standalone companion UX)
- Clears when new content is pushed

**Integration with brainstorming skill:**
- On visual companion init, brainstorming skill checks `GET http://localhost:<port>/api/health`
- If dashboard responds, use `POST /api/playground` to push content and `GET /api/playground/events` to read selections
- If dashboard is down, fall back to standalone `start-server.sh`

## Backend API (Express)

All endpoints served from the bundled Express server.

### Health & Status

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Dashboard health check. Returns `{ status: "ok" }` |

### Pending Items

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/pending` | Fetch all pending items from both kanban boards. Returns outreach drafts (from research repo), research plans (Plan Review column), software reviews (Review column). |

**Response format:**
```json
{
  "items": [
    {
      "id": "card-id or file-id",
      "type": "outreach-draft | research-plan | software-review",
      "title": "...",
      "source": "reddit | research-pipeline | autonomous-engine",
      "context": "r/productivity | Nimbus",
      "createdAt": "2026-04-01T12:00:00Z",
      "content": "markdown content or null (fetched on click)",
      "cardId": "kanban card ID if applicable",
      "filePath": "repo file path if applicable"
    }
  ]
}
```

### Chat Relay

| Method | Path | Description |
|--------|------|-------------|
| WS | `/ws/chat` | WebSocket for real-time chat relay between dashboard and terminal |
| GET | `/api/chat/history` | Returns chat message history from relay file |

**WebSocket message format:**
```json
{
  "type": "message",
  "from": "president",
  "content": "What's OpenClaw doing?"
}
```

**Chat relay mechanism:**
1. Dashboard sends message via WebSocket
2. Express backend writes to `.chat-relay/inbox.jsonl`
3. Claude Code terminal session watches `inbox.jsonl` (via a hook or polling)
4. Terminal session processes the message and writes response to `.chat-relay/outbox.jsonl`
5. Express backend reads response and pushes via WebSocket to dashboard

### OpenClaw Log

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/openclaw/log` | Returns OpenClaw communication log entries |
| GET | `/api/openclaw/log/stream` | SSE stream for real-time log updates |

### Actions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/approve/research-plan/:cardId` | Approve a research plan — moves card from Plan Review to Recruiting. Requires kanban API token from env. |

### Visual Playground

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/playground` | Push HTML content to the Visual Playground tab |
| GET | `/api/playground/events` | Read user click/selection events. Cleared on new content push. |

**POST /api/playground body:**
```json
{
  "html": "<h2>Which layout?</h2><div class='options'>...",
  "filename": "layout-options.html"
}
```

**GET /api/playground/events response:**
```json
{
  "events": [
    {"type": "click", "choice": "a", "text": "Option A", "timestamp": 1706000101}
  ]
}
```

### Content Fetching

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/content/file?path=...` | Read a file from the research or agent-staff repo and return its content. Used by MD Viewer when loading outreach drafts, plans, etc. |

## Startup Integration

The `/staff` skill startup flow adds a new step:

### Check/Start Dashboard

```bash
# Check if dashboard is running
curl -s -o /dev/null -w "%{http_code}" http://localhost:{{dashboard_port}}/api/health

# If not running, start it
cd apps/dashboard && npm run dev
```

Use `run_in_background: true`. After startup, open in browser:

```bash
powershell -c "Start-Process 'http://localhost:{{dashboard_port}}'"
```

**Dashboard port:** Define in `staff-projects.yaml` under a new `dashboard` config section:

```yaml
dashboard:
  port: 5174
  dev_command: "npm run dev"
```

## Environment Variables

The dashboard backend needs access to:

```bash
KANBAN_API_URL=https://gallegos-kanban-api.onrender.com
KANBAN_BOT_TOKEN=<staff-bot token>
RESEARCH_REPO_PATH=../gallegos-labs-research
AGENT_STAFF_REPO_PATH=.
OPENCLAW_LOG_PATH=apps/dashboard/.openclaw-log/messages.jsonl
CHAT_RELAY_PATH=apps/dashboard/.chat-relay/
```

These can be read from the root `.env` file or set in the dashboard's own `.env`.

## File Structure

```
apps/dashboard/
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── .env.example
├── server/
│   ├── index.ts              # Express + Vite dev server bundled entry
│   ├── routes/
│   │   ├── pending.ts        # GET /api/pending
│   │   ├── chat.ts           # WebSocket + history
│   │   ├── openclaw-log.ts   # GET /api/openclaw/log
│   │   ├── approve.ts        # POST /api/approve/*
│   │   ├── playground.ts     # POST/GET /api/playground
│   │   └── content.ts        # GET /api/content/file
│   └── lib/
│       ├── kanban.ts         # Kanban API client
│       ├── relay.ts          # Chat relay file watcher
│       └── research-repo.ts  # Research repo file reader
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css             # Nimbus theme CSS variables
│   ├── components/
│   │   ├── Sidebar.tsx
│   │   ├── InboxView.tsx
│   │   ├── ResearchView.tsx
│   │   ├── SoftwareView.tsx
│   │   ├── ChatView.tsx
│   │   ├── OpenClawLogView.tsx
│   │   ├── MarkdownViewer.tsx
│   │   ├── VisualPlayground.tsx
│   │   ├── RightPanel.tsx    # Tabbed container
│   │   ├── PendingItem.tsx
│   │   └── ChatMessage.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── usePending.ts
│   │   └── usePlayground.ts
│   └── lib/
│       ├── api.ts            # API client
│       └── types.ts          # TypeScript types
├── .chat-relay/              # Chat relay files (gitignored)
│   ├── inbox.jsonl
│   └── outbox.jsonl
└── .openclaw-log/            # OpenClaw comm log (gitignored)
    └── messages.jsonl
```

## Brainstorming Skill Update

The brainstorming skill's visual companion initialization changes:

```
1. Check: GET http://localhost:5174/api/health
2. If 200:
   - Use dashboard playground
   - screen_dir equivalent: POST /api/playground with HTML body
   - state_dir equivalent: GET /api/playground/events
   - Tell user: "Showing mockups in your dashboard's Visual Playground tab"
3. If not 200:
   - Fall back to standalone start-server.sh
   - Current behavior, unchanged
```

The playground API matches the standalone companion's file-based interface — HTML in, click events out — so the brainstorming skill's core loop stays the same. Only the transport changes (HTTP POST instead of file write).

## Phased Implementation

### Phase 1: Shell & Layout
- Scaffold React + Vite + Express app in `apps/dashboard/`
- Nimbus theme (Tailwind config + CSS variables)
- Sidebar navigation with icons
- Empty view placeholders for each section
- Right panel with tab switching (MD Viewer / Visual Playground empty shells)
- `/api/health` endpoint
- `/staff` skill starts dashboard on init

### Phase 2: Inbox & MD Viewer
- `GET /api/pending` — pull from both kanban boards
- InboxView renders pending items list
- MarkdownViewer renders content with react-markdown
- Click item → load in MD Viewer
- "Approve Research Plan" button wired to kanban API

### Phase 3: Chat
- WebSocket chat relay
- ChatView with message history
- Terminal session watches relay file
- Real-time message exchange

### Phase 4: OpenClaw Log & Visual Playground
- OpenClaw bridge skill logs messages to `.openclaw-log/`
- OpenClawLogView renders the log
- Chat dropdown switches between Staff Chat and OpenClaw Log
- Visual Playground renders POSTed HTML
- Click event capture and retrieval API
- Brainstorming skill integration (dashboard check → playground route)

## Future Expansion

- **Outreach send button** — Click to send approved outreach via Reddit bot account
- **Software merge button** — Click to merge approved PRs
- **Board visualization** — Kanban board view within the dashboard
- **Notifications** — Desktop notifications for new items
- **Mobile responsive** — Use the dashboard from phone
- **Multi-user** — Employee logins with role-based access to human gates
