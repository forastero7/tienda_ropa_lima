import type { MetadataRoute } from "next";
import { store } from "@/lib/config";
import { prisma } from "@/lib/db";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true } }),
  ]);
  const staticPaths = ["", "/tienda", "/novedades", "/mujer", "/hombre", "/ofertas", "/ayuda", "/libro-de-reclamaciones"];
  return [
    ...staticPaths.map((p) => ({ url: `${store.siteUrl}${p}` })),
    ...categories.map((c) => ({ url: `${store.siteUrl}/categoria/${c.slug}` })),
    ...products.map((p) => ({ url: `${store.siteUrl}/producto/${p.slug}`, lastModified: p.updatedAt })),
  ];
}
