/**
 * TryNex Email Service
 * Sends branded HTML emails to customers using any SMTP provider.
 *
 * Required env vars (set in Admin → Settings or Replit Secrets):
 *   SMTP_HOST     e.g. smtp.gmail.com
 *   SMTP_PORT     e.g. 587
 *   SMTP_USER     e.g. hello@trynexshop.com
 *   SMTP_PASS     Gmail App Password or provider password
 *   SMTP_FROM     e.g. "TryNex Lifestyle <hello@trynexshop.com>"
 *
 * If env vars are missing the functions silently return so the order
 * flow is never blocked by a misconfigured mailer.
 */

import nodemailer from "nodemailer";
import { logger } from "./logger";

/* ── Transporter (lazy-created so missing config just skips) ─────────────── */
function createTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
}

function fromAddress(): string {
  return process.env.SMTP_FROM ?? `TryNex Lifestyle <${process.env.SMTP_USER ?? "noreply@trynexshop.com"}>`;
}

/* ── Shared brand styles ─────────────────────────────────────────────────── */
const BRAND_ORANGE = "#E85D04";
const BRAND_LIGHT  = "#FFF8F3";

function layout(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>TryNex Lifestyle</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${BRAND_ORANGE},#FB8500);padding:28px 32px;text-align:center;">
            <div style="display:inline-block;width:52px;height:52px;background:rgba(255,255,255,.15);border-radius:14px;line-height:52px;font-size:26px;font-weight:900;color:#fff;margin-bottom:10px;">T</div>
            <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-.3px;">TryNex Lifestyle</div>
            <div style="color:rgba(255,255,255,.8);font-size:12px;margin-top:2px;">You Imagine, We Craft</div>
          </td>
        </tr>

        <!-- Body -->
        <tr><td style="padding:32px;">
          ${bodyContent}
        </td></tr>

        <!-- Footer -->
        <tr>
          <td style="background:${BRAND_LIGHT};padding:20px 32px;text-align:center;border-top:1px solid #FFE0CC;">
            <p style="margin:0 0 6px;font-size:13px;color:#64748b;">Questions? WhatsApp or call us at <b>01903426915</b></p>
            <p style="margin:0;font-size:12px;color:#94a3b8;">
              <a href="https://trynexshop.com" style="color:${BRAND_ORANGE};text-decoration:none;">trynexshop.com</a>
              &nbsp;·&nbsp; Dhaka, Bangladesh
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ── Helper: render one order item row ───────────────────────────────────── */
function itemRow(item: { productName?: string; name?: string; quantity: number; price: number; size?: string | null; color?: string | null }): string {
  const name   = item.productName ?? item.name ?? "Item";
  const detail = [item.size, item.color].filter(Boolean).join(" · ");
  return `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;">
        ${name}${detail ? `<br/><span style="font-size:12px;color:#64748b;">${detail}</span>` : ""}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b;text-align:center;">${item.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;text-align:right;">৳${(item.price * item.quantity).toLocaleString()}</td>
    </tr>`;
}

/* ── 1. Order Confirmation ────────────────────────────────────────────────── */
export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity?: string | null;
  shippingDistrict?: string | null;
  items: Array<{ productName?: string; name?: string; quantity: number; price: number; size?: string | null; color?: string | null }>;
  subtotal?: number | string;
  shippingCost?: number | string;
  total: number | string;
  paymentMethod?: string;
  promoCode?: string | null;
  promoDiscount?: number | string | null;
  notes?: string | null;
}

