from __future__ import annotations

import json
import shutil
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "artifacts/trynex-storefront/public/mockups"
SRC = PUBLIC / "normalized-cutouts"
OUT = PUBLIC / "source-kit-v2"
OUT.mkdir(parents=True, exist_ok=True)

records = []
for src in sorted(SRC.glob("*-front.png")):
    parts = src.stem.split("-")
    if len(parts) < 3:
        continue
    category = parts[0]
    color = "-".join(parts[1:-1])
    face = parts[-1]
    if category not in {"tshirt", "longsleeve", "hoodie", "mug", "cap", "waterbottle"}:
        continue
    with Image.open(src) as im:
        rgba = im.convert("RGBA")
        alpha = rgba.getchannel("A")
        bbox = alpha.getbbox()
        alpha_values = list(alpha.getdata())
        coverage = sum(1 for value in alpha_values if value > 8) / max(1, len(alpha_values))
        out_dir = OUT / category / color
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / f"{face}.png"
        # Preserve the verified product silhouette and embedded source lighting;
        # the runtime resolver will draw this one transparent base exactly once.
        rgba.save(out, optimize=True)
        records.append({
            "category": category,
            "colorSlug": color,
            "face": face,
            "source": str(src.relative_to(ROOT)).replace("\\", "/"),
            "cutout": str(out.relative_to(ROOT)).replace("\\", "/"),
            "width": rgba.width,
            "height": rgba.height,
            "alphaBounds": list(bbox) if bbox else None,
            "alphaCoverage": round(coverage, 6),
            "status": "canonical-v2-cutout",
        })

index = {
    "schema": "trynext-smart-mockup-source-kit/v2",
    "runtimeRule": "draw-one-transparent-cutout-base",
    "duplicateBasePass": False,
    "syntheticShadow": False,
    "items": records,
}
(OUT / "index.json").write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"count": len(records), "categories": sorted({r['category'] for r in records}), "output": str(OUT)}, indent=2))
