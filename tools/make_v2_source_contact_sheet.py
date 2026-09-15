from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path('/home/ubuntu/trynext-release/artifacts/trynex-storefront/public/mockups/source-kit-v2')
out = Path('/home/ubuntu/trynext-release/verification/mockup-source-kit-v2-contact-sheet.png')
items = [
    ('tshirt','white'),('tshirt','black'),('tshirt','red'),('tshirt','sky-blue'),('tshirt','olive'),('tshirt','maroon'),
    ('longsleeve','white'),('longsleeve','black'),('longsleeve','red'),('longsleeve','sky-blue'),('longsleeve','forest'),('longsleeve','burgundy'),
    ('hoodie','white'),('hoodie','black'),('hoodie','red'),('hoodie','sky-blue'),('hoodie','olive'),('hoodie','maroon'),
    ('mug','white'),('mug','black'),('mug','red'),('mug','sky-blue'),('mug','pink'),('mug','purple'),
    ('cap','white'),('cap','black'),('cap','red'),('cap','forest'),('cap','olive'),('cap','maroon'),
    ('waterbottle','white'),('waterbottle','black'),('waterbottle','red'),('waterbottle','sky-blue'),('waterbottle','teal'),('waterbottle','forest'),
]
W, H, COLS = 240, 260, 6
sheet = Image.new('RGB', (W * COLS, H * ((len(items)+COLS-1)//COLS)), '#e9e5de')
d = ImageDraw.Draw(sheet)
font = ImageFont.load_default()
for i, (family, color) in enumerate(items):
    x, y = (i % COLS) * W, (i // COLS) * H
    p = root / family / color / 'front.png'
    if not p.exists():
        d.text((x+8, y+8), f'MISSING\n{family}-{color}', fill='#a00', font=font)
        continue
    im = Image.open(p).convert('RGBA')
    im.thumbnail((W-24, H-58))
    tile = Image.new('RGBA', (W, H-42), 'white')
    tile.alpha_composite(im, ((W-im.width)//2, (H-42-im.height)//2))
    sheet.paste(tile.convert('RGB'), (x, y))
    d.text((x+8, y+H-36), f'{family} / {color}', fill='#111', font=font)
    d.text((x+8, y+H-22), 'source-kit-v2 cutout', fill='#666', font=font)
sheet.save(out)
print(out)
