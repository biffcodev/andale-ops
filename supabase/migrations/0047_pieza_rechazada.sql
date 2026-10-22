-- 0047 · Piezas rechazadas
-- El cliente puede rechazar una pieza desde el portal (no va, no es un pedido de cambios). Queda en estado "Rechazada",
-- con el motivo como pedido para el equipo (rehacerla o sacarla del mes) y le llega el aviso a quien corresponde.
-- Se puede correr más de una vez.

-- 1. El estado nuevo
do $$
declare r record;
begin
  for r in select conname from pg_constraint where conrelid = 'public.piezas'::regclass and contype = 'c' and pg_get_constraintdef(oid) like '%Para el cliente%' loop
    execute 'alter table public.piezas drop constraint ' || quote_ident(r.conname);
  end loop;
end $$;
alter table public.piezas add constraint piezas_estado_check
  check (estado in ('Idea', 'En diseño', 'Revisión interna', 'Para el cliente', 'Cambios', 'Rechazada', 'Aprobada', 'Programada', 'Publicada'));

-- 2. El cliente la sigue viendo (con su estado)
create or replace function private.pieza_visible(p_estado text) returns boolean language sql immutable as $$
  select p_estado in ('Para el cliente', 'Cambios', 'Rechazada', 'Aprobada', 'Programada', 'Publicada')
$$;

-- 3. Responder desde el portal: aprobar, pedir cambios o rechazar
create or replace function public.portal_responder(p_entidad text, p_id uuid, p_accion text, p_texto text default '') returns jsonb
language plpgsql security definer set search_path = public as $$
declare c uuid; k uuid; nom text; pid uuid; txt text := left(coalesce(p_texto, ''), 4000); n int := 0;
begin
  if p_accion not in ('aprobar', 'cambios', 'rechazar') then raise exception 'Acción inválida'; end if;
  if p_accion = 'cambios' and btrim(txt) = '' then raise exception 'Contanos qué cambiarías'; end if;
  if p_accion = 'rechazar' and btrim(txt) = '' then raise exception 'Contanos por qué no va'; end if;
  if p_accion = 'rechazar' and p_entidad <> 'pieza' then raise exception 'Solo se puede rechazar una pieza'; end if;
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
    update public.piezas set estado = case p_accion when 'aprobar' then 'Aprobada' when 'rechazar' then 'Rechazada' else 'Cambios' end, respuesta_cliente = txt, respondida_at = now()
    where id = p_id and estado in ('Para el cliente', 'Cambios', 'Rechazada', 'Aprobada');
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
    case p_accion when 'aprobar' then '✓ Aprobado' || case when btrim(txt) <> '' then ': ' || txt else '' end
      when 'rechazar' then 'Rechazó la pieza: ' || txt else 'Pidió cambios: ' || txt end, false,
    p_accion in ('cambios', 'rechazar') and p_entidad <> 'mes');
  return jsonb_build_object('ok', true, 'cambiadas', n);
end $$;

-- 4. Una pieza rechazada no deja pasar el mes a "Aprobado" hasta que el equipo la rehace o la saca
create or replace function private.tg_piezas_mes_aprobado() returns trigger language plpgsql security definer set search_path = public as $$
declare m record; x uuid; nom text;
begin
  if new.estado <> 'Aprobada' or old.estado = 'Aprobada' then return null; end if;
  select * into m from public.redes_meses where id = new.mes_id;
  if m.id is null or m.estado <> 'Con el cliente' then return null; end if;
  if exists (select 1 from public.piezas where mes_id = new.mes_id and estado in ('Idea', 'En diseño', 'Revisión interna', 'Para el cliente', 'Cambios', 'Rechazada')) then return null; end if;
  update public.redes_meses set estado = 'Aprobado', aprobado_at = coalesce(aprobado_at, now()) where id = new.mes_id;
  update public.piezas set lista = false where mes_id = new.mes_id and lista;
  select nombre into nom from public.clientes where id = m.cliente_id;
  for x in select private.responsables_de('mes', new.mes_id) loop
    perform private.avisar(x, 'redes', coalesce(nom, 'Un cliente') || ' aprobó todo el mes', 'Ya se puede programar ' || to_char(m.mes, 'MM/YYYY') || '.', '#redes/' || new.mes_id);
  end loop;
  return null;
end $$;

-- 5. El aviso al equipo dice "rechazó una pieza"
create or replace function private.tg_comentarios_aviso() returns trigger language plpgsql security definer set search_path = public as $$
declare quien text; m uuid; lnk text; titulo text; cli text; tema text; mid uuid; aprob boolean; rech boolean; linea text; clave text;
begin
  quien := coalesce(nullif(new.autor_nombre, ''), (select alias from public.personas where id = new.autor_id), 'Alguien');
  lnk := private.link_de(new.entidad, new.entidad_id);
  foreach m in array new.menciones loop
    perform private.avisar(m, 'mencion', quien || ' te mencionó', left(new.texto, 300), lnk);
  end loop;

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
    titulo := quien || ' (cliente) escribió';
    for m in select * from private.responsables_de(new.entidad, new.entidad_id)
             union select persona_id from public.cliente_responsables where cliente_id = new.cliente_id
               and not exists (select 1 from private.responsables_de(new.entidad, new.entidad_id))
             union select id from public.personas where rol = 'admin' and activo
               and not exists (select 1 from private.responsables_de(new.entidad, new.entidad_id))
               and not exists (select 1 from public.cliente_responsables where cliente_id = new.cliente_id) loop
      perform private.avisar(m, 'cliente', titulo, left(new.texto, 300), lnk);
    end loop;
  elsif new.entidad = 'tarea' then
    for m in select responsable_id from public.tareas where id = new.entidad_id and responsable_id is not null and not (responsable_id = any(new.menciones)) loop
      perform private.avisar(m, 'comentario', quien || ' comentó tu tarea', left(new.texto, 300), lnk);
    end loop;
  end if;
  return null;
end $$;
