-- Numeración correlativa de documentos (por tipo y año) y domicilio del cliente para los PDF.
--   Resumen de cuenta   R-2026-0001
--   Comprobante de pago CP-2026-0001
--   Propuesta           P-2026-001 (ya existente; ahora también la asigna la base)

alter table public.clientes_admin add column if not exists domicilio text not null default '';

create table if not exists private.numeracion (
  tipo text not null, anio int not null, ultimo int not null default 0,
  primary key (tipo, anio)
);
revoke all on private.numeracion from public, anon, authenticated;

-- Siguiente número del tipo en el año (con bloqueo de fila: no hay duplicados aunque dos personas emitan a la vez).
create or replace function private.siguiente_numero(t text, a int, ancho int default 4) returns text
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  insert into private.numeracion (tipo, anio, ultimo) values (t, a, 1)
  on conflict (tipo, anio) do update set ultimo = private.numeracion.ultimo + 1
  returning ultimo into n;
  return t || '-' || a || '-' || lpad(n::text, ancho, '0');
end $$;
revoke execute on function private.siguiente_numero(text, int, int) from public, anon, authenticated;

/* ---------- resúmenes de cuenta ---------- */
alter table public.resumenes add column if not exists numero text;
create unique index if not exists resumenes_numero_uq on public.resumenes (numero) where numero is not null;

-- Los existentes, en orden de creación, dentro de su año.
do $$ declare r record; begin
  for r in select id, extract(year from created_at)::int a from public.resumenes where numero is null order by created_at, id loop
    update public.resumenes set numero = private.siguiente_numero('R', r.a) where id = r.id;
  end loop;
end $$;

create or replace function private.tg_resumen_numero() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.numero is null or new.numero = '' then new.numero := private.siguiente_numero('R', extract(year from now() at time zone 'America/Argentina/Cordoba')::int); end if;
  return new;
end $$;
drop trigger if exists resumenes_numero on public.resumenes;
create trigger resumenes_numero before insert on public.resumenes for each row execute function private.tg_resumen_numero();

/* ---------- comprobantes de pago (sueldos, honorarios, proveedores) ---------- */
create table if not exists public.comprobantes_pago (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  periodo date not null,
  numero text not null unique,
  created_at timestamptz not null default now(),
  unique (colaborador_id, periodo)
);
alter table public.comprobantes_pago enable row level security;
drop policy if exists comprobantes_pago_admin on public.comprobantes_pago;
create policy comprobantes_pago_admin on public.comprobantes_pago for all to authenticated using (public.es_admin()) with check (public.es_admin());
revoke all on public.comprobantes_pago from anon;

-- Devuelve el número del comprobante de esa persona y ese mes; lo crea la primera vez.
create or replace function public.numero_comprobante_pago(cid uuid, per date) returns text
language plpgsql security definer set search_path = public as $$
declare n text; p date := date_trunc('month', per)::date;
begin
  if not public.es_admin() then raise exception 'Solo administradores'; end if;
  select numero into n from public.comprobantes_pago where colaborador_id = cid and periodo = p;
  if n is not null then return n; end if;
  insert into public.comprobantes_pago (colaborador_id, periodo, numero)
  values (cid, p, private.siguiente_numero('CP', extract(year from now() at time zone 'America/Argentina/Cordoba')::int))
  on conflict (colaborador_id, periodo) do nothing;
  select numero into n from public.comprobantes_pago where colaborador_id = cid and periodo = p;
  return n;
end $$;
revoke execute on function public.numero_comprobante_pago(uuid, date) from public, anon;
grant execute on function public.numero_comprobante_pago(uuid, date) to authenticated;

/* ---------- propuestas ---------- */
-- Arranca después de la más alta que ya exista en cada año.
insert into private.numeracion (tipo, anio, ultimo)
select 'P', split_part(numero, '-', 2)::int, max(split_part(numero, '-', 3)::int)
from public.propuestas where numero ~ '^P-\d{4}-\d+$' group by 2
on conflict (tipo, anio) do update set ultimo = greatest(private.numeracion.ultimo, excluded.ultimo);

create or replace function private.tg_propuesta_numero() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.numero is null or new.numero = '' then new.numero := private.siguiente_numero('P', extract(year from now() at time zone 'America/Argentina/Cordoba')::int, 3); end if;
  return new;
end $$;
drop trigger if exists propuestas_numero on public.propuestas;
create trigger propuestas_numero before insert or update of numero on public.propuestas for each row execute function private.tg_propuesta_numero();
