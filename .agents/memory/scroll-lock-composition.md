---
name: Body scroll-lock composition across independent overlays
description: Multiple independent overlays (mobile menu, cart drawer, quick-view modal, image lightbox, spin wheel) each toggling document.body.style.overflow directly causes premature unlock bugs.
---

## The bug
`trynext-storefront` had 5 separate components (mobile nav menu, cart drawer, quick-view modal, image lightbox, spin-wheel popup) each independently doing `document.body.style.overflow = 'hidden'` on open and `= ''` on close in their own `useEffect`. If two overlays were ever open at once (e.g. mobile menu open, then cart drawer opened on top), closing the second one reset `overflow` to `''` unconditionally — silently unlocking page scroll even though the first overlay was still open. Also contributed to inconsistent/broken-feeling scroll behavior site-wide, compounded by `html { scroll-behavior: smooth }` in global CSS fighting with the Lenis smooth-scroll library (`useLenis.ts`), which drives scroll via its own rAF loop — two systems fighting over the same scrollTop causes janky/stuck wheel scrolling.

**Why:** Each overlay was built independently without a shared lock primitive, so "did anything else lock scroll?" was never asked before unlocking.

**How to apply:**
- Route all body-scroll-locking overlays through one ref-counted lock helper (`src/lib/scrollLock.ts`: `lockBodyScroll()` returns an `unlock()`; scroll only actually unlocks when the last caller releases). Never set `document.body.style.overflow` directly from a component.
- Don't combine native `scroll-behavior: smooth` with a JS smooth-scroll library (Lenis, etc.) on the same scroll container — pick one.
- Any internal scrollable region inside a fixed-position overlay/dropdown needs `data-lenis-prevent` so the global Lenis instance doesn't capture its wheel events.
