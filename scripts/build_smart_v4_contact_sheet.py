from pathlib import Path
from PIL import Image, ImageDraw

root = Path('/home/ubuntu/trynext-lifestyle/artifacts/trynex-storefront/public/mockups/smart-v4')
out = Path('/home/ubuntu/trynext-lifestyle/docs/smart-v4-contact-sheet.png')
items = [
    ('T-shirt white front', 'tshirt/white/front.png'), ('T-shirt navy back', 'tshirt/navy/back.png'), ('T-shirt white sleeve', 'tshirt/white/left-sleeve.png'), ('T-shirt white neck', 'tshirt/white/neck-label.png'),
    ('Long Sleeve white front', 'longsleeve/white/front.png'), ('Long Sleeve forest back', 'longsleeve/forest/back.png'), ('Long Sleeve white sleeve', 'longsleeve/white/left-sleeve.png'), ('Long Sleeve white neck', 'longsleeve/white/neck-label.png'),
    ('Hoodie white front', 'hoodie/white/front.png'), ('Hoodie burgundy back', 'hoodie/burgundy/back.png'), ('Hoodie white sleeve', 'hoodie/white/left-sleeve.png'), ('Hoodie white neck', 'hoodie/white/neck-label.png'),
    ('Mug white front', 'mug/white/front.png'), ('Mug red back', 'mug/red/back.png'), ('Mug white wrap', 'mug/white/wrap.png'), ('Cap navy front', 'cap/navy/front.png'),
    ('Cap navy back', 'cap/navy/back.png'), ('Bottle white front', 'waterbottle/white/front.png'), ('Bottle teal back', 'waterbottle/teal/back.png'), ('Bottle red front', 'waterbottle/red/front.png'),
]
tile_w, tile_h, label_h, cols = 300, 300, 42, 4
sheet = Image.new('RGB', (cols*tile_w, ((len(items)+cols-1)//cols)*(tile_h+label_h)), '#f1eee8')
draw = ImageDraw.Draw(sheet)
for i, (label, rel) in enumerate(items):
    x, y = (i % cols)*tile_w, (i // cols)*(tile_h+label_h)
    tile = Image.new('RGBA', (tile_w, tile_h), (255,255,255,255))
    path = root / rel
    if path.exists():
        img = Image.open(path).convert('RGBA')
        img.thumbnail((tile_w-16, tile_h-16))
        tile.alpha_composite(img, ((tile_w-img.width)//2, (tile_h-img.height)//2))
    else:
        draw.text((x+10,y+10), 'MISSING', fill='#b91c1c')
    sheet.paste(tile.convert('RGB'), (x,y))
    draw.rectangle((x,y+tile_h,x+tile_w,y+tile_h+label_h), fill='#201c18')
    draw.text((x+8,y+tile_h+12), label, fill='white')
out.parent.mkdir(parents=True, exist_ok=True)
sheet.save(out)
print(out)
