---
name: DesignStudio desktop drag fix
description: The useGesture drag config had pointer:{touch:true} which broke all mouse drag on desktop. Fix and wheel-zoom pattern documented here.
---

## The Bug
`useGesture` in DesignStudio.tsx had `drag: { filterTaps: true, pointer: { touch: true }, threshold: 1 }`.
`pointer: { touch: true }` restricts drag events to touch-only — breaking mouse drag entirely on desktop.

## The Fix
Changed to `drag: { filterTaps: true, threshold: 1, pointer: { buttons: [1] } }`.
`pointer: { buttons: [1] }` = left mouse button only; still works with touch.

**Why:** The original config was probably added to prevent accidental drag on desktop, but it overcorrected — no mouse interaction worked at all.

**How to apply:** Any time `useGesture` drag is touch-only, this is the fix. Do NOT use `pointer: { touch: true }` unless you genuinely want to exclude mouse events.

## JSX prop-spread-override regression (recurring)
A second, separate drag-breaking bug hit the same canvas element later: `<motion.svg {...bindCanvasGestures()} onPointerDown={handleSvgPointerDown}>` — JSX merges spread props by last-key-wins, so the explicit `onPointerDown` written after the spread completely replaced `useGesture`'s own `onPointerDown` handler (confirmed via `@use-gesture/react` source: that key is what starts its internal drag/pinch state machine). Selection still worked (a separate click handler), but drag/pinch silently never initialized.

**Why:** Easy to reintroduce — anyone adding a new pointer/click handler to the same element as a spread gesture-binding prop object will silently clobber it, with no error, no lint warning, just "drag doesn't work."

**How to apply:** Never add an explicit `onPointerDown`/`onPointerMove`/etc. to an element that also spreads `bind...()` from `@use-gesture/react` (or similar libs). Compose instead: call your own handler, then call the spread object's same-named handler (e.g. `bindCanvasGestures().onPointerDown?.(e)`), or merge props explicitly before spreading.

## Desktop Wheel Zoom Pattern
Added `handleCanvasWheel` on the canvas SVG `onWheel` prop:
- Guard `deltaY === 0` (no-op for zero delta, common on trackpads)
- Wheel over a layer (without Ctrl) → scale that layer; debounced `commitLayers` (350ms) for undo history
- Wheel on empty canvas (or Ctrl+Wheel) → zoom canvas viewport (canvasZoomRef, canvasPanRef)
- Clamped: layer scale 0.05–8, canvas zoom 0.4–4
- Reset pan when zoom ≤ 1
