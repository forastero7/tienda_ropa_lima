"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { importStockCsv } from "@/lib/catalog-import";

export async function importStock(_: { ok?: string; error?: string } | null, form: FormData) {
  const user = await requireAdmin(["OWNER", "ADMIN"]);
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona un archivo CSV." };
  if (file.size > 2_000_000) return { error: "El archivo supera 2 MB." };
  const report = await importStockCsv(await file.text(), user.id);
  revalidatePath("/admin/inventario");
  const msg = `${report.variants} SKU actualizados.`;
  return report.errors.length ? { error: `${msg} Errores: ${report.errors.slice(0, 10).join(" · ")}` } : { ok: msg };
}
