// Validaciones de documentos y teléfonos peruanos.

export function isValidDni(value: string): boolean {
  return /^\d{8}$/.test(value);
}

export function isValidCe(value: string): boolean {
  return /^[A-Za-z0-9]{8,12}$/.test(value);
}

// RUC: 11 dígitos, prefijo 10/15/16/17/20 y dígito verificador módulo 11.
export function isValidRuc(value: string): boolean {
  if (!/^(10|15|16|17|20)\d{9}$/.test(value)) return false;
  const weights = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
  const sum = weights.reduce((acc, w, i) => acc + w * Number(value[i]), 0);
  const check = (11 - (sum % 11)) % 10;
  return check === Number(value[10]);
}

// Celular peruano: 9 dígitos que empiezan con 9 (se acepta prefijo +51).
export function normalizePeruMobile(value: string): string | null {
  const digits = value.replace(/[\s\-()]/g, "").replace(/^\+?51(?=9\d{8}$)/, "");
  return /^9\d{8}$/.test(digits) ? digits : null;
}
