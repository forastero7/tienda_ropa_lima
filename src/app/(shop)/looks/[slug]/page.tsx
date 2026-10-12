import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductGrid } from "@/components/product-card";
import { getLook } from "@/lib/catalog";
import { formatPEN } from "@/lib/money";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const look = await getLook((await params).slug);
  return look ? { title: look.title, description: look.description, alternates: { canonical: `/looks/${look.slug}` } } : {};
}

export default async function LookPage({ params }: Props) {
  const look = await getLook((await params).slug);
  if (!look) notFound();
  const products = look.items.map((i) => i.product);
  return (
    <div className="container-page py-8">
      <nav className="mb-4 text-sm text-muted"><Link href="/looks">Compra el look</Link> /</nav>
      <h1 className="text-3xl font-black tracking-tight">{look.title}</h1>
      {look.description && <p className="mt-2 max-w-2xl text-muted">{look.description}</p>}
      <p className="mt-2 text-sm">{products.length} prendas · {formatPEN(products.reduce((s, p) => s + p.priceCents, 0))} el conjunto completo</p>
      <p className="mt-1 text-sm text-muted">Entra a cada prenda para elegir talla y color.</p>
      <div className="mt-6"><ProductGrid products={products} /></div>
    </div>
  );
}
