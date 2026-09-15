import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("truthful customer-facing social proof", () => {
  it("does not retain hardcoded ratings, review totals, or fallback product scores", () => {
    const indexHtml = readSource("../index.html");
    const productDetail = readSource("./pages/ProductDetail.tsx");
    const productCard = readSource("./components/ProductCard.tsx");
    const quickView = readSource("./components/QuickViewModal.tsx");
    const salePage = readSource("./pages/SalePage.tsx");

    expect(indexHtml).not.toContain('"aggregateRating"');
    expect(productDetail).not.toContain("|| 4.9");
    expect(productDetail).not.toContain("product.reviewCount ?? 1");
    expect(productCard).not.toContain("|| 4.9");
    expect(quickView).not.toContain("|| 4.9");
    expect(salePage).not.toContain("product.id % 60");
  });

  it("does not synthesize testimonials, customer counts, or purchase activity", () => {
    const home = readSource("./pages/Home.tsx");
    const hero = readSource("./components/home/TypewriterHero.tsx");
    const app = readSource("./App.tsx");

    expect(home).not.toContain("const TESTIMONIALS");
    expect(home).not.toContain("5,000+");
    expect(hero).not.toContain("5,000+ Reviews");
    expect(app).not.toContain("SocialProofToast");
    expect(existsSync(new URL("./components/SocialProofToast.tsx", import.meta.url))).toBe(false);
  });
});
