from pathlib import Path
from PIL import Image

root = Path('/home/ubuntu/trynext-lifestyle/artifacts/trynex-storefront/public/mockups/canonical-v2')
for path in sorted(root.rglob('*.png')):
    im = Image.open(path).convert('RGBA')
    alpha = im.getchannel('A')
    a = alpha.getextrema()
    magenta = 0
    checker = 0
    px = im.load()
    for y in range(0, im.height, max(1, im.height // 64)):
        for x in range(0, im.width, max(1, im.width // 64)):
            r, g, b, aa = px[x, y]
            if aa > 0 and r > 180 and b > 120 and g < 100:
                magenta += 1
            if aa == 255 and abs(r-g) < 4 and abs(g-b) < 4 and 185 <= r <= 245:
                checker += 1
    print(f'{path.relative_to(root)} size={im.size} alpha={a} sampled-magenta={magenta} sampled-gray={checker}')
