import { Router } from "express";
import { db, ordersTable, productsTable, promoCodesTable, settingsTable, newsletterSubscribersTable } from "@workspace/db";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";
import { logger } from "../lib/logger";
import { tgReply, getWebhookSecret, setChatIdOverride, getEffectiveChatId } from "../lib/telegram";

async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text ?? "", show_alert: false }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {}
}

async function editMessageReplyMarkup(chatId: number | string, messageId: number): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/editMessageReplyMarkup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: String(chatId), message_id: messageId, reply_markup: JSON.stringify({ inline_keyboard: [] }) }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {}
}

const router = Router();
const BST_OFFSET_MS = 6 * 60 * 60 * 1000;

function nowBST(): Date {
  return new Date(Date.now() + BST_OFFSET_MS);
}

function startOfDayUTC(): Date {
  const bst = nowBST();
  const startBST = new Date(Date.UTC(bst.getUTCFullYear(), bst.getUTCMonth(), bst.getUTCDate()));
  return new Date(startBST.getTime() - BST_OFFSET_MS);
}

function isAdminChat(chatId: number | string): boolean {
  const effective = getEffectiveChatId();
  return !!effective && String(chatId) === String(effective);
}

/** Persist admin chat ID to the settings table and apply it immediately at runtime. */
async function saveAdminChatId(chatId: number | string): Promise<void> {
  try {
    const id = String(chatId);
    await db.insert(settingsTable)
      .values({ key: "telegram_chat_id", value: id, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: id, updatedAt: new Date() } });
    setChatIdOverride(id);
    logger.info({ chatId: id }, "[telegram] Admin chat ID saved to settings");
  } catch (err) {
    logger.warn({ err }, "[telegram] Failed to persist admin chat ID");
  }
}

/** Load saved admin chat ID from settings table at startup (called from index.ts). */
export async function loadSavedChatId(): Promise<void> {
  try {
    const [row] = await db.select({ value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.key, "telegram_chat_id"))
      .limit(1);
    if (row?.value) {
      setChatIdOverride(row.value);
      logger.info({ chatId: row.value }, "[telegram] Loaded saved admin chat ID from DB");
    }
  } catch (err) {
    logger.warn({ err }, "[telegram] Could not load saved chat ID from DB");
  }
}

// ── Command Handlers ─────────────────────────────────────────────────────────

async function cmdHelp(): Promise<string> {
  return [
    `🤖 <b>TryNex Admin Bot</b>`,
    ``,
    `📦 <b>Orders</b>`,
    `/orders — Today's orders`,
    `/pending — All pending orders`,
    `/order TN250511xxxx — Full order details`,
    `/invoice TN250511xxxx — Printable invoice`,
    `/customer TN250511xxxx — Customer info + message templates`,
    `/ship TN250511xxxx — Mark as Shipped`,
    `/deliver TN250511xxxx — Mark as Delivered`,
    `/cancel TN250511xxxx — Cancel order`,
    ``,
    `📊 <b>Analytics</b>`,
    `/stats — Today's revenue &amp; counts`,
    `/revenue — Last 7 &amp; 30 day revenue`,
    `/stock — Low stock products`,
    `/subscribers — Newsletter count`,
    ``,
    `⚙️ <b>Admin Actions</b>`,
    `/promo CODE 20 — Create 20% off promo`,
    `/deploy — Trigger deployment hook`,
    `/help — Show this message`,
    ``,
    `💡 <i>New orders also have tap-to-act buttons (Ship/Deliver/Cancel/Invoice)</i>`,
  ].join("\n");
}

async function cmdOrders(): Promise<string> {
  const dayStart = startOfDayUTC();
  const orders = await db.select()
    .from(ordersTable)
    .where(gte(ordersTable.createdAt, dayStart))
    .orderBy(desc(ordersTable.createdAt))
    .limit(10);

  if (orders.length === 0) return "📦 No orders yet today.";

  const revenue = orders.reduce((s, o) => s + parseFloat(String(o.total || 0)), 0);
  const lines = [
    `📦 <b>Today's Orders (${orders.length})</b>`,
    `💰 Revenue: ৳${Math.round(revenue).toLocaleString()}`,
    ``,
  ];
  for (const o of orders) {
    const e = o.status === "delivered" ? "✅" : o.status === "shipped" ? "🚚" : o.status === "cancelled" ? "❌" : "⏳";
    lines.push(`${e} <code>#${o.orderNumber}</code> ${o.customerName} — ৳${o.total}`);
  }
  return lines.join("\n");
}

