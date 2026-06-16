import { Router, type Request, type Response } from "express";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { requireAdmin } from "../middlewares/adminAuth";
import { ObjectStorageService } from "../lib/objectStorage";
import { db, productsTable, ordersTable, categoriesTable, settingsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

const router = Router();

const AI_REF_LIMIT_MB = 10;
const AI_REF_LIMIT_BYTES = AI_REF_LIMIT_MB * 1024 * 1024;

/* ─── Rate limiting (per IP) ─── */
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string, limit = 20): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count++;
  return true;
}

function getUploadsDir(): string {
  const dir = process.env.LOCAL_STORAGE_PATH || path.join(process.cwd(), "uploads");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getPublicBaseUrl(): string {
  if (process.env.API_PUBLIC_URL) return process.env.API_PUBLIC_URL.replace(/\/$/, "");
  const port = process.env.PORT || process.env.API_PORT || "5001";
  return `http://localhost:${port}`;
}

/* ══════════════════════════════════════════════════════
   IMAGE MODELS — free, no API key, auto-updated
   Pollinations.ai serves latest model versions automatically.
   Priority order: best quality first, speed fallbacks after.
══════════════════════════════════════════════════════ */
const IMAGE_MODELS = {
  "flux-realism": { label: "Flux Realism", desc: "Photorealistic, ultra-detailed" },
  "flux":         { label: "Flux",         desc: "Balanced quality & speed" },
  "flux-kontext": { label: "Flux Kontext", desc: "Best for image editing" },
  "flux-3d":      { label: "Flux 3D",      desc: "3D / product render style" },
  "any-dark":     { label: "Dark Art",     desc: "Dark dramatic illustrations" },
  "turbo":        { label: "Turbo",        desc: "Fastest generation" },
} as const;

type ImageModelId = keyof typeof IMAGE_MODELS;

/* ══════════════════════════════════════════════════════
   TEXT / CHAT MODELS — free, no API key
   Uses Pollinations text API (OpenAI-compatible endpoint).
══════════════════════════════════════════════════════ */
const TEXT_MODELS = [
  { id: "openai-large",  label: "GPT-4o (Recommended)" },
  { id: "openai",        label: "GPT-4o Mini" },
  { id: "mistral-large", label: "Mistral Large" },
  { id: "llama",         label: "Llama 3.3 70B" },
];

const POLLIN_TEXT_URL = "https://text.pollinations.ai/openai";

/* ════════════════════════════════════════════════════
   GET /api/ai/models
   Returns available models for the frontend.
════════════════════════════════════════════════════ */
router.get("/ai/models", (_req: Request, res: Response) => {
  return res.json({
    image: Object.entries(IMAGE_MODELS).map(([id, info]) => ({ id, ...info })),
    text: TEXT_MODELS,
  });
});

/* ════════════════════════════════════════════════════
   POST /api/ai/reference
   Upload a reference image for img2img editing.
   Returns a public URL for Pollinations to fetch.
════════════════════════════════════════════════════ */
router.post("/ai/reference", async (req: Request, res: Response) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  if (!checkRateLimit(ip, 120)) {
    return res.status(429).json({ error: "Too many requests. Please wait a moment." });
  }

  const { image, ext: extHint } = req.body as { image?: string; ext?: string };
  if (!image || typeof image !== "string") {
    return res.status(400).json({ error: "image field (base64 data URL) is required" });
  }

  const dataUrlMatch = image.match(/^data:image\/([a-z]+);base64,(.+)$/);
  const base64Data = dataUrlMatch ? dataUrlMatch[2] : image;
  const detectedExt = dataUrlMatch ? dataUrlMatch[1].replace("jpeg", "jpg") : (extHint ?? "jpg");
  const safeExt = ["jpg", "png", "gif", "webp"].includes(detectedExt) ? detectedExt : "jpg";

  const buf = Buffer.from(base64Data, "base64");
  if (buf.length === 0) return res.status(400).json({ error: "Empty image data." });
  if (buf.length > AI_REF_LIMIT_BYTES) return res.status(413).json({ error: `Image must be under ${AI_REF_LIMIT_MB}MB.` });

  const filename = `ai-ref-${randomUUID()}.${safeExt}`;
  const filePath = path.join(getUploadsDir(), filename);

  try {
    fs.writeFileSync(filePath, buf);
  } catch (err) {
    console.error("[ai/reference] write error:", err instanceof Error ? err.message : String(err));
    return res.status(500).json({ error: "Failed to save reference image." });
  }

  const url = `${getPublicBaseUrl()}/api/ai/ref/${filename}`;
  return res.json({ url });
});

