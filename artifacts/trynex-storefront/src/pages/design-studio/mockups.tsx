/* ═══════════════════════════════════════════════════════
   GARMENT MOCKUPS — photographic templates
   All products use a unified 1000×1000 coordinate space.
   The mockup PNGs live in /public/mockups/<id>-<face>.png
════════════════════════════════════════════════════════ */
import { useMemo } from "react";

const tshirtFront          = "/mockups/white-tshirt-front.png";
const tshirtBack           = "/mockups/white-tshirt-back.png";
const tshirtFrontDark      = "/mockups/black-tshirt-front.png";
const tshirtBackDark       = "/mockups/black-tshirt-back.png";
const tshirtFrontCutout    = "/mockups/white-tshirt-front-cutout.png";
const tshirtBackCutout     = "/mockups/white-tshirt-back-cutout.png";
const longsleeveFront      = "/mockups/white-longsleeve-front.png";
const longsleeveBack       = "/mockups/white-longsleeve-back.png";
const longsleeveFrontCutout = "/mockups/white-longsleeve-front-cutout.png";
const longsleeveBackCutout  = "/mockups/white-longsleeve-back-cutout.png";
const hoodieFront          = "/mockups/white-hoodie-front.png";
const hoodieBack           = "/mockups/white-hoodie-back.png";
const hoodieFrontDark      = "/mockups/black-hoodie-front.png";
const hoodieBackDark       = "/mockups/black-hoodie-back.png";
const hoodieFrontCutout    = "/mockups/white-hoodie-front-cutout.png";
const hoodieBackCutout     = "/mockups/white-hoodie-back-cutout.png";
const mugFront             = "/mockups/white-mug-front.png";
const mugFrontDark         = "/mockups/black-mug-front.png";
const mugFrontCutout       = "/mockups/white-mug-front-cutout.png";
const capFront             = "/mockups/white-cap-front.png";
const capFrontDark         = "/mockups/black-cap-front.png";
const capFrontCutout       = "/mockups/white-cap-front-cutout.png";
const waterBottleFront     = "/mockups/white-waterbottle-front.png";
const waterBottleCutout    = "/mockups/white-waterbottle-cutout.png";

/** A single available garment colour (name + hex). */
export interface ProductColor { name: string; hex: string }

export type ProductType =
  | "tshirt"
  | "mug"
  | "hoodie"
  | "cap"
  | "longsleeve"
  | "waterbottle";

/** All possible design zones — front/back are garment views; sleeve/neck are flat templates. */
export type Face =
  | "front"
  | "back"
  | "left-sleeve"
  | "right-sleeve"
  | "neck-label";

export interface PrintZone { x: number; y: number; w: number; h: number }

export interface DesignProduct {
  id: ProductType;
  name: string;
  icon: string;
  category: "tshirt" | "mug" | "hoodie" | "cap" | "longsleeve" | "waterbottle";
  garmentColor: string;
  /** Available garment colours for this product type. */
  colors: ProductColor[];
  description: string;
  badge?: string;
  viewBox: string;
  aspect: number;
  printZone: PrintZone;
  printZoneBack?: PrintZone;
  baseHeight: number;
  frontSrc: string;
  backSrc?: string;
}

/* ── Per-zone print zones ─────────────────────────────────
   All in the unified 1000×1000 viewBox.
   Calibrated against actual product mockup photography.

   Front zones are the standard chest / body print area.
   Back zones are larger (no collar notch) and start higher.
   Hoodie front is intentionally short — stops before kangaroo pocket.

   Garment zones:
     TSHIRT_PZ / _BACK_PZ      — t-shirt front / back
     LONGSLEEVE_PZ / _BACK_PZ  — long-sleeve front / back
     HOODIE_PZ / _BACK_PZ      — hoodie front (above pocket) / back
     CAP_PZ                    — cap front panel
   Flat-template zones (no garment image):
     SLEEVE_PZ      — left-sleeve and right-sleeve
     NECK_LABEL_PZ  — neck-label
   Drinkware zones:
     MUG_SIDE_PZ    — single-side editing (side view)
     MUG_PZ         — full 360° wrap
     WATERBOTTLE_PZ — bottle body (cylindrical section)
──────────────────────────────────────────────────────── */
export const TSHIRT_PZ: PrintZone           = { x: 308, y: 225, w: 384, h: 385 };
export const TSHIRT_BACK_PZ: PrintZone      = { x: 292, y: 192, w: 416, h: 455 };
export const LONGSLEEVE_PZ: PrintZone       = { x: 314, y: 235, w: 372, h: 390 };
export const LONGSLEEVE_BACK_PZ: PrintZone  = { x: 298, y: 200, w: 404, h: 448 };
/** Hoodie front — stops at ~y=530 to clear the kangaroo pocket (pocket starts ~y=565). */
export const HOODIE_PZ: PrintZone           = { x: 338, y: 258, w: 324, h: 272 };
export const HOODIE_BACK_PZ: PrintZone      = { x: 298, y: 188, w: 404, h: 440 };
/** Cap front panel — structured 5-panel cap, panel height ≈ 24% of mockup height. */
export const CAP_PZ: PrintZone              = { x: 342, y: 305, w: 316, h: 248 };
export const MUG_PZ: PrintZone              = { x: 150, y: 180, w: 700, h: 640 };
/** Mug side — starts below the rim band, stops above the base band. */
export const MUG_SIDE_PZ: PrintZone         = { x: 188, y: 252, w: 420, h: 478 };
/** Water bottle — printable front panel on the cylindrical body.
 *  Calibrated to the real 600ml aluminium carabiner bottle (1600×1600 PNG).
 *  Content spans x:[326–660] centre≈493; shoulder ends ~y=275, base ~y=858. */
