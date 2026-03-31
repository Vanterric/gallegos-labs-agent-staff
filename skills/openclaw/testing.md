# Testing — OpenClaw

After implementing a feature, you must test it before it can go to Review. This skill covers functional testing, visual regression testing, and test failure handling — all using Playwright MCP.

## Test Order

1. **Run existing tests** — Don't break what already works
2. **Write functional tests** — Verify the new feature works end-to-end
3. **Write visual tests** — Capture screenshots for visual regression
4. **Run everything** — All tests must pass

## Step 1: Run Existing Tests

Before adding new tests, run the project's existing test suite:

```bash
cd {{project_path}}

# Detect and run the test suite
if [ -f "package.json" ]; then
  npm test 2>&1
elif [ -f "Makefile" ]; then
  make test 2>&1
elif [ -f "pytest.ini" ] || [ -f "setup.py" ]; then
  pytest 2>&1
fi
```

If existing tests fail, **stop and investigate**. Don't write new tests on a broken foundation. If the failure is caused by your changes, fix them. If it's pre-existing, note it in your card update and continue.

## Step 2: Functional Tests (Playwright MCP)

Use Playwright MCP to write end-to-end tests that verify the feature works.

### Setup

If the feature has a UI or web interface, start the dev server first:

```bash
cd {{project_path}} && npm run dev &
DEV_PID=$!
sleep 5  # Wait for server to start
```

### Writing Tests

Use Playwright MCP to:
1. Navigate to the relevant page/endpoint
2. Interact with the feature (click, type, submit)
3. Assert expected outcomes (element visible, text present, API response correct)

Save test files alongside the feature code, following the project's test conventions. If the project uses `__tests__/` directories, put them there. If it uses `*.test.ts` co-located files, follow that pattern.

### What to Test

- **Happy path** — The feature works as described in the card
- **Edge cases** — Empty inputs, boundary values (only if specified in the card)
- **Error states** — What happens when things go wrong (only if the feature has error handling)

Don't over-test. Cover what the card specifies, not every theoretical scenario.

### Cleanup

```bash
kill $DEV_PID 2>/dev/null  # Stop dev server
```

## Step 3: Visual Regression Tests (Playwright MCP)

Use Playwright MCP to capture screenshots at key visual states.

### Baseline Screenshots

On the first run for a feature, screenshots become the baseline:

1. Navigate to the page in a consistent viewport (1280x720)
2. Wait for the page to be fully loaded (no spinners, no pending requests)
3. Capture a full-page screenshot
4. Save to `tests/visual-baselines/YYYY-MM-DD-<feature-slug>/`

### What to Capture

- The feature's main view/state
- Any new UI components in their default state
- Before and after states (if the feature modifies existing UI)

### Storage

```
tests/
  visual-baselines/
    YYYY-MM-DD-<feature-slug>/
      main-view.png
      component-default.png
      after-action.png
```

## Step 4: Run All Tests

Run the complete test suite one final time:

```bash
cd {{project_path}} && npm test 2>&1
```

All tests must pass. Record the results:
- Total tests: X
- Passed: X
- Failed: 0
- New tests added: N

## Failure Handling

### Test fails on first run
Investigate and fix. This is expected — you're doing TDD.

### Test fails after fix attempt (retry 1)
Read the error carefully. Is it a code bug or a test bug? Fix the right one.

### Test fails after second fix attempt (retry 2)
**Stop.** You've hit your retry limit.
1. Move the card back to To Do with `[BLOCKED]` prefix
2. Write a `blocked` message to the queue with:
   - Which test failed
   - The error message
   - What you tried
   - Your best guess at the root cause
3. Move to the next pipeline cycle

### Pre-existing test failure
If tests that existed before your changes are failing:
1. Check if your changes caused it (git stash, run tests, git stash pop)
2. If your changes caused it, fix them
3. If pre-existing, note it in the card and proceed (don't fix unrelated bugs)

## Test Report Format

Include this in the card description update:

```markdown
## Testing
- **Existing suite:** X passed, 0 failed
- **New functional tests:** N tests added
  - test_feature_happy_path: PASS
  - test_feature_edge_case: PASS
- **Visual baselines:** N screenshots captured
  - tests/visual-baselines/YYYY-MM-DD-slug/main-view.png
- **All tests passing:** Yes
```
