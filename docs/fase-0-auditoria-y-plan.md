# Fase 0 — Auditoría del brief, del repositorio y plan de construcción

Fuentes: *Brief E-commerce de Ropa — Perú (Desarrollo Propio) v2.0* (fuente principal) y el *Prompt maestro* del cliente.
Fecha: octubre 2026. Estado del repositorio auditado: commit `cef9fa1`.

---

## 1. Interpretación de los objetivos

Construir una tienda de ropa propia (sin Shopify/WooCommerce) que convierta tráfico **móvil** de TikTok, Instagram, Facebook y Google en pedidos **pagados y conciliados**, sin obligar a salir a WhatsApp (que queda como canal de soporte y confianza). La propuesta de valor del brief es concreta: experiencia visual rápida, **medidas claras en cm**, **precios en soles**, **costo de envío transparente** a Lima y provincias y **comunicación del estado del pedido**.

El éxito del MVP (Fase 1 del brief) se mide así: pago de prueba y pago real conciliados, stock consistente y compra móvil validada. No se mide por cantidad de funciones: el brief acepta lanzar con menos productos si fotos, tallas y stock son confiables, y excluye explícitamente IA y probador virtual del presupuesto del MVP.

## 2. Auditoría del repositorio

El repositorio **no está vacío**: ya contiene una base funcional construida en sesiones anteriores. Está probada con 24 pruebas automatizadas, incluidas pruebas de integración contra PostgreSQL, y con pruebas de navegador del flujo de compra.

| Requisito | Estado | Dónde |
| --- | --- | --- |
| Catálogo, categorías, mujer/hombre/unisex, novedades, ofertas | ✅ | `src/app/(shop)/*`, `src/lib/catalog.ts` |
| Filtros combinables (talla, color, precio, disponibilidad), orden, búsqueda, paginación | ✅ | `src/components/listing.tsx` |
| Ficha: galería, zoom, talla/color obligatorios, stock por SKU, medidas cm, composición, cuidado | ✅ | `producto/[slug]`, `variant-picker.tsx` |
| Carrito persistente, checkout invitado, ubigeo INEI completo, boleta/factura, cupones | ✅ | `carrito`, `checkout`, `src/lib/ubigeo.ts` |
| Precios, stock, cupones y envío validados en servidor | ✅ | `src/lib/cart.ts`, `src/lib/orders/create.ts` |
| Estados de pedido separados + historial | ✅ | `src/lib/orders/status.ts`, `OrderEvent` |
| Reservas de stock, caducidad, sin sobreventa (probado con concurrencia) | ✅ | `src/lib/inventory.ts`, `lifecycle.ts` |
| Adaptador de pagos desacoplado, webhooks firmados, idempotencia | ✅ | `src/lib/payments/*` |
| Yape/Plin QR y transferencia **manuales** (solo validación humana) | ✅ | `payments/manual.ts` |
| Pasarela real (Culqi/Izipay/Niubiz/Mercado Pago) en sandbox | ❌ **pendiente de decisión** | — |
| Panel: pedidos, productos/SKU, inventario CSV, cupones, zonas, reclamaciones, auditoría | ✅ | `src/app/admin/*` |
| 2FA obligatorio, roles, sesión firmada, bitácora | ✅ | `src/lib/auth/*` |
| Libro de Reclamaciones virtual | ✅ (validar normativa) | `libro-de-reclamaciones` |
| Sitemap, robots, canonical, JSON-LD Product/Offer, GA4 con consentimiento | ✅ | `sitemap.ts`, `robots.ts` |
| **Carrito lateral** | ❌ | Fase 1 |
| Home: **más vendidos**, **ofertas**, **compra el look**, envíos, **métodos de pago**, **botón flotante de WhatsApp** | ❌ / parcial | Fase 1 |
| Ficha: **productos relacionados**, **bloque de envío y cambios** | ❌ | Fase 1 |
| Banner con imagen | parcial (solo texto) | Fase 1 |
| Datos del proveedor marcados como pendientes (no inventados) | parcial | Fase 1 |
| Subida de fotos, crear producto por formulario, banners/colecciones/categorías, configuración comercial (WhatsApp, métodos, datos legales) desde el panel | ❌ | Fase 2 |
| Correos transaccionales, Meta/TikTok Pixel, recojo en tienda, API de courier | ❌ | Fase 3 |

