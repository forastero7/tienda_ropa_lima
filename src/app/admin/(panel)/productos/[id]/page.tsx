import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { withBase } from "@/lib/base-path";
import { prisma } from "@/lib/db";
import { centsToDecimal } from "@/lib/money";
import { saveProduct, saveVariant } from "../actions";

export default async function ProductEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id }, include: { variants: { orderBy: { position: "asc" } }, images: { orderBy: { position: "asc" } } } }),
    prisma.category.findMany({ orderBy: { position: "asc" } }),
  ]);
  if (!product) notFound();

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link href="/admin/productos" className="text-sm underline">← Productos</Link>
        <h1 className="text-2xl font-bold">{product.name}</h1>
        {product.status === "ACTIVE" && <Link href={`/producto/${product.slug}`} target="_blank" className="text-sm underline">Ver en tienda</Link>}
      </div>

      <ActionForm action={saveProduct} submitLabel="Guardar producto" className="grid max-w-3xl gap-4 rounded-lg border border-line bg-card p-5 sm:grid-cols-2">
        <input type="hidden" name="id" value={product.id} />
        <label className="label sm:col-span-2">Nombre<input name="name" defaultValue={product.name} className="input mt-1" required /></label>
        <label className="label">Precio (S/)<input name="price" defaultValue={centsToDecimal(product.priceCents)} className="input mt-1" inputMode="decimal" required /></label>
        <label className="label">Precio anterior (oferta)<input name="compareAt" defaultValue={product.compareAtCents ? centsToDecimal(product.compareAtCents) : ""} className="input mt-1" inputMode="decimal" /></label>
        <label className="label">Categoría
          <select name="categoryId" defaultValue={product.categoryId} className="input mt-1">{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </label>
        <label className="label">Género
          <select name="gender" defaultValue={product.gender} className="input mt-1"><option value="MUJER">Mujer</option><option value="HOMBRE">Hombre</option><option value="UNISEX">Unisex</option></select>
        </label>
        <label className="label">Estado
          <select name="status" defaultValue={product.status} className="input mt-1"><option value="ACTIVE">Activo</option><option value="DRAFT">Borrador</option><option value="ARCHIVED">Archivado</option></select>
        </label>
        <label className="label">Peso (g)<input name="weightGrams" type="number" defaultValue={product.weightGrams} className="input mt-1" /></label>
        <label className="label sm:col-span-2">Descripción<textarea name="description" defaultValue={product.description} rows={3} className="input mt-1" /></label>
        <label className="label">Composición<input name="composition" defaultValue={product.composition} className="input mt-1" /></label>
        <label className="label">Cuidado<input name="care" defaultValue={product.care} className="input mt-1" /></label>
        <label className="label sm:col-span-2">Medidas en cm (JSON por talla)
          <textarea name="measurements" defaultValue={JSON.stringify(product.measurements, null, 1)} rows={5} className="input mt-1 font-mono text-xs" />
        </label>
        <div className="flex gap-6 text-sm sm:col-span-2">
          <label className="flex items-center gap-2"><input type="checkbox" name="isNew" defaultChecked={product.isNew} /> Novedad</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="isFeatured" defaultChecked={product.isFeatured} /> Destacado</label>
        </div>
      </ActionForm>

      <section>
        <h2 className="mb-3 text-lg font-semibold">SKU y stock</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {product.variants.map((v) => (
            <ActionForm key={v.id} action={saveVariant} submitLabel="Guardar" variant="ghost" className="rounded-lg border border-line bg-card p-4 text-sm">
              <input type="hidden" name="variantId" value={v.id} />
              <p className="font-mono font-semibold">{v.sku}</p>
              <p>{v.color} / {v.size} · Stock {v.stock} · Reservado {v.reserved} · <strong>Disponible {v.stock - v.reserved}</strong></p>
              <div className="grid grid-cols-2 gap-2">
                <label>Ajuste (+/−)<input name="delta" type="number" className="input py-1.5" placeholder="0" /></label>
                <label>Alerta stock bajo<input name="lowStockAt" type="number" defaultValue={v.lowStockAt} className="input py-1.5" /></label>
                <label>Precio propio (S/)<input name="price" defaultValue={v.priceCents ? centsToDecimal(v.priceCents) : ""} className="input py-1.5" /></label>
                <label>Motivo ajuste<input name="note" className="input py-1.5" placeholder="Conteo, merma…" /></label>
              </div>
              <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={v.active} /> Activo</label>
            </ActionForm>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Fotos</h2>
        <p className="mb-3 text-sm text-muted">Se gestionan por CSV (columna “imagenes”) con URLs de tu almacenamiento de imágenes.</p>
        <div className="flex flex-wrap gap-2">
          {product.images.map((i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i.id} src={withBase(i.url)} alt={i.alt} className="h-28 w-22 rounded border border-line object-cover" />
          ))}
        </div>
      </section>
    </div>
  );
}
