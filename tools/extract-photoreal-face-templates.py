#!/usr/bin/env python3
"""Extract approved PHOTO_BASE face templates from the photoreal source bundle.

The 22-face bundle is an input source, not a release candidate: its masters are
kept under attached_assets and are never copied into public/. This preparation
step extracts only the reviewed PHOTO_BASE pixels so the Smart Object builder
can use the dedicated sleeve, neck-label, and wrap geometry deterministically.
"""

from __future__ import annotations

import sys
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
LOCAL_PYTHON = REPO / ".vendor" / "python"
if LOCAL_PYTHON.is_dir():
    sys.path.insert(0, str(LOCAL_PYTHON))

from psd_tools import PSDImage

SOURCE = REPO / "attached_assets" / "trynext-mockup-source-kit" / "masters-22-photoreal" / "masters"
FAMILY_DIRS = {
    "TShirt": "tshirt",
    "LongSleeve": "longsleeve",
    "Hoodie": "hoodie",
    "Mug": "mug",
    "Cap": "cap",
    "Bottle": "waterbottle",
}


def main() -> int:
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "dist-mockups" / "staging" / "smart-v1" / "templates"
    out = out.resolve()
    count = 0
    for source_family, family in FAMILY_DIRS.items():
        family_root = SOURCE / source_family
        if not family_root.is_dir():
            raise SystemExit(f"missing photoreal family input: {family_root}")
        for master in sorted(family_root.glob("*.psd")) + sorted(family_root.glob("*.psb")):
            view = master.stem.lower()
            psd = PSDImage.open(master)
            photo = next(
                (layer for layer in psd if (layer.name or "").strip().rstrip("\x00") == "PHOTO_BASE"),
                None,
            )
            alpha = next(
                (layer for layer in psd if (layer.name or "").strip().rstrip("\x00") == "PRODUCT_ALPHA"),
                None,
            )
            if photo is None or alpha is None:
                raise SystemExit(f"missing PHOTO_BASE or PRODUCT_ALPHA in {master}")
            image = photo.composite().convert("RGBA")
            alpha_image = alpha.composite().convert("L")
            target = out / family / f"{view}.png"
            alpha_target = out / family / f"{view}-alpha.png"
            target.parent.mkdir(parents=True, exist_ok=True)
            image.save(target)
            alpha_image.save(alpha_target)
            count += 1
    print(f"extracted {count} dedicated face templates -> {out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())