const getBaseUrl = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}`;
  return "";
};

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
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
    throw new Error(err.message || `HTTP ${res.status}`);
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
  order: Order;
  timeline: { status: string; timestamp: string; note?: string }[];
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
};
