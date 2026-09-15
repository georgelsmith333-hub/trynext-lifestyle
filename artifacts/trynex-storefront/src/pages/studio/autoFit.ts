export interface FitPrintZone {
  w: number;
  h: number;
}

export interface ImageFitOptions {
  /** Fraction of the print zone the asset may occupy on its largest axis. */
  padding?: number;
  /** Prevent tiny QR/sticker assets from becoming unreasonably large. */
  maxScale?: number;
  /** Keep a deliberately small asset such as a QR code visually compact. */
  minScale?: number;
}

/**
 * Returns a transform scale in the same product-coordinate system used by
 * Konva DesignLayer: rendered pixels = natural pixels * scale.
 */
export function fitImageScale(
  naturalW: number,
  naturalH: number,
  printZone: FitPrintZone,
  options: ImageFitOptions = {},
): number {
  const safeW = Math.max(1, naturalW);
  const safeH = Math.max(1, naturalH);
  // Keep a visible safety margin so rounded/curved product masks never expose
  // artwork at the print-zone boundary. Callers can opt into tighter fitting.
  const padding = Math.max(0.1, Math.min(1, options.padding ?? 0.86));
  const maxScale = Math.max(0.01, options.maxScale ?? 4);
  const minScale = Math.max(0.001, Math.min(maxScale, options.minScale ?? 0.001));
  const scale = Math.min((printZone.w * padding) / safeW, (printZone.h * padding) / safeH);
  return Math.max(minScale, Math.min(maxScale, Number.isFinite(scale) ? scale : 1));
}

export function fitImageTransform(
  naturalW: number,
  naturalH: number,
  printZone: FitPrintZone,
  options?: ImageFitOptions,
) {
  const scale = fitImageScale(naturalW, naturalH, printZone, options);
  return {
    x: 0,
    y: 0,
    scale,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    opacity: 1,
  };
}
