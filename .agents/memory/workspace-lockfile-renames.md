---
name: Workspace lockfile after renames
description: Why renamed workspace packages can require lockfile reconciliation before clean installs and root checks.
---

After renaming workspace package directories, a frozen install may fail even when the package manifests and lockfile contents look otherwise present: the lockfile can retain stale importer paths or patched-dependency hashes. Run the workspace's normal non-frozen install once to reconcile the lockfile, then rerun a frozen install to verify it is stable.

**Why:** A stale importer map leaves renamed packages without node_modules links, which makes the root typecheck report missing Node/Vite type definitions even though the package manifests declare them.

**How to apply:** Treat the lockfile reconciliation as local dependency setup, inspect the resulting diff for unrelated version changes, and require the subsequent frozen install plus root typecheck to pass before delivery.