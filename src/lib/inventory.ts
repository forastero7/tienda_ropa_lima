import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export class OutOfStockError extends Error {
  constructor(public sku: string) {
    super(`Sin stock suficiente para ${sku}`);
  }
}

// Las operaciones usan UPDATE condicionales: la base de datos garantiza que
// dos compradores no puedan reservar la misma última unidad.

export async function reserveStock(tx: Tx, variantId: string, sku: string, quantity: number) {
  const updated = await tx.$executeRaw`
    UPDATE "Variant" SET "reserved" = "reserved" + ${quantity}
    WHERE "id" = ${variantId} AND "active" = true AND "stock" - "reserved" >= ${quantity}`;
  if (updated !== 1) throw new OutOfStockError(sku);
}

export async function releaseReservation(tx: Tx, variantId: string, quantity: number) {
  await tx.$executeRaw`
    UPDATE "Variant" SET "reserved" = GREATEST("reserved" - ${quantity}, 0) WHERE "id" = ${variantId}`;
}

// Pago confirmado: la reserva se convierte en salida física.
export async function commitReservation(tx: Tx, variantId: string, quantity: number, orderId: string) {
  await tx.$executeRaw`
    UPDATE "Variant" SET "stock" = "stock" - ${quantity}, "reserved" = GREATEST("reserved" - ${quantity}, 0)
    WHERE "id" = ${variantId}`;
  await tx.stockMovement.create({ data: { variantId, type: "SALE", quantity: -quantity, orderId } });
}

// Venta sin reserva previa (pago tardío de un pedido ya caducado).
export async function takeStockDirect(tx: Tx, variantId: string, sku: string, quantity: number, orderId: string) {
  const updated = await tx.$executeRaw`
    UPDATE "Variant" SET "stock" = "stock" - ${quantity}
    WHERE "id" = ${variantId} AND "stock" - "reserved" >= ${quantity}`;
  if (updated !== 1) throw new OutOfStockError(sku);
  await tx.stockMovement.create({ data: { variantId, type: "SALE", quantity: -quantity, orderId, note: "Pago tardío" } });
}

export async function adjustStock(
  tx: Tx,
  variantId: string,
  delta: number,
  type: "IMPORT" | "ADJUSTMENT" | "RETURN",
  note: string,
  actorId?: string | null,
  orderId?: string | null,
) {
  if (delta === 0) return;
  const updated = await tx.$executeRaw`
    UPDATE "Variant" SET "stock" = "stock" + ${delta}
    WHERE "id" = ${variantId} AND "stock" + ${delta} >= "reserved"`;
  if (updated !== 1) throw new Error("El ajuste dejaría el stock por debajo de lo reservado.");
  await tx.stockMovement.create({ data: { variantId, type, quantity: delta, note, actorId, orderId } });
}
