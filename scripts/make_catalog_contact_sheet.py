from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont

root = Path('/home/ubuntu/trynext-lifestyle-git/artifacts/trynex-storefront/public/assets/products')
files = sorted(root.glob('*.png'))
thumb_w, thumb_h = 180, 210
cols = 5
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * thumb_w, rows * thumb_h), 'white')
draw = ImageDraw.Draw(sheet)
for i, path in enumerate(files):
    try:
        img = Image.open(path).convert('RGBA')
        img.thumbnail((160, 160), Image.Resampling.LANCZOS)
        bg = Image.new('RGBA', (160, 160), 'white')
        bg.alpha_composite(img, ((160 - img.width)//2, (160 - img.height)//2))
        tile = bg.convert('RGB')
    except Exception:
        tile = Image.new('RGB', (160, 160), '#eeeeee')
    x = (i % cols) * thumb_w + 10
    y = (i // cols) * thumb_h + 6
    sheet.paste(tile, (x, y))
    draw.text((x, y + 166), path.stem, fill='#111111')
sheet.save('/home/ubuntu/trynext-catalog-assets-contact-sheet.jpg', quality=92)
print(f'created {len(files)} assets')
