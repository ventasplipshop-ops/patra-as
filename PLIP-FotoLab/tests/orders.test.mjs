import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

globalThis.window = globalThis;

for (const file of [
  "site/modules/core/transform.js",
  "site/modules/core/dpi.js",
  "site/modules/orders/catalog.js",
  "site/modules/orders/order-state.js",
  "site/modules/orders/naming.js",
  "site/modules/orders/validation.js",
  "site/modules/orders/zip-writer.js",
]) vm.runInThisContext(await readFile(file, "utf8"), { filename: file });

function item(overrides = {}) {
  return {
    id: overrides.id || "a",
    name: overrides.name || "retrato.jpg",
    sizeId: "10x15",
    widthCm: 10,
    heightCm: 15,
    dpi: 200,
    product: "foto",
    finish: "mate",
    copies: 1,
    width: 2400,
    height: 3600,
    transform: { zoom: 1, rotation: 0, flipX: false, flipY: false, panX: 0, panY: 0 },
    ...overrides,
  };
}

test("Foto omite la palabra foto en el nombre de carpeta", () => {
  assert.equal(FotoLab.orderNaming.folderName(item()), "10x15 mate");
});

test("Foam genera una carpeta propia con acabado mate", () => {
  assert.equal(FotoLab.orderNaming.folderName(item({ product: "foam" })), "10x15 foam mate");
});

test("Bastidor conserva el acabado brillo", () => {
  assert.equal(FotoLab.orderNaming.folderName(item({ sizeId: "40x50", product: "bastidor", finish: "brillo" })), "40x50 bastidor brillo");
});

test("Mate y Brillo nunca se mezclan en la misma agrupación", () => {
  const groups = FotoLab.orderNaming.groupItems([item({ id: "a", finish: "mate" }), item({ id: "b", finish: "brillo" })]);
  assert.deepEqual(groups.map((group) => group.folder), ["10x15 brillo", "10x15 mate"]);
});

test("cada combinación tamaño producto acabado produce otra carpeta", () => {
  const groups = FotoLab.orderNaming.groupItems([
    item({ id: "a", sizeId: "10x15", product: "foto", finish: "mate" }),
    item({ id: "b", sizeId: "10x15", product: "foam", finish: "mate" }),
    item({ id: "c", sizeId: "20x25", product: "foam", finish: "mate" }),
  ]);
  assert.deepEqual(groups.map((group) => group.folder), ["10x15 foam mate", "10x15 mate", "20x25 foam mate"]);
});

test("la edición masiva modifica solo las fotografías seleccionadas", () => {
  const source = [item({ id: "a" }), item({ id: "b" }), item({ id: "c" })];
  const output = FotoLab.orderState.applyBulk(source, new Set(["a", "c"]), { sizeId: "20x25", product: "foam", finish: "brillo", copies: 3 });
  assert.equal(output[0].product, "foam");
  assert.equal(output[1].product, "foto");
  assert.equal(output[2].copies, 3);
});

test("el resumen diferencia fotos físicas y cantidad total de copias", () => {
  const [group] = FotoLab.orderNaming.groupItems([item({ id: "a", copies: 3 }), item({ id: "b", copies: 2 })]);
  assert.equal(group.photoCount, 2);
  assert.equal(group.copies, 5);
});

test("las copias se representan con el sufijo xN", () => {
  assert.equal(FotoLab.orderNaming.allocateFileName(1, 1), "001.jpg");
  assert.equal(FotoLab.orderNaming.allocateFileName(2, 3), "002_x3.jpg");
});

test("las colisiones de nombres se resuelven automáticamente", () => {
  const used = new Set();
  assert.equal(FotoLab.orderNaming.allocateFileName(1, 2, used), "001_x2.jpg");
  assert.equal(FotoLab.orderNaming.allocateFileName(1, 2, used), "001_x2-2.jpg");
});

test("una fotografía incompleta bloquea la validación del pedido", () => {
  const result = FotoLab.orderValidation.validate([item({ product: null, finish: null })]);
  assert.equal(result.valid, false);
  assert.deepEqual(result.incomplete[0].missing, ["producto", "acabado"]);
});

test("la selección por rango incluye ambos extremos", () => {
  const items = [item({ id: "a" }), item({ id: "b" }), item({ id: "c" }), item({ id: "d" })];
  assert.deepEqual([...FotoLab.orderState.rangeIds(items, 1, 3)], ["b", "c", "d"]);
});

test("la edición masiva conserva el encuadre individual", () => {
  const transform = { zoom: 1.7, rotation: 90, flipX: true, flipY: false, panX: .35, panY: -.2 };
  const [output] = FotoLab.orderState.applyBulk([item({ transform })], new Set(["a"]), { product: "bastidor", finish: "mate", copies: 2 });
  assert.deepEqual(output.transform, transform);
});

test("cada fotografía conserva su DPI individual", () => {
  const source = [item({ id: "a", dpi: 200 }), item({ id: "b", dpi: 300 })];
  const output = FotoLab.orderState.applyBulk(source, new Set(["a"]), { dpi: 250, copies: 2 });
  assert.equal(output[0].dpi, 250);
  assert.equal(output[1].dpi, 300);
});

test("una medida personalizada forma una carpeta reproducible", () => {
  assert.equal(FotoLab.orderNaming.folderName(item({ sizeId: "custom", widthCm: 12.7, heightCm: 9.2 })), "9.2x12.7 mate");
});

test("el estado nuevo incluye producción y transformación independientes", () => {
  const created = FotoLab.orderState.createItem({ name: "uno.jpg" }, "uno", "blob:uno");
  assert.equal(created.product, "foto");
  assert.equal(created.finish, "mate");
  assert.equal(created.productionAssigned, false);
  assert.equal(created.dpi, 200);
  assert.deepEqual(created.transform, { zoom: 1, rotation: 0, flipX: false, flipY: false, panX: 0, panY: 0 });
});

test("una foto nueva permanece sin configurar hasta asignar producción", () => {
  const created = FotoLab.orderState.createItem({ name: "uno.jpg" }, "uno", "blob:uno");
  const result = FotoLab.orderValidation.validate([{ ...created, width: 2400, height: 3600 }]);
  assert.equal(result.valid, false);
  assert.deepEqual(result.incomplete[0].missing, ["datos de producción"]);
});

test("la validación advierte cuando la resolución exige ampliación", () => {
  const warning = FotoLab.orderValidation.qualityWarning(item({ width: 300, height: 450, sizeId: "20x25" }));
  assert.ok(warning.increase > 0);
});

test("el generador ZIP crea entradas con sus carpetas", async () => {
  const zip = await FotoLab.zipWriter.createZipBlob([
    { name: "10x15 mate/001.jpg", data: new Uint8Array([1, 2, 3]) },
    { name: "40x50 bastidor brillo/001_x2.jpg", data: new Uint8Array([4, 5]) },
  ], null, new Date("2026-08-18T12:00:00"));
  const bytes = new Uint8Array(await zip.arrayBuffer());
  const text = new TextDecoder().decode(bytes);
  assert.deepEqual([...bytes.slice(0, 4)], [0x50, 0x4b, 0x03, 0x04]);
  assert.match(text, /10x15 mate\/001\.jpg/);
  assert.match(text, /40x50 bastidor brillo\/001_x2\.jpg/);
  assert.deepEqual([...bytes.slice(-22, -18)], [0x50, 0x4b, 0x05, 0x06]);
});
