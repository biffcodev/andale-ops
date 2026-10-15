-- 0017 · Registro de horas (el reloj de la barra de arriba)
-- Cada persona anota en qué estuvo trabajando: cliente, proyecto / abono / ticket (opcional), tiempo y una nota opcional.
-- Reemplaza las horas sueltas que se pedían al cerrar tareas, en piezas, en el mes de redes y en tickets
-- (esas columnas quedan para no perder lo ya cargado, pero la app deja de pedirlas).
-- Se puede correr más de una vez.

create table if not exists public.horas (
  id uuid primary key default gen_random_uuid(),
  persona_id uuid not null default private.mi_persona() references public.personas(id) on delete cascade,
  fecha date not null default (now() at time zone 'America/Argentina/Cordoba')::date,
  cliente_id uuid references public.clientes(id) on delete cascade,
  proyecto_id uuid references public.proyectos(id) on delete set null,
  abono_id uuid references public.abonos(id) on delete set null,
  pedido_id uuid references public.pedidos(id) on delete set null,
  minutos int not null check (minutos > 0 and minutos <= 1440),
  nota text not null default '' check (length(nota) <= 1000),
  created_at timestamptz not null default now()
);
create index if not exists horas_persona_fecha on public.horas (persona_id, fecha);
create index if not exists horas_cliente_fecha on public.horas (cliente_id, fecha);
create index if not exists horas_proyecto on public.horas (proyecto_id) where proyecto_id is not null;
create index if not exists horas_pedido on public.horas (pedido_id) where pedido_id is not null;

alter table public.horas enable row level security;
drop policy if exists horas_sel on public.horas;
drop policy if exists horas_ins on public.horas;
drop policy if exists horas_upd on public.horas;
drop policy if exists horas_del on public.horas;
-- Cada uno ve y carga lo suyo; las socias y el equipo ven todo (para saber cuánto deja cada cliente).
create policy horas_sel on public.horas for select to authenticated using (public.es_staff() or persona_id = private.mi_persona());
create policy horas_ins on public.horas for insert to authenticated with check (public.es_miembro() and persona_id = private.mi_persona());
create policy horas_upd on public.horas for update to authenticated using (persona_id = private.mi_persona() or public.es_admin()) with check (persona_id = private.mi_persona() or public.es_admin());
create policy horas_del on public.horas for delete to authenticated using (persona_id = private.mi_persona() or public.es_admin());
revoke all on public.horas from anon;
grant select, insert, update, delete on public.horas to authenticated;

-- "Empezar de cero" también borra el registro de horas.
create or replace function public.reset_datos(confirmacion text) returns jsonb language plpgsql security definer set search_path = public, private as $$
declare t text; n int; total int := 0;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede hacer esto'; end if;
  if confirmacion is distinct from 'BORRAR TODO' then raise exception 'Escribí BORRAR TODO para confirmar'; end if;
  foreach t in array array['horas', 'notificaciones', 'comentarios', 'briefs', 'pedidos', 'informes_redes', 'piezas', 'redes_meses', 'entregas', 'sitios', 'tareas',
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
revoke execute on function public.reset_datos(text) from public, anon;
grant execute on function public.reset_datos(text) to authenticated;
