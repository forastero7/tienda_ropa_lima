# Tienda de ropa online — Perú (desarrollo propio)

MVP (Fase 1 del brief) de una tienda de moda con checkout propio, pensada para hábitos de compra, pagos, logística y obligaciones del Perú.

**Stack:** Next.js 15 (App Router) + TypeScript · PostgreSQL + Prisma · Tailwind CSS 4 · Vitest.

## Qué incluye

| Área | Funciones |
| --- | --- |
| Tienda | Inicio ligero (sin video), novedades, mujer/hombre/unisex, ofertas, categorías, búsqueda; filtros por talla, color, precio y disponibilidad; grilla de 2 columnas en móvil |
| Producto | Precio en S/ con IGV, disponibilidad por SKU, talla y color obligatorios (no deja agregar combinaciones agotadas), medidas en cm, composición, cuidado, zoom, costo de envío referencial, datos estructurados Product/Offer |
| Carrito y checkout | Carrito persistente, compra sin registro, ubigeo INEI completo (departamento → provincia → distrito), envío calculado por zona antes de pagar, boleta (DNI/CE) o factura (RUC con dígito verificador), cupones, aceptación de términos, consentimiento de marketing opcional |
| Pedidos | Estados separados: creado, pago pendiente, pago validado, en preparación, enviado, entregado, cancelado, reembolsado. Página de confirmación privada, seguimiento por código + correo/celular |
| Pagos | Adaptador desacoplado (`PaymentProvider`). Métodos manuales (Yape/Plin por QR, transferencia, contraentrega opcional) que **solo** se confirman cuando un admin registra el n.º de operación verificado. Pasarela de prueba con webhook firmado para desarrollo |
| Inventario | SKU único por talla/color, reservas temporales en checkout, descuento al confirmar el pago, liberación al caducar/cancelar, reingreso en devoluciones, movimientos auditables, carga CSV |
| Panel admin | Resumen (ventas, ticket promedio, pagados/creados, stock bajo, ventas por fuente UTM), pedidos (validar pago, preparar, despachar con courier/guía, entregar, anular, reembolsar, registrar comprobante), productos y SKU, carga CSV de catálogo y stock, cupones, zonas de envío, Libro de Reclamaciones, bitácora de cambios, exportación CSV |
| Seguridad | Roles (OWNER/ADMIN/OPERATOR), 2FA TOTP obligatorio, sesión firmada en cookie httpOnly, límite de intentos de login, secretos TOTP cifrados, cabeceras de seguridad, sin datos de tarjeta en el sistema |
| Legal | Libro de Reclamaciones virtual con correlativo y plazo de respuesta, identificación del proveedor (razón social, RUC, domicilio) en el pie, borradores de términos, privacidad (Ley 29733 / D.S. 016-2024-JUS), cookies, cambios y envíos, banner de consentimiento |
| Medición/SEO | GA4 (`view_item`, `add_to_cart`, `begin_checkout`, `purchase` con `event_id` = código de pedido, deduplicado) solo con consentimiento; sitemap, robots, canonical, metadatos |

## Garantías verificadas con pruebas (`npm test`)

Las pruebas de integración corren contra PostgreSQL real:

- No hay sobreventa: 5 compras simultáneas de la última unidad → solo 1 pedido.
- Idempotencia del checkout (doble clic / reintento de red) y de webhooks (eventos repetidos).
- Webhooks con firma inválida se rechazan (401); montos que no coinciden van a revisión.
- Pago fallido no confirma el pedido; pedidos impagos caducan y liberan stock y cupón.
- Pago tardío: se acepta si aún hay stock, si no queda en revisión para reembolso.
- Pago manual queda pendiente hasta la validación del administrador (con bitácora).
- Reembolso con reingreso de stock; importación CSV idempotente.

## Puesta en marcha local

Requisitos: Node 22, PostgreSQL 14+.

```bash
cp .env.example .env              # completa DATABASE_URL y ADMIN_SESSION_SECRET
npm install
npx prisma migrate deploy         # crea las tablas
npm run db:seed                   # catálogo de demostración, zonas de envío, cupón BIENVENIDA10
npm run admin:create -- tu@correo.pe "Tu nombre" OWNER   # pide la contraseña
npm run dev                       # http://localhost:3000  ·  panel: /admin
```

Al primer ingreso al panel se exige configurar la verificación en dos pasos.

Pruebas: crea una base `tienda_test` (o define `TEST_DATABASE_URL`, debe contener "test") y ejecuta `npm test`.

## Tareas programadas

Los pedidos impagos deben caducar para liberar stock. Programa cada 5–10 minutos:

