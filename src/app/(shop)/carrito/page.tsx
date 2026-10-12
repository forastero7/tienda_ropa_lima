"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/cart-context";
import { ProductImage } from "@/components/product-image";
import { useQuote } from "@/components/use-quote";
import { formatPEN } from "@/lib/money";

export default function CartPage() {
  const { lines, ready, setQuantity, remove } = useCart();
  const { quote, loading } = useQuote(lines, ready);

  // Quita del carrito variantes que ya no existen en el catálogo.
  useEffect(() => {
    if (!quote) return;
    const known = new Set(quote.lines.map((l) => l.variantId));
    lines.filter((l) => !known.has(l.variantId)).forEach((l) => remove(l.variantId));
  }, [quote, lines, remove]);

  if (ready && lines.length === 0) {
    return (
      <div className="container-page py-16 text-center">
        <h1 className="text-2xl font-bold">Tu carrito está vacío</h1>
        <Link href="/tienda" className="btn-primary mt-6">Ver productos</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-black tracking-tight">Carrito</h1>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <ul className="divide-y divide-line rounded-lg border border-line bg-card">
          {(quote?.lines ?? []).map((l) => (
            <li key={l.variantId} className="flex gap-4 p-4">
              <Link href={`/producto/${l.productSlug}`} className="w-20 shrink-0 sm:w-24">
                <ProductImage src={l.image} alt={l.productName} sizes="96px" className="rounded-md" />
              </Link>
              <div className="flex-1 text-sm">
                <Link href={`/producto/${l.productSlug}`} className="font-medium hover:underline">{l.productName}</Link>
                <p className="text-muted">{l.color} · Talla {l.size}</p>
                <p className="mt-1 font-semibold">{formatPEN(l.unitCents)}</p>
                {l.problem && <p className="mt-1 text-bad">{l.problem}</p>}
                <div className="mt-3 flex items-center gap-3">
                  <label className="sr-only" htmlFor={`q-${l.variantId}`}>Cantidad</label>
                  <select
                    id={`q-${l.variantId}`}
                    className="input w-20 py-1.5"
                    value={l.quantity}
                    onChange={(e) => setQuantity(l.variantId, Number(e.target.value))}
                  >
                    {Array.from({ length: Math.max(1, Math.min(10, Math.max(l.available, l.quantity))) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <button className="text-muted underline" onClick={() => remove(l.variantId)}>Quitar</button>
                </div>
              </div>
              <p className="text-sm font-semibold">{formatPEN(l.unitCents * l.quantity)}</p>
            </li>
          ))}
          {loading && !quote && <li className="p-6 text-sm text-muted">Cargando…</li>}
        </ul>

        <aside className="h-fit rounded-lg border border-line bg-card p-5 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold">{quote ? formatPEN(quote.subtotalCents) : "—"}</span>
          </div>
          <p className="mt-2 text-muted">El envío se calcula según tu distrito en el siguiente paso, antes de pagar.</p>
          <Link
            href="/checkout"
            aria-disabled={!quote?.valid}
            className={`btn-primary mt-5 w-full py-3.5 ${quote?.valid ? "" : "pointer-events-none opacity-50"}`}
          >
            Continuar con la compra
          </Link>
          {quote && !quote.valid && <p className="mt-2 text-bad">Ajusta los productos marcados para continuar.</p>}
          <p className="mt-3 text-center text-xs text-muted">No necesitas crear una cuenta.</p>
        </aside>
      </div>
    </div>
  );
}
