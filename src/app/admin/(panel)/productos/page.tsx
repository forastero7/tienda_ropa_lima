import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { PageTitle, Table } from "@/components/admin-ui";
import { CATALOG_COLUMNS } from "@/lib/catalog-import";
import { prisma } from "@/lib/db";
import { formatPEN } from "@/lib/money";
import { importCatalog } from "./actions";

const STATUS = { ACTIVE: "Activo", DRAFT: "Borrador", ARCHIVED: "Archivado" } as const;

export default async function ProductsAdmin({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string }> }) {
  const { q, estado } = await searchParams;
  const products = await prisma.product.findMany({
    where: {
      ...(q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q.toUpperCase() } } } }] } : {}),
      ...(estado && estado in STATUS ? { status: estado as keyof typeof STATUS } : {}),
    },
    include: { category: true, variants: true, _count: { select: { images: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <>
      <PageTitle>Productos</PageTitle>
      <details className="mb-6 rounded-lg border border-line bg-card p-4">
        <summary className="cursor-pointer font-semibold">Carga masiva por CSV (crear / actualizar)</summary>
        <p className="mt-2 text-sm text-muted">
          Una fila por SKU. Columnas: <code className="text-xs">{CATALOG_COLUMNS.join(", ")}</code>. Precios en soles (79.90). Imágenes separadas por “|”.
          Estado: activo, borrador o archivado. El stock es la cantidad absoluta en almacén.
        </p>
        <ActionForm action={importCatalog} submitLabel="Importar" className="mt-3">
          <input type="file" name="file" accept=".csv,text/csv" className="block text-sm" required />
        </ActionForm>
      </details>
      <form className="mb-4 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Nombre o SKU" className="input max-w-xs py-2" />
        <select name="estado" defaultValue={estado ?? ""} className="input w-auto py-2">
          <option value="">Todos</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn-primary py-2">Buscar</button>
      </form>
      <Table>
        <thead><tr><th>Producto</th><th>Categoría</th><th>Precio</th><th>SKU</th><th>Stock disp.</th><th>Fotos</th><th>Estado</th></tr></thead>
        <tbody>
          {products.map((p) => {
            const avail = p.variants.reduce((s, v) => s + Math.max(0, v.stock - v.reserved), 0);
            return (
              <tr key={p.id}>
                <td><Link className="underline" href={`/admin/productos/${p.id}`}>{p.name}</Link></td>
                <td>{p.category.name}</td>
                <td>{formatPEN(p.priceCents)}</td>
                <td>{p.variants.length}</td>
                <td className={avail === 0 ? "text-bad" : ""}>{avail}</td>
                <td className={p._count.images === 0 ? "text-bad" : ""}>{p._count.images}</td>
                <td>{STATUS[p.status]}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}
