import { NextResponse } from "next/server";
import { z } from "zod";
import { quoteCart } from "@/lib/cart";
import { prisma } from "@/lib/db";
import { cartLinesSchema } from "@/lib/orders/schema";
import { availableMethods } from "@/lib/payments/registry";

const bodySchema = z.object({
  lines: cartLinesSchema.or(z.array(z.any()).length(0)),
  ubigeo: z.string().regex(/^\d{6}$/).nullish(),
  couponCode: z.string().max(40).nullish(),
});

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  const quote = await quoteCart(prisma, parsed.data.lines, { ubigeo: parsed.data.ubigeo, couponCode: parsed.data.couponCode });
  const methods = availableMethods()
    .filter((m) => m.id !== "cod" || quote.shipping?.codAllowed)
    .map(({ id, label, description, kind }) => ({ id, label, description, kind }));
  // No exponemos el id interno del cupón.
  const coupon = quote.coupon && { code: quote.coupon.code, applied: quote.coupon.applied, message: quote.coupon.message };
  return NextResponse.json({ ...quote, coupon, methods });
}
