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
  const video = Buffer.from(await a.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const context = canvas.getContext('2d');
    const stream = canvas.captureStream(10);
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    const chunks = [];
    recorder.ondataavailable = event => chunks.push(event.data);
    const stopped = new Promise(resolve => { recorder.onstop = resolve; });
    recorder.start();
    for (let frame = 0; frame < 5; frame++) {
      context.fillStyle = frame % 2 ? 'blue' : 'green'; context.fillRect(0, 0, 64, 64);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    recorder.stop(); await stopped; stream.getTracks().forEach(track => track.stop());
    return Array.from(new Uint8Array(await new Blob(chunks).arrayBuffer()));
  }));
  await a.getByLabel('Seleccionar fotos y videos').setInputFiles([
    { name: 'foto.png', mimeType: 'image/png', buffer: photo },
    { name: 'clip.webm', mimeType: 'video/webm', buffer: video },
  ]);
  await a.getByRole('link', { name: 'Descargar clip.webm', exact: true }).waitFor();
  assert.equal(await a.getByText('Subido', { exact: true }).count(), 2);
  assert.equal(await a.getByRole('progressbar').count(), 2);
  await b.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await b.getByRole('link', { name: 'Descargar foto.png', exact: true }).waitFor();
  let previewDownloads = 0;
  const countDownload = () => previewDownloads++;
  b.on('download', countDownload);
  const thumbnail = b.getByRole('button', { name: 'Ver foto.png', exact: true });
  await thumbnail.locator('img').evaluate(image => image.decode());
  assert.equal(await thumbnail.locator('img').evaluate(image => image.naturalWidth), 32);
  for (const closing of ['button', 'escape', 'outside']) {
    await thumbnail.click();
    const viewer = b.getByRole('dialog', { name: 'foto.png', exact: true });
    await viewer.waitFor();
    await viewer.locator('img').evaluate(image => image.decode());
    assert.equal(await viewer.locator('img').evaluate(image => image.naturalWidth), 32);
    if (process.env.PLIP_SCREENSHOT && closing === 'button') await b.screenshot({ path: process.env.PLIP_SCREENSHOT + '.viewer.png' });
    if (closing === 'button') await b.getByRole('button', { name: 'Cerrar visor' }).click();
    else if (closing === 'escape') await b.keyboard.press('Escape');
    else await b.mouse.click(2, 2);
    await viewer.waitFor({ state: 'detached' });
    assert.equal(await thumbnail.evaluate(element => element === document.activeElement), true);
  }
  await b.getByRole('button', { name: 'Ver clip.webm', exact: true }).click();
  const videoViewer = b.getByRole('dialog', { name: 'clip.webm', exact: true });
  await videoViewer.locator('video').waitFor();
  await b.waitForFunction(() => document.querySelector('dialog video')?.readyState >= 2);
  assert.equal(await videoViewer.locator('video').evaluate(element => element.controls && element.videoWidth === 64), true);
  await videoViewer.locator('video').evaluate(element => element.play());
  await b.waitForFunction(() => document.querySelector('dialog video')?.currentTime > 0);
  await b.keyboard.press('Escape');
  await videoViewer.waitFor({ state: 'detached' });
  assert.equal(previewDownloads, 0, 'abrir el visor no inicia descargas');
  b.off('download', countDownload);
  const [download] = await Promise.all([b.waitForEvent('download'), b.getByRole('link', { name: 'Descargar foto.png', exact: true }).click()]);
  assert.equal(download.suggestedFilename(), 'foto.png');
  assert.deepEqual(await readFile(await download.path()), photo);
  const [zip] = await Promise.all([b.waitForEvent('download'), b.getByRole('link', { name: 'Descargar todos', exact: true }).click()]);
  assert.equal(zip.suggestedFilename(), 'transferencias.zip');
  assert.equal((await readFile(await zip.path())).subarray(0, 2).toString(), 'PK');
  b.once('dialog', dialog => dialog.accept());
  await b.getByRole('button', { name: 'Eliminar clip.webm', exact: true }).click();
  await b.getByRole('link', { name: 'Descargar clip.webm', exact: true }).waitFor({ state: 'detached' });
  await a.getByRole('button', { name: 'Actualizar', exact: true }).click();
  await a.getByRole('link', { name: 'Descargar clip.webm', exact: true }).waitFor({ state: 'detached' });
  if (process.env.PLIP_SCREENSHOT) await a.screenshot({ path: process.env.PLIP_SCREENSHOT, fullPage: true });
  assert.deepEqual(errors, []);
  console.log('PASS: dos sesiones React, miniatura original, visor y tres cierres, reproducción de video, nombres, carga múltiple, progreso, descarga original, ZIP, eliminación y actualización.');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  assert.ok(path.resolve(storageDir).startsWith(path.resolve(tmpdir()) + path.sep + 'plip-transferencias-browser-'));
  await rm(storageDir, { recursive: true, force: true });
}
