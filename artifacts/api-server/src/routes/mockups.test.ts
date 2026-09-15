import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import mockupsRouter from "./mockups";

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn(),
  },
  mockupsTable: {},
}));

const app = express();
app.use((req, _res, next) => {
  req.log = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } as any;
  next();
});
app.use("/api", mockupsRouter);

describe("Public mockups API", () => {
  it("returns exactly the canonical v10.3 surface matrix", async () => {
    const response = await request(app).get("/api/mockups");

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(188);
    expect(response.body.every((row: { isCanonical: boolean }) => row.isCanonical)).toBe(true);
    expect(response.body.every((row: { imageUrl: string; manifestJson: { assetPath: string } }) =>
      row.imageUrl.includes("/mockups/psd-master-v10/runtime-roles/") &&
      row.imageUrl.includes("?v=smart-v10.3") &&
      row.manifestJson.assetPath.includes("/mockups/psd-master-v10/runtime-roles/"),
    )).toBe(true);
    expect(new Set(response.body.map((row: { sourceKitKey: string }) => row.sourceKitKey)).size).toBe(188);
  });
});