import { randomBytes } from "node:crypto";

// Sin caracteres ambiguos (0/O, 1/I/L) para dictarlo por teléfono.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function randomCode(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function newOrderCode(): string {
  return `TL-${randomCode(7)}`;
}

export function newAccessToken(): string {
  return randomBytes(24).toString("base64url");
}
