import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import type { CheckoutInput } from "@/lib/orders/schema";

export async function resetDb() {
  const tables = await prisma.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  await prisma.$executeRawUnsafe(`TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(", ")} CASCADE`);
}

export async function seedBasic({ stock = 3, price = 10000 } = {}) {
  const category = await prisma.category.create({ data: { slug: "polos", name: "Polos" } });
  const product = await prisma.product.create({
    data: { slug: "polo", name: "Polo", status: "ACTIVE", priceCents: price, categoryId: category.id, weightGrams: 300 },
  });
  const variant = await prisma.variant.create({
    data: { sku: "POLO-NEG-M", productId: product.id, size: "M", color: "Negro", stock },
  });
  await prisma.shippingZone.createMany({
    data: [
      { name: "Lima", ubigeoPrefixes: ["1501"], feeCents: 1000, freeOverCents: 30000, codAllowed: true },
      { name: "Nacional", ubigeoPrefixes: [""], feeCents: 2000 },
    ],
  });
  return { category, product, variant };
}

export function checkoutInput(variantId: string, overrides: Partial<CheckoutInput> = {}): CheckoutInput {
  return {
    idempotencyKey: randomUUID(),
    lines: [{ variantId, quantity: 1 }],
    contact: { fullName: "Ana Pérez", email: "ana@example.com", phone: "987654321" },
    delivery: { ubigeo: "150122", address: "Av. Larco 123", reference: "" },
    document: { type: "BOLETA", number: "" },
    paymentMethod: "sandbox",
    couponCode: null,
    acceptTerms: true,
    marketingConsent: false,
    source: null,
    ...overrides,
  };
}
