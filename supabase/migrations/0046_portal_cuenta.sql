-- 0046 · Portal: todo lo del cliente a la vista
-- portal_cuenta devuelve sus datos, los contactos de su empresa, los servicios que tiene con àndale (el precio solo
-- a quien recibe la facturación), el equipo de àndale que trabaja con ellos y su marca (kit y ficha, para el manual).
-- Se puede correr más de una vez.

create or replace function public.portal_cuenta(p_cliente uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare k uuid; cobra boolean; out jsonb;
begin
  k := private.portal_contacto(p_cliente);
  if k is null then raise exception 'No tenés acceso a este cliente'; end if;
  select coalesce(cobros, false) into cobra from public.contactos where id = k;
  select jsonb_build_object(
    'datos', (select jsonb_build_object('nombre', c.nombre, 'web', c.web, 'email', c.email, 'tel', c.tel, 'redes', c.redes, 'desde', c.desde, 'avatar', c.avatar_url) from public.clientes c where c.id = p_cliente),
    'contactos', coalesce((select jsonb_agg(jsonb_build_object('nombre', x.nombre, 'rol', x.rol, 'email', x.email, 'tel', x.tel, 'principal', x.principal, 'portal', x.portal, 'cobros', x.cobros, 'yo', x.id = k) order by x.principal desc, x.orden, x.nombre)
      from public.contactos x where x.cliente_id = p_cliente), '[]'::jsonb),
    'servicios', coalesce((select jsonb_agg(jsonb_build_object('tipo', a.tipo, 'plan', a.plan, 'desde', a.desde, 'hasta', a.hasta, 'estado', a.estado, 'redes', a.redes,
        'precio', case when cobra then (select jsonb_build_object('monto', p.monto, 'moneda', p.moneda, 'desde', p.desde) from public.precios_abono p where p.abono_id = a.id and p.desde <= current_date order by p.desde desc limit 1) end) order by a.estado, a.tipo)
      from public.abonos a where a.cliente_id = p_cliente and a.estado <> 'Baja'), '[]'::jsonb),
    'equipo', coalesce((select jsonb_agg(jsonb_build_object('nombre', coalesce(nullif(pe.nombre, ''), pe.alias), 'alias', pe.alias, 'puesto', pe.puesto, 'avatar', pe.avatar_url, 'roles', r.roles) order by pe.alias)
      from (select persona_id, array_remove(array_agg(distinct nullif(rol, '')), null) roles from (
          select ar.persona_id, ar.rol from public.abono_responsables ar join public.abonos a on a.id = ar.abono_id where a.cliente_id = p_cliente and a.estado = 'Activo'
          union all select cr.persona_id, '' from public.cliente_responsables cr where cr.cliente_id = p_cliente
          union all select pr.persona_id, '' from public.proyecto_responsables pr join public.proyectos p on p.id = pr.proyecto_id where p.cliente_id = p_cliente and p.estado not in ('Cancelado', 'Entregado')
        ) t group by persona_id) r join public.personas pe on pe.id = r.persona_id where pe.activo and pe.rol::text <> 'externo'), '[]'::jsonb),
    'marca', (select jsonb_strip_nulls(jsonb_build_object(
      'kit', c.marca -> 'kit', 'manual', c.marca -> 'manual', 'visual', c.marca -> 'visual',
      'rubro', c.marca -> 'rubro', 'publico', c.marca -> 'publico', 'tono', c.marca -> 'tono', 'trato', c.marca -> 'trato', 'emojis', c.marca -> 'emojis',
      'palabras_si', c.marca -> 'palabras_si', 'palabras_no', c.marca -> 'palabras_no', 'pilares', c.marca -> 'pilares',
      'hashtags', c.marca -> 'hashtags', 'ejemplos', c.marca -> 'ejemplos', 'colores', c.marca -> 'colores', 'tipografias', c.marca -> 'tipografias'))
      from public.clientes c where c.id = p_cliente)
  ) into out;
  return out;
end $$;
grant execute on function public.portal_cuenta(uuid) to authenticated;
