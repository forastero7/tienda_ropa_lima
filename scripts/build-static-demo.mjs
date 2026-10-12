// Genera una versión estática de revisión (GitHub Pages) a partir de la app real:
// construye con basePath, levanta el servidor, guarda cada página como HTML y
// exporta una foto del catálogo para simular carrito y checkout en el navegador.
//
// Requiere la base de datos con el seed cargado. Uso:
//   node scripts/build-static-demo.mjs [carpeta-salida]
import { execSync, spawn } from "node:child_process";
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "/tienda_ropa_lima";
const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? `https://forastero7.github.io${BASE}`;
const OUT = path.resolve(process.argv[2] ?? "out-static");
const PORT = 3456;
const env = {
  ...process.env,
  NEXT_PUBLIC_BASE_PATH: BASE,
  NEXT_PUBLIC_STATIC_DEMO: "1",
  NEXT_PUBLIC_SITE_URL: SITE,
  NEXT_PUBLIC_GA_ID: "",
  NEXT_TELEMETRY_DISABLED: "1",
};

const prisma = new PrismaClient();

// Sesión de solo lectura para capturar el panel.
let reviewer = await prisma.adminUser.findUnique({ where: { email: "revision@demo.local" } });
reviewer ??= await prisma.adminUser.create({
  data: { email: "revision@demo.local", name: "Revisión", role: "OWNER", passwordHash: "!", totpEnabled: true, active: true },
});
const token = await new SignJWT({ role: "OWNER", mfa: true })
  .setProtectedHeader({ alg: "HS256" })
  .setSubject(reviewer.id)
  .setExpirationTime("1h")
  .sign(new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET));

console.log("→ next build");
execSync("npx next build", { stdio: "inherit", env });

const server = spawn("npx", ["next", "start", "-p", String(PORT)], { env, stdio: "ignore" });
const origin = `http://localhost:${PORT}`;
for (let i = 0; ; i++) {
  try {
    if ((await fetch(`${origin}${BASE}/robots.txt`)).ok) break;
  } catch {}
  if (i > 60) throw new Error("El servidor no inició");
  await new Promise((r) => setTimeout(r, 500));
}

try {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });

  const [products, categories, orders] = await Promise.all([
    prisma.product.findMany({ where: { status: "ACTIVE" }, select: { id: true, slug: true } }),
    prisma.category.findMany({ select: { slug: true } }),
    prisma.order.findMany({ select: { id: true }, orderBy: { createdAt: "desc" }, take: 30 }),
  ]);
  const allProducts = await prisma.product.findMany({ select: { id: true } });

  const shop = [
    "/", "/tienda/", "/novedades/", "/ofertas/", "/mujer/", "/hombre/", "/buscar/", "/carrito/", "/checkout/",
    "/seguimiento/", "/libro-de-reclamaciones/", "/ayuda/", "/nosotros/", "/demo/pedido/",
    ...["terminos", "privacidad", "cookies", "cambios-y-devoluciones", "envios"].map((p) => `/legal/${p}/`),
    ...categories.map((c) => `/categoria/${c.slug}/`),
    ...products.map((p) => `/producto/${p.slug}/`),
  ];
  const admin = [
    "/admin/login/", "/admin/", "/admin/pedidos/", "/admin/productos/", "/admin/inventario/", "/admin/cupones/",
    "/admin/envios/", "/admin/reclamaciones/", "/admin/auditoria/",
    ...orders.map((o) => `/admin/pedidos/${o.id}/`),
    ...allProducts.map((p) => `/admin/productos/${p.id}/`),
  ];

  const save = (route, body) => {
    const file = path.join(OUT, route, route.endsWith("/") ? "index.html" : "");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, body);
  };

  for (const route of [...shop, ...admin]) {
    const res = await fetch(`${origin}${BASE}${route}`, {
      headers: route.startsWith("/admin") ? { cookie: `admin_session=${token}` } : {},
      redirect: "manual",
    });
    if (!res.ok) throw new Error(`${route} respondió ${res.status}`);
    save(route, await res.text());
  }
  for (const file of ["/robots.txt", "/sitemap.xml", "/icon.svg"]) {
    save(file, Buffer.from(await (await fetch(`${origin}${BASE}${file}`)).arrayBuffer()));
  }
  writeFileSync(path.join(OUT, "404.html"), await (await fetch(`${origin}${BASE}/no-existe/`)).text());

  // Foto del catálogo para el carrito/checkout simulados.
  const variants = await prisma.variant.findMany({
    where: { active: true, product: { status: "ACTIVE" } },
    include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } },
  });
  const demoData = {
    variants: variants.map((v) => ({
      id: v.id, sku: v.sku, productName: v.product.name, productSlug: v.product.slug, image: v.product.images[0]?.url ?? null,
      size: v.size, color: v.color, priceCents: v.priceCents ?? v.product.priceCents, available: Math.max(0, v.stock - v.reserved),
      weightGrams: v.product.weightGrams,
    })),
    zones: await prisma.shippingZone.findMany({ where: { active: true } }),
    coupons: (await prisma.coupon.findMany({ where: { active: true } })).map((c) => ({ ...c, usedCount: 0 })),
    methods: [
      { id: "sandbox", label: "Tarjeta / Yape (pasarela simulada)", description: "Versión de revisión: el pago se aprueba sin cobrar.", kind: "online" },
      { id: "yape_qr", label: "Yape / Plin (verificación manual)", description: "Pagas al número indicado; tu pedido se confirma cuando verifiquemos el abono.", kind: "manual" },
      { id: "transfer", label: "Transferencia bancaria", description: "Te mostramos la cuenta; confirmamos el pedido al ver el abono.", kind: "manual" },
    ],
    instructions: {
      yape_qr: { title: "Paga con Yape o Plin", lines: ["Número: 9XX XXX XXX (ejemplo)", "En el mensaje del pago escribe tu código de pedido.", "Tu pago figura como pendiente hasta que lo verifiquemos; no basta con enviar una captura."] },
      transfer: { title: "Transferencia bancaria", lines: ["Cuenta de ejemplo: BCP Cta. Cte. Soles 000-0000000-0-00", "Usa tu código de pedido como referencia.", "Confirmaremos el pedido cuando el abono figure en nuestra cuenta."] },
    },
  };
  writeFileSync(path.join(OUT, "demo-data.json"), JSON.stringify(demoData));

  cpSync(".next/static", path.join(OUT, "_next/static"), { recursive: true });
  cpSync("public", OUT, { recursive: true });
  writeFileSync(path.join(OUT, ".nojekyll"), ""); // GitHub Pages ignora carpetas con "_" sin esto
  console.log(`✓ ${shop.length + admin.length} páginas en ${OUT}`);
} finally {
  server.kill();
  await prisma.$disconnect();
}
