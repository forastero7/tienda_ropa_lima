"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./cart-context";

const NAV = [
  { href: "/novedades", label: "Novedades" },
  { href: "/mujer", label: "Mujer" },
  { href: "/hombre", label: "Hombre" },
  { href: "/tienda", label: "Todo" },
  { href: "/ofertas", label: "Ofertas" },
  { href: "/looks", label: "Looks" },
];

export function Header({ storeName }: { storeName: string }) {
  const { count, ready, openDrawer } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 backdrop-blur">
      <div className="container-page flex h-14 items-center gap-4">
        <button
          className="-ml-2 p-2 md:hidden"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
        <Link href="/" className="text-lg font-black tracking-tight uppercase">
          {storeName}
        </Link>
        <nav className="ml-6 hidden gap-6 text-sm md:flex" aria-label="Principal">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-accent">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Link href="/buscar" className="p-2" aria-label="Buscar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </Link>
          <Link
            href="/carrito"
            className="relative p-2"
            aria-label={`Carrito, ${count} productos`}
            onClick={(e) => {
              e.preventDefault();
              openDrawer();
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 8h14l-1.2 12H6.2L5 8z" />
              <path d="M9 8V6a3 3 0 016 0v2" />
            </svg>
            {ready && count > 0 && (
              <span className="absolute top-0.5 right-0 grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line md:hidden" aria-label="Menú móvil">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block border-b border-line px-4 py-3">
              {n.label}
            </Link>
          ))}
          <Link href="/seguimiento" onClick={() => setOpen(false)} className="block px-4 py-3 text-muted">
            Seguir mi pedido
          </Link>
        </nav>
      )}
    </header>
  );
}