export const WATERBOTTLE_PZ: PrintZone      = { x: 348, y: 278, w: 290, h: 575 };
/** Sleeve print area — roughly square (1228×1087px real-world ratio). */
export const SLEEVE_PZ: PrintZone           = { x: 175, y: 175, w: 650, h: 650 };
/** Neck label — wider than tall (1299×945px real-world ratio). */
export const NECK_LABEL_PZ: PrintZone       = { x: 150, y: 265, w: 700, h: 470 };

export const WATERBOTTLE_MOCKUP_URL = waterBottleFront;

/* ── Zone configuration ─────────────────────────────────── */
export interface ApparelZone {
  face: Face;
  label: string;
  shortLabel: string;
  /** Indicative print resolution dimensions shown to the designer. */
  pxDimensions: string;
  pz: PrintZone;
  /** Whether this zone uses a flat-template canvas (no garment photo). */
  isFlat: boolean;
}

const FRONT_BACK_DIMS = "4606 × 5787 px";
const SLEEVE_DIMS = "1228 × 1087 px";
const NECK_DIMS = "1299 × 945 px";

/** Returns the ordered print zones for a given product category. */
export function getApparelZones(
  category: DesignProduct["category"],
  productPZ?: PrintZone,
  productBackPZ?: PrintZone,
): ApparelZone[] {
  const frontPZ = productPZ ?? TSHIRT_PZ;
  const backPZ  = productBackPZ ?? frontPZ;
  switch (category) {
    case "tshirt":
    case "longsleeve":
    case "hoodie":
      return [
        { face: "front", label: "Front", shortLabel: "Front", pxDimensions: FRONT_BACK_DIMS, pz: frontPZ, isFlat: false },
        { face: "back",  label: "Back",  shortLabel: "Back",  pxDimensions: FRONT_BACK_DIMS, pz: backPZ,  isFlat: false },
      ];
    default:
      return [
        { face: "front", label: "Front", shortLabel: "Front", pxDimensions: FRONT_BACK_DIMS, pz: frontPZ, isFlat: false },
      ];
  }
}

/** Get the print zone for a given face and product (used by DesignStudio). */
export function getZonePZ(face: Face, product: DesignProduct): PrintZone {
  if (product.category === "mug") return MUG_SIDE_PZ;
  if (face === "left-sleeve" || face === "right-sleeve") return SLEEVE_PZ;
  if (face === "neck-label") return NECK_LABEL_PZ;
  if (face === "back" && product.printZoneBack) return product.printZoneBack;
  return product.printZone;
}

const VIEWBOX = "0 0 1000 1000";
const ASPECT = 1;
const BASE = 1000;

