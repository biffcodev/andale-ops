-- àndale · Operaciones — esquema base y permisos por rol
-- Roles: admin (socios: todo), equipo (operativo, sin montos), externo (solo lo asignado).
-- Los permisos se aplican en la base (RLS), no solo en la interfaz.

create extension if not exists pgcrypto;

do $$ begin
  create type rol_t as enum ('admin','equipo','externo');
exception when duplicate_object then null; end $$;

-- ---------- utilidades ----------
create or replace function public.set_updated_at() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

-- ---------- personas (equipo + accesos) ----------
create table if not exists public.personas (
  id uuid primary key default gen_random_uuid(),
  alias text not null unique,              -- cómo le decimos: Fer, Jime, Yael
  nombre text not null default '',
  puesto text not null default '',          -- Art Director, Proveedora de Ads...
  email text unique,                       -- con este email entra a la app
  tel text not null default '',
  rol rol_t not null default 'equipo',
  activo boolean not null default true,
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger personas_upd before update on public.personas for each row execute function public.set_updated_at();

create or replace function public.mi_persona() returns uuid
language sql stable security definer set search_path = public as $$
  select id from personas where activo and email is not null and lower(email) = lower(auth.jwt() ->> 'email') limit 1
$$;
create or replace function public.mi_rol() returns rol_t
language sql stable security definer set search_path = public as $$
  select rol from personas where id = public.mi_persona()
$$;
create or replace function public.es_admin() returns boolean language sql stable set search_path = public as $$ select coalesce(public.mi_rol() = 'admin', false) $$;
create or replace function public.es_staff() returns boolean language sql stable set search_path = public as $$ select coalesce(public.mi_rol() in ('admin','equipo'), false) $$;
create or replace function public.es_miembro() returns boolean language sql stable set search_path = public as $$ select public.mi_persona() is not null $$;

-- Datos de quien está logueado (para la interfaz)
create or replace function public.yo() returns table(id uuid, alias text, nombre text, rol rol_t)
language sql stable security definer set search_path = public as $$
  select id, alias, nombre, rol from personas where id = public.mi_persona()
$$;

-- ---------- clientes ----------
create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  estado text not null default 'Activo',
  servicio text not null default '',
  plan text not null default '',
  contacto text not null default '',
  email text not null default '',
  tel text not null default '',
  web text not null default '',
  carpeta text not null default '',
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clientes_upd before update on public.clientes for each row execute function public.set_updated_at();

create table if not exists public.cliente_responsables (
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  persona_id uuid not null references public.personas(id) on delete cascade,
  primary key (cliente_id, persona_id)
);

-- ---------- abonos (servicios mensuales) ----------
create table if not exists public.abonos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  tipo text not null default 'Redes',
  plan text not null default '',
  desde date,                 -- primer día del mes de alta
  hasta date,                 -- último mes facturado si se dio de baja
  estado text not null default 'Activo' check (estado in ('Activo','Pausado','Baja')),
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger abonos_upd before update on public.abonos for each row execute function public.set_updated_at();

create table if not exists public.abono_responsables (
  abono_id uuid not null references public.abonos(id) on delete cascade,
  persona_id uuid not null references public.personas(id) on delete cascade,
  primary key (abono_id, persona_id)
);

-- ---------- proyectos (trabajos puntuales) ----------
create table if not exists public.proyectos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nombre text not null,
  tipo text not null default '',
  estado text not null default 'Por empezar',
  fecha_inicio date,
  entrega date,
  entrega_real date,
  entregables text not null default '',
  drive text not null default '',
  slides text not null default '',
  canva text not null default '',
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger proyectos_upd before update on public.proyectos for each row execute function public.set_updated_at();

create table if not exists public.proyecto_responsables (
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  persona_id uuid not null references public.personas(id) on delete cascade,
  primary key (proyecto_id, persona_id)
);

-- ---------- comunicaciones ----------
create table if not exists public.comunicaciones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  fecha date not null default current_date,
  canal text not null default '',
  con_quien text not null default '',
  resumen text not null default '',
  acuerdo text not null default '',
  proximo text not null default '',
  fecha_proximo date,
  hecho boolean not null default false,
  responsable_id uuid references public.personas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger comunicaciones_upd before update on public.comunicaciones for each row execute function public.set_updated_at();

-- ---------- listas de opciones ----------
create table if not exists public.listas (
  clave text primary key,
  valores text[] not null default '{}',
  updated_at timestamptz not null default now()
);

-- ---------- asignaciones de externos (sin recursión de RLS) ----------
create or replace function public.mis_proyectos() returns setof uuid
language sql stable security definer set search_path = public as $$
  select proyecto_id from proyecto_responsables where persona_id = public.mi_persona()
$$;
create or replace function public.mis_abonos() returns setof uuid
language sql stable security definer set search_path = public as $$
  select abono_id from abono_responsables where persona_id = public.mi_persona()
$$;
create or replace function public.mis_clientes() returns setof uuid
language sql stable security definer set search_path = public as $$
  select cliente_id from proyectos where id in (select public.mis_proyectos())
  union select cliente_id from abonos where id in (select public.mis_abonos())
  union select cliente_id from cliente_responsables where persona_id = public.mi_persona()
$$;

-- ---------- RLS: operaciones ----------
alter table public.personas enable row level security;
alter table public.clientes enable row level security;
alter table public.cliente_responsables enable row level security;
alter table public.abonos enable row level security;
alter table public.abono_responsables enable row level security;
alter table public.proyectos enable row level security;
alter table public.proyecto_responsables enable row level security;
alter table public.comunicaciones enable row level security;
alter table public.listas enable row level security;

create policy personas_sel on public.personas for select to authenticated using (public.es_miembro());
create policy personas_adm on public.personas for all to authenticated using (public.es_admin()) with check (public.es_admin());

create policy clientes_sel on public.clientes for select to authenticated using (public.es_staff() or id in (select public.mis_clientes()));
create policy clientes_ins on public.clientes for insert to authenticated with check (public.es_staff());
create policy clientes_upd on public.clientes for update to authenticated using (public.es_staff()) with check (public.es_staff());
create policy clientes_del on public.clientes for delete to authenticated using (public.es_staff());

create policy cresp_sel on public.cliente_responsables for select to authenticated using (public.es_staff() or cliente_id in (select public.mis_clientes()));
create policy cresp_w on public.cliente_responsables for all to authenticated using (public.es_staff()) with check (public.es_staff());

create policy abonos_sel on public.abonos for select to authenticated using (public.es_staff() or id in (select public.mis_abonos()));
create policy abonos_w on public.abonos for all to authenticated using (public.es_staff()) with check (public.es_staff());

create policy aresp_sel on public.abono_responsables for select to authenticated using (public.es_staff() or abono_id in (select public.mis_abonos()));
create policy aresp_w on public.abono_responsables for all to authenticated using (public.es_staff()) with check (public.es_staff());

create policy proy_sel on public.proyectos for select to authenticated using (public.es_staff() or id in (select public.mis_proyectos()));
create policy proy_ins on public.proyectos for insert to authenticated with check (public.es_staff());
create policy proy_upd on public.proyectos for update to authenticated using (public.es_staff() or id in (select public.mis_proyectos())) with check (public.es_staff() or id in (select public.mis_proyectos()));
create policy proy_del on public.proyectos for delete to authenticated using (public.es_staff());

create policy presp_sel on public.proyecto_responsables for select to authenticated using (public.es_staff() or proyecto_id in (select public.mis_proyectos()));
create policy presp_w on public.proyecto_responsables for all to authenticated using (public.es_staff()) with check (public.es_staff());

create policy com_sel on public.comunicaciones for select to authenticated using (public.es_staff() or responsable_id = public.mi_persona());
create policy com_ins on public.comunicaciones for insert to authenticated with check (public.es_staff() or (cliente_id in (select public.mis_clientes()) and responsable_id = public.mi_persona()));
create policy com_upd on public.comunicaciones for update to authenticated using (public.es_staff() or responsable_id = public.mi_persona()) with check (public.es_staff() or responsable_id = public.mi_persona());
create policy com_del on public.comunicaciones for delete to authenticated using (public.es_staff());

create policy listas_sel on public.listas for select to authenticated using (public.es_miembro());
create policy listas_w on public.listas for all to authenticated using (public.es_staff()) with check (public.es_staff());

-- Un externo no puede mover un proyecto a otro cliente
create or replace function public.proyectos_guard() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.es_staff() and new.cliente_id <> old.cliente_id then
    raise exception 'Solo el equipo puede cambiar el cliente de un proyecto';
  end if;
  return new;
end $$;
create trigger proyectos_guard before update on public.proyectos for each row execute function public.proyectos_guard();

-- ---------- Tiempo real ----------
do $$ begin
  alter publication supabase_realtime add table public.personas, public.clientes, public.cliente_responsables, public.abonos, public.abono_responsables, public.proyectos, public.proyecto_responsables, public.comunicaciones, public.listas;
exception when others then null; end $$;

-- Sin acceso para anon
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;
