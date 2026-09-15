---
name: Redis and readiness
description: Explain the optional Redis cache fallback and why database readiness can remain healthy during a Redis outage.
---

Redis is a disposable performance cache, not the persistence layer. When the configured provider is unavailable, the API keeps short-lived values in an in-process map; restarting the API clears only that cache, not PostgreSQL data.

**Why:** Operators need to distinguish a cache-provider degradation from an application-readiness failure. The health endpoint reports both, while readiness intentionally gates on the database required to serve requests.

**How to apply:** Treat `/api/healthz` with Redis error as degraded-but-serving, and use `/api/health/readiness` to determine whether the API can serve database-backed traffic. Repair or rotate the Redis provider credentials separately; do not migrate persistent data to Redis.