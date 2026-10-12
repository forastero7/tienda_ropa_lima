import { ActionForm } from "@/components/action-form";
import { dateTime, PageTitle, Table } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { formatPEN } from "@/lib/money";
import { createCoupon, toggleCoupon } from "./actions";

export default async function CouponsPage() {
  const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageTitle>Cupones</PageTitle>
      <ActionForm action={createCoupon} submitLabel="Crear cupón" className="mb-6 grid max-w-3xl gap-3 rounded-lg border border-line bg-card p-4 text-sm sm:grid-cols-3">
        <label>Código<input name="code" className="input uppercase" required /></label>
        <label>Tipo<select name="type" className="input"><option value="PERCENT">Porcentaje</option><option value="FIXED">Monto fijo (S/)</option></select></label>
        <label>Valor<input name="value" className="input" required inputMode="decimal" /></label>
        <label>Compra mínima (S/)<input name="min" className="input" inputMode="decimal" /></label>
        <label>Máx. usos<input name="maxUses" type="number" className="input" /></label>
        <span />
        <label>Desde<input name="startsAt" type="date" className="input" /></label>
        <label>Hasta<input name="endsAt" type="date" className="input" /></label>
      </ActionForm>
      <Table>
        <thead><tr><th>Código</th><th>Descuento</th><th>Mínimo</th><th>Usos</th><th>Vigencia</th><th>Estado</th></tr></thead>
        <tbody>
          {coupons.map((c) => (
            <tr key={c.id}>
              <td className="font-mono">{c.code}</td>
              <td>{c.type === "PERCENT" ? `${c.value}%` : formatPEN(c.value)}</td>
              <td>{c.minSubtotalCents ? formatPEN(c.minSubtotalCents) : "—"}</td>
              <td>{c.usedCount}{c.maxUses ? ` / ${c.maxUses}` : ""}</td>
              <td className="text-xs">{c.startsAt ? dateTime.format(c.startsAt) : "—"} → {c.endsAt ? dateTime.format(c.endsAt) : "—"}</td>
              <td>
                <form action={toggleCoupon}><input type="hidden" name="id" value={c.id} /><button className="underline">{c.active ? "Activo · desactivar" : "Inactivo · activar"}</button></form>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
