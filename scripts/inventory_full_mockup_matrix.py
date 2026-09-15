from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "artifacts/trynex-storefront/public/mockups"

COLORS = {
    "tshirt": ["white", "black", "navy", "maroon", "olive", "sky-blue", "grey", "red"],
    "longsleeve": ["white", "black", "navy", "maroon", "olive", "grey", "red", "sky-blue", "burgundy", "forest"],
    "hoodie": ["white", "black", "navy", "grey", "maroon", "olive", "red", "sky-blue", "forest", "burgundy"],
    "mug": ["white", "black", "navy", "red", "green", "purple", "sky-blue", "pink", "maroon", "orange"],
    "cap": ["white", "black", "navy", "maroon", "olive", "red", "grey", "forest"],
    "waterbottle": ["white", "black", "navy", "forest", "sky-blue", "red", "pink", "teal"],
}
VIEWS = {
    "tshirt": ["front", "back", "left-sleeve", "right-sleeve", "neck-label"],
    "longsleeve": ["front", "back", "left-sleeve", "right-sleeve", "neck-label"],
    "hoodie": ["front", "back", "left-sleeve", "right-sleeve", "neck-label"],
    "mug": ["front", "back", "wrap"],
    "cap": ["front", "back"],
    "waterbottle": ["front", "back"],
}


def exists(*parts: str) -> bool:
    return (ASSET_ROOT.joinpath(*parts)).is_file()


def classify(family: str, color: str, view: str) -> dict:
    source = exists("source-kit-v3", family, color, f"{view}.png")
    canonical = exists("canonical", family, color, f"{view}.png")
    normalized = exists("normalized", f"{family}-{color}-{view}.png")
    legacy = exists(family, color, f"{view}.png")
    return {
        "family": family,
        "color": color,
        "view": view,
        "sourceKitV3": source,
        "canonical": canonical,
        "normalized": normalized,
        "legacy": legacy,
        "activeExpected": f"/mockups/source-kit-v3/{family}/{color}/{view}.png",
    }


rows = [classify(family, color, view) for family, colors in COLORS.items() for color in colors for view in VIEWS[family]]
summary = {}
for family in COLORS:
    family_rows = [row for row in rows if row["family"] == family]
    summary[family] = {
        "required": len(family_rows),
        "sourceKitV3": sum(row["sourceKitV3"] for row in family_rows),
        "canonical": sum(row["canonical"] for row in family_rows),
        "normalized": sum(row["normalized"] for row in family_rows),
        "legacy": sum(row["legacy"] for row in family_rows),
        "missingSourceKitV3": [f"{row['color']}/{row['view']}" for row in family_rows if not row["sourceKitV3"]],
    }

result = {
    "assetRoot": str(ASSET_ROOT),
    "families": list(COLORS),
    "viewsByFamily": VIEWS,
    "summary": summary,
    "rows": rows,
}

out = ROOT / "docs/FULL_MOCKUP_MATRIX_INVENTORY_2026-08-17.json"
out.write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"output": str(out), "summary": summary}, indent=2))
