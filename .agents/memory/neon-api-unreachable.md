---
name: Neon API unreachable from Replit
description: Outbound HTTPS to api.neon.tech returns HTTP 000 from the Replit container, so Neon management APIs cannot be used here even with valid API keys.
---

# Neon API unreachable from the Replit container

**Observation:** All outbound HTTPS calls to `https://api.neon.tech/v2/projects` return `HTTP 000` (fetch failed) from the Replit workspace, with or without a valid `Authorization: Bearer <neon-api-key>` header.

**Verified:** Google (`https://www.google.com`) and GitHub API (`https://api.github.com`) both return `200`. Neon API is the only endpoint that fails, suggesting an egress/DNS/TLS block specific to `api.neon.tech`, not a general network outage.

**Implication:** The four Neon API keys saved in Replit Secrets cannot be exercised from this agent for management tasks such as listing projects, creating branches, or resetting endpoints. Direct database connections to Neon endpoints still work (e.g., `ep-crimson-mud` and `ep-cool-mountain` connect fine).

**Why:** If we need to automate Neon management, the code must run in an environment that can reach `api.neon.tech` (e.g., a local machine, CI runner, or Render worker with different egress rules). Using the DB library's failover logic is the reliable in-container strategy.

**How to apply:** Do not rely on `fetch` to `api.neon.tech` from Replit-based code. Keep DB failover logic (periodic re-probe) as the primary mechanism for handling Neon quota/connectivity issues.
