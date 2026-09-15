from pathlib import Path
from collections import deque
from PIL import Image
import numpy as np, json
ROOT=Path('/home/ubuntu/trynext-release/artifacts/trynex-storefront/public/mockups')
SRC=ROOT/'normalized'; OUT=ROOT/'source-kit-v3'
FAMILIES={
 'tshirt':['white','black','navy','maroon','olive','sky-blue','grey','red'],
 'longsleeve':['white','black','navy','maroon','olive','grey','red','sky-blue','burgundy','forest'],
 'hoodie':['white','black','navy','grey','maroon','olive','red','sky-blue','forest','burgundy'],
 'mug':['white','black','navy','red','green','purple','sky-blue','pink','maroon','orange'],
 'cap':['white','black','navy','maroon','olive','red','grey','forest'],
 'waterbottle':['white','black','navy','forest','sky-blue','red','pink','teal'],
}
# Keep reviewed special transparent cutouts for these known clean product/color faces.
KEEP={('tshirt','white'),('tshirt','black'),('longsleeve','white'),('longsleeve','black'),('hoodie','white'),('hoodie','black'),('mug','white'),('cap','white'),('waterbottle','white')}

def extract(path):
    a=np.array(Image.open(path).convert('RGBA'))
    rgb=a[:,:,:3].astype(np.int16); h,w=rgb.shape[:2]
    near=(rgb.min(2)>218) & ((rgb.max(2)-rgb.min(2))<32)
    seen=np.zeros((h,w),bool); q=deque()
    for x in range(w):
        if near[0,x]: q.append((0,x)); seen[0,x]=1
        if near[h-1,x]: q.append((h-1,x)); seen[h-1,x]=1
    for y in range(h):
        if near[y,0]: q.append((y,0)); seen[y,0]=1
        if near[y,w-1]: q.append((y,w-1)); seen[y,w-1]=1
    while q:
        y,x=q.popleft()
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<h and 0<=nx<w and near[ny,nx] and not seen[ny,nx]:
                seen[ny,nx]=1; q.append((ny,nx))
    alpha=np.where(seen,0,255).astype(np.uint8)
    # Remove only tiny isolated low-opacity extraction residue at the outermost edge.
    a[:,:,3]=alpha
    return Image.fromarray(a,'RGBA')

changed=[]
for family,colors in FAMILIES.items():
    for color in colors:
        if (family,color) in KEEP: continue
        src=SRC/f'{family}-{color}-back.png'
        dest=OUT/family/color/'back.png'
        if src.exists():
            extract(src).save(dest,optimize=True)
            changed.append(str(dest.relative_to(OUT)))
print(json.dumps({'extracted':len(changed),'examples':changed[:12]},indent=2))
