(function initOrderCatalog(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};
  const SIZES = Object.freeze([
    { id: "10x15", label: "10 × 15 cm", folder: "10x15", widthCm: 10, heightCm: 15 },
    { id: "10.2x15.2", label: "10,2 × 15,2 cm", folder: "10.2x15.2", widthCm: 10.2, heightCm: 15.2 },
    { id: "13x18", label: "13 × 18 cm", folder: "13x18", widthCm: 13, heightCm: 18 },
    { id: "15x20", label: "15 × 20 cm", folder: "15x20", widthCm: 15, heightCm: 20 },
    { id: "20x25", label: "20,3 × 25,2 cm", folder: "20x25", widthCm: 20.3, heightCm: 25.2 },
    { id: "40x50", label: "40 × 50 cm", folder: "40x50", widthCm: 40, heightCm: 50 },
    { id: "a4", label: "A4 · 21 × 29,7 cm", folder: "21x29.7", widthCm: 21, heightCm: 29.7 },
  ]);
  const PRODUCTS = Object.freeze([
    { id: "foto", label: "Foto" },
    { id: "foam", label: "Foam" },
    { id: "bastidor", label: "Bastidor" },
  ]);
  const FINISHES = Object.freeze([
    { id: "mate", label: "Mate" },
    { id: "brillo", label: "Brillo" },
  ]);

  function getSize(sizeId) {
    return SIZES.find((size) => size.id === sizeId) || null;
  }

  function getProduct(productId) {
    return PRODUCTS.find((product) => product.id === productId) || null;
  }

  function getFinish(finishId) {
    return FINISHES.find((finish) => finish.id === finishId) || null;
  }

  function formatMeasure(value) {
    return Number(value).toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  }

  function customFolder(widthCm, heightCm) {
    return [Number(widthCm), Number(heightCm)].sort((a, b) => a - b).map(formatMeasure).join("x");
  }

  function orientedSize(size, image) {
    if (!size) return null;
    const landscape = Number(image?.width || 0) > Number(image?.height || 0);
    return landscape
      ? { ...size, widthCm: size.heightCm, heightCm: size.widthCm }
      : { ...size };
  }

  function resolveSize(item) {
    if (!item) return null;
    const preset = getSize(item.sizeId);
    const widthCm = Number(item.widthCm);
    const heightCm = Number(item.heightCm);
    const dpi = [200, 250, 300].includes(Number(item.dpi)) ? Number(item.dpi) : 200;
    if (preset) {
      const oriented = Number.isFinite(widthCm) && Number.isFinite(heightCm) && widthCm > 0 && heightCm > 0
        ? { widthCm, heightCm }
        : orientedSize(preset, item);
      return { ...preset, ...oriented, dpi };
    }
    if (item.sizeId === "custom" && widthCm > 0 && heightCm > 0) {
      return { id: "custom", label: `${formatMeasure(widthCm)} × ${formatMeasure(heightCm)} cm`, folder: customFolder(widthCm, heightCm), widthCm, heightCm, dpi };
    }
    return null;
  }

  FotoLab.orderCatalog = { SIZES, PRODUCTS, FINISHES, getSize, getProduct, getFinish, orientedSize, resolveSize, customFolder, formatMeasure };
})(window);
