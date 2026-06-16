/* ═══════════════════════════════════════════════════════
   COMPOSER — render a list of design layers onto a canvas
   Shared by:
     • realtime 3D preview  (CanvasTexture source)
     • add-to-cart snapshot (downloadable thumbnail)
════════════════════════════════════════════════════════ */

export interface ComposerTransform {
  x: number; y: number; scale: number; rotation: number; opacity: number;
  scaleX?: number; scaleY?: number;
}
export interface ComposerImageLayer {
  type: "image";
  visible: boolean;
  src: string;
  naturalW: number; naturalH: number;
  transform: ComposerTransform;
  flipH?: boolean;
  flipV?: boolean;
  brightness?: number;   // 0–200, default 100
  contrast?: number;     // 0–200, default 100
  saturation?: number;   // 0–200, default 100
}
export interface ComposerTextLayer {
  type: "text";
  visible: boolean;
  text: string;
  fontFamily: string;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  fontSize: number;
  color: string;
  transform: ComposerTransform;
  textAlign?: "left" | "center" | "right";
  letterSpacing?: number;   // em units
  strokeColor?: string;
  strokeWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
}
export type ComposerLayer = ComposerImageLayer | ComposerTextLayer;

export interface ComposerPrintZone { x: number; y: number; w: number; h: number; }

interface ComposeOptions {
  canvas: HTMLCanvasElement;
  baseHeight: number;
  printZone: ComposerPrintZone;
  layers: ComposerLayer[];
  garmentColor: string | null;
  outW: number;
  outH: number;
  imageCache?: Map<string, HTMLImageElement>;
  clipToPrintZone?: boolean;
  blendMode?: GlobalCompositeOperation;
}

const IMAGE_CACHE_MAX = 60;

export function loadImage(src: string, cache?: Map<string, HTMLImageElement>): Promise<HTMLImageElement> {
  if (cache?.has(src)) {
    const img = cache.get(src)!;
    if (img.complete && img.naturalWidth > 0) return Promise.resolve(img);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cache) {
        if (cache.size >= IMAGE_CACHE_MAX) {
          const firstKey = cache.keys().next().value;
          if (firstKey !== undefined) cache.delete(firstKey);
        }
        cache.set(src, img);
      }
      resolve(img);
    };
    img.onerror = reject;
    img.src = src;
  });
}

function layerGeom(l: ComposerLayer, pz: ComposerPrintZone) {
  const cx = pz.x + pz.w / 2 + l.transform.x;
  const cy = pz.y + pz.h / 2 + l.transform.y;
  if (l.type === "image") {
    const aspect = l.naturalW / Math.max(l.naturalH, 1);
    const baseW = pz.w * l.transform.scale;
    const w = baseW * (l.transform.scaleX ?? 1);
    const h = (baseW / aspect) * (l.transform.scaleY ?? 1);
    return { cx, cy, w, h };
  }
  const w = (l.text.length * l.fontSize * 0.55) * l.transform.scale * (l.transform.scaleX ?? 1);
  const h = l.fontSize * 1.2 * l.transform.scale * (l.transform.scaleY ?? 1);
  return { cx, cy, w, h };
}

/** Build CSS filter string for image adjustments. Returns '' if no adjustments. */
function buildImageFilter(l: ComposerImageLayer): string {
  const br = l.brightness ?? 100;
  const co = l.contrast ?? 100;
  const sa = l.saturation ?? 100;
  if (br === 100 && co === 100 && sa === 100) return "";
  const parts: string[] = [];
  if (br !== 100) parts.push(`brightness(${br}%)`);
  if (co !== 100) parts.push(`contrast(${co}%)`);
  if (sa !== 100) parts.push(`saturate(${sa}%)`);
  return parts.join(" ");
}

