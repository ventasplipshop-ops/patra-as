import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import http from 'node:http';
import { createPlipServer } from './plip-server.mjs';

let directory, storage, dist, server, base;
async function start(apiOnly = false) {
  server = await createPlipServer({ storageDir: storage, distDir: apiOnly ? path.join(directory, 'sin-dist') : dist, apiOnly, maxFileBytes: 1024 * 1024 });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
}
async function close() { await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
before(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 'plip-transferencias-test-'));
  storage = path.join(directory, 'storage'); dist = path.join(directory, 'dist');
  await mkdir(dist); await writeFile(path.join(dist, 'index.html'), '<html>PLIP TEST</html>');
  await writeFile(path.join(dist, 'app.js'), '/* static test */'); await start();
});
after(async () => {
  if (server?.listening) await close();
  const target = path.resolve(directory);
  assert.ok(target.startsWith(path.resolve(tmpdir()) + path.sep + 'plip-transferencias-test-'));
  await rm(target, { recursive: true, force: true });
});
async function upload(name, bytes, type = 'image/jpeg') {
  const body = new FormData(); body.append('file', new Blob([bytes], { type }), name);
  return fetch(base + '/api/transferencias', { method: 'POST', body });
}
async function list() { return (await fetch(base + '/api/transferencias')).json(); }
let first, second;
const photo = Buffer.from([255, 216, 0, 1, 2, 3, 255, 217]);
const video = Buffer.alloc(256 * 1024, 37);

