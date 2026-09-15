#!/usr/bin/env python3
"""
normalize_mockups_v3.py
========================
Fixes size/position jumps across all product colors by remapping each
normalized photo (and its matching RGBA cutout) so the garment occupies
the SAME region in the 1024×1024 canvas for every color variant.

Algorithm:
1. Read every input photo from the immutable source-kit directory.
2. Use one reviewed silhouette mask per product family/face, kept separately
   from runtime output. The mask is the silhouette authority; it is never
   inferred from a generated mockup.
3. Use one deterministic source frame per source-kit photo. This aligns that
   photo to its reviewed mask before masking. Frames are explicit because the
   supplied product photos have different studio crops, especially for white
   garments where background-detection is unsafe.
4. Remap the source-kit photo and silhouette to one explicit target rectangle
   per product family/face.
5. Composite source pixels only through the reviewed alpha, which removes
   embedded studio panels and background ghosts.
6. Write both the RGB normalized photo and the RGBA cutout.

Requirements: only Pillow (PIL) — no numpy, no scipy.
"""

from __future__ import annotations
import os, sys
from collections import deque
from PIL import Image, ImageChops, ImageFilter, ImageOps

SOURCE_DIR  = "artifacts/trynex-storefront/public/mockups/source-kit"
MASK_DIR    = "scripts/mockup_mask_templates"
NORM_DIR    = "artifacts/trynex-storefront/public/mockups/normalized"
CUTOUT_DIR  = "artifacts/trynex-storefront/public/mockups/normalized-cutouts"
BG_COLOR    = (250, 248, 245)   # warm-white studio background
BG_THRESH   = 18                # max channel deviation to count as background

# ── Color slugs per category (mirrors SOURCE_KIT_COLOR_SLUGS in mockups.tsx) ─
SLUGS: dict[str, list[str]] = {
    "tshirt":      ["white","black","navy","maroon","olive","sky-blue","grey","red"],
    "longsleeve":  ["white","black","navy","maroon","olive","grey","red","sky-blue","burgundy","forest"],
    "hoodie":      ["white","black","navy","grey","maroon","olive","red","sky-blue","forest","burgundy"],
    "mug":         ["white","black","navy","red","green","purple","sky-blue","pink","maroon","orange"],
    "cap":         ["white","black","navy","maroon","olive","red","grey","forest"],
    "waterbottle": ["white","black","navy","forest","sky-blue","red","pink","teal"],
}
# Every source-kit product has a front/back pair. Even curved products use
# their back image in the resolver and cart viewer, so the reproducible
# normalizer must process all six categories on both faces.
HAS_BACK: set[str] = {
    "tshirt", "longsleeve", "hoodie", "mug", "cap", "waterbottle",
}

# The runtime resolver and the 3D billboard use these same frames. Front/back
# deliberately share one target rectangle per product so a face switch cannot
# change the apparent product size or billboard aspect ratio.
TARGET_FRAMES: dict[str, dict[str, tuple[int, int, int, int]]] = {
    "tshirt": {
        "front": (43, 66, 980, 957),
        "back":  (43, 66, 980, 957),
    },
    "longsleeve": {
        "front": (53, 94, 970, 930),
        "back":  (53, 94, 970, 930),
    },
    "hoodie": {
        "front": (54, 43, 970, 980),
        "back":  (54, 43, 970, 980),
    },
    "mug": {
        "front": (143, 192, 881, 829),
        "back":  (143, 192, 881, 829),
    },
    "cap": {
        "front": (162, 184, 862, 839),
        "back":  (162, 184, 862, 839),
    },
    "waterbottle": {
        "front": (351, 78, 673, 944),
        "back":  (351, 78, 673, 944),
    },
}

