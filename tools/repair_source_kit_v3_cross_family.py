from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path('/home/ubuntu/trynext-release/artifacts/trynex-storefront/public/mockups/source-kit-v3')
NORMALIZED = Path('/home/ubuntu/trynext-release/artifacts/trynex-storefront/public/mockups/normalized-cutouts')
COLORS = {
    'tshirt': ['white','black','navy','maroon','olive','sky-blue','grey','red'],
    'longsleeve': ['white','black','navy','maroon','olive','grey','red','sky-blue','burgundy','forest'],
    'hoodie': ['white','black','navy','grey','maroon','olive','red','sky-blue','forest','burgundy'],
    'mug': ['white','black','navy','red','green','purple','sky-blue','pink','maroon','orange'],
    'cap': ['white','black','navy','maroon','olive','red','grey','forest'],
    'waterbottle': ['white','black','navy','forest','sky-blue','red','pink','teal'],
}
HEX = {
    'white':'#f5f5f3','black':'#1a1a1a','navy':'#1e3a5f','maroon':'#7f1d1d','olive':'#4a5240','sky-blue':'#0ea5e9','grey':'#6b7280','red':'#dc2626','burgundy':'#6b1a2c','forest':'#166534','green':'#16a34a','purple':'#7c3aed','pink':'#ec4899','orange':'#ea580c','teal':'#0f766e'
}
DETAILED_RECOLOR = {'tshirt', 'longsleeve', 'hoodie', 'mug'}

def rgba(path):
    return np.array(Image.open(path).convert('RGBA'), dtype=np.uint8)

def target_rgb(hex_color):
    return np.array([int(hex_color[i:i+2], 16) for i in (1,3,5)], dtype=np.float32)

def detailed_recolor(master_path, color):
    a = rgba(master_path).astype(np.float32)
    rgb = a[:, :, :3]
    alpha = a[:, :, 3:4]
    lum = (0.299*rgb[:,:,0] + 0.587*rgb[:,:,1] + 0.114*rgb[:,:,2]) / 255.0
    active = alpha[:, :, 0] > 16
    vals = lum[active]
    lo, hi = np.percentile(vals, [2, 98]) if vals.size else (0.0, 1.0)
    normalized = np.clip((lum - lo) / max(hi - lo, 0.15), 0, 1)
    # Preserve folds/specular structure from the detailed white master while avoiding
    # the near-black collapse produced by recoloring a dark master.
    factor = 0.36 + 0.88 * normalized
    target = target_rgb(HEX[color])
    out = np.clip(target[None,None,:] * factor[:,:,None], 0, 255)
    # Keep deep seams, cuffs, hood cords, and mug rim/handle shadows dark,
    # but retain the requested target hue rather than copying white/gray RGB.
    dark = lum < max(lo + 0.10, 0.20)
    out[dark] *= 0.70
    result = np.concatenate([out, alpha], axis=2).astype(np.uint8)
    return Image.fromarray(result, 'RGBA')

def trim_low_alpha(path):
    a = rgba(path)
    a[:,:,3][a[:,:,3] < 16] = 0
    Image.fromarray(a, 'RGBA').save(path, optimize=True)

for family, colors in COLORS.items():
    master = ROOT / family / 'white' / 'back.png'
    for color in colors:
        dst = ROOT / family / color / 'back.png'
        if family in DETAILED_RECOLOR and color not in {'white', 'black'}:
            if not master.exists():
                raise FileNotFoundError(master)
            detailed_recolor(master, color).save(dst, optimize=True)
        elif family in {'cap', 'waterbottle'}:
            # Preserve product-specific rear geometry and ring/brim details from the
            # original color source; only remove insignificant low-alpha noise.
            raw = NORMALIZED / f'{family}-{color}-back.png'
            if raw.exists():
                Image.open(raw).convert('RGBA').save(dst, optimize=True)
        trim_low_alpha(dst)
print('repaired v3 colored backs with detailed black-master recolor and protected cap/bottle sources')
