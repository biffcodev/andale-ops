-- Presupuestos: misma tabla que las propuestas, con su propia numeración (PRE-2026-001).
-- Propuesta = pieza completa (contexto, alcance, etapas, inversión). Presupuesto = detalle de precios y condiciones.

alter table public.propuestas add column if not exists clase text not null default 'Propuesta';
do $$ begin
  alter table public.propuestas add constraint propuestas_clase_ck check (clase in ('Propuesta', 'Presupuesto'));
exception when duplicate_object then null; end $$;

create or replace function private.tg_propuesta_numero() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.numero is null or new.numero = '' then
    new.numero := private.siguiente_numero(case when new.clase = 'Presupuesto' then 'PRE' else 'P' end,
      extract(year from now() at time zone 'America/Argentina/Cordoba')::int, 3);
  end if;
  return new;
end $$;

-- El link del cliente también dice si es propuesta o presupuesto.
create or replace function public.propuesta_publica(t text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.propuestas; c text; r jsonb;
begin
  if t is null or length(t) < 24 then return null; end if;
  select * into p from public.propuestas where token = t and estado <> 'Borrador';
  if not found then return null; end if;
  if p.vista_el is null then update public.propuestas set vista_el = now() where id = p.id; end if;
  select nombre into c from public.clientes where id = p.cliente_id;
  r := jsonb_build_object('numero', p.numero, 'clase', p.clase, 'cliente', coalesce(c, p.prospecto), 'contacto', p.contacto, 'titulo', p.titulo, 'tipo', p.tipo,
    'estado', p.estado, 'fecha', p.fecha, 'validez_dias', p.validez_dias, 'moneda', p.moneda, 'items', p.items, 'descuento', p.descuento,
    'total', p.total, 'plan_pago', p.plan_pago, 'contenido', p.contenido, 'respuesta', p.respuesta,
    'marca', (select valor from public.ajustes where clave = 'resumen_pdf'));
  return r;
end $$;
revoke execute on function public.propuesta_publica(text) from public;
grant execute on function public.propuesta_publica(text) to anon, authenticated;
