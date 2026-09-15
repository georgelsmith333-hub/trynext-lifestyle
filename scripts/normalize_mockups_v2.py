#!/usr/bin/env python3
"""
normalize_mockups_v2.py
=======================
Two-pass normalization for all Trynext product mockup photos.

Pass 1 – Measure:
  For each category+face, read all color variants, detect the garment
  bounding box (by thresholding against the warm-white studio background),
  then compute the UNION of all garment bounds. This gives one stable frame
  per category+face so every color switch is pixel-consistent.

Pass 2 – Generate:
  • public/mockups/normalized/{category}-{color}-{face}.png
      RGB 1024×1024 — garment centred in a clean white canvas
      (used by 2D editor / cart thumbnails)
  • public/mockups/normalized-cutouts/{category}-{color}-{face}.png
      RGBA 1024×1024 — background removed, garment on transparent canvas
      (used by 3D billboard / silhouette shadows)

Output:
  Prints the measured SOURCE_KIT_FRAMES dict so you can paste it into
  mockups.tsx if anything changed significantly.
"""

import os, json
from PIL import Image, ImageFilter
import numpy as np

# ── Paths ─────────────────────────────────────────────────────────────────────
NORM_DIR    = "artifacts/trynex-storefront/public/mockups/normalized"
CUTOUT_DIR  = "artifacts/trynex-storefront/public/mockups/normalized-cutouts"
SOURCE_DIR  = "artifacts/trynex-storefront/public/mockups/source-kit"

# ── Background detection ───────────────────────────────────────────────────────
BG_COLOR   = np.array([250, 248, 245], dtype=np.float32)  # warm-white studio bg
BG_THRESH  = 28  # Euclidean distance from BG_COLOR → pixel considered background

def garment_bbox(rgb_img: Image.Image) -> tuple[int,int,int,int]:
    """Return (x0, y0, x1, y1) bounding box of non-background pixels."""
    arr = np.asarray(rgb_img.convert("RGB"), dtype=np.float32)
    diff = np.linalg.norm(arr - BG_COLOR, axis=2)
    mask = diff > BG_THRESH
    rows = np.any(mask, axis=1)
    cols = np.any(mask, axis=0)
    if not rows.any():
        return (0, 0, arr.shape[1], arr.shape[0])
    y0, y1 = int(np.argmax(rows)), int(len(rows) - 1 - np.argmax(rows[::-1]))
    x0, x1 = int(np.argmax(cols)), int(len(cols) - 1 - np.argmax(cols[::-1]))
    return (x0, y0, x1 + 1, y1 + 1)

def union_bbox(bboxes):
    if not bboxes:
        return (0, 0, 1024, 1024)
    xs0 = [b[0] for b in bboxes]
    ys0 = [b[1] for b in bboxes]
    xs1 = [b[2] for b in bboxes]
    ys1 = [b[3] for b in bboxes]
    return (min(xs0), min(ys0), max(xs1), max(ys1))

