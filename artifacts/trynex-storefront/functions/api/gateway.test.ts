import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { onRequest, __resetGatewayState } from "./[[path]]";

type GatewayContext = Parameters<typeof onRequest>[0];

function context(method: string, path: string, env: Record<string, string>, body?: string, extraHeaders?: HeadersInit): GatewayContext {
  return {
    request: new Request(`https://trynext.pages.dev/api/${path}`, {
      method,
      body: method === "GET" || method === "HEAD" ? undefined : body,
      headers: body ? { ...extraHeaders, "Content-Type": "application/json" } : extraHeaders,
    }),
    env,
    params: { path: path.split("/") },
    waitUntil: () => undefined,
  } as GatewayContext;
}

describe("four-render multi-route Pages gateway", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    __resetGatewayState();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("routes reads to read origins and fails over on a retryable status", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("read-1 down", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ source: "read-2" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest(context("GET", "products", {
      API_PRIMARY_ORIGIN: "https://render-main.example",
      API_READ_ORIGINS: "https://render-read-1.example,https://render-read-2.example",
    }));

    expect(response.status).toBe(200);
    expect((await response.json()).source).toBe("read-2");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.headers.get("X-Trynext-Origin")).toBe("render-read-2.example");
    expect(response.headers.get("X-Trynext-Route")).toBe("read");
  });

  it("rotates read origins round-robin to split read load", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const env = {
      API_PRIMARY_ORIGIN: "https://render-main.example",
      API_READ_ORIGINS: "https://render-read-1.example,https://render-read-2.example",
    };
    await onRequest(context("GET", "products", env));
    await onRequest(context("GET", "categories", env));

    expect((fetchMock.mock.calls[0][0] as Request).url).toContain("render-read-1.example");
    expect((fetchMock.mock.calls[1][0] as Request).url).toContain("render-read-2.example");
  });

  it("treats sitemap.xml as a safe public read (SEO fix) and fails it over", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response("primary unavailable", { status: 503 }))
      .mockResolvedValueOnce(new Response("<?xml version=\"1.0\"?><urlset/>", {
        status: 200,
        headers: { "Content-Type": "application/xml" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest(context("GET", "sitemap.xml", {
      API_PRIMARY_ORIGIN: "https://render-main.example",
      API_READ_ORIGINS: "https://render-read-1.example,https://render-read-2.example",
    }));

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(response.headers.get("X-Trynext-Origin")).toBe("render-read-2.example");
    expect(response.headers.get("X-Trynext-Route")).toBe("read");
  });

  it("routes writes to the PRIMARY only and never replays to a read origin", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("primary wrote", { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest(context("POST", "orders", {
      API_PRIMARY_ORIGIN: "https://render-main.example",
      API_READ_ORIGINS: "https://render-read-1.example,https://render-read-2.example",
    }, JSON.stringify({ customerName: "QA" })));

    expect(response.status).toBe(201);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][0] as Request).url).toContain("render-main.example");
    expect(response.headers.get("X-Trynext-Route")).toBe("write");
  });

  it("pins admin and authenticated reads to the PRIMARY (no standby leak)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest(context("GET", "admin/system/health", {
      API_PRIMARY_ORIGIN: "https://render-main.example",
      API_READ_ORIGINS: "https://render-read-1.example,https://render-read-2.example",
    }));

    expect(response.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][0] as Request).url).toContain("render-main.example");
    expect(response.headers.get("X-Trynext-Route")).toBe("write");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("never replays provider-consuming AI generation GETs to a read origin", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response("primary unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest(context("GET", "ai/generate", {
      API_PRIMARY_ORIGIN: "https://render-main.example",
      API_READ_ORIGINS: "https://render-read-1.example,https://render-read-2.example",
    }));

    expect(response.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][0] as Request).url).toContain("render-main.example");
  });

  it("uses the committed primary for writes when no env override exists", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: "primary unavailable" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest(context("POST", "orders", {}, JSON.stringify({ customerName: "QA" })));

    expect(response.status).toBe(503);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((fetchMock.mock.calls[0][0] as Request).url).toContain("trynex-lifestyle-main-render.onrender.com");
    const body = await response.json();
    expect(body.error).toBe("primary unavailable");
  });

  it("uses the committed config origins when no env overrides exist", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest(context("GET", "products", {}));

    expect(response.status).toBe(200);
    const calledUrl = (fetchMock.mock.calls[0][0] as Request).url;
    expect(calledUrl).toContain("trynext-api-standby");
  });

  it("prefers explicit role env vars over the legacy API_ORIGINS list", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest(context("GET", "products", {
      API_PRIMARY_ORIGIN: "https://render-main.example",
      API_READ_ORIGINS: "https://render-read-1.example",
      API_ORIGINS: "https://legacy-dead.example",
    }));

    expect(response.status).toBe(200);
    expect((fetchMock.mock.calls[0][0] as Request).url).toContain("render-read-1.example");
  });

  it("answers CORS preflight at the edge without reaching Render", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await onRequest(context("OPTIONS", "products", {
      API_PRIMARY_ORIGIN: "https://render-main.example",
    }));

    expect(response.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
  });
});
