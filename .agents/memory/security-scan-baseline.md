---
name: Security scan baseline & false-positive patterns
description: Recurring SAST false-positive shapes in this codebase, and a dependency-override gotcha — check before re-investigating from scratch
---

Full audit pass on 2026-07-28 (`runDependencyAudit` + `runSastScan` + `runHoundDogScan`) found the codebase in good shape. Notes so a future scan doesn't re-litigate the same lines:

## Recurring SAST false positives in this codebase

- **Weak-crypto (SHA-1) in `totp.ts`**: required by RFC 4226/6238 for authenticator-app (Google Authenticator etc.) compatibility — this is correct usage, not a vulnerability. Do not "fix" by switching hash algorithms; it will break TOTP codes.
- **Session-fixation flags on `res.cookie(...)` calls in `admin.ts`**: false positive when the token being set was generated server-side (e.g. via `createAdminSession()`), not derived from request input. Check where the token value actually comes from before treating the flag as real.
- **Path-traversal flags on `fs.writeFileSync`/`path.join` in `objectStorage.ts` and `ai.ts`**: false positive whenever the filename component is either (a) built from `randomUUID()` plus a whitelisted extension, never raw user input, or (b) explicitly sanitized (e.g. stripping `..` sequences) earlier in the same function. SAST tools flag the sink pattern without tracing sanitization/generation happening a few lines earlier — always read the actual variable construction before accepting the flag.

**Why this matters:** re-verifying the same false positives from scratch every audit wastes time; the pattern (UUID-generated filenames, server-generated tokens, pre-sanitized paths) is consistent across this codebase's file-handling code.

## Dependency-override gotcha

An override entry existing in `package.json`'s `pnpm.overrides` does **not** guarantee a flagged vulnerability is actually fixed — it only guarantees pnpm resolves to *some* pinned version. Found and fixed a real case: overrides for `brace-expansion@1` and `brace-expansion@2` were pinned to `^1.1.16` / `^2.1.2`, which are themselves the exact vulnerable versions the audit was flagging (CVE-2026-14257) — the override was resolving the conflict, not the security issue. The audit's own fix data (`version: "5.0.8"` for both) showed the real fix required jumping to the 5.x line for every major.

**How to apply:** when auditing, always check what version an existing override actually *targets*, not just whether an override exists for that package. Re-run `pnpm why -r <pkg>` after any override change to confirm the vulnerable version no longer resolves anywhere in the tree, then re-run the dependency audit to confirm.

## Audit-tracker staleness

`PROJECT_REBUILD_TRACKER/` (phase docs + `CRITICAL_FINDINGS.md`) is a prior self-audit checklist. Several items still marked open/in-progress there were independently re-verified as already fixed in current code (e.g. mobile design-upload-to-object-storage, hardcoded WhatsApp numbers, CF proxy fail-closed behavior, admin sidebar naming). Treat the tracker as a starting checklist, not ground truth — always re-verify against current code before reporting an old finding as still open or re-fixing something already fixed.
