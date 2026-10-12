import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SANDBOX_SIGNATURE_HEADER, sandboxEnabled } from "@/lib/payments/sandbox";
import { signTimestamped } from "@/lib/payments/signature";
import { handleIncomingWebhook } from "@/lib/payments/webhooks";

// Simula la notificación que enviaría una pasarela real (solo desarrollo).
// Pasa por la misma verificación de firma e idempotencia que un webhook real.
export async function POST(req: Request) {
  if (!sandboxEnabled()) return NextResponse.json({ error: "No disponible" }, { status: 404 });
  const { paymentId, outcome } = (await req.json()) as { paymentId: string; outcome: "approve" | "decline" };
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment || payment.provider !== "sandbox") return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });

  const body = JSON.stringify({
    id: `evt_${randomUUID()}`,
    type: outcome === "approve" ? "charge.succeeded" : "charge.failed",
    data: { reference: payment.providerRef, amount: payment.amountCents, currency: "PEN" },
  });
  const headers = new Headers({ [SANDBOX_SIGNATURE_HEADER]: signTimestamped(process.env.PAYMENTS_SANDBOX_SECRET!, body) });
  const result = await handleIncomingWebhook("sandbox", headers, body);
  return NextResponse.json({
    ok: result.status === 200,
    confirmationUrl: `/pedido/${payment.order.code}?t=${payment.order.accessToken}`,
  });
}
