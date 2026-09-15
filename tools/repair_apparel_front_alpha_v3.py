from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path('/home/ubuntu/trynext-release/artifacts/trynex-storefront/public/mockups/source-kit-v3')
COLORS = {
    'tshirt': ['white','black','navy','maroon','olive','sky-blue','grey','red'],
    'longsleeve': ['white','black','navy','maroon','olive','grey','red','sky-blue','burgundy','forest'],
    'hoodie': ['white','black','navy','grey','maroon','olive','red','sky-blue','forest','burgundy'],
}
for family, colors in COLORS.items():
    envelope_path = ROOT / family / 'white' / 'front.png'
    envelope = np.array(Image.open(envelope_path).convert('RGBA'), dtype=np.uint8)[:,:,3]
    valid = envelope > 16
    for color in colors:
        if color == 'white':
            continue
        path = ROOT / family / color / 'front.png'
        a = np.array(Image.open(path).convert('RGBA'), dtype=np.uint8)
        if a.shape[:2] != envelope.shape:
            raise ValueError(f'canvas mismatch for {path}')
        # Preserve the colored source's fabric detail but forbid any alpha outside
        # the verified white product silhouette. This removes light matte wedges and
        # underarm spill without applying a global color filter or duplicate layer.
        a[:,:,3] = np.where(valid, a[:,:,3], 0)
        a[:,:,3][a[:,:,3] < 16] = 0
        Image.fromarray(a, 'RGBA').save(path, optimize=True)
print('intersected colored apparel fronts with canonical white silhouettes')
