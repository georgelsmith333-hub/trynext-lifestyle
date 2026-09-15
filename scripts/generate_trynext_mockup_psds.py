#!/usr/bin/env python3
"""
Generate the Trynext product mockup source kit.

This intentionally lives outside the storefront runtime. The storefront keeps
its current photo-based fallback assets; this script creates a separately
versioned source kit containing:

  - one 1024px PNG preview per catalog color and view
  - one editable, raster-layered PSD per catalog color and view
  - a manifest with the exact product/color/view/print-zone mapping

The available product photography is 1024px, so the source kit does not claim
to be a print-resolution production file. It is an editable mockup source kit
for the current Design Studio previews. For true 300dpi apparel production,
the source photography should later be replaced with higher-resolution captures
without changing the layer contract or manifest shape.
"""

from __future__ import annotations

import json
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
MOCKUPS = ROOT / "artifacts" / "trynext-storefront" / "public" / "mockups"
OUTPUT = ROOT / "attached_assets" / "trynext-mockup-source-kit"
PREVIEWS = OUTPUT / "previews"
PSDS = OUTPUT / "psd"
SOURCE = OUTPUT / "source"
MANIFEST = OUTPUT / "manifest.json"
README = OUTPUT / "README.md"
CANVAS = 1024


def _add_nix_python_paths() -> None:
    """Make the script work with the preinstalled Replit/Nix image tooling."""

    nix = Path("/nix/store")
    # psd-tools 1.10.x calls Pillow's `has_transparency_data` API. Replit's
    # Python path can contain older Pillow builds from unrelated packages, so
    # choose the compatible Nix build explicitly instead of relying on import
    # order.
    preferred = (
        "*python3.11-psd-tools-1.10.2",
        "*python3.11-pillow-11.2.1",
        "*python3.11-numpy-1.26.4",
        "*python3.11-attrs-24.2.0",
        "*python3.11-six-1.16.0",
    )
    for pattern in preferred:
        candidates = sorted(nix.glob(pattern), key=str)
        if not candidates:
            continue
        site = candidates[-1] / "lib" / "python3.11" / "site-packages"
        if site.exists() and str(site) not in sys.path:
            sys.path.insert(0, str(site))


_add_nix_python_paths()

from PIL import Image, ImageChops, ImageColor, ImageDraw, ImageEnhance, ImageFilter, ImageOps  # noqa: E402
from psd_tools import PSDImage  # noqa: E402
from psd_tools.api.layers import PixelLayer  # noqa: E402


@dataclass(frozen=True)
class Color:
    name: str
    hex: str

    @property
    def slug(self) -> str:
        return self.name.lower().replace(" ", "-")


@dataclass(frozen=True)
class Product:
    id: str
    name: str
    category: str
    colors: tuple[Color, ...]
    front_zone: tuple[int, int, int, int]
    back_zone: tuple[int, int, int, int] | None
    front_photo: str
    back_photo: str | None
    front_cutout: str
    back_cutout: str | None
    dark_front_photo: str | None = None
    dark_back_photo: str | None = None
    dark_front_cutout: str | None = None
    dark_back_cutout: str | None = None


def c(name: str, value: str) -> Color:
    return Color(name, value)


