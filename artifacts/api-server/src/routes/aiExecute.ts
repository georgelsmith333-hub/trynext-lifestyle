import { Router, type IRouter } from "express";
import { requireAdmin } from "../middlewares/adminAuth";
import {
  db,
  productsTable,
  ordersTable,
  promoCodesTable,
  categoriesTable,
  settingsTable,
} from "@workspace/db";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { logActivity, getAdminId } from "../lib/activityLog";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const POLLIN_TEXT_URL = "https://text.pollinations.ai/openai";

const COMMAND_PARSER_SYSTEM = `You are a strict JSON command parser for TryNex Lifestyle admin panel.
Parse the natural language admin command into ONE of these JSON action objects.
Return ONLY valid JSON — no markdown, no explanation, no code fences.

Supported actions:
1.  { "action": "create_product", "name": string, "price": number, "category"?: string, "description"?: string }
2.  { "action": "update_order_status", "orderId": number, "status": "pending"|"processing"|"shipped"|"delivered"|"cancelled" }
3.  { "action": "create_promo_code", "code": string, "discountType": "percentage"|"fixed", "discountValue": number, "minOrder"?: number, "expiresAt"?: "YYYY-MM-DD"|null, "maxUses"?: number }
4.  { "action": "delete_promo_code", "code": string }
5.  { "action": "feature_product", "name": string, "featured": boolean }
6.  { "action": "update_product_price", "name": string, "price": number }
7.  { "action": "list_products", "search"?: string, "limit"?: number }
8.  { "action": "delete_product", "name": string }
9.  { "action": "find_order", "orderId"?: number, "customerName"?: string, "status"?: string }
10. { "action": "update_product_description", "name": string, "description": string }
11. { "action": "update_product_stock", "name": string, "stock": number }
12. { "action": "seo_advice", "topic": string }
13. { "action": "flush_cache" }
14. { "action": "check_health" }
15. { "action": "test_telegram" }
16. { "action": "trigger_deploy" }
17. { "action": "unknown", "reason": string }

Rules:
- BDT prices: extract number only (e.g. "৳899" → 899, "1200 taka" → 1200, "tk 500" → 500)
- "ship"/"shipping" → "shipped"; "deliver" → "delivered"; "cancel" → "cancelled"; "process" → "processing"
- "remove"/"delete" promo → delete_promo_code
- "highlight"/"promote"/"make featured" → feature_product with featured: true
- "unfeature"/"remove from featured" → feature_product with featured: false
- orderId must be a plain number extracted from text like "order 145", "#145", "order number 145"
- "show/list/get products" or "what products do we have" → list_products
- "search products for X" → list_products with search=X
- "delete/remove product X" → delete_product
- "find order by customer X" → find_order with customerName
- "update description of X" → update_product_description
- "set stock/inventory of X to N" → update_product_stock
- "how to rank on google" / "SEO tips" / "improve ranking" → seo_advice
- "flush cache" / "clear cache" → flush_cache
- "check health" / "system status" → check_health
- "test telegram" / "send telegram test" → test_telegram
- "trigger deploy" / "redeploy" / "deploy now" → trigger_deploy
- Return ONLY a JSON object.`;

function getSEOAdvice(topic: string): string {
  const t = topic.toLowerCase();

  if (t.includes("trynex") || t.includes("brand") || t.includes("name") || t.includes("search")) {
    return `## Getting "TryNex" to Rank on Google

**1. Google Search Console (Most Important)**
- Go to [search.google.com/search-console](https://search.google.com/search-console) and add \`trynexshop.com\`
- Verify ownership by adding the Google Site Verification meta tag in Admin → Settings → SEO
- Submit your sitemap: \`https://trynexshop.com/sitemap.xml\`

**2. Brand Name Signals**
- Your site title already includes "TryNex Lifestyle" — good ✓
- Ensure your Google Business Profile is set up at [business.google.com](https://business.google.com)
- Get your brand mentioned on Bangladeshi fashion/lifestyle blogs

**3. Backlinks (Most Effective)**
- Register on local directories: Bikroy.com, Shajgoj, local BD directories
- Ask happy customers to mention TryNex on social media
- Post in Facebook groups: Custom T-shirts Bangladesh, Corporate Gifts BD

**4. Content Strategy**
- Publish 2 blog posts/week with "TryNex" in headings
- Create a dedicated "About TryNex" page at \`/about\` with full brand story
- Build social proof: Facebook page, Instagram with consistent branding

**5. Technical**
- Ensure \`https://trynexshop.com\` is live and fast
- All pages have unique title tags with "TryNex" prefix
- Mobile-friendly design ✓ (already done)

Google typically takes **4–12 weeks** to index new brand searches after you've done the above steps.`;
  }

  if (t.includes("keyword") || t.includes("ranking") || t.includes("rank")) {
    return `## Keyword Ranking Tips for TryNex

**High-Priority Keywords to Target:**
- "custom t-shirt Bangladesh" — high volume, commercial
- "কাস্টম গিফট বাংলাদেশ" — Bangla searches growing fast
- "custom hoodie Dhaka" — local intent = high conversion
- "personalized mug Bangladesh" — gift searches spike Dec/Eid
- "TryNex" — brand query (build with social + GSC)

**On-Page SEO Actions:**
- Each product page should have H1 with the keyword
- Write 300+ word descriptions with target keyword 3-5×
- Add FAQ sections on product pages (gets Google rich snippets)
- Use alt text on all product images: e.g. "Custom White T-shirt Bangladesh"

**Blog Keywords (Quick Wins):**
- "how to design custom t-shirt in Bangladesh"
- "best custom gift ideas Bangladesh 2025"
- "corporate uniform Bangladesh"`;
  }

  if (t.includes("speed") || t.includes("performance") || t.includes("core web")) {
    return `## Site Speed & Core Web Vitals

Your site uses Vite + React — already a fast stack. Key optimizations:

**Images**
- Convert product photos to WebP format (50% smaller)
- Add \`loading="lazy"\` to all below-fold images
- Serve images from a CDN

**JavaScript**
- Code splitting is already handled by Vite ✓
- Lazy-load the 3D Design Studio (already done ✓)

**Measure**
- Run PageSpeed Insights: \`pagespeed.web.dev\`
- Target: LCP < 2.5s, FID < 100ms, CLS < 0.1

**Hosting**
- Ensure your deployed app is on a fast server close to Bangladesh
- Enable Brotli compression on the server`;
  }

  return `## SEO Advice for TryNex Lifestyle

**Top 5 Actions Right Now:**

1. **Google Search Console** — Submit sitemap at \`https://trynexshop.com/sitemap.xml\` + verify ownership
2. **Google Business Profile** — Set up at business.google.com for local Dhaka presence
3. **Get backlinks** — List on Bangladeshi business directories (Bikroy, Yellow Pages BD)
4. **Blog consistently** — 1-2 posts/week on custom apparel, gift ideas, BD fashion trends
5. **Social signals** — Active Facebook + Instagram = faster Google trust

**Ask more specific questions:**
- "How to rank for 'custom t-shirt Bangladesh'?"
- "How to fix site speed?"
- "How to get TryNex to show in Google?"
- "What keywords should I target?"`;
}

