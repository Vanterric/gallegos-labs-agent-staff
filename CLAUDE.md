# Gallegos Labs Agent Staff

This is the orchestration layer for Gallegos Labs. It contains no application
code — only Claude Code skills, agent prompt templates, and project configuration.

## Key Files
- staff-projects.yaml — project manifest, source of truth for what exists
- skills/staff/staff.md — the /staff skill entry point

## Conventions
- All paths in the manifest are relative to this repo's root
- Agent prompts in skills/staff/prompts/ use {{variable}} placeholders
- The kanban API runs at the URL specified in staff-projects.yaml
- Skills are markdown files that Claude Code reads and follows as instructions

## Working With Other Projects
When dispatching agents to work on other projects (Nimbus, kanban, etc.),
always read that project's CLAUDE.md first to respect its conventions.

## Kanban API
- Base URL: see `kanban.api_url` in staff-projects.yaml
- Auth: Bearer token from .env (KANBAN_BOT_TOKEN)
- All mutations return a new boardVersion — always use the latest version for move operations
