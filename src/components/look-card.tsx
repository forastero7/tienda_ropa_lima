import Link from "next/link";
import type { LookWithProducts } from "@/lib/catalog";
import { formatPEN } from "@/lib/money";
import { ProductImage } from "./product-image";

// Tarjeta de "Compra el look": mosaico de las prendas del conjunto y su precio total.
export function LookCard({ look }: { look: LookWithProducts }) {
  const products = look.items.map((i) => i.product);
  const total = products.reduce((s, p) => s + p.priceCents, 0);
  return (
    <Link href={`/looks/${look.slug}`} className="group block rounded-xl border border-line bg-card p-3">
      {look.imageUrl ? (
        <ProductImage src={look.imageUrl} alt={look.title} className="rounded-lg" sizes="(min-width: 768px) 50vw, 100vw" />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {products.slice(0, 3).map((p) => (
            <ProductImage key={p.id} src={p.images[0]?.url} alt="" sizes="(min-width: 768px) 16vw, 33vw" className="rounded-md" />
          ))}
        </div>
      )}
      <div className="mt-3 flex items-end justify-between gap-3">
        <div>
          <h3 className="font-semibold group-hover:underline">{look.title}</h3>
          <p className="text-sm text-muted">{products.length} prendas · {formatPEN(total)} en total</p>
        </div>
        <span className="text-sm font-semibold whitespace-nowrap">Ver look →</span>
      </div>
    </Link>
  );
}
