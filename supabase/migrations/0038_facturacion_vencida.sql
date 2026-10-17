-- Clientes a los que se les factura a mes vencido (después del mes del servicio).
-- La app lo usa para saber de qué mes es cada factura que se carga desde Drive.
alter table public.clientes_admin add column if not exists facturacion text not null default 'adelantado';
alter table public.clientes_admin drop constraint if exists clientes_admin_facturacion_check;
alter table public.clientes_admin add constraint clientes_admin_facturacion_check check (facturacion in ('adelantado', 'vencido'));
