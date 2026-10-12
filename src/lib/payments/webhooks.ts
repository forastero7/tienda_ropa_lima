import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { confirmPayment, markPaymentFailed } from "@/lib/orders/lifecycle";
import { getProvider } from "./registry";
import { InvalidWebhookError } from "./types";

export type WebhookOutcome = { status: number; body: string };

// Procesa un webhook: verifica firma, descarta duplicados y concilia el pago.
export async function handleIncomingWebhook(providerId: string, headers: Headers, rawBody: string): Promise<WebhookOutcome> {
  const provider = getProvider(providerId);
  if (!provider?.verifyWebhook) return { status: 404, body: "unknown provider" };

  let event;
  try {
    event = await provider.verifyWebhook({ headers, rawBody });
  } catch (err) {
    if (err instanceof InvalidWebhookError || err instanceof SyntaxError) return { status: 401, body: "invalid signature" };
    throw err;
  }

  try {
    await prisma.webhookEvent.create({
      data: { provider: providerId, eventId: event.eventId, type: event.type, payload: event.raw as Prisma.InputJsonValue },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const prev = await prisma.webhookEvent.findUnique({
        where: { provider_eventId: { provider: providerId, eventId: event.eventId } },
      });
      // Si el intento anterior falló a medio camino, se reprocesa; si no, es un duplicado.
      if (prev?.processed) return { status: 200, body: "duplicate" };
    } else {
      throw err;
    }
  }

  const where = { provider_eventId: { provider: providerId, eventId: event.eventId } };
  try {
    if (event.type !== "ignored") {
      const payment = event.paymentId
        ? await prisma.payment.findUnique({ where: { id: event.paymentId } })
        : event.providerRef
          ? await prisma.payment.findUnique({ where: { provider_providerRef: { provider: providerId, providerRef: event.providerRef } } })
          : null;
      if (!payment) throw new Error(`Pago no encontrado para el evento ${event.eventId}`);

      if (event.type === "payment.succeeded") {
        await confirmPayment(payment.id, {
          amountCents: event.amountCents ?? -1,
          currency: event.currency,
          raw: event.raw as Prisma.InputJsonValue,
        });
      } else {
        await markPaymentFailed(payment.id, event.raw as Prisma.InputJsonValue);
      }
    }
    await prisma.webhookEvent.update({ where, data: { processed: true, error: null } });
    return { status: 200, body: "ok" };
  } catch (err) {
    await prisma.webhookEvent.update({ where, data: { error: String(err) } });
    console.error("Error procesando webhook", providerId, event.eventId, err);
    // 500 para que el proveedor reintente.
    return { status: 500, body: "error" };
  }
}
