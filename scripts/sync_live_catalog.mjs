import fs from "node:fs";

const BASE = "https://trynext.shop";
const seedPath = new URL("../artifacts/api-server/add-trendy-products.ts", import.meta.url);
const source = fs.readFileSync(seedPath, "utf8");
const arrayStart = source.indexOf("const products = [");
const arrayEnd = source.indexOf("\n  ];", arrayStart);
if (arrayStart < 0 || arrayEnd < 0) throw new Error("Could not locate product definitions");
const rawArray = (source.slice(source.indexOf("[", arrayStart), arrayEnd).trimEnd() + "]")
  .replace(/catMap\[\"([^\"]+)\"\]/g, JSON.stringify("$1"));
const trendyProducts = Function(`return (${rawArray})`)();

const categorySeed = [
  { name: "T-Shirts", slug: "t-shirts", description: "Custom printed t-shirts for all occasions", imageUrl: "/images/cat-tshirt.png" },
  { name: "Hoodies", slug: "hoodies", description: "Premium quality hoodies with custom designs", imageUrl: "/images/cat-hoodie.png" },
  { name: "Mugs", slug: "mugs", description: "Personalized mugs perfect for gifts", imageUrl: "/images/cat-mug.png" },
  { name: "Caps", slug: "caps", description: "Stylish caps with custom embroidery", imageUrl: "/images/cat-cap.png" },
  { name: "Long Sleeves", slug: "long-sleeves", description: "Premium long sleeve shirts with custom designs", imageUrl: "/images/cat-longsleeve.png" },
  { name: "Water Bottles", slug: "water-bottles", description: "Durable bottles with custom prints", imageUrl: "/images/cat-bottle.png" },
  { name: "Custom Orders", slug: "custom-orders", description: "Special custom orders tailored to your needs", imageUrl: "/images/cat-tshirt.png" },
];

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
  if (!response.ok) throw new Error(`${options.method || "GET"} ${path} -> ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

const adminPassword = process.env.LIVE_ADMIN_PASSWORD;
if (!adminPassword) throw new Error("LIVE_ADMIN_PASSWORD is required");
const login = await request("/api/admin/login", {
  method: "POST",
  body: JSON.stringify({ password: adminPassword }),
});
if (!login.token) throw new Error("Production admin login did not return a token");
const auth = { Authorization: `Bearer ${login.token}` };

let categoryResponse = await request("/api/categories");
let categories = categoryResponse.categories || categoryResponse;
const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
for (const category of categorySeed) {
  if (!categoryBySlug.has(category.slug)) {
    const created = await request("/api/categories", { method: "POST", headers: auth, body: JSON.stringify(category) });
    const item = created.category || created;
    categoryBySlug.set(category.slug, item);
    console.log(`created category: ${category.slug}`);
  }
}

const existingResponse = await request("/api/products?limit=200");
const existing = existingResponse.products || [];
const existingSlugs = new Set(existing.map((p) => p.slug));
const pending = trendyProducts.filter((p) => !existingSlugs.has(p.slug)).map((p) => ({
  name: p.name,
  slug: p.slug,
  description: p.description,
  price: Number(p.price),
  discountPrice: p.discountPrice === undefined ? undefined : Number(p.discountPrice),
  categoryId: categoryBySlug.get(p.categoryId)?.id,
  imageUrl: p.imageUrl,
  sizes: p.categoryId === "mugs" || p.categoryId === "caps" || p.categoryId === "water-bottles" ? ["One Size"] : ["S", "M", "L", "XL", "XXL"],
  colors: ["White", "Black", "Navy", "Grey"],
  stock: 100,
  featured: Boolean(p.featured),
  customizable: true,
  tags: p.tags || [],
}));
const invalid = pending.filter((p) => !p.categoryId);
if (invalid.length) throw new Error(`Missing category IDs for: ${invalid.map((p) => p.slug).join(", ")}`);
console.log(`existing=${existing.length} pending=${pending.length} definitions=${trendyProducts.length}`);

for (let i = 0; i < pending.length; i += 25) {
  const chunk = pending.slice(i, i + 25);
  const result = await request("/api/products/bulk", { method: "POST", headers: auth, body: JSON.stringify({ products: chunk }) });
  console.log(`bulk ${i + 1}-${i + chunk.length}: ${JSON.stringify(result)}`);
}

const after = await request("/api/products?limit=200");
console.log(`final_product_count=${(after.products || []).length}`);
console.log(`new_product_slugs=${pending.map((p) => p.slug).join(",")}`);
