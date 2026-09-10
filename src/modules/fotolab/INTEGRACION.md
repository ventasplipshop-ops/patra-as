# Integración FotoLab y Folletos — 2026-09-10

## Alcance y montaje

El sistema React sigue siendo la aplicación principal. `Shell.tsx` registra las vistas
FotoLab y Folletos y `SidebarOverlay.tsx` agrega sus botones. `RightToolsDrawer.tsx`
reconoce ambas vistas con listas vacías, sin herramientas comerciales asociadas.

Cada componente React monta un iframe `srcDoc` interno. Se conserva el HTML, CSS y
JavaScript de las herramientas en un documento propio para aislar selectores,
estilos, variables globales y listeners. No se usa otro servidor, URL de aplicación,
lanzador ni ejecutable. Vite empaqueta las copias de `src/modules`, no los originales.
No se conecta información con clientes, carrito, ventas, pedidos comerciales o APIs.

FotoLab incorpora `site/` completo como `fotolab/web/`, incluida la licencia PDF-lib.
Folletos conserva el HTML como `folletos/tool.html`. Su adaptador sustituye los CDN
por PDF-lib local de FotoLab y PDF.js 3.11.174 local, incluido su worker. Los archivos
PDF.js conservan su aviso de licencia Apache 2.0. No se cambian algoritmos de imagen,
imposición, nomenclatura, DPI o generación de PDF.

## Archivos

- Nuevos: `fotolab/FotoLabView.tsx`, `fotolab/web/index.html`, `fotolab/web/styles.css`.
- Nuevos: `fotolab/web/modules/core/{state,canvas,dpi,transform}.js`.
- Nuevos: `fotolab/web/modules/orders/{catalog,order-state,naming,validation,zip-writer,order-processing}.js`.
- Nuevos: `fotolab/web/modules/editor/general-editor.js`.
- Nuevos: `fotolab/web/modules/fourbyfour/{layout,pdf-generator,fourbyfour-editor}.js`.
- Nuevos: `fotolab/web/modules/ui/app-controller.js`.
- Nuevos: `fotolab/web/assets/vendor/pdf-lib/pdf-lib.min.js` y `fotolab/web/licenses/PDF-LIB-LICENSE.md`.
- Nuevos: `fotolab/integration.test.mjs` y este documento.
- Nuevos: `folletos/FolletosView.tsx`, `folletos/tool.html`, `folletos/vendor/{pdf.min,pdf.worker.min}.js`.
- Existentes modificados: `src/layout/Shell.tsx`, `src/modules/sidebar/SidebarOverlay.tsx`, `src/modules/tools/RightToolsDrawer.tsx`.
- La compilación también regenera `dist/` y cachés de las herramientas en `node_modules/`.

## Validación

- TypeScript completo: `node node_modules/typescript/bin/tsc -b`, aprobado.
- Vite completo: aprobado con el cargador habitual fuera del aislamiento y con
  `--configLoader runner` dentro de él. El primer intento habitual dentro del
  aislamiento falló por acceso denegado al cargar la configuración, no por código.
- Advertencias: datos Browserslist antiguos y tamaño del bundle superior a 500 kB.
- FotoLab original: `npm test` en `PLIP-FotoLab`, 38/38 aprobadas.
- Integración: componentes React reales servidos por Vite, montados en una página de
  prueba interceptada por Playwright, sin alterar autenticación ni datos de negocio.
- Navegador Edge: carga de dos imágenes, aplicación masiva con medida personalizada,
  descarga JPG, PNG y ZIP; carga de retrato y descarga PDF A4 con marcas activadas;
  Folletos desde imagen/color y desde PDF/blanco y negro, ambas descargas 7×10.
- Se comprobaron firmas de los archivos, ausencia de errores JavaScript, una página
  A4 de 210×297 mm y una página de Folletos de 504×720 puntos (7×10 pulgadas).
- No se realizó una sesión comercial autenticada ni una impresión física.
- SHA-256 antes/después: los 35 archivos originales permanecen idénticos, sin altas,
  bajas ni cambios de ruta. También se verificó igualdad de las copias de `site/`
  y del HTML de Folletos respecto de sus originales.

Para repetir la prueba integrada: iniciar Vite en 127.0.0.1:5173, disponer de Edge
y Playwright, definir `PLIP_PLAYWRIGHT` con la ruta del paquete si no está resoluble,
y ejecutar `node src/modules/fotolab/integration.test.mjs`.

## Diferencias y límites conservados

- Los documentos están dentro del Shell, por lo que disponen de menos altura que
  al ejecutarse como páginas independientes y usan desplazamiento interno.
- Al salir de una vista se desmonta su iframe: se pierde su trabajo en memoria.
  La recarga también lo pierde. No se agregó persistencia.
- Folletos ya no necesita sus CDN en ejecución; usa las mismas versiones locales.
- No se migró el código a controles React individuales: el adaptador React aloja
  la implementación web existente para preservar su comportamiento.

## Defectos preexistentes observados, no corregidos

1. FotoLab: `GeneralEditor.applyBulkSettings()` combina `{ ...item, ...dimensions }`.
   `orderCatalog.orientedSize()` devuelve también el `id` del tamaño. Con un preset,
   todas las fotos seleccionadas reciben ese id, mientras `activeId` conserva
   `foto-1`: el editor pierde la referencia activa. Reproducido en navegador. La
   medida personalizada no incluye ese id y sí permitió probar el flujo ZIP.
   Las 38 pruebas originales ejercitan otras funciones de aplicación masiva y no
   detectan este fallo del controlador. No se afirma que ese caso funcione.
2. `Shell.tsx` ya renderiza un `LeadsBoardView` adicional fuera de la selección de
   vista. Se dejó tal como estaba; no forma parte de esta integración.

La incorporación está realizada, pero no elimina estos defectos heredados.
