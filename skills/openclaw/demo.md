# Demo Recording — OpenClaw

After tests pass, record a short video demo of the feature. This is what the President watches during review instead of reading diffs.

## Purpose

The demo video shows the feature working. It's proof that the implementation is correct and a quick way for the President to understand what was built.

## Recording Method

Use a **direct Playwright script** (not MCP browser tools — they don't support video recording). Playwright is installed at `~/openclaw-staff/node_modules/playwright`.

### 1. Plan the Demo

Before recording, plan a script:
- What's the happy path for this feature?
- What are the 2-3 most important things to show?
- Keep it under 60 seconds

### 2. Write the Recording Script

Create a recording script at `/tmp/demo-<card-slug>.mjs`:

```javascript
import { chromium } from "playwright";

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
  recordVideo: {
    dir: "{{target_repo_path}}/artifacts/demos",
    size: { width: 1280, height: 720 }
  }
});

const page = await context.newPage();

// === DEMO SCRIPT ===
// Navigate to the feature's starting point
await page.goto("http://localhost:{{port}}");
await page.waitForTimeout(1000);

// Demonstrate the core interaction
// ... page.click(), page.fill(), page.waitForSelector(), etc.

// Show the result
await page.waitForTimeout(2000);
// === END DEMO ===

// Close context to finalize video
await context.close();
await browser.close();

console.log("Demo recorded to {{target_repo_path}}/artifacts/demos/");
```

Customize the demo script section for each card's happy path. Use Playwright actions:
- `page.goto(url)` — navigate
- `page.click(selector)` — click elements
- `page.fill(selector, text)` — type into inputs
- `page.waitForSelector(selector)` — wait for elements
- `page.waitForTimeout(ms)` — pause for the viewer to see the state (1-2 seconds between actions)

### 3. Run the Recording

```bash
cd ~/openclaw-staff && node /tmp/demo-<card-slug>.mjs
```

The `cd ~/openclaw-staff` is required so Node can resolve the playwright package.

### 4. Rename and Commit

Playwright generates a random filename. Rename it to match the card:

```bash
cd {{target_repo_path}}/artifacts/demos
LATEST=$(ls -t *.webm | head -1)
mv "$LATEST" "YYYY-MM-DD-<card-slug>.webm"
```

Commit the video:

```bash
git add artifacts/demos/YYYY-MM-DD-<card-slug>.webm
git commit -m "demo: add video walkthrough for <card-title>"
```

### 5. Link in Card

Add the demo path to the card description:

```markdown
## Demo
- **Video:** artifacts/demos/YYYY-MM-DD-<card-slug>.webm
```

## Starting Dev Servers

Most demos need a dev server running. Start it before the recording script:

```bash
cd {{target_repo_path}} && npm run dev &
DEV_PID=$!
sleep 5  # Wait for server

# Run the recording
cd ~/openclaw-staff && node /tmp/demo-<card-slug>.mjs

# Clean up
kill $DEV_PID 2>/dev/null
```

## When a Demo Isn't Possible

Some features don't have a visual component (e.g., a CLI tool, a backend-only change, a config file). In these cases:

- **API features:** Record a sequence of curl commands and responses in a markdown file
- **Config/skill files:** Skip the demo, note "No visual demo — config/skill file" in the card

Don't force a demo where one doesn't make sense.

## Demo Quality

- **Keep it short** — 30-60 seconds is ideal
- **Pace for readability** — use `waitForTimeout(1500-2000)` between actions so the viewer can follow
- **Show, don't tell** — The video speaks for itself
- **Clean state** — Start from a clean/default state, not mid-workflow
- **No errors** — If the demo hits an error, fix the script and re-record
- **File format** — `.webm` (Playwright's default, plays in all modern browsers)
