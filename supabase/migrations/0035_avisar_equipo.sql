-- 0035 · Avisos entre el equipo desde la app
-- Cuando se pasa el contenido del mes a otra etapa (por ejemplo, de Planificación a Diseño), se avisa a quienes les toca.
-- El aviso aparece en la campanita y, si Slack está conectado, también por Slack. No se avisa a uno mismo.
create or replace function public.avisar_equipo(p_personas uuid[], p_tipo text, p_titulo text, p_cuerpo text, p_link text)
returns int language plpgsql security definer set search_path = public as $$
declare x uuid; n int := 0;
begin
  if not public.es_staff() then raise exception 'Solo el equipo puede avisar'; end if;
  foreach x in array coalesce(p_personas, '{}'::uuid[]) loop
    perform private.avisar(x, p_tipo, p_titulo, p_cuerpo, p_link);
    n := n + 1;
  end loop;
  return n;
end $$;
revoke all on function public.avisar_equipo(uuid[], text, text, text, text) from public, anon;
grant execute on function public.avisar_equipo(uuid[], text, text, text, text) to authenticated;
