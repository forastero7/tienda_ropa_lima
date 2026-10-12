import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderTimeline } from "@/components/order-timeline";
import { PurchaseTracker } from "@/components/purchase-tracker";
import { RetryPayment } from "@/components/retry-payment";
import { store } from "@/lib/config";
import { prisma } from "@/lib/db";
import { formatPEN } from "@/lib/money";
import { safeEqual } from "@/lib/orders/access";
import { AWAITING_PAYMENT, PAID_STATUSES } from "@/lib/orders/status";
import { manualInstructions } from "@/lib/payments/manual";
import { findMethod } from "@/lib/payments/registry";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };
export const dynamic = "force-dynamic";

const timeFmt = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" });

export default async function OrderPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ t?: string }> }) {
  const { code } = await params;
  const { t } = await searchParams;
  const order = await prisma.order.findUnique({
    where: { code },
    include: { items: true, events: { orderBy: { createdAt: "asc" } }, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  // El enlace privado lleva un token; sin él se usa la página de seguimiento (código + correo).
  if (!order || !t || !safeEqual(order.accessToken, t)) notFound();

  const method = findMethod(order.paymentMethod);
  const awaiting = AWAITING_PAYMENT.includes(order.status);
  const instructions = awaiting && method?.kind === "manual" ? manualInstructions(method.id) : null;
  const lastPayment = order.payments[0];
  const canRetry = awaiting && method?.kind === "online" && order.reservationExpiresAt && order.reservationExpiresAt > new Date();
  const paid = PAID_STATUSES.includes(order.status);

  return (
    <div className="container-page max-w-3xl py-10">
      {paid && (
        <PurchaseTracker
          code={order.code}
          value={order.totalCents / 100}
          items={order.items.map((i) => ({ item_id: i.sku, item_name: i.productName, item_variant: `${i.color} / ${i.size}`, price: i.unitCents / 100, quantity: i.quantity }))}
        />
      )}
      <p className="eyebrow">Pedido {order.code}</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight">
        {paid ? "¡Gracias! Recibimos tu pago" : awaiting ? "Tu pedido fue creado" : order.status === "CANCELLED" ? "Pedido cancelado" : "Detalle del pedido"}
      </h1>
      <p className="mt-2 text-muted">
        Guarda tu código <strong className="text-ink">{order.code}</strong>. Puedes seguir el pedido en{" "}
        <Link href="/seguimiento" className="underline">Seguimiento</Link> con este código y tu correo.
      </p>

      {awaiting && lastPayment?.status === "FAILED" && (
        <div className="mt-6 rounded-lg border border-bad/30 bg-bad/5 p-4">
          <p className="font-semibold text-bad">El pago no se completó.</p>
          <p className="text-sm">No se realizó ningún cobro. Puedes intentarlo nuevamente.</p>
        </div>
      )}
      {awaiting && lastPayment?.status === "PENDING" && method?.kind === "online" && (
        <div className="mt-6 rounded-lg border border-warn/30 bg-warn/5 p-4 text-sm">
          Estamos esperando la confirmación de la pasarela de pagos. Esta página se actualiza al recargarla.
        </div>
      )}
      {canRetry && (lastPayment?.status === "FAILED" || lastPayment?.status === "EXPIRED") && (
        <div className="mt-4"><RetryPayment code={order.code} token={order.accessToken} /></div>
      )}

      {instructions && (
        <section className="mt-6 rounded-lg border-2 border-ink bg-card p-5">
          <h2 className="text-lg font-semibold">{instructions.title}</h2>
          <p className="mt-1 text-2xl font-bold">{formatPEN(order.totalCents)}</p>
          <ul className="mt-3 space-y-1 text-sm">
            {instructions.lines.map((l) => <li key={l}>{l}</li>)}
          </ul>
          {order.reservationExpiresAt && (
            <p className="mt-3 text-sm text-warn">
              Separamos tus productos hasta el {timeFmt.format(order.reservationExpiresAt)}. Si no recibimos el pago, el pedido se cancela automáticamente.
            </p>
          )}
          {store.whatsapp && (
            <a className="btn-ghost mt-4" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${store.whatsapp}?text=${encodeURIComponent(`Hola, realicé el pago del pedido ${order.code}.`)}`}>
              Avisar por WhatsApp que ya pagué
            </a>
          )}
        </section>
      )}

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">Estado</h2>
          <OrderTimeline status={order.status} events={order.events} />
          {order.trackingNumber && (
            <p className="mt-4 text-sm">Courier: {order.courier} · Guía: <strong>{order.trackingNumber}</strong></p>
          )}
        </section>
        <section className="text-sm">
          <h2 className="mb-3 font-semibold">Entrega</h2>
          <p>{order.fullName}</p>
          <p>{order.address}</p>
          {order.reference && <p className="text-muted">Ref.: {order.reference}</p>}
          <p>{order.district}, {order.province}, {order.department}</p>
          <p className="mt-2 text-muted">{order.shippingEta}</p>
        </section>
      </div>

      <section className="mt-8 rounded-lg border border-line bg-card p-5 text-sm">
        <ul className="space-y-2">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-2">
              <span>{i.quantity} × {i.productName} <span className="text-muted">({i.color}, {i.size})</span></span>
              <span>{formatPEN(i.unitCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-line pt-3">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPEN(order.subtotalCents)}</dd></div>
          {order.discountCents > 0 && <div className="flex justify-between"><dt>Descuento ({order.couponCode})</dt><dd>−{formatPEN(order.discountCents)}</dd></div>}
          <div className="flex justify-between"><dt>Envío ({order.shippingZoneName})</dt><dd>{formatPEN(order.shippingCents)}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatPEN(order.totalCents)}</dd></div>
        </dl>
        <p className="mt-3 text-muted">
          Comprobante: {order.documentType === "FACTURA" ? `Factura a ${order.businessName} (RUC ${order.documentNumber})` : "Boleta de venta electrónica"}.
        </p>
      </section>
    </div>
  );
}
