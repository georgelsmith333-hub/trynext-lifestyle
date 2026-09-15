---
name: Admin Roles Page
description: /admin/roles page for viewing and revoking admin sessions; sidebar entry under System group.
---

## Admin Roles Page

The `AdminRoles.tsx` page shows a table of all admin sessions with columns: ID, role, created date, last used, user agent, IP, status (active/expired/revoked), and revoke action.

- **Route**: `/admin/roles`
- **Sidebar**: Under "System" group, between "Security" and "Tech Stack", using the `Shield` icon
- **Data source**: `GET /api/admin/sessions` — returns list of `adminSessions` rows
- **Revoke action**: `DELETE /api/admin/sessions/:id`

The page also includes an informational callout explaining that all admins currently share the single `admin` role and that RBAC can be extended in the future.

**Why:** Previously there was no way for admins to view or manage active sessions from the admin panel.

**How to apply:** The `adminSessionsTable` has a `role` column (default `"admin"` with a CHECK constraint), but no full RBAC system exists yet. To add granular permissions, start by adding a permissions column to `adminsTable` in the DB schema.
