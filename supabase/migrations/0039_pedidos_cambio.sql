-- Pedidos de cambio de los clientes en Redes (y entregas): cada "Pedir cambios" queda como un ítem a resolver.
-- El equipo los tilda como hechos (bandeja de pedidos y en la pieza) y el cliente ve qué se hizo.

alter table public.comentarios add column if not exists pedido boolean not null default false;      -- es un pedido de cambio
alter table public.comentarios add column if not exists resuelto_at timestamptz;                      -- cuándo se marcó hecho
alter table public.comentarios add column if not exists resuelto_por uuid references public.personas(id) on delete set null;
create index if not exists comentarios_pedidos_idx on public.comentarios (cliente_id, created_at) where pedido and resuelto_at is null;

-- Los pedidos de cambio que ya existían (antes se guardaban como comentario "Pidió cambios: …").
update public.comentarios set pedido = true where autor_contacto_id is not null and texto like 'Pidió cambios:%' and not pedido;
-- Los de piezas que ya están aprobadas o publicadas quedan resueltos.
update public.comentarios x set resuelto_at = coalesce(x.resuelto_at, now())
  where x.pedido and x.resuelto_at is null and x.entidad = 'pieza'
    and exists (select 1 from public.piezas z where z.id = x.entidad_id and z.estado in ('Aprobada', 'Programada', 'Publicada'));

-- Marcar un pedido como hecho (o deshacerlo). Equipo y externos con acceso a ese cliente.
create or replace function public.pedido_resolver(p_id uuid, p_hecho boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  select cliente_id into c from public.comentarios where id = p_id and pedido;
  if not found then raise exception 'Pedido no encontrado'; end if;
  if not (public.es_staff() or c in (select private.mis_clientes())) then raise exception 'No tenés acceso a este pedido'; end if;
  update public.comentarios set resuelto_at = case when p_hecho then now() else null end, resuelto_por = case when p_hecho then private.mi_persona() else null end where id = p_id;
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.pedido_resolver(uuid, boolean) from public, anon;
grant execute on function public.pedido_resolver(uuid, boolean) to authenticated;

-- El cliente pide cambios: además del estado de la pieza, queda un pedido para resolver.
create or replace function public.portal_responder(p_entidad text, p_id uuid, p_accion text, p_texto text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare c uuid; k uuid; nom text; pid uuid; txt text := left(coalesce(p_texto, ''), 4000); n int := 0;
begin
  if p_accion not in ('aprobar', 'cambios') then raise exception 'Acción inválida'; end if;
  if p_accion = 'cambios' and btrim(txt) = '' then raise exception 'Contanos qué cambiarías'; end if;
  if p_entidad = 'pieza' then
    select z.cliente_id into c from public.piezas z join public.redes_meses m on m.id = z.mes_id where z.id = p_id and m.visible_cliente and private.pieza_visible(z.estado);
  elsif p_entidad = 'mes' then
    select cliente_id into c from public.redes_meses where id = p_id and visible_cliente;
  elsif p_entidad = 'entrega' then
    select cliente_id, proyecto_id into c, pid from public.entregas where id = p_id and estado <> 'Borrador';
  else raise exception 'Entidad inválida'; end if;
  k := private.portal_contacto(c);
  if c is null or k is null then raise exception 'No tenés acceso a esto'; end if;
  select coalesce(nullif(nombre, ''), email) into nom from public.contactos where id = k;

  if p_entidad = 'pieza' then
    update public.piezas set estado = case when p_accion = 'aprobar' then 'Aprobada' else 'Cambios' end, respuesta_cliente = txt, respondida_at = now()
    where id = p_id and estado in ('Para el cliente', 'Cambios', 'Aprobada');
    get diagnostics n = row_count;
    -- Si la aprueba, lo que había pedido antes queda resuelto.
    if p_accion = 'aprobar' then update public.comentarios set resuelto_at = now() where entidad = 'pieza' and entidad_id = p_id and pedido and resuelto_at is null; end if;
  elsif p_entidad = 'mes' then
    if p_accion = 'aprobar' then
      update public.piezas set estado = 'Aprobada', respondida_at = now() where mes_id = p_id and estado = 'Para el cliente';
      get diagnostics n = row_count;
      update public.redes_meses set aprobado_at = now(), aprobado_por = nom, estado = case when estado in ('Con el cliente', 'Revisión interna', 'Producción') then 'Aprobado' else estado end where id = p_id;
    end if;
  else
    update public.entregas set estado = case when p_accion = 'aprobar' then 'Aprobada' else 'Cambios' end, respondida_at = now(),
      aprobado_por = case when p_accion = 'aprobar' then nom else aprobado_por end, respuesta = txt where id = p_id;
    get diagnostics n = row_count;
  end if;

  insert into public.comentarios (entidad, entidad_id, cliente_id, proyecto_id, autor_id, autor_contacto_id, autor_nombre, texto, interno, pedido)
  values (p_entidad, p_id, c, pid, null, k, nom,
    case when p_accion = 'aprobar' then '✓ Aprobado' || case when btrim(txt) <> '' then ': ' || txt else '' end else 'Pidió cambios: ' || txt end, false,
    p_accion = 'cambios' and p_entidad <> 'mes');
  return jsonb_build_object('ok', true, 'cambiadas', n);
end $$;

-- El portal ve si cada comentario es un pedido y si ya se resolvió.
create or replace function public.portal_datos(p_cliente uuid) returns jsonb language plpgsql security definer set search_path = public as $$
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
        'id', p.id, 'nombre', p.nombre, 'tipo', p.tipo, 'estado', p.estado, 'etapa', p.etapa_actual, 'entrega', p.entrega,
        'avance', (select case when count(*) = 0 then null else round(100.0 * count(*) filter (where hecha) / count(*)) end from public.tareas t where t.proyecto_id = p.id),
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
      from public.comentarios x where x.cliente_id = p_cliente and not x.interno and x.created_at > now() - interval '6 months'), '[]'::jsonb),
    'cuenta', case when not coalesce((select cobros from public.contactos where id = k), false) then null else jsonb_build_object(
      'facturas', coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'tipo', f.tipo, 'numero', f.numero, 'fecha', f.fecha, 'vencimiento', f.vencimiento, 'concepto', f.concepto,
          'moneda', f.moneda, 'monto', f.monto, 'saldo', f.saldo, 'link_pdf', f.link_pdf) order by f.fecha desc)
        from public.facturas_saldo f where f.cliente_id = p_cliente and not f.anulada and f.fecha > current_date - 400), '[]'::jsonb),
      'resumenes', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'numero', r.numero, 'periodo', r.periodo, 'moneda', r.moneda, 'total', r.total, 'link_pdf', r.link_pdf) order by r.periodo desc)
        from public.resumenes r where r.cliente_id = p_cliente and r.estado = 'Enviado' and r.periodo > current_date - 400), '[]'::jsonb)) end
  ) into out;
  return out;
end $$;

