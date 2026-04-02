# Directed Research Campaign Skill — Spec

**Date:** 2026-04-02

## Overview

The campaign skill teaches OpenClaw how to run a full directed research campaign from a President-provided research question through to final analysis and reporting. Campaigns flow through the Research Pipeline kanban board columns with two human approval gates.

## Campaign Flow

1. **Backlog → To Do**: President creates a card with a research question/objective. OpenClaw picks it up.
2. **To Do → Plan Review**: OpenClaw determines research purpose and objectives from the card context, selects a methodology, and builds a full research plan with methodology-specific artifacts.
3. **Plan Review → Recruiting**: President approves the plan in the dashboard inbox. Card auto-moves.
4. **Recruiting → Outreach Review**: OpenClaw finds potential participants across search surfaces (Reddit, green-lit participant list, future channels) and drafts outreach messages. Skipped for lit reviews.
5. **Outreach Review → Collecting**: President approves outreach. Messages are sent via Reddit API (comments/DMs). Card moves to Collecting.
6. **Collecting → Analysis**: Data is gathered (responses, recordings, search results). Once sufficient data exists, OpenClaw begins analysis.
7. **Analysis → Done**: Executive summary + recommendations delivered to dashboard inbox. Insights saved to insights system. Raw findings logged to findings/raw/.

## Supported Methodologies

### Survey
- Build the survey instrument (questions, scales, response types)
- Target demographic and sample size in the plan
- Distribute via outreach (Reddit DMs, email, green-lit participant list)
- Collect responses, analyze quantitatively and qualitatively

### Literature Review
- Build a keyword/phrase list and research questions to answer
- Search the web and Google Scholar using Playwright MCP
- No participants needed — skip Recruiting and Outreach Review, go straight to Collecting
- Synthesize findings into a structured report

### Unmoderated Task-Based Study
- Build 5-8 tasks for participants to complete
- Create a directions document for participants
- Include the link to the application participants will navigate
- Participants record themselves via screenshare + voice (think-aloud protocol)
- Suggest an appropriate incentive for participation
- Collect recordings, analyze task completion, identify usability issues

## Research Plan Structure

Every campaign plan must include:
- Research purpose (1-2 sentences)
- Research objectives (3-5 specific questions to answer)
- Methodology selected and rationale
- Target participant demographic (if applicable)
- Number of participants (if applicable)
- Methodology-specific artifacts (survey instrument, keyword list, task list + directions doc, etc.)
- Timeline estimate

## Approval Gates

- **Plan Review**: President reviews the full plan in dashboard inbox. Approve → auto-move to Recruiting.
- **Outreach Review**: President reviews drafted outreach messages. Approve → messages sent, card moves to Collecting.
- Both gates use the existing dashboard inbox + approval flow (same pattern as research-plan approval).

## Green-Lit Participant List

When engaging participants across any campaign, if anyone expresses interest in future studies, automatically add them to `gallegos-labs-research/config/greenlit-research-participants.yaml` with:
- Handle/username
- Source platform (reddit, email, etc.)
- Date added
- What they expressed interest in
- Campaign they were part of

This builds a reusable participant panel over time. Future campaigns should check this list first before cold outreach.

## Target Repo
gallegos-labs-agent-staff — `skills/research/campaign.md`
