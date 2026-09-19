import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { finished } from 'node:stream/promises';
import { check, validateProject } from './model.mjs';
const demuxers='image2,jpeg_pipe,png_pipe,webp_pipe,mov,matroska,webm,mp3,wav,ogg,flac';
import { orientationFilters } from './exif.mjs';

export function command(binary,args,{signal,onProgress,timeout=120000,maxOutput=2000000,stderrFile,onDiagnostic}={}) {
  return new Promise((resolve,reject)=>{
    const errorInfo=e=>({name:e.name,message:e.message,code:e.code??null,syscall:e.syscall??null});
    let child;
    try {child=spawn(binary,args,{shell:false,windowsHide:true,stdio:['ignore','pipe','pipe']});}
    catch(error) {
      const diagnostic={binary,exitCode:null,signal:null,processError:errorInfo(error),reason:'spawn_throw',
        stderrFile:stderrFile??null,stderrBytes:0,stderrLogError:null,stderrHead:'',stderrTail:''};
      onDiagnostic?.(diagnostic);reject(Object.assign(error,{processDiagnostic:diagnostic}));return;
    }
    let out='',head='',tail='',stderrBytes=0,failure,reason,processError=null,stderrLogError=null; let killer;
    // Stream the complete stderr to disk with backpressure; only excerpts live in RAM.
    const log=stderrFile?createWriteStream(stderrFile):null;
    const logDone=log?finished(log).catch(e=>{stderrLogError=errorInfo(e);child.stderr.unpipe(log);child.stderr.resume();}):Promise.resolve();
    if(log)child.stderr.pipe(log);
    const stop=()=>{ child.kill('SIGTERM'); killer=setTimeout(()=>child.kill('SIGKILL'),3000); };
    const abort=()=>{failure=new Error('Trabajo cancelado');reason='cancelled'; stop();};
    signal?.addEventListener('abort',abort,{once:true}); if(signal?.aborted) abort();
    const timer=setTimeout(()=>{failure=new Error('Se agotó el tiempo permitido');reason='timeout';stop();},timeout);
    child.stdout.on('data',b=>{out+=b; onProgress?.(b.toString()); if(out.length>maxOutput){failure=new Error('Salida excesiva del proceso');reason='stdout_limit';stop();}});
    child.stderr.on('data',b=>{stderrBytes+=b.length;const text=b.toString();head=(head+text).slice(0,4000);tail=(tail+text).slice(-4000);});
    // close follows error and waits for stdio closure, preserving the final diagnostics.
    child.on('error',e=>{processError=errorInfo(e);clearTimeout(timer);clearTimeout(killer);signal?.removeEventListener('abort',abort);});
    child.on('close',async(code,exitSignal)=>{
      clearTimeout(timer);clearTimeout(killer);signal?.removeEventListener('abort',abort);
      await logDone;
      const diagnostic={binary,exitCode:code,signal:exitSignal??null,processError,
        reason:reason||(processError?'process_error':code!==0?(exitSignal?'signal':'non_zero_exit'):'completed'),
        stderrFile:stderrFile??null,stderrBytes,stderrLogError,stderrHead:head,stderrTail:tail};
      onDiagnostic?.(diagnostic);
      if(failure || processError || code!==0) {
        const detail=failure?.message||processError?.message||'El proceso terminó sin éxito';
        reject(Object.assign(new Error(`${detail} (reason=${diagnostic.reason}, exitCode=${code}, signal=${exitSignal??'none'})`),{processDiagnostic:diagnostic}));
      } else resolve(out);
    });
  });
}
export async function probe(file,signal) {
  const raw=JSON.parse(await command(process.env.FFPROBE || 'ffprobe',['-v','error','-threads','1','-protocol_whitelist','file,pipe','-format_whitelist',demuxers,'-show_streams','-show_format','-of','json',file],{signal}));
  const video=raw.streams.find(s=>s.codec_type==='video'&&!s.disposition?.attached_pic);
  const audio=raw.streams.find(s=>s.codec_type==='audio');
  check(video||audio,'Archivo sin medios reconocibles');
  if(video) {
    check(!['smpte2084','arib-std-b67'].includes(video.color_transfer) && video.color_primaries!=='bt2020' && !/mastering display|dovi|dolby vision|content light level/i.test(JSON.stringify(video)), 'HDR/BT.2020 no admitido en VideoLab V1');
    check(video.width*video.height<=50000000,'Imagen demasiado grande');
  }
  return {video,audio,duration:Number(raw.format.duration)||Number(video?.duration)||0};
}
const sec=f=>(f/30).toFixed(9);
export function buildRender(project,assets,output) {
  const timeline=validateProject(project,true), [w,h]=timeline.size;
  const args=['-hide_banner','-nostdin','-n','-filter_complex_threads','1']; const filters=[],audios=[];
  let elapsed=0, previous=0;
  const items=[...project.scenes,...(project.music?[project.music]:[])];
  items.forEach((item,i)=>{
    const a=assets.get(item.assetId); check(a,'Asset inexistente');
    if(a.kind==='photo') args.push('-loop','1','-framerate','30','-noautorotate');
    args.push('-threads','1','-protocol_whitelist','file,pipe','-format_whitelist',demuxers,'-i',a.path);
    const isMusic=i===project.scenes.length;
    check(isMusic ? a.kind==='audio' : ['video','photo'].includes(a.kind),'Tipo de asset incompatible');
    if(a.kind!=='photo') check((item.inFrame+item.frames)/30<=a.probe.duration+1/30,'Recorte fuera del archivo original');
    const start=isMusic?item.startFrame:elapsed-previous;
    if(!isMusic) {
      const v=a.probe.video; check(v,'Sin pista visual');
      let iw=v.width, ih=v.height;
      const [sa,sb]=(v.sample_aspect_ratio||'1:1').split(':').map(Number); iw*=sa&&sb?sa/sb:1;
      const orientation=a.kind==='photo'?(a.probe.exifOrientation||1):1;
      const rotation=a.kind==='photo'?0:Number(v.side_data_list?.find(d=>'rotation'in d)?.rotation || v.tags?.rotate || 0);
      check(Math.abs(rotation/90-Math.round(rotation/90))<0.001,'Rotación no ortogonal no admitida');
      if(Math.abs(Math.round(rotation/90))%2 || orientation>=5) [iw,ih]=[ih,iw];
      const factor=(item.fit==='contain'?Math.min:Math.max)(w/iw,h/ih);
      const sw=Math.ceil(iw*factor/2)*2,sh=Math.ceil(ih*factor/2)*2;
      const pw=Math.max(w,sw),ph=Math.max(h,sh),even=n=>Math.floor(n/2)*2;
      filters.push(`[${i}:${v.index}]${orientationFilters[orientation]}setpts=PTS-STARTPTS,trim=start=${sec(item.inFrame)}:duration=${sec(item.frames)},setpts=PTS-STARTPTS,fps=30,tpad=stop_mode=clone:stop_duration=1,trim=end_frame=${item.frames},settb=1/30,scale=${sw}:${sh}:flags=lanczos,setsar=1,pad=${pw}:${ph}:${even((pw-sw)*item.x)}:${even((ph-sh)*item.y)}:color=black,crop=${w}:${h}:${even((pw-w)*item.x)}:${even((ph-h)*item.y)},format=yuv420p[v${i}]`);
      if(i) {
        filters.push(`[join${i-1}][v${i}]${previous?`xfade=transition=fade:duration=${sec(previous)}:offset=${sec(start)}`:'concat=n=2:v=1:a=0'},fps=30,settb=1/30,trim=end_frame=${start+item.frames}[join${i}]`);
      } else filters.push('[v0]null[join0]');
    }
    if(a.probe.audio && (isMusic || (!project.muteAll&&!item.muted))) {
      const origin=Number((isMusic?a.probe.audio:a.probe.video)?.start_time||0);
      const fadeIn=isMusic?item.fadeIn:previous,fadeOut=isMusic?item.fadeOut:item.overlap;
      let chain=`[${i}:${a.probe.audio.index}]asetpts=PTS-(${origin})/TB,aresample=48000:async=1:first_pts=0,aformat=sample_fmts=fltp:channel_layouts=stereo,atrim=start_sample=${item.inFrame*1600}:end_sample=${(item.inFrame+item.frames)*1600},asetpts=N/SR/TB,apad,atrim=end_sample=${item.frames*1600},volume=${item.volume}`;
      if(fadeIn) chain+=`,afade=t=in:st=0:d=${sec(fadeIn)}`;
      if(fadeOut) chain+=`,afade=t=out:st=${sec(item.frames-fadeOut)}:d=${sec(fadeOut)}`;
      filters.push(chain+`,adelay=${start*1600}S:all=1[a${i}]`); audios.push(`[a${i}]`);
    }
    if(!isMusic){elapsed=start+item.frames;previous=item.overlap;}
  });
  filters.push(audios.length?`${audios.join('')}amix=inputs=${audios.length}:duration=longest:normalize=0,apad,atrim=end_sample=${timeline.frames*1600},asetpts=N/SR/TB[aout]`:`anullsrc=r=48000:cl=stereo,atrim=end_sample=${timeline.frames*1600}[aout]`);
  args.push('-filter_complex',filters.join(';'),'-map',`[join${project.scenes.length-1}]`,'-map','[aout]','-c:v','libx264','-preset','ultrafast','-crf','21','-pix_fmt','yuv420p','-threads','1','-r','30','-fps_mode','cfr','-t',sec(timeline.frames),'-c:a','aac','-b:a','192k','-ar','48000','-ac','2','-movflags','+faststart','-map_metadata','-1','-metadata:s:v:0','rotate=0','-progress','pipe:1','-nostats',output);
  return {args,timeline};
}
