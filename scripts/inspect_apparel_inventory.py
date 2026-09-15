import json
from pathlib import Path
from collections import Counter, defaultdict
from PIL import Image

ROOT = Path('/home/ubuntu/trynext-lifestyle')
DOCS = ROOT / 'docs'
PUBLIC = ROOT / 'artifacts/trynex-storefront/public/mockups'
DIST = ROOT / 'artifacts/trynex-storefront/dist/mockups'
FAMILIES = {
    'tshirt': ['white','black','navy','maroon','olive','sky-blue','grey','red'],
    'longsleeve': ['white','black','navy','maroon','olive','grey','red','sky-blue','burgundy','forest'],
    'hoodie': ['white','black','navy','grey','maroon','olive','red','sky-blue','forest','burgundy'],
}
VIEWS = ['front','back','left-sleeve','right-sleeve','neck-label']

def load(name):
    with open(DOCS/name) as f: return json.load(f)

def asset_info(path):
    try:
        with Image.open(path) as im:
            rgba = im.convert('RGBA')
            a = rgba.getchannel('A')
            hist = a.histogram()
            bbox = a.getbbox()
            return {'exists': True, 'size': im.size, 'mode': im.mode, 'alpha_min': next((i for i,v in enumerate(hist) if v), None), 'alpha_max': max((i for i,v in enumerate(hist) if v), default=None), 'alpha_0': hist[0], 'alpha_255': hist[255], 'bbox': bbox}
    except Exception as e:
        return {'exists': False, 'error': str(e)}

out = {'inventory_consistency': {}, 'filesystem': {}, 'duplicates': {}, 'visual_metrics': {}}
a = load('APPAREL_REBUILD_INVENTORY_2026-08-17.json')
b = load('FULL_MOCKUP_MATRIX_INVENTORY_2026-08-17.json')
for key in ['tshirt','longsleeve','hoodie']:
    out['inventory_consistency'][key] = {
        'summary_equal': a['summary'][key] == b['summary'][key],
        'rebuild_summary': a['summary'][key],
        'matrix_summary': b['summary'][key],
    }
    expected = [f'{fam}/{color}/{view}' for fam, colors in FAMILIES.items() if fam == key for color in colors for view in VIEWS]
    files = []
    hashes = {}
    for color in FAMILIES[key]:
        for view in VIEWS:
            p5 = PUBLIC / 'apparel-v5' / key / color / f'{view}.png'
            p4 = PUBLIC / 'smart-v4' / key / color / f'{view}.png'
            info5 = asset_info(p5)
            info4 = asset_info(p4)
            files.append((color, view, info5, info4))
            if info5.get('exists'):
                import hashlib
                hashes[f'{color}/{view}'] = hashlib.sha256(p5.read_bytes()).hexdigest()
    out['filesystem'][key] = files
    out['duplicates'][key] = {'unique_hashes': len(set(hashes.values())), 'total': len(hashes), 'hash_collisions': {h:[k for k,v in hashes.items() if v==h] for h in set(hashes.values()) if list(hashes.values()).count(h)>1}}
    # compact metrics for comparing views/colors
    metrics = {}
    for color, view, i5, i4 in files:
        p = PUBLIC/'apparel-v5'/key/color/f'{view}.png'
        if i5.get('exists'):
            metrics[f'{color}/{view}'] = {'size': i5['size'], 'mode': i5['mode'], 'alpha_bbox': i5['bbox'], 'alpha_0': i5['alpha_0'], 'alpha_255': i5['alpha_255']}
    out['visual_metrics'][key] = metrics

# actual smart-v4 hash/path equality against v5
for key in FAMILIES:
    if key not in out['filesystem']: continue
    comparisons=[]
    for color in FAMILIES[key]:
        for view in VIEWS:
            p5=PUBLIC/'apparel-v5'/key/color/f'{view}.png'
            p4=PUBLIC/'smart-v4'/key/color/f'{view}.png'
            comparisons.append({'surface':f'{color}/{view}','v5_exists':p5.exists(),'v4_exists':p4.exists(),'byte_equal':p5.exists() and p4.exists() and p5.read_bytes()==p4.read_bytes()})
    out['filesystem'][key+'_promotion'] = comparisons

print(json.dumps(out, indent=2, default=str))
Path('/tmp/apparel_inventory_inspection.json').write_text(json.dumps(out, indent=2, default=str))
print('\nWROTE /tmp/apparel_inventory_inspection.json')
for k,v in out['inventory_consistency'].items(): print(k, 'summary_equal=', v['summary_equal'])
for k,v in out['duplicates'].items(): print(k, 'unique/total=', v['unique_hashes'], '/', v['total'], 'collisions=', len(v['hash_collisions']))
for k in FAMILIES:
    if k in out['filesystem']:
        fs=out['filesystem'][k]
        print(k, 'v5_missing=', sum(not x[2].get('exists') for x in fs), 'v4_missing=', sum(not x[3].get('exists') for x in fs), 'bad_size=', sum(x[2].get('exists') and x[2].get('size')!=(1024,1024) for x in fs), 'bad_alpha=', sum(x[2].get('exists') and (x[2].get('mode') not in ('RGBA','LA') or x[2].get('alpha_max') != 255) for x in fs))
    promo=out['filesystem'].get(k+'_promotion',[])
    print(k, 'v5_to_v4_byte_equal=', sum(x['byte_equal'] for x in promo), '/', len(promo))
  
