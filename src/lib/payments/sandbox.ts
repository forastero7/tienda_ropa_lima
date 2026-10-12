import { randomUUID } from "node:crypto";
import { verifyTimestampedSignature } from "./signature";
import { InvalidWebhookError, type PaymentProvider } from "./types";

export const SANDBOX_SIGNATURE_HEADER = "x-sandbox-signature";

// Pasarela de PRUEBA para desarrollo: simula redirección + webhook firmado y
// permite probar el flujo completo (idempotencia, firma, stock) sin credenciales.
// Está deshabilitada en producción sin importar la configuración.
export function sandboxEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.PAYMENTS_SANDBOX_ENABLED === "true" &&
    Boolean(process.env.PAYMENTS_SANDBOX_SECRET)
  );
}

export const sandboxProvider: PaymentProvider = {
  id: "sandbox",
  isEnabled: sandboxEnabled,
  methods() {
    return [
      {
        id: "sandbox",
        providerId: "sandbox",
        label: "Tarjeta / Yape (pasarela de prueba)",
        description: "Solo entorno de desarrollo: simula la pasarela real.",
        kind: "online",
      },
    ];
  },
  async startPayment({ payment }) {
    const providerRef = `sbx_${randomUUID()}`;
    return { providerRef, next: { type: "redirect", url: `/pago-prueba/${payment.id}` } };
  },
  async verifyWebhook({ headers, rawBody }) {
    const secret = process.env.PAYMENTS_SANDBOX_SECRET;
    if (!sandboxEnabled() || !secret) throw new InvalidWebhookError("Sandbox deshabilitado");
    if (!verifyTimestampedSignature(secret, rawBody, headers.get(SANDBOX_SIGNATURE_HEADER))) {
      throw new InvalidWebhookError("Firma inválida");
    }
    const body = JSON.parse(rawBody) as {
      id: string;
      type: string;
      data: { reference: string; amount: number; currency: string };
    };
    const type = body.type === "charge.succeeded" ? "payment.succeeded" : body.type === "charge.failed" ? "payment.failed" : "ignored";
    return {
      eventId: body.id,
      type,
      providerRef: body.data.reference,
      amountCents: body.data.amount,
      currency: body.data.currency,
      raw: body,
    };
  },
};