export async function sendOrderConfirmationEmail(order: OrderEmailData): Promise<void> {
  const transporter = createTransporter();
  if (!transporter || !order.customerEmail) return;

  const payLabel   = (order.paymentMethod ?? "cod").toUpperCase();
  const isCOD      = !order.paymentMethod || order.paymentMethod.toLowerCase() === "cod";
  const totalNum   = Number(order.total);
  const advance    = Math.ceil(totalNum * 0.15);
  const itemsHtml  = order.items.map(itemRow).join("");
  const shippingN  = Number(order.shippingCost ?? 0);
  const subtotalN  = Number(order.subtotal ?? (totalNum - shippingN));
  const district   = [order.shippingCity, order.shippingDistrict].filter(Boolean).join(", ");

  const paymentSection = isCOD
    ? `<div style="background:#FFF8F3;border:1px solid #FFD0A8;border-radius:10px;padding:16px;margin-top:20px;">
         <div style="font-size:13px;font-weight:700;color:${BRAND_ORANGE};margin-bottom:6px;">💳 Cash on Delivery</div>
         <p style="margin:0;font-size:13px;color:#475569;">Pay <b>৳${totalNum.toLocaleString()}</b> when your order arrives. Easy!</p>
       </div>`
    : `<div style="background:#FFF8F3;border:1px solid #FFD0A8;border-radius:10px;padding:16px;margin-top:20px;">
         <div style="font-size:13px;font-weight:700;color:${BRAND_ORANGE};margin-bottom:8px;">💳 Payment: ${payLabel}</div>
         <p style="margin:0 0 6px;font-size:13px;color:#475569;">Please send <b>৳${advance.toLocaleString()}</b> advance (15%) to confirm your order.</p>
         <p style="margin:0;font-size:13px;color:#475569;">Our team will contact you on <b>${order.customerPhone}</b> with payment details.</p>
       </div>`;

  const body = `
    <h2 style="margin:0 0 4px;font-size:22px;font-weight:800;color:#1e293b;">Order Confirmed! 🎉</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;">Hi <b>${order.customerName}</b>, thank you for your order. We're on it!</p>

    <div style="background:${BRAND_LIGHT};border-radius:10px;padding:14px 18px;margin-bottom:24px;display:flex;align-items:center;">
      <span style="font-size:13px;color:#64748b;">Order number &nbsp;</span>
      <span style="font-size:16px;font-weight:800;color:${BRAND_ORANGE};">#${order.orderNumber}</span>
    </div>

    <!-- Items table -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <thead>
        <tr style="border-bottom:2px solid #f1f5f9;">
          <th style="padding:0 0 8px;text-align:left;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;">Item</th>
          <th style="padding:0 0 8px;text-align:center;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;">Qty</th>
          <th style="padding:0 0 8px;text-align:right;font-size:12px;color:#94a3b8;font-weight:600;text-transform:uppercase;">Price</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:8px 0 2px;font-size:13px;color:#64748b;">Subtotal</td>
          <td style="padding:8px 0 2px;font-size:13px;color:#64748b;text-align:right;">৳${subtotalN.toLocaleString()}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:2px 0;font-size:13px;color:#64748b;">Shipping</td>
          <td style="padding:2px 0;font-size:13px;color:#64748b;text-align:right;">${shippingN === 0 ? "FREE 🎉" : `৳${shippingN.toLocaleString()}`}</td>
        </tr>
        ${order.promoCode ? `<tr>
          <td colspan="2" style="padding:2px 0;font-size:13px;color:#22c55e;">Promo (${order.promoCode})</td>
          <td style="padding:2px 0;font-size:13px;color:#22c55e;text-align:right;">-৳${Number(order.promoDiscount ?? 0).toLocaleString()}</td>
        </tr>` : ""}
        <tr style="border-top:2px solid #f1f5f9;">
          <td colspan="2" style="padding:10px 0 0;font-size:16px;font-weight:800;color:#1e293b;">Total</td>
          <td style="padding:10px 0 0;font-size:16px;font-weight:800;color:${BRAND_ORANGE};text-align:right;">৳${totalNum.toLocaleString()}</td>
        </tr>
      </tfoot>
    </table>

    ${paymentSection}

    <!-- Shipping info -->
    <div style="margin-top:24px;padding:16px;background:#f8fafc;border-radius:10px;">
      <div style="font-size:13px;font-weight:700;color:#1e293b;margin-bottom:8px;">📍 Delivery To</div>
      <p style="margin:0;font-size:13px;color:#475569;line-height:1.6;">
        ${order.shippingAddress}${district ? `<br/>${district}` : ""}
      </p>
    </div>

    ${order.notes ? `<div style="margin-top:16px;padding:14px;background:#fefce8;border-radius:10px;font-size:13px;color:#713f12;"><b>📝 Note:</b> ${order.notes}</div>` : ""}

    <!-- Track order CTA -->
    <div style="text-align:center;margin-top:28px;">
      <a href="https://trynexshop.com/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.customerPhone)}"
         style="display:inline-block;background:linear-gradient(135deg,${BRAND_ORANGE},#FB8500);color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:700;">
        Track My Order →
      </a>
    </div>

    <p style="margin-top:24px;font-size:13px;color:#94a3b8;text-align:center;">
      We'll notify you when your order ships. Expected delivery: <b>2–5 business days</b>.
    </p>`;

  try {
    await transporter.sendMail({
      from: fromAddress(),
      to: order.customerEmail,
      subject: `✅ Order Confirmed #${order.orderNumber} — TryNex Lifestyle`,
      html: layout(body),
    });
    logger.info({ orderNumber: order.orderNumber, to: order.customerEmail }, "[email] Order confirmation sent");
  } catch (err) {
    logger.warn({ err, orderNumber: order.orderNumber }, "[email] Order confirmation failed (non-blocking)");
  }
}

