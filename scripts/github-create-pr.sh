#!/bin/sh
set -eu

if [ "$#" -lt 5 ] || [ "$#" -gt 6 ]; then
  echo "Usage: $0 OWNER/REPO HEAD_BRANCH BASE_BRANCH TITLE BODY_FILE [DRAFT]" >&2
  exit 1
fi

REPO_SLUG=$1
HEAD_BRANCH=$2
BASE_BRANCH=$3
TITLE=$4
BODY_FILE=$5
DRAFT=${6:-false}
TOKEN=$(/Users/derrick/openclaw-staff/github-token.sh)

if [ ! -f "$BODY_FILE" ]; then
  echo "Body file not found: $BODY_FILE" >&2
  exit 1
fi

python3 - <<'PY' "$REPO_SLUG" "$HEAD_BRANCH" "$BASE_BRANCH" "$TITLE" "$BODY_FILE" "$DRAFT" "$TOKEN"
import json, sys, urllib.request
repo, head, base, title, body_file, draft, token = sys.argv[1:]
body = open(body_file, 'r', encoding='utf-8').read()
payload = {
    'title': title,
    'head': head,
    'base': base,
    'body': body,
    'draft': draft.lower() == 'true',
}
req = urllib.request.Request(
    f'https://api.github.com/repos/{repo}/pulls',
    data=json.dumps(payload).encode(),
    method='POST',
    headers={
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'OpenClaw',
        'Content-Type': 'application/json',
    },
)
with urllib.request.urlopen(req) as r:
    print(r.read().decode())
PY
