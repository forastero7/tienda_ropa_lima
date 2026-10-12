import { requireAdmin } from "@/lib/auth/admin";
import { totpUri } from "@/lib/auth/totp";
import { ensureSecret } from "./actions";
import { EnableForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  const user = await requireAdmin(undefined, { allowWithoutMfa: true });
  const secret = await ensureSecret();
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold">Activa la verificación en dos pasos</h1>
      <p className="mt-2 text-sm text-muted">Es obligatoria para usar el panel. Usa Google Authenticator, Microsoft Authenticator, 1Password o similar.</p>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-sm">
        <li>En la app, elige “Agregar cuenta” → “Ingresar clave de configuración”.</li>
        <li>
          Cuenta: <strong>{user.email}</strong> · Clave (tipo basada en tiempo):
          <code className="mt-1 block rounded bg-card p-3 font-mono text-base tracking-wider break-all">{secret.match(/.{1,4}/g)?.join(" ")}</code>
          <span className="mt-1 block text-xs break-all text-muted">URI: {totpUri(secret, user.email)}</span>
        </li>
        <li>Ingresa el código de 6 dígitos que muestra la app.</li>
      </ol>
      <EnableForm />
    </div>
  );
}
