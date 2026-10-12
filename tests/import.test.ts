import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { importCatalogCsv, importStockCsv } from "@/lib/catalog-import";
import { resetDb } from "./helpers";

beforeEach(resetDb);

const csv = `slug,nombre,categoria,genero,precio,precio_anterior,descripcion,composicion,cuidado,peso_g,estado,imagenes,sku,talla,color,color_hex,stock
polo-lima,Polo Lima,Polos,mujer,79.90,,Polo,100% algodón,Lavar en frío,250,activo,/a.jpg|/b.jpg,PL-NEG-S,S,Negro,#111111,4
polo-lima,Polo Lima,Polos,mujer,79.90,,Polo,100% algodón,Lavar en frío,250,activo,,PL-NEG-M,M,Negro,#111111,0
malo,,Polos,,10,,,,,,,,X1,S,Rojo,,1
`;

describe("importación CSV", () => {
  it("crea productos, variantes, imágenes y movimientos de stock", async () => {
    const admin = await prisma.adminUser.create({ data: { email: "a@a.pe", name: "A", passwordHash: "x" } });
    const report = await importCatalogCsv(csv, admin.id);
    expect(report.products).toBe(1);
    expect(report.variants).toBe(2);
    expect(report.errors).toHaveLength(1);

    const product = await prisma.product.findUniqueOrThrow({ where: { slug: "polo-lima" }, include: { images: true, variants: true } });
    expect(product.priceCents).toBe(7990);
    expect(product.status).toBe("ACTIVE");
    expect(product.gender).toBe("MUJER");
    expect(product.images).toHaveLength(2);
    expect(product.variants.find((v) => v.sku === "PL-NEG-S")?.stock).toBe(4);

    // Reimportar es idempotente y el stock se fija al valor absoluto.
    await importCatalogCsv(csv, admin.id);
    expect(await prisma.variant.count()).toBe(2);
    expect(await prisma.stockMovement.count({ where: { type: "IMPORT" } })).toBe(1);

    const r2 = await importStockCsv("sku,stock\nPL-NEG-S,10\nNOEXISTE,1\n", admin.id);
    expect(r2.variants).toBe(1);
    expect(r2.errors).toHaveLength(1);
    expect((await prisma.variant.findUniqueOrThrow({ where: { sku: "PL-NEG-S" } })).stock).toBe(10);
  });
});
