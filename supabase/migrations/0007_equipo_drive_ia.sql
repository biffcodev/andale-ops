-- Equipo y proveedores (sueldos, honorarios, extras, aguinaldo, liquidación mensual),
-- facturas leídas desde Google Drive y registro de uso de la IA. Todo solo para administradores.

/* ---------- 1. Colaboradores: empleados, socias y proveedores ---------- */
create table if not exists public.colaboradores (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,                         -- como figura en Caja: "Cata Gabellieri"
  persona_id uuid unique references public.personas(id) on delete set null, -- si además entra a la app
  tipo text not null default 'Proveedor' check (tipo in ('Empleado', 'Socio', 'Proveedor')),
  vinculo text not null default '',             -- Relación de dependencia · Monotributo · Informal · Exterior
  rubro text not null default '',               -- Ads, Programación, Fotografía, Contenido, Contable…
  aguinaldo boolean not null default false,     -- si cobra aguinaldo (junio y diciembre)
  cuit text not null default '',
  banco text not null default '',
  cbu text not null default '',
  alias_cbu text not null default '',
  email text not null default '',
  tel text not null default '',
  ingreso date,
  egreso date,
  contrato text not null default '',            -- link al contrato o legajo
  otros_nombres text[] not null default '{}',   -- otras formas en que aparece en Caja
  activo boolean not null default true,
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists colaboradores_nombre_uq on public.colaboradores (lower(nombre));

-- Sueldo u honorario mensual con historial (cada aumento es una fila nueva)
create table if not exists public.remuneraciones (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  concepto text not null default 'Sueldo' check (concepto in ('Sueldo', 'Honorario')),
  desde date not null,                          -- primer día del mes desde el que rige
  monto numeric(14,2) not null,
  moneda text not null default 'ARS',
  motivo text not null default '',
  created_at timestamptz not null default now(),
  unique (colaborador_id, concepto, desde)
);

-- Extras fijos que se pagan con el sueldo: bondi, Adobe, internet…
create table if not exists public.conceptos_fijos (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  concepto text not null,
  monto numeric(14,2) not null,
  moneda text not null default 'ARS',
  desde date,
  hasta date,
  notas text not null default '',
  created_at timestamptz not null default now()
);

-- Liquidación del mes: lo que hay que pagar a cada uno. Pagado = tiene movimiento de Caja.
create table if not exists public.liquidaciones (
  id uuid primary key default gen_random_uuid(),
  periodo date not null,
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  tipo text not null default 'Otro' check (tipo in ('Sueldo', 'Honorario', 'Extra', 'Aguinaldo', 'Otro')),
  concepto text not null,
  monto numeric(14,2) not null,
  moneda text not null default 'ARS',
  movimiento_id uuid references public.movimientos(id) on delete set null,
  notas text not null default '',
  created_at timestamptz not null default now(),
  unique (periodo, colaborador_id, concepto)
);
create index if not exists liquidaciones_periodo_idx on public.liquidaciones (periodo);

alter table public.movimientos add column if not exists colaborador_id uuid references public.colaboradores(id) on delete set null;
create index if not exists movimientos_colab_idx on public.movimientos (colaborador_id);

drop trigger if exists colaboradores_upd on public.colaboradores;
create trigger colaboradores_upd before update on public.colaboradores for each row execute function public.set_updated_at();

-- Alta inicial desde Caja: cada contraparte de Costo Laboral y Proveedores pasa a ser un colaborador.
insert into public.colaboradores (nombre, persona_id, tipo, rubro, aguinaldo, activo)
select c.contraparte,
  (select m.persona_id from public.movimientos m where m.contraparte = c.contraparte and m.persona_id is not null
     group by m.persona_id order by count(*) desc limit 1),
  case when c.socio then 'Socio' when c.empleado then 'Empleado' else 'Proveedor' end,
  case when c.empleado or c.socio then '' else coalesce(c.rubro, '') end,
  c.empleado and not c.socio,
  c.ultimo >= current_date - 75
from (
  select contraparte,
    bool_or(subcuenta = 'Sueldos Socias') socio,
    bool_or(cuenta = 'Costo Laboral' and subcuenta <> 'Sueldos Socias') empleado,
    (array_agg(case subcuenta when 'Proveedor Ads' then 'Ads' when 'Proveedor Audiovisual' then 'Audiovisual'
       when 'Proveedor contenido' then 'Contenido' when 'Proveedor de Programacion' then 'Programación'
       when 'Servicios Contables' then 'Contable' end order by fecha desc) filter (where cuenta = 'Proveedores'))[1] rubro,
    max(fecha) ultimo
  from public.movimientos
  where egreso > 0 and cuenta in ('Costo Laboral', 'Proveedores') and coalesce(trim(contraparte), '') <> ''
  group by contraparte
) c
on conflict do nothing;

-- Si una persona quedó en dos colaboradores, el índice único de persona_id lo evita arriba; vincular pagos existentes:
update public.movimientos m set colaborador_id = k.id
from public.colaboradores k
where m.colaborador_id is null and m.egreso > 0 and lower(trim(m.contraparte)) = lower(k.nombre);

/* ---------- 2. Facturas en Google Drive ---------- */
-- La Edge Function `asistente` lista la carpeta (solo lectura, cuenta de servicio) y guarda acá cada PDF.
create table if not exists public.drive_archivos (
  id uuid primary key default gen_random_uuid(),
  file_id text not null unique,
  nombre text not null default '',
  mime text not null default '',
  carpeta text not null default '',             -- ruta dentro de la carpeta configurada
  link text not null default '',
  tamano bigint,
  modificado timestamptz,
  estado text not null default 'Nuevo' check (estado in ('Nuevo', 'Leído', 'Vinculado', 'Ignorado', 'Error')),
  datos jsonb not null default '{}'::jsonb,     -- lo que se sacó del nombre y del PDF (IA)
  factura_id uuid references public.facturas(id) on delete set null,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists drive_archivos_factura_idx on public.drive_archivos (factura_id);
drop trigger if exists drive_archivos_upd on public.drive_archivos;
create trigger drive_archivos_upd before update on public.drive_archivos for each row execute function public.set_updated_at();
-- Si se vincula un comprobante, el archivo queda como Vinculado; si se desvincula, vuelve a Leído.
create or replace function private.tg_drive_estado() returns trigger language plpgsql set search_path = public as $$
begin
  if new.factura_id is not null and new.estado <> 'Vinculado' then new.estado := 'Vinculado';
  elsif new.factura_id is null and new.estado = 'Vinculado' then new.estado := 'Leído'; end if;
  return new;
end $$;
drop trigger if exists drive_archivos_estado on public.drive_archivos;
create trigger drive_archivos_estado before insert or update of factura_id, estado on public.drive_archivos for each row execute function private.tg_drive_estado();

/* ---------- 3. Uso de la IA ---------- */
create table if not exists public.ia_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  persona_id uuid references public.personas(id) on delete set null,
  accion text not null,
  modelo text not null default '',
  tokens_in int not null default 0,
  tokens_out int not null default 0,
  ok boolean not null default true,
  error text
);
create index if not exists ia_log_fecha_idx on public.ia_log (created_at desc);

/* ---------- 4. Ajustes nuevos ---------- */
insert into public.ajustes (clave, valor) values
  ('drive', '{"carpeta": "", "carpeta_url": ""}'::jsonb),
  ('emisores', '{"Fer": {"cuit": ""}, "Jime": {"cuit": ""}}'::jsonb),
  ('asistente', '{"email_activo": true}'::jsonb)
on conflict (clave) do nothing;

/* ---------- 5. Permisos: solo administradores ---------- */
do $$ declare t text; begin
  foreach t in array array['colaboradores', 'remuneraciones', 'conceptos_fijos', 'liquidaciones', 'drive_archivos', 'ia_log'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.es_admin()) with check (public.es_admin())', t || '_admin', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.colaboradores, public.remuneraciones, public.conceptos_fijos, public.liquidaciones, public.drive_archivos;
exception when others then null; end $$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