async function cmdPending(): Promise<string> {
  const orders = await db.select()
    .from(ordersTable)
    .where(eq(ordersTable.status, "pending"))
    .orderBy(desc(ordersTable.createdAt))
    .limit(10);

  if (orders.length === 0) return "✅ No pending orders right now!";

  const lines = [`⏳ <b>Pending Orders (${orders.length})</b>\n`];
  for (const o of orders) {
    const hrs = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 3_600_000);
    lines.push(`• <code>#${o.orderNumber}</code> — ${o.customerName}`);
    lines.push(`  ৳${o.total} · 📞 ${o.customerPhone} · ${hrs}h ago`);
  }
  return lines.join("\n");
}

async function cmdOrderDetail(orderNumber: string): Promise<string> {
  const [o] = await db.select().from(ordersTable)
    .where(eq(ordersTable.orderNumber, orderNumber.toUpperCase()));

  if (!o) return `❌ Order <code>${orderNumber}</code> not found.`;

  const items = (o.items as any[]) || [];
  const itemsList = items.slice(0, 5)
    .map((i: any) => `  • ${i.productName || i.name || "Item"} x${i.quantity}`)
    .join("\n");
  const more = items.length > 5 ? `\n  + ${items.length - 5} more` : "";

  return [
    `📦 <b>Order #${o.orderNumber}</b>`,
    ``,
    `👤 ${o.customerName}`,
    `📞 ${o.customerPhone}`,
    `📍 ${[o.shippingDistrict, o.shippingCity].filter(Boolean).join(", ")}`,
    `🏠 ${o.shippingAddress}`,
    ``,
    `🛒 Items:\n${itemsList}${more}`,
    ``,
    `💰 Total: ৳${o.total}`,
    `💳 Payment: ${(o.paymentMethod || "COD").toUpperCase()}`,
    `📊 Status: <b>${o.status}</b>`,
    `💚 Payment Status: ${o.paymentStatus || "not_paid"}`,
    o.notes ? `📝 Notes: ${o.notes}` : "",
    ``,
    `⏰ ${new Date(o.createdAt).toLocaleString("en-BD", { timeZone: "Asia/Dhaka" })}`,
  ].filter(Boolean).join("\n");
}

async function cmdSetStatus(orderNumber: string, status: string): Promise<string> {
  const [o] = await db.select({ id: ordersTable.id, orderNumber: ordersTable.orderNumber })
    .from(ordersTable).where(eq(ordersTable.orderNumber, orderNumber.toUpperCase()));

  if (!o) return `❌ Order <code>${orderNumber}</code> not found.`;

  await db.update(ordersTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(ordersTable.id, o.id));

  const emoji = { shipped: "🚚", delivered: "✅", cancelled: "❌", processing: "⚙️", pending: "⏳" }[status] ?? "📋";
  return `${emoji} Order <code>#${o.orderNumber}</code> marked as <b>${status}</b>.`;
}

async function cmdStats(): Promise<string> {
  const dayStart = startOfDayUTC();
  const [[today], [total], [pending]] = await Promise.all([
    db.select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`COALESCE(sum(total::numeric),0)::float`,
    }).from(ordersTable).where(gte(ordersTable.createdAt, dayStart)),

    db.select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`COALESCE(sum(total::numeric),0)::float`,
    }).from(ordersTable),

    db.select({ count: sql<number>`count(*)::int` })
      .from(ordersTable).where(eq(ordersTable.status, "pending")),
  ]);

  const dateStr = new Date().toLocaleDateString("en-BD", {
    timeZone: "Asia/Dhaka", day: "numeric", month: "short",
  });

  return [
    `📊 <b>TryNex Stats</b>`,
    ``,
    `📅 <b>Today (${dateStr})</b>`,
    `  🛍️ Orders: ${today.count}`,
    `  💰 Revenue: ৳${Math.round(today.revenue).toLocaleString()}`,
    ``,
    `📦 <b>All Time</b>`,
    `  Orders: ${total.count}`,
    `  Revenue: ৳${Math.round(total.revenue).toLocaleString()}`,
    `  ⏳ Pending: ${pending.count}`,
  ].join("\n");
}

