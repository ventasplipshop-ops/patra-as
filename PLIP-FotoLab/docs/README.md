# PLIP FotoLab 2.3.0

FotoLab prepara fotografías para impresión sin subirlas ni almacenarlas. Incluye dos modos: **Editor general** y **Foto 4×4**.

## Ejecutar fuera de Work

Se necesita Node.js 18 o posterior.

### Windows

1. Descomprime el ZIP.
2. Haz doble clic en `INICIAR-WINDOWS.bat`.
3. Si el navegador no se abre solo, visita `http://127.0.0.1:8080`.

### macOS o Linux

```sh
./iniciar-mac-linux.sh
```

En cualquier sistema también puedes usar:

```sh
npm start
```

Para ejecutar la suite automatizada incluida:

```sh
npm test
```

## Editor general

- Carga una fotografía o un lote de hasta 300 archivos JPG, PNG o WebP mediante botón o arrastrando sobre toda la biblioteca.
- La biblioteca usa miniaturas livianas, mantiene su propio scroll y diferencia claramente la foto activa de la selección múltiple.
- Un clic abre la foto para editar; Ctrl/Cmd alterna selección, Shift agrega un rango y la casilla selecciona directamente.
- La fotografía activa se edita con arrastre de mouse/touch, sliders, zoom, giro y volteo.
- Cada fotografía conserva tamaño, 200/250/300 DPI, producto, acabado, copias, formato y encuadre.
- La selección múltiple permite aplicar tamaño, DPI, Foto/Foam/Bastidor, Mate/Brillo y copias sin alterar los encuadres.
- La fotografía activa puede descargarse individualmente como JPG o PNG con metadatos DPI.
- **GENERAR PEDIDO ZIP** crea localmente las carpetas del laboratorio.
- Cada tarjeta muestra su producción resumida o **Sin configurar**, y permite retirar solamente esa fotografía.

## Foto 4×4

1. Carga el retrato.
2. Ajusta encuadre, posición, zoom o rotación.
3. Elige cantidad y marcas de corte.
4. Revisa la hoja A4 y pulsa **GENERAR PDF**.

Cada copia se dibuja a **40 × 40 mm**. Al imprimir, selecciona 100 % o tamaño real.

## Documentación técnica

- `docs/ARQUITECTURA.md`
- `docs/PREPARAR-PEDIDO.md`
- `docs/PRIVACIDAD.md`
- `docs/VERIFICACION.md`
- `docs/INTEGRACION.md`
