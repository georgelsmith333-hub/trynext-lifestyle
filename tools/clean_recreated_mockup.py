from pathlib import Path
from PIL import Image

# Remove the near-white checkerboard background from generated mockups while
# retaining the very dark garment and anti-aliased edge pixels.
for name in ["tshirt-black-front-clean.png", "longsleeve-black-front-clean.png"]:
    path = Path("/home/ubuntu/trynext-release/artifacts/trynex-storefront/public/mockups/recreated") / name
    img = Image.open(path).convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            # Generated checkerboard cells are near-neutral and bright. Keep
            # garment/highlight pixels; remove only the bright neutral field.
            mx = max(r, g, b)
            mn = min(r, g, b)
            if mx > 205 and (mx - mn) < 18:
                px[x, y] = (r, g, b, 0)
            elif mx > 175 and (mx - mn) < 12:
                alpha = max(0, min(255, int((205 - mx) * 8)))
                px[x, y] = (r, g, b, alpha)
    img.save(path, optimize=True)
    print(path, img.size, img.mode)
