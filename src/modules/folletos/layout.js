// Geometría física en puntos PDF. No depende de la resolución de rasterizado.
globalThis.FolletosLayout = (() => {
  const PT_PER_CM = 72 / 2.54;
  const SHEET = Object.freeze({ widthPt: 7 * 72, heightPt: 10 * 72 });
  const FORMATS = Object.freeze([
    ['20x15', 20, 15], ['10x15', 10, 15], ['7x10', 7, 10],
    ['5x7', 5, 7], ['9x5', 9, 5], ['8.5x5.5', 8.5, 5.5],
    ['9x5.5', 9, 5.5], ['5x15', 5, 15], ['5x18', 5, 18],
    ['5x20', 5, 20], ['5x5', 5, 5], ['6x6', 6, 6]
  ].map(([id, widthCm, heightCm]) => Object.freeze({ id, widthCm, heightCm,
    label: `${String(widthCm).replace('.', ',')}×${String(heightCm).replace('.', ',')} cm` })));

  function fitCount(available, piece, gap) {
    return Math.max(0, Math.floor((available + gap + 1e-8) / (piece + gap)));
  }

  function calculate({ sheet = SHEET, piece, margins = { top:0, bottom:0, left:0, right:0 }, gapPt = 0, orientation = 'auto' }) {
    if (!piece || !Number.isFinite(piece.widthCm) || !Number.isFinite(piece.heightCm) ||
        piece.widthCm <= 0 || piece.heightCm <= 0 || !Number.isFinite(gapPt) || gapPt < 0 ||
        Object.values(margins).some(v => !Number.isFinite(v) || v < 0) ||
        !['auto', 'vertical', 'horizontal'].includes(orientation)) throw new Error('Geometría inválida.');
    const safeWidthPt = Math.max(0, sheet.widthPt - margins.left - margins.right);
    const safeHeightPt = Math.max(0, sheet.heightPt - margins.top - margins.bottom);
    const candidates = [false, true].map(rotated => {
      const pieceWidthPt = (rotated ? piece.heightCm : piece.widthCm) * PT_PER_CM;
      const pieceHeightPt = (rotated ? piece.widthCm : piece.heightCm) * PT_PER_CM;
      const columns = fitCount(safeWidthPt, pieceWidthPt, gapPt);
      const rows = fitCount(safeHeightPt, pieceHeightPt, gapPt);
      const count = rows * columns;
      const usedWidthPt = columns ? columns * pieceWidthPt + (columns - 1) * gapPt : 0;
      const usedHeightPt = rows ? rows * pieceHeightPt + (rows - 1) * gapPt : 0;
      return { rotated, pieceWidthPt, pieceHeightPt, columns, rows, count,
        usedWidthPt, usedHeightPt, utilization: count * pieceWidthPt * pieceHeightPt / (sheet.widthPt * sheet.heightPt) };
    });
    // Criterio provisional, aislado para poder cambiarlo: más piezas; empate sin rotación.
    const selected = orientation === 'auto'
      ? (candidates[1].count > candidates[0].count ? candidates[1] : candidates[0])
      : candidates.find(candidate => orientation === 'vertical'
        ? candidate.pieceHeightPt >= candidate.pieceWidthPt
        : candidate.pieceWidthPt >= candidate.pieceHeightPt) || candidates[0];
    return { sheet, piece, margins, gapPt, safeWidthPt, safeHeightPt, candidates,
      ...selected, startXPt: margins.left + (safeWidthPt - selected.usedWidthPt) / 2,
      startTopPt: margins.top + (safeHeightPt - selected.usedHeightPt) / 2 };
  }
  return Object.freeze({ SHEET, FORMATS, calculate });
})();
