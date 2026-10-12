# Auditoría de la Fase 1 — Diseño y frontend

**Proyecto:** tienda de ropa online para Perú (desarrollo propio)
**Alcance auditado:** Fase 1 del plan (`docs/fase-0-auditoria-y-plan.md`): Home, catálogo, ficha de producto, carrito, checkout, páginas informativas y diseño responsive
**Referencias:** Brief v2.0 (§03–05, §11) y Prompt maestro (§3 Diseño UX/UI, §4 Experiencia móvil, §11 Contenido de demostración)
**Rama:** `claude/new-session-hbu6rn`. Los commits auditados son `8d397ac` y las correcciones de esta auditoría.
**Fecha:** octubre 2026
**Estado:** **Aprobada con observaciones.** Los requisitos funcionales de Fase 1 se cumplen; quedan pendientes que dependen de contenido real del cliente (fotos, logo, datos comerciales).

---

## 1. Resumen ejecutivo

- **Cumplimiento:** 51 de 55 requisitos de Fase 1 se cumplen por completo, 4 parcialmente y 0 quedan sin cumplir. Los parciales se deben a contenido que el cliente aún no entregó (fotografías reales, logo) o a decisiones de diseño justificadas (video en el banner).
- **Calidad medida en móvil** (viewport 390×844, red 4G lenta simulada y CPU 4× más lenta):
  - 0 violaciones de accesibilidad WCAG 2.2 AA (axe-core) en 10 escenarios.
  - LCP entre 0.5 y 1.5 s (objetivo del brief: ≤ 2.5 s).
  - CLS ≤ 0.04 (objetivo ≤ 0.1).
- **Hallazgos de la auditoría:** 5. Se corrigieron 4 durante la auditoría: inestabilidad visual (CLS) en carrito y checkout, HTML inválido en el resumen del checkout y áreas táctiles pequeñas. El quinto es un pendiente menor que pasa a Fase 2.
- **Pruebas:** 27/27 automatizadas en verde; flujos de compra en navegador sin errores de JavaScript ni respuestas 4xx/5xx.
- **Límite importante:** las mediciones usan las imágenes SVG de demostración y un servidor local. Con fotografías reales y el hosting definitivo hay que volver a medir (Fase 4).

## 2. Metodología

1. **Matriz de requisitos:** cada punto del prompt maestro (§3–4) y del brief (§05) se contrastó con el código y se verificó en el navegador.
2. **Pruebas automatizadas:** `npm test`, con 27 casos de unidad e integración contra PostgreSQL real.
3. **Recorridos en navegador** (Playwright + Chromium, viewport móvil):
   - Home → ficha → talla → carrito lateral → checkout.
   - Compra completa con Yape QR hasta "pago pendiente".
   - Looks, Libro de Reclamaciones y seguimiento.
4. **Accesibilidad:** axe-core 4.10 con reglas `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` y `wcag22aa`.
5. **Rendimiento y estabilidad:** LCP y CLS medidos con `PerformanceObserver`. Red emulada de 150 ms RTT y 1.6 Mbps de bajada (similar al "Slow 4G" de Lighthouse) y CPU 4× más lenta, sobre el build de producción (`next build && next start`).
6. **Áreas táctiles:** se midió cada elemento interactivo visible, con 24 px como mínimo WCAG 2.5.8 y 44 px como recomendación.

## 3. Matriz de cumplimiento

Leyenda: ✅ cumple · 🟡 parcial · ❌ no cumple

### 3.1 Home (prompt §3, brief §05)

