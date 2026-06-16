import { Router, type IRouter } from "express";
import { db, designDraftsTable, customersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { verifyCustomerToken, extractCustomerToken } from "../lib/customerAuth";

const router: IRouter = Router();

function requireCustomer(req: any, res: any): { id: number; email: string } | null {
  const token = extractCustomerToken(req);
  if (!token) {
    res.status(401).json({ error: "unauthorized", message: "Customer authentication required" });
    return null;
  }
  const payload = verifyCustomerToken(token);
  if (!payload) {
    res.status(401).json({ error: "unauthorized", message: "Invalid or expired token" });
    return null;
  }
  return payload;
}

router.get("/drafts", async (req, res) => {
  const customer = requireCustomer(req, res);
  if (!customer) return;

  try {
    const [draft] = await db
      .select()
      .from(designDraftsTable)
      .where(eq(designDraftsTable.customerId, customer.id))
      .limit(1);

    if (!draft) {
      res.json({ draft: null });
      return;
    }

    res.json({ draft: { payload: draft.payload, updatedAt: draft.updatedAt } });
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: "Failed to load draft" });
  }
});

router.put("/drafts", async (req, res) => {
  const customer = requireCustomer(req, res);
  if (!customer) return;

  const { payload } = req.body;
  if (!payload || typeof payload !== "object") {
    res.status(400).json({ error: "bad_request", message: "payload is required and must be an object" });
    return;
  }

  try {
    await db
      .insert(designDraftsTable)
      .values({ customerId: customer.id, payload, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: designDraftsTable.customerId,
        set: { payload, updatedAt: new Date() },
      });

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: "Failed to save draft" });
  }
});

router.delete("/drafts", async (req, res) => {
  const customer = requireCustomer(req, res);
  if (!customer) return;

  try {
    await db
      .delete(designDraftsTable)
      .where(eq(designDraftsTable.customerId, customer.id));
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "internal_error", message: "Failed to delete draft" });
  }
});

export default router;
