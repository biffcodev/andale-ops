-- Flujo de Redes con una sola etapa por mes: cada pieza se marca "lista" dentro de la etapa y, cuando están todas,
-- el mes pasa a la siguiente (eso lo hace la app y avisa a quien le toca).
alter table public.piezas add column if not exists lista boolean not null default false;

-- Cuando el cliente aprueba la última pieza desde el portal, el mes pasa solo a "Aprobado" (Programación)
-- y se avisa a la responsable del mes.
create or replace function private.tg_piezas_mes_aprobado() returns trigger language plpgsql security definer set search_path = public as $$
declare m record; x uuid; nom text;
begin
  if new.estado <> 'Aprobada' or old.estado = 'Aprobada' then return null; end if;
  select * into m from public.redes_meses where id = new.mes_id;
  if m.id is null or m.estado <> 'Con el cliente' then return null; end if;
  if exists (select 1 from public.piezas where mes_id = new.mes_id and estado in ('Idea', 'En diseño', 'Revisión interna', 'Para el cliente', 'Cambios')) then return null; end if;
  update public.redes_meses set estado = 'Aprobado', aprobado_at = coalesce(aprobado_at, now()) where id = new.mes_id;
  update public.piezas set lista = false where mes_id = new.mes_id and lista;
  select nombre into nom from public.clientes where id = m.cliente_id;
  for x in select private.responsables_de('mes', new.mes_id) loop
    perform private.avisar(x, 'redes', coalesce(nom, 'Un cliente') || ' aprobó todo el mes', 'Ya se puede programar ' || to_char(m.mes, 'MM/YYYY') || '.', '#redes/' || new.mes_id);
  end loop;
  return null;
end $$;
drop trigger if exists piezas_mes_aprobado on public.piezas;
create trigger piezas_mes_aprobado after update of estado on public.piezas for each row execute function private.tg_piezas_mes_aprobado();
