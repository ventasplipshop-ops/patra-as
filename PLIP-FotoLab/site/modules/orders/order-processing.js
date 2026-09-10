(function initOrderProcessing(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};

  function loadImage(objectUrl) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("No se pudo abrir la fotografía"));
      image.src = objectUrl;
    });
  }

  async function renderItem(item) {
    const size = FotoLab.orderCatalog.resolveSize(item);
    if (!size) throw new Error(`Tamaño inválido: ${item.name}`);
    const image = item.image || await loadImage(item.objectUrl);
    const width = FotoLab.dpi.pixelsFromCm(size.widthCm, size.dpi);
    const height = FotoLab.dpi.pixelsFromCm(size.heightCm, size.dpi);
    if (width * height > 80000000) throw new Error(`Salida demasiado grande: ${item.name}`);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, width, height);
    FotoLab.transform.drawCover(context, image, width, height, item.transform || {});
    const raw = await FotoLab.canvas.canvasToBlob(canvas, "image/jpeg", Number(item.quality) || 0.94);
    const bytes = FotoLab.dpi.addJpegDpi(await raw.arrayBuffer(), size.dpi);
    canvas.width = 1;
    canvas.height = 1;
    return new Blob([bytes], { type: "image/jpeg" });
  }

  FotoLab.orderProcessing = { loadImage, renderItem };
})(window);
