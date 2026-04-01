# Reddit Operations — Research Pipeline

You search Reddit for findings relevant to Gallegos Labs products. This skill covers how to search subreddits, extract relevant content, and identify potential beta testers.

## Configuration

Read `config/subreddits.yaml` from the `gallegos-labs-research` repo for:
- Target subreddits and keywords
- Scan interval and lookback window
- Max results per subreddit

Read `config/products.yaml` for product keywords used to tag findings.

## Searching Reddit

Use Playwright MCP to browse Reddit. This avoids API key requirements and rate limits.

### Search Process

For each subreddit in the config:

1. **Navigate to the search URL:**

```
https://www.reddit.com/r/{subreddit}/search/?q={keyword}&t=hour&sort=new
```

Use `t=hour` to match the `lookback_hours` config. For broader scans, use `t=day` or `t=week`.

2. **Take a snapshot** of the search results page using `browser_snapshot` to read the post titles and previews.

3. **For each relevant result**, navigate to the full post and read:
   - Post title
   - Post body
   - Top comments (first 10-15)
   - Author username
   - Subreddit
   - Post URL
   - Post age

### Relevance Filtering

A post/comment is relevant if it matches ANY of these patterns:

**Pain points:**
- User describes frustration with an existing tool
- User describes a workflow problem that Nimbus/products could solve
- User asks "is there an app that..." or "I wish I could..."

**Feature requests:**
- User describes a feature they want in a competitor product
- User describes a capability gap in their current workflow

**Competitor mentions:**
- User compares tools in the voice AI / note-taking / productivity space
- User reviews or complains about Otter.ai, Notion, Mem, etc.

**Sentiment:**
- User expresses strong positive or negative sentiment about AI assistants
- User discusses privacy concerns, trust, or adoption barriers

### What to Ignore

- Promotional posts / self-promotion
- Posts with no substantive content (memes, one-word responses)
- Posts older than the lookback window
- Posts already logged (check `findings/raw/` for the source_url)

## Extracting a Finding

When you find a relevant post or comment, extract:

```yaml
source: reddit
source_url: [full permalink URL]
product: [match against config/products.yaml keywords, or "general"]
population: [infer from context — e.g., "productivity-focused professional", "student", "developer"]
category: [pain-point | feature-request | competitor-mention | sentiment]
```

**Finding content:**
- Quote the relevant text directly
- Include enough context to understand the finding without visiting Reddit
- Note the author's username (for potential outreach)

**Context:**
- Thread title
- Which subreddit
- What the broader discussion is about
- Any replies that add context

## Identifying Potential Beta Testers

A Reddit user is a potential beta tester if they:

1. Describe a problem Nimbus solves
2. Are actively looking for a solution ("any recommendations?", "I've tried X but...")
3. Show engagement (detailed post, multiple comments)
4. Are in a relevant subreddit

When you identify one, flag it in the finding:

```
## Beta Tester Candidate
- **Username:** u/example
- **Signal:** Actively looking for a voice-first note-taking solution
- **Thread:** [URL]
```

The monitoring skill will pick this up and draft outreach.

## Rate Limiting and Politeness

- Wait 2-3 seconds between page navigations
- Don't scrape more than `max_results_per_subreddit` posts per cycle
- If Reddit shows a CAPTCHA or rate limit page, stop and log an error to the queue
- Never interact with Reddit (no voting, commenting, or posting) during monitoring — that's only for approved outreach

## Error Handling

| Error | Action |
|-------|--------|
| Reddit returns 429 / rate limit | Stop scanning, log error, retry next cycle |
| CAPTCHA page | Stop scanning, log error to queue, alert Staff |
| Subreddit not found / private | Log warning, skip, continue with other subreddits |
| Playwright browser crash | Log error, restart browser, continue |
| No results for a keyword | Normal — just move to next keyword |
