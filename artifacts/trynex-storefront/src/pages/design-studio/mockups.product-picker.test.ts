import { describe, expect, it } from "vitest";
import {
  getActiveMockupReleaseVersion,
  getProductPickerFallbackSrc,
  getProductPickerPreviewSrc,
  PRODUCTS,
  resolveMockup,
} from "./mockups";

describe("smart-v10.3 product picker previews", () => {
  it("uses the accepted v10.3 surface for product picker previews", () => {
    const tshirt = PRODUCTS.find((product) => product.id === "tshirt");
    if (!tshirt) throw new Error("fixture requires the T-shirt product");

    expect(getProductPickerPreviewSrc(tshirt)).toBe(
      "/mockups/psd-master-v10/runtime-roles/tshirt/white/front-base.png",
    );
    expect(getProductPickerFallbackSrc(tshirt)).toBeUndefined();
    expect(getActiveMockupReleaseVersion()).toBe("smart-v10.3");
  });

  it("fails closed instead of substituting the white surface for an unknown color", () => {
    const tshirt = PRODUCTS.find((product) => product.id === "tshirt");
    if (!tshirt) throw new Error("fixture requires the T-shirt product");

    const resolution = resolveMockup(tshirt, "#123456");

    expect(resolution.runtimeStatus).toBe("disabled");
    expect(resolution.disabledReason).toContain("No approved tshirt");
    expect(resolution.photoSrc).toBe("");
    expect(resolution.sourceKitKey).toBe("tshirt:unresolved:front");
    expect(resolution.contractErrors).toContain("base and cutout assets are required");
  });
});
