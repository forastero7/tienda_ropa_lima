import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { AdminRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { decryptSecret } from "./crypto";
import { readSession, SESSION_COOKIE, SESSION_HOURS, signSession } from "./session";
import { verifyTotp } from "./totp";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

// Limitador en memoria por instancia: suficiente para un solo servidor.
// Con varias instancias, reemplazar por un almacén compartido (Redis/DB).
const attempts = new Map<string, { count: number; until: number }>();
function tooManyAttempts(key: string): boolean {
  const entry = attempts.get(key);
  return Boolean(entry && entry.count >= 5 && entry.until > Date.now());
}
function registerFailure(key: string) {
  const entry = attempts.get(key);
  const fresh = !entry || entry.until < Date.now();
  attempts.set(key, { count: fresh ? 1 : entry!.count + 1, until: Date.now() + 15 * 60_000 });
}

export type LoginResult = { ok: true; needsEnrollment: boolean } | { ok: false; error: string };

export async function login(email: string, password: string, code: string): Promise<LoginResult> {
  const key = email.toLowerCase();
  if (tooManyAttempts(key)) return { ok: false, error: "Demasiados intentos. Espera 15 minutos." };

  const user = await prisma.adminUser.findUnique({ where: { email: key } });
  const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : await bcrypt.compare(password, "$2a$12$" + "x".repeat(53));
  if (!user || !user.active || !passwordOk) {
    registerFailure(key);
    return { ok: false, error: "Credenciales inválidas." };
  }
  if (user.totpEnabled) {
    if (!user.totpSecret || !verifyTotp(decryptSecret(user.totpSecret), code.trim())) {
      registerFailure(key);
      return { ok: false, error: "Código de verificación inválido." };
    }
  }
  attempts.delete(key);
  await prisma.adminUser.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await setSessionCookie({ sub: user.id, role: user.role, mfa: user.totpEnabled });
  return { ok: true, needsEnrollment: !user.totpEnabled };
}

export async function setSessionCookie(claims: { sub: string; role: AdminRole; mfa: boolean }) {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(claims), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
}

// Verificación en el servidor para cada página y acción del panel.
// El middleware solo redirige; la autorización real ocurre aquí.
export async function requireAdmin(roles?: AdminRole[], opts: { allowWithoutMfa?: boolean } = {}) {
  const session = await readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) redirect("/admin/login");
  const user = await prisma.adminUser.findUnique({ where: { id: session.sub } });
  if (!user || !user.active) redirect("/admin/login");
  if (!opts.allowWithoutMfa && !(session.mfa && user.totpEnabled)) redirect("/admin/seguridad");
  if (roles && !roles.includes(user.role)) throw new Error("No tienes permisos para esta acción.");
  return user;
}
