import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import './layout.js';

const { FORMATS, SHEET, calculate } = globalThis.FolletosLayout;
const gapPt = 3.048 * 72 / 25.4;

test('catálogo y layout físico de los doce formatos', () => {
  assert.equal(FORMATS.length, 12);
  const expected = {
    '20x15': [1, 1, 1, true], '10x15': [1, 2, 2, true],
    '7x10': [2, 2, 4, false], '5x7': [3, 3, 9, false],
    '9x5': [3, 2, 6, true], '8.5x5.5': [2, 4, 8, false],
    '9x5.5': [3, 2, 6, true], '5x15': [1, 4, 4, true],
    '5x18': [3, 1, 3, false], '5x20': [3, 1, 3, false],
    '5x5': [3, 4, 12, false], '6x6': [2, 4, 8, false]
  };
  for (const piece of FORMATS) {
    const layout = calculate({ sheet: SHEET, piece, gapPt });
    assert.deepEqual([layout.columns, layout.rows, layout.count, layout.rotated], expected[piece.id], piece.id);
    assert.equal(layout.candidates.length, 2);
  }
});

test('márgenes cambian capacidad y el DPI no interviene', () => {
  const piece = FORMATS.find(f => f.id === '7x10');
  const original = calculate({ piece, gapPt });
  const reduced = calculate({ piece, gapPt, margins: {top: 60, bottom: 60, left: 60, right: 60} });
  assert.equal(original.count, 4);
  assert.ok(reduced.count < original.count);
  assert.equal('dpi' in original, false);
});

test('orientación manual mantiene una distribución coherente', () => {
  const piece = FORMATS.find(f => f.id === '5x7');
  const automatic = calculate({piece, gapPt});
  const horizontal = calculate({piece, gapPt, orientation:'horizontal'});
  const vertical = calculate({piece, gapPt, orientation:'vertical'});
  assert.deepEqual([automatic.columns, automatic.rows, automatic.count], [3,3,9]);
  assert.deepEqual([horizontal.columns, horizontal.rows, horizontal.count], [2,4,8]);
  assert.equal(horizontal.rotated, true);
  assert.equal(vertical.rotated, false);
});

test('hoja heredada, coordenadas y empate estable', () => {
  assert.deepEqual(SHEET, {widthPt: 504, heightPt: 720});
  const layout = calculate({ piece: FORMATS.find(f => f.id === '5x5'), gapPt });
  assert.ok(layout.startXPt >= 0 && layout.startTopPt >= 0);
  assert.equal(layout.rotated, false);
});

test('continúan las rutas de carga, PDF y resolución seleccionable', async () => {
  const html = await readFile(new URL('./tool.html', import.meta.url), 'utf8');
  const script = html.match(/<script>\s*([\s\S]*?)<\/script>/)?.[1];
  assert.ok(script);
  assert.doesNotThrow(() => new vm.Script(script));
  assert.match(html, /id="archivo"/);
  assert.match(html, /id="formato"/);
  assert.match(html, /<option value="200" selected>/);
  assert.match(html, /<option value="300">/);
  assert.match(html, /PDFDocument\.create\(\)/);
  assert.match(html, /pdfjsLib\.getDocument/);
  assert.match(html, /const layout = currentLayout\(s\)/);
  assert.match(html, /sourcePageToCanvas\(p, s\.dpi\)/);
});