TSHIRT_COLORS = (
    c("White", "#F8F7F4"),
    c("Black", "#1a1a1a"),
    c("Navy", "#1e3a5f"),
    c("Maroon", "#7f1d1d"),
    c("Olive", "#4a5240"),
    c("Sky Blue", "#0ea5e9"),
    c("Grey", "#6b7280"),
    c("Red", "#dc2626"),
)
LONGSLEEVE_COLORS = (
    c("White", "#F5F5F3"),
    c("Black", "#1a1a1a"),
    c("Navy", "#1e3a5f"),
    c("Maroon", "#7f1d1d"),
    c("Olive", "#4a5240"),
    c("Grey", "#6b7280"),
    c("Red", "#dc2626"),
    c("Sky Blue", "#0ea5e9"),
    c("Burgundy", "#6b1a2c"),
    c("Forest", "#166534"),
)
HOODIE_COLORS = (
    c("White", "#F2EFE9"),
    c("Black", "#1a1a1a"),
    c("Navy", "#1e3a5f"),
    c("Grey", "#6b7280"),
    c("Maroon", "#7f1d1d"),
    c("Olive", "#4a5240"),
    c("Red", "#dc2626"),
    c("Sky Blue", "#0ea5e9"),
    c("Forest", "#166534"),
    c("Burgundy", "#6b1a2c"),
)
MUG_COLORS = (
    c("White", "#F5F5F5"),
    c("Black", "#1C1917"),
    c("Navy", "#1e3a5f"),
    c("Red", "#dc2626"),
    c("Green", "#16a34a"),
    c("Purple", "#7c3aed"),
    c("Sky Blue", "#0ea5e9"),
    c("Pink", "#ec4899"),
    c("Maroon", "#7f1d1d"),
    c("Orange", "#ea580c"),
)
CAP_COLORS = (
    c("White", "#F5F2EC"),
    c("Black", "#1a1a1a"),
    c("Navy", "#1e3a5f"),
    c("Maroon", "#7f1d1d"),
    c("Olive", "#4a5240"),
    c("Red", "#dc2626"),
    c("Grey", "#6b7280"),
    c("Forest", "#166534"),
)
BOTTLE_COLORS = (
    c("White", "#F4F3F1"),
    c("Black", "#1C1917"),
    c("Navy", "#1e3a5f"),
    c("Forest", "#166534"),
    c("Sky Blue", "#0ea5e9"),
    c("Red", "#dc2626"),
    c("Pink", "#f472b6"),
    c("Teal", "#0f766e"),
)


PRODUCTS = (
    Product(
        "tshirt",
        "Unisex T-Shirt",
        "tshirt",
        TSHIRT_COLORS,
        (240, 185, 520, 580),
        (240, 185, 520, 580),
        "new/white-tshirt-front.png",
        "new/white-tshirt-back.png",
        "new/white-tshirt-front-cutout.png",
        "new/white-tshirt-back-cutout.png",
        dark_front_photo="new/black-tshirt-front.png",
        dark_back_photo="new/black-tshirt-back.png",
        dark_front_cutout="new/black-tshirt-front-cutout.png",
        dark_back_cutout="new/black-tshirt-back-cutout.png",
    ),
    Product(
        "longsleeve",
        "Unisex Long Sleeve",
        "longsleeve",
        LONGSLEEVE_COLORS,
        (312, 222, 376, 404),
        (292, 195, 416, 458),
        "white-longsleeve-front.png",
        "white-longsleeve-back.png",
        "white-longsleeve-front-cutout-real.png",
        "white-longsleeve-back-cutout-real.png",
        dark_front_photo="black-longsleeve-front_2.png",
        dark_back_photo=None,
        dark_front_cutout="black-longsleeve-front-cutout.png",
        dark_back_cutout="black-longsleeve-back-cutout.png",
    ),
    Product(
        "hoodie",
        "Unisex Hoodie",
        "hoodie",
        HOODIE_COLORS,
        (240, 270, 520, 400),
        (292, 184, 416, 448),
        "white-hoodie-front.png",
        "white-hoodie-back.png",
        "white-hoodie-front-cutout-real.png",
        "white-hoodie-back-cutout-real.png",
        dark_front_photo="black-hoodie-front-real.png",
        dark_back_photo="black-hoodie-back-real.png",
        dark_front_cutout="black-hoodie-front-cutout-real.png",
        dark_back_cutout="black-hoodie-back-cutout-real.png",
    ),
    Product(
        "mug",
        "Coffee Mug",
        "mug",
        MUG_COLORS,
        (225, 215, 380, 530),
        (225, 215, 380, 530),
        "white-mug-front.png",
        None,
        "white-mug-front-cutout.png",
        None,
        dark_front_photo="black-mug-front.png",
        dark_front_cutout="black-mug-front-cutout.png",
    ),
    Product(
        "cap",
        "Structured Cap",
        "cap",
        CAP_COLORS,
        (302, 222, 396, 252),
        (302, 222, 396, 252),
        "white-cap-front.png",
        "source/cap-back-reference.png",
        "white-cap-front-cutout.png",
        "source/cap-back-cutout.png",
    ),
    Product(
        "waterbottle",
        "Water Bottle",
        "waterbottle",
        BOTTLE_COLORS,
        (260, 214, 480, 548),
        (260, 214, 480, 548),
        "white-waterbottle-front.png",
        None,
        "source/waterbottle-front-cutout.png",
        None,
    ),
)


