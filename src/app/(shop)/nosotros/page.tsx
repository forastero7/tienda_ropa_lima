import type { Metadata } from "next";
import { store } from "@/lib/config";

export const metadata: Metadata = { title: "Sobre la marca" };

export default function AboutPage() {
  return (
    <article className="container-page prose-legal max-w-3xl py-10">
      <h1 className="text-3xl font-black tracking-tight">Sobre {store.name}</h1>
      <p>[Historia de la marca, propuesta de valor y fotos reales del equipo o taller.]</p>
      <h2>Datos del proveedor</h2>
      <p>{store.legalName} · RUC {store.ruc}</p>
      <p>{store.legalAddress}</p>
      <p>{store.supportEmail}</p>
    </article>
  );
}
