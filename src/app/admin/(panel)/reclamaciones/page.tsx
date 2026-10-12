import { ActionForm } from "@/components/action-form";
import { dateTime, PageTitle } from "@/components/admin-ui";
import { prisma } from "@/lib/db";
import { formatPEN } from "@/lib/money";
import { answerComplaint } from "./actions";

export default async function ComplaintsAdmin() {
  const complaints = await prisma.complaint.findMany({ orderBy: [{ status: "asc" }, { responseDueAt: "asc" }], take: 100 });
  const now = new Date();
  return (
    <>
      <PageTitle>Libro de Reclamaciones</PageTitle>
      <div className="space-y-4">
        {complaints.map((c) => {
          const overdue = c.status === "OPEN" && c.responseDueAt < now;
          return (
            <article key={c.id} className={`rounded-lg border bg-card p-4 text-sm ${overdue ? "border-bad" : "border-line"}`}>
              <header className="flex flex-wrap items-center gap-3">
                <span className="font-mono font-semibold">{c.number}</span>
                <span className="rounded bg-line px-2 py-0.5 text-xs">{c.type}</span>
                <span className="text-muted">{dateTime.format(c.createdAt)}</span>
                <span className={overdue ? "font-semibold text-bad" : "text-muted"}>Vence: {dateTime.format(c.responseDueAt)}</span>
                {c.status === "ANSWERED" && <span className="text-ok">Respondido {c.respondedAt && dateTime.format(c.respondedAt)}</span>}
              </header>
              <p className="mt-2"><strong>{c.fullName}</strong> · {c.documentType} {c.documentNumber} · {c.email} · {c.phone}</p>
              <p className="text-muted">{c.goodType}: {c.goodDescription}{c.orderCode && ` · Pedido ${c.orderCode}`}{c.amountCents != null && ` · ${formatPEN(c.amountCents)}`}</p>
              <p className="mt-2 whitespace-pre-line">{c.detail}</p>
              <p className="mt-2"><strong>Pedido:</strong> {c.request}</p>
              {c.response ? (
                <p className="mt-3 rounded bg-paper p-3 whitespace-pre-line"><strong>Respuesta:</strong> {c.response}</p>
              ) : (
                <ActionForm action={answerComplaint} submitLabel="Registrar respuesta" className="mt-3">
                  <input type="hidden" name="id" value={c.id} />
                  <textarea name="response" rows={3} className="input" placeholder="Respuesta enviada al consumidor" />
                </ActionForm>
              )}
            </article>
          );
        })}
        {complaints.length === 0 && <p className="text-muted">No hay reclamaciones registradas.</p>}
      </div>
    </>
  );
}
