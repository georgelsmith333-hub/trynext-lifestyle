import { Router, type IRouter } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { verifyCustomerToken, extractCustomerToken } from "../lib/customerAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Middleware to require customer authentication
const requireCustomer = (req: any, res: any, next: any) => {
  const token = extractCustomerToken(req);
  if (!token) {
    return res.status(401).json({ error: "unauthorized", message: "Authentication required" });
  }
  const decoded = verifyCustomerToken(token);
  if (!decoded) {
    return res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
  }
  req.customer = decoded;
  next();
};

router.get("/notifications", requireCustomer, async (req: any, res) => {
  try {
    const customerId = req.customer.id;
    const { page = "1", limit = "20" } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const offset = (pageNum - 1) * limitNum;

    const [notifications, countResult] = await Promise.all([
      db.select()
        .from(notificationsTable)
        .where(eq(notificationsTable.customerId, customerId))
        .orderBy(desc(notificationsTable.createdAt))
        .limit(limitNum)
        .offset(offset),
      db.select({ count: sql<number>`count(*)` })
        .from(notificationsTable)
        .where(eq(notificationsTable.customerId, customerId)),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    res.json({
      notifications,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch notifications");
    res.status(500).json({ error: "internal_error", message: "Failed to fetch notifications" });
  }
});

router.get("/notifications/unread-count", requireCustomer, async (req: any, res) => {
  try {
    const customerId = req.customer.id;
    const [result] = await db.select({ count: sql<number>`count(*)` })
      .from(notificationsTable)
      .where(
        and(
          eq(notificationsTable.customerId, customerId),
          eq(notificationsTable.read, false)
        )
      );

    res.json({ count: Number(result?.count ?? 0) });
  } catch (err) {
    logger.error({ err }, "Failed to fetch unread count");
    res.status(500).json({ error: "internal_error", message: "Failed to fetch unread count" });
  }
});

router.patch("/notifications/:id/read", requireCustomer, async (req: any, res: any): Promise<void> => {
  try {
    const customerId = req.customer.id;
    const id = parseInt(req.params.id as string, 10);

    if (isNaN(id)) {
      return res.status(400).json({ error: "validation_error", message: "Invalid notification ID" });
    }

    const [updated] = await db.update(notificationsTable)
      .set({ read: true })
      .where(
        and(
          eq(notificationsTable.id, id),
          eq(notificationsTable.customerId, customerId)
        )
      )
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "not_found", message: "Notification not found" });
    }

    res.json({ success: true, notification: updated });
  } catch (err) {
    logger.error({ err }, "Failed to mark notification as read");
    res.status(500).json({ error: "internal_error", message: "Failed to mark notification as read" });
  }
});

router.patch("/notifications/mark-all-read", requireCustomer, async (req: any, res) => {
  try {
    const customerId = req.customer.id;
    await db.update(notificationsTable)
      .set({ read: true })
      .where(
        and(
          eq(notificationsTable.customerId, customerId),
          eq(notificationsTable.read, false)
        )
      );

    res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to mark all notifications as read");
    res.status(500).json({ error: "internal_error", message: "Failed to mark all notifications as read" });
  }
});

export default router;
