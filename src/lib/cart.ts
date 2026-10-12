import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { evaluateCoupon } from "@/lib/coupons";
import { quoteShipping, type ShippingQuote } from "@/lib/shipping";
import { checkoutConfig } from "@/lib/config";

type Db = Prisma.TransactionClient | typeof prisma;

export type CartLineInput = { variantId: string; quantity: number };

export type QuotedLine = {
  variantId: string;
  sku: string;
  productId: string;
  productName: string;
  productSlug: string;
  image: string | null;
  size: string;
  color: string;
  unitCents: number;
  quantity: number;
  available: number;
  weightGrams: number;
  problem: string | null;
};

export type CartQuote = {
  lines: QuotedLine[];
  subtotalCents: number;
  discountCents: number;
  coupon: { code: string; applied: boolean; message: string | null; id: string | null } | null;
  shipping: ShippingQuote | null;
  totalCents: number;
  weightGrams: number;
  valid: boolean;
};

export function mergeLines(lines: CartLineInput[]): CartLineInput[] {
  const merged = new Map<string, number>();
  for (const l of lines) merged.set(l.variantId, (merged.get(l.variantId) ?? 0) + l.quantity);
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}

// Recalcula el carrito en el servidor: precios, disponibilidad, cupón y envío.
// Nunca se confía en montos enviados por el navegador.
export async function quoteCart(
  db: Db,
  input: CartLineInput[],
  opts: { ubigeo?: string | null; couponCode?: string | null } = {},
): Promise<CartQuote> {
  const linesIn = mergeLines(input).filter((l) => l.quantity > 0);
  const variants = await db.variant.findMany({
    where: { id: { in: linesIn.map((l) => l.variantId) } },
    include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines: QuotedLine[] = [];
  for (const { variantId, quantity } of linesIn) {
    const v = byId.get(variantId);
    if (!v) continue; // variante eliminada: se descarta del carrito
    const available = Math.max(0, v.stock - v.reserved);
    let problem: string | null = null;
    if (!v.active || v.product.status !== "ACTIVE") problem = "Este producto ya no está disponible.";
    else if (available === 0) problem = "Agotado en esta talla/color.";
    else if (quantity > available) problem = `Solo quedan ${available} unidades.`;
    else if (quantity > checkoutConfig.maxQuantityPerLine) {
      problem = `Máximo ${checkoutConfig.maxQuantityPerLine} unidades por producto.`;
    }
    lines.push({
      variantId,
      sku: v.sku,
      productId: v.productId,
      productName: v.product.name,
      productSlug: v.product.slug,
      image: v.product.images[0]?.url ?? null,
      size: v.size,
      color: v.color,
      unitCents: v.priceCents ?? v.product.priceCents,
      quantity,
      available,
      weightGrams: v.product.weightGrams,
      problem,
    });
  }

  const subtotalCents = lines.reduce((s, l) => s + l.unitCents * l.quantity, 0);
  const weightGrams = lines.reduce((s, l) => s + l.weightGrams * l.quantity, 0);

  let discountCents = 0;
  let coupon: CartQuote["coupon"] = null;
  const code = opts.couponCode?.trim().toUpperCase();
  if (code) {
    const found = await db.coupon.findUnique({ where: { code } });
    const result = evaluateCoupon(found, subtotalCents);
    if (result.ok) discountCents = result.discountCents;
    coupon = { code, applied: result.ok, message: result.ok ? null : result.reason, id: found?.id ?? null };
  }

  let shipping: ShippingQuote | null = null;
  if (opts.ubigeo) {
    const zones = await db.shippingZone.findMany({ where: { active: true } });
    // El envío gratis se evalúa sobre el monto después del descuento.
    shipping = quoteShipping(zones, opts.ubigeo, subtotalCents - discountCents, weightGrams);
  }

  const totalCents = subtotalCents - discountCents + (shipping?.feeCents ?? 0);
  const valid = lines.length > 0 && lines.every((l) => !l.problem);
  return { lines, subtotalCents, discountCents, coupon, shipping, totalCents, weightGrams, valid };
}
