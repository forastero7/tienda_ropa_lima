"use client";

import { useEffect, useMemo, useState } from "react";
import { track } from "@/lib/analytics";
import { formatPEN } from "@/lib/money";
import { useCart } from "./cart-context";

export type PickerVariant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string;
  available: number;
  priceCents: number;
};

export function VariantPicker({
  productName,
  variants,
  sizes,
  onColorChange,
  whatsappHref,
}: {
  productName: string;
  variants: PickerVariant[];
  sizes: string[];
  onColorChange?: (color: string) => void;
  whatsappHref?: string;
}) {
  const { add, openDrawer } = useCart();
  const colors = useMemo(() => [...new Map(variants.map((v) => [v.color, v.colorHex])).entries()], [variants]);
  const firstInStock = variants.find((v) => v.available > 0);
  const [color, setColor] = useState(firstInStock?.color ?? colors[0]?.[0]);
  const [size, setSize] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selected = variants.find((v) => v.color === color && v.size === size) ?? null;

  useEffect(() => {
    const v = firstInStock ?? variants[0];
    if (v) track("view_item", { value: v.priceCents / 100, items: [{ item_id: v.sku, item_name: productName, price: v.priceCents / 100, quantity: 1 }] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickColor = (c: string) => {
    setColor(c);
    onColorChange?.(c);
    const current = variants.find((v) => v.color === c && v.size === size);
    if (!current || current.available === 0) setSize(null);
  };

  const onAdd = () => {
    if (!size) return setError("Elige una talla.");
    if (!selected || selected.available === 0) return setError("Esa combinación está agotada.");
    setError(null);
    add(selected.id, 1);
    openDrawer();
    track("add_to_cart", {
      value: selected.priceCents / 100,
      items: [{ item_id: selected.sku, item_name: productName, item_variant: `${selected.color} / ${selected.size}`, price: selected.priceCents / 100, quantity: 1 }],
    });
  };

  return (
    <div className="space-y-5">
      <fieldset>
        <legend className="label">
          Color: <span className="font-normal">{color}</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {colors.map(([name, hex]) => {
            const anyStock = variants.some((v) => v.color === name && v.available > 0);
            return (
              <button
                key={name}
                type="button"
                onClick={() => pickColor(name)}
                aria-pressed={color === name}
                aria-label={`${name}${anyStock ? "" : " (agotado)"}`}
                className={`h-9 w-9 rounded-full border-2 ${color === name ? "border-ink" : "border-transparent"} p-0.5`}
              >
                <span className={`block h-full w-full rounded-full border border-black/15 ${anyStock ? "" : "opacity-40"}`} style={{ background: hex }} />
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <div className="mb-1 flex items-center justify-between">
          <legend className="label mb-0">Talla</legend>
          <a href="#medidas" className="text-sm underline">Ver medidas</a>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {sizes.map((s) => {
            const v = variants.find((x) => x.color === color && x.size === s);
            const out = !v || v.available === 0;
            return (
              <button
                key={s}
                type="button"
                disabled={out}
                onClick={() => {
                  setSize(s);
                  setError(null);
                }}
                aria-pressed={size === s}
                className={`rounded-md border py-2.5 text-sm ${size === s ? "border-ink bg-ink text-white" : "border-line bg-card"} disabled:cursor-not-allowed disabled:text-muted disabled:line-through`}
              >
                {s}
              </button>
            );
          })}
        </div>
        <p className="mt-2 min-h-5 text-sm" aria-live="polite">
          {selected && selected.available > 0 && selected.available <= 3 && (
            <span className="text-warn">¡Quedan solo {selected.available}!</span>
          )}
          {selected && selected.available > 3 && <span className="text-ok">Disponible</span>}
          {error && <span className="text-bad">{error}</span>}
        </p>
      </fieldset>

      <button type="button" onClick={onAdd} className="btn-primary w-full py-4 text-base" disabled={!variants.some((v) => v.available > 0)}>
        {variants.some((v) => v.available > 0) ? `Agregar al carrito${selected ? ` · ${formatPEN(selected.priceCents)}` : ""}` : "Agotado"}
      </button>
      {whatsappHref && (
        <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="btn-ghost w-full py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2a10 10 0 00-8.6 15.1L2 22l5-1.3A10 10 0 1012 2zm0 18.2a8.2 8.2 0 01-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1112 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 01-3.3-2.9c-.2-.4.2-.4.7-1.3a.5.5 0 000-.4l-.8-1.9c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 00-.7.3 3 3 0 00-.9 2.2 5.2 5.2 0 001.1 2.7 11.8 11.8 0 004.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 001.8-1.2 2.2 2.2 0 00.1-1.3c0-.1-.2-.2-.5-.3z"/></svg>
          Consultar por WhatsApp
        </a>
      )}
    </div>
  );
}
