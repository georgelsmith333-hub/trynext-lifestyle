/**
 * Upstash Redis client with graceful in-process fallback.
 *
 * If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are both set, all
 * cache ops go through the Upstash Redis REST API — which survives Render
 * restarts and is shared across any future horizontal instances.
 *
 * If either env var is missing, or credentials are invalid, the module falls
 * back to a plain in-process Map so the server still works without Redis.
 *
 * Usage:
 *   import { redisCacheGet, redisCacheSet, redisCacheDel } from "./redis";
 *
 *   const cached = await redisCacheGet<MyType>("my-key");
 *   if (!cached) {
 *     const data = await expensiveQuery();
 *     await redisCacheSet("my-key", data, 60);   // TTL in seconds
 *   }
 *   await redisCacheDel("my-key");               // on write/invalidation
 */

import { logger } from "./logger";

// ── Types ──────────────────────────────────────────────────────────────────

interface RedisClient {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, opts: { ex: number }) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
}

// ── Client initialisation (singleton promise — prevents race at startup) ───

// null  = not yet attempted
// false = permanently disabled (bad config or connection failed — stop retrying)
// RedisClient = connected and verified
let _redis: RedisClient | null | false = null;

// Singleton in-flight promise — all concurrent callers await the same attempt.
let _initPromise: Promise<RedisClient | null> | null = null;

/** Known placeholder / example URLs that must not be dialled. */
const PLACEHOLDER_RX = /xyz-1234|example|localhost|127\.0\.0\.1|placeholder/i;

async function _initClient(): Promise<RedisClient | null> {
  if (_redis === false) return null;
  if (_redis) return _redis;

  const url   = (process.env.UPSTASH_REDIS_REST_URL  ?? "").trim();
  const token = (process.env.UPSTASH_REDIS_REST_TOKEN ?? "").trim();

  if (!url || !token) {
    _redis = false;
    logger.info("[redis] UPSTASH_REDIS_REST_URL/TOKEN not set — using in-process cache");
    return null;
  }

  if (PLACEHOLDER_RX.test(url)) {
    _redis = false;
    logger.warn(`[redis] UPSTASH_REDIS_REST_URL looks like a placeholder ("${url}") — using in-process cache. Set the real URL from console.upstash.com.`);
    return null;
  }

  try {
    const { Redis } = await import("@upstash/redis");
    const client = new Redis({ url, token });

    // Verify connectivity once — a live SET proves the credentials work.
    await client.set("_trynex_health", "1", { ex: 10 });
    logger.info("[redis] Upstash Redis connected — distributed cache active (MISS→HIT enabled)");

    _redis = client as unknown as RedisClient;
    return _redis;
  } catch (err: unknown) {
    _redis = false;
    const isAuthError = err instanceof Error && (
      err.message.includes("WRONGPASS") ||
      err.message.includes("NOAUTH") ||
      err.message.includes("invalid or missing auth")
    );
    if (isAuthError) {
      logger.warn(
        "[redis] Upstash credentials rejected (WRONGPASS) — regenerate the token at console.upstash.com and update UPSTASH_REDIS_REST_TOKEN. Falling back to in-process cache."
      );
    } else {
      logger.warn({ err }, "[redis] Failed to connect to Upstash Redis — falling back to in-process cache");
    }
    return null;
  }
}

async function getClient(): Promise<RedisClient | null> {
  if (_redis === false) return null;
  if (_redis) return _redis;

  // Only one connection attempt at a time — all concurrent callers share it.
  if (!_initPromise) {
    _initPromise = _initClient().finally(() => { _initPromise = null; });
  }
  return _initPromise;
}

// ── In-process fallback ────────────────────────────────────────────────────

interface FallbackEntry { value: unknown; expiresAt: number }
const _fallback = new Map<string, FallbackEntry>();

function fallbackGet<T>(key: string): T | null {
  const entry = _fallback.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _fallback.delete(key); return null; }
  return entry.value as T;
}

function fallbackSet(key: string, value: unknown, ttlSeconds: number): void {
  _fallback.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function fallbackDel(...keys: string[]): void {
  for (const k of keys) _fallback.delete(k);
}

// ── Public helpers ─────────────────────────────────────────────────────────

export async function redisCacheGet<T>(key: string): Promise<T | null> {
  try {
    const client = await getClient();
    if (client) return await client.get<T>(key);
    return fallbackGet<T>(key);
  } catch (err) {
    logger.warn({ err, key }, "[redis] GET failed — using fallback");
    return fallbackGet<T>(key);
  }
}

export async function redisCacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const client = await getClient();
    if (client) {
      await client.set(key, value, { ex: ttlSeconds });
      return;
    }
  } catch (err) {
    logger.warn({ err, key }, "[redis] SET failed — using fallback");
  }
  fallbackSet(key, value, ttlSeconds);
}

export async function redisCacheDel(...keys: string[]): Promise<void> {
  try {
    const client = await getClient();
    if (client) {
      await client.del(...keys);
      return;
    }
  } catch (err) {
    logger.warn({ err, keys }, "[redis] DEL failed — using fallback");
  }
  fallbackDel(...keys);
}
