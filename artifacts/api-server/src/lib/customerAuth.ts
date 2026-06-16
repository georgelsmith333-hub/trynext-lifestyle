import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  console.warn("JWT_SECRET environment variable is missing in production! Auth will fail.");
}
const JWT_SECRET = process.env.JWT_SECRET || "dev_only_secret_not_for_production";

export function verifyCustomerToken(token: string): { id: number; email: string; role: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    if (decoded.role !== "customer") return null;
    return decoded;
  } catch (err) {
    return null;
  }
}

export function extractCustomerToken(req: { headers: { authorization?: string }; cookies?: Record<string, string> }): string | null {
  return req.headers.authorization?.replace("Bearer ", "") ?? req.cookies?.customer_token ?? null;
}
