import { useEffect, useRef, useState } from 'react';
import type { Asset, Project, Scene } from './types';
import { duration } from './types';

function Clip({scene,asset,time,start,playing,opacity,volume}:{scene:Scene;asset?:Asset;time:number;start:number;playing:boolean;opacity:number;volume:number}) {
  const ref=useRef<HTMLVideoElement>(null);
  const [error,setError]=useState(false);
  const synchronize=()=>{const v=ref.current;if(!v)return;const target=(time-start+scene.inFrame)/30;
    if(Number.isFinite(v.duration)&&Math.abs(v.currentTime-target)>.15)v.currentTime=Math.max(0,target);
    v.volume=Math.max(0,Math.min(1,volume));if(playing)void v.play().catch(()=>setError(true));else v.pause();
  };
  useEffect(synchronize,[time,start,scene.inFrame,playing,volume]);
  const style={width:'100%',height:'100%',objectFit:scene.fit,objectPosition:`${scene.x*100}% ${scene.y*100}%`} as const;
  return <div style={{position:'absolute',inset:0,opacity}}>{asset?.kind==='photo'?<img alt={scene.name} src={`/api/videolab/assets/${asset.id}`} style={style}/>:asset?<video ref={ref} src={`/api/videolab/assets/${asset.id}`} playsInline preload="auto" style={style} onLoadedMetadata={synchronize} onError={()=>setError(true)}/>:<p>{scene.name}: falta material</p>}{error&&<p className="absolute bottom-0 bg-black text-white p-2">El navegador no puede reproducir este original. El render final usa FFmpeg.</p>}</div>;
}
export default function Preview({project,assets}:{project:Project;assets:Asset[]}) {
  const [time,setTime]=useState(0),[playing,setPlaying]=useState(false);const audio=useRef<HTMLAudioElement>(null);
  const total=duration(project);let start=0;
  const entries=project.scenes.map((s,i)=>{const at=start;start+=s.frames-s.overlap;return {s,i,start:at};});
  useEffect(()=>{setPlaying(false);setTime(0);},[project]);
  useEffect(()=>{if(!playing)return;let raf=0,last=performance.now();const tick=(now:number)=>{const delta=(now-last)*.03;last=now;setTime(t=>{if(t+delta>=total){setPlaying(false);return 0;}return t+delta;});raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[playing,total]);
  useEffect(()=>{const a=audio.current,m=project.music;if(!a||!m)return;const local=time-m.startFrame;const enabled=local>=0&&local<m.frames;
    if(enabled&&Number.isFinite(a.duration)&&Math.abs(a.currentTime-(m.inFrame+local)/30)>.15)a.currentTime=(m.inFrame+local)/30;
    const fade=Math.min(m.fadeIn?local/m.fadeIn:1,m.fadeOut?(m.frames-local)/m.fadeOut:1,1);
    a.volume=Math.max(0,Math.min(1,m.volume*fade));if(playing&&enabled)void a.play().catch(()=>{});else a.pause();
  },[time,playing,project.music]);
  const ratio=project.format.replace(':',' / ');
  return <section className="vl-preview"><h3>Preview</h3><div className="vl-canvas" style={{aspectRatio:ratio}}>
    {entries.filter(e=>time>=e.start&&time<e.start+e.s.frames).map(e=>{
      const previous=entries[e.i-1]?.s.overlap||0;const local=time-e.start;
      const incoming=previous?Math.min(1,local/previous):1;
      const outgoing=e.s.overlap?Math.min(1,(e.s.frames-local)/e.s.overlap):1;
      return <Clip key={e.s.id} scene={e.s} asset={assets.find(a=>a.id===e.s.assetId)} time={time} start={e.start} playing={playing} opacity={incoming} volume={project.muteAll||e.s.muted?0:e.s.volume*Math.max(0,Math.min(incoming,outgoing))}/>;
    })}</div>
    {project.music&&<audio ref={audio} src={`/api/videolab/assets/${project.music.assetId}`} preload="auto"/>}
    <button onClick={()=>setPlaying(v=>!v)}>{playing?'Pausar':'Reproducir'}</button>
    <input aria-label="Posición de reproducción" type="range" min="0" max={Math.max(0,total-1)} value={time} onChange={e=>setTime(Number(e.target.value))}/><span>{(time/30).toFixed(1)} / {(total/30).toFixed(1)} s</span>
    <p className="text-sm">Preview del navegador. Verificá el MP4 final para comprobar sincronía y compatibilidad de los originales.</p>
  </section>;
}
