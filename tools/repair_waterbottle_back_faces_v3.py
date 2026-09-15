from pathlib import Path
from PIL import Image

ROOT = Path('/home/ubuntu/trynext-release/artifacts/trynex-storefront/public/mockups/source-kit-v3')
COLORS = ['white','black','navy','forest','sky-blue','red','pink','teal']
for color in COLORS:
    front = ROOT / 'waterbottle' / color / 'front.png'
    back = ROOT / 'waterbottle' / color / 'back.png'
    if not front.exists():
        raise FileNotFoundError(front)
    # A cylindrical bottle has the same product surface on front and rear. Mirroring
    # the clean front preserves the actual ring-cap silhouette, body highlight, and
    # complete alpha while avoiding the white matte strips in legacy rear photos.
    Image.open(front).convert('RGBA').transpose(Image.Transpose.FLIP_LEFT_RIGHT).save(back, optimize=True)
print('rebuilt waterbottle rear faces from mirrored clean fronts')
