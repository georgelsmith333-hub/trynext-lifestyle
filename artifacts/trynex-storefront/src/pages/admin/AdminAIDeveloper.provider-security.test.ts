import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminAiHub = readFileSync(new URL("./AdminAIDeveloper.tsx", import.meta.url), "utf8");

describe("Admin AI Hub provider configuration", () => {
  it("uses only the server-backed selected provider for chat requests", () => {
    expect(adminAiHub).toContain("providerId: selectedProv,");
    expect(adminAiHub).not.toContain("openAI-direct");
    expect(adminAiHub).not.toContain("body.openAIKey");
  });

  it("does not collect or promise to use a provider key from the browser", () => {
    expect(adminAiHub).toContain("Server-managed providers");
    expect(adminAiHub).toContain("This panel never accepts, stores, or sends provider keys from the browser.");
    expect(adminAiHub).not.toContain("placeholder=\"sk-…\"");
    expect(adminAiHub).not.toContain("Key set — GPT-4o will be used");
  });
});
