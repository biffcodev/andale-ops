-- 0023 · Aumentos por lote (sueldos y proveedores)
-- Cada tanda de aumentos queda como un "lote": desde qué mes, cómo (porcentaje, suma o monto nuevo), redondeo, motivo y quién lo aplicó.
-- Los montos siguen en remuneraciones (una fila por cambio, con "desde"); el lote agrega su fila nueva y el monto anterior queda
-- cerrado solo (su "hasta" es el día antes del nuevo). Los meses pasados siguen usando lo que regía en ese mes.
-- Un lote se puede editar o deshacer mientras su mes no empezó; desde el 1° de ese mes la base no deja tocarlo.

create table if not exists public.lotes_aumento (
  id uuid primary key default gen_random_uuid(),
  ambito text not null check (ambito in ('sueldos', 'proveedores')),
  desde date not null,
  modo text not null check (modo in ('porcentaje', 'suma', 'monto')),
  valor numeric not null,
  redondeo int not null default 0 check (redondeo in (0, 100, 1000)),
  motivo text not null default '',
  creado_por uuid references public.personas(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists lotes_aumento_desde_idx on public.lotes_aumento (ambito, desde desc);

alter table public.remuneraciones add column if not exists lote_id uuid references public.lotes_aumento(id) on delete cascade;
alter table public.remuneraciones add column if not exists monto_anterior numeric;
alter table public.remuneraciones add column if not exists pct numeric;
create index if not exists remuneraciones_lote_idx on public.remuneraciones (lote_id) where lote_id is not null;

-- Solo administradores (igual que sueldos)
alter table public.lotes_aumento enable row level security;
drop policy if exists lotes_aumento_admin on public.lotes_aumento;
create policy lotes_aumento_admin on public.lotes_aumento for all to authenticated using (public.es_admin()) with check (public.es_admin());
grant select, insert, update, delete on public.lotes_aumento to authenticated;

-- Vigencia de cada monto (desde / hasta), para reportes
create or replace view public.remuneraciones_vigencia with (security_invoker = true) as
select r.*, (lead(r.desde) over (partition by r.colaborador_id, r.concepto order by r.desde) - 1) as hasta
from public.remuneraciones r;
grant select on public.remuneraciones_vigencia to authenticated;

-- Candado: lo que ya empezó a regir no se toca (se corrige con otro lote)
create or replace function private.mes_actual() returns date language sql stable as $$
  select date_trunc('month', now() at time zone 'America/Argentina/Cordoba')::date
$$;

create or replace function private.lote_fijo() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('andale.restaurando', true), '') = '1' then return case when tg_op = 'DELETE' then old else new end; end if;
  if old.desde <= private.mes_actual() then
    raise exception 'Este lote ya rige desde %: no se puede cambiar ni deshacer. Corregilo con otro lote.', to_char(old.desde, 'MM/YYYY');
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists lotes_aumento_fijo on public.lotes_aumento;
create trigger lotes_aumento_fijo before update or delete on public.lotes_aumento for each row execute function private.lote_fijo();

create or replace function private.remuneracion_fija() returns trigger language plpgsql as $$
begin
  if coalesce(current_setting('andale.restaurando', true), '') = '1' then return case when tg_op = 'DELETE' then old else new end; end if;
  if old.lote_id is not null and old.desde <= private.mes_actual()
     and exists (select 1 from public.lotes_aumento l where l.id = old.lote_id)          -- si se borra el lote (permitido), se van sus filas
     and exists (select 1 from public.colaboradores c where c.id = old.colaborador_id)   -- si se borra la persona, también
  then
    raise exception 'Este monto viene de un lote que ya rige desde %: corregilo con otro lote.', to_char(old.desde, 'MM/YYYY');
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end $$;
drop trigger if exists remuneraciones_fija on public.remuneraciones;
create trigger remuneraciones_fija before update or delete on public.remuneraciones for each row execute function private.remuneracion_fija();

grant execute on all functions in schema private to authenticated;
do $$ begin
  alter publication supabase_realtime add table public.lotes_aumento;
exception when others then null; end $$;
