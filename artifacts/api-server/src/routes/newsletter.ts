import { Router, type IRouter } from "express";
import { db, newsletterSubscribersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";
import { logger } from "../lib/logger";
import { tgSend } from "../lib/telegram";

const router: IRouter = Router();

/* ── IP-based rate limiting for subscribe endpoint ──────────────────────────
 * Prevents spamming: max 3 subscriptions per unique IP per 24 hours.
 * Uses in-memory bucket (restarts on server reboot; good enough for abuse prevention).
 * ─────────────────────────────────────────────────────────────────────────── */
const ipBuckets = new Map<string, { count: number; resetAt: number }>();
function checkIpRateLimit(ip: string, maxPerDay = 3): boolean {
  const now = Date.now();
  const window = 24 * 60 * 60 * 1000; // 24 hours
  const bucket = ipBuckets.get(ip);
  if (!bucket || now > bucket.resetAt) {
    ipBuckets.set(ip, { count: 1, resetAt: now + window });
    return true;
  }
  if (bucket.count >= maxPerDay) return false; // do NOT increment — count is already at limit
  bucket.count++;
  return true;
}

router.post("/newsletter/subscribe", async (req, res) => {
  try {
    const { email, source = "footer" } = req.body as { email?: string; source?: string };
    if (!email || typeof email !== "string" || !email.includes("@")) {
      res.status(400).json({ error: "invalid_email", message: "Please provide a valid email address." });
      return;
    }
    const clean = email.trim().toLowerCase().slice(0, 254);
    const rawIp = (req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.ip || "").trim();
    const ip = rawIp.slice(0, 64) || null;

    // IP rate limit check — block excessive signups from same IP (3/24h)
    if (ip && !checkIpRateLimit(ip)) {
      res.status(429).json({
        error: "rate_limited",
        message: "Too many subscription attempts from your network. Please try again tomorrow.",
      });
      return;
    }

    const existing = await db
      .select({ id: newsletterSubscribersTable.id })
      .from(newsletterSubscribersTable)
      .where(eq(newsletterSubscribersTable.email, clean))
      .limit(1);

    if (existing.length > 0) {
      res.json({ ok: true, message: "You're already subscribed — welcome back!" });
      return;
    }

    await db.insert(newsletterSubscribersTable).values({
      email: clean,
      source: (source || "footer").slice(0, 64),
      ip,
    });

    res.json({ ok: true, message: "Subscribed! Watch your inbox for exclusive deals." });

    const [countRow] = await db.select({ count: sql<number>`count(*)::int` }).from(newsletterSubscribersTable).catch(() => [{ count: 0 }]);
    tgSend(
      `📧 <b>New Newsletter Subscriber</b>\n\n📩 ${clean}\n📍 Source: ${source || "footer"}\n👥 Total Subscribers: ${countRow?.count ?? "?"}`
    ).catch(() => {});
  } catch (err) {
    req.log.error({ err }, "[newsletter] subscribe error");
    res.status(500).json({ error: "internal", message: "Failed to subscribe. Please try again." });
  }
});

/* ── POST /api/contact — public contact form ─────────────────────────────
 * Accepts name, email, phone, subject, message and sends a Telegram
 * notification to the admin. Also subscribes the email to newsletter.
 * ─────────────────────────────────────────────────────────────────────────── */
const contactRateMap = new Map<string, number>();
router.post("/contact", async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body as {
      name?: string; email?: string; phone?: string; subject?: string; message?: string;
    };
    if (!name?.trim() || !message?.trim()) {
      res.status(400).json({ error: "validation_error", message: "Name and message are required." });
      return;
    }
    const rawIp = (req.headers["x-forwarded-for"]?.toString().split(",")[0] || req.ip || "").trim();
    const now = Date.now();
    const last = contactRateMap.get(rawIp) || 0;
    if (now - last < 60_000) {
      res.status(429).json({ error: "rate_limited", message: "Please wait a minute before sending another message." });
      return;
    }
    contactRateMap.set(rawIp, now);

    // Subscribe email to newsletter if valid
    if (email && email.includes("@")) {
      const clean = email.trim().toLowerCase().slice(0, 254);
      db.insert(newsletterSubscribersTable).values({ email: clean, source: "contact_form", ip: rawIp.slice(0, 64) || null })
        .onConflictDoNothing().catch(() => {});
    }

    // Send Telegram notification to admin
    const lines = [
      `📬 <b>New Contact Form Submission</b>`,
      ``,
      `👤 <b>Name:</b> ${(name || "").trim()}`,
      email ? `📧 <b>Email:</b> ${email.trim()}` : null,
      phone ? `📞 <b>Phone:</b> ${phone.trim()}` : null,
      subject ? `📌 <b>Subject:</b> ${subject.trim()}` : null,
      ``,
      `💬 <b>Message:</b>`,
      (message || "").trim().slice(0, 800),
    ].filter(l => l !== null).join("\n");
    tgSend(lines).catch(() => {});

    res.json({ ok: true, message: "Your message has been sent! We'll get back to you within 24 hours." });
  } catch (err) {
    req.log.error({ err }, "[contact] submit error");
    res.status(500).json({ error: "internal", message: "Failed to send message. Please try WhatsApp instead." });
  }
});

