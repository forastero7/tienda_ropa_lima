"use client";

import { useEffect } from "react";
import { trackPurchaseOnce, type AnalyticsItem } from "@/lib/analytics";

// "purchase" se registra solo con el pago validado, con el código de pedido como event_id.
export function PurchaseTracker({ code, value, items }: { code: string; value: number; items: AnalyticsItem[] }) {
  useEffect(() => trackPurchaseOnce(code, value, items), [code, value, items]);
  return null;
}
