(function initOrderState(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};

  function normalizeCopies(value) {
    return Math.max(1, Math.min(99, Math.floor(Number(value) || 1)));
  }

  function createItem(file, id, objectUrl) {
    return {
      id,
      file,
      objectUrl,
      image: null,
      name: file?.name || `foto-${id}.jpg`,
      width: 0,
      height: 0,
      sizeId: "10.2x15.2",
      widthCm: 10.2,
      heightCm: 15.2,
      dpi: 200,
      product: "foto",
      finish: "mate",
      copies: 1,
      productionAssigned: false,
      format: "jpeg",
      quality: 0.94,
      transform: { zoom: 1, rotation: 0, flipX: false, flipY: false, panX: 0, panY: 0 },
    };
  }

  function applyBulk(items, selectedIds, patch) {
    const selected = selectedIds instanceof Set ? selectedIds : new Set(selectedIds || []);
    const normalized = { ...patch };
    if (Object.prototype.hasOwnProperty.call(normalized, "copies")) normalized.copies = normalizeCopies(normalized.copies);
    return items.map((item) => selected.has(item.id) ? { ...item, ...normalized, transform: item.transform } : item);
  }

  function updateItem(items, itemId, patch) {
    return items.map((item) => item.id === itemId ? { ...item, ...patch } : item);
  }

  function rangeIds(items, fromIndex, toIndex) {
    const start = Math.max(0, Math.min(fromIndex, toIndex));
    const end = Math.min(items.length - 1, Math.max(fromIndex, toIndex));
    return new Set(items.slice(start, end + 1).map((item) => item.id));
  }

  FotoLab.orderState = { normalizeCopies, createItem, applyBulk, updateItem, rangeIds };
})(window);