async function cmdRevenue(): Promise<string> {
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const month = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [[wk], [mo]] = await Promise.all([
    db.select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`COALESCE(sum(total::numeric),0)::float`,
    }).from(ordersTable).where(gte(ordersTable.createdAt, week)),

    db.select({
      count: sql<number>`count(*)::int`,
      revenue: sql<number>`COALESCE(sum(total::numeric),0)::float`,
    }).from(ordersTable).where(gte(ordersTable.createdAt, month)),
  ]);

  return [
    `💰 <b>Revenue Report</b>`,
    ``,
    `📅 <b>Last 7 Days</b>`,
    `  Orders: ${wk.count}`,
    `  Revenue: ৳${Math.round(wk.revenue).toLocaleString()}`,
    wk.count > 0 ? `  Avg/Order: ৳${Math.round(wk.revenue / wk.count).toLocaleString()}` : "",
    ``,
    `📅 <b>Last 30 Days</b>`,
    `  Orders: ${mo.count}`,
    `  Revenue: ৳${Math.round(mo.revenue).toLocaleString()}`,
    mo.count > 0 ? `  Avg/Order: ৳${Math.round(mo.revenue / mo.count).toLocaleString()}` : "",
  ].filter(Boolean).join("\n");
}

async function cmdStock(): Promise<string> {
  const items = await db.select({ name: productsTable.name, stock: productsTable.stock })
    .from(productsTable).where(lte(productsTable.stock, 5))
    .orderBy(productsTable.stock);

  if (items.length === 0) return "✅ All products are well stocked!";

  const lines = [`📦 <b>Low Stock Products</b>\n`];
  for (const p of items) {
    const dot = (p.stock ?? 0) === 0 ? "🔴 OUT" : (p.stock ?? 0) <= 1 ? "🔴" : (p.stock ?? 0) <= 3 ? "🟠" : "🟡";
    lines.push(`${dot} ${p.name}: <b>${p.stock}</b> left`);
  }
  lines.push(`\n👉 Admin → Products to update stock`);
  return lines.join("\n");
}

async function cmdSubscribers(): Promise<string> {
  const [row] = await db.select({ count: sql<number>`count(*)::int` })
    .from(newsletterSubscribersTable);
  return `📧 <b>Newsletter</b>\n\nTotal Subscribers: <b>${row.count}</b>\n\n👉 Admin → Newsletter to manage`;
}

