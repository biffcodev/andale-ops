-- 0018 · Ficha de marca, perfil de cada persona con sus avisos, y automatizaciones simples
-- Se puede correr más de una vez.

-- ---------------------------------------------------------------------
-- Ficha de marca y voz de cada cliente (la usa Mr. Piggy para escribir como la marca)
-- ---------------------------------------------------------------------
alter table public.clientes add column if not exists marca jsonb not null default '{}';

-- ---------------------------------------------------------------------
-- Perfil: cada persona edita sus datos y qué avisos recibe
-- prefs = { avisos: {tipo: false}, slack: {tipo: false}, diario: bool, diario_canal: 'auto'|'slack'|'mail', horario: bool }
-- ---------------------------------------------------------------------
alter table public.personas add column if not exists prefs jsonb not null default '{}';

create or replace function public.mi_perfil_guardar(p_nombre text, p_puesto text, p_tel text, p_prefs jsonb)
returns jsonb language plpgsql security definer set search_path = public, private as $$
declare yo uuid := private.mi_persona();
begin
  if yo is null then raise exception 'No tenés perfil en el equipo'; end if;
  update public.personas set
    nombre = left(coalesce(nullif(btrim(p_nombre), ''), nombre), 120),
    puesto = left(coalesce(p_puesto, puesto), 120),
    tel = left(coalesce(p_tel, tel), 60),
    prefs = case when jsonb_typeof(p_prefs) = 'object' then p_prefs else prefs end
  where id = yo;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.mi_perfil_guardar(text, text, text, jsonb) from public, anon;
grant execute on function public.mi_perfil_guardar(text, text, text, jsonb) to authenticated;

-- Si alguien apagó un tipo de aviso, no se crea (vale para todos los avisos, vengan de donde vengan).
create or replace function private.aviso_filtrar() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.personas p where p.id = new.persona_id and (p.prefs -> 'avisos' ->> new.tipo) = 'false') then return null; end if;
  return new;
end $$;
drop trigger if exists notificaciones_filtrar on public.notificaciones;
create trigger notificaciones_filtrar before insert on public.notificaciones for each row execute function private.aviso_filtrar();

-- ---------------------------------------------------------------------
-- Automatizaciones: reglas listas para prender o apagar (una vez y listo).
-- La función "automatizar" corre todos los días a la mañana y hace lo que esté prendido.
-- ---------------------------------------------------------------------
create table if not exists public.automatizaciones (
  clave text primary key,
  activa boolean not null default false,
  config jsonb not null default '{}',
  ultima_corrida timestamptz,
  ultimo_resultado text not null default '',
  actualizado_por uuid references public.personas(id) on delete set null default private.mi_persona(),
  updated_at timestamptz not null default now()
);
drop trigger if exists automatizaciones_upd on public.automatizaciones;
create trigger automatizaciones_upd before update on public.automatizaciones for each row execute function public.set_updated_at();
alter table public.automatizaciones enable row level security;
drop policy if exists auto_sel on public.automatizaciones;
drop policy if exists auto_w on public.automatizaciones;
create policy auto_sel on public.automatizaciones for select to authenticated using (public.es_staff());
create policy auto_w on public.automatizaciones for all to authenticated using (public.es_staff()) with check (public.es_staff());
revoke all on public.automatizaciones from anon;
grant select, insert, update, delete on public.automatizaciones to authenticated;

-- La corrida diaria usa el mismo secreto que los avisos (Vault 'avisos_cron').
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'automatizar-diario';
    perform cron.schedule('automatizar-diario', '15 11 * * *', $job$
      select net.http_post(url := 'https://mefnrchslyfhaiwvfvox.supabase.co/functions/v1/automatizar',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_cron')),
        body := '{"accion":"correr"}'::jsonb, timeout_milliseconds := 120000)
      where exists (select 1 from public.automatizaciones where activa)
    $job$);
  end if;
end $$;

-- Automatización "Asignar tickets nuevos": al entrar un ticket sin responsable, se lo asigna
-- al responsable del cliente (o del abono activo); si no tiene, a la persona elegida. Inmediato, sin esperar a la corrida diaria.
create or replace function private.tg_pedidos_autoasignar() returns trigger language plpgsql security definer set search_path = public as $$
declare a record; p uuid; def text;
begin
  if new.responsable_id is not null then return new; end if;
  select activa, config into a from public.automatizaciones where clave = 'tickets_asignar';
  if not found or not a.activa then return new; end if;
  if coalesce(a.config ->> 'modo', 'cliente') = 'cliente' then
    select cr.persona_id into p from public.cliente_responsables cr join public.personas pe on pe.id = cr.persona_id and pe.activo
      where cr.cliente_id = new.cliente_id limit 1;
    if p is null then
      select ar.persona_id into p from public.abonos ab join public.abono_responsables ar on ar.abono_id = ab.id join public.personas pe on pe.id = ar.persona_id and pe.activo
        where ab.cliente_id = new.cliente_id and ab.estado = 'Activo' order by (ab.tipo = 'Redes') desc limit 1;
    end if;
  end if;
  def := a.config ->> 'persona_id';
  if p is null and def ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    select id into p from public.personas where id = def::uuid and activo;
  end if;
  if p is not null then new.responsable_id := p; end if;
  return new;
end $$;
drop trigger if exists pedidos_autoasignar on public.pedidos;
create trigger pedidos_autoasignar before insert on public.pedidos for each row execute function private.tg_pedidos_autoasignar();
