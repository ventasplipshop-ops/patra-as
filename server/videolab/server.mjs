import http from 'node:http';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, lstat, rm, rename, statfs } from 'node:fs/promises';
import { pipeline } from 'node:stream/promises';
import { Readable, Transform } from 'node:stream';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { store } from './storage.mjs';
import { check, id, text, validateProject } from './model.mjs';
import { probe, command, buildRender } from './ffmpeg.mjs';
import { jpegOrientation } from './exif.mjs';

const types={'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.mov':'video/quicktime','.webm':'video/webm','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4','.ogg':'audio/ogg','.flac':'audio/flac'};
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
async function body(req) { let data='',bytes=0; for await(const part of req) { bytes+=part.length; check(bytes<=256000,'Solicitud demasiado grande',413);data+=part; } try{return JSON.parse(data);}catch{check(false,'JSON inválido');} }
function name(value) { text(value,180); check(value && !/[<>:"/\\|?*\x00-\x1f\x7f]/.test(value)&&!/[. ]$/.test(value),'Nombre inválido'); return value; }
async function serve(req,res,file,filename,type,download=false) {
  const st=await lstat(file); check(st.isFile()&&!st.isSymbolicLink(),'Archivo no encontrado',404);
  let start=0,end=st.size-1,status=200;
  const headers={'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Accept-Ranges':'bytes','Content-Disposition':`${download?'attachment':'inline'}; filename*=UTF-8''${encodeURIComponent(filename).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`};
  if(req.headers.range) {
    const m=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
    if(m&&(m[1]||m[2])){start=m[1]?Number(m[1]):Math.max(0,st.size-Number(m[2]));end=m[1]&&m[2]?Math.min(end,Number(m[2])):end;}
    if(!m||!(m[1]||m[2])||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=st.size){res.writeHead(416,{'Content-Range':`bytes */${st.size}`});res.end();return;}
    status=206;headers['Content-Range']=`bytes ${start}-${end}/${st.size}`;
  }
  res.writeHead(status,{...headers,'Content-Length':Math.max(0,end-start+1)});
  if(req.method==='HEAD'||!st.size)res.end();else await pipeline(createReadStream(file,{start,end}),res);
}

export async function createVideoLab({root=process.env.VIDEOLAB_DIR||'/data/videolab',musicRoot=process.env.MUSICA_DIR||'/data/musica',transferUrl=process.env.TRANSFERENCIAS_URL||'http://transferencias:8080',probeMedia=probe,runCommand=command}={}) {
  const db=await store(root),music=await store(musicRoot);
  check(db.root!==music.root && !db.root.startsWith(music.root+path.sep) && !music.root.startsWith(db.root+path.sep),'VideoLab y Música necesitan carpetas independientes');
  let active=null,closing=false,ingesting=false;
  const jobs=new Map((await db.list('jobs')).sort((a,b)=>(a.createdAt||'').localeCompare(b.createdAt||'')).map(j=>[j.id,j]));
  for(const job of jobs.values()) if(['preparing','rendering','finalizing'].includes(job.state)){job.state='failed';job.error='El servidor se reinició durante el render. Puede volver a intentarse.';await db.write('jobs',job.id,job);}
  // Only this process owns this storage. No horizontal replicas (documented deployment).
  const saveJob=j=>db.write('jobs',j.id,{...j});
  async function asset(assetId,projectId) { const a=await db.read('assets',id(assetId));check(a.projectId===projectId,'Asset de otro proyecto');const file=db.file('assets',a.id,a.extension);check(!(await lstat(file)).isSymbolicLink(),'Enlace no permitido');return {...a,path:file}; }
  async function freeSpace() {const s=await statfs(db.root);check(s.bavail*s.bsize>2*1024**3,'Se requieren 2 GiB libres',507);}
  async function ingest(stream,filename,projectId,library=false) {
    check(!ingesting,'Hay otra importación en curso. Reintentá al finalizar.',409);
    const target=library?music:db,assetId=randomUUID(),extension=path.extname(name(filename)).toLowerCase().slice(1),type=types['.'+extension];
    const temp=target.file('tmp',assetId,'part');let published=false;ingesting=true;
    try {
      check(type && (!library||type.startsWith('audio/')),'Formato no admitido'); await freeSpace();
      let bytes=0; const limit=new Transform({transform(chunk,enc,cb){bytes+=chunk.length;cb(bytes>2*1024**3?new Error('Archivo supera 2 GiB'):null,chunk);}});
      await pipeline(stream,limit,createWriteStream(temp,{flags:'wx'}));
      const info=await probeMedia(temp); const kind=type.startsWith('image/')?'photo':type.startsWith('video/')?'video':'audio';
      if(type==='image/jpeg')info.exifOrientation=await jpegOrientation(temp);
      check(kind==='audio'?Boolean(info.audio):Boolean(info.video),'El contenido no coincide con el tipo');
      const record={id:assetId,projectId:library?null:projectId,name:filename,type,kind,extension,size:bytes,probe:info,createdAt:new Date().toISOString()};
      await rename(temp,target.file('assets',assetId,extension)); await target.write('assets',assetId,record);published=true;return record;
    } finally {ingesting=false;await rm(temp,{force:true});if(!published){await rm(target.file('assets',assetId,extension),{force:true});}}
  }
  async function pump() {
    if(active||closing)return;
    const job=[...jobs.values()].find(j=>j.state==='queued');if(!job)return;
    const controller=new AbortController();active={job,controller};const tmp=db.file('tmp',job.id,'mp4');
    const processes=[];
    const trackedCommand=(phase,binary,args,options)=>runCommand(binary,args,{...options,
      stderrFile:db.file('jobs',job.id,`${phase}.stderr.log`),
      onDiagnostic:diagnostic=>processes.push({phase,...diagnostic})});
    try {
      job.state='preparing';await saveJob(job);await freeSpace();
      const assets=new Map();for(const scene of [...job.project.scenes,...(job.project.music?[job.project.music]:[])])assets.set(scene.assetId,await asset(scene.assetId,job.project.id));
      const {args,timeline}=buildRender(job.project,assets,tmp);job.state='rendering';job.startedAt=new Date().toISOString();await saveJob(job);
      let buffer='';await trackedCommand('render',process.env.FFMPEG||'ffmpeg',args,{signal:controller.signal,timeout:2*60*60*1000,onProgress:chunk=>{
        buffer+=chunk;const lines=buffer.split('\n');buffer=lines.pop()||'';for(const line of lines){const match=/^out_time_us=(\d+)/.exec(line);if(match)job.progress=Math.min(0.99,Number(match[1])/1000000/timeline.seconds);}
      }});
      check(!controller.signal.aborted,'Trabajo cancelado');job.state='finalizing';await saveJob(job);
      const verified=JSON.parse(await trackedCommand('verify',process.env.FFPROBE||'ffprobe',['-v','error','-threads','1','-count_frames','-show_streams','-show_format','-of','json',tmp],{signal:controller.signal,timeout:300000}));
      const v=verified.streams.find(s=>s.codec_type==='video'),a=verified.streams.find(s=>s.codec_type==='audio');
      check(v?.codec_name==='h264'&&v.pix_fmt==='yuv420p'&&v.width===timeline.size[0]&&v.height===timeline.size[1]&&v.avg_frame_rate==='30/1'&&Number(v.nb_read_frames)===timeline.frames&&Math.abs(Number(verified.format.duration)-timeline.seconds)<=0.034&&a?.codec_name==='aac'&&Number(a.sample_rate)===48000&&a.channels===2,'El resultado no pasó la validación de duración/formato');
      check(!controller.signal.aborted,'Trabajo cancelado');await rename(tmp,db.file('outputs',job.id,'mp4'));job.state='completed';job.progress=1;job.finishedAt=new Date().toISOString();job.duration=timeline.seconds;
    } catch(error) {
      job.failure={stage:job.state,reason:error.processDiagnostic?.reason||(controller.signal.aborted?'cancelled':'backend_exception'),
        error:{name:error.name,message:error.message,code:error.code??null,stack:error.stack??null},processes};
      job.state=controller.signal.aborted?'cancelled':'failed';job.error=error.message;
      console.error('[VideoLab job failure]',JSON.stringify({jobId:job.id,state:job.state,...job.failure}));
      // Replay the complete captured stderr to container logs, not a truncated message.
      for(const diagnostic of processes) if(diagnostic.stderrFile) {
        console.error(`[VideoLab stderr BEGIN] job=${job.id} phase=${diagnostic.phase} file=${diagnostic.stderrFile}`);
        try {for await(const chunk of createReadStream(diagnostic.stderrFile)) {
          await new Promise((resolve,reject)=>process.stderr.write(chunk,error=>error?reject(error):resolve()));
        }} catch(logError) {console.error('[VideoLab stderr read error]',job.id,logError.message);}
        console.error(`\n[VideoLab stderr END] job=${job.id} phase=${diagnostic.phase}`);
      }
    }
    finally {await rm(tmp,{force:true});await saveJob(job);active=null;void pump().catch(console.error);}
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    try {
      const url=new URL(req.url,'http://videolab');const parts=url.pathname.split('/').filter(Boolean);check(parts[0]==='api'&&parts[1]==='videolab','No encontrado',404);
      const [, , area,key,action]=parts;const method=req.method;
      if(area==='health'&&method==='GET')return json(res,200,{ok:true,active:active?.job.id||null});
      if(area==='projects'&&!key&&method==='GET')return json(res,200,(await db.list('projects')).map(({id,name,updatedAt})=>({id,name,updatedAt})));
      if(area==='projects'&&!key&&method==='POST'){
        const p=await body(req);validateProject(p);const record={...p,id:randomUUID(),revision:1,updatedAt:new Date().toISOString()};await db.write('projects',record.id,record);return json(res,201,record);
      }
      if(area==='projects'&&key){
        id(key);const p=await db.read('projects',key);
        if(!action&&method==='GET')return json(res,200,p);
        if(!action&&method==='PUT'){
          const value=await body(req);validateProject(value);check(value.id===key&&value.revision===p.revision,'El proyecto cambió en otra caja. Volvé a abrirlo.',409);
          for(const s of [...value.scenes,...(value.music?[value.music]:[])])if(s.assetId)await asset(s.assetId,key);
          // No awaits between revision recheck and write scheduling: serialize writes per project below.
          check(!projectWrites.has(key),'Guardado en curso. Reintentá.',409);projectWrites.add(key);
          try{const current=await db.read('projects',key);check(current.revision===value.revision,'Proyecto modificado en otra caja',409);value.revision++;value.updatedAt=new Date().toISOString();await db.write('projects',key,value);}finally{projectWrites.delete(key);}
          return json(res,200,value);
        }
        if(action==='assets'&&method==='POST')return json(res,201,await ingest(req,decodeURIComponent(req.headers['x-file-name']||''),key));
        if(action==='assets'&&method==='GET')return json(res,200,(await db.list('assets')).filter(a=>a.projectId===key));
        if(action==='import'&&method==='POST'){
          const input=await body(req);id(input.id);
          if(input.source==='music'){
            const a=await music.read('assets',input.id);check(!(await lstat(music.file('assets',a.id,a.extension))).isSymbolicLink(),'Enlace no permitido');
            return json(res,201,await ingest(createReadStream(music.file('assets',a.id,a.extension)),a.name,key));
          }
          check(input.source==='transferencias','Origen inválido');
          const listing=await fetch(`${transferUrl}/api/transferencias`,{signal:AbortSignal.timeout(15000)});check(listing.ok,'Transferencias no disponible',502);
          const a=(await listing.json()).find(item=>item.id===input.id);check(a,'Archivo eliminado de Transferencias',404);
          const response=await fetch(`${transferUrl}/api/transferencias/${input.id}/download`,{signal:AbortSignal.timeout(3600000)});check(response.ok,'No se pudo copiar desde Transferencias',502);
          return json(res,201,await ingest(Readable.fromWeb(response.body),a.name,key));
        }
        if(action==='jobs'&&method==='POST'){
          validateProject(p,true);check([...jobs.values()].filter(j=>['queued','preparing','rendering','finalizing'].includes(j.state)).length<10,'Cola llena',429);
          check(!submitting.has(key)&&![...jobs.values()].some(j=>j.project.id===key&&['queued','preparing','rendering','finalizing'].includes(j.state)),'Este proyecto ya está en la cola',409);
          check([...jobs.values()].filter(j=>['queued','preparing','rendering','finalizing'].includes(j.state)).length+submitting.size<10,'Cola llena',429);
          const j={id:randomUUID(),project:structuredClone(p),state:'queued',progress:0,createdAt:new Date().toISOString()};submitting.add(key);try{await saveJob(j);jobs.set(j.id,j);}finally{submitting.delete(key);}void pump().catch(console.error);return json(res,202,{...j,project:undefined});
        }
      }
      if(area==='assets'&&key&&['GET','HEAD'].includes(method)){
        const a=await db.read('assets',id(key));return await serve(req,res,db.file('assets',a.id,a.extension),a.name,a.type);
      }
      if(area==='music'){
        if(!key&&method==='GET')return json(res,200,await music.list('assets'));
        if(!key&&method==='POST')return json(res,201,await ingest(req,decodeURIComponent(req.headers['x-file-name']||''),null,true));
        if(key){const a=await music.read('assets',id(key));if(['GET','HEAD'].includes(method))return await serve(req,res,music.file('assets',a.id,a.extension),a.name,a.type);
          if(method==='DELETE'){await rm(music.file('assets',a.id,a.extension));await rm(music.file('assets',a.id));return json(res,200,{ok:true});}}
      }
      if(area==='jobs'){
        if(!key&&method==='GET')return json(res,200,[...jobs.values()].filter(j=>!url.searchParams.get('projectId')||j.project.id===url.searchParams.get('projectId')).map(j=>({...j,project:undefined})));
        const j=jobs.get(id(key));check(j,'Trabajo no encontrado',404);
        if(!action&&method==='GET')return json(res,200,{...j,project:undefined});
        if(action==='cancel'&&method==='POST'){
          check(['queued','preparing','rendering'].includes(j.state),'El trabajo ya finalizó o se está cerrando',409);
          if(active?.job.id===j.id)active.controller.abort();else{j.state='cancelled';await saveJob(j);}return json(res,200,{ok:true});
        }
        if(action==='output'&&['GET','HEAD'].includes(method)){check(j.state==='completed','Resultado no disponible',409);return await serve(req,res,db.file('outputs',j.id,'mp4'),`VideoLab-${j.id}.mp4`,'video/mp4',url.searchParams.has('download'));}
        if(action==='publish'&&method==='POST'){
          check(j.state==='completed','Resultado no disponible',409);check(!publishing.has(j.id),'Publicación en curso',409);publishing.add(j.id);
          try{
            const boundary='videolab-'+randomUUID();const file=db.file('outputs',j.id,'mp4');
            async function* multipart(){yield Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="VideoLab-${j.id}.mp4"\r\nContent-Type: video/mp4\r\n\r\n`);for await(const chunk of createReadStream(file))yield chunk;yield Buffer.from(`\r\n--${boundary}--\r\n`);}
            let response;try{response=await fetch(`${transferUrl}/api/transferencias`,{method:'POST',headers:{'Content-Type':`multipart/form-data; boundary=${boundary}`},body:Readable.from(multipart()),duplex:'half',signal:AbortSignal.timeout(3600000)});}catch{check(false,'No se pudo conectar con Transferencias. El MP4 sigue disponible en VideoLab.',502);}
            check(response.ok,'Falló publicar. El MP4 sigue disponible en VideoLab.',502);return json(res,201,await response.json());
          }finally{publishing.delete(j.id);}
        }
      }
      check(false,'Endpoint no encontrado',404);
    }catch(error){if(res.headersSent){res.destroy();return;}json(res,error.status||(error.code==='ENOENT'?404:500),{error:error.status?error.message:error.code==='ENOENT'?'No encontrado':'No se pudo completar la operación. Revisá los registros de VideoLab.'});if(!error.status&&error.code!=='ENOENT')console.error(error);}
  });
  const projectWrites=new Set(),publishing=new Set(),submitting=new Set();server.requestTimeout=0;
  server.stopWorker=()=>{closing=true;active?.controller.abort();};
  server.on('close',server.stopWorker);setImmediate(()=>void pump().catch(console.error));return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const server=await createVideoLab();server.listen(Number(process.env.PORT||8090),'0.0.0.0');
  for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>{server.stopWorker();server.close();setTimeout(()=>process.exit(0),5000).unref();});
}
