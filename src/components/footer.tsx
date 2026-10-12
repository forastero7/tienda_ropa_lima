import Link from "next/link";
import { store } from "@/lib/config";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-card">
      <div className="container-page grid gap-8 py-10 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-black uppercase">{store.name}</p>
          <p className="mt-2 text-muted">Ropa urbana y casual. Pagos en soles y envíos a todo el Perú.</p>
        </div>
        <div>
          <p className="eyebrow mb-3">Ayuda</p>
          <ul className="space-y-2">
            <li><Link href="/seguimiento">Seguir mi pedido</Link></li>
            <li><Link href="/ayuda">Preguntas frecuentes</Link></li>
            <li><Link href="/legal/envios">Envíos</Link></li>
            <li><Link href="/legal/cambios-y-devoluciones">Cambios y devoluciones</Link></li>
            {store.whatsapp && (
              <li>
                <a href={`https://wa.me/${store.whatsapp}`} target="_blank" rel="noopener noreferrer">
                  WhatsApp
                </a>
              </li>
            )}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Legal</p>
          <ul className="space-y-2">
            <li><Link href="/legal/terminos">Términos y condiciones</Link></li>
            <li><Link href="/legal/privacidad">Política de privacidad</Link></li>
            <li><Link href="/legal/cookies">Cookies</Link></li>
            <li><Link href="/nosotros">Sobre la marca</Link></li>
          </ul>
        </div>
        <div>
          <Link
            href="/libro-de-reclamaciones"
            className="inline-flex items-center gap-3 rounded-lg border border-line px-3 py-2 hover:border-ink"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
              <path d="M4 5a2 2 0 012-2h12v16H6a2 2 0 00-2 2V5z" />
              <path d="M4 19a2 2 0 012-2h12" />
              <path d="M8 7h7M8 10h5" />
            </svg>
            <span className="font-semibold">Libro de Reclamaciones</span>
          </Link>
          <div className="mt-4 space-y-1 text-xs text-muted">
            {store.legalName && <p>{store.legalName}</p>}
            {store.ruc && <p>RUC {store.ruc}</p>}
            {store.legalAddress && <p>{store.legalAddress}</p>}
            {store.supportEmail && <p>{store.supportEmail}</p>}
          </div>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        Precios en soles (S/) con IGV incluido. © {new Date().getFullYear()} {store.legalName || store.name}
      </div>
    </footer>
  );
}