/* ─── Local keyword-based command parser (instant, no network) ─────────────
 * Used as the primary fast path AND as fallback when the AI service is down.
 * Returns null if the command is too ambiguous for rule-based parsing.
 * ────────────────────────────────────────────────────────────────────────── */
function parseCommandLocally(command: string): Record<string, unknown> | null {
  const c = command.toLowerCase().trim();

  // Extract price (BDT formats: ৳899, 899 taka, tk 500, 1200)
  const priceMatch = c.match(/(?:৳|tk\.?\s*|taka\s*)?(\d[\d,]*(?:\.\d{1,2})?)\s*(?:taka|tk|bdt)?/i);
  const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, "")) : 0;

  // Extract order ID (#145, order 145, order number 145)
  const orderIdMatch = c.match(/(?:#|order\s*(?:number|id|#)?\s*)(\d+)/i);
  const orderId = orderIdMatch ? parseInt(orderIdMatch[1], 10) : null;

  // Extract quoted or trailing name (e.g. "Custom Hoodie", product called X)
  const quotedName = c.match(/["']([^"']+)["']/)?.[1]
    ?? c.match(/(?:called|named|product|item)\s+([a-z0-9 ]+?)(?:\s+(?:at|for|to|price|stock|promo|code)|$)/i)?.[1]?.trim();

  // list / show products
  if (/\b(list|show|get|display|what|how many)\b.*\bproduct/i.test(c)) {
    const searchMatch = c.match(/(?:search|find|for|matching)\s+(.+)/i);
    return { action: "list_products", search: searchMatch?.[1]?.trim() ?? "", limit: 20 };
  }

  // create product
  if (/\b(create|add|new)\b.*\bproduct\b/i.test(c)) {
    if (!quotedName && !price) return null;
    const catMatch = c.match(/(?:category|cat)\s*[:=]?\s*([a-z]+)/i);
    return { action: "create_product", name: quotedName ?? "New Product", price, category: catMatch?.[1] ?? undefined };
  }

  // delete product
  if (/\b(delete|remove)\b.*\bproduct\b/i.test(c)) {
    if (!quotedName) return null;
    return { action: "delete_product", name: quotedName };
  }

  // feature / unfeature product
  if (/\b(feature|highlight|promote|make featured)\b/i.test(c) && !/unfeature|remove from featured/i.test(c)) {
    if (!quotedName) return null;
    return { action: "feature_product", name: quotedName, featured: true };
  }
  if (/\b(unfeature|remove from featured)\b/i.test(c)) {
    if (!quotedName) return null;
    return { action: "feature_product", name: quotedName, featured: false };
  }

  // update price
  if (/\b(update|change|set)\b.*\bprice\b/i.test(c)) {
    if (!quotedName || !price) return null;
    return { action: "update_product_price", name: quotedName, price };
  }

  // update stock
  if (/\b(update|change|set)\b.*\bstock\b|\binventory\b/i.test(c)) {
    const stockMatch = c.match(/\b(\d+)\s*(?:units?|pcs?|pieces?|stock|qty|quantity)?/);
    if (!quotedName || !stockMatch) return null;
    return { action: "update_product_stock", name: quotedName, stock: parseInt(stockMatch[1], 10) };
  }

  // order status
  if (orderId && /\b(ship|shipping|deliver|cancel|process|confirm|mark)\b/i.test(c)) {
    let status = "processing";
    if (/ship/i.test(c)) status = "shipped";
    else if (/deliver/i.test(c)) status = "delivered";
    else if (/cancel/i.test(c)) status = "cancelled";
    else if (/confirm/i.test(c)) status = "confirmed";
    return { action: "update_order_status", orderId, status };
  }

  // find order
  if (/\b(find|search|show|get|look up)\b.*\border\b/i.test(c)) {
    const nameMatch = c.match(/(?:by|customer|from|for)\s+([a-z][a-z ]+)/i);
    return { action: "find_order", orderId: orderId ?? undefined, customerName: nameMatch?.[1]?.trim() };
  }

  // system commands
  if (/\b(flush|clear)\b.*\bcache\b/i.test(c)) return { action: "flush_cache" };
  if (/\b(check|system)\b.*\bhealth\b/i.test(c)) return { action: "check_health" };
  if (/\b(test)\b.*\btelegram\b/i.test(c)) return { action: "test_telegram" };
  if (/\b(trigger|start)\b.*\bdeploy\b|\bredeploy\b/i.test(c)) return { action: "trigger_deploy" };

  // create promo code
  if (/\b(create|add|new)\b.*\bpromo\b/i.test(c)) {
    const codeMatch = c.match(/\b([A-Z0-9]{3,20})\b/);
    const pctMatch = c.match(/(\d+)\s*%/);
    const fixedMatch = c.match(/(?:৳|tk\.?\s*|taka\s*)(\d+)/i);
    if (!codeMatch) return null;
    return {
      action: "create_promo_code",
      code: codeMatch[1],
      discountType: pctMatch ? "percentage" : "fixed",
      discountValue: pctMatch ? parseInt(pctMatch[1]) : (fixedMatch ? parseInt(fixedMatch[1]) : 0),
    };
  }

  // delete promo
  if (/\b(delete|remove)\b.*\bpromo\b/i.test(c)) {
    const codeMatch = c.match(/\b([A-Z0-9]{3,20})\b/);
    if (!codeMatch) return null;
    return { action: "delete_promo_code", code: codeMatch[1] };
  }

  // SEO advice
  if (/\b(seo|rank|google|keyword|traffic|backlink|sitemap)\b/i.test(c)) {
    return { action: "seo_advice", topic: c };
  }

  return null;
}

async function parseCommandWithAI(command: string): Promise<Record<string, unknown>> {
  // Try local parser first (instant, no network dependency)
  const local = parseCommandLocally(command);
  if (local) return local;

  // Fall back to AI parsing for complex/ambiguous commands
  const modelsToTry = ["openai-large", "openai", "mistral-large"];
  let lastError: Error = new Error("No models tried");

  for (const model of modelsToTry) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const r = await fetch(POLLIN_TEXT_URL, {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json", "User-Agent": "TryNex-Admin/2.0" },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: COMMAND_PARSER_SYSTEM },
            { role: "user", content: command },
          ],
          stream: false,
          private: true,
          seed: Math.floor(Math.random() * 99999),
        }),
      });
      clearTimeout(timeout);
      if (!r.ok) { lastError = new Error(`Model ${model} returned ${r.status}`); continue; }
      const data = await r.json() as { choices?: Array<{ message?: { content?: string } }> };
      const raw = (data?.choices?.[0]?.message?.content ?? "").trim();
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) { lastError = new Error("No JSON found in AI response"); continue; }
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      clearTimeout(timeout);
      lastError = err instanceof Error ? err : new Error(String(err));
      logger.warn({ err, model }, "[ai-execute] model failed, trying next");
    }
  }
  throw lastError;
}

