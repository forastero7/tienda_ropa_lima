import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductBuyBox } from "@/components/product-gallery";
import { available, getProduct, sortSizes } from "@/lib/catalog";
import { store } from "@/lib/config";
import { prisma } from "@/lib/db";
import { formatPEN } from "@/lib/money";

export const revalidate = 30;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  const image = product.images[0]?.url;
  return {
    title: product.name,
    description: `${product.name} — ${formatPEN(product.priceCents)}. ${product.description}`.slice(0, 160),
    alternates: { canonical: `/producto/${product.slug}` },
    openGraph: { title: product.name, images: image && !image.endsWith(".svg") ? [image] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();

  const minShipping = await prisma.shippingZone.findFirst({ where: { active: true }, orderBy: { feeCents: "asc" } });
  const sizes = sortSizes([...new Set(product.variants.map((v) => v.size))]);
  const variants = product.variants.map((v) => ({
    id: v.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    colorHex: v.colorHex,
    available: available(v),
    priceCents: v.priceCents ?? product.priceCents,
  }));
  const measurements = product.measurements as Record<string, Record<string, number>>;
  const measureKeys = [...new Set(Object.values(measurements).flatMap((m) => Object.keys(m)))];
  const inStock = variants.some((v) => v.available > 0);

  // Datos estructurados Product/Offer para buscadores.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => `${store.siteUrl}${i.url}`),
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: store.name },
    offers: {
      "@type": "Offer",
      url: `${store.siteUrl}/producto/${product.slug}`,
      priceCurrency: "PEN",
      price: (product.priceCents / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="container-page py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-4 text-sm text-muted" aria-label="Ruta">
        <Link href="/">Inicio</Link> / <Link href={`/categoria/${product.category.slug}`}>{product.category.name}</Link>
      </nav>

      <ProductBuyBox
        productName={product.name}
        images={product.images.map((i) => ({ url: i.url, alt: i.alt, color: i.color }))}
        variants={variants}
        sizes={sizes}
      >
        <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
        <p className="mt-2 text-xl">
          <span className="font-semibold">{formatPEN(product.priceCents)}</span>
          {product.compareAtCents && <span className="ml-3 text-base text-muted line-through">{formatPEN(product.compareAtCents)}</span>}
        </p>
        <p className="mt-1 text-xs text-muted">IGV incluido</p>
        {minShipping && (
          <p className="mt-3 text-sm">
            Envío desde <strong>{formatPEN(minShipping.feeCents)}</strong>
            {minShipping.freeOverCents && <> · gratis en {minShipping.name} desde {formatPEN(minShipping.freeOverCents)}</>}. El costo exacto se
            calcula con tu distrito antes de pagar.
          </p>
        )}
      </ProductBuyBox>

      <div className="mt-12 grid gap-10 md:grid-cols-2">
        <section>
          <h2 className="text-lg font-semibold">Descripción</h2>
          <p className="mt-2 text-ink/90">{product.description}</p>
          <h3 className="mt-6 font-semibold">Composición</h3>
          <p className="mt-1 text-ink/90">{product.composition}</p>
          <h3 className="mt-6 font-semibold">Cuidado</h3>
          <p className="mt-1 text-ink/90">{product.care}</p>
          {store.whatsapp && (
            <a
              className="btn-ghost mt-6"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Hola, tengo una consulta sobre: ${product.name}`)}`}
            >
              ¿Dudas con la talla? Escríbenos por WhatsApp
            </a>
          )}
        </section>

        {measureKeys.length > 0 && (
          <section id="medidas" className="scroll-mt-20">
            <h2 className="text-lg font-semibold">Medidas de la prenda (cm)</h2>
            <p className="mt-1 text-sm text-muted">
              Medidas de la prenda extendida, no del cuerpo. Compáralas con una prenda tuya que te quede bien. Tolerancia ±1 cm.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse bg-card text-sm">
                <thead>
                  <tr>
                    <th className="border border-line px-3 py-2 text-left">Talla</th>
                    {measureKeys.map((k) => (
                      <th key={k} className="border border-line px-3 py-2 text-left">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortSizes(Object.keys(measurements)).map((s) => (
                    <tr key={s}>
                      <th className="border border-line px-3 py-2 text-left">{s}</th>
                      {measureKeys.map((k) => (
                        <td key={k} className="border border-line px-3 py-2">{measurements[s]?.[k] ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
