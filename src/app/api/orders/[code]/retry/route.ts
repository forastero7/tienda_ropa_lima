import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startPaymentForOrder } from "@/lib/orders/create";
import { AWAITING_PAYMENT } from "@/lib/orders/status";
import { safeEqual } from "@/lib/orders/access";

// Reintento de pago (p. ej. tarjeta rechazada) mientras la reserva siga vigente.
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { token } = (await req.json().catch(() => ({}))) as { token?: string };
  const order = await prisma.order.findUnique({ where: { code } });
  if (!order || !token || !safeEqual(order.accessToken, token)) {
    return NextResponse.json({ error: "Pedido no encontrado" }, { status: 404 });
  }
  if (!AWAITING_PAYMENT.includes(order.status) || !order.reservationExpiresAt || order.reservationExpiresAt < new Date()) {
    return NextResponse.json({ error: "Este pedido ya no admite pagos." }, { status: 409 });
  }
  try {
    return NextResponse.json({ next: await startPaymentForOrder(order) });
  } catch {
    return NextResponse.json({ error: "No pudimos iniciar el pago." }, { status: 502 });
  }
}
