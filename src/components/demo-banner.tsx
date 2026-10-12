import { STATIC_DEMO } from "@/lib/base-path";

export function DemoBanner({ admin = false }: { admin?: boolean }) {
  if (!STATIC_DEMO) return null;
  return (
    <div className="bg-warn px-4 py-2 text-center text-xs font-medium text-white">
      {admin
        ? "Versión de revisión: el panel se muestra en modo solo lectura con datos de ejemplo; los botones no guardan cambios."
        : "Versión de revisión sin servidor: productos de ejemplo y pagos simulados. Filtros y búsqueda muestran el catálogo completo."}
    </div>
  );
}
