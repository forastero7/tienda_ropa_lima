import type { Metadata } from "next";
import { Listing, type SearchParams } from "@/components/listing";

export const metadata: Metadata = { title: "Hombre", alternates: { canonical: "/hombre" } };

export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <Listing title="Hombre" intro="Prendas para hombre y unisex." basePath="/hombre" searchParams={await searchParams} fixed={{ gender: "HOMBRE" }} />;
}
