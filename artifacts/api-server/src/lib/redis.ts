/**
 * Upstash Redis cache with bounded multi-backend failover.
 *
 * PostgreSQL remains the source of truth. Redis is an optional, disposable
 * cache, so a provider outage must never block a catalog request or a write.
 * Configure the primary and optional secondary with:
 *
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *   UPSTASH_REDIS_REST_URL_SECONDARY
 *   UPSTASH_REDIS_REST_TOKEN_SECONDARY
 */

import { logger } from "./logger";

interface RedisClient {
  get: <T>(key: string) => Promise<T | null>;
  set: (key: string, value: unknown, opts: { ex: number }) => Promise<unknown>;
  del: (...keys: string[]) => Promise<unknown>;
}

type BackendName = "primary" | "secondary";

interface BackendState {
  name: BackendName;
  urlEnv: string;
  tokenEnv: string;
  client: RedisClient | null;
  initPromise: Promise<RedisClient | null> | null;
  retryAt: number;
  failures: number;
  lastLogAt: number;
}

const BACKENDS: BackendState[] = [
  {
    name: "primary",
    urlEnv: "UPSTASH_REDIS_REST_URL",
    tokenEnv: "UPSTASH_REDIS_REST_TOKEN",
    client: null,
    initPromise: null,
    retryAt: 0,
    failures: 0,
    lastLogAt: 0,
  },
  {
    name: "secondary",
    urlEnv: "UPSTASH_REDIS_REST_URL_SECONDARY",
    tokenEnv: "UPSTASH_REDIS_REST_TOKEN_SECONDARY",
    client: null,
    initPromise: null,
    retryAt: 0,
    failures: 0,
    lastLogAt: 0,
  },
];

const INIT_TIMEOUT_MS = 1_500;
const OP_TIMEOUT_MS = 1_200;
const FAILURE_RETRY_MS = 30_000;
const MAX_DEL_KEYS_PER_REQUEST = 100;
const PLACEHOLDER_RX = /xyz-1234|example|localhost|127\.0\.0\.1|placeholder/i;

function configured(state: BackendState): boolean {
  const url = (process.env[state.urlEnv] ?? "").trim();
  const token = (process.env[state.tokenEnv] ?? "").trim();
  return Boolean(url && token && !PLACEHOLDER_RX.test(url));
}

