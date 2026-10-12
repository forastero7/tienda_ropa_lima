"use client";

import Link from "next/link";
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
}: {
  productName: string;
  variants: PickerVariant[];
  sizes: string[];
  onColorChange?: (color: string) => void;
}) {
  const { add } = useCart();
  const colors = useMemo(() => [...new Map(variants.map((v) => [v.color, v.colorHex])).entries()], [variants]);
  const firstInStock = variants.find((v) => v.available > 0);
  const [color, setColor] = useState(firstInStock?.color ?? colors[0]?.[0]);
  const [size, setSize] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = variants.find((v) => v.color === color && v.size === size) ?? null;

  useEffect(() => {
    const v = firstInStock ?? variants[0];
    if (v) track("view_item", { value: v.priceCents / 100, items: [{ item_id: v.sku, item_name: productName, price: v.priceCents / 100, quantity: 1 }] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickColor = (c: string) => {
    setColor(c);
    setAdded(false);
    onColorChange?.(c);
    const current = variants.find((v) => v.color === c && v.size === size);
    if (!current || current.available === 0) setSize(null);
  };

  const onAdd = () => {
    if (!size) return setError("Elige una talla.");
    if (!selected || selected.available === 0) return setError("Esa combinación está agotada.");
    setError(null);
    add(selected.id, 1);
    setAdded(true);
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
                  setAdded(false);
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
      {added && (
        <div className="flex items-center justify-between rounded-lg bg-ok/10 px-4 py-3 text-sm" role="status">
          <span>Agregado al carrito.</span>
          <Link href="/carrito" className="font-semibold underline">Ver carrito</Link>
        </div>
      )}
    </div>
  );
}
