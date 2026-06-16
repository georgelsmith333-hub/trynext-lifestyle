import { Router, type IRouter } from "express";
import { db, categoriesTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";
import { logActivity, getAdminId } from "../lib/activityLog";
import { redisCacheGet, redisCacheSet, redisCacheDel } from "../lib/redis";

const router: IRouter = Router();

// ── Redis cache key / TTL ─────────────────────────────────────────────────────
// Categories are near-static (change only via admin). 5-minute TTL is safe.
const CATS_CACHE_KEY = "trynex:categories";
const CATS_TTL_S = 300;

router.get("/categories", async (req, res) => {
  try {
    const cached = await redisCacheGet<{ categories: unknown[] }>(CATS_CACHE_KEY);
    if (cached) {
      res.set("X-Cache-Status", "HIT");
      res.json(cached);
      return;
    }
    const rows = await db
      .select({
        id: categoriesTable.id,
        name: categoriesTable.name,
        slug: categoriesTable.slug,
        description: categoriesTable.description,
        imageUrl: categoriesTable.imageUrl,
        productCount: categoriesTable.productCount,
      })
      .from(categoriesTable)
      .orderBy(categoriesTable.name);
    const categories = rows.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: c.imageUrl,
      productCount: c.productCount ?? 0,
    }));
    const payload = { categories };
    await redisCacheSet(CATS_CACHE_KEY, payload, CATS_TTL_S);
    res.set("X-Cache-Status", "MISS");
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "Failed to list categories");
    res.status(500).json({ error: "internal_error", message: "Failed to list categories" });
  }
});

function mapCategory(c: typeof categoriesTable.$inferSelect) {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    imageUrl: c.imageUrl,
    productCount: c.productCount ?? 0,
  };
}

router.post("/categories", requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, imageUrl } = req.body;
    if (!name || !slug) {
      res.status(400).json({ error: "validation_error", message: "name and slug are required" });
      return;
    }
    const [category] = await db.insert(categoriesTable).values({ name, slug, description, imageUrl }).returning();
    logActivity({ action: "create", entity: "category", entityId: category.id, entityName: category.name, after: category as unknown as Record<string, unknown>, adminId: getAdminId(req) });
    await redisCacheDel(CATS_CACHE_KEY);
    res.status(201).json(mapCategory(category));
  } catch (err) {
    req.log.error({ err }, "Failed to create category");
    res.status(500).json({ error: "internal_error", message: "Failed to create category" });
  }
});

router.put("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "validation_error", message: "Invalid id" });
      return;
    }
    const { name, slug, description, imageUrl } = req.body;
    const [beforeSnapshot] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ error: "validation_error", message: "No fields to update" });
      return;
    }
    const [category] = await db.update(categoriesTable).set(updateData).where(eq(categoriesTable.id, id)).returning();
    if (!category) {
      res.status(404).json({ error: "not_found", message: "Category not found" });
      return;
    }
    logActivity({ action: "update", entity: "category", entityId: id, entityName: category.name, before: (beforeSnapshot ?? null) as unknown as Record<string, unknown>, after: category as unknown as Record<string, unknown>, adminId: getAdminId(req) });
    await redisCacheDel(CATS_CACHE_KEY);
    res.json(mapCategory(category));
  } catch (err) {
    req.log.error({ err }, "Failed to update category");
    res.status(500).json({ error: "internal_error", message: "Failed to update category" });
  }
});

router.delete("/categories/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (Number.isNaN(id)) {
      res.status(400).json({ error: "validation_error", message: "Invalid id" });
      return;
    }
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(productsTable)
      .where(eq(productsTable.categoryId, id));
    if (Number(count) > 0) {
      res.status(409).json({
        error: "category_in_use",
        message: `Cannot delete category — ${count} product(s) are still linked to it. Move or remove those products first.`,
        productCount: Number(count),
      });
      return;
    }
    const [beforeSnap] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
    const [category] = await db.delete(categoriesTable).where(eq(categoriesTable.id, id)).returning();
    if (!category) {
      res.status(404).json({ error: "not_found", message: "Category not found" });
      return;
    }
    logActivity({ action: "delete", entity: "category", entityId: id, entityName: category.name, before: (beforeSnap ?? category) as unknown as Record<string, unknown>, adminId: getAdminId(req) });
    await redisCacheDel(CATS_CACHE_KEY);
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete category");
    res.status(500).json({ error: "internal_error", message: "Failed to delete category" });
  }
});

export default router;