PHOTO_BY_COLOR = {
    "tshirt": {
        "navy": ("new/navy-tshirt-front.png", "new/navy-tshirt-back.png"),
        "red": ("new/red-tshirt-front.png", "new/red-tshirt-back.png"),
        "grey": ("grey-tshirt-front.png", "grey-tshirt-back.png"),
        "maroon": ("maroon-tshirt-front.png", "maroon-tshirt-back.png"),
        "olive": ("olive-tshirt-front.png", "olive-tshirt-back.png"),
        "sky-blue": ("skyblue-tshirt-front.png", "skyblue-tshirt-back.png"),
    },
    "longsleeve": {
        "navy": ("navy-longsleeve-front.png", None),
        "grey": ("grey-longsleeve-front.png", None),
        "maroon": ("maroon-longsleeve-front.png", None),
        "olive": ("olive-longsleeve-front.png", None),
        "red": ("red-longsleeve-front.png", None),
        "sky-blue": ("skyblue-longsleeve-front.png", None),
        "forest": ("forest-longsleeve-front.png", None),
        "burgundy": ("burgundy-longsleeve-front.png", None),
    },
    "hoodie": {
        "navy": ("navy-hoodie-front.png", None),
        "grey": ("grey-hoodie-front.png", None),
        "maroon": ("maroon-hoodie-front.png", None),
        "olive": ("olive-hoodie-front.png", None),
        "red": ("red-hoodie-front.png", None),
        "sky-blue": ("skyblue-hoodie-front.png", None),
        "forest": ("forest-hoodie-front.png", None),
        "burgundy": ("burgundy-hoodie-front.png", None),
    },
    "waterbottle": {
        "black": ("black-waterbottle-front.png", None),
        "navy": ("navy-waterbottle-front.png", None),
        "forest": ("forest-waterbottle-front.png", None),
        "sky-blue": ("skyblue-waterbottle-front.png", None),
        "red": ("red-waterbottle-front.png", None),
        "pink": ("pink-waterbottle-front.png", None),
        "teal": ("teal-waterbottle-front.png", None),
    },
}


def path_for(relative: str) -> Path:
    if relative.startswith("source/"):
        return SOURCE / relative.removeprefix("source/")
    return MOCKUPS / relative


def open_rgba(relative: str) -> Image.Image:
    image = Image.open(path_for(relative)).convert("RGBA")
    if image.size != (CANVAS, CANVAS):
        image = image.resize((CANVAS, CANVAS), Image.Resampling.LANCZOS)
    return image


def hex_rgb(value: str) -> tuple[int, int, int]:
    return ImageColor.getrgb(value)


def scale_rgb(value: tuple[int, int, int], factor: float) -> tuple[int, int, int]:
    return tuple(max(0, min(255, round(channel * factor))) for channel in value)


def alpha_from_cutout(image: Image.Image) -> Image.Image:
    return image.getchannel("A")


def derive_alpha_from_photo(image: Image.Image) -> Image.Image:
    """Remove a near-white studio background from a generated photo."""

    rgb = image.convert("RGB")
    sample = rgb.getpixel((0, 0))
    background = Image.new("RGB", rgb.size, sample)
    difference = ImageChops.difference(rgb, background).convert("L")
    # Preserve a soft edge while treating tiny background noise as transparent.
    alpha = difference.point(lambda px: max(0, min(255, (px - 7) * 10)))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.45))
    return alpha


def cutout_from_photo(relative: str) -> Image.Image:
    photo = open_rgba(relative)
    alpha = photo.getchannel("A")
    if alpha.getextrema() != (255, 255):
        return photo
    photo.putalpha(derive_alpha_from_photo(photo))
    return photo


