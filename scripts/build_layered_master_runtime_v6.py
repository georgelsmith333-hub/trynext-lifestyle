"""Build smart-v6 derivatives from layered PSD appearance + validated smart-v4 alpha.

The source PSDs provide material lighting, folds, highlights, and family geometry.
The current smart-v4 alpha is retained as the clean, release-tested silhouette so
PSD background/guide pixels cannot leak into the browser runtime.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageChops
from psd_tools import PSDImage

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "attached_assets/trynext-mockup-source-kit/masters-22-photoreal/masters"
ALPHA_ROOT = ROOT / "artifacts/trynex-storefront/public/mockups/smart-v4"
OUT = ROOT / "artifacts/trynex-storefront/public/mockups/smart-v6"
REGISTRY = OUT / "registry.json"

FAMILIES: dict[str, dict[str, Any]] = {
    "tshirt": {"dir": "TShirt", "colors": ["white", "black", "navy", "maroon", "olive", "sky-blue", "grey", "red"], "views": ["front", "back", "left-sleeve", "right-sleeve", "neck-label"]},
    "longsleeve": {"dir": "LongSleeve", "colors": ["white", "black", "navy", "maroon", "olive", "grey", "red", "sky-blue", "burgundy", "forest"], "views": ["front", "back", "left-sleeve", "right-sleeve", "neck-label"]},
    "hoodie": {"dir": "Hoodie", "colors": ["white", "black", "navy", "grey", "maroon", "olive", "red", "sky-blue", "forest", "burgundy"], "views": ["front", "back", "left-sleeve", "right-sleeve", "neck-label"]},
    "mug": {"dir": "Mug", "colors": ["white", "black", "navy", "red", "green", "purple", "sky-blue", "pink", "maroon", "orange"], "views": ["front", "back", "wrap"]},
    "cap": {"dir": "Cap", "colors": ["white", "black", "navy", "maroon", "olive", "red", "grey", "forest"], "views": ["front", "back"]},
    "waterbottle": {"dir": "Bottle", "colors": ["white"], "views": ["front", "back"]},
}
COLOR_RGB = {
    "white": (245, 245, 245), "black": (24, 28, 34), "grey": (116, 122, 130),
    "navy": (20, 48, 88), "maroon": (112, 28, 53), "olive": (92, 103, 50),
    "red": (176, 30, 38), "sky-blue": (67, 145, 196), "burgundy": (108, 24, 47),
    "forest": (22, 105, 63), "green": (22, 140, 70), "purple": (103, 64, 170),
    "pink": (215, 74, 135), "orange": (220, 105, 35),
}

def clean_name(name: str | None) -> str:
    return (name or "").replace("\x00", "").strip()

def layer_by_name(psd: PSDImage, wanted: str):
    for layer in psd.descendants():
        if clean_name(getattr(layer, "name", None)) == wanted:
            return layer
    raise KeyError(f"Missing layer {wanted} in {psd}")

def colorize(photo: Image.Image, color: str) -> Image.Image:
    photo = photo.convert("RGBA")
    if color == "white":
        return photo
    rgb = photo.convert("RGB")
    lum = rgb.convert("L")
    base = Image.new("RGB", rgb.size, COLOR_RGB[color])
    shaded = ImageChops.multiply(base, Image.merge("RGB", (lum, lum, lum)))
    return Image.merge("RGBA", (*shaded.split(), photo.getchannel("A")))

def source_path(family: str, view: str) -> Path:
    spec = FAMILIES[family]
    ext = ".psb" if spec["dir"] in {"Bottle", "Mug"} else ".psd"
    return SOURCE / spec["dir"] / f"{view}.ps{ext[-1]}"

def build_surface(family: str, color: str, view: str) -> tuple[Image.Image, dict[str, Any]]:
    src = source_path(family, "wrap" if view == "wrap" else view)
    if not src.exists():
        raise FileNotFoundError(src)
    psd = PSDImage.open(src)
    appearance = layer_by_name(psd, "PHOTO_BASE").composite(force=True).convert("RGBA")
    alpha_path = ALPHA_ROOT / family / color / f"{view}.png"
    if not alpha_path.exists():
        raise FileNotFoundError(alpha_path)
    validated_alpha = Image.open(alpha_path).convert("RGBA").getchannel("A")
    appearance = colorize(appearance, color)
    appearance.putalpha(validated_alpha)
    metadata = {
        "sourceMaster": str(src.relative_to(ROOT)),
        "sourceFormat": src.suffix.lstrip("."),
        "sourceView": view,
        "alphaSource": str(alpha_path.relative_to(ROOT)),
        "alphaPixels": sum(a > 0 for a in validated_alpha.getdata()),
        "smartObjectName": None,
    }
    for layer in psd.descendants():
        if layer.kind == "smartobject":
            metadata["smartObjectName"] = getattr(layer.smart_object, "name", None)
    return appearance, metadata

def main() -> None:
    if OUT.exists():
        for path in sorted(OUT.rglob("*"), reverse=True):
            if path.is_file(): path.unlink()
            elif path.is_dir(): path.rmdir()
    OUT.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, Any]] = []
    for family, spec in FAMILIES.items():
        for color in spec["colors"]:
            for view in spec["views"]:
                image, meta = build_surface(family, color, view)
                dest = OUT / family / color / f"{view}.png"
                dest.parent.mkdir(parents=True, exist_ok=True)
                image.save(dest, "PNG", optimize=True)
                rows.append({"family": family, "color": color, "view": view, "path": f"/mockups/smart-v6/{family}/{color}/{view}.png", **meta})
    REGISTRY.write_text(json.dumps({"schemaVersion": 1, "root": "/mockups/smart-v6", "surfaceCount": len(rows), "surfaces": rows}, indent=2) + "\n")
    print(json.dumps({"surfaceCount": len(rows), "registry": str(REGISTRY)}, indent=2))

if __name__ == "__main__":
    main()
