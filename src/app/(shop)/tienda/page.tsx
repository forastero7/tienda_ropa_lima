import type { Metadata } from "next";
import { Listing, type SearchParams } from "@/components/listing";

export const metadata: Metadata = { title: "Toda la tienda", alternates: { canonical: "/tienda" } };

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <Listing title="Toda la tienda" intro="Polos, poleras, pantalones, casacas y vestidos." basePath="/tienda" searchParams={await searchParams} fixed={{  }} />;
}
