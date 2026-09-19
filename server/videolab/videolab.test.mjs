import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { createVideoLab } from './server.mjs';
import { validateProject } from './model.mjs';
import { buildRender } from './ffmpeg.mjs';
import { createPlipServer } from '../plip-server.mjs';
import { jpegOrientation } from './exif.mjs';

const scene=(extra={})=>({id:randomUUID(),name:'Gancho',type:'gancho',instruction:'Mostrar producto',frames:90,inFrame:0,fit:'contain',x:.5,y:.5,muted:false,volume:1,transition:'cut',overlap:0,...extra});
const project=(scenes=[scene()])=>({version:1,name:'Video comercial',format:'9:16',muteAll:false,scenes});
const info={video:{index:0,width:1920,height:1080,start_time:'0',side_data_list:[{rotation:90}]},audio:{index:1,start_time:'0'},duration:10};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
test('timeline: corte, solapamiento y límite de 60 segundos',()=>{
  assert.equal(validateProject(project()).frames,90);
  const p=project([scene({frames:90,transition:'dissolve',overlap:15}),scene({frames:90})]);
  assert.equal(validateProject(p).frames,165);
  assert.throws(()=>validateProject(project([scene({frames:1800}),scene()])));
  assert.throws(()=>validateProject(project([scene({overlap:15,transition:'dissolve'})])));
  assert.throws(()=>validateProject(project([scene({assetId:'../../etc/passwd'})])));
  assert.throws(()=>validateProject({...project(),format:'4K'}));
});
test('FFmpeg usa argumentos, rotación, CFR, trim, dissolve, mezcla y mute global',()=>{
  const a=randomUUID(),b=randomUUID(),m=randomUUID();
  const p=project([scene({assetId:a,inFrame:30,transition:'dissolve',overlap:15}),scene({assetId:b,muted:true})]);
  p.music={assetId:m,inFrame:30,frames:120,startFrame:0,volume:.3,fadeIn:15,fadeOut:30};
  const assets=new Map([[a,{kind:'video',probe:info,path:'/data/a.mov'}],[b,{kind:'video',probe:info,path:'/data/b.mov'}],[m,{kind:'audio',probe:{audio:{index:0},duration:10},path:'/data/music.mp3'}]]);
  const {args,timeline}=buildRender(p,assets,'/data/result.mp4');const graph=args[args.indexOf('-filter_complex')+1];
  assert.equal(timeline.frames,165);assert.match(graph,/scale=1080:1920/);assert.match(graph,/xfade=transition=fade:duration=0.500000000:offset=2.500000000/);
  assert.match(graph,/amix=inputs=2/);assert.doesNotMatch(graph,/\[1:1\]/);assert.match(graph,/atrim=start_sample=48000/);
  assert.ok(args.includes('ultrafast'));assert.ok(args.includes('+faststart'));assert.ok(args.includes('-format_whitelist'));assert.equal(args.at(-1),'/data/result.mp4');
  p.muteAll=true;assert.match(buildRender(p,assets,'out').args.join(' '),/amix=inputs=1/);
});

test('orientación JPEG EXIF normaliza orientación y espejos sin alterar el original',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'plip-videolab-exif-'));
  try{
    const exif=Buffer.from('45786966000049492a0008000000010012010300010000000600000000000000','hex');
    const marker=Buffer.alloc(4);marker.writeUInt16BE(0xffe1);marker.writeUInt16BE(exif.length+2,2);
    const bytes=Buffer.concat([Buffer.from([255,216]),marker,exif,Buffer.from([255,217])]);const file=path.join(root,'photo.jpg');await writeFile(file,bytes);
    assert.equal(await jpegOrientation(file),6);assert.deepEqual(await readFile(file),bytes);
    const a=randomUUID(),p=project([scene({assetId:a})]);const args=buildRender(p,new Map([[a,{kind:'photo',path:file,probe:{...info,exifOrientation:6}}]]),'out').args;
    assert.ok(args.includes('-noautorotate'));assert.match(args.join(' '),/transpose=clock/);assert.match(args.join(' '),/scale=1080:1920/);
  }finally{await rm(root,{recursive:true,force:true});}
});

