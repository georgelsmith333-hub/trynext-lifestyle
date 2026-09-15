from __future__ import annotations

import shutil
from pathlib import Path
from PIL import Image

ROOT = Path('/home/ubuntu/trynext-lifestyle')
SRC = ROOT / 'artifacts/trynex-storefront/public/mockups/source-kit-v3'
DST = ROOT / 'artifacts/trynex-storefront/public/mockups/smart-v4'

COLORS = {
    'tshirt': ['white','black','navy','maroon','olive','sky-blue','grey','red'],
    'longsleeve': ['white','black','navy','maroon','olive','grey','red','sky-blue','burgundy','forest'],
    'hoodie': ['white','black','navy','grey','maroon','olive','red','sky-blue','forest','burgundy'],
    'mug': ['white','black','navy','red','green','purple','sky-blue','pink','maroon','orange'],
    'cap': ['white','black','navy','maroon','olive','red','grey','forest'],
    'waterbottle': ['white','black','navy','forest','sky-blue','red','pink','teal'],
}


def load(family: str, color: str, view: str) -> Image.Image:
    p = SRC / family / color / f'{view}.png'
    if not p.exists():
        raise FileNotFoundError(p)
    return Image.open(p).convert('RGBA')


def masked_crop(im: Image.Image, box: tuple[int, int, int, int]) -> Image.Image:
    out = im.copy()
    mask = Image.new('L', im.size, 0)
    mask.paste(im.getchannel('A').crop(box), box[:2])
    out.putalpha(mask)
    return out


def masked_polygon(im: Image.Image, points: list[tuple[int, int]]) -> Image.Image:
    out = im.copy()
    mask = Image.new('L', im.size, 0)
    from PIL import ImageDraw
    ImageDraw.Draw(mask).polygon(points, fill=255)
    mask = Image.composite(im.getchannel('A'), Image.new('L', im.size, 0), mask)
    out.putalpha(mask)
    return out


def write(im: Image.Image, family: str, color: str, view: str) -> None:
    out = DST / family / color / f'{view}.png'
    out.parent.mkdir(parents=True, exist_ok=True)
    im.resize((1024, 1024), Image.Resampling.LANCZOS).save(out, optimize=True)


for family, colors in COLORS.items():
    for color in colors:
        front = load(family, color, 'front')
        back = load(family, color, 'back') if (SRC / family / color / 'back.png').exists() else front
        write(front, family, color, 'front')
        write(back, family, color, 'back')

        if family in {'tshirt', 'longsleeve', 'hoodie'}:
            if family == 'tshirt':
                left_points = [(0, 210), (270, 145), (390, 285), (285, 600), (150, 850), (0, 900)]
            elif family == 'longsleeve':
                left_points = [(0, 180), (300, 145), (365, 300), (285, 700), (160, 930), (0, 960)]
            else:
                left_points = [(0, 170), (330, 110), (390, 325), (285, 760), (155, 970), (0, 980)]
            right_points = [(1024-x, y) for x, y in left_points]
            write(masked_polygon(front, left_points), family, color, 'left-sleeve')
            write(masked_polygon(front, right_points), family, color, 'right-sleeve')
            # Preserve only the actual collar/inside-neck construction from the same color/front master.
            write(masked_crop(front, (330, 35, 694, 285)), family, color, 'neck-label')
        elif family == 'mug':
            # Full-wrap base uses a central body panel; the handle is excluded by the mask.
            write(masked_crop(front, (150, 200, 650, 850)), family, color, 'wrap')

# Validate exact required count.
expected = 202
actual = len(list(DST.glob('*/*/*.png')))
if actual != expected:
    raise SystemExit(f'expected {expected} smart-v4 assets, found {actual}')
print(f'created {actual} smart-v4 assets at {DST}')
