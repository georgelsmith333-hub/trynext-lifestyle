// Production domain — always used as the ultimate fallback.
// The old Render backend (trynex-api.onrender.com) was decommissioned;
// all traffic now goes through the CF Pages / Vite proxy at the canonical Pages origin.
const PROD_DOMAIN = "trynext.pages.dev";
const STALE_RENDER_DOMAIN = "trynex-api.onrender.com";

const getBaseUrl = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  // No domain set, or the .env.production still carries the old Render URL → use production
  if (!domain || domain === STALE_RENDER_DOMAIN) return `https://${PROD_DOMAIN}`;
  return `https://${domain}`;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const base = getBaseUrl();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: "Request failed" }));
    throw new ApiError(err.message || err.error || `HTTP ${res.status}`, res.status, err.code, err);
  }
  return res.json();
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  productCount?: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string;
  price: number;
  discountPrice?: number;
  categoryId?: number;
  categoryName?: string;
  imageUrl?: string;
  images?: string[];
  sizes?: string[];
  colors?: string[];
  stock: number;
  featured: boolean;
  rating: number;
  reviewCount: number;
  customizable: boolean;
  tags?: string[];
}

export interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  shippingAddress: string;
  shippingCity?: string;
  shippingDistrict?: string;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  promoCode?: string;
  promoDiscount?: number;
  notes?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  courierName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderItem {
  productName?: string;
  name?: string;
  quantity: number;
  size?: string;
  color?: string;
  price?: number;
  imageUrl?: string;
}

export interface OrderTrackResponse {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  shippingCity?: string;
  shippingDistrict?: string;
  status: string;
  paymentMethod?: string;
  paymentStatus?: string;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  total: number;
  trackingNumber?: string;
  trackingUrl?: string;
  courierName?: string;
  createdAt?: string;
  timeline: { status: string; timestamp: string; note?: string }[];
}

export interface CreateOrderPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  shippingAddress: string;
  shippingCity?: string;
  shippingDistrict?: string;
  shippingThana?: string;
  paymentMethod: string;
  notes?: string;
  promoCode?: string;
  items: {
    productId: number;
    quantity: number;
    size?: string;
    color?: string;
    price: number;
    customNote?: string;
    customImages?: string[];
  }[];
  subtotal: number;
  shippingCost: number;
  total: number;
  promoDiscount?: number;
  source?: string;
}

export interface PromoValidateResponse {
  valid: boolean;
  code: string;
  discountType: string;
  discountValue: number;
  discount: number;
  message?: string;
  isReferral?: boolean;
  freeShipping?: boolean;
}

export interface Testimonial {
  id: number;
  name: string;
  message: string;
  rating: number;
  location?: string;
  avatarUrl?: string;
  productName?: string;
  featured: boolean;
}

export interface Review {
  id: number;
  customerName: string;
  rating: number;
  comment?: string;
  createdAt?: string;
  approved: boolean;
}

export const api = {
  getProducts: (params?: {
    categoryId?: number;
    featured?: boolean;
    customizable?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.categoryId) query.set("categoryId", String(params.categoryId));
    if (params?.featured) query.set("featured", "true");
    if (params?.customizable) query.set("customizable", "true");
    if (params?.search) query.set("search", params.search);
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    const qs = query.toString();
    return apiFetch<ProductsResponse>(`/api/products${qs ? `?${qs}` : ""}`);
  },

  getProduct: (idOrSlug: string | number) =>
    apiFetch<Product>(`/api/products/${idOrSlug}`),

  getCategories: () =>
    apiFetch<{ categories: Category[] }>(`/api/categories`),

  trackOrder: (data: { orderNumber: string; phone?: string; email?: string }) =>
    apiFetch<OrderTrackResponse>(`/api/orders/track`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  createOrder: (data: CreateOrderPayload) =>
    apiFetch<Order>(`/api/orders`, {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify(data),
    }),

  requestUploadUrl: (name: string, size: number, contentType: string) =>
    apiFetch<{ uploadURL: string; objectPath: string }>("/api/storage/uploads/request-url", {
      method: "POST",
      body: JSON.stringify({ name, size, contentType }),
    }),

  base64ToBlob: (base64: string, mime: string): Blob => {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mime });
  },

  uploadFile: async (uploadURL: string, blob: Blob, contentType: string) => {
    const res = await fetch(uploadURL, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: blob,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return true;
  },

  validatePromo: (code: string, orderTotal: number, customerEmail?: string) =>
    apiFetch<PromoValidateResponse>(`/api/promo-codes/validate`, {
      method: "POST",
      body: JSON.stringify({ code, orderTotal, customerEmail }),
    }),

  getTestimonials: () =>
    apiFetch<{ testimonials: Testimonial[] }>(`/api/testimonials`),

  getReviews: (productId: number) =>
    apiFetch<{ reviews: Review[] }>(`/api/reviews?productId=${productId}`),

  submitReview: (data: {
    productId: number;
    customerName: string;
    customerPhone?: string;
    rating: number;
    comment?: string;
  }) =>
    apiFetch<{ review: Review; message?: string }>(`/api/reviews`, {
      method: "POST",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      body: JSON.stringify(data),
    }),

  subscribeNewsletter: (email: string, name?: string) =>
    apiFetch<{ message: string }>(`/api/newsletter/subscribe`, {
      method: "POST",
      body: JSON.stringify({ email, name }),
    }),

  getSettings: () =>
    apiFetch<Record<string, string>>(`/api/settings`),

  getPublicStats: () =>
    apiFetch<{ happyCustomers?: number; districts?: number; production?: string; rating?: number }>(`/api/public-stats`),
};
