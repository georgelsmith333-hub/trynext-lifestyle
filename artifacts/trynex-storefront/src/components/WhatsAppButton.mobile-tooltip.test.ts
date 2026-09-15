import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./WhatsAppButton.tsx", import.meta.url), "utf8");

describe("WhatsAppButton mobile tooltip behavior", () => {
  it("hides the automatic help tooltip below the desktop breakpoint", () => {
    expect(source).toContain('className="hidden md:block px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold shadow-lg whitespace-nowrap"');
  });

  it("keeps the accessible user-invoked WhatsApp control", () => {
    expect(source).toContain('aria-label="Chat on WhatsApp"');
    expect(source).toContain('aria-haspopup="dialog"');
  });

  it("keeps the separate accessible minimize control", () => {
    expect(source).toContain('aria-label="Minimize WhatsApp"');
  });
});
