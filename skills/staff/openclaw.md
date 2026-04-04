---
name: staff:openclaw
description: OpenClaw bridge — send messages to and receive status from the always-on OpenClaw agent on the Mac mini
---

# OpenClaw Bridge

You manage communication between the Chief of Staff and the OpenClaw autonomous agent running on Derrick's Mac mini. OpenClaw is always on — you can reach it anytime via its Gateway API.

## Connection Details

Read these from the environment or use defaults:

- **Gateway URL:** `http://192.168.1.173:18789`
- **Auth Token:** Read `OPENCLAW_GATEWAY_TOKEN` from `.env`, or use the token stored in memory
- **Endpoint:** `POST /v1/chat/completions`
- **Model:** `openclaw`

## Sending Messages to OpenClaw

Use curl via the Bash tool to send messages. OpenClaw's Gateway exposes an OpenAI-compatible chat completions API.

### Basic Message

```bash
curl -s --max-time 120 http://192.168.1.173:18789/v1/chat/completions \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openclaw",
    "messages": [{"role": "user", "content": "{{message}}"}]
  }'
```

The response is an OpenAI-compatible JSON object:

```json
{
  "id": "chatcmpl_...",
  "object": "chat.completion",
  "model": "openclaw",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "..."},
    "finish_reason": "stop"
  }]
}
```

Extract the response from `choices[0].message.content`.

### Model Routing

The `model` field in the request selects the **OpenClaw agent**, not the backend AI model. To control which OpenAI model handles the request, use the `x-openclaw-model` header:

```bash
curl -s --max-time 500 http://192.168.1.173:18789/v1/chat/completions \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -H "x-openclaw-model: {{provider/model}}" \
  -d '{
    "model": "openclaw",
    "messages": [{"role": "user", "content": "{{message}}"}]
  }'
```

**Available models (confirmed working as of 2026-04-03):**
- `openai-codex/gpt-5.4` — default, Codex OAuth path
- `openai/gpt-5.4` — direct API path (enabled after config update)

**Not yet enabled (need config + possible API keys):**
- `openai-codex/gpt-5.3-codex-spark` — experimental codex
- Cheap tiers (gpt-5-nano, o4-mini) — not in current gateway install

**How it works:**
- `model` field → selects OpenClaw **agent** (always use `openclaw`)
- `x-openclaw-model` header → selects **backend provider/model**
- Models must be in `agents.defaults.models` allowlist in `~/.openclaw/openclaw.json`
- To add models: ask OpenClaw to run `openclaw config set 'agents.defaults.models["provider/model"]' '{}' --strict-json` then restart gateway

### CRITICAL: Session Separation and Agent Dispatch

**Never ask the conversation session to do heavy work directly.** The gateway blocks until OpenClaw finishes — long tasks will time out and you'll lose the response.

Instead, use **two session patterns:**

1. **Conversation session** (`"model": "openclaw"`) — for status checks, questions, quick reads. These return fast.
2. **Work dispatch** — tell OpenClaw to **spin off a sub-agent** for the actual work. The conversation session stays responsive while the agent works independently.

**How to dispatch work through OpenClaw:**
```
Tell OpenClaw: "Spin off an agent to do X. Don't do it yourself in this session."
```

OpenClaw can spawn isolated agents that run in the background on the Mac. The conversation session returns immediately with confirmation, and the agent works independently.

**What goes wrong if you skip this:**
- Gateway blocks for the entire task duration
- 500s timeout fires → empty response
- You don't know if the work happened or not
- You waste cycles retrying

**Always use `run_in_background: true`** on the Bash tool for ALL OpenClaw requests, even conversation. And always use `--max-time 500`.

### Important Notes

- **Do NOT include `"stream": true`** — use synchronous requests only
- **One message at a time** — don't send concurrent requests to the same session
- If the request times out or connection is refused, OpenClaw may be down. Report to the President.

## Message Types

When communicating with OpenClaw, structure your messages clearly so it knows what you're asking. Use these prefixes:

### work:assign — Direct OpenClaw to work on a specific card

```
[STAFF:work:assign]
Card ID: {{card_id}}
Card Title: {{card_title}}
Board: Autonomous Engine
Kanban API: https://gallegos-kanban-api.onrender.com
Kanban Token: {{kanban_bot_token}}
Priority: {{normal|urgent}}

Task Description:
{{card_description}}

Instructions:
{{any specific guidance from the President or Staff}}
```

