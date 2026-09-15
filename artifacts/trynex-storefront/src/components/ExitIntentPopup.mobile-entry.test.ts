import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const exitIntent = readFileSync(new URL("./ExitIntentPopup.tsx", import.meta.url), "utf8");

describe("ExitIntentPopup mobile entry", () => {
  it("does not register automatic exit-intent triggers on mobile", () => {
    expect(exitIntent).toContain('import { useIsMobile } from "@/hooks/use-mobile";');
    expect(exitIntent).toContain("const isMobile = useIsMobile();");
    expect(exitIntent).toContain("const allowAutomaticEntry = exitIntentPromoEnabled && !isMobile;");
    expect(exitIntent).toContain("if (!allowAutomaticEntry || excluded || shownRef.current) return;");
  });

  it("preserves the existing enabled setting, desktop entry, throttle, and lead capture contract", () => {
    expect(exitIntent).toContain("if (!exitIntentPromoEnabled) return null;");
    expect(exitIntent).toContain("THROTTLE_MS  = 24 * 60 * 60 * 1000");
    expect(exitIntent).toContain('fetch(getApiUrl("/api/promo-codes/exit-intent"),');
    expect(exitIntent).toContain("[allowAutomaticEntry, excluded]");
  });
});
