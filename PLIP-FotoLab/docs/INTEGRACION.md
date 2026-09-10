# Integración posterior

Este paquete sigue siendo FotoLab autónomo y no está conectado al POS.

Para una integración nativa posterior:

1. Montar `site/index.html` o adaptar sus dos paneles: Editor general y Foto 4×4.
2. Mantener el orden de carga de los módulos indicado al final de `site/index.html`.
3. Preservar la política de procesamiento local.
4. Conservar `modules/fourbyfour/pdf-generator.js` y `layout.js` sin cambiar sus unidades físicas.
5. Mantener el estado por fotografía al conectar el pedido con otras entidades del sistema.

El ZIP de pedidos y el PDF 4×4 son flujos separados.
