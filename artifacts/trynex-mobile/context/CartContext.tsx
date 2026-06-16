import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Product } from "@/lib/api";

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  size?: string;
  color?: string;
  customNote?: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, options?: { size?: string; color?: string; customNote?: string }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | null>(null);
const CART_KEY = "@trynex:cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CART_KEY).then((val) => {
      if (val) {
        try { setItems(JSON.parse(val)); } catch {}
      }
    });
  }, []);

  const persist = (nextItems: CartItem[]) => {
    setItems(nextItems);
    AsyncStorage.setItem(CART_KEY, JSON.stringify(nextItems));
  };

  const addItem = (
    product: Product,
    options?: { size?: string; color?: string; customNote?: string },
  ) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.product.id === product.id && i.size === options?.size && i.color === options?.color,
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
      AsyncStorage.setItem(CART_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeItem = (id: string) => {
    const next = items.filter((i) => i.id !== id);
    persist(next);
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) { removeItem(id); return; }
    const next = items.map((i) => (i.id === id ? { ...i, quantity } : i));
    persist(next);
  };

  const clearCart = () => {
    setItems([]);
    AsyncStorage.removeItem(CART_KEY);
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
