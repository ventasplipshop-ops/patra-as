# Verificación

Fecha: 18 de agosto de 2026.

La suite automatizada está incluida en `tests/` y se reproduce con:

```sh
npm test
```

Comprueba sintaxis e inicialización, selectores DOM, privacidad, ausencia de módulos retirados, transformación compartida, DPI, PDF A4 de 40 × 40 mm, estado por fotografía, asignación masiva, agrupación, estructura ZIP y contrato de la biblioteca visual (miniaturas, arrastre, selección independiente y liberación de object URLs).

## Resultados reproducibles

- Suite: **38 pruebas, 38 aprobadas, 0 fallidas**.
- Ejecución realizada: `node --run test`, que ejecuta el mismo script `test` de `package.json` que `npm test`.
- Servidor portátil: `index.html`, CSS, PDF-Lib y los 15 módulos JavaScript esenciales respondieron HTTP 200.
- Recursos retirados: una petición al antiguo recurso de modelo respondió 404, como corresponde.
- ZIP: `unzip -t` confirmó tres entradas de prueba sin errores, incluyendo `10x15 mate/002_x2.jpg` y `40x50 bastidor brillo/003.jpg`.
- PDF: una generación reproducible produjo A4 de `595,276 × 841,890 pt`; las pruebas verifican cada imagen en `40 × 40 mm`.
- El archivo `pdf-generator.js` conserva el hash SHA-256 `ec07015f1641e00b0f327477df272101d418cc32a7481f34c6fd01323ef15ab1` de la versión recibida.

## Verificación interactiva

El servidor de previsualización quedó saludable, pero el navegador remoto de validación volvió a bloquear el acceso antes de cargar la página. Por esa razón no se registran como aprobados clicks, carga de lote, descargas ni consola desde ese navegador, y esta compilación no se declara certificada mediante smoke test gráfico.

Recorrido pendiente en un navegador Chrome, Edge o Safari del equipo destino:

1. Arrastrar 10 archivos sobre distintos puntos de la biblioteca y confirmar el overlay **Suelta aquí tus fotografías**.
2. Abrir otra miniatura con clic normal sin alterar la selección; probar casilla, Ctrl/Cmd, Shift, seleccionar todas y deseleccionar.
3. Agregar más archivos con el botón y comprobar que el orden previo se conserva.
4. Cambiar tamaño, producto, acabado y copias; aplicar a la selección y revisar las etiquetas resumidas.
5. Editar zoom, giro, volteo, sliders y arrastre; volver a otra miniatura y confirmar que conserva su encuadre.
6. Retirar una fotografía y confirmar que las demás no cambian.
7. Generar el pedido y abrir el ZIP para comparar sus carpetas con el resumen.
8. Abrir Foto 4×4, cargar, arrastrar, mover sliders, ajustar zoom/rotación, elegir copias y generar PDF.
9. Confirmar consola sin excepciones, rechazos no manejados, imports fallidos ni recursos esenciales 404.
