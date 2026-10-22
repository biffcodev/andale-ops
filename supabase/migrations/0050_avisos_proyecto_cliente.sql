-- 0050 · Avisos claros cuando el cliente responde sobre un proyecto
-- En vez de "Fulano (cliente) escribió · ✓ Aprobado", dice qué hizo y sobre qué etapa:
-- "Apromax: Francisco aprobó «Manual de marca»" y abajo el proyecto. Igual para pedir cambios, comentar o calificar.
-- Se puede correr más de una vez.

create or replace function private.tg_comentarios_aviso() returns trigger language plpgsql security definer set search_path = public as $$
declare quien text; m uuid; lnk text; titulo text; cli text; tema text; mid uuid; aprob boolean; rech boolean; linea text; clave text; que text; proy text; resto text;
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
