import Link from "next/link";
import { PageTitle, Table } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { formatPEN } from "@/lib/money";
import { PAID_STATUSES } from "@/lib/orders/status";

const PERIODS = { "7": 7, "30": 30, "90": 90 } as const;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { dias } = await searchParams;
  const days = PERIODS[(dias ?? "30") as keyof typeof PERIODS] ?? 30;
  const since = new Date(Date.now() - days * 86400_000);

  const [paid, created, pendingReview, toShip, refunds, lowStock, bySource, openComplaints] = await Promise.all([
    prisma.order.aggregate({ where: { paidAt: { gte: since }, status: { in: [...PAID_STATUSES, "REFUNDED"] } }, _sum: { totalCents: true, shippingCents: true }, _count: true }),
    prisma.order.count({ where: { createdAt: { gte: since } } }),
    prisma.payment.count({ where: { status: "REQUIRES_REVIEW" } }),
    prisma.order.count({ where: { status: { in: ["PAID", "PREPARING"] } } }),
    prisma.refund.aggregate({ where: { createdAt: { gte: since } }, _sum: { amountCents: true }, _count: true }),
    prisma.$queryRaw<{ sku: string; name: string; available: number }[]>`
      SELECT v."sku", p."name", (v."stock" - v."reserved")::int AS available
      FROM "Variant" v JOIN "Product" p ON p."id" = v."productId"
      WHERE v."active" AND p."status" = 'ACTIVE' AND v."stock" - v."reserved" <= v."lowStockAt"
      ORDER BY available ASC LIMIT 15`,
    prisma.order.groupBy({ by: ["source"], where: { paidAt: { gte: since } }, _count: true, _sum: { totalCents: true } }),
    prisma.complaint.count({ where: { status: "OPEN" } }),
  ]);
  const revenue = paid._sum.totalCents ?? 0;
  const avg = paid._count ? Math.round(revenue / paid._count) : 0;

  const cards = [
    ["Ventas pagadas", formatPEN(revenue)],
    ["Pedidos pagados", String(paid._count)],
    ["Ticket promedio", formatPEN(avg)],
    ["Pedidos creados", String(created)],
    ["Pagados / creados", created ? `${Math.round((paid._count / created) * 100)}%` : "—"],
    ["Reembolsos", `${refunds._count} · ${formatPEN(refunds._sum.amountCents ?? 0)}`],
  ];

  return (
    <>
      <PageTitle
        actions={
          <div className="flex gap-1 text-sm">
            {Object.keys(PERIODS).map((d) => (
              <Link key={d} href={`/admin?dias=${d}`} className={`rounded px-3 py-1.5 ${Number(d) === days ? "bg-ink text-white" : "border border-line"}`}>{d} días</Link>
            ))}
          </div>
        }
      >
        Resumen
      </PageTitle>

      {(pendingReview > 0 || toShip > 0 || openComplaints > 0) && (
        <div className="mb-6 grid gap-2 sm:grid-cols-3">
          {pendingReview > 0 && <Link href="/admin/pedidos?revision=1" className="rounded-lg bg-bad/10 p-3 text-sm text-bad">{pendingReview} pagos requieren revisión</Link>}
          {toShip > 0 && <Link href="/admin/pedidos?estado=PAID" className="rounded-lg bg-ok/10 p-3 text-sm text-ok">{toShip} pedidos por preparar o despachar</Link>}
          {openComplaints > 0 && <Link href="/admin/reclamaciones" className="rounded-lg bg-warn/10 p-3 text-sm text-warn">{openComplaints} reclamaciones abiertas</Link>}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-line bg-card p-4">
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 font-semibold">Stock bajo</h2>
          <Table>
            <thead><tr><th>SKU</th><th>Producto</th><th>Disponible</th></tr></thead>
            <tbody>
              {lowStock.map((v) => <tr key={v.sku}><td className="font-mono text-xs">{v.sku}</td><td>{v.name}</td><td className={v.available === 0 ? "text-bad" : ""}>{v.available}</td></tr>)}
            </tbody>
          </Table>
        </section>
        <section>
          <h2 className="mb-3 font-semibold">Ventas por fuente de tráfico</h2>
          <Table>
            <thead><tr><th>Fuente</th><th>Pedidos</th><th>Ventas</th></tr></thead>
            <tbody>
              {bySource.map((s) => <tr key={s.source ?? "directo"}><td>{s.source ?? "directo / sin UTM"}</td><td>{s._count}</td><td>{formatPEN(s._sum.totalCents ?? 0)}</td></tr>)}
            </tbody>
          </Table>
        </section>
      </div>
    </>
  );
}
