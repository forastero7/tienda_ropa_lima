import { Prisma, type Order } from "@prisma/client";
import { prisma } from "@/lib/db";
import { quoteCart, type CartQuote } from "@/lib/cart";
import { checkoutConfig } from "@/lib/config";
import { OutOfStockError, reserveStock } from "@/lib/inventory";
import { findMethod, getProvider } from "@/lib/payments/registry";
import type { NextAction } from "@/lib/payments/types";
import { getDistrict } from "@/lib/ubigeo";
import { newAccessToken, newOrderCode } from "./code";
import { cancelOrder } from "./lifecycle";
import type { CheckoutInput } from "./schema";

export class CheckoutError extends Error {
  constructor(
    message: string,
    public quote?: CartQuote,
  ) {
    super(message);
  }
}

export type CreatedOrder = { order: Order; next: NextAction; reused: boolean };

export async function createOrder(input: CheckoutInput): Promise<CreatedOrder> {
  // Reintento del mismo envío (doble clic, red inestable): devolvemos el pedido existente.
  const existing = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return { order: existing, next: { type: "none" }, reused: true };

  const method = findMethod(input.paymentMethod);
  const provider = method && getProvider(method.providerId);
  if (!method || !provider) throw new CheckoutError("El método de pago elegido no está disponible.");

  const place = getDistrict(input.delivery.ubigeo)!;
  const minutes =
    method.kind === "online" ? checkoutConfig.reservationMinutesOnline() : checkoutConfig.reservationMinutesManual();

  let order: Order;
  try {
    order = await prisma.$transaction(async (tx) => {
      const quote = await quoteCart(tx, input.lines, { ubigeo: input.delivery.ubigeo, couponCode: input.couponCode });
      if (!quote.valid) throw new CheckoutError("Revisa tu carrito: hay productos sin stock suficiente.", quote);
      if (!quote.shipping) throw new CheckoutError("Aún no realizamos envíos a ese distrito.", quote);
      if (input.couponCode && !quote.coupon?.applied) {
        throw new CheckoutError(quote.coupon?.message ?? "Cupón inválido.", quote);
      }
      if (method.id === "cod" && !quote.shipping.codAllowed) {
        throw new CheckoutError("El pago contraentrega no está disponible para ese distrito.", quote);
      }

      if (quote.coupon?.applied && quote.coupon.id) {
        const used = await tx.$executeRaw`
          UPDATE "Coupon" SET "usedCount" = "usedCount" + 1
          WHERE "id" = ${quote.coupon.id} AND ("maxUses" IS NULL OR "usedCount" < "maxUses")`;
        if (used !== 1) throw new CheckoutError("El cupón alcanzó su límite de usos.", quote);
      }

      for (const line of quote.lines) await reserveStock(tx, line.variantId, line.sku, line.quantity);

      return tx.order.create({
        data: {
          code: newOrderCode(),
          accessToken: newAccessToken(),
          idempotencyKey: input.idempotencyKey,
          status: "CREATED",
          email: input.contact.email,
          phone: input.contact.phone,
          fullName: input.contact.fullName,
          ubigeo: place.ubigeo,
          department: place.department,
          province: place.province,
          district: place.district,
          address: input.delivery.address,
          reference: input.delivery.reference,
          shippingZoneId: quote.shipping.zoneId,
          shippingZoneName: quote.shipping.zoneName,
          shippingEta: quote.shipping.etaText,
          documentType: input.document.type,
          documentNumber: input.document.number,
          businessName: input.document.type === "FACTURA" ? input.document.businessName : null,
          subtotalCents: quote.subtotalCents,
          discountCents: quote.discountCents,
          shippingCents: quote.shipping.feeCents,
          totalCents: quote.totalCents,
          couponCode: quote.coupon?.applied ? quote.coupon.code : null,
          paymentMethod: method.id,
          reservationExpiresAt: new Date(Date.now() + minutes * 60_000),
          marketingConsent: input.marketingConsent,
          source: input.source ?? null,
          items: {
            create: quote.lines.map((l) => ({
              variantId: l.variantId,
              sku: l.sku,
              productName: l.productName,
              size: l.size,
              color: l.color,
              unitCents: l.unitCents,
              quantity: l.quantity,
            })),
          },
          events: { create: { status: "CREATED" } },
        },
      });
    });
  } catch (err) {
    if (err instanceof OutOfStockError) {
      throw new CheckoutError("Otro cliente acaba de comprar la última unidad de un producto de tu carrito.");
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      // Carrera entre dos envíos con la misma clave de idempotencia.
      const again = await prisma.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (again) return { order: again, next: { type: "none" }, reused: true };
    }
    throw err;
  }

  try {
    const next = await startPaymentForOrder(order);
    const fresh = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    return { order: fresh, next, reused: false };
  } catch (err) {
    await cancelOrder(order.id, { note: "No se pudo iniciar el pago" });
    throw new CheckoutError("No pudimos iniciar el pago. Intenta nuevamente o elige otro método.");
  }
}

// Crea un intento de pago para un pedido que espera pago (también sirve para reintentos).
export async function startPaymentForOrder(order: Order): Promise<NextAction> {
  const method = findMethod(order.paymentMethod);
  const provider = method && getProvider(method.providerId);
  if (!method || !provider) throw new Error("Método de pago no disponible");

  const payment = await prisma.payment.create({
    data: { orderId: order.id, provider: provider.id, method: method.id, amountCents: order.totalCents },
  });
  const { providerRef, next } = await provider.startPayment({ order, payment, method });
  await prisma.$transaction([
    prisma.payment.update({ where: { id: payment.id }, data: { providerRef: providerRef ?? null } }),
    prisma.order.updateMany({
      where: { id: order.id, status: "CREATED" },
      data: { status: "PAYMENT_PENDING" },
    }),
  ]);
  if (order.status === "CREATED") {
    await prisma.orderEvent.create({ data: { orderId: order.id, status: "PAYMENT_PENDING" } });
  }
  return next;
}
