import { cookies } from "next/headers";
import { readSession, SESSION_COOKIE } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { prisma } from "@/lib/db";
import { centsToDecimal } from "@/lib/money";

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  const user = session?.mfa ? await prisma.adminUser.findUnique({ where: { id: session.sub } }) : null;
  if (!user?.active || !user.totpEnabled) return new Response("No autorizado", { status: 401 });

  const { kind } = await params;
  let csv: string;
  if (kind === "inventario") {
    const variants = await prisma.variant.findMany({ include: { product: { select: { name: true, slug: true } } }, orderBy: { sku: "asc" } });
    csv = toCsv(variants.map((v) => ({ sku: v.sku, producto: v.product.name, slug: v.product.slug, talla: v.size, color: v.color, stock: v.stock, reservado: v.reserved, disponible: v.stock - v.reserved, activo: v.active ? "si" : "no" })));
  } else if (kind === "pedidos") {
    if (user.role === "OPERATOR") return new Response("No autorizado", { status: 403 });
    const orders = await prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 5000 });
    csv = toCsv(orders.map((o) => ({
      codigo: o.code, fecha: o.createdAt.toISOString(), estado: o.status, cliente: o.fullName, correo: o.email, celular: o.phone,
      ubigeo: o.ubigeo, distrito: o.district, provincia: o.province, departamento: o.department, direccion: o.address, referencia: o.reference,
      comprobante: o.documentType, documento: o.documentNumber, razon_social: o.businessName, subtotal: centsToDecimal(o.subtotalCents),
      descuento: centsToDecimal(o.discountCents), envio: centsToDecimal(o.shippingCents), total: centsToDecimal(o.totalCents), metodo: o.paymentMethod,
      courier: o.courier, guia: o.trackingNumber, fuente: o.source,
    })));
  } else {
    return new Response("No encontrado", { status: 404 });
  }
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
