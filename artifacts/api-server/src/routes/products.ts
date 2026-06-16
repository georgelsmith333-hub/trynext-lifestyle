import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, or, and, sql, desc, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";
import { logActivity, getAdminId } from "../lib/activityLog";
import { redisCacheGet, redisCacheSet, redisCacheDel } from "../lib/redis";

const router: IRouter = Router();

// ── Product list cache ────────────────────────────────────────────────────────
// Cache simple (no-search) paginated product listings for 60 s.
// Key encodes all filter dimensions so different queries don't collide.
const PROD_TTL_S = 60;
function productCacheKey(params: Record<string, string | undefined>): string | null {
  // Never cache search queries — they are unique per user input
  if (params.search) return null;
  const cat  = params.categoryId ?? "all";
  const feat = params.featured ?? "false";
  const pg   = params.page ?? "1";
  const lim  = params.limit ?? "12";
  const srt  = params.sort ?? "newest";
  return `trynex:products:${cat}:${feat}:${srt}:pg${pg}:lim${lim}`;
}

// Map sort param to Drizzle orderBy expression
function buildProductOrder(sort: string | undefined) {
  switch (sort) {
    case "price_asc":    return [asc(productsTable.price),     desc(productsTable.createdAt)];
    case "price_desc":   return [desc(productsTable.price),    desc(productsTable.createdAt)];
    case "name_asc":     return [asc(productsTable.name),      desc(productsTable.createdAt)];
    case "name_desc":    return [desc(productsTable.name),     desc(productsTable.createdAt)];
    case "oldest":       return [asc(productsTable.createdAt)];
    case "featured":     return [desc(productsTable.featured), desc(productsTable.createdAt)];
    case "newest":
    default:             return [desc(productsTable.createdAt)];
  }
}

// Invalidate all product list cache entries when any product is mutated.
async function invalidateProductCache(): Promise<void> {
  // Bust all permutations of the cache key space including all sort variants,
  // category IDs up to 20, pages up to 5, and common limit values.
  const sorts = ["newest", "oldest", "price_asc", "price_desc", "name_asc", "name_desc", "featured"];
  const cats  = ["all", ...Array.from({ length: 20 }, (_, i) => String(i + 1))];
  const keys: string[] = [];
  for (const cat of cats)
    for (const feat of ["false", "true"])
      for (const srt of sorts)
        for (const pg of ["1", "2", "3", "4", "5"])
          for (const lim of ["12", "24", "48", "100"])
            keys.push(`trynex:products:${cat}:${feat}:${srt}:pg${pg}:lim${lim}`);
  await Promise.allSettled(keys.map(k => redisCacheDel(k)));
}

function mapProduct(p: any, categoryName?: string | null) {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    description: p.description,
    price: parseFloat(p.price),
    discountPrice: p.discountPrice ? parseFloat(p.discountPrice) : undefined,
    categoryId: p.categoryId,
    categoryName: categoryName ?? undefined,
    imageUrl: p.imageUrl,
    images: p.images ?? [],
    sizes: p.sizes ?? [],
    colors: p.colors ?? [],
    stock: p.stock,
    featured: p.featured ?? false,
    rating: p.rating ? parseFloat(p.rating) : 0,
    reviewCount: p.reviewCount ?? 0,
    customizable: p.customizable ?? false,
    tags: p.tags ?? [],
  };
}

