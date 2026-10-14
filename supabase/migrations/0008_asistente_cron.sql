-- Resumen mensual del asistente por email: pg_cron llama a la Edge Function `asistente` los días 1 y 8 a las 9 (Córdoba).
-- La función valida el pedido con un secreto aleatorio guardado en Vault (no hace falta copiar ninguna clave a mano).
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

do $$ begin
  if not exists (select 1 from vault.secrets where name = 'asistente_cron') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(24), 'hex'), 'asistente_cron', 'Secreto para el disparo programado del asistente');
  end if;
end $$;

-- Solo la Edge Function (service_role) puede verificar el secreto.
create or replace function public.asistente_cron_ok(s text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(length(s) >= 32 and exists (select 1 from vault.decrypted_secrets where name = 'asistente_cron' and decrypted_secret = s), false)
$$;
revoke execute on function public.asistente_cron_ok(text) from public, anon, authenticated;
grant execute on function public.asistente_cron_ok(text) to service_role;

select cron.unschedule(jobid) from cron.job where jobname = 'asistente-cierre';
select cron.schedule('asistente-cierre', '0 12 1,8 * *', $job$
  select net.http_post(
    url := 'https://mefnrchslyfhaiwvfvox.supabase.co/functions/v1/asistente',
    headers := jsonb_build_object('Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'asistente_cron')),
    body := '{"accion":"cron_cierre"}'::jsonb,
    timeout_milliseconds := 120000
  )
$job$);
