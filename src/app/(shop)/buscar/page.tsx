import type { Metadata } from "next";
import { Listing, type SearchParams } from "@/components/listing";

export const metadata: Metadata = { title: "Buscar", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return (
    <>
      <form action="/buscar" className="container-page pt-8" role="search">
        <label htmlFor="q" className="sr-only">Buscar productos</label>
        <div className="flex gap-2">
          <input id="q" name="q" defaultValue={q} placeholder="Busca polos, jeans, negro…" className="input" autoFocus />
          <button className="btn-primary">Buscar</button>
        </div>
      </form>
      {q ? (
        <Listing title={`Resultados para “${q}”`} basePath="/buscar" searchParams={sp} />
      ) : (
        <p className="container-page py-10 text-muted">Escribe qué estás buscando.</p>
      )}
    </>
  );
}
