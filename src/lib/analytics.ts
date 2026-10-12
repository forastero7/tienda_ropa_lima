"use client";

// Eventos GA4 de comercio electrónico. Solo se envían con consentimiento.
// event_id permite deduplicar contra eventos de servidor (Meta CAPI, etc.).

export const CONSENT_KEY = "consent:v1";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export type AnalyticsItem = {
  item_id: string;
  item_name: string;
  item_variant?: string;
  price: number;
  quantity: number;
};

export function hasAnalyticsConsent(): boolean {
  try {
    return localStorage.getItem(CONSENT_KEY) === "granted";
  } catch {
    return false;
  }
}

export function track(
  event: "view_item" | "add_to_cart" | "begin_checkout" | "purchase" | "refund",
  params: { currency?: "PEN"; value: number; items: AnalyticsItem[]; transaction_id?: string; event_id?: string },
) {
  if (typeof window === "undefined" || !hasAnalyticsConsent() || !window.gtag) return;
  window.gtag("event", event, { currency: "PEN", ...params });
}

// Evita registrar dos veces la misma compra al recargar la página de confirmación.
export function trackPurchaseOnce(orderCode: string, value: number, items: AnalyticsItem[]) {
  const key = `purchase:${orderCode}`;
  try {
    if (localStorage.getItem(key)) return;
    if (!hasAnalyticsConsent()) return;
    localStorage.setItem(key, "1");
  } catch {
    return;
  }
  track("purchase", { value, items, transaction_id: orderCode, event_id: orderCode });
}