**Hallazgos a corregir:**
- `.env.example` trae valores de ejemplo con forma real ("Razón social S.A.C.", RUC `20000000000`). El prompt prohíbe inventar RUC: se reemplazarán por campos vacíos y la tienda mostrará "Pendiente" de forma visible.
- La marca provisional ("Tienda Lima") y los productos de ejemplo deben identificarse explícitamente como **demostración**.
- Existe una versión estática de revisión publicada en GitHub Pages (rama `gh-pages`) a pedido del cliente. No es producción.

## 3. Contradicciones y vacíos detectados

| # | Tema | Brief | Prompt maestro | Recomendación |
| --- | --- | --- | --- | --- |
| C1 | Banner con video | "Hero ligero… sin depender de un video pesado" | "Banner principal con imagen o video" | Imagen optimizada (AVIF/WebP) por defecto. Video solo opcional, sin reproducción automática en datos móviles y con póster. Así se protege el LCP ≤ 2.5 s del brief. |
| C2 | "Compra el look" | *Shop the look* figura en la **Fase 3** (diferenciación); pero "looks" aparece en la arquitectura del sitio y "conjuntos completos" en el Inicio | Sección obligatoria en Home | Versión simple en el MVP: colecciones curadas de productos que se agregan individualmente. Sin etiquetado interactivo de fotos ni IA (eso queda en Fase 3). |
| C3 | "Más vendidos" | Bloque en Inicio | Bloque en Home | Se calcula desde pedidos **pagados** reales. Sin ventas, se muestran los destacados con el título "Destacados". No se fabrican cifras de ventas. |
| C4 | Recojo en tienda | No se menciona | "si corresponde" | No se implementa hasta confirmar que existe un local y su dirección. La arquitectura de zonas lo admite como zona de costo cero. |
| C5 | Contraentrega | Opcional, previa validación por zona y riesgo | No se menciona | Ya implementado como opción desactivada por defecto (`PAYMENTS_COD_ENABLED`). |
| C6 | Plazos de entrega | No prometer 24–48 h sin contrato | No inventar precios ni plazos | Las tarifas y plazos del seed son **de ejemplo** y se editan en el panel. Deben reemplazarse por los del contrato con el courier. |

**Datos faltantes del cliente** (sección 14 del brief): marca y público definitivos; catálogo real en CSV (SKU, fotos, medidas, costos, stock); RUC, razón social y domicilio; cuenta comercial en la pasarela; origen de envíos, couriers, tarifas y tiempos; dominio y correos operativos; responsables de atención y reclamos; presupuesto y fecha deseada; titularidad del código, hosting y claves.

## 4. Funcionalidades obligatorias (MVP)

1. Descubrimiento: inicio, novedades, mujer/hombre/unisex, ofertas, looks, búsqueda.
2. Exploración: categorías, filtros combinables, orden, disponibilidad visible.
3. Producto: galería con zoom, talla/color obligatorios, stock por SKU, medidas cm, composición, cuidado, envío y cambios, relacionados, WhatsApp.
4. Carrito lateral y página de carrito, persistente y editable.
5. Checkout invitado móvil: contacto → ubigeo → entrega → comprobante → pago. Montos recalculados en el servidor.
6. Pagos: pasarela real vía adaptador (tarjeta y, según proveedor, Yape/Plin automático). Yape/Plin QR y transferencia como pago pendiente de verificación.
7. Pedidos con estados separados, seguimiento por código, historial.
8. Inventario por variante con reservas, caducidad y movimientos.
9. Panel con roles y 2FA: productos, inventario, pedidos, promociones, clientes (datos mínimos), contenido, reportes, configuración.
10. Legal: términos, privacidad (Ley 29733 / D.S. 016-2024-JUS), cookies, envíos, cambios, Libro de Reclamaciones, identificación del proveedor, comprobante electrónico SUNAT.
11. SEO y medición: sitemap, robots, canonical, JSON-LD, Open Graph, GA4/Meta/TikTok con consentimiento y deduplicación.

## 5. Arquitectura técnica recomendada

Se **mantiene** el stack de referencia del brief, ya implementado. El equipo lo domina y cubre SSR/SEO, API y panel en un solo despliegue, lo que reduce el costo.

- **Next.js 15 (App Router) + TypeScript + React 19.** Páginas públicas renderizadas en el servidor y cacheadas (ISR de 30–300 s). Componentes cliente solo donde hay interacción (selector de variante, carrito, checkout). Se eligió la rama 15.5.x (estable, con parches de seguridad) en lugar de la 16.
- **Backend en el mismo proyecto:** rutas `/api/*` para carrito, pedidos, webhooks y cron; *server actions* para el panel. El dominio vive en `src/lib/*`, independiente del framework y probado con pruebas unitarias e integración.
- **PostgreSQL + Prisma 6.** Montos en céntimos (`Int`). Concurrencia resuelta con `UPDATE` condicionales y `SELECT … FOR UPDATE` en el pedido.
- **Sesiones:**
  - Clientes: sin cuenta. Carrito en `localStorage`; acceso al pedido por enlace con token aleatorio de 192 bits, o por código + correo/celular.
  - Administradores: JWT HS256 en cookie `httpOnly`, `secure` y `SameSite=Lax`, válido 8 h. TOTP obligatorio. El rol se verifica en el servidor en cada página y acción.
