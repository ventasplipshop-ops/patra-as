# Auditoría de producción 7×10

Referencia funcional: `impresiones folletos/impresion_7x10_v5.html` (solo lectura).

La hoja histórica de 177,8×254 mm se conserva únicamente como `V5_SHEET_FIXTURE` para estas
comprobaciones. No forma parte del catálogo productivo ni del selector. La hoja predeterminada de
producción es A4.

## Resultado del original V5

- Hoja PDF: 504×720 pt = 7×10 pulgadas = 177,8×254 mm, orientación vertical.
- Distribución: 3 columnas × 3 filas = 9 posiciones, sin rotación.
- Márgenes predeterminados: 0 mm en los cuatro lados.
- Separación: 3,048 mm tanto horizontal como vertical.
- Celda de imposición: 57,2346667×82,6346667 mm.
- Ajuste del archivo: `contain`, centrado dentro de la celda, escala 100% y expansión 0 mm por defecto.
- Para un original con proporción exacta 7:10: imagen colocada a 57,2346667×81,7638095 mm.
  Quedan 0,8708571 mm verticales libres por celda, repartidos arriba y abajo.
- Reducción de una imagen nominal 70×100 mm: 18,2362% en ambos ejes.
- Corte: el PDF no dibuja marcas de corte. El espacio blanco entre posiciones es la separación de corte.
  Las líneas rojas discontinuas existen solo en la vista previa.
- Los controles de sangrado de hoja, desplazamientos, filas, columnas, piezas, escala y expansión
  comienzan en cero o 100%; por lo tanto no cambian el resultado predeterminado.

## Implementación multiformato anterior

- Interpretaba 7×10 como una pieza física exacta de 70×100 mm.
- En la misma hoja y con 3,048 mm de separación entraban 2×2 = 4 piezas.
- Área ocupada: 143,048×203,048 mm.
- Márgenes resultantes por centrado: 17,376 mm a izquierda/derecha y 25,476 mm arriba/abajo.
- La pérdida de 9 a 4 piezas se debía exclusivamente a usar la medida comercial como caja física,
  mientras V5 distribuía nueve celdas reducidas sobre toda la hoja.

## Regla general propuesta y aplicada

- Producto comercial: 7×10 cm, `finishedWidthMm: 70`, `finishedHeightMm: 100`.
- Producción separada: separación de corte 3,048 mm, cuadrículas regulares y ajuste proporcional `contain`.
- Para cada orientación uniforme de hoja y pieza, el motor aproxima filas y columnas según cuántos formatos
  comerciales abarcan el ancho y alto útiles. Después escala todas las copias por igual para ocupar la cuadrícula.
- Compara cuatro candidatos regulares: hoja vertical/horizontal y pieza vertical/horizontal. Favorece cantidad;
  en empate, aprovechamiento, menos líneas de corte y orientaciones naturales. No mezcla rotaciones individuales.
- Para 7×10 sobre hoja 7×10 pulgadas, el cálculo elige 3×3 por sí mismo y devuelve las mismas nueve
  celdas y coordenadas predeterminadas que V5.
- No se agregó ninguna tolerancia o sangrado inferido.
