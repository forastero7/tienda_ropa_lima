# Informe de pruebas

Se actualiza al cierre de cada fase. Última ejecución: Fase 1 (octubre 2026).

## Automatizadas (`npm test`, PostgreSQL real)

| Archivo | Casos | Qué garantiza |
| --- | --- | --- |
| `tests/unit.test.ts` | 11 | RUC/DNI/celular; transiciones de estado; zona de envío por prefijo de ubigeo; envío gratis y recargo por peso; cupones (vigencia, usos, mínimo); firma HMAC con marca de tiempo; formato de soles; ubigeo; parser CSV |
| `tests/orders.test.ts` | 12 | Precios recalculados en el servidor; idempotencia del checkout; **sin sobreventa con 5 compras concurrentes de la última unidad**; distritos sin cobertura; límite de cupones y su liberación; webhook firmado que confirma una sola vez; firma inválida (401); monto distinto → revisión; pago fallido; caducidad y pago tardío con/sin stock; pago manual validado por un administrador con bitácora; reembolso con reingreso |
| `tests/import.test.ts` | 1 | Carga CSV de catálogo y stock: idempotente, errores por fila, stock absoluto con movimiento |
| `tests/catalog.test.ts` | 3 | "Más vendidos" solo con pedidos pagados reales (sin ventas → no se muestra ranking); pedidos cancelados no cuentan; relacionados priorizan la misma categoría |

Resultado: **27/27 en verde**. Typecheck (`tsc --noEmit`) y `next build` sin errores.

## En navegador (Playwright, Chromium, viewport móvil 390×844)

| Flujo | Resultado |
| --- | --- |
| Inicio: novedades, ofertas, compra el look, destacados, envíos, métodos de pago, botón de WhatsApp | ✅ |
| Ficha → talla → agregar → **carrito lateral** (sumar unidades, Esc cierra, foco regresa) → finalizar compra | ✅ |
| Ficha: relacionados, bloque de envío/cambios, "Consultar por WhatsApp" | ✅ |
| Checkout completo con pasarela de prueba (entorno de desarrollo) → pedido pagado | ✅ (Fase anterior) |
| Checkout con Yape QR → pendiente → validación en el panel con n.º de operación | ✅ (Fase anterior) |
| Panel: login, alta de 2FA obligatoria, login sin código rechazado | ✅ (Fase anterior) |
| Datos del proveedor ausentes se muestran como "[Pendiente: …]" | ✅ |
| Sin errores de JavaScript ni respuestas 4xx/5xx en el recorrido | ✅ |

## No cubierto todavía (Fase 4)

- E2E automatizadas en CI (hoy se ejecutan manualmente).
- Lighthouse / Core Web Vitals en móvil con fotos reales.
- Pruebas de seguridad dirigidas: autorización por rol en cada acción del panel, CSRF de *server actions*, carga de archivos (Fase 2).
- Pasarela real en sandbox: no existe aún (depende de elegir proveedor).
