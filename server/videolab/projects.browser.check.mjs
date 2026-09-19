// Requires local Vite and Playwright/Edge. All API requests are mocked.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLIP_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  let projectsBody='[]';
  await page.route('**/*',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.includes('/rest/v1/videolab_guiones'))return route.fulfill({contentType:'application/json',body:'[]'});
    if(url.hostname!=='127.0.0.1')return route.abort();
    if(url.pathname==='/api/videolab/projects')return route.fulfill({status:200,contentType:projectsBody.startsWith('<')?'text/html':'application/json',body:projectsBody});
    if(url.pathname==='/api/videolab/music')return route.fulfill({contentType:'application/json',body:'[]'});
    if(url.pathname==='/__projects-regression')return route.fulfill({contentType:'text/html',body:`<div id="root"></div><script type="module">
      import '/@vite/client';import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
      const R=await import('/node_modules/.vite/deps/react.js');const D=await import('/node_modules/.vite/deps/react-dom_client.js');const V=await import('/src/modules/videolab/VideoLabView.tsx');(D.createRoot||D.default.createRoot)(document.getElementById('root')).render((R.createElement||R.default.createElement)(V.default));</script>`});
    return route.continue();
  });
  const initialResponse=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/videolab/projects');
  await page.goto('http://127.0.0.1:5173/__projects-regression');
  const response=await initialResponse;assert.equal(response.status(),200);assert.deepEqual(await response.json(),[]);
  await page.waitForFunction(()=>!document.querySelector('.videolab fieldset')?.disabled && document.querySelector('.videolab fieldset'));
  assert.equal(await page.getByRole('heading',{name:'VideoLab',exact:true}).count(),1);
  assert.equal(await page.getByLabel('Abrir proyecto').locator('option').count(),1);
  await page.getByRole('button',{name:'Nuevo video',exact:true}).click();
  assert.deepEqual(errors,[]);
  for(const body of ['<html>PLIP</html>','{"error":"fallo"}','null']) {
    projectsBody=body;
    await page.getByRole('button',{name:'Actualizar',exact:true}).click();
    await page.getByRole('alert').waitFor();
    assert.match(await page.getByRole('alert').textContent(),/no es JSON válido|listado de proyectos inesperado/);
    assert.equal(await page.getByLabel('Abrir proyecto').locator('option').count(),1);
    assert.deepEqual(errors,[]);
  }
  projectsBody='[]';await page.getByRole('button',{name:'Actualizar',exact:true}).click();
  await page.getByRole('alert').waitFor({state:'hidden'});
  await page.waitForFunction(()=>!document.querySelector('.videolab fieldset').disabled);
  await page.getByRole('button',{name:'Nuevo video',exact:true}).click();assert.deepEqual(errors,[]);
  console.log('PASS: montaje VideoLab con HTTP 200 [], respuestas inesperadas controladas y recuperación sin excepciones.');
}finally{await browser.close();}
