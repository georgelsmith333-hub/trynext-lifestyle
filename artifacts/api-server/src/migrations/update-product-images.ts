/**
 * Migration: Update product images with real product photos
 * Run with: node -r esbuild-register src/migrations/update-product-images.ts
 */

import { db, productsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const PRODUCT_IMAGES = {
  tshirt: "https://images.unsplash.com/photo-1503341338985-95e740a8ee8a?w=600&q=80&fit=crop",
  hoodie: "https://images.unsplash.com/photo-1556821552-5ff63b1c3ef1?w=600&q=80&fit=crop",
  mug: "https://images.unsplash.com/photo-1514432324607-2e467f4af445?w=600&q=80&fit=crop",
  cap: "https://images.unsplash.com/photo-1588365921519-c21107c4e335?w=600&q=80&fit=crop",
  bottle: "https://images.unsplash.com/photo-1602143407151-7e36dd5f5a0e?w=600&q=80&fit=crop",
  default: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80&fit=crop",
};

async function updateProductImages() {
  try {
    console.log("Starting product image migration...");

    // Update T-Shirts
    await db.execute(
      sql`UPDATE products 
        SET image_url = ${PRODUCT_IMAGES.tshirt}
        WHERE (slug ILIKE '%tshirt%' OR slug ILIKE '%t-shirt%' OR name ILIKE '%t-shirt%')
        AND (image_url IS NULL OR image_url ILIKE '%placeholder%')`
    );
    console.log("✓ Updated T-Shirt images");

    // Update Hoodies
    await db.execute(
      sql`UPDATE products 
        SET image_url = ${PRODUCT_IMAGES.hoodie}
        WHERE (slug ILIKE '%hoodie%' OR name ILIKE '%hoodie%')
        AND (image_url IS NULL OR image_url ILIKE '%placeholder%')`
    );
    console.log("✓ Updated Hoodie images");

    // Update Mugs
    await db.execute(
      sql`UPDATE products 
        SET image_url = ${PRODUCT_IMAGES.mug}
        WHERE (slug ILIKE '%mug%' OR name ILIKE '%mug%')
        AND (image_url IS NULL OR image_url ILIKE '%placeholder%')`
    );
    console.log("✓ Updated Mug images");

    // Update Caps
    await db.execute(
      sql`UPDATE products 
        SET image_url = ${PRODUCT_IMAGES.cap}
        WHERE (slug ILIKE '%cap%' OR name ILIKE '%cap%')
        AND (image_url IS NULL OR image_url ILIKE '%placeholder%')`
    );
    console.log("✓ Updated Cap images");

    // Update Water Bottles
    await db.execute(
      sql`UPDATE products 
        SET image_url = ${PRODUCT_IMAGES.bottle}
        WHERE (slug ILIKE '%bottle%' OR name ILIKE '%bottle%')
        AND (image_url IS NULL OR image_url ILIKE '%placeholder%')`
    );
    console.log("✓ Updated Water Bottle images");

    // Update any remaining products with generic product image
    await db.execute(
      sql`UPDATE products 
        SET image_url = ${PRODUCT_IMAGES.default}
        WHERE image_url IS NULL OR image_url ILIKE '%placeholder%'`
    );
    console.log("✓ Updated remaining product images");

    // Verify updates
    const result = await db.execute(
      sql`SELECT id, name, slug, image_url FROM products WHERE image_url IS NOT NULL ORDER BY id LIMIT 20`
    );
    console.log("\nUpdated products:");
    console.table(result.rows);

    console.log("\n✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }
}

updateProductImages();
