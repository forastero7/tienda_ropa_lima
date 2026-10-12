"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart-context";
import { useQuote } from "@/components/use-quote";
import { track } from "@/lib/analytics";
import { formatPEN } from "@/lib/money";

type Place = { code: string; name: string };

function usePlaces(query: string | null) {
  const [places, setPlaces] = useState<Place[]>([]);
  useEffect(() => {
    if (query === null) return setPlaces([]);
    let alive = true;
    fetch(`/api/ubigeo${query}`)
      .then((r) => r.json())
      .then((d) => alive && setPlaces(d));
    return () => {
      alive = false;
    };
  }, [query]);
  return places;
}

function Field({ label, error, children, hint }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">
        {label}
        {children}
      </label>
      {hint && !error && <p className="mt-1 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1 text-xs text-bad">{error}</p>}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, ready, clear } = useCart();
  const [idempotencyKey] = useState(() => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : ""));

  const [contact, setContact] = useState({ fullName: "", email: "", phone: "" });
  const [dep, setDep] = useState("");
  const [prov, setProv] = useState("");
  const [ubigeo, setUbigeo] = useState("");
  const [address, setAddress] = useState("");
  const [reference, setReference] = useState("");
  const [docType, setDocType] = useState<"BOLETA" | "FACTURA">("BOLETA");
  const [docNumber, setDocNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [method, setMethod] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const departments = usePlaces("");
  const provinces = usePlaces(dep ? `?departamento=${dep}` : null);
  const districts = usePlaces(prov ? `?provincia=${prov}` : null);
  const { quote, loading } = useQuote(lines, ready, ubigeo || null, coupon);

  const tracked = useRef(false);
  useEffect(() => {
    if (!quote || tracked.current) return;
    tracked.current = true;
    track("begin_checkout", {
      value: quote.subtotalCents / 100,
      items: quote.lines.map((l) => ({ item_id: l.sku, item_name: l.productName, item_variant: `${l.color} / ${l.size}`, price: l.unitCents / 100, quantity: l.quantity })),
    });
  }, [quote]);

  // Si el método elegido deja de estar disponible (p. ej. contraentrega fuera de zona), se deselecciona.
  useEffect(() => {
    if (quote && method && !quote.methods.some((m) => m.id === method)) setMethod("");
  }, [quote, method]);

  if (ready && lines.length === 0 && !submitting) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-bold">Tu carrito está vacío</h1>
        <Link href="/tienda" className="btn-primary mt-6">Ver productos</Link>
      </div>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSubmitting(true);
    const source = new URLSearchParams(window.location.search).get("utm_source") ?? sessionStorage.getItem("utm_source");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idempotencyKey,
          lines,
          contact,
          delivery: { ubigeo, address, reference },
          document: { type: docType, number: docNumber, businessName: docType === "FACTURA" ? businessName : undefined },
          paymentMethod: method,
          couponCode: quote?.coupon?.applied ? coupon : null,
          acceptTerms,
          marketingConsent: marketing,
          source,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No pudimos procesar el pedido.");
        setFieldErrors(data.fieldErrors ?? {});
        setSubmitting(false);
        return;
      }
      clear();
      if (data.next?.type === "redirect") window.location.assign(data.next.url);
      else router.push(data.confirmationUrl);
    } catch {
      setError("Problema de conexión. Revisa tu internet e intenta de nuevo: no se te cobrará dos veces.");
      setSubmitting(false);
    }
  };

  const fe = (k: string) => fieldErrors[k];

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-black tracking-tight">Finalizar compra</h1>
      <form onSubmit={submit} className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]" noValidate>
        <div className="space-y-8">
          <section className="space-y-4 rounded-lg border border-line bg-card p-5">
            <h2 className="text-lg font-semibold">1. Contacto</h2>
            <Field label="Nombre y apellido" error={fe("contact.fullName")}>
              <input className="input mt-1" autoComplete="name" required value={contact.fullName} onChange={(e) => setContact({ ...contact, fullName: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Correo" error={fe("contact.email")} hint="Te enviaremos la confirmación del pedido.">
                <input className="input mt-1" type="email" autoComplete="email" inputMode="email" required value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
              </Field>
              <Field label="Celular" error={fe("contact.phone")} hint="Para coordinar la entrega.">
                <input className="input mt-1" type="tel" autoComplete="tel" inputMode="tel" placeholder="9XX XXX XXX" required value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
              </Field>
            </div>
          </section>

          <section className="space-y-4 rounded-lg border border-line bg-card p-5">
            <h2 className="text-lg font-semibold">2. Entrega</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Departamento">
                <select className="input mt-1" value={dep} onChange={(e) => { setDep(e.target.value); setProv(""); setUbigeo(""); }} required>
                  <option value="">Elige…</option>
                  {departments.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Provincia">
                <select className="input mt-1" value={prov} disabled={!dep} onChange={(e) => { setProv(e.target.value); setUbigeo(""); }} required>
                  <option value="">Elige…</option>
                  {provinces.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Distrito" error={fe("delivery.ubigeo")}>
                <select className="input mt-1" value={ubigeo} disabled={!prov} onChange={(e) => setUbigeo(e.target.value)} required>
                  <option value="">Elige…</option>
                  {districts.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Dirección" error={fe("delivery.address")}>
              <input className="input mt-1" autoComplete="street-address" placeholder="Av./Calle, número, dpto./interior" required value={address} onChange={(e) => setAddress(e.target.value)} />
            </Field>
            <Field label="Referencia" hint="Ayuda al courier a encontrar tu dirección.">
              <input className="input mt-1" placeholder="Frente al parque, puerta verde…" value={reference} onChange={(e) => setReference(e.target.value)} />
            </Field>
            {ubigeo && quote && (
              quote.shipping ? (
                <div className="rounded-md bg-paper p-3 text-sm">
                  <p><strong>{quote.shipping.zoneName}:</strong> {quote.shipping.feeCents === 0 ? "envío gratis" : formatPEN(quote.shipping.feeCents)}</p>
                  <p className="text-muted">{quote.shipping.etaText}</p>
                </div>
              ) : (
                <p className="text-sm text-bad">Aún no realizamos envíos a ese distrito. Escríbenos para coordinar.</p>
              )
            )}
          </section>

          <section className="space-y-4 rounded-lg border border-line bg-card p-5">
            <h2 className="text-lg font-semibold">3. Comprobante</h2>
            <div className="flex gap-2" role="radiogroup" aria-label="Tipo de comprobante">
              {(["BOLETA", "FACTURA"] as const).map((t) => (
                <button key={t} type="button" role="radio" aria-checked={docType === t} onClick={() => setDocType(t)} className={`btn flex-1 border py-2.5 ${docType === t ? "border-ink bg-ink text-white" : "border-line"}`}>
                  {t === "BOLETA" ? "Boleta" : "Factura"}
                </button>
              ))}
            </div>
            {docType === "BOLETA" ? (
              <Field label="DNI o CE (opcional)" error={fe("document.number")}>
                <input className="input mt-1" inputMode="numeric" value={docNumber} onChange={(e) => setDocNumber(e.target.value.trim())} />
              </Field>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="RUC" error={fe("document.number")}>
                  <input className="input mt-1" inputMode="numeric" maxLength={11} value={docNumber} onChange={(e) => setDocNumber(e.target.value.trim())} />
                </Field>
                <Field label="Razón social" error={fe("document.businessName")}>
                  <input className="input mt-1" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
                </Field>
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-lg border border-line bg-card p-5">
            <h2 className="text-lg font-semibold">4. Pago</h2>
            {quote?.methods.length === 0 && <p className="text-sm text-bad">No hay métodos de pago configurados.</p>}
            {quote?.methods.map((m) => (
              <label key={m.id} className={`flex cursor-pointer gap-3 rounded-md border p-3 ${method === m.id ? "border-ink" : "border-line"}`}>
                <input type="radio" name="method" value={m.id} checked={method === m.id} onChange={() => setMethod(m.id)} className="mt-1" />
                <span>
                  <span className="block font-medium">{m.label}</span>
                  <span className="block text-sm text-muted">{m.description}</span>
                </span>
              </label>
            ))}
            {fe("paymentMethod") && <p className="text-xs text-bad">{fe("paymentMethod")}</p>}
            <p className="text-xs text-muted">
              Los datos de tarjeta se ingresan en la pasarela de pago; nunca los almacenamos.
            </p>
          </section>
        </div>

        <aside className="h-fit space-y-4 rounded-lg border border-line bg-card p-5 text-sm lg:sticky lg:top-20">
          <h2 className="text-lg font-semibold">Resumen</h2>
          <ul className="space-y-2">
            {quote?.lines.map((l) => (
              <li key={l.variantId} className="flex justify-between gap-2">
                <span>
                  {l.quantity} × {l.productName} <span className="text-muted">({l.color}, {l.size})</span>
                  {l.problem && <span className="block text-bad">{l.problem}</span>}
                </span>
                <span>{formatPEN(l.unitCents * l.quantity)}</span>
              </li>
            ))}
          </ul>

          <div className="flex gap-2">
            <label className="sr-only" htmlFor="coupon">Cupón</label>
            <input id="coupon" className="input py-2 uppercase" placeholder="Cupón" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
            <button type="button" className="btn-ghost py-2" onClick={() => setCoupon(couponInput.trim() || null)}>Aplicar</button>
          </div>
          {quote?.coupon && (
            <p className={quote.coupon.applied ? "text-ok" : "text-bad"}>
              {quote.coupon.applied ? `Cupón ${quote.coupon.code} aplicado.` : quote.coupon.message}
            </p>
          )}

          <dl className="space-y-1 border-t border-line pt-3">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{quote ? formatPEN(quote.subtotalCents) : "—"}</dd></div>
            {quote && quote.discountCents > 0 && (
              <div className="flex justify-between text-ok"><dt>Descuento</dt><dd>−{formatPEN(quote.discountCents)}</dd></div>
            )}
            <div className="flex justify-between">
              <dt>Envío</dt>
              <dd>{quote?.shipping ? (quote.shipping.feeCents === 0 ? "Gratis" : formatPEN(quote.shipping.feeCents)) : "Elige tu distrito"}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
              <dt>Total</dt>
              <dd>{quote?.shipping ? formatPEN(quote.totalCents) : "—"}</dd>
            </div>
            <p className="text-xs text-muted">Precios en soles con IGV incluido.</p>
          </dl>

          <label className="flex gap-2">
            <input type="checkbox" checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} className="mt-0.5" />
            <span>
              Acepto los <Link href="/legal/terminos" target="_blank" className="underline">términos y condiciones</Link> y la{" "}
              <Link href="/legal/privacidad" target="_blank" className="underline">política de privacidad</Link>.
            </span>
          </label>
          {fe("acceptTerms") && <p className="text-xs text-bad">{fe("acceptTerms")}</p>}
          <label className="flex gap-2 text-muted">
            <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5" />
            <span>Quiero recibir novedades y ofertas (opcional).</span>
          </label>

          {error && <p role="alert" className="rounded-md bg-bad/10 p-3 text-bad">{error}</p>}

          <button
            type="submit"
            className="btn-accent w-full py-4 text-base"
            disabled={submitting || loading || !quote?.valid || !quote?.shipping || !method || !acceptTerms || !idempotencyKey}
          >
            {submitting ? "Procesando…" : quote?.shipping ? `Pagar ${formatPEN(quote.totalCents)}` : "Completa tus datos"}
          </button>
        </aside>
      </form>
    </div>
  );
}
