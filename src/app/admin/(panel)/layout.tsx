import Link from "next/link";
import { requireAdmin } from "@/lib/auth/admin";
import { logoutAction } from "../login/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false } };

const NAV = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/inventario", label: "Inventario" },
  { href: "/admin/cupones", label: "Cupones" },
  { href: "/admin/envios", label: "Envíos" },
  { href: "/admin/reclamaciones", label: "Reclamaciones" },
  { href: "/admin/auditoria", label: "Auditoría" },
];

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return (
    <div className="min-h-screen md:grid md:grid-cols-[200px_1fr]">
      <aside className="border-b border-line bg-ink text-paper md:min-h-screen md:border-r md:border-b-0">
        <div className="p-4 font-black uppercase">Admin</div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 text-sm md:flex-col md:overflow-visible">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="shrink-0 rounded px-3 py-2 hover:bg-white/10">{n.label}</Link>
          ))}
        </nav>
        <div className="hidden p-4 text-xs text-paper/60 md:block">
          <p>{user.name}</p>
          <p>{user.role}</p>
          <form action={logoutAction}><button className="mt-2 underline">Cerrar sesión</button></form>
        </div>
      </aside>
      <div className="min-w-0 p-4 sm:p-6">{children}</div>
    </div>
  );
}
