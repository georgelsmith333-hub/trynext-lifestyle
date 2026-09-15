import csv
import json
from pathlib import Path

payload = json.loads(Path('docs/PHASE3_MISSING_PRODUCT_RESTORE_PAYLOAD_2026-08-17.json').read_text())['products']
fields = ['name','slug','description','price','discountPrice','categoryId','imageUrl','sizes','colors','stock','featured','customizable']
with Path('docs/PHASE3_MISSING_PRODUCT_RESTORE_2026-08-17.csv').open('w', newline='', encoding='utf-8') as handle:
    writer = csv.DictWriter(handle, fieldnames=fields)
    writer.writeheader()
    for item in payload:
        row = {key: item.get(key, '') for key in fields}
        row['sizes'] = ';'.join(item.get('sizes') or [])
        row['colors'] = ';'.join(item.get('colors') or [])
        writer.writerow(row)
print(f'wrote {len(payload)} rows')
