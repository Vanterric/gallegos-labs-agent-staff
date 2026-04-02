# Outreach Skill — Spec

**Date:** 2026-04-02

## Overview

The outreach skill teaches OpenClaw how to draft, queue, and (after approval) send outreach messages to potential research participants or community members. It supports multiple channels and integrates with the human approval flow in the President Dashboard.

## Outreach Types

### Contextual Reddit Reply
- Reply to an existing post/comment where the user has expressed a relevant pain point
- Must be genuinely helpful, not promotional spam
- Posted via Reddit API (`POST /api/comment`)

### Reddit Direct Message
- Cold or warm DM to a user identified as a potential participant
- Used for study recruitment or beta invitations
- Sent via Reddit API (`POST /api/compose`)

### Email (Future)
- For participants who've provided email addresses
- Template-based, personalized

## Draft Structure

Outreach drafts are saved as markdown files in `gallegos-labs-research/outreach/drafts/` with frontmatter:

```yaml
---
type: reddit-reply | reddit-dm | email
target_user: u/username
target_url: https://reddit.com/r/... (for replies)
campaign_id: campaign-card-id (if part of a directed campaign)
source: passive-monitoring | directed-campaign
status: draft
created: ISO timestamp
---
```

Body contains the draft message text.

## Approval Flow

1. OpenClaw drafts the message → saves to `outreach/drafts/`
2. Draft appears in President's dashboard inbox (existing pending items flow)
3. President reviews in MD Viewer → approves or dismisses
4. On approval: message is sent via the appropriate API, draft moved to `outreach/sent/`, git committed
5. On dismiss: draft moved to `outreach/dismissed/`

## Reddit API Integration

When Reddit API access is available (pending approval):
- Use OAuth2 with the bot account credentials (u/Shoddy-Gene-7910)
- Comments: `POST /api/comment` with `thing_id` and `text`
- DMs: `POST /api/compose` with `to`, `subject`, `text`
- Read inbox: `GET /message/inbox` for tracking responses
- Credentials stored in `.env` of the research repo

Until API access is approved, drafts are created but sending is manual.

## Green-Lit Participant Tracking

When a recipient responds positively to outreach and expresses interest in future studies:
- Add to `gallegos-labs-research/config/greenlit-research-participants.yaml`
- Fields: handle, platform, date_added, interest_expressed, source_campaign
- Future outreach should check this list first (warm leads before cold outreach)

## Response Monitoring

After outreach is sent, monitor for responses:
- Reddit: poll inbox/unread periodically
- Log responses as findings in `findings/raw/` with `source: outreach-response`
- Surface notable responses in the dashboard inbox

## Target Repo
gallegos-labs-agent-staff — `skills/research/outreach.md`
