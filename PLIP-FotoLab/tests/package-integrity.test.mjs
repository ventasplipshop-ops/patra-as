import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

async function walk(directory) {
  const output = [];
  for (const entry of await readdir(directory)) {
    const filename = path.join(directory, entry);
    if ((await stat(filename)).isDirectory()) output.push(...await walk(filename));
    else output.push(filename);
  }
  return output;
}

test("todos los módulos propios tienen sintaxis JavaScript válida", async () => {
  const modules = (await walk("site/modules")).filter((filename) => filename.endsWith(".js"));
  for (const filename of modules) execFileSync(process.execPath, ["--check", filename], { stdio: "pipe" });
  assert.ok(modules.length >= 12);
});

test("todos los selectores de ID usados por módulos existen en el HTML", async () => {
  const html = await readFile("site/index.html", "utf8");
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]));
  const modules = (await walk("site/modules")).filter((filename) => filename.endsWith(".js"));
  const missing = [];
  for (const filename of modules) {
    const source = await readFile(filename, "utf8");
    for (const match of source.matchAll(/["'`]#([a-zA-Z][\w-]*)["'`]/g)) {
      if (/^[0-9a-f]{3,8}$/i.test(match[1])) continue;
      if (!ids.has(match[1])) missing.push(`${filename}: #${match[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test("cada script local declarado en el HTML existe", async () => {
  const html = await readFile("site/index.html", "utf8");
  const scripts = [...html.matchAll(/<script src="\.\/([^"]+)"/g)].map((match) => path.join("site", match[1]));
  for (const filename of scripts) await access(filename);
  assert.ok(scripts.length >= 12);
});

test("el código propio no contiene endpoints externos", async () => {
  const files = ["site/index.html", ...(await walk("site/modules")).filter((filename) => filename.endsWith(".js"))];
  const findings = [];
  for (const filename of files) {
    const source = await readFile(filename, "utf8");
    if (/https?:\/\//i.test(source)) findings.push(filename);
  }
  assert.deepEqual(findings, []);
});

test("la aplicación declara exactamente dos modos", async () => {
  const html = await readFile("site/index.html", "utf8");
  assert.deepEqual([...html.matchAll(/data-mode-tab="([^"]+)"/g)].map((match) => match[1]), ["general", "four"]);
  assert.deepEqual([...html.matchAll(/data-mode-panel="([^"]+)"/g)].map((match) => match[1]), ["general", "four"]);
});

test("no quedan módulos, recursos ni dependencias del subsistema retirado", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  assert.deepEqual(Object.keys(packageJson.dependencies || {}).filter((name) => name !== "pdf-lib"), []);
  const ownFiles = ["site/index.html", "site/styles.css", ...(await walk("site/modules")), ...(await walk("docs"))];
  const forbidden = /mediapipe|selfie[_-]segment|\.tflite\b|\.wasm\b|background-removal|white-background-cleaner|mask-editor|clean-white-background|remove-background/i;
  const findings = [];
  for (const filename of ownFiles) {
    const source = await readFile(filename, "utf8");
    if (forbidden.test(source)) findings.push(filename);
  }
  assert.deepEqual(findings, []);
  assert.deepEqual((await walk("site")).filter((filename) => /\.(wasm|tflite)$/i.test(filename)), []);
});

test("el Editor general conserva carga múltiple y datos de producción", async () => {
  const html = await readFile("site/index.html", "utf8");
  assert.match(html, /id="general-file"[^>]+multiple/);
  for (const id of ["general-library", "general-grid", "general-selected-count", "general-product", "general-finish", "general-copies", "general-apply-selection", "general-generate-order", "general-drop-overlay", "general-load-status"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test("la biblioteca usa miniaturas, selección independiente y retiro seguro", async () => {
  const source = await readFile("site/modules/editor/general-editor.js", "utf8");
  assert.match(source, /THUMBNAIL_MAX_SIDE\s*=\s*360/);
  assert.match(source, /image\.src\s*=\s*item\.thumbnailUrl/);
  assert.match(source, /URL\.revokeObjectURL\(item\.thumbnailUrl\)/);
  assert.match(source, /dataset\.generalRemoveId/);
  assert.match(source, /event\.shiftKey/);
  assert.match(source, /event\.ctrlKey\s*\|\|\s*event\.metaKey/);
  const normalBranch = source.slice(source.indexOf("async activate"), source.indexOf("toggleSelection"));
  assert.doesNotMatch(normalBranch, /else\s*\{\s*this\.selectedIds\.add\(itemId\)/);
});

test("toda la biblioteca acepta arrastre y evita navegación accidental", async () => {
  const source = await readFile("site/modules/editor/general-editor.js", "utf8");
  assert.match(source, /const library = this\.\$\("#general-library"\)/);
  assert.match(source, /library\.addEventListener\("drop"/);
  assert.match(source, /global\.addEventListener\("drop"/);
  assert.match(source, /event\.preventDefault\(\)/);
});

test("Foto 4×4 conserva controles y PDF sin pasos adicionales", async () => {
  const html = await readFile("site/index.html", "utf8");
  for (const id of ["four-file", "four-pan-x", "four-pan-y", "four-zoom", "four-rotation", "custom-copies", "cut-marks", "sheet-preview", "generate-pdf"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
});

test("el generador PDF original permanece byte a byte sin cambios", async () => {
  const source = await readFile("site/modules/fourbyfour/pdf-generator.js");
  assert.equal(createHash("sha256").update(source).digest("hex"), "ec07015f1641e00b0f327477df272101d418cc32a7481f34c6fd01323ef15ab1");
});

test("el generador PDF dibuja cada copia a 40 × 40 mm", async () => {
  const source = await readFile("site/modules/fourbyfour/pdf-generator.js", "utf8");
  assert.match(source, /width:\s*mmToPt\(40\)/);
  assert.match(source, /height:\s*mmToPt\(40\)/);
  assert.match(source, /pageWidth\s*=\s*mmToPt\(layout\.sheet\.width\)/);
  assert.match(source, /pageHeight\s*=\s*mmToPt\(layout\.sheet\.height\)/);
});

test("la inicialización crea solo los dos controladores vigentes", async () => {
  const source = await readFile("site/modules/ui/app-controller.js", "utf8");
  assert.match(source, /new FotoLab\.GeneralEditor/);
  assert.match(source, /new FotoLab\.FourByFourEditor/);
  assert.doesNotMatch(source, /OrderController/);
});
