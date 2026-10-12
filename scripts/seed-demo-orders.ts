// Crea pedidos FICTICIOS para que el panel de la versión de revisión no aparezca vacío.
// Usa el flujo real (createOrder / confirmPayment / advanceOrder) con pago manual.
// Solo para bases de demostración: nunca ejecutar contra producción.
import { randomUUID } from "node:crypto";
import { prisma } from "../src/lib/db";
import { createOrder } from "../src/lib/orders/create";
import { advanceOrder, confirmPayment } from "../src/lib/orders/lifecycle";

async function main() {
  if (process.env.NODE_ENV === "production" || !process.env.YAPE_PLIN_PHONE) {
    throw new Error("Solo para demostración: requiere YAPE_PLIN_PHONE y NODE_ENV distinto de production.");
  }
  if ((await prisma.order.count()) > 0) return console.log("Ya existen pedidos; no se crean más.");

  const admin = await prisma.adminUser.upsert({
    where: { email: "operaciones@demo.local" },
    update: {},
    create: { email: "operaciones@demo.local", name: "Operaciones (demo)", role: "ADMIN", passwordHash: "!", totpEnabled: true },
  });
  const variants = await prisma.variant.findMany({ where: { stock: { gte: 3 } }, take: 4, orderBy: { sku: "asc" } });
  const destinations = [
    { ubigeo: "150122", address: "Calle Demo 101" },
    { ubigeo: "040103", address: "Av. Ficticia 202" },
    { ubigeo: "070101", address: "Jr. Ejemplo 303" },
    { ubigeo: "130101", address: "Pasaje Prueba 404" },
  ];

  for (const [i, v] of variants.entries()) {
    const { order } = await createOrder({
      idempotencyKey: randomUUID(),
      lines: [{ variantId: v.id, quantity: 1 }],
      contact: { fullName: `Cliente Demo ${i + 1}`, email: `cliente${i + 1}@demo.local`, phone: `90000000${i + 1}` },
      delivery: { ...destinations[i], reference: "" },
      document: { type: "BOLETA", number: "" },
      paymentMethod: "yape_qr",
      couponCode: null,
      acceptTerms: true,
      marketingConsent: false,
      source: ["instagram", "tiktok", "google", null][i],
    });
    if (i === 0) continue; // queda con pago pendiente
    const payment = await prisma.payment.findFirstOrThrow({ where: { orderId: order.id } });
    await confirmPayment(payment.id, { amountCents: order.totalCents, verifiedById: admin.id, verifiedNote: `OP-DEMO-${i}` });
    if (i >= 2) await advanceOrder(order.id, "PREPARING", admin.id);
    if (i >= 3) await advanceOrder(order.id, "SHIPPED", admin.id, { courier: "Courier demo", trackingNumber: `DEMO-${i}` });
  }
  console.log(`Pedidos de demostración: ${await prisma.order.count()}`);
}

main().finally(() => prisma.$disconnect());
