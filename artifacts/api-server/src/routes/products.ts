import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, productsTable, categoriesTable } from "@workspace/db";
import { eq, ilike, or, and, sql, desc, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/adminAuth";
import { logActivity, getAdminId } from "../lib/activityLog";
import { redisCacheGet, redisCacheSet } from "../lib/redis";
import { pingSitemaps } from "../lib/sitemapPing";

// ── Zod validation schemas ────────────────────────────────────────────────
const moneyValue = z.union([z.string(), z.number()])
  .transform(v => Number(v))
  .refine(Number.isFinite, "Must be a valid number")
  .refine(v => v >= 0, "Must not be negative");

const ProductFieldsSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255),
  description: z.string().optional(),
  price: moneyValue,
  discountPrice: moneyValue.optional(),
  categoryId: z.number().int().positive().optional(),
  imageUrl: z.string().optional(),
  images: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  colors: z.array(z.string()).optional(),
  colorVariants: z.array(z.object({ name: z.string(), inStock: z.boolean() })).optional(),
  variants: z.array(z.object({
    id: z.string().min(1).max(80),
    name: z.string().min(1).max(120),
    price: moneyValue,
    customizationFee: moneyValue.optional(),
    stock: z.number().int().min(0),
    sizes: z.array(z.string().max(30)).optional(),
    colors: z.array(z.string().max(50)).optional(),
    inStockColors: z.array(z.string().max(50)).optional(),
    mockupKey: z.string().max(120).optional(),
    oneSize: z.boolean().optional(),
    active: z.boolean().optional(),
  })).optional(),
  stock: z.number().int().min(0, "Stock cannot be negative"),
  featured: z.boolean().optional(),
  customizable: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
});

const ProductCreateSchema = ProductFieldsSchema.superRefine((value, ctx) => {
  if (value.discountPrice !== undefined && value.discountPrice > value.price) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountPrice"],
      message: "Discount price cannot exceed the regular price",
    });
  }
});

const ProductUpdateSchema = ProductFieldsSchema.partial().extend({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(255).optional(),
  price: moneyValue.optional(),
  discountPrice: z.union([moneyValue, z.null()]).optional(),
  stock: z.number().int().min(0).optional(),
}).superRefine((value, ctx) => {
  if (
    value.discountPrice !== undefined &&
    value.discountPrice !== null &&
    value.price !== undefined &&
    value.discountPrice > value.price
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountPrice"],
      message: "Discount price cannot exceed the regular price",
    });
  }
});

const router: IRouter = Router();

// ── Product list cache ────────────────────────────────────────────────────────
// Cache simple (no-search) paginated product listings for 60 s.
// A generation prefix lets mutations invalidate the whole product cache with
// one replicated write instead of thousands of individual REST deletes.
const PROD_TTL_S = 60;
const PRODUCT_CACHE_VERSION_KEY = "trynext:products:version";
const PRODUCT_VERSION_TTL_S = 24 * 60 * 60;

async function getProductCacheVersion(): Promise<string> {
  return (await redisCacheGet<string>(PRODUCT_CACHE_VERSION_KEY)) ?? "1";
}

async function productCacheKey(params: Record<string, string | undefined>): Promise<string | null> {
  // Never cache search queries — they are unique per user input
  if (params.search) return null;
  const cat  = params.categoryId ?? "all";
  const feat = params.featured ?? "false";
  const custom = params.customizable ?? "false";
  const pg   = params.page ?? "1";
  const lim  = params.limit ?? "12";
  const srt  = params.sort ?? "newest";
  const version = await getProductCacheVersion();
  return `trynext:products:${version}:${cat}:${feat}:${custom}:${srt}:pg${pg}:lim${lim}`;
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
  // Old generation keys expire naturally; the version write is replicated to
  // every configured backend and also updates the process-local fallback.
  await redisCacheSet(PRODUCT_CACHE_VERSION_KEY, String(Date.now()), PRODUCT_VERSION_TTL_S);
}

function mapProduct(p: any, categoryName?: string | null) {
  const category = String(categoryName ?? "").toLowerCase();
  const oneSizeCategory = category.includes("mug") || category.includes("cap") || category.includes("bottle");
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
    sizes: oneSizeCategory ? [] : (p.sizes ?? []),
    colors: p.colors ?? [],
    colorVariants: Array.isArray(p.colorVariants) ? p.colorVariants : [],
    stock: p.stock,
    featured: p.featured ?? false,
    rating: p.rating ? parseFloat(p.rating) : 0,
    reviewCount: p.reviewCount ?? 0,
    customizable: p.customizable ?? false,
    tags: p.tags ?? [],
    variants: Array.isArray(p.variants) ? p.variants : [],
  };
}

