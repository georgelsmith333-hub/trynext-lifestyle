from pathlib import Path
from PIL import Image, ImageOps, ImageDraw

root = Path('/home/ubuntu/trynext-lifestyle')
src = root / 'attached_assets/trynext-mockup-source-kit/psd'
out = Path('/tmp/trynext-psd-preview')
out.mkdir(parents=True, exist_ok=True)
files = [
    'tshirt-white-front.psd', 'tshirt-white-back.psd',
    'longsleeve-white-front.psd', 'longsleeve-white-back.psd',
    'hoodie-white-front.psd', 'hoodie-white-back.psd',
]
thumbs = []
for name in files:
    path = src / name
    im = Image.open(path).convert('RGBA')
    im.thumbnail((420, 420), Image.Resampling.LANCZOS)
    canvas = Image.new('RGB', (460, 500), 'white')
    x = (460 - im.width) // 2
    y = 18 + (420 - im.height) // 2
    canvas.paste(im, (x, y), im)
    d = ImageDraw.Draw(canvas)
    d.text((16, 458), name, fill='black')
    out_name = name.replace('.psd', '.png')
    canvas.save(out / out_name)
    thumbs.append(canvas)
contact = Image.new('RGB', (920, 1500), 'white')
for i, im in enumerate(thumbs):
    contact.paste(im, ((i % 2) * 460, (i // 2) * 500))
contact.save(out / 'contact.png')
print(out / 'contact.png')
for name in files:
    im = Image.open(src / name)
    print(name, im.size, im.mode, getattr(im, 'n_frames', 1))
