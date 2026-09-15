---
name: Metro image-size remediation
description: How to replace Metro's vulnerable image-size graph edge without breaking asset dimension detection.
---

Metro imports image-size directly and passes both buffers and file paths while recognizing several image formats. A local parser should be namespaced and Metro should be patched to import it directly; an override keyed as image-size can still be reported as vulnerable by dependency scanners even when it points to safe code.

**Why:** The package manager and runtime can resolve a local override correctly while a platform scanner still identifies the original dependency key and reports the upstream advisories.

**How to apply:** Keep the bounded parser outside runtime public assets, patch every Metro version in the lock graph, remove upstream image-size from the lockfile, and verify Expo export plus both local and platform security checks.