async function cmdInvoice(orderNumber: string): Promise<string> {
  if (!orderNumber) return "❌ Usage: /invoice TN250511xxxx";
  const [o] = await db.select().from(ordersTable)
    .where(eq(ordersTable.orderNumber, orderNumber.toUpperCase().trim()));
  if (!o) return `❌ Order <code>${orderNumber.toUpperCase()}</code> not found.`;

  const items = (o.items as any[]) || [];
  const itemsText = items.map((item: any, idx: number) => {
    const name = item.productName || item.name || "Item";
    const variants = [item.size, item.color].filter(Boolean).join(", ");
    const unitPrice = parseFloat(String(item.price || item.unitPrice || 0));
    const qty = parseInt(String(item.quantity || 1));
    return `  ${idx + 1}. ${name}${variants ? ` (${variants})` : ""} × ${qty} = ৳${(unitPrice * qty).toLocaleString()}`;
  }).join("\n");

  const subtotal = parseFloat(String(o.subtotal || o.total || 0));
  const shipping = parseFloat(String(o.shippingCost || 0));
  const discount = parseFloat(String(o.promoDiscount || 0));
  const total = parseFloat(String(o.total || 0));
  const advance = Math.ceil(total * 0.15);
  const due = total - advance;

  const dateStr = new Date(o.createdAt).toLocaleDateString("en-BD", {
    timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric",
  });

  const statusEmoji: Record<string, string> = { pending: "⏳", processing: "⚙️", shipped: "🚚", delivered: "✅", cancelled: "❌" };
  const sEmoji = statusEmoji[o.status || "pending"] ?? "📋";

  const lines = [
    `📄 <b>INVOICE — TryNex Lifestyle</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `📝 Order: <code>#${o.orderNumber}</code>`,
    `📅 Date: ${dateStr}`,
    `${sEmoji} Status: <b>${(o.status || "pending").toUpperCase()}</b>`,
    ``,
    `👤 <b>Bill To:</b>`,
    `  ${o.customerName}`,
    `  📞 ${o.customerPhone}`,
    ...(o.customerEmail ? [`  📧 ${o.customerEmail}`] : []),
    `  📍 ${[o.shippingDistrict, o.shippingCity].filter(Boolean).join(", ")}`,
    `  🏠 ${o.shippingAddress}`,
    ``,
    `🛒 <b>Items:</b>`,
    itemsText || "  (no items)",
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    ...(subtotal > 0 && subtotal !== total ? [`  Subtotal:  ৳${subtotal.toLocaleString()}`] : []),
    ...(shipping > 0 ? [`  Shipping:  ৳${shipping.toLocaleString()}`] : []),
    ...(discount > 0 ? [`  Discount:  -৳${discount.toLocaleString()}${o.promoCode ? ` (${o.promoCode})` : ""}`] : []),
    `  <b>TOTAL:     ৳${total.toLocaleString()}</b>`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `💳 Payment: ${(o.paymentMethod || "COD").toUpperCase()}`,
    `💚 Pay Status: <b>${(o.paymentStatus || "not_paid").toUpperCase()}</b>`,
    ...(o.paymentMethod !== "cod" ? [
      `🏷️ Advance (15%): ৳${advance.toLocaleString()}`,
      `💸 Balance Due:   ৳${due.toLocaleString()}`,
    ] : []),
    ``,
    `🏪 TryNex Lifestyle | trynexshop.com`,
    `📱 WhatsApp/Call: 01903426915`,
    ...(o.notes ? [``, `📝 Notes: ${o.notes}`] : []),
  ];
  return lines.join("\n");
}

async function cmdCustomer(orderNumber: string): Promise<string> {
  if (!orderNumber) return "❌ Usage: /customer TN250511xxxx";
  const [o] = await db.select().from(ordersTable)
    .where(eq(ordersTable.orderNumber, orderNumber.toUpperCase().trim()));
  if (!o) return `❌ Order <code>${orderNumber.toUpperCase()}</code> not found.`;

  const items = (o.items as any[]) || [];
  const itemSummary = items.slice(0, 2).map((i: any) => `${i.productName || i.name || "Item"} x${i.quantity || 1}`).join(", ");
  const total = parseFloat(String(o.total || 0));

  const lines = [
    `👤 <b>Customer — #${o.orderNumber}</b>`,
    ``,
    `<b>Name:</b> ${o.customerName}`,
    `<b>Phone:</b> <code>${o.customerPhone}</code>`,
    ...(o.customerEmail ? [`<b>Email:</b> ${o.customerEmail}`] : []),
    `<b>District:</b> ${o.shippingDistrict || "N/A"}${o.shippingCity ? ` / ${o.shippingCity}` : ""}`,
    `<b>Address:</b> ${o.shippingAddress}`,
    ``,
    `💰 Total: ৳${total.toLocaleString()} | Status: <b>${o.status}</b>`,
    ``,
    `📋 <b>Message Templates (copy &amp; paste):</b>`,
    ``,
    `<i>✅ Order Confirmed:</i>`,
    `"আপনার অর্ডার <b>#${o.orderNumber}</b> কনফার্ম হয়েছে! ${itemSummary}। ২-৩ কার্যদিবসের মধ্যে ডেলিভারি হবে। ধন্যবাদ! — TryNex Lifestyle"`,
    ``,
    `<i>🚚 Shipped:</i>`,
    `"আপনার অর্ডার <b>#${o.orderNumber}</b> পাঠানো হয়েছে! ২-৩ দিনের মধ্যে পৌঁছে যাবে। কোনো প্রশ্ন থাকলে জানান। — TryNex Lifestyle"`,
    ``,
    `<i>✅ Delivered:</i>`,
    `"আপনার অর্ডার <b>#${o.orderNumber}</b> ডেলিভার হয়েছে! ধন্যবাদ TryNex Lifestyle-এ অর্ডার করার জন্য। রিভিউ দিলে আমরা খুশি হব ⭐ — TryNex"`,
  ];
  return lines.join("\n");
}

