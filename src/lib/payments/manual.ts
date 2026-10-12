import type { PaymentMethodDef, PaymentProvider } from "./types";

// Métodos con verificación humana: transferencia, Yape/Plin por QR y contraentrega.
// Nunca se marcan como pagados por una captura del cliente: un administrador
// registra el número de operación tras verlo en el banco/app (ver confirmManualPayment).
export const manualProvider: PaymentProvider = {
  id: "manual",
  isEnabled: () => true,
  methods() {
    const list: PaymentMethodDef[] = [];
    if (process.env.YAPE_PLIN_PHONE) {
      list.push({
        id: "yape_qr",
        providerId: "manual",
        label: "Yape / Plin (verificación manual)",
        description: "Pagas al número indicado; tu pedido se confirma cuando verifiquemos el abono.",
        kind: "manual",
      });
    }
    if (process.env.BANK_TRANSFER_INSTRUCTIONS) {
      list.push({
        id: "transfer",
        providerId: "manual",
        label: "Transferencia bancaria",
        description: "Te mostramos la cuenta; confirmamos el pedido al ver el abono.",
        kind: "manual",
      });
    }
    if (process.env.PAYMENTS_COD_ENABLED === "true") {
      list.push({
        id: "cod",
        providerId: "manual",
        label: "Pago contraentrega",
        description: "Solo en zonas habilitadas. Te contactaremos para validar el pedido.",
        kind: "manual",
      });
    }
    return list;
  },
  async startPayment() {
    return { next: { type: "instructions" } };
  },
};

export function manualInstructions(methodId: string) {
  if (methodId === "yape_qr") {
    return {
      title: "Paga con Yape o Plin",
      lines: [
        `Número: ${process.env.YAPE_PLIN_PHONE ?? ""}`,
        `Titular: ${process.env.YAPE_PLIN_HOLDER ?? ""}`,
        "En el mensaje del pago escribe tu código de pedido.",
        "Tu pago figura como pendiente hasta que lo verifiquemos; no basta con enviar una captura.",
      ],
    };
  }
  if (methodId === "transfer") {
    return {
      title: "Transferencia bancaria",
      lines: [
        process.env.BANK_TRANSFER_INSTRUCTIONS ?? "",
        "Usa tu código de pedido como referencia.",
        "Confirmaremos el pedido cuando el abono figure en nuestra cuenta.",
      ],
    };
  }
  if (methodId === "cod") {
    return {
      title: "Pago contraentrega",
      lines: ["Te contactaremos por WhatsApp o llamada para validar el pedido antes de despacharlo."],
    };
  }
  return null;
}
