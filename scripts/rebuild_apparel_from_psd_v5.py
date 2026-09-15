from pathlib import Path
from collections import deque
import numpy as np
from PIL import Image, ImageOps, ImageChops

ROOT = Path('/home/ubuntu/trynext-lifestyle')
SRC = ROOT / 'attached_assets/trynext-mockup-source-kit/psd'
OUT = ROOT / 'artifacts/trynex-storefront/public/mockups/apparel-v5'

families = {
    'tshirt': ['white','black','grey','navy','maroon','olive','red','sky-blue'],
    'longsleeve': ['white','black','grey','navy','maroon','olive','red','sky-blue','burgundy','forest'],
    'hoodie': ['white','black','navy','grey','maroon','olive','red','sky-blue','forest','burgundy'],
}
views = ('front','back')
color_rgb = {
    'white': (245,245,245), 'black': (24,28,34), 'grey': (116,122,130),
    'navy': (20,48,88), 'maroon': (112,28,53), 'olive': (92,103,50),
    'red': (176,30,38), 'sky-blue': (67,145,196), 'burgundy': (108,24,47),
    'forest': (22,105,63),
}
def remove_border_background(im):
    arr = np.array(im.convert('RGBA'))
    rgb = arr[:, :, :3]
    # The PSD composites use a near-white studio canvas. Remove only the
    # near-white region connected to the outer border, preserving garment whites.
    candidate = (rgb.min(axis=2) > 232) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 18)
    h, w = candidate.shape
    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        if candidate[0, x]: q.append((0, x)); seen[0, x] = True
        if candidate[h-1, x]: q.append((h-1, x)); seen[h-1, x] = True
    for y in range(h):
        if candidate[y, 0]: q.append((y, 0)); seen[y, 0] = True
        if candidate[y, w-1]: q.append((y, w-1)); seen[y, w-1] = True
    while q:
        y, x = q.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True; q.append((ny, nx))
    arr[seen, 3] = 0
    return Image.fromarray(arr, 'RGBA')

def colorize(im, rgb):
    if rgb == color_rgb['white']:
        return im
    lum = im.convert('RGB').convert('L')
    base = Image.new('RGB', im.size, rgb)
    # Preserve the garment's real folds, seams, and highlights while mapping hue.
    shaded = ImageChops.multiply(base, Image.merge('RGB', (lum, lum, lum)))
    return Image.merge('RGBA', (*shaded.split(), im.getchannel('A')))

for family, colors in families.items():
    for color in colors:
        for view in views:
            src = SRC / f'{family}-white-{view}.psd'
            if not src.exists():
                raise FileNotFoundError(src)
            im = Image.open(src).convert('RGBA')
            mask_path = ROOT / 'artifacts/trynex-storefront/public/mockups/normalized-cutouts' / f'{family}-white-{view}.png'
            mask = Image.open(mask_path).convert('RGBA').getchannel('A')
            im.putalpha(mask)
            im = colorize(im, color_rgb[color])
            # Normalize the PSD composite to a deterministic transparent canvas.
            alpha = im.getchannel('A')
            bbox = alpha.getbbox()
            if bbox:
                im = im.crop(bbox)
            canvas = Image.new('RGBA', (1024, 1024), (0,0,0,0))
            scale = min(900 / im.width, 900 / im.height)
            im = im.resize((round(im.width*scale), round(im.height*scale)), Image.Resampling.LANCZOS)
            x = (1024 - im.width)//2
            y = (1024 - im.height)//2
            canvas.alpha_composite(im, (x,y))
            dest = OUT / family / color
            dest.mkdir(parents=True, exist_ok=True)
            canvas.save(dest / f'{view}.png', optimize=True)

        # Derive realistic supporting surfaces from the same color-specific front master.
        front = Image.open(OUT / family / color / 'front.png').convert('RGBA')
        alpha = front.getchannel('A')
        bbox = alpha.getbbox()
        if not bbox:
            raise RuntimeError(f'No alpha geometry for {family}/{color}')
        x0,y0,x1,y1 = bbox
        w,h = x1-x0,y1-y0
        # Keep the original view geometry, but use the actual same-color garment pixels.
        if family == 'tshirt':
            sleeve_box = (x0, y0+round(h*.12), x0+round(w*.30), y0+round(h*.45))
            neck_box = (x0+round(w*.32), y0, x0+round(w*.68), y0+round(h*.20))
        elif family == 'longsleeve':
            sleeve_box = (x0, y0+round(h*.10), x0+round(w*.27), y0+round(h*.55))
            neck_box = (x0+round(w*.34), y0, x0+round(w*.66), y0+round(h*.18))
        else:
            sleeve_box = (x0, y0+round(h*.08), x0+round(w*.30), y0+round(h*.55))
            neck_box = (x0+round(w*.31), y0, x0+round(w*.69), y0+round(h*.22))
        sleeve = front.crop(sleeve_box)
        neck = front.crop(neck_box)
        def place(src_im, size=(1024,1024)):
            a = src_im.getchannel('A')
            b = a.getbbox()
            if b: src_im = src_im.crop(b)
            c = Image.new('RGBA', size, (0,0,0,0))
            scale = min((size[0]*.78)/max(1,src_im.width), (size[1]*.78)/max(1,src_im.height))
            src_im = src_im.resize((round(src_im.width*scale), round(src_im.height*scale)), Image.Resampling.LANCZOS)
            c.alpha_composite(src_im, ((size[0]-src_im.width)//2, (size[1]-src_im.height)//2))
            return c
        dest = OUT / family / color
        place(sleeve).save(dest / 'left-sleeve.png', optimize=True)
        place(ImageOps.mirror(sleeve)).save(dest / 'right-sleeve.png', optimize=True)
        place(neck).save(dest / 'neck-label.png', optimize=True)
print(f'Rebuilt {sum(len(v) for v in families.values())*5} apparel surfaces under {OUT}')
