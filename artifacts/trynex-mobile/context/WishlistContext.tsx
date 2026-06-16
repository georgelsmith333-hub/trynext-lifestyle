import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Product } from "@/lib/api";

interface WishlistContextType {
  items: Product[];
  toggle: (product: Product) => void;
  isWishlisted: (id: number) => boolean;
}

const WishlistContext = createContext<WishlistContextType | null>(null);
const WISHLIST_KEY = "@trynex:wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(WISHLIST_KEY).then((val) => {
      if (val) {
        try { setItems(JSON.parse(val)); } catch {}
      }
    });
  }, []);

  const persist = (next: Product[]) => {
    setItems(next);
    AsyncStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
  };

  const toggle = (product: Product) => {
    const exists = items.some((i) => i.id === product.id);
    persist(exists ? items.filter((i) => i.id !== product.id) : [...items, product]);
  };

  const isWishlisted = (id: number) => items.some((i) => i.id === id);

  return (
    <WishlistContext.Provider value={{ items, toggle, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be inside WishlistProvider");
  return ctx;
}
