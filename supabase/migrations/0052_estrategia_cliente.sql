-- 0052 · Estrategia del mes para validar con el cliente (opcional)
-- Antes de diseñar se le puede mandar al cliente la estrategia del mes: los temas, formatos y fechas de cada pieza.
-- La ve en su portal (Redes · Estrategia), la aprueba o pide cambios, y al equipo le llega el aviso.
-- Es opcional: el mes con los diseños se manda siempre como hasta ahora.
-- Incluye los avisos claros de la 0050. Se puede correr más de una vez.

alter table public.redes_meses add column if not exists estrategia_at timestamptz;
alter table public.redes_meses add column if not exists estrategia_estado text;
alter table public.redes_meses add column if not exists estrategia_resp text;
alter table public.redes_meses add column if not exists estrategia_resp_at timestamptz;
alter table public.redes_meses add column if not exists estrategia_por text;

-- Las estrategias que se le mandaron al cliente (de los últimos meses), con sus temas
create or replace function public.portal_estrategias(p_cliente uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if private.portal_contacto(p_cliente) is null then raise exception 'No tenés acceso a este cliente'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id, 'mes', r.mes, 'plan', r.plan, 'estado', coalesce(r.estrategia_estado, 'Para el cliente'), 'enviada_at', r.estrategia_at,
      'resp', r.estrategia_resp, 'resp_at', r.estrategia_resp_at, 'por', r.estrategia_por,
      'piezas', coalesce((select jsonb_agg(jsonb_build_object('id', z.id, 'formato', z.formato, 'red', z.red, 'fecha', z.fecha, 'hora', z.hora, 'tema', z.tema, 'contenido', z.contenido, 'copy', z.copy, 'hashtags', z.hashtags)
        order by z.fecha nulls last, z.hora nulls last, z.orden) from public.piezas z where z.mes_id = r.id and z.estado <> 'Rechazada'), '[]'::jsonb))
    order by r.mes desc) from public.redes_meses r
    where r.cliente_id = p_cliente and r.estrategia_at is not null and r.mes >= (date_trunc('month', now()) - interval '3 months')::date), '[]'::jsonb);
end $$;
revoke execute on function public.portal_estrategias(uuid) from public, anon;
grant execute on function public.portal_estrategias(uuid) to authenticated, service_role;

