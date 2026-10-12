import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/orders/access";
import { expireUnpaidOrders } from "@/lib/orders/lifecycle";

// Programar cada 5–10 minutos (cron del hosting) con "Authorization: Bearer $CRON_SECRET".
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || !safeEqual(auth, `Bearer ${secret}`)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const expired = await expireUnpaidOrders();
  return NextResponse.json({ expired });
}

export const GET = POST;
