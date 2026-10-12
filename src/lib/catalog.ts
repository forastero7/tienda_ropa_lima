import type { Gender, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

const cardInclude = {
  images: { orderBy: { position: "asc" }, take: 2 },
  variants: { where: { active: true }, orderBy: { position: "asc" } },
  category: true,
} satisfies Prisma.ProductInclude;

export type ProductWithCard = Prisma.ProductGetPayload<{ include: typeof cardInclude }>;

export type ListingFilters = {
  q?: string;
  category?: string;
  gender?: Gender;
  sizes?: string[];
  colors?: string[];
  minCents?: number;
  maxCents?: number;
  inStock?: boolean;
  onSale?: boolean;
  isNew?: boolean;
  sort?: "relevancia" | "nuevos" | "precio-asc" | "precio-desc";
  page?: number;
};

export const PAGE_SIZE = 24;

export const available = (v: { stock: number; reserved: number }) => Math.max(0, v.stock - v.reserved);

export function productAvailable(p: ProductWithCard): boolean {
  return p.variants.some((v) => available(v) > 0);
}

// El catálogo previsto (100–300 productos) permite filtrar variantes en memoria
// tras una consulta indexada por estado/categoría.
export async function listProducts(filters: ListingFilters) {
  const where: Prisma.ProductWhereInput = { status: "ACTIVE" };
  if (filters.category) where.category = { slug: filters.category };
  if (filters.gender) where.gender = filters.gender === "UNISEX" ? "UNISEX" : { in: [filters.gender, "UNISEX"] };
  if (filters.isNew) where.isNew = true;
  if (filters.onSale) where.compareAtCents = { not: null };
  if (filters.minCents != null || filters.maxCents != null) {
    where.priceCents = { gte: filters.minCents ?? undefined, lte: filters.maxCents ?? undefined };
  }
  if (filters.q) {
    const q = filters.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { category: { name: { contains: q, mode: "insensitive" } } },
      { variants: { some: { color: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput[] =
    filters.sort === "precio-asc"
      ? [{ priceCents: "asc" }]
      : filters.sort === "precio-desc"
        ? [{ priceCents: "desc" }]
        : filters.sort === "nuevos"
          ? [{ createdAt: "desc" }]
          : [{ isFeatured: "desc" }, { isNew: "desc" }, { createdAt: "desc" }];

  const all = await prisma.product.findMany({ where, include: cardInclude, orderBy });

  const facets = {
    sizes: sortSizes([...new Set(all.flatMap((p) => p.variants.map((v) => v.size)))]),
    colors: [...new Map(all.flatMap((p) => p.variants.map((v) => [v.color, v.colorHex] as const))).entries()].map(
      ([name, hex]) => ({ name, hex }),
    ),
  };

  const matches = all.filter((p) => {
    const variants = p.variants.filter(
      (v) =>
        (!filters.sizes?.length || filters.sizes.includes(v.size)) &&
        (!filters.colors?.length || filters.colors.includes(v.color)) &&
        (!filters.inStock || available(v) > 0),
    );
    return variants.length > 0;
  });

  // Los agotados van al final para no frustrar al comprador.
  matches.sort((a, b) => Number(productAvailable(b)) - Number(productAvailable(a)));

  const page = Math.max(1, filters.page ?? 1);
  return {
    products: matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    total: matches.length,
    page,
    pages: Math.max(1, Math.ceil(matches.length / PAGE_SIZE)),
    facets,
  };
}

export async function getProduct(slug: string) {
  return prisma.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: {
      images: { orderBy: { position: "asc" } },
      variants: { where: { active: true }, orderBy: { position: "asc" } },
      category: true,
    },
  });
}

export async function getHomeData() {
  const [banner, categories, newest, featured, faqs] = await Promise.all([
    prisma.banner.findFirst({ where: { active: true }, orderBy: { position: "asc" } }),
    prisma.category.findMany({ orderBy: { position: "asc" } }),
    prisma.product.findMany({ where: { status: "ACTIVE", isNew: true }, include: cardInclude, take: 8, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({ where: { status: "ACTIVE", isFeatured: true }, include: cardInclude, take: 8 }),
    prisma.faq.findMany({ orderBy: { position: "asc" } }),
  ]);
  return { banner, categories, newest, featured, faqs };
}

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "3XL"];
export function sortSizes(sizes: string[]): string[] {
  return [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return Number(a) - Number(b) || a.localeCompare(b);
  });
}
