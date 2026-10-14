-- Registro de emails enviados desde la app (los envía la Edge Function `enviar-email` vía Resend).
create table if not exists public.emails (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  persona_id uuid references public.personas(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  factura_id uuid references public.facturas(id) on delete set null,
  tipo text not null default 'Otro' check (tipo in ('Resumen de cuenta','Factura enviada','Recordatorio de pago','Aviso de aumento','Otro')),
  periodo date,
  para text[] not null,
  cc text[] not null default '{}',
  asunto text not null,
  adjuntos text[] not null default '{}',
  estado text not null check (estado in ('Enviado','Error')),
  proveedor_id text,
  error text
);
create index if not exists emails_cliente_idx on public.emails (cliente_id, created_at desc);
alter table public.emails enable row level security;
create policy emails_admin on public.emails for all to authenticated using (public.es_admin()) with check (public.es_admin());
revoke all on public.emails from anon;

-- La gestión puede apuntar al email que la originó
alter table public.gestiones add column if not exists email_id uuid references public.emails(id) on delete set null;