export const PRODUCTS: DesignProduct[] = [
  {
    id: "tshirt", name: "Unisex T-Shirt", icon: "👕", category: "tshirt",
    garmentColor: "#F5F5F3",
    colors: [
      { name: "White",    hex: "#F8F7F4" }, { name: "Black",    hex: "#1a1a1a" },
      { name: "Navy",     hex: "#1e3a5f" }, { name: "Maroon",   hex: "#7f1d1d" },
      { name: "Olive",    hex: "#4a5240" }, { name: "Sky Blue", hex: "#0ea5e9" },
      { name: "Grey",     hex: "#6b7280" }, { name: "Red",      hex: "#dc2626" },
    ],
    description: "230GSM Cotton", badge: "Best Seller",
    viewBox: VIEWBOX, aspect: ASPECT, baseHeight: BASE,
    printZone: TSHIRT_PZ, printZoneBack: TSHIRT_BACK_PZ,
    frontSrc: tshirtFront, backSrc: tshirtBack,
  },
  {
    id: "longsleeve", name: "Unisex Long Sleeve", icon: "👔", category: "longsleeve",
    garmentColor: "#F5F5F3",
    colors: [
      { name: "White",    hex: "#F5F5F3" }, { name: "Black",    hex: "#1a1a1a" },
      { name: "Navy",     hex: "#1e3a5f" }, { name: "Maroon",   hex: "#7f1d1d" },
      { name: "Olive",    hex: "#4a5240" }, { name: "Grey",     hex: "#6b7280" },
      { name: "Red",      hex: "#dc2626" }, { name: "Sky Blue", hex: "#0ea5e9" },
      { name: "Burgundy", hex: "#6b1a2c" }, { name: "Forest",   hex: "#166534" },
    ],
    description: "240GSM Cotton",
    viewBox: VIEWBOX, aspect: ASPECT, baseHeight: BASE,
    printZone: LONGSLEEVE_PZ, printZoneBack: LONGSLEEVE_BACK_PZ,
    frontSrc: longsleeveFront, backSrc: longsleeveBack,
  },
  {
    id: "hoodie", name: "Unisex Hoodie", icon: "🧥", category: "hoodie",
    garmentColor: "#F2EFE9",
    colors: [
      { name: "White",    hex: "#F2EFE9" }, { name: "Black",    hex: "#1a1a1a" },
      { name: "Navy",     hex: "#1e3a5f" }, { name: "Grey",     hex: "#6b7280" },
      { name: "Maroon",   hex: "#7f1d1d" }, { name: "Olive",    hex: "#4a5240" },
      { name: "Red",      hex: "#dc2626" }, { name: "Sky Blue", hex: "#0ea5e9" },
      { name: "Forest",   hex: "#166534" }, { name: "Burgundy", hex: "#6b1a2c" },
    ],
    description: "320GSM Fleece", badge: "New",
    viewBox: VIEWBOX, aspect: ASPECT, baseHeight: BASE,
    printZone: HOODIE_PZ, printZoneBack: HOODIE_BACK_PZ,
    frontSrc: hoodieFront, backSrc: hoodieBack,
  },
  {
    id: "mug", name: "Coffee Mug", icon: "☕", category: "mug",
    garmentColor: "#F5F5F5",
    colors: [
      { name: "White",    hex: "#F5F5F5" }, { name: "Black",    hex: "#1C1917" },
      { name: "Navy",     hex: "#1e3a5f" }, { name: "Red",      hex: "#dc2626" },
      { name: "Green",    hex: "#16a34a" }, { name: "Purple",   hex: "#7c3aed" },
      { name: "Sky Blue", hex: "#0ea5e9" }, { name: "Pink",     hex: "#ec4899" },
      { name: "Maroon",   hex: "#7f1d1d" }, { name: "Orange",   hex: "#ea580c" },
    ],
    description: "11oz Ceramic", badge: "Popular",
    viewBox: VIEWBOX, aspect: ASPECT, baseHeight: BASE,
    printZone: MUG_SIDE_PZ,
    frontSrc: mugFront,
  },
  {
    id: "cap", name: "Structured Cap", icon: "🧢", category: "cap",
    garmentColor: "#F5F2EC",
    colors: [
      { name: "White",  hex: "#F5F2EC" }, { name: "Black",  hex: "#1a1a1a" },
      { name: "Navy",   hex: "#1e3a5f" }, { name: "Maroon", hex: "#7f1d1d" },
      { name: "Olive",  hex: "#4a5240" }, { name: "Red",    hex: "#dc2626" },
      { name: "Grey",   hex: "#6b7280" }, { name: "Forest", hex: "#166534" },
    ],
    description: "Cotton Twill",
    viewBox: VIEWBOX, aspect: ASPECT, baseHeight: BASE,
    printZone: CAP_PZ,
    frontSrc: capFront,
  },
  {
    id: "waterbottle", name: "Water Bottle", icon: "🥤", category: "waterbottle",
    garmentColor: "#F4F3F1",
    colors: [
      { name: "White",    hex: "#F4F3F1" }, { name: "Black",    hex: "#1C1917" },
      { name: "Navy",     hex: "#1e3a5f" }, { name: "Forest",   hex: "#166534" },
      { name: "Sky Blue", hex: "#0ea5e9" }, { name: "Red",      hex: "#dc2626" },
      { name: "Pink",     hex: "#f472b6" }, { name: "Teal",     hex: "#0f766e" },
    ],
    description: "600ml Aluminium",
    viewBox: VIEWBOX, aspect: ASPECT, baseHeight: BASE,
    printZone: WATERBOTTLE_PZ,
    frontSrc: WATERBOTTLE_MOCKUP_URL,
  },
];

/* ═══════════════════════════════════════════════════════
   GARMENT RENDERER — embeds the mockup PNG inside the
   parent <svg viewBox="0 0 1000 1000"> as an SVG <image>.

   MUG SPECIAL HANDLING:
   • Left Side (face="front"): normal image, handle visible on right.
   • Right Side (face="back") : image flipped horizontally so handle
     appears on the left — this represents the opposite side of the mug
     as seen from outside.
════════════════════════════════════════════════════════ */

export const BASE_BY_CATEGORY: Record<
  DesignProduct["category"],
  { front: string; back?: string; darkFront?: string; darkBack?: string; frontCutout?: string; backCutout?: string } | undefined
> = {
  tshirt:      { front: tshirtFront, back: tshirtBack, darkFront: tshirtFrontDark, darkBack: tshirtBackDark, frontCutout: tshirtFrontCutout, backCutout: tshirtBackCutout },
  longsleeve:  { front: longsleeveFront, back: longsleeveBack, frontCutout: longsleeveFrontCutout, backCutout: longsleeveBackCutout },
  hoodie:      { front: hoodieFront, back: hoodieBack, darkFront: hoodieFrontDark, darkBack: hoodieBackDark, frontCutout: hoodieFrontCutout, backCutout: hoodieBackCutout },
  mug:         { front: mugFront, back: mugFront, darkFront: mugFrontDark, darkBack: mugFrontDark, frontCutout: mugFrontCutout },
  cap:         { front: capFront, darkFront: capFrontDark, frontCutout: capFrontCutout },
  waterbottle: { front: waterBottleFront, frontCutout: waterBottleCutout },
};

let _filterUid = 0;
function nextFilterId() { _filterUid = (_filterUid + 1) % 1_000_000; return `tint-${_filterUid}`; }

function isLightTint(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return true;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.92;
}