def colorize_cutout(cutout: Image.Image, color: Color) -> Image.Image:
    """Tint a neutral cutout while retaining its photographic luminance."""

    rgb = cutout.convert("RGB")
    luminance = ImageOps.grayscale(rgb)
    target = hex_rgb(color.hex)
    dark = scale_rgb(target, 0.40)
    light = scale_rgb(target, 1.12)
    tinted = ImageOps.colorize(luminance, black=dark, white=light).convert("RGBA")
    tinted.putalpha(cutout.getchannel("A"))
    return tinted


def photo_with_cutout_alpha(photo: str, cutout: str) -> Image.Image:
    image = open_rgba(photo)
    alpha = alpha_from_cutout(open_rgba(cutout))
    image.putalpha(alpha)
    return image


def color_photo(product: Product, color: Color, view: str) -> tuple[Image.Image, str]:
    color_key = color.slug
    is_white = color_key == "white"
    is_black = color_key == "black"
    photo_pair = PHOTO_BY_COLOR.get(product.id, {}).get(color_key)

    if view == "back" and product.id in {"mug", "waterbottle"}:
        front, strategy = color_photo(product, color, "front")
        return ImageOps.mirror(front), f"mirrored {strategy}"

    if product.id == "cap" and view == "back":
        back = open_rgba(product.back_cutout or product.back_photo or product.front_cutout)
        return (
            back if is_white else colorize_cutout(back, color),
            "generated rear reference" if is_white else "tinted generated rear reference",
        )

    if view == "back":
        cutout_path = product.back_cutout or product.front_cutout
        dark_cutout = product.dark_back_cutout
        dark_photo = product.dark_back_photo
        base_photo = product.back_photo
        if is_black and dark_cutout:
            if dark_photo and Path(path_for(dark_photo)).exists():
                return photo_with_cutout_alpha(dark_photo, dark_cutout), "black studio photo"
            return open_rgba(dark_cutout), "black cutout"
        if is_white:
            return open_rgba(cutout_path), "white cutout"
        if photo_pair and photo_pair[1]:
            return photo_with_cutout_alpha(photo_pair[1], product.front_cutout), "color studio photo"
        return colorize_cutout(open_rgba(cutout_path), color), "tinted neutral cutout"

    # Front view.
    if is_black and product.dark_front_cutout:
        if product.dark_front_photo and Path(path_for(product.dark_front_photo)).exists():
            return (
                photo_with_cutout_alpha(product.dark_front_photo, product.dark_front_cutout),
                "black studio photo",
            )
        return open_rgba(product.dark_front_cutout), "black cutout"
    if is_white:
        return open_rgba(product.front_cutout), "white cutout"
    if photo_pair and photo_pair[0]:
        return photo_with_cutout_alpha(photo_pair[0], product.front_cutout), "color studio photo"
    if product.id == "cap":
        return colorize_cutout(open_rgba(product.front_cutout), color), "tinted cap cutout"
    if product.id == "mug":
        return colorize_cutout(open_rgba(product.front_cutout), color), "tinted mug cutout"
    return colorize_cutout(open_rgba(product.front_cutout), color), "tinted neutral cutout"


def studio_preview(product_image: Image.Image) -> Image.Image:
    background = Image.new("RGBA", (CANVAS, CANVAS), (250, 248, 245, 255))
    # The cutout assets already carry photographic shadows. This softens only
    # the edge for generated references that did not have one baked in.
    background.alpha_composite(product_image)
    return background


def guide_layer(zone: tuple[int, int, int, int]) -> Image.Image:
    layer = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    x, y, w, h = zone
    draw.rectangle((x, y, x + w, y + h), fill=(232, 93, 4, 32), outline=(232, 93, 4, 220), width=4)
    draw.line((x, y, x + w, y + h), fill=(232, 93, 4, 150), width=2)
    draw.line((x + w, y, x, y + h), fill=(232, 93, 4, 150), width=2)
    return layer


