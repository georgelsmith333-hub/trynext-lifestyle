from pathlib import Path
from PIL import Image
import hashlib, json, shutil

ROOT = Path('/home/ubuntu/trynext-release/artifacts/trynex-storefront/public/mockups')
SRC = ROOT / 'normalized-cutouts'
OUT = ROOT / 'source-kit-v3'
META = OUT / 'manifests'

COLORS = {
    'tshirt': ['white','black','navy','maroon','olive','sky-blue','grey','red'],
    'longsleeve': ['white','black','navy','maroon','olive','grey','red','sky-blue','burgundy','forest'],
    'hoodie': ['white','black','navy','grey','maroon','olive','red','sky-blue','forest','burgundy'],
    'mug': ['white','black','navy','red','green','purple','sky-blue','pink','maroon','orange'],
    'cap': ['white','black','navy','maroon','olive','red','grey','forest'],
    'waterbottle': ['white','black','navy','forest','sky-blue','red','pink','teal'],
}

SPECIAL = {
    ('tshirt','black','front'): 'black-tshirt-front-cutout.png',
    ('tshirt','black','back'): 'black-tshirt-back-cutout.png',
    ('longsleeve','black','front'): 'black-longsleeve-front-cutout.png',
    ('longsleeve','black','back'): 'black-longsleeve-back-cutout.png',
    ('longsleeve','white','front'): 'white-longsleeve-front-cutout-real.png',
    ('longsleeve','white','back'): 'white-longsleeve-back-cutout-real.png',
    ('hoodie','black','front'): 'black-hoodie-front-cutout-real.png',
    ('hoodie','black','back'): 'black-hoodie-back-cutout-real.png',
    ('hoodie','white','front'): 'white-hoodie-front-cutout-real.png',
    ('hoodie','white','back'): 'white-hoodie-back-cutout-real.png',
    ('mug','white','front'): 'white-mug-front-cutout.png',
    ('cap','white','front'): 'white-cap-front-cutout.png',
    ('waterbottle','white','front'): 'white-waterbottle-front-cutout.png',
}

def source_for(category, color, face):
    special = SPECIAL.get((category, color, face))
    if special:
        return SRC / special
    return SRC / f'{category}-{color}-{face}.png'

def sha256(path):
    h=hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1024*1024), b''):
            h.update(chunk)
    return h.hexdigest()

if OUT.exists():
    for p in OUT.iterdir():
        if p.is_dir(): shutil.rmtree(p)
        else: p.unlink()
OUT.mkdir(parents=True, exist_ok=True)
META.mkdir(parents=True, exist_ok=True)

rows=[]
for category, colors in COLORS.items():
    for color in colors:
        for face in ('front','back'):
            src=source_for(category,color,face)
            if not src.exists():
                raise FileNotFoundError(f'Missing source for {category}/{color}/{face}: {src}')
            dest=OUT/category/color/f'{face}.png'
            dest.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src,dest)
            with Image.open(dest) as im:
                rgba=im.convert('RGBA')
                alpha=rgba.getchannel('A')
                bbox=alpha.getbbox()
                if not bbox or alpha.getextrema()[0] != 0 or any(alpha.getpixel(pt) != 0 for pt in [(0,0),(rgba.width-1,0),(0,rgba.height-1),(rgba.width-1,rgba.height-1)]):
                    raise ValueError(f'Invalid transparency for {dest}')
                manifest={
                    'schema':'trynext-smart-mockup/v3',
                    'sourceKitKey':f'{category}:{color}:{face}',
                    'category':category,
                    'colorSlug':color,
                    'face':face,
                    'sourceFile':str(src.relative_to(ROOT)),
                    'cutoutSrc':f'/mockups/source-kit-v3/{category}/{color}/{face}.png',
                    'editableMasterPath':f'attached_assets/trynext-mockup-source-kit/psb/{category}-{color}-{face}.psb' if category in ('mug','waterbottle') else f'attached_assets/trynext-mockup-source-kit/psd/{category}-{color}-{face}.psd',
                    'masterStatus':'manifest-only',
                    'size':list(rgba.size),
                    'alphaBBox':list(bbox),
                    'sha256':sha256(dest),
                    'sourceSelection':'special-clean-cutout' if (category,color,face) in SPECIAL else 'normalized-cutout',
                }
                (META/f'{category}-{color}-{face}.json').write_text(json.dumps(manifest, indent=2)+'\n')
                rows.append(manifest)
summary={'schema':'trynext-smart-mockup/v3','assetCount':len(rows),'categories':COLORS,'assets':rows}
(OUT/'manifest-index.json').write_text(json.dumps(summary, indent=2)+'\n')
print(json.dumps({'output':str(OUT),'assetCount':len(rows),'manifestCount':len(list(META.glob('*.json'))),'specialCount':sum(1 for r in rows if r['sourceSelection']=='special-clean-cutout')}, indent=2))