# The immutable source-kit photos were supplied with different studio crops.
# These frames identify the product-bearing region in each source photo; after
# the crop is resized to the reviewed mask's bounding rectangle, the reviewed
# alpha can safely strip all background pixels. White garments deliberately use
# explicit frames -- do not derive them with warm-white background detection.
#
# A compact family-level default is safe only where all source-kit photos share
# the same production crop. Per-colour entries override that default when a
# source photo differs. Values are (left, top, right, bottom) in the original
# 1024×1024 source canvas.
SOURCE_FRAMES: dict[str, dict[str, dict[str, tuple[int, int, int, int]]]] = {
    "tshirt": {
        "front": {
            "default": (46, 53, 977, 958),
            "white": (30, 52, 988, 960), "black": (106, 86, 912, 930),
            "maroon": (98, 104, 920, 942), "olive": (158, 98, 870, 924),
            "sky-blue": (148, 74, 880, 912), "grey": (142, 86, 884, 958),
        },
        "back": {
            "default": (147, 86, 883, 912),
            "white": (36, 62, 982, 964), "black": (126, 64, 898, 934),
            "maroon": (140, 106, 878, 930), "olive": (112, 92, 924, 952),
            "sky-blue": (120, 80, 920, 934), "grey": (166, 96, 856, 954),
            "red": (138, 60, 886, 926),
        },
    },
    "longsleeve": {
        "front": {
            "default": (54, 90, 986, 930),
            "black": (144, 98, 876, 906), "maroon": (156, 90, 894, 930),
            "olive": (116, 92, 892, 930), "grey": (158, 116, 862, 922),
            "red": (62, 88, 970, 930), "sky-blue": (178, 88, 846, 880),
            "burgundy": (152, 90, 866, 930), "forest": (156, 90, 866, 924),
        },
        "back": {
            "default": (92, 140, 926, 882),
            "black": (24, 52, 1000, 966),
        },
    },
    "hoodie": {
        "front": {
            "default": (97, 33, 926, 949),
            "white": (52, 34, 970, 984), "black": (156, 60, 910, 966),
            "grey": (180, 84, 844, 942), "maroon": (168, 74, 854, 926),
            "olive": (156, 56, 868, 886), "red": (52, 46, 970, 968),
            "sky-blue": (192, 80, 832, 884), "forest": (164, 70, 858, 930),
            "burgundy": (180, 114, 842, 886),
        },
        "back": {
            "default": (32, 60, 994, 974),
            "black": (192, 56, 846, 916),
        },
    },
    "mug": {
        "front": {
            "default": (228, 208, 958, 822),
            "black": (266, 222, 946, 828),
        },
        "back": {
            "default": (68, 208, 796, 822),
            "black": (80, 222, 760, 828),
            "purple": (66, 208, 796, 822), "sky-blue": (66, 208, 798, 822),
            "pink": (66, 208, 798, 822),
        },
    },
    "cap": {
        "front": {
            "default": (196, 196, 828, 808),
            "olive": (196, 196, 828, 806), "red": (194, 194, 828, 808),
        },
        "back": {
            "default": (126, 198, 978, 830),
            "black": (126, 198, 980, 832), "navy": (126, 198, 982, 836),
            "maroon": (124, 198, 990, 838), "olive": (128, 202, 934, 822),
            "red": (124, 198, 1012, 862), "grey": (126, 198, 970, 826),
            "forest": (124, 198, 990, 838),
        },
    },
    "waterbottle": {
        "front": {
            "default": (384, 130, 658, 944),
            "black": (394, 130, 640, 894), "navy": (408, 198, 624, 870),
            "forest": (390, 188, 642, 914), "sky-blue": (390, 152, 634, 896),
            "red": (390, 172, 628, 930), "pink": (388, 186, 642, 932),
            "teal": (398, 160, 644, 852),
        },
        "back": {
            "default": (366, 130, 638, 944),
            "black": (386, 130, 632, 894), "navy": (400, 198, 616, 870),
            "forest": (378, 188, 634, 914), "sky-blue": (392, 190, 634, 896),
            "red": (396, 172, 634, 930), "pink": (390, 186, 636, 932),
            "teal": (380, 158, 628, 852),
        },
    },
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def norm_path(cat: str, color: str, face: str) -> str:
    return os.path.join(NORM_DIR, f"{cat}-{color}-{face}.png")

def source_path(cat: str, color: str, face: str) -> str:
    return os.path.join(SOURCE_DIR, f"{cat}-{color}-{face}.png")


def mask_path(cat: str, face: str) -> str:
    return os.path.join(MASK_DIR, f"{cat}-{face}.png")


def cutout_path(cat: str, color: str, face: str) -> str:
    return os.path.join(CUTOUT_DIR, f"{cat}-{color}-{face}.png")


def reviewed_alpha_template(cat: str, face: str) -> Image.Image:
    """Return the immutable alpha authority for one product face.

    The original mug-back template was generated from a low-contrast white
    photo and has a transparent leak through the right half of the ceramic
    body.  The reviewed back photo is the horizontal mirror of the reviewed
    front photo, so derive the back silhouette from the front template instead
    of trusting the contaminated derivative.
    """
    if cat == "mug" and face == "back":
        source = Image.open(mask_path("mug", "front"))
        return clean_alpha_template(ImageOps.mirror(source))
    return clean_alpha_template(Image.open(mask_path(cat, face)))


def source_frame(cat: str, color: str, face: str) -> tuple[int, int, int, int]:
    """Return the reviewed, deterministic product frame for one source photo."""
    try:
        frames = SOURCE_FRAMES[cat][face]
        frame = frames.get(color, frames["default"])
    except KeyError as exc:
        raise ValueError(f"No source-frame specification for {cat}/{face}/{color}") from exc
    x0, y0, x1, y1 = frame
    if not (0 <= x0 < x1 <= 1024 and 0 <= y0 < y1 <= 1024):
        raise ValueError(f"Invalid source frame for {cat}/{color}/{face}: {frame}")
    if (x1 - x0) < 120 or (y1 - y0) < 120:
        raise ValueError(f"Implausibly small source frame for {cat}/{color}/{face}: {frame}")
    return frame


def align_source_to_mask(
    photo: Image.Image,
    frame: tuple[int, int, int, int],
    mask_bb: tuple[int, int, int, int],
) -> Image.Image:
    """Place a photo's product frame into the coordinate system of its mask."""
    mx0, my0, mx1, my1 = mask_bb
    aligned = Image.new("RGB", (1024, 1024), BG_COLOR)
    aligned.paste(
        photo.convert("RGB").crop(frame).resize((mx1 - mx0, my1 - my0), Image.LANCZOS),
        (mx0, my0),
    )
    return aligned


def clean_alpha_template(alpha: Image.Image) -> Image.Image:
    """Return a hard, source-shadow-proof product silhouette.

    The source-kit photos contain soft studio shadows close to several garment
    edges. Semi-transparent template pixels blend those shadows back into the
    runtime photo and create the false second-product/ghost effect. The
    template remains the geometry authority, but runtime alpha is intentionally
    binary so only product pixels are composited.
    """
    return alpha.convert("L").point(lambda value: 255 if value >= 128 else 0)


def remap_clean_photo(photo: Image.Image, alpha: Image.Image, src_bb: tuple, dst_bb: tuple) -> Image.Image:
    """Place a photo through its alpha silhouette on the stable target frame.

    The output is intentionally RGB for 2D/export/cart consumers, but the
    background is rebuilt from BG_COLOR rather than copied from the source.
    This is what removes dark backdrop shapes that previously survived behind
    black garments.
    """
    sx0,sy0,sx1,sy1 = src_bb
    dx0,dy0,dx1,dy1 = dst_bb
    dw, dh = max(1, dx1-dx0), max(1, dy1-dy0)
    photo_crop = photo.convert("RGB").crop(src_bb).resize((dw, dh), Image.LANCZOS)
    alpha_crop = alpha.convert("L").crop(src_bb).resize((dw, dh), Image.LANCZOS)
    canvas = Image.new("RGB", (1024, 1024), BG_COLOR)
    canvas.paste(photo_crop, (dx0, dy0), alpha_crop)
    return canvas


def alpha_photo(photo: Image.Image, alpha: Image.Image) -> Image.Image:
    """Build an RGBA photo from a clean silhouette mask.

    This intentionally ignores legacy normalized-cutout files. Some of those
    derivatives were made from contaminated masks and contain opaque blobs
    over the product. The reviewed alpha template is the geometry reference;
    the selected color photo supplies the visible pixels.
    """
    rgba = photo.convert("RGBA")
    rgba.putalpha(alpha.convert("L"))
    return rgba


def remap_rgba(src: Image.Image, src_bb: tuple, dst_bb: tuple) -> Image.Image:
    """Remap the alpha silhouette into the exact stable target rectangle."""
    sx0,sy0,sx1,sy1 = src_bb
    dx0,dy0,dx1,dy1 = dst_bb
    dw, dh = max(1, dx1-dx0), max(1, dy1-dy0)
    garment = src.convert("RGBA").crop(src_bb).resize((dw, dh), Image.LANCZOS)
    canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
    # paste with mask so alpha is honoured
    canvas.paste(garment, (dx0, dy0), garment)
    return canvas


# ── Main ──────────────────────────────────────────────────────────────────────

print("="*60)
print("PASS 1 — Validate source-kit inputs and reviewed alpha templates")
print("="*60)

source_files: list[str] = []
missing: list[str] = []
mask_files: list[str] = []

for cat, slugs in SLUGS.items():
    faces = ["front","back"] if cat in HAS_BACK else ["front"]
    for face in faces:
        for color in slugs:
            p = source_path(cat, color, face)
            if not os.path.exists(p):
                missing.append(p)
            else:
                source_files.append(p)
        print(f"  {cat}/{face}: checked {len(slugs)} source-kit photos; target={TARGET_FRAMES[cat][face]}")
        mask = mask_path(cat, face)
        if not os.path.exists(mask):
            missing.append(mask)
        else:
            mask_files.append(mask)
        for color in slugs:
            try:
                source_frame(cat, color, face)
            except ValueError as exc:
                missing.append(str(exc))

if missing:
    print("\nMissing source-kit inputs:", file=sys.stderr)
    for p in missing:
        print(f"  {p}", file=sys.stderr)
    raise SystemExit(1)

bad_masks: list[str] = []
for p in mask_files:
    mask = Image.open(p).convert("L")
    if mask.size != (1024, 1024) or not mask.getbbox():
        bad_masks.append(p)
if bad_masks:
    print("\nInvalid alpha templates:", file=sys.stderr)
    for p in bad_masks:
        print(f"  {p}", file=sys.stderr)
    raise SystemExit(1)

print(f"\nValidated {len(source_files)} immutable source-kit photos and {len(mask_files)} alpha templates")

print()
print("="*60)
print("PASS 2 — Remap photos to stable target frames + regenerate cutouts")
print("="*60)

done = 0
errors = 0

for cat, slugs in SLUGS.items():
    faces = ["front","back"] if cat in HAS_BACK else ["front"]
    for face in faces:
        dst_bb = TARGET_FRAMES.get(cat, {}).get(face)
        if not dst_bb:
            continue
        # Reviewed alpha templates are the only geometry reference. They are
        # stored separately from runtime output so reruns cannot recursively
        # normalize an already-normalized image or inherit contaminated pixels.
        reference_path = mask_path(cat, face)
        reference_alpha = reviewed_alpha_template(cat, face)
        reference_bb = reference_alpha.point(lambda p: 255 if p > 20 else 0).getbbox()
        if not reference_bb:
            print(f"  EMPTY reference mask {reference_path}")
            continue
        for color in slugs:
            source_ = source_path(cat, color, face)
            np_  = norm_path(cat, color, face)
            cp_  = cutout_path(cat, color, face)
            try:
                # Align each immutable source photo to the mask coordinate
                # system before applying alpha. Applying reference_alpha at the
                # source's original coordinates is the bug that produced the
                # large pale studio panels behind several product colours.
                rgb_src = Image.open(source_).convert("RGB")
                frame = source_frame(cat, color, face)
                aligned_src = align_source_to_mask(rgb_src, frame, reference_bb)
                cutout_source = alpha_photo(aligned_src, reference_alpha)
                cutout_out = remap_rgba(cutout_source, reference_bb, dst_bb)

                # ── Rebuild RGB photo through alpha (no backdrop ghosts) ───
                rgb_out = remap_clean_photo(aligned_src, reference_alpha, reference_bb, dst_bb)
                rgb_out.save(np_, "PNG")
                cutout_out.save(cp_, "PNG")

                done += 1
                if done % 10 == 0:
                    print(f"  ... {done} files processed")
            except Exception as exc:
                errors += 1
                print(f"  ERROR {cat}-{color}-{face}: {exc}", file=sys.stderr)

print(f"\nDone: {done} remapped, {errors} errors")