/* ════════════════════════════════════════════════════
   GET /api/ai/ref/:filename
   Serve a previously uploaded AI reference image.
════════════════════════════════════════════════════ */
router.get("/ai/ref/:filename", (req: Request, res: Response) => {
  const rawFilename = req.params.filename;
  const filename = Array.isArray(rawFilename) ? rawFilename[0] : rawFilename;
  if (!filename || !/^ai-ref-[a-zA-Z0-9_-]+\.[a-z]+$/.test(filename)) {
    return res.status(400).json({ error: "Invalid filename." });
  }
  const filePath = path.join(getUploadsDir(), filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found." });
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.setHeader("Access-Control-Allow-Origin", "*");
  return res.sendFile(filePath);
});

/* ════════════════════════════════════════════════════
   GET /api/ai/generate
   Server-side proxy for Pollinations image generation.
   Supports multi-model with automatic fallback chain.
   Query params:
     prompt    (required)
     model     (optional, default: flux-realism)
     seed      (optional)
     width     (optional, default: 1024)
     height    (optional, default: 1024)
     imageUrl  (optional) — reference image for img2img
════════════════════════════════════════════════════ */
router.get("/ai/generate", async (req: Request, res: Response) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  if (!checkRateLimit(ip, 100)) {
    return res.status(429).json({ error: "Too many requests — please wait a moment." });
  }

  const {
    prompt,
    model = "flux-realism",
    seed,
    width = "1024",
    height = "1024",
    imageUrl,
    enhance = "true",
  } = req.query as Record<string, string>;

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "prompt is required" });
  }

  const finalSeed = seed || String(Math.floor(Math.random() * 999999));
  const w = Math.min(1440, Math.max(256, parseInt(width, 10) || 1024));
  const h = Math.min(1440, Math.max(256, parseInt(height, 10) || 1024));
  const safeModel = (model in IMAGE_MODELS) ? model as ImageModelId : "flux-realism";

  // Build fallback chain: requested model → flux-realism → flux → turbo
  const fallbackChain: ImageModelId[] = [safeModel];
  if (safeModel !== "flux-realism") fallbackChain.push("flux-realism");
  if (safeModel !== "flux") fallbackChain.push("flux");
  if (safeModel !== "turbo") fallbackChain.push("turbo");

  const buildUrl = (m: ImageModelId): string => {
    const base = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;
    const params = new URLSearchParams({
      width: String(w),
      height: String(h),
      seed: finalSeed,
      nologo: "true",
      model: m,
      ...(enhance === "true" ? { enhance: "true" } : {}),
    });
    if (imageUrl && typeof imageUrl === "string") {
      params.set("image_url", imageUrl);
    }
    return `${base}?${params.toString()}`;
  };

  let lastError = "Unknown error";
  for (const m of fallbackChain) {
    const url = buildUrl(m);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 90_000);
      const imgRes = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "TryNex-Studio/2.0" },
      });
      clearTimeout(timeout);

      if (!imgRes.ok) {
        lastError = `AI service returned ${imgRes.status}`;
        console.warn(`[ai/generate] model=${m} → ${imgRes.status}, trying next…`);
        continue;
      }

      const buf = await imgRes.arrayBuffer();
      if (buf.byteLength < 512) {
        lastError = "AI returned an empty image";
        console.warn("[ai/generate] Empty image response, trying next…");
        continue;
      }
      const mime = imgRes.headers.get("content-type") || "image/jpeg";
      const b64 = Buffer.from(buf).toString("base64");
      return res.json({ dataUrl: `data:${mime};base64,${b64}`, model: m });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      lastError = msg;
      console.warn(`[ai/generate] model=${m} fetch error:`, msg, "— trying next…");
      if (msg.includes("abort") || msg.includes("timeout")) {
        lastError = "AI generation timed out. Try a shorter prompt or faster model (Turbo).";
      }
    }
  }

  console.error("[ai/generate] All models failed. Last error:", lastError);
  return res.status(502).json({
    error: lastError.includes("timed out")
      ? lastError
      : "AI generation failed — the service may be busy. Try 'Turbo' model for faster results.",
  });
});