async function cmdCreatePromo(code: string, discountStr: string): Promise<string> {
  if (!code || !discountStr) return "❌ Usage: /promo CODE PERCENT\nExample: /promo SAVE20 20";
  const discount = parseFloat(discountStr);
  if (isNaN(discount) || discount <= 0 || discount > 100) return "❌ Discount must be a number between 1-100.\nExample: /promo SAVE20 20";

  const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
  if (!clean) return "❌ Invalid promo code. Use letters and numbers only.";

  const existing = await db.select({ id: promoCodesTable.id })
    .from(promoCodesTable).where(eq(promoCodesTable.code, clean));

  if (existing.length > 0) return `⚠️ Promo code <code>${clean}</code> already exists.`;

  await db.insert(promoCodesTable).values({
    code: clean,
    discountType: "percentage",
    discountValue: discount.toString(),
    active: true,
  });

  return `✅ <b>Promo code created!</b>\n\nCode: <code>${clean}</code>\nDiscount: <b>${discount}%</b>\n\nShare with customers at checkout!`;
}

async function cmdDeploy(): Promise<string> {
  const [hookRow] = await db.select({ value: settingsTable.value })
    .from(settingsTable).where(eq(settingsTable.key, "render_deploy_hook"));

  const hookUrl = hookRow?.value;
  if (!hookUrl) return "❌ Deploy hook not configured.\nGo to Admin → Deployment to set it up.";

  try {
    const r = await fetch(hookUrl, { method: "POST", signal: AbortSignal.timeout(10_000) });
    return r.ok
      ? "🚀 <b>Deploy triggered!</b>\n\nThe deploy hook fired successfully. Your server is building now."
      : `❌ Deploy hook responded with HTTP ${r.status}. Check your deploy hook URL in Admin → Deployment.`;
  } catch {
    return "❌ Could not reach deploy hook. Check your internet connection and hook URL in Admin → Deployment.";
  }
}

// ── Public Webhook (receives Telegram updates) ────────────────────────────────

