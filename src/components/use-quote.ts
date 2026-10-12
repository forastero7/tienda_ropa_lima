"use client";

import { useEffect, useState } from "react";
import type { CartLine } from "./cart-context";

export type QuoteLine = {
  variantId: string;
  sku: string;
  productName: string;
  productSlug: string;
  image: string | null;
  size: string;
  color: string;
  unitCents: number;
  quantity: number;
  available: number;
  problem: string | null;
};

export type PaymentMethodOption = { id: string; label: string; description: string; kind: "online" | "manual" };

export type Quote = {
  lines: QuoteLine[];
  subtotalCents: number;
  discountCents: number;
  coupon: { code: string; applied: boolean; message: string | null } | null;
  shipping: { zoneName: string; feeCents: number; etaText: string; codAllowed: boolean } | null;
  totalCents: number;
  valid: boolean;
  methods: PaymentMethodOption[];
};

// Cotización del carrito en el servidor; se recalcula cuando cambian líneas, distrito o cupón.
export function useQuote(lines: CartLine[], ready: boolean, ubigeo?: string | null, couponCode?: string | null) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const key = JSON.stringify([lines, ubigeo, couponCode]);

  useEffect(() => {
    if (!ready) return;
    if (lines.length === 0) {
      setQuote(null);
      setLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lines, ubigeo: ubigeo || null, couponCode: couponCode || null }),
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => {
        setQuote(q);
        setLoading(false);
      })
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  return { quote, loading };
}