def create_psd(
    output_path: Path,
    product: Product,
    color: Color,
    view: str,
    product_image: Image.Image,
    zone: tuple[int, int, int, int],
) -> list[str]:
    preview = studio_preview(product_image)
    psd = PSDImage.frompil(preview)

    background = Image.new("RGBA", (CANVAS, CANVAS), (250, 248, 245, 255))
    artwork = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    mask = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    mask_draw = ImageDraw.Draw(mask)
    x, y, w, h = zone
    mask_draw.rectangle((x, y, x + w, y + h), fill=(255, 255, 255, 180))
    guide = guide_layer(zone)

    layers = [
        PixelLayer.frompil(background, psd, "Studio Background — Warm White"),
        PixelLayer.frompil(
            product_image,
            psd,
            f"Product Photo — {color.name} — {view.title()}",
        ),
        PixelLayer.frompil(
            mask,
            psd,
            f"Print Zone Mask — {view.title()} — toggle visibility",
        ),
        PixelLayer.frompil(artwork, psd, "Artwork — Place Design Here"),
        PixelLayer.frompil(guide, psd, f"Placement Guide — {view.title()} — toggle visibility"),
    ]

    # PixelLayer.frompil creates raster layers with proper alpha channels.
    # Hide guides by default so the PSD opens as a clean product photograph.
    layers[2].visible = False
    layers[4].visible = False
    for layer in layers:
        psd.append(layer)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    psd.save(output_path)
    return [layer.name for layer in layers]


def validate_psd(path: Path, expected_layers: Iterable[str]) -> None:
    psd = PSDImage.open(path)
    names = [layer.name for layer in psd]
    expected = list(expected_layers)
    if psd.size != (CANVAS, CANVAS):
        raise RuntimeError(f"{path}: expected {CANVAS}x{CANVAS}, got {psd.size}")
    if names != expected:
        raise RuntimeError(f"{path}: layer mismatch: {names!r} != {expected!r}")


def prepare_source_assets() -> None:
    SOURCE.mkdir(parents=True, exist_ok=True)
    cap_reference = ROOT / "attached_assets" / "generated_images" / "trynext-cap-back-reference.png"
    if not cap_reference.exists():
        raise FileNotFoundError(
            "Missing generated cap back reference: "
            f"{cap_reference}. Generate or restore it before running this script."
        )
    target = SOURCE / "cap-back-reference.png"
    target.write_bytes(cap_reference.read_bytes())
    # The generated image has a warm-white background. Derive a reusable alpha
    # cutout once; all eight cap colors share this calibrated rear silhouette.
    reference = open_rgba("source/cap-back-reference.png")
    alpha = derive_alpha_from_photo(reference)
    reference.putalpha(alpha)
    reference.save(SOURCE / "cap-back-cutout.png")

    # The legacy bottle cutout has a rectangular grey spill around the lower
    # body. Build a clean silhouette from the existing full photo. The bottle
    # itself is geometry-masked, while the cap hardware uses a restrained
    # photo-difference extraction so background pixels do not enter the alpha.
    full_photo = open_rgba("white-waterbottle-front.png")
    bottle_alpha = Image.new("L", (CANVAS, CANVAS), 0)
    draw = ImageDraw.Draw(bottle_alpha)
    # Bottle body and shoulder. These coordinates follow the full-photo
    # framing, not the wider legacy mask's framing.
    draw.polygon(
        [(450, 228), (574, 228), (574, 282), (600, 300), (622, 330), (632, 350),
         (632, 885), (620, 914), (402, 914), (390, 885), (390, 350),
         (400, 330), (425, 300), (450, 282)],
        fill=255,
    )
    draw.rounded_rectangle((390, 330, 632, 914), radius=30, fill=255)
    # Cap with its open carry hole.
    draw.rounded_rectangle((454, 130, 575, 244), radius=26, fill=255)
    draw.ellipse((477, 151, 548, 222), fill=0)
    # Extract the metal hardware from the photo against its local grey studio
    # background. Keep the envelope tight to the cap ring and carabiner.
    rgb = full_photo.convert("RGB")
    sample = rgb.getpixel((0, 0))
    difference = ImageChops.difference(rgb, Image.new("RGB", rgb.size, sample)).convert("L")
    hardware_detail = difference.point(lambda px: max(0, min(255, (px - 60) * 12)))
    envelope = Image.new("L", (CANVAS, CANVAS), 0)
    ImageDraw.Draw(envelope).polygon(
        [(535, 135), (585, 145), (675, 260), (665, 350), (555, 300)],
        fill=255,
    )
    hardware = ImageChops.multiply(hardware_detail, envelope)
    bottle_alpha = ImageChops.lighter(bottle_alpha, hardware)
    contact_shadow = Image.new("L", (CANVAS, CANVAS), 0)
    ImageDraw.Draw(contact_shadow).ellipse((372, 892, 650, 950), fill=72)
    contact_shadow = contact_shadow.filter(ImageFilter.GaussianBlur(8))
    bottle_alpha = ImageChops.lighter(bottle_alpha, contact_shadow)
    full_photo.putalpha(bottle_alpha)
    full_photo.save(SOURCE / "waterbottle-front-cutout.png")