| Requisito | Estado | Evidencia / comentario |
| --- | --- | --- |
| Header responsivo | ✅ | `src/components/header.tsx`: menú hamburguesa en móvil y navegación horizontal desde `md` |
| Logo editable | 🟡 | Nombre de marca configurable (`NEXT_PUBLIC_STORE_NAME`). Falta el logo en imagen: depende del archivo del cliente y del gestor de contenido (Fase 2) |
| Buscador de productos | ✅ | Ícono en el header → `/buscar` (nombre, descripción, categoría y color) |
| Navegación por categorías | ✅ | Chips desplazables bajo el hero; menú con Mujer, Hombre, Novedades, Ofertas y Looks |
| Banner con imagen o video | 🟡 | Imagen optimizada con `priority` (`Banner.imageUrl`). **Video descartado a propósito**: el brief pide un hero ligero "sin depender de un video pesado" (contradicción C1 de la Fase 0) |
| Novedades | ✅ | Productos con `isNew` |
| Productos destacados | ✅ | Productos con `isFeatured` |
| Más vendidos | ✅ | `getBestSellers()`: solo unidades de pedidos **pagados** de los últimos 90 días; sin ventas suficientes muestra "Destacados". Probado en `tests/catalog.test.ts` |
| Ofertas | ✅ | Productos con precio anterior, con etiqueta "Oferta" y precio tachado |
| Compra el look | ✅ | Modelo `Look`/`LookItem`, sección en Home y páginas `/looks` y `/looks/[slug]` |
| Información de envíos nacionales | ✅ | Zonas activas con tarifa "desde" y envío gratis condicionado, leídas de la base de datos (no fijadas en el código) |
| Métodos de pago | ✅ | Solo los métodos realmente habilitados en el adaptador; la pasarela de prueba no se anuncia |
| Botón de WhatsApp | ✅ | Botón flotante; se oculta si no hay número configurado (no se inventa un número) |
| Footer informativo y legal | ✅ | Ayuda, legales, Libro de Reclamaciones, datos del proveedor y aviso de demostración |

### 3.2 Catálogo

| Requisito | Estado | Evidencia / comentario |
| --- | --- | --- |
| Tarjetas modernas | ✅ | `product-card.tsx`: imagen 4:5, etiquetas, colores y tallas con stock |
| Fotografías de alta calidad | 🟡 | El sistema sirve AVIF/WebP con `next/image`. **Hoy son ilustraciones SVG de demostración**: faltan las fotos reales o licenciadas del cliente |
| Precio en soles | ✅ | `formatPEN` → "S/ 79.90" (IGV incluido) |
| Etiquetas de oferta | ✅ | "Oferta", "Nuevo" y "Agotado" |
| Variantes de color y talla | ✅ | Puntos de color y tallas con stock en la tarjeta |
| Filtros combinables | ✅ | Talla, color, rango de precio y disponibilidad (`listing.tsx`). Formulario GET: funciona sin JavaScript y las URLs se pueden compartir |
| Ordenamiento | ✅ | Recomendados, más nuevos, precio ↑ y precio ↓ |
| Buscador | ✅ | `/buscar?q=` |
| Estados de disponibilidad | ✅ | Agotados al final; etiqueta "Agotado"; filtro "Solo con stock" |
| Paginación accesible | ✅ | 24 por página, con `aria-current` |

### 3.3 Ficha de producto

| Requisito | Estado | Evidencia / comentario |
| --- | --- | --- |
| Galería | ✅ | Miniaturas; al elegir un color se muestra su foto |
| Zoom | ✅ | Vista ampliada a pantalla completa (diálogo modal) |
| Selección de talla y color | ✅ | Obligatorias; las combinaciones sin stock quedan deshabilitadas y tachadas |
| Información de stock | ✅ | "Disponible" / "¡Quedan solo N!", calculado como stock menos reservas |
| Tabla de medidas (cm) | ✅ | Tabla por talla con tolerancia indicada |
| Materiales y cuidados | ✅ | Composición y cuidado |
| Envío y cambios | ✅ | Bloque con enlaces a las políticas |
| Productos relacionados | ✅ | `getRelated()`: misma categoría primero, disponibles primero (probado) |
| Agregar al carrito | ✅ | Abre el carrito lateral |
| Consultar por WhatsApp | ✅ | Botón secundario con el nombre y la URL del producto en el mensaje |
| SEO de la ficha | ✅ | Metadatos, canonical y JSON-LD `Product`/`Offer` |

### 3.4 Carrito y checkout

