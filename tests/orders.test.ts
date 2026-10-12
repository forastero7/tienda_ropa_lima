import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { CheckoutError, createOrder } from "@/lib/orders/create";
import { confirmPayment, expireUnpaidOrders, refundOrder } from "@/lib/orders/lifecycle";
import { handleIncomingWebhook } from "@/lib/payments/webhooks";
import { SANDBOX_SIGNATURE_HEADER } from "@/lib/payments/sandbox";
import { signTimestamped } from "@/lib/payments/signature";
import { checkoutInput, resetDb, seedBasic } from "./helpers";

async function sandboxWebhook(orderId: string, opts: { type?: string; amount?: number; eventId?: string; secret?: string } = {}) {
  const payment = await prisma.payment.findFirstOrThrow({ where: { orderId }, orderBy: { createdAt: "desc" } });
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const body = JSON.stringify({
    id: opts.eventId ?? `evt_${payment.id}`,
    type: opts.type ?? "charge.succeeded",
    data: { reference: payment.providerRef, amount: opts.amount ?? order.totalCents, currency: "PEN" },
  });
  const headers = new Headers({ [SANDBOX_SIGNATURE_HEADER]: signTimestamped(opts.secret ?? "test-sandbox", body) });
  return handleIncomingWebhook("sandbox", headers, body);
}

const variantState = (id: string) => prisma.variant.findUniqueOrThrow({ where: { id }, select: { stock: true, reserved: true } });

beforeEach(resetDb);

