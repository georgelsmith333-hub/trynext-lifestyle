from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path('/home/ubuntu/trynext-lifestyle/artifacts/trynex-storefront/public')
out = Path('/home/ubuntu/trynext-lifestyle/docs/mockup-contact-sheet.png')
items = [
    ('T-Shirt front', 'mockups/source-kit-v3/tshirt/white/front.png'),
    ('T-Shirt back', 'mockups/source-kit-v3/tshirt/white/back.png'),
    ('Long Sleeve front', 'mockups/source-kit-v3/longsleeve/white/front.png'),
    ('Long Sleeve back', 'mockups/source-kit-v3/longsleeve/white/back.png'),
    ('Hoodie canonical front', 'mockups/canonical/hoodie/white/front.png'),
    ('Hoodie canonical back', 'mockups/canonical/hoodie/white/back.png'),
    ('Hoodie source front', 'mockups/source-kit-v3/hoodie/white/front.png'),
    ('Hoodie source back', 'mockups/source-kit-v3/hoodie/white/back.png'),
    ('Mug front', 'mockups/source-kit-v3/mug/white/front.png'),
    ('Mug back', 'mockups/source-kit-v3/mug/white/back.png'),
    ('Cap front', 'mockups/source-kit-v3/cap/white/front.png'),
    ('Cap back', 'mockups/source-kit-v3/cap/white/back.png'),
    ('Bottle front', 'mockups/source-kit-v3/waterbottle/white/front.png'),
    ('Bottle back', 'mockups/source-kit-v3/waterbottle/white/back.png'),
]
thumb_w, thumb_h = 280, 320
label_h = 38
cols = 4
rows = (len(items) + cols - 1) // cols
sheet = Image.new('RGB', (cols * thumb_w, rows * (thumb_h + label_h)), '#f1eee8')
draw = ImageDraw.Draw(sheet)
for i, (label, rel) in enumerate(items):
    x = (i % cols) * thumb_w
    y = (i // cols) * (thumb_h + label_h)
    path = root / rel
    tile = Image.new('RGBA', (thumb_w, thumb_h), (255, 255, 255, 255))
    if path.exists():
        try:
            img = Image.open(path).convert('RGBA')
            img.thumbnail((thumb_w - 20, thumb_h - 20))
            tile.alpha_composite(img, ((thumb_w - img.width)//2, (thumb_h - img.height)//2))
        except Exception as exc:
            draw.text((x+8, y+8), f'ERROR: {exc}', fill='#b91c1c')
    else:
        draw.text((x+8, y+8), 'MISSING', fill='#b91c1c')
    sheet.paste(tile.convert('RGB'), (x, y))
    draw.rectangle((x, y + thumb_h, x + thumb_w, y + thumb_h + label_h), fill='#201c18')
    draw.text((x + 8, y + thumb_h + 10), label, fill='white')
out.parent.mkdir(parents=True, exist_ok=True)
sheet.save(out)
print(out)
