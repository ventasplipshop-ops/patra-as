import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const compiled=ts.transpileModule(await readFile(new URL('../../src/modules/videolab/api.ts',import.meta.url),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
}).outputText;
function client(body,status=200) {
  const context={exports:{},fetch:async url=>{assert.equal(url,'/api/videolab/projects');return new Response(body,{status});}};
  vm.runInNewContext(compiled,context);return context.exports.api;
}
test('projects: HTTP 200 [] mantiene array y permite map',async()=>{
  const projects=await client('[]')('/projects');assert.ok(Array.isArray(projects));assert.equal(projects.map(p=>p.id).length,0);
});
test('projects: respuestas inesperadas no llegan a setProjects',async()=>{
  for(const body of ['null','{}','{"data":[]}','{"projects":[]}','{"error":"fallo"}','[null]','[{"id":1,"name":"video"}]']) {
    await assert.rejects(client(body)('/projects'),/listado de proyectos inesperado/);
  }
});
test('projects: JSON inválido con HTTP 200 rechaza, sin fabricar un objeto exitoso',async()=>{
  for(const body of ['<html>PLIP</html>','{',''])await assert.rejects(client(body)('/projects'),/no es JSON válido/);
});
test('projects: conserva lista válida y propaga error HTTP',async()=>{
  const body='[{"id":"id-proyecto","name":"Mi video"}]';assert.equal(JSON.stringify(await client(body)('/projects')),body);
  await assert.rejects(client('{"error":"No disponible"}',503)('/projects'),/No disponible/);
});