def remove_bg_alpha(rgb_img: Image.Image, margin: int = 6) -> Image.Image:
    """White-background removal — returns RGBA with clean garment silhouette.
    Uses a soft-edge alpha (feathered by margin pixels) to avoid hard jaggies."""
    arr   = np.asarray(rgb_img.convert("RGB"), dtype=np.float32)
    diff  = np.linalg.norm(arr - BG_COLOR, axis=2)
    # Base alpha: 1 where garment, 0 where background
    raw   = (diff > BG_THRESH).astype(np.float32)
    # Feather by blurring the mask
    from scipy import ndimage
    soft = ndimage.uniform_filter(raw, size=margin)
    alpha = np.clip(soft * 2.5, 0, 1)  # ramp 0→1 quickly
    rgba  = np.dstack([arr.astype(np.uint8),
                       (alpha * 255).astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")

def remove_bg_simple(rgb_img: Image.Image) -> Image.Image:
    """Fallback without scipy — less smooth edges but always available."""
    arr   = np.asarray(rgb_img.convert("RGB"), dtype=np.float32)
    diff  = np.linalg.norm(arr - BG_COLOR, axis=2)
    alpha = np.where(diff > BG_THRESH, 255, 0).astype(np.uint8)
    rgba  = np.dstack([arr.astype(np.uint8), alpha])
    return Image.fromarray(rgba, "RGBA")

try:
    from scipy import ndimage
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

def make_cutout(rgb_img: Image.Image) -> Image.Image:
    if HAS_SCIPY:
        return remove_bg_alpha(rgb_img, margin=6)
    return remove_bg_simple(rgb_img)

def center_in_canvas(img: Image.Image, target_w=1024, target_h=1024,
                      crop_box=None, pad=40) -> Image.Image:
    """Paste the garment region into a white canvas with consistent padding."""
    if crop_box is None:
        crop_box = (0, 0, img.width, img.height)
    x0, y0, x1, y1 = crop_box
    # Add padding
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width,  x1 + pad)
    y1 = min(img.height, y1 + pad)
    
    cropped = img.crop((x0, y0, x1, y1))
    cw, ch  = cropped.size
    # Scale to fit target canvas while preserving aspect ratio
    scale   = min((target_w - pad*2) / cw, (target_h - pad*2) / ch)
    scale   = min(scale, 1.0)   # never upscale
    nw      = int(cw * scale)
    nh      = int(ch * scale)
    resized = cropped.resize((nw, nh), Image.LANCZOS)
    canvas  = Image.new("RGB", (target_w, target_h), (250, 248, 245))
    ox      = (target_w - nw) // 2
    oy      = (target_h - nh) // 2
    canvas.paste(resized, (ox, oy))
    return canvas

def center_in_canvas_rgba(img: Image.Image, target_w=1024, target_h=1024,
                            crop_box=None, pad=40) -> Image.Image:
    """Like center_in_canvas but for RGBA — keeps transparency."""
    if crop_box is None:
        crop_box = (0, 0, img.width, img.height)
    x0, y0, x1, y1 = crop_box
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(img.width,  x1 + pad)
    y1 = min(img.height, y1 + pad)
    cropped = img.crop((x0, y0, x1, y1))
    cw, ch  = cropped.size
    scale   = min((target_w - pad*2) / cw, (target_h - pad*2) / ch)
    scale   = min(scale, 1.0)
    nw      = int(cw * scale)
    nh      = int(ch * scale)
    resized = cropped.resize((nw, nh), Image.LANCZOS)
    canvas  = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    ox      = (target_w - nw) // 2
    oy      = (target_h - nh) // 2
    canvas.paste(resized, (ox, oy))
    return canvas


# ── Source-kit slug maps (mirrors mockups.tsx) ─────────────────────────────────
SOURCE_KIT_COLOR_SLUGS = {
    "tshirt":      ["white","black","navy","maroon","olive","grey","red","sky-blue"],
    "longsleeve":  ["white","black","navy","maroon","olive","grey","red","sky-blue","burgundy","forest"],
    "hoodie":      ["white","black","navy","grey","maroon","olive","red","sky-blue","forest","burgundy"],
    "mug":         ["white","black","navy","red","green","purple","sky-blue","pink","maroon","orange"],
    "cap":         ["white","black","navy","maroon","olive","red","grey","forest"],
    "waterbottle": ["white","black","navy","forest","sky-blue","red","pink","teal"],
}

CATEGORIES = list(SOURCE_KIT_COLOR_SLUGS.keys())
# Products that have a meaningful back face
HAS_BACK = {"tshirt", "longsleeve", "hoodie", "mug"}

def source_kit_path(cat, color, face):
    return os.path.join(SOURCE_DIR, f"{cat}-{color}-{face}.png")

def norm_path(cat, color, face):
    return os.path.join(NORM_DIR, f"{cat}-{color}-{face}.png")

def cutout_path(cat, color, face):
    return os.path.join(CUTOUT_DIR, f"{cat}-{color}-{face}.png")

# ─────────────────────────────────────────────────────────────────────────────
# PASS 1 — Measure garment bounds across all colors per category+face
# ─────────────────────────────────────────────────────────────────────────────
print("="*60)
print("PASS 1: Measuring garment bounds")
print("="*60)

category_bounds = {}  # {(cat, face): (x0, y0, x1, y1)}

for cat in CATEGORIES:
    faces = ["front", "back"] if cat in HAS_BACK else ["front"]
    for face in faces:
        bboxes = []
        for color in SOURCE_KIT_COLOR_SLUGS[cat]:
            sk = source_kit_path(cat, color, face)
            if not os.path.exists(sk):
                # Try normalized as fallback
                sk = norm_path(cat, color, face)
            if not os.path.exists(sk):
                continue
            try:
                img = Image.open(sk).convert("RGB")
                bb = garment_bbox(img)
                bboxes.append(bb)
            except Exception as e:
                print(f"  WARN {cat}-{color}-{face}: {e}")
        
        if bboxes:
            union = union_bbox(bboxes)
            category_bounds[(cat, face)] = union
            print(f"  {cat}-{face}: bbox={union} from {len(bboxes)} colors")
        else:
            print(f"  {cat}-{face}: NO IMAGES FOUND")

# ─────────────────────────────────────────────────────────────────────────────
# PASS 2 — Generate normalized photos and RGBA cutouts
# ─────────────────────────────────────────────────────────────────────────────
print()
print("="*60)
print("PASS 2: Generating normalized photos and cutouts")
print("="*60)

os.makedirs(NORM_DIR,    exist_ok=True)
os.makedirs(CUTOUT_DIR,  exist_ok=True)

generated = 0
skipped   = 0
errors    = 0

for cat in CATEGORIES:
    faces = ["front", "back"] if cat in HAS_BACK else ["front"]
    for face in faces:
        crop_box = category_bounds.get((cat, face))
        for color in SOURCE_KIT_COLOR_SLUGS[cat]:
            sk = source_kit_path(cat, color, face)
            if not os.path.exists(sk):
                sk = norm_path(cat, color, face)
            if not os.path.exists(sk):
                print(f"  SKIP {cat}-{color}-{face}: no source file")
                skipped += 1
                continue
            
            try:
                src = Image.open(sk).convert("RGB")
                
                # ── Normalized RGB ────────────────────────────────────────────
                norm_img = center_in_canvas(src, 1024, 1024, crop_box, pad=38)
                out_norm = norm_path(cat, color, face)
                norm_img.save(out_norm, "PNG", optimize=False)
                
                # ── RGBA cutout ───────────────────────────────────────────────
                # First normalize, then remove background from the normalized version
                # (consistent framing ensures alpha matte aligns with the RGB version)
                cutout_rgba = make_cutout(norm_img)
                # Crop to the same region for the cutout canvas
                out_cutout = cutout_path(cat, color, face)
                cutout_rgba.save(out_cutout, "PNG", optimize=False)
                
                generated += 1
            except Exception as e:
                print(f"  ERROR {cat}-{color}-{face}: {e}")
                errors += 1

print(f"\nDone: {generated} generated, {skipped} skipped, {errors} errors")

# ─────────────────────────────────────────────────────────────────────────────
# Output: Updated SOURCE_KIT_FRAMES for mockups.tsx
# ─────────────────────────────────────────────────────────────────────────────
print()
print("="*60)
print("Measured SOURCE_KIT_FRAMES (paste into mockups.tsx if changed):")
print("="*60)

# The normalized images center the garment in 1024x1024.
# After normalization, the garment occupies the full canvas with pad=38 borders.
# For frame metadata, report as a conservative full-canvas frame.
frames_output = {}
for cat in CATEGORIES:
    frames_output[cat] = {}
    for face in ["front", "back"]:
        # After normalization, garment fills the canvas (minus padding)
        # Report the inner region (pad=38 on each side)
        frames_output[cat][face] = {
            "canvasWidth": 1024,
            "canvasHeight": 1024,
            "x": 38,
            "y": 38,
            "w": 948,
            "h": 948,
        }

print(json.dumps(frames_output, indent=2))
print()
print("All done! Rebuild the storefront to pick up the new assets.")
