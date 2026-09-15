#!/usr/bin/env python3
"""Audit Trynext source-kit and runtime mockup frames.

The source kit is intentionally opaque studio photography.  Runtime photos
must retain that aspect ratio, while runtime cutouts must have a real alpha
channel and a stable product bounding box.  This script is deliberately
dependency-light so it can run in the workspace without numpy/OpenCV.

Usage:
  python3 scripts/audit_trynext_mockups.py
  python3 scripts/audit_trynext_mockups.py --json /tmp/trynext-mockups.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "artifacts" / "trynext-storefront" / "public" / "mockups"
SOURCE = PUBLIC / "source-kit"
NORMALIZED = PUBLIC / "normalized"
NORMALIZED_CUTOUTS = PUBLIC / "normalized-cutouts"
SOURCE_KIT_ASSETS = ROOT / "attached_assets" / "trynext-mockup-source-kit"
MANIFEST_PATH = SOURCE_KIT_ASSETS / "manifest.json"

CATEGORIES = ("tshirt", "longsleeve", "hoodie", "mug", "cap", "waterbottle")

# These are the common target bounds used by the reviewed transparent fallback
# assets.  They are also the expected bounds for exact-color derivatives.
TARGET_FRAMES: dict[str, dict[str, tuple[int, int, int, int]]] = {
    "tshirt": {"front": (62, 82, 962, 942), "back": (62, 82, 962, 942)},
    "longsleeve": {"front": (72, 112, 952, 912), "back": (72, 112, 952, 912)},
    "hoodie": {"front": (72, 62, 952, 962), "back": (72, 62, 952, 962)},
    "mug": {"front": (162, 212, 862, 812), "back": (162, 212, 862, 812)},
    "cap": {"front": (162, 202, 862, 822), "back": (162, 202, 862, 822)},
    "waterbottle": {"front": (362, 97, 662, 927), "back": (362, 97, 662, 927)},
}


def alpha_bbox(path: Path) -> tuple[int, int, int, int] | None:
    with Image.open(path) as image:
        if "A" not in image.getbands():
            return None
        bbox = image.getchannel("A").getbbox()
        return tuple(bbox) if bbox else None


def report_one(category: str, face: str, stem: str) -> dict[str, Any]:
    # Runtime source-kit previews are flattened into public/mockups/source-kit.
    # The editable source contract lives in attached_assets and its manifest
    # uses paths relative to that source-kit directory.
    source_path = SOURCE / f"{stem}.png"
    manifest_source_path = SOURCE_KIT_ASSETS / "previews" / f"{stem}.png"
    photo_path = NORMALIZED / f"{stem}.png"
    cutout_path = NORMALIZED_CUTOUTS / f"{stem}.png"
    item: dict[str, Any] = {
        "category": category,
        "face": face,
        "stem": stem,
        "source": str(source_path.relative_to(ROOT)),
        "manifestSource": str(manifest_source_path.relative_to(ROOT)),
        "photo": str(photo_path.relative_to(ROOT)),
        "cutout": str(cutout_path.relative_to(ROOT)),
        "targetFrame": TARGET_FRAMES[category][face],
        "errors": [],
    }

    if not source_path.is_file() and not manifest_source_path.is_file():
        item["errors"].append("missing source-kit image")
        return item
    if not photo_path.is_file():
        item["errors"].append("missing normalized photo")
    if not cutout_path.is_file():
        item["errors"].append("missing normalized cutout")

    source_for_measurement = source_path if source_path.is_file() else manifest_source_path
    with Image.open(source_for_measurement) as source:
        item["sourceSize"] = source.size
        item["sourceMode"] = source.mode
    if photo_path.is_file():
        with Image.open(photo_path) as photo:
            item["photoSize"] = photo.size
            item["photoMode"] = photo.mode
            if photo.size != (1024, 1024):
                item["errors"].append("normalized photo is not 1024x1024")
            if photo.size != (1024, 1024):
                item["errors"].append("normalized photo changed the runtime canvas")
    if cutout_path.is_file():
        with Image.open(cutout_path) as cutout:
            item["cutoutSize"] = cutout.size
            item["cutoutMode"] = cutout.mode
            item["cutoutAlphaExtrema"] = cutout.getchannel("A").getextrema() if "A" in cutout.getbands() else None
        bbox = alpha_bbox(cutout_path)
        item["cutoutAlphaBbox"] = bbox
        if "A" not in Image.open(cutout_path).getbands():
            item["errors"].append("cutout has no alpha channel")
        elif bbox is None:
            item["errors"].append("cutout has no visible pixels")
    return item


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", type=Path, help="also write the full report to this path")
    args = parser.parse_args()

    manifest_errors: list[str] = []
    manifest_documents: list[dict[str, Any]] = []
    if not MANIFEST_PATH.is_file():
        manifest_errors.append("missing editable source-kit manifest")
    else:
        try:
            manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
            manifest_documents = manifest.get("documents", [])
            if not isinstance(manifest_documents, list):
                manifest_errors.append("manifest documents must be an array")
                manifest_documents = []
            if manifest.get("documentCount") != len(manifest_documents):
                manifest_errors.append("manifest documentCount does not match documents length")
            for document in manifest_documents:
                for key in ("preview", "psd"):
                    path_value = document.get(key)
                    if not isinstance(path_value, str) or not (SOURCE_KIT_ASSETS / path_value).is_file():
                        manifest_errors.append(
                            f"manifest {document.get('product')}/{document.get('color')}/{document.get('view')} has missing {key}"
                        )
        except (OSError, json.JSONDecodeError) as exc:
            manifest_errors.append(f"could not read manifest: {exc}")

    items: list[dict[str, Any]] = []
    for category in CATEGORIES:
        stems = sorted(p.stem for p in SOURCE.glob(f"{category}-*-front.png"))
        for stem in stems:
            color = stem[len(category) + 1 : -len("-front")]
            for face in ("front", "back"):
                items.append(report_one(category, face, f"{category}-{color}-{face}"))

    errors = [item for item in items if item["errors"]]
    report = {
        "manifest": str(MANIFEST_PATH.relative_to(ROOT)),
        "manifestDocumentCount": len(manifest_documents),
        "manifestErrors": manifest_errors,
        "sourceRoot": str(SOURCE.relative_to(ROOT)),
        "normalizedRoot": str(NORMALIZED.relative_to(ROOT)),
        "cutoutRoot": str(NORMALIZED_CUTOUTS.relative_to(ROOT)),
        "count": len(items),
        "errorCount": len(errors) + len(manifest_errors),
        "items": items,
    }

    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

    print(
        f"Trynext mockup audit: {len(items)} pairs checked, "
        f"{len(errors) + len(manifest_errors)} errors "
        f"({len(manifest_documents)} manifest documents)"
    )
    for error in manifest_errors:
        print(f"  ERROR manifest: {error}")
    for item in errors:
        print(f"  ERROR {item['stem']}: {', '.join(item['errors'])}")
    return 1 if errors or manifest_errors else 0


if __name__ == "__main__":
    sys.exit(main())