router.post("/telegram/webhook", async (req, res) => {
  const secret = req.headers["x-telegram-bot-api-secret-token"];
  if (secret !== getWebhookSecret()) {
    res.status(403).json({ error: "forbidden" });
    return;
  }

  res.json({ ok: true });

  try {
    const update = req.body as any;

    // ── Handle inline keyboard callback queries ─────────────────────────────
    if (update?.callback_query) {
      const cq = update.callback_query;
      const cbChatId: number = cq.message?.chat?.id;
      const cbMsgId: number  = cq.message?.message_id;
      const data: string     = cq.data || "";
      const cbQueryId: string = cq.id;

      if (!cbChatId || !isAdminChat(cbChatId)) {
        await answerCallbackQuery(cbQueryId, "⛔ Unauthorized");
        return;
      }

      const [action, orderNum] = data.split(":");
      let cbReply = "";

      if (action === "ship") {
        cbReply = orderNum ? await cmdSetStatus(orderNum, "shipped") : "❌ No order number";
        await answerCallbackQuery(cbQueryId, "🚚 Marked as Shipped!");
      } else if (action === "deliver") {
        cbReply = orderNum ? await cmdSetStatus(orderNum, "delivered") : "❌ No order number";
        await answerCallbackQuery(cbQueryId, "✅ Marked as Delivered!");
      } else if (action === "cancel") {
        cbReply = orderNum ? await cmdSetStatus(orderNum, "cancelled") : "❌ No order number";
        await answerCallbackQuery(cbQueryId, "❌ Order Cancelled");
      } else if (action === "invoice") {
        cbReply = orderNum ? await cmdInvoice(orderNum) : "❌ No order number";
        await answerCallbackQuery(cbQueryId, "📄 Invoice");
      } else if (action === "customer") {
        cbReply = orderNum ? await cmdCustomer(orderNum) : "❌ No order number";
        await answerCallbackQuery(cbQueryId, "👤 Customer Info");
      } else {
        await answerCallbackQuery(cbQueryId, "❓ Unknown action");
        return;
      }

      if (cbReply) {
        await tgReply(cbChatId, cbReply).catch(() => {});
        // Remove buttons from original message after action (avoids re-tapping)
        if (action === "ship" || action === "deliver" || action === "cancel") {
          await editMessageReplyMarkup(cbChatId, cbMsgId).catch(() => {});
        }
      }
      return;
    }

    // ── Handle regular text messages ────────────────────────────────────────
    const message = update?.message || update?.edited_message;
    if (!message?.text) return;

    const chatId: number = message.chat?.id;
    const text: string = (message.text || "").trim();
    if (!chatId) return;

    if (!isAdminChat(chatId)) {
      const configuredId = getEffectiveChatId();
      if (!configuredId) {
        // First person to message — auto-register as admin
        await saveAdminChatId(chatId);
        await tgReply(chatId,
          `✅ <b>TryNex Admin Bot — Registered!</b>\n\n` +
          `Your chat (<code>${chatId}</code>) is now set as the admin chat.\n\n` +
          `Order notifications will arrive here. Send /help to see all commands.`
        );
        // Fall through to process the /start command normally
      } else {
        await tgReply(chatId, "⛔ Unauthorized. This bot only responds to the TryNex admin.");
        return;
      }
    }

    const parts = text.split(/\s+/);
    const rawCmd = (parts[0] || "").toLowerCase().split("@")[0];
    const args = parts.slice(1);

    let reply = "";

    switch (rawCmd) {
      case "/start":
      case "/help":
        reply = await cmdHelp();
        break;
      case "/orders":
        reply = await cmdOrders();
        break;
      case "/pending":
        reply = await cmdPending();
        break;
      case "/order":
        reply = args[0] ? await cmdOrderDetail(args[0]) : "❌ Usage: /order TN250511xxxx";
        break;
      case "/invoice":
        reply = await cmdInvoice(args[0] || "");
        break;
      case "/customer":
        reply = await cmdCustomer(args[0] || "");
        break;
      case "/ship":
        reply = args[0] ? await cmdSetStatus(args[0], "shipped") : "❌ Usage: /ship TN250511xxxx";
        break;
      case "/deliver":
        reply = args[0] ? await cmdSetStatus(args[0], "delivered") : "❌ Usage: /deliver TN250511xxxx";
        break;
      case "/cancel":
        reply = args[0] ? await cmdSetStatus(args[0], "cancelled") : "❌ Usage: /cancel TN250511xxxx";
        break;
      case "/stats":
        reply = await cmdStats();
        break;
      case "/revenue":
        reply = await cmdRevenue();
        break;
      case "/stock":
        reply = await cmdStock();
        break;
      case "/subscribers":
        reply = await cmdSubscribers();
        break;
      case "/promo":
        reply = await cmdCreatePromo(args[0] || "", args[1] || "");
        break;
      case "/deploy":
        reply = await cmdDeploy();
        break;
      default:
        reply = `❓ Unknown command: <code>${rawCmd}</code>\n\nType /help to see all available commands.`;
    }

    if (reply) await tgReply(chatId, reply).catch(() => {});
  } catch (err) {
    logger.error({ err }, "[telegram-webhook] update processing failed");
  }
});

// ── Admin: Register webhook with Telegram ─────────────────────────────────────

router.post("/admin/telegram/webhook/register", requireAdmin, async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    res.status(400).json({ error: "not_configured", message: "TELEGRAM_BOT_TOKEN not set" });
    return;
  }
  const { apiBaseUrl } = req.body ?? {};
  const base = ((apiBaseUrl as string | undefined) || process.env.API_PUBLIC_URL || "").replace(/\/$/, "");
  if (!base) {
    res.status(400).json({ error: "missing_url", message: "Provide apiBaseUrl in body, e.g. https://your-api.replit.app" });
    return;
  }

  const webhookUrl = `${base}/api/telegram/webhook`;
  const secret = getWebhookSecret();

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secret,
        allowed_updates: ["message", "edited_message", "callback_query"],
        drop_pending_updates: true,
        max_connections: 10,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const data: any = await r.json();
    if (!data.ok) {
      res.status(502).json({ error: "telegram_error", message: data.description || "Telegram API error" });
      return;
    }
    logger.info({ webhookUrl }, "[telegram-webhook] Webhook registered");
    res.json({ ok: true, webhookUrl, message: "✅ Webhook registered! Your bot now accepts commands from Telegram." });
  } catch (err) {
    res.status(502).json({ error: "network_error", message: "Could not reach Telegram API" });
  }
});

