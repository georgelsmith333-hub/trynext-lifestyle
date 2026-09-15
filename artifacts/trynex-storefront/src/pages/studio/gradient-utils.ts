import { GradientConfig, PatternConfig } from "./types";

export function getGradientFill(
  gradient: GradientConfig,
  center: { x: number; y: number },
  scale: number
): CanvasGradient | string {
  if (typeof window === "undefined" || !document) return gradient.stops[0]?.color ?? "#E85D04";
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return gradient.stops[0]?.color ?? "#E85D04";

  const size = 300 * scale;
  let g: CanvasGradient;
  if (gradient.type === "radial") {
    g = ctx.createRadialGradient(center.x, center.y, 0, center.x, center.y, size);
  } else if (gradient.type === "conic") {
    // Konva doesn't support conic gradients; fall back to linear.
    g = ctx.createLinearGradient(center.x - size, center.y - size, center.x + size, center.y + size);
  } else {
    const angle = ((gradient.angle ?? 90) * Math.PI) / 180;
    const dx = Math.cos(angle) * size;
    const dy = Math.sin(angle) * size;
    g = ctx.createLinearGradient(center.x - dx, center.y - dy, center.x + dx, center.y + dy);
  }
  gradient.stops.forEach((s) => g.addColorStop(s.offset, s.color));
  return g;
}

export function getPatternFill(pattern: PatternConfig, scale: number): CanvasPattern | string {
  if (typeof window === "undefined" || !document) return pattern.color1;
  const canvas = document.createElement("canvas");
  const size = 20 * (pattern.scale ?? 1) * scale;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return pattern.color1;
  ctx.fillStyle = pattern.color1;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = pattern.color2;
  if (pattern.pattern === "dots") {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 5, 0, Math.PI * 2);
    ctx.fill();
  } else if (pattern.pattern === "chevrons") {
    ctx.beginPath();
    ctx.moveTo(0, size / 2);
    ctx.lineTo(size / 2, 0);
    ctx.lineTo(size, size / 2);
    ctx.lineTo(size / 2, size);
    ctx.fill();
  } else {
    // stripes
    ctx.fillRect(size / 2, 0, size / 2, size);
  }
  return ctx.createPattern(canvas, "repeat") ?? pattern.color1;
}
