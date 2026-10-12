import type { OrderStatus } from "@prisma/client";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  CREATED: "Pedido creado",
  PAYMENT_PENDING: "Pago pendiente",
  PAID: "Pago validado",
  PREPARING: "En preparación",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

// Transiciones permitidas. PAID solo se alcanza por confirmación del
// proveedor de pagos o validación manual registrada (ver payments/confirm.ts).
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ["PAYMENT_PENDING", "PAID", "CANCELLED"],
  PAYMENT_PENDING: ["PAID", "CANCELLED"],
  // Un pedido pagado no se "cancela": se reembolsa (registro de Refund).
  PAID: ["PREPARING", "REFUNDED"],
  PREPARING: ["SHIPPED", "REFUNDED"],
  SHIPPED: ["DELIVERED", "REFUNDED"],
  DELIVERED: ["REFUNDED"],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function nextStatuses(from: OrderStatus): OrderStatus[] {
  return TRANSITIONS[from];
}

export const AWAITING_PAYMENT: OrderStatus[] = ["CREATED", "PAYMENT_PENDING"];
export const PAID_STATUSES: OrderStatus[] = ["PAID", "PREPARING", "SHIPPED", "DELIVERED"];

// Línea de tiempo que se muestra al cliente.
export const TIMELINE: OrderStatus[] = ["CREATED", "PAYMENT_PENDING", "PAID", "PREPARING", "SHIPPED", "DELIVERED"];