/** Draw text with full stroke, shadow, letterSpacing, and textAlign support. */
function drawText(
  ctx: CanvasRenderingContext2D,
  l: ComposerTextLayer,
  fontSize: number,
  textX: number,
  textY: number,
  sx: number,
  sy: number,
) {
  const align = l.textAlign ?? "center";
  ctx.textAlign = align;
  ctx.textBaseline = "middle";

  if (l.letterSpacing != null && l.letterSpacing !== 0) {
    (ctx as any).letterSpacing = `${l.letterSpacing * fontSize}px`;
  } else {
    (ctx as any).letterSpacing = "0px";
  }

  if (l.shadowBlur || l.shadowOffsetX || l.shadowOffsetY) {
    ctx.shadowColor = l.shadowColor ?? "rgba(0,0,0,0.5)";
    ctx.shadowBlur = (l.shadowBlur ?? 0) * Math.min(sx, sy);
    ctx.shadowOffsetX = (l.shadowOffsetX ?? 0) * sx;
    ctx.shadowOffsetY = (l.shadowOffsetY ?? 0) * sy;
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  if (l.strokeWidth && l.strokeWidth > 0) {
    ctx.strokeStyle = l.strokeColor ?? "#000000";
    ctx.lineWidth = l.strokeWidth * l.transform.scale * Math.min(sx, sy);
    ctx.lineJoin = "round";
    ctx.strokeText(l.text, textX, textY);
  }

  ctx.fillStyle = l.color;
  ctx.fillText(l.text, textX, textY);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
  (ctx as any).letterSpacing = "0px";
}

/** Get the X offset for a text alignment relative to the layer center. */
function textAlignOffset(align: "left" | "center" | "right", halfW: number): number {
  if (align === "left") return -halfW;
  if (align === "right") return halfW;
  return 0;
}

export async function composeLayers(opts: ComposeOptions): Promise<HTMLCanvasElement> {
  const {
    canvas, baseHeight, printZone, layers, garmentColor,
    outW, outH, imageCache, clipToPrintZone = true, blendMode = "multiply",
  } = opts;
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const sx = outW / baseHeight;
  const sy = outH / baseHeight;

  ctx.clearRect(0, 0, outW, outH);
  if (garmentColor) {
    ctx.fillStyle = garmentColor;
    ctx.fillRect(0, 0, outW, outH);
  }

  if (clipToPrintZone) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(printZone.x * sx, printZone.y * sy, printZone.w * sx, printZone.h * sy);
    ctx.clip();
  }

  for (const l of layers) {
    if (!l.visible) continue;
    const g = layerGeom(l, printZone);
    ctx.save();
    ctx.translate(g.cx * sx, g.cy * sy);
    ctx.rotate((l.transform.rotation * Math.PI) / 180);
    ctx.globalAlpha = l.transform.opacity;

    if (l.type === "image") {
      try {
        const img = await loadImage(l.src, imageCache);
        ctx.globalCompositeOperation = "source-over";

        const cssFilter = buildImageFilter(l);
        if (cssFilter) ctx.filter = cssFilter;

        const flipSX = l.flipH ? -1 : 1;
        const flipSY = l.flipV ? -1 : 1;
        if (l.flipH || l.flipV) ctx.scale(flipSX, flipSY);

        const w = g.w * sx;
        const h = g.h * sy;
        ctx.drawImage(img, -w / 2, -h / 2, w, h);

        if (cssFilter) ctx.filter = "none";
      } catch (imgErr) {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = "rgba(239,68,68,0.6)";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(-(g.w * sx) / 2, -(g.h * sy) / 2, g.w * sx, g.h * sy);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(239,68,68,0.15)";
        ctx.fillRect(-(g.w * sx) / 2, -(g.h * sy) / 2, g.w * sx, g.h * sy);
        console.warn("[composer] Failed to load image layer:", (imgErr as Error)?.message ?? imgErr, l.src);
      }
    } else {
      ctx.globalCompositeOperation = blendMode;
      const fs = Math.round(l.fontSize * l.transform.scale * sy);
      ctx.font = `${l.fontStyle} ${l.fontWeight} ${fs}px ${l.fontFamily}`;

      const align = l.textAlign ?? "center";
      const xOffset = textAlignOffset(align, (g.w * sx) / 2);
      drawText(ctx, l, fs, xOffset, 0, sx, sy);
    }
    ctx.restore();
  }

  if (clipToPrintZone) ctx.restore();
  return canvas;
}

