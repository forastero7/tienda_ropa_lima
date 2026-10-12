import type { ShippingZone } from "@prisma/client";

export type ShippingQuote = {
  zoneId: string;
  zoneName: string;
  feeCents: number;
  etaText: string;
  codAllowed: boolean;
};

// Elige la zona activa con el prefijo de ubigeo más largo que coincida.
// Una zona con prefijo "" funciona como tarifa por defecto para el resto del país.
export function matchZone<Z extends Pick<ShippingZone, "ubigeoPrefixes" | "active" | "position">>(
  zones: Z[],
  ubigeo: string,
): Z | undefined {
  let best: { zone: Z; len: number } | undefined;
  for (const zone of zones) {
    if (!zone.active) continue;
    for (const prefix of zone.ubigeoPrefixes) {
      if (!ubigeo.startsWith(prefix)) continue;
      if (!best || prefix.length > best.len || (prefix.length === best.len && zone.position < best.zone.position)) {
        best = { zone, len: prefix.length };
      }
    }
  }
  return best?.zone;
}

export function quoteShipping(
  zones: ShippingZone[],
  ubigeo: string,
  subtotalCents: number,
  weightGrams: number,
): ShippingQuote | null {
  const zone = matchZone(zones, ubigeo);
  if (!zone) return null;
  let fee = zone.feeCents;
  if (zone.freeOverCents != null && subtotalCents >= zone.freeOverCents) {
    fee = 0;
  } else if (zone.perKgCents > 0 && weightGrams > 1000) {
    fee += Math.ceil((weightGrams - 1000) / 1000) * zone.perKgCents;
  }
  return { zoneId: zone.id, zoneName: zone.name, feeCents: fee, etaText: zone.etaText, codAllowed: zone.codAllowed };
}
