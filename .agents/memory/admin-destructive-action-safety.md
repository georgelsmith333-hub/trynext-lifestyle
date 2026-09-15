---
name: Admin destructive-action safety
description: Safety and recovery conventions for operator-facing admin mutations
---

Admin mutations that can remove, revoke, repair, flush, or otherwise affect shared
store state should use an explicit confirmation step and keep the initiating control
disabled while that operation is pending. Load and mutation failures must remain
visible with a retry path; they must never collapse into an apparently empty dataset.

**Why:** Admin work is shared and consequential, and a silent request failure can
make an operator repeat an action or misread missing data as a valid empty state.

**How to apply:** Use the existing confirmation-dialog pattern for destructive
actions, track pending state at the smallest useful scope (per row/item when
possible), and render an inline error with a retry action beside affected data.