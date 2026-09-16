import { Router, type IRouter } from "express";
import { db, productsTable, categoriesTable, blogPostsTable } from "@workspace/db";
import { desc, eq, max } from "drizzle-orm";
import { logger } from "../lib/logger";
import { getStorefrontUrl } from "../lib/storefrontUrl";

const router: IRouter = Router();

// Sitemap links must point to customer-facing storefront pages, never the API
// host. API_PUBLIC_URL is intentionally not used here because Render sets it
// to a backend host. Use the explicit storefront variable when a custom domain
// is fully connected; otherwise stay on the live Pages origin.
const SITE_URL = getStorefrontUrl();

router.get("/sitemap.xml", async (_req, res) => {
  try {
    const products = await db
      .select({
        slug: productsTable.slug,
        updatedAt: productsTable.updatedAt,
        imageUrl: productsTable.imageUrl,
        name: productsTable.name,
      })
      .from(productsTable)
      .orderBy(desc(productsTable.createdAt));

    const categories = await db
      .select({
        slug: categoriesTable.slug,
        name: categoriesTable.name,
      })
      .from(categoriesTable);

    let blogPosts: { slug: string; updatedAt: Date | null; imageUrl: string | null; title: string }[] = [];
    try {
      blogPosts = await db
        .select({
          slug: blogPostsTable.slug,
          updatedAt: blogPostsTable.updatedAt,
          imageUrl: blogPostsTable.imageUrl,
          title: blogPostsTable.title,
        })
        .from(blogPostsTable)
        .where(eq(blogPostsTable.published, true))
        .orderBy(desc(blogPostsTable.updatedAt));
    } catch (err) {
      logger.warn({ err, route: "GET /sitemap.xml" }, "Failed to load blog posts for sitemap");
    }

    const today = new Date().toISOString().split("T")[0];

    const staticPages = [
      { loc: "/", priority: "1.0", changefreq: "daily" },
      { loc: "/products", priority: "0.9", changefreq: "daily" },
      { loc: "/blog", priority: "0.7", changefreq: "weekly" },
      { loc: "/sale", priority: "0.8", changefreq: "daily" },
      { loc: "/design-studio", priority: "0.7", changefreq: "monthly" },
      { loc: "/about", priority: "0.6", changefreq: "monthly" },
      { loc: "/faq", priority: "0.6", changefreq: "monthly" },
      { loc: "/size-guide", priority: "0.5", changefreq: "monthly" },
      { loc: "/track", priority: "0.6", changefreq: "monthly" },
      { loc: "/shipping-policy", priority: "0.5", changefreq: "monthly" },
      { loc: "/return-policy", priority: "0.5", changefreq: "monthly" },
      { loc: "/privacy-policy", priority: "0.4", changefreq: "monthly" },
      { loc: "/terms-of-service", priority: "0.4", changefreq: "monthly" },
      { loc: "/referral", priority: "0.5", changefreq: "monthly" },
      { loc: "/custom-tshirt-bangladesh",  priority: "0.9", changefreq: "weekly" },
      { loc: "/custom-hoodie-bangladesh",  priority: "0.9", changefreq: "weekly" },
      { loc: "/custom-gift-bangladesh",    priority: "0.9", changefreq: "weekly" },
      { loc: "/corporate-gift-dhaka",      priority: "0.8", changefreq: "weekly" },
      { loc: "/custom-mug-bangladesh",     priority: "0.8", changefreq: "weekly" },
      { loc: "/birthday-gift-bangladesh",  priority: "0.8", changefreq: "weekly" },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n`;
    xml += `        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"\n`;
    xml += `        xmlns:xhtml="http://www.w3.org/1999/xhtml">\n\n`;

    const [latestProductRow] = await db.select({ updatedAt: max(productsTable.updatedAt) }).from(productsTable);
    const latestProductLastmod = formatDate(latestProductRow?.updatedAt) ?? today;

    const latestCategoryLastmod = today;

    const [latestBlogRow] = await db.select({ updatedAt: max(blogPostsTable.updatedAt) }).from(blogPostsTable).where(eq(blogPostsTable.published, true));
    const latestBlogLastmod = formatDate(latestBlogRow?.updatedAt) ?? today;

    for (const page of staticPages) {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}${page.loc}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>${page.changefreq}</changefreq>\n`;
      xml += `    <priority>${page.priority}</priority>\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="en-BD" href="${SITE_URL}${page.loc}"/>\n`;
      xml += `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${page.loc}"/>\n`;
      xml += `  </url>\n`;
    }

    for (const cat of categories) {
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}/products?category=${encodeURIComponent(cat.slug)}</loc>\n`;
      xml += `    <lastmod>${latestCategoryLastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      xml += `  </url>\n`;
    }

    for (const product of products) {
      const lastmod = formatDate(product.updatedAt) ?? latestProductLastmod;
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}/product/${product.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>weekly</changefreq>\n`;
      xml += `    <priority>0.8</priority>\n`;
      if (product.imageUrl) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${escapeXml(toAbsoluteSiteUrl(product.imageUrl))}</image:loc>\n`;
        xml += `      <image:title>${escapeXml(product.name)}</image:title>\n`;
        xml += `    </image:image>\n`;
      }
      xml += `  </url>\n`;
    }

    for (const post of blogPosts) {
      const lastmod = formatDate(post.updatedAt) ?? latestBlogLastmod;
      xml += `  <url>\n`;
      xml += `    <loc>${SITE_URL}/blog/${post.slug}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += `    <changefreq>monthly</changefreq>\n`;
      xml += `    <priority>0.6</priority>\n`;
      if (post.imageUrl) {
        xml += `    <image:image>\n`;
        xml += `      <image:loc>${escapeXml(toAbsoluteSiteUrl(post.imageUrl))}</image:loc>\n`;
        xml += `      <image:title>${escapeXml(post.title)}</image:title>\n`;
        xml += `    </image:image>\n`;
      }
      xml += `  </url>\n`;
    }

    xml += `\n</urlset>\n`;

    res.header("Content-Type", "application/xml; charset=utf-8");
    res.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.header("Pragma", "no-cache");
    res.header("Expires", "0");
    res.header("X-Robots-Tag", "index, follow");
    res.send(xml);
  } catch (err) {
    logger.error({ err }, "Sitemap generation failed");
    res.status(500).send("Sitemap generation failed");
  }
});

router.get("/robots.txt", (_req, res) => {
  const robotsTxt = [
    "User-agent: *",
    "Allow: /",
    "",
    "Disallow: /admin",
    "Disallow: /admin/",
    "Disallow: /checkout",
    "Disallow: /account",
    "Disallow: /login",
    "Disallow: /signup",
    "",
    `Sitemap: ${SITE_URL}/sitemap.xml`,
  ].join("\n");

  res.header("Content-Type", "text/plain; charset=utf-8");
  res.header("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.header("Pragma", "no-cache");
  res.header("Expires", "0");
  res.header("X-Robots-Tag", "index, follow");
  res.send(robotsTxt);
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toAbsoluteSiteUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function formatDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
}

export default router;
