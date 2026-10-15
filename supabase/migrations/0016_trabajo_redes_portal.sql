-- àndale · Operaciones — 0016
-- Tareas en su propia tabla con etapas y automatizaciones, comentarios con menciones, avisos (app + Slack),
-- redes por mes con piezas, entregas por rondas, ficha de sitio web, pedidos de clientes, informes de redes,
-- portal de clientes (solo por funciones, sin acceso directo a tablas), registro de errores y arranque limpio.
-- Se puede correr más de una vez.

-- =====================================================================
-- Avisos (dentro de la app; la Edge Function `avisos` los reenvía a Slack)
-- =====================================================================
create table if not exists public.notificaciones (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null references public.personas(id) on delete cascade,
  tipo text not null default '',
  titulo text not null,
  cuerpo text not null default '',
  link text not null default '',
  actor_id uuid references public.personas(id) on delete set null,
  leida boolean not null default false,
  slack text not null default 'pendiente' check (slack in ('pendiente', 'enviada', 'omitida', 'error')),
  created_at timestamptz not null default now()
);
create index if not exists notificaciones_persona on public.notificaciones (persona_id, created_at desc);
create index if not exists notificaciones_slack on public.notificaciones (created_at) where slack = 'pendiente';
alter table public.notificaciones enable row level security;
drop policy if exists notif_sel on public.notificaciones;
drop policy if exists notif_upd on public.notificaciones;
drop policy if exists notif_del on public.notificaciones;
create policy notif_sel on public.notificaciones for select to authenticated using (persona_id = private.mi_persona());
create policy notif_upd on public.notificaciones for update to authenticated using (persona_id = private.mi_persona()) with check (persona_id = private.mi_persona());
create policy notif_del on public.notificaciones for delete to authenticated using (persona_id = private.mi_persona());
revoke all on public.notificaciones from anon;

