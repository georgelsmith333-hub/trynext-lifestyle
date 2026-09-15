import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hampers = readFileSync(new URL("./Hampers.tsx", import.meta.url), "utf8");

describe("Hampers unavailable recovery", () => {
  it("treats a non-successful public response as unavailable instead of empty inventory", () => {
    expect(hampers).toContain('if (!response.ok) throw new Error(`Unable to load hampers (${response.status})`);');
    expect(hampers).toContain('setRequestState("error");');
    expect(hampers).not.toContain('.then(r => r.json())');
  });

  it("keeps genuine empty inventory distinct from a retryable unavailable state", () => {
    expect(hampers).toContain('requestState === "error" ? (');
    expect(hampers).toContain('data-testid="hampers-unavailable"');
    expect(hampers).toContain('data-testid="button-retry-hampers"');
    expect(hampers).toContain("No curated hampers yet — try Build Your Own above.");
  });
});