- **Secretos:** solo en variables de entorno del hosting, separadas por entorno. Únicamente las `NEXT_PUBLIC_*` llegan al navegador. El secreto TOTP se guarda cifrado con AES-256-GCM.
- **Imágenes:** almacenamiento externo (Cloudflare R2 o S3 con CDN, o Cloudinary). Se sirven por el optimizador de Next (AVIF/WebP). La subida desde el panel es de Fase 2, con validación de tipo y tamaño en el servidor y nombres generados.
- **Pagos:** interfaz `PaymentProvider` (`startPayment`, `verifyWebhook`). Ningún pedido pasa a *pagado* fuera de `confirmPayment()`, que exige un webhook verificado o una validación manual registrada.
- **Despliegue recomendado:**
  - Vercel (o Render/Railway) + PostgreSQL gestionado (Neon, Supabase o RDS) con PITR y respaldos.
  - Entornos dev, staging y prod.
  - Cron de caducidad cada 5–10 min.
  - Dominio `.pe` con HTTPS automático.
  - Migraciones con `prisma migrate deploy` en el pipeline.

### Costos operativos estimados (referenciales, a cotizar)

| Concepto | Lanzamiento mínimo | Operación media |
| --- | --- | --- |
| Hosting app (Vercel Hobby no admite uso comercial → Pro) | ~US$ 20/mes | US$ 20–40/mes |
| PostgreSQL gestionado | US$ 0–25/mes | US$ 25–70/mes |
| Imágenes (R2/Cloudinary) | US$ 0–10/mes | US$ 10–90/mes |
| Dominio .pe | ~US$ 40–60/año | — |
| Correo transaccional | US$ 0–20/mes | US$ 20–35/mes |
| Pasarela de pagos | comisión por transacción **según contrato** | — |
| Facturación electrónica (OSE/PSE) | **según proveedor** | — |

Las cifras son órdenes de magnitud de planes públicos y deben confirmarse al contratar. Las comisiones de la pasarela y del facturador no se estiman porque dependen de la negociación comercial.

## 6. Estructura de carpetas

```
prisma/                  schema.prisma, migraciones, seed (datos de demostración)
scripts/                 create-admin, expire-orders, build-static-demo
docs/                    decisiones, manual del panel, informe de pruebas
src/
  app/
    (shop)/              tienda pública (layout con header, carrito lateral, footer)
    admin/               login, 2FA y (panel)/* con autorización por rol
    api/                 cart, orders, ubigeo, payments/webhook/[provider], cron, admin/export
  components/            UI reutilizable de la tienda y del panel
  lib/
    orders/              esquema, creación, ciclo de vida y estados
    payments/            contrato, registro, proveedores, firmas y webhooks
    auth/                sesión, TOTP, cifrado y autorización
    catalog, cart, inventory, shipping, coupons, ubigeo, documents, csv…
  data/ubigeo.json       1 893 distritos INEI
tests/                   unitarias + integración (PostgreSQL real)
```

## 7. Modelo de datos (implementado; ampliaciones marcadas con ➕)

- **Catálogo:** `Category`, `Product` (estado, género, precio, precio anterior, composición, cuidado, medidas JSON por talla), `ProductImage`, `Variant` (SKU único, talla, color, stock, reservado, alerta), `StockMovement`. ➕ `Look` y `LookItem` (Fase 1).
- **Envíos:** `ShippingZone` (prefijos de ubigeo, tarifa, por kg, gratis desde, plazo y contraentrega).
- **Promociones:** `Coupon` (porcentaje o monto fijo, mínimo, vigencia, usos).
- **Pedidos:** `Order` (contacto, ubigeo, comprobante, montos, reserva), `OrderItem` (copia de precios), `OrderEvent`, `Payment`, `Refund`, `WebhookEvent` (idempotencia).
- **Legal:** `Complaint` (correlativo y fecha límite).
- **Contenido:** `Banner`, `Faq`. ➕ `StoreSetting` (WhatsApp, datos comerciales, métodos visibles; Fase 2).
- **Administración:** `AdminUser` (rol, TOTP cifrado), `AuditLog`, `Counter`.

