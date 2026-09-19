export async function api<T>(url:string,method='GET',data?:unknown):Promise<T> {
  const response=await fetch('/api/videolab'+url,{method,headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined});
  // Temporary diagnostic: inspect a copy without consuming response.json().
  const text=await response.clone().text();
  console.log('[VideoLab API]', {
    requestedUrl: '/api/videolab'+url,
    responseUrl: response.url,
    status: response.status,
    contentType: response.headers.get('content-type'),
    body: text.slice(0, 500),
  });
  let value: unknown;
  try { value=await response.json(); }
  catch { throw new Error('VideoLab devolvió una respuesta que no es JSON válido. Actualizá para reintentar.'); }
  if(!response.ok) {
    const message=value && typeof value==='object' && 'error' in value && typeof value.error==='string' ? value.error : 'Falló la operación';
    throw new Error(message);
  }
  // Both callers of setProjects receive the same validated array contract.
  // A TypeScript assertion alone cannot validate a response at runtime.
  if(url==='/projects' && method==='GET' && (!Array.isArray(value) || !value.every(item =>
    item!==null && typeof item==='object' && typeof item.id==='string' && typeof item.name==='string'))) {
    throw new Error('VideoLab devolvió un listado de proyectos inesperado. Actualizá para reintentar.');
  }
  return value as T;
}
export function upload<T>(url:string,file:File,onProgress:(n:number)=>void):Promise<T> {
  return new Promise((resolve,reject)=>{
    const xhr=new XMLHttpRequest();xhr.open('POST','/api/videolab'+url);xhr.setRequestHeader('X-File-Name',encodeURIComponent(file.name));
    xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress(e.loaded/e.total);};
    xhr.onerror=()=>reject(new Error('Se interrumpió la conexión'));
    xhr.onload=()=>{try{const value=JSON.parse(xhr.responseText);if(xhr.status>=200&&xhr.status<300)resolve(value);else reject(new Error(value.error||'No se pudo importar'));}catch{reject(new Error('Respuesta inválida del servidor'));}};
    xhr.send(file);
  });
}
