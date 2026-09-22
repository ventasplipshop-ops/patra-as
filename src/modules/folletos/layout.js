// Geometría física en puntos PDF. No depende de la resolución de rasterizado.
globalThis.FolletosLayout = (() => {
  const PT_PER_MM = 72 / 25.4;
  const SHEETS = Object.freeze([
    Object.freeze({ id: '7x10in', label: '7×10 pulgadas', widthMm: 177.8, heightMm: 254,
      widthPt: 7 * 72, heightPt: 10 * 72 })
  ]);
  // Las medidas terminadas describen el formato comercial y sirven como escala de referencia.
  // El tamaño físico de salida se calcula para ocupar la hoja; no queda fijado a estos milímetros.
  const PRODUCTS = Object.freeze([
    ['20x15', '20×15', 200, 150], ['10x15', '10×15', 100, 150],
    ['7x10', '7×10', 70, 100], ['5x7', '5×7', 50, 70],
    ['9x5', '9×5', 90, 50], ['8.5x5.5', '8,5×5,5', 85, 55],
    ['9x5.5', '9×5,5', 90, 55], ['5x15', '5×15', 50, 150],
    ['5x18', '5×18', 50, 180], ['5x20', '5×20', 50, 200],
    ['5x5', '5×5', 50, 50], ['6x6', '6×6', 60, 60]
  ].map(([id, label, finishedWidthMm, finishedHeightMm]) => Object.freeze({
    id, label, finishedWidthMm, finishedHeightMm,
    production: Object.freeze({ cutGapMm: 3.048, fit: 'contain', uniformRotationOnly: true })
  })));
  const DEFAULT_PRODUCT = PRODUCTS.find(product => product.id === '7x10');

  function calculate({ sheet = SHEETS[0], product = DEFAULT_PRODUCT, margins, gapPt } = {}) {
    if (!sheet || !product || !product.production) throw new Error('Producto u hoja no compatible.');
    const recipe = product.production;
    const resolvedMargins = margins || { top: 0, bottom: 0, left: 0, right: 0 };
    const resolvedGapPt = gapPt ?? recipe.cutGapMm * PT_PER_MM;
    if (!Number.isFinite(resolvedGapPt) || resolvedGapPt < 0 ||
        Object.values(resolvedMargins).some(value => !Number.isFinite(value) || value < 0)) throw new Error('Geometría inválida.');
    const candidates = [false, true].flatMap(sheetRotated => [false, true].map(rotated => {
      const pageWidthPt = sheetRotated ? sheet.heightPt : sheet.widthPt;
      const pageHeightPt = sheetRotated ? sheet.widthPt : sheet.heightPt;
      const safeWidthPt = Math.max(0, pageWidthPt - resolvedMargins.left - resolvedMargins.right);
      const safeHeightPt = Math.max(0, pageHeightPt - resolvedMargins.top - resolvedMargins.bottom);
      const safeWidthMm = safeWidthPt / PT_PER_MM;
      const safeHeightMm = safeHeightPt / PT_PER_MM;
      const referenceWidthMm = rotated ? product.finishedHeightMm : product.finishedWidthMm;
      const referenceHeightMm = rotated ? product.finishedWidthMm : product.finishedHeightMm;
      // La cantidad aproximada surge de cuántos formatos comerciales abarcan la hoja.
      // Luego la cuadrícula completa se escala uniformemente para usar toda el área útil.
      const columns = Math.max(1, Math.round(safeWidthMm / referenceWidthMm));
      const rows = Math.max(1, Math.round(safeHeightMm / referenceHeightMm));
      const cellWidthPt = Math.max(0, (safeWidthPt - resolvedGapPt * (columns - 1)) / columns);
      const cellHeightPt = Math.max(0, (safeHeightPt - resolvedGapPt * (rows - 1)) / rows);
      const referenceWidthPt = referenceWidthMm * PT_PER_MM;
      const referenceHeightPt = referenceHeightMm * PT_PER_MM;
      const scale = Math.min(cellWidthPt / referenceWidthPt, cellHeightPt / referenceHeightPt);
      const resultWidthPt = referenceWidthPt * scale;
      const resultHeightPt = referenceHeightPt * scale;
      const count = cellWidthPt > 0 && cellHeightPt > 0 ? columns * rows : 0;
      const utilization = count * resultWidthPt * resultHeightPt / (pageWidthPt * pageHeightPt);
      return { sheetRotated, rotated, pageWidthPt, pageHeightPt, safeWidthPt, safeHeightPt,
        columns, rows, count, cellWidthPt, cellHeightPt, resultWidthPt,
        resultHeightPt, scale, utilization, cutLines: Math.max(0, columns - 1) + Math.max(0, rows - 1) };
    }));
    // Solo se comparan cuadrículas regulares y cortables. Más copias decide primero;
    // en empate se favorecen aprovechamiento, menos líneas de corte y orientación natural.
    const selected = [...candidates].sort((a, b) => b.count - a.count ||
      Math.round(b.utilization * 1e12) - Math.round(a.utilization * 1e12) || a.cutLines - b.cutLines ||
      Number(a.sheetRotated) - Number(b.sheetRotated) || Number(a.rotated) - Number(b.rotated))[0];
    return {
      sheet, product, production: recipe, margins: resolvedMargins, gapPt: resolvedGapPt,
      candidates, ...selected,
      // Compatibilidad con preview/export: la caja de colocación es la celda completa.
      pieceWidthPt: selected.cellWidthPt, pieceHeightPt: selected.cellHeightPt,
      usedWidthPt: selected.safeWidthPt, usedHeightPt: selected.safeHeightPt,
      startXPt: resolvedMargins.left, startTopPt: resolvedMargins.top,
    };
  }
  return Object.freeze({ PT_PER_MM, SHEETS, PRODUCTS, calculate });
})();