/* ── GET /api/newsletter/subscribers — admin only ──────────────────────────
 * Returns all subscribers with a `duplicateIp` flag for subscribers whose IP
 * address matches multiple other subscribers (possible bot/spam accounts).
 * ─────────────────────────────────────────────────────────────────────────── */
router.get("/newsletter/subscribers", requireAdmin, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(newsletterSubscribersTable)
      .orderBy(sql`${newsletterSubscribersTable.createdAt} DESC`)
      .limit(2000);

    // Build IP → count map to flag duplicate IPs
    const ipCount: Record<string, number> = {};
    for (const r of rows) {
      if (r.ip) ipCount[r.ip] = (ipCount[r.ip] ?? 0) + 1;
    }

    const enriched = rows.map(r => ({
      ...r,
      duplicateIp: r.ip != null && (ipCount[r.ip] ?? 0) > 1,
      ipCount: r.ip ? (ipCount[r.ip] ?? 1) : null,
    }));

    const duplicateCount = enriched.filter(r => r.duplicateIp).length;

    res.json({ subscribers: enriched, total: rows.length, duplicateCount });
  } catch (err) {
    logger.error({ err }, "[newsletter] list error");
    res.status(500).json({ error: "internal" });
  }
});

/* ── DELETE /api/newsletter/subscribers/:id — admin only ─────────────────── */
router.delete("/newsletter/subscribers/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "invalid_id", message: "Invalid subscriber id" });
      return;
    }
    await db.delete(newsletterSubscribersTable).where(eq(newsletterSubscribersTable.id, id));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "[newsletter] delete subscriber error");
    res.status(500).json({ error: "internal", message: "Failed to delete subscriber" });
  }
});

/* ── DELETE /api/newsletter/subscribers/ip/:ip — admin: bulk-delete by IP ── */
router.delete("/newsletter/subscribers/ip/:ip", requireAdmin, async (req, res) => {
  try {
    const rawIpParam = Array.isArray(req.params.ip) ? req.params.ip[0] : req.params.ip;
    const ipParam = decodeURIComponent(rawIpParam ?? "").slice(0, 64);
    if (!ipParam) {
      res.status(400).json({ error: "invalid_ip", message: "IP address is required" });
      return;
    }
    await db
      .delete(newsletterSubscribersTable)
      .where(eq(newsletterSubscribersTable.ip, ipParam));
    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "[newsletter] bulk-delete by IP error");
    res.status(500).json({ error: "internal", message: "Failed to delete subscribers" });
  }
});

export default router;