/* ═══════════════════════════════════════════════════════
   POST /api/admin/ai-preview
   Parse a command and return a preview plan WITHOUT executing.
   Used by the frontend to show the admin what will happen.
═══════════════════════════════════════════════════════ */
router.post("/admin/ai-preview", requireAdmin, async (req, res) => {
  const { command } = req.body as { command?: string };
  if (!command?.trim()) {
    return res.status(400).json({ error: "command is required" });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = await parseCommandWithAI(command.trim());
  } catch {
    return res.status(502).json({ error: "Could not parse command" });
  }

  const action = parsed.action as string;

  // Build a preview based on the action — do read-only DB queries to enrich
  try {
    switch (action) {
      case "create_product": {
        const name = String(parsed.name ?? "").trim();
        const price = Number(parsed.price);
        const catName = String(parsed.category ?? "").trim();
        let catInfo = "";
        if (catName) {
          const cats = await db.select().from(categoriesTable)
            .where(ilike(categoriesTable.name, `%${catName}%`)).limit(1);
          if (cats[0]) catInfo = ` in "${cats[0].name}" category`;
        }
        return res.json({
          action, parsedCommand: parsed,
          preview: {
            title: "Create New Product",
            description: `Will create "${name || "new product"}" at ৳${price}${catInfo}`,
            riskLevel: "low",
            details: [
              `Product name: "${name}"`,
              `Price: ৳${price}`,
              catName ? `Category: ${catName}` : "Category: uncategorized",
              "Default stock: 50 units",
              "Customizable: Yes",
            ],
            requiresConfirmation: false,
          },
        });
      }

      case "delete_product": {
        const name = String(parsed.name ?? "").trim();
        const existing = await db.select({ id: productsTable.id, name: productsTable.name, price: productsTable.price })
          .from(productsTable).where(ilike(productsTable.name, `%${name}%`)).limit(1);
        const found = existing[0];
        return res.json({
          action, parsedCommand: parsed,
          preview: {
            title: "Delete Product",
            description: found ? `Will permanently delete "${found.name}" (৳${found.price})` : `No product matching "${name}" found`,
            riskLevel: "high",
            details: found ? [
              `Product: "${found.name}" (ID: ${found.id})`,
              `Price: ৳${found.price}`,
              "This action cannot be undone automatically",
              "All related order history references will remain",
            ] : [`No product found matching "${name}"`],
            requiresConfirmation: true,
          },
        });
      }

      case "update_product_price": {
        const name = String(parsed.name ?? "").trim();
        const price = Number(parsed.price);
        const existing = await db.select({ id: productsTable.id, name: productsTable.name, price: productsTable.price })
          .from(productsTable).where(ilike(productsTable.name, `%${name}%`)).limit(1);
        const found = existing[0];
        return res.json({
          action, parsedCommand: parsed,
          preview: {
            title: "Update Product Price",
            description: found ? `"${found.name}": ৳${found.price} → ৳${price}` : `Product "${name}" not found`,
            riskLevel: "medium",
            details: found ? [
              `Product: "${found.name}"`,
              `Current price: ৳${found.price}`,
              `New price: ৳${price}`,
              "Change takes effect immediately on storefront",
            ] : [`No product matching "${name}" found`],
            requiresConfirmation: false,
          },
        });
      }

      case "update_product_stock": {
        const name = String(parsed.name ?? "").trim();
        const stock = Number(parsed.stock);
        const existing = await db.select({ id: productsTable.id, name: productsTable.name, stock: productsTable.stock })
          .from(productsTable).where(ilike(productsTable.name, `%${name}%`)).limit(1);
        const found = existing[0];
        return res.json({
          action, parsedCommand: parsed,
          preview: {
            title: "Update Stock",
            description: found ? `"${found.name}": ${found.stock ?? "?"} → ${stock} units` : `Product "${name}" not found`,
            riskLevel: "low",
            details: found ? [
              `Product: "${found.name}"`,
              `Current stock: ${found.stock ?? "unknown"} units`,
              `New stock: ${stock} units`,
            ] : [`No product matching "${name}" found`],
            requiresConfirmation: false,
          },
        });
      }

      case "feature_product": {
        const name = String(parsed.name ?? "").trim();
        const featured = Boolean(parsed.featured);
        const existing = await db.select({ id: productsTable.id, name: productsTable.name, featured: productsTable.featured })
          .from(productsTable).where(ilike(productsTable.name, `%${name}%`)).limit(1);
        const found = existing[0];
        return res.json({
          action, parsedCommand: parsed,
          preview: {
            title: featured ? "Feature Product" : "Unfeature Product",
            description: found ? `"${found.name}" will be ${featured ? "added to ⭐ featured" : "removed from featured"}` : `Product "${name}" not found`,
            riskLevel: "low",
            details: found ? [
              `Product: "${found.name}"`,
              `Current status: ${found.featured ? "⭐ Featured" : "Not featured"}`,
              `New status: ${featured ? "⭐ Featured" : "Not featured"}`,
              "Change appears on storefront immediately",
            ] : [`No product matching "${name}" found`],
            requiresConfirmation: false,
          },
        });
      }

      case "update_order_status": {
        const orderId = Number(parsed.orderId);
        const status = String(parsed.status ?? "");
        const existing = await db.select({ id: ordersTable.id, orderNumber: ordersTable.orderNumber, status: ordersTable.status, customerName: ordersTable.customerName })
          .from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
        const found = existing[0];
        return res.json({
          action, parsedCommand: parsed,
          preview: {
            title: "Update Order Status",
            description: found ? `Order #${found.orderNumber} (${found.customerName}): ${found.status} → ${status}` : `Order #${orderId} not found`,
            riskLevel: status === "cancelled" ? "high" : "medium",
            details: found ? [
              `Order: #${found.orderNumber}`,
              `Customer: ${found.customerName}`,
              `Current status: ${found.status}`,
              `New status: ${status}`,
              status === "cancelled" ? "⚠️ This will mark the order as cancelled" : "A Telegram notification will be sent",
            ] : [`Order #${orderId} not found`],
            requiresConfirmation: status === "cancelled",
          },
        });
      }

      case "create_promo_code": {
        const code = String(parsed.code ?? "").toUpperCase();
        const discountType = String(parsed.discountType ?? "percentage");
        const discountValue = Number(parsed.discountValue);
        const discountLabel = discountType === "percentage" ? `${discountValue}% off` : `৳${discountValue} off`;
        return res.json({
          action, parsedCommand: parsed,
          preview: {
            title: "Create Promo Code",
            description: `Will create promo code "${code}" — ${discountLabel}`,
            riskLevel: "low",
            details: [
              `Code: "${code}"`,
              `Discount: ${discountLabel}`,
              parsed.minOrder ? `Minimum order: ৳${parsed.minOrder}` : "No minimum order",
              parsed.expiresAt ? `Expires: ${parsed.expiresAt}` : "No expiry date",
              "Activates immediately for customer use",
            ],
            requiresConfirmation: false,
          },
        });
      }

      case "delete_promo_code": {
        const code = String(parsed.code ?? "").toUpperCase();
        const existing = await db.select({ id: promoCodesTable.id, code: promoCodesTable.code, usedCount: promoCodesTable.usedCount })
          .from(promoCodesTable).where(eq(promoCodesTable.code, code)).limit(1);
        const found = existing[0];
        return res.json({
          action, parsedCommand: parsed,
          preview: {
            title: "Delete Promo Code",
            description: found ? `Will delete "${code}" (used ${found.usedCount ?? 0} times)` : `Promo code "${code}" not found`,
            riskLevel: "medium",
            details: found ? [
              `Code: "${code}"`,
              `Used ${found.usedCount ?? 0} times total`,
              "Customers can no longer use this code",
              "Existing orders with this code are unaffected",
            ] : [`Promo code "${code}" not found`],
            requiresConfirmation: false,
          },
        });
      }

      case "list_products": {
        const search = String(parsed.search ?? "").trim();
        const count = await db.select({ count: sql<number>`count(*)::int` }).from(productsTable);
        return res.json({
          action, parsedCommand: parsed,
          preview: {
            title: "List Products",
            description: search ? `Search for products matching "${search}"` : `Show all products (${count[0]?.count ?? "?"} total)`,
            riskLevel: "low",
            details: [
              search ? `Filter: "${search}"` : "No filter — shows all",
              "Read-only operation, no changes made",
              `Total products in store: ${count[0]?.count ?? "?"}`,
            ],
            requiresConfirmation: false,
          },
        });
      }

      case "find_order": {
        return res.json({
          action, parsedCommand: parsed,
          preview: {
            title: "Find Order",
            description: parsed.orderId ? `Look up order #${parsed.orderId}` : `Search orders by customer "${parsed.customerName}"`,
            riskLevel: "low",
            details: ["Read-only operation, no changes made"],
            requiresConfirmation: false,
          },
        });
      }

      case "update_product_description": {
        const name = String(parsed.name ?? "").trim();
        const desc = String(parsed.description ?? "").slice(0, 80);
        return res.json({
          action, parsedCommand: parsed,
          preview: {
            title: "Update Description",
            description: `Will update description of "${name}"`,
            riskLevel: "low",
            details: [
              `Product: "${name}"`,
              `New description preview: "${desc}${desc.length >= 80 ? "…" : ""}"`,
            ],
            requiresConfirmation: false,
          },
        });
      }

      case "seo_advice": {
        return res.json({
          action, parsedCommand: parsed,
          preview: {
            title: "SEO Advice",
            description: "Will provide SEO guidance for TryNex",
            riskLevel: "low",
            details: ["Read-only — provides strategic recommendations", "No database changes"],
            requiresConfirmation: false,
          },
        });
      }

      default:
        return res.json({
          action: "unknown", parsedCommand: parsed,
          preview: {
            title: "Command Not Recognized",
            description: "This command could not be understood",
            riskLevel: "low",
            details: ["Please rephrase or check the Help tab for examples"],
            requiresConfirmation: false,
          },
        });
    }
  } catch (err) {
    logger.error({ err }, "[ai-preview] failed");
    return res.status(500).json({ error: "Preview failed", details: err instanceof Error ? err.message : "Internal error" });
  }
});

