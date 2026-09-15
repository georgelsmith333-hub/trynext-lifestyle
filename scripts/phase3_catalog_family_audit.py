import json
import urllib.request

API = 'https://trynext.pages.dev'
def get(path):
    with urllib.request.urlopen(API + path, timeout=45) as response:
        return json.load(response)

categories = get('/api/categories')
products = get('/api/products?limit=100')
if isinstance(categories, dict):
    categories = categories.get('categories', categories.get('data', []))
if isinstance(products, dict):
    products = products.get('products', products.get('data', []))
print('category_count', len(categories))
print('product_count', len(products))
for c in categories:
    print('CATEGORY', c.get('id'), c.get('name'), c.get('slug'), c.get('productCount'))
print('PRODUCT_FAMILY_COUNTS')
counts = {}
missing_images = []
for p in products:
    c = str(p.get('categorySlug') or p.get('category') or p.get('categoryName') or p.get('category_id') or 'unknown').lower()
    counts[c] = counts.get(c, 0) + 1
    if not (p.get('imageUrl') or p.get('image_url') or p.get('images')):
        missing_images.append((p.get('id'), p.get('slug')))
for k, v in sorted(counts.items()):
    print('FAMILY', k, v)
print('missing_image_records', missing_images)
print('sample_slugs', sorted(p.get('slug') for p in products if p.get('slug')))
