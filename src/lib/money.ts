// Montos en céntimos de sol. Los precios publicados incluyen IGV.

const formatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

export function formatPEN(cents: number): string {
  // Intl usa "S/" con espacio no separable; lo normalizamos a "S/ ".
  return formatter.format(cents / 100).replace(/S\/\s?/, "S/ ");
}

export function solesToCents(value: string | number): number {
  const n = typeof value === "number" ? value : Number(String(value).replace(",", ".").trim());
  if (!Number.isFinite(n) || n < 0) throw new Error(`Monto inválido: ${value}`);
  return Math.round(n * 100);
}

export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}
