import { handleIncomingWebhook } from "@/lib/payments/webhooks";

// Endpoint que registra cada pasarela en su panel: /api/payments/webhook/<proveedor>
export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const rawBody = await req.text(); // el cuerpo exacto es necesario para validar la firma
  const result = await handleIncomingWebhook(provider, req.headers, rawBody);
  return new Response(result.body, { status: result.status });
}
