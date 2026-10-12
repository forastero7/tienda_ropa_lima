import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getBestSellers, getRelated } from "@/lib/catalog";
import { resetDb } from "./helpers";

beforeEach(resetDb);

async function catalog() {
  const polos = await prisma.category.create({ data: { slug: "polos", name: "Polos" } });
  const jeans = await prisma.category.create({ data: { slug: "jeans", name: "Jeans" } });
  const mk = async (slug: string, categoryId: string, stock = 5, gender: "MUJER" | "HOMBRE" | "UNISEX" = "UNISEX") => {
    const p = await prisma.product.create({ data: { slug, name: slug, status: "ACTIVE", priceCents: 5000, categoryId, gender } });
    const v = await prisma.variant.create({ data: { sku: `${slug}-M`, productId: p.id, size: "M", color: "Negro", stock } });
    return { p, v };
  };
  return { polos, jeans, mk };
}

async function sell(variantId: string, quantity: number, status: "PAID" | "CANCELLED" = "PAID") {
  const n = Math.random().toString(36).slice(2, 10);
  await prisma.order.create({
    data: {
      code: `T-${n}`, accessToken: n, idempotencyKey: n, status, paidAt: status === "PAID" ? new Date() : null,
      email: "a@a.pe", phone: "987654321", fullName: "A", ubigeo: "150122", department: "Lima", province: "Lima", district: "Miraflores",
      address: "x", subtotalCents: 1, shippingCents: 0, totalCents: 1, paymentMethod: "transfer",
      items: { create: { variantId, sku: "x", productName: "x", size: "M", color: "Negro", unitCents: 1, quantity } },
    },
  });
}

describe("más vendidos", () => {
  it("no inventa ranking sin ventas pagadas suficientes", async () => {
    const { polos, mk } = await catalog();
    const a = await mk("a", polos.id);
    await sell(a.v.id, 3);
    expect(await getBestSellers()).toBeNull();
  });

  it("ordena por unidades pagadas e ignora pedidos cancelados", async () => {
    const { polos, mk } = await catalog();
    const items = await Promise.all(["a", "b", "c", "d", "e"].map((s) => mk(s, polos.id)));
    await sell(items[0].v.id, 1);
    await sell(items[1].v.id, 5);
    await sell(items[2].v.id, 3);
    await sell(items[3].v.id, 2);
    await sell(items[4].v.id, 50, "CANCELLED");
    const best = await getBestSellers();
    expect(best?.map((p) => p.slug)).toEqual(["b", "c", "d", "a"]);
  });
});

describe("relacionados", () => {
  it("prioriza misma categoría y excluye el producto actual", async () => {
    const { polos, jeans, mk } = await catalog();
    const base = await mk("base", polos.id);
    await mk("otro-polo", polos.id);
    await mk("polo-agotado", polos.id, 0);
    await mk("jean", jeans.id);
    const related = await getRelated(base.p);
    expect(related.map((p) => p.slug)).toEqual(["otro-polo", "polo-agotado", "jean"]);
  });
});