router.get("/products", async (req, res) => {
  try {
    const { categoryId: rawCategoryId, category, search, featured, customizable, page = "1", limit = "12", sort } = req.query;
    // Accept both the canonical API name and the storefront-friendly alias.
    const categoryId = rawCategoryId ?? category;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 12));
    const offset = (pageNum - 1) * limitNum;

    // Check cache for non-search requests
    const cacheKey = await productCacheKey({
      categoryId: categoryId as string | undefined,
      search: search as string | undefined,
      featured: featured as string | undefined,
      customizable: customizable as string | undefined,
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
      const rawCategory = String(categoryId).trim();
      const numericCategoryId = Number(rawCategory);
      if (Number.isInteger(numericCategoryId) && numericCategoryId > 0) {
        conditions.push(eq(productsTable.categoryId, numericCategoryId));
      } else {
        // Storefront links use canonical category slugs. Resolve them server-side
        // instead of silently ignoring a non-numeric `category` query parameter.
        const [categoryRow] = await db
          .select({ id: categoriesTable.id })
          .from(categoriesTable)
          .where(ilike(categoriesTable.slug, rawCategory))
          .limit(1);
        // An unknown category must not silently return the entire catalogue.
        conditions.push(eq(productsTable.categoryId, categoryRow?.id ?? -1));
      }
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
    const version = await getProductCacheVersion();
    const cacheKey = `trynext:products:featured:${version}:${limit}`;
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
    const parsed = ProductCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "validation_error",
        message: "Invalid product data",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }
    const { price, discountPrice, ...rest } = parsed.data;
    const [product] = await db.insert(productsTable).values({
      ...rest,
      price: String(price),
      discountPrice: discountPrice !== undefined ? String(discountPrice) : null,
      colorVariants: rest.colorVariants ?? [],
      variants: rest.variants ?? [],
    }).returning();

    if (rest.categoryId) {
      await db.execute(sql`UPDATE categories SET product_count = product_count + 1 WHERE id = ${rest.categoryId}`);
    }

    logActivity({ action: "create", entity: "product", entityId: product.id, entityName: product.name, after: product as unknown as Record<string, unknown>, adminId: getAdminId(req) });
    await invalidateProductCache();
    pingSitemaps();
    res.status(201).json(mapProduct(product));
  } catch (err: any) {
    req.log.error({ err }, "Failed to create product");
    if (err?.code === "23505") {
      res.status(409).json({ error: "duplicate", message: "A product with that slug already exists" });
      return;
    }
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
    const parsed = ProductUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "validation_error",
        message: "Invalid product data",
        details: parsed.error.flatten().fieldErrors,
      });
      return;
    }

    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id));
    if (!existing) {
      res.status(404).json({ error: "not_found", message: "Product not found" });
      return;
    }
    const oldCategoryId = existing.categoryId;

    const updateData: any = { updatedAt: new Date() };
    const body = parsed.data;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.slug !== undefined) updateData.slug = body.slug;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.price !== undefined) updateData.price = String(body.price);
    if (body.discountPrice !== undefined) updateData.discountPrice = body.discountPrice === null ? null : String(body.discountPrice);
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId;
    if (body.imageUrl !== undefined) updateData.imageUrl = body.imageUrl;
    if (body.images !== undefined) updateData.images = body.images;
    if (body.sizes !== undefined) updateData.sizes = body.sizes;
    if (body.colors !== undefined) updateData.colors = body.colors;
    if (body.colorVariants !== undefined) updateData.colorVariants = body.colorVariants;
    if (body.variants !== undefined) updateData.variants = body.variants;
    if (body.stock !== undefined) updateData.stock = body.stock;
    if (body.featured !== undefined) updateData.featured = body.featured;
    if (body.customizable !== undefined) updateData.customizable = body.customizable;
    if (body.tags !== undefined) updateData.tags = body.tags;

    const [product] = await db.update(productsTable).set(updateData).where(eq(productsTable.id, id)).returning();

    const newCategoryId = body.categoryId !== undefined ? body.categoryId : oldCategoryId;
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
    pingSitemaps();
    res.json(mapProduct(product));
  } catch (err: any) {
    req.log.error({ err }, "Failed to update product");
    if (err?.code === "23505") {
      res.status(409).json({ error: "duplicate", message: "A product with that slug already exists" });
      return;
    }
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
          variants: Array.isArray(p.variants) ? p.variants : [],
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

/* ── Live Viewer Count ───────────────────────────────────────────────────────
   Simple in-memory viewer tracker. Clients send a heartbeat every 30s.
   Viewers expire automatically after 90s without a heartbeat.
   No DB needed — counts are ephemeral and decorative.
   ─────────────────────────────────────────────────────────────────────────── */
const viewerMap = new Map<number, Map<string, number>>(); // productId → {viewerId → expiresAt}
const VIEWER_TTL_MS = 90_000;

function pruneViewers(productId: number) {
  const viewers = viewerMap.get(productId);
  if (!viewers) return;
  const now = Date.now();
  for (const [id, exp] of viewers) if (exp < now) viewers.delete(id);
  if (viewers.size === 0) viewerMap.delete(productId);
}

router.put("/products/:id/viewers", (req, res) => {
  const pid = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(pid) || pid <= 0) { res.status(400).json({ count: 1 }); return; }
  const viewerId = String(req.body?.viewerId || "").slice(0, 64) || `anon-${Math.random().toString(36).slice(2)}`;
  pruneViewers(pid);
  if (!viewerMap.has(pid)) viewerMap.set(pid, new Map());
  viewerMap.get(pid)!.set(viewerId, Date.now() + VIEWER_TTL_MS);
  res.json({ count: viewerMap.get(pid)!.size, viewerId });
});

router.get("/products/:id/viewers", (req, res) => {
  const pid = parseInt(String(req.params.id), 10);
  if (!Number.isFinite(pid) || pid <= 0) { res.json({ count: 1 }); return; }
  pruneViewers(pid);
  res.json({ count: Math.max(1, viewerMap.get(pid)?.size ?? 1) });
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
