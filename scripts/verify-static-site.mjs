// Verifica la versión estática antes de publicarla en GitHub Pages:
//  1. index.html es la tienda (no el README ni una página de documentación).
//  2. Existen las rutas clave de la tienda.
//  3. Todo recurso local referenciado (CSS, JS, imágenes, enlaces) existe en la salida.
// Uso: node scripts/verify-static-site.mjs <carpeta> [basePath]
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const dir = path.resolve(process.argv[2] ?? "out-static");
const base = process.argv[3] ?? process.env.NEXT_PUBLIC_BASE_PATH ?? "/tienda_ropa_lima";
const errors = [];

const read = (rel) => readFileSync(path.join(dir, rel), "utf8");

// 1. Página principal
if (!existsSync(path.join(dir, "index.html"))) errors.push("Falta index.html");
else {
  const html = read("index.html");
  const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
  if (/desarrollo propio|README/i.test(title + html.slice(0, 5000))) errors.push(`index.html parece documentación: "${title}"`);
  for (const marker of ['id="contenido"', "/_next/static/", "/producto/", "Novedades"]) {
    if (!html.includes(marker)) errors.push(`index.html no contiene "${marker}"`);
  }
  console.log(`index.html → <title>${title}</title>`);
}
if (!existsSync(path.join(dir, ".nojekyll"))) errors.push("Falta .nojekyll (GitHub Pages ignoraría la carpeta _next)");
if (!existsSync(path.join(dir, "demo-data.json"))) errors.push("Falta demo-data.json (carrito/checkout simulados)");

// 2. Rutas clave
for (const route of ["tienda", "carrito", "checkout", "looks", "libro-de-reclamaciones", "seguimiento", "demo/pedido", "admin"]) {
  if (!existsSync(path.join(dir, route, "index.html"))) errors.push(`Falta la ruta /${route}/`);
}
const products = existsSync(path.join(dir, "producto")) ? readdirSync(path.join(dir, "producto")) : [];
if (products.length === 0) errors.push("No se generó ninguna ficha de producto");

// 3. Recursos referenciados
const files = [];
(function walk(d) {
  for (const f of readdirSync(d)) {
    const p = path.join(d, f);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith(".html") || p.endsWith(".css")) files.push(p);
  }
})(dir);

const resolveLocal = (url) => {
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  if (!clean.startsWith(base + "/") && clean !== base) return null;
  const rel = clean.slice(base.length) || "/";
  const target = path.join(dir, rel);
  if (rel.endsWith("/")) return path.join(target, "index.html");
  return existsSync(target) && statSync(target).isDirectory() ? path.join(target, "index.html") : target;
};

const checked = new Set();
const counts = { css: 0, js: 0, img: 0, page: 0 };
for (const file of files) {
  const text = readFileSync(file, "utf8");
  const urls = [...text.matchAll(/(?:href|src)="([^"]+)"|url\(["']?([^"')]+)["']?\)/g)].map((m) => m[1] ?? m[2]);
  for (const url of urls) {
    const target = resolveLocal(url.replace(/&amp;/g, "&"));
    if (!target || checked.has(target)) continue;
    checked.add(target);
    const kind = /\.css$/.test(target) ? "css" : /\.js$/.test(target) ? "js" : /\.(svg|png|jpe?g|webp|avif|ico)$/.test(target) ? "img" : "page";
    counts[kind]++;
    if (!existsSync(target)) errors.push(`${path.relative(dir, file)} → recurso inexistente ${url}`);
  }
}

console.log(`Páginas HTML: ${files.filter((f) => f.endsWith(".html")).length} · fichas de producto: ${products.length}`);
console.log(`Recursos verificados: ${counts.css} CSS, ${counts.js} JS, ${counts.img} imágenes, ${counts.page} enlaces internos`);
if (errors.length) {
  console.error(`✗ ${errors.length} problema(s):\n` + errors.slice(0, 50).map((e) => "  - " + e).join("\n"));
  process.exit(1);
}
console.log("✓ Sitio estático válido");
