"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { STATIC_DEMO } from "@/lib/base-path";
import { demoFindOrder } from "@/lib/demo-api";
import { findOrder, type TrackState } from "./actions";

export default function TrackingPage() {
  const router = useRouter();
  const [state, action, pending] = useActionState<TrackState, FormData>(STATIC_DEMO ? (demoFindOrder as typeof findOrder) : findOrder, null);
  useEffect(() => {
    if (state?.url) router.push(state.url);
  }, [state, router]);

  return (
    <div className="container-page max-w-md py-12">
      <h1 className="text-3xl font-black tracking-tight">Seguir mi pedido</h1>
      <p className="mt-2 text-muted">Ingresa el código que recibiste al comprar (por ejemplo, TL-AB23CDE).</p>
      <form action={action} className="mt-6 space-y-4">
        <label className="label">
          Código de pedido
          <input name="code" className="input mt-1 uppercase" required autoComplete="off" />
        </label>
        <label className="label">
          Correo o celular usado en la compra
          <input name="contact" className="input mt-1" required />
        </label>
        {state?.error && <p role="alert" className="text-sm text-bad">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>{pending ? "Buscando…" : "Ver estado"}</button>
      </form>
    </div>
  );
}
