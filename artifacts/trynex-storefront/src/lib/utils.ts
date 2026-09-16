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
  const token = sessionStorage.getItem('trynext_admin_token');
  return token
    ? { Authorization: `Bearer ${token}`, 'X-Requested-With': 'XMLHttpRequest' }
    : { 'X-Requested-With': 'XMLHttpRequest' };
}

// API base URL — empty means same-origin (Replit proxy or Vite dev proxy handles /api/*).
// Override at build/deploy time with VITE_API_BASE_URL env var when running frontend
// on a different domain from the API (e.g. Cloudflare Pages → custom API domain).
export function getApiBaseUrl(): string {
  // If VITE_API_BASE_URL is explicitly set at build time, use it.
  // An empty string or absent var means "same-origin" — the proxy handles /api/*.
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (fromEnv) return fromEnv.replace(/\/+$/, '');
  // Production Cloudflare Pages exposes /api/* through the Pages Function
  // reverse proxy. Keep browser requests same-origin so preflight, CSRF
  // headers, cookies, and signed-upload URL negotiation are not blocked by
  // the Render origin's browser CORS policy.
  // Local development also remains same-origin through the Vite proxy.
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
  // The restored catalog records use exact `/assets/products/*` paths that
  // are served by Cloudflare Pages. Keep those paths intact so each product
  // retains its design-specific asset. Only remap external URLs verified to
  // fail in production. The onError handlers remain the final safeguard.
  const legacyAssetMap: Record<string, string> = {
    "https://i.imgur.com/Xc8yXgT.jpeg": "/products/main-combo.png",
    "https://images.unsplash.com/photo-1556821840-3a63f15732ce?w=700&q=85": "/assets/products/hoodie_abstract.png",
  };
  if (legacyAssetMap[value]) return legacyAssetMap[value];
  if (value.startsWith("http://") || value.startsWith("https://")) {
    // Recently-viewed items can outlive a backend migration and retain an old
    // Render asset URL. Re-enter those paths through the current storefront
    // so they use the same Pages asset/proxy behavior as fresh catalogue data.
    if (/^https?:\/\/(?:trynext-api(?:-standby-\d+)?|trynext-lifestyle-main-render)\.onrender\.com\//i.test(value)) {
      try {
        const legacyUrl = new URL(value);
        return `${legacyUrl.pathname}${legacyUrl.search}`;
      } catch {
        return PLACEHOLDER;
      }
    }
    return value;
  }
  // Uploads need the API base URL prepended — check before the generic "/" guard
  if (value.startsWith("/uploads/")) return `${getApiBaseUrl()}${value}`;
  if (value.startsWith("uploads/")) return `${getApiBaseUrl()}/${value}`;
  // Catalog artwork is stored as large PNG masters for editing. Serve the
  // generated WebP thumbnail for storefront cards and galleries instead.
  // Keep the original URL as the fallback when an older record has no variant.
  if (/^\/assets\/products\/[^/]+\.png$/i.test(value)) {
    return value.replace(/\.png$/i, ".webp").replace("/assets/products/", "/assets/products/optimized/");
  }
  if (value.startsWith("/")) return value;
  if (value.startsWith("public/")) return `/${value.slice("public/".length)}`;
  if (value.startsWith("mockups/")) return `/${value}`;
  if (value.startsWith("images/")) return `/${value}`;
  if (value.startsWith("products/")) return `/${value}`;
  return PLACEHOLDER;
}
