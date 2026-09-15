"""Build transparent runtime derivatives from the extracted layered PSD/PSB masters.

This is intentionally a candidate pipeline. It never claims a missing view is fixed:
all 22 source masters are rendered, and the generated registry records source view,
embedded Smart Object name, alpha geometry, and whether the source is a full product
view or a detail view. Production activation is a separate release-gate decision.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageChops
from psd_tools import PSDImage

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "attached_assets/trynext-mockup-source-kit/masters-22-photoreal/masters"
OUT = ROOT / "artifacts/trynex-storefront/public/mockups/smart-v5"
REGISTRY = ROOT / "artifacts/trynex-storefront/public/mockups/smart-v5/registry.json"

FAMILIES: dict[str, dict[str, Any]] = {
    "tshirt": {"dir": "TShirt", "colors": ["white", "black", "grey", "navy", "maroon", "olive", "red", "sky-blue"], "views": ["front", "back", "left-sleeve", "right-sleeve", "neck-label"]},
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


def rgb_colorize(photo: Image.Image, color: str) -> Image.Image:
    photo = photo.convert("RGBA")
    if color == "white":
        return photo
    rgb = photo.convert("RGB")
    lum = rgb.convert("L")
    base = Image.new("RGB", rgb.size, COLOR_RGB[color])
    shaded = ImageChops.multiply(base, Image.merge("RGB", (lum, lum, lum)))
    return Image.merge("RGBA", (*shaded.split(), photo.getchannel("A")))


def extract_product(psd_path: Path, color: str) -> tuple[Image.Image, dict[str, Any]]:
    psd = PSDImage.open(psd_path)
    photo = layer_by_name(psd, "PHOTO_BASE").composite(force=True).convert("RGBA")
    product_alpha = layer_by_name(psd, "PRODUCT_ALPHA").composite(force=True).convert("L")
    # The PHOTO_BASE already carries transparency, while PRODUCT_ALPHA is the
    # explicit layered product silhouette. Multiplying both preserves anti-aliased
    # edges and removes any guide/background pixels.
    alpha = ImageChops.multiply(photo.getchannel("A"), product_alpha)
    photo.putalpha(alpha)
    result = rgb_colorize(photo, color)
    bbox = alpha.getbbox()
    metadata = {
        "source": str(psd_path.relative_to(ROOT)),
        "sourceSize": [psd.width, psd.height],
        "sourceView": psd_path.stem,
        "sourceFamily": psd_path.parent.name,
        "smartObjectName": None,
        "bbox": list(bbox) if bbox else None,
        "alphaPixels": int(np.count_nonzero(np.asarray(alpha))),
        "alphaExtrema": list(alpha.getextrema()),
    }
    for layer in psd.descendants():
        if layer.kind == "smartobject":
            metadata["smartObjectName"] = getattr(layer.smart_object, "name", None)
            metadata["smartObjectType"] = getattr(layer.smart_object, "filetype", None)
    return result, metadata


def main() -> None:
    if OUT.exists():
        for path in sorted(OUT.rglob("*"), reverse=True):
            if path.is_file():
                path.unlink()
            elif path.is_dir():
                path.rmdir()
    OUT.mkdir(parents=True, exist_ok=True)
    registry: dict[str, Any] = {"schemaVersion": 1, "root": "/mockups/smart-v5", "surfaces": [], "sourceMasters": []}
    cache: dict[tuple[str, str], tuple[Image.Image, dict[str, Any]]] = {}

    for family, spec in FAMILIES.items():
        for view in spec["views"]:
            source_view = "wrap" if view == "wrap" else view
            source_path = SOURCE / spec["dir"] / f"{source_view}.ps{'b' if spec['dir'] in {'Bottle', 'Mug'} else 'd'}"
            if not source_path.exists():
                raise FileNotFoundError(source_path)
            base, source_meta = extract_product(source_path, "white")
            registry["sourceMasters"].append({"family": family, "view": view, **source_meta})
            for color in spec["colors"]:
                key = (str(source_path), color)
                if key not in cache:
                    cache[key] = extract_product(source_path, color)
                image, metadata = cache[key]
                dest = OUT / family / color / f"{view}.png"
                dest.parent.mkdir(parents=True, exist_ok=True)
                image.save(dest, "PNG", optimize=True)
                registry["surfaces"].append({
                    "family": family,
                    "color": color,
                    "view": view,
                    "path": f"/mockups/smart-v5/{family}/{color}/{view}.png",
                    "masterPath": metadata["source"],
                    "masterFormat": Path(metadata["source"]).suffix.lstrip("."),
                    "masterStatus": "layered-source-verified",
                    "smartObjectName": metadata.get("smartObjectName"),
                    "bbox": metadata.get("bbox"),
                    "alphaPixels": metadata.get("alphaPixels"),
                    "detailGeometry": view in {"left-sleeve", "right-sleeve", "neck-label", "wrap"},
                })
    REGISTRY.write_text(json.dumps(registry, indent=2) + "\n")
    print(json.dumps({"surfaceCount": len(registry["surfaces"]), "masterCount": len(registry["sourceMasters"]), "registry": str(REGISTRY)}, indent=2))


if __name__ == "__main__":
    main()
