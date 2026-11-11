import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../src/utils/uuid.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions:{ module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022 },
}).outputText;
const pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function load(crypto) {
  const context = { crypto, exports:{}, Date, Math, Uint8Array };
  vm.runInNewContext(code, context);
  return context.exports.uuidV4;
}

test('Catálogos genera UUID v4 cuando crypto.randomUUID no existe', () => {
  let next = 0;
  const uuidV4 = load({ getRandomValues(bytes) { for (let i = 0; i < bytes.length; i++) bytes[i] = next++ & 255; return bytes; } });
  const first = uuidV4();
  const second = uuidV4();
  assert.match(first, pattern);
  assert.match(second, pattern);
  assert.notEqual(first, second);
});

test('Catálogos conserva un fallback v4 sin Web Crypto', () => {
  const uuidV4 = load(undefined);
  const first = uuidV4();
  const second = uuidV4();
  assert.match(first, pattern);
  assert.match(second, pattern);
  assert.notEqual(first, second);
});

test('el editor de promociones no llama crypto.randomUUID directamente', async () => {
  const editor = await readFile(new URL('../src/components/PriceListModal.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(editor, /crypto\.randomUUID/);
  assert.match(editor, /id:\s*uuidV4\(\)/);
});