// Returns true ONLY for near-black / very-dark-charcoal colours (luminance < 12%).
// These are the only colours that should use the dedicated black garment photo.
// Every other non-white colour — Navy, Maroon, Olive, Red, Sky Blue, Grey, etc.
// — stays on the white base photo and gets coloured via SVG multiply-tint, so it
// renders in the correct hue instead of looking like a tinted black garment.
// Exported so ProductViewer3D can apply identical photo-selection logic in 3D.
export function isNearBlack(hex: string): boolean {
  const h = hex.replace("#", "");
  if (h.length !== 6) return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 < 0.12;
}

export function GarmentSVG({
  product,
  color,
  showPrintZone,
  face = "front",
  mugMode,
}: {
  product: DesignProduct;
  color?: string;
  showPrintZone: boolean;
  face?: Face;
  mugMode?: "side1" | "side2" | "wrap";
}) {
  const isMug = product.category === "mug";

  const base = BASE_BY_CATEGORY[product.category];
  const tintHex = color || product.garmentColor;
  const isDark = !!tintHex && !isLightTint(tintHex);
  // Only swap to the real black photo for near-black colours (luminance < 12%).
  // Navy, Maroon, Olive, Red, Grey, Sky Blue, etc. all remain on the white base
  // and receive their correct hue via the SVG multiply-tint filter below.
  const useBlackPhoto = !!tintHex && isNearBlack(tintHex);

  // Pick the best available source image:
  // • Near-black colour AND a real black photo exists → use the black garment photo
  // • Everything else → white/light base photo (SVG multiply-tint applies the colour)
  const src = (() => {
    if (base) {
      if (useBlackPhoto) {
        if (face === "back" && base.darkBack) return base.darkBack;
        if (face !== "back" && base.darkFront) return base.darkFront;
      }
      return (face === "back" && base.back) ? base.back : base.front;
    }
    return (face === "back" && product.backSrc) ? product.backSrc : product.frontSrc;
  })();

  const pz = (() => {
    if (!isMug) {
      return (face === "back" && product.printZoneBack) ? product.printZoneBack : product.printZone;
    }
    if (mugMode === "wrap") return MUG_PZ;
    return MUG_SIDE_PZ;
  })();

  const useBase = !!base;
  // A "real dark image" only exists when the colour is near-black AND the category
  // has a dedicated black photo.  For every other dark colour we fall through to
  // the SVG multiply-tint on the white base photo.
  const hasRealDarkImage = useBlackPhoto && base && (face === "back" ? !!base.darkBack : !!base.darkFront);
  // Only apply tinting when a transparent-background cutout PNG is available.
  // Without a cutout, the SVG filter would tint the entire photo including the
  // white background rectangle, producing a wrongly-coloured background.
  const hasCutout = !!base && (face === "back" ? !!base.backCutout : !!base.frontCutout);
  const applyTint = useBase && isDark && !hasRealDarkImage && hasCutout;
  const filterId = useMemo(() => nextFilterId(), [product.id, face, tintHex]);

  // When colour-tinting, switch to the transparent-background cutout PNG so the
  // SVG filter only affects actual garment pixels — never the white rectangle
  // that surrounds the garment in the regular photo.  Non-tinted views (white or
  // near-black garments that use a dedicated dark photo) keep the full photo as-is.
  const imageSrc = (() => {
    if (!applyTint || !base) return src;
    if (face === "back" && base.backCutout) return base.backCutout;
    return base.frontCutout ?? src;
  })();

  const isMugRightSide = isMug && (face === "back" || mugMode === "side2");

  // When the mug photo is horizontally flipped (right-side view), the print zone
  // rectangle must also be mirrored so it aligns with the printable area on the
  // flipped image. Mirror formula: new_x = viewBoxWidth - pz.x - pz.w
  const displayPZ = isMugRightSide ? { ...pz, x: 1000 - pz.x - pz.w } : pz;

  // Is this an apparel product (tshirt / hoodie / longsleeve)?
  const isApparel = product.category === "tshirt" || product.category === "hoodie" || product.category === "longsleeve";
  const isCylinder = product.category === "mug" || product.category === "waterbottle";

  return (
    <>
      {applyTint && (
        <defs>
          {/* Transparent-PNG tint: desaturate → flood colour → mask to
              original alpha → multiply with grey → restore original alpha.
              Works for all cutout PNGs (tshirt, mug, waterbottle, etc.) */}
          <filter id={filterId} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
            <feColorMatrix in="SourceGraphic" type="saturate" values="0" result="gray" />
            <feFlood floodColor={tintHex} result="flood" />
            <feComposite in="flood" in2="SourceAlpha" operator="in" result="tinted" />
            <feBlend in="tinted" in2="gray" mode="multiply" result="blended" />
            <feComposite in="blended" in2="SourceGraphic" operator="in" />
          </filter>
        </defs>
      )}

      <defs>
        {/* Garment drop-shadow — lifts the garment off the background so
            white/light shirts are clearly visible on the off-white canvas */}
        <filter id={`shadow-${filterId}`} x="-8%" y="-8%" width="116%" height="116%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="6" stdDeviation="18" floodColor="rgba(0,0,0,0.18)" />
          <feDropShadow dx="0" dy="2" stdDeviation="6"  floodColor="rgba(0,0,0,0.10)" />
        </filter>

        {/* Radial edge vignette — subtle depth around garment edges */}
        <radialGradient id={`vign-${filterId}`} cx="50%" cy="48%" r="56%"
          gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="rgba(0,0,0,0)" />
          <stop offset="60%"  stopColor="rgba(0,0,0,0.01)" />
          <stop offset="82%"  stopColor="rgba(0,0,0,0.06)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.18)" />
        </radialGradient>
        {/* Top shoulder highlight — studio key-light */}
        <radialGradient id={`hi-${filterId}`} cx="50%" cy="15%" r="38%" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.10)" />
          <stop offset="60%"  stopColor="rgba(255,255,255,0.03)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
        {/* Bottom ambient shadow */}
        <linearGradient id={`bot-${filterId}`} gradientUnits="userSpaceOnUse"
          x1={0} y1={760} x2={0} y2={1000}>
          <stop offset="0%"   stopColor="rgba(0,0,0,0)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.10)" />
        </linearGradient>

        {/* Cylinder shadows for mug/waterbottle — gradients span the FULL canvas
            width (0→1000) so the darkest parts sit at the canvas edges and fade
            to transparent well before reaching the print zone, never shading the design */}
        <linearGradient id={`cyl-l-${filterId}`} gradientUnits="userSpaceOnUse"
          x1={0} y1={0} x2={1000} y2={0}>
          <stop offset="0%"   stopColor="rgba(0,0,0,0.34)" />
          <stop offset="20%"  stopColor="rgba(0,0,0,0.10)" />
          <stop offset="40%"  stopColor="rgba(0,0,0,0.02)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0)" />
        </linearGradient>
        <linearGradient id={`cyl-r-${filterId}`} gradientUnits="userSpaceOnUse"
          x1={0} y1={0} x2={1000} y2={0}>
          <stop offset="0%"   stopColor="rgba(0,0,0,0)" />
          <stop offset="60%"  stopColor="rgba(0,0,0,0.02)" />
          <stop offset="80%"  stopColor="rgba(0,0,0,0.10)" />
          <stop offset="100%" stopColor="rgba(0,0,0,0.34)" />
        </linearGradient>
        <linearGradient id={`cyl-hi-${filterId}`} gradientUnits="userSpaceOnUse"
          x1={0} y1={0} x2={1000} y2={0}>
          <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
          <stop offset="38%"  stopColor="rgba(255,255,255,0.16)" />
          <stop offset="50%"  stopColor="rgba(255,255,255,0.26)" />
          <stop offset="62%"  stopColor="rgba(255,255,255,0.16)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Apparel fabric micro-texture — subtle creasing/fold effect only
            within the garment print area (apparel only, no cylinders) */}
        {isApparel && (
          <filter id={`fabric-${filterId}`} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" seed="3" result="noise" />
            <feColorMatrix in="noise" type="saturate" values="0" result="gray" />
            <feBlend in="SourceGraphic" in2="gray" mode="multiply" result="textured" />
            <feComposite in="textured" in2="SourceAlpha" operator="in" />
          </filter>
        )}
      </defs>

      {/* Warm neutral background — slightly darker to contrast white garments */}
      <rect width={1000} height={1000} fill="#edeae6" style={{ pointerEvents: "none" }} />

      {/* Garment photo — shadow applied to the <g> wrapper so it works with
          both plain AND tinted images (colored shirts). The shadow follows
          the garment alpha-channel shape for PNG cutouts. */}
      {isMugRightSide ? (
        <g transform="translate(1000,0) scale(-1,1)" filter={`url(#shadow-${filterId})`}>
          <image
            href={imageSrc}
            x={0} y={0} width={1000} height={1000}
            preserveAspectRatio="xMidYMid meet"
            filter={applyTint ? `url(#${filterId})` : undefined}
            style={{ pointerEvents: "none" }}
          />
        </g>
      ) : (
        <g filter={`url(#shadow-${filterId})`}>
          <image
            href={imageSrc}
            x={0} y={0} width={1000} height={1000}
            preserveAspectRatio="xMidYMid meet"
            filter={applyTint ? `url(#${filterId})` : undefined}
            style={{ pointerEvents: "none" }}
          />
        </g>
      )}

      {/* Depth overlays — vignette + highlight + bottom shadow */}
      <rect x={0} y={0} width={1000} height={1000}
        fill={`url(#vign-${filterId})`} style={{ pointerEvents: "none" }} />
      <rect x={0} y={0} width={1000} height={1000}
        fill={`url(#hi-${filterId})`} style={{ pointerEvents: "none" }} />
      <rect x={0} y={0} width={1000} height={1000}
        fill={`url(#bot-${filterId})`} style={{ pointerEvents: "none" }} />

      {/* Cylindrical depth overlays — very subtle, applied to the FULL IMAGE area (not the print zone)
          so they never shade the design. Print zone itself stays clean/unobscured. */}
      {isCylinder && (
        <>
          <rect x={0} y={0} width={1000} height={1000}
            fill={`url(#cyl-l-${filterId})`}
            style={{ pointerEvents: "none", mixBlendMode: "multiply", opacity: 0.25 }} />
          <rect x={0} y={0} width={1000} height={1000}
            fill={`url(#cyl-r-${filterId})`}
            style={{ pointerEvents: "none", mixBlendMode: "multiply", opacity: 0.25 }} />
        </>
      )}

      {showPrintZone && (() => {
        const { x, y, w, h } = displayPZ;
        const x2 = x + w, y2 = y + h;
        const L = 32;
        return (
          <g style={{ pointerEvents: "none" }}>
            {/* Corner brackets only — clean, no text, no fill */}
            <path d={`M${x} ${y+L} L${x} ${y} L${x+L} ${y}`}
              stroke="rgba(232,93,4,0.80)" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke" />
            <path d={`M${x2-L} ${y} L${x2} ${y} L${x2} ${y+L}`}
              stroke="rgba(232,93,4,0.80)" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke" />
            <path d={`M${x} ${y2-L} L${x} ${y2} L${x+L} ${y2}`}
              stroke="rgba(232,93,4,0.80)" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke" />
            <path d={`M${x2-L} ${y2} L${x2} ${y2} L${x2} ${y2-L}`}
              stroke="rgba(232,93,4,0.80)" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke" />
          </g>
        );
      })()}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   FLAT ZONE RENDERER — used for sleeve and neck-label zones.
   Shows the real garment photo as a dimmed background for context,
   with an artboard overlay highlighting the printable area.
   No more pure-SVG artboard — real product photography is always shown.
