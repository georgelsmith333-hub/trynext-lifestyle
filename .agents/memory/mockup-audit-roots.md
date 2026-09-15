---
name: Mockup audit roots
description: The editable source-kit manifest and flattened public runtime previews use different filesystem roots.
---

The audit must validate manifest `preview` and `psd` paths relative to `attached_assets/trynext-mockup-source-kit`, while runtime source-kit previews are flattened under `public/mockups/source-kit` and normalized derivatives live under `public/mockups/normalized` and `public/mockups/normalized-cutouts`.

**Why:** Treating the manifest paths as public-runtime paths creates false missing-asset failures even when the source kit and runtime are complete.

**How to apply:** When auditing or regenerating mockups, validate the manifest/source-kit contract separately from the browser-served runtime contract, then compare the document/stem counts.