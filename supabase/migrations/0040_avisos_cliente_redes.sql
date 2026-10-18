-- 0040 · Lo que vuelve del cliente en Redes llega a todo el equipo de la cuenta
-- Antes, un comentario o pedido de cambios del cliente en una pieza solo le avisaba a la responsable del mes.
-- Ahora le llega a todo el equipo de la cuenta (las personas del abono de Redes/Ads), así diseño se entera de los cambios.
-- Las aprobaciones le llegan a quien programa (rol "Cuentas…") y a la responsable del mes.
-- Para no llenar la campanita, lo que el cliente hace en un rato sobre el mismo mes se junta en un solo aviso.
-- Se puede correr más de una vez.

-- El equipo de la cuenta de Redes (y Ads) de un cliente.
create or replace function private.equipo_redes(p_cliente uuid, p_rol text default null) returns setof uuid
language sql stable security definer set search_path = public as $$
  select distinct ar.persona_id from public.abono_responsables ar join public.abonos a on a.id = ar.abono_id
  where a.cliente_id = p_cliente and a.estado = 'Activo' and a.tipo in ('Redes', 'Ads')
    and (p_rol is null or coalesce(ar.rol, '') ilike p_rol)
$$;

-- Aviso que se junta: si la persona tiene uno sin leer del mismo tipo y mes de las últimas horas, se le suma la línea nueva.
create or replace function private.avisar_junto(p_persona uuid, p_titulo text, p_linea text, p_clave text, p_link text)
returns void language plpgsql security definer set search_path = public as $$
declare nid uuid;
begin
  if coalesce(current_setting('andale.restaurando', true), '') = 'si' then return; end if;
  if p_persona is null or p_persona is not distinct from private.mi_persona() then return; end if;
  if not exists (select 1 from public.personas where id = p_persona and activo) then return; end if;
  select id into nid from public.notificaciones
    where persona_id = p_persona and tipo = 'cliente' and not leida and titulo = left(p_titulo, 200)
      and link like p_clave || '%' and created_at > now() - interval '3 hours'
    order by created_at desc limit 1;
  if nid is not null then
    update public.notificaciones set cuerpo = left(p_linea || E'\n' || cuerpo, 600), link = p_clave, created_at = now() where id = nid;
  else
    insert into public.notificaciones (persona_id, tipo, titulo, cuerpo, link, actor_id)
    values (p_persona, 'cliente', left(p_titulo, 200), left(coalesce(p_linea, ''), 600), coalesce(p_link, ''), null);
  end if;
end $$;

create or replace function private.tg_comentarios_aviso() returns trigger language plpgsql security definer set search_path = public as $$
declare quien text; m uuid; lnk text; titulo text; cli text; tema text; mid uuid; aprob boolean; linea text; clave text;
begin
  quien := coalesce(nullif(new.autor_nombre, ''), (select alias from public.personas where id = new.autor_id), 'Alguien');
  lnk := private.link_de(new.entidad, new.entidad_id);
  foreach m in array new.menciones loop
    perform private.avisar(m, 'mencion', quien || ' te mencionó', left(new.texto, 300), lnk);
  end loop;

  -- Redes: el cliente aprueba, pide cambios o comenta una pieza o el mes.
  if new.autor_contacto_id is not null and new.entidad in ('pieza', 'mes') then
    select nombre into cli from public.clientes where id = new.cliente_id;
    if new.entidad = 'pieza' then select z.tema, z.mes_id into tema, mid from public.piezas z where z.id = new.entidad_id;
    else mid := new.entidad_id; end if;
    clave := '#redes/' || mid;
    aprob := new.texto like '✓ Aprobado%';
    linea := case when new.entidad = 'pieza' then '«' || coalesce(nullif(tema, ''), 'Pieza') || '» ' else '' end
      || regexp_replace(regexp_replace(new.texto, '^Pidió cambios:\s*', ''), '^✓ Aprobado:?\s*', '');
    if aprob then
      -- Si aprobó todo el mes, ya le llegó el aviso de "aprobó todo el mes" (0036): no se repite.
      if new.entidad = 'mes' and exists (select 1 from public.notificaciones n where n.link = clave and created_at > now() - interval '1 minute') then return null; end if;
      titulo := coalesce(cli, 'Un cliente') || ': ' || quien || case when new.entidad = 'mes' then ' aprobó el mes' else ' aprobó piezas' end;
      for m in select x from private.responsables_de(new.entidad, new.entidad_id) x
               union select private.equipo_redes(new.cliente_id, 'cuentas%') loop
        perform private.avisar_junto(m, titulo, linea, clave, lnk);
      end loop;
    else
      titulo := coalesce(cli, 'Un cliente') || ': ' || quien || case when new.pedido then ' pidió cambios' else ' comentó' end;
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
