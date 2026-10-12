"use client";

import { useActionState } from "react";
import { submitComplaint } from "./actions";

const dateFmt = new Intl.DateTimeFormat("es-PE", { dateStyle: "long", timeStyle: "short", timeZone: "America/Lima" });

export function ComplaintForm({ provider }: { provider: { legalName: string; ruc: string; address: string } }) {
  const [state, action, pending] = useActionState(submitComplaint, null);

  if (state?.ok) {
    const d = state.data;
    return (
      <div className="rounded-lg border-2 border-ok bg-card p-6" role="status">
        <p className="eyebrow text-ok">Registrado</p>
        <h2 className="mt-2 text-2xl font-bold">Hoja de reclamación N.º {state.number}</h2>
        <p className="mt-1 text-sm text-muted">Fecha: {dateFmt.format(new Date(state.createdAt))}</p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">Proveedor</dt><dd>{provider.legalName} · RUC {provider.ruc}</dd></div>
          <div><dt className="text-muted">Tipo</dt><dd>{d.type === "RECLAMO" ? "Reclamo" : "Queja"}</dd></div>
          <div><dt className="text-muted">Consumidor</dt><dd>{d.fullName} · {d.documentType} {d.documentNumber}</dd></div>
          <div><dt className="text-muted">Correo</dt><dd>{d.email}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted">Detalle</dt><dd className="whitespace-pre-line">{d.detail}</dd></div>
          <div className="sm:col-span-2"><dt className="text-muted">Pedido</dt><dd className="whitespace-pre-line">{d.request}</dd></div>
        </dl>
        <p className="mt-4 text-sm">
          Responderemos a tu correo a más tardar el <strong>{dateFmt.format(new Date(state.dueAt))}</strong>. Guarda o imprime esta hoja como constancia.
        </p>
        <button className="btn-ghost mt-4" onClick={() => window.print()}>Imprimir constancia</button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-8">
      <fieldset className="space-y-4 rounded-lg border border-line bg-card p-5">
        <legend className="px-1 font-semibold">1. Identificación del consumidor</legend>
        <label className="label">Nombre completo<input name="fullName" className="input mt-1" required /></label>
        <div className="grid gap-4 sm:grid-cols-[140px_1fr]">
          <label className="label">Documento
            <select name="documentType" className="input mt-1"><option>DNI</option><option>CE</option><option>PASAPORTE</option></select>
          </label>
          <label className="label">Número<input name="documentNumber" className="input mt-1" required /></label>
        </div>
        <label className="label">Domicilio<input name="address" className="input mt-1" required /></label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">Teléfono<input name="phone" type="tel" className="input mt-1" required /></label>
          <label className="label">Correo<input name="email" type="email" className="input mt-1" required /></label>
        </div>
        <label className="label">Padre, madre o apoderado (si eres menor de edad)<input name="guardianName" className="input mt-1" /></label>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-line bg-card p-5">
        <legend className="px-1 font-semibold">2. Bien contratado</legend>
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="goodType" value="PRODUCTO" defaultChecked /> Producto</label>
          <label className="flex items-center gap-2"><input type="radio" name="goodType" value="SERVICIO" /> Servicio</label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="label">Código de pedido (si aplica)<input name="orderCode" className="input mt-1 uppercase" /></label>
          <label className="label">Monto reclamado (S/)<input name="amount" inputMode="decimal" className="input mt-1" /></label>
        </div>
        <label className="label">Descripción<input name="goodDescription" className="input mt-1" required /></label>
      </fieldset>

      <fieldset className="space-y-4 rounded-lg border border-line bg-card p-5">
        <legend className="px-1 font-semibold">3. Detalle de la reclamación</legend>
        <div className="space-y-2 text-sm">
          <label className="flex gap-2"><input type="radio" name="type" value="RECLAMO" defaultChecked className="mt-1" /> <span><strong>Reclamo:</strong> disconformidad relacionada con los productos o servicios.</span></label>
          <label className="flex gap-2"><input type="radio" name="type" value="QUEJA" className="mt-1" /> <span><strong>Queja:</strong> disconformidad no relacionada con los productos o servicios, o malestar respecto a la atención.</span></label>
        </div>
        <label className="label">Detalle<textarea name="detail" rows={5} className="input mt-1" required /></label>
        <label className="label">Pedido del consumidor<textarea name="request" rows={3} className="input mt-1" required /></label>
      </fieldset>

      <label className="flex gap-2 text-sm">
        <input type="checkbox" name="accept" className="mt-0.5" />
        Declaro que los datos consignados son verdaderos. Acepto que la respuesta se envíe al correo indicado.
      </label>
      {state && !state.ok && <p role="alert" className="text-sm text-bad">{state.error}</p>}
      <button className="btn-primary w-full sm:w-auto" disabled={pending}>{pending ? "Enviando…" : "Enviar hoja de reclamación"}</button>
    </form>
  );
}
