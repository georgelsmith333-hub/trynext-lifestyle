export type CompleteMockupFamily = "tshirt" | "longsleeve" | "hoodie" | "mug" | "cap" | "waterbottle";
export type CompleteMockupView = "front" | "back" | "left-sleeve" | "right-sleeve" | "neck-label" | "wrap";
export type CompleteMockupPrintZoneShape = "mug-front-body" | "mug-back-body" | "mug-wrap-body" | "cap-front" | "bottle-body";

export interface CompleteMockupGeometry {
  normalizedFrame: { canvasWidth: 1024; canvasHeight: 1024; x: number; y: number; w: number; h: number };
  printZone: { x: number; y: number; w: number; h: number; shape?: CompleteMockupPrintZoneShape };
  warp: "flat" | "cylinder" | "cap-panel";
  protectedDetails: readonly string[];
}

export interface CompleteMockupEntry {
  family: CompleteMockupFamily;
  color: string;
  view: CompleteMockupView;
  assetPath: string;
  sourceKey: string;
  geometry: CompleteMockupGeometry;
}

const colors: Record<CompleteMockupFamily, readonly string[]> = {
  tshirt: ["white", "black", "navy", "maroon", "olive", "sky-blue", "grey", "red"],
  longsleeve: ["white", "black", "charcoal", "heather-grey", "navy", "royal-blue", "forest-green", "burgundy", "red", "sand"],
  hoodie: ["white", "black", "charcoal", "heather-grey", "navy", "royal-blue", "forest-green", "burgundy", "red", "sand"],
  mug: ["white", "black", "navy", "red", "green", "purple", "sky-blue", "pink", "maroon", "orange"],
  cap: ["white", "black", "navy", "maroon", "olive", "red", "grey", "forest"],
  // This product is a white sublimation-coated aluminium blank. Do not expose
  // literal colored-body variants without distinct physical blank masters.
  waterbottle: ["white"],
};

const views: Record<CompleteMockupFamily, readonly CompleteMockupView[]> = {
  tshirt: ["front", "back", "left-sleeve", "right-sleeve", "neck-label"],
  longsleeve: ["front", "back", "left-sleeve", "right-sleeve", "neck-label"],
  hoodie: ["front", "back", "left-sleeve", "right-sleeve", "neck-label"],
  mug: ["front", "back", "wrap"],
  cap: ["front", "back"],
  waterbottle: ["front", "back"],
};

const frames: Record<CompleteMockupFamily, CompleteMockupGeometry["normalizedFrame"]> = {
  tshirt: { canvasWidth: 1024, canvasHeight: 1024, x: 43, y: 66, w: 937, h: 891 },
  longsleeve: { canvasWidth: 1024, canvasHeight: 1024, x: 53, y: 94, w: 917, h: 836 },
  hoodie: { canvasWidth: 1024, canvasHeight: 1024, x: 54, y: 43, w: 916, h: 937 },
  mug: { canvasWidth: 1024, canvasHeight: 1024, x: 143, y: 192, w: 738, h: 637 },
  cap: { canvasWidth: 1024, canvasHeight: 1024, x: 162, y: 184, w: 700, h: 655 },
  waterbottle: { canvasWidth: 1024, canvasHeight: 1024, x: 351, y: 78, w: 322, h: 866 },
};

