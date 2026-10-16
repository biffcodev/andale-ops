-- 0028 · Piezas para Ads y contactos de proveedores

/* ---------- 1. Redes: piezas que van en Ads ---------- */
-- ''        = del plan de Redes (como hasta ahora)
-- 'tambien' = del plan, y además se pauta
-- 'solo'    = se diseñó aparte para los anuncios: no cuenta en el plan ni como extra
alter table public.piezas add column if not exists ads text not null default '';
do $$ begin
  alter table public.piezas add constraint piezas_ads_chk check (ads in ('', 'tambien', 'solo'));
exception when duplicate_object then null; end $$;

/* ---------- 2. Contactos de proveedores ---------- */
-- Un proveedor puede ser una empresa (Cronopia) o un equipo (MADS) con varias personas.
create table if not exists public.contactos_proveedor (
  id uuid primary key default gen_random_uuid(),
  colaborador_id uuid not null references public.colaboradores(id) on delete cascade,
  nombre text not null default '',
  rol text not null default '',                 -- Socia, Diseño, Administración…
  email text not null default '',
  tel text not null default '',                 -- WhatsApp / celular
  tel_fijo text not null default '',
  principal boolean not null default false,     -- con quien se habla del día a día
  pagos boolean not null default false,         -- le mandamos los comprobantes de pago
  persona_id uuid references public.personas(id) on delete set null, -- si entra a la app
  notas text not null default '',
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contactos_proveedor_colab_idx on public.contactos_proveedor (colaborador_id);
drop trigger if exists contactos_proveedor_upd on public.contactos_proveedor;
create trigger contactos_proveedor_upd before update on public.contactos_proveedor for each row execute function public.set_updated_at();

alter table public.contactos_proveedor enable row level security;
drop policy if exists contactos_proveedor_admin on public.contactos_proveedor;
create policy contactos_proveedor_admin on public.contactos_proveedor for all to authenticated using (public.es_admin()) with check (public.es_admin());
revoke all on public.contactos_proveedor from anon;
grant select, insert, update, delete on public.contactos_proveedor to authenticated;

-- Pasar el email / teléfono que ya tiene cada proveedor como su contacto principal.
insert into public.contactos_proveedor (colaborador_id, nombre, email, tel, principal, pagos, persona_id)
select c.id, coalesce(nullif(p.nombre, ''), c.nombre), coalesce(c.email, ''), coalesce(c.tel, ''), true, true, c.persona_id
from public.colaboradores c
left join public.personas p on p.id = c.persona_id
where c.tipo = 'Proveedor'
  and (coalesce(c.email, '') <> '' or coalesce(c.tel, '') <> '' or c.persona_id is not null)
  and not exists (select 1 from public.contactos_proveedor k where k.colaborador_id = c.id);
