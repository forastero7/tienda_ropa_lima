import Link from "next/link";
import { ProductGrid } from "@/components/product-card";
import { getHomeData } from "@/lib/catalog";

export const revalidate = 60;

export default async function HomePage() {
  const { banner, categories, newest, featured, faqs } = await getHomeData();

  return (
    <>
      {/* Hero ligero: solo texto y color, sin video ni imagen pesada */}
      <section className="border-b border-line bg-ink text-paper">
        <div className="container-page py-14 sm:py-20">
          <p className="eyebrow text-paper/60">Temporada {new Date().getFullYear()}</p>
          <h1 className="mt-3 max-w-2xl text-4xl leading-[1.05] font-black tracking-tight sm:text-6xl">
            {banner?.title ?? "Ropa urbana hecha para el día a día"}
          </h1>
          {banner?.subtitle && <p className="mt-4 max-w-lg text-paper/80">{banner.subtitle}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={banner?.ctaHref ?? "/novedades"} className="btn-accent">
              {banner?.ctaLabel ?? "Ver novedades"}
            </Link>
            <Link href="/tienda" className="btn border border-paper/30 hover:border-paper">
              Toda la tienda
            </Link>
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

      <section className="container-page py-8">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Novedades</h2>
          <Link href="/novedades" className="text-sm underline">Ver todo</Link>
        </div>
        <ProductGrid products={newest} />
      </section>

      <section className="border-y border-line bg-card">
        <div className="container-page grid gap-6 py-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Pagos en soles", "Precios con IGV incluido y comprobante electrónico."],
            ["Envío transparente", "Ves el costo exacto a tu distrito antes de pagar."],
            ["Medidas reales", "Cada prenda indica sus medidas en centímetros."],
            ["Compra sin registro", "Sigues tu pedido con tu código y correo."],
          ].map(([t, d]) => (
            <div key={t}>
              <p className="font-semibold">{t}</p>
              <p className="mt-1 text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-10">
        <div className="mb-5 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Los más elegidos</h2>
          <Link href="/tienda" className="text-sm underline">Ver todo</Link>
        </div>
        <ProductGrid products={featured} />
      </section>

      {faqs.length > 0 && (
        <section className="container-page max-w-3xl py-6">
          <h2 className="mb-4 text-2xl font-bold">Preguntas frecuentes</h2>
          <div className="divide-y divide-line rounded-lg border border-line bg-card">
            {faqs.map((f) => (
              <details key={f.id} className="group p-4">
                <summary className="cursor-pointer list-none font-medium">
                  {f.question}
                </summary>
                <p className="mt-2 text-sm text-muted">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
