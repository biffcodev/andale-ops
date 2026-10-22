-- 0043 · Proyectos en el portal: en qué estamos y lo que le toca al cliente
-- Cada tarea tiene "portal": 'ver' (el cliente la ve en la hoja de ruta, es lo de siempre), 'oculta' (interna, no la ve)
-- o 'hace' (la hace el cliente: la ve como pendiente suya y la puede tildar; al equipo le llega el aviso).
-- El portal recibe la hoja de ruta de cada proyecto (sin las tareas internas) y la fecha de inicio.
-- Se puede correr más de una vez.

alter table public.tareas add column if not exists portal text not null default 'ver';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'tareas_portal_chk') then
    alter table public.tareas add constraint tareas_portal_chk check (portal in ('ver', 'oculta', 'hace'));
  end if;
end $$;

-- El cliente tilda una tarea que le toca a él. Avisa a quien lleva la tarea y el proyecto.
create or replace function public.portal_tarea(p_id uuid, p_ok boolean)
returns jsonb language plpgsql security definer set search_path = public as $$
declare t record; k uuid; nom text; cli text; m uuid;
begin
  select ta.*, p.cliente_id, p.nombre as proyecto into t from public.tareas ta join public.proyectos p on p.id = ta.proyecto_id where ta.id = p_id;
  if t.id is null then raise exception 'No tenés acceso a esto'; end if;
  k := private.portal_contacto(t.cliente_id);
  if k is null then raise exception 'No tenés acceso a esto'; end if;
  if t.portal <> 'hace' then raise exception 'Esa tarea la hace el equipo'; end if;
  update public.tareas set hecha = coalesce(p_ok, false), en_curso = false, hecha_at = case when coalesce(p_ok, false) then now() else null end, hecha_por = null where id = p_id;
  if coalesce(p_ok, false) then
    select coalesce(nullif(nombre, ''), email) into nom from public.contactos where id = k;
    select nombre into cli from public.clientes where id = t.cliente_id;
    for m in select x from private.responsables_de('tarea', p_id) x
             union select persona_id from public.cliente_responsables where cliente_id = t.cliente_id
               and not exists (select 1 from private.responsables_de('tarea', p_id)) loop
      perform private.avisar(m, 'cliente', coalesce(cli, 'Un cliente') || ': ' || coalesce(nom, 'el cliente') || ' completó «' || left(t.titulo, 120) || '»', t.proyecto, private.link_de('tarea', p_id));
    end loop;
  end if;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.portal_tarea(uuid, boolean) to authenticated;

