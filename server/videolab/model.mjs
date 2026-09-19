export const formats = { '9:16': [1080,1920], '4:5': [1080,1350], '1:1': [1080,1080], '16:9': [1920,1080] };
export const idPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export function check(ok, message, status=400) { if (!ok) throw Object.assign(new Error(message), {status}); }
export function id(value) { check(typeof value==='string' && idPattern.test(value), 'Identificador inválido'); return value; }
export function number(value, min, max, label) { check(Number.isFinite(value) && value>=min && value<=max, `${label}: valor fuera de rango`); return value; }
export function integer(value,min,max,label) { number(value,min,max,label); check(Number.isInteger(value), `${label}: se requiere entero`); return value; }
export function text(value,max=200) { check(typeof value==='string' && value.length<=max, 'Texto inválido'); return value; }
export function validateProject(p, ready=false) {
  check(p?.version===1 && Object.hasOwn(formats,p.format), 'Versión/formato inválido');
  text(p.name); check(Array.isArray(p.scenes) && p.scenes.length>0 && p.scenes.length<=20,'Se requieren de 1 a 20 escenas');
  const seen=new Set(); let frames=0, previousOverlap=0;
  for (const [i,s] of p.scenes.entries()) {
    id(s.id); check(!seen.has(s.id),'Escena repetida'); seen.add(s.id);
    text(s.name); text(s.type); text(s.instruction,2000);
    integer(s.frames,1,1800,'Duración'); integer(s.inFrame,0,108000,'Inicio');
    check(['contain','cover'].includes(s.fit),'Encuadre inválido');
    number(s.x,0,1,'Posición X'); number(s.y,0,1,'Posición Y'); number(s.volume,0,1,'Volumen');
    check(typeof s.muted==='boolean','Mute inválido');
    check(['cut','dissolve'].includes(s.transition),'Transición inválida');
    integer(s.overlap,0,60,'Transición');
    check(s.transition==='dissolve' ? s.overlap>0 : s.overlap===0,'Duración de transición inválida');
    check(i<p.scenes.length-1 || s.overlap===0,'La última escena no tiene transición');
    check(previousOverlap+s.overlap<s.frames,'Las transiciones deben caber dentro de cada escena');
    frames+=s.frames-s.overlap; previousOverlap=s.overlap;
    if(s.assetId) id(s.assetId); else check(!ready,'Falta material en una escena');
  }
  check(frames<=1800,'El video no puede superar 60 segundos');
  check(typeof p.muteAll==='boolean','Mute global inválido');
  if(p.music) {
    id(p.music.assetId); integer(p.music.inFrame,0,108000,'Inicio musical'); integer(p.music.frames,1,1800,'Duración musical');
    integer(p.music.startFrame,0,1799,'Ubicación musical'); check(p.music.startFrame+p.music.frames<=frames,'La música excede el video');
    number(p.music.volume,0,1,'Volumen musical');
    integer(p.music.fadeIn,0,p.music.frames,'Fade in'); integer(p.music.fadeOut,0,p.music.frames,'Fade out');
    check(p.music.fadeIn+p.music.fadeOut<=p.music.frames,'Fades musicales demasiado largos');
  }
  return {frames, seconds:frames/30, size:formats[p.format]};
}
