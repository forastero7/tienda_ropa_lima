import type { OrderStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import { dateTime, PageTitle, StatusBadge, Table } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { formatPEN } from "@/lib/money";
import { STATUS_LABEL } from "@/lib/orders/status";

type SP = { estado?: string; q?: string; revision?: string; pagina?: string };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.pagina) || 1);
  const where: Prisma.OrderWhereInput = {};
  if (sp.estado && sp.estado in STATUS_LABEL) where.status = sp.estado as OrderStatus;
  if (sp.revision) where.payments = { some: { status: "REQUIRES_REVIEW" } };
  if (sp.q) {
    const q = sp.q.trim();
    where.OR = [
      { code: { contains: q.toUpperCase() } },
      { email: { contains: q.toLowerCase() } },
      { phone: { contains: q } },
      { fullName: { contains: q, mode: "insensitive" } },
    ];
  }
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 50, skip: (page - 1) * 50, include: { _count: { select: { items: true } } } }),
    prisma.order.count({ where }),
  ]);

  return (
    <>
      <PageTitle actions={<a href="/api/admin/export/pedidos" className="btn-ghost py-2">Exportar CSV</a>}>Pedidos</PageTitle>
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Código, correo, celular o nombre" className="input max-w-xs py-2" />
        <select name="estado" defaultValue={sp.estado ?? ""} className="input w-auto py-2">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="revision" value="1" defaultChecked={Boolean(sp.revision)} /> Pagos en revisión</label>
        <button className="btn-primary py-2">Filtrar</button>
      </form>
      <Table>
        <thead><tr><th>Código</th><th>Fecha</th><th>Cliente</th><th>Destino</th><th>Pago</th><th>Total</th><th>Estado</th></tr></thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id}>
              <td><Link className="font-mono font-semibold underline" href={`/admin/pedidos/${o.id}`}>{o.code}</Link></td>
              <td className="whitespace-nowrap">{dateTime.format(o.createdAt)}</td>
              <td>{o.fullName}<br /><span className="text-xs text-muted">{o.phone}</span></td>
              <td>{o.district}<br /><span className="text-xs text-muted">{o.department}</span></td>
              <td>{o.paymentMethod}</td>
              <td className="whitespace-nowrap">{formatPEN(o.totalCents)}</td>
              <td><StatusBadge status={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </Table>
      <p className="mt-3 text-sm text-muted">
        {total} pedidos.{" "}
        {page > 1 && <Link className="underline" href={{ query: { ...sp, pagina: page - 1 } }}>Anterior</Link>}{" "}
        {page * 50 < total && <Link className="underline" href={{ query: { ...sp, pagina: page + 1 } }}>Siguiente</Link>}
      </p>
    </>
  );
}
