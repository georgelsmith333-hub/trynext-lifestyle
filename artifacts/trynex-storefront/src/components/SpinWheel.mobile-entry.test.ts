import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const spinWheel = readFileSync(new URL("./SpinWheel.tsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../pages/Home.tsx", import.meta.url), "utf8");

describe("SpinWheel mobile campaign entry", () => {
  it("does not schedule the automatic full-screen campaign on mobile", () => {
    expect(spinWheel).toContain('import { useIsMobile } from "@/hooks/use-mobile";');
    expect(spinWheel).toContain("const isMobile = useIsMobile();");
    expect(spinWheel).toContain("const allowAutoOpen = autoOpen && !isMobile;");
    expect(spinWheel).toContain("if (!allowAutoOpen) return;");
  });

  it("keeps desktop auto-open timing and admin campaign settings intact", () => {
    expect(spinWheel).toContain("const delaySeconds = Math.max(1, settings.spinWheelDelay ?? 20);");
    expect(spinWheel).toContain("const cooldownHours = Math.max(1, settings.spinWheelCooldownHours ?? 24);");
    expect(spinWheel).toContain("[allowAutoOpen, forceOpen, enabled, delaySeconds, resetAt, cooldownHours, dismissed]");
  });

  it("provides an explicit accessible Home offer trigger for mobile visitors", () => {
    expect(home).toContain("const [spinWheelOpen, setSpinWheelOpen] = useState(false);");
    expect(home).toContain('<SpinWheel autoOpen forceOpen={spinWheelOpen} onClose={() => setSpinWheelOpen(false)} />');
    expect(home).toContain('data-testid="button-open-spin-wheel"');
    expect(home).toContain("onClick={() => setSpinWheelOpen(true)}");
    expect(home).toContain("settings.spinWheelEnabled !== false");
  });
});
