# Pedido desde el Editor general

La preparación del pedido forma parte de **01 — Editor general**. No existe una tercera pantalla.

## Flujo

1. Cargar una o varias fotografías.
2. Abrir una miniatura para editar su encuadre.
3. Marcar varias fotografías mediante sus casillas o **Seleccionar todas**.
4. Elegir tamaño, DPI, producto, acabado y copias.
5. Pulsar **APLICAR A LA SELECCIÓN**.
6. Revisar el resumen y generar el ZIP.

## Carpetas

La carpeta se forma como `TAMAÑO + PRODUCTO + ACABADO`, en minúsculas. Cuando el producto es Foto se omite `foto`.

| Configuración | Carpeta |
| --- | --- |
| Foto · 10×15 · Mate | `10x15 mate/` |
| Foto · 10×15 · Brillo | `10x15 brillo/` |
| Foam · 10×15 · Mate | `10x15 foam mate/` |
| Foam · 10×15 · Brillo | `10x15 foam brillo/` |
| Bastidor · 20×25 · Mate | `20x25 bastidor mate/` |
| Bastidor · 40×50 · Brillo | `40x50 bastidor brillo/` |

Las medidas personalizadas usan su medida física normalizada, por ejemplo `9.2x12.7 foto mate` se convierte en `9.2x12.7 mate/`.

## Nombres y copias

- una copia: `001.jpg`;
- tres copias: `001_x3.jpg`.

El sufijo `_xN` comunica la cantidad sin duplicar archivos. La numeración corresponde al orden del lote y se conserva entre carpetas.

El ZIP siempre contiene JPG de laboratorio. Cada archivo utiliza el tamaño, DPI y encuadre propios de esa fotografía.