-- Comentar una tarea del cliente desde el portal (p. ej. "te lo mandé por mail").
create or replace function public.portal_comentar(p_entidad text, p_id uuid, p_texto text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c uuid; k uuid; nom text; pid uuid; txt text := btrim(left(coalesce(p_texto, ''), 4000));
begin
  if txt = '' then raise exception 'El comentario está vacío'; end if;
  if p_entidad = 'pieza' then select z.cliente_id into c from public.piezas z join public.redes_meses m on m.id = z.mes_id where z.id = p_id and m.visible_cliente and private.pieza_visible(z.estado);
  elsif p_entidad = 'mes' then select cliente_id into c from public.redes_meses where id = p_id and visible_cliente;
  elsif p_entidad = 'entrega' then select cliente_id, proyecto_id into c, pid from public.entregas where id = p_id and estado <> 'Borrador';
  elsif p_entidad = 'sitio' then select cliente_id, proyecto_id into c, pid from public.sitios where id = p_id and visible_cliente;
  elsif p_entidad = 'pedido' then select cliente_id into c from public.pedidos where id = p_id;
  elsif p_entidad = 'proyecto' then select cliente_id, id into c, pid from public.proyectos where id = p_id;
  elsif p_entidad = 'tarea' then select p.cliente_id, p.id into c, pid from public.tareas t join public.proyectos p on p.id = t.proyecto_id where t.id = p_id and t.portal <> 'oculta';
  else raise exception 'Entidad inválida'; end if;
  k := private.portal_contacto(c);
  if c is null or k is null then raise exception 'No tenés acceso a esto'; end if;
  select coalesce(nullif(nombre, ''), email) into nom from public.contactos where id = k;
  insert into public.comentarios (entidad, entidad_id, cliente_id, proyecto_id, autor_id, autor_contacto_id, autor_nombre, texto, interno)
  values (p_entidad, p_id, c, pid, null, k, nom, txt, false);
  return jsonb_build_object('ok', true);
end $$;

-- Lo que recibe el portal: igual que antes, más la hoja de ruta de cada proyecto (sin las tareas internas).
create or replace function public.portal_datos(p_cliente uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare k uuid; out jsonb;
begin
  k := private.portal_contacto(p_cliente);
  if k is null then raise exception 'No tenés acceso a este cliente'; end if;
  select jsonb_build_object(
    'cliente', (select jsonb_build_object('id', c.id, 'nombre', c.nombre, 'avatar', c.avatar_url) from public.clientes c where c.id = p_cliente),
    'yo', (select jsonb_build_object('id', id, 'nombre', nombre, 'rol', rol, 'cobros', cobros) from public.contactos where id = k),
    'meses', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'mes', m.mes, 'estado', m.estado, 'plan', m.plan, 'enviado_at', m.enviado_at, 'aprobado_at', m.aprobado_at, 'aprobado_por', m.aprobado_por,
        'piezas', coalesce((select jsonb_agg(jsonb_build_object('id', z.id, 'formato', z.formato, 'red', z.red, 'fecha', z.fecha, 'hora', to_char(z.hora, 'HH24:MI'),
            'tema', z.tema, 'copy', z.copy, 'hashtags', z.hashtags, 'estado', z.estado, 'artes', jsonb_array_length(z.arte), 'respuesta', z.respuesta_cliente, 'respondida_at', z.respondida_at, 'extra', z.extra)
            order by z.fecha nulls last, z.hora nulls last, z.orden) from public.piezas z where z.mes_id = m.id and private.pieza_visible(z.estado)), '[]'::jsonb)
      ) order by m.mes desc) from public.redes_meses m where m.cliente_id = p_cliente and m.visible_cliente and m.mes >= date_trunc('month', current_date) - interval '6 months'), '[]'::jsonb),
    'proyectos', coalesce((select jsonb_agg(jsonb_build_object(
        'id', p.id, 'nombre', p.nombre, 'tipo', p.tipo, 'estado', p.estado, 'etapa', p.etapa_actual, 'entrega', p.entrega, 'inicio', p.fecha_inicio,
        'avance', (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where hecha) / count(*)) end from public.tareas t where t.proyecto_id = p.id and t.portal <> 'oculta'),
        'hoja', coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'titulo', t.titulo, 'hecha', t.hecha, 'en_curso', t.en_curso, 'fecha', t.fecha, 'hecha_at', t.hecha_at, 'hace', t.portal = 'hace')
            order by t.orden, t.created_at) from public.tareas t where t.proyecto_id = p.id and t.portal <> 'oculta'), '[]'::jsonb),
        'entregas', coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'tipo', e.tipo, 'titulo', e.titulo, 'descripcion', e.descripcion, 'links', e.links,
            'archivos', jsonb_array_length(e.archivos), 'estado', e.estado, 'enviada_at', e.enviada_at, 'respondida_at', e.respondida_at, 'aprobado_por', e.aprobado_por, 'respuesta', e.respuesta)
            order by e.orden, e.created_at) from public.entregas e where e.proyecto_id = p.id and e.estado <> 'Borrador'), '[]'::jsonb),
        'sitio', (select jsonb_build_object('id', s.id, 'url_preview', s.url_preview, 'url_prod', s.url_prod, 'etapa', s.etapa, 'checklist', s.checklist, 'accesos', s.accesos)
            from public.sitios s where s.proyecto_id = p.id and s.visible_cliente)
      ) order by p.created_at desc) from public.proyectos p where p.cliente_id = p_cliente and p.estado not in ('Cancelado', 'Presupuestado', 'A confirmar')), '[]'::jsonb),
    'informes', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'mes', i.mes, 'datos', i.datos, 'texto', i.texto, 'publicado_at', i.publicado_at) order by i.mes desc)
      from public.informes_redes i where i.cliente_id = p_cliente and i.estado = 'Publicado'), '[]'::jsonb),
    'pedidos', coalesce((select jsonb_agg(jsonb_build_object('id', d.id, 'numero', d.numero, 'titulo', d.titulo, 'detalle', d.detalle, 'estado', d.estado, 'para_cuando', d.para_cuando,
        'autor', d.autor_nombre, 'respuesta', d.respuesta, 'cerrado_at', d.cerrado_at, 'created_at', d.created_at,
        'cobro', case when d.cobro in ('A facturar', 'Incluido en el abono', 'Sin cargo') then d.cobro else '' end) order by d.created_at desc)
      from public.pedidos d where d.cliente_id = p_cliente and (d.estado not in ('Hecho', 'Descartado') or d.cerrado_at > now() - interval '4 months')), '[]'::jsonb),
    'comentarios', coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'entidad', x.entidad, 'entidad_id', x.entidad_id, 'texto', x.texto, 'created_at', x.created_at,
        'autor', coalesce(nullif(x.autor_nombre, ''), (select coalesce(nullif(pe.nombre, ''), pe.alias) from public.personas pe where pe.id = x.autor_id), ''), 'de_cliente', x.autor_contacto_id is not null, 'pedido', x.pedido, 'resuelto_at', x.resuelto_at) order by x.created_at)
      from public.comentarios x where x.cliente_id = p_cliente and not x.interno and x.created_at > now() - interval '6 months'
        and (x.entidad <> 'tarea' or exists (select 1 from public.tareas t where t.id = x.entidad_id and t.portal <> 'oculta'))), '[]'::jsonb),
    'cuenta', case when not coalesce((select cobros from public.contactos where id = k), false) then null else jsonb_build_object(
      'facturas', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'tipo', f.tipo, 'numero', f.numero, 'fecha', f.fecha, 'vencimiento', f.vencimiento, 'concepto', f.concepto,
          'moneda', f.moneda, 'monto', f.monto, 'saldo', f.saldo, 'link_pdf', f.link_pdf) order by f.fecha desc)
        from public.facturas_saldo f where f.cliente_id = p_cliente and not f.anulada and f.fecha > current_date - 400), '[]'::jsonb),
      'resumenes', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'numero', r.numero, 'periodo', r.periodo, 'moneda', r.moneda, 'total', r.total, 'link_pdf', r.link_pdf) order by r.periodo desc)
        from public.resumenes r where r.cliente_id = p_cliente and r.estado = 'Enviado' and r.periodo > current_date - 400), '[]'::jsonb)) end
  ) into out;
  return out;
end $$;
