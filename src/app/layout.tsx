import type { Metadata, Viewport } from "next";
import "./globals.css";
import { store } from "@/lib/config";

export const metadata: Metadata = {
  metadataBase: new URL(store.siteUrl),
  title: { default: `${store.name} — Ropa urbana en Perú`, template: `%s | ${store.name}` },
  description: "Ropa urbana y casual con medidas claras, pagos en soles y envíos a Lima y provincias.",
  openGraph: { siteName: store.name, locale: "es_PE", type: "website" },
};

export const viewport: Viewport = { themeColor: "#f7f5f0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
