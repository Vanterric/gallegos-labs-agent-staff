# Synthesis Engine — Research Pipeline

You synthesize raw findings into validated insights. This skill runs when triggered by the monitoring cycle (volume or time threshold) or manually by the Chief of Staff.

## When This Runs

- **Volume trigger:** A product has >= 10 unprocessed findings
- **Time trigger:** 7+ days since last synthesis for any product
- **Manual trigger:** Chief of Staff requests synthesis

## Configuration

Read `config/thresholds.yaml` from the research repo:
- `min_findings_for_insight`: 3 (minimum to promote a theme)
- Confidence levels: Emerging (3-4), Moderate (5-9), Strong (10+)
- `archive_stale_days`: 90

## The Synthesis Process

### Step 1: Gather Unprocessed Findings

```bash
cd ~/gallegos-labs-research
# Find all unprocessed findings for the target product
grep -rl "processed: false" findings/raw/ | while read f; do
  if grep -q "product: nimbus" "$f"; then
    echo "$f"
  fi
done
```

Read each finding file. Extract:
- The finding content (## Finding section)
- The category (from frontmatter)
- The source and source_url
- The date
- The population

### Step 2: Cluster by Theme

Group findings that describe the same underlying pattern. Look for:

- **Same pain point** — Multiple people describing the same frustration
- **Same feature request** — Multiple people asking for the same capability
- **Same competitor gap** — Multiple people noting the same weakness in a competitor
- **Same sentiment** — Multiple people expressing the same attitude or concern

**How to cluster:**
1. Read all findings
2. Identify recurring themes — what words, problems, or needs appear multiple times?
3. Group findings that share a theme
4. Name each cluster with a clear, specific theme title

**Example clusters:**
- "Users can't edit voice notes after recording" (3 findings)
- "Otter.ai users frustrated with pricing changes" (4 findings)
- "Desire for AI that remembers context across sessions" (2 findings — not enough yet)

### Step 3: Evaluate Clusters

For each cluster:

1. **Count independent findings** — Same theme but from different users/sources. Two posts by the same user about the same thing count as 1.

2. **Apply threshold:**
   - < 3 independent findings → **Not enough signal.** Leave findings as unprocessed. They may join a cluster in a future synthesis.
   - >= 3 independent findings → **Promote to insight.**

### Step 4: Write or Update Insights

For each cluster that meets the threshold, check if an existing insight covers this theme in `insights/<product>/insights.md`.

**If new insight:** Append to the insights doc:

```markdown
## [Theme title — one clear sentence]
- **Confidence:** Emerging (3-4) | Moderate (5-9) | Strong (10+)
- **Finding count:** N
- **Sources:** Reddit (X), In-app feedback (Y), Survey (Z)
- **Population:** [who these findings are about]
- **Product:** [product name]
- **First seen:** [date of earliest finding in the cluster]
- **Last confirmed:** [date of most recent finding]
- **Category:** pain-point | feature-request | competitor-gap | sentiment
- **Finding IDs:** f-2026-04-01-001, f-2026-04-02-003, ...

### Summary
[2-3 sentences synthesizing what the findings collectively tell us. Be specific — what is the pattern, why does it matter, what does it suggest?]

### Representative Quotes
> "[direct quote from finding 1]" — [source, date]
> "[direct quote from finding 2]" — [source, date]
> "[direct quote from finding 3]" — [source, date]
```

**If existing insight:** Update it:
- Add new finding IDs to the list
- Increment finding count
- Update "Last confirmed" date
- Update confidence level based on new total
- Update Sources breakdown
- Add any new representative quotes that are particularly strong
- Update summary if the new findings add nuance

### Step 5: Mark Findings as Processed

For each finding that was assigned to an insight, update its frontmatter:

```yaml
processed: true
insight_ids: [insight-title-slug]
```

**Important:** Only mark findings as processed if they were actually assigned to an insight. Findings that didn't meet the cluster threshold stay `processed: false` for the next synthesis cycle.

### Step 6: Update Confidence Levels

Review ALL existing insights (not just new ones) and recalculate confidence:

| Finding Count | Confidence |
|---------------|-----------|
| 3-4 | Emerging |
| 5-9 | Moderate |
| 10+ | Strong |

### Step 7: Archive Stale Insights

Check each insight's "Last confirmed" date. If it's more than `archive_stale_days` (90) days ago:

1. Cut the insight from `insights/<product>/insights.md`
2. Paste it into `insights/<product>/archive/YYYY-MM-DD-<slug>.md`
3. Add a note: `Archived on [date] — no confirming findings in 90 days`

Archiving is not deletion — the insight may resurface if new findings appear.

### Step 8: Update Metadata

Update the header of `insights/<product>/insights.md`:

```markdown
Last synthesis: 2026-04-01
Total insights: N
```

### Step 9: Commit and Push

```bash
cd ~/gallegos-labs-research
git add insights/ findings/raw/
git commit -m "research: synthesis — [N new insights, M updated, K archived] for [product]"

TOKEN=$(~/openclaw-staff/github-token.sh)
git remote set-url origin https://x-access-token:$TOKEN@github.com/Vanterric/gallegos-labs-research.git
git push origin master
```

### Step 10: Report to Staff

Write a synthesis summary to the queue:

```markdown
## [timestamp] status:report
- **Card:** N/A
- **Card ID:** N/A
- **Board:** Research Pipeline
- **Branch:** N/A
- **Plan:** N/A
- **Tests:** N/A
- **Demo:** N/A
- **Summary:** Synthesis complete for [product]. Processed N findings. New insights: [list titles]. Updated insights: [list titles]. Archived: [list titles or "none"]. Total active insights: M.
---
```

## Synthesis Quality

- **Be specific** — "Users want better voice notes" is too vague. "Users can't edit voice notes after recording and lose information" is specific.
- **Don't force it** — If findings don't cluster naturally, don't manufacture insights. Wait for more data.
- **Quotes matter** — Representative quotes make insights actionable. Pick the most vivid, specific quotes.
- **One insight per theme** — Don't split a theme into multiple insights. Don't merge unrelated themes.
- **Confidence is earned** — Don't inflate confidence. 3 findings = Emerging, period.
