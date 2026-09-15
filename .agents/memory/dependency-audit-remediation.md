---
name: Dependency audit remediation
description: Keep workspace-wide security overrides and coordinated editor/generator upgrades compatible with generated clients.
---

Workspace dependency advisories can span direct build tools and transitive runtime-adjacent packages. Remediate them with patched same-major overrides where possible, upgrade tightly coupled direct packages together, regenerate generated clients when their generator changes, and rerun every workspace check before declaring the audit clean.

**Why:** A clean application test run does not prove the dependency graph is safe; the audit can report vulnerable packages that are not exercised by the main storefront build.

**How to apply:** Inspect the resolved lockfile and package ownership, prefer one workspace override for shared transitive packages, and treat generator/editor major upgrades as a compatibility change requiring typechecks, tests, and builds.