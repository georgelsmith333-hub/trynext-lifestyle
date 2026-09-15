#!/usr/bin/env python3
"""Create stable, aspect-preserving Trynext runtime photo frames.

The source-kit PNGs are reviewed opaque photographs, but their product bounds
are not consistent from one colour/face to another.  This script measures the
foreground bounds in each source image, scales the complete image uniformly,
and places the measured product bounds into a category/face-aware 1024px frame.
It never stretches a source image and never crops through the measured product.

The output photos intentionally stay opaque.  Transparent 3D derivatives are
generated separately by generate_trynext_exact_cutouts.py.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "artifacts" / "trynext-storefront" / "public" / "mockups"
SOURCE = PUBLIC / "source-kit"
OUTPUT = PUBLIC / "normalized"

CATEGORIES = ("tshirt", "longsleeve", "hoodie", "mug", "cap", "waterbottle")

# Measured presentation frames.  These are content bounds, not crop windows.
TARGET_FRAMES: dict[str, dict[str, tuple[int, int, int, int]]] = {
    "tshirt": {"front": (62, 82, 962, 942), "back": (62, 82, 962, 942)},
    "longsleeve": {"front": (72, 112, 952, 912), "back": (72, 112, 952, 912)},
    "hoodie": {"front": (72, 62, 952, 962), "back": (72, 62, 952, 962)},
    "mug": {"front": (162, 212, 862, 812), "back": (162, 212, 862, 812)},
    "cap": {"front": (162, 202, 862, 822), "back": (162, 202, 862, 822)},
    "waterbottle": {"front": (362, 97, 662, 927), "back": (362, 97, 662, 927)},
}


def sample_background(image: Image.Image) -> tuple[int, int, int]:
    rgb = image.convert("RGB")
    width, height = rgb.size
    points = [
        rgb.getpixel((x, y))
        for x, y in (
            (0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1),
            (width // 2, 0), (0, height // 2), (width - 1, height // 2), (width // 2, height - 1),
        )
    ]
    return tuple(sorted(channel)[len(points) // 2] for channel in zip(*points))


def measured_bbox(image: Image.Image, category: str) -> tuple[int, int, int, int]:
    """Measure the product plus meaningful baked studio shadow.

    White products have low contrast against the warm studio background, so
    they use a lower threshold.  A regular grid is enough for stable bounds
    and keeps this utility fast in the workspace.
    """
    rgb = image.convert("RGB")
    bg = sample_background(rgb)
    threshold = 8 if category in {"tshirt", "longsleeve", "hoodie"} else 16
    xs: list[int] = []
    ys: list[int] = []
    for y in range(0, rgb.height, 2):
        for x in range(0, rgb.width, 2):
            pixel = rgb.getpixel((x, y))
            distance = max(abs(pixel[i] - bg[i]) for i in range(3))
            if distance > threshold:
                xs.append(x)
                ys.append(y)
    if not xs:
        raise ValueError("could not measure a foreground")
    return min(xs), min(ys), min(max(xs) + 2, rgb.width), min(max(ys) + 2, rgb.height)


def normalize_one(source: Path, category: str, face: str, target: tuple[int, int, int, int]) -> dict[str, Any]:
    image = Image.open(source).convert("RGB")
    left, top, right, bottom = measured_bbox(image, category)
    content_w = right - left
    content_h = bottom - top
    target_left, target_top, target_right, target_bottom = target
    target_w = target_right - target_left
    target_h = target_bottom - target_top
    scale = min(target_w / content_w, target_h / content_h)
    resized = image.resize(
        (max(1, round(image.width * scale)), max(1, round(image.height * scale))),
        Image.Resampling.LANCZOS,
    )
    scaled_box = (
        left * scale,
        top * scale,
        right * scale,
        bottom * scale,
    )
    target_cx = (target_left + target_right) / 2
    target_cy = (target_top + target_bottom) / 2
    scaled_cx = (scaled_box[0] + scaled_box[2]) / 2
    scaled_cy = (scaled_box[1] + scaled_box[3]) / 2
    paste_x = round(target_cx - scaled_cx)
    paste_y = round(target_cy - scaled_cy)
    canvas = Image.new("RGB", (1024, 1024), sample_background(image))
    canvas.paste(resized, (paste_x, paste_y))
    destination = OUTPUT / source.name
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, format="PNG", optimize=True)
    return {
        "category": category,
        "face": face,
        "source": str(source.relative_to(ROOT)),
        "output": str(destination.relative_to(ROOT)),
        "measuredSourceFrame": [left, top, right, bottom],
        "targetFrame": list(target),
        "scale": round(scale, 6),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, help="also write measured frames to this JSON path")
    args = parser.parse_args()
    report: list[dict[str, Any]] = []
    for category in CATEGORIES:
        for source in sorted(SOURCE.glob(f"{category}-*-front.png")):
            color = source.stem[len(category) + 1 : -len("-front")]
            for face in ("front", "back"):
                path = SOURCE / f"{category}-{color}-{face}.png"
                if not path.is_file():
                    raise FileNotFoundError(path)
                report.append(normalize_one(path, category, face, TARGET_FRAMES[category][face]))
    if args.manifest:
        args.manifest.parent.mkdir(parents=True, exist_ok=True)
        args.manifest.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Normalized {len(report)} Trynext source-kit photos into {OUTPUT}")


if __name__ == "__main__":
    main()