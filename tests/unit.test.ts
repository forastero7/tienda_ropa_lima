import { describe, expect, it } from "vitest";
import { isValidRuc, normalizePeruMobile, isValidDni } from "@/lib/documents";
import { canTransition } from "@/lib/orders/status";
import { matchZone, quoteShipping } from "@/lib/shipping";
import { evaluateCoupon } from "@/lib/coupons";
import { signTimestamped, verifyTimestampedSignature } from "@/lib/payments/signature";
import { formatPEN, solesToCents } from "@/lib/money";
import { getDistrict, listProvinces } from "@/lib/ubigeo";
import { parseCsv } from "@/lib/csv";
import type { Coupon, ShippingZone } from "@prisma/client";

describe("documentos", () => {
  it("valida RUC con dígito verificador", () => {
    expect(isValidRuc("20100047218")).toBe(true);
    expect(isValidRuc("20100047219")).toBe(false);
    expect(isValidRuc("30100047218")).toBe(false);
  });
  it("normaliza celulares", () => {
    expect(normalizePeruMobile("+51 987 654 321")).toBe("987654321");
    expect(normalizePeruMobile("012345678")).toBeNull();
    expect(isValidDni("12345678")).toBe(true);
  });
});

describe("estados de pedido", () => {
  it("solo permite transiciones válidas", () => {
    expect(canTransition("PAYMENT_PENDING", "PAID")).toBe(true);
    expect(canTransition("PAYMENT_PENDING", "SHIPPED")).toBe(false);
    expect(canTransition("PAID", "CANCELLED")).toBe(false);
    expect(canTransition("DELIVERED", "REFUNDED")).toBe(true);
    expect(canTransition("CANCELLED", "PAID")).toBe(false);
  });
});

describe("envíos", () => {
  const zone = (id: string, prefixes: string[], fee: number, extra: Partial<ShippingZone> = {}) =>
    ({ id, name: id, ubigeoPrefixes: prefixes, feeCents: fee, perKgCents: 0, freeOverCents: null, etaText: "", codAllowed: false, active: true, position: 0, ...extra }) as ShippingZone;
  const zones = [zone("pais", [""], 2000, { perKgCents: 500 }), zone("lima", ["1501"], 1000, { freeOverCents: 20000 }), zone("dpto", ["15"], 1500)];

  it("elige el prefijo más específico", () => {
    expect(matchZone(zones, "150122")?.id).toBe("lima");
    expect(matchZone(zones, "150501")?.id).toBe("dpto");
    expect(matchZone(zones, "040101")?.id).toBe("pais");
  });
  it("aplica envío gratis y recargo por peso", () => {
    expect(quoteShipping(zones, "150122", 20000, 500)?.feeCents).toBe(0);
    expect(quoteShipping(zones, "040101", 5000, 2500)?.feeCents).toBe(2000 + 2 * 500);
  });
});

describe("cupones", () => {
  const base = { id: "c", code: "X", type: "PERCENT", value: 10, minSubtotalCents: 0, startsAt: null, endsAt: null, maxUses: null, usedCount: 0, active: true, createdAt: new Date() } as Coupon;
  it("calcula porcentaje y monto fijo con tope", () => {
    expect(evaluateCoupon(base, 15000)).toEqual({ ok: true, discountCents: 1500 });
    expect(evaluateCoupon({ ...base, type: "FIXED", value: 99999 }, 5000)).toEqual({ ok: true, discountCents: 5000 });
  });
  it("rechaza vencidos, agotados o bajo el mínimo", () => {
    expect(evaluateCoupon({ ...base, endsAt: new Date(Date.now() - 1000) }, 1000).ok).toBe(false);
    expect(evaluateCoupon({ ...base, maxUses: 1, usedCount: 1 }, 1000).ok).toBe(false);
    expect(evaluateCoupon({ ...base, minSubtotalCents: 5000 }, 1000).ok).toBe(false);
  });
});

describe("firma de webhooks", () => {
  it("acepta firmas válidas y rechaza alteraciones o reenvíos viejos", () => {
    const body = '{"id":"evt_1"}';
    const sig = signTimestamped("s3cret", body);
    expect(verifyTimestampedSignature("s3cret", body, sig)).toBe(true);
    expect(verifyTimestampedSignature("s3cret", body + " ", sig)).toBe(false);
    expect(verifyTimestampedSignature("otro", body, sig)).toBe(false);
    const old = signTimestamped("s3cret", body, Date.now() - 3600_000);
    expect(verifyTimestampedSignature("s3cret", body, old)).toBe(false);
  });
});

describe("utilidades", () => {
  it("formatea soles", () => {
    expect(formatPEN(7990)).toBe("S/ 79.90");
    expect(solesToCents("59.9")).toBe(5990);
  });
  it("resuelve ubigeo", () => {
    expect(getDistrict("150122")?.district).toBe("Miraflores");
    expect(listProvinces("07").map((p) => p.name)).toEqual(["Callao"]);
  });
  it("parsea CSV con comillas", () => {
    expect(parseCsv('sku,nombre\nA1,"Polo, negro"\nA2,"Dice ""hola"""\n')).toEqual([
      { sku: "A1", nombre: "Polo, negro" },
      { sku: "A2", nombre: 'Dice "hola"' },
    ]);
  });
});
