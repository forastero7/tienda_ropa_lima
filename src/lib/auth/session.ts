// Sesión de administrador en cookie httpOnly firmada (JWT HS256).
// Este módulo no usa APIs de Node para poder ejecutarse en el middleware.
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "admin_session";
export const SESSION_HOURS = 8;

export type AdminRoleName = "OWNER" | "ADMIN" | "OPERATOR";
export type SessionClaims = { sub: string; role: AdminRoleName; mfa: boolean };

function key(): Uint8Array {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET debe tener al menos 32 caracteres.");
  return new TextEncoder().encode(secret);
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, mfa: claims.mfa })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(key());
}

export async function readSession(token: string | undefined): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return { sub: payload.sub, role: payload.role as AdminRoleName, mfa: payload.mfa === true };
  } catch {
    return null;
  }
}
