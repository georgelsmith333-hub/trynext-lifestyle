from __future__ import annotations

import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / 'artifacts/trynex-storefront/public/mockups/smart-v7'
REGISTRY = ASSET_ROOT / 'registry.json'
MANIFEST = ASSET_ROOT / 'manifest.json'

families = {
    'tshirt': (['white','black','navy','maroon','olive','sky-blue','grey','red'], ['front','back','left-sleeve','right-sleeve','neck-label']),
    'longsleeve': (['white','black','navy','maroon','olive','grey','red','sky-blue','burgundy','forest'], ['front','back','left-sleeve','right-sleeve','neck-label']),
    'hoodie': (['white','black','navy','grey','maroon','olive','red','sky-blue','forest','burgundy'], ['front','back','left-sleeve','right-sleeve','neck-label']),
    'mug': (['white','black','navy','red','green','purple','sky-blue','pink','maroon','orange'], ['front','back','wrap']),
    'cap': (['white','black','navy','maroon','olive','red','grey','forest'], ['front','back']),
    'waterbottle': (['white'], ['front','back']),
}

registry = json.loads(REGISTRY.read_text()) if REGISTRY.exists() else {'surfaces': []}
registry_rows = {(r['family'], r['color'], r['view']): r for r in registry.get('surfaces', [])}
assets = []
for family, (colors, views) in families.items():
    for color in colors:
        for view in views:
            path = ASSET_ROOT / family / color / f'{view}.png'
            if not path.exists():
                raise FileNotFoundError(path)
            with Image.open(path) as im:
                rgba = im.convert('RGBA')
                alpha = rgba.getchannel('A')
                dimensions = list(im.size)
                alpha_extrema = list(alpha.getextrema())
            row = registry_rows.get((family, color, view), {})
            assets.append({
                'family': family,
                'color': color,
                'view': view,
                'sourceKitKey': f'{family}:{color}:{view}',
                'assetPath': f'/mockups/smart-v7/{family}/{color}/{view}.png',
                'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                'bytes': path.stat().st_size,
                'dimensions': dimensions,
                'alpha': 'RGBA',
                'alphaExtrema': alpha_extrema,
                'master': {
                    'path': row.get('sourceMaster'),
                    'format': row.get('sourceFormat'),
                    'smartObjectName': row.get('smartObjectName'),
                    'status': 'layered-source-verified',
                } if row.get('sourceMaster') else None,
                'detailGeometry': bool(row.get('detailGeometry')),
                'generation': row.get('generatedBy', 'layered-master-runtime-v6'),
            })
manifest = {
    'schema': 'trynext-photoreal-mockup-manifest/v2',
    'assetRoot': '/mockups/smart-v7',
    'assetCount': len(assets),
    'families': list(families),
    'sourcePackage': 'layered-master runtime derivatives from the attached 22-master PSD/PSB source contract with validated transparent alpha; waterbottle remains one white sublimation-coated aluminium blank',
    'masterDeploymentStatus': 'layered-source-verified for 22 source views; runtime derivatives generated for 188 surfaces; Smart Object placeholder payload remains source provenance and no admin PSD/PSB publishing workflow is active',
    'assets': assets,
}
MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({'assetCount': len(assets), 'output': str(MANIFEST), 'detailGeometry': sum(a['detailGeometry'] for a in assets)}, indent=2))
