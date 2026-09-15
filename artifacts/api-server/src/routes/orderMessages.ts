import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";
import { verifyCustomerToken, extractCustomerToken } from "../lib/customerAuth";
import { logger } from "../lib/logger";
import rateLimit from "express-rate-limit";

const router = Router();

const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

async function getOrderMessages(orderId: number) {
  const res = await db.execute(
    sql`SELECT id, order_id, sender_type, sender_name, message, attachment_url,
               read_by_admin, read_by_customer, created_at
        FROM order_messages WHERE order_id = ${orderId} ORDER BY created_at ASC`
  );
  return (res as any).rows ?? res ?? [];
}

/* ── Admin: list messages for an order ──────────────────────── */
router.get("/admin/orders/:id/messages", requireAdmin, async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    if (!orderId) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }

    const messages = await getOrderMessages(orderId);

    await db.execute(
      sql`UPDATE order_messages SET read_by_admin = true
          WHERE order_id = ${orderId} AND read_by_admin = false`
    );

    res.json({ messages });
  } catch (err) {
    logger.error({ err }, "Failed to list order messages (admin)");
    res.status(500).json({ error: "Failed to load messages" });
  }
});

/* ── Admin: send a message ───────────────────────────────────── */
router.post("/admin/orders/:id/messages", requireAdmin, messageLimiter, async (req, res) => {
  try {
    const orderId = Number(req.params.id);
    if (!orderId) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }

    const { message, attachmentUrl } = req.body ?? {};
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "Message is required" });
      return;
    }
    if (message.length > 2000) {
      res.status(400).json({ error: "Message too long (max 2000 chars)" });
      return;
    }

    const orderCheck = await db.execute(sql`SELECT id, customer_id, order_number FROM orders WHERE id = ${orderId}`);
    const orderRows = (orderCheck as any).rows ?? orderCheck ?? [];
    if (orderRows.length === 0) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    const order = orderRows[0];

    const inserted = await db.execute(
      sql`INSERT INTO order_messages (order_id, sender_type, sender_name, message, attachment_url, read_by_admin)
           VALUES (${orderId}, 'admin', 'Trynext Team', ${message.trim()}, ${attachmentUrl ?? null}, true)
          RETURNING *`
    );
    const row = ((inserted as any).rows ?? inserted ?? [])[0];

    if (order.customer_id) {
      try {
        await db.insert(notificationsTable).values({
          customerId: order.customer_id,
          title: "New Message",
           message: `You have a new message from Trynext Team regarding order #${order.order_number}.`,
          type: "message",
          link: `/account`,
        });
      } catch (err) {
        logger.error({ err }, "Failed to create message notification");
      }
    }

    res.json({ message: row });
  } catch (err) {
    logger.error({ err }, "Failed to post admin order message");
    res.status(500).json({ error: "Failed to send message" });
  }
});

/* ── Customer: get messages for their own order ─────────────── */
router.get("/orders/:id/messages", messageLimiter, async (req, res) => {
  try {
    const token = extractCustomerToken(req);
    let customerEmail: string | null = null;
    if (token) {
      try {
        const decoded = verifyCustomerToken(token);
        customerEmail = String((decoded as any)?.email ?? "").trim().toLowerCase() || null;
      } catch {}
    }

    const orderId = Number(req.params.id);
    if (!orderId) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }

    const orderRes = await db.execute(
      sql`SELECT id, customer_email FROM orders WHERE id = ${orderId}`
    );
    const order = ((orderRes as any).rows ?? orderRes ?? [])[0];
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const effectiveEmail = String(customerEmail ?? (req.query.trackEmail as string | undefined) ?? "").trim().toLowerCase();
    const storedEmail = String(order.customer_email ?? "").trim().toLowerCase();
    if (!effectiveEmail || !storedEmail || storedEmail !== effectiveEmail) {
      res.status(403).json({ error: "Not authorised to view this order" });
      return;
    }

    const messages = await getOrderMessages(orderId);

    await db.execute(
      sql`UPDATE order_messages SET read_by_customer = true
          WHERE order_id = ${orderId} AND read_by_customer = false`
    );

    res.json({ messages });
  } catch (err) {
    logger.error({ err }, "Failed to list order messages (customer)");
    res.status(500).json({ error: "Failed to load messages" });
  }
});

/* ── Customer: reply to a message ───────────────────────────── */
router.post("/orders/:id/messages", messageLimiter, async (req, res) => {
  try {
    const token = extractCustomerToken(req);
    let customerEmail: string | null = null;
    let customerName: string | null = null;
    if (token) {
      try {
        const decoded = verifyCustomerToken(token) as any;
        customerEmail = String(decoded?.email ?? "").trim().toLowerCase() || null;
        customerName = decoded?.name ?? null;
      } catch {}
    }

    const orderId = Number(req.params.id);
    if (!orderId) {
      res.status(400).json({ error: "Invalid order id" });
      return;
    }

    const { message, trackEmail, senderName } = req.body ?? {};
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      res.status(400).json({ error: "Message is required" });
      return;
    }
    if (message.length > 2000) {
      res.status(400).json({ error: "Message too long (max 2000 chars)" });
      return;
    }

    const effectiveEmail = String(customerEmail ?? trackEmail ?? "").trim().toLowerCase();
    if (!effectiveEmail) {
      res.status(403).json({ error: "Not authorised" });
      return;
    }

    const orderRes = await db.execute(
      sql`SELECT id, customer_email, customer_name FROM orders WHERE id = ${orderId}`
    );
    const order = ((orderRes as any).rows ?? orderRes ?? [])[0];
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (String(order.customer_email ?? "").trim().toLowerCase() !== effectiveEmail) {
      res.status(403).json({ error: "Not authorised to reply to this order" });
      return;
    }

    const displayName = customerName ?? senderName ?? order.customer_name ?? "Customer";

    const inserted = await db.execute(
      sql`INSERT INTO order_messages (order_id, sender_type, sender_name, message, read_by_customer)
          VALUES (${orderId}, 'customer', ${displayName}, ${message.trim()}, true)
          RETURNING *`
    );
    const row = ((inserted as any).rows ?? inserted ?? [])[0];

    res.json({ message: row });
  } catch (err) {
    logger.error({ err }, "Failed to post customer order message");
    res.status(500).json({ error: "Failed to send message" });
  }
});

/* ── Customer: unread message count across all their orders ─── */
router.get("/orders/my/messages/unread-count", messageLimiter, async (req, res) => {
  try {
    const token = extractCustomerToken(req);
    if (!token) {
      res.json({ count: 0 });
      return;
    }
    let customerEmail: string | null = null;
    try {
      const decoded = verifyCustomerToken(token) as any;
      customerEmail = String(decoded?.email ?? "").trim().toLowerCase() || null;
    } catch {
      res.json({ count: 0 });
      return;
    }
    if (!customerEmail) {
      res.json({ count: 0 });
      return;
    }
    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM order_messages om
          JOIN orders o ON o.id = om.order_id
          WHERE LOWER(TRIM(o.customer_email)) = ${customerEmail}
          AND om.sender_type = 'admin'
          AND om.read_by_customer = false`
    );
    const rows = (result as any).rows ?? result ?? [];
    const count = Number(rows[0]?.count ?? 0);
    res.json({ count });
  } catch (err) {
    logger.error({ err }, "Failed to get unread message count");
    res.json({ count: 0 });
  }
});

export default router;