```bash
curl -X POST https://tu-dominio.pe/api/cron/expire-orders -H "Authorization: Bearer $CRON_SECRET"
# o bien: npm run orders:expire
```

## Integrar la pasarela real (pendiente de Fase 0)

El brief exige integración real, no simulada. La pasarela de prueba (`src/lib/payments/sandbox.ts`) está **deshabilitada en producción** y existe solo para probar el flujo completo. Para conectar la pasarela elegida (Culqi, Izipay, Niubiz, Mercado Pago…):

1. Crear `src/lib/payments/<proveedor>.ts` que implemente `PaymentProvider` (`src/lib/payments/types.ts`):
   - `startPayment`: crea el cargo/orden en el proveedor usando su checkout o tokenización (los datos de tarjeta nunca pasan por este servidor) y devuelve `redirect` o datos para su formulario embebido.
   - `verifyWebhook`: valida la firma según la documentación del proveedor y devuelve un `VerifiedPaymentEvent`.
2. Registrarlo en `src/lib/payments/registry.ts`.
3. Configurar en el panel del proveedor el webhook `https://tu-dominio.pe/api/payments/webhook/<proveedor>`.
4. Credenciales solo en variables de entorno del servidor.

El resto (idempotencia, conciliación con el pedido, stock, estados, pagos tardíos) ya está resuelto y probado en `confirmPayment`.

## Despliegue

- Hosting con Node (Vercel, Render, Railway, Fly, VPS) + PostgreSQL gestionado con respaldos automáticos.
- Entornos separados (desarrollo, prueba, producción) con bases y secretos distintos.
- `npm run build` necesita la base accesible (prerenderiza páginas del catálogo). En producción: `npm run db:deploy && npm run build && npm start`.
- Las fotos reales deben subirse a un almacenamiento de imágenes (S3/R2/Cloudinary) y referenciarse por URL en el CSV; si son de un dominio externo, añadirlo a `images.remotePatterns` en `next.config.ts`.
- `PAYMENTS_SANDBOX_ENABLED` no tiene efecto en producción.

## Formato CSV de catálogo

Una fila por SKU; las filas con el mismo `slug` forman un producto:

```
slug,nombre,categoria,genero,precio,precio_anterior,descripcion,composicion,cuidado,peso_g,estado,imagenes,sku,talla,color,color_hex,stock
polo-pima,Polo pima,Polos,unisex,79.90,,Polo de algodón pima,100% algodón pima,Lavar en frío,250,activo,https://cdn/1.jpg|https://cdn/2.jpg,PP-NEG-M,M,Negro,#1f1f1f,12
```

`stock` es la cantidad absoluta en almacén; la diferencia se registra como movimiento.

## Pendiente / fuera del MVP

Decisiones de la Fase 0 que el código deja preparadas pero no puede tomar:

- **Pasarela de pagos** real (ver arriba) y, según su modalidad, Yape/Plin automatizado.
- **Comprobantes electrónicos SUNAT:** hoy se registra manualmente la serie-número emitida; falta integrar un proveedor autorizado (OSE/PSE).
- **Correos transaccionales** (confirmación, cambio de estado, copia de la hoja de reclamación): falta elegir proveedor (Resend, SES, etc.).
- **Courier:** despacho y guía se registran a mano; exportación CSV de pedidos disponible. API de tracking solo si el operador la ofrece.
- **Textos legales:** son borradores marcados con [corchetes]; requieren revisión de un abogado peruano. Verificar requisitos vigentes del Libro de Reclamaciones (Ley 32495) y el plazo de respuesta (`COMPLAINT_RESPONSE_BUSINESS_DAYS`, que no descuenta feriados).
- **Subida de imágenes desde el panel** (hoy por URL en CSV) y creación de productos desde formulario (hoy por CSV; la edición sí es por formulario).
- **Gestión de usuarios admin** desde el panel (hoy por `npm run admin:create`).
- **Límite de intentos de login** en memoria: con varias instancias del servidor, moverlo a Redis o a la base.
- Meta Pixel / TikTok Pixel y eventos de servidor (CAPI): el `event_id` ya está definido para deduplicar.
- Fase 2 y 3 (reviews, recuperación de carrito, shop the look, IA, probador virtual) no están incluidas.

## Estructura

```
prisma/              schema, migraciones y seed
src/lib/             dominio: cart, orders/, payments/, inventory, shipping, auth/, ubigeo…
src/app/(shop)/      tienda pública
src/app/admin/       panel
src/app/api/         carrito, pedidos, webhooks, cron, exportaciones
tests/               unitarias e integración (PostgreSQL)
```