/* ════════════════════════════════════════════════════
   POST /api/storage/product-image
   Upload a product image — tries Imgur first (if
   IMGUR_CLIENT_ID is configured), then R2/S3, then local.
   Returns { url } for direct use as product imageUrl.
   Admin-only.
════════════════════════════════════════════════════ */
router.post("/storage/product-image", requireAdmin, async (req: Request, res: Response) => {
  const { image } = req.body as { image?: string };
  if (!image || typeof image !== "string") {
    return res.status(400).json({ error: "image field (base64 data URL) is required" });
  }

  const dataUrlMatch = image.match(/^data:image\/([a-z]+);base64,(.+)$/s);
  if (!dataUrlMatch) {
    return res.status(400).json({ error: "image must be a base64 data URL (data:image/...;base64,...)" });
  }
  const [, rawExt, b64] = dataUrlMatch;
  const safeExt = ["jpg", "jpeg", "png", "gif", "webp"].includes(rawExt) ? rawExt.replace("jpeg", "jpg") : "jpg";
  const mimeType = `image/${rawExt === "jpg" ? "jpeg" : rawExt}`;

  const buf = Buffer.from(b64, "base64");
  if (buf.length === 0) return res.status(400).json({ error: "Empty image data." });
  if (buf.length > 20 * 1024 * 1024) return res.status(413).json({ error: "Image must be under 20 MB." });

  const imgurClientId = process.env.IMGUR_CLIENT_ID;
  if (imgurClientId) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      const imgurRes = await fetch("https://api.imgur.com/3/image", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Authorization": `Client-ID ${imgurClientId}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ image: b64, type: "base64", name: `product-${randomUUID()}.${safeExt}` }),
      });
      clearTimeout(timeout);
      if (imgurRes.ok) {
        const data = await imgurRes.json() as { data?: { link?: string }; success?: boolean };
        if (data?.success && data?.data?.link) {
          return res.json({ url: data.data.link, backend: "imgur" });
        }
      }
    } catch (e) {
      console.warn("[product-image] Imgur upload failed, falling back:", e instanceof Error ? e.message : e);
    }
  }

  const svc = new ObjectStorageService();
  const backend = svc.getBackendName();

  if (backend === "r2" || backend === "s3") {
    const entityId = `products/${randomUUID()}.${safeExt}`;
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const r2AccountId = process.env.R2_ACCOUNT_ID;
    const r2Key = process.env.R2_ACCESS_KEY_ID;
    const r2Secret = process.env.R2_SECRET_ACCESS_KEY;
    const r2Bucket = process.env.R2_BUCKET;
    const r2PublicBase = process.env.R2_PUBLIC_BASE_URL;
    const s3Key = process.env.S3_ACCESS_KEY_ID;
    const s3Secret = process.env.S3_SECRET_ACCESS_KEY;
    const s3Bucket = process.env.S3_BUCKET;
    const s3PublicBase = process.env.S3_PUBLIC_BASE_URL;

    if (backend === "r2" && r2AccountId && r2Key && r2Secret && r2Bucket) {
      const client = new S3Client({
        region: "auto",
        endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId: r2Key, secretAccessKey: r2Secret },
        forcePathStyle: false,
      });
      await client.send(new PutObjectCommand({ Bucket: r2Bucket, Key: entityId, Body: buf, ContentType: mimeType }));
      const publicUrl = r2PublicBase ? `${r2PublicBase.replace(/\/$/, "")}/${entityId}` : `https://${r2AccountId}.r2.cloudflarestorage.com/${r2Bucket}/${entityId}`;
      return res.json({ url: publicUrl, backend: "r2" });
    }
    if (backend === "s3" && s3Key && s3Secret && s3Bucket) {
      const s3Region = process.env.S3_REGION || "us-east-1";
      const s3Endpoint = process.env.S3_ENDPOINT;
      const client = new S3Client({
        region: s3Region,
        endpoint: s3Endpoint,
        credentials: { accessKeyId: s3Key, secretAccessKey: s3Secret },
        forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE,
      });
      await client.send(new PutObjectCommand({ Bucket: s3Bucket, Key: entityId, Body: buf, ContentType: mimeType }));
      const publicUrl = s3PublicBase ? `${s3PublicBase.replace(/\/$/, "")}/${entityId}` : `https://${s3Bucket}.s3.${s3Region}.amazonaws.com/${entityId}`;
      return res.json({ url: publicUrl, backend: "s3" });
    }
  }

  const localDir = path.join(getUploadsDir(), "products");
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  const filename = `product-${randomUUID()}.${safeExt}`;
  const filePath = path.join(localDir, filename);
  fs.writeFileSync(filePath, buf);
  const baseUrl = getPublicBaseUrl();
  return res.json({ url: `${baseUrl}/api/storage/product-images/${filename}`, backend: "local" });
});

