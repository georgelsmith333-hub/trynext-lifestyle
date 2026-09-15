from pathlib import Path
from PIL import Image
for p in sorted(Path('/tmp').glob('*.png')):
    if not any(x in p.name for x in ('tshirt_', 'longsleeve_', 'hoodie_')): continue
    with Image.open(p) as im:
        rgba=im.convert('RGBA')
        alpha=rgba.getchannel('A')
        print(f'{p.name}: bytes={p.stat().st_size} size={im.size} mode={im.mode} alpha_extrema={alpha.getextrema()} bbox={alpha.getbbox()}')
