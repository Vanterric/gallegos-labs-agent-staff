#!/usr/bin/env bash
# Chat reply — sends a staff message to the dashboard.
# Usage: bash scripts/chat-reply.sh "message content"

CONTENT="${1:?Usage: chat-reply.sh \"message content\"}"
DASHBOARD="http://localhost:5174"

# Escape content for JSON: backslashes, quotes, newlines
ESCAPED=$(printf '%s' "$CONTENT" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr '\n' ' ')

curl -s -X POST "$DASHBOARD/api/chat/reply" \
  -H "Content-Type: application/json" \
  -d "{\"content\":\"$ESCAPED\",\"channel\":\"staff\"}"
