import Image from "next/image";
import Link from "next/link";
import { LookCard } from "@/components/look-card";
import { ProductGrid } from "@/components/product-card";
import { withBase } from "@/lib/base-path";
import { getHomeData } from "@/lib/catalog";
import { formatPEN } from "@/lib/money";
import { availableMethods } from "@/lib/payments/registry";

export const revalidate = 60;

function SectionHeader({ title, href, linkLabel = "Ver todo" }: { title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between">
      <h2 className="text-2xl font-bold">{title}</h2>
      {href && <Link href={href} className="text-sm underline">{linkLabel}</Link>}
    </div>
  );
}

export default async function HomePage() {
  const { banner, categories, newest, featured, onSale, bestSellers, looks, faqs, zones } = await getHomeData();
  // Solo métodos reales del adaptador; la pasarela de prueba no se anuncia como medio de pago.
  const methods = availableMethods().filter((m) => m.providerId !== "sandbox");
  const cheapest = zones.reduce<(typeof zones)[number] | null>((min, z) => (!min || z.feeCents < min.feeCents ? z : min), null);

  return (
    <>
      {/* Hero ligero: imagen optimizada opcional, sin video autoplay (LCP) */}
      <section className="relative overflow-hidden border-b border-line bg-ink text-paper">
        {banner?.imageUrl && (
          <Image
            src={withBase(banner.imageUrl)}
            alt=""
            fill
            priority
            sizes="100vw"
            unoptimized={banner.imageUrl.endsWith(".svg")}
            className="object-cover opacity-60"
          />
        )}
        <div className="relative container-page py-14 sm:py-20">
          <p className="eyebrow text-paper/60">Temporada {new Date().getFullYear()}</p>
          <h1 className="mt-3 max-w-2xl text-4xl leading-[1.05] font-black tracking-tight sm:text-6xl">
            {banner?.title ?? "Ropa urbana hecha para el día a día"}
          </h1>
          {banner?.subtitle && <p className="mt-4 max-w-lg text-paper/80">{banner.subtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={banner?.ctaHref ?? "/novedades"} className="btn-accent">{banner?.ctaLabel ?? "Ver novedades"}</Link>
            <Link href="/tienda" className="btn border border-paper/30 hover:border-paper">Toda la tienda</Link>
          </div>
        </div>
      </section>

      <nav aria-label="Categorías" className="container-page -mb-2 flex gap-2 overflow-x-auto py-5">
        {categories.map((c) => (
          <Link key={c.id} href={`/categoria/${c.slug}`} className="shrink-0 rounded-full border border-line bg-card px-4 py-2 text-sm hover:border-ink">
            {c.name}
          </Link>
        ))}
      </nav>

      {newest.length > 0 && (
        <section className="container-page py-8">
          <SectionHeader title="Novedades" href="/novedades" />
          <ProductGrid products={newest} />
        </section>
      )}

      {onSale.length > 0 && (
        <section className="bg-accent/8 py-10">
          <div className="container-page">
            <SectionHeader title="Ofertas" href="/ofertas" linkLabel="Ver ofertas" />
            <ProductGrid products={onSale} />
          </div>
        </section>
      )}

      {looks.length > 0 && (
        <section className="container-page py-10">
          <SectionHeader title="Compra el look" href="/looks" linkLabel="Ver looks" />
          <div className="grid gap-4 md:grid-cols-2">
            {looks.map((l) => <LookCard key={l.id} look={l} />)}
          </div>
        </section>
      )}

      <section className="container-page py-10">
        {/* "Más vendidos" solo con ventas reales; si no hay suficientes, se muestran los destacados. */}
        <SectionHeader title={bestSellers ? "Más vendidos" : "Destacados"} href="/tienda" />
        <ProductGrid products={bestSellers ?? featured} />
      </section>

      <section className="border-y border-line bg-card">
        <div className="container-page grid gap-8 py-10 text-sm md:grid-cols-3">
          <div>
            <h2 className="text-lg font-bold">Envíos a todo el Perú</h2>
            <p className="mt-2 text-muted">Ves el costo exacto a tu distrito antes de pagar.</p>
            <ul className="mt-3 space-y-1">
              {zones.map((z) => (
                <li key={z.id} className="flex justify-between gap-2">
                  <span>{z.name}</span>
                  <span className="text-muted">desde {formatPEN(z.feeCents)}</span>
                </li>
              ))}
            </ul>
            {cheapest?.freeOverCents && (
              <p className="mt-2 text-ok">Envío gratis en {cheapest.name} desde {formatPEN(cheapest.freeOverCents)}.</p>
            )}
            <Link href="/legal/envios" className="mt-2 inline-block underline">Política de envíos</Link>
          </div>
          <div>
            <h2 className="text-lg font-bold">Métodos de pago</h2>
            <p className="mt-2 text-muted">Pagas en soles. Los datos de tarjeta los procesa la pasarela; nunca los guardamos.</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {methods.map((m) => (
                <li key={m.id} className="rounded-md border border-line px-3 py-1.5">{m.label}</li>
              ))}
              {methods.length === 0 && <li className="text-muted">Por configurar.</li>}
            </ul>
          </div>
          <div>
            <h2 className="text-lg font-bold">Compra con confianza</h2>
            <ul className="mt-2 space-y-2 text-muted">
              <li>Medidas reales en centímetros en cada prenda.</li>
              <li>Compra sin registro y seguimiento con tu código.</li>
              <li>Comprobante electrónico: boleta o factura.</li>
              <li><Link href="/libro-de-reclamaciones" className="underline">Libro de Reclamaciones</Link> virtual.</li>
            </ul>
          </div>
        </div>
      </section>

      {faqs.length > 0 && (
        <section className="container-page max-w-3xl py-10">
          <h2 className="mb-4 text-2xl font-bold">Preguntas frecuentes</h2>
          <div className="divide-y divide-line rounded-lg border border-line bg-card">
            {faqs.map((f) => (
              <details key={f.id} className="p-4">
                <summary className="cursor-pointer font-medium">{f.question}</summary>
                <p className="mt-2 text-sm text-muted">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