| Requisito | Estado | Evidencia / comentario |
| --- | --- | --- |
| Carrito lateral | ✅ | `cart-drawer.tsx`: diálogo modal, Esc cierra, el foco vuelve al origen, bloquea el scroll, ± unidades con tope de stock |
| Carrito persistente y editable | ✅ | `localStorage`, sincronizado entre pestañas |
| Compra como invitado | ✅ | Sin registro |
| Formularios breves | ✅ | Una sola página en 4 bloques; autocompletado (`autocomplete`) y teclados adecuados (`inputMode`) |
| Ubigeo departamento → provincia → distrito | ✅ | 1 893 distritos INEI |
| Costo de envío antes de confirmar | ✅ | Calculado en el servidor al elegir el distrito |
| Boleta / factura | ✅ | RUC con dígito verificador |
| Validación en el servidor | ✅ | Precios, stock, cupón y envío se recalculan en `/api/orders`; el navegador nunca fija montos |

### 3.5 Experiencia móvil (prompt §4)

| Requisito | Estado | Evidencia / comentario |
| --- | --- | --- |
| Mobile-first | ✅ | Grilla de 2 columnas en móvil; diseño probado a 390 px |
| Navegación con una mano | 🟡 | Botones de compra grandes y WhatsApp abajo a la derecha. El menú principal está arriba: una barra inferior se evaluará con datos reales de uso (Fase 2) |
| Botones grandes y accesibles | ✅ | CTA principales de 48–56 px de alto. Se corrigieron los enlaces pequeños (hallazgo H4) |
| Imágenes optimizadas | ✅ | `next/image` con `sizes`, AVIF/WebP y `priority` solo en lo visible |
| Rendimiento en conexión móvil | ✅ | Ver §4: LCP ≤ 1.5 s y JS compartido de 103 kB |
| Sin animaciones decorativas costosas | ✅ | Solo transiciones de color; sin librerías de animación ni fuentes web externas |

### 3.6 Páginas informativas y contenido de demostración (prompt §11)

| Requisito | Estado | Evidencia / comentario |
| --- | --- | --- |
| Términos, privacidad, cookies, envíos, cambios | ✅ | Borradores con marcas `[…]` donde falta información. **Requieren revisión legal** |
| Libro de Reclamaciones | ✅ | Formulario con correlativo, fecha límite e impresión de la constancia |
| Identificación del proveedor | ✅ | Muestra "[Pendiente: razón social / RUC / domicilio]" mientras falten los datos; no se inventan |
| Marca provisional identificada | ✅ | "Marca Demo" y aviso en el pie: "productos, precios y existencias son ficticios" |
| Sin reseñas, testimonios ni garantías inventados | ✅ | No existen en el sitio |
| Sustitución fácil por datos reales | ✅ | Carga CSV del catálogo; datos del proveedor por variables de entorno; `NEXT_PUBLIC_DEMO_CONTENT=0` quita el aviso |

## 4. Mediciones

Condiciones: build de producción local, viewport 390×844 @3x, 150 ms RTT, 1.6 Mbps de bajada y CPU 4× más lenta. Consentimiento de cookies rechazado, por lo que no se carga analítica. "Lleno" significa con 2 unidades en el carrito.

| Página | LCP | CLS antes → después | Violaciones axe |
| --- | --- | --- | --- |
| `/` | 0.66 s | 0 → 0 | 0 |
| `/tienda` | 0.48 s | 0 → 0 | 0 |
| `/producto/…` | 0.52 s | 0 → 0 | 0 |
| `/carrito` (vacío) | 1.44 s | **0.154** → 0 | 0 |
| `/checkout` (vacío) | 1.52 s | **0.637** → 0 | 0 |
| `/carrito` (lleno) | 1.43 s | **0.136** → 0.037 | 0 |
| `/checkout` (lleno) | 1.50 s | **0.137** → 0 | **1** → 0 |
| `/looks` | 0.56 s | 0 → 0 | 0 |
| `/libro-de-reclamaciones` | 0.58 s | 0 → 0 | 0 |
| `/seguimiento` | 0.58 s | 0 → 0 | 0 |

- **Objetivos del brief:** LCP ≤ 2.5 s ✅ y CLS ≤ 0.1 ✅ en todos los casos tras las correcciones.
- **JavaScript inicial:** 103 kB compartidos; Home 112 kB y ficha 115 kB en total (gzip, según `next build`).
- El aumento de LCP en carrito y checkout (≈ 0.55 → 1.5 s) es el costo aceptado de no mostrar contenido hasta leer el carrito guardado, para evitar saltos. Sigue muy por debajo del objetivo.
- **No medido todavía:** INP con interacción real, datos de campo (P75 de usuarios) y el efecto de fotografías reales. Corresponde a la Fase 4 con Lighthouse/PageSpeed sobre el hosting definitivo.

