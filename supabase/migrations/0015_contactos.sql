-- Varios contactos por cliente (dueño, marketing, administración…), con quién recibe los resúmenes de cuenta.
-- Los campos contacto/email/tel de clientes quedan como "contacto principal" (la app los mantiene sincronizados).

create table if not exists public.contactos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  nombre text not null default '',
  rol text not null default '',              -- Dueña, Marketing, Administración, Diseño…
  email text not null default '',
  tel text not null default '',
  principal boolean not null default false,  -- con quien se habla del día a día
  cobros boolean not null default false,     -- recibe resúmenes de cuenta, facturas y recordatorios
  notas text not null default '',
  orden int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists contactos_cliente on public.contactos (cliente_id);
drop trigger if exists contactos_upd on public.contactos;
create trigger contactos_upd before update on public.contactos for each row execute function public.set_updated_at();

alter table public.contactos enable row level security;
drop policy if exists contactos_staff on public.contactos;
create policy contactos_staff on public.contactos for all to authenticated using (public.es_staff()) with check (public.es_staff());
revoke all on public.contactos from anon;

-- Pasar el contacto que ya tiene cada cliente.
insert into public.contactos (cliente_id, nombre, email, tel, principal, cobros)
select c.id, c.contacto, lower(trim(split_part(regexp_replace(c.email, '[;\s]+', ',', 'g'), ',', 1))), c.tel, true, true
from public.clientes c
where (coalesce(c.contacto, '') <> '' or coalesce(c.email, '') <> '' or coalesce(c.tel, '') <> '')
  and not exists (select 1 from public.contactos k where k.cliente_id = c.id);

-- Los demás emails (de facturación o un segundo mail en la ficha) como contacto de Administración que recibe los resúmenes.
insert into public.contactos (cliente_id, nombre, rol, email, cobros, orden)
select s.cliente_id, 'Administración', 'Administración', e.mail, true, 1
from (
  select ca.cliente_id, coalesce(ca.email_facturacion, '') as lista from public.clientes_admin ca
  union all
  select c.id, coalesce(c.email, '') from public.clientes c
) s
cross join lateral (select distinct lower(trim(x)) as mail from unnest(string_to_array(regexp_replace(s.lista, '[;\s]+', ',', 'g'), ',')) x where trim(x) like '%@%') e
where not exists (select 1 from public.contactos k where k.cliente_id = s.cliente_id and lower(k.email) = e.mail)
group by s.cliente_id, e.mail;

do $$ begin
  alter publication supabase_realtime add table public.contactos;
exception when others then null; end $$;
