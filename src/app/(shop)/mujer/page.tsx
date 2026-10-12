import type { Metadata } from "next";
import { Listing, type SearchParams } from "@/components/listing";

export const metadata: Metadata = { title: "Mujer", alternates: { canonical: "/mujer" } };

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <Listing title="Mujer" intro="Prendas para mujer y unisex." basePath="/mujer" searchParams={await searchParams} fixed={{ gender: "MUJER" }} />;
}
