import { describe, expect, it } from "vitest";
import { mutationsAllowedForRole, shouldRejectMutation } from "./runtimePolicy";

describe("runtime role mutation policy", () => {
  it("allows the existing primary and an explicit promotion", () => {
    expect(mutationsAllowedForRole("primary")).toBe(true);
    expect(mutationsAllowedForRole("promoted")).toBe(true);
    expect(shouldRejectMutation("primary", "POST")).toBe(false);
    expect(shouldRejectMutation("promoted", "PATCH")).toBe(false);
  });

  it("rejects all mutation methods on standby and DR roles", () => {
    for (const role of ["standby", "dr"]) {
      for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
        expect(shouldRejectMutation(role, method), `${role} ${method}`).toBe(true);
      }
      expect(shouldRejectMutation(role, "GET")).toBe(false);
      expect(shouldRejectMutation(role, "HEAD")).toBe(false);
    }
  });
});
