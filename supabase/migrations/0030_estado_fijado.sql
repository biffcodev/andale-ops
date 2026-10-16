-- 0030 · Estado del cliente "fijado a mano": se suelta solo cuando el automático lo alcanza.
-- Ej.: se marcó Activo a mano antes de cargarle el abono; cuando el abono se carga, el automático también dice Activo
-- y deja de estar fijado (vuelve a seguir sus abonos y proyectos).

create or replace function private.recalc_cliente(cid uuid) returns void
language sql volatile security definer set search_path = public as $$
  update public.clientes c set estado = private.estado_cliente_auto(cid), estado_manual = false
  where c.id = cid and (
    (not c.estado_manual and c.estado is distinct from private.estado_cliente_auto(cid))
    or (c.estado_manual and c.estado = private.estado_cliente_auto(cid))
  )
$$;

create or replace function private.tg_cliente_estado() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not new.estado_manual then new.estado := private.estado_cliente_auto(new.id);
  elsif new.estado = private.estado_cliente_auto(new.id) then new.estado_manual := false;
  end if;
  return new;
end $$;

-- Soltar los que hoy están fijados en el mismo estado que daría el automático
update public.clientes set estado_manual = false where estado_manual and estado = private.estado_cliente_auto(id);
