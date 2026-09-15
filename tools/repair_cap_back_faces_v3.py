from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path('/home/ubuntu/trynext-release/artifacts/trynex-storefront/public/mockups/source-kit-v3')
COLORS = ['white','black','navy','maroon','olive','red','grey','forest']
for color in COLORS:
    front = ROOT / 'cap' / color / 'front.png'
    back = ROOT / 'cap' / color / 'back.png'
    f = np.array(Image.open(front).convert('RGBA'), dtype=np.uint8)
    old = np.array(Image.open(back).convert('RGBA'), dtype=np.uint8)
    # Clean rear base: the cap crown/brim is symmetric enough that a mirrored front
    # is preferable to retaining a photographic cast shadow as a second object.
    out = np.array(Image.fromarray(f, 'RGBA').transpose(Image.Transpose.FLIP_LEFT_RIGHT), dtype=np.uint8)
    # Restore only the central rear adjuster detail from the photographic source.
    # The narrow window excludes the side cast shadow and keeps the printable crown
    # envelope controlled by the clean front alpha.
    h, w = out.shape[:2]
    x0, x1 = int(w * 0.40), int(w * 0.60)
    y0, y1 = int(h * 0.63), int(h * 0.80)
    patch = old[y0:y1, x0:x1]
    keep = patch[:,:,3] > 16
    out_region = out[y0:y1, x0:x1]
    out_region[keep] = patch[keep]
    out[y0:y1, x0:x1] = out_region
    out[:,:,3][out[:,:,3] < 16] = 0
    Image.fromarray(out, 'RGBA').save(back, optimize=True)
print('rebuilt cap rear faces from mirrored clean fronts with central adjuster detail')