router.get("/storage/product-images/:filename", (req: Request, res: Response) => {
  const rawFilename = req.params.filename;
  const filename = Array.isArray(rawFilename) ? rawFilename[0] : rawFilename;
  if (!filename || !/^product-[a-zA-Z0-9_-]+\.[a-z]+$/.test(filename)) {
    return res.status(400).json({ error: "Invalid filename." });
  }
  const filePath = path.join(getUploadsDir(), "products", filename);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: "Not found." });
  res.setHeader("Cache-Control", "public, max-age=86400");
  return res.sendFile(filePath);
});

/* ════════════════════════════════════════════════════
   POST /api/ai/chat
   Free AI chat using Pollinations text API.
   No API key needed. OpenAI-compatible format.

   Body:
     messages  (required) — array of { role, content }
     model     (optional, default: openai-large)
     system    (optional) — system prompt
     stream    (optional, default: false)
════════════════════════════════════════════════════ */
router.post("/ai/chat", async (req: Request, res: Response) => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  if (!checkRateLimit(ip, 120)) {
    return res.status(429).json({ error: "Too many requests — please wait a moment." });
  }

  const { messages, model = "openai-large", system } = req.body as {
    messages?: Array<{ role: string; content: string }>;
    model?: string;
    system?: string;
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  const safeModel = TEXT_MODELS.some(m => m.id === model) ? model : "openai-large";

  const systemMessages = system
    ? [{ role: "system", content: system }]
    : [{
        role: "system",
        content: `You are an expert AI business assistant and store manager for TryNex Lifestyle — Bangladesh's premier custom apparel e-commerce brand (T-shirts, Hoodies, Mugs, Caps, Water Bottles).

Your expertise spans:
• E-commerce strategy & pricing (BDT currency, Bangladesh market dynamics)
• Marketing copy for Facebook, Instagram, WhatsApp & local platforms
• SEO-optimized blog posts & product descriptions (English + Bangla)
• Customer service scripts & order management responses
• Design trends for Bangladeshi audiences (Eid, Puja, cricket, youth culture)
• Promo code & discount strategy
• Supply chain & print-on-demand operations
• Analytics interpretation & growth tactics

Store context:
- Payment: bKash, Nagad, Rocket, COD (15% advance)
- Delivery: All 64 districts of Bangladesh
- Free shipping on orders ≥ ৳1,500
- Custom design via AI studio (Pollinations.ai) + upload + text tools
- Products: Custom T-shirts (320 GSM), Hoodies, Mugs, Caps, Long Sleeves, Water Bottles

Guidelines:
- Respond in the same language as the user (English or Bengali/Bangla)
- Use markdown headings (##, ###) and bullet points for structured content
- For pricing advice, suggest BDT amounts with market context
- Be data-driven — ask clarifying questions when needed for better recommendations
- For blog posts: 600-900 words, SEO-optimized, with meta description suggestion
- For ad copy: write 3 variations (short/medium/long) for A/B testing`,
      }];

  const allMessages = [...systemMessages, ...messages];
  const wantsStream = req.body.stream === true;

  if (wantsStream) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const sendEvent = (data: object) => {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const modelsToTry = [safeModel, ...TEXT_MODELS.filter(m => m.id !== safeModel).map(m => m.id)];
    for (const modelId of modelsToTry) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000);
        const chatRes = await fetch(POLLIN_TEXT_URL, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", "User-Agent": "TryNex-Admin/2.0" },
          body: JSON.stringify({
            model: modelId,
            messages: allMessages,
            stream: true,
            seed: Math.floor(Math.random() * 99999),
            private: true,
          }),
        });
        clearTimeout(timeout);
        if (!chatRes.ok || !chatRes.body) {
          console.warn(`[ai/chat/stream] model=${modelId} → ${chatRes.status}, trying next`);
          continue;
        }
        sendEvent({ type: "model", model: modelId });
        const reader = chatRes.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (payload === "[DONE]") { sendEvent({ type: "done" }); res.end(); return; }
            try {
              const parsed = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string }; finish_reason?: string }> };
              const delta = parsed?.choices?.[0]?.delta?.content;
              if (delta) sendEvent({ type: "delta", delta });
              const finish = parsed?.choices?.[0]?.finish_reason;
              if (finish === "stop") { sendEvent({ type: "done" }); res.end(); return; }
            } catch { /* non-JSON line */ }
          }
        }
        sendEvent({ type: "done" });
        res.end();
        return;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn(`[ai/chat/stream] model=${modelId} error:`, msg, "— trying next");
        continue;
      }
    }
    sendEvent({ type: "error", error: "AI chat service is temporarily unavailable. Please try again." });
    res.end();
    return;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);

    const chatRes = await fetch(POLLIN_TEXT_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "TryNex-Admin/2.0",
      },
      body: JSON.stringify({
        model: safeModel,
        messages: allMessages,
        stream: false,
        seed: Math.floor(Math.random() * 99999),
        private: true,
      }),
    });
    clearTimeout(timeout);

    if (!chatRes.ok) {
      const txt = await chatRes.text().catch(() => "");
      console.warn("[ai/chat] model", safeModel, "returned", chatRes.status, txt.slice(0, 100), "— will try fallbacks");
      throw new Error(`Model ${safeModel} returned ${chatRes.status}`);
    }

    const data = await chatRes.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("empty response");

    return res.json({ content, model: safeModel });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("abort") || msg.includes("timeout")) {
      return res.status(504).json({ error: "AI chat timed out. Please try again." });
    }
    const modelIdx = TEXT_MODELS.findIndex(m => m.id === safeModel);
    const fallbacks = TEXT_MODELS.slice(modelIdx + 1);
    for (const fb of fallbacks) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 45_000);
        const fbRes = await fetch(POLLIN_TEXT_URL, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json", "User-Agent": "TryNex-Admin/2.0" },
          body: JSON.stringify({
            model: fb.id,
            messages: [...(system ? [{ role: "system", content: system }] : [{ role: "system", content: `You are a helpful AI assistant for TryNex Lifestyle — a premium custom apparel e-commerce brand in Bangladesh.` }]), ...messages],
            stream: false,
            seed: Math.floor(Math.random() * 99999),
            private: true,
          }),
        });
        clearTimeout(timeout);
        if (!fbRes.ok) continue;
        const fbData = await fbRes.json() as { choices?: Array<{ message?: { content?: string } }> };
        const fbContent = fbData?.choices?.[0]?.message?.content;
        if (!fbContent) continue;
        console.info("[ai/chat] fallback succeeded with", fb.id);
        return res.json({ content: fbContent, model: fb.id });
      } catch { continue; }
    }
    console.error("[ai/chat] all models failed:", msg);
    return res.status(502).json({ error: "AI chat service is temporarily unavailable. Please try again in a moment." });
  }
});

