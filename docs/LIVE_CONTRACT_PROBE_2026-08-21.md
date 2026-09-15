# Fresh Live Contract Probe — 2026-08-21

The sandbox curl pass at approximately 00:06 UTC encountered `SSL_ERROR_SYSCALL` for most public and direct Render URLs, matching earlier transient sandbox network behavior. This result is classified as **BLOCKED for the shell path**, not as proof that the public service is down.

One request completed successfully during the same pass: public `GET /api/health/liveness` returned HTTP 200 through Cloudflare with `x-trynext-origin: trynex-api-standby-2.onrender.com`, `runtimeRole: standby`, and `status: ok`. The response also included the expected CORS and security headers.

The browser route audit remains the authoritative customer-path evidence for the public pages. A smaller browser/API probe is required for the remaining endpoint matrix because the previous all-in-one browser script exceeded the 30-second browser execution limit.
