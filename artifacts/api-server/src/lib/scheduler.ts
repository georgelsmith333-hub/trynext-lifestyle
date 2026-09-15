import { db, ordersTable, productsTable } from "@workspace/db";
import { eq, and, desc, gte, sql, lte } from "drizzle-orm";
import { logger } from "./logger";
import { tgSend, tgIsConfigured } from "./telegram";
import { runBackupSync, type TargetSyncResult } from "./dbBackupSync";

const BST_OFFSET_MS = 6 * 60 * 60 * 1000;

function nowBST(): Date {
  return new Date(Date.now() + BST_OFFSET_MS);
}

function todayKeyBST(): string {
  const d = nowBST();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function startOfDayUTC(): Date {
  const bst = nowBST();
  const startBST = new Date(Date.UTC(bst.getUTCFullYear(), bst.getUTCMonth(), bst.getUTCDate()));
  return new Date(startBST.getTime() - BST_OFFSET_MS);
}

// ── Daily Summary ────────────────────────────────────────────────────────────
let lastDailySummaryDate = "";

async function sendDailySummary(): Promise<void> {
  if (!tgIsConfigured()) return;
  const today = todayKeyBST();
  if (lastDailySummaryDate === today) return;
  lastDailySummaryDate = today;

  try {
    const dayStart = startOfDayUTC();

    const [[todayRow], [totalRow], [pendingRow], lowStockItems] = await Promise.all([
      db.select({
        count: sql<number>`count(*)::int`,
        revenue: sql<number>`COALESCE(sum(total::numeric), 0)::float`,
      }).from(ordersTable).where(gte(ordersTable.createdAt, dayStart)),

      db.select({
        count: sql<number>`count(*)::int`,
        revenue: sql<number>`COALESCE(sum(total::numeric), 0)::float`,
      }).from(ordersTable),

      db.select({ count: sql<number>`count(*)::int` })
        .from(ordersTable).where(eq(ordersTable.status, "pending")),

      db.select({ name: productsTable.name, stock: productsTable.stock })
        .from(productsTable).where(lte(productsTable.stock, 5)).limit(8),
    ]);

    const dateStr = new Date().toLocaleDateString("en-BD", {
      timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric",
    });

    const lines = [
      `📊 <b>Trynext Daily Summary</b>`,
      `📅 ${dateStr}`,
      ``,
      `🛍️ <b>Today's Orders:</b> ${todayRow.count}`,
      `💰 <b>Today's Revenue:</b> ৳${Math.round(todayRow.revenue).toLocaleString()}`,
      `⏳ <b>Pending Orders:</b> ${pendingRow.count}`,
      `📦 <b>All-Time Orders:</b> ${totalRow.count}`,
      `💵 <b>All-Time Revenue:</b> ৳${Math.round(totalRow.revenue).toLocaleString()}`,
    ];

    if (lowStockItems.length > 0) {
      lines.push(``, `⚠️ <b>Low Stock Alert:</b>`);
      for (const p of lowStockItems) {
        const dot = (p.stock ?? 0) <= 1 ? "🔴" : (p.stock ?? 0) <= 3 ? "🟠" : "🟡";
        lines.push(`  ${dot} ${p.name}: ${p.stock} left`);
      }
    }

    lines.push(``, `🌐 trynext.pages.dev`);
    await tgSend(lines.join("\n"));
    logger.info("[scheduler] Daily summary sent");
  } catch (err) {
    logger.warn({ err }, "[scheduler] Daily summary failed");
  }
}

// ── Low Stock Check ──────────────────────────────────────────────────────────
let lastLowStockKey = "";

async function checkAndAlertLowStock(): Promise<void> {
  if (!tgIsConfigured()) return;
  const bst = nowBST();
  const key = `${todayKeyBST()}-${bst.getUTCHours() < 14 ? "am" : "pm"}`;
  if (lastLowStockKey === key) return;
  lastLowStockKey = key;

  try {
    const items = await db.select({ name: productsTable.name, stock: productsTable.stock })
      .from(productsTable).where(lte(productsTable.stock, 3));

    if (items.length === 0) return;

    const list = items.map(p => {
      const dot = (p.stock ?? 0) === 0 ? "🔴 OUT" : (p.stock ?? 0) <= 1 ? "🔴" : "🟠";
      return `${dot} ${p.name}: ${p.stock} left`;
    }).join("\n");

    await tgSend(`🚨 <b>Low Stock Alert</b>\n\n${list}\n\n👉 Admin → Products to restock`);
    logger.info({ count: items.length }, "[scheduler] Low stock alert sent");
  } catch (err) {
    logger.warn({ err }, "[scheduler] Low stock check failed");
  }
}

// ── Pending Order Re-engagement ──────────────────────────────────────────────
let lastPendingKey = "";

async function checkStalePendingOrders(): Promise<void> {
  if (!tgIsConfigured()) return;
  const bst = nowBST();
  const key = `${todayKeyBST()}-${Math.floor(bst.getUTCHours() / 2)}`;
  if (lastPendingKey === key) return;
  lastPendingKey = key;

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const stale = await db.select({
      orderNumber: ordersTable.orderNumber,
      customerName: ordersTable.customerName,
      customerPhone: ordersTable.customerPhone,
      total: ordersTable.total,
      createdAt: ordersTable.createdAt,
    })
      .from(ordersTable)
      .where(and(eq(ordersTable.status, "pending"), lte(ordersTable.createdAt, cutoff)))
      .orderBy(desc(ordersTable.createdAt))
      .limit(5);

    if (stale.length === 0) return;

    const lines = [`⏰ <b>Stale Pending Orders (>24h old)</b>\n`];
    for (const o of stale) {
      const hrs = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 3_600_000);
      lines.push(`• #${o.orderNumber} — ${o.customerName} — ৳${o.total} — ${hrs}h ago`);
      lines.push(`  📞 ${o.customerPhone}`);
    }
    lines.push(`\n💡 Call customers or update status in Admin Panel`);

    await tgSend(lines.join("\n"));
    logger.info({ count: stale.length }, "[scheduler] Pending re-engagement alert sent");
  } catch (err) {
    logger.warn({ err }, "[scheduler] Pending order check failed");
  }
}

