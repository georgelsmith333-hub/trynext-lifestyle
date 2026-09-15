import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const imagePanel = readFileSync(
  new URL("./ImagePanel.tsx", import.meta.url),
  "utf8",
);

describe("ImagePanel flip controls", () => {
  it("keeps the existing accessible controls while making their direction visible", () => {
    expect(imagePanel).toContain('aria-label="Flip horizontally"');
    expect(imagePanel).toContain('aria-label="Flip vertically"');
    expect(imagePanel).toContain("aria-pressed={!!layer.flipH}");
    expect(imagePanel).toContain("aria-pressed={!!layer.flipV}");
    expect(imagePanel).toContain('"Flip horizontal"');
    expect(imagePanel).toContain('"Flip vertical"');
  });
});
