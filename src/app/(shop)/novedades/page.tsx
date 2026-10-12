import type { Metadata } from "next";
import { Listing, type SearchParams } from "@/components/listing";

export const metadata: Metadata = { title: "Novedades", alternates: { canonical: "/novedades" } };

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <Listing title="Novedades" intro="Lo último que llegó a la tienda." basePath="/novedades" searchParams={await searchParams} fixed={{ isNew: true }} />;
}
