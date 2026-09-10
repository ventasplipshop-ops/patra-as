# Arquitectura

La aplicación es HTML/CSS/JavaScript modular y no necesita una API. Los scripts exponen `window.FotoLab` para facilitar una integración nativa posterior sin conectarla todavía al POS.

## Componentes

| Ruta | Responsabilidad |
| --- | --- |
| `modules/core/state.js` | Estado observable mínimo. |
| `modules/core/transform.js` | Cobertura, zoom, giro, volteo, pan normalizado y Pointer Events. |
| `modules/core/canvas.js` | Canvas, rasterización y descargas locales. |
| `modules/core/dpi.js` | Conversión cm→px y metadatos DPI JPG/PNG. |
| `modules/editor/general-editor.js` | Carga única/múltiple, miniaturas, foto activa, selección, edición y generación de pedido. |
| `modules/fourbyfour/fourbyfour-editor.js` | Carga directa, encuadre y estado Foto 4×4. |
| `modules/fourbyfour/layout.js` | Distribución física de copias en A4. |
| `modules/fourbyfour/pdf-generator.js` | Previsualización y PDF en unidades físicas. |
| `modules/orders/catalog.js` | Tamaños, productos, acabados y medidas personalizadas. |
| `modules/orders/order-state.js` | Estado por fotografía y asignación masiva. |
| `modules/orders/naming.js` | Carpetas, agrupación y nombres `_xN`. |
| `modules/orders/validation.js` | Datos obligatorios y advertencias de resolución. |
| `modules/orders/order-processing.js` | Rasterización secuencial con la transformación individual y sus DPI. |
| `modules/orders/zip-writer.js` | Escritura ZIP local sin servicio externo. |
| `modules/ui/app-controller.js` | Inicialización de los dos modos. |

## Estado por fotografía

Cada elemento conserva dimensiones originales, URL local, tamaño físico, DPI, producto, acabado, copias, formato, calidad y un objeto `transform`. La selección masiva cambia datos de producción y mantiene la misma referencia de `transform`, de modo que nunca reemplaza el encuadre individual.

`panX` y `panY` son valores normalizados entre −1 y 1. El arrastre y los sliders leen y escriben ese mismo estado.

## PDF 4×4

- Hoja: 210 × 297 mm.
- Foto: 40 × 40 mm.
- Conversión: `1 mm = 72 / 25,4 puntos PDF`.
- Márgenes: 10 mm.
- Separación: 5 mm.
- Capacidad: 4 × 6 copias por hoja; cantidades mayores crean páginas adicionales.
- Las marcas quedan fuera de la imagen.
