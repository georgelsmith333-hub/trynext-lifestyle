/**
 * Database verification script.
 *
 * Reads all configured database URLs from environment variables (never from
 * hardcoded connection strings) and prints a short connectivity/contents
 * report for each one.
 *
 * Usage:
 *   node check_dbs.mjs
 */

import pg from "pg";
const { Pool } = pg;

const dbs = {
  main: process.env.DATABASE_URL_MAIN || process.env.DATABASE_URL,
  failover: process.env.DATABASE_FAILOVER,
  products: process.env.DATABASE_PRODUCTS,
  analytics: process.env.DATABASE_ANALYTICS,
  secondary: process.env.DATABASE_URL_TRYNEXT_DB,
};

async function checkOne(name, url) {
  if (!url) {
    console.log(`${name}: not configured`);
    return;
  }
  const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 10000, max: 1 });
  try {
    const client = await pool.connect();
    try {
      const res = await client.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='products'"
      );
      const count = await client.query(
        "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"
      );
      const productRows = await client.query("SELECT count(*) FROM products").catch(() => ({ rows: [{ count: "?" }] }));
      console.log(
        `${name}: connected, has_products=${res.rows.length > 0}, total_tables=${count.rows[0].count}, products_rows=${productRows.rows[0].count}`
      );
    } finally {
      client.release();
    }
  } catch (err) {
    console.log(`${name}: error - ${err.message}`);
  } finally {
    await pool.end().catch(() => {});
  }
}

(async () => {
  for (const [name, url] of Object.entries(dbs)) {
    await checkOne(name, url);
  }
})();
