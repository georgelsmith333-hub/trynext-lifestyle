#!/usr/bin/env python3
"""
Build Photoshop Displace-filter displacement maps for every mockup base.

Photoshop's Filter > Distort > Displace reads a separate grayscale document:
  red channel   -> horizontal shift   (128 = none)
  green channel -> vertical shift     (128 = none)

We derive the map from the low-frequency shading of the product photo, because
fabric folds and body curvature are exactly what should push the artwork around.
Heavy blur keeps the map smooth so the artwork flows over folds instead of
acquiring high-frequency noise.

Usage: python3 tools/make-displacement-maps.py [base-dir] [out-dir]
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

REPO = Path(__file__).resolve().parents[1]
BASE = Path(sys.argv[1]) if len(sys.argv) > 1 else REPO / "dist-mockups" / "_work" / "base"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else REPO / "dist-mockups" / "_work" / "displace"


def build_map(src: Path, dst: Path, blur: int = 41, amplitude: float = 26.0) -> None:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    rgba = np.array(im).astype(np.float32)
    rgb, alpha = rgba[..., :3], rgba[..., 3:4] / 255.0

    lum = rgb.mean(axis=2)

    # Fill transparent areas with the product's mean luminance so the blur
    # is not dragged toward black at the silhouette edge.
    mask = alpha[..., 0] > 0.5
    fill = float(lum[mask].mean()) if mask.any() else 128.0
    lum = np.where(mask, lum, fill)

    # Low-frequency structure only.
    field = Image.fromarray(lum.astype(np.uint8), mode="L").filter(ImageFilter.GaussianBlur(blur))
    f = np.array(field).astype(np.float32)

    # Centre on 128 and scale deviation so 128 stays "no displacement".
    mean, std = float(f.mean()), float(f.std())
    if std < 1e-3:
        std = 1e-3
    dev = (f - mean) / std                      # ~N(0,1)
    dev = np.clip(dev, -3.0, 3.0) / 3.0         # -> [-1, 1]
    level = 128.0 + dev * amplitude             # -> [128-a, 128+a]

    # Horizontal channel from the vertical gradient (folds run across the body),
    # vertical channel from the horizontal gradient.
    gy, gx = np.gradient(f)
    def norm(g: np.ndarray) -> np.ndarray:
        s = float(np.abs(g).std()) or 1e-6
        return np.clip(g / s, -3.0, 3.0) / 3.0

    red = np.clip(128.0 + norm(gx) * amplitude, 0, 255).astype(np.uint8)
    green = np.clip(128.0 + norm(gy) * amplitude, 0, 255).astype(np.uint8)
    blue = np.clip(level, 0, 255).astype(np.uint8)

    out = np.dstack([red, green, blue])
    Image.fromarray(out, mode="RGB").save(dst)


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    files = sorted(BASE.glob("*.png"))
    if not files:
        print(f"no base images in {BASE}", file=sys.stderr)
        return 2
    for f in files:
        build_map(f, OUT / f.name)
    print(f"displacement maps: {len(files)} -> {OUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
