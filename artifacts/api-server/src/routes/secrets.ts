import { Router, type IRouter } from "express";
import { requireAdmin } from "../middlewares/adminAuth";
import { logger } from "../lib/logger";
import { z } from "zod";
import { db, adminTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { verifyTotp } from "../lib/totp";

const router: IRouter = Router();

// NOTE: This router is intentionally READ-ONLY. Updating secrets at runtime via
// the API creates a split-brain where the running process differs from the cloud
// provider's configured environment, and it exposes a dangerous attack surface.
// Secrets must be changed through the hosting platform (Replit/Render/CF Pages)
// and then the service must be restarted.

// ── SENSITIVE KEY PATTERNS — values are masked in API responses ──
const SENSITIVE_PATTERNS = [
  /password/i, /secret/i, /token/i, /key/i, /api_key/i, /apikey/i,
  /private/i, /credential/i, /auth/i, /salt/i, /jwt/i, /session/i,
  /cookie/i, /seed/i, /mnemonic/i, /hash/i, /salt/i, /pin/i, /otp/i,
  /totp/i, /passphrase/i, /bearer/i, /access_token/i, /refresh_token/i,
  /client_secret/i, /signing/i, /encryption/i, /decrypt/i, /sign/i,
  /github_token/i, /render_api/i, /cfut_/i, /r2_secret/i, /database_url/i,
  /redis_url/i, /upstash_redis/i, /telegram_bot_token/i,
];

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some(p => p.test(key));
}

function maskValue(value: string, key: string): string {
  if (!isSensitiveKey(key)) return value;
  if (value.length <= 8) return "*".repeat(value.length);
  return value.slice(0, 3) + "*".repeat(Math.max(4, value.length - 6)) + value.slice(-3);
}

// ── GET /api/admin/secrets — list all environment variables ──
router.get("/admin/secrets", requireAdmin, (_req, res) => {
  try {
    const envVars: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value === undefined) continue;
      envVars[key] = maskValue(value, key);
    }
    res.json({
      ok: true,
      secrets: envVars,
      count: Object.keys(envVars).length,
      sensitiveCount: Object.keys(envVars).filter(k => isSensitiveKey(k)).length,
    });
  } catch (err) {
    logger.error({ err }, "Failed to list secrets");
    res.status(500).json({ ok: false, error: "Failed to list secrets" });
  }
});

// ── GET /api/admin/secrets/raw — get actual unmasked values (admin only) ──
// Requires an additional TOTP re-verification step before exposing raw secrets.
router.get("/admin/secrets/raw", requireAdmin, async (req, res) => {
  try {
    const totpCode = req.headers["x-admin-totp-code"];
    if (!totpCode || typeof totpCode !== "string" || !/^\d{6}$/.test(totpCode)) {
      res.status(403).json({ ok: false, error: "totp_required", message: "TOTP code required in X-Admin-TOTP-Code header" });
      return;
    }
    const session = (req as any).adminSession;
    if (!session?.adminId) {
      res.status(403).json({ ok: false, error: "session_error", message: "Admin session lacks identity" });
      return;
    }
    const [admin] = await db.select().from(adminTable).where(eq(adminTable.id, session.adminId)).limit(1);
    if (!admin || !admin.totpEnabled || !admin.totpSecret) {
      res.status(403).json({ ok: false, error: "totp_not_configured", message: "2FA is not enabled for this admin" });
      return;
    }
    if (!verifyTotp(totpCode, admin.totpSecret)) {
      res.status(403).json({ ok: false, error: "invalid_totp", message: "Invalid TOTP code" });
      return;
    }
    const envVars: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value === undefined) continue;
      envVars[key] = value;
    }
    res.json({
      ok: true,
      secrets: envVars,
      count: Object.keys(envVars).length,
    });
  } catch (err) {
    logger.error({ err }, "Failed to list raw secrets");
    res.status(500).json({ ok: false, error: "Failed to list raw secrets" });
  }
});

// ── Runtime secret updates are intentionally DISABLED ──
// See the note at the top of this file. If an admin needs to change a secret,
// they must update the environment variable through the hosting platform and
// restart the service. Do not re-enable these routes without a security review.
router.post("/admin/secrets/update", requireAdmin, (_req, res) => {
  res.status(403).json({
    ok: false,
    error: "disabled",
    message: "Runtime secret updates are disabled. Update the environment variable through your hosting platform and restart the service.",
  });
});

router.post("/admin/secrets/bulk-update", requireAdmin, (_req, res) => {
  res.status(403).json({
    ok: false,
    error: "disabled",
    message: "Runtime secret updates are disabled. Update the environment variable through your hosting platform and restart the service.",
  });
});

export default router;