def generate() -> dict:
    prepare_source_assets()
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    PSDS.mkdir(parents=True, exist_ok=True)

    documents: list[dict] = []
    for product in PRODUCTS:
        for color in product.colors:
            for view in ("front", "back"):
                zone = product.front_zone if view == "front" else (product.back_zone or product.front_zone)
                image, strategy = color_photo(product, color, view)
                preview = studio_preview(image)

                stem = f"{product.id}-{color.slug}-{view}"
                preview_path = PREVIEWS / f"{stem}.png"
                psd_path = PSDS / f"{stem}.psd"
                preview.save(preview_path, optimize=True)

                layer_names = create_psd(psd_path, product, color, view, image, zone)
                validate_psd(psd_path, layer_names)

                documents.append(
                    {
                        "product": product.id,
                        "productName": product.name,
                        "category": product.category,
                        "color": color.name,
                        "hex": color.hex,
                        "view": view,
                        "viewLabel": (
                            "Left Side" if product.id == "mug" and view == "front"
                            else "Right Side" if product.id == "mug"
                            else view.title()
                        ),
                        "printZone": {"x": zone[0], "y": zone[1], "w": zone[2], "h": zone[3]},
                        "preview": str(preview_path.relative_to(OUTPUT)).replace("\\", "/"),
                        "psd": str(psd_path.relative_to(OUTPUT)).replace("\\", "/"),
                        "sourceStrategy": strategy,
                        "layers": layer_names,
                    }
                )

    manifest = {
        "schemaVersion": 1,
        "canvas": {"width": CANVAS, "height": CANVAS, "colorSpace": "RGBA"},
        "documentCount": len(documents),
        "products": [product.id for product in PRODUCTS],
        "documents": documents,
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    README.write_text(
        """# Trynext generated mockup source kit

This folder contains the generated 1024×1024 preview and editable PSD source
for every currently supported Trynext product color and view.

## Coverage

- 6 products
- 54 catalog colors
- 2 views per color
- 108 PSD documents
- 108 matching PNG previews

`manifest.json` is the source of truth for product IDs, color hex values,
view labels, calibrated print zones, and the source strategy used for each
document.

## PSD layer contract

Every PSD is a raster-layered Photoshop document with these layers, from
bottom to top:

1. `Studio Background — Warm White`
2. `Product Photo — <color> — <view>`
3. `Print Zone Mask — <view> — toggle visibility` (hidden by default)
4. `Artwork — Place Design Here` (blank, editable raster layer)
5. `Placement Guide — <view> — toggle visibility` (hidden by default)

The documents are intentionally kept separate from the current
`/public/mockups` fallback assets. They can be reviewed or wired into the
Design Studio without risking the existing customer-facing mockup pipeline.

The source photographs are 1024px, so this is a web/mockup source kit rather
than a 300dpi print-production master. Replace the product photo layer with
higher-resolution photography later while keeping the layer names and manifest
contract unchanged. The kit is kept in `attached_assets` rather than the
public runtime folder so the storefront does not ship the editable PSD sources
to customers.
""",
        encoding="utf-8",
    )
    return manifest


def main() -> int:
    manifest = generate()
    print(
        f"Generated {manifest['documentCount']} PSDs and "
        f"{manifest['documentCount']} previews under {OUTPUT}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())