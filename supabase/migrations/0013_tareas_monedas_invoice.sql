-- Proyectos con prioridad · USD recibidos en movimientos en otras monedas · Invoice con ítems y numeración · mails libres.

-- Prioridad del proyecto (las tareas viven en proyectos.etapas: [{ n, ok, resp, fecha, prio }])
alter table public.proyectos add column if not exists etapas jsonb not null default '[]'::jsonb;
alter table public.proyectos add column if not exists prioridad text not null default '';
alter table public.proyectos drop constraint if exists proyectos_prioridad_chk;
alter table public.proyectos add constraint proyectos_prioridad_chk check (prioridad in ('', 'Baja', 'Media', 'Alta', 'Urgente'));

-- Cuando entra (o sale) plata en EUR, GBP u otra moneda y se pasa a dólares: cuántos USD fueron de verdad.
alter table public.movimientos add column if not exists usd numeric(14,2);

-- Invoice para clientes del exterior: ítems y número propio INV-AAAA-001.
alter table public.facturas add column if not exists items jsonb not null default '[]'::jsonb;

insert into private.numeracion (tipo, anio, ultimo)
select 'INV', split_part(numero, '-', 2)::int, max(split_part(numero, '-', 3)::int)
from public.facturas where tipo = 'Invoice' and numero ~ '^INV-[0-9]{4}-[0-9]+$'
group by 2
on conflict (tipo, anio) do update set ultimo = greatest(private.numeracion.ultimo, excluded.ultimo);

create or replace function private.tg_invoice_numero() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.tipo = 'Invoice' and coalesce(new.numero, '') = '' then
    new.numero := private.siguiente_numero('INV', extract(year from now() at time zone 'America/Argentina/Cordoba')::int, 3);
  end if;
  return new;
end $$;
drop trigger if exists facturas_invoice_numero on public.facturas;
create trigger facturas_invoice_numero before insert or update of tipo, numero on public.facturas for each row execute function private.tg_invoice_numero();

-- Mails libres (novedades, pedidos de material, avisos) también quedan registrados.
alter table public.emails drop constraint if exists emails_tipo_check;
alter table public.emails add constraint emails_tipo_check check (tipo in ('Resumen de cuenta','Factura enviada','Recordatorio de pago','Aviso de aumento','Invoice','Mensaje','Otro'));

-- La vista de saldos tiene que ver la columna nueva (items).
drop view if exists public.facturas_saldo;
create view public.facturas_saldo with (security_invoker = true) as
select f.*,
  coalesce((select sum(m.ingreso) from public.movimientos m where m.factura_id = f.id), 0) as cobrado,
  f.monto - coalesce((select sum(m.ingreso) from public.movimientos m where m.factura_id = f.id), 0) as saldo
from public.facturas f where not f.anulada;
revoke all on public.facturas_saldo from anon;
grant select on public.facturas_saldo to authenticated;
