import Link from "next/link";
import { available, productAvailable, type ProductWithCard } from "@/lib/catalog";
import { formatPEN } from "@/lib/money";
import { ProductImage } from "./product-image";

export function ProductCard({ product, priority }: { product: ProductWithCard; priority?: boolean }) {
  const inStock = productAvailable(product);
  const colors = [...new Map(product.variants.map((v) => [v.color, v.colorHex])).entries()];
  const sizesInStock = [...new Set(product.variants.filter((v) => available(v) > 0).map((v) => v.size))];

  return (
    <Link href={`/producto/${product.slug}`} className="group block">
      <div className="relative">
        <ProductImage src={product.images[0]?.url} alt={product.images[0]?.alt || product.name} priority={priority} className="rounded-lg" />
        <div className="absolute top-2 left-2 flex gap-1">
          {!inStock && <span className="rounded-full bg-ink px-2 py-0.5 text-[11px] font-semibold text-white">Agotado</span>}
          {inStock && product.compareAtCents && (
            <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-semibold text-white">Oferta</span>
          )}
          {inStock && product.isNew && <span className="rounded-full bg-card px-2 py-0.5 text-[11px] font-semibold">Nuevo</span>}
        </div>
      </div>
      <div className="mt-2 space-y-1">
        <h3 className="text-sm leading-snug group-hover:underline">{product.name}</h3>
        <p className="text-sm">
          <span className="font-semibold">{formatPEN(product.priceCents)}</span>
          {product.compareAtCents && (
            <span className="ml-2 text-muted line-through">{formatPEN(product.compareAtCents)}</span>
          )}
        </p>
        <div className="flex items-center gap-1.5">
          {colors.map(([name, hex]) => (
            <span key={name} title={name} className="h-3 w-3 rounded-full border border-black/15" style={{ background: hex }} />
          ))}
          {inStock && <span className="ml-1 text-[11px] text-muted">{sizesInStock.join(" · ")}</span>}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductWithCard[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-6 sm:gap-x-5 lg:grid-cols-4">
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < 4} />
      ))}
    </div>
  );
}
