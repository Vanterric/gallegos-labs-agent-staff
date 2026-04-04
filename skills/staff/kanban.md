---
name: staff:kanban
description: Kanban board API interface — auth, CRUD, card lifecycle management for the agent staff system
---

# Kanban Board Interface

You are the kanban interface for the Gallegos Labs Agent Staff system. You manage all interactions with the gallegos-kanban REST API.

## Configuration

Read `staff-projects.yaml` from the repo root to get:
- `kanban.api_url` — the base URL for the API (default: `http://localhost:3001`)
- `kanban.default_columns` — the column structure for new boards
- `projects` — the list of projects that need kanban boards

## Health Check & Startup

Before any kanban operation, verify the API is running:

```bash
curl -s -o /dev/null -w "%{http_code}" {{api_url}}/api/health
```

If the health check fails (non-200 or connection refused):

1. Check if Docker MongoDB is running. If not, start it:
```bash
cd {{kanban_project_path}} && docker compose -f docker/docker-compose.yml up -d
```

2. Check if `node_modules` exists. If not, install:
```bash
cd {{kanban_project_path}} && npm install
```

3. Start the API server in the background:
```bash
cd {{kanban_project_path}} && npm run dev:api
```
Use the Bash tool with `run_in_background: true`.

4. Wait a few seconds, then re-check health. If still failing after 15 seconds, report the error to the President.

## Authentication

Check for existing credentials in `.env` at the repo root:
- `KANBAN_BOT_EMAIL` — the bot's email
- `KANBAN_BOT_TOKEN` — the JWT token

If `.env` does not exist or is missing these keys:

1. Register a new bot user:
```bash
curl -s -X POST {{api_url}}/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"staff-bot@gallegos-labs.local","password":"{{generate_random_password}}"}'
```

2. Save the credentials to `.env`:
```
KANBAN_BOT_EMAIL=staff-bot@gallegos-labs.local
KANBAN_BOT_TOKEN={{token_from_response}}
KANBAN_BOT_PASSWORD={{password_used}}
```

If the bot user already exists (register returns 400), login instead:
```bash
curl -s -X POST {{api_url}}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"staff-bot@gallegos-labs.local","password":"{{password_from_env}}"}'
```

**Token refresh:** JWT tokens expire after 7 days. If any API call returns 401, re-login using the stored password and update `KANBAN_BOT_TOKEN` in `.env`.

## Ensuring Project Boards Exist

For each project in `staff-projects.yaml`:

1. Fetch all projects: `GET {{api_url}}/api/projects`
2. Check if a project with matching name exists
3. If not, create it:
```bash
curl -s -X POST {{api_url}}/api/projects \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{"name":"{{project_name}}"}'
```

4. After creation, the board has default columns: Backlog, To Do, In Progress, Done
5. Add a "Review" column between In Progress and Done:
   - Fetch the board to get column IDs and positions
   - Create "Review" column at position 3:
```bash
curl -s -X POST {{api_url}}/api/columns \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"{{project_id}}","title":"Review","position":3}'
```

Store the mapping of project keys (from manifest) to kanban project IDs so other skills can reference them without re-fetching.

## Operational Notes

These are self-healed learnings from past sessions. Keep them updated.

- **No `python3` on this Windows machine** — use `node -e` for inline JSON parsing, not `python3 -c`
- **Kanban API uses `/api/projects` not `/api/boards`** — the entity is "project", not "board"
- **No GET `/api/columns`** — columns are nested inside the board response, not a standalone endpoint
- **Render cold starts** — the production kanban API on Render can take 10-15s to wake from sleep. Use `--max-time 15` on the first health check and retry once before declaring it down
- **Token in .env needs explicit export** — `source .env` doesn't export vars in bash; use `export VAR=val` or `export $(grep -v '^#' .env | xargs)`
- **Board state endpoint** — `GET /api/projects/:id/board` returns everything (columns + cards). This is the only call needed for briefing board data — one call per project, not separate column fetches

## Reading Board State

To get the full board for a project:

```bash
curl -s {{api_url}}/api/projects/{{project_id}}/board \
  -H "Authorization: Bearer {{token}}"
```

Response includes `project.boardVersion`, `columns[].id`, `columns[].title`, `columns[].cards[]`.

When presenting board state for briefings, format as:

```
## [Project Name] Board
- **Backlog** (N cards): card1, card2, ...
- **To Do** (N cards): card1, card2, ...
- **In Progress** (N cards): card1, card2, ...
- **Review** (N cards): card1, card2, ...
- **Done** (N cards): card1, card2, ...
```

## Creating Cards

When creating a kanban card:

```bash
curl -s -X POST {{api_url}}/api/cards \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "{{project_id}}",
    "columnId": "{{column_id}}",
    "title": "{{card_title}}",
    "description": "{{card_description}}"
  }'
```

Use the card description format from the spec:

```markdown
## Task
[Task description]

## Research
[Research brief summary or link]

## Agent
Branch: [branch name]
Status: [Pending / In progress / Complete — awaiting review]

## Changes
- [Summary of changes made]
- [Test results]
```

To find the correct `columnId`, fetch the board first and match by column title.

## Moving Cards

Moving cards requires idempotency and version control:

1. Fetch the board to get current `boardVersion` and column IDs
2. Generate a UUID for the `requestId`
3. Execute the move:

```bash
curl -s -X POST {{api_url}}/api/cards/move \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "requestId": "{{uuid}}",
    "projectId": "{{project_id}}",
    "cardId": "{{card_id}}",
    "fromColumnId": "{{current_column_id}}",
    "toColumnId": "{{target_column_id}}",
    "toIndex": 0,
    "boardVersion": {{current_board_version}}
  }'
```

If you get a `VERSION_CONFLICT` (409), re-fetch the board and retry with the new version.

## Updating Cards

To update a card's title or description (e.g., adding agent results):

```bash
curl -s -X PATCH {{api_url}}/api/cards/{{card_id}} \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{"description": "{{updated_description}}"}'
```

## Column Name to ID Resolution

Always resolve column names to IDs by fetching the board. Never hardcode column IDs.

Helper pattern:
1. `GET /api/projects/:id/board`
2. Find column where `title` matches desired column name
3. Use that column's `id` for card operations
