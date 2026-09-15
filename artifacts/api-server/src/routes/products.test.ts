import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import productsRouter from "./products";
import request from "supertest";

const mockRedisDel = vi.fn();
const mockRedisSet = vi.fn();
const mockRedisGet = vi.fn().mockResolvedValue(null);
const mockLogActivity = vi.fn();
const mockGetAdminId = vi.fn().mockReturnValue(1);

let mockProductRow: any = null;

vi.mock("../middlewares/adminAuth", () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../lib/activityLog", () => ({
  logActivity: (...args: any[]) => mockLogActivity(...args),
  getAdminId: () => mockGetAdminId(),
}));

vi.mock("../lib/redis", () => ({
  redisCacheGet: (...args: any[]) => mockRedisGet(...args),
  redisCacheSet: (...args: any[]) => mockRedisSet(...args),
  redisCacheDel: (...args: any[]) => mockRedisDel(...args),
}));

vi.mock("../lib/sitemapPing", () => ({
  pingSitemaps: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@workspace/db", () => ({
  db: {
    select: vi.fn().mockImplementation(() => ({
      from: vi.fn().mockImplementation(() => ({
        where: vi.fn().mockImplementation(() => Promise.resolve(mockProductRow ? [mockProductRow] : [])),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        returning: vi.fn().mockResolvedValue(mockProductRow ? [mockProductRow] : []),
      })),
    })),
    insert: vi.fn().mockImplementation(() => ({
      values: vi.fn().mockImplementation((vals: any) => {
        mockProductRow = { id: 1, ...vals, createdAt: new Date(), updatedAt: new Date(), rating: 0, reviewCount: 0 };
        return { returning: vi.fn().mockResolvedValue([mockProductRow]) };
      }),
    })),
    update: vi.fn().mockImplementation(() => ({
      set: vi.fn().mockImplementation((vals: any) => ({
        where: vi.fn().mockImplementation(() => ({
          returning: vi.fn().mockResolvedValue([{ ...mockProductRow, ...vals }]),
        })),
      })),
    })),
    delete: vi.fn().mockImplementation(() => ({
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    })),
    execute: vi.fn().mockResolvedValue([]),
  },
  productsTable: {
    id: { name: "id" },
    name: { name: "name" },
    slug: { name: "slug" },
    description: { name: "description" },
    price: { name: "price" },
    discountPrice: { name: "discount_price" },
    categoryId: { name: "category_id" },
    imageUrl: { name: "image_url" },
    images: { name: "images" },
    sizes: { name: "sizes" },
    colors: { name: "colors" },
    colorVariants: { name: "color_variants" },
    stock: { name: "stock" },
    featured: { name: "featured" },
    customizable: { name: "customizable" },
    tags: { name: "tags" },
    rating: { name: "rating" },
    reviewCount: { name: "review_count" },
    createdAt: { name: "created_at" },
    updatedAt: { name: "updated_at" },
  },
  categoriesTable: {
    id: { name: "id" },
    name: { name: "name" },
  },
}));

const app = express();
app.use(express.json());
app.use((req, _res, next) => {
  req.log = { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } as any;
  next();
});
app.use("/api", productsRouter);

describe("Products API", () => {
  beforeEach(() => {
    mockProductRow = null;
    mockRedisDel.mockClear();
    mockRedisSet.mockClear();
    mockRedisGet.mockClear();
    mockLogActivity.mockClear();
  });

  it("POST /api/products validates required fields with Zod", async () => {
    const res = await request(app).post("/api/products").send({ description: "Missing required fields" });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
    expect(res.body.details).toBeDefined();
  });

  it("POST /api/products rejects negative stock", async () => {
    const res = await request(app).post("/api/products").send({
      name: "Test Shirt",
      slug: "test-shirt",
      price: 599,
      stock: -1,
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });

  it("POST /api/products creates a product with valid data", async () => {
    const res = await request(app).post("/api/products").send({
      name: "Test Shirt",
      slug: "test-shirt",
      price: 599,
      stock: 50,
      categoryId: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Test Shirt");
    expect(res.body.price).toBe(599);
  });

  it("PUT /api/products/:id validates price coercion", async () => {
    mockProductRow = { id: 1, name: "Old", slug: "old", price: "400", stock: 10 };
    const res = await request(app).put("/api/products/1").send({ price: "799" });
    expect(res.status).toBe(200);
    expect(res.body.price).toBe(799);
  });

  it("PUT /api/products/:id rejects negative stock", async () => {
    const res = await request(app).put("/api/products/1").send({ stock: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("validation_error");
  });
});
