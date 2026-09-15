from pathlib import Path
from collections import deque
from PIL import Image
import numpy as np

ROOT=Path('/home/ubuntu/trynext-release/artifacts/trynex-storefront/public/mockups/source-kit-v3')
COLORS={
 'tshirt': ['white','black','navy','maroon','olive','sky-blue','grey','red'],
 'longsleeve': ['white','black','navy','maroon','olive','grey','red','sky-blue','burgundy','forest'],
 'hoodie': ['white','black','navy','grey','maroon','olive','red','sky-blue','forest','burgundy'],
 'mug': ['white','black','navy','red','green','purple','sky-blue','pink','maroon','orange'],
 'cap': ['white','black','navy','maroon','olive','red','grey','forest'],
 'waterbottle': ['white','black','navy','forest','sky-blue','red','pink','teal'],
}
HEX={
 'white':'#f5f5f3','black':'#1a1a1a','navy':'#1e3a5f','maroon':'#7f1d1d','olive':'#4a5240','sky-blue':'#0ea5e9','grey':'#6b7280','red':'#dc2626','burgundy':'#6b1a2c','forest':'#166534','green':'#16a34a','purple':'#7c3aed','pink':'#ec4899','orange':'#ea580c','teal':'#0f766e'
}

# Apparel and mugs benefit from the detailed white rear master; caps and bottles
# retain their product-specific rear details and are only edge-normalized.
RECOLOR_FAMILIES={'tshirt','longsleeve','hoodie','mug'}

def remove_border_halo(im):
    a=np.array(im.convert('RGBA'))
    rgb=a[:,:,:3].astype(np.int16)
    alpha=a[:,:,3]
    # Drop very low-alpha extraction noise everywhere.
    alpha[alpha < 18] = 0
    h,w=alpha.shape
    near_white=(rgb.min(axis=2) > 238) & ((rgb.max(axis=2)-rgb.min(axis=2)) < 18)
    transparent_border=(alpha > 0) & near_white
    seen=np.zeros((h,w),dtype=bool)
    q=deque()
    for x in range(w):
        if transparent_border[0,x]: q.append((0,x)); seen[0,x]=True
        if transparent_border[h-1,x]: q.append((h-1,x)); seen[h-1,x]=True
    for y in range(h):
        if transparent_border[y,0]: q.append((y,0)); seen[y,0]=True
        if transparent_border[y,w-1]: q.append((y,w-1)); seen[y,w-1]=True
    while q:
        y,x=q.popleft()
        alpha[y,x]=0
        for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny,nx=y+dy,x+dx
            if 0<=ny<h and 0<=nx<w and not seen[ny,nx] and transparent_border[ny,nx]:
                seen[ny,nx]=True; q.append((ny,nx))
    a[:,:,3]=alpha
    return Image.fromarray(a,'RGBA')

def recolor_from_white(src, target_hex):
    im=Image.open(src).convert('RGBA')
    a=np.array(im).astype(np.float32)
    rgb=a[:,:,:3]
    alpha=a[:,:,3:4]
    lum=(0.299*rgb[:,:,0] + 0.587*rgb[:,:,1] + 0.114*rgb[:,:,2])/255.0
    target=np.array([int(target_hex[i:i+2],16) for i in (1,3,5)],dtype=np.float32)
    # Preserve folds and specular highlights from the white master while keeping
    # the requested product color stable across the complete rear silhouette.
    factor=(0.42 + 0.72*lum)[:,:,None]
    out=np.clip(target[None,None,:]*factor,0,255)
    # Preserve black protected stitching/cord detail in dark source pixels.
    dark=lum < 0.16
    out[dark]=np.minimum(out[dark], rgb[dark]*0.55)
    result=np.concatenate([out,alpha],axis=2).astype(np.uint8)
    return Image.fromarray(result,'RGBA')

for family, colors in COLORS.items():
    base=ROOT/family/'white'/'back.png'
    if not base.exists(): raise FileNotFoundError(base)
    for color in colors:
        path=ROOT/family/color/'back.png'
        if not path.exists(): raise FileNotFoundError(path)
        # Rebuild rear faces with a single detailed master only for the families
        # where the current colored backs are flat silhouettes. Keep black hoodie
        # and black apparel special clean sources intact as they already carry detail.
        if family in RECOLOR_FAMILIES and color != 'white' and not (color == 'black' and family in {'tshirt','longsleeve','hoodie'}):
            out=recolor_from_white(base, HEX[color])
        else:
            out=Image.open(path).convert('RGBA')
        out=remove_border_halo(out)
        out.save(path,optimize=True)
print('normalized v3 alpha edges and rebuilt detailed colored backs')
