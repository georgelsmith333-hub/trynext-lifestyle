---
name: Production Notice Per-Account
description: Production notice dismissal stored per-admin-account via settings API instead of per-device localStorage.
---

## Production Notice Per-Account

The "all changes are live instantly" production notice on the admin dashboard was dismissed per-device via `localStorage`. It was changed to per-account via the settings API:

- **Settings key**: `prodNoticeDismissed` added to `SETTINGS_KEYS` and `buildSettings()`.
- **Frontend read**: `GET /api/settings/prodNoticeDismissed` on mount (per-account, via auth headers).
- **Frontend write**: `PUT /api/settings` with `{ prodNoticeDismissed: "1" }` (per-account).

**Why:** localStorage is per-device/browser — the notice would reappear every time the admin logs in from a different device or clears browser data. Per-account storage is the correct place for user preferences.

**How to apply:** For any admin UI preference that should persist across devices, use the settings API rather than localStorage.
