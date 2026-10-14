-- Fijos (abonos) y variables (proyectos): estado automático de clientes, etapas, presupuesto y plan de pagos,
-- pauta de Ads separada de la gestión, e imputación de costos de proveedores para ver margen.

/* ---------- 1. Estado automático del cliente ---------- */
alter table public.clientes add column if not exists estado_manual boolean not null default false;
-- "A confirmar" y "Pausado" son decisiones humanas: quedan fijadas.
update public.clientes set estado_manual = true where estado in ('A confirmar', 'Pausado');

create or replace function private.estado_cliente_auto(cid uuid) returns text
language sql stable security definer set search_path = public as $$
  select case
    when exists (select 1 from public.abonos a where a.cliente_id = cid and a.estado = 'Activo') then 'Activo'
    when exists (select 1 from public.proyectos p where p.cliente_id = cid and p.estado not in ('Entregado', 'Cancelado')) then 'Proyectos'
    else 'Inactivo' end
$$;

create or replace function private.recalc_cliente(cid uuid) returns void
language sql volatile security definer set search_path = public as $$
  update public.clientes c set estado = private.estado_cliente_auto(cid)
  where c.id = cid and not c.estado_manual and c.estado is distinct from private.estado_cliente_auto(cid)
$$;

create or replace function private.tg_recalc_desde_trabajo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op in ('INSERT', 'UPDATE') then perform private.recalc_cliente(new.cliente_id); end if;
  if tg_op in ('UPDATE', 'DELETE') and (tg_op = 'DELETE' or old.cliente_id is distinct from new.cliente_id) then perform private.recalc_cliente(old.cliente_id); end if;
  return null;
end $$;

create or replace function private.tg_cliente_estado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not new.estado_manual then new.estado := private.estado_cliente_auto(new.id); end if;
  return new;
end $$;

drop trigger if exists abonos_recalc_cliente on public.abonos;
create trigger abonos_recalc_cliente after insert or update of estado, cliente_id or delete on public.abonos for each row execute function private.tg_recalc_desde_trabajo();
drop trigger if exists proyectos_recalc_cliente on public.proyectos;
create trigger proyectos_recalc_cliente after insert or update of estado, cliente_id or delete on public.proyectos for each row execute function private.tg_recalc_desde_trabajo();
drop trigger if exists clientes_estado_auto on public.clientes;
create trigger clientes_estado_auto before insert or update on public.clientes for each row execute function private.tg_cliente_estado();

update public.clientes set estado_manual = estado_manual where not estado_manual; -- dispara el cálculo inicial

/* ---------- 2. Etapas de proyecto ---------- */
-- [{ "n": "Brief", "ok": true }, …] — se inicializa con la plantilla del tipo (listas 'etapas:<Tipo>').
alter table public.proyectos add column if not exists etapas jsonb not null default '[]'::jsonb;

insert into public.listas (clave, valores) values
  ('etapas:Branding', array['Brief', 'Investigación y estrategia', 'Concepto y propuesta', 'Presentación', 'Ajustes', 'Desarrollo del sistema', 'Manual de marca', 'Entrega de archivos']),
  ('etapas:Packaging', array['Brief', 'Relevamiento', 'Propuestas', 'Ajustes', 'Artes finales', 'Prueba de impresión', 'Entrega']),
  ('etapas:Web', array['Brief y estructura', 'Diseño', 'Desarrollo', 'Carga de contenido', 'Revisión', 'Publicación']),
  ('etapas:Diseño', array['Brief', 'Propuesta', 'Ajustes', 'Artes finales', 'Entrega']),
  ('etapas:Audiovisual', array['Preproducción', 'Producción', 'Edición', 'Revisión', 'Entrega'])
on conflict (clave) do nothing;
update public.listas set valores = array_append(valores, 'Packaging') where clave = 'tipos' and not ('Packaging' = any(valores));
update public.listas set valores = array_prepend('Presupuestado', valores) where clave = 'estadosProyecto' and not ('Presupuestado' = any(valores));

/* ---------- 3. Presupuesto y plan de pagos (solo admins) ---------- */
create table if not exists public.proyecto_finanzas (
  proyecto_id uuid primary key references public.proyectos(id) on delete cascade,
  presupuesto numeric,
  moneda text not null default 'ARS',
  plan_pago text not null default 'Personalizado',
  inicio_cobro date,
  notas text not null default '',
  updated_at timestamptz not null default now()
);

/* ---------- 4. Ads: inversión en pauta separada del honorario (solo admins) ---------- */
create table if not exists public.abono_finanzas (
  abono_id uuid primary key references public.abonos(id) on delete cascade,
  inversion numeric,
  inversion_moneda text not null default 'ARS',
  inversion_paga text not null default 'Cliente' check (inversion_paga in ('Cliente', 'àndale')),
  plataformas text not null default '',
  notas text not null default '',
  updated_at timestamptz not null default now()
);

/* ---------- 5. Costos: imputación de egresos a abonos o proyectos (solo admins) ---------- */
create table if not exists public.imputaciones (
  id uuid primary key default gen_random_uuid(),
  movimiento_id uuid not null references public.movimientos(id) on delete cascade,
  abono_id uuid references public.abonos(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete cascade,
  monto numeric not null,
  created_at timestamptz not null default now(),
  check ((abono_id is null) <> (proyecto_id is null))
);
create index if not exists imputaciones_mov_idx on public.imputaciones (movimiento_id);

do $$ declare t text; begin
  foreach t in array array['proyecto_finanzas', 'abono_finanzas', 'imputaciones'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_admin', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.es_admin()) with check (public.es_admin())', t || '_admin', t);
    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

revoke execute on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;
