"use client";

import { useState } from "react";
import { ProductImage } from "./product-image";
import { VariantPicker, type PickerVariant } from "./variant-picker";

type Img = { url: string; alt: string; color: string | null };

// Galería + selector: al elegir un color se muestra su foto.
export function ProductBuyBox({
  images,
  productName,
  variants,
  sizes,
  children,
}: {
  images: Img[];
  productName: string;
  variants: PickerVariant[];
  sizes: string[];
  children: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const current = images[index];

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <div>
        <button type="button" className="block w-full cursor-zoom-in" onClick={() => setZoom(true)} aria-label="Ampliar imagen">
          <ProductImage src={current?.url} alt={current?.alt || productName} priority sizes="(min-width: 768px) 50vw, 100vw" className="rounded-xl" />
        </button>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((img, i) => (
              <button key={img.url} type="button" onClick={() => setIndex(i)} aria-label={`Ver imagen ${i + 1}`} className={`w-16 shrink-0 rounded-md border-2 ${i === index ? "border-ink" : "border-transparent"}`}>
                <ProductImage src={img.url} alt="" sizes="64px" className="rounded" />
              </button>
            ))}
          </div>
        )}
      </div>
      <div>
        {children}
        <div className="mt-6">
          <VariantPicker
            productName={productName}
            variants={variants}
            sizes={sizes}
            onColorChange={(c) => {
              const i = images.findIndex((img) => img.color === c);
              if (i >= 0) setIndex(i);
            }}
          />
        </div>
      </div>
      {zoom && current && (
        <div role="dialog" aria-modal="true" aria-label="Imagen ampliada" className="fixed inset-0 z-50 overflow-auto bg-black/90" onClick={() => setZoom(false)}>
          <button className="fixed top-3 right-3 rounded-full bg-white px-3 py-1 text-sm" onClick={() => setZoom(false)}>Cerrar</button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current.url} alt={current.alt || productName} className="mx-auto min-h-full w-[160%] max-w-none sm:w-auto sm:max-w-3xl" />
        </div>
      )}
    </div>
  );
}
