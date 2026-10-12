import Link from "next/link";
import type { Gender } from "@prisma/client";
import { listProducts, type ListingFilters } from "@/lib/catalog";
import { ProductGrid } from "./product-card";

export type SearchParams = Record<string, string | string[] | undefined>;

const arr = (v: string | string[] | undefined) => (Array.isArray(v) ? v : v ? [v] : []);
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const soles = (v: string | undefined) => {
  const n = Number(v);
  return v && Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : undefined;
};

export function parseFilters(sp: SearchParams, fixed: Partial<ListingFilters> = {}): ListingFilters {
  const sort = one(sp.orden);
  const gender = one(sp.genero)?.toUpperCase();
  return {
    q: one(sp.q)?.slice(0, 80) || undefined,
    category: one(sp.categoria),
    gender: gender === "MUJER" || gender === "HOMBRE" || gender === "UNISEX" ? (gender as Gender) : undefined,
    sizes: arr(sp.talla),
    colors: arr(sp.color),
    minCents: soles(one(sp.min)),
    maxCents: soles(one(sp.max)),
    inStock: one(sp.disponible) === "1",
    onSale: one(sp.oferta) === "1",
    isNew: one(sp.nuevo) === "1",
    sort: sort === "nuevos" || sort === "precio-asc" || sort === "precio-desc" ? sort : "relevancia",
    page: Number(one(sp.pagina)) || 1,
    ...fixed,
  };
}

// Listado con filtros como formulario GET: funciona sin JavaScript y las URLs son compartibles.
export async function Listing({
  title,
  intro,
  basePath,
  searchParams,
  fixed = {},
}: {
  title: string;
  intro?: string;
  basePath: string;
  searchParams: SearchParams;
  fixed?: Partial<ListingFilters>;
}) {
  const filters = parseFilters(searchParams, fixed);
  const { products, total, page, pages, facets } = await listProducts(filters);
  const activeCount =
    (filters.sizes?.length ?? 0) + (filters.colors?.length ?? 0) + Number(Boolean(filters.minCents || filters.maxCents)) + Number(Boolean(filters.inStock));

  const pageHref = (p: number) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) for (const x of arr(v)) if (k !== "pagina") qs.append(k, x);
    if (p > 1) qs.set("pagina", String(p));
    const s = qs.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-black tracking-tight">{title}</h1>
      {intro && <p className="mt-2 max-w-2xl text-muted">{intro}</p>}

      <details className="mt-6 rounded-lg border border-line bg-card">
        <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold">
          <span>Filtrar y ordenar{activeCount > 0 && ` (${activeCount})`}</span>
          <span className="text-muted">{total} productos</span>
        </summary>
        <form method="get" action={basePath} className="grid gap-5 border-t border-line p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {filters.q && <input type="hidden" name="q" value={filters.q} />}
          {!fixed.isNew && filters.isNew && <input type="hidden" name="nuevo" value="1" />}
          {!fixed.onSale && filters.onSale && <input type="hidden" name="oferta" value="1" />}
          <fieldset>
            <legend className="label">Talla</legend>
            <div className="flex flex-wrap gap-2">
              {facets.sizes.map((s) => (
                <label key={s} className="cursor-pointer">
                  <input type="checkbox" name="talla" value={s} defaultChecked={filters.sizes?.includes(s)} className="peer sr-only" />
                  <span className="inline-block min-w-10 rounded-md border border-line px-2 py-1.5 text-center peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2">
                    {s}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Color</legend>
            <div className="flex flex-wrap gap-2">
              {facets.colors.map((c) => (
                <label key={c.name} className="cursor-pointer">
                  <input type="checkbox" name="color" value={c.name} defaultChecked={filters.colors?.includes(c.name)} className="peer sr-only" />
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-line px-2 py-1.5 peer-checked:border-ink peer-checked:ring-1 peer-checked:ring-ink peer-focus-visible:outline-2">
                    <span className="h-3 w-3 rounded-full border border-black/15" style={{ background: c.hex }} />
                    {c.name}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="label">Precio (S/)</legend>
            <div className="flex items-center gap-2">
              <input className="input" name="min" inputMode="numeric" placeholder="Mín." defaultValue={filters.minCents ? filters.minCents / 100 : ""} aria-label="Precio mínimo" />
              <span>–</span>
              <input className="input" name="max" inputMode="numeric" placeholder="Máx." defaultValue={filters.maxCents ? filters.maxCents / 100 : ""} aria-label="Precio máximo" />
            </div>
            <label className="mt-3 flex items-center gap-2">
              <input type="checkbox" name="disponible" value="1" defaultChecked={filters.inStock} /> Solo con stock
            </label>
          </fieldset>
          <div>
            <label className="label" htmlFor="orden">Ordenar por</label>
            <select id="orden" name="orden" defaultValue={filters.sort} className="input">
              <option value="relevancia">Recomendados</option>
              <option value="nuevos">Más nuevos</option>
              <option value="precio-asc">Precio: menor a mayor</option>
              <option value="precio-desc">Precio: mayor a menor</option>
            </select>
            <div className="mt-3 flex gap-2">
              <button className="btn-primary flex-1 py-2.5">Aplicar</button>
              <Link href={basePath} className="btn-ghost py-2.5">Limpiar</Link>
            </div>
          </div>
        </form>
      </details>

      <div className="mt-6">
        {products.length ? (
          <ProductGrid products={products} />
        ) : (
          <p className="rounded-lg border border-dashed border-line p-10 text-center text-muted">
            No encontramos productos con esos filtros.
          </p>
        )}
      </div>

      {pages > 1 && (
        <nav className="mt-10 flex justify-center gap-2" aria-label="Paginación">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link key={p} href={pageHref(p)} aria-current={p === page ? "page" : undefined} className={`btn px-4 py-2 ${p === page ? "bg-ink text-white" : "border border-line"}`}>
              {p}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
