from pathlib import Path
from PIL import Image, ImageChops

root = Path('artifacts/trynex-storefront/public/assets/mockups')
for stem in ['tshirt_1', 'hoodie_1', 'mug_1', 'cap_1', 'bottle_1']:
    print(f'[{stem}]')
    for suffix in ['.png', '_shadow.png', '_highlight.png']:
        path = root / ('processed' if suffix != '.png' else '') / f'{stem}{suffix}'
        if not path.exists():
            print(' missing', path)
            continue
        image = Image.open(path).convert('RGBA')
        alpha = image.getchannel('A')
        bbox = alpha.getbbox()
        extrema = alpha.getextrema()
        nonwhite = ImageChops.difference(image.convert('RGB'), Image.new('RGB', image.size, (255, 255, 255))).getbbox()
        print(' ', path.name, 'size=', image.size, 'alpha_bbox=', bbox, 'alpha_extrema=', extrema, 'nonwhite_bbox=', nonwhite)
