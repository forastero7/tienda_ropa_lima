import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { adjustStock, commitReservation, OutOfStockError, releaseReservation, takeStockDirect } from "@/lib/inventory";
import { AWAITING_PAYMENT, canTransition, STATUS_LABEL } from "./status";

type Tx = Prisma.TransactionClient;

// Bloquea la fila del pedido durante la transacción: webhooks repetidos,
// validaciones manuales y el proceso de caducidad no pueden pisarse.
async function lockOrder(tx: Tx, orderId: string) {
  await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`;
  return tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
}

async function releaseOrderStock(tx: Tx, order: Awaited<ReturnType<typeof lockOrder>>) {
  if (order.stockReleased || order.stockCommitted) return;
  for (const item of order.items) await releaseReservation(tx, item.variantId, item.quantity);
  if (order.couponCode) {
    await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = GREATEST("usedCount" - 1, 0) WHERE "code" = ${order.couponCode}`;
  }
  await tx.order.update({ where: { id: order.id }, data: { stockReleased: true } });
}

export async function cancelOrder(orderId: string, opts: { note?: string; actorId?: string | null } = {}) {
  return prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!canTransition(order.status, "CANCELLED")) {
      throw new Error(`Un pedido "${STATUS_LABEL[order.status]}" no se puede cancelar.`);
    }
    await releaseOrderStock(tx, order);
    await tx.payment.updateMany({ where: { orderId, status: "PENDING" }, data: { status: "EXPIRED" } });
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    await tx.orderEvent.create({ data: { orderId, status: "CANCELLED", note: opts.note ?? "", actorId: opts.actorId } });
    if (opts.actorId) await audit(tx, { actorId: opts.actorId, action: "order.cancel", entity: "Order", entityId: orderId });
  });
}

// Cancela pedidos sin pagar cuya reserva venció y libera su stock.
export async function expireUnpaidOrders(now = new Date()): Promise<number> {
  const due = await prisma.order.findMany({
    where: { status: { in: AWAITING_PAYMENT }, reservationExpiresAt: { lt: now } },
    select: { id: true },
    take: 200,
  });
  let count = 0;
  for (const { id } of due) {
    try {
      await prisma.$transaction(async (tx) => {
        const order = await lockOrder(tx, id);
        // Pudo pagarse entre la consulta y el bloqueo.
        if (!AWAITING_PAYMENT.includes(order.status)) return;
        await releaseOrderStock(tx, order);
        await tx.payment.updateMany({ where: { orderId: id, status: "PENDING" }, data: { status: "EXPIRED" } });
        await tx.order.update({ where: { id }, data: { status: "CANCELLED" } });
        await tx.orderEvent.create({ data: { orderId: id, status: "CANCELLED", note: "Venció el plazo de pago" } });
        count++;
      });
    } catch (err) {
      console.error("No se pudo caducar el pedido", id, err);
    }
  }
  return count;
}

export type ConfirmResult = "paid" | "already_paid" | "requires_review";

