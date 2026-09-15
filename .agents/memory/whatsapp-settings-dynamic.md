---
name: WhatsApp/phone number — dynamic from settings
description: All customer-facing WhatsApp links read from siteSettings.whatsappNumber || siteSettings.phone with "8801903426915" as last-resort fallback.
---

## Rule
Never hardcode `8801903426915` (or any phone/WhatsApp number) directly in component JSX or logic. Always resolve from `useSiteSettings()` (storefront) or a `useQuery(["siteSettings"], api.getSettings)` call (mobile).

**Why:** The support number is configurable by the admin via Settings; hardcoding it breaks multi-tenant staging, future number changes, and bypasses the admin-controlled contact flow.

**How to apply:**
- Storefront function components: `const { whatsappNumber, phone } = useSiteSettings();` then `(whatsappNumber || phone || "8801903426915").replace(/[^0-9]/g, "")`
- Storefront class components: not possible to use hooks — use the literal string as a last-resort constant and add a TODO comment
- Mobile: `const { data: siteSettings } = useQuery({ queryKey: ["siteSettings"], queryFn: () => api.getSettings(), staleTime: 5*60*1000 });` then `(siteSettings?.whatsappNumber || siteSettings?.phone || "8801903426915").replace(/[^0-9]/g, "")`
- Module-level functions that need the number (e.g. in Expo screens): accept it as a parameter with the fallback as default, and pass it from the component where settings are available.