export async function composeGarmentMockup(opts: {
  canvas: HTMLCanvasElement;
  garmentSrc: string;
  garmentColor: string;
  printZone: ComposerPrintZone;
  layers: ComposerLayer[];
  outSize: number;
  imageCache?: Map<string, HTMLImageElement>;
}): Promise<HTMLCanvasElement> {
  const { canvas, garmentSrc, garmentColor, printZone, layers, outSize, imageCache } = opts;
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const s = outSize / 1000;

  ctx.clearRect(0, 0, outSize, outSize);

  try {
    const garmentImg = await loadImage(garmentSrc, imageCache);
    ctx.drawImage(garmentImg, 0, 0, outSize, outSize);

    const r = parseInt(garmentColor.slice(1, 3), 16) || 0;
    const g = parseInt(garmentColor.slice(3, 5), 16) || 0;
    const b = parseInt(garmentColor.slice(5, 7), 16) || 0;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    if (luminance < 0.92) {
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = garmentColor;
      ctx.fillRect(0, 0, outSize, outSize);
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(garmentImg, 0, 0, outSize, outSize);
      ctx.globalCompositeOperation = "source-over";
    }
  } catch {
    ctx.fillStyle = garmentColor;
    ctx.beginPath();
    const rr = outSize * 0.06;
    const x = outSize * 0.12, y = outSize * 0.10, w = outSize * 0.76, h = outSize * 0.80;
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
    ctx.fill();
  }

  ctx.save();
  ctx.beginPath();
  ctx.rect(printZone.x * s, printZone.y * s, printZone.w * s, printZone.h * s);
  ctx.clip();

  for (const layer of layers) {
    if (!layer.visible) continue;
    const geom = layerGeom(layer, printZone);
    const cx = geom.cx * s;
    const cy = geom.cy * s;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((layer.transform.rotation * Math.PI) / 180);
    ctx.globalAlpha = layer.transform.opacity;

    if (layer.type === "image") {
      try {
        const img = await loadImage(layer.src, imageCache);
        const w = geom.w * s;
        const h = geom.h * s;

        const cssFilter = buildImageFilter(layer);
        if (cssFilter) ctx.filter = cssFilter;

        const flipSX = layer.flipH ? -1 : 1;
        const flipSY = layer.flipV ? -1 : 1;
        if (layer.flipH || layer.flipV) ctx.scale(flipSX, flipSY);

        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        if (cssFilter) ctx.filter = "none";
      } catch {}
    } else {
      const fs = Math.round(layer.fontSize * layer.transform.scale * s);
      ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${fs}px ${layer.fontFamily}`;
      const align = layer.textAlign ?? "center";
      const xOffset = textAlignOffset(align, (geom.w * s) / 2);
      ctx.globalCompositeOperation = "multiply";
      drawText(ctx, layer, fs, xOffset, 0, s, s);
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  }

  ctx.restore();

  if (layers.some(l => l.visible)) {
    try {
      const garmentImg2 = await loadImage(garmentSrc, imageCache);
      ctx.save();
      ctx.beginPath();
      ctx.rect(printZone.x * s, printZone.y * s, printZone.w * s, printZone.h * s);
      ctx.clip();

      /* ── Premium 3-pass fabric texture blend ──────────────────────────
         Pass 1 — MULTIPLY at 0.50: garment photo pixels darken the design
           wherever the fabric has creases, shadow, or woven texture.
           Pure-white areas of the photo have zero effect (1×dest = dest).
         Pass 2 — SCREEN at 0.10: lifts the bright studio-light reflections
           back onto the design so highlights look authentic.
         Pass 3 — OVERLAY at 0.14: micro-contrast boost that makes the fabric
           grain feel tactile and separates the print from the substrate.
         Together these three passes replicate Printful / Printify quality
         composite output at render time.
      ─────────────────────────────────────────────────────────────────── */
      ctx.globalCompositeOperation = "multiply";
      ctx.globalAlpha = 0.50;
      ctx.drawImage(garmentImg2, 0, 0, outSize, outSize);

      ctx.globalCompositeOperation = "screen";
      ctx.globalAlpha = 0.10;
      ctx.drawImage(garmentImg2, 0, 0, outSize, outSize);

      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = 0.14;
      ctx.drawImage(garmentImg2, 0, 0, outSize, outSize);

      ctx.restore();
    } catch {}
  }

  return canvas;
}

export async function composeDesignTexture(opts: {
  canvas: HTMLCanvasElement;
  printZone: ComposerPrintZone;
  layers: ComposerLayer[];
  outSize: number;
  imageCache?: Map<string, HTMLImageElement>;
  clipToPrintZone?: boolean;
}): Promise<HTMLCanvasElement> {
  const { canvas, printZone, layers, outSize, imageCache, clipToPrintZone = true } = opts;
  canvas.width = outSize;
  canvas.height = outSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const s = outSize / 1000;

  ctx.clearRect(0, 0, outSize, outSize);

  if (clipToPrintZone) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(printZone.x * s, printZone.y * s, printZone.w * s, printZone.h * s);
    ctx.clip();
  }

  for (const layer of layers) {
    if (!layer.visible) continue;
    const geom = layerGeom(layer, printZone);
    const cx = geom.cx * s;
    const cy = geom.cy * s;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate((layer.transform.rotation * Math.PI) / 180);
    ctx.globalAlpha = layer.transform.opacity;

    if (layer.type === "image") {
      try {
        const img = await loadImage(layer.src, imageCache);
        const w = geom.w * s;
        const h = geom.h * s;

        const cssFilter = buildImageFilter(layer);
        if (cssFilter) ctx.filter = cssFilter;

        const flipSX = layer.flipH ? -1 : 1;
        const flipSY = layer.flipV ? -1 : 1;
        if (layer.flipH || layer.flipV) ctx.scale(flipSX, flipSY);

        ctx.drawImage(img, -w / 2, -h / 2, w, h);
        if (cssFilter) ctx.filter = "none";
      } catch {}
    } else {
      const fs = Math.round(layer.fontSize * layer.transform.scale * s);
      ctx.font = `${layer.fontStyle} ${layer.fontWeight} ${fs}px ${layer.fontFamily}`;
      const align = layer.textAlign ?? "center";
      const xOffset = textAlignOffset(align, (geom.w * s) / 2);
      drawText(ctx, layer, fs, xOffset, 0, s, s);
    }
    ctx.restore();
  }

  if (clipToPrintZone) ctx.restore();
  return canvas;
}

export function hasWebGL2(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!canvas.getContext("webgl2");
  } catch {
    return false;
  }
}
