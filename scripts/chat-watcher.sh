#!/usr/bin/env bash
# Chat watcher — long-polls dashboard for president messages.
# Usage: bash scripts/chat-watcher.sh <since-ISO-timestamp>
# Loops on timeout, exits with message payload when one arrives.

SINCE="${1:?Usage: chat-watcher.sh <since-ISO-timestamp>}"
DASHBOARD="http://localhost:5174"

while true; do
  RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$DASHBOARD/api/chat/wait?since=$SINCE&timeout=60")
  HTTP_STATUS=$(echo "$RESPONSE" | tail -1 | sed 's/HTTP_STATUS://')
  if [ "$HTTP_STATUS" = "200" ]; then
    echo "$RESPONSE" | sed '$d'
    exit 0
  fi
done
