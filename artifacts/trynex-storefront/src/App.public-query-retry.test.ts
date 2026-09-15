import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const apiClient = readFileSync(new URL("../../../lib/api-client-react/src/index.ts", import.meta.url), "utf8");

describe("public query retry behavior", () => {
  it("exports the structured API error type used by storefront retry logic", () => {
    expect(apiClient).toContain('export { ApiError, setBaseUrl, setAuthTokenGetter } from "./custom-fetch";');
    expect(app).toContain('import { ApiError, setBaseUrl } from "@workspace/api-client-react";');
  });

  it("does not blindly retry an explicit gateway 503 after origin failover", () => {
    expect(app).toContain("if (error instanceof ApiError && error.status === 503) return false;");
  });

  it("keeps one automatic retry for other transient query failures", () => {
    expect(app).toContain("return failureCount < 1;");
  });
});