test('cola durable: un render, cancelación activa/en cola y recuperación tras reinicio',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'plip-videolab-queue-'));let server;let activeCount=0,maxCount=0,started=0;
  const data=path.join(root,'video'),musicRoot=path.join(root,'music');
  const run=async(binary,args,{signal})=>{
    activeCount++;started++;maxCount=Math.max(maxCount,activeCount);
    try{await new Promise((resolve,reject)=>{if(signal.aborted)return reject(new Error('cancel'));signal.addEventListener('abort',()=>reject(new Error('cancel')),{once:true});});}finally{activeCount--;}
  };
  try{
    server=await createVideoLab({root:data,musicRoot,probeMedia:async()=>info,runCommand:run});server.listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}/api/videolab`;
    const request=async(url,method='GET',value)=>{const r=await fetch(base+url,{method,headers:value?{'Content-Type':'application/json'}:undefined,body:value?JSON.stringify(value):undefined});assert.ok(r.ok,await r.clone().text());return r.json();};
    const projects=[];
    for(let i=0;i<3;i++){
      let p=await request('/projects','POST',project());const uploaded=await fetch(base+`/projects/${p.id}/assets`,{method:'POST',headers:{'X-File-Name':'clip.mov'},body:'mock-video'});assert.equal(uploaded.status,201);p.scenes[0].assetId=(await uploaded.json()).id;p=await request(`/projects/${p.id}`,'PUT',p);projects.push(p);
    }
    const first=await request(`/projects/${projects[0].id}/jobs`,'POST',{});
    for(let i=0;i<50&&started===0;i++)await wait(10);
    const second=await request(`/projects/${projects[1].id}/jobs`,'POST',{});
    const third=await request(`/projects/${projects[2].id}/jobs`,'POST',{});
    assert.equal((await request(`/jobs/${second.id}`)).state,'queued');
    await request(`/jobs/${second.id}/cancel`,'POST',{});assert.equal((await request(`/jobs/${second.id}`)).state,'cancelled');
    await request(`/jobs/${first.id}/cancel`,'POST',{});
    for(let i=0;i<50&&started<2;i++)await wait(10);
    assert.equal(started,2);assert.equal(maxCount,1);assert.equal((await request(`/jobs/${first.id}`)).state,'cancelled');
    await request(`/jobs/${third.id}/cancel`,'POST',{});
    for(let i=0;i<50&&activeCount;i++)await wait(10);await wait(30);
    await new Promise(r=>server.close(r));
    const interrupted={id:randomUUID(),state:'rendering',progress:.5,project:projects[0]};await writeFile(path.join(data,'jobs',interrupted.id+'.json'),JSON.stringify(interrupted));
    server=await createVideoLab({root:data,musicRoot,probeMedia:async()=>info,runCommand:run});server.listen(0,'127.0.0.1');await once(server,'listening');
    const recovered=await(await fetch(`http://127.0.0.1:${server.address().port}/api/videolab/jobs/${interrupted.id}`)).json();assert.equal(recovered.state,'failed');assert.match(recovered.error,/reinició/);
  }finally{if(server?.listening)await new Promise(r=>server.close(r));await rm(root,{recursive:true,force:true});}
});