## 5. Hallazgos

| ID | Severidad | Hallazgo | Estado |
| --- | --- | --- | --- |
| H1 | Alta | **CLS 0.637 en checkout y 0.154 en carrito vacíos.** Antes de leer el carrito del navegador se pintaba el formulario y luego se reemplazaba (o el pie de página quedaba visible y era empujado) | ✅ Corregido: se reserva una pantalla de alto hasta conocer el contenido (`carrito/page.tsx`, `checkout/page.tsx`) |
| H2 | Media | **CLS ≈ 0.14 con productos en el carrito:** el pie de página visible era desplazado al cargar la cotización | ✅ Corregido (mismo cambio): CLS 0.037 y 0 |
| H3 | Media | **HTML inválido en el resumen del checkout:** un `<p>` dentro de `<dl>` (axe `definition-list`, "serious"), que afecta a lectores de pantalla | ✅ Corregido |
| H4 | Baja | **Enlaces sueltos con área táctil < 24 px** ("Ver todo", "Ver ofertas", "Ver looks", "Ver medidas") | ✅ Corregido: área ampliada con padding sin cambiar el diseño |
| H5 | Baja | Diálogos (menú móvil, zoom) sin trampa de foco completa: el carrito lateral la gestiona, el menú móvil no | ⏳ Pasa a Fase 2 |

**Descartados tras revisión** (falsos positivos de la medición automática):
- El enlace "Saltar al contenido" mide 1 px porque solo es visible al recibir el foco del teclado.
- Las casillas de filtros miden 1 px porque el área táctil real es su etiqueta visible, de 36–40 px.
- Los radios y casillas nativos del Libro de Reclamaciones están dentro de etiquetas que amplían su área.

## 6. Desviaciones justificadas respecto al prompt

| Pedido | Decisión | Motivo |
| --- | --- | --- |
| Banner con video | Solo imagen (video opcional a futuro) | El brief prioriza un hero ligero y LCP ≤ 2.5 s en móvil |
| "Más vendidos" siempre visible | Solo con ventas pagadas reales | No se inventan datos comerciales (prompt §11) |
| "Compra el look" | Conjuntos curados; cada prenda se agrega por separado | El brief ubica *shop the look* avanzado en la Fase 3 |
| Recojo en tienda | No implementado | Falta confirmar que existe un local; la arquitectura de zonas lo admite |

## 7. Pendientes que no bloquean el cierre de la Fase 1

| Pendiente | Responsable | Fase |
| --- | --- | --- |
| Fotografías reales o licenciadas y logo | Cliente | Antes de Fase 5 |
| Datos del proveedor (RUC, razón social, domicilio, correo) y número de WhatsApp | Cliente | Antes de Fase 5 |
| Tarifas y plazos reales de envío (los actuales son de ejemplo) | Cliente + courier | Fase 3 |
| Logo, banners, looks y categorías editables desde el panel | Desarrollo | Fase 2 |
| Trampa de foco en el menú móvil (H5) | Desarrollo | Fase 2 |
| Evaluar barra de navegación inferior en móvil | Desarrollo + datos de uso | Fase 2 |
| Revisión legal de textos | Abogado peruano | Antes de Fase 5 |
| Medición Lighthouse/PageSpeed con fotos reales y hosting final; INP | QA | Fase 4 |
| E2E automatizadas en CI | Desarrollo | Fase 4 |

## 8. Conclusión

La Fase 1 cumple los requisitos de diseño, frontend y experiencia móvil del brief y del prompt maestro, con métricas de rendimiento y accesibilidad dentro de los objetivos. Los cuatro hallazgos de impacto se corrigieron y se verificaron con nuevas mediciones y pruebas.

**Recomendación:** aprobar la Fase 1 y avanzar a la Fase 2 (panel administrativo completo). En paralelo, el cliente debe gestionar las decisiones bloqueantes de la Fase 3, sobre todo la elección de la pasarela de pagos. **El sistema no está listo para recibir pagos reales.**
