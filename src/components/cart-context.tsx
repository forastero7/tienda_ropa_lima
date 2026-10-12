"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = { variantId: string; quantity: number };

type CartContextValue = {
  lines: CartLine[];
  count: number;
  ready: boolean;
  add: (variantId: string, quantity?: number) => void;
  setQuantity: (variantId: string, quantity: number) => void;
  remove: (variantId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "cart:v1";
const CartContext = createContext<CartContextValue | null>(null);

function load(): CartLine[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? parsed.filter((l) => typeof l?.variantId === "string" && Number.isInteger(l?.quantity) && l.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

// Carrito persistente en el navegador. Precios y stock se recalculan siempre en el servidor.
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLines(load());
    setReady(true);
    const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && setLines(load());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const persist = useCallback((updater: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const next = updater(prev).filter((l) => l.quantity > 0);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // almacenamiento no disponible (modo privado): el carrito vive solo en memoria
      }
      return next;
    });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      ready,
      count: lines.reduce((s, l) => s + l.quantity, 0),
      add: (variantId, quantity = 1) =>
        persist((prev) =>
          prev.some((l) => l.variantId === variantId)
            ? prev.map((l) => (l.variantId === variantId ? { ...l, quantity: l.quantity + quantity } : l))
            : [...prev, { variantId, quantity }],
        ),
      setQuantity: (variantId, quantity) =>
        persist((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, quantity } : l))),
      remove: (variantId) => persist((prev) => prev.filter((l) => l.variantId !== variantId)),
      clear: () => persist(() => []),
    }),
    [lines, ready, persist],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart debe usarse dentro de CartProvider");
  return ctx;
}