/* ═══════════════════════════════════════════════════════
   POST /api/admin/ai-execute
   Execute a natural-language admin command
═══════════════════════════════════════════════════════ */
router.post("/admin/ai-execute", requireAdmin, async (req, res) => {
  const { command } = req.body as { command?: string };
  if (!command?.trim()) {
    return res.status(400).json({ error: "command is required" });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = await parseCommandWithAI(command.trim());
  } catch (err) {
    logger.warn({ err, command }, "[ai-execute] parse failed");
    return res.status(502).json({
      error: "Could not parse command — AI service temporarily unavailable. Please try again.",
    });
  }

  const action = parsed.action as string;
  const adminId = getAdminId(req);

  try {
    switch (action) {
      /* ─── Create Product ─────────────────────── */
      case "create_product": {
        const name = String(parsed.name ?? "").trim();
        const price = Number(parsed.price);
        if (!name) return res.status(400).json({ error: "Could not extract product name from command." });
        if (!price || price <= 0) return res.status(400).json({ error: "Could not extract a valid price from command." });

        let categoryId: number | null = null;
        const catName = String(parsed.category ?? "").trim();
        if (catName) {
          const cats = await db.select().from(categoriesTable)
            .where(ilike(categoriesTable.name, `%${catName}%`)).limit(1);
          if (cats.length > 0) categoryId = cats[0].id;
        }

        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80)
          + "-" + Date.now();

        const [product] = await db.insert(productsTable).values({
          name,
          slug,
          price: String(price),
          description: String(parsed.description ?? `${name} — premium quality custom apparel from TryNex Lifestyle.`),
          imageUrl: "/mockups/white-tshirt-front.png",
          categoryId,
          stock: 50,
          featured: false,
          customizable: true,
          sizes: ["S", "M", "L", "XL", "XXL"],
          colors: ["Black", "White", "Navy"],
          tags: [],
          images: [],
          rating: "4.9",
        }).returning();

        await logActivity({
          adminId, action: "create", entity: "product",
          entityId: String(product.id), entityName: product.name,
          after: product as unknown as Record<string, unknown>,
        });

        return res.json({
          success: true,
          action: "create_product",
          description: `Created product **"${product.name}"** priced at ৳${price}`,
          data: { id: product.id, name: product.name, price },
          undoInfo: { type: "delete_product", productId: product.id, productName: product.name },
        });
      }

      /* ─── Update Order Status ────────────────── */
      case "update_order_status": {
        const orderId = Number(parsed.orderId);
        const status = String(parsed.status ?? "").trim();
        const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
        if (!orderId || orderId <= 0) return res.status(400).json({ error: "Could not extract order ID from command." });
        if (!validStatuses.includes(status)) return res.status(400).json({ error: `Invalid status "${status}". Use: ${validStatuses.join(", ")}` });

        const existing = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
        if (!existing.length) return res.status(404).json({ error: `Order #${orderId} not found.` });

        const before = existing[0];
        const [updated] = await db.update(ordersTable)
          .set({ status } as Record<string, string>)
          .where(eq(ordersTable.id, orderId))
          .returning();

        await logActivity({
          adminId, action: "update", entity: "order",
          entityId: String(orderId), entityName: `Order #${orderId}`,
          before: before as unknown as Record<string, unknown>,
          after: updated as unknown as Record<string, unknown>,
        });

        return res.json({
          success: true,
          action: "update_order_status",
          description: `Order **#${orderId}** status changed from _${before.status}_ → **${status}**`,
          data: { orderId, oldStatus: before.status, newStatus: status },
          undoInfo: { type: "update_order_status", orderId, previousStatus: before.status },
        });
      }

      /* ─── Create Promo Code ──────────────────── */
      case "create_promo_code": {
        const code = String(parsed.code ?? "").toUpperCase().trim().replace(/\s+/g, "");
        const discountType = String(parsed.discountType ?? "percentage") as "percentage" | "fixed";
        const discountValue = Number(parsed.discountValue);
        if (!code) return res.status(400).json({ error: "Could not extract promo code from command." });
        if (!discountValue || discountValue <= 0) return res.status(400).json({ error: "Could not extract discount value from command." });

        const [promo] = await db.insert(promoCodesTable).values({
          code,
          discountType,
          discountValue: String(discountValue),
          minOrderAmount: parsed.minOrder ? String(parsed.minOrder) : "0",
          maxUses: parsed.maxUses ? Number(parsed.maxUses) : 0,
          expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt as string) : null,
          active: true,
          usedCount: 0,
        }).returning();

        await logActivity({
          adminId, action: "create", entity: "promo_code",
          entityId: String(promo.id), entityName: promo.code,
          after: promo as unknown as Record<string, unknown>,
        });

        const discountLabel = discountType === "percentage" ? `${discountValue}% off` : `৳${discountValue} off`;
        return res.json({
          success: true,
          action: "create_promo_code",
          description: `Created promo code **${code}** — ${discountLabel}`,
          data: { id: promo.id, code, discountType, discountValue },
          undoInfo: { type: "delete_promo_id", promoId: promo.id, code },
        });
      }

      /* ─── Delete Promo Code ──────────────────── */
      case "delete_promo_code": {
        const code = String(parsed.code ?? "").toUpperCase().trim();
        if (!code) return res.status(400).json({ error: "Could not extract promo code from command." });

        const existing = await db.select().from(promoCodesTable)
          .where(eq(promoCodesTable.code, code)).limit(1);
        if (!existing.length) return res.status(404).json({ error: `Promo code "${code}" not found.` });

        await db.delete(promoCodesTable).where(eq(promoCodesTable.code, code));
        await logActivity({
          adminId, action: "delete", entity: "promo_code",
          entityId: String(existing[0].id), entityName: code,
          before: existing[0] as unknown as Record<string, unknown>,
        });

        return res.json({
          success: true,
          action: "delete_promo_code",
          description: `Deleted promo code **${code}**`,
          data: { code },
          undoInfo: { type: "restore_promo", data: existing[0] },
        });
      }

      /* ─── Feature / Unfeature Product ───────── */
      case "feature_product": {
        const name = String(parsed.name ?? "").trim();
        const featured = Boolean(parsed.featured);
        if (!name) return res.status(400).json({ error: "Could not extract product name from command." });

        const existing = await db.select().from(productsTable)
          .where(ilike(productsTable.name, `%${name}%`)).limit(1);
        if (!existing.length) return res.status(404).json({ error: `No product matching "${name}" found.` });

        const [updated] = await db.update(productsTable)
          .set({ featured })
          .where(eq(productsTable.id, existing[0].id))
          .returning();

        await logActivity({
          adminId, action: "update", entity: "product",
          entityId: String(updated.id), entityName: updated.name,
          before: existing[0] as unknown as Record<string, unknown>,
          after: updated as unknown as Record<string, unknown>,
        });

        return res.json({
          success: true,
          action: "feature_product",
          description: `**"${updated.name}"** is now ${featured ? "✨ featured" : "removed from featured"}`,
          data: { id: updated.id, name: updated.name, featured },
          undoInfo: { type: "feature_product", productId: updated.id, productName: updated.name, featured: !featured },
        });
      }

      /* ─── Update Product Price ───────────────── */
      case "update_product_price": {
        const name = String(parsed.name ?? "").trim();
        const price = Number(parsed.price);
        if (!name) return res.status(400).json({ error: "Could not extract product name from command." });
        if (!price || price <= 0) return res.status(400).json({ error: "Could not extract a valid price from command." });

        const existing = await db.select().from(productsTable)
          .where(ilike(productsTable.name, `%${name}%`)).limit(1);
        if (!existing.length) return res.status(404).json({ error: `No product matching "${name}" found.` });

        const prevPrice = existing[0].price;
        const [updated] = await db.update(productsTable)
          .set({ price: String(price) })
          .where(eq(productsTable.id, existing[0].id))
          .returning();

        await logActivity({
          adminId, action: "update", entity: "product",
          entityId: String(updated.id), entityName: updated.name,
          before: existing[0] as unknown as Record<string, unknown>,
          after: updated as unknown as Record<string, unknown>,
        });

        return res.json({
          success: true,
          action: "update_product_price",
          description: `**"${updated.name}"** price updated ৳${prevPrice} → **৳${price}**`,
          data: { id: updated.id, name: updated.name, oldPrice: prevPrice, newPrice: price },
          undoInfo: { type: "update_product_price", productId: updated.id, productName: updated.name, previousPrice: prevPrice },
        });
      }

      /* ─── List / Search Products ────────────── */
      case "list_products": {
        const search = String(parsed.search ?? "").trim();
        const limit = Math.min(Number(parsed.limit ?? 20), 50);
        const rows = search
          ? await db.select({
              id: productsTable.id, name: productsTable.name,
              price: productsTable.price, stock: productsTable.stock,
              featured: productsTable.featured,
            }).from(productsTable)
              .where(ilike(productsTable.name, `%${search}%`))
              .orderBy(desc(productsTable.id)).limit(limit)
          : await db.select({
              id: productsTable.id, name: productsTable.name,
              price: productsTable.price, stock: productsTable.stock,
              featured: productsTable.featured,
            }).from(productsTable)
              .orderBy(desc(productsTable.id)).limit(limit);

        if (!rows.length) {
          return res.json({
            success: true, action: "list_products",
            description: search ? `No products found matching "${search}"` : "No products in the database yet.",
            data: { products: [], count: 0 },
          });
        }
        const lines = rows.map(p => `• **${p.name}** — ৳${p.price} | Stock: ${p.stock ?? "?"} | ${p.featured ? "⭐ Featured" : "not featured"}`).join("\n");
        return res.json({
          success: true, action: "list_products",
          description: search
            ? `Found **${rows.length}** product(s) matching "${search}":\n\n${lines}`
            : `Showing **${rows.length}** products (latest first):\n\n${lines}`,
          data: { products: rows, count: rows.length },
        });
      }

      /* ─── Delete Product ─────────────────────── */
      case "delete_product": {
        const name = String(parsed.name ?? "").trim();
        if (!name) return res.status(400).json({ error: "Could not extract product name from command." });
        const existing = await db.select().from(productsTable)
          .where(ilike(productsTable.name, `%${name}%`)).limit(1);
        if (!existing.length) return res.status(404).json({ error: `No product matching "${name}" found.` });

        await db.delete(productsTable).where(eq(productsTable.id, existing[0].id));
        await logActivity({
          adminId, action: "delete", entity: "product",
          entityId: String(existing[0].id), entityName: existing[0].name,
          before: existing[0] as unknown as Record<string, unknown>,
        });
        return res.json({
          success: true, action: "delete_product",
          description: `Deleted product **"${existing[0].name}"** (ID: ${existing[0].id})`,
          data: { id: existing[0].id, name: existing[0].name },
        });
      }

      /* ─── Find Order ─────────────────────────── */
      case "find_order": {
        const orderId = parsed.orderId ? Number(parsed.orderId) : null;
        const customerName = String(parsed.customerName ?? "").trim();
        const statusFilter = String(parsed.status ?? "").trim();

        let rows: typeof ordersTable.$inferSelect[];
        if (orderId) {
          rows = await db.select().from(ordersTable).where(eq(ordersTable.id, orderId)).limit(1);
        } else if (customerName) {
          rows = await db.select().from(ordersTable)
            .where(ilike(ordersTable.customerName, `%${customerName}%`))
            .orderBy(desc(ordersTable.id)).limit(10);
        } else if (statusFilter) {
          rows = await db.select().from(ordersTable)
            .where(eq(ordersTable.status as unknown as Parameters<typeof eq>[0], statusFilter))
            .orderBy(desc(ordersTable.id)).limit(10);
        } else {
          rows = await db.select().from(ordersTable).orderBy(desc(ordersTable.id)).limit(5);
        }

        if (!rows.length) {
          return res.json({
            success: true, action: "find_order",
            description: "No orders found matching your query.",
            data: { orders: [] },
          });
        }
        const lines = rows.map(o =>
          `• Order **#${o.id}** — ${o.customerName ?? "Unknown"} | ৳${o.total ?? "?"} | **${o.status}** | ${new Date(o.createdAt!).toLocaleDateString("en-BD")}`
        ).join("\n");
        return res.json({
          success: true, action: "find_order",
          description: `Found **${rows.length}** order(s):\n\n${lines}`,
          data: { orders: rows.map(o => ({ id: o.id, customerName: o.customerName, total: o.total, status: o.status, createdAt: o.createdAt })) },
        });
      }

      /* ─── Update Product Description ─────────── */
      case "update_product_description": {
        const name = String(parsed.name ?? "").trim();
        const description = String(parsed.description ?? "").trim();
        if (!name) return res.status(400).json({ error: "Could not extract product name from command." });
        if (!description) return res.status(400).json({ error: "Could not extract new description from command." });

        const existing = await db.select().from(productsTable)
          .where(ilike(productsTable.name, `%${name}%`)).limit(1);
        if (!existing.length) return res.status(404).json({ error: `No product matching "${name}" found.` });

        const [updated] = await db.update(productsTable)
          .set({ description })
          .where(eq(productsTable.id, existing[0].id))
          .returning();
        await logActivity({
          adminId, action: "update", entity: "product",
          entityId: String(updated.id), entityName: updated.name,
          before: existing[0] as unknown as Record<string, unknown>,
          after: updated as unknown as Record<string, unknown>,
        });
        return res.json({
          success: true, action: "update_product_description",
          description: `Updated description of **"${updated.name}"**`,
          data: { id: updated.id, name: updated.name, description: updated.description },
        });
      }

      /* ─── Update Product Stock ───────────────── */
      case "update_product_stock": {
        const name = String(parsed.name ?? "").trim();
        const stock = Number(parsed.stock);
        if (!name) return res.status(400).json({ error: "Could not extract product name from command." });
        if (isNaN(stock) || stock < 0) return res.status(400).json({ error: "Could not extract a valid stock number from command." });

        const existing = await db.select().from(productsTable)
          .where(ilike(productsTable.name, `%${name}%`)).limit(1);
        if (!existing.length) return res.status(404).json({ error: `No product matching "${name}" found.` });

        const prevStock = existing[0].stock;
        const [updated] = await db.update(productsTable)
          .set({ stock })
          .where(eq(productsTable.id, existing[0].id))
          .returning();
        await logActivity({
          adminId, action: "update", entity: "product",
          entityId: String(updated.id), entityName: updated.name,
          before: existing[0] as unknown as Record<string, unknown>,
          after: updated as unknown as Record<string, unknown>,
        });
        return res.json({
          success: true, action: "update_product_stock",
          description: `**"${updated.name}"** stock updated: ${prevStock ?? "?"} → **${stock}** units`,
          data: { id: updated.id, name: updated.name, oldStock: prevStock, newStock: stock },
          undoInfo: { type: "update_product_stock", productId: updated.id, productName: updated.name, previousStock: prevStock },
        });
      }

      /* ─── SEO Advice ─────────────────────────── */
      case "seo_advice": {
        const topic = String(parsed.topic ?? "general SEO").trim();
        const advice = getSEOAdvice(topic);
        return res.json({
          success: true, action: "seo_advice",
          description: advice,
          data: { topic },
        });
      }

      /* ─── System Commands ─────────────────────── */
      case "flush_cache": {
        const { redisCacheDel } = await import("../lib/redis");
        await redisCacheDel("*");
        await logActivity({ adminId, action: "update", entity: "system", entityId: "cache", entityName: "System Cache (flushed)" });
        return res.json({
          success: true,
          action: "flush_cache",
          description: "System cache has been flushed successfully.",
        });
      }

      case "check_health": {
        try {
          const { db: healthDb } = await import("@workspace/db");
          const { sql: healthSql } = await import("drizzle-orm");
          const { redisCacheSet, redisCacheDel } = await import("../lib/redis");
          const { tgIsConfigured } = await import("../lib/telegram");
          const dbOk = await healthDb.execute(healthSql`SELECT 1`).then(() => true).catch(() => false);
          const redisConfigured = !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
          const redisOk = redisConfigured
            ? await redisCacheSet("_health_exec", "1", 5).then(() => redisCacheDel("_health_exec")).then(() => true).catch(() => false)
            : false;
          const tgOk = tgIsConfigured();
          const r2Ok = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY);
          const lines = [
            `🗄️ Database: ${dbOk ? "✅ Online" : "❌ Error"}`,
            `⚡ Redis Cache: ${redisConfigured ? (redisOk ? "✅ Online" : "❌ Error") : "⚠️ Not configured"}`,
            `📦 R2 Storage: ${r2Ok ? "✅ Configured" : "⚠️ Not configured"}`,
            `🤖 Telegram: ${tgOk ? "✅ Configured" : "⚠️ Not configured"}`,
          ];
          return res.json({
            success: true,
            action: "check_health",
            description: lines.join("\n"),
            data: { db: dbOk, redis: redisOk, r2: r2Ok, telegram: tgOk },
          });
        } catch {
          return res.json({ success: true, action: "check_health", description: "Health check complete." });
        }
      }

      case "test_telegram": {
        const { tgSend } = await import("../lib/telegram");
        await tgSend("🔔 <b>TryNex Admin AI:</b> Test message successful!");
        return res.json({
          success: true,
          action: "test_telegram",
          description: "Test message sent to Telegram successfully.",
        });
      }

      case "trigger_deploy": {
        const [renderRow] = await db.select().from(settingsTable).where(eq(settingsTable.key, "render_deploy_hook")).limit(1);
        const [cfRow] = await db.select().from(settingsTable).where(eq(settingsTable.key, "cloudflare_pages_hook")).limit(1);
        const hookUrl = renderRow?.value || cfRow?.value;
        if (hookUrl) {
          await fetch(hookUrl, { method: "POST", signal: AbortSignal.timeout(10000) });
          await logActivity({ adminId, action: "update", entity: "system", entityId: "deploy", entityName: "Deployment Hook (triggered)" });
          return res.json({
            success: true,
            action: "trigger_deploy",
            description: "🚀 Deploy hook triggered! Your server is rebuilding now.",
          });
        }
        return res.status(400).json({ error: "No deploy hook configured. Set one in Admin → Deployment → GitHub/Deploy settings." });
      }

      /* ─── Unknown ────────────────────────────── */
      case "unknown":
        return res.status(400).json({
          error: "Command not understood",
          details: String(parsed.reason ?? "Please rephrase your command."),
          suggestions: [
            "Create a product called [name] at ৳[price]",
            "Update order #[id] to shipped",
            "Create promo code [CODE] for [X]% off",
            "Feature the product [name]",
            "Update price of [product name] to ৳[price]",
            "Delete promo code [CODE]",
            "List all products",
            "Search products for hoodie",
            "Find order by customer Rahim",
            "Set stock of Classic Tee to 100",
            "How to rank on Google?",
            "Flush system cache",
            "Check system health",
            "Trigger redeploy",
          ],
        });

      default:
        return res.status(400).json({ error: `Unrecognised action "${action}"` });
    }
  } catch (err) {
    logger.error({ err, action, command }, "[ai-execute] execution failed");
    const msg = err instanceof Error ? err.message : "Internal error";
    if (msg.includes("23505")) {
      return res.status(409).json({ error: "A promo code with that name already exists." });
    }
    return res.status(500).json({ error: "Execution failed", details: msg });
  }
});

