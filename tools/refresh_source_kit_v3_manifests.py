from pathlib import Path
from PIL import Image
import hashlib, json
ROOT=Path('/home/ubuntu/trynext-release/artifacts/trynex-storefront/public/mockups/source-kit-v3')
rows=[]
for path in sorted(ROOT.glob('*/*/*.png')):
    family,color,face=path.relative_to(ROOT).parts
    with Image.open(path) as im:
        rgba=im.convert('RGBA')
        alpha=rgba.getchannel('A')
        bbox=alpha.getbbox()
        h=hashlib.sha256(path.read_bytes()).hexdigest()
    mp=ROOT/'manifests'/f'{family}-{color}-{face[:-4]}.json'
    data=json.loads(mp.read_text())
    data.update({'size':list(rgba.size),'alphaBBox':list(bbox) if bbox else None,'sha256':h,'postProcess':'alpha-edge-cleaned; detailed-back-recolor where applicable'})
    mp.write_text(json.dumps(data,indent=2)+'\n')
    rows.append(data)
index=json.loads((ROOT/'manifest-index.json').read_text())
index['assets']=rows
index['assetCount']=len(rows)
(ROOT/'manifest-index.json').write_text(json.dumps(index,indent=2)+'\n')
print(f'refreshed {len(rows)} manifests')
