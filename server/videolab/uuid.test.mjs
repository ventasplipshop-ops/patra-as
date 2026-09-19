import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import vm from 'node:vm';
import ts from 'typescript';

const root = new URL('../../src/modules/videolab/', import.meta.url);
const compile = source => ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const uuidCode = compile(await readFile(new URL('uuid.ts', root), 'utf8'));
const typesCode = compile(await readFile(new URL('types.ts', root), 'utf8'));
const viewSource = ts.createSourceFile('VideoLabView.tsx', await readFile(new URL('VideoLabView.tsx', root), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function load(crypto) {
  const helper = { crypto, exports: {} };
  vm.runInNewContext(uuidCode, helper);
  const types = { crypto, exports: {}, require: module => {
    assert.equal(module, './uuid'); return helper.exports;
  } };
  vm.runInNewContext(typesCode, types);
  return { ...helper.exports, ...types.exports };
}
const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('UUID: prefiere randomUUID disponible y conserva su receptor', () => {
  const expected = '01234567-89ab-4def-8123-456789abcdef';
  const crypto = { randomUUID() { assert.equal(this, crypto); return expected; }, getRandomValues() { assert.fail('Fallback innecesario'); } };
  assert.equal(load(crypto).uuidV4(), expected);
});

test('UUID: sin randomUUID genera v4 y crea escenas con IDs diferentes', () => {
  const { uuidV4, scene } = load({ getRandomValues: bytes => webcrypto.getRandomValues(bytes) });
  const ids = Array.from({ length: 1000 }, () => uuidV4());
  assert.ok(ids.every(id => valid.test(id)));
  assert.equal(new Set(ids).size, ids.length);
  const first = scene('Gancho'), second = scene('Producto');
  assert.match(first.id, valid); assert.match(second.id, valid);
  assert.notEqual(first.id, second.id);
  assert.equal(first.name, 'Gancho'); assert.equal(second.name, 'Producto');
});

test('UUID: fija versión y variante y no recurre a aleatoriedad insegura', () => {
  for (const [fill, expected] of [[0, '00000000-0000-4000-8000-000000000000'], [255, 'ffffffff-ffff-4fff-bfff-ffffffffffff']]) {
    const crypto = { getRandomValues(bytes) { assert.equal(this, crypto); assert.equal(bytes.length, 16); return bytes.fill(fill); } };
    assert.equal(load(crypto).uuidV4(), expected);
  }
  assert.throws(() => load(undefined).uuidV4(), /identificadores seguros/);
});

test('UUID: el botón Duplicar real funciona sin randomUUID y conserva la escena original', () => {
  let handler;
  function visit(node) {
    if (ts.isJsxElement(node) && node.openingElement.tagName.getText(viewSource) === 'button'
      && node.children.some(child => ts.isJsxText(child) && child.text.trim() === 'Duplicar')) {
      const attribute = node.openingElement.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(viewSource) === 'onClick');
      handler = attribute?.initializer?.expression;
    }
    ts.forEachChild(node, visit);
  }
  visit(viewSource);
  assert.ok(handler, 'Debe encontrarse el onClick real del botón Duplicar');
  const crypto = { getRandomValues: bytes => webcrypto.getRandomValues(bytes) };
  const { uuidV4, scene } = load(crypto);
  const original = scene('Gancho');
  const snapshot = JSON.stringify(original);
  let edited;
  const context = { exports: {}, crypto, uuidV4, s: original, i: 0,
    project: { name: 'Video', scenes: [original] }, edit: value => { edited = value; } };
  vm.runInNewContext(compile(`exports.duplicate = ${handler.getText(viewSource)};`), context);
  context.exports.duplicate();
  assert.equal(edited.scenes.length, 2);
  assert.equal(edited.scenes[0], original);
  assert.equal(JSON.stringify(original), snapshot);
  assert.match(edited.scenes[1].id, valid);
  assert.notEqual(edited.scenes[1].id, original.id);
  assert.equal(edited.scenes[1].name, original.name);
  assert.equal(edited.scenes[1].frames, original.frames);
  assert.equal(edited.scenes[1].transition, 'cut');
  assert.equal(edited.scenes[1].overlap, 0);
});
