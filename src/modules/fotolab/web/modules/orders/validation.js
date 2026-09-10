(function initOrderValidation(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};

  function missingFields(item) {
    const fields = [];
    if (item?.productionAssigned === false) fields.push("datos de producción");
    if (!FotoLab.orderCatalog.resolveSize(item)) fields.push("tamaño");
    if (!FotoLab.orderCatalog.getProduct(item?.product)) fields.push("producto");
    if (!FotoLab.orderCatalog.getFinish(item?.finish)) fields.push("acabado");
    return fields;
  }

  function qualityWarning(item) {
    const size = FotoLab.orderCatalog.resolveSize(item);
    if (!size || !item?.width || !item?.height) return null;
    const outputWidth = FotoLab.dpi.pixelsFromCm(size.widthCm, size.dpi);
    const outputHeight = FotoLab.dpi.pixelsFromCm(size.heightCm, size.dpi);
    const metrics = FotoLab.transform.measureTransform(
      { width: item.width, height: item.height },
      outputWidth,
      outputHeight,
      item.transform || {},
    );
    if (metrics.scale <= 1) return null;
    return {
      itemId: item.id,
      name: item.name,
      increase: Math.round((metrics.scale - 1) * 100),
      requiredWidth: outputWidth,
      requiredHeight: outputHeight,
    };
  }

  function validate(items) {
    const incomplete = [];
    const quality = [];
    for (const item of items) {
      const missing = missingFields(item);
      if (missing.length) incomplete.push({ itemId: item.id, name: item.name, missing });
      const warning = qualityWarning(item);
      if (warning) quality.push(warning);
    }
    return { valid: items.length > 0 && incomplete.length === 0, incomplete, quality };
  }

  FotoLab.orderValidation = { missingFields, qualityWarning, validate };
})(window);