## 8. Dependencias e integraciones

**Instaladas** (versiones fijas): `next` 15.5, `react` 19.1, `@prisma/client`/`prisma` 6.19, `zod` 3.25, `jose` 6 (JWT), `bcryptjs` 3, `otpauth` 9, `tailwindcss` 4.3, `vitest` 3, `tsx`.

**Por integrar** (requieren decisión o credenciales del cliente):

| Integración | Opciones | Bloqueo |
| --- | --- | --- |
| Pasarela de pagos | Culqi, Izipay, Niubiz, Mercado Pago | Elegir proveedor y obtener credenciales sandbox |
| Facturación electrónica SUNAT | OSE/PSE autorizado (p. ej. Nubefact, Efact) | RUC y contrato |
| Correo transaccional | Resend, Amazon SES, Postmark | Dominio y remitente verificados |
| Imágenes | Cloudflare R2, S3 + CloudFront, Cloudinary | Cuenta |
| Courier | Olva, Shalom, Urbaner, otros | Contrato; API solo si el operador la ofrece |
| Analítica | GA4, Search Console, Meta Pixel + CAPI, TikTok Pixel + Events API | IDs de cuenta y política de consentimiento |
| WhatsApp | Enlace `wa.me` (ya implementado); API de WhatsApp Business opcional | Número del negocio |

## 9. Riesgos y decisiones pendientes

| Riesgo / decisión | Impacto | Mitigación / quién decide |
| --- | --- | --- |
| **Pasarela no elegida** | Bloquea pagos reales y el cierre del MVP | Cliente. Mientras tanto: adaptador listo y pasarela de prueba local. **No se declara listo para cobrar.** |
| Datos legales del proveedor ausentes | No se puede publicar (obligación de identificación) | Cliente entrega RUC, razón social y domicilio; se muestra "Pendiente" mientras falten |
| Textos legales | Riesgo regulatorio | Borradores marcados; revisión de un abogado peruano |
| Plazo del Libro de Reclamaciones / Ley 32495 | Sanción | Validar normativa vigente; plazo configurable |
| Comprobantes SUNAT | No se puede vender formalmente | Elegir OSE/PSE antes de producción |
| Stock vendido en dos canales (tienda física, Instagram) | Sobreventa | Fuente única: este inventario. Carga CSV tras cada conteo |
| Fotos sin licencia | Legal y de marca | Solo fotos propias o licenciadas; los placeholders actuales son dibujos generados |
| Límite de intentos de login en memoria | Débil con varias instancias | Moverlo a la base o a Redis antes de escalar horizontalmente |
| Dependencia del desarrollador | Continuidad | Repositorio, documentación y accesos a nombre del cliente |

**Decisiones críticas para la Fase 1:** ninguna. La Fase 1 (frontend) puede avanzar con contenido de demostración claramente marcado.

## 10. Plan de construcción por fases

| Fase | Contenido | Estado |
| --- | --- | --- |
| 0 | Auditoría, arquitectura, modelo, costos, riesgos (este documento) | ✅ |
| 1 · Diseño y frontend | Carrito lateral; Home completa (ofertas, más vendidos, compra el look, envíos, métodos de pago, WhatsApp flotante, banner con imagen); ficha con relacionados y bloque envío/cambios; páginas de looks; identificación de demostración y datos pendientes visibles | ▶ en curso |
| 2 · Backend y panel | Crear producto por formulario; subida de fotos a almacenamiento externo con validación; banners, colecciones/looks y categorías desde el panel; `StoreSetting` (WhatsApp, datos comerciales, métodos y políticas); clientes (datos mínimos y consentimiento); gestión de usuarios admin; rate limit persistente | pendiente |
| 3 · Integraciones | Pasarela elegida en sandbox (webhook real + conciliación); correos transaccionales; Meta/TikTok Pixel con consentimiento y `event_id`; recojo en tienda si aplica; exportación/plantilla para el courier | requiere decisiones del cliente |
| 4 · Pruebas | E2E automatizadas (Playwright) en CI, pruebas de seguridad (authz, CSRF, cargas, webhooks), Lighthouse móvil (LCP ≤ 2.5 s P75), accesibilidad | parcial (24 pruebas + E2E manual) |
| 5 · Producción | Entornos, base gestionada, migraciones, dominio, HTTPS, backups con restauración probada, manual del panel e informe de pendientes | pendiente |

Criterio de avance: cada fase termina con typecheck, pruebas y build en verde y con verificación en un navegador real. Nada se marca como integrado si solo funciona visualmente.