// ── Revenue Milestones ───────────────────────────────────────────────────────
const MILESTONES = [10_000, 25_000, 50_000, 100_000, 200_000, 500_000, 1_000_000];
const firedMilestones = new Set<number>();
let milestoneDateKey = "";

export async function checkRevenueMilestone(): Promise<void> {
  if (!tgIsConfigured()) return;
  const today = todayKeyBST();
  if (milestoneDateKey !== today) {
    firedMilestones.clear();
    milestoneDateKey = today;
  }

  try {
    const [row] = await db.select({
      revenue: sql<number>`COALESCE(sum(total::numeric), 0)::float`,
    }).from(ordersTable).where(gte(ordersTable.createdAt, startOfDayUTC()));

    const total = row?.revenue ?? 0;

    for (const milestone of MILESTONES) {
      if (!firedMilestones.has(milestone) && total >= milestone) {
        firedMilestones.add(milestone);
        await tgSend(
          `🎉 <b>Revenue Milestone!</b>\n\nToday's revenue just crossed <b>৳${milestone.toLocaleString()}</b>!\n\n💰 Current: ৳${Math.round(total).toLocaleString()}\n\n🚀 Keep it up, Trynext!`
        );
        logger.info({ milestone, total }, "[scheduler] Revenue milestone fired");
      }
    }
  } catch (err) {
    logger.warn({ err }, "[scheduler] Revenue milestone check failed");
  }
}

// ── Keep-Alive Ping ──────────────────────────────────────────────────────────
// Self-ping the healthz endpoint every 14 minutes to prevent cold starts
// on services that sleep after inactivity (e.g. free-tier hosting).
// Set API_PUBLIC_URL in your environment to enable this feature.
let lastPingMs = 0;
const PING_INTERVAL_MS = 14 * 60 * 1000;

async function keepAlive(): Promise<void> {
  const now = Date.now();
  if (now - lastPingMs < PING_INTERVAL_MS) return;
  lastPingMs = now;

  // Prefer self-ping via localhost (always works regardless of external URL).
  // Fall back to configured external URL if localhost ping fails.
  const port = process.env.PORT || "5001";
  const localUrl = `http://localhost:${port}/api/healthz`;

  try {
    const res = await fetch(localUrl, { signal: AbortSignal.timeout(8_000) });
    logger.info({ status: res.status }, "[scheduler] Keep-alive ping sent");
  } catch (err) {
    logger.warn({ err }, "[scheduler] Keep-alive ping failed (non-critical)");
  }
}

// ── Backup / Failover Sync ───────────────────────────────────────────────────
// The legacy full mirror is disabled unless explicitly enabled. It must never
// run on every Render environment: one source row copied to four targets can
// multiply Render egress enough to exhaust a Hobby workspace on its own.
//
// Circuit breaker: after BACKUP_CIRCUIT_OPEN_AFTER consecutive full failures,
// the scheduler pauses for BACKUP_CIRCUIT_COOLDOWN_MS before retrying.
// This prevents repeated hammering of the DB when quota is exceeded.
let lastBackupSyncMs = 0;
const BACKUP_SYNC_INTERVAL_MS = 30 * 60 * 1000;
let backupConsecutiveFailures = 0;
const BACKUP_CIRCUIT_OPEN_AFTER = 3;         // pause after 3 all-failed runs
const BACKUP_CIRCUIT_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2-hour cooldown
let backupCircuitOpenSince = 0;

export interface BackupSyncStatus {
  lastRunMs: number;
  consecutiveFailures: number;
  circuitOpen: boolean;
  circuitOpenSince: number;
  lastResults: TargetSyncResult[];
}

let lastBackupResults: TargetSyncResult[] = [];

/**
 * Store the latest per-target outcome and apply the circuit-breaker policy.
 * Manual syncs use this same path as scheduled syncs so the admin page never
 * shows a stale "healthy" status after a failed manual attempt.
 */
