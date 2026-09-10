(function initCanvasModule(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};

  function resizeDisplayCanvas(canvas, cssWidth, cssHeight, maxRatio = 2) {
    const ratio = Math.min(global.devicePixelRatio || 1, maxRatio);
    const width = Math.max(1, Math.round(cssWidth * ratio));
    const height = Math.max(1, Math.round(cssHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const context = canvas.getContext("2d", { willReadFrequently: false });
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    return { context, ratio };
  }

  function sourceCanvasFromImage(image, maxEdge = 1600) {
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function canvasToBlob(canvas, type = "image/png", quality = 0.94) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo codificar la imagen")), type, quality);
    });
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  FotoLab.canvas = {
    resizeDisplayCanvas,
    sourceCanvasFromImage,
    canvasToBlob,
    downloadBlob,
  };
})(window);
