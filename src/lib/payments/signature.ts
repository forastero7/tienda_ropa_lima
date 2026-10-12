import { createHmac, timingSafeEqual } from "node:crypto";

export function hmacSha256Hex(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

// Comparación en tiempo constante para evitar ataques de temporización.
export function verifyHmacSha256(secret: string, payload: string, signatureHex: string | null): boolean {
  if (!signatureHex || !/^[0-9a-f]{64}$/i.test(signatureHex)) return false;
  const expected = Buffer.from(hmacSha256Hex(secret, payload), "hex");
  const given = Buffer.from(signatureHex, "hex");
  return expected.length === given.length && timingSafeEqual(expected, given);
}

// Firma con marca de tiempo (t=..., v1=...) para rechazar reenvíos antiguos.
export function verifyTimestampedSignature(
  secret: string,
  rawBody: string,
  header: string | null,
  toleranceSeconds = 300,
  now = Date.now(),
): boolean {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(now / 1000 - t) > toleranceSeconds) return false;
  return verifyHmacSha256(secret, `${t}.${rawBody}`, parts.v1 ?? null);
}

export function signTimestamped(secret: string, rawBody: string, now = Date.now()): string {
  const t = Math.floor(now / 1000);
  return `t=${t},v1=${hmacSha256Hex(secret, `${t}.${rawBody}`)}`;
}