export function recordBackupSyncResults(results: TargetSyncResult[]): void {
  lastBackupSyncMs = Date.now();
  lastBackupResults = results;

  const ok = results.filter((r) => r.status === "ok").length;
  const failed = results.filter((r) => r.status === "error");
  const blocked = results.filter((r) => r.status === "blocked");
  logger.info({ ok, total: results.length }, "[scheduler] Backup sync complete");
  if (failed.length > 0) {
    logger.warn({ failed }, "[scheduler] Some backup targets failed to sync");
  }
  if (blocked.length > 0) {
    logger.warn({ blocked }, "[scheduler] Some backup targets require schema migration before sync");
  }

  // Only connectivity/quota errors count toward the breaker. A schema block is
  // an operator migration task, not evidence that the database is unavailable.
  const configured = results.filter((r) => r.status !== "skipped");
  if (configured.length > 0 && failed.length === configured.length) {
    backupConsecutiveFailures += 1;
    if (backupConsecutiveFailures >= BACKUP_CIRCUIT_OPEN_AFTER) {
      backupCircuitOpenSince = Date.now();
      logger.error(
        { failures: backupConsecutiveFailures, cooldownHours: BACKUP_CIRCUIT_COOLDOWN_MS / 3_600_000 },
        "[scheduler] Backup sync circuit OPENED — too many consecutive full failures; check DB quota",
      );
    }
  } else {
    if (backupConsecutiveFailures > 0) {
      logger.info("[scheduler] Backup sync recovered — resetting failure counter");
    }
    backupConsecutiveFailures = 0;
  }
}

export function getBackupSyncStatus(): BackupSyncStatus {
  return {
    lastRunMs: lastBackupSyncMs,
    consecutiveFailures: backupConsecutiveFailures,
    circuitOpen: backupCircuitOpenSince > 0,
    circuitOpenSince: backupCircuitOpenSince,
    lastResults: lastBackupResults,
  };
}

async function runScheduledBackupSync(): Promise<void> {
  if (process.env.BACKUP_SYNC_ENABLED !== "true") return;
  const now = Date.now();

  // Circuit open: skip until cooldown expires
  if (backupCircuitOpenSince > 0) {
    if (now - backupCircuitOpenSince < BACKUP_CIRCUIT_COOLDOWN_MS) {
      const remainMinutes = Math.ceil((BACKUP_CIRCUIT_COOLDOWN_MS - (now - backupCircuitOpenSince)) / 60_000);
      logger.warn({ remainMinutes }, "[scheduler] Backup sync circuit open — skipping (quota/error cooldown)");
      return;
    }
    // Cooldown expired — reset circuit and try again
    logger.info("[scheduler] Backup sync circuit reset — retrying after cooldown");
    backupCircuitOpenSince = 0;
    backupConsecutiveFailures = 0;
  }

  if (now - lastBackupSyncMs < BACKUP_SYNC_INTERVAL_MS) return;
  try {
    const results = await runBackupSync();
    recordBackupSyncResults(results);
  } catch (err) {
    lastBackupSyncMs = now;
    backupConsecutiveFailures += 1;
    logger.warn({ err, failures: backupConsecutiveFailures }, "[scheduler] Backup sync threw unexpectedly");
    if (backupConsecutiveFailures >= BACKUP_CIRCUIT_OPEN_AFTER) {
      backupCircuitOpenSince = Date.now();
      logger.error("[scheduler] Backup sync circuit OPENED after repeated exceptions");
    }
  }
}

// ── Main Scheduler ───────────────────────────────────────────────────────────
export function startScheduler(): void {
  const schedulerEnabled = process.env.SCHEDULER_ENABLED !== "false";
  if (!schedulerEnabled) {
    logger.info({ runtimeRole: process.env.TRYNEXT_RUNTIME_ROLE ?? "primary" }, "[scheduler] Disabled for this runtime");
    return;
  }
  logger.info({ runtimeRole: process.env.TRYNEXT_RUNTIME_ROLE ?? "primary" }, "[scheduler] Starting in-process scheduler");

  const tick = setInterval(async () => {
    const bst = nowBST();
    const h = bst.getUTCHours();
    const m = bst.getUTCMinutes();

    await keepAlive().catch(() => {});
    if (h === 9 && m < 2) await sendDailySummary().catch(() => {});
    if ((h === 10 || h === 20) && m < 2) await checkAndAlertLowStock().catch(() => {});
    if (m < 2 && h % 2 === 0) await checkStalePendingOrders().catch(() => {});
    await runScheduledBackupSync().catch(() => {});
  }, 60_000);

  tick.unref();
  logger.info("[scheduler] Scheduler active (daily@9am, low-stock@10am&8pm, pending@every2h BST, backup-sync@30min, keep-alive@14min)");

  // Run one backup sync shortly after boot so a fresh deploy is protected immediately.
  setTimeout(() => {
    runScheduledBackupSync().catch(() => {});
  }, 30_000).unref();
}
