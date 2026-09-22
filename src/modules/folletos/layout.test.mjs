import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import './layout.js';

const { PRODUCTS, SHEETS, calculate } = globalThis.FolletosLayout;
const gapPt = 3.048 * 72 / 25.4;

test('producto comercial y receta de producción 7×10 están separados', () => {
  const product = PRODUCTS.find(item => item.id === '7x10');
  assert.deepEqual([product.finishedWidthMm, product.finishedHeightMm], [70, 100]);
  assert.deepEqual(product.production, {cutGapMm:3.048, fit:'contain', uniformRotationOnly:true});
});

test('layout propuesto reproduce exactamente la cuadrícula del original V5', () => {
  const layout = calculate({product: PRODUCTS.find(item => item.id === '7x10')});
  const mm = 25.4 / 72;
  assert.deepEqual([layout.sheet.widthPt, layout.sheet.heightPt], [504, 720]);
  assert.deepEqual([layout.columns, layout.rows, layout.count, layout.sheetRotated, layout.rotated], [3, 3, 9, false, false]);
  assert.ok(Math.abs(layout.gapPt * mm - 3.048) < 1e-9);
  assert.ok(Math.abs(layout.pieceWidthPt * mm - 57.2346666667) < 1e-8);
  assert.ok(Math.abs(layout.pieceHeightPt * mm - 82.6346666667) < 1e-8);
  assert.ok(Math.abs(layout.resultWidthPt * mm - 57.2346666667) < 1e-8);
  assert.ok(Math.abs(layout.resultHeightPt * mm - 81.7638095238) < 1e-8);
  assert.deepEqual(layout.margins, {top:0, bottom:0, left:0, right:0});
});

test('una imagen 7:10 conserva la reducción real aplicada por V5', () => {
  const layout = calculate({product: PRODUCTS.find(item => item.id === '7x10')});
  const mm = 25.4 / 72;
  const artworkWidthPt = Math.min(layout.pieceWidthPt, layout.pieceHeightPt * .7);
  const artworkHeightPt = artworkWidthPt / .7;
  assert.ok(Math.abs(artworkWidthPt * mm - 57.2346666667) < 1e-8);
  assert.ok(Math.abs(artworkHeightPt * mm - 81.7638095238) < 1e-8);
  assert.ok(Math.abs((layout.pieceHeightPt - artworkHeightPt) * mm - .8708571429) < 1e-8);
});

test('las nueve cajas ocupan las mismas coordenadas físicas que el PDF V5', () => {
  const layout = calculate({product: PRODUCTS.find(item => item.id === '7x10')});
  const positions = [];
  for (let row=0; row<layout.rows; row++) for (let column=0; column<layout.columns; column++) {
    positions.push({
      x: layout.startXPt + column * (layout.cellWidthPt + layout.gapPt),
      top: layout.startTopPt + row * (layout.cellHeightPt + layout.gapPt)
    });
  }
  assert.equal(positions.length, 9);
  assert.equal(positions[0].x, 0);
  assert.equal(positions[0].top, 0);
  assert.ok(Math.abs(positions[8].x + layout.cellWidthPt - 504) < 1e-9);
  assert.ok(Math.abs(positions[8].top + layout.cellHeightPt - 720) < 1e-9);
});

test('el algoritmo general compara solo cuadrículas uniformes y cortables', () => {
  for (const product of PRODUCTS) {
    const layout = calculate({product});
    assert.equal(layout.candidates.length, 4);
    assert.ok(layout.count >= 1);
    assert.ok(layout.columns >= 1 && layout.rows >= 1);
    assert.ok(layout.resultWidthPt <= layout.cellWidthPt + 1e-8);
    assert.ok(layout.resultHeightPt <= layout.cellHeightPt + 1e-8);
    assert.equal(layout.production.uniformRotationOnly, true);
  }
});

test('el cálculo físico no depende del DPI y conserva ajustes avanzados', () => {
  const original = calculate();
  const adjusted = calculate({ gapPt, margins: {top:10, bottom:10, left:10, right:10} });
  assert.equal('dpi' in original, false);
  assert.ok(adjusted.count >= 1);
  assert.ok(adjusted.safeWidthPt < adjusted.pageWidthPt);
  assert.ok(adjusted.safeHeightPt < adjusted.pageHeightPt);
});

test('continúan las rutas de carga, PDF y resolución seleccionable', async () => {
  const html = await readFile(new URL('./tool.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script));
  assert.match(html, /id="archivo"/);
  assert.match(html, /id="formato"/);
  assert.match(html, /id="sheet"/);
  assert.match(html, /<option value="200" selected>/);
  assert.match(html, /<option value="300">/);
  assert.match(html, /PDFDocument\.create\(\)/);
  assert.match(html, /pdfjsLib\.getDocument/);
  assert.match(html, /const layout = currentLayout\(s\)/);
  assert.match(html, /sourcePageToCanvas\(p, s\.dpi\)/);
  assert.doesNotMatch(html, /data-orientation=/);
});
