import type { Metadata } from "next";
import { Listing, type SearchParams } from "@/components/listing";

export const metadata: Metadata = { title: "Ofertas", alternates: { canonical: "/ofertas" } };

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <Listing title="Ofertas" intro="Prendas con precio rebajado por tiempo limitado." basePath="/ofertas" searchParams={await searchParams} fixed={{ onSale: true }} />;
}
