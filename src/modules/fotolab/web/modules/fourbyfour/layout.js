(function initLayoutModule(global) {
  "use strict";

  const FotoLab = global.FotoLab = global.FotoLab || {};
  const A4 = Object.freeze({ width: 210, height: 297 });
  const PHOTO = 40;
  const MARGIN = 10;
  const GAP = 5;

  function calculateSheetLayout(copies) {
    const columns = Math.floor((A4.width - (2 * MARGIN) + GAP) / (PHOTO + GAP));
    const rows = Math.floor((A4.height - (2 * MARGIN) + GAP) / (PHOTO + GAP));
    const perPage = columns * rows;
    const pageCount = Math.max(1, Math.ceil(Math.max(1, copies) / perPage));
    const blockWidth = columns * PHOTO + (columns - 1) * GAP;
    const blockHeight = rows * PHOTO + (rows - 1) * GAP;
    const originX = (A4.width - blockWidth) / 2;
    const originTop = (A4.height - blockHeight) / 2;
    const pages = [];
    let remaining = Math.max(1, Math.floor(copies));

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const placements = [];
      const count = Math.min(perPage, remaining);
      for (let index = 0; index < count; index += 1) {
        const column = index % columns;
        const row = Math.floor(index / columns);
        placements.push({
          x: originX + column * (PHOTO + GAP),
          yTop: originTop + row * (PHOTO + GAP),
          width: PHOTO,
          height: PHOTO,
        });
      }
      pages.push(placements);
      remaining -= count;
    }

    return { sheet: A4, photo: PHOTO, margin: MARGIN, gap: GAP, columns, rows, perPage, pageCount, pages };
  }

  FotoLab.sheetLayout = { A4, PHOTO, MARGIN, GAP, calculateSheetLayout };
})(window);
