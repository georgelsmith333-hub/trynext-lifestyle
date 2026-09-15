#!/usr/bin/env python3
"""Generate exact-color alpha cutouts from normalized Trynext photos.

Opaque source-kit images remain the canonical 2D/export assets.  This helper
creates a separate transparent derivative for the 3D billboard path.  It uses
edge-connected background flood filling, so product pixels are retained while
the warm studio rectangle and its detached ground shadow are removed.

Reviewed white/dark cutouts already in the storefront are copied into the same
stable 1024px canvas; all other colors are segmented from their normalized
opaque photo.
"""

from __future__ import annotations

from pathlib import Path
import shutil

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "artifacts" / "trynext-storefront" / "public" / "mockups"
NORMALIZED = PUBLIC / "normalized"
OUTPUT = PUBLIC / "normalized-cutouts"

CATEGORIES = ("tshirt", "longsleeve", "hoodie", "mug", "cap", "waterbottle")

TARGET_FRAMES: dict[str, dict[str, tuple[int, int, int, int]]] = {
    "tshirt": {"front": (62, 82, 962, 942), "back": (62, 82, 962, 942)},
    "longsleeve": {"front": (72, 112, 952, 912), "back": (72, 112, 952, 912)},
    "hoodie": {"front": (72, 62, 952, 962), "back": (72, 62, 952, 962)},
    "mug": {"front": (162, 212, 862, 812), "back": (162, 212, 862, 812)},
    "cap": {"front": (162, 202, 862, 822), "back": (162, 202, 862, 822)},
    "waterbottle": {"front": (362, 97, 662, 927), "back": (362, 97, 662, 927)},
}

REVIEWED_CUTOUTS = {
    "tshirt-white-front": "new/white-tshirt-front-cutout.png",
    "tshirt-white-back": "new/white-tshirt-back-cutout.png",
    "tshirt-black-front": "new/black-tshirt-front-cutout.png",
    "tshirt-black-back": "new/black-tshirt-back-cutout.png",
    "longsleeve-white-front": "white-longsleeve-front-cutout-real.png",
    "longsleeve-white-back": "white-longsleeve-back-cutout-real.png",
    "longsleeve-black-front": "black-longsleeve-front-cutout.png",
    "longsleeve-black-back": "black-longsleeve-back-cutout.png",
    "hoodie-white-front": "white-hoodie-front-cutout-real.png",
    "hoodie-white-back": "white-hoodie-back-cutout-real.png",
    "hoodie-black-front": "black-hoodie-front-cutout-real.png",
    "hoodie-black-back": "black-hoodie-back-cutout-real.png",
    "mug-white-front": "white-mug-front-cutout.png",
    "mug-black-front": "black-mug-front-cutout.png",
    "cap-white-front": "white-cap-front-cutout.png",
    "waterbottle-white-front": "white-waterbottle-front-cutout.png",
}


def fit_to_frame(image: Image.Image, target: tuple[int, int, int, int]) -> Image.Image:
    image = image.convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if not bbox:
        return image
    left, top, right, bottom = bbox
    target_left, target_top, target_right, target_bottom = target
    scale = min(
        (target_right - target_left) / max(1, right - left),
        (target_bottom - target_top) / max(1, bottom - top),
    )
    resized = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    scaled_box = (left * scale, top * scale, right * scale, bottom * scale)
    target_cx = (target_left + target_right) / 2
    target_cy = (target_top + target_bottom) / 2
    paste_x = round(target_cx - (scaled_box[0] + scaled_box[2]) / 2)
    paste_y = round(target_cy - (scaled_box[1] + scaled_box[3]) / 2)
    output = Image.new("RGBA", (1024, 1024))
    output.alpha_composite(resized, (paste_x, paste_y))
    return output


def background_color(image: Image.Image) -> tuple[int, int, int]:
    pixels = image.load()
    width, height = image.size
    points = []
    for x, y in (
        (0, 0),
        (width - 1, 0),
        (0, height - 1),
        (width - 1, height - 1),
        (width // 2, 0),
        (0, height // 2),
        (width - 1, height // 2),
        (width // 2, height - 1),
    ):
        points.append(pixels[x, y][:3])
    return tuple(sorted(channel)[len(points) // 2] for channel in zip(*points))


def segment(image: Image.Image) -> Image.Image:
    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()
    bg = background_color(image)

    out = Image.new("RGBA", image.size)
    source_pixels = image.load()
    output_pixels = out.load()
    for y in range(height):
        for x in range(width):
            r, g, b, _ = source_pixels[x, y]
            # A flood fill alone leaves a pale rectangular halo wherever the
            # studio shadow is connected to the background.  Build the matte
            # from colour distance instead: keep the product's natural
            # shading, but feather only the pixels that are genuinely close to
            # the sampled warm-white studio background.
            distance = max(abs(r - bg[0]), abs(g - bg[1]), abs(b - bg[2]))
            if distance <= 14:
                alpha = 0
            elif distance >= 44:
                alpha = 255
            else:
                alpha = round((distance - 14) * 255 / 30)
            output_pixels[x, y] = (r, g, b, alpha)
    return out


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    count = 0
    for category in CATEGORIES:
        for photo in sorted(NORMALIZED.glob(f"{category}-*-front.png")):
            stem = photo.stem
            color = stem[len(category) + 1 : -len("-front")]
            for face in ("front", "back"):
                key = f"{category}-{color}-{face}"
                output = OUTPUT / f"{key}.png"
                reviewed = REVIEWED_CUTOUTS.get(key)
                if reviewed:
                    source = PUBLIC / reviewed
                    fit_to_frame(Image.open(source), TARGET_FRAMES[category][face]).save(output, optimize=True)
                else:
                    source = NORMALIZED / f"{key}.png"
                    if not source.is_file():
                        raise FileNotFoundError(source)
                    fit_to_frame(segment(Image.open(source)), TARGET_FRAMES[category][face]).save(output, optimize=True)
                count += 1
    print(f"Generated {count} exact-color transparent derivatives in {OUTPUT}")


if __name__ == "__main__":
    main()