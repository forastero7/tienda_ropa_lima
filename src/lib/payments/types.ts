import type { Order, Payment } from "@prisma/client";

export type PaymentMethodId = "card" | "yape" | "yape_qr" | "transfer" | "cod" | "sandbox";

export type PaymentMethodDef = {
  id: PaymentMethodId;
  providerId: string;
  label: string;
  description: string;
  // online: confirmado por API/webhook del proveedor. manual: verificación humana.
  kind: "online" | "manual";
};

export type NextAction =
  | { type: "redirect"; url: string }
  | { type: "instructions" } // la página de confirmación muestra cómo pagar
  | { type: "none" };

// Evento de pago ya verificado (firma válida). Solo esto puede marcar un pago como pagado.
export type VerifiedPaymentEvent = {
  eventId: string;
  type: "payment.succeeded" | "payment.failed" | "ignored";
  paymentId?: string;
  providerRef?: string;
  amountCents?: number;
  currency?: string;
  raw: unknown;
};

export class InvalidWebhookError extends Error {}

// Contrato que implementa cada pasarela (Culqi, Izipay, Niubiz, Mercado Pago...).
// El checkout solo conoce esta interfaz: cambiar de proveedor no requiere rehacerlo.
export interface PaymentProvider {
  id: string;
  isEnabled(): boolean;
  methods(): PaymentMethodDef[];
  startPayment(ctx: { order: Order; payment: Payment; method: PaymentMethodDef }): Promise<{
    providerRef?: string;
    next: NextAction;
  }>;
  // Debe validar la firma y lanzar InvalidWebhookError si no es auténtica.
  verifyWebhook?(req: { headers: Headers; rawBody: string }): Promise<VerifiedPaymentEvent>;
}
