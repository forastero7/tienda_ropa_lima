import type { MetadataRoute } from "next";
import { store } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/checkout", "/carrito", "/pedido", "/pago-prueba", "/buscar"] },
    sitemap: `${store.siteUrl}/sitemap.xml`,
  };
}
