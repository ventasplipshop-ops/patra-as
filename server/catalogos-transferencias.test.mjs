import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer as createViteServer } from 'vite';
import { createPlipServer } from './plip-server.mjs';

test('Catálogos carga, lista y recupera una imagen persistente mediante el proxy de desarrollo', async () => {
  const storageDir = await mkdtemp(path.join(tmpdir(), 'plip-catalogos-transferencias-'));
  const api = await createPlipServer({ storageDir, apiOnly:true });
  await new Promise((resolve, reject) => { api.once('error', reject); api.listen(0, '127.0.0.1', resolve); });
  const apiAddress = api.address();
  assert.ok(apiAddress && typeof apiAddress === 'object');
  const vite = await createViteServer({ configFile:false, logLevel:'silent', server:{ host:'127.0.0.1', port:0,
    proxy:{ '/api/transferencias':{ target:`http://127.0.0.1:${apiAddress.port}` } } } });
  await vite.listen();
  const viteAddress = vite.httpServer.address();
  assert.ok(viteAddress && typeof viteAddress === 'object');
  const base = `http://127.0.0.1:${viteAddress.port}/api/transferencias`;
  try {
    const bytes = await readFile(new URL('../src/components/print/watercolor-pink.png', import.meta.url));
    const body = new FormData(); body.append('file', new Blob([bytes], { type:'image/png' }), 'promocion.png');
    const uploadedResponse = await fetch(base, { method:'POST', body });
    assert.equal(uploadedResponse.status, 201);
    assert.match(uploadedResponse.headers.get('content-type') || '', /^application\/json/);
    const reference = await uploadedResponse.json();
    assert.match(reference.id, /^[\da-f-]{36}$/);
    assert.equal(reference.name, 'promocion.png');
    assert.equal(reference.type, 'image/png');

    const listedResponse = await fetch(base);
    assert.match(listedResponse.headers.get('content-type') || '', /^application\/json/);
    assert.ok((await listedResponse.json()).some(file => file.id === reference.id));

    const recovered = await fetch(`${base}/${reference.id}/download`);
    assert.equal(recovered.status, 200);
    assert.equal(recovered.headers.get('content-type'), 'image/png');
    assert.deepEqual(Buffer.from(await recovered.arrayBuffer()), bytes);
  } finally {
    await vite.close();
    await new Promise(resolve => api.close(resolve));
    await rm(storageDir, { recursive:true, force:true });
  }
});
