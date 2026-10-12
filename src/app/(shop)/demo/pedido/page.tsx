"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { STATIC_DEMO } from "@/lib/base-path";
import { loadDemoOrders, type DemoOrder } from "@/lib/demo-api";
import { formatPEN } from "@/lib/money";

// Confirmación de pedido de la versión estática de revisión (el pedido vive en este navegador).
export default function DemoOrderPage() {
  const [order, setOrder] = useState<DemoOrder | null | undefined>(undefined);
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("c");
    setOrder(loadDemoOrders().find((o) => o.code === code) ?? null);
  }, []);

  if (!STATIC_DEMO || order === null) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-bold">Pedido no encontrado</h1>
        <Link href="/tienda" className="btn-primary mt-6">Ir a la tienda</Link>
      </div>
    );
  }
  if (!order) return <div className="container-page py-16 text-muted">Cargando…</div>;

  const paid = order.status === "PAID";
  return (
    <div className="container-page max-w-3xl py-10">
      <p className="eyebrow">Pedido {order.code}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">{paid ? "¡Gracias! Recibimos tu pago" : "Tu pedido fue creado"}</h1>
      <p className="mt-2 rounded-md bg-warn/10 p-3 text-sm text-warn">
        Versión de revisión: no se realizó ningún cobro ni se guardó el pedido en un servidor.
        {paid && " El pago con tarjeta se simuló como aprobado."}
      </p>

      {order.instructions && (
        <section className="mt-6 rounded-lg border-2 border-ink bg-card p-5">
          <h2 className="text-lg font-semibold">{order.instructions.title}</h2>
          <p className="mt-1 text-2xl font-bold">{formatPEN(order.totalCents)}</p>
          <ul className="mt-3 space-y-1 text-sm">{order.instructions.lines.map((l) => <li key={l}>{l}</li>)}</ul>
          <p className="mt-3 text-sm text-warn">En la tienda real el pedido queda “pago pendiente” hasta que un administrador verifica el abono.</p>
        </section>
      )}

      <div className="mt-8 grid gap-8 sm:grid-cols-2 text-sm">
        <section>
          <h2 className="mb-3 font-semibold">Estado</h2>
          <p className="font-medium">{paid ? "Pago validado" : "Pago pendiente"}</p>
          <p className="text-muted">Siguientes pasos: en preparación → enviado → entregado.</p>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Entrega</h2>
          <p>{order.fullName}</p>
          <p>{order.address}</p>
          {order.reference && <p className="text-muted">Ref.: {order.reference}</p>}
          <p>{order.place}</p>
          <p className="mt-2 text-muted">{order.eta}</p>
        </section>
      </div>

      <section className="mt-8 rounded-lg border border-line bg-card p-5 text-sm">
        <ul className="space-y-2">
          {order.lines.map((l, i) => (
            <li key={i} className="flex justify-between gap-2">
              <span>{l.quantity} × {l.name} <span className="text-muted">({l.color}, {l.size})</span></span>
              <span>{formatPEN(l.unitCents * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-line pt-3">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPEN(order.subtotalCents)}</dd></div>
          {order.discountCents > 0 && <div className="flex justify-between"><dt>Descuento ({order.couponCode})</dt><dd>−{formatPEN(order.discountCents)}</dd></div>}
          <div className="flex justify-between"><dt>Envío ({order.zoneName})</dt><dd>{formatPEN(order.shippingCents)}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatPEN(order.totalCents)}</dd></div>
        </dl>
      </section>
      <p className="mt-6 text-sm">Puedes probar el <Link href="/seguimiento" className="underline">seguimiento</Link> con el código {order.code} y tu correo.</p>
    </div>
  );
}
