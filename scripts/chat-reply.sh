#!/usr/bin/env bash
# Chat reply — sends a staff message to the dashboard.
# Usage: bash scripts/chat-reply.sh "message content"

CONTENT="${1:?Usage: chat-reply.sh \"message content\"}"
DASHBOARD="http://localhost:5174"

curl -s -X POST "$DASHBOARD/api/chat/reply" \
  -H "Content-Type: application/json" \
  -d "{\"content\":$(echo "$CONTENT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read().strip()))'),\"channel\":\"staff\"}"
