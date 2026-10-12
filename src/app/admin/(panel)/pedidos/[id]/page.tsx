import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { dateTime, StatusBadge, Table } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { centsToDecimal, formatPEN } from "@/lib/money";
import { canTransition, STATUS_LABEL } from "@/lib/orders/status";
import { advance, cancel, markInvoiced, refund, verifyManualPayment } from "./actions";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } }, events: { orderBy: { createdAt: "asc" } }, refunds: true },
  });
  if (!order) notFound();
  const pendingManual = order.payments.find((p) => p.provider === "manual" && p.status === "PENDING");
  const hidden = <input type="hidden" name="orderId" value={order.id} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/pedidos" className="text-sm underline">← Pedidos</Link>
        <h1 className="font-mono text-2xl font-bold">{order.code}</h1>
        <StatusBadge status={order.status} />
        <span className="text-sm text-muted">{dateTime.format(order.createdAt)}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-lg border border-line bg-card p-4 text-sm">
          <h2 className="mb-2 font-semibold">Cliente</h2>
          <p>{order.fullName}</p>
          <p><a className="underline" href={`mailto:${order.email}`}>{order.email}</a></p>
          <p><a className="underline" href={`https://wa.me/51${order.phone}`} target="_blank" rel="noopener noreferrer">{order.phone}</a></p>
          <p className="mt-2 text-muted">Comprobante: {order.documentType} {order.documentNumber} {order.businessName}</p>
          {order.invoiceIssued && <p className="text-ok">Emitido: {order.invoiceReference}</p>}
          {order.source && <p className="text-muted">Fuente: {order.source}</p>}
        </section>
        <section className="rounded-lg border border-line bg-card p-4 text-sm">
          <h2 className="mb-2 font-semibold">Entrega</h2>
          <p>{order.address}</p>
          {order.reference && <p className="text-muted">Ref.: {order.reference}</p>}
          <p>{order.district}, {order.province}, {order.department} <span className="text-muted">({order.ubigeo})</span></p>
          <p className="mt-2">Zona: {order.shippingZoneName}</p>
          {order.courier && <p>Courier: {order.courier} · Guía {order.trackingNumber ?? "—"}</p>}
        </section>
        <section className="rounded-lg border border-line bg-card p-4 text-sm">
          <h2 className="mb-2 font-semibold">Importes</h2>
          <p>Subtotal: {formatPEN(order.subtotalCents)}</p>
          {order.discountCents > 0 && <p>Descuento ({order.couponCode}): −{formatPEN(order.discountCents)}</p>}
          <p>Envío: {formatPEN(order.shippingCents)}</p>
          <p className="text-base font-bold">Total: {formatPEN(order.totalCents)}</p>
          <p className="mt-2 text-muted">Método: {order.paymentMethod}</p>
          {order.reservationExpiresAt && ["CREATED", "PAYMENT_PENDING"].includes(order.status) && (
            <p className="text-warn">Reserva vence: {dateTime.format(order.reservationExpiresAt)}</p>
          )}
        </section>
      </div>

      <Table>
        <thead><tr><th>SKU</th><th>Producto</th><th>Variante</th><th>Cant.</th><th>P. unit.</th><th>Total</th></tr></thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id}><td className="font-mono text-xs">{i.sku}</td><td>{i.productName}</td><td>{i.color} / {i.size}</td><td>{i.quantity}</td><td>{formatPEN(i.unitCents)}</td><td>{formatPEN(i.unitCents * i.quantity)}</td></tr>
          ))}
        </tbody>
      </Table>

      <section>
        <h2 className="mb-2 font-semibold">Acciones</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pendingManual && (
            <div className="rounded-lg border-2 border-warn/40 bg-card p-4">
              <h3 className="font-semibold">Validar pago manual ({pendingManual.method})</h3>
              <p className="mb-2 text-xs text-muted">Solo tras ver el abono de {formatPEN(pendingManual.amountCents)} en el banco o la app. Nunca con una captura.</p>
              <ActionForm action={verifyManualPayment} submitLabel="Confirmar pago" confirmText="¿Verificaste el abono en la cuenta?">
                {hidden}
                <input name="reference" className="input py-2" placeholder="N.º de operación" required />
              </ActionForm>
            </div>
          )}
          {canTransition(order.status, "PREPARING") && (
            <div className="rounded-lg border border-line bg-card p-4">
              <h3 className="mb-2 font-semibold">Preparar pedido</h3>
              <ActionForm action={advance} submitLabel="Marcar en preparación">{hidden}<input type="hidden" name="to" value="PREPARING" /></ActionForm>
            </div>
          )}
          {canTransition(order.status, "SHIPPED") && (
            <div className="rounded-lg border border-line bg-card p-4">
              <h3 className="mb-2 font-semibold">Despachar</h3>
              <ActionForm action={advance} submitLabel="Marcar como enviado">
                {hidden}<input type="hidden" name="to" value="SHIPPED" />
                <input name="courier" className="input py-2" placeholder="Courier (p. ej. Olva, Shalom)" required />
                <input name="trackingNumber" className="input py-2" placeholder="N.º de guía / tracking" />
              </ActionForm>
            </div>
          )}
          {canTransition(order.status, "DELIVERED") && (
            <div className="rounded-lg border border-line bg-card p-4">
              <h3 className="mb-2 font-semibold">Entrega</h3>
              <ActionForm action={advance} submitLabel="Marcar como entregado">{hidden}<input type="hidden" name="to" value="DELIVERED" /></ActionForm>
            </div>
          )}
          {!order.invoiceIssued && ["PAID", "PREPARING", "SHIPPED", "DELIVERED"].includes(order.status) && (
            <div className="rounded-lg border border-line bg-card p-4">
              <h3 className="mb-2 font-semibold">Comprobante electrónico</h3>
              <ActionForm action={markInvoiced} submitLabel="Registrar emisión" variant="ghost">
                {hidden}<input name="invoiceReference" className="input py-2" placeholder="Serie-número (B001-123)" />
              </ActionForm>
            </div>
          )}
          {canTransition(order.status, "CANCELLED") && (
            <div className="rounded-lg border border-line bg-card p-4">
              <h3 className="mb-2 font-semibold">Anular pedido sin pagar</h3>
              <ActionForm action={cancel} submitLabel="Anular" variant="danger" confirmText="¿Anular el pedido y liberar el stock?">
                {hidden}<input name="note" className="input py-2" placeholder="Motivo" />
              </ActionForm>
            </div>
          )}
          {canTransition(order.status, "REFUNDED") && (
            <div className="rounded-lg border border-line bg-card p-4">
              <h3 className="mb-2 font-semibold">Reembolso / devolución</h3>
              <ActionForm action={refund} submitLabel="Registrar reembolso" variant="danger" confirmText="¿Registrar el reembolso? El pedido quedará como reembolsado.">
                {hidden}
                <input name="amount" className="input py-2" defaultValue={centsToDecimal(order.totalCents)} inputMode="decimal" aria-label="Monto S/" />
                <input name="reason" className="input py-2" placeholder="Motivo" required />
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="restock" defaultChecked /> Reingresar prendas al stock</label>
              </ActionForm>
            </div>
          )}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 font-semibold">Pagos</h2>
          <Table>
            <thead><tr><th>Fecha</th><th>Proveedor</th><th>Monto</th><th>Estado</th><th>Ref.</th></tr></thead>
            <tbody>
              {order.payments.map((p) => (
                <tr key={p.id}>
                  <td>{dateTime.format(p.createdAt)}</td><td>{p.provider}/{p.method}</td><td>{formatPEN(p.amountCents)}</td>
                  <td className={p.status === "REQUIRES_REVIEW" ? "font-semibold text-bad" : ""}>{p.status}</td>
                  <td className="text-xs">{p.verifiedNote ?? p.providerRef ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
        <section>
          <h2 className="mb-2 font-semibold">Historial</h2>
          <ol className="space-y-1 text-sm">
            {order.events.map((e) => (
              <li key={e.id}><span className="text-muted">{dateTime.format(e.createdAt)}</span> · {STATUS_LABEL[e.status]}{e.note && ` — ${e.note}`}</li>
            ))}
            {order.refunds.map((r) => (
              <li key={r.id} className="text-bad">{dateTime.format(r.createdAt)} · Reembolso {formatPEN(r.amountCents)} — {r.reason}{r.restocked && " (con reingreso)"}</li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
