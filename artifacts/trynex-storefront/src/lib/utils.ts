import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price).replace('BDT', '৳');
}

export function getAuthHeaders(): Record<string, string> {
  const token = sessionStorage.getItem('trynex_admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// API base URL — empty means same-origin (Replit proxy or Vite dev proxy handles /api/*).
// Override at build/deploy time with VITE_API_BASE_URL env var when running frontend
// on a different domain from the API (e.g. Cloudflare Pages → custom API domain).
export const PRODUCTION_API_BASE_URL = "";

export function getApiBaseUrl(): string {
  // If VITE_API_BASE_URL is explicitly set at build time, use it.
  // An empty string or absent var means "same-origin" — the proxy handles /api/*.
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  // Default: same-origin — works in Replit (proxy routes /api → API server port)
  // and Vite dev mode (dev server proxy handles /api/* → localhost:5001).
  return '';
}

export function getApiUrl(path: string): string {
  return `${getApiBaseUrl()}${path}`;
}

/**
 * Resolves any image URL to a renderable src value.
 *
 * Rules (in priority order):
 *  1. Already an absolute external URL (https://…) → use as-is.
 *  2. A relative storage path (/api/storage/… or /uploads/…) → prepend API base in production.
 *  3. A relative public path (/images/…, /mockups/…, /products/…) → use as-is (Vite serves it).
 *  4. Empty/null/undefined → return the local placeholder SVG.
 */
export function resolveImageUrl(url: string | null | undefined): string {
  const PLACEHOLDER = "/images/product-placeholder.svg";
  if (!url || url.trim() === "") return PLACEHOLDER;
  const value = url.trim();
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  // Uploads need the API base URL prepended — check before the generic "/" guard
  if (value.startsWith("/uploads/")) return `${getApiBaseUrl()}${value}`;
  if (value.startsWith("uploads/")) return `${getApiBaseUrl()}/${value}`;
  if (value.startsWith("/")) return value;
  if (value.startsWith("public/")) return `/${value.slice("public/".length)}`;
  if (value.startsWith("mockups/")) return `/${value}`;
  if (value.startsWith("images/")) return `/${value}`;
  if (value.startsWith("products/")) return `/${value}`;
  return PLACEHOLDER;
}
