"""Build full apparel detail derivatives from complete front masters.

Unlike the old apparel-v5 builder, this does not crop a rectangular piece out of
an already-cropped sleeve. It isolates the complete shoulder-to-cuff panel from
the full front product silhouette, mirrors it for the opposite sleeve, and keeps
the validated smart-v4 alpha as the edge authority.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageChops, ImageOps

ROOT = Path(__file__).resolve().parents[1]
SOURCE_ROOT = ROOT / "artifacts/trynex-storefront/public/mockups/smart-v6"
OUT = ROOT / "artifacts/trynestorefront/public/mockups/smart-v7"
# Correct typo defensively; the canonical output must be under the real storefront.
OUT = ROOT / "artifacts/trynex-storefront/public/mockups/smart-v7"

FAMILIES = {
    "tshirt": ["white", "black", "navy", "maroon", "olive", "sky-blue", "grey", "red"],
    "longsleeve": ["white", "black", "navy", "maroon", "olive", "grey", "red", "sky-blue", "burgundy", "forest"],
    "hoodie": ["white", "black", "navy", "grey", "maroon", "olive", "red", "sky-blue", "forest", "burgundy"],
}
VIEWS = {"tshirt": ["front", "back", "left-sleeve", "right-sleeve", "neck-label"], "longsleeve": ["front", "back", "left-sleeve", "right-sleeve", "neck-label"], "hoodie": ["front", "back", "left-sleeve", "right-sleeve", "neck-label"]}

# Viewer-left panel, ordered around the sleeve from shoulder outer edge to
# shoulder inner edge. Coordinates were measured against the 1024px full front
# products and intentionally stop at the cuff, not in the torso.
SLEEVE_POLYGONS = {
    "tshirt": [(292, 276), (238, 298), (170, 345), (100, 425), (86, 500), (172, 520), (238, 455), (298, 365), (342, 305), (365, 284)],
    "longsleeve": [(342, 270), (278, 302), (220, 360), (162, 470), (110, 620), (86, 790), (157, 842), (224, 760), (286, 585), (338, 420), (372, 320), (390, 286)],
    "hoodie": [(270, 330), (220, 350), (170, 420), (130, 520), (95, 650), (90, 800), (155, 835), (200, 760), (245, 650), (280, 540), (305, 430), (320, 350)],
}

def alpha_bbox(img: Image.Image):
    return img.getchannel("A").getbbox()

def isolate_panel(base: Image.Image, family: str) -> Image.Image:
    base = base.convert("RGBA")
    mask = Image.new("L", base.size, 0)
    ImageDraw.Draw(mask).polygon(SLEEVE_POLYGONS[family], fill=255)
    alpha = ImageChops.multiply(base.getchannel("A"), mask)
    panel = base.copy()
    panel.putalpha(alpha)
    bbox = alpha_bbox(panel)
    if not bbox:
        raise RuntimeError(f"No sleeve alpha for {family}")
    panel = panel.crop(bbox)
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    scale = min(820 / max(1, panel.height), 760 / max(1, panel.width))
    size = (round(panel.width * scale), round(panel.height * scale))
    panel = panel.resize(size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(panel, ((1024 - size[0]) // 2, (1024 - size[1]) // 2))
    return canvas

def isolate_neck(base: Image.Image, family: str) -> Image.Image:
    base = base.convert("RGBA")
    # Upper chest and collar detail, following the real neckline rather than a
    # rectangular crop. The bottom edge remains broad enough for a label print.
    poly = {
        "tshirt": [(350, 255), (410, 220), (500, 210), (590, 220), (675, 255), (700, 430), (325, 430)],
        "longsleeve": [(350, 250), (415, 215), (500, 205), (590, 215), (675, 250), (710, 440), (315, 440)],
        "hoodie": [(330, 225), (410, 195), (500, 190), (590, 195), (690, 225), (720, 440), (300, 440)],
    }[family]
    mask = Image.new("L", base.size, 0)
    ImageDraw.Draw(mask).polygon(poly, fill=255)
    alpha = ImageChops.multiply(base.getchannel("A"), mask)
    detail = base.copy()
    detail.putalpha(alpha)
    bbox = detail.getchannel("A").getbbox()
    if not bbox:
        raise RuntimeError(f"No neck alpha for {family}")
    detail = detail.crop(bbox)
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    scale = min(760 / max(1, detail.width), 540 / max(1, detail.height))
    size = (round(detail.width * scale), round(detail.height * scale))
    detail = detail.resize(size, Image.Resampling.LANCZOS)
    canvas.alpha_composite(detail, ((1024 - size[0]) // 2, (1024 - size[1]) // 2))
    return canvas

def main() -> None:
    if OUT.exists():
        for path in sorted(OUT.rglob("*"), reverse=True):
            if path.is_file(): path.unlink()
            elif path.is_dir(): path.rmdir()
    OUT.mkdir(parents=True, exist_ok=True)
    rows: list[dict[str, Any]] = []
    for family, colors in FAMILIES.items():
        for color in colors:
            base = Image.open(SOURCE_ROOT / family / color / "front.png").convert("RGBA")
            left = isolate_panel(base, family)
            right = ImageOps.mirror(left)
            neck = isolate_neck(base, family)
            for view in VIEWS[family]:
                source = SOURCE_ROOT / family / color / (view.replace("left-sleeve", "front").replace("right-sleeve", "front").replace("neck-label", "front") + ".png")
                if view == "left-sleeve": image = left
                elif view == "right-sleeve": image = right
                elif view == "neck-label": image = neck
                else: image = Image.open(source).convert("RGBA")
                dest = OUT / family / color / f"{view}.png"
                dest.parent.mkdir(parents=True, exist_ok=True)
                image.save(dest, "PNG", optimize=True)
                rows.append({"family": family, "color": color, "view": view, "path": f"/mockups/smart-v7/{family}/{color}/{view}.png", "source": str(source.relative_to(ROOT)), "generatedBy": "full-apparel-detail-v7", "detailGeometry": view in {"left-sleeve", "right-sleeve", "neck-label"}})
    # Copy non-apparel smart-v6 surfaces unchanged into smart-v7 so the matrix is complete.
    for family, colors, views in [("mug", ["white", "black", "navy", "red", "green", "purple", "sky-blue", "pink", "maroon", "orange"], ["front", "back", "wrap"]), ("cap", ["white", "black", "navy", "maroon", "olive", "red", "grey", "forest"], ["front", "back"]), ("waterbottle", ["white"], ["front", "back"])]:
        for color in colors:
            for view in views:
                src = SOURCE_ROOT / family / color / f"{view}.png"
                dest = OUT / family / color / f"{view}.png"
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(src.read_bytes())
                rows.append({"family": family, "color": color, "view": view, "path": f"/mockups/smart-v7/{family}/{color}/{view}.png", "source": str(src.relative_to(ROOT)), "generatedBy": "layered-master-v6-pass-through", "detailGeometry": False})
    (OUT / "registry.json").write_text(json.dumps({"schemaVersion": 1, "root": "/mockups/smart-v7", "surfaceCount": len(rows), "surfaces": rows}, indent=2) + "\n")
    print(json.dumps({"surfaceCount": len(rows), "registry": str(OUT / 'registry.json')}, indent=2))

if __name__ == "__main__":
    main()
