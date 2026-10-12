import type { Metadata } from "next";
import { store } from "@/lib/config";
import { ComplaintForm } from "./form";

export const metadata: Metadata = { title: "Libro de Reclamaciones" };

export default function ComplaintsPage() {
  return (
    <div className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-black tracking-tight">Libro de Reclamaciones</h1>
      <div className="mt-4 rounded-lg border border-line bg-card p-4 text-sm">
        <p><strong>{store.legalName}</strong> · RUC {store.ruc}</p>
        <p className="text-muted">{store.legalAddress}</p>
      </div>
      <p className="mt-4 text-sm text-muted">
        Conforme al Código de Protección y Defensa del Consumidor. La formulación del reclamo no impide acudir a otras vías de solución de
        controversias ni es requisito previo para interponer una denuncia ante Indecopi.
      </p>
      <div className="mt-8">
        <ComplaintForm provider={{ legalName: store.legalName, ruc: store.ruc, address: store.legalAddress }} />
      </div>
    </div>
  );
}
