-- Copia de respaldo de los PDF de facturas (opcional: se activa en Configuración → Ajustes).
-- La Edge Function `asistente` baja el PDF de Drive y lo guarda en el bucket privado `facturas`.
-- El bucket no tiene políticas: solo la función (service role) lee y escribe; la app pide un link temporal.

alter table public.facturas add column if not exists pdf_respaldo text;  -- ruta dentro del bucket

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('facturas', 'facturas', false, 10485760, array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array['application/pdf', 'image/png', 'image/jpeg', 'image/webp'];

-- La vista de saldos tiene que ver la columna nueva.
drop view if exists public.facturas_saldo;
create view public.facturas_saldo with (security_invoker = true) as
select f.*,
  coalesce((select sum(m.ingreso) from public.movimientos m where m.factura_id = f.id), 0) as cobrado,
  f.monto - coalesce((select sum(m.ingreso) from public.movimientos m where m.factura_id = f.id), 0) as saldo
from public.facturas f where not f.anulada;
revoke all on public.facturas_saldo from anon;
grant select on public.facturas_saldo to authenticated;