/* ── 2. Order Status Update ───────────────────────────────────────────────── */
const STATUS_CONFIG: Record<string, { emoji: string; title: string; message: string; color: string }> = {
  processing: {
    emoji: "⚙️",
    title: "We're Preparing Your Order",
    message: "Your order is being processed and will be handed to the courier soon.",
    color: "#3b82f6",
  },
  shipped: {
    emoji: "🚚",
    title: "Your Order Is On Its Way!",
    message: "Your package has been shipped and is heading to you. Use the link below to track your order.",
    color: "#8b5cf6",
  },
  delivered: {
    emoji: "🎉",
    title: "Order Delivered!",
    message: "Your order has been delivered. We hope you love it! If you have any questions, just WhatsApp us.",
    color: "#22c55e",
  },
  cancelled: {
    emoji: "❌",
    title: "Order Cancelled",
    message: "Your order has been cancelled. If you paid in advance, a refund will be processed within 2–3 business days.",
    color: "#ef4444",
  },
};

export async function sendStatusUpdateEmail(order: { orderNumber: string; customerName: string; customerEmail?: string | null; customerPhone: string; total: number | string }, newStatus: string): Promise<void> {
  const transporter = createTransporter();
  if (!transporter || !order.customerEmail) return;

  const cfg = STATUS_CONFIG[newStatus.toLowerCase()];
  if (!cfg) return; // Only email meaningful status changes

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:48px;">${cfg.emoji}</div>
      <h2 style="margin:8px 0 4px;font-size:22px;font-weight:800;color:#1e293b;">${cfg.title}</h2>
      <p style="margin:0;font-size:15px;color:#64748b;">Hi <b>${order.customerName}</b>,</p>
    </div>

    <div style="background:${BRAND_LIGHT};border-radius:10px;padding:14px 18px;margin-bottom:20px;text-align:center;">
      <span style="font-size:13px;color:#64748b;">Order &nbsp;</span>
      <span style="font-size:16px;font-weight:800;color:${BRAND_ORANGE};">#${order.orderNumber}</span>
      <span style="font-size:13px;color:#64748b;">&nbsp; · &nbsp; Total: <b>৳${Number(order.total).toLocaleString()}</b></span>
    </div>

    <div style="background:#f8fafc;border-left:4px solid ${cfg.color};border-radius:0 10px 10px 0;padding:16px;margin-bottom:24px;">
      <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">${cfg.message}</p>
    </div>

    <div style="text-align:center;">
      <a href="https://trynexshop.com/track?order=${order.orderNumber}&phone=${encodeURIComponent(order.customerPhone)}"
         style="display:inline-block;background:linear-gradient(135deg,${BRAND_ORANGE},#FB8500);color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-size:14px;font-weight:700;">
        Track My Order →
      </a>
    </div>`;

  try {
    await transporter.sendMail({
      from: fromAddress(),
      to: order.customerEmail,
      subject: `${cfg.emoji} Order #${order.orderNumber} — ${cfg.title} | TryNex`,
      html: layout(body),
    });
    logger.info({ orderNumber: order.orderNumber, status: newStatus, to: order.customerEmail }, "[email] Status update sent");
  } catch (err) {
    logger.warn({ err, orderNumber: order.orderNumber }, "[email] Status update failed (non-blocking)");
  }
}

/* ── 3. Quick connection test (used by admin settings) ───────────────────── */
export async function testEmailConnection(): Promise<{ ok: boolean; error?: string }> {
  const transporter = createTransporter();
  if (!transporter) return { ok: false, error: "SMTP not configured (missing SMTP_HOST, SMTP_USER, or SMTP_PASS)" };
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message ?? "Unknown error" };
  }
}
