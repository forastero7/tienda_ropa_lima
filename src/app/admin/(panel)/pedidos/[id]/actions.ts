"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/audit";
import { requireAdmin } from "@/lib/auth/admin";
import { prisma } from "@/lib/db";
import { solesToCents } from "@/lib/money";
import { advanceOrder, cancelOrder, confirmPayment, refundOrder } from "@/lib/orders/lifecycle";

export type ActionState = { ok?: string; error?: string } | null;

async function run(orderId: string, fn: () => Promise<string>): Promise<ActionState> {
  try {
    const ok = await fn();
    revalidatePath(`/admin/pedidos/${orderId}`);
    return { ok };
  } catch (err) {
    if (err && typeof err === "object" && "digest" in err) throw err; // redirecciones de Next
    return { error: err instanceof Error ? err.message : "Error" };
  }
}

// Validación manual: requiere número de operación verificado en el banco/app.
export async function verifyManualPayment(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin(["OWNER", "ADMIN"]);
  const orderId = String(form.get("orderId"));
  const reference = String(form.get("reference") ?? "").trim();
  return run(orderId, async () => {
    if (reference.length < 4) throw new Error("Ingresa el número de operación verificado.");
    const payment = await prisma.payment.findFirst({ where: { orderId, provider: "manual", status: "PENDING" }, orderBy: { createdAt: "desc" } });
    if (!payment) throw new Error("No hay un pago manual pendiente para este pedido.");
    const result = await confirmPayment(payment.id, { amountCents: payment.amountCents, verifiedById: user.id, verifiedNote: reference });
    return result === "paid" ? "Pago validado." : result === "already_paid" ? "El pago ya estaba validado." : "El pago quedó en revisión (ver historial).";
  });
}

export async function advance(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin(["OWNER", "ADMIN", "OPERATOR"]);
  const orderId = String(form.get("orderId"));
  const to = String(form.get("to")) as "PREPARING" | "SHIPPED" | "DELIVERED";
  return run(orderId, async () => {
    if (!["PREPARING", "SHIPPED", "DELIVERED"].includes(to)) throw new Error("Estado inválido");
    await advanceOrder(orderId, to, user.id, {
      courier: String(form.get("courier") ?? "").trim() || undefined,
      trackingNumber: String(form.get("trackingNumber") ?? "").trim() || undefined,
      note: String(form.get("note") ?? "").trim() || undefined,
    });
    return "Estado actualizado.";
  });
}

export async function cancel(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin(["OWNER", "ADMIN"]);
  const orderId = String(form.get("orderId"));
  return run(orderId, async () => {
    await cancelOrder(orderId, { note: String(form.get("note") ?? "Anulado por administración"), actorId: user.id });
    return "Pedido anulado y stock liberado.";
  });
}

export async function refund(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin(["OWNER", "ADMIN"]);
  const orderId = String(form.get("orderId"));
  return run(orderId, async () => {
    const reason = String(form.get("reason") ?? "").trim();
    if (reason.length < 3) throw new Error("Indica el motivo del reembolso.");
    await refundOrder(orderId, user.id, {
      amountCents: solesToCents(String(form.get("amount"))),
      reason,
      restock: form.get("restock") === "on",
    });
    return "Reembolso registrado. Recuerda ejecutarlo en la pasarela o banco y emitir la nota de crédito.";
  });
}

export async function markInvoiced(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireAdmin(["OWNER", "ADMIN"]);
  const orderId = String(form.get("orderId"));
  return run(orderId, async () => {
    const reference = String(form.get("invoiceReference") ?? "").trim();
    if (!reference) throw new Error("Ingresa la serie y número del comprobante.");
    await prisma.order.update({ where: { id: orderId }, data: { invoiceIssued: true, invoiceReference: reference } });
    await audit(prisma, { actorId: user.id, action: "order.invoice", entity: "Order", entityId: orderId, data: { reference } });
    return "Comprobante registrado.";
  });
}