// Único punto donde un pedido pasa a PAGADO. Lo invocan:
//  - un webhook con firma verificada del proveedor de pagos, o
//  - un administrador que registra la verificación de un pago manual.
export async function confirmPayment(
  paymentId: string,
  evidence: { amountCents: number; currency?: string; raw?: Prisma.InputJsonValue; verifiedById?: string; verifiedNote?: string },
): Promise<ConfirmResult> {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    const order = await lockOrder(tx, payment.orderId);
    const current = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (current.status === "PAID") return "already_paid";

    const evidenceData = {
      raw: evidence.raw,
      verifiedById: evidence.verifiedById,
      verifiedNote: evidence.verifiedNote,
    };

    const review = async (reason: string) => {
      await tx.payment.update({ where: { id: paymentId }, data: { status: "REQUIRES_REVIEW", ...evidenceData } });
      await tx.orderEvent.create({ data: { orderId: order.id, status: order.status, note: `Pago en revisión: ${reason}` } });
      return "requires_review" as const;
    };

    if (evidence.amountCents !== order.totalCents || (evidence.currency ?? "PEN") !== order.currency) {
      return review("el monto o la moneda no coinciden con el pedido");
    }
    const otherPaid = await tx.payment.count({ where: { orderId: order.id, status: "PAID" } });
    if (otherPaid > 0) return review("el pedido ya tenía un pago confirmado (posible cobro duplicado)");

    if (AWAITING_PAYMENT.includes(order.status) && !order.stockReleased) {
      for (const item of order.items) await commitReservation(tx, item.variantId, item.quantity, order.id);
    } else if (order.status === "CANCELLED" && order.stockReleased && !order.stockCommitted) {
      // Pago que llegó después de caducar: se acepta solo si aún hay stock.
      try {
        for (const item of order.items) await takeStockDirect(tx, item.variantId, item.sku, item.quantity, order.id);
      } catch (err) {
        if (err instanceof OutOfStockError) return review("pago tardío sin stock disponible: corresponde reembolso");
        throw err;
      }
      if (order.couponCode) {
        await tx.$executeRaw`UPDATE "Coupon" SET "usedCount" = "usedCount" + 1 WHERE "code" = ${order.couponCode}`;
      }
    } else {
      return review(`el pedido estaba "${STATUS_LABEL[order.status]}"`);
    }

    await tx.payment.update({ where: { id: paymentId }, data: { status: "PAID", ...evidenceData } });
    await tx.payment.updateMany({
      where: { orderId: order.id, status: "PENDING", id: { not: paymentId } },
      data: { status: "EXPIRED" },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: new Date(), stockCommitted: true, stockReleased: false },
    });
    await tx.orderEvent.create({
      data: { orderId: order.id, status: "PAID", actorId: evidence.verifiedById ?? null },
    });
    if (evidence.verifiedById) {
      await audit(tx, {
        actorId: evidence.verifiedById,
        action: "payment.manual_verify",
        entity: "Order",
        entityId: order.id,
        data: { paymentId, note: evidence.verifiedNote ?? "" },
      });
    }
    return "paid";
  });
}

export async function markPaymentFailed(paymentId: string, raw?: Prisma.InputJsonValue) {
  await prisma.payment.updateMany({ where: { id: paymentId, status: "PENDING" }, data: { status: "FAILED", raw } });
}

// Cambios operativos desde el panel (preparar, despachar, entregar).
export async function advanceOrder(
  orderId: string,
  to: Extract<OrderStatus, "PREPARING" | "SHIPPED" | "DELIVERED">,
  actorId: string,
  extra: { courier?: string; trackingNumber?: string; note?: string } = {},
) {
  return prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!canTransition(order.status, to)) {
      throw new Error(`No se puede pasar de "${STATUS_LABEL[order.status]}" a "${STATUS_LABEL[to]}".`);
    }
    if (to === "SHIPPED" && !extra.courier) throw new Error("Indica el courier del envío.");
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: to,
        ...(to === "SHIPPED" ? { courier: extra.courier, trackingNumber: extra.trackingNumber || null } : {}),
      },
    });
    await tx.orderEvent.create({ data: { orderId, status: to, note: extra.note ?? "", actorId } });
    await audit(tx, { actorId, action: `order.${to.toLowerCase()}`, entity: "Order", entityId: orderId, data: extra });
  });
}

export async function refundOrder(
  orderId: string,
  actorId: string,
  opts: { amountCents: number; reason: string; restock: boolean },
) {
  return prisma.$transaction(async (tx) => {
    const order = await lockOrder(tx, orderId);
    if (!canTransition(order.status, "REFUNDED")) {
      throw new Error(`Un pedido "${STATUS_LABEL[order.status]}" no se puede reembolsar.`);
    }
    if (opts.amountCents <= 0 || opts.amountCents > order.totalCents) throw new Error("Monto de reembolso inválido.");
    if (opts.restock) {
      for (const item of order.items) {
        await adjustStock(tx, item.variantId, item.quantity, "RETURN", `Reembolso ${order.code}`, actorId, order.id);
      }
    }
    await tx.refund.create({
      data: { orderId, amountCents: opts.amountCents, reason: opts.reason, restocked: opts.restock, actorId },
    });
    await tx.payment.updateMany({ where: { orderId, status: "PAID" }, data: { status: "REFUNDED" } });
    await tx.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
    await tx.orderEvent.create({ data: { orderId, status: "REFUNDED", note: opts.reason, actorId } });
    await audit(tx, { actorId, action: "order.refund", entity: "Order", entityId: orderId, data: opts });
  });
}
