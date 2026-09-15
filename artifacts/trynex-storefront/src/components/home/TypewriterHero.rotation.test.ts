import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readHeroSource() {
  return readFileSync(new URL("./TypewriterHero.tsx", import.meta.url), "utf8");
}

describe("Home hero keyword rotation", () => {
  it("retains the complete customer-facing product phrase sequence", () => {
    const source = readHeroSource();

    expect(source).toContain('"T-Shirts."');
    expect(source).toContain('"Hoodies."');
    expect(source).toContain('"Mugs."');
    expect(source).toContain('"Caps."');
    expect(source).toContain('"Water Bottles."');
    expect(source).toContain('"Custom Gifts."');
  });

  it("resets safely after configured phrases change and keeps reduced motion static", () => {
    const source = readHeroSource();

    expect(source).toContain('indexRef.current = 0;');
    expect(source).toContain('setText(safe[0]);');
    expect(source).toContain('setPhase("holding");');
    expect(source).toContain('if (enabled) return;');
    expect(source).not.toContain('const id = window.setInterval(() => {');
    expect(source).toContain('animation: reduced ? undefined : "twCursorBlink 1s steps(2, start) infinite"');
  });
});
