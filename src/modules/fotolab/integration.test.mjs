// Run with PLIP_PLAYWRIGHT pointing to the installed Playwright package.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLIP_PLAYWRIGHT || 'playwright');
const browser = await chromium.launch({ headless: true, channel: 'msedge', args: ['--disable-features=LocalNetworkAccessChecks'] });
try {
  const page = await browser.newPage({ acceptDownloads: true, viewport: { width: 1500, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
  await page.route('**/__integration', route => route.fulfill({ contentType: 'text/html', body: `
    <style>iframe { width:100%; height:900px; border:0; }</style><div id="test"></div><script type="module">
    import '/@vite/client';
    import RefreshRuntime from '/@react-refresh';
    RefreshRuntime.injectIntoGlobalHook(window);
    window.$RefreshReg$ = () => {}; window.$RefreshSig$ = () => type => type;
    window.__vite_plugin_react_preamble_installed__ = true;
    const React = await import('/node_modules/.vite/deps/react.js');
    const ReactDOM = await import('/node_modules/.vite/deps/react-dom_client.js');
    const createRoot = ReactDOM.createRoot || ReactDOM.default.createRoot;
    const {default: FotoLab} = await import('/src/modules/fotolab/FotoLabView.tsx');
    const {default: Folletos} = await import('/src/modules/folletos/FolletosView.tsx');
    const createElement = React.createElement || React.default.createElement;
    createRoot(document.getElementById('test')).render(createElement('div', null,
      createElement(FotoLab), createElement(Folletos)));
    </script>` })) ;
  await page.goto('http://127.0.0.1:5173/__integration');
  const photo = page.frameLocator('iframe[title="FotoLab"]');
  const flyer = page.frameLocator('iframe[title="Folletos"]');
  const bytes = Buffer.from(await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 1200; c.height = 1600;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#487bc8'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = '#ffb840'; ctx.fillRect(100, 200, 600, 900);
    return c.toDataURL('image/png').split(',')[1];
  }), 'base64');
  const input = { name: 'prueba.png', mimeType: 'image/png', buffer: bytes };
  async function download(locator, signature) {
    console.log('Click', await locator.textContent());
    const [result] = await Promise.all([page.waitForEvent('download'), locator.click({force:true})]).catch(async error => {
      console.error(await photo.locator('#general-notice').textContent());
      console.error(await flyer.locator('#status').textContent());
      throw error;
    });
    assert.equal(await result.failure(), null);
    const output = await readFile(await result.path());
    assert.ok(output.length > 100);
    assert.equal(output.subarray(0, signature.length).toString('hex'), signature.toString('hex'));
    console.log('OK', result.suggestedFilename(), output.length);
    return output;
  }
  await photo.locator('#general-file').setInputFiles([input, { ...input, name: 'segunda.png' }]);
  await photo.getByRole('button', { name: '↓ Descargar foto preparada', exact: true }).waitFor();
  const beforeBulk = await photo.locator('body').evaluate(() => {
    const editor = window.FotoLab.generalEditor;
    return { ids: editor.items.map(item => item.id), activeId: editor.activeId,
      selectedIds: [...editor.selectedIds], transforms: editor.items.map(item => item.transform) };
  });
  await photo.locator('#general-preset').selectOption('13x18');
  await photo.locator('#general-apply-selection').click();
  const afterBulk = await photo.locator('body').evaluate(() => {
    const editor = window.FotoLab.generalEditor;
    return { ids: editor.items.map(item => item.id), activeId: editor.activeId,
      selectedIds: [...editor.selectedIds], transforms: editor.items.map(item => item.transform),
      sizes: editor.items.map(item => [item.sizeId, item.widthCm, item.heightCm]),
      activeImage: Boolean(editor.activeItem()?.image) };
  });
  assert.deepEqual(afterBulk.ids, beforeBulk.ids);
  assert.equal(afterBulk.activeId, beforeBulk.activeId);
  assert.deepEqual(afterBulk.selectedIds, beforeBulk.selectedIds);
  assert.deepEqual(afterBulk.transforms, beforeBulk.transforms);
  assert.deepEqual(afterBulk.sizes, [['13x18', 13, 18], ['13x18', 13, 18]]);
  assert.equal(afterBulk.activeImage, true);
  await download(photo.locator('#general-download'), Buffer.from([255, 216]));
  await photo.locator('#general-format-png').click();
  await download(photo.locator('#general-download'), Buffer.from([137, 80, 78, 71]));
  await download(photo.locator('#general-generate-order'), Buffer.from('PK'));
  await photo.locator('[data-mode-tab="four"]').click();
  await photo.locator('#four-file').setInputFiles(input);
  await photo.locator('#generate-pdf:not([disabled])').waitFor();
  const a4 = await download(photo.locator('#generate-pdf'), Buffer.from('%PDF'));
  const context = vm.createContext({ setTimeout, clearTimeout, Uint8Array, ArrayBuffer });
  vm.runInContext(await readFile(new URL('./web/assets/vendor/pdf-lib/pdf-lib.min.js', import.meta.url), 'utf8'), context);
  const pdf = await context.PDFLib.PDFDocument.load(new Uint8Array(a4));
  assert.equal(pdf.getPageCount(), 1);
  assert.ok(Math.abs(pdf.getPage(0).getWidth() - 210 * 72 / 25.4) < .01);
  assert.ok(Math.abs(pdf.getPage(0).getHeight() - 297 * 72 / 25.4) < .01);
  await flyer.locator('#archivo').setInputFiles(input);
  await flyer.locator('#generar:not([disabled])').waitFor();
  const imposed = await download(flyer.locator('#generar'), Buffer.from('%PDF'));
  const imposedPdf = await context.PDFLib.PDFDocument.load(new Uint8Array(imposed));
  assert.equal(imposedPdf.getPage(0).getWidth(), 504);
  assert.equal(imposedPdf.getPage(0).getHeight(), 720);
  await flyer.locator('#archivo').setInputFiles({ name: 'entrada.pdf', mimeType: 'application/pdf', buffer: a4 });
  await flyer.locator('#generar:not([disabled])').waitFor();
  await flyer.locator('#modo').selectOption('bn');
  await download(flyer.locator('#generar'), Buffer.from('%PDF'));
  assert.deepEqual(errors, []);
  console.log('PASS: React modules, multiple upload, JPG, PNG, ZIP, A4, image/PDF rasterization and 7x10 color/BN.');
} finally { await browser.close(); }
