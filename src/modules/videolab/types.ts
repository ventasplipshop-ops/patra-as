export type Scene = {id:string; name:string; type:string; instruction:string; suggestedFrames?:number; frames:number; assetId?:string; inFrame:number; fit:'contain'|'cover'; x:number; y:number; muted:boolean; volume:number; transition:'cut'|'dissolve'; overlap:number};
export type Music = {assetId:string; inFrame:number; frames:number; startFrame:number; volume:number; fadeIn:number; fadeOut:number};
export type Project = {version:1; id:string; revision:number; name:string; format:'9:16'|'4:5'|'1:1'|'16:9'; muteAll:boolean; scenes:Scene[]; music?:Music; guionId?:string; updatedAt?:string};
export type Asset = {id:string; name:string; type:string; kind:'photo'|'video'|'audio'; probe:{duration:number}; size:number};
export type Job = {id:string; state:string; progress:number; error?:string; createdAt:string};
export type Guion = {id:string; nombre:string; descripcion:string; objetivo:string; escenas:unknown; musica_sugerida:string; activo:boolean};
export const visualTypes=['image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm'];
export const scene = (name='Nueva escena'):Scene=>({id:crypto.randomUUID(),name,type:'contenido',instruction:'',suggestedFrames:90,frames:90,inFrame:0,fit:'contain',x:.5,y:.5,muted:false,volume:1,transition:'cut',overlap:0});
export function duration(p:Project) {return p.scenes.reduce((n,s)=>n+s.frames-s.overlap,0);}
export function fromGuion(g:Guion):Project {
  if(!g.nombre.trim())throw new Error('El Guion necesita un nombre.');
  if(!Array.isArray(g.escenas)||!g.escenas.length||g.escenas.length>20)throw new Error('El Guion necesita entre 1 y 20 escenas.');
  const ordered=[...g.escenas].sort((a,b)=>Number(a?.orden||0)-Number(b?.orden||0));
  const scenes=ordered.map((raw:unknown)=>{
    if(!raw||typeof raw!=='object')throw new Error('Escena inválida en el Guion');
    const s=raw as Record<string,unknown>;
    const seconds=Number(s.duracion_sugerida??s.duracion??s.duracion_segundos);
    if(!Number.isFinite(seconds)||seconds<1/30||seconds>60)throw new Error('Cada escena requiere duración numérica en segundos, entre 1/30 y 60.');
    if(typeof s.nombre!=='string'||!s.nombre.trim())throw new Error('Cada escena necesita un nombre.');
    return {...scene(String(s.nombre??'')),type:String(s.tipo??'contenido'),instruction:String(s.instruccion_comercial??s.instruccion??''),suggestedFrames:Math.round(seconds*30),frames:Math.round(seconds*30)};
  });
  if(scenes.reduce((n,s)=>n+s.frames,0)>1800)throw new Error('Las duraciones sugeridas del Guion superan los 60 segundos de VideoLab V1.');
  return {version:1,id:'',revision:0,name:g.nombre,format:'9:16',muteAll:false,guionId:g.id,scenes};
}
