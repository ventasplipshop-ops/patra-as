import { mkdir, readFile, writeFile, rename, readdir, lstat, realpath, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { id, check } from './model.mjs';

export async function atomic(file,value) {
  const temp=`${file}.${randomUUID()}.tmp`;
  try { await writeFile(temp,JSON.stringify(value),{flag:'wx'}); await rename(temp,file); }
  finally { await rm(temp,{force:true}); }
}
export async function store(root) {
  check(path.isAbsolute(root),'El almacenamiento debe ser absoluto');
  await mkdir(root,{recursive:true}); root=await realpath(root);
  for(const area of ['projects','assets','cache','jobs','outputs','tmp']) {
    await mkdir(path.join(root,area),{recursive:true});
    check(!(await lstat(path.join(root,area))).isSymbolicLink(),'No se admiten enlaces en almacenamiento');
  }
  const file=(area,key,extension='json')=>path.join(root,area,`${id(key)}.${extension}`);
  async function read(area,key) {
    const target=file(area,key); check(!(await lstat(target)).isSymbolicLink(),'Enlace no permitido');
    return JSON.parse(await readFile(target,'utf8'));
  }
  async function list(area) {
    const values=[];
    for(const entry of await readdir(path.join(root,area))) {
      if(!entry.endsWith('.json')) continue;
      try { values.push(await read(area,entry.slice(0,-5))); } catch(error) { if(error.code!=='ENOENT') throw error; }
    }
    return values;
  }
  return {root,file,read,list,write:(area,key,value)=>atomic(file(area,key),value)};
}
