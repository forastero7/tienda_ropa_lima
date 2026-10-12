"use client";

// Simulación en el navegador de las rutas /api/* para la versión estática de revisión
// (GitHub Pages). Usa una foto del catálogo (demo-data.json) generada al construir.
// Nada de esto se usa en la tienda real: ahí responde el servidor.
import type { Coupon, ShippingZone } from "@prisma/client";
import { withBase } from "./base-path";
import { evaluateCoupon } from "./coupons";
import { checkoutSchema } from "./orders/schema";
import { quoteShipping } from "./shipping";
import { getDistrict, listDepartments, listDistricts, listProvinces } from "./ubigeo";

type DemoVariant = {
  id: string;
  sku: string;
  productName: string;
  productSlug: string;
  image: string | null;
  size: string;
  color: string;
  priceCents: number;
  available: number;
  weightGrams: number;
};

type DemoData = {
  variants: DemoVariant[];
  zones: ShippingZone[];
  coupons: Coupon[];
  methods: { id: string; label: string; description: string; kind: "online" | "manual" }[];
  instructions: Record<string, { title: string; lines: string[] }>;
};

export type DemoOrder = {
  code: string;
  createdAt: string;
  status: "PAYMENT_PENDING" | "PAID";
  method: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  reference: string;
  place: string;
  zoneName: string;
  eta: string;
  lines: { name: string; color: string; size: string; quantity: number; unitCents: number }[];
  subtotalCents: number;
  discountCents: number;
  couponCode: string | null;
  shippingCents: number;
  totalCents: number;
  instructions: { title: string; lines: string[] } | null;
};

