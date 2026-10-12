# Despliegue de la versión de revisión en GitHub Pages

## Diagnóstico (octubre 2026)

**Síntoma:** `https://forastero7.github.io/tienda_ropa_lima/` mostraba "Tienda de ropa online — Perú (desarrollo propio)", el título del `README.md`, en lugar de la tienda.

**Causa:** GitHub Pages estaba configurado como *Deploy from a branch* con la rama `claude/new-session-hbu6rn` y la carpeta `/ (root)`.

| Evidencia | Detalle |
| --- | --- |
| Ejecuciones de `pages build and deployment` (n.º 1 a 4) | Todas con `head_branch: claude/new-session-hbu6rn`, una por cada push a la rama de desarrollo |
| Pushes a `gh-pages` (commits `fc8d384` y anterior) | No generaron ninguna ejecución de Pages: esa rama nunca fue la fuente |
| Raíz de la rama de desarrollo | No tiene `index.html`; Jekyll (activo por defecto en ese modo) convierte `README.md` en la página principal |
| Workflows del repositorio | Solo `ci.yml`, que no publica nada y además nunca corría (escuchaba `main`, que no existe) |

No existía ningún workflow que reemplazara la tienda por documentación. El problema era únicamente la **fuente configurada** en Settings → Pages. La rama `gh-pages` sí contenía la tienda correcta (verificada: `<title>Marca Demo — Ropa urbana en Perú</title>`, 68 páginas, 0 recursos faltantes).

## Solución aplicada

Un único mecanismo de publicación: el workflow `.github/workflows/pages.yml`, con despliegue oficial por artefacto (`actions/upload-pages-artifact` + `actions/deploy-pages`).

1. **Se activa** con cada push a la rama de desarrollo (o `main`), incluidos los cambios de documentación. También se puede lanzar a mano (*Run workflow*).
2. **Prepara los datos:** levanta PostgreSQL 16 temporal, aplica migraciones, carga el catálogo de demostración y 4 pedidos ficticios para el panel.
3. **Genera el sitio** con `scripts/build-static-demo.mjs`:
   - basePath `/tienda_ropa_lima` y `trailingSlash`.
   - Cada ruta se guarda como `ruta/index.html`.
   - Se copian `_next/static` y `public/`.
   - Se crean `.nojekyll` y `demo-data.json`.
4. **Verifica antes de publicar** con `scripts/verify-static-site.mjs`. El despliegue se cancela si:
   - `index.html` no es la tienda o parece documentación;
   - falta una ruta clave (`/tienda/`, `/carrito/`, `/checkout/`, `/looks/`, fichas de producto, `/admin/`…);
   - algún CSS, JS, imagen o enlace interno no existe en la salida.
5. **Publica solo `out-static/`**: el README y `docs/` no forman parte del artefacto.
6. **Un despliegue a la vez:** `concurrency: pages`.

**Sin dependencias de servidor ni pagos reales:**
- La versión estática no tiene API ni base de datos en línea.
- La pasarela de prueba está deshabilitada en el build de producción.
- El "pago con tarjeta" se simula en el navegador sin cobrar, con avisos visibles en cada página.
- No se publican número de WhatsApp ni datos comerciales inventados.

**Validado localmente:** se reprodujo el job con una base vacía y solo las variables del workflow. Resultado: 64 páginas, `index.html` = tienda, 1 CSS, 37 JS, 26 imágenes y 61 enlaces internos verificados. El recorrido en navegador (compra, seguimiento, reclamación, panel) no tuvo errores.

## Configuración manual requerida (una sola vez)

1. Abrir **https://github.com/forastero7/tienda_ropa_lima/settings/pages**
2. En **Build and deployment → Source**, elegir **GitHub Actions** (en lugar de *Deploy from a branch*).
3. Ir a **Actions → "Pages (versión de revisión)" → Run workflow** (o hacer cualquier push de código) y esperar el check verde (~3–4 min).
4. Abrir https://forastero7.github.io/tienda_ropa_lima/ (si se ve la versión anterior, recargar sin caché: Ctrl+Shift+R).

Si Actions está deshabilitado en el repositorio: **Settings → Actions → General → Allow all actions**.

**Por qué el paso 2 es imprescindible aunque la tienda ya se vea:** el primer run (`1a31151`) desplegó la tienda correctamente aun con la fuente en "rama". Pero GitHub sigue ejecutando también el build Jekyll de la rama, que publica el README:

| Hora (UTC) | Despliegue |
| --- | --- |
| 20:00:16 | Jekyll publicó el README |
| 20:01:14 | El workflow publicó la tienda (último, es el visible) |

Mientras no se cambie la fuente, ambos compiten en cada push. Gana el último, normalmente la tienda porque su build tarda más, pero el orden no está garantizado. Con Source = GitHub Actions el build Jekyll deja de existir.

## Después de verificar

- La rama `gh-pages` queda obsoleta (con Source = GitHub Actions se ignora). Se puede borrar para evitar confusiones.
- Para comprobar qué se publicó, revisar el artefacto `github-pages` del run o ejecutar localmente `npm run build:pages && npm run verify:pages`.
