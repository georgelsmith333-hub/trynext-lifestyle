import sharp from "sharp";

export type BackgroundRemovalValidation =
  | { valid: true; width: number; height: number; format: "png"; transparentPixelCount: number }
  | { valid: false; reason: "invalid_image" | "unexpected_format" | "invalid_dimensions" | "missing_transparency" };

export type AiArtworkValidation =
  | { valid: true; width: number; height: number; format: "jpeg" | "png" | "webp" }
  | { valid: false; reason: "invalid_image" | "unexpected_format" | "invalid_dimensions" };

const MAX_OUTPUT_PIXELS = 16_000_000;

/**
 * A server-side acceptance gate for remove.bg output. A successful background
 * removal must decode as a bounded PNG and contain at least one transparent
 * pixel; otherwise it is not safe to silently replace the customer’s layer.
 */
export async function validateBackgroundRemovalOutput(buffer: Buffer): Promise<BackgroundRemovalValidation> {
  try {
    const metadata = await sharp(buffer, { failOn: "error" }).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    if (metadata.format !== "png") return { valid: false, reason: "unexpected_format" };
    if (!width || !height || width * height > MAX_OUTPUT_PIXELS) {
      return { valid: false, reason: "invalid_dimensions" };
    }

    const { data, info } = await sharp(buffer, { failOn: "error" })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let transparentPixelCount = 0;
    for (let offset = 3; offset < data.length; offset += info.channels) {
      if (data[offset] < 255) transparentPixelCount += 1;
    }
    if (!transparentPixelCount) return { valid: false, reason: "missing_transparency" };
    return { valid: true, width, height, format: "png", transparentPixelCount };
  } catch {
    return { valid: false, reason: "invalid_image" };
  }
}

/**
 * Generated images are only accepted when they are decodable, bounded, and
 * large enough to be fitted into a print zone. The server reports metadata to
 * the Studio; the browser must still require explicit approval before placing
 * the artwork as a layer.
 */
export async function validateAiArtworkOutput(buffer: Buffer): Promise<AiArtworkValidation> {
  try {
    const metadata = await sharp(buffer, { failOn: "error" }).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const format = metadata.format;
    if (format !== "jpeg" && format !== "png" && format !== "webp") return { valid: false, reason: "unexpected_format" };
    if (width < 256 || height < 256 || width * height > MAX_OUTPUT_PIXELS) return { valid: false, reason: "invalid_dimensions" };
    return { valid: true, width, height, format };
  } catch {
    return { valid: false, reason: "invalid_image" };
  }
}