test('API: persistencia, rangos, copias independientes, jobs seriales, recuperación y publicación',async()=>{
  const root=await mkdtemp(path.join(tmpdir(),'plip-videolab-test-'));let server,transfer;
  let concurrent=0,maxConcurrent=0,renders=0;
  const outputProbe={streams:[{codec_type:'video',codec_name:'h264',pix_fmt:'yuv420p',width:1080,height:1920,avg_frame_rate:'30/1',nb_read_frames:'90'},{codec_type:'audio',codec_name:'aac',sample_rate:'48000',channels:2}],format:{duration:'3'}};
  const run=async(binary,args,opts)=>{
    if(args.includes('-count_frames'))return JSON.stringify(outputProbe);
    concurrent++;renders++;maxConcurrent=Math.max(maxConcurrent,concurrent);
    try{await wait(60);if(opts.signal.aborted)throw new Error('cancelled');opts.onProgress('out_time_us=1500000\n');await writeFile(args.at(-1),'test-mp4');return '';}finally{concurrent--;}
  };
  try{
    transfer=await createPlipServer({storageDir:path.join(root,'transfer'),apiOnly:true});transfer.listen(0,'127.0.0.1');await once(transfer,'listening');const tb=`http://127.0.0.1:${transfer.address().port}`;
    const config={root:path.join(root,'video'),musicRoot:path.join(root,'music'),transferUrl:tb,probeMedia:async()=>info,runCommand:run};
    async function start(){server=await createVideoLab(config);server.listen(0,'127.0.0.1');await once(server,'listening');}
    await start();let base=`http://127.0.0.1:${server.address().port}/api/videolab`;
    async function req(url,method='GET',body){const r=await fetch(base+url,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json()};}
    const p=(await req('/projects','POST',project())).data;
    assert.equal(p.revision,1);assert.equal((await req('/projects')).data.length,1);
    const form=new FormData();form.append('file',new Blob(['original-bytes']),'Foto original.jpg');
    const source=await(await fetch(tb+'/api/transferencias',{method:'POST',body:form})).json();
    const imported=await req(`/projects/${p.id}/import`,'POST',{source:'transferencias',id:source.id});assert.equal(imported.status,201);
    await fetch(`${tb}/api/transferencias/${source.id}`,{method:'DELETE'});
    let media=await fetch(base+`/assets/${imported.data.id}`,{headers:{Range:'bytes=0-7'}});assert.equal(media.status,206);assert.equal(await media.text(),'original');
    assert.equal((await fetch(base+`/assets/${imported.data.id}`,{headers:{Range:'bytes=900-'}})).status,416);
    assert.match(media.headers.get('content-disposition'),/Foto%20original.jpg/);
    assert.equal((await req(`/projects/${p.id}/import`,'POST',{source:'transferencias',id:'../bad'})).status,400);
    const bad=await fetch(base+`/projects/${p.id}/assets`,{method:'POST',headers:{'X-File-Name':'..%2Fbad.mov'},body:'data'});assert.equal(bad.status,400);
    const musicResponse=await fetch(base+'/music',{method:'POST',headers:{'X-File-Name':'Musica.mp3'},body:'music-bytes'});assert.equal(musicResponse.status,201);const track=await musicResponse.json();
    const copy=(await req(`/projects/${p.id}/import`,'POST',{source:'music',id:track.id})).data;
    assert.equal((await req(`/music/${track.id}`,'DELETE')).status,200);assert.equal(await(await fetch(base+`/assets/${copy.id}`)).text(),'music-bytes');
    p.scenes[0].assetId=imported.data.id;const saved=await req(`/projects/${p.id}`,'PUT',p);assert.equal(saved.status,200);assert.equal((await req(`/projects/${p.id}`,'PUT',p)).status,409);
    const job=(await req(`/projects/${p.id}/jobs`,'POST',{})).data;
    let state;for(let i=0;i<100;i++){state=(await req(`/jobs/${job.id}`)).data;if(state.state==='completed')break;await wait(20);}assert.equal(state.state,'completed');assert.equal(maxConcurrent,1);
    assert.equal((await fetch(base+`/jobs/${job.id}/output?download=1`)).status,200);
    assert.equal((await req(`/jobs/${job.id}/publish`,'POST',{})).status,201);
    assert.equal((await(await fetch(tb+'/api/transferencias')).json()).length,1);
    await new Promise(r=>server.close(r));await start();base=`http://127.0.0.1:${server.address().port}/api/videolab`;
    assert.equal((await req(`/projects/${p.id}`)).data.revision,2);assert.equal((await req(`/jobs/${job.id}`)).data.state,'completed');assert.equal(renders,1);
    assert.equal(await readFile(path.join(root,'video','outputs',`${job.id}.mp4`),'utf8'),'test-mp4');
    await new Promise(r=>transfer.close(r));transfer=null;
    assert.equal((await req(`/jobs/${job.id}/publish`,'POST',{})).status,502);assert.equal((await fetch(base+`/jobs/${job.id}/output`)).status,200);
  }finally{if(server?.listening)await new Promise(r=>server.close(r));if(transfer?.listening)await new Promise(r=>transfer.close(r));await rm(root,{recursive:true,force:true});}
});
