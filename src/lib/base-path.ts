// Prefijo de la app cuando se publica bajo una subruta (p. ej. GitHub Pages: /tienda_ropa_lima).
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Versión estática de revisión (sin servidor ni base de datos): ver scripts/build-static-demo.mjs.
export const STATIC_DEMO = process.env.NEXT_PUBLIC_STATIC_DEMO === "1";

// next/link y el router agregan el prefijo solos; fetch, <img> y location.assign no.
export function withBase(path: string): string {
  return path.startsWith("/") && !path.startsWith("//") ? `${BASE_PATH}${path}` : path;
}
