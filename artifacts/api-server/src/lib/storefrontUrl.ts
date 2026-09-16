const CANONICAL_STOREFRONT_URL = "https://trynext.shop";

export function getStorefrontUrl(): string {
  const configured = process.env.STOREFRONT_PUBLIC_URL?.trim().replace(/\/+$/, "");
  if (!configured) return CANONICAL_STOREFRONT_URL;

  try {
    const hostname = new URL(configured).hostname.toLowerCase();
    return hostname.endsWith(".pages.dev") ? CANONICAL_STOREFRONT_URL : configured;
  } catch {
    return CANONICAL_STOREFRONT_URL;
  }
}