const zones: Record<CompleteMockupFamily, Record<string, CompleteMockupGeometry["printZone"]>> = {
  tshirt: {
    front: { x: 240, y: 185, w: 520, h: 580 }, back: { x: 240, y: 185, w: 520, h: 580 },
    "left-sleeve": { x: 175, y: 175, w: 650, h: 650 }, "right-sleeve": { x: 175, y: 175, w: 650, h: 650 }, "neck-label": { x: 150, y: 265, w: 700, h: 470 },
  },
  longsleeve: {
    front: { x: 312, y: 222, w: 376, h: 404 }, back: { x: 292, y: 195, w: 416, h: 458 },
    "left-sleeve": { x: 175, y: 175, w: 650, h: 650 }, "right-sleeve": { x: 175, y: 175, w: 650, h: 650 }, "neck-label": { x: 150, y: 265, w: 700, h: 470 },
  },
  hoodie: {
    front: { x: 240, y: 270, w: 520, h: 400 }, back: { x: 292, y: 184, w: 416, h: 448 },
    "left-sleeve": { x: 175, y: 175, w: 650, h: 650 }, "right-sleeve": { x: 175, y: 175, w: 650, h: 650 }, "neck-label": { x: 150, y: 265, w: 700, h: 470 },
  },
  mug: {
    front: { x: 165, y: 220, w: 475, h: 580, shape: "mug-front-body" }, back: { x: 384, y: 220, w: 451, h: 580, shape: "mug-back-body" }, wrap: { x: 165, y: 220, w: 670, h: 580, shape: "mug-wrap-body" },
  },
  cap: {
    front: { x: 240, y: 260, w: 540, h: 320, shape: "cap-front" }, back: { x: 285, y: 270, w: 430, h: 230 },
  },
  waterbottle: {
    front: { x: 335, y: 320, w: 276, h: 590, shape: "bottle-body" }, back: { x: 335, y: 320, w: 276, h: 590, shape: "bottle-body" },
  },
};

const protectedDetails: Record<CompleteMockupFamily, readonly string[]> = {
  tshirt: ["collar", "sleeve-edges", "seams", "hem"],
  longsleeve: ["collar", "cuffs", "sleeve-edges", "seams", "hem"],
  hoodie: ["hood", "drawstrings", "pocket", "cuffs", "seams", "hem"],
  mug: ["rim", "handle", "base"],
  cap: ["brim", "crown-seams", "rear-opening", "strap"],
  waterbottle: ["lid", "key-ring-loop", "side-carabiner", "shoulder", "rounded-base"],
};

const warp: Record<CompleteMockupFamily, CompleteMockupGeometry["warp"]> = {
  tshirt: "flat", longsleeve: "flat", hoodie: "flat", mug: "cylinder", cap: "cap-panel", waterbottle: "cylinder",
};

export function completeMockupEntry(family: CompleteMockupFamily, color: string, view: CompleteMockupView): CompleteMockupEntry {
  const zone = zones[family][view] ?? zones[family].front;
  return {
    family,
    color,
    view,
    assetPath: `/mockups/psd-master-v10/runtime-roles/${family}/${color}/${view}-base.png`,
    sourceKey: `${family}:${color}:${view}`,
    geometry: { normalizedFrame: frames[family], printZone: zone, warp: warp[family], protectedDetails: protectedDetails[family] },
  };
}

export const COMPLETE_MOCKUP_MATRIX: CompleteMockupEntry[] = Object.entries(colors).flatMap(([family, familyColors]) =>
  familyColors.flatMap(color => views[family as CompleteMockupFamily].map(view => completeMockupEntry(family as CompleteMockupFamily, color, view))),
);

export function getCompleteMockupEntry(family: CompleteMockupFamily, color: string, view: CompleteMockupView): CompleteMockupEntry {
  return completeMockupEntry(family, color, view);
}

export function validateCompleteMockupMatrix(): string[] {
  const errors: string[] = [];
  const keys = new Set<string>();
  for (const entry of COMPLETE_MOCKUP_MATRIX) {
    if (keys.has(entry.sourceKey)) errors.push(`duplicate source key: ${entry.sourceKey}`);
    keys.add(entry.sourceKey);
    if (entry.geometry.normalizedFrame.canvasWidth !== 1024 || entry.geometry.normalizedFrame.canvasHeight !== 1024) errors.push(`bad frame: ${entry.sourceKey}`);
    if (!entry.assetPath.startsWith("/mockups/psd-master-v10/runtime-roles/")) errors.push(`inactive asset path: ${entry.sourceKey}`);
  }
  return errors;
}
