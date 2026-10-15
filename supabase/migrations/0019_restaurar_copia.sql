-- 0019 · Restaurar una copia de seguridad (Ajustes → Copia y datos → Cargar una copia)
-- Vuelve a poner los registros de la copia: los que faltan se crean y los que ya están se pisan con lo de la copia.
-- Lo que no está en la copia no se borra. Mientras restaura no se mandan avisos (si no, llegarían cientos).
-- Se puede correr más de una vez.

-- Los avisos no se crean mientras se restaura una copia.
create or replace function private.avisar(p_persona uuid, p_tipo text, p_titulo text, p_cuerpo text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('andale.restaurando', true), '') = 'si' then return; end if;
  if p_persona is null or p_persona is not distinct from private.mi_persona() then return; end if;
  if not exists (select 1 from public.personas where id = p_persona and activo) then return; end if;
  insert into public.notificaciones (persona_id, tipo, titulo, cuerpo, link, actor_id)
  values (p_persona, coalesce(p_tipo, ''), left(coalesce(p_titulo, ''), 200), left(coalesce(p_cuerpo, ''), 600), coalesce(p_link, ''), private.mi_persona());
end $$;

create or replace function public.restaurar_tabla(p_tabla text, p_filas jsonb)
returns integer language plpgsql security definer set search_path = public, private as $$
declare
  permitidas text[] := array['personas', 'listas', 'ajustes', 'plan_cuentas', 'cajas', 'colaboradores', 'remuneraciones', 'conceptos_fijos', 'flujos', 'clientes', 'clientes_admin', 'contactos', 'cliente_responsables', 'abonos', 'abono_responsables', 'abono_finanzas', 'precios_abono', 'proyectos', 'proyecto_responsables', 'proyecto_finanzas', 'proyecto_facturacion', 'tareas', 'comunicaciones', 'propuestas', 'resumenes', 'facturas', 'movimientos', 'imputaciones', 'liquidaciones', 'comprobantes_pago', 'gestiones', 'drive_archivos', 'emails', 'redes_meses', 'piezas', 'entregas', 'sitios', 'pedidos', 'briefs', 'informes_redes', 'comentarios', 'horas', 'automatizaciones'];
  claves text[]; cols text; pk text; upd text; n integer;
begin
  if not public.es_admin() then raise exception 'Solo las socias pueden restaurar una copia'; end if;
  if not (p_tabla = any(permitidas)) then raise exception 'Esa tabla no se restaura: %', p_tabla; end if;
  if p_filas is null or jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) = 0 then return 0; end if;
  perform set_config('andale.restaurando', 'si', true);
  -- Solo las columnas que vienen en la copia (si la copia es de antes de una columna nueva, esa queda con su valor por defecto).
  select array_agg(k) into claves from jsonb_object_keys(p_filas -> 0) k;
  select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position) into cols
    from information_schema.columns c where c.table_schema = 'public' and c.table_name = p_tabla and c.is_generated = 'NEVER' and c.column_name = any(claves);
  select string_agg(quote_ident(a.attname), ', ') into pk
    from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
    where i.indrelid = ('public.' || quote_ident(p_tabla))::regclass and i.indisprimary;
  if cols is null or pk is null then raise exception 'La copia no coincide con la tabla %', p_tabla; end if;
  select string_agg(quote_ident(c.column_name) || ' = excluded.' || quote_ident(c.column_name), ', ') into upd
    from information_schema.columns c where c.table_schema = 'public' and c.table_name = p_tabla and c.is_generated = 'NEVER' and c.column_name = any(claves)
      and c.column_name not in (select a.attname from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = any(i.indkey)
        where i.indrelid = ('public.' || quote_ident(p_tabla))::regclass and i.indisprimary);
  execute format('insert into public.%I (%s) select %s from jsonb_populate_recordset(null::public.%I, $1) on conflict (%s) do %s',
    p_tabla, cols, cols, p_tabla, pk, case when upd is null then 'nothing' else 'update set ' || upd end) using p_filas;
  get diagnostics n = row_count;
  if p_tabla = 'pedidos' then
    perform setval(pg_get_serial_sequence('public.pedidos', 'numero'), greatest(coalesce((select max(numero) from public.pedidos), 0), 1));
  end if;
  return n;
end $$;
revoke execute on function public.restaurar_tabla(text, jsonb) from public, anon;
grant execute on function public.restaurar_tabla(text, jsonb) to authenticated;