════════════════════════════════════════════════════════ */
export function FlatZoneSVG({
  zone,
  showPrintZone,
  garmentPhotoSrc,
  garmentColor,
}: {
  zone: ApparelZone;
  showPrintZone: boolean;
  /** Real product photo URL (frontSrc from the selected product) shown as context. */
  garmentPhotoSrc?: string;
  /** Selected garment hex colour — tints the background photo to match. */
  garmentColor?: string;
}) {
  const { pz, label, pxDimensions } = zone;
  const cx = pz.x + pz.w / 2;

  const isNeck = zone.face === "neck-label";
  const isLeftSleeve = zone.face === "left-sleeve";

  return (
    <>
      <defs>
        <filter id="flat-blur-bg">
          <feGaussianBlur stdDeviation="1.2" />
          <feColorMatrix type="matrix"
            values="0.85 0 0 0 0.06
                    0 0.85 0 0 0.06
                    0 0 0.85 0 0.06
                    0 0 0 0.82 0" />
        </filter>
        <filter id="flat-artboard-glow">
          <feDropShadow dx="0" dy="0" stdDeviation="18" floodColor="rgba(255,255,255,0.60)" />
          <feDropShadow dx="0" dy="6" stdDeviation="12" floodColor="rgba(0,0,0,0.18)" />
        </filter>
        <filter id="flat-shadow-sm">
          <feDropShadow dx="0" dy="3" stdDeviation="6" floodColor="rgba(0,0,0,0.12)" />
        </filter>
        <clipPath id="flat-clip-pz">
          <rect x={pz.x} y={pz.y} width={pz.w} height={pz.h} rx={10} />
        </clipPath>
      </defs>

      {/* Full background — real garment photo (lightly dimmed for context so
          the user can see they're designing for a real sleeve / neck label). */}
      <rect width={1000} height={1000} fill="#e8e5e0" />
      {garmentPhotoSrc ? (
        <image
          href={garmentPhotoSrc}
          x={0} y={0} width={1000} height={1000}
          preserveAspectRatio="xMidYMid meet"
          filter="url(#flat-blur-bg)"
          style={{ pointerEvents: "none" }}
        />
      ) : (
        <rect width={1000} height={1000} fill="#d4d0ca" />
      )}
      {/* Garment colour tint — multiply-blend so fabric details stay visible.
          Only applied for non-white/non-light colours. */}
      {garmentColor && !isLightTint(garmentColor) && (
        <rect
          width={1000} height={1000}
          fill={garmentColor}
          opacity={0.62}
          style={{ mixBlendMode: "multiply" as React.CSSProperties["mixBlendMode"], pointerEvents: "none" }}
        />
      )}

      {/* Very subtle vignette — just enough to lift the artboard off the background */}
      <radialGradient id="flat-vig" cx="50%" cy="50%" r="70%" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1000">
        <stop offset="0%" stopColor="transparent" />
        <stop offset="100%" stopColor="rgba(0,0,0,0.22)" />
      </radialGradient>
      <rect width={1000} height={1000} fill="url(#flat-vig)" style={{ pointerEvents: "none" }} />

      {/* Zone label pill (above the artboard) */}
      <rect x={cx - 90} y={pz.y - 52} width={180} height={32} rx={16}
        fill="rgba(232,93,4,0.92)" filter="url(#flat-shadow-sm)" />
      <text
        x={cx} y={pz.y - 30}
        textAnchor="middle" fontSize={14} fontWeight={800}
        fill="white"
        style={{ fontFamily: "system-ui, -apple-system, sans-serif", letterSpacing: "0.08em" }}
      >
        {label.toUpperCase()} ZONE
      </text>

      {/* White artboard behind the print zone */}
      <rect
        x={pz.x - 12} y={pz.y - 12} width={pz.w + 24} height={pz.h + 24}
        rx={14} fill="white" filter="url(#flat-artboard-glow)"
      />
      <rect
        x={pz.x} y={pz.y} width={pz.w} height={pz.h}
        rx={10} fill="#FAFAF8"
      />

      {/* Dot grid on artboard */}
      <defs>
        <pattern id="flat-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1.2" fill="rgba(0,0,0,0.07)" />
        </pattern>
      </defs>
      <rect x={pz.x} y={pz.y} width={pz.w} height={pz.h} rx={10} fill="url(#flat-dots)" />

      {/* Zone-specific context icon */}
      {isNeck ? (
        <g transform={`translate(${pz.x + pz.w / 2},${pz.y + 54})`} style={{ pointerEvents: "none" }}>
          <circle r={28} fill="rgba(232,93,4,0.08)" stroke="rgba(232,93,4,0.25)" strokeWidth={1.5} />
          <path d="M -14 0 Q -10 -12 0 -12 Q 10 -12 14 0 Q 8 5 0 5 Q -8 5 -14 0 Z"
            fill="none" stroke="#E85D04" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M -5 -12 Q 0 -18 5 -12"
            fill="none" stroke="#E85D04" strokeWidth="2.5" strokeLinecap="round" />
          <text y={24} textAnchor="middle" fontSize={10} fontWeight={700} fill="#9ca3af"
            style={{ fontFamily: "system-ui" }}>
            inside collar
          </text>
        </g>
      ) : isLeftSleeve ? (
        <g transform={`translate(${pz.x + pz.w / 2},${pz.y + 54})`} style={{ pointerEvents: "none" }}>
          <circle r={28} fill="rgba(232,93,4,0.08)" stroke="rgba(232,93,4,0.25)" strokeWidth={1.5} />
          <rect x={-18} y={-12} width={12} height={24} rx={4} fill="none" stroke="#E85D04" strokeWidth={2.5} />
          <rect x={-6} y={-12} width={24} height={24} rx={3} fill="none" stroke="#9ca3af" strokeWidth={1.5} />
          <text y={44} textAnchor="middle" fontSize={10} fontWeight={700} fill="#9ca3af"
            style={{ fontFamily: "system-ui" }}>
            left sleeve
          </text>
        </g>
      ) : (
        <g transform={`translate(${pz.x + pz.w / 2},${pz.y + 54})`} style={{ pointerEvents: "none" }}>
          <circle r={28} fill="rgba(232,93,4,0.08)" stroke="rgba(232,93,4,0.25)" strokeWidth={1.5} />
          <rect x={6} y={-12} width={12} height={24} rx={4} fill="none" stroke="#E85D04" strokeWidth={2.5} />
          <rect x={-18} y={-12} width={24} height={24} rx={3} fill="none" stroke="#9ca3af" strokeWidth={1.5} />
          <text y={44} textAnchor="middle" fontSize={10} fontWeight={700} fill="#9ca3af"
            style={{ fontFamily: "system-ui" }}>
            right sleeve
          </text>
        </g>
      )}

      {/* Print zone — corner brackets only, no full dashed rect.
          Consistent with GarmentSVG. Pixel dimensions shown below. */}
      {showPrintZone && (() => {
        const x = pz.x, y = pz.y, w = pz.w, h = pz.h;
        const x2 = x + w, y2 = y + h;
        const L = 28;
        return (
          <g style={{ pointerEvents: "none" }}>
            <path d={`M${x} ${y+L} L${x} ${y} L${x+L} ${y}`}
              stroke="rgba(232,93,4,0.85)" strokeWidth={3} fill="none"
              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={`M${x2-L} ${y} L${x2} ${y} L${x2} ${y+L}`}
              stroke="rgba(232,93,4,0.85)" strokeWidth={3} fill="none"
              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={`M${x} ${y2-L} L${x} ${y2} L${x+L} ${y2}`}
              stroke="rgba(232,93,4,0.85)" strokeWidth={3} fill="none"
              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <path d={`M${x2-L} ${y2} L${x2} ${y2} L${x2} ${y2-L}`}
              stroke="rgba(232,93,4,0.85)" strokeWidth={3} fill="none"
              strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            {/* Pixel dimensions pill below the artboard */}
            <rect x={cx - 90} y={y2 + 10} width={180} height={22} rx={11}
              fill="rgba(0,0,0,0.55)" />
            <text
              x={cx} y={y2 + 25}
              textAnchor="middle" fontSize={12} fontWeight={600}
              fill="rgba(255,255,255,0.85)"
              style={{ fontFamily: "ui-monospace, monospace" }}
            >
              {pxDimensions}
            </text>
          </g>
        );
      })()}
    </>
  );
}