/* ═══════════════════════════════════════════════════════
   POST /api/admin/ai-undo
   Undo a previous AI execution using undoInfo returned by ai-execute
═══════════════════════════════════════════════════════ */
router.post("/admin/ai-undo", requireAdmin, async (req, res) => {
  const { undoInfo } = req.body as { undoInfo: Record<string, unknown> };
  if (!undoInfo?.type) return res.status(400).json({ error: "undoInfo.type is required" });

  const adminId = getAdminId(req);

  try {
    switch (undoInfo.type) {
      case "delete_product": {
        const productId = Number(undoInfo.productId);
        await db.delete(productsTable).where(eq(productsTable.id, productId));
        await logActivity({
          adminId, action: "delete", entity: "product",
          entityId: String(productId), entityName: String(undoInfo.productName ?? productId),
          before: { id: productId } as Record<string, unknown>,
        });
        return res.json({ success: true, description: `Product "${undoInfo.productName}" creation undone` });
      }

      case "update_order_status": {
        const orderId = Number(undoInfo.orderId);
        const prevStatus = String(undoInfo.previousStatus);
        await db.update(ordersTable)
          .set({ status: prevStatus } as Record<string, string>)
          .where(eq(ordersTable.id, orderId));
        return res.json({ success: true, description: `Order #${orderId} restored to "${prevStatus}"` });
      }

      case "delete_promo_id": {
        const promoId = Number(undoInfo.promoId);
        await db.delete(promoCodesTable).where(eq(promoCodesTable.id, promoId));
        return res.json({ success: true, description: `Promo code "${undoInfo.code}" creation undone` });
      }

      case "restore_promo": {
        const data = undoInfo.data as Record<string, unknown>;
        await db.insert(promoCodesTable).values({
          code: data.code as string,
          discountType: data.discountType as "percentage" | "fixed",
          discountValue: data.discountValue as string,
          minOrderAmount: (data.minOrderAmount as string) ?? "0",
          maxUses: Number(data.maxUses ?? 0),
          expiresAt: data.expiresAt ? new Date(data.expiresAt as string) : null,
          active: Boolean(data.active ?? data.isActive ?? true),
          usedCount: Number(data.usedCount ?? 0),
        }).onConflictDoNothing();
        return res.json({ success: true, description: `Promo code "${data.code}" restored` });
      }

      case "feature_product": {
        const productId = Number(undoInfo.productId);
        const featured = Boolean(undoInfo.featured);
        await db.update(productsTable).set({ featured }).where(eq(productsTable.id, productId));
        return res.json({ success: true, description: `"${undoInfo.productName}" featured status reverted` });
      }

      case "update_product_price": {
        const productId = Number(undoInfo.productId);
        const prevPrice = String(undoInfo.previousPrice);
        await db.update(productsTable).set({ price: prevPrice }).where(eq(productsTable.id, productId));
        return res.json({ success: true, description: `"${undoInfo.productName}" price reverted to ৳${prevPrice}` });
      }

      case "update_product_stock": {
        const productId = Number(undoInfo.productId);
        const prevStock = Number(undoInfo.previousStock ?? 0);
        await db.update(productsTable).set({ stock: prevStock }).where(eq(productsTable.id, productId));
        return res.json({ success: true, description: `"${undoInfo.productName}" stock reverted to ${prevStock} units` });
      }

      default:
        return res.status(400).json({ error: `Unknown undo type: ${undoInfo.type}` });
    }
  } catch (err) {
    logger.error({ err, undoInfo }, "[ai-undo] failed");
    return res.status(500).json({ error: "Undo failed", details: err instanceof Error ? err.message : "Internal error" });
  }
});

export default router;
