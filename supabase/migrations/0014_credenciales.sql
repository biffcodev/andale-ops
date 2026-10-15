-- Cuentas y claves de las integraciones (Claude, Google, Email, WhatsApp, ARCA) cambiables desde la app.
-- Se guardan cifradas en Supabase Vault. Nadie las puede leer desde el navegador: solo las funciones del servidor (service_role).
-- Las socias las cargan en Configuración → Integraciones; la app solo muestra la cuenta y los últimos caracteres.

create table if not exists private.credenciales (
  nombre text primary key,                 -- 'anthropic' | 'google' | 'email' | 'whatsapp' | 'arca:Fer' …
  cuenta text not null default '',         -- lo que se muestra: email de la cuenta, número, etc.
  pista text not null default '',          -- últimos caracteres de la clave
  actualizado timestamptz not null default now(),
  por uuid references public.personas(id) on delete set null,
  ok boolean,                              -- resultado de la última prueba
  ok_detalle text not null default '',
  probado timestamptz
);
revoke all on private.credenciales from public, anon, authenticated;

-- Guardar (crea o reemplaza). Solo la función del servidor.
create or replace function public.cred_guardar(n text, v text, p_cuenta text, p_pista text, p_por uuid) returns void
language plpgsql security definer set search_path = public, private as $$
declare sid uuid;
begin
  if n !~ '^[a-z_]+(:[A-Za-z0-9_ ]+)?$' then raise exception 'Nombre inválido'; end if;
  select id into sid from vault.secrets where name = 'andale_cred:' || n;
  if sid is null then perform vault.create_secret(v, 'andale_cred:' || n, 'Credencial de integración de àndale Operaciones');
  else perform vault.update_secret(sid, v); end if;
  insert into private.credenciales (nombre, cuenta, pista, actualizado, por, ok, ok_detalle, probado)
  values (n, coalesce(p_cuenta, ''), coalesce(p_pista, ''), now(), p_por, null, '', null)
  on conflict (nombre) do update set cuenta = excluded.cuenta, pista = excluded.pista, actualizado = now(), por = excluded.por, ok = null, ok_detalle = '', probado = null;
end $$;

create or replace function public.cred_leer(n text) returns text
language sql stable security definer set search_path = public as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'andale_cred:' || n limit 1
$$;

create or replace function public.cred_borrar(n text) returns void
language plpgsql security definer set search_path = public, private as $$
begin
  delete from vault.secrets where name = 'andale_cred:' || n;
  delete from private.credenciales where nombre = n;
end $$;

create or replace function public.cred_probado(n text, p_ok boolean, p_detalle text) returns void
language sql security definer set search_path = public, private as $$
  update private.credenciales set ok = p_ok, ok_detalle = left(coalesce(p_detalle, ''), 300), probado = now() where nombre = n
$$;

create or replace function public.cred_estado() returns table (nombre text, cuenta text, pista text, actualizado timestamptz, por text, ok boolean, ok_detalle text, probado timestamptz)
language sql stable security definer set search_path = public, private as $$
  select c.nombre, c.cuenta, c.pista, c.actualizado, p.alias, c.ok, c.ok_detalle, c.probado
  from private.credenciales c left join public.personas p on p.id = c.por order by c.nombre
$$;

-- Ninguna se puede llamar desde la app: solo con la clave de servicio (Edge Functions).
revoke execute on function public.cred_guardar(text, text, text, text, uuid) from public, anon, authenticated;
revoke execute on function public.cred_leer(text) from public, anon, authenticated;
revoke execute on function public.cred_borrar(text) from public, anon, authenticated;
revoke execute on function public.cred_probado(text, boolean, text) from public, anon, authenticated;
revoke execute on function public.cred_estado() from public, anon, authenticated;
grant execute on function public.cred_guardar(text, text, text, text, uuid) to service_role;
grant execute on function public.cred_leer(text) to service_role;
grant execute on function public.cred_borrar(text) to service_role;
grant execute on function public.cred_probado(text, boolean, text) to service_role;
grant execute on function public.cred_estado() to service_role;
