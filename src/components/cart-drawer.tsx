"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { formatPEN } from "@/lib/money";
import { useCart } from "./cart-context";
import { ProductImage } from "./product-image";
import { useQuote } from "./use-quote";

// Carrito lateral: se abre al agregar un producto o desde el ícono del header.
// Precios y stock vienen del servidor (useQuote), nunca del navegador.
export function CartDrawer() {
  const { lines, ready, drawerOpen, closeDrawer, setQuantity, remove } = useCart();
  const { quote, loading } = useQuote(lines, ready && drawerOpen);
  const panel = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => closeDrawer(), [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && closeDrawer();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [drawerOpen, closeDrawer]);

  if (!drawerOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button aria-label="Cerrar carrito" className="absolute inset-0 bg-black/40" onClick={closeDrawer} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        tabIndex={-1}
        className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-paper shadow-xl outline-none"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id="cart-drawer-title" className="text-lg font-bold">Tu carrito</h2>
          <button onClick={closeDrawer} className="p-2" aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {lines.length === 0 ? (
            <p className="p-6 text-center text-muted">Tu carrito está vacío.</p>
          ) : (
            <ul className="divide-y divide-line">
              {(quote?.lines ?? []).map((l) => (
                <li key={l.variantId} className="flex gap-3 p-4 text-sm">
                  <Link href={`/producto/${l.productSlug}`} className="w-16 shrink-0">
                    <ProductImage src={l.image} alt={l.productName} sizes="64px" className="rounded" />
                  </Link>
                  <div className="flex-1">
                    <p className="font-medium">{l.productName}</p>
                    <p className="text-muted">{l.color} · {l.size}</p>
                    {l.problem && <p className="text-bad">{l.problem}</p>}
                    <div className="mt-2 flex items-center gap-1">
                      <button className="h-8 w-8 rounded-full border border-line" aria-label="Quitar una unidad" onClick={() => setQuantity(l.variantId, l.quantity - 1)}>−</button>
                      <span className="w-8 text-center" aria-live="polite">{l.quantity}</span>
                      <button className="h-8 w-8 rounded-full border border-line disabled:opacity-40" aria-label="Agregar una unidad" disabled={l.quantity >= Math.min(l.available, 10)} onClick={() => setQuantity(l.variantId, l.quantity + 1)}>+</button>
                      <button className="ml-auto text-xs text-muted underline" onClick={() => remove(l.variantId)}>Quitar</button>
                    </div>
                  </div>
                  <p className="font-semibold">{formatPEN(l.unitCents * l.quantity)}</p>
                </li>
              ))}
              {loading && !quote && <li className="p-6 text-sm text-muted">Cargando…</li>}
            </ul>
          )}
        </div>

        {lines.length > 0 && (
          <div className="space-y-3 border-t border-line p-4 text-sm">
            <div className="flex justify-between text-base">
              <span>Subtotal</span>
              <span className="font-bold">{quote ? formatPEN(quote.subtotalCents) : "—"}</span>
            </div>
            <p className="text-xs text-muted">El envío se calcula con tu distrito antes de pagar.</p>
            {/* El checkout vuelve a validar todo en el servidor; aquí solo se bloquea si ya sabemos que hay un problema. */}
            <Link href="/checkout" aria-disabled={quote ? !quote.valid : undefined} className={`btn-primary w-full py-3.5 ${quote && !quote.valid ? "pointer-events-none opacity-50" : ""}`}>
              Finalizar compra
            </Link>
            {quote && !quote.valid && <p className="text-bad">Ajusta los productos marcados para continuar.</p>}
            <Link href="/carrito" className="btn-ghost w-full py-3">Ver carrito</Link>
          </div>
        )}
      </div>
    </div>
  );
}
