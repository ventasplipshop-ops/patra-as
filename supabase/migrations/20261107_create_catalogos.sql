-- PROPUESTA NO EJECUTADA.
-- Catálogos compartidos para la arquitectura actual de PLIPSHOP.
-- Las imágenes permanecen físicamente en Transferencias; Supabase conserva referencias.

begin;

create table if not exists public.catalogos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (length(trim(nombre)) > 0),
  estado text not null default 'borrador'
    check (estado in ('borrador', 'activo', 'archivado')),
  cta text not null default '¡Hacé tu pedido por WhatsApp!',
  vigencia text not null default '',
  promociones jsonb not null default '[]'::jsonb
    check (jsonb_typeof(promociones) = 'array'),
  contact_config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(contact_config) = 'object'),
  visual_config jsonb not null default '{}'::jsonb
    check (jsonb_typeof(visual_config) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.catalogo_productos (
  catalogo_id uuid not null references public.catalogos(id) on delete cascade,
  product_id text not null check (length(trim(product_id)) > 0),
  posicion integer not null check (posicion >= 0),
  categoria text,
  primary key (catalogo_id, product_id),
  unique (catalogo_id, posicion)
);

create index if not exists catalogos_updated_at_idx
  on public.catalogos(updated_at desc);
create index if not exists catalogo_productos_catalogo_posicion_idx
  on public.catalogo_productos(catalogo_id, posicion);

create or replace function public.touch_catalogos_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists catalogos_touch_updated_at on public.catalogos;
create trigger catalogos_touch_updated_at
before update on public.catalogos
for each row execute function public.touch_catalogos_updated_at();

create or replace function public.guardar_catalogo(
  p_catalogo_id uuid,
  p_nombre text,
  p_estado text,
  p_cta text,
  p_vigencia text,
  p_promociones jsonb,
  p_contact_config jsonb,
  p_visual_config jsonb,
  p_productos jsonb
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_id uuid;
  v_promociones jsonb;
begin
  if coalesce(trim(p_nombre), '') = '' then
    raise exception using errcode = '23514', message = 'El catálogo debe tener nombre.';
  end if;
  if p_estado not in ('borrador', 'activo', 'archivado') then
    raise exception using errcode = '23514', message = 'Estado de catálogo inválido.';
  end if;
  if jsonb_typeof(coalesce(p_promociones, '[]'::jsonb)) <> 'array'
    or jsonb_typeof(coalesce(p_contact_config, '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_visual_config, '{}'::jsonb)) <> 'object'
    or jsonb_typeof(coalesce(p_productos, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = '22023', message = 'Configuración JSON inválida.';
  end if;

  -- Los binarios nunca se guardan en Supabase. Se conservan imageTransferId,
  -- imageName e imageType para recuperar el original desde Transferencias.
  select coalesce(jsonb_agg(clean_item order by ordinal), '[]'::jsonb)
  into v_promociones
  from (
    select value - 'imageData' - 'imageWidth' - 'imageHeight' as clean_item,
      ordinality as ordinal
    from jsonb_array_elements(coalesce(p_promociones, '[]'::jsonb)) with ordinality
  ) sanitized;

  if exists (
    select 1
    from jsonb_array_elements(v_promociones) promotion
    where coalesce(promotion->>'imageTransferId', '') <> ''
      and (promotion->>'imageTransferId') !~*
        '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ) then
    raise exception using errcode = '22023',
      message = 'Referencia de imagen de Transferencias inválida.';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_productos, '[]'::jsonb)) item
    where coalesce(trim(item->>'product_id'), '') = ''
      or coalesce(item->>'posicion', '') !~ '^\d+$'
  ) then
    raise exception using errcode = '22023', message = 'Lista de productos inválida.';
  end if;

  if p_catalogo_id is null then
    insert into public.catalogos(
      nombre, estado, cta, vigencia, promociones, contact_config, visual_config
    ) values (
      trim(p_nombre), p_estado, coalesce(p_cta, ''), coalesce(p_vigencia, ''),
      v_promociones, coalesce(p_contact_config, '{}'::jsonb),
      coalesce(p_visual_config, '{}'::jsonb)
    ) returning id into v_id;
  else
    update public.catalogos set
      nombre = trim(p_nombre),
      estado = p_estado,
      cta = coalesce(p_cta, ''),
      vigencia = coalesce(p_vigencia, ''),
      promociones = v_promociones,
      contact_config = coalesce(p_contact_config, '{}'::jsonb),
      visual_config = coalesce(p_visual_config, '{}'::jsonb)
    where id = p_catalogo_id
    returning id into v_id;

    if v_id is null then
      raise exception using errcode = 'P0002', message = 'El catálogo no existe.';
    end if;
    delete from public.catalogo_productos where catalogo_id = v_id;
  end if;

  insert into public.catalogo_productos(catalogo_id, product_id, posicion, categoria)
  select
    v_id,
    trim(item->>'product_id'),
    (item->>'posicion')::integer,
    nullif(item->>'categoria', '')
  from jsonb_array_elements(coalesce(p_productos, '[]'::jsonb)) item;

  return v_id;
end;
$$;

-- Arquitectura compartida actual: el cliente usa la clave anon de Supabase.
-- Puede leer catálogos; toda escritura se concentra en guardar_catalogo.
revoke all on table public.catalogos from anon, authenticated;
revoke all on table public.catalogo_productos from anon, authenticated;
grant select on table public.catalogos to anon, authenticated;
grant select on table public.catalogo_productos to anon, authenticated;

revoke all on function public.guardar_catalogo(
  uuid,text,text,text,text,jsonb,jsonb,jsonb,jsonb
) from public;
grant execute on function public.guardar_catalogo(
  uuid,text,text,text,text,jsonb,jsonb,jsonb,jsonb
) to anon, authenticated;

commit;