### work:pause — Tell OpenClaw to stop autonomous polling

```
[STAFF:work:pause]
Reason: {{reason}}
Resume when: {{condition or "wait for staff:work:resume"}}
```

### work:resume — Tell OpenClaw to resume autonomous polling

```
[STAFF:work:resume]
```

### config:update — Change OpenClaw's behavior

```
[STAFF:config:update]
{{key}}: {{value}}

Examples:
poll_cadence: 10m
review_cap: 3
target_board: Autonomous Engine
```

### status:request — Ask OpenClaw for current state

```
[STAFF:status:request]
Report: current task, queue depth, review count, any blockers
Also return any queued messages for Staff (queue.md contents).
```

### review:approved — Tell OpenClaw a card passed review

```
[STAFF:review:approved]
Card ID: {{card_id}}
Card Title: {{card_title}}
Action: merge to main, move card to Done
```

### review:rejected — Tell OpenClaw a card needs rework

```
[STAFF:review:rejected]
Card ID: {{card_id}}
Card Title: {{card_title}}
Feedback:
{{President's feedback or Staff's review notes}}

Action: Fix the issues and resubmit for review.
```

## Reading the Queue on Startup

When `/staff` is invoked, check if OpenClaw has queued messages and verify the autonomous pipeline cron is healthy:

1. Run `openclaw cron list`
2. Verify a cron named `autonomous-pipeline` exists
3. Verify it has a schedule and a recent last-run time
4. If the cron is missing or its last run is older than 15 minutes, flag it in the briefing under `Decisions Needed`
5. Send a `status:request` to OpenClaw
6. Parse the response for any queued messages
7. If OpenClaw is unreachable (connection refused), note it in the briefing as `OpenClaw Mac: offline`
8. Present any queued messages in the briefing under `Agent Results`

```bash
CRON_STATUS=$(openclaw cron list 2>/dev/null || echo "CRON_CHECK_FAILED")

RESPONSE=$(curl -s --max-time 30 http://192.168.1.173:18789/v1/chat/completions \
  -H "Authorization: Bearer {{token}}" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "openclaw",
    "messages": [{"role": "user", "content": "[STAFF:status:request]\nReport: current task, queue depth, review count, any blockers.\nAlso return any queued messages for Staff (queue.md contents)."}]
  }' 2>/dev/null)

if [ $? -ne 0 ] || [ -z "$RESPONSE" ]; then
  echo "OPENCLAW_OFFLINE"
else
  echo "$RESPONSE" | python -c "import sys,json; print(json.load(sys.stdin)['choices'][0]['message']['content'])" 2>/dev/null || echo "PARSE_ERROR"
fi
```

### Cron Health Rules

Treat the autonomous pipeline as healthy only if all of the following are true:

- `autonomous-pipeline` appears in `openclaw cron list`
- it has a real schedule (not blank)
- its `Last` run is not older than 15 minutes

If any of those checks fail, surface it clearly in the briefing as an operational issue that needs attention.

## Handling OpenClaw Responses

OpenClaw will respond in natural language. Parse its responses for:

- **Status updates** — what it's working on, what's in the review queue
- **Completion reports** — card finished, branch name, test results, demo link
- **Blockers** — things it can't resolve, needs Staff or President input
- **Questions** — ambiguous cards, unclear requirements

When presenting to the President, summarize — don't dump raw responses.

## Error Handling

| Scenario | Action |
|----------|--------|
| Connection refused | OpenClaw is down. Note in briefing. Don't retry more than once. |
| Timeout (>120s) | OpenClaw may be busy with a long task. Try again later or ask for status. |
| Auth error (401/403) | Token may have changed. Check `.env` and OpenClaw config. Report to President. |
| Unexpected response | Log the raw response and report to President. |

## When to Contact OpenClaw

**Proactively (without President asking):**
- On `/staff` startup — pull queue
- When a card is moved to Review by OpenClaw — acknowledge receipt
- When President approves/rejects a review — relay immediately

**On President's direction:**
- "Tell OpenClaw to work on X" → send `work:assign`
- "Pause OpenClaw" → send `work:pause`
- "What's OpenClaw doing?" → send `status:request`

**Never:**
- Don't spam OpenClaw with frequent status checks (once per session is fine)
- Don't send conflicting instructions (pause then assign work)
- Don't bypass the President for review decisions
