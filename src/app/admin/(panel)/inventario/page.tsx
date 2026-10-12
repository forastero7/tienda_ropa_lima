import { ActionForm } from "@/components/action-form";
import { dateTime, PageTitle, Table } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { importStock } from "./actions";

const TYPE = { IMPORT: "Carga", ADJUSTMENT: "Ajuste", SALE: "Venta", RETURN: "Devolución" } as const;

export default async function InventoryPage() {
  const [movements, totals] = await Promise.all([
    prisma.stockMovement.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { variant: { select: { sku: true } } } }),
    prisma.variant.aggregate({ _sum: { stock: true, reserved: true }, _count: true }),
  ]);
  return (
    <>
      <PageTitle actions={<a href="/api/admin/export/inventario" className="btn-ghost py-2">Exportar stock CSV</a>}>Inventario</PageTitle>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-line bg-card p-4"><p className="text-xs text-muted">SKU</p><p className="text-xl font-bold">{totals._count}</p></div>
        <div className="rounded-lg border border-line bg-card p-4"><p className="text-xs text-muted">Unidades en almacén</p><p className="text-xl font-bold">{totals._sum.stock ?? 0}</p></div>
        <div className="rounded-lg border border-line bg-card p-4"><p className="text-xs text-muted">Reservadas en checkout</p><p className="text-xl font-bold">{totals._sum.reserved ?? 0}</p></div>
      </div>
      <div className="mb-6 rounded-lg border border-line bg-card p-4">
        <h2 className="font-semibold">Actualizar stock por CSV</h2>
        <p className="mt-1 text-sm text-muted">Columnas: <code>sku,stock</code> (cantidad absoluta tras el conteo). Cada cambio queda registrado como movimiento.</p>
        <ActionForm action={importStock} submitLabel="Importar" className="mt-3">
          <input type="file" name="file" accept=".csv,text/csv" className="block text-sm" required />
        </ActionForm>
      </div>
      <h2 className="mb-2 font-semibold">Últimos movimientos</h2>
      <Table>
        <thead><tr><th>Fecha</th><th>SKU</th><th>Tipo</th><th>Cantidad</th><th>Nota</th></tr></thead>
        <tbody>
          {movements.map((m) => (
            <tr key={m.id}><td>{dateTime.format(m.createdAt)}</td><td className="font-mono text-xs">{m.variant.sku}</td><td>{TYPE[m.type]}</td><td className={m.quantity < 0 ? "text-bad" : "text-ok"}>{m.quantity > 0 ? `+${m.quantity}` : m.quantity}</td><td>{m.note}</td></tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
