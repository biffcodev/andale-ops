-- 0051 · Desde el portal, escribirle directo a alguien del equipo
-- En "Tu cuenta" el cliente ve a su equipo de àndale y puede escribirle o pedirle una reunión a una persona.
-- Queda como pedido (ticket) asignado a esa persona, le llega el aviso a ella y la respuesta el cliente la ve en Pedidos.
-- Se puede correr más de una vez.
drop function if exists public.portal_pedido(uuid, text, text, date);
create or replace function public.portal_pedido(p_cliente uuid, p_titulo text, p_detalle text default '', p_para date default null, p_para_alias text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare k uuid; nom text; nid uuid; m uuid; cn text; quien uuid;
begin
  k := private.portal_contacto(p_cliente);
  if k is null then raise exception 'No tenés acceso a este cliente'; end if;
  if btrim(coalesce(p_titulo, '')) = '' then raise exception 'Poné un título'; end if;
  if (select count(*) from public.pedidos where contacto_id = k and created_at > now() - interval '1 hour') >= 20 then raise exception 'Demasiados pedidos seguidos. Probá en un rato.'; end if;
  select coalesce(nullif(nombre, ''), email) into nom from public.contactos where id = k;
  select nombre into cn from public.clientes where id = p_cliente;
  if coalesce(p_para_alias, '') <> '' then select id into quien from public.personas where alias = p_para_alias and activo limit 1; end if;
  insert into public.pedidos (cliente_id, contacto_id, autor_nombre, origen, titulo, detalle, para_cuando, responsable_id)
  values (p_cliente, k, nom, 'portal', left(btrim(p_titulo), 200), left(coalesce(p_detalle, ''), 4000), p_para, quien) returning id into nid;
  if quien is not null then
    perform private.avisar(quien, 'pedido', coalesce(cn, 'Un cliente') || ': ' || nom || ' te escribió', left(btrim(p_titulo), 200) || case when btrim(coalesce(p_detalle, '')) <> '' then ' · ' || left(btrim(p_detalle), 200) else '' end, '#tickets?k=' || nid);
  else
    for m in select persona_id from public.cliente_responsables where cliente_id = p_cliente
             union select id from public.personas where rol = 'admin' and activo and not exists (select 1 from public.cliente_responsables where cliente_id = p_cliente) loop
      perform private.avisar(m, 'pedido', 'Ticket nuevo de ' || cn, left(btrim(p_titulo), 200) || ' · ' || nom, '#tickets?k=' || nid);
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'id', nid);
end $$;
revoke execute on function public.portal_pedido(uuid, text, text, date, text) from public, anon;
grant execute on function public.portal_pedido(uuid, text, text, date, text) to authenticated, service_role;
