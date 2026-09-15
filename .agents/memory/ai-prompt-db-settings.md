---
name: AI System Prompt in DB Settings
description: The AI Developer system prompt is stored in DB settings (key `aiSystemPrompt`) and editable from the admin panel. Server still uses hardcoded DEVELOPER_SYSTEM_PROMPT as fallback.
---

## AI System Prompt in DB Settings

The AI Developer chat in the admin panel used a hardcoded `TRYNEXT_SYSTEM` constant (834-line string) at the top of `AdminAIDeveloper.tsx`. This was changed to read from DB settings:

- **Server side** (`routes/ai.ts`): The `POST /api/ai/developer/chat` endpoint accepts an optional `systemPrompt` field in the body. When not provided, it falls back to the hardcoded `DEVELOPER_SYSTEM_PROMPT` constant. The frontend can send the DB-stored prompt.
- **Settings side** (`routes/settings.ts`): Added `"aiSystemPrompt"` to `SETTINGS_KEYS` and `buildSettings()`. Returns empty string by default, meaning "use the server default."
- **Frontend** (`AdminAIDeveloper.tsx`): On mount, fetches `GET /api/settings/aiSystemPrompt` and populates `systemPrompt` state. A "Save to Settings" button calls `PUT /api/settings` with `{ aiSystemPrompt }`.
- The hardcoded `TRYNEXT_SYSTEM` constant remains as the frontend's reset-default fallback.

**Why:** Previously, the admin had no way to customize the AI Developer's behavior without editing code. This makes it configurable at runtime.

**How to apply:** If any other feature needs a user-configurable system prompt, use the same pattern: add a key to `SETTINGS_KEYS`, read it via `GET /api/settings/:key`, and persist via `PUT /api/settings`.
