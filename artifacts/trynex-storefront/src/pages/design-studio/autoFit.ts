import type { PrintZone } from "./mockups";

export type FitMode = "contain" | "cover";

export interface ImageFitResult {
  src: string;
  naturalW: number;
  naturalH: number;
  scale: number;
  crop: { x: number; y: number; w: number; h: number };
  trimmed: boolean;
  /** Final artwork dimensions in the editor's 1000×1000 coordinate system. */
  renderedW: number;
  renderedH: number;
  /** Useful diagnostics for the editor, QA, and future print-resolution checks. */
  imageAspect: number;
  zoneAspect: number;
  mode: FitMode;
}

const MAX_CANVAS_SIDE = 4096;
const ALPHA_THRESHOLD = 8;
const MIN_SCALE = 0.05;
const MAX_SCALE = 5;
const DEFAULT_MARGIN = 0.94;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function safeDimension(value: number) {
  return Number.isFinite(value) && value > 0 ? value : 1;
}

/** Trim only transparent padding, never opaque photo content. */
export async function trimTransparentPadding(src: string): Promise<{
  src: string;
  naturalW: number;
  naturalH: number;
  trimmed: boolean;
}> {
  const image = new Image();
  image.decoding = "async";
  image.src = src;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("The uploaded image could not be decoded."));
  });
  try { await image.decode?.(); } catch { /* onload is sufficient in older browsers */ }

  const width = image.naturalWidth;
  const height = image.naturalHeight;
  if (!width || !height) throw new Error("The uploaded image has no readable dimensions.");

  const scanScale = Math.min(1, MAX_CANVAS_SIDE / Math.max(width, height));
  const scanW = Math.max(1, Math.round(width * scanScale));
  const scanH = Math.max(1, Math.round(height * scanScale));
  const scan = document.createElement("canvas");
  scan.width = scanW;
  scan.height = scanH;
  const scanCtx = scan.getContext("2d", { willReadFrequently: true });
  if (!scanCtx) return { src, naturalW: width, naturalH: height, trimmed: false };

  scanCtx.clearRect(0, 0, scanW, scanH);
  scanCtx.drawImage(image, 0, 0, scanW, scanH);
  let pixels: Uint8ClampedArray;
  try {
    pixels = scanCtx.getImageData(0, 0, scanW, scanH).data;
  } catch {
    return { src, naturalW: width, naturalH: height, trimmed: false };
  }

  let minX = scanW;
  let minY = scanH;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < scanH; y += 1) {
    for (let x = 0; x < scanW; x += 1) {
      const alpha = pixels[(y * scanW + x) * 4 + 3];
      if (alpha > ALPHA_THRESHOLD) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < 0 || (minX === 0 && minY === 0 && maxX === scanW - 1 && maxY === scanH - 1)) {
    return { src, naturalW: width, naturalH: height, trimmed: false };
  }

  minX = Math.max(0, minX - 1);
  minY = Math.max(0, minY - 1);
  maxX = Math.min(scanW - 1, maxX + 1);
  maxY = Math.min(scanH - 1, maxY + 1);

  const sourceX = Math.max(0, Math.floor(minX / scanScale));
  const sourceY = Math.max(0, Math.floor(minY / scanScale));
  const sourceW = Math.min(width - sourceX, Math.max(1, Math.ceil((maxX - minX + 1) / scanScale)));
  const sourceH = Math.min(height - sourceY, Math.max(1, Math.ceil((maxY - minY + 1) / scanScale)));
  const out = document.createElement("canvas");
  out.width = sourceW;
  out.height = sourceH;
  const ctx = out.getContext("2d");
  if (!ctx) return { src, naturalW: width, naturalH: height, trimmed: false };
  ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);
  return { src: out.toDataURL("image/png"), naturalW: sourceW, naturalH: sourceH, trimmed: true };
}

/**
 * Calculate an editor-space smart-object fit. The layer renderer defines image
 * width as `zone.w × scale` and derives height from the natural aspect ratio.
 */
export function fitImageToPrintZone(
  naturalW: number,
  naturalH: number,
  zone: PrintZone,
  mode: FitMode = "contain",
  margin = DEFAULT_MARGIN,
): Pick<ImageFitResult, "scale" | "crop" | "renderedW" | "renderedH" | "imageAspect" | "zoneAspect" | "mode"> {
  const imageW = safeDimension(naturalW);
  const imageH = safeDimension(naturalH);
  const zoneW = safeDimension(zone.w);
  const zoneH = safeDimension(zone.h);
  const imageAspect = imageW / imageH;
  const zoneAspect = zoneW / zoneH;
  const safeMargin = clamp(Number.isFinite(margin) ? margin : DEFAULT_MARGIN, 0.5, 1);

  // Width-normalized scale used by layerGeom(): width = zoneW × scale.
  const heightScale = (zoneH * imageAspect) / zoneW;
  const unconstrainedScale = mode === "cover"
    ? Math.max(1, heightScale)
    : Math.min(1, heightScale);
  const scale = clamp(unconstrainedScale * safeMargin, MIN_SCALE, MAX_SCALE);
  const renderedW = zoneW * scale;
  const renderedH = renderedW / imageAspect;

  if (mode === "contain") {
    return {
      scale,
      crop: { x: 0, y: 0, w: 100, h: 100 },
      renderedW,
      renderedH,
      imageAspect,
      zoneAspect,
      mode,
    };
  }

  const visibleSourceW = Math.min(100, (zoneW / renderedW) * 100);
  const visibleSourceH = Math.min(100, (zoneH / renderedH) * 100);
  return {
    scale,
    crop: {
      x: (100 - visibleSourceW) / 2,
      y: (100 - visibleSourceH) / 2,
      w: visibleSourceW,
      h: visibleSourceH,
    },
    renderedW,
    renderedH,
    imageAspect,
    zoneAspect,
    mode,
  };
}

export async function prepareImageForPrintZone(
  src: string,
  zone: PrintZone,
  mode: FitMode = "contain",
  margin = DEFAULT_MARGIN,
): Promise<ImageFitResult> {
  const trimmed = await trimTransparentPadding(src);
  const fit = fitImageToPrintZone(trimmed.naturalW, trimmed.naturalH, zone, mode, margin);
  return { ...trimmed, ...fit };
}
