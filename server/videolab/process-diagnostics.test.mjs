import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { command } from './ffmpeg.mjs';
import { createVideoLab } from './server.mjs';

test('proceso fallido conserva exit code y stderr completo aunque los warnings oculten el error',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'videolab-diagnostic-'));
  try {
    const stderrFile=path.join(root,'render.stderr.log');let diagnostic;
    const stderr='BEGIN\n'+'warning\n'.repeat(4000)+'CRITICAL MIDDLE ERROR\n'+'swscaler warning\n'.repeat(4000)+'END\n';
    const script="process.stderr.write('BEGIN\\n'+'warning\\n'.repeat(4000)+'CRITICAL MIDDLE ERROR\\n'+'swscaler warning\\n'.repeat(4000)+'END\\n',()=>process.exit(7));";
    await assert.rejects(command(process.execPath,['-e',script],{stderrFile,onDiagnostic:d=>{diagnostic=d;}}),error=>{
      assert.equal(error.processDiagnostic,diagnostic);assert.match(error.message,/exitCode=7/);return true;
    });
    assert.equal(diagnostic.exitCode,7);assert.equal(diagnostic.signal,null);assert.equal(diagnostic.processError,null);
    assert.equal(diagnostic.reason,'non_zero_exit');assert.equal(diagnostic.stderrLogError,null);
    assert.equal(diagnostic.stderrBytes,Buffer.byteLength(stderr));
    assert.equal(await readFile(stderrFile,'utf8'),stderr);
    assert.match(diagnostic.stderrHead,/BEGIN/);assert.match(diagnostic.stderrTail,/END/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('spawn inexistente conserva evento error, código y diagnóstico',async()=>{
  let diagnostic;
  await assert.rejects(command(path.join(tmpdir(),'videolab-binary-does-not-exist'),[],{onDiagnostic:d=>{diagnostic=d;}}),error=>{
    assert.equal(error.processDiagnostic,diagnostic);return true;
  });
  assert.equal(diagnostic.reason,'process_error');assert.equal(diagnostic.processError.code,'ENOENT');
  assert.match(diagnostic.processError.syscall,/spawn/);assert.equal(diagnostic.signal,null);
});

test('excepción síncrona de spawn conserva el motivo y error original',async()=>{
  await assert.rejects(command(null,[]),error=>{
    assert.equal(error.processDiagnostic.reason,'spawn_throw');
    assert.equal(error.processDiagnostic.exitCode,null);assert.equal(error.processDiagnostic.processError.code,'ERR_INVALID_ARG_TYPE');return true;
  });
});

test('timeout y exceso de stdout explican la detención iniciada por el backend',async()=>{
  for(const [args,options,reason] of [
    [['-e','setInterval(()=>{},1000)'],{timeout:100},'timeout'],
    [['-e',"process.stdout.write('x'.repeat(1000));setInterval(()=>{},1000)"],{maxOutput:10},'stdout_limit'],
  ])await assert.rejects(command(process.execPath,args,options),error=>{
    assert.equal(error.processDiagnostic.reason,reason);
    assert.ok(Object.hasOwn(error.processDiagnostic,'signal'));
    assert.ok(Object.hasOwn(error.processDiagnostic,'exitCode'));return true;
  });
});

test('cancelación informa motivo y conserva el resultado de cierre',async()=>{
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),100);
  try{await assert.rejects(command(process.execPath,['-e','setInterval(()=>{},1000)'],{signal:controller.signal}),error=>{
    assert.equal(error.processDiagnostic.reason,'cancelled');assert.ok(Object.hasOwn(error.processDiagnostic,'signal'));return true;
  });}finally{clearTimeout(timer);}
});