-- Crea un aviso (no se avisa a uno mismo ni a personas inactivas).
create or replace function private.avisar(p_persona uuid, p_tipo text, p_titulo text, p_cuerpo text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_persona is null or p_persona is not distinct from private.mi_persona() then return; end if;
  if not exists (select 1 from public.personas where id = p_persona and activo) then return; end if;
  insert into public.notificaciones (persona_id, tipo, titulo, cuerpo, link, actor_id)
  values (p_persona, coalesce(p_tipo, ''), left(coalesce(p_titulo, ''), 200), left(coalesce(p_cuerpo, ''), 600), coalesce(p_link, ''), private.mi_persona());
end $$;

-- =====================================================================
-- Tareas (antes en proyectos.etapas)
-- =====================================================================
alter table public.proyectos add column if not exists etapa_actual text not null default '';

create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  titulo text not null default '',
  etapa text not null default '',
  hecha boolean not null default false,
  en_curso boolean not null default false,
  responsable_id uuid references public.personas(id) on delete set null,
  fecha date,
  plazo_dias int,
  prioridad text not null default '' check (prioridad in ('', 'Baja', 'Media', 'Alta', 'Urgente')),
  nota text not null default '',
  horas numeric(6,2) check (horas is null or horas >= 0),
  orden int not null default 0,
  hecha_at timestamptz,
  hecha_por uuid references public.personas(id) on delete set null,
  creada_por uuid references public.personas(id) on delete set null default private.mi_persona(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tareas_proyecto on public.tareas (proyecto_id, orden);
create index if not exists tareas_responsable on public.tareas (responsable_id) where not hecha;
drop trigger if exists tareas_upd on public.tareas;
create trigger tareas_upd before update on public.tareas for each row execute function public.set_updated_at();
alter table public.tareas enable row level security;
drop policy if exists tareas_sel on public.tareas;
drop policy if exists tareas_ins on public.tareas;
drop policy if exists tareas_upd on public.tareas;
drop policy if exists tareas_del on public.tareas;
create policy tareas_sel on public.tareas for select to authenticated using (public.es_staff() or proyecto_id in (select private.mis_proyectos()));
create policy tareas_ins on public.tareas for insert to authenticated with check (public.es_staff() or proyecto_id in (select private.mis_proyectos()));
create policy tareas_upd on public.tareas for update to authenticated using (public.es_staff() or proyecto_id in (select private.mis_proyectos())) with check (public.es_staff() or proyecto_id in (select private.mis_proyectos()));
create policy tareas_del on public.tareas for delete to authenticated using (public.es_staff() or proyecto_id in (select private.mis_proyectos()));
revoke all on public.tareas from anon;

-- Pasar las tareas que ya existen (solo proyectos que todavía no tienen tareas en la tabla).
insert into public.tareas (proyecto_id, titulo, hecha, en_curso, responsable_id, fecha, prioridad, nota, orden, creada_por)
select p.id, left(coalesce(e->>'n', ''), 300),
  coalesce(e->>'ok', '') = 'true',
  coalesce(e->>'est', '') = 'curso',
  (select x.id from public.personas x where x.alias = e->>'resp' limit 1),
  case when coalesce(e->>'fecha', '') ~ '^\d{4}-\d{2}-\d{2}$' then (e->>'fecha')::date end,
  case when e->>'prio' in ('Baja', 'Media', 'Alta', 'Urgente') then e->>'prio' else '' end,
  coalesce(e->>'nota', ''), (t.o - 1)::int, null
from public.proyectos p
cross join lateral jsonb_array_elements(case when jsonb_typeof(p.etapas) = 'array' then p.etapas else '[]'::jsonb end) with ordinality as t(e, o)
where coalesce(e->>'n', '') <> '' and not exists (select 1 from public.tareas x where x.proyecto_id = p.id);

-- Flujos: etapas por tipo de proyecto, con sus tareas modelo y qué automatizaciones están prendidas.
-- etapas: [{"n":"Diseño","estado":"En curso","tareas":[{"n":"Bocetos","resp":"Cata","dias":5}]}]
-- reglas: {"avanzar":true,"estado":true,"aviso_facturar":true}
create table if not exists public.flujos (
  tipo text primary key,
  etapas jsonb not null default '[]',
  reglas jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
drop trigger if exists flujos_upd on public.flujos;
create trigger flujos_upd before update on public.flujos for each row execute function public.set_updated_at();
alter table public.flujos enable row level security;
drop policy if exists flujos_sel on public.flujos;
drop policy if exists flujos_w on public.flujos;
create policy flujos_sel on public.flujos for select to authenticated using (public.es_miembro());
create policy flujos_w on public.flujos for all to authenticated using (public.es_staff()) with check (public.es_staff());
revoke all on public.flujos from anon;

-- Quién cerró la tarea y cuándo.
create or replace function private.tg_tareas_hecha() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.hecha and (tg_op = 'INSERT' or not old.hecha) then new.hecha_at = coalesce(new.hecha_at, now()); new.hecha_por = coalesce(new.hecha_por, private.mi_persona()); new.en_curso = false; end if;
  if not new.hecha and tg_op = 'UPDATE' and old.hecha then new.hecha_at = null; new.hecha_por = null; end if;
  return new;
end $$;
drop trigger if exists tareas_hecha on public.tareas;
create trigger tareas_hecha before insert or update of hecha on public.tareas for each row execute function private.tg_tareas_hecha();

-- Aviso al asignar una tarea a alguien.
create or replace function private.tg_tareas_asignada() returns trigger language plpgsql security definer set search_path = public as $$
declare p record;
begin
  if new.responsable_id is null or new.hecha then return null; end if;
  if tg_op = 'UPDATE' and new.responsable_id is not distinct from old.responsable_id then return null; end if;
  -- Las tareas de un flujo se avisan cuando les llega su etapa ("Te toca"), no al crearse.
  if tg_op = 'INSERT' and new.etapa <> '' then return null; end if;
  select id, nombre into p from public.proyectos where id = new.proyecto_id;
  perform private.avisar(new.responsable_id, 'tarea', 'Te asignaron: ' || new.titulo, p.nombre || case when new.fecha is not null then ' · para el ' || to_char(new.fecha, 'DD/MM') else '' end, '#proyectos/' || p.id || '?t=' || new.id);
  return null;
end $$;
drop trigger if exists tareas_asignada on public.tareas;
create trigger tareas_asignada after insert or update of responsable_id on public.tareas for each row execute function private.tg_tareas_asignada();

-- Automatización por etapas: cuando se cierran las tareas de una etapa, pasa a la siguiente,
-- les pone fecha a sus tareas (según los días del flujo), avisa a quienes les toca y actualiza el estado del proyecto.
-- Cuando se cierra todo, avisa a los administradores para facturar.
create or replace function private.flujo_recalcular(p_proyecto uuid) returns void language plpgsql security definer set search_path = public as $$
declare
  p record; f record; v_orden text[]; cur text; est text; r jsonb; a record;
begin
  select id, nombre, tipo, estado, etapa_actual, cliente_id into p from public.proyectos where id = p_proyecto;
  if p.id is null then return; end if;
  select etapas, reglas into f from public.flujos where tipo = p.tipo;
  r := coalesce(f.reglas, '{}'::jsonb);
  v_orden := coalesce((select array_agg(x->>'n' order by o) from jsonb_array_elements(coalesce(f.etapas, '[]'::jsonb)) with ordinality t(x, o) where coalesce(x->>'n', '') <> ''), '{}');
  v_orden := v_orden || coalesce((select array_agg(s.e order by s.m) from (select t.etapa e, min(t.orden) m from public.tareas t where t.proyecto_id = p.id and t.etapa <> '' and not (t.etapa = any(v_orden)) group by t.etapa) s), '{}');
  if not exists (select 1 from public.tareas where proyecto_id = p.id and etapa <> '') then return; end if;
  select u.e into cur from unnest(v_orden) with ordinality u(e, o)
    where exists (select 1 from public.tareas t where t.proyecto_id = p.id and t.etapa = u.e and not t.hecha) order by u.o limit 1;
  if coalesce(cur, '') = coalesce(p.etapa_actual, '') then return; end if;
  update public.proyectos set etapa_actual = coalesce(cur, '') where id = p.id;
  if cur is not null then
    if coalesce((r->>'avanzar')::boolean, true) then
      update public.tareas set fecha = current_date + plazo_dias where proyecto_id = p.id and etapa = cur and not hecha and fecha is null and plazo_dias is not null;
      for a in select distinct responsable_id from public.tareas where proyecto_id = p.id and etapa = cur and not hecha and responsable_id is not null loop
        perform private.avisar(a.responsable_id, 'etapa', 'Te toca: ' || cur, p.nombre || ' pasó a ' || cur || '.', '#proyectos/' || p.id);
      end loop;
    end if;
    est := (select x->>'estado' from jsonb_array_elements(coalesce(f.etapas, '[]'::jsonb)) x where x->>'n' = cur limit 1);
    if coalesce((r->>'estado')::boolean, true) and coalesce(est, '') <> '' and est <> p.estado then
      update public.proyectos set estado = est where id = p.id;
    end if;
  elsif coalesce((r->>'aviso_facturar')::boolean, true) then
    for a in select id from public.personas where rol = 'admin' and activo loop
      perform private.avisar(a.id, 'facturar', 'Listo para facturar: ' || p.nombre, 'Se cerraron todas las tareas del proyecto.', '#proyectos/' || p.id);
    end loop;
  end if;
end $$;

create or replace function private.tg_tareas_flujo() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.hecha = old.hecha and new.etapa = old.etapa then return null; end if;
  perform private.flujo_recalcular(coalesce(new.proyecto_id, old.proyecto_id));
  return null;
end $$;
drop trigger if exists tareas_flujo on public.tareas;
create trigger tareas_flujo after insert or delete or update of hecha, etapa on public.tareas for each row execute function private.tg_tareas_flujo();

-- =====================================================================
-- Redes: un "mes" por cliente con sus piezas
-- =====================================================================
create table if not exists public.redes_meses (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  abono_id uuid references public.abonos(id) on delete set null,
  mes date not null check (extract(day from mes) = 1),
  estado text not null default 'Planificación' check (estado in ('Planificación', 'Producción', 'Revisión interna', 'Con el cliente', 'Aprobado', 'Programado', 'Cerrado')),
  responsable_id uuid references public.personas(id) on delete set null,
  plan jsonb not null default '{}',
  carpeta text not null default '',
  carpeta_url text not null default '',
  conteo jsonb not null default '{}',
  conteo_at timestamptz,
  notas text not null default '',
  visible_cliente boolean not null default false,
  enviado_at timestamptz,
  aprobado_at timestamptz,
  aprobado_por text not null default '',
  horas numeric(6,2) check (horas is null or horas >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, mes)
);
create table if not exists public.piezas (
  id uuid primary key default gen_random_uuid(),
  mes_id uuid not null references public.redes_meses(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  formato text not null default '',
  red text not null default 'Instagram',
  fecha date,
  hora time,
  tema text not null default '',
  copy text not null default '',
  hashtags text not null default '',
  estado text not null default 'Idea' check (estado in ('Idea', 'En diseño', 'Revisión interna', 'Para el cliente', 'Cambios', 'Aprobada', 'Programada', 'Publicada')),
  extra boolean not null default false,
  fijo text not null default '',
  responsable_id uuid references public.personas(id) on delete set null,
  arte jsonb not null default '[]',
  orden int not null default 0,
  horas numeric(6,2) check (horas is null or horas >= 0),
  respuesta_cliente text not null default '',
  respondida_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists piezas_mes on public.piezas (mes_id, fecha, orden);
drop trigger if exists redes_meses_upd on public.redes_meses;
create trigger redes_meses_upd before update on public.redes_meses for each row execute function public.set_updated_at();
drop trigger if exists piezas_upd on public.piezas;
create trigger piezas_upd before update on public.piezas for each row execute function public.set_updated_at();
alter table public.redes_meses enable row level security;
alter table public.piezas enable row level security;
drop policy if exists rmes_staff on public.redes_meses;
drop policy if exists rmes_ext_sel on public.redes_meses;
drop policy if exists piezas_staff on public.piezas;
drop policy if exists piezas_ext_sel on public.piezas;
drop policy if exists piezas_ext_upd on public.piezas;
create policy rmes_staff on public.redes_meses for all to authenticated using (public.es_staff()) with check (public.es_staff());
create policy rmes_ext_sel on public.redes_meses for select to authenticated using (cliente_id in (select private.mis_clientes()));
create policy piezas_staff on public.piezas for all to authenticated using (public.es_staff()) with check (public.es_staff());
create policy piezas_ext_sel on public.piezas for select to authenticated using (cliente_id in (select private.mis_clientes()));
create policy piezas_ext_upd on public.piezas for update to authenticated using (cliente_id in (select private.mis_clientes())) with check (cliente_id in (select private.mis_clientes()));
revoke all on public.redes_meses, public.piezas from anon;

-- =====================================================================
-- Entregas por rondas, ficha del sitio web y pedidos de clientes
-- =====================================================================
create table if not exists public.entregas (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null default 'Ronda' check (tipo in ('Ronda', 'Entrega final')),
  titulo text not null default '',
  descripcion text not null default '',
  links jsonb not null default '[]',
  archivos jsonb not null default '[]',
  estado text not null default 'Borrador' check (estado in ('Borrador', 'Enviada', 'Cambios', 'Aprobada')),
  enviada_at timestamptz,
  respondida_at timestamptz,
  aprobado_por text not null default '',
  respuesta text not null default '',
  orden int not null default 0,
  creada_por uuid references public.personas(id) on delete set null default private.mi_persona(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists entregas_proyecto on public.entregas (proyecto_id, orden);
create table if not exists public.sitios (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null unique references public.proyectos(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  url_preview text not null default '',
  url_prod text not null default '',
  etapa text not null default '',
  checklist jsonb not null default '[]',
  accesos text not null default '',
  notas text not null default '',
  visible_cliente boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Tickets: pedidos chicos de los clientes (desde el portal, o cargados por el equipo desde un WhatsApp o un mail).
-- Cada uno registra horas y si se cobra, para que las tareas sueltas no se pierdan sin facturar.
create table if not exists public.pedidos (
  id uuid primary key default gen_random_uuid(),
  numero bigint generated by default as identity,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  contacto_id uuid references public.contactos(id) on delete set null,
  autor_nombre text not null default '',
  origen text not null default 'portal' check (origen in ('portal', 'equipo', 'whatsapp', 'mail')),
  titulo text not null,
  detalle text not null default '',
  para_cuando date,
  prioridad text not null default '' check (prioridad in ('', 'Baja', 'Media', 'Alta', 'Urgente')),
  estado text not null default 'Nuevo' check (estado in ('Nuevo', 'En curso', 'Esperando al cliente', 'Hecho', 'Descartado')),
  responsable_id uuid references public.personas(id) on delete set null,
  horas numeric(6,2) check (horas is null or horas >= 0),
  cobro text not null default 'A definir' check (cobro in ('A definir', 'Incluido en el abono', 'A facturar', 'Sin cargo')),
  monto numeric(14,2),
  moneda text not null default 'ARS',
  facturado boolean not null default false,
  respuesta text not null default '',
  proyecto_id uuid references public.proyectos(id) on delete set null,
  tarea_id uuid references public.tareas(id) on delete set null,
  cerrado_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists pedidos_cliente on public.pedidos (cliente_id, created_at desc);
create or replace function private.tg_pedidos_cierre() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.estado in ('Hecho', 'Descartado') and (tg_op = 'INSERT' or old.estado not in ('Hecho', 'Descartado')) then new.cerrado_at = now(); end if;
  if new.estado not in ('Hecho', 'Descartado') then new.cerrado_at = null; end if;
  return new;
end $$;
drop trigger if exists pedidos_cierre on public.pedidos;
create trigger pedidos_cierre before insert or update of estado on public.pedidos for each row execute function private.tg_pedidos_cierre();
-- Aviso al asignar un ticket.
create or replace function private.tg_pedidos_asignado() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.responsable_id is null or new.estado in ('Hecho', 'Descartado') then return null; end if;
  if tg_op = 'UPDATE' and new.responsable_id is not distinct from old.responsable_id then return null; end if;
  perform private.avisar(new.responsable_id, 'pedido', 'Ticket #' || new.numero || ': ' || new.titulo, (select nombre from public.clientes where id = new.cliente_id), '#tickets?k=' || new.id);
  return null;
end $$;
drop trigger if exists pedidos_asignado on public.pedidos;
create trigger pedidos_asignado after insert or update of responsable_id on public.pedidos for each row execute function private.tg_pedidos_asignado();

-- Briefs que completan los clientes en Tally (llegan por webhook a la Edge Function `tally`).
create table if not exists public.briefs (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references public.clientes(id) on delete set null,
  proyecto_id uuid references public.proyectos(id) on delete set null,
  tipo text not null default '',
  form_id text not null default '',
  form_nombre text not null default '',
  submission_id text not null unique,
  respondido_at timestamptz,
  respuestas jsonb not null default '[]',
  email text not null default '',
  empresa text not null default '',
  nombre text not null default '',
  pdf_url text not null default '',
  preview_url text not null default '',
  resumen jsonb,
  estado text not null default 'Nuevo' check (estado in ('Nuevo', 'Visto', 'Archivado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists briefs_upd on public.briefs;
create trigger briefs_upd before update on public.briefs for each row execute function public.set_updated_at();
alter table public.briefs enable row level security;
drop policy if exists briefs_staff on public.briefs;
create policy briefs_staff on public.briefs for all to authenticated using (public.es_staff()) with check (public.es_staff());
revoke all on public.briefs from anon;
drop trigger if exists entregas_upd on public.entregas;
create trigger entregas_upd before update on public.entregas for each row execute function public.set_updated_at();
drop trigger if exists sitios_upd on public.sitios;
create trigger sitios_upd before update on public.sitios for each row execute function public.set_updated_at();
drop trigger if exists pedidos_upd on public.pedidos;
create trigger pedidos_upd before update on public.pedidos for each row execute function public.set_updated_at();
alter table public.entregas enable row level security;
alter table public.sitios enable row level security;
alter table public.pedidos enable row level security;
drop policy if exists entregas_sel on public.entregas;
drop policy if exists entregas_w on public.entregas;
drop policy if exists sitios_sel on public.sitios;
drop policy if exists sitios_w on public.sitios;
drop policy if exists pedidos_staff on public.pedidos;
create policy entregas_sel on public.entregas for select to authenticated using (public.es_staff() or proyecto_id in (select private.mis_proyectos()));
create policy entregas_w on public.entregas for all to authenticated using (public.es_staff() or proyecto_id in (select private.mis_proyectos())) with check (public.es_staff() or proyecto_id in (select private.mis_proyectos()));
create policy sitios_sel on public.sitios for select to authenticated using (public.es_staff() or proyecto_id in (select private.mis_proyectos()));
create policy sitios_w on public.sitios for all to authenticated using (public.es_staff() or proyecto_id in (select private.mis_proyectos())) with check (public.es_staff() or proyecto_id in (select private.mis_proyectos()));
create policy pedidos_staff on public.pedidos for all to authenticated using (public.es_staff()) with check (public.es_staff());
revoke all on public.entregas, public.sitios, public.pedidos from anon;

-- =====================================================================
-- Informes de redes (mensuales, se publican en el portal)
-- =====================================================================
create table if not exists public.informes_redes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  mes date not null check (extract(day from mes) = 1),
  datos jsonb not null default '{}',
  texto text not null default '',
  estado text not null default 'Borrador' check (estado in ('Borrador', 'Publicado')),
  publicado_at timestamptz,
  enviado_at timestamptz,
  creado_por uuid references public.personas(id) on delete set null default private.mi_persona(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, mes)
);
drop trigger if exists informes_upd on public.informes_redes;
create trigger informes_upd before update on public.informes_redes for each row execute function public.set_updated_at();
alter table public.informes_redes enable row level security;
drop policy if exists informes_staff on public.informes_redes;
create policy informes_staff on public.informes_redes for all to authenticated using (public.es_staff()) with check (public.es_staff());
revoke all on public.informes_redes from anon;

-- =====================================================================
-- Comentarios (proyecto, tarea, mes de redes, pieza, entrega, pedido, sitio) con @menciones
-- =====================================================================
create table if not exists public.comentarios (
  id uuid primary key default gen_random_uuid(),
  entidad text not null check (entidad in ('proyecto', 'tarea', 'mes', 'pieza', 'entrega', 'pedido', 'sitio')),
  entidad_id uuid not null,
  cliente_id uuid references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete cascade,
  autor_id uuid references public.personas(id) on delete set null default private.mi_persona(),
  autor_contacto_id uuid references public.contactos(id) on delete set null,
  autor_nombre text not null default '',
  texto text not null check (length(texto) between 1 and 5000),
  menciones uuid[] not null default '{}',
  interno boolean not null default true,
  created_at timestamptz not null default now(),
  editado_at timestamptz
);
create index if not exists comentarios_entidad on public.comentarios (entidad, entidad_id, created_at);
create index if not exists comentarios_cliente on public.comentarios (cliente_id, created_at desc);
alter table public.comentarios enable row level security;
drop policy if exists coment_sel on public.comentarios;
drop policy if exists coment_ins on public.comentarios;
drop policy if exists coment_upd on public.comentarios;
drop policy if exists coment_del on public.comentarios;
create policy coment_sel on public.comentarios for select to authenticated using (
  public.es_staff() or proyecto_id in (select private.mis_proyectos()) or (proyecto_id is null and cliente_id in (select private.mis_clientes())));
create policy coment_ins on public.comentarios for insert to authenticated with check (
  autor_id = private.mi_persona() and autor_contacto_id is null
  and (public.es_staff() or proyecto_id in (select private.mis_proyectos()) or (proyecto_id is null and cliente_id in (select private.mis_clientes()))));
create policy coment_upd on public.comentarios for update to authenticated using (autor_id = private.mi_persona()) with check (autor_id = private.mi_persona());
create policy coment_del on public.comentarios for delete to authenticated using (autor_id = private.mi_persona() or public.es_admin());
revoke all on public.comentarios from anon;

-- Quién se entera de un comentario: los mencionados, y si lo escribe un cliente, los responsables de eso.
create or replace function private.link_de(p_entidad text, p_id uuid) returns text language sql stable security definer set search_path = public as $$
  select case p_entidad
    when 'proyecto' then '#proyectos/' || p_id
    when 'tarea' then coalesce((select '#proyectos/' || proyecto_id || '?t=' || id from public.tareas where id = p_id), '')
    when 'mes' then '#redes/' || p_id
    when 'pieza' then coalesce((select '#redes/' || mes_id || '?p=' || id from public.piezas where id = p_id), '')
    when 'entrega' then coalesce((select '#proyectos/' || proyecto_id || '?e=' || id from public.entregas where id = p_id), '')
    when 'sitio' then coalesce((select '#proyectos/' || proyecto_id from public.sitios where id = p_id), '')
    when 'pedido' then '#tickets?k=' || p_id
    else '' end
$$;
create or replace function private.responsables_de(p_entidad text, p_id uuid) returns setof uuid language sql stable security definer set search_path = public as $$
  select x from (
    select responsable_id x from public.tareas where p_entidad = 'tarea' and id = p_id
    union select pr.persona_id from public.proyecto_responsables pr where pr.proyecto_id = case p_entidad
        when 'proyecto' then p_id
        when 'tarea' then (select proyecto_id from public.tareas where id = p_id)
        when 'entrega' then (select proyecto_id from public.entregas where id = p_id)
        when 'sitio' then (select proyecto_id from public.sitios where id = p_id) end
    union select responsable_id from public.redes_meses where p_entidad = 'mes' and id = p_id
    union select m.responsable_id from public.piezas pz join public.redes_meses m on m.id = pz.mes_id where p_entidad = 'pieza' and pz.id = p_id
    union select responsable_id from public.piezas where p_entidad = 'pieza' and id = p_id
    union select responsable_id from public.pedidos where p_entidad = 'pedido' and id = p_id
    union select cr.persona_id from public.cliente_responsables cr where p_entidad = 'pedido' and cr.cliente_id = (select cliente_id from public.pedidos where id = p_id)
      and not exists (select 1 from public.pedidos where id = p_id and responsable_id is not null)
  ) s where x is not null
$$;
create or replace function private.tg_comentarios_aviso() returns trigger language plpgsql security definer set search_path = public as $$
declare quien text; m uuid; link text; titulo text;
begin
  quien := coalesce(nullif(new.autor_nombre, ''), (select alias from public.personas where id = new.autor_id), 'Alguien');
  link := private.link_de(new.entidad, new.entidad_id);
  foreach m in array new.menciones loop
    perform private.avisar(m, 'mencion', quien || ' te mencionó', left(new.texto, 300), link);
  end loop;
  if new.autor_contacto_id is not null then
    titulo := quien || ' (cliente) escribió';
    for m in select * from private.responsables_de(new.entidad, new.entidad_id)
             union select persona_id from public.cliente_responsables where cliente_id = new.cliente_id
               and not exists (select 1 from private.responsables_de(new.entidad, new.entidad_id))
             union select id from public.personas where rol = 'admin' and activo
               and not exists (select 1 from private.responsables_de(new.entidad, new.entidad_id))
               and not exists (select 1 from public.cliente_responsables where cliente_id = new.cliente_id) loop
      perform private.avisar(m, 'cliente', titulo, left(new.texto, 300), link);
    end loop;
  elsif new.entidad = 'tarea' then
    for m in select responsable_id from public.tareas where id = new.entidad_id and responsable_id is not null and not (responsable_id = any(new.menciones)) loop
      perform private.avisar(m, 'comentario', quien || ' comentó tu tarea', left(new.texto, 300), link);
    end loop;
  end if;
  return null;
end $$;
drop trigger if exists comentarios_aviso on public.comentarios;
create trigger comentarios_aviso after insert on public.comentarios for each row execute function private.tg_comentarios_aviso();

-- =====================================================================
-- Registro de errores de la app (para enterarse antes de que alguien avise)
-- =====================================================================
create table if not exists public.errores (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid default private.mi_persona(),
  mensaje text not null default '',
  detalle text not null default '',
  url text not null default '',
  version text not null default '',
  created_at timestamptz not null default now()
);
alter table public.errores enable row level security;
drop policy if exists errores_ins on public.errores;
drop policy if exists errores_sel on public.errores;
drop policy if exists errores_del on public.errores;
create policy errores_ins on public.errores for insert to authenticated with check (public.es_miembro() and length(mensaje) <= 2000 and length(detalle) <= 8000);
create policy errores_sel on public.errores for select to authenticated using (public.es_admin());
create policy errores_del on public.errores for delete to authenticated using (public.es_admin());
revoke all on public.errores from anon;

-- =====================================================================
-- Portal de clientes
-- Los clientes NO son personas del equipo: entran con su email (link mágico) y la base los reconoce
-- por sus contactos con acceso al portal. No tienen acceso directo a ninguna tabla; todo pasa por estas funciones.
-- =====================================================================
alter table public.contactos add column if not exists portal boolean not null default false;
alter table public.contactos add column if not exists portal_ultimo timestamptz;

create or replace function private.portal_contacto(p_cliente uuid) returns uuid language sql stable security definer set search_path = public as $$
  select id from public.contactos
  where portal and cliente_id = p_cliente and email <> '' and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '-'))
  order by principal desc limit 1
$$;

create or replace function public.portal_yo() returns jsonb language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  update public.contactos set portal_ultimo = now()
  where portal and email <> '' and lower(email) = lower(coalesce(auth.jwt() ->> 'email', '-'));
  select coalesce(jsonb_agg(jsonb_build_object('contacto_id', k.id, 'nombre', k.nombre, 'cliente_id', c.id, 'cliente', c.nombre, 'avatar', c.avatar_url) order by c.nombre), '[]'::jsonb) into r
  from public.contactos k join public.clientes c on c.id = k.cliente_id
  where k.portal and k.email <> '' and lower(k.email) = lower(coalesce(auth.jwt() ->> 'email', '-'));
  return jsonb_build_object('email', auth.jwt() ->> 'email', 'clientes', r);
end $$;

-- Estados de pieza que ve el cliente.
create or replace function private.pieza_visible(p_estado text) returns boolean language sql immutable as $$
  select p_estado in ('Para el cliente', 'Cambios', 'Aprobada', 'Programada', 'Publicada')
$$;

create or replace function public.portal_datos(p_cliente uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare k uuid; out jsonb;
begin
  k := private.portal_contacto(p_cliente);
  if k is null then raise exception 'No tenés acceso a este cliente'; end if;
  select jsonb_build_object(
    'cliente', (select jsonb_build_object('id', c.id, 'nombre', c.nombre, 'avatar', c.avatar_url) from public.clientes c where c.id = p_cliente),
    'yo', (select jsonb_build_object('id', id, 'nombre', nombre, 'rol', rol, 'cobros', cobros) from public.contactos where id = k),
    'meses', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'mes', m.mes, 'estado', m.estado, 'plan', m.plan, 'enviado_at', m.enviado_at, 'aprobado_at', m.aprobado_at, 'aprobado_por', m.aprobado_por,
        'piezas', coalesce((select jsonb_agg(jsonb_build_object('id', z.id, 'formato', z.formato, 'red', z.red, 'fecha', z.fecha, 'hora', to_char(z.hora, 'HH24:MI'),
            'tema', z.tema, 'copy', z.copy, 'hashtags', z.hashtags, 'estado', z.estado, 'artes', jsonb_array_length(z.arte), 'respuesta', z.respuesta_cliente)
            order by z.fecha nulls last, z.hora nulls last, z.orden) from public.piezas z where z.mes_id = m.id and private.pieza_visible(z.estado)), '[]'::jsonb)
      ) order by m.mes desc) from public.redes_meses m where m.cliente_id = p_cliente and m.visible_cliente and m.mes >= date_trunc('month', current_date) - interval '6 months'), '[]'::jsonb),
    'proyectos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'nombre', p.nombre, 'tipo', p.tipo, 'estado', p.estado, 'etapa', p.etapa_actual, 'entrega', p.entrega,
        'avance', (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where hecha) / count(*)) end from public.tareas t where t.proyecto_id = p.id),
        'entregas', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'tipo', e.tipo, 'titulo', e.titulo, 'descripcion', e.descripcion, 'links', e.links,
            'archivos', jsonb_array_length(e.archivos), 'estado', e.estado, 'enviada_at', e.enviada_at, 'respondida_at', e.respondida_at, 'aprobado_por', e.aprobado_por, 'respuesta', e.respuesta)
            order by e.orden, e.created_at) from public.entregas e where e.proyecto_id = p.id and e.estado <> 'Borrador'), '[]'::jsonb),
        'sitio', (select jsonb_build_object('id', s.id, 'url_preview', s.url_preview, 'url_prod', s.url_prod, 'etapa', s.etapa, 'checklist', s.checklist, 'accesos', s.accesos)
            from public.sitios s where s.proyecto_id = p.id and s.visible_cliente)
      ) order by p.created_at desc) from public.proyectos p where p.cliente_id = p_cliente and p.estado not in ('Cancelado', 'Presupuestado', 'A confirmar')), '[]'::jsonb),
    'informes', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'mes', i.mes, 'datos', i.datos, 'texto', i.texto, 'publicado_at', i.publicado_at) order by i.mes desc)
      from public.informes_redes i where i.cliente_id = p_cliente and i.estado = 'Publicado'), '[]'::jsonb),
    'pedidos', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'numero', d.numero, 'titulo', d.titulo, 'detalle', d.detalle, 'estado', d.estado, 'para_cuando', d.para_cuando,
        'autor', d.autor_nombre, 'respuesta', d.respuesta, 'cerrado_at', d.cerrado_at, 'created_at', d.created_at,
        'cobro', case when d.cobro in ('A facturar', 'Incluido en el abono', 'Sin cargo') then d.cobro else '' end) order by d.created_at desc)
      from public.pedidos d where d.cliente_id = p_cliente and (d.estado not in ('Hecho', 'Descartado') or d.cerrado_at > now() - interval '4 months')), '[]'::jsonb),
    'comentarios', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'entidad', x.entidad, 'entidad_id', x.entidad_id, 'texto', x.texto, 'created_at', x.created_at,
        'autor', coalesce(nullif(x.autor_nombre, ''), (select coalesce(nullif(pe.nombre, ''), pe.alias) from public.personas pe where pe.id = x.autor_id), ''), 'de_cliente', x.autor_contacto_id is not null) order by x.created_at)
      from public.comentarios x where x.cliente_id = p_cliente and not x.interno and x.created_at > now() - interval '6 months'), '[]'::jsonb),
    'cuenta', case when not coalesce((select cobros from public.contactos where id = k), false) then null else jsonb_build_object(
      'facturas', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'tipo', f.tipo, 'numero', f.numero, 'fecha', f.fecha, 'vencimiento', f.vencimiento, 'concepto', f.concepto,
          'moneda', f.moneda, 'monto', f.monto, 'saldo', f.saldo, 'link_pdf', f.link_pdf) order by f.fecha desc)
        from public.facturas_saldo f where f.cliente_id = p_cliente and not f.anulada and f.fecha > current_date - 400), '[]'::jsonb),
      'resumenes', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'numero', r.numero, 'periodo', r.periodo, 'moneda', r.moneda, 'total', r.total, 'link_pdf', r.link_pdf) order by r.periodo desc)
        from public.resumenes r where r.cliente_id = p_cliente and r.estado = 'Enviado' and r.periodo > current_date - 400), '[]'::jsonb)) end
  ) into out;
  return out;
