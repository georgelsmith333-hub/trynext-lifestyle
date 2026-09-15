import { describe, expect, it } from "vitest";
import { ObjectNotFoundError, ObjectStorageService } from "./objectStorage";

describe("ObjectStorageService path validation", () => {
  const storage = new ObjectStorageService();

  it("normalizes direct upload URLs without changing the object id", () => {
    expect(
      storage.normalizeObjectEntityPath(
        "http://localhost:8082/api/storage/upload-direct/123e4567-e89b-12d3-a456-426614174000",
      ),
    ).toBe("/objects/123e4567-e89b-12d3-a456-426614174000");
  });

  it.each([
    "/objects/../package.json",
    "/objects/%2e%2e/package.json",
    "/objects/%2Fetc%2Fpasswd",
    "/objects/orders/INV-1/0/../../etc/passwd",
  ])("rejects unsafe private path %s", (objectPath) => {
    expect(() => storage.normalizeObjectEntityPath(objectPath)).toThrow(ObjectNotFoundError);
  });

  it("permits only the known order-asset prefix shape for moved originals", () => {
    expect(
      storage.normalizeObjectEntityPath("/objects/orders/TNX-1001/0/design.png"),
    ).toBe("/objects/orders/TNX-1001/0/design.png");
    expect(() =>
      storage.normalizeObjectEntityPath("/objects/user-created-folder/design.png"),
    ).toThrow(ObjectNotFoundError);
  });
});