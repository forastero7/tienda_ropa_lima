import { CartProvider } from "@/components/cart-context";
import { CartDrawer } from "@/components/cart-drawer";
import { ConsentBanner } from "@/components/consent-banner";
import { DemoBanner } from "@/components/demo-banner";
import { Footer } from "@/components/footer";
import { Header } from "@/components/header";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { store } from "@/lib/config";

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-card focus:p-2">
        Saltar al contenido
      </a>
      <DemoBanner />
      <Header storeName={store.name} />
      <main id="contenido">{children}</main>
      <Footer />
      <CartDrawer />
      <WhatsAppButton />
      <ConsentBanner gaId={process.env.NEXT_PUBLIC_GA_ID || undefined} />
    </CartProvider>
  );
}
