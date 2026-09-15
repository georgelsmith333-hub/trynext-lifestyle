---
name: Backup sync circuit breaker
description: Prevents the DB backup sync from hammering unreachable targets after repeated failures
---

After 3 consecutive sync runs where every target fails, the backup sync pauses itself for 2 hours before trying again instead of retrying every cycle.

**Why:** avoids wasting connection attempts/quota against targets that are down for an extended period (e.g. Neon quota exhaustion), and avoids flooding logs/alerts.

**How to apply:** `getBackupSyncStatus()` (exported from the scheduler) reports whether the breaker is currently open/paused and when it will retry. The admin Backup page surfaces this as a status card, and `GET /api/admin/backup/sync-status` exposes it via API.
