import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { validateAiArtworkOutput, validateBackgroundRemovalOutput } from "./transformedImageValidation";

describe("validateBackgroundRemovalOutput", () => {
  it("accepts a bounded PNG that contains real transparent pixels", async () => {
    const transparentPng = await sharp({
      create: { width: 4, height: 4, channels: 4, background: { r: 20, g: 30, b: 40, alpha: 0 } },
    }).png().toBuffer();

    await expect(validateBackgroundRemovalOutput(transparentPng)).resolves.toMatchObject({
      valid: true,
      width: 4,
      height: 4,
      format: "png",
    });
  });

  it("rejects a PNG with no removed-background transparency", async () => {
    const opaquePng = await sharp({
      create: { width: 4, height: 4, channels: 4, background: { r: 20, g: 30, b: 40, alpha: 1 } },
    }).png().toBuffer();

    await expect(validateBackgroundRemovalOutput(opaquePng)).resolves.toEqual({
      valid: false,
      reason: "missing_transparency",
    });
  });

  it("rejects a non-PNG transformed output", async () => {
    const jpeg = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 20, g: 30, b: 40 } },
    }).jpeg().toBuffer();

    await expect(validateBackgroundRemovalOutput(jpeg)).resolves.toEqual({
      valid: false,
      reason: "unexpected_format",
    });
  });
});

describe("validateAiArtworkOutput", () => {
  it("accepts a decodable bounded JPEG suitable for a print-preview candidate", async () => {
    const jpeg = await sharp({
      create: { width: 512, height: 512, channels: 3, background: { r: 20, g: 30, b: 40 } },
    }).jpeg().toBuffer();

    await expect(validateAiArtworkOutput(jpeg)).resolves.toEqual({ valid: true, width: 512, height: 512, format: "jpeg" });
  });

  it("rejects undersized AI artwork before it can be placed", async () => {
    const tinyPng = await sharp({
      create: { width: 64, height: 64, channels: 4, background: { r: 20, g: 30, b: 40, alpha: 1 } },
    }).png().toBuffer();

    await expect(validateAiArtworkOutput(tinyPng)).resolves.toEqual({ valid: false, reason: "invalid_dimensions" });
  });
});
