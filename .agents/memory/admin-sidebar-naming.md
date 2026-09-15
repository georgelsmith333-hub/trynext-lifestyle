---
name: Admin Sidebar Naming
description: Page Builder renamed to Layout Builder in admin sidebar; Page Designer (theme/sections) vs Layout Builder (drag-drop section order) are different tools.
---

## Admin Sidebar Naming

The admin sidebar has two different tools:
- **Page Designer** (`/admin/designer`) — theme & testimonial editing, featured products management, visual section toggles.
- **Page Builder** (`/admin/page-builder`) — drag-and-drop layout section ordering.

"Page Builder" was renamed to "**Layout Builder**" in the sidebar to differentiate it from Page Designer. The route stays `/admin/page-builder`.

**Why:** Both names were too similar and confused admins about which tool to use.

**How to apply:** The naming is consistent across the sidebar MENU_GROUPS in AdminLayout.tsx. No other references need updating.
