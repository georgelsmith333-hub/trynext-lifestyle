from pathlib import Path
import json
import re
import requests

API = "https://trynext.shop"
source = Path("artifacts/api-server/add-trendy-products.ts").read_text()
body = source.split("const products = [", 1)[1].split("\n  ];", 1)[0]
blocks = re.findall(r"\{(.*?)\n\s*\},", body, re.S)
products = []
for block in blocks:
    def field(name):
        match = re.search(rf"\b{name}:\s*([\"'])(.*?)\1", block, re.S)
        return match.group(2).strip() if match else None
    name, slug, description, price, discount, image = [field(k) for k in ("name", "slug", "description", "price", "discountPrice", "imageUrl")]
    category_match = re.search(r'categoryId:\s*catMap\["([^"]+)"\]', block)
    if not (name and slug and price and image and category_match):
        continue
    featured = bool(re.search(r"featured:\s*true", block))
    customizable = bool(re.search(r"customizable:\s*true", block))
    tags_match = re.search(r"tags:\s*\[([^\]]*)\]", block, re.S)
    tags = re.findall(r"[\"']([^\"']+)[\"']", tags_match.group(1)) if tags_match else []
    asset = Path("artifacts/trynex-storefront/public") / image.lstrip("/")
    products.append({
        "name": name, "slug": slug, "description": description, "price": float(price),
        "discountPrice": float(discount) if discount else None, "categorySlug": category_match.group(1),
        "imageUrl": image, "images": [image], "sizes": ["S", "M", "L", "XL", "XXL"],
        "colors": ["White", "Black", "Navy", "Grey"], "stock": 100,
        "featured": featured, "customizable": customizable, "tags": tags,
        "assetExists": asset.exists(),
    })

live = []
for page in range(1, 20):
    payload = requests.get(f"{API}/api/products", params={"limit": 100, "page": page}, timeout=60).json()
    live.extend(payload.get("products", []))
    if page >= payload.get("totalPages", 1):
        break
live_slugs = {p.get("slug") for p in live}
categories_payload = requests.get(f"{API}/api/categories", timeout=60).json()
category_rows = categories_payload.get("categories", categories_payload if isinstance(categories_payload, list) else [])
category_ids = {str(c.get("slug")): c.get("id") for c in category_rows}
missing = []
errors = []
for product in products:
    if product["slug"] in live_slugs:
        continue
    if not product["assetExists"]:
        errors.append(f"missing_asset:{product['slug']}:{product['imageUrl']}")
        continue
    category_id = category_ids.get(product.pop("categorySlug"))
    if not category_id:
        errors.append(f"missing_category:{product['slug']}")
        continue
    product["categoryId"] = category_id
    product.pop("assetExists", None)
    missing.append(product)
if errors:
    raise SystemExit("\n".join(errors))
Path("docs/PHASE3_MISSING_PRODUCT_RESTORE_PAYLOAD_2026-08-17.json").write_text(json.dumps({"count": len(missing), "products": missing}, indent=2, ensure_ascii=False))
print(json.dumps({"seed_products": len(products), "live_products": len(live), "missing_restore_count": len(missing), "categories": category_ids}, indent=2))
