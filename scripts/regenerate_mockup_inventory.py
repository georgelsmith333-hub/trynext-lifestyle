import json
from pathlib import Path
from PIL import Image

ROOT = Path('/home/ubuntu/trynext-lifestyle')
PUBLIC = ROOT / 'artifacts/trynex-storefront/public/mockups'
DOCS = ROOT / 'docs'
FAMILIES = {
    'tshirt': ['white','black','navy','maroon','olive','sky-blue','grey','red'],
    'longsleeve': ['white','black','navy','maroon','olive','grey','red','sky-blue','burgundy','forest'],
    'hoodie': ['white','black','navy','grey','maroon','olive','red','sky-blue','forest','burgundy'],
    'mug': ['white','black','navy','red','green','purple','sky-blue','pink','maroon','orange'],
    'cap': ['white','black','navy','maroon','olive','red','grey','forest'],
    'waterbottle': ['white','black','navy','forest','sky-blue','red','pink','teal'],
}
VIEWS = {
    'tshirt': ['front','back','left-sleeve','right-sleeve','neck-label'],
    'longsleeve': ['front','back','left-sleeve','right-sleeve','neck-label'],
    'hoodie': ['front','back','left-sleeve','right-sleeve','neck-label'],
    'mug': ['front','back','wrap'],
    'cap': ['front','back'],
    'waterbottle': ['front','back'],
}
APPAREL = {'tshirt','longsleeve','hoodie'}

def inspect(path):
    if not path.exists():
        return {'exists': False, 'dimensions': None, 'mode': None, 'alphaValid': False}
    try:
        with Image.open(path) as im:
            rgba = im.convert('RGBA')
            alpha = rgba.getchannel('A')
            return {'exists': True, 'dimensions': list(im.size), 'mode': im.mode, 'alphaValid': alpha.getbbox() is not None and alpha.getextrema()[1] == 255}
    except Exception:
        return {'exists': True, 'dimensions': None, 'mode': None, 'alphaValid': False}

def old_flags(family, color, view):
    source = inspect(PUBLIC/'source-kit-v3'/family/color/(view+'.png'))
    canonical = inspect(PUBLIC/'canonical'/family/color/(view+'.png'))
    normalized = inspect(PUBLIC/'normalized'/family/color/(view+'.png'))
    legacy = inspect(PUBLIC/'legacy'/family/color/(view+'.png'))
    return source['exists'], canonical['exists'], normalized['exists'], legacy['exists']

rows=[]
for family, colors in FAMILIES.items():
    for color in colors:
        for view in VIEWS[family]:
            active = PUBLIC/'smart-v4'/family/color/(view+'.png')
            if family in APPAREL:
                provenance = PUBLIC/'apparel-v5'/family/color/(view+'.png')
                provenance_kind = 'apparel-v5'
                provenance_root = '/mockups/apparel-v5'
            else:
                provenance = active
                provenance_kind = 'smart-v4'
                provenance_root = '/mockups/smart-v4'
            src, canonical, normalized, legacy = old_flags(family,color,view)
            ai=inspect(active); pi=inspect(provenance)
            rows.append({
                'family': family, 'color': color, 'view': view,
                'sourceKey': f'{family}:{color}:{view}',
                'activeExpected': f'/mockups/smart-v4/{family}/{color}/{view}.png',
                'provenancePath': f'{provenance_root}/{family}/{color}/{view}.png',
                'provenanceKind': provenance_kind,
                'activeExists': ai['exists'], 'provenanceExists': pi['exists'],
                'activeDimensions': ai['dimensions'], 'activeMode': ai['mode'], 'activeAlphaValid': ai['alphaValid'],
                'provenanceDimensions': pi['dimensions'], 'provenanceMode': pi['mode'], 'provenanceAlphaValid': pi['alphaValid'],
                # Retained as historical audit fields; these are not active runtime paths.
                'sourceKitV3': src, 'canonical': canonical, 'normalized': normalized, 'legacy': legacy,
            })

summary={}
for family in FAMILIES:
    fr=[r for r in rows if r['family']==family]
    summary[family]={
        'required': len(fr),
        'activeSmartV4': sum(r['activeExists'] for r in fr),
        'missingActiveSmartV4': [f"{r['color']}/{r['view']}" for r in fr if not r['activeExists']],
        'invalidActiveSmartV4': [f"{r['color']}/{r['view']}" for r in fr if not (r['activeDimensions']==[1024,1024] and r['activeMode'] in ('RGBA','LA') and r['activeAlphaValid'])],
        'apparelV5Provenance': sum(r['provenanceKind']=='apparel-v5' and r['provenanceExists'] for r in fr),
        'smartV4Provenance': sum(r['provenanceKind']=='smart-v4' and r['provenanceExists'] for r in fr),
        'missingProvenance': [f"{r['color']}/{r['view']}" for r in fr if not r['provenanceExists']],
        'sourceKitV3Historical': sum(r['sourceKitV3'] for r in fr),
        'canonicalHistorical': sum(r['canonical'] for r in fr),
        'normalizedHistorical': sum(r['normalized'] for r in fr),
        'legacyHistorical': sum(r['legacy'] for r in fr),
    }

inventory={
    'schemaVersion': 2,
    'generatedBy': 'scripts/regenerate_mockup_inventory.py',
    'generatedAt': '2026-08-18',
    'assetRoot': str(PUBLIC),
    'activeRoot': '/mockups/smart-v4',
    'provenanceRoots': {'apparel': '/mockups/apparel-v5', 'otherFamilies': '/mockups/smart-v4'},
    'families': list(FAMILIES),
    'viewsByFamily': VIEWS,
    'summary': summary,
    'rows': rows,
}
(DOCS/'FULL_MOCKUP_MATRIX_INVENTORY_2026-08-17.json').write_text(json.dumps(inventory, indent=2)+'\n')
apparel={
    'schemaVersion': 2,
    'generatedAt': '2026-08-18',
    'output': '/home/ubuntu/trynext-lifestyle/docs/FULL_MOCKUP_MATRIX_INVENTORY_2026-08-17.json',
    'activeRoot': '/mockups/smart-v4',
    'provenanceRoot': '/mockups/apparel-v5',
    'families': ['tshirt','longsleeve','hoodie'],
    'summary': {k:summary[k] for k in APPAREL},
    'rows': [r for r in rows if r['family'] in APPAREL],
}
(DOCS/'APPAREL_REBUILD_INVENTORY_2026-08-17.json').write_text(json.dumps(apparel, indent=2)+'\n')
print(json.dumps({k:summary[k] for k in FAMILIES}, indent=2))
print('Wrote regenerated inventory files')
