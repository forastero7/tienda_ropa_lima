import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LEGAL_PAGES } from "@/lib/legal";

type Props = { params: Promise<{ page: string }> };

export function generateStaticParams() {
  return Object.keys(LEGAL_PAGES).map((page) => ({ page }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = LEGAL_PAGES[(await params).page];
  return page ? { title: page.title } : {};
}

export default async function LegalPage({ params }: Props) {
  const page = LEGAL_PAGES[(await params).page];
  if (!page) notFound();
  return (
    <article className="container-page prose-legal max-w-3xl py-10">
      <h1 className="text-3xl font-black tracking-tight">{page.title}</h1>
      {page.body}
    </article>
  );
}
