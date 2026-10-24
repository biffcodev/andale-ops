-- 0053 · Superadmin y zona de peligro del cliente
-- Superadmin: control total sobre todo (cuenta como admin en todos los permisos) y es el único que puede:
--   · borrar la marca de un cliente (kit, archivos, manual y ficha de voz; el cliente sigue),
--   · borrar un cliente entero con todo lo suyo,
--   · nombrar o quitar otros superadmins.
-- Arranca con Fer como superadmin. Siempre tiene que quedar al menos uno. Se puede correr más de una vez.

alter table public.personas add column if not exists superadmin boolean not null default false;
update public.personas set superadmin = true where id = 'df812bbf-be65-4832-a413-e92a1ef9863a';

create or replace function public.es_superadmin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select superadmin from public.personas where id = private.mi_persona()), false)
$$;
grant execute on function public.es_superadmin() to authenticated;

-- El superadmin cuenta como admin (y como equipo) en todos los permisos de la base
create or replace function public.es_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.mi_rol() = 'admin', false) or public.es_superadmin()
$$;
create or replace function public.es_staff() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(private.mi_rol() in ('admin', 'equipo'), false) or public.es_superadmin()
$$;

-- Solo un superadmin puede dar o sacar el superadmin, y siempre queda al menos uno
create or replace function private.tg_personas_superadmin() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.superadmin and not public.es_superadmin() then raise exception 'Solo un superadmin puede nombrar otro superadmin'; end if;
    return new;
  end if;
  if new.superadmin is distinct from old.superadmin then
    if not public.es_superadmin() and current_user not in ('postgres', 'service_role', 'supabase_admin') then raise exception 'Solo un superadmin puede cambiar quién es superadmin'; end if;
    if old.superadmin and not new.superadmin and not exists (select 1 from public.personas where superadmin and activo and id <> old.id) then raise exception 'Tiene que quedar al menos un superadmin'; end if;
  end if;
  if old.superadmin and not new.activo and old.activo and not exists (select 1 from public.personas where superadmin and activo and id <> old.id) then raise exception 'No se puede desactivar al único superadmin'; end if;
  return new;
end $$;
drop trigger if exists personas_superadmin on public.personas;
create trigger personas_superadmin before insert or update on public.personas for each row execute function private.tg_personas_superadmin();

create or replace function public.set_superadmin(p_persona uuid, p_valor boolean) returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.es_superadmin() then raise exception 'Solo un superadmin puede hacer esto'; end if;
  update public.personas set superadmin = coalesce(p_valor, false) where id = p_persona;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.set_superadmin(uuid, boolean) from public, anon;
grant execute on function public.set_superadmin(uuid, boolean) to authenticated;

-- Borrar la marca: vacía el kit, el manual y la ficha de voz. Devuelve los archivos guardados para borrarlos del storage.
create or replace function public.borrar_marca(p_cliente uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare arch jsonb;
begin
  if not public.es_superadmin() then raise exception 'Solo un superadmin puede borrar la marca de un cliente'; end if;
  select coalesce(jsonb_agg(name), '[]'::jsonb) into arch from storage.objects where bucket_id = 'marcas' and name like 'clientes/' || p_cliente || '/%';
  update public.clientes set marca = '{}'::jsonb where id = p_cliente;
  if not found then raise exception 'Ese cliente no existe'; end if;
  return jsonb_build_object('ok', true, 'marcas', arch);
end $$;
revoke execute on function public.borrar_marca(uuid) from public, anon;
grant execute on function public.borrar_marca(uuid) to authenticated;

-- Borrar el cliente entero: proyectos, tareas, redes, piezas, entregas, pedidos, contactos, conversaciones, abonos,
-- horas y seguimiento (todo eso se borra en cascada). Las facturas emitidas frenan el borrado salvo que se pida
-- borrarlas también (no anula nada en ARCA). Los mails, propuestas, briefs y movimientos quedan, sin el cliente.
create or replace function public.borrar_cliente(p_cliente uuid, p_con_facturas boolean default false) returns jsonb language plpgsql security definer set search_path = public as $$
declare nf int; arch jsonb; av jsonb; nom text;
begin
  if not public.es_superadmin() then raise exception 'Solo un superadmin puede borrar un cliente'; end if;
  select nombre into nom from public.clientes where id = p_cliente;
  if nom is null then raise exception 'Ese cliente no existe'; end if;
  select count(*) into nf from public.facturas where cliente_id = p_cliente;
  if nf > 0 and not coalesce(p_con_facturas, false) then raise exception '% tiene % factura(s) emitida(s): tildá «borrar también sus facturas» para seguir', nom, nf; end if;
  select coalesce(jsonb_agg(name), '[]'::jsonb) into arch from storage.objects where bucket_id = 'marcas' and name like 'clientes/' || p_cliente || '/%';
  select coalesce(jsonb_agg(name), '[]'::jsonb) into av from storage.objects where bucket_id = 'avatares' and name like 'clientes/' || p_cliente || '%';
  if nf > 0 then delete from public.facturas where cliente_id = p_cliente; end if;
  delete from public.clientes where id = p_cliente;
  return jsonb_build_object('ok', true, 'nombre', nom, 'facturas', nf, 'marcas', arch, 'avatares', av);
end $$;
revoke execute on function public.borrar_cliente(uuid, boolean) from public, anon;
grant execute on function public.borrar_cliente(uuid, boolean) to authenticated;