/* ══════════════════════════════════════════════════════════════
   AI DEVELOPER — Multi-provider free agent system
   Supports Pollinations (zero-key), Groq, OpenRouter, Together,
   and Hugging Face Inference API. Automatic key-based fallback.
══════════════════════════════════════════════════════════════ */

const DEV_PROVIDERS = [
  {
    id: "pollinations",
    name: "Pollinations AI",
    tag: "Zero-Key",
    color: "#6366f1",
    url: "https://text.pollinations.ai/openai",
    needsKey: false,
    envKey: "",
    models: [
      { id: "openai-large",  label: "GPT-4o",          ctx: 128000, speed: "fast"   },
      { id: "openai",        label: "GPT-4o Mini",     ctx: 128000, speed: "fast"   },
      { id: "mistral-large", label: "Mistral Large 2", ctx: 32000,  speed: "fast"   },
      { id: "llama",         label: "Llama 3.3 70B",   ctx: 32000,  speed: "medium" },
      { id: "qwen-coder",    label: "Qwen Coder 32B",  ctx: 32000,  speed: "medium" },
      { id: "deepseek",      label: "DeepSeek R1",     ctx: 64000,  speed: "medium" },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    tag: "Ultra-Fast",
    color: "#f59e0b",
    url: "https://api.groq.com/openai/v1/chat/completions",
    needsKey: true,
    envKey: "GROQ_API_KEY",
    models: [
      { id: "llama-3.3-70b-versatile",    label: "Llama 3.3 70B",    ctx: 128000, speed: "ultra" },
      { id: "llama-3.1-8b-instant",       label: "Llama 3.1 8B",     ctx: 128000, speed: "ultra" },
      { id: "mixtral-8x7b-32768",         label: "Mixtral 8x7B",     ctx: 32768,  speed: "ultra" },
      { id: "gemma2-9b-it",               label: "Gemma 2 9B",       ctx: 8192,   speed: "ultra" },
      { id: "llama-3.1-70b-versatile",    label: "Llama 3.1 70B",    ctx: 128000, speed: "ultra" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    tag: "Free Tier",
    color: "#10b981",
    url: "https://openrouter.ai/api/v1/chat/completions",
    needsKey: true,
    envKey: "OPENROUTER_API_KEY",
    models: [
      { id: "meta-llama/llama-3.1-8b-instruct:free",           label: "Llama 3.1 8B (Free)",     ctx: 128000, speed: "medium" },
      { id: "google/gemma-2-9b-it:free",                        label: "Gemma 2 9B (Free)",       ctx: 8192,   speed: "medium" },
      { id: "microsoft/phi-3-mini-128k-instruct:free",          label: "Phi-3 Mini 128K (Free)",  ctx: 128000, speed: "fast"   },
      { id: "qwen/qwen-2-7b-instruct:free",                     label: "Qwen 2 7B (Free)",        ctx: 131072, speed: "fast"   },
      { id: "mistralai/mistral-7b-instruct:free",               label: "Mistral 7B (Free)",       ctx: 32768,  speed: "fast"   },
      { id: "deepseek/deepseek-r1:free",                        label: "DeepSeek R1 (Free)",      ctx: 64000,  speed: "slow"   },
    ],
  },
  {
    id: "together",
    name: "Together AI",
    tag: "Free Tier",
    color: "#8b5cf6",
    url: "https://api.together.xyz/v1/chat/completions",
    needsKey: true,
    envKey: "TOGETHER_API_KEY",
    models: [
      { id: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",   label: "Llama 3.1 8B Turbo",   ctx: 128000, speed: "fast"   },
      { id: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",  label: "Llama 3.1 70B Turbo",  ctx: 128000, speed: "medium" },
      { id: "mistralai/Mixtral-8x7B-Instruct-v0.1",          label: "Mixtral 8x7B",         ctx: 32768,  speed: "fast"   },
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct",               label: "Qwen 2.5 Coder 32B",   ctx: 32000,  speed: "medium" },
    ],
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    tag: "Free API",
    color: "#f97316",
    url: "https://api-inference.huggingface.co/v1/chat/completions",
    needsKey: true,
    envKey: "HUGGINGFACE_API_KEY",
    models: [
      { id: "meta-llama/Llama-3.1-8B-Instruct",        label: "Llama 3.1 8B",       ctx: 128000, speed: "medium" },
      { id: "mistralai/Mistral-7B-Instruct-v0.3",       label: "Mistral 7B v0.3",    ctx: 32768,  speed: "medium" },
      { id: "Qwen/Qwen2.5-Coder-32B-Instruct",          label: "Qwen 2.5 Coder 32B", ctx: 32000,  speed: "slow"   },
    ],
  },
] as const;

type DevProvider = typeof DEV_PROVIDERS[number];

const DEVELOPER_SYSTEM_PROMPT = `You are TryNex AI Developer — a senior full-stack developer agent embedded in the TryNex Lifestyle admin panel.

## Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS + Wouter + TanStack Query
- Backend: Node.js + Express + TypeScript + Drizzle ORM + PostgreSQL
- AI: Pollinations.ai (text + image, zero-key), optional Groq/OpenRouter/Together/HuggingFace
- Storage: Cloudflare R2 / AWS S3 / local fallback via ObjectStorageService
- Auth: SHA-256 hash admin token in sessionStorage
- Currency: BDT (৳), Bangladesh market
- Payments: bKash, Nagad, Rocket (manual), COD

## Guidelines
- Lead with working code — explanations after
- Use markdown headings and bullet lists for structure  
- Wrap all code in triple-backtick blocks with language tag (\`\`\`typescript, \`\`\`sql, etc.)
- Include file path as first comment in each code block
- Admin UI: uses AdminLayout wrapper, lucide-react icons, #E85D04 orange accent, Tailwind classes
- Be concise, precise, and production-ready`;

/* ── Helper: stream SSE from upstream response ───────────── */
async function pipeSSEStream(
  chatRes: globalThis.Response,
  sendEvent: (d: object) => void,
): Promise<void> {
  if (!chatRes.body) return;
  const reader = chatRes.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() ?? "";
    for (const line of lines) {
      const t = line.trim();
      if (!t.startsWith("data:")) continue;
      const payload = t.slice(5).trim();
      if (payload === "[DONE]") { sendEvent({ type: "done" }); return; }
      try {
        const p = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string }; finish_reason?: string }> };
        const delta = p?.choices?.[0]?.delta?.content;
        if (delta) sendEvent({ type: "delta", delta });
        if (p?.choices?.[0]?.finish_reason === "stop") { sendEvent({ type: "done" }); return; }
      } catch { /* skip */ }
    }
  }
  sendEvent({ type: "done" });
}

/* ── GET /api/ai/developer/providers ────────────────────── */
router.get("/ai/developer/providers", requireAdmin, (_req, res) => {
  const list = DEV_PROVIDERS.map(p => ({
    id:        p.id,
    name:      p.name,
    tag:       p.tag,
    color:     p.color,
    needsKey:  p.needsKey,
    available: !p.needsKey || !!process.env[p.envKey],
    models:    [...p.models],
  }));
  return res.json({ providers: list });
});

/* ── POST /api/ai/developer/chat — streaming SSE agent ──── */
router.post("/ai/developer/chat", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
  if (!checkRateLimit(ip, 300)) {
    res.status(429).json({ error: "Rate limit exceeded. Wait a moment." }); return;
  }

  const {
    messages, model, providerId = "pollinations",
    systemPrompt, temperature = 0.7,
  } = req.body as {
    messages:     Array<{ role: string; content: string }>;
    model?:       string;
    providerId?:  string;
    systemPrompt?: string;
    temperature?:  number;
  };

  if (!messages?.length) { res.status(400).json({ error: "messages required" }); return; }

  const wanted = DEV_PROVIDERS.find(p => p.id === providerId) as DevProvider | undefined;
  const hasCreds = (p: DevProvider) => !p.needsKey || !!process.env[p.envKey];
  const provider: DevProvider = (wanted && hasCreds(wanted)) ? wanted : DEV_PROVIDERS[0];
  const apiKey  = provider.needsKey ? (process.env[provider.envKey] ?? "") : "pollinations";

  const safeModel = provider.models.some((m: { id: string }) => m.id === model)
    ? model!
    : provider.models[0].id;

  const allMessages = [
    { role: "system", content: systemPrompt?.trim() || DEVELOPER_SYSTEM_PROMPT },
    ...messages,
  ];

  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const send = (d: object) => res.write(`data: ${JSON.stringify(d)}\n\n`);

  try {
    const ctrl = new AbortController();
    const tmo  = setTimeout(() => ctrl.abort(), 120_000);

    const body: Record<string, unknown> = {
      model: safeModel, messages: allMessages, stream: true, temperature,
    };
    if (provider.id === "pollinations") {
      body.seed = Math.floor(Math.random() * 99999);
      body.private = true;
    }

    const extraHeaders: Record<string, string> = {};
    if (provider.id === "openrouter") {
      extraHeaders["HTTP-Referer"] = "https://trynex.shop";
      extraHeaders["X-Title"]     = "TryNex AI Developer";
    }

    send({ type: "provider", provider: provider.id, model: safeModel });

    const chatRes = await fetch(provider.url, {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "User-Agent": "TryNex-Dev/2.0",
        ...extraHeaders,
      },
      body: JSON.stringify(body),
    });
    clearTimeout(tmo);

    if (!chatRes.ok || !chatRes.body) {
      /* fall back to Pollinations if primary provider failed */
      if (provider.id !== "pollinations") {
        send({ type: "provider", provider: "pollinations", model: "openai-large" });
        const fbRes = await fetch(POLLIN_TEXT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "User-Agent": "TryNex-Dev/2.0" },
          body: JSON.stringify({ model: "openai-large", messages: allMessages, stream: true, seed: Math.floor(Math.random() * 99999), private: true }),
        });
        if (fbRes.ok && fbRes.body) { await pipeSSEStream(fbRes, send); res.end(); return; }
      }
      const errTxt = await chatRes.text().catch(() => "");
      send({ type: "error", error: `Provider error ${chatRes.status}: ${errTxt.slice(0, 120)}` });
      res.end();
      return;
    }

    await pipeSSEStream(chatRes, send);
    res.end();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    send({ type: "error", error: msg.includes("abort") ? "Request timed out. Try again." : msg });
    res.end();
  }
});

