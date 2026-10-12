import type { Metadata } from "next";
import Link from "next/link";
import { store } from "@/lib/config";
import { prisma } from "@/lib/db";

export const metadata: Metadata = { title: "Ayuda" };
export const revalidate = 300;

export default async function HelpPage() {
  const faqs = await prisma.faq.findMany({ orderBy: { position: "asc" } });
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-black tracking-tight">Ayuda</h1>
      <div className="mt-6 divide-y divide-line rounded-lg border border-line bg-card">
        {faqs.map((f) => (
          <details key={f.id} className="p-4">
            <summary className="cursor-pointer font-medium">{f.question}</summary>
            <p className="mt-2 text-sm text-muted">{f.answer}</p>
          </details>
        ))}
      </div>
      <h2 className="mt-10 text-xl font-bold">Contacto</h2>
      <div className="mt-3 flex flex-wrap gap-3">
        {store.whatsapp && <a className="btn-primary" href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
        {store.supportEmail && <a className="btn-ghost" href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a>}
        <Link className="btn-ghost" href="/seguimiento">Seguir mi pedido</Link>
      </div>
    </div>
  );
}
