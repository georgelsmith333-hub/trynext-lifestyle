import { Router, type Request, type Response } from "express";
import { db, mockupsTable } from "@workspace/db";
import { eq, desc, asc, ilike, and, or, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";

const router = Router();

router.get("/admin/mockups", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { q, productId, tag, active } = req.query;
    let query = db.select().from(mockupsTable).orderBy(asc(mockupsTable.sortOrder), desc(mockupsTable.createdAt));

    const conditions: any[] = [];
    if (q && typeof q === "string") {
      conditions.push(ilike(mockupsTable.name, `%${q}%`));
    }
    if (productId) {
      conditions.push(eq(mockupsTable.productId, parseInt(productId as string, 10)));
    }
    if (active !== undefined) {
      conditions.push(eq(mockupsTable.isActive, active === "true"));
    }

    const rows = conditions.length > 0
      ? await db.select().from(mockupsTable).where(and(...conditions)).orderBy(asc(mockupsTable.sortOrder), desc(mockupsTable.createdAt))
      : await db.select().from(mockupsTable).orderBy(asc(mockupsTable.sortOrder), desc(mockupsTable.createdAt));

    res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Failed to list mockups");
    res.status(500).json({ error: "internal_error", message: "Failed to list mockups" });
  }
});

router.post("/admin/mockups", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, description, productId, productName, imageUrl, thumbUrl, tags, isActive, sortOrder } = req.body;
    if (!name || !imageUrl) {
      res.status(400).json({ error: "validation_error", message: "name and imageUrl are required" });
      return;
    }
    const [row] = await db.insert(mockupsTable).values({
      name,
      description: description ?? null,
      productId: productId ? parseInt(productId, 10) : null,
      productName: productName ?? null,
      imageUrl,
      thumbUrl: thumbUrl ?? null,
      tags: Array.isArray(tags) ? tags : [],
      isActive: isActive !== false,
      sortOrder: sortOrder ?? 0,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to create mockup");
    res.status(500).json({ error: "internal_error", message: "Failed to create mockup" });
  }
});

router.patch("/admin/mockups/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "validation_error", message: "Invalid id" });
      return;
    }
    const { name, description, productId, productName, imageUrl, thumbUrl, tags, isActive, sortOrder } = req.body;
    const update: Partial<typeof mockupsTable.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (productId !== undefined) update.productId = productId ? parseInt(productId, 10) : null;
    if (productName !== undefined) update.productName = productName;
    if (imageUrl !== undefined) update.imageUrl = imageUrl;
    if (thumbUrl !== undefined) update.thumbUrl = thumbUrl;
    if (tags !== undefined) update.tags = Array.isArray(tags) ? tags : [];
    if (isActive !== undefined) update.isActive = isActive;
    if (sortOrder !== undefined) update.sortOrder = sortOrder;

    const [row] = await db.update(mockupsTable).set(update).where(eq(mockupsTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "not_found", message: "Mockup not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    req.log.error({ err }, "Failed to update mockup");
    res.status(500).json({ error: "internal_error", message: "Failed to update mockup" });
  }
});

router.delete("/admin/mockups/:id", requireAdmin, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!Number.isFinite(id)) {
      res.status(400).json({ error: "validation_error", message: "Invalid id" });
      return;
    }
    const [row] = await db.delete(mockupsTable).where(eq(mockupsTable.id, id)).returning();
    if (!row) {
      res.status(404).json({ error: "not_found", message: "Mockup not found" });
      return;
    }
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to delete mockup");
    res.status(500).json({ error: "internal_error", message: "Failed to delete mockup" });
  }
});

router.post("/admin/mockups/reorder", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { order } = req.body;
    if (!Array.isArray(order)) {
      res.status(400).json({ error: "validation_error", message: "order must be an array of {id, sortOrder}" });
      return;
    }
    await Promise.all(
      order.map(({ id, sortOrder }: { id: number; sortOrder: number }) =>
        db.update(mockupsTable).set({ sortOrder, updatedAt: new Date() }).where(eq(mockupsTable.id, id))
      )
    );
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Failed to reorder mockups");
    res.status(500).json({ error: "internal_error", message: "Failed to reorder mockups" });
  }
});

export default router;
