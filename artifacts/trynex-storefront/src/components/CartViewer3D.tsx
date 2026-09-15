/* ═══════════════════════════════════════════════════════
   CART VIEWER — 2D photo mockup with design overlay
   Pure CSS/img compositing. No Three.js/WebGL required.
   Shows garment photo tinted to the selected colour, with
   the design texture composited on top.
════════════════════════════════════════════════════════ */
 import { useState, useMemo, useId } from "react";
import { PRODUCTS, resolveMockup } from "../pages/design-studio/mockups";

type GarmentCategory = "tshirt" | "longsleeve" | "hoodie" | "mug" | "cap" | "waterbottle";

/**
 * Resolve the correct garment photo paths.
 * Near-black → dedicated dark cutout. Everything else → white cutout + tint.
 */
function resolvePhotos(
  category: GarmentCategory,
  garmentColor: string,
): {
  front: string;
  back?: string;
  frontRequiresTint: boolean;
  backRequiresTint: boolean;
} {
  const product = PRODUCTS.find((candidate) => candidate.category === category);
  if (!product) throw new Error(`No design product configured for category "${category}"`);
  const front = resolveMockup(product, garmentColor, "front");
  const back = resolveMockup(product, garmentColor, "back");
  return {
    front: front.photoKind === "opaque-photo" ? front.photoSrc : front.cutoutSrc,
    back: back.photoKind === "opaque-photo" ? back.photoSrc : back.cutoutSrc,
    frontRequiresTint: front.photoKind === "transparent-cutout" && front.requiresTint,
    backRequiresTint: back.photoKind === "transparent-cutout" && back.requiresTint,
  };
}

export interface CartViewer3DProps {
  garmentColor: string;
  category: GarmentCategory;
  /** Pre-composed design texture URL (transparent bg, design at correct position) */
  frontTexUrl?: string;
  /** Back-face design texture URL */
  backTexUrl?: string;
}

export default function CartViewer3D({
  garmentColor,
  category,
  frontTexUrl,
  backTexUrl,
}: CartViewer3DProps) {
  // All reviewed products have face-specific photos. Let customers inspect
  // both sides after adding a studio design, not only apparel.
  const hasFrontBack = true;
  const [face, setFace] = useState<"front" | "back">("front");

  const { front: frontSrc, back: backSrc, frontRequiresTint, backRequiresTint } = useMemo(
    () => resolvePhotos(category, garmentColor),
    [category, garmentColor],
  );

  const garmentSrc  = face === "front" ? frontSrc : (backSrc ?? frontSrc);
  // Do not copy the front artwork onto a product's back photo. A back face
  // without a dedicated texture is an intentionally blank product face.
  const designSrc   = face === "front" ? frontTexUrl : backTexUrl;
  const needsTint = face === "front" ? frontRequiresTint : backRequiresTint;
  const stableId = useId().replace(/:/g, "");
  const tintFilterId = `cart-garment-tint-${stableId}`;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
         // Match the normalized opaque photo canvas so no square edge appears.
         background: "#faf8f5",
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      {/* Front / Back toggle for apparel */}
      {hasFrontBack && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 10,
            display: "flex",
            gap: 3,
            background: "rgba(255,255,255,0.92)",
            padding: 3,
            borderRadius: 999,
            fontSize: 11,
            fontWeight: 700,
            boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
          }}
        >
          {(["front", "back"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFace(f)}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: "none",
                cursor: "pointer",
                background: face === f ? "#E85D04" : "transparent",
                color: face === f ? "#fff" : "#475569",
                transition: "background 0.15s, color 0.15s",
              }}
            >
              {f === "front" ? "Front" : "Back"}
            </button>
          ))}
        </div>
      )}

      {/* Mockup composite — garment photo + colour tint + design overlay */}
      <div
        style={{
          position: "relative",
          width: "88%",
          aspectRatio: "1 / 1",
          isolation: "isolate",
        }}
      >
        {/* Garment photo. Exact opaque photos render directly; transparent
            fallback cutouts use an alpha-clipped SVG tint, never a CSS
            rectangle over the whole square. */}
        {garmentSrc && needsTint ? (
          <svg
            key={`${garmentSrc}-${face}-tinted`}
            viewBox="0 0 1024 1024"
            width="100%"
            height="100%"
            style={{ position: "absolute", inset: 0, overflow: "visible", pointerEvents: "none" }}
            aria-hidden="true"
          >
            <defs>
              <filter id={tintFilterId} x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
                <feFlood floodColor={garmentColor} result="flood" />
                <feBlend in="flood" in2="SourceGraphic" mode="multiply" result="blended" />
                <feComposite in="blended" in2="SourceGraphic" operator="in" />
              </filter>
            </defs>
            <image
              href={garmentSrc}
              x="0"
              y="0"
              width="1024"
              height="1024"
              preserveAspectRatio="xMidYMid meet"
              filter={`url(#${tintFilterId})`}
            />
          </svg>
        ) : garmentSrc ? (
          <img
            key={`${garmentSrc}-${face}`}
            src={garmentSrc}
            alt="Product"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
        ) : null}

        {/* Design overlay */}
        {designSrc && (
          <img
            key={`${designSrc}-${face}`}
            src={designSrc}
            alt="Design"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "contain",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
        )}
      </div>
    </div>
  );
}
