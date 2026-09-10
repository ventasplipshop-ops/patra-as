import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

globalThis.window = globalThis;

for (const file of [
  "site/modules/core/state.js",
  "site/modules/core/transform.js",
  "site/modules/core/dpi.js",
  "site/modules/fourbyfour/layout.js",
  "site/modules/fourbyfour/pdf-generator.js",
]) {
  vm.runInThisContext(await readFile(file, "utf8"), { filename: file });
}

test("centímetros a píxeles conserva DPI", () => {
  assert.equal(FotoLab.dpi.pixelsFromCm(4, 300), 472);
  assert.equal(FotoLab.dpi.pixelsFromCm(10.2, 200), 803);
});

test("PNG recibe un chunk pHYs con la densidad pedida", () => {
  const fakePng = new Uint8Array(70);
  const output = FotoLab.dpi.addPngDpi(fakePng.buffer, 300);
  assert.equal(String.fromCharCode(...output.slice(37, 41)), "pHYs");
  const ppm = (output[41] * 2 ** 24) + (output[42] << 16) + (output[43] << 8) + output[44];
  assert.equal(ppm, Math.round(300 / 0.0254));
});

test("JPG recibe JFIF con densidad DPI", () => {
  const source = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);
  const output = FotoLab.dpi.addJpegDpi(source.buffer, 250);
  assert.equal(String.fromCharCode(...output.slice(6, 10)), "JFIF");
  assert.equal((output[14] << 8) + output[15], 250);
  assert.equal((output[16] << 8) + output[17], 250);
});

test("arrastre y sliders comparten el mismo pan normalizado", () => {
  const image = { width: 1600, height: 1200 };
  const transform = { zoom: 1.5, rotation: 0, panX: 0, panY: 0 };
  const metrics = FotoLab.transform.measureTransform(image, 400, 400, transform);
  const pan = FotoLab.transform.panFromPixels(image, 400, 400, transform, metrics.limitX * 0.42, -metrics.limitY * 0.35);
  assert.ok(Math.abs(pan.panX - 0.42) < 1e-9);
  assert.ok(Math.abs(pan.panY + 0.35) < 1e-9);
  const roundTrip = FotoLab.transform.measureTransform(image, 400, 400, { ...transform, ...pan });
  assert.ok(Math.abs(roundTrip.panX - metrics.limitX * 0.42) < 1e-9);
  assert.ok(Math.abs(roundTrip.panY + metrics.limitY * 0.35) < 1e-9);
});

test("la cobertura considera rotación sin dejar huecos", () => {
  const bounds = FotoLab.transform.rotatedBounds(1200, 800, 13);
  const metrics = FotoLab.transform.measureTransform({ width: 1200, height: 800 }, 400, 400, { zoom: 1, rotation: 13, panX: 0, panY: 0 });
  assert.ok(bounds.width * metrics.scale >= 400 - 1e-8);
  assert.ok(bounds.height * metrics.scale >= 400 - 1e-8);
});

test("A4 y fotos 4×4 usan medidas físicas exactas", () => {
  const layout = FotoLab.sheetLayout.calculateSheetLayout(12);
  assert.deepEqual(layout.sheet, { width: 210, height: 297 });
  assert.equal(layout.photo, 40);
  assert.equal(layout.columns, 4);
  assert.equal(layout.rows, 6);
  assert.equal(layout.pages[0].length, 12);
  assert.ok(Math.abs(FotoLab.pdf.mmToPt(40) - 113.38582677165356) < 1e-10);
  assert.ok(Math.abs(FotoLab.pdf.mmToPt(210) - 595.2755905511812) < 1e-10);
  assert.ok(Math.abs(FotoLab.pdf.mmToPt(297) - 841.8897637795277) < 1e-10);
});

test("cantidades mayores a 24 crean más páginas", () => {
  const layout = FotoLab.sheetLayout.calculateSheetLayout(50);
  assert.equal(layout.perPage, 24);
  assert.equal(layout.pageCount, 3);
  assert.deepEqual(layout.pages.map((page) => page.length), [24, 24, 2]);
});
