-- 0022 · "Cliente desde": el mes y año en que empezó a trabajar con àndale (no hace falta el día).
-- Los que ya están cargados toman el mes en que se cargaron; se corrige desde la ficha.
alter table public.clientes add column if not exists desde date;
update public.clientes set desde = date_trunc('month', created_at)::date where desde is null;