function config(state: BackendState): { url: string; token: string } | null {
  const url = (process.env[state.urlEnv] ?? "").trim();
  const token = (process.env[state.tokenEnv] ?? "").trim();
  if (!url || !token || PLACEHOLDER_RX.test(url)) return null;
  return { url, token };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function isAuthError(error: unknown): boolean {
  const message = errorText(error);
  return /WRONGPASS|NOAUTH|invalid or missing auth|unauthorized|401/i.test(message);
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`Redis timeout after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function markFailure(state: BackendState, error: unknown): void {
  state.client = null;
  state.failures += 1;
  state.retryAt = Date.now() + FAILURE_RETRY_MS;

  // Avoid turning a bad credential into a log storm while still re-probing
  // after secret rotation and process restarts.
  if (Date.now() - state.lastLogAt < FAILURE_RETRY_MS) return;
  state.lastLogAt = Date.now();
  const message = isAuthError(error)
    ? "credentials rejected"
    : errorText(error).slice(0, 180);
  logger.warn({ backend: state.name, failures: state.failures, detail: message }, "[redis] backend unavailable; using fallback/failover");
}

async function getBackend(state: BackendState): Promise<RedisClient | null> {
  if (!configured(state)) return null;
  if (state.client) return state.client;
  if (Date.now() < state.retryAt) return null;
  if (state.initPromise) return state.initPromise;

  state.initPromise = (async () => {
    const settings = config(state);
    if (!settings) return null;

    try {
      const { Redis } = await import("@upstash/redis");
      const client = new Redis(settings) as unknown as RedisClient;
      await withTimeout(client.set("_trynext_health", state.name, { ex: 10 }), INIT_TIMEOUT_MS);
      state.client = client;
      state.failures = 0;
      state.retryAt = 0;
      logger.info({ backend: state.name }, "[redis] Upstash backend connected");
      return client;
    } catch (error) {
      markFailure(state, error);
      return null;
    } finally {
      state.initPromise = null;
    }
  })();

  return state.initPromise;
}

async function callBackend<T>(
  state: BackendState,
  operation: (client: RedisClient) => Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false }> {
  const client = await getBackend(state);
  if (!client) return { ok: false };

  try {
    return { ok: true, value: await withTimeout(operation(client), OP_TIMEOUT_MS) };
  } catch (error) {
    markFailure(state, error);
    return { ok: false };
  }
}

interface FallbackEntry {
  value: unknown;
  expiresAt: number;
}

const fallback = new Map<string, FallbackEntry>();

function fallbackGet<T>(key: string): T | null {
  const entry = fallback.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    fallback.delete(key);
    return null;
  }
  return entry.value as T;
}

function fallbackSet(key: string, value: unknown, ttlSeconds: number): void {
  fallback.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

function fallbackDel(...keys: string[]): void {
  for (const key of keys) fallback.delete(key);
}

function configuredBackends(): BackendState[] {
  return BACKENDS.filter(configured);
}

/**
 * Reads primary first, then secondary. A miss on one backend is allowed to
 * continue to the other because writes may have succeeded on only one side.
 */
export async function redisCacheGet<T>(key: string): Promise<T | null> {
  for (const state of configuredBackends()) {
    const result = await callBackend(state, (client) => client.get<T>(key));
    if (result.ok && result.value !== null) return result.value;
  }
  return fallbackGet<T>(key);
}

/**
 * Keep the local copy for outage recovery, then replicate to every backend.
 * A secondary failure never makes a successful primary write look failed.
 */
export async function redisCacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  fallbackSet(key, value, ttlSeconds);
  const states = configuredBackends();
  if (states.length === 0) return;

  await Promise.all(states.map((state) =>
    callBackend(state, (client) => client.set(key, value, { ex: ttlSeconds })),
  ));
}

/**
 * Delete in bounded batches so accidental broad invalidations cannot create a
 * single oversized REST request. Normal invalidation should use a version key.
 */
export async function redisCacheDel(...keys: string[]): Promise<void> {
  fallbackDel(...keys);
  const states = configuredBackends();
  if (states.length === 0 || keys.length === 0) return;

  await Promise.all(states.map(async (state) => {
    for (let i = 0; i < keys.length; i += MAX_DEL_KEYS_PER_REQUEST) {
      const batch = keys.slice(i, i + MAX_DEL_KEYS_PER_REQUEST);
      await callBackend(state, (client) => client.del(...batch));
    }
  }));
}

/**
 * Flushes the process-local copy. Upstash REST does not expose FLUSHALL.
 */
export async function redisCacheFlushAll(): Promise<{ cleared: number; backend: "upstash" | "in-process" }> {
  const cleared = fallback.size;
  fallback.clear();
  return { cleared, backend: configuredBackends().some((state) => state.client) ? "upstash" : "in-process" };
}

export type RedisStatusMode = "ok" | "error" | "not_configured" | "connecting";

/**
 * Reports the real provider status, never the local fallback status.
 */
export async function getRedisStatus(): Promise<{ mode: RedisStatusMode; detail?: string }> {
  const states = configuredBackends();
  if (states.length === 0) return { mode: "not_configured" };

  const results = await Promise.all(states.map(async (state) => {
    const result = await callBackend(state, (client) =>
      client.set("_healthz_ping", state.name, { ex: 10 }),
    );
    return { state, ok: result.ok };
  }));

  const healthy = results.filter((result) => result.ok).map((result) => result.state.name);
  if (healthy.length > 0) return { mode: "ok", detail: `healthy:${healthy.join(",")}` };
  return { mode: "error", detail: "All configured Upstash backends unavailable" };
}