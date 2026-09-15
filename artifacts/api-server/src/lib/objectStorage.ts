/* ═══════════════════════════════════════════════════════════════════════════
   OBJECT STORAGE — portable adapter (Replit-free)
   ----------------------------------------------------------------------------
   Backend detection priority (highest → lowest):

     1. R2    — set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
                Optional: R2_PUBLIC_BASE_URL
     2. S3    — set S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET
                Optional: S3_REGION, S3_ENDPOINT, S3_FORCE_PATH_STYLE, S3_PUBLIC_BASE_URL
     3. Local — default fallback; stores files under LOCAL_STORAGE_PATH (default: ./uploads)
                Upload URL base is set by API_BASE_URL env var (default: http://localhost:PORT)

   Production deployments on Render with Cloudflare R2: set R2_* env vars.
   The local backend works for dev and low-traffic production (ephemeral on Render free tier).
═══════════════════════════════════════════════════════════════════════════ */

import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "stream";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";

/* ─── Backend selection ─────────────────────────────────────────────────── */
type Backend = "r2" | "s3" | "local";

function selectedBackend(): Backend {
  if (
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET
  ) {
    return "r2";
  }
  if (
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY &&
    process.env.S3_BUCKET
  ) {
    return "s3";
  }
  return "local";
}

const BACKEND: Backend = selectedBackend();

/* ─── Local filesystem config ───────────────────────────────────────────── */
const LOCAL_STORAGE_ROOT = path.resolve(
  process.env.LOCAL_STORAGE_PATH || "./uploads"
);

function ensureLocalDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function localUploadsDir(): string {
  const dir = path.join(LOCAL_STORAGE_ROOT, "private");
  ensureLocalDir(dir);
  return dir;
}

function localPublicDir(): string {
  const dir = path.join(LOCAL_STORAGE_ROOT, "public");
  ensureLocalDir(dir);
  return dir;
}

function getApiBaseUrl(): string {
  const configured = process.env.API_BASE_URL || "";
  if (configured) return configured.replace(/\/$/, "");
  const port = process.env.PORT || "8080";
  return `http://localhost:${port}`;
}

/* ─── Error types ───────────────────────────────────────────────────────── */
export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

/* ─── S3-compatible client (R2 + AWS S3) ───────────────────────────────── */
let s3Client: S3Client | null = null;
let s3BucketName = "";
let s3PublicBaseUrl = "";

function ensureS3Client(): { client: S3Client; bucket: string } {
  if (s3Client) return { client: s3Client, bucket: s3BucketName };
  if (BACKEND === "r2") {
    const accountId = process.env.R2_ACCOUNT_ID!;
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: false,
    });
    s3BucketName = process.env.R2_BUCKET!;
    s3PublicBaseUrl = process.env.R2_PUBLIC_BASE_URL || "";
  } else if (BACKEND === "s3") {
    s3Client = new S3Client({
      region: process.env.S3_REGION || "us-east-1",
      endpoint: process.env.S3_ENDPOINT,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: !!process.env.S3_FORCE_PATH_STYLE,
    });
    s3BucketName = process.env.S3_BUCKET!;
    s3PublicBaseUrl = process.env.S3_PUBLIC_BASE_URL || "";
  } else {
    throw new Error("S3 client requested but no S3/R2 env vars configured");
  }
  return { client: s3Client, bucket: s3BucketName };
}

/* ─── Stub export kept so old imports compile (no-op on non-local backends) */
export const objectStorageClient = {
  get bucket() {
    throw new Error("objectStorageClient.bucket is not supported with R2/S3/local backends");
  },
};

