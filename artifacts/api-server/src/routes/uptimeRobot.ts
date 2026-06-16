import { Router } from "express";
import { logger } from "../lib/logger";
import { tgSend } from "../lib/telegram";
import { getWebhookSecret } from "../lib/telegram";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * UptimeRobot webhook endpoint.
 *
 * UptimeRobot sends a POST with application/x-www-form-urlencoded body.
 * Key fields:
 *   monitorFriendlyName — e.g. "TryNex API" / "TryNex Storefront"
 *   monitorURL          — the URL being monitored
 *   alertType           — "1" = DOWN, "2" = UP
 *   alertDetails        — human-readable reason
 *   alertDuration       — seconds the monitor was down (on recovery)
 *
 * Security: a secret derived from the Telegram bot token is embedded in the URL.
 * No extra env var needed — same derivation as the Telegram webhook secret.
 *
 * Setup in UptimeRobot:
 *   My Settings → Alert Contacts → Add Alert Contact → Webhook
 *   URL: https://your-api.replit.app/api/uptimerobot/webhook/<SECRET>
 *   POST value: (leave default or empty)
 *   "Send as JSON" = OFF  (UptimeRobot sends form-encoded by default)
 *
 * Get your secret by calling:
 *   GET /api/admin/uptimerobot/webhook-url   (admin token required)
 */

function urSecret(): string {
  // Prefix different from Telegram webhook so secrets don't overlap
  const base = getWebhookSecret();
  return base.slice(0, 32);
}

// ── Public webhook (called by UptimeRobot) ────────────────────────────────────
router.post("/uptimerobot/webhook/:secret", async (req, res) => {
  if (req.params.secret !== urSecret()) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  // Always ACK immediately so UptimeRobot doesn't retry
  res.json({ ok: true });

  try {
    const body = req.body as Record<string, string>;

    const name    = body.monitorFriendlyName || body.monitorURL || "Monitor";
    const url     = body.monitorURL || "";
    const type    = String(body.alertType || "");
    const details = body.alertDetails || "";
    const dur     = body.alertDuration ? parseInt(body.alertDuration, 10) : null;

    const isDown = type === "1";
    const isUp   = type === "2";

    let message = "";

    if (isDown) {
      message = [
        `🔴 <b>SITE DOWN!</b>`,
        ``,
        `📡 <b>${name}</b>`,
        url ? `🔗 ${url}` : "",
        details ? `⚠️ Reason: ${details}` : "",
        ``,
        `⏰ ${new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" })}`,
        ``,
        `💡 Check your deployment dashboard for more details.`,
      ].filter(Boolean).join("\n");
    } else if (isUp) {
      const downFor = dur != null
        ? dur >= 3600
          ? `${Math.floor(dur / 3600)}h ${Math.floor((dur % 3600) / 60)}m`
          : dur >= 60
            ? `${Math.floor(dur / 60)}m ${dur % 60}s`
            : `${dur}s`
        : "unknown";

      message = [
        `🟢 <b>SITE BACK ONLINE!</b>`,
        ``,
        `📡 <b>${name}</b>`,
        url ? `🔗 ${url}` : "",
        `⏱️ Was down for: ${downFor}`,
        ``,
        `⏰ ${new Date().toLocaleString("en-BD", { timeZone: "Asia/Dhaka" })}`,
      ].filter(Boolean).join("\n");
    } else {
      message = [
        `📊 <b>UptimeRobot Alert</b>`,
        `📡 ${name}`,
        url ? `🔗 ${url}` : "",
        `ℹ️ Type: ${type}`,
        details ? `Details: ${details}` : "",
      ].filter(Boolean).join("\n");
    }

    if (message) {
      await tgSend(message);
      logger.info({ name, type, details }, "[uptimerobot] Alert forwarded to Telegram");
    }
  } catch (err) {
    logger.error({ err }, "[uptimerobot] Failed to process alert");
  }
});

// ── Admin: get webhook URL to paste into UptimeRobot ─────────────────────────
router.get("/admin/uptimerobot/webhook-url", async (req, res) => {
  // Light auth: just check the admin token header (same check as requireAdmin)
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_PASSWORD;
  if (!adminPassword || token !== adminPassword) {
    const [row] = await db.select({ value: settingsTable.value })
      .from(settingsTable).where(eq(settingsTable.key, "admin_token")).catch(() => []);
    if (!row?.value || token !== row.value) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }
  }

  const publicUrl = (
    process.env.API_PUBLIC_URL ||
    process.env.API_BASE_URL ||
    ""
  ).replace(/\/$/, "");
  const secret = urSecret();
  const webhookUrl = `${publicUrl}/api/uptimerobot/webhook/${secret}`;

  res.json({
    webhookUrl,
    instructions: [
      "1. Go to UptimeRobot → My Settings → Alert Contacts",
      "2. Click 'Add Alert Contact'",
      "3. Type: Webhook",
      "4. Friendly Name: TryNex Telegram",
      `5. URL: ${webhookUrl}`,
      "6. Send as JSON: OFF",
      "7. Save, then assign this contact to your monitors",
      "8. Test with 'Send Test Alert' — you'll get a Telegram message!",
    ].join("\n"),
  });
});

export default router;
