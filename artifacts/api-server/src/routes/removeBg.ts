import { Router, type IRouter, type Request, type Response } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { validateBackgroundRemovalOutput } from "../lib/transformedImageValidation";

const router: IRouter = Router();

/* ── Simple in-memory rate limiter ─────────────────────────
   Allows MAX_CALLS requests per IP per WINDOW_MS.
   Resets the window for each IP after WINDOW_MS elapses.
─────────────────────────────────────────────────────────── */
const MAX_CALLS = 60;          // max remove-bg calls per IP per window (server API key calls only)
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB base64 image cap
const REMOVE_BG_UPSTREAM_TIMEOUT_MS = 15_000;

interface RateBucket { count: number; resetAt: number }
const rateBuckets = new Map<string, RateBucket>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (bucket.count >= MAX_CALLS) return false;
  bucket.count++;
  return true;
}

/* ── Status endpoint — public, no auth needed ──────────────
   Returns whether the remove.bg API key is configured so
   the storefront can show the correct UI state without
   having to attempt a real removal first.
─────────────────────────────────────────────────────────── */
router.get("/remove-bg/status", async (_req: Request, res: Response) => {
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "removeBgApiKey"));
    return res.json({ configured: Boolean(row?.value) });
  } catch {
    return res.json({ configured: false });
  }
});

router.post("/remove-bg", async (req: Request, res: Response) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== "string") {
      return res.status(400).json({ error: "image_required", message: "image field (base64 data URL) is required" });
    }

    // Payload size guard — reject oversized images before processing
    if (image.length > MAX_PAYLOAD_BYTES) {
      return res.status(413).json({
        error: "image_too_large",
        message: "Image exceeds the 10 MB limit. Try HD-Upscale after resizing the image first.",
      });
    }

    // Check API key FIRST — if absent, return 503 immediately so the client
    // switches to the free in-browser WASM fallback without hitting the rate limiter.
    const [apiKeyRow] = await db.select().from(settingsTable).where(eq(settingsTable.key, "removeBgApiKey"));
    const apiKey = apiKeyRow?.value;

    if (!apiKey) {
      return res.status(503).json({
        error: "no_api_key",
        message: "Background removal isn't configured — switching to in-browser AI.",
      });
    }

    // Rate limit only applies when an API key is present (server-side calls cost money)
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        error: "rate_limited",
        message: "Too many background removal requests. Please wait before trying again.",
      });
    }

    const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");
    const mimeType = image.startsWith("data:image/png") ? "image/png" : "image/jpeg";

    const buffer = Buffer.from(base64Data, "base64");
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    formData.append("image_file", blob, "image.png");
    formData.append("size", "auto");

    let response: globalThis.Response;
    try {
      response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": apiKey },
        body: formData,
        signal: AbortSignal.timeout(REMOVE_BG_UPSTREAM_TIMEOUT_MS),
      });
    } catch (err) {
      if ((err as DOMException).name === "TimeoutError") {
        req.log?.warn?.({ timeoutMs: REMOVE_BG_UPSTREAM_TIMEOUT_MS }, "remove.bg request timed out");
        return res.status(504).json({
          error: "remove_bg_timeout",
          message: "Background removal took too long. Your original artwork was kept; please retry.",
        });
      }
      throw err;
    }

    if (!response.ok) {
      const errorText = await response.text();
      req.log?.error?.({ status: response.status, error: errorText }, "remove.bg API error");
      if (response.status === 402) {
        return res.status(402).json({
          error: "quota_exceeded",
          message: "Remove.bg quota exhausted. Please upgrade the remove.bg plan or wait until next month.",
        });
      }
      return res.status(502).json({
        error: "remove_bg_failed",
        message: "Background removal failed on the server. Please try again.",
      });
    }

    const resultBuffer = Buffer.from(await response.arrayBuffer());
    const validation = await validateBackgroundRemovalOutput(resultBuffer);
    if (!validation.valid) {
      req.log?.warn?.({ reason: validation.reason }, "remove.bg returned an unaccepted transformed image");
      return res.status(422).json({
        error: "invalid_transformed_output",
        message: "The background-removal output did not pass transparency and image validation. Your original artwork was kept.",
      });
    }
    const resultBase64 = `data:image/png;base64,${resultBuffer.toString("base64")}`;
    return res.json({ result: resultBase64, validation });
  } catch (err) {
    req.log?.error?.({ err }, "remove-bg error");
    return res.status(500).json({ error: "internal_error", message: "Failed to remove background — please try again." });
  }
});

export default router;