describe("checkout", () => {
  it("crea el pedido con precios del servidor y reserva stock", async () => {
    const { variant } = await seedBasic({ stock: 3, price: 10000 });
    const { order, next } = await createOrder(checkoutInput(variant.id, { lines: [{ variantId: variant.id, quantity: 2 }] }));
    expect(order.status).toBe("PAYMENT_PENDING");
    expect(order.subtotalCents).toBe(20000);
    expect(order.shippingCents).toBe(1000); // Lima, bajo el mínimo de envío gratis
    expect(order.totalCents).toBe(21000);
    expect(order.district).toBe("Miraflores");
    expect(next).toEqual({ type: "redirect", url: expect.stringMatching(/^\/pago-prueba\//) });
    expect(await variantState(variant.id)).toEqual({ stock: 3, reserved: 2 });
  });

  it("es idempotente ante envíos repetidos", async () => {
    const { variant } = await seedBasic();
    const input = checkoutInput(variant.id);
    const a = await createOrder(input);
    const b = await createOrder(input);
    expect(b.order.id).toBe(a.order.id);
    expect(b.reused).toBe(true);
    expect(await prisma.order.count()).toBe(1);
    expect((await variantState(variant.id)).reserved).toBe(1);
  });

  it("no vende la misma última unidad dos veces", async () => {
    const { variant } = await seedBasic({ stock: 1 });
    const results = await Promise.allSettled(
      Array.from({ length: 5 }, () => createOrder(checkoutInput(variant.id))),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
    expect(rejected.every((r) => r.reason instanceof CheckoutError)).toBe(true);
    expect(await variantState(variant.id)).toEqual({ stock: 1, reserved: 1 });
  });

  it("rechaza cantidades sin stock y distritos sin cobertura", async () => {
    const { variant } = await seedBasic({ stock: 1 });
    await expect(createOrder(checkoutInput(variant.id, { lines: [{ variantId: variant.id, quantity: 2 }] }))).rejects.toThrow(CheckoutError);
    await prisma.shippingZone.deleteMany({ where: { name: "Nacional" } });
    await expect(
      createOrder(checkoutInput(variant.id, { delivery: { ubigeo: "040101", address: "Calle 1 123", reference: "" } })),
    ).rejects.toThrow(/no realizamos envíos/);
  });

  it("respeta el límite de usos del cupón y lo libera al cancelar", async () => {
    const { variant } = await seedBasic({ stock: 5 });
    await prisma.coupon.create({ data: { code: "UNO", type: "FIXED", value: 1500, maxUses: 1 } });
    const { order } = await createOrder(checkoutInput(variant.id, { couponCode: "uno" }));
    expect(order.discountCents).toBe(1500);
    expect(order.totalCents).toBe(10000 - 1500 + 1000);
    await expect(createOrder(checkoutInput(variant.id, { couponCode: "UNO" }))).rejects.toThrow(/límite/);

    await prisma.order.update({ where: { id: order.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    expect(await expireUnpaidOrders()).toBe(1);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { code: "UNO" } })).usedCount).toBe(0);
  });
});

describe("pagos", () => {
  it("confirma por webhook firmado, descuenta stock una sola vez", async () => {
    const { variant } = await seedBasic({ stock: 3 });
    const { order } = await createOrder(checkoutInput(variant.id));

    expect(await sandboxWebhook(order.id)).toEqual({ status: 200, body: "ok" });
    expect(await sandboxWebhook(order.id)).toEqual({ status: 200, body: "duplicate" });

    const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    expect(paid.status).toBe("PAID");
    expect(paid.paidAt).not.toBeNull();
    expect(await variantState(variant.id)).toEqual({ stock: 2, reserved: 0 });
    expect(await prisma.stockMovement.count({ where: { orderId: order.id, type: "SALE" } })).toBe(1);
  });

  it("rechaza firmas inválidas", async () => {
    const { variant } = await seedBasic();
    const { order } = await createOrder(checkoutInput(variant.id));
    expect((await sandboxWebhook(order.id, { secret: "falso" })).status).toBe(401);
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAYMENT_PENDING");
  });

  it("envía a revisión si el monto no coincide", async () => {
    const { variant } = await seedBasic();
    const { order } = await createOrder(checkoutInput(variant.id));
    await sandboxWebhook(order.id, { amount: 100 });
    expect((await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })).status).toBe("REQUIRES_REVIEW");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAYMENT_PENDING");
  });

  it("un pago fallido no confirma el pedido", async () => {
    const { variant } = await seedBasic();
    const { order } = await createOrder(checkoutInput(variant.id));
    await sandboxWebhook(order.id, { type: "charge.failed" });
    expect((await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } })).status).toBe("FAILED");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("PAYMENT_PENDING");
  });

  it("caduca pedidos impagos y acepta un pago tardío solo si hay stock", async () => {
    const { variant } = await seedBasic({ stock: 1 });
    const { order } = await createOrder(checkoutInput(variant.id));
    await prisma.order.update({ where: { id: order.id }, data: { reservationExpiresAt: new Date(Date.now() - 1000) } });
    expect(await expireUnpaidOrders()).toBe(1);
    expect(await variantState(variant.id)).toEqual({ stock: 1, reserved: 0 });

    // Otra persona compra la única unidad liberada.
    const other = await createOrder(checkoutInput(variant.id));
    await sandboxWebhook(other.order.id);

    // Llega el pago del pedido caducado: no hay stock, queda en revisión para reembolso.
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
    const result = await confirmPayment(payment.id, { amountCents: order.totalCents });
    expect(result).toBe("requires_review");
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("CANCELLED");
    expect(await variantState(variant.id)).toEqual({ stock: 0, reserved: 0 });
  });

  it("pago manual: queda pendiente hasta que un administrador lo valida", async () => {
    const { variant } = await seedBasic();
    const admin = await prisma.adminUser.create({ data: { email: "a@a.pe", name: "A", passwordHash: "x", role: "ADMIN" } });
    const { order, next } = await createOrder(checkoutInput(variant.id, { paymentMethod: "yape_qr" }));
    expect(next.type).toBe("instructions");
    expect(order.status).toBe("PAYMENT_PENDING");

    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
    expect(await confirmPayment(payment.id, { amountCents: order.totalCents, verifiedById: admin.id, verifiedNote: "Op. 123456" })).toBe("paid");
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).verifiedNote).toBe("Op. 123456");
    expect(await prisma.auditLog.count({ where: { action: "payment.manual_verify" } })).toBe(1);
  });

  it("reembolso con reingreso de stock", async () => {
    const { variant } = await seedBasic({ stock: 2 });
    const admin = await prisma.adminUser.create({ data: { email: "a@a.pe", name: "A", passwordHash: "x", role: "ADMIN" } });
    const { order } = await createOrder(checkoutInput(variant.id));
    await sandboxWebhook(order.id);
    await refundOrder(order.id, admin.id, { amountCents: order.totalCents, reason: "Cambio de opinión", restock: true });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).status).toBe("REFUNDED");
    expect(await variantState(variant.id)).toEqual({ stock: 2, reserved: 0 });
  });
});
