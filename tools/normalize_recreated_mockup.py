from pathlib import Path
from PIL import Image

root = Path('/home/ubuntu/trynext-release/artifacts/trynex-storefront/public/mockups/recreated')
for path in root.glob('*-clean.png'):
    image = Image.open(path).convert('RGBA')
    image = image.resize((1024, 1024), Image.Resampling.LANCZOS)
    image.save(path, optimize=True)
    print(path, image.size, image.mode, image.getbbox())