test('sirve dist, fallback React y no expone rutas ajenas', async () => {
  assert.match(await (await fetch(base)).text(), /PLIP TEST/);
  assert.match(await (await fetch(base + '/login')).text(), /PLIP TEST/);
  assert.match(await (await fetch(base + '/app.js')).text(), /static test/);
  assert.equal((await fetch(base + '/.env')).status, 404);
  assert.equal((await fetch(base + '/%2e%2e%5cpackage.json')).status, 404);
  assert.equal((await fetch(base + '/api/desconocido')).status, 404);
});
test('bandeja vacía y ZIP vacío', async () => {
  assert.deepEqual(await list(), []);
  assert.equal((await fetch(base + '/api/transferencias/download-all')).status, 404);
});
test('dos cajas suben nombres repetidos sin alterar bytes ni sobrescribir', async () => {
  const results = await Promise.all([upload('foto ñ.jpg', photo), upload('foto ñ.jpg', video)]);
  assert.deepEqual(results.map(result => result.status), [201, 201]);
  [first, second] = await Promise.all(results.map(result => result.json()));
  assert.notEqual(first.id, second.id);
  assert.equal(first.name, 'foto ñ.jpg');
  assert.equal(first.size, photo.length);
  assert.ok(Number.isFinite(Date.parse(first.uploadedAt)));
  assert.equal(first.type, 'image/jpeg');
  assert.equal(first.filename, undefined);
  assert.deepEqual(await readFile(path.join(storage, first.id, first.name)), photo);
  assert.deepEqual(await readFile(path.join(storage, second.id, second.name)), video);
  assert.equal((await list()).length, 2);
});
test('descarga individual desde otro cliente conserva bytes y nombre', async () => {
  const response = await fetch(`${base}/api/transferencias/${first.id}/download`);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-disposition'), /^attachment;/);
  assert.match(response.headers.get('content-disposition'), /foto%20%C3%B1.jpg/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), photo);
});
test('vista inline y HEAD conservan MIME, nombre y bytes sin crear copias', async () => {
  const url = `${base}/api/transferencias/${first.id}/view`;
  const response = await fetch(url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/jpeg');
  assert.match(response.headers.get('content-disposition'), /^inline;.*foto%20%C3%B1.jpg/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('content-security-policy'), /sandbox/);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), photo);
  const head = await fetch(url, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), String(photo.length));
  assert.equal((await head.arrayBuffer()).byteLength, 0);
  assert.deepEqual(await readdir(path.join(storage, first.id)), [first.name]);
  assert.equal((await fetch(`${base}/api/transferencias/%2e%2e%5c/view`)).status, 404);
  assert.equal((await fetch(`${base}/api/transferencias/no-id/view`)).status, 404);
});
test('conserva el nombre recibido, tanto de cámara como UUID, sin sustituirlo por el ID interno', async () => {
  for (const name of ['IMG_0559.jpeg', 'e55321fd-0515-443d-9baf-28ac143a70f1.jpeg']) {
    const item = await (await upload(name, photo)).json();
    assert.equal(item.name, name);
    assert.notEqual(item.id + '.jpeg', name);
    assert.equal((await list()).find(file => file.id === item.id).name, name);
    assert.deepEqual(await readFile(path.join(storage, item.id, name)), photo);
    await fetch(`${base}/api/transferencias/${item.id}`, { method: 'DELETE' });
  }
  for (const name of ['../foto.jpg', 'CON.jpg', 'foto.svg', 'foto.html']) {
    assert.equal((await upload(name, photo)).status, 400);
  }
});
test('ZIP progresivo sin compresión contiene todos los originales, incluso nombres repetidos', async () => {
  const response = await fetch(base + '/api/transferencias/download-all');
  assert.equal(response.status, 200);
  const bytes = Buffer.from(await response.arrayBuffer());
  const found = new Map();
  let offset = bytes.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
  while (offset >= 0 && bytes.readUInt32LE(offset) === 0x02014b50) {
    assert.equal(bytes.readUInt16LE(offset + 10), 0, 'método STORE, sin compresión');
    const length = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const localOffset = bytes.readUInt32LE(offset + 42);
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString('utf8');
    const dataStart = localOffset + 30 + bytes.readUInt16LE(localOffset + 26) + bytes.readUInt16LE(localOffset + 28);
    found.set(name, bytes.subarray(dataStart, dataStart + length));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  assert.equal(found.size, 2);
  assert.deepEqual(found.get(`${first.id}/${first.name}`), photo);
  assert.deepEqual(found.get(`${second.id}/${second.name}`), video);
  assert.deepEqual((await readdir(storage)).sort(), ['.temporales', first.id, second.id].sort());
});
test('acepta video y lo conserva; eliminación y actualización del listado', async () => {
  const response = await upload('clip.mp4', video, 'video/mp4');
  assert.equal(response.status, 201);
  const item = await response.json();
  assert.equal(item.type, 'video/mp4');
  const view = `${base}/api/transferencias/${item.id}/view`;
  for (const [range, start, end] of [['bytes=2-15', 2, 15], ['bytes=-8', video.length - 8, video.length - 1], ['bytes=100-', 100, video.length - 1]]) {
    const part = await fetch(view, { headers: { Range: range } });
    assert.equal(part.status, 206);
    assert.equal(part.headers.get('content-type'), 'video/mp4');
    assert.equal(part.headers.get('content-range'), `bytes ${start}-${end}/${video.length}`);
    assert.deepEqual(Buffer.from(await part.arrayBuffer()), video.subarray(start, end + 1));
  }
  for (const range of ['bytes=999999-', 'bytes=4-2', 'bytes=-0', 'bytes=0-1,4-5']) {
    const invalid = await fetch(view, { headers: { Range: range } });
    assert.equal(invalid.status, 416);
    assert.equal(invalid.headers.get('content-range'), `bytes */${video.length}`);
  }
  assert.deepEqual(Buffer.from(await (await fetch(`${base}/api/transferencias/${item.id}/download`)).arrayBuffer()), video);
  assert.equal((await fetch(`${base}/api/transferencias/${item.id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await fetch(`${base}/api/transferencias/${item.id}/download`)).status, 404);
  assert.equal((await fetch(view)).status, 404);
  assert.equal((await list()).length, 2);
});
test('rechaza formatos no admitidos, multipart inválido y exceso de tamaño sin residuos', async () => {
  assert.equal((await upload('programa.exe', photo)).status, 400);
  assert.equal((await upload('grande.mp4', Buffer.alloc(1024 * 1024 + 1), 'video/mp4')).status, 413);
  assert.equal((await fetch(base + '/api/transferencias', { method: 'POST', body: 'invalid' })).status, 400);
  const body = new FormData(); body.append('file', new Blob([photo]), 'uno.jpg'); body.append('file', new Blob([photo]), 'dos.jpg');
  assert.equal((await fetch(base + '/api/transferencias', { method: 'POST', body })).status, 400);
  assert.deepEqual(await readdir(path.join(storage, '.temporales')), []);
  assert.equal((await list()).length, 2);
});
test('carga interrumpida no publica un archivo incompleto', async () => {
  await new Promise(resolve => {
    const request = http.request(base + '/api/transferencias', { method: 'POST', headers: {
      'Content-Type': 'multipart/form-data; boundary=pliptest', 'Content-Length': 900000,
    } });
    request.on('error', () => resolve());
    request.write('--pliptest\r\nContent-Disposition: form-data; name="file"; filename="cortado.mp4"\r\nContent-Type: video/mp4\r\n\r\n');
    request.write(Buffer.alloc(10000));
    setTimeout(() => request.destroy(new Error('interrupción simulada')), 80);
  });
  for (let attempt = 0; attempt < 50 && (await readdir(path.join(storage, '.temporales'))).length; attempt++) {
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  assert.deepEqual(await readdir(path.join(storage, '.temporales')), []);
  assert.equal((await list()).length, 2);
});
test('los archivos sobreviven al reinicio del servidor', async () => {
  await close(); await start();
  assert.equal((await list()).length, 2);
  assert.deepEqual(Buffer.from(await (await fetch(`${base}/api/transferencias/${first.id}/download`)).arrayBuffer()), photo);
});

test('modo API sin dist conserva las cinco operaciones y persiste al recrear el proceso', async () => {
  await close(); await start(true);
  assert.equal((await fetch(base)).status, 404);
  assert.equal((await fetch(base + '/login')).status, 404);
  assert.equal((await fetch(base + '/app.js')).status, 404);
  assert.equal((await list()).length, 2);
  const response = await upload('api-video.mp4', video, 'video/mp4');
  assert.equal(response.status, 201);
  const item = await response.json();
  assert.deepEqual(await readFile(path.join(storage, item.id, item.name)), video);
  await close(); await start(true);
  assert.ok((await list()).some(file => file.id === item.id));
  const inline = await fetch(`${base}/api/transferencias/${item.id}/view`);
  assert.equal(inline.status, 200);
  assert.match(inline.headers.get('content-disposition'), /^inline;/);
  assert.deepEqual(Buffer.from(await inline.arrayBuffer()), video);
  const downloaded = await fetch(`${base}/api/transferencias/${item.id}/download`);
  assert.equal(downloaded.status, 200);
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), video);
  const zip = await fetch(base + '/api/transferencias/download-all');
  assert.equal(zip.status, 200);
  assert.equal(Buffer.from(await zip.arrayBuffer()).subarray(0, 2).toString(), 'PK');
  assert.equal((await fetch(`${base}/api/transferencias/${item.id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await list()).length, 2);
});

test('PDF de Folletos se conserva como documento descargable sin vista inline', async () => {
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
  const name = 'folletos_9x5_20piezas.pdf';
  const response = await upload(name, pdf, 'application/pdf');
  assert.equal(response.status, 201);
  const item = await response.json();
  assert.equal(item.name, name);
  assert.equal(item.type, 'application/pdf');
  assert.ok((await list()).some(file => file.id === item.id && file.type === 'application/pdf'));
  const downloaded = await fetch(`${base}/api/transferencias/${item.id}/download`);
  assert.equal(downloaded.headers.get('content-type'), 'application/pdf');
  assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), pdf);
  assert.equal((await fetch(`${base}/api/transferencias/${item.id}/view`)).status, 415);
});
