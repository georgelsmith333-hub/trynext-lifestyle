---
name: Agent handoff protocol
description: Project-level rules for carrying durable context across new chats and remixes.
---

The project uses file-based Agent continuity rather than relying on private chat
history. Replit automatically reads `replit.md`, and that file is copied into
Remixes, so the default instruction is placed there as well as in the detailed
rules. Every new Agent must read the operating rules, handoff record, and project
README; report the current checkpoint and remaining work before editing; submit
a plan; preserve existing behavior; reconcile parallel work; and update the
handoff with the exact stopping point and next safe action before pausing or
finishing.

**Why:** Private Agent conversations do not transfer reliably across remixes or
new chats, so the durable project state must be explicit, reviewable, and safe
to copy without secrets.

**How to apply:** Treat `AGENTS.md`, `AGENT_HANDOFF.md`, and `replit.md` as the
first-read project context. Keep the short default instruction in `replit.md`
because Replit reads it automatically. Never infer unfinished work from old chat
history when the handoff record is available. This is a strong project default,
not a platform-level guarantee that an Agent can never ignore instructions.