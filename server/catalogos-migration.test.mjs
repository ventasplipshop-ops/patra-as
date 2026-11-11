import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const migrationUrl = new URL('../supabase/migrations/20261107_create_catalogos.sql', import.meta.url);

test('la migración de Catálogos es compartida y no depende de usuarios o Supabase Auth', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /create table if not exists public\.catalogos/i);
  assert.match(sql, /create table if not exists public\.catalogo_productos/i);
  assert.match(sql, /create or replace function public\.guardar_catalogo/i);
  assert.doesNotMatch(sql, /catalogo_auth_map|catalogo_owner_id|auth\.users|auth\.uid|created_by|row level security|create policy/i);
});

test('Supabase guarda referencias de Transferencias, no imágenes rasterizadas', async () => {
  const sql = await readFile(migrationUrl, 'utf8');
  assert.match(sql, /imageTransferId/);
  assert.match(sql, /value - 'imageData' - 'imageWidth' - 'imageHeight'/);
  assert.match(sql, /grant select on table public\.catalogos to anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.guardar_catalogo[\s\S]*to anon, authenticated/i);
});
