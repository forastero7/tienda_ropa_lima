"use server";

import { revalidatePath } from "next/cache";
import type { Gender, ProductStatus } from "@prisma/client";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { importCatalogCsv } from "@/lib/catalog-import";
import { prisma } from "@/lib/db";
import { adjustStock } from "@/lib/inventory";
import { solesToCents } from "@/lib/money";

type State = { ok?: string; error?: string } | null;

const MAX_CSV_BYTES = 2_000_000;

export async function importCatalog(_: State, form: FormData): Promise<State> {
  const user = await requireAdmin(["OWNER", "ADMIN"]);
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona un archivo CSV." };
  if (file.size > MAX_CSV_BYTES) return { error: "El archivo supera 2 MB." };
  const report = await importCatalogCsv(await file.text(), user.id);
  revalidatePath("/admin/productos");
  revalidatePath("/", "layout");
  const msg = `${report.products} productos y ${report.variants} SKU importados.`;
  return report.errors.length ? { error: `${msg} Errores: ${report.errors.slice(0, 10).join(" · ")}` } : { ok: msg };
}

export async function saveProduct(_: State, form: FormData): Promise<State> {
  const user = await requireAdmin(["OWNER", "ADMIN"]);
  const id = String(form.get("id"));
  try {
    const compareAt = String(form.get("compareAt") ?? "").trim();
    let measurements: unknown = {};
    const rawMeasurements = String(form.get("measurements") ?? "").trim();
    if (rawMeasurements) {
      measurements = JSON.parse(rawMeasurements);
      if (typeof measurements !== "object" || measurements === null || Array.isArray(measurements)) throw new Error("Medidas: formato inválido");
    }
    const data = {
      name: String(form.get("name")).trim(),
      description: String(form.get("description") ?? ""),
      composition: String(form.get("composition") ?? ""),
      care: String(form.get("care") ?? ""),
      gender: String(form.get("gender")) as Gender,
      status: String(form.get("status")) as ProductStatus,
      priceCents: solesToCents(String(form.get("price"))),
      compareAtCents: compareAt ? solesToCents(compareAt) : null,
      categoryId: String(form.get("categoryId")),
      isNew: form.get("isNew") === "on",
      isFeatured: form.get("isFeatured") === "on",
      weightGrams: Number(form.get("weightGrams")) || 400,
      measurements: measurements as object,
    };
    if (!data.name) throw new Error("El nombre es obligatorio.");
    await prisma.product.update({ where: { id }, data });
    await audit(prisma, { actorId: user.id, action: "product.update", entity: "Product", entityId: id, data: { ...data, measurements: undefined } });
    revalidatePath(`/admin/productos/${id}`);
    revalidatePath("/", "layout");
    return { ok: "Producto guardado." };
  } catch (err) {
    return { error: err instanceof SyntaxError ? "Medidas: JSON inválido." : err instanceof Error ? err.message : "Error" };
  }
}

export async function saveVariant(_: State, form: FormData): Promise<State> {
  const user = await requireAdmin(["OWNER", "ADMIN"]);
  const id = String(form.get("variantId"));
  try {
    const price = String(form.get("price") ?? "").trim();
    const delta = Number.parseInt(String(form.get("delta") ?? "0"), 10) || 0;
    await prisma.$transaction(async (tx) => {
      const v = await tx.variant.update({
        where: { id },
        data: {
          priceCents: price ? solesToCents(price) : null,
          active: form.get("active") === "on",
          lowStockAt: Number(form.get("lowStockAt")) || 0,
        },
      });
      if (delta !== 0) await adjustStock(tx, id, delta, "ADJUSTMENT", String(form.get("note") ?? "Ajuste manual"), user.id);
      await audit(tx, { actorId: user.id, action: "variant.update", entity: "Variant", entityId: id, data: { sku: v.sku, delta, price } });
    });
    revalidatePath("/admin/productos/[id]", "page");
    return { ok: "SKU actualizado." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error" };
  }
}
