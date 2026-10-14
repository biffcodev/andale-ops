-- Mueve los helpers de RLS a un schema no expuesto por la API (PostgREST solo expone public).
-- Las policies y el trigger referencian las funciones por OID, así que siguen funcionando.
-- Solo yo() queda en public, callable por usuarios logueados (devuelve la propia persona).
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.mi_persona() set schema private;
alter function public.mi_rol() set schema private;
alter function public.mis_proyectos() set schema private;
alter function public.mis_abonos() set schema private;
alter function public.mis_clientes() set schema private;
alter function public.proyectos_guard() set schema private;

create or replace function private.mi_persona() returns uuid language sql stable security definer set search_path = public as $$
  select id from public.personas where activo and email is not null and lower(email) = lower(auth.jwt() ->> 'email') limit 1
$$;
create or replace function private.mi_rol() returns rol_t language sql stable security definer set search_path = public as $$
  select rol from public.personas where id = private.mi_persona()
$$;
create or replace function private.mis_proyectos() returns setof uuid language sql stable security definer set search_path = public as $$
  select proyecto_id from public.proyecto_responsables where persona_id = private.mi_persona()
$$;
create or replace function private.mis_abonos() returns setof uuid language sql stable security definer set search_path = public as $$
  select abono_id from public.abono_responsables where persona_id = private.mi_persona()
$$;
create or replace function private.mis_clientes() returns setof uuid language sql stable security definer set search_path = public as $$
  select cliente_id from public.proyectos where id in (select private.mis_proyectos())
  union select cliente_id from public.abonos where id in (select private.mis_abonos())
  union select cliente_id from public.cliente_responsables where persona_id = private.mi_persona()
$$;
create or replace function private.proyectos_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.es_staff() and new.cliente_id <> old.cliente_id then
    raise exception 'Solo el equipo puede cambiar el cliente de un proyecto';
  end if;
  return new;
end $$;

create or replace function public.es_admin() returns boolean language sql stable set search_path = public as $$ select coalesce(private.mi_rol() = 'admin', false) $$;
create or replace function public.es_staff() returns boolean language sql stable set search_path = public as $$ select coalesce(private.mi_rol() in ('admin','equipo'), false) $$;
create or replace function public.es_miembro() returns boolean language sql stable set search_path = public as $$ select private.mi_persona() is not null $$;
create or replace function public.yo() returns table(id uuid, alias text, nombre text, rol rol_t) language sql stable security definer set search_path = public as $$
  select id, alias, nombre, rol from public.personas where id = private.mi_persona()
$$;

revoke execute on all functions in schema public from public, anon;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
grant execute on function public.es_admin(), public.es_staff(), public.es_miembro(), public.yo() to authenticated;
alter default privileges in schema public revoke execute on functions from public, anon;
alter default privileges in schema private revoke execute on functions from public, anon;