/* ─── Path helpers ──────────────────────────────────────────────────────── */
function parseObjectPath(p: string): { bucketName: string; objectName: string } {
  if (!p.startsWith("/")) p = `/${p}`;
  const parts = p.split("/");
  if (parts.length < 3) throw new Error("Invalid path: must contain at least a bucket name");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

/**
 * Storage paths come from request data and must be rejected when they are not
 * a single, normalized object key. Removing ".." is unsafe because it turns a
 * malicious path into a different, potentially valid object name.
 */
function validateStorageRelativePath(value: string, label: string): string {
  let candidate: string;
  try {
    candidate = decodeURIComponent(value.trim());
  } catch {
    throw new ObjectNotFoundError();
  }
  if (
    !candidate ||
    candidate.includes("\0") ||
    candidate.includes("\\") ||
    candidate.startsWith("/") ||
    candidate.endsWith("/") ||
    candidate.split("/").some((segment) => segment === "" || segment === "." || segment === "..")
  ) {
    throw new ObjectNotFoundError();
  }
  if (candidate.length > 512) throw new ObjectNotFoundError();
  if (!candidate.split("/").every((segment) => /^[A-Za-z0-9._-]+$/.test(segment))) {
    throw new ObjectNotFoundError();
  }
  return candidate;
}

function validatePrivateObjectKey(value: string): string {
  const candidate = validateStorageRelativePath(value, "private object path");
  const segments = candidate.split("/");
  const isDirectUpload = segments.length === 1 && /^[A-Za-z0-9_-]{8,128}$/.test(candidate);
  const isOrderAsset =
    segments.length === 4 &&
    segments[0] === "orders" &&
    /^[A-Za-z0-9_-]{1,100}$/.test(segments[1]) &&
    /^\d{1,9}$/.test(segments[2]) &&
    /^[A-Za-z0-9._-]{1,100}$/.test(segments[3]);
  if (!isDirectUpload && !isOrderAsset) throw new ObjectNotFoundError();
  return candidate;
}

function resolveLocalStoragePath(root: string, relativePath: string, label: string): string {
  const safePath = validateStorageRelativePath(relativePath, label);
  const resolvedRoot = path.resolve(root);
  const resolvedPath = path.resolve(resolvedRoot, safePath);
  if (resolvedPath !== resolvedRoot && !resolvedPath.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new ObjectNotFoundError();
  }
  return resolvedPath;
}

/* ─── Public API used by routes ─────────────────────────────────────────── */
export class ObjectStorageService {
  constructor() {}

  getBackendName(): Backend {
    return BACKEND;
  }

  getPublicObjectSearchPaths(): Array<string> {
    const pathsStr = process.env.PUBLIC_OBJECT_SEARCH_PATHS || "";
    return Array.from(
      new Set(pathsStr.split(",").map((p) => p.trim()).filter((p) => p.length > 0))
    );
  }

  getPrivateObjectDir(): string {
    const dir = process.env.PRIVATE_OBJECT_DIR || "";
    return dir || "uploads";
  }

  /* ── Generate an upload URL for the client to PUT a file to ── */
  async getObjectEntityUploadURL(): Promise<string> {
    const objectId = randomUUID();

    if (BACKEND === "r2" || BACKEND === "s3") {
      const { client, bucket } = ensureS3Client();
      const key = `uploads/${objectId}`;
      const cmd = new PutObjectCommand({ Bucket: bucket, Key: key });
      return getSignedUrl(client, cmd, { expiresIn: 900 });
    }

    // Local backend — return a direct-upload URL pointing at this API server
    return `${getApiBaseUrl()}/api/storage/upload-direct/${objectId}`;
  }

  /* ── Convert any storage URL / path into the canonical /objects/<id> path ── */
  normalizeObjectEntityPath(rawPath: string): string {
    const directUploadMatch = rawPath.match(/\/api\/storage\/upload-direct\/([^?#]+)/);
    if (directUploadMatch) return `/objects/${validatePrivateObjectKey(directUploadMatch[1])}`;

    if (BACKEND === "r2" || BACKEND === "s3") {
      let url: URL;
      try {
        url = new URL(rawPath);
      } catch {
        /* not a URL — fall through */
        url = null as unknown as URL;
      }
      if (url) {
        const parts = url.pathname.split("/").filter(Boolean);
        const idx = parts.indexOf("uploads");
        if (idx >= 0 && parts[idx + 1]) {
          return `/objects/${validatePrivateObjectKey(parts.slice(idx + 1).join("/"))}`;
        }
      }
      if (rawPath.startsWith("/objects/")) {
        return `/objects/${validatePrivateObjectKey(rawPath.slice("/objects/".length))}`;
      }
      return rawPath;
    }

    if (rawPath.startsWith("/objects/")) {
      return `/objects/${validatePrivateObjectKey(rawPath.slice("/objects/".length))}`;
    }
    return rawPath;
  }

  /* ── Stream a public object back to the client ── */
  async streamPublicObject(filePath: string, res: import("express").Response): Promise<void> {
    const safeFilePath = validateStorageRelativePath(filePath, "public path");
    if (BACKEND === "r2" || BACKEND === "s3") {
      const { client, bucket } = ensureS3Client();
      const key = `public/${safeFilePath}`;
      try {
        const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        await streamS3ObjectToResponse(out, res, true);
      } catch (err) {
        const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
        if (e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404) {
          res.status(404).json({ error: "File not found" });
          return;
        }
        throw err;
      }
      return;
    }

    // Local backend
    const fullPath = resolveLocalStoragePath(localPublicDir(), safeFilePath, "public path");
    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }
    await streamLocalFileToResponse(fullPath, res, true);
  }

  /* ── Stream a private uploaded object back to the client ── */
  async streamPrivateObject(objectPath: string, res: import("express").Response): Promise<void> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const entityId = validatePrivateObjectKey(objectPath.slice("/objects/".length));

    if (BACKEND === "r2" || BACKEND === "s3") {
      const { client, bucket } = ensureS3Client();
      const key = `uploads/${entityId}`;
      try {
        const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        await streamS3ObjectToResponse(out, res, false);
      } catch (err) {
        const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
        if (e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404) {
          throw new ObjectNotFoundError();
        }
        throw err;
      }
      return;
    }

    // Local backend
    const fullPath = resolveLocalStoragePath(localUploadsDir(), entityId, "object id");
    if (!fs.existsSync(fullPath)) throw new ObjectNotFoundError();
    await streamLocalFileToResponse(fullPath, res, false);
  }

  /* ── Fetch an object into memory as a buffer ── */
  async getObjectBuffer(objectPath: string): Promise<Buffer> {
    if (objectPath.startsWith("/public/")) {
      const filePath = validateStorageRelativePath(objectPath.slice("/public/".length), "public path");
      if (BACKEND === "r2" || BACKEND === "s3") {
        const { client, bucket } = ensureS3Client();
        const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: `public/${filePath}` }));
        if (!out.Body) throw new ObjectNotFoundError();
        const chunks: Buffer[] = [];
        for await (const chunk of out.Body as unknown as AsyncIterable<Buffer>) chunks.push(chunk);
        return Buffer.concat(chunks);
      }
      const fullPath = resolveLocalStoragePath(localPublicDir(), filePath, "public path");
      if (!fs.existsSync(fullPath)) throw new ObjectNotFoundError();
      return fs.promises.readFile(fullPath);
    }

    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const entityId = validatePrivateObjectKey(objectPath.slice("/objects/".length));

    if (BACKEND === "r2" || BACKEND === "s3") {
      const { client, bucket } = ensureS3Client();
      const key = `uploads/${entityId}`;
      try {
        const out = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        if (!out.Body) throw new ObjectNotFoundError();
        const chunks: Buffer[] = [];
        for await (const chunk of out.Body as unknown as AsyncIterable<Buffer>) {
          chunks.push(chunk);
        }
        return Buffer.concat(chunks);
      } catch (err) {
        const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
        if (e?.name === "NoSuchKey" || e?.$metadata?.httpStatusCode === 404) {
          throw new ObjectNotFoundError();
        }
        throw err;
      }
    }

    // Local backend
    const fullPath = resolveLocalStoragePath(localUploadsDir(), entityId, "object id");
    if (!fs.existsSync(fullPath)) throw new ObjectNotFoundError();
    return fs.promises.readFile(fullPath);
  }

  /* ── Issue a temporary download URL ── */
  async getObjectDownloadURL(objectPath: string, ttlSec = 900): Promise<string> {
    if (!objectPath.startsWith("/objects/")) throw new ObjectNotFoundError();
    const entityId = validatePrivateObjectKey(objectPath.slice("/objects/".length));

    if (BACKEND === "r2" || BACKEND === "s3") {
      const { client, bucket } = ensureS3Client();
      const key = `uploads/${entityId}`;
      const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
      return getSignedUrl(client, cmd, { expiresIn: ttlSec });
    }

    // Local backend — return a direct stream URL (no expiry needed, access-controlled by the route)
    return `${getApiBaseUrl()}/api/storage/objects/${entityId}`;
  }

  /* ── Save a local upload from a request body ── */
  async saveLocalUpload(objectId: string, body: import("stream").Readable): Promise<void> {
    if (BACKEND !== "local") throw new Error("saveLocalUpload only available on local backend");
    const safeId = objectId.replace(/[^a-zA-Z0-9-]/g, "");
    if (!safeId) throw new Error("Invalid objectId");
    const destPath = path.join(localUploadsDir(), safeId);
    const writeStream = fs.createWriteStream(destPath);
    await pipeline(body, writeStream);
  }

  /* ── Move an uploaded object into the per-order bucket prefix ── */
  async moveObjectToOrderPrefix(
    objectPath: string,
    orderNumber: string,
    itemIdx: number,
    filename: string,
  ): Promise<string> {
    // Caller treats a thrown error as "asset missing/failed to copy" and flags
    // the order via studio_assets_missing. Do NOT silently return the original
    // path on copy failure — that would hide the missing artwork from admins.
    if (!objectPath.startsWith("/objects/")) return objectPath;
    const entityId = objectPath.slice("/objects/".length);
    if (!entityId) throw new Error(`moveObjectToOrderPrefix: empty entityId for ${objectPath}`);
    const safeEntityId = validatePrivateObjectKey(entityId);
    const safeOrderNumber = validateStorageRelativePath(String(orderNumber), "order number");
    if (safeOrderNumber.includes("/")) throw new Error("moveObjectToOrderPrefix: invalid order number");
    if (!Number.isInteger(itemIdx) || itemIdx < 0 || itemIdx > 999_999_999) {
      throw new Error(`moveObjectToOrderPrefix: invalid item index ${itemIdx}`);
    }

    if (BACKEND === "r2" || BACKEND === "s3") {
      const { client, bucket } = ensureS3Client();
      const srcKey = `uploads/${safeEntityId}`;
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "original";
      const dstKey = `uploads/orders/${safeOrderNumber}/${itemIdx}/${safeFilename}`;
      await client.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${srcKey}`,
          Key: dstKey,
        })
      );
      try {
        await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: srcKey }));
      } catch { /* non-fatal — copy already succeeded */ }
      return `/objects/orders/${orderNumber}/${itemIdx}/${safeFilename}`;
    }

    // Local backend — rename file to include order info
    const srcPath = resolveLocalStoragePath(localUploadsDir(), safeEntityId, "object id");
    if (!fs.existsSync(srcPath)) {
      throw new Error(`moveObjectToOrderPrefix: source file missing at ${srcPath}`);
    }
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100) || "original";
    const orderDir = resolveLocalStoragePath(
      localUploadsDir(),
      `orders/${safeOrderNumber}/${itemIdx}`,
      "order asset directory",
    );
    ensureLocalDir(orderDir);
    const dstPath = path.join(orderDir, safeFilename);
    fs.renameSync(srcPath, dstPath);
    return `/objects/orders/${orderNumber}/${itemIdx}/${safeFilename}`;
  }

  /* ── Save a data-URL (base64) image to storage, return the object path ──
   * Used to persist the studio mockup thumbnail so the admin order panel can
   * display the customer's design composite without storing raw base64 in Postgres.
   */
  async saveMockupImage(dataUrl: string): Promise<string | null> {
    if (!dataUrl || !dataUrl.startsWith("data:")) return null;
    const match = dataUrl.match(/^data:image\/([a-z]+);base64,(.+)$/s);
    if (!match) return null;
    const [, rawExt, b64] = match;
    const safeExt = ["png", "jpg", "jpeg", "webp"].includes(rawExt) ? rawExt : "png";
    const buf = Buffer.from(b64, "base64");
    if (buf.length === 0 || buf.length > 8 * 1024 * 1024) return null; // skip empty / > 8 MB

    const { randomUUID: uuid } = await import("crypto");
    const entityId = `mockup-${uuid()}.${safeExt}`;

    if (BACKEND === "r2" || BACKEND === "s3") {
      const { client, bucket } = ensureS3Client();
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: `uploads/${entityId}`,
          Body: buf,
          ContentType: `image/${safeExt}`,
        })
      );
    } else {
      // Local backend — write directly to the private uploads dir
      const destPath = path.join(localUploadsDir(), entityId);
      fs.writeFileSync(destPath, buf);
    }

    return `/api/storage/objects/${entityId}`;
  }

  /* ── Legacy no-op stubs (kept for import compatibility) ── */
  async searchPublicObject(_filePath: string): Promise<null> {
    return null;
  }

  async getObjectEntityFile(_objectPath: string): Promise<never> {
    throw new Error("getObjectEntityFile is not available with R2/S3/local backends");
  }

  async trySetObjectEntityAclPolicy(rawPath: string, _aclPolicy: unknown): Promise<string> {
    return this.normalizeObjectEntityPath(rawPath);
  }

  async canAccessObjectEntity(_opts: unknown): Promise<boolean> {
    return true;
  }
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
async function streamS3ObjectToResponse(
  out: GetObjectCommandOutput,
  res: import("express").Response,
  isPublic: boolean,
): Promise<void> {
  res.setHeader("Content-Type", out.ContentType || "application/octet-stream");
  res.setHeader("Cache-Control", `${isPublic ? "public" : "private"}, max-age=3600`);
  if (out.ContentLength) res.setHeader("Content-Length", String(out.ContentLength));
  const body = out.Body as Readable | undefined;
  if (!body) { res.end(); return; }
  body.pipe(res);
}

async function streamLocalFileToResponse(
  filePath: string,
  res: import("express").Response,
  isPublic: boolean,
): Promise<void> {
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml",
    ".pdf": "application/pdf", ".zip": "application/zip",
  };
  res.setHeader("Content-Type", mimeMap[ext] || "application/octet-stream");
  res.setHeader("Cache-Control", `${isPublic ? "public" : "private"}, max-age=3600`);
  res.setHeader("Content-Length", String(stat.size));
  fs.createReadStream(filePath).pipe(res);
}

/* ─── Boot log ──────────────────────────────────────────────────────────── */
export function logActiveStorageBackend(log: { info: (obj: object, msg: string) => void }): void {
  const extra = BACKEND === "local"
    ? { storageRoot: LOCAL_STORAGE_ROOT, apiBase: getApiBaseUrl() }
    : {};
  log.info({ backend: BACKEND, ...extra }, `[storage] active backend: ${BACKEND}`);
}

void HeadObjectCommand;
