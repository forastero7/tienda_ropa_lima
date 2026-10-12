import type { Coupon } from "@prisma/client";

export type CouponResult = { ok: true; discountCents: number } | { ok: false; reason: string };

export function evaluateCoupon(coupon: Coupon | null, subtotalCents: number, now = new Date()): CouponResult {
  if (!coupon || !coupon.active) return { ok: false, reason: "El cupón no existe o no está activo." };
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, reason: "El cupón aún no está vigente." };
  if (coupon.endsAt && now > coupon.endsAt) return { ok: false, reason: "El cupón ha vencido." };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, reason: "El cupón alcanzó su límite de usos." };
  }
  if (subtotalCents < coupon.minSubtotalCents) {
    return { ok: false, reason: "El subtotal no alcanza el mínimo para este cupón." };
  }
  const raw = coupon.type === "PERCENT" ? Math.round((subtotalCents * coupon.value) / 100) : coupon.value;
  return { ok: true, discountCents: Math.min(raw, subtotalCents) };
}
