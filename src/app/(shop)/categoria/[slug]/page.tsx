import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Listing, type SearchParams } from "@/components/listing";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  return category ? { title: category.name, alternates: { canonical: `/categoria/${slug}` } } : {};
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const category = await prisma.category.findUnique({ where: { slug } });
  if (!category) notFound();
  return <Listing title={category.name} basePath={`/categoria/${slug}`} searchParams={await searchParams} fixed={{ category: slug }} />;
}