router.get("/products", async (req, res) => {
  try {
    const { categoryId, search, featured, customizable, page = "1", limit = "12", sort } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    // Check cache for non-search requests
    const cacheKey = productCacheKey({
      categoryId: categoryId as string | undefined,
      search: search as string | undefined,
      featured: featured as string | undefined,
      page: page as string,
      limit: limit as string,
      sort: sort as string | undefined,
    });
    if (cacheKey) {
      const cached = await redisCacheGet<Record<string, unknown>>(cacheKey);
      if (cached) {
        res.set("X-Cache-Status", "HIT");
        res.json(cached);
        return;
      }
    }

    const conditions: any[] = [];
    if (categoryId) {
      const catId = parseInt(categoryId as string, 10);
      if (Number.isFinite(catId)) conditions.push(eq(productsTable.categoryId, catId));
    }
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(productsTable.name, pattern),
          ilike(productsTable.description, pattern),
          ilike(sql`${productsTable.tags}::text`, pattern),
        )!,
      );
    }
    if (featured === "true") conditions.push(eq(productsTable.featured, true));
    if (customizable === "true") conditions.push(eq(productsTable.customizable, true));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const orderBy = buildProductOrder(sort as string | undefined);
    const [products, countResult] = await Promise.all([
      db.select().from(productsTable).where(where).orderBy(...orderBy).limit(limitNum).offset(offset),
      db.select({ count: sql<number>`count(*)` }).from(productsTable).where(where),
    ]);

    const total = Number(countResult[0]?.count ?? 0);

    const categoryIds = [...new Set(products.map(p => p.categoryId).filter(Boolean))];
    const categories = categoryIds.length > 0
      ? await db.select({ id: categoriesTable.id, name: categoriesTable.name }).from(categoriesTable).where(sql`id = ANY(ARRAY[${sql.join(categoryIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
      : [];
    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

    const payload = {
      products: products.map(p => mapProduct(p, p.categoryId ? catMap[p.categoryId] : null)),
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    };

    if (cacheKey) {
      await redisCacheSet(cacheKey, payload, PROD_TTL_S);
      res.set("X-Cache-Status", "MISS");
    }
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "Failed to list products");
    res.status(500).json({ error: "internal_error", message: "Failed to list products" });
  }
});

/** GET /api/products/featured — shortcut for ?featured=true&sort=featured */
router.get("/products/featured", async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string || "12", 10)));
    const cacheKey = `products:featured:${limit}`;
    const cached = await redisCacheGet<Record<string, unknown>>(cacheKey);
    if (cached) { res.set("X-Cache-Status", "HIT"); res.json(cached); return; }

    const products = await db.select().from(productsTable)
      .where(eq(productsTable.featured, true))
      .orderBy(desc(productsTable.createdAt))
      .limit(limit);

    const categoryIds = [...new Set(products.map(p => p.categoryId).filter(Boolean))];
    const categories = categoryIds.length > 0
      ? await db.select({ id: categoriesTable.id, name: categoriesTable.name })
          .from(categoriesTable)
          .where(sql`id = ANY(ARRAY[${sql.join(categoryIds.map(id => sql`${id}`), sql`, `)}]::int[])`)
      : [];
    const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]));

    const payload = { products: products.map(p => mapProduct(p, p.categoryId ? catMap[p.categoryId] : null)) };
    await redisCacheSet(cacheKey, payload, PROD_TTL_S);
    res.set("X-Cache-Status", "MISS");
    res.json(payload);
  } catch (err) {
    req.log.error({ err }, "Failed to list featured products");
    res.status(500).json({ error: "internal_error", message: "Failed to list featured products" });
  }
});

router.get("/products/:id", async (req, res) => {
  try {
    const idOrSlug = req.params.id;
    const isFullyNumeric = /^\d+$/.test(idOrSlug);
    const numericId = isFullyNumeric ? parseInt(idOrSlug, 10) : NaN;
    let product: any;

    if (isFullyNumeric && !isNaN(numericId)) {
      [product] = await db.select().from(productsTable).where(eq(productsTable.id, numericId));
    }
    if (!product) {
      [product] = await db.select().from(productsTable).where(eq(productsTable.slug, idOrSlug));
    }
    if (!product) {
      res.status(404).json({ error: "not_found", message: "Product not found" });
      return;
    }
    let categoryName: string | null = null;
    if (product.categoryId) {
      const [cat] = await db.select({ name: categoriesTable.name }).from(categoriesTable).where(eq(categoriesTable.id, product.categoryId));
      categoryName = cat?.name ?? null;
    }
    res.json(mapProduct(product, categoryName));
  } catch (err) {
    req.log.error({ err }, "Failed to get product");
    res.status(500).json({ error: "internal_error", message: "Failed to get product" });
  }
});

router.post("/products", requireAdmin, async (req, res) => {
  try {
    const { name, slug, description, price, discountPrice, categoryId, imageUrl, images, sizes, colors, colorVariants, stock, featured, customizable, tags } = req.body;
    if (!name || !slug || price === undefined || stock === undefined) {
      res.status(400).json({ error: "validation_error", message: "name, slug, price, stock are required" });
      return;
    }
    const [product] = await db.insert(productsTable).values({
      name, slug, description,
      price: price.toString(),
      discountPrice: discountPrice?.toString(),
      categoryId,
      imageUrl, images, sizes, colors,
      colorVariants: colorVariants ?? [],
      stock, featured, customizable, tags,
    }).returning();

    if (categoryId) {
      await db.execute(sql`UPDATE categories SET product_count = product_count + 1 WHERE id = ${categoryId}`);
    }

    logActivity({ action: "create", entity: "product", entityId: product.id, entityName: product.name, after: product as unknown as Record<string, unknown>, adminId: getAdminId(req) });
    await invalidateProductCache();
    res.status(201).json(mapProduct(product));
  } catch (err) {
    req.log.error({ err }, "Failed to create product");
    res.status(500).json({ error: "internal_error", message: "Failed to create product" });
  }
});

router.put("/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "validation_error", message: "Invalid product id" });
      return;
    }
    const { name, slug, description, price, discountPrice, categoryId, imageUrl, images, sizes, colors, colorVariants, stock, featured, customizable, tags } = req.body;

    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "not_found", message: "Product not found" });
      return;
    }
    const oldCategoryId = existing.categoryId;

    const updateData: any = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name;
    if (slug !== undefined) updateData.slug = slug;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price.toString();
    if (discountPrice !== undefined) updateData.discountPrice = discountPrice?.toString() ?? null;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (images !== undefined) updateData.images = images;
    if (sizes !== undefined) updateData.sizes = sizes;
    if (colors !== undefined) updateData.colors = colors;
    if (colorVariants !== undefined) updateData.colorVariants = colorVariants;
    if (stock !== undefined) updateData.stock = stock;
    if (featured !== undefined) updateData.featured = featured;
    if (customizable !== undefined) updateData.customizable = customizable;
    if (tags !== undefined) updateData.tags = tags;

    const [product] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, id)).returning();

    const newCategoryId = categoryId !== undefined ? categoryId : oldCategoryId;
    if (oldCategoryId !== newCategoryId) {
      if (oldCategoryId) {
        await db.execute(sql`UPDATE categories SET product_count = GREATEST(product_count - 1, 0) WHERE id = ${oldCategoryId}`);
      }
      if (newCategoryId) {
        await db.execute(sql`UPDATE categories SET product_count = product_count + 1 WHERE id = ${newCategoryId}`);
      }
    }

    logActivity({ action: "update", entity: "product", entityId: id, entityName: product.name, before: existing as unknown as Record<string, unknown>, after: product as unknown as Record<string, unknown>, adminId: getAdminId(req) });
    await invalidateProductCache();
    res.json(mapProduct(product));
  } catch (err) {
    req.log.error({ err }, "Failed to update product");
    res.status(500).json({ error: "internal_error", message: "Failed to update product" });
  }
});

router.delete("/products/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "validation_error", message: "Invalid product id" });
      return;
    }
    const [beforeSnapshot] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    const [product] = await db.delete(productsTable).where(eq(productsTable.id, id)).returning();
    if (!product) {
      res.status(404).json({ error: "not_found", message: "Product not found" });
      return;
    }
    if (product.categoryId) {
      await db.execute(sql`UPDATE categories SET product_count = GREATEST(product_count - 1, 0) WHERE id = ${product.categoryId}`);
    }
    logActivity({ action: "delete", entity: "product", entityId: id, entityName: product.name, before: (beforeSnapshot ?? product) as unknown as Record<string, unknown>, adminId: getAdminId(req) });
    await invalidateProductCache();
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete product");
    res.status(500).json({ error: "internal_error", message: "Failed to delete product" });
  }
});

router.post("/products/bulk", requireAdmin, async (req, res) => {
  try {
    const { products: bulkProducts } = req.body;
    if (!Array.isArray(bulkProducts) || bulkProducts.length === 0) {
      res.status(400).json({ error: "validation_error", message: "products array is required" });
      return;
    }

    if (bulkProducts.length > 200) {
      res.status(400).json({ error: "validation_error", message: "Maximum 200 products per upload" });
      return;
    }

    const results: { success: number; failed: number; errors: string[] } = { success: 0, failed: 0, errors: [] };

    for (let i = 0; i < bulkProducts.length; i++) {
      const p = bulkProducts[i];
      try {
        if (!p.name || !p.slug || p.price === undefined) {
          results.failed++;
          results.errors.push(`Row ${i + 1}: name, slug, price are required`);
          continue;
        }

        const [product] = await db.insert(productsTable).values({
          name: String(p.name).trim(),
          slug: String(p.slug).trim(),
          description: p.description || null,
          price: String(p.price),
          discountPrice: p.discountPrice ? String(p.discountPrice) : null,
          categoryId: p.categoryId ? parseInt(String(p.categoryId), 10) : null,
          imageUrl: p.imageUrl || null,
          images: [],
          sizes: Array.isArray(p.sizes) ? p.sizes : (p.sizes ? String(p.sizes).split(/[,;]/).map((s: string) => s.trim()).filter(Boolean) : []),
          colors: Array.isArray(p.colors) ? p.colors : (p.colors ? String(p.colors).split(/[,;]/).map((s: string) => s.trim()).filter(Boolean) : []),
          stock: parseInt(String(p.stock || 0), 10),
          featured: p.featured === true || p.featured === 'true',
          customizable: p.customizable === true || p.customizable === 'true',
          tags: [],
        }).returning();

        if (product.categoryId) {
          await db.execute(sql`UPDATE categories SET product_count = product_count + 1 WHERE id = ${product.categoryId}`);
        }
        results.success++;
      } catch (err: any) {
        results.failed++;
        results.errors.push(`Row ${i + 1} (${p.name || 'unknown'}): ${err.message?.includes('unique') ? 'duplicate slug' : 'database error'}`);
      }
    }

    await invalidateProductCache();
    res.status(201).json(results);
  } catch (err) {
    req.log.error({ err }, "Failed to bulk create products");
    res.status(500).json({ error: "internal_error", message: "Bulk upload failed" });
  }
});

/** Toggle featured flag on a product — used by Admin Visual Designer */
router.patch("/admin/products/:id/featured", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ error: "validation_error", message: "Invalid product id" });
      return;
    }
    const { featured } = req.body as { featured?: boolean };
    if (typeof featured !== "boolean") {
      res.status(400).json({ error: "validation_error", message: "featured must be a boolean" });
      return;
    }
    const [updated] = await db.update(productsTable)
      .set({ featured, updatedAt: new Date() })
      .where(eq(productsTable.id, id))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "not_found", message: "Product not found" });
      return;
    }
    await invalidateProductCache();
    res.json({ id: updated.id, featured: updated.featured });
  } catch (err) {
    req.log.error({ err }, "Failed to toggle product featured flag");
    res.status(500).json({ error: "internal_error", message: "Failed to toggle featured" });
  }
});

export default router;
