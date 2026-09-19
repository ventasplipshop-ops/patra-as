// Manual browser integration check; mocks remote services and does not render video.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLIP_PLAYWRIGHT||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  const gid=randomUUID(),tid=randomUUID(),aid=randomUUID(),mid=randomUUID();
  let project=null,uploaded=false,imported=false,job=false,guionUpdated=false;
  const guion={id:gid,nombre:'Problema a solución',descripcion:'Comercial',objetivo:'Consulta',activo:true,musica_sugerida:'Suave',escenas:[{orden:2,nombre:'Solución',tipo:'solucion',duracion:3,instruccion:'Presentá el producto'},{orden:1,nombre:'Gancho',tipo:'gancho',duracion:3,instruccion:'Mostrá el problema'}]};
  const media={id:aid,name:'Producto.jpg',type:'image/jpeg',kind:'photo',probe:{duration:0}};
  await page.route('**/*',async route=>{
    const req=route.request(),u=new URL(req.url());const send=value=>route.fulfill({contentType:'application/json',body:JSON.stringify(value)});
    if(u.pathname.includes('/rest/v1/videolab_guiones')){if(req.method()==='PATCH')guionUpdated=true;return send([guion]);}
    if(u.hostname!=='127.0.0.1')return route.abort();
    if(u.pathname==='/__videolab')return route.fulfill({contentType:'text/html',body:`<div id="root"></div><script type="module">
      import '/@vite/client';import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
      const R=await import('/node_modules/.vite/deps/react.js');const D=await import('/node_modules/.vite/deps/react-dom_client.js');const V=await import('/src/modules/videolab/VideoLabView.tsx');(D.createRoot||D.default.createRoot)(document.getElementById('root')).render((R.createElement||R.default.createElement)(V.default));</script>`});
    if(u.pathname==='/api/transferencias')return send([{id:tid,name:'Celular.mov',type:'video/quicktime',uploadedAt:new Date().toISOString()}]);
    if(u.pathname.startsWith('/api/transferencias/'))throw new Error('El selector de referencias no debe descargar el video al navegador');
    const p=u.pathname.replace('/api/videolab','');
    if(u.pathname.startsWith('/api/videolab')){
      if(p==='/projects'&&req.method()==='POST'){project={...req.postDataJSON(),id:randomUUID(),revision:1};return send(project);}
      if(p==='/projects')return send(project?[project]:[]);
      if(p==='/music')return send([{id:mid,name:'Canción.mp3',probe:{duration:30}}]);
      if(p.endsWith('/import')){imported=true;return send(req.postDataJSON().source==='music'?{...media,id:randomUUID(),kind:'audio',name:'Canción.mp3',probe:{duration:30}}:{...media,id:randomUUID(),kind:'video',name:'Celular.mov',probe:{duration:10}});}
      if(p.endsWith('/assets')&&req.method()==='POST'){uploaded=true;return send(media);}
      if(p.endsWith('/jobs')&&req.method()==='POST'){job=true;return send({id:randomUUID(),state:'queued'});}
      if(p==='/jobs')return send(job?[{id:randomUUID(),state:'queued',progress:0}]:[]);
      if(p.startsWith('/projects/')&&req.method()==='PUT'){project={...req.postDataJSON(),revision:project.revision+1};return send(project);}
      return route.fulfill({status:404,body:''});
    }
    return route.continue();
  });
  await page.goto('http://127.0.0.1:5173/__videolab');
  await page.getByRole('button',{name:'Usar Guion'}).click();
  await page.getByText('1. Gancho',{exact:true}).waitFor();
  assert.equal(project.scenes[0].name,'Gancho');
  await page.locator('input[type=file]').first().setInputFiles({name:'Producto.jpg',mimeType:'image/jpeg',buffer:Buffer.from('synthetic-upload-contract')});
  await page.getByText('Producto.jpg',{exact:true}).waitFor();assert.ok(uploaded);
  await page.getByRole('button',{name:'Desde Transferencias',exact:true}).nth(1).click();
  await page.getByRole('button',{name:'Celular.mov',exact:true}).click();
  await page.getByRole('button',{name:'Agregar 1 archivos'}).click();
  await page.getByText('Celular.mov',{exact:true}).waitFor();assert.ok(imported);
  await page.getByRole('button',{name:'Usar pista',exact:true}).click();
  await page.getByText('Pista: Canción.mp3',{exact:true}).waitFor();
  await page.getByLabel('Silenciar audio de todos los videos').check();
  await page.getByRole('button',{name:'Guardar y renderizar MP4'}).click();
  await page.getByText('En cola — 0%',{exact:true}).waitFor();
  assert.equal(project.muteAll,true);assert.ok(project.music);assert.ok(project.scenes.every(s=>s.assetId));
  await page.getByRole('button',{name:'Nuevo video',exact:true}).click();
  await page.getByRole('button',{name:'Editar Guion',exact:true}).click();
  await page.getByRole('button',{name:'Guardar Guion',exact:true}).click();
  await page.getByRole('button',{name:'Usar Guion'}).waitFor();assert.ok(guionUpdated);
  assert.deepEqual(errors,[]);console.log('VideoLab navegador: Guion ordenado, importación PC/referencia video, música, mute, guardar/cola y administración OK. Sin renders ni servicios externos.');
}finally{await browser.close();}
