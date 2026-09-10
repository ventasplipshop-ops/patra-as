# Privacidad

FotoLab no tiene backend de fotografías.

- Las imágenes se abren mediante `URL.createObjectURL` en el dispositivo.
- El encuadre, la rasterización, los metadatos DPI, el PDF y el ZIP se generan en el navegador.
- No se usa Supabase, API propia, CDN ni servicio de terceros para procesar imágenes.
- No se usa almacenamiento permanente del navegador para fotografías.
- Las descargas se crean como objetos temporales.

El servidor incluido solo entrega archivos estáticos por `127.0.0.1`; no recibe ni guarda fotografías.
