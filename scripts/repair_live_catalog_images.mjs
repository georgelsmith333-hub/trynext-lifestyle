import fs from "node:fs";
import path from "node:path";

const BASE = "https://trynext.shop";
const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const seedPath = path.join(repoRoot, "artifacts/api-server/add-trendy-products.ts");
const assetRoot = path.join(repoRoot, "artifacts/trynex-storefront/public");
const source = fs.readFileSync(seedPath, "utf8");
const arrayStart = source.indexOf("const products = [");
const arrayEnd = source.indexOf("\n  ];", arrayStart);
if (arrayStart < 0 || arrayEnd < 0) throw new Error("Could not locate product definitions");
const rawArray = (source.slice(source.indexOf("[", arrayStart), arrayEnd).trimEnd() + "]")
  .replace(/catMap\[\"([^\"]+)\"\]/g, JSON.stringify("$1"));
const desired = Function(`return (${rawArray})`)();

for (const product of desired) {
  const localPath = path.join(assetRoot, product.imageUrl.replace(/^\//, ""));
  if (!fs.existsSync(localPath)) throw new Error(`Missing local asset for ${product.slug}: ${product.imageUrl}`);
}

async function request(urlPath, options = {}) {
  const response = await fetch(`${BASE}${urlPath}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
  if (!response.ok) throw new Error(`${options.method || "GET"} ${urlPath} -> ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

const password = process.env.LIVE_ADMIN_PASSWORD;
if (!password) throw new Error("LIVE_ADMIN_PASSWORD is required");
const login = await request("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
if (!login.token) throw new Error("Production admin login did not return a token");
const auth = { Authorization: `Bearer ${login.token}` };
const response = await request("/api/products?limit=200&sort=oldest&repair_assets=20260812");
const existing = response.products || [];
const bySlug = new Map(existing.map((p) => [p.slug, p]));
let changed = 0;
let skipped = 0;
for (const product of desired) {
  const live = bySlug.get(product.slug);
  if (!live) { skipped++; console.log(`missing_live_product=${product.slug}`); continue; }
  const nextImage = product.imageUrl;
  if (live.imageUrl === nextImage && Array.isArray(live.images) && live.images.length === 1 && live.images[0] === nextImage) {
    continue;
  }
  await request(`/api/products/${live.id}`, {
    method: "PUT",
    headers: auth,
    body: JSON.stringify({ imageUrl: nextImage, images: [nextImage] }),
  });
  changed++;
  console.log(`updated=${product.slug} image=${nextImage}`);
}
const after = await request("/api/products?limit=200&sort=oldest&repair_assets_verify=20260812");
const remainingBroken = (after.products || [])
  .filter((p) => desired.some((d) => d.slug === p.slug))
  .filter((p) => !p.imageUrl || !p.imageUrl.startsWith("/assets/products/") || p.imageUrl === "/images/product-placeholder.svg");
console.log(`desired=${desired.length} live=${existing.length} changed=${changed} missing_live=${skipped} remaining_broken=${remainingBroken.length}`);
if (remainingBroken.length) console.log(`broken_slugs=${remainingBroken.map((p) => p.slug).join(",")}`);
