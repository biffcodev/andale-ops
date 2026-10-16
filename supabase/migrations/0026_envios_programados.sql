-- 0026 · Envío programado de los resúmenes de cuenta (con confirmación)
-- 1) En Cobros del mes se programa el envío: qué resúmenes, el día y la hora.
-- 2) El día antes, la app les avisa a los administradores para que los revisen. Sin confirmación no sale nada.
-- 3) Al confirmar, la app deja armado cada mail con su PDF (tal cual lo vio quien confirmó).
-- 4) A la hora programada, la función `envios` los manda. Si un resumen se cambió después de confirmar, ese no sale y se avisa.

create table if not exists public.envios_programados (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  tipo text not null default 'Resumen de cuenta' check (tipo in ('Resumen de cuenta')),
  periodo date not null,
  enviar_el timestamptz not null,
  estado text not null default 'Esperando confirmación'
    check (estado in ('Esperando confirmación', 'Confirmado', 'Enviando', 'Enviado', 'Con errores', 'Vencido', 'Cancelado')),
  resumen_ids uuid[] not null default '{}',
  asunto text not null default '',
  mensaje text not null default '',
  copia boolean not null default true,
  creado_por uuid references public.personas(id) on delete set null,
  confirmado_por uuid references public.personas(id) on delete set null,
  confirmado_at timestamptz,
  avisado_at timestamptz,
  enviado_at timestamptz,
  resultado jsonb not null default '{}'::jsonb
);
create index if not exists envios_programados_estado_idx on public.envios_programados (estado, enviar_el);

create table if not exists public.envios_items (
  id uuid primary key default gen_random_uuid(),
  envio_id uuid not null references public.envios_programados(id) on delete cascade,
  resumen_id uuid references public.resumenes(id) on delete set null,
  cliente_id uuid references public.clientes(id) on delete set null,
  para text[] not null default '{}',
  asunto text not null default '',
  html text not null default '',
  texto text not null default '',
  pdf_nombre text not null default '',
  pdf_base64 text not null default '',
  huella text not null default '',              -- updated_at del resumen al confirmar: si cambió, no se manda
  estado text not null default 'Pendiente' check (estado in ('Pendiente', 'Enviado', 'Error', 'Cambió', 'Ya enviado')),
  error text,
  email_id uuid references public.emails(id) on delete set null,
  enviado_at timestamptz
);
create index if not exists envios_items_envio_idx on public.envios_items (envio_id);

-- Solo administradores (igual que la cobranza)
alter table public.envios_programados enable row level security;
alter table public.envios_items enable row level security;
drop policy if exists envios_admin on public.envios_programados;
drop policy if exists envios_items_admin on public.envios_items;
create policy envios_admin on public.envios_programados for all to authenticated using (public.es_admin()) with check (public.es_admin());
create policy envios_items_admin on public.envios_items for all to authenticated using (public.es_admin()) with check (public.es_admin());
revoke all on public.envios_programados, public.envios_items from anon;
grant select, insert, update, delete on public.envios_programados, public.envios_items to authenticated;

-- Cada 10 minutos, solo si hay algo para avisar o mandar (mismo secreto que los avisos: Vault 'avisos_cron').
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'envios-programados';
    perform cron.schedule('envios-programados', '*/10 * * * *', $job$
      select net.http_post(url := 'https://mefnrchslyfhaiwvfvox.supabase.co/functions/v1/envios',
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'avisos_cron')),
        body := '{"accion":"correr"}'::jsonb, timeout_milliseconds := 150000)
      where exists (select 1 from public.envios_programados
                    where (estado = 'Esperando confirmación' and ((avisado_at is null and enviar_el - interval '1 day' <= now()) or enviar_el <= now()))
                       or (estado = 'Confirmado' and enviar_el <= now()))
    $job$);
  end if;
end $$;

