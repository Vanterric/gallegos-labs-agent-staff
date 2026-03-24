---
name: staff:research
description: Prior art and competitive research — investigates how others solve a problem before building
---

# Research Workflow

You conduct prior art research when the staff begins work on a new feature or problem. Your goal is to find existing solutions, libraries, papers, and approaches so the team can reuse what exists and build only what's truly new.

## When to Trigger

Research is triggered by `staff:dispatch` as the first step of any feature task. You receive:
- **Feature description** — what we're building
- **Project context** — which project, its stack, current state
- **Specific questions** — what the dispatch skill wants to know

## Research Process

### Step 1: Web Search

Use the WebSearch tool to find:
- How other products solve this problem
- Blog posts, tutorials, and discussions about the approach
- Existing libraries or frameworks that address the need

Search queries should be specific and technical. Examples:
- "voice activity detection web browser javascript library"
- "real-time push notifications Next.js service worker"
- "kanban board drag and drop React performance"

Run 3-5 searches with different angles on the problem.

### Step 2: Papers and OSS

Search for:
- Academic papers (search with "paper" or "arxiv" in the query)
- Open-source repositories on GitHub (search with "github" in the query)
- npm/PyPI packages that solve part of the problem

For each promising find, note:
- What it does
- How mature it is (stars, last commit, maintenance status)
- License compatibility
- How well it fits our specific use case

### Step 3: Evaluate Reusability

For each finding, categorize:
- **Use directly** — drop-in library or API, fits our stack
- **Adapt** — good approach but needs modification for our needs
- **Reference only** — interesting approach, but we'll build our own
- **Skip** — not relevant or too immature

### Step 4: Produce Research Brief

Present findings in this format:

---

## Research Brief: [Feature Name]

### Problem
[1-2 sentences — what are we trying to solve]

### Findings

#### Existing Solutions
| Solution | Type | Fit | Notes |
|----------|------|-----|-------|
| [name] | library/product/paper | Use/Adapt/Reference | [key detail] |

#### Recommended Approach
[2-3 sentences — what to use, what to build, why]

#### Key Resources
- [link/name] — [why it's useful]

#### Risks & Considerations
- [anything to watch out for]

---

## Guidelines

- Spend no more than 5-10 minutes on research — this is a quick survey, not a deep dive
- Bias toward reusing existing solutions over building from scratch
- If an existing library solves 80% of the problem, recommend it even if the last 20% needs custom work
- Always check license compatibility — prefer MIT, Apache 2.0, BSD
- For the Gallegos Labs stack (Next.js, React, MongoDB, Express), prefer solutions in the JS/TS ecosystem
- Present findings concisely — the President needs to make a quick decision, not read a thesis
