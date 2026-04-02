# Lab Knowledge Base — Spec

**Date:** 2026-04-02

## Overview

A centralized, semantically searchable knowledge base for Gallegos Labs. All lab knowledge — research findings, architectural decisions, competitive intelligence, user feedback, operational learnings — flows into a single MongoDB Atlas collection with vector embeddings. Any agent (Staff, OpenClaw) or tool (dashboard) can query it with natural language and get relevant results.

## Architecture

```
Knowledge Sources                    Knowledge Base (MongoDB Atlas)
┌─────────────────┐                 ┌──────────────────────────┐
│ Research findings│──write──┐      │ Collection: knowledge    │
│ Research insights│──write──┤      │                          │
│ Competitive intel│──write──┤      │ { content, embedding,    │
│ Arch. decisions  │──write──┼──►   │   source, category,      │
│ User feedback    │──write──┤      │   tags, metadata }       │
│ Operational logs │──write──┤      │                          │
│ Specs & plans    │──write──┘      │ Atlas Vector Search      │
└─────────────────┘                 │ index on embedding field │
                                    └──────────┬───────────────┘
                                               │
                                    ┌──────────▼───────────────┐
                                    │ Query Layer              │
                                    │ scripts/query-kb.sh      │
                                    │                          │
                                    │ "What do we know about   │
                                    │  voice transcription     │
                                    │  pain points?"           │
                                    │                          │
                                    │ → Returns top N relevant │
                                    │   knowledge entries      │
                                    └──────────────────────────┘
```

**Markdown stays the source of truth.** The vector DB is a search index, not the canonical store. If the DB is lost, it can be rebuilt from the markdown files across repos.

## MongoDB Setup

**Atlas Project:** "Gallegos Labs Knowledge" (separate from Nimbus)
**Database:** `knowledge-base`
**Collection:** `entries`

### Document Schema

```javascript
{
  _id: "kb-2026-04-02-001",          // Unique ID
  content: "Full text content...",     // The knowledge entry (markdown body)
  summary: "One-line summary...",      // Short summary for search results
  embedding: [0.012, -0.034, ...],    // Vector embedding (1536 dims for text-embedding-3-small)
  
  // Classification
  source: "research-finding" | "research-insight" | "competitor-watch" | 
          "architectural-decision" | "user-feedback" | "operational" | "spec" | "manual",
  category: "user-pain-point" | "competitor-move" | "architecture" | "product-decision" |
            "process" | "market-signal" | "technical-learning" | "general",
  tags: ["voice", "transcription", "otter"],   // Freeform tags for filtering
  
  // Provenance
  sourceFile: "gallegos-labs-research/findings/raw/2026-04-02-reddit-voice-notes.md",
  sourceRepo: "gallegos-labs-research",
  sourceUrl: "https://reddit.com/r/productivity/...",   // Optional external URL
  
  // Metadata
  product: "nimbus" | "kanban" | "labs-site" | "general",
  competitor: "otter-ai" | "notion" | null,             // If competitor-related
  confidence: 0.85,                                      // How reliable (0-1)
  
  // Timestamps
  createdAt: "2026-04-02T14:00:00.000Z",
  updatedAt: "2026-04-02T14:00:00.000Z",
  sourceDate: "2026-04-02",           // When the original knowledge was created
  
  // Lifecycle
  status: "active" | "stale" | "archived",
  staleDays: 90                        // Auto-mark stale after N days (varies by source)
}
```

### Atlas Vector Search Index