-- El cliente aprueba la estrategia o pide cambios
create or replace function public.portal_estrategia_responder(p_mes uuid, p_accion text, p_texto text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare c uuid; k uuid; nom text; txt text := btrim(left(coalesce(p_texto, ''), 4000));
begin
  if p_accion not in ('aprobar', 'cambios') then raise exception 'Acción inválida'; end if;
  if p_accion = 'cambios' and txt = '' then raise exception 'Contanos qué cambiarías'; end if;
  select cliente_id into c from public.redes_meses where id = p_mes and estrategia_at is not null;
  k := private.portal_contacto(c);
  if c is null or k is null then raise exception 'No tenés acceso a esto'; end if;
  select coalesce(nullif(nombre, ''), email) into nom from public.contactos where id = k;
  update public.redes_meses set estrategia_estado = case when p_accion = 'aprobar' then 'Aprobada' else 'Cambios' end,
    estrategia_resp = txt, estrategia_resp_at = now(), estrategia_por = nom where id = p_mes;
  insert into public.comentarios (entidad, entidad_id, cliente_id, autor_id, autor_contacto_id, autor_nombre, texto, interno, pedido)
  values ('mes', p_mes, c, null, k, nom, case when p_accion = 'aprobar' then 'Estrategia: ✓ Aprobada' || case when txt <> '' then ': ' || txt else '' end else 'Estrategia: Pidió cambios: ' || txt end, false, p_accion = 'cambios');
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.portal_estrategia_responder(uuid, text, text) from public, anon;
grant execute on function public.portal_estrategia_responder(uuid, text, text) to authenticated, service_role;

-- Avisos al equipo (los de la 0050 más el de la estrategia)
create or replace function private.tg_comentarios_aviso() returns trigger language plpgsql security definer set search_path = public as $$
declare quien text; m uuid; lnk text; titulo text; cli text; tema text; mid uuid; aprob boolean; rech boolean; linea text; clave text; que text; proy text; resto text;
begin
  quien := coalesce(nullif(new.autor_nombre, ''), (select alias from public.personas where id = new.autor_id), 'Alguien');
  lnk := private.link_de(new.entidad, new.entidad_id);
  foreach m in array new.menciones loop
    perform private.avisar(m, 'mencion', quien || ' te mencionó', left(new.texto, 300), lnk);
  end loop;

  -- Redes: la estrategia del mes (los temas, antes de diseñar), aprobada o con cambios.
  if new.autor_contacto_id is not null and new.entidad = 'mes' and new.texto like 'Estrategia:%' then
    select c.nombre, to_char(r.mes, 'MM/YYYY') into cli, tema from public.redes_meses r join public.clientes c on c.id = r.cliente_id where r.id = new.entidad_id;
    titulo := coalesce(cli, 'Un cliente') || ': ' || quien || case when new.texto like 'Estrategia: ✓%' then ' aprobó la estrategia de ' else ' pidió cambios en la estrategia de ' end || coalesce(tema, 'redes');
    linea := regexp_replace(new.texto, '^Estrategia:\s*(✓ Aprobada:?\s*|Pidió cambios:\s*)?', '');
    for m in select x from private.responsables_de('mes', new.entidad_id) x union select private.equipo_redes(new.cliente_id) loop
      perform private.avisar(m, 'redes', titulo, left(coalesce(nullif(linea, ''), 'Ya pueden pasar a diseño.'), 300), '#redes/' || new.entidad_id);
    end loop;
    return null;
  end if;

  -- Redes: el cliente aprueba, pide cambios, rechaza o comenta una pieza o el mes.
  if new.autor_contacto_id is not null and new.entidad in ('pieza', 'mes') then
    select nombre into cli from public.clientes where id = new.cliente_id;
    if new.entidad = 'pieza' then select z.tema, z.mes_id into tema, mid from public.piezas z where z.id = new.entidad_id;
    else mid := new.entidad_id; end if;
    clave := '#redes/' || mid;
    aprob := new.texto like '✓ Aprobado%';
    rech := new.texto like 'Rechazó la pieza:%';
    linea := case when new.entidad = 'pieza' then '«' || coalesce(nullif(tema, ''), 'Pieza') || '» ' else '' end
      || regexp_replace(regexp_replace(regexp_replace(new.texto, '^Pidió cambios:\s*', ''), '^✓ Aprobado:?\s*', ''), '^Rechazó la pieza:\s*', '');
    if aprob then
      if new.entidad = 'mes' and exists (select 1 from public.notificaciones n where n.link = clave and created_at > now() - interval '1 minute') then return null; end if;
      titulo := coalesce(cli, 'Un cliente') || ': ' || quien || case when new.entidad = 'mes' then ' aprobó el mes' else ' aprobó piezas' end;
      for m in select x from private.responsables_de(new.entidad, new.entidad_id) x
               union select private.equipo_redes(new.cliente_id, 'cuentas%') loop
        perform private.avisar_junto(m, titulo, linea, clave, lnk);
      end loop;
    else
      titulo := coalesce(cli, 'Un cliente') || ': ' || quien || case when rech then ' rechazó una pieza' when new.pedido then ' pidió cambios' else ' comentó' end;
      for m in select x from private.responsables_de(new.entidad, new.entidad_id) x
               union select private.equipo_redes(new.cliente_id)
               union select persona_id from public.cliente_responsables where cliente_id = new.cliente_id
                 and not exists (select 1 from private.equipo_redes(new.cliente_id)) loop
        perform private.avisar_junto(m, titulo, linea, clave, lnk);
      end loop;
    end if;
    return null;
  end if;

  if new.autor_contacto_id is not null then
    -- Proyectos: qué hizo y sobre qué etapa («Fran aprobó «Manual de marca»»), con el proyecto en el cuerpo.
    select coalesce(nullif(c.nombre, ''), 'Un cliente') into cli from public.clientes c where c.id = new.cliente_id;
    if new.entidad = 'tarea' then select t.titulo, p.nombre into que, proy from public.tareas t left join public.proyectos p on p.id = t.proyecto_id where t.id = new.entidad_id;
    elsif new.entidad = 'proyecto' then select p.nombre into proy from public.proyectos p where p.id = new.entidad_id; end if;
    resto := regexp_replace(regexp_replace(new.texto, '^Pidió cambios:\s*', ''), '^✓ Aprobado:?\s*', '');
    titulo := coalesce(cli, 'Un cliente') || ': ' || quien || case
      when new.texto like '✓ Aprobado%' then ' aprobó ' || coalesce('«' || que || '»', 'el proyecto')
      when new.texto like 'Pidió cambios:%' then ' pidió cambios en ' || coalesce('«' || que || '»', 'el proyecto')
      when new.texto like '⭐ Calificación%' then ' calificó el proyecto'
      else ' escribió' || coalesce(' sobre «' || que || '»', '') end;
    resto := concat_ws(' · ', proy, nullif(btrim(resto), ''));
    for m in select * from private.responsables_de(new.entidad, new.entidad_id)
             union select persona_id from public.cliente_responsables where cliente_id = new.cliente_id
               and not exists (select 1 from private.responsables_de(new.entidad, new.entidad_id))
             union select id from public.personas where rol = 'admin' and activo
               and not exists (select 1 from private.responsables_de(new.entidad, new.entidad_id))
               and not exists (select 1 from public.cliente_responsables where cliente_id = new.cliente_id) loop
      perform private.avisar(m, 'cliente', titulo, left(coalesce(nullif(resto, ''), new.texto), 300), lnk);
    end loop;
  elsif new.entidad = 'tarea' then
    for m in select responsable_id from public.tareas where id = new.entidad_id and responsable_id is not null and not (responsable_id = any(new.menciones)) loop
      perform private.avisar(m, 'comentario', quien || ' comentó tu tarea', left(new.texto, 300), lnk);
    end loop;
  end if;
  return null;
end $$;
