import { NextResponse } from "next/server";
import { CheckoutError, createOrder } from "@/lib/orders/create";
import { checkoutSchema } from "@/lib/orders/schema";

export async function POST(req: Request) {
  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
    return NextResponse.json({ error: "Revisa los datos marcados.", fieldErrors }, { status: 422 });
  }
  try {
    const { order, next } = await createOrder(parsed.data);
    return NextResponse.json({
      code: order.code,
      confirmationUrl: `/pedido/${order.code}?t=${order.accessToken}`,
      next,
      totalCents: order.totalCents,
    });
  } catch (err) {
    if (err instanceof CheckoutError) {
      return NextResponse.json({ error: err.message, quote: err.quote ?? null }, { status: 409 });
    }
    console.error("Error creando pedido", err);
    return NextResponse.json({ error: "No pudimos crear tu pedido. Intenta nuevamente." }, { status: 500 });
  }
}