// ── Admin: Get webhook info ────────────────────────────────────────────────────

router.get("/admin/telegram/webhook/info", requireAdmin, async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { res.status(400).json({ error: "not_configured" }); return; }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, { signal: AbortSignal.timeout(8000) });
    const data: any = await r.json();
    res.json(data);
  } catch {
    res.status(502).json({ error: "network_error" });
  }
});

// ── Admin: Setup status (what AdminSettings calls) ───────────────────────────

router.get("/admin/telegram/setup", requireAdmin, async (_req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const configured = Boolean(token);
  const effectiveChatId = getEffectiveChatId();
  if (!configured) {
    res.json({ configured: false, botUsername: null, webhook: null, current_chat_id: null });
    return;
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`, { signal: AbortSignal.timeout(8000) });
    const data: any = await r.json();
    res.json({
      configured: true,
      botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
      webhook: data.ok ? data.result : null,
      current_chat_id: effectiveChatId || null,
      chat_id_source: process.env.TELEGRAM_CHAT_ID ? "env" : effectiveChatId ? "db" : "not_set",
      instructions: effectiveChatId
        ? `✅ Bot configured. Notifications go to chat ${effectiveChatId}.`
        : `⚠️ Send any message to @${process.env.TELEGRAM_BOT_USERNAME || 'your bot'} — it will auto-register as admin chat.`,
    });
  } catch {
    res.json({ configured: true, botUsername: process.env.TELEGRAM_BOT_USERNAME || null, webhook: null, current_chat_id: effectiveChatId, chat_id_source: process.env.TELEGRAM_CHAT_ID ? "env" : effectiveChatId ? "db" : "not_set" });
  }
});

// ── Admin: Register a specific chat ID as admin ────────────────────────────────
router.post("/admin/telegram/register-chat", requireAdmin, async (req, res) => {
  const { chatId } = req.body;
  if (!chatId) {
    res.status(400).json({ ok: false, message: "chatId is required" });
    return;
  }
  try {
    await saveAdminChatId(String(chatId));
    res.json({ ok: true, message: `Chat ID ${chatId} registered as admin chat.` });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Failed to save chat ID" });
  }
});

// ── Admin: Test — send a message to the admin Telegram chat ──────────────────

router.post("/admin/telegram/test", requireAdmin, async (_req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = getEffectiveChatId();
  if (!token) {
    res.status(400).json({ ok: false, error: "not_configured", message: "TELEGRAM_BOT_TOKEN is not set" });
    return;
  }
  if (!chatId) {
    res.status(400).json({ ok: false, error: "no_chat_id", message: "TELEGRAM_CHAT_ID is not configured — message your bot once to auto-register" });
    return;
  }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "✅ TryNex admin bot is connected and working!", parse_mode: "HTML" }),
      signal: AbortSignal.timeout(8000),
    });
    const data: any = await r.json();
    if (!data.ok) { res.status(502).json({ ok: false, error: "telegram_error", message: data.description }); return; }
    res.json({ ok: true, message: "Test message sent successfully!" });
  } catch {
    res.status(502).json({ ok: false, error: "network_error", message: "Could not reach Telegram API" });
  }
});

// ── Admin: Delete webhook (revert to polling) ────────────────────────────────

router.delete("/admin/telegram/webhook", requireAdmin, async (req, res) => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) { res.status(400).json({ error: "not_configured" }); return; }
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`, {
      method: "POST", signal: AbortSignal.timeout(8000),
    });
    const data: any = await r.json();
    res.json(data);
  } catch {
    res.status(502).json({ error: "network_error" });
  }
});

export default router;