/* ═══════════════════════════════════════════════════════
   STICKERS — curated vector decoration library
════════════════════════════════════════════════════════ */

export interface Sticker {
  id: string;
  name: string;
  svg: string;
  dataUrl: string;
}

const W = (s: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">${s}</svg>`;

const RAW_STICKERS: { id: string; name: string; svg: string }[] = [
  { id: "stk-heart",      name: "Heart",       svg: W(`<path d="M50 86 C20 64 8 46 8 30 A20 20 0 0 1 50 22 A20 20 0 0 1 92 30 C92 46 80 64 50 86 Z" fill="#dc2626"/>`) },
  { id: "stk-star",       name: "Star",        svg: W(`<path d="M50 8 L61 38 L93 40 L68 60 L77 92 L50 74 L23 92 L32 60 L7 40 L39 38 Z" fill="#f59e0b"/>`) },
  { id: "stk-bolt",       name: "Lightning",   svg: W(`<path d="M58 6 L18 56 L44 56 L36 94 L80 40 L52 40 L60 6 Z" fill="#facc15" stroke="#a16207" stroke-width="2" stroke-linejoin="round"/>`) },
  { id: "stk-crown",      name: "Crown",       svg: W(`<path d="M14 70 L20 28 L38 50 L50 22 L62 50 L80 28 L86 70 Z" fill="#f59e0b" stroke="#92400e" stroke-width="2" stroke-linejoin="round"/><rect x="14" y="72" width="72" height="10" fill="#92400e"/><circle cx="50" cy="20" r="4" fill="#dc2626"/>`) },
  { id: "stk-circle",     name: "Circle",      svg: W(`<circle cx="50" cy="50" r="40" fill="#111827"/>`) },
  { id: "stk-square",     name: "Square",      svg: W(`<rect x="14" y="14" width="72" height="72" rx="6" fill="#111827"/>`) },
  { id: "stk-triangle",   name: "Triangle",    svg: W(`<path d="M50 12 L90 84 L10 84 Z" fill="#E85D04"/>`) },
  { id: "stk-diamond",    name: "Diamond",     svg: W(`<path d="M50 8 L92 50 L50 92 L8 50 Z" fill="#06b6d4"/>`) },
  { id: "stk-hex",        name: "Hexagon",     svg: W(`<path d="M50 6 L88 28 L88 72 L50 94 L12 72 L12 28 Z" fill="#7c3aed"/>`) },
  { id: "stk-smile",      name: "Smiley",      svg: W(`<circle cx="50" cy="50" r="42" fill="#facc15" stroke="#a16207" stroke-width="3"/><circle cx="36" cy="42" r="5" fill="#1f2937"/><circle cx="64" cy="42" r="5" fill="#1f2937"/><path d="M30 60 Q50 80 70 60" fill="none" stroke="#1f2937" stroke-width="4" stroke-linecap="round"/>`) },
  { id: "stk-sun",        name: "Sun",         svg: W(`<g stroke="#f59e0b" stroke-width="4" stroke-linecap="round"><line x1="50" y1="6" x2="50" y2="18"/><line x1="50" y1="82" x2="50" y2="94"/><line x1="6" y1="50" x2="18" y2="50"/><line x1="82" y1="50" x2="94" y2="50"/><line x1="18" y1="18" x2="26" y2="26"/><line x1="74" y1="74" x2="82" y2="82"/><line x1="82" y1="18" x2="74" y2="26"/><line x1="18" y1="82" x2="26" y2="74"/></g><circle cx="50" cy="50" r="22" fill="#f59e0b"/>`) },
  { id: "stk-moon",       name: "Moon",        svg: W(`<path d="M68 14 A40 40 0 1 0 86 64 A30 30 0 0 1 68 14 Z" fill="#1e3a8a"/>`) },
  { id: "stk-cloud",      name: "Cloud",       svg: W(`<path d="M28 70 A18 18 0 0 1 30 36 A20 20 0 0 1 68 32 A16 16 0 0 1 80 70 Z" fill="#60a5fa" stroke="#1e3a8a" stroke-width="2"/>`) },
  { id: "stk-arrow",      name: "Arrow",       svg: W(`<path d="M10 40 H60 V24 L92 50 L60 76 V60 H10 Z" fill="#111827"/>`) },
  { id: "stk-check",      name: "Check",       svg: W(`<path d="M14 52 L40 78 L88 22" fill="none" stroke="#16a34a" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>`) },
  { id: "stk-cross",      name: "Cross",       svg: W(`<path d="M20 20 L80 80 M80 20 L20 80" stroke="#dc2626" stroke-width="14" stroke-linecap="round"/>`) },
  { id: "stk-flower",     name: "Flower",      svg: W(`<g fill="#ec4899"><circle cx="50" cy="22" r="14"/><circle cx="78" cy="50" r="14"/><circle cx="50" cy="78" r="14"/><circle cx="22" cy="50" r="14"/></g><circle cx="50" cy="50" r="12" fill="#fde047"/>`) },
  { id: "stk-coffee",     name: "Coffee",      svg: W(`<path d="M22 30 H72 V62 A18 18 0 0 1 54 80 H40 A18 18 0 0 1 22 62 Z" fill="#92400e"/><path d="M72 38 H82 A10 10 0 0 1 82 58 H72" fill="none" stroke="#92400e" stroke-width="6"/><path d="M34 18 Q40 10 34 4 M50 18 Q56 10 50 4 M66 18 Q72 10 66 4" stroke="#9ca3af" stroke-width="3" fill="none" stroke-linecap="round"/>`) },
  { id: "stk-ribbon",     name: "Ribbon",      svg: W(`<path d="M8 38 H92 L78 50 L92 62 H8 L22 50 Z" fill="#dc2626" stroke="#7f1d1d" stroke-width="2" stroke-linejoin="round"/>`) },
  { id: "stk-music",      name: "Music Note",  svg: W(`<path d="M44 14 V64 A12 12 0 1 1 36 52 V26 L72 18 V58 A12 12 0 1 1 64 46 V14 Z" fill="#111827"/>`) },
];

export function stickerToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const STICKERS: Sticker[] = RAW_STICKERS.map(s => ({
  ...s,
  dataUrl: stickerToDataUrl(s.svg),
}));
