import crypto from "node:crypto";
import { logger } from "./logger";

/** Runtime override for TELEGRAM_CHAT_ID — set when admin registers via bot or DB settings. */
let _chatIdOverride: string | null = null;

export function setChatIdOverride(id: string | null) {
  if (id) _chatIdOverride = id;
}

export function getEffectiveChatId(): string | null {
  return process.env.TELEGRAM_CHAT_ID || _chatIdOverride || null;
}

export function tgIsConfigured(): boolean {
  return !!(process.env.TELEGRAM_BOT_TOKEN && getEffectiveChatId());
}

export async function tgSend(text: string, parseMode: "HTML" | "Markdown" = "HTML"): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = getEffectiveChatId();
  if (!token || !chatId) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
      signal: AbortSignal.timeout(8000),
    });
    const data: any = await r.json();
    if (!data.ok) logger.warn({ desc: data.description }, "[telegram] sendMessage not ok");
    return data.ok === true;
  } catch (err) {
    logger.warn({ err }, "[telegram] tgSend failed");
    return false;
  }
}

export async function tgReply(chatId: number | string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: String(chatId), text, parse_mode: "HTML" }),
      signal: AbortSignal.timeout(8000),
    });
    const data: any = await r.json();
    return data.ok === true;
  } catch (err) {
    logger.warn({ err }, "[telegram] tgReply failed");
    return false;
  }
}

export function getWebhookSecret(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN || "no_token";
  return crypto.createHash("sha256").update(`tg_wh_${token}`).digest("hex").slice(0, 64);
}
