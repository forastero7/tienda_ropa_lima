import * as OTPAuth from "otpauth";
import { store } from "@/lib/config";

export function newTotpSecret(): string {
  return new OTPAuth.Secret({ size: 20 }).base32;
}

function totp(secretBase32: string, label = "admin") {
  return new OTPAuth.TOTP({
    issuer: store.name,
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export function totpUri(secretBase32: string, label: string): string {
  return totp(secretBase32, label).toString();
}

export function verifyTotp(secretBase32: string, token: string): boolean {
  if (!/^\d{6}$/.test(token)) return false;
  return totp(secretBase32).validate({ token, window: 1 }) !== null;
}

export function currentTotp(secretBase32: string): string {
  return totp(secretBase32).generate();
}
