import type { ShippingZone } from "@prisma/client";
import { ActionForm } from "@/components/action-form";
import { PageTitle } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { centsToDecimal } from "@/lib/money";
import { saveZone } from "./actions";

function ZoneForm({ zone }: { zone?: ShippingZone }) {
  return (
    <ActionForm action={saveZone} submitLabel={zone ? "Guardar" : "Crear zona"} variant={zone ? "ghost" : "primary"} className="grid gap-2 rounded-lg border border-line bg-card p-4 text-sm sm:grid-cols-4">
      <input type="hidden" name="id" value={zone?.id ?? ""} />
      <label className="sm:col-span-2">Nombre<input name="name" defaultValue={zone?.name} className="input py-1.5" required /></label>
      <label className="sm:col-span-2">Prefijos ubigeo (coma)<input name="prefixes" defaultValue={zone?.ubigeoPrefixes.join(",")} className="input py-1.5" placeholder="1501,0701" /></label>
      <label>Tarifa (S/)<input name="fee" defaultValue={zone ? centsToDecimal(zone.feeCents) : ""} className="input py-1.5" required /></label>
      <label>Por kg adicional (S/)<input name="perKg" defaultValue={zone ? centsToDecimal(zone.perKgCents) : ""} className="input py-1.5" /></label>
      <label>Gratis desde (S/)<input name="freeOver" defaultValue={zone?.freeOverCents ? centsToDecimal(zone.freeOverCents) : ""} className="input py-1.5" /></label>
      <label>Prioridad<input name="position" type="number" defaultValue={zone?.position ?? 0} className="input py-1.5" /></label>
      <label className="sm:col-span-4">Plazo mostrado al cliente<input name="eta" defaultValue={zone?.etaText} className="input py-1.5" placeholder="Solo plazos respaldados por el contrato con el courier" /></label>
      <div className="flex gap-4 sm:col-span-4">
        <label className="flex items-center gap-2"><input type="checkbox" name="cod" defaultChecked={zone?.codAllowed} /> Permite contraentrega</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={zone?.active ?? true} /> Activa</label>
      </div>
    </ActionForm>
  );
}

export default async function ShippingPage() {
  const zones = await prisma.shippingZone.findMany({ orderBy: { position: "asc" } });
  return (
    <>
      <PageTitle>Zonas de envío</PageTitle>
      <p className="mb-4 max-w-3xl text-sm text-muted">
        Se aplica la zona activa cuyo prefijo de ubigeo coincida con más dígitos: distrito (6), provincia (4) o departamento (2). Un prefijo vacío cubre
        el resto del país. Ej.: Lima Metropolitana = 1501, Callao = 0701.
      </p>
      <div className="space-y-3">
        {zones.map((z) => <ZoneForm key={z.id} zone={z} />)}
        <h2 className="pt-4 font-semibold">Nueva zona</h2>
        <ZoneForm />
      </div>
    </>
  );
}