end $$;

-- El cliente aprueba o pide cambios (pieza, mes entero o entrega). Queda registrado con su nombre.
create or replace function public.portal_responder(p_entidad text, p_id uuid, p_accion text, p_texto text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare c uuid; k uuid; nom text; pid uuid; txt text := left(coalesce(p_texto, ''), 4000); n int := 0;
begin
  if p_accion not in ('aprobar', 'cambios') then raise exception 'Acción inválida'; end if;
  if p_accion = 'cambios' and btrim(txt) = '' then raise exception 'Contanos qué cambiarías'; end if;
  if p_entidad = 'pieza' then
    select z.cliente_id into c from public.piezas z join public.redes_meses m on m.id = z.mes_id where z.id = p_id and m.visible_cliente and private.pieza_visible(z.estado);
  elsif p_entidad = 'mes' then
    select cliente_id into c from public.redes_meses where id = p_id and visible_cliente;
  elsif p_entidad = 'entrega' then
    select cliente_id, proyecto_id into c, pid from public.entregas where id = p_id and estado <> 'Borrador';
  else raise exception 'Entidad inválida'; end if;
  k := private.portal_contacto(c);
  if c is null or k is null then raise exception 'No tenés acceso a esto'; end if;
  select coalesce(nullif(nombre, ''), email) into nom from public.contactos where id = k;

  if p_entidad = 'pieza' then
    update public.piezas set estado = case when p_accion = 'aprobar' then 'Aprobada' else 'Cambios' end, respuesta_cliente = txt, respondida_at = now()
    where id = p_id and estado in ('Para el cliente', 'Cambios', 'Aprobada');
    get diagnostics n = row_count;
  elsif p_entidad = 'mes' then
    if p_accion = 'aprobar' then
      update public.piezas set estado = 'Aprobada', respondida_at = now() where mes_id = p_id and estado = 'Para el cliente';
      get diagnostics n = row_count;
      update public.redes_meses set aprobado_at = now(), aprobado_por = nom, estado = case when estado in ('Con el cliente', 'Revisión interna', 'Producción') then 'Aprobado' else estado end where id = p_id;
    end if;
  else
    update public.entregas set estado = case when p_accion = 'aprobar' then 'Aprobada' else 'Cambios' end, respondida_at = now(),
      aprobado_por = case when p_accion = 'aprobar' then nom else aprobado_por end, respuesta = txt where id = p_id;
    get diagnostics n = row_count;
  end if;

  insert into public.comentarios (entidad, entidad_id, cliente_id, proyecto_id, autor_id, autor_contacto_id, autor_nombre, texto, interno)
  values (p_entidad, p_id, c, pid, null, k, nom,
    case when p_accion = 'aprobar' then '✓ Aprobado' || case when btrim(txt) <> '' then ': ' || txt else '' end else 'Pidió cambios: ' || txt end, false);
  return jsonb_build_object('ok', true, 'cambiadas', n);
end $$;

create or replace function public.portal_comentar(p_entidad text, p_id uuid, p_texto text) returns jsonb language plpgsql security definer set search_path = public as $$
declare c uuid; k uuid; nom text; pid uuid; txt text := btrim(left(coalesce(p_texto, ''), 4000));
begin
  if txt = '' then raise exception 'El comentario está vacío'; end if;
  if p_entidad = 'pieza' then select z.cliente_id into c from public.piezas z join public.redes_meses m on m.id = z.mes_id where z.id = p_id and m.visible_cliente and private.pieza_visible(z.estado);
  elsif p_entidad = 'mes' then select cliente_id into c from public.redes_meses where id = p_id and visible_cliente;
  elsif p_entidad = 'entrega' then select cliente_id, proyecto_id into c, pid from public.entregas where id = p_id and estado <> 'Borrador';
  elsif p_entidad = 'sitio' then select cliente_id, proyecto_id into c, pid from public.sitios where id = p_id and visible_cliente;
  elsif p_entidad = 'pedido' then select cliente_id into c from public.pedidos where id = p_id;
  elsif p_entidad = 'proyecto' then select cliente_id, id into c, pid from public.proyectos where id = p_id;
  else raise exception 'Entidad inválida'; end if;
  k := private.portal_contacto(c);
  if c is null or k is null then raise exception 'No tenés acceso a esto'; end if;
  select coalesce(nullif(nombre, ''), email) into nom from public.contactos where id = k;
  insert into public.comentarios (entidad, entidad_id, cliente_id, proyecto_id, autor_id, autor_contacto_id, autor_nombre, texto, interno)
  values (p_entidad, p_id, c, pid, null, k, nom, txt, false);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.portal_pedido(p_cliente uuid, p_titulo text, p_detalle text default '', p_para date default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare k uuid; nom text; nid uuid; m uuid; cn text;
begin
  k := private.portal_contacto(p_cliente);
  if k is null then raise exception 'No tenés acceso a este cliente'; end if;
  if btrim(coalesce(p_titulo, '')) = '' then raise exception 'Poné un título'; end if;
  if (select count(*) from public.pedidos where contacto_id = k and created_at > now() - interval '1 hour') >= 20 then raise exception 'Demasiados pedidos seguidos. Probá en un rato.'; end if;
  select coalesce(nullif(nombre, ''), email) into nom from public.contactos where id = k;
  select nombre into cn from public.clientes where id = p_cliente;
  insert into public.pedidos (cliente_id, contacto_id, autor_nombre, origen, titulo, detalle, para_cuando)
  values (p_cliente, k, nom, 'portal', left(btrim(p_titulo), 200), left(coalesce(p_detalle, ''), 4000), p_para) returning id into nid;
  for m in select persona_id from public.cliente_responsables where cliente_id = p_cliente
           union select id from public.personas where rol = 'admin' and activo and not exists (select 1 from public.cliente_responsables where cliente_id = p_cliente) loop
    perform private.avisar(m, 'pedido', 'Ticket nuevo de ' || cn, left(btrim(p_titulo), 200) || ' · ' || nom, '#tickets?k=' || nid);
  end loop;
  return jsonb_build_object('ok', true, 'id', nid);
end $$;

-- El cliente tilda lo que le toca mandar en la ficha del sitio.
create or replace function public.portal_checklist(p_sitio uuid, p_i int, p_ok boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare s record;
begin
  select * into s from public.sitios where id = p_sitio and visible_cliente;
  if s.id is null or private.portal_contacto(s.cliente_id) is null then raise exception 'No tenés acceso a esto'; end if;
  if p_i < 0 or p_i >= jsonb_array_length(s.checklist) or coalesce(s.checklist -> p_i ->> 'de', '') <> 'cliente' then raise exception 'Ese punto no lo podés cambiar'; end if;
  update public.sitios set checklist = jsonb_set(checklist, array[p_i::text, 'ok'], to_jsonb(coalesce(p_ok, false))) where id = p_sitio;
  return jsonb_build_object('ok', true);
end $$;

-- Archivos (Dropbox) que el cliente puede ver: los de piezas y entregas visibles. Lo usa la Edge Function `dropbox`.
create or replace function public.portal_archivos(p_entidad text, p_id uuid) returns jsonb language plpgsql security definer set search_path = public as $$
declare c uuid; a jsonb;
begin
  if p_entidad = 'pieza' then
    select z.cliente_id, z.arte into c, a from public.piezas z join public.redes_meses m on m.id = z.mes_id where z.id = p_id and m.visible_cliente and private.pieza_visible(z.estado);
  elsif p_entidad = 'entrega' then
    select cliente_id, archivos into c, a from public.entregas where id = p_id and estado <> 'Borrador';
  else raise exception 'Entidad inválida'; end if;
  if c is null or private.portal_contacto(c) is null then raise exception 'No tenés acceso a esto'; end if;
  return coalesce(a, '[]'::jsonb);
end $$;

-- =====================================================================
-- Aviso a Slack apenas se crea un aviso, y resumen diario: llaman a la Edge Function `avisos`.
-- =====================================================================
do $$ begin
  if not exists (select 1 from vault.secrets where name = 'avisos_cron') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'avisos_cron', 'Secreto para los disparos de avisos (Slack y resumen diario)');
  end if;
end $$;
create or replace function public.avisos_cron_ok(s text) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(length(s) >= 32 and exists (select 1 from vault.decrypted_secrets where name = 'avisos_cron' and decrypted_secret = s), false)
$$;
revoke execute on function public.avisos_cron_ok(text) from public, anon, authenticated;
grant execute on function public.avisos_cron_ok(text) to service_role;

create or replace function private.tg_notif_slack() returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    perform net.http_post(
      url := 'https://mefnrchslyfhaiwvfvox.supabase.co/functions/v1/avisos',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_cron')),
      body := '{"accion":"cola"}'::jsonb, timeout_milliseconds := 20000);
  exception when others then null;
  end;
  return null;
end $$;
drop trigger if exists notificaciones_slack on public.notificaciones;
create trigger notificaciones_slack after insert on public.notificaciones for each statement execute function private.tg_notif_slack();

do $$ begin
  perform cron.unschedule(jobid) from cron.job where jobname in ('avisos-diario', 'avisos-cola');
  -- Lunes a viernes 8:30 (Córdoba = UTC-3): resumen del día para cada persona.
  perform cron.schedule('avisos-diario', '30 11 * * 1-5', $job$
    select net.http_post(url := 'https://mefnrchslyfhaiwvfvox.supabase.co/functions/v1/avisos',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_cron')),
      body := '{"accion":"diario"}'::jsonb, timeout_milliseconds := 120000)
  $job$);
  -- Cada 10 minutos, por si algún aviso a Slack quedó pendiente.
  perform cron.schedule('avisos-cola', '*/10 * * * *', $job$
    select net.http_post(url := 'https://mefnrchslyfhaiwvfvox.supabase.co/functions/v1/avisos',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_cron')),
      body := '{"accion":"cola"}'::jsonb, timeout_milliseconds := 60000)
    where exists (select 1 from public.notificaciones where slack = 'pendiente' and created_at > now() - interval '1 day')
  $job$);
end $$;

-- =====================================================================
-- Arranque limpio: borra los datos de prueba y conserva la configuración
-- (equipo, opciones, flujos, ajustes, cuentas, colaboradores, sueldos, conceptos fijos e integraciones).
-- =====================================================================
create or replace function public.reset_datos(confirmacion text) returns jsonb language plpgsql security definer set search_path = public, private as $$
declare t text; n int; total int := 0;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede hacer esto'; end if;
  if confirmacion is distinct from 'BORRAR TODO' then raise exception 'Escribí BORRAR TODO para confirmar'; end if;
  foreach t in array array['notificaciones', 'comentarios', 'briefs', 'pedidos', 'informes_redes', 'piezas', 'redes_meses', 'entregas', 'sitios', 'tareas',
    'liquidaciones', 'imputaciones', 'comprobantes_pago', 'movimientos', 'gestiones', 'drive_archivos', 'emails', 'ia_log', 'propuestas',
    'resumenes', 'facturas', 'proyecto_facturacion', 'proyecto_finanzas', 'precios_abono', 'abono_finanzas', 'comunicaciones', 'contactos',
    'clientes_admin', 'proyecto_responsables', 'abono_responsables', 'cliente_responsables', 'proyectos', 'abonos', 'clientes', 'errores'] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I', t);
      get diagnostics n = row_count; total := total + n;
    end if;
  end loop;
  if to_regclass('private.numeracion') is not null then delete from private.numeracion; end if;
  return jsonb_build_object('ok', true, 'borrados', total);
end $$;

-- =====================================================================
-- Permisos de las funciones y tiempo real
-- =====================================================================
revoke execute on function public.portal_yo(), public.portal_datos(uuid), public.portal_responder(text, uuid, text, text), public.portal_comentar(text, uuid, text),
  public.portal_pedido(uuid, text, text, date), public.portal_checklist(uuid, int, boolean), public.portal_archivos(text, uuid), public.reset_datos(text) from public, anon;
grant execute on function public.portal_yo(), public.portal_datos(uuid), public.portal_responder(text, uuid, text, text), public.portal_comentar(text, uuid, text),
  public.portal_pedido(uuid, text, text, date), public.portal_checklist(uuid, int, boolean), public.portal_archivos(text, uuid), public.reset_datos(text) to authenticated;
revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

do $$ declare t text; begin
  foreach t in array array['tareas', 'flujos', 'notificaciones', 'comentarios', 'redes_meses', 'piezas', 'entregas', 'sitios', 'pedidos', 'informes_redes', 'briefs'] loop
    begin execute format('alter publication supabase_realtime add table public.%I', t); exception when others then null; end;
  end loop;
end $$;
