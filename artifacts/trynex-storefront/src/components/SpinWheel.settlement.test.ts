import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const spinWheel = readFileSync(new URL("./SpinWheel.tsx", import.meta.url), "utf8");

describe("SpinWheel result settlement", () => {
  it("settles a reward from the wheel animation lifecycle rather than a fixed timer", () => {
    expect(spinWheel).toContain("onAnimationComplete={settleSpin}");
    expect(spinWheel).toContain("window.requestAnimationFrame(settleSpin);");
    expect(spinWheel).not.toContain("}, 5200);");
  });

  it("does not issue a reward when the motion lifecycle fails to complete", () => {
    expect(spinWheel).toContain("The wheel animation did not finish. No reward was issued; please try again.");
    expect(spinWheel).toContain("pendingPrizeRef.current = null;");
    expect(spinWheel).toContain("}, 7_000);");
  });
});
