// Requires Vite at 127.0.0.1:5173 and Playwright/Edge. No business services are contacted.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { createPlipServer } from './plip-server.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLIP_PLAYWRIGHT || 'playwright');
const storageDir = await mkdtemp(path.join(tmpdir(), 'plip-transferencias-browser-'));
const server = await createPlipServer({ storageDir });
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const apiOrigin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-features=LocalNetworkAccessChecks'] });
try {
  const compiled = await fetch(apiOrigin);
  assert.equal(compiled.status, 200);
  const compiledHtml = await compiled.text();
  const asset = compiledHtml.match(/src="([^"]+\.js)"/);
  assert.ok(asset, 'sirve el HTML compilado de PLIP');
  assert.equal((await fetch(apiOrigin + asset[1])).status, 200);
  const errors = [];
  const pages = [];
  for (let i = 0; i < 2; i++) {
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1366, height: 900 } });
    const page = await context.newPage(); pages.push(page);
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname !== '127.0.0.1') return route.abort();
      if (url.pathname.startsWith('/api/transferencias')) {
        return route.continue();
      }
      if (url.pathname === '/__transferencias-test') return route.fulfill({ contentType: 'text/html', body: `
        <div id="root" style="padding:24px"></div><script type="module">
        import 'http://127.0.0.1:5173/@vite/client';
        import 'http://127.0.0.1:5173/src/styles/tailwind.css';
        import 'http://127.0.0.1:5173/src/index.css';
        import RefreshRuntime from 'http://127.0.0.1:5173/@react-refresh';
        RefreshRuntime.injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
        window.__vite_plugin_react_preamble_installed__ = true;
        const R = await import('http://127.0.0.1:5173/node_modules/.vite/deps/react.js');
        const React = R.default || R;
        const D = await import('http://127.0.0.1:5173/node_modules/.vite/deps/react-dom_client.js');
        const createRoot = D.createRoot || D.default.createRoot;
        const {default: Transferencias} = await import('http://127.0.0.1:5173/src/modules/transferencias/TransferenciasView.tsx');
        createRoot(document.getElementById('root')).render(React.createElement(Transferencias));
        </script>` });
      return route.continue();
    });
    await page.goto(apiOrigin + '/__transferencias-test');
    await page.getByText('No hay archivos disponibles.', { exact: true }).waitFor();
  }
  const [a, b] = pages;
  const photo = Buffer.from(await a.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#4267aa'; ctx.fillRect(0, 0, 32, 32);
    return canvas.toDataURL('image/png').split(',')[1];
  }), 'base64');
  const video = Buffer.alloc(256 * 1024, 81);
  await a.getByLabel('Seleccionar fotos y videos').setInputFiles([
    { name: 'foto.png', mimeType: 'image/png', buffer: photo },
    { name: 'clip.mp4', mimeType: 'video/mp4', buffer: video },
  ]);
  await a.getByRole('link', { name: 'Descargar clip.mp4', exact: true }).waitFor();
  assert.equal(await a.getByText('Subido', { exact: true }).count(), 2);
  assert.equal(await a.getByRole('progressbar').count(), 2);
  await b.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await b.getByRole('link', { name: 'Descargar foto.png', exact: true }).waitFor();
  const [download] = await Promise.all([b.waitForEvent('download'), b.getByRole('link', { name: 'Descargar foto.png', exact: true }).click()]);
  assert.equal(download.suggestedFilename(), 'foto.png');
  assert.deepEqual(await readFile(await download.path()), photo);
  const [zip] = await Promise.all([b.waitForEvent('download'), b.getByRole('link', { name: 'Descargar todos', exact: true }).click()]);
  assert.equal(zip.suggestedFilename(), 'transferencias.zip');
  assert.equal((await readFile(await zip.path())).subarray(0, 2).toString(), 'PK');
  b.once('dialog', dialog => dialog.accept());
  await b.getByRole('button', { name: 'Eliminar clip.mp4', exact: true }).click();
  await b.getByRole('link', { name: 'Descargar clip.mp4', exact: true }).waitFor({ state: 'detached' });
  await a.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await a.getByRole('link', { name: 'Descargar clip.mp4', exact: true }).waitFor({ state: 'detached' });
  if (process.env.PLIP_SCREENSHOT) await a.screenshot({ path: process.env.PLIP_SCREENSHOT, fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: dos sesiones React, carga múltiple, progreso, listado, descarga original, ZIP, eliminación y actualización.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  assert.ok(path.resolve(storageDir).startsWith(path.resolve(tmpdir()) + path.sep + 'plip-transferencias-browser-'));
  await rm(storageDir, { recursive: true, force: true });
}
