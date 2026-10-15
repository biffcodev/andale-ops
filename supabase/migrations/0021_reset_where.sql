-- 0021 · "Empezar de cero" fallaba con "DELETE requires a WHERE clause":
-- Supabase tiene activada una protección (safeupdate) que no deja borrar una tabla entera sin condición.
-- Se agrega "where true" (borra todo igual, a propósito) y se suman las tablas nuevas (seguimiento, horas).
create or replace function public.reset_datos(confirmacion text) returns jsonb language plpgsql security definer set search_path = public, private as $$
declare t text; n int; total int := 0;
begin
  if not public.es_admin() then raise exception 'Solo un administrador puede hacer esto'; end if;
  if confirmacion is distinct from 'BORRAR TODO' then raise exception 'Escribí BORRAR TODO para confirmar'; end if;
  perform set_config('andale.restaurando', '1', true); -- sin avisos mientras se borra
  foreach t in array array['seguimiento', 'notificaciones', 'comentarios', 'briefs', 'pedidos', 'informes_redes', 'piezas', 'redes_meses', 'entregas', 'sitios', 'horas', 'tareas',
    'liquidaciones', 'imputaciones', 'comprobantes_pago', 'movimientos', 'gestiones', 'drive_archivos', 'emails', 'ia_log', 'propuestas',
    'resumenes', 'facturas', 'proyecto_facturacion', 'proyecto_finanzas', 'precios_abono', 'abono_finanzas', 'comunicaciones', 'contactos',
    'clientes_admin', 'proyecto_responsables', 'abono_responsables', 'cliente_responsables', 'proyectos', 'abonos', 'clientes', 'errores'] loop
    if to_regclass('public.' || t) is not null then
      execute format('delete from public.%I where true', t);
      get diagnostics n = row_count; total := total + n;
    end if;
  end loop;
  if to_regclass('private.numeracion') is not null then delete from private.numeracion where true; end if;
  return jsonb_build_object('ok', true, 'borrados', total);
end $$;
revoke execute on function public.reset_datos(text) from public, anon;
grant execute on function public.reset_datos(text) to authenticated;
