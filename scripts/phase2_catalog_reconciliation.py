from pathlib import Path
import collections
import json
import re
import requests

API = "https://trynext.shop"

def fetch_live():
    products = []
    for page in range(1, 20):
        response = requests.get(f"{API}/api/products", params={"limit": 100, "page": page}, timeout=60)
        response.raise_for_status()
        payload = response.json()
        products.extend(payload.get("products", []))
        if page >= payload.get("totalPages", 1):
            break
    return products

def extract_seed():
    source = Path("artifacts/api-server/add-trendy-products.ts").read_text()
    slugs = re.findall(r"slug:\s*['\"]([^'\"]+)['\"]", source)
    names = re.findall(r"name:\s*['\"]([^'\"]+)['\"]", source)
    return slugs, names

live = fetch_live()
seed_slugs, seed_names = extract_seed()
live_slugs = {p.get("slug") for p in live if p.get("slug")}
live_names = {p.get("name") for p in live if p.get("name")}
image_owners = collections.defaultdict(list)
for product in live:
    refs = [product.get("imageUrl")] + list(product.get("images") or [])
    for ref in refs:
        if ref:
            image_owners[ref].append(product.get("slug"))

report = {
    "seed_definition_count": len(seed_slugs),
    "live_api_count": len(live),
    "missing_seed_slugs": [slug for slug in seed_slugs if slug not in live_slugs],
    "missing_seed_names": [name for name in seed_names if name not in live_names],
    "live_duplicate_slugs": {key: count for key, count in collections.Counter(p.get("slug") for p in live).items() if key and count > 1},
    "live_duplicate_names": {key: count for key, count in collections.Counter(p.get("name") for p in live).items() if key and count > 1},
    "shared_image_references": {key: owners for key, owners in image_owners.items() if len(owners) > 1},
    "live_categories": dict(collections.Counter(p.get("categoryName") for p in live)),
}
Path("docs/PHASE2_CATALOG_RECONCILIATION_2026-08-17.json").write_text(json.dumps({"report": report, "live_products": live}, indent=2, ensure_ascii=False))
print(json.dumps(report, indent=2, ensure_ascii=False))
