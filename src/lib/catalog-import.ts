import type { Gender, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { adjustStock } from "@/lib/inventory";
import { solesToCents } from "@/lib/money";
import { parseCsv } from "@/lib/csv";

export const CATALOG_COLUMNS = [
  "slug", "nombre", "categoria", "genero", "precio", "precio_anterior", "descripcion", "composicion", "cuidado",
  "peso_g", "estado", "imagenes", "sku", "talla", "color", "color_hex", "stock",
] as const;

export type ImportReport = { products: number; variants: number; errors: string[] };

const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const GENDERS: Record<string, Gender> = { mujer: "MUJER", hombre: "HOMBRE", unisex: "UNISEX" };
const STATUSES: Record<string, ProductStatus> = { activo: "ACTIVE", borrador: "DRAFT", archivado: "ARCHIVED" };

// Carga masiva del catálogo. Cada fila es un SKU; las filas con el mismo slug forman un producto.
// "stock" se interpreta como cantidad absoluta en almacén y se registra como movimiento.
export async function importCatalogCsv(text: string, actorId: string): Promise<ImportReport> {
  const rows = parseCsv(text);
  const report: ImportReport = { products: 0, variants: 0, errors: [] };
  const groups = new Map<string, { line: number; row: Record<string, string> }[]>();
  rows.forEach((row, i) => {
    const slug = slugify(row.slug || row.nombre || "");
    if (!slug) return report.errors.push(`Fila ${i + 2}: falta slug o nombre.`);
    groups.set(slug, [...(groups.get(slug) ?? []), { line: i + 2, row }]);
  });

  for (const [slug, items] of groups) {
    const first = items[0].row;
    try {
      await prisma.$transaction(async (tx) => {
        const catSlug = slugify(first.categoria || "general");
        const category = await tx.category.upsert({
          where: { slug: catSlug },
          update: {},
          create: { slug: catSlug, name: first.categoria || "General" },
        });
        const data = {
          name: first.nombre,
          description: first.descripcion ?? "",
          composition: first.composicion ?? "",
          care: first.cuidado ?? "",
          gender: GENDERS[(first.genero ?? "").toLowerCase()] ?? "UNISEX",
          status: STATUSES[(first.estado ?? "").toLowerCase()] ?? "DRAFT",
          priceCents: solesToCents(first.precio),
          compareAtCents: first.precio_anterior ? solesToCents(first.precio_anterior) : null,
          weightGrams: Number(first.peso_g) || 400,
          categoryId: category.id,
        };
        if (!data.name) throw new Error("falta nombre");
        const product = await tx.product.upsert({ where: { slug }, update: data, create: { slug, ...data } });

        if (first.imagenes) {
          const urls = first.imagenes.split("|").map((u) => u.trim()).filter(Boolean);
          await tx.productImage.deleteMany({ where: { productId: product.id } });
          await tx.productImage.createMany({ data: urls.map((url, position) => ({ productId: product.id, url, alt: data.name, position })) });
        }

        for (const [position, { line, row }] of items.entries()) {
          if (!row.sku || !row.talla || !row.color) throw new Error(`fila ${line}: sku, talla y color son obligatorios`);
          const variant = await tx.variant.upsert({
            where: { sku: row.sku },
            update: { size: row.talla, color: row.color, colorHex: row.color_hex || undefined, productId: product.id, position },
            create: { sku: row.sku, size: row.talla, color: row.color, colorHex: row.color_hex || "#cccccc", productId: product.id, position },
          });
          if (row.stock !== undefined && row.stock !== "") {
            const target = Number.parseInt(row.stock, 10);
            if (!Number.isInteger(target) || target < 0) throw new Error(`fila ${line}: stock inválido`);
            await adjustStock(tx, variant.id, target - variant.stock, "IMPORT", "Carga CSV", actorId);
          }
          report.variants++;
        }
        report.products++;
      });
    } catch (err) {
      report.errors.push(`Producto ${slug}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  await audit(prisma, { actorId, action: "catalog.import", entity: "Product", data: { products: report.products, variants: report.variants, errors: report.errors.length } });
  return report;
}

// Actualización rápida de stock: columnas sku,stock (cantidad absoluta).
export async function importStockCsv(text: string, actorId: string): Promise<ImportReport> {
  const rows = parseCsv(text);
  const report: ImportReport = { products: 0, variants: 0, errors: [] };
  for (const [i, row] of rows.entries()) {
    const target = Number.parseInt(row.stock, 10);
    if (!row.sku || !Number.isInteger(target) || target < 0) {
      report.errors.push(`Fila ${i + 2}: sku o stock inválido.`);
      continue;
    }
    try {
      await prisma.$transaction(async (tx) => {
        const v = await tx.variant.findUnique({ where: { sku: row.sku } });
        if (!v) throw new Error("SKU no existe");
        await adjustStock(tx, v.id, target - v.stock, "IMPORT", "Carga CSV de stock", actorId);
      });
      report.variants++;
    } catch (err) {
      report.errors.push(`Fila ${i + 2} (${row.sku}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  await audit(prisma, { actorId, action: "stock.import", entity: "Variant", data: { updated: report.variants, errors: report.errors.length } });
  return report;
}