/* ── GET /api/ai/developer/models — provider + model list ── */
router.get("/ai/developer/models", requireAdmin, (_req, res) => {
  return res.json({
    providers: DEV_PROVIDERS.map(p => ({
      id: p.id, name: p.name, tag: p.tag, color: p.color,
      available: !p.needsKey || !!process.env[p.envKey],
      models: [...p.models],
    })),
  });
});

/* ── GET /api/ai/developer/context — live store data for AI context ── */
router.get("/ai/developer/context", requireAdmin, async (_req, res: Response): Promise<void> => {
  try {
    const [products, categories, recentOrders, settings] = await Promise.all([
      db.select({
        id: productsTable.id, name: productsTable.name,
        price: productsTable.price, stock: productsTable.stock,
        featured: productsTable.featured, categoryId: productsTable.categoryId,
        tags: productsTable.tags, customizable: productsTable.customizable,
      }).from(productsTable).orderBy(desc(productsTable.createdAt)).limit(50),
      db.select().from(categoriesTable).limit(20),
      db.select({
        id: ordersTable.id, status: ordersTable.status,
        total: ordersTable.total, createdAt: ordersTable.createdAt,
        paymentMethod: ordersTable.paymentMethod,
      }).from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(30),
      db.select().from(settingsTable).limit(40),
    ]);

    const totalRevenue = recentOrders.reduce((s, o) => s + Number(o.total ?? 0), 0);
    const pendingOrders = recentOrders.filter(o => o.status === "pending").length;
    const processingOrders = recentOrders.filter(o => o.status === "processing").length;
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));
    const lowStock = products.filter(p => p.stock <= 5);

    res.json({
      products: { total: products.length, items: products, lowStock: lowStock.length },
      categories: { total: categories.length, items: categories },
      orders: {
        total: recentOrders.length, pending: pendingOrders,
        processing: processingOrders, totalRevenue,
        recent: recentOrders.slice(0, 10),
      },
      settings: settingsMap,
      health: {
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Failed to fetch store context: ${msg}` });
  }
});

/* ── POST /api/ai/developer/tool — execute named tool for AI agent ── */
router.post("/ai/developer/tool", requireAdmin, async (req: Request, res: Response): Promise<void> => {
  const { tool, params } = req.body as { tool: string; params?: Record<string, unknown> };
  if (!tool) { res.status(400).json({ error: "tool name required" }); return; }

  try {
    switch (tool) {
      case "search_products": {
        const q = String(params?.query ?? "").toLowerCase();
        const all = await db.select().from(productsTable).limit(50);
        const items = q
          ? all.filter(p =>
              p.name.toLowerCase().includes(q) ||
              String(p.description ?? "").toLowerCase().includes(q) ||
              (Array.isArray(p.tags) && (p.tags as string[]).some((t: string) => t.toLowerCase().includes(q)))
            )
          : all;
        res.json({ tool, result: items, count: items.length }); break;
      }
      case "get_stats": {
        const [pRow, oRow] = await Promise.all([
          db.select({ total: sql<number>`count(*)`, stockSum: sql<number>`sum(${productsTable.stock})`, lowStock: sql<number>`count(*) filter (where ${productsTable.stock} <= 5)` }).from(productsTable),
          db.select({ total: sql<number>`count(*)`, revenue: sql<number>`coalesce(sum(${ordersTable.total}),0)`, pending: sql<number>`count(*) filter (where ${ordersTable.status}='pending')` }).from(ordersTable),
        ]);
        res.json({ tool, result: { products: pRow[0], orders: oRow[0] } }); break;
      }
      case "get_orders": {
        const limit = Math.min(Number(params?.limit ?? 10), 50);
        const status = params?.status as string | undefined;
        let q2 = db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(limit);
        const items = await q2;
        const filtered = status ? items.filter(o => o.status === status) : items;
        res.json({ tool, result: filtered, count: filtered.length }); break;
      }
      case "get_categories": {
        const cats = await db.select().from(categoriesTable).limit(20);
        res.json({ tool, result: cats }); break;
      }
      case "get_settings": {
        const settings2 = await db.select().from(settingsTable).limit(40);
        res.json({ tool, result: Object.fromEntries(settings2.map(s => [s.key, s.value])) }); break;
      }
      case "check_health": {
        const t0 = Date.now();
        await db.execute(sql`SELECT 1`);
        res.json({
          tool, result: {
            db: { ok: true, latencyMs: Date.now() - t0 },
            uptime: Math.floor(process.uptime()),
            memoryMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
            node: process.version,
          },
        }); break;
      }
      case "get_low_stock": {
        const threshold = Number(params?.threshold ?? 10);
        const items = await db.select({ id: productsTable.id, name: productsTable.name, stock: productsTable.stock }).from(productsTable).where(sql`${productsTable.stock} <= ${threshold}`).orderBy(productsTable.stock);
        res.json({ tool, result: items, count: items.length }); break;
      }
      default:
        res.status(400).json({ error: `Unknown tool: ${tool}. Available: search_products, get_stats, get_orders, get_categories, get_settings, check_health, get_low_stock` });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Tool ${tool} failed: ${msg}` });
  }
});

export default router;