test('salida exitosa sigue resolviendo stdout; diagnóstico registra exit 0',async()=>{
  let diagnostic;
  const out=await command(process.execPath,['-e',"process.stdout.write('ok')"],{onDiagnostic:d=>{diagnostic=d;}});
  assert.equal(out,'ok');assert.equal(diagnostic.exitCode,0);assert.equal(diagnostic.signal,null);assert.equal(diagnostic.reason,'completed');
});

for(const phase of ['render','validation'])test(`job fallido en ${phase}: diagnóstico persistido y stderr en log`,async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'videolab-job-diagnostic-'));let server,logs='';
  const originalWrite=process.stderr.write;
  process.stderr.write=function(chunk,...args){logs+=chunk.toString();const callback=args.find(a=>typeof a==='function');callback?.();return true;};
  try{
    const runCommand=async(binary,args,options)=>{
      if(phase==='render')return command(process.execPath,['-e',"process.stderr.write('ROOT CAUSE\\n'+'warning\\n'.repeat(5000),()=>process.exit(9))"],options);
      if(args.includes('-count_frames'))return command(process.execPath,['-e',`process.stdout.write('${JSON.stringify({streams:[],format:{duration:'3'}})}')`],options);
      await writeFile(args.at(-1),'synthetic-output');return command(process.execPath,['-e',"process.stderr.write('successful-render-stderr\\n')"],options);
    };
    server=await createVideoLab({root:path.join(root,'video'),musicRoot:path.join(root,'music'),runCommand,
      probeMedia:async()=>({video:{index:0,width:100,height:100},duration:3})});
    server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}/api/videolab`;
    const request=async(url,method='GET',body)=>{const response=await fetch(base+url,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});assert.ok(response.ok);return response.json();};
    let p=await request('/projects','POST',{version:1,name:'Diagnostic test',format:'9:16',muteAll:false,scenes:[{
      id:randomUUID(),name:'Scene',type:'photo',instruction:'',frames:90,inFrame:0,fit:'contain',x:.5,y:.5,muted:false,volume:1,transition:'cut',overlap:0,
    }]});
    const uploaded=await fetch(base+`/projects/${p.id}/assets`,{method:'POST',headers:{'X-File-Name':'photo.png'},body:'synthetic-input'});assert.equal(uploaded.status,201);
    p.scenes[0].assetId=(await uploaded.json()).id;p=await request(`/projects/${p.id}`,'PUT',p);
    const job=await request(`/projects/${p.id}/jobs`,'POST',{});let saved;
    for(let i=0;i<200;i++){
      const status=await request(`/jobs/${job.id}`),health=await request('/health');
      if(status.state==='failed'&&!health.active)break;await new Promise(r=>setTimeout(r,10));
    }
    saved=JSON.parse(await readFile(path.join(root,'video','jobs',`${job.id}.json`),'utf8'));
    assert.equal(saved.state,'failed',logs);assert.ok(logs.includes('[VideoLab job failure]'));assert.ok(logs.includes(job.id));
    if(phase==='render'){
      assert.equal(saved.failure.stage,'rendering',JSON.stringify(saved.failure));assert.equal(saved.failure.reason,'non_zero_exit');
      assert.equal(saved.failure.processes[0].exitCode,9);assert.equal(saved.failure.processes[0].signal,null);
      assert.match(saved.error,/exitCode=9/);assert.match(logs,/ROOT CAUSE/);
      assert.equal(await readFile(saved.failure.processes[0].stderrFile,'utf8'),'ROOT CAUSE\n'+'warning\n'.repeat(5000));
    }else{
      assert.equal(saved.failure.stage,'finalizing');assert.equal(saved.failure.reason,'backend_exception');
      assert.deepEqual(saved.failure.processes.map(p=>p.exitCode),[0,0]);
      assert.match(saved.error,/validación/);assert.match(logs,/successful-render-stderr/);
    }
    assert.match(logs,/VideoLab stderr BEGIN/);assert.match(logs,/VideoLab stderr END/);
  }finally{process.stderr.write=originalWrite;if(server?.listening)await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});}
});
