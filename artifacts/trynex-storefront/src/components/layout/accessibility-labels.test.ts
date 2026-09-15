import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const footer = readFileSync(new URL("./Footer.tsx", import.meta.url), "utf8");
const navbar = readFileSync(new URL("./Navbar.tsx", import.meta.url), "utf8");

describe("storefront layout accessible names", () => {
  it("labels the mobile navigation menu control by its current state", () => {
    expect(navbar).toContain('aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}');
  });

  it("gives the newsletter address field a programmatic label", () => {
    expect(footer).toContain('aria-label="Email address for newsletter updates"');
  });

  it("gives every footer social icon link a destination name", () => {
    expect(footer).toContain('label: "Facebook"');
    expect(footer).toContain('label: "Instagram"');
    expect(footer).toContain('aria-label={`Visit Trynext Lifestyle on ${label}`}');
  });
});
