import { describe, it, expect, vi } from "vitest";
import express from "express";
import healthRouter from "./health";
import request from "supertest";

// Mock heavy dependencies so health tests run without DB / Redis / storage.
vi.mock("@workspace/db", () => ({
  db: {
    execute: vi.fn().mockResolvedValue([{ 1: 1 }]),
  },
}));

vi.mock("../lib/redis", () => ({
  getRedisStatus: vi.fn().mockResolvedValue({ mode: "not_configured", detail: "no upstash config" }),
}));

vi.mock("../lib/objectStorage", () => ({
  ObjectStorageService: class {
    getBackendName() { return "local"; }
    getObjectEntityUploadURL() { return Promise.resolve("http://localhost/upload"); }
  },
  ObjectNotFoundError: class extends Error {},
}));

vi.mock("./auth", () => ({
  getConfiguredGoogleClientId: vi.fn().mockReturnValue(""),
}));

const app = express();
app.use("/api", healthRouter);

describe("Health endpoints", () => {
  it("GET /api/health/liveness returns ok", async () => {
    const res = await request(app).get("/api/health/liveness");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it("GET /api/health/readiness returns ok when DB is healthy", async () => {
    const res = await request(app).get("/api/health/readiness");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.db).toBe(true);
    expect(res.body.dbLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it("GET /api/healthz returns overall ok", async () => {
    const res = await request(app).get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.db).toBe("ok");
  });

  it("GET /api/readyz aliases database readiness", async () => {
    const res = await request(app).get("/api/readyz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.db).toBe(true);
  });
});
