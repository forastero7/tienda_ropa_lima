import type { OrderEvent, OrderStatus } from "@prisma/client";
import { STATUS_LABEL, TIMELINE } from "@/lib/orders/status";

const dateFmt = new Intl.DateTimeFormat("es-PE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Lima" });

export function OrderTimeline({ status, events }: { status: OrderStatus; events: Pick<OrderEvent, "status" | "createdAt" | "note">[] }) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    const last = [...events].reverse().find((e) => e.status === status);
    return (
      <div className="rounded-lg border border-line bg-card p-4">
        <p className="font-semibold">{STATUS_LABEL[status]}</p>
        {last && <p className="text-sm text-muted">{dateFmt.format(last.createdAt)}{last.note && ` · ${last.note}`}</p>}
      </div>
    );
  }
  const reached = TIMELINE.indexOf(status);
  return (
    <ol className="space-y-0">
      {TIMELINE.map((s, i) => {
        const ev = events.find((e) => e.status === s);
        const done = i <= reached;
        return (
          <li key={s} className="relative flex gap-3 pb-5 last:pb-0">
            {i < TIMELINE.length - 1 && <span className={`absolute top-5 left-[9px] h-full w-0.5 ${i < reached ? "bg-ok" : "bg-line"}`} aria-hidden />}
            <span className={`relative z-10 mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 ${done ? "border-ok bg-ok" : "border-line bg-card"}`} aria-hidden />
            <div>
              <p className={done ? "font-medium" : "text-muted"}>
                {STATUS_LABEL[s]}
                <span className="sr-only">{done ? " (completado)" : " (pendiente)"}</span>
              </p>
              {ev && <p className="text-xs text-muted">{dateFmt.format(ev.createdAt)}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