Create a vector search index on the `entries` collection:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 1536,
        "similarity": "cosine"
      }
    }
  }
}
```

## Embedding Model

**Model:** OpenAI `text-embedding-3-small`
- 1536 dimensions
- $0.02 per 1M tokens (~$0.00002 per entry)
- Fast, cheap, good enough for semantic search across lab-scale content

Store the API key in `.env` as `OPENAI_API_KEY` (likely already there for Nimbus).

## Writing to the Knowledge Base

### Auto-Population Sources

Each source has a writer that converts its native format into a KB entry:

#### 1. Research Findings → KB
**Trigger:** When a new finding is committed to `findings/raw/`
**Writer:** Extract title, content, frontmatter metadata → create KB entry with `source: "research-finding"`
**Staleness:** 180 days (findings age but remain useful for trends)

#### 2. Research Insights → KB
**Trigger:** When synthesis promotes findings into insights
**Writer:** Extract insight content, supporting findings, confidence → create KB entry with `source: "research-insight"`
**Staleness:** 365 days (insights are higher-value, longer-lived)

#### 3. Competitive Intelligence → KB
**Trigger:** When competitor-watch logs a finding
**Writer:** Extract competitor, change type, implications → create KB entry with `source: "competitor-watch"`
**Staleness:** 90 days (competitor info ages fast)

#### 4. Architectural Decisions → KB
**Trigger:** When OpenClaw makes a design choice during planning, or when Staff/President make decisions in session
**Writer:** Record the decision, context, alternatives considered, rationale → create KB entry with `source: "architectural-decision"`
**Staleness:** Never (architectural decisions are permanent record)

#### 5. User Feedback → KB
**Trigger:** When new feedback is surfaced during `/staff` startup
**Writer:** Extract category, title, content, user context → create KB entry with `source: "user-feedback"`
**Staleness:** 365 days

#### 6. Specs & Plans → KB
**Trigger:** When a spec or plan is committed to `docs/superpowers/`
**Writer:** Extract goal, architecture summary, key decisions → create KB entry with `source: "spec"`
**Staleness:** Never (specs are historical record)

### Manual Entries

Staff or the President can manually add knowledge:

```bash
bash scripts/kb-add.sh "source" "category" "content" "tags (comma-separated)"
```

This creates an entry with `source: "manual"` for knowledge that doesn't come from an automated pipeline.

## Querying the Knowledge Base

### Semantic Search Script

`scripts/query-kb.sh "natural language question"` — returns the top N most relevant entries.

```bash
# Usage
bash scripts/query-kb.sh "What do users hate about voice transcription apps?"
bash scripts/query-kb.sh "What has Otter changed in the last month?"
bash scripts/query-kb.sh "Why did we choose Playwright over the Reddit API?"
```

**Implementation:**
1. Embed the query using `text-embedding-3-small`
2. Run Atlas Vector Search `$vectorSearch` aggregation
3. Return top 5 results with content, source, date, relevance score

**Output format:**
```json
{
  "query": "What do users hate about voice transcription apps?",
  "results": [
    {
      "id": "kb-2026-04-01-003",
      "score": 0.89,
      "summary": "Reddit user frustrated with Otter cutting off after 40 minutes",
      "source": "research-finding",
      "sourceDate": "2026-04-01",
      "tags": ["otter", "transcription", "pain-point"],
      "content": "Full finding text..."
    }
  ]
}
```

### Filtered Search

Support optional filters alongside semantic search:

```bash
bash scripts/query-kb.sh "pricing changes" --source competitor-watch --product nimbus
bash scripts/query-kb.sh "architecture" --category architectural-decision --since 2026-03-01
```

### Staff Integration

The Staff skill can query the KB during:
- **Briefing generation** — pull relevant context for recommendations
- **Brainstorming** — "what do we already know about X?" before designing
- **Dispatching agents** — include relevant KB context in agent prompts
- **Answering President questions** — search KB before guessing

Add to the staff skill:
```markdown
### Querying the Knowledge Base
When the President asks a question about past decisions, research findings, competitor activity, 
or anything the lab might already know, query the KB first:
```bash
bash scripts/query-kb.sh "{{question}}"
```
Use the results to inform your answer. Cite sources when relevant.
```

### OpenClaw Integration

OpenClaw queries the KB during planning (Step 3):
- Before designing an implementation, search for relevant architectural decisions
- Check if similar work has been done before
- Look for relevant research findings that should inform the approach

## Lifecycle Management

### Staleness

A daily or weekly cron job checks entries against their `staleDays`:
- If `createdAt + staleDays < now` → mark `status: "stale"`
- Stale entries still appear in search results but are ranked lower and flagged as stale
- Stale entries are NOT auto-deleted — the President can review and archive or refresh them

### Deduplication

Before writing a new entry, check for semantic similarity against existing entries:
- If similarity > 0.92 with an existing active entry → update the existing entry instead of creating a duplicate
- If similarity > 0.85 → create the entry but link it to the related entry via a `relatedIds` field

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/query-kb.sh` | Semantic search — natural language query |
| `scripts/kb-add.sh` | Manually add a knowledge entry |
| `scripts/kb-ingest.sh` | Bulk ingest from a source (e.g., re-index all findings) |
| `scripts/kb-stats.sh` | Count entries by source, category, staleness |

All scripts use Node.js + the `mongodb` driver (already installed) + OpenAI SDK for embeddings.

## Skill File

`skills/research/knowledge-base.md` — teaches OpenClaw how to:
1. Write entries when completing pipeline work
2. Query the KB during planning
3. Handle deduplication
4. Tag entries appropriately

## Briefing Integration

Add to staff briefing:

```markdown
## N. Knowledge Base
- **Total entries:** N (N active, N stale, N archived)
- **New this week:** N entries from [sources]
- **Most queried topics:** [top 3 by query frequency, if tracked]
```

## What This Does Not Include

- **Full-text search** — Atlas Vector Search handles semantic; keyword fallback is a future enhancement
- **Dashboard UI for browsing KB** — query via scripts for now, dashboard view is a future card
- **Cross-lab federation** — single lab, single KB
- **Access control** — all agents have full read/write

## Dependencies

- **MongoDB Atlas project** (Presidential Task — manual setup)
- **OpenAI API key** for embeddings (likely already in Nimbus .env)
- **mongodb npm package** (already installed in agent-staff)

## Target Repos
- `gallegos-labs-agent-staff` — scripts, skills, briefing updates
- `gallegos-labs-research` — auto-population hooks for findings/insights/competitive intel
