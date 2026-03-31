# Demo Recording — OpenClaw

After tests pass, record a short video demo of the feature. This is what the President watches during review instead of reading diffs.

## Purpose

The demo video shows the feature working. It's proof that the implementation is correct and a quick way for the President to understand what was built.

## Recording Process

### 1. Plan the Demo

Before recording, plan a script:
- What's the happy path for this feature?
- What are the 2-3 most important things to show?
- Keep it under 60 seconds

### 2. Set Up

Use Playwright MCP to control a browser:

1. Start the dev server if needed
2. Open a browser at a consistent viewport (1280x720)
3. Navigate to the starting point

### 3. Record

Use Playwright MCP's video recording capability:

1. Start recording
2. Walk through the happy path:
   - Show the feature's entry point
   - Demonstrate the core interaction
   - Show the result/output
3. Stop recording

### 4. Save

Save the video artifact:

```
artifacts/demos/YYYY-MM-DD-<card-slug>.mp4
```

If the `artifacts/demos/` directory doesn't exist, create it.

### 5. Link in Card

Add the demo path to the card description:

```markdown
## Demo
artifacts/demos/YYYY-MM-DD-<card-slug>.mp4
```

## When a Demo Isn't Possible

Some features don't have a visual component (e.g., a CLI tool, a backend-only change, a config file). In these cases:

- **CLI features:** Record a terminal session showing the command and output
- **API features:** Record a sequence of curl commands and responses
- **Config/skill files:** Skip the demo, note "No visual demo — config/skill file" in the card

Don't force a demo where one doesn't make sense. The goal is to help the reviewer understand the change, not to check a box.

## Demo Quality

- **Keep it short** — 30-60 seconds is ideal
- **Show, don't tell** — The video speaks for itself
- **Clean state** — Start from a clean/default state, not mid-workflow
- **No errors** — If the demo hits an error, fix it and re-record
- **Commit the video** — It's part of the deliverable

```bash
git add artifacts/demos/YYYY-MM-DD-<card-slug>.mp4
git commit -m "demo: add video walkthrough for <card-title>"
```
