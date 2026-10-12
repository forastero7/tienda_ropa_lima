import { dateTime, PageTitle, Table } from "@/components/admin-ui";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";

export default async function AuditPage() {
  await requireAdmin(["OWNER", "ADMIN"]);
  const logs = await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { actor: { select: { email: true } } } });
  return (
    <>
      <PageTitle>Bitácora de cambios</PageTitle>
      <Table>
        <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Datos</th></tr></thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="whitespace-nowrap">{dateTime.format(l.createdAt)}</td>
              <td>{l.actor?.email ?? "sistema"}</td>
              <td className="font-mono text-xs">{l.action}</td>
              <td className="text-xs">{l.entity} {l.entityId}</td>
              <td className="max-w-md truncate font-mono text-xs" title={JSON.stringify(l.data)}>{l.data ? JSON.stringify(l.data) : ""}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
