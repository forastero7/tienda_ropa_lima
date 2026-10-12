import type { Metadata } from "next";
import { LookCard } from "@/components/look-card";
import { getLooks } from "@/lib/catalog";

export const metadata: Metadata = { title: "Compra el look", alternates: { canonical: "/looks" } };
export const revalidate = 300;

export default async function LooksPage() {
  const looks = await getLooks();
  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-black tracking-tight">Compra el look</h1>
      <p className="mt-2 text-muted">Conjuntos armados para inspirarte. Cada prenda se elige con su talla y se agrega por separado.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {looks.map((l) => <LookCard key={l.id} look={l} />)}
      </div>
    </div>
  );
}