let dataPromise: Promise<DemoData> | null = null;
function data(): Promise<DemoData> {
  dataPromise ??= fetch(withBase("/demo-data.json")).then((r) => r.json());
  return dataPromise;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const ORDERS_KEY = "demo-orders:v1";
export function loadDemoOrders(): DemoOrder[] {
  try {
    return JSON.parse(localStorage.getItem(ORDERS_KEY) ?? "[]");
  } catch {
    return [];
  }
}
function saveDemoOrder(order: DemoOrder) {
  try {
    localStorage.setItem(ORDERS_KEY, JSON.stringify([order, ...loadDemoOrders()].slice(0, 20)));
  } catch {}
}

async function quote(lines: { variantId: string; quantity: number }[], ubigeo?: string | null, couponCode?: string | null) {
  const d = await data();
  const byId = new Map(d.variants.map((v) => [v.id, v]));
  const quoted = lines.flatMap(({ variantId, quantity }) => {
    const v = byId.get(variantId);
    if (!v) return [];
    const problem =
      v.available === 0 ? "Agotado en esta talla/color." : quantity > v.available ? `Solo quedan ${v.available} unidades.` : null;
    return [{ variantId, sku: v.sku, productName: v.productName, productSlug: v.productSlug, image: v.image, size: v.size, color: v.color, unitCents: v.priceCents, quantity, available: v.available, weightGrams: v.weightGrams, problem }];
  });
  const subtotalCents = quoted.reduce((s, l) => s + l.unitCents * l.quantity, 0);
  const weight = quoted.reduce((s, l) => s + l.weightGrams * l.quantity, 0);

  let discountCents = 0;
  let coupon = null as null | { code: string; applied: boolean; message: string | null };
  const code = couponCode?.trim().toUpperCase();
  if (code) {
    const found = d.coupons.find((c) => c.code === code) ?? null;
    const parsed = found && { ...found, startsAt: found.startsAt && new Date(found.startsAt), endsAt: found.endsAt && new Date(found.endsAt) };
    const r = evaluateCoupon(parsed, subtotalCents);
    if (r.ok) discountCents = r.discountCents;
    coupon = { code, applied: r.ok, message: r.ok ? null : r.reason };
  }
  const shipping = ubigeo ? quoteShipping(d.zones, ubigeo, subtotalCents - discountCents, weight) : null;
  return {
    lines: quoted,
    subtotalCents,
    discountCents,
    coupon,
    shipping,
    totalCents: subtotalCents - discountCents + (shipping?.feeCents ?? 0),
    valid: quoted.length > 0 && quoted.every((l) => !l.problem),
    methods: d.methods.filter((m) => m.id !== "cod" || shipping?.codAllowed),
  };
}

export async function demoFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = new URL(path, "http://demo");
  const body = init?.body ? JSON.parse(String(init.body)) : {};

  if (url.pathname === "/api/ubigeo") {
    const dep = url.searchParams.get("departamento");
    const prov = url.searchParams.get("provincia");
    return json(prov ? listDistricts(prov) : dep ? listProvinces(dep) : listDepartments());
  }

  if (url.pathname === "/api/cart/quote") return json(await quote(body.lines ?? [], body.ubigeo, body.couponCode));

  if (url.pathname === "/api/orders") {
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      return json({ error: "Revisa los datos marcados.", fieldErrors }, 422);
    }
    const input = parsed.data;
    const q = await quote(input.lines, input.delivery.ubigeo, input.couponCode);
    if (!q.valid || !q.shipping) return json({ error: "Revisa tu carrito o el distrito de entrega." }, 409);
    const d = await data();
    const place = getDistrict(input.delivery.ubigeo)!;
    const online = d.methods.find((m) => m.id === input.paymentMethod)?.kind === "online";
    const order: DemoOrder = {
      code: `DEMO-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      status: online ? "PAID" : "PAYMENT_PENDING",
      method: input.paymentMethod,
      fullName: input.contact.fullName,
      email: input.contact.email,
      phone: input.contact.phone,
      address: input.delivery.address,
      reference: input.delivery.reference,
      place: `${place.district}, ${place.province}, ${place.department}`,
      zoneName: q.shipping.zoneName,
      eta: q.shipping.etaText,
      lines: q.lines.map((l) => ({ name: l.productName, color: l.color, size: l.size, quantity: l.quantity, unitCents: l.unitCents })),
      subtotalCents: q.subtotalCents,
      discountCents: q.discountCents,
      couponCode: q.coupon?.applied ? q.coupon.code : null,
      shippingCents: q.shipping.feeCents,
      totalCents: q.totalCents,
      instructions: online ? null : (d.instructions[input.paymentMethod] ?? null),
    };
    saveDemoOrder(order);
    return json({ code: order.code, confirmationUrl: `/demo/pedido?c=${order.code}`, next: { type: "none" }, totalCents: order.totalCents });
  }

  return json({ error: "No disponible en la versión de revisión." }, 404);
}

// Equivalentes locales de las acciones de servidor de seguimiento y reclamaciones.
export async function demoFindOrder(_prev: unknown, form: FormData) {
  const code = String(form.get("code") ?? "").trim().toUpperCase();
  const contact = String(form.get("contact") ?? "").trim().toLowerCase();
  const order = loadDemoOrders().find((o) => o.code === code && (o.email === contact || o.phone === contact.replace(/\D/g, "").slice(-9)));
  return order
    ? { url: `/demo/pedido?c=${order.code}` }
    : { error: "No encontramos un pedido con esos datos. (En la versión de revisión solo existen los pedidos hechos en este navegador.)" };
}

export async function demoSubmitComplaint(_prev: unknown, form: FormData) {
  if (form.get("accept") !== "on") return { ok: false as const, error: "Debes confirmar que los datos son correctos." };
  const raw = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)]));
  for (const k of ["fullName", "documentNumber", "address", "phone", "email", "goodDescription", "detail", "request"]) {
    if (!raw[k]?.trim()) return { ok: false as const, error: `Revisa el campo: ${k}.` };
  }
  const due = new Date();
  for (let added = 0; added < 15; ) {
    due.setDate(due.getDate() + 1);
    if (due.getDay() !== 0 && due.getDay() !== 6) added++;
  }
  return {
    ok: true as const,
    number: `${new Date().getFullYear()}-DEMO${Math.floor(Math.random() * 9000 + 1000)}`,
    createdAt: new Date().toISOString(),
    dueAt: due.toISOString(),
    data: raw,
  };
}
