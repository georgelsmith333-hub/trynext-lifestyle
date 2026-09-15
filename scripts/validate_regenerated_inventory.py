import json
from pathlib import Path
from PIL import Image
ROOT=Path('/home/ubuntu/trynext-lifestyle')
PUBLIC=ROOT/'artifacts/trynex-storefront/public/mockups'
files=['docs/FULL_MOCKUP_MATRIX_INVENTORY_2026-08-17.json','docs/APPAREL_REBUILD_INVENTORY_2026-08-17.json']
errors=[]
for fn in files:
 data=json.loads((ROOT/fn).read_text())
 rows=data['rows']
 for r in rows:
  if 'source-kit-v3' in r['activeExpected']:
   errors.append(f'{fn}: stale activeExpected {r["sourceKey"]}')
  active=ROOT/'artifacts/trynex-storefront/public'/r['activeExpected'].lstrip('/')
  prov=ROOT/'artifacts/trynex-storefront/public'/r['provenancePath'].lstrip('/')
  if not active.exists(): errors.append(f'{fn}: missing active {r["sourceKey"]}')
  if not prov.exists(): errors.append(f'{fn}: missing provenance {r["sourceKey"]}')
  if r['activeExists'] != active.exists(): errors.append(f'{fn}: active flag mismatch {r["sourceKey"]}')
  if r['provenanceExists'] != prov.exists(): errors.append(f'{fn}: provenance flag mismatch {r["sourceKey"]}')
  if active.exists():
   with Image.open(active) as im:
    if list(im.size) != r['activeDimensions']: errors.append(f'{fn}: dimensions mismatch {r["sourceKey"]}')
  if r['family'] in {'tshirt','longsleeve','hoodie'} and r['provenanceKind'] != 'apparel-v5': errors.append(f'{fn}: apparel provenance mismatch {r["sourceKey"]}')
 print(fn, 'rows=',len(rows), 'stale_active_paths=',sum('source-kit-v3' in r['activeExpected'] for r in rows), 'errors=',len(errors))
if errors:
 print('\n'.join(errors)); raise SystemExit(1)
print('VALIDATION PASSED: no stale active paths, no missing files, no flag mismatches')
