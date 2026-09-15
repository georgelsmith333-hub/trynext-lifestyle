---
name: Product image maintenance
description: How to update product images in Trynext when they break (404 Unsplash URLs), plus auth quirks
---

## Rule
Product images in the DB use Unsplash placeholder URLs that can go 404 when photos are removed from Unsplash. Always verify image URLs with a HEAD request before considering them valid.

**Products that had broken images (fixed Jun 30 2026):**
- id=2 Graphic Print Tee → `photo-1576566588028-4147f3842f27`
- id=3 Premium Pullover Hoodie → `photo-1611312449408-fcece27cdbb7`

## How to update product images via admin API

The admin API route is `PUT /api/products/:id` (not PATCH).

1. Login: `POST /api/admin/login` → returns `{"token":"..."}` + sets `admin_token` cookie
2. Use `Authorization: Bearer {token}` header — this bypasses CSRF protection (cookies alone are CSRF-blocked; `X-Requested-With` header is not enough for origin mismatch)
3. Must send the FULL product body (PUT, not PATCH), so GET the product first then merge changes

```bash
TOKEN=$(curl -s -X POST "http://localhost:8080/api/admin/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"Administration@Trynexshop"}' | python3 -c "import json,sys; print(json.load(sys.stdin)['token'])")

P=$(curl -s "http://localhost:8080/api/products/3")
P_NEW=$(echo $P | python3 -c "import json,sys; d=json.load(sys.stdin); d['imageUrl']='NEW_URL'; d['images']=['NEW_URL']; print(json.dumps(d))")
curl -s -X PUT "http://localhost:8080/api/products/3" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "$P_NEW"
```

**Why:** Cookie-only auth triggers CSRF origin-mismatch check; Bearer token header is explicitly CSRF-immune per adminAuth.ts layer 1.

**How to apply:** Any time product images need updating (broken URLs, admin can't access panel, bulk updates), use this Bearer-token curl pattern.
