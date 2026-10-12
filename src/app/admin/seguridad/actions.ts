"use server";

import { redirect } from "next/navigation";
import { audit } from "@/lib/audit";
import { requireAdmin, setSessionCookie } from "@/lib/auth/admin";
import { decryptSecret, encryptSecret } from "@/lib/auth/crypto";
import { newTotpSecret, verifyTotp } from "@/lib/auth/totp";
import { prisma } from "@/lib/db";

export async function ensureSecret(): Promise<string> {
  const user = await requireAdmin(undefined, { allowWithoutMfa: true });
  if (user.totpEnabled) redirect("/admin");
  if (user.totpSecret) return decryptSecret(user.totpSecret);
  const secret = newTotpSecret();
  await prisma.adminUser.update({ where: { id: user.id }, data: { totpSecret: encryptSecret(secret) } });
  return secret;
}

export async function enableTotp(_prev: string | null, form: FormData): Promise<string | null> {
  const user = await requireAdmin(undefined, { allowWithoutMfa: true });
  if (!user.totpSecret) return "Recarga la página.";
  if (!verifyTotp(decryptSecret(user.totpSecret), String(form.get("code") ?? "").trim())) return "Código incorrecto. Revisa la hora del teléfono.";
  await prisma.adminUser.update({ where: { id: user.id }, data: { totpEnabled: true } });
  await audit(prisma, { actorId: user.id, action: "admin.totp_enabled", entity: "AdminUser", entityId: user.id });
  await setSessionCookie({ sub: user.id, role: user.role, mfa: true });
  redirect("/admin");
}
