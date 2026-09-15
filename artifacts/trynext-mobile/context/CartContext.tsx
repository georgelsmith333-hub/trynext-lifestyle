import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Product } from "@/lib/api";

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
  customNote?: string;
  customImages?: string[];
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, options?: { size?: string; color?: string; customNote?: string; customImages?: string[] }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | null>(null);
const CART_KEY = "@trynext:cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const writeChainRef = useRef(Promise.resolve());

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(CART_KEY)
      .then((val) => {
        if (cancelled) return;
        if (val) {
          try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) setItems(parsed);
          } catch {}
        }
        setHydrated(true);
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => { cancelled = true; };
  }, []);

  // AsyncStorage writes are queued so a rapid remove/update sequence cannot
  // finish out of order and resurrect an older cart snapshot.
  useEffect(() => {
    if (!hydrated) return;
    const snapshot = JSON.stringify(items);
    writeChainRef.current = writeChainRef.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(CART_KEY, snapshot));
  }, [items, hydrated]);

  const addItem = (
    product: Product,
    options?: { size?: string; color?: string; customNote?: string; customImages?: string[] },
  ) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) =>
          i.product.id === product.id &&
          i.size === options?.size &&
          i.color === options?.color &&
          i.customNote === options?.customNote &&
          JSON.stringify(i.customImages ?? []) === JSON.stringify(options?.customImages ?? []),
      );
      let next: CartItem[];
      if (existing) {
        next = prev.map((i) =>
          i.id === existing.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      } else {
        const id = `${product.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        next = [...prev, { id, product, quantity: 1, ...options }];
      }
      return next;
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems((prev) =>
      quantity < 1
        ? prev.filter((i) => i.id !== id)
        : prev.map((i) => (i.id === id ? { ...i, quantity } : i)),
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce(
    (s, i) => s + (i.product.discountPrice ?? i.product.price) * i.quantity,
    0,
  );

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, updateQuantity, clearCart, totalItems, subtotal }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be inside CartProvider");
  return ctx;
}
