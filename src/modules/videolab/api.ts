export async function api<T>(url:string,method='GET',data?:unknown):Promise<T> {
  const response=await fetch('/api/videolab'+url,{method,headers:data?{'Content-Type':'application/json'}:undefined,body:data?JSON.stringify(data):undefined});
  const value=await response.json().catch(()=>({error:'VideoLab no está disponible en este servidor.'}));
  if(!response.ok)throw new Error(value.error||'Falló la operación');return value as T;
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
