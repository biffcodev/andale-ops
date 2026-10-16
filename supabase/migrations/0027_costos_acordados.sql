-- 0027 · Lo acordado con cada proveedor por proyecto y los pagos a cuenta
-- Ej.: Cintia hace la web de Lomo Loco por 1.200. Se le paga a cuenta (500, 300, 400) a medida que entra plata
-- o cuando lo pide. La app muestra acordado / pagado / saldo, y el margen del proyecto se calcula contra lo acordado.
-- Solo administradores.

create table if not exists public.costos_acordados (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  colaborador_id uuid not null references public.colaboradores(id) on delete restrict,
  concepto text not null default '',            -- "Desarrollo web", "Fotos de producto"…
  monto numeric(14,2) not null check (monto >= 0),
  moneda text not null default 'ARS',
  cerrado boolean not null default false,       -- se dio por saldado (p. ej. se acordó un descuento): ya no se le debe nada
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists costos_acordados_proy_idx on public.costos_acordados (proyecto_id);
create index if not exists costos_acordados_colab_idx on public.costos_acordados (colaborador_id);

drop trigger if exists costos_acordados_upd on public.costos_acordados;
create trigger costos_acordados_upd before update on public.costos_acordados for each row execute function public.set_updated_at();

-- Cada pago a cuenta es un egreso de Caja asignado al proyecto; esta columna dice a qué acuerdo corresponde.
alter table public.imputaciones add column if not exists costo_id uuid references public.costos_acordados(id) on delete set null;
create index if not exists imputaciones_costo_idx on public.imputaciones (costo_id);

alter table public.costos_acordados enable row level security;
drop policy if exists costos_acordados_admin on public.costos_acordados;
create policy costos_acordados_admin on public.costos_acordados for all to authenticated using (public.es_admin()) with check (public.es_admin());
revoke all on public.costos_acordados from anon;
grant select, insert, update, delete on public.costos_acordados to authenticated;
