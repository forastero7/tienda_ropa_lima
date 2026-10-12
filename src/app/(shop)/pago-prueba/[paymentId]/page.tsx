import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatPEN } from "@/lib/money";
import { sandboxEnabled } from "@/lib/payments/sandbox";
import { SandboxActions } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false } };

// Simula la página de una pasarela externa. No existe en producción.
export default async function SandboxPayPage({ params }: { params: Promise<{ paymentId: string }> }) {
  if (!sandboxEnabled()) notFound();
  const { paymentId } = await params;
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
  if (!payment || payment.provider !== "sandbox") notFound();

  return (
    <div className="container-page max-w-md py-16">
      <div className="rounded-xl border-2 border-dashed border-warn bg-card p-6 text-center">
        <p className="eyebrow text-warn">Pasarela de prueba · solo desarrollo</p>
        <h1 className="mt-3 text-xl font-bold">Pedido {payment.order.code}</h1>
        <p className="mt-1 text-3xl font-black">{formatPEN(payment.amountCents)}</p>
        <p className="mt-3 text-sm text-muted">
          Aquí aparecería el formulario de la pasarela real (Culqi, Izipay, Niubiz, Mercado Pago). Elige el resultado a simular: se
          enviará un webhook firmado al backend.
        </p>
        <SandboxActions paymentId={payment.id} />
      </div>
    </div>
  );
}
