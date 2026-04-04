#!/usr/bin/env bash
# Push a file to the dashboard MD Viewer.
# Usage: bash scripts/viewer-show.sh "Title" "/absolute/path/to/file.md"
# Or:    bash scripts/viewer-show.sh "Title" --content "raw markdown content"

TITLE="${1:?Usage: viewer-show.sh \"Title\" \"/path/to/file.md\"}"
DASHBOARD="http://localhost:5174"

if [ "$2" = "--content" ]; then
  CONTENT="$3"
  PAYLOAD=$(node -e "console.log(JSON.stringify({title:process.argv[1],content:process.argv[2]}))" "$TITLE" "$CONTENT")
else
  FILEPATH="${2:?Missing file path}"
  PAYLOAD=$(node -e "console.log(JSON.stringify({title:process.argv[1],filePath:process.argv[2]}))" "$TITLE" "$FILEPATH")
fi

curl -s -X POST "$DASHBOARD/api/viewer/show" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
