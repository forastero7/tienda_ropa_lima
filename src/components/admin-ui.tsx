import type { OrderStatus } from "@prisma/client";
import { STATUS_LABEL } from "@/lib/orders/status";

const STATUS_COLOR: Record<OrderStatus, string> = {
  CREATED: "bg-line",
  PAYMENT_PENDING: "bg-warn/15 text-warn",
  PAID: "bg-ok/15 text-ok",
  PREPARING: "bg-ok/15 text-ok",
  SHIPPED: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-ink text-white",
  CANCELLED: "bg-bad/10 text-bad",
  REFUNDED: "bg-bad/10 text-bad",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${STATUS_COLOR[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function PageTitle({ children, actions }: { children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold">{children}</h1>
      {actions}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-card">
      <table className="w-full text-left text-sm [&_td]:border-t [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:font-semibold">
        {children}
      </table>
    </div>
  );
}

export const dateTime = new Intl.DateTimeFormat("es-PE", { dateStyle: "short", timeStyle: "short", timeZone: "America/Lima" });
