import { manualProvider } from "./manual";
import { sandboxProvider } from "./sandbox";
import type { PaymentMethodDef, PaymentProvider } from "./types";

// Para integrar la pasarela elegida (Culqi, Izipay, Niubiz, Mercado Pago),
// crea un archivo que implemente PaymentProvider y agrégalo aquí.
const providers: PaymentProvider[] = [sandboxProvider, manualProvider];

export function getProvider(id: string): PaymentProvider | undefined {
  return providers.find((p) => p.id === id && p.isEnabled());
}

export function availableMethods(): PaymentMethodDef[] {
  return providers.filter((p) => p.isEnabled()).flatMap((p) => p.methods());
}

export function findMethod(id: string): PaymentMethodDef | undefined {
  return availableMethods().find((m) => m.id === id);
}
