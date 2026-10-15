-- 0020 · Seguimiento: saber si el cliente abrió el mail, hizo clic, entró al portal, vio o bajó un PDF, abrió un presupuesto.
-- Mails: la función enviar-email agrega una imagen invisible (apertura) y pasa los links por /seguimiento (clic).
-- Portal y presupuestos: la página registra lo que se abre o se descarga.
-- Nota honesta: "abierto" es aproximado (Apple Mail precarga imágenes y algunos correos las bloquean).

create table if not exists public.seguimiento (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  tipo text not null check (tipo in ('mail_abierto','mail_click','portal_entro','portal_vio','pdf_descargado','pdf_abierto','propuesta_abierta','propuesta_pdf')),
  cliente_id uuid references public.clientes(id) on delete cascade,
  email_id uuid references public.emails(id) on delete cascade,
  ref text not null default '',
  detalle text not null default '',
  quien text not null default '',
  ua text not null default ''
);
create index if not exists seguimiento_cliente_idx on public.seguimiento (cliente_id, created_at desc);
create index if not exists seguimiento_email_idx on public.seguimiento (email_id) where email_id is not null;
alter table public.seguimiento enable row level security;
drop policy if exists seguimiento_sel on public.seguimiento;
create policy seguimiento_sel on public.seguimiento for select to authenticated using (public.es_staff());
drop policy if exists seguimiento_del on public.seguimiento;
create policy seguimiento_del on public.seguimiento for delete to authenticated using (public.es_admin());
revoke all on public.seguimiento from anon;
grant select, delete on public.seguimiento to authenticated;

-- Los links originales de cada mail (para redirigir el clic sin abrir la puerta a redirecciones a cualquier lado).
alter table public.emails add column if not exists links jsonb not null default '[]'::jsonb;

-- Lo que hace el cliente en el portal. Solo cuenta si quien entra es un contacto del cliente (no el equipo probando).
create or replace function public.portal_evento(p_cliente uuid, p_tipo text, p_ref text default '', p_detalle text default '')
returns void language plpgsql security definer set search_path = public as $$
declare k uuid; q text;
begin
  if p_tipo not in ('portal_entro','portal_vio','pdf_descargado','pdf_abierto') then raise exception 'Evento inválido'; end if;
  k := private.portal_contacto(p_cliente);
  if k is null then return; end if;
  if private.mi_persona() is not null then return; end if;
  -- Entrar al portal cuenta una vez cada 30 minutos por persona.
  if p_tipo = 'portal_entro' and exists (select 1 from public.seguimiento s where s.cliente_id = p_cliente and s.tipo = 'portal_entro'
      and s.quien = (select coalesce(nullif(c.email, ''), c.nombre) from public.contactos c where c.id = k) and s.created_at > now() - interval '30 minutes') then return; end if;
  select coalesce(nullif(c.email, ''), c.nombre) into q from public.contactos c where c.id = k;
  insert into public.seguimiento (tipo, cliente_id, ref, detalle, quien)
  values (p_tipo, p_cliente, left(coalesce(p_ref, ''), 200), left(coalesce(p_detalle, ''), 300), coalesce(q, ''));
end $$;
revoke execute on function public.portal_evento(uuid, text, text, text) from public, anon;
grant execute on function public.portal_evento(uuid, text, text, text) to authenticated;

-- Presupuestos y propuestas por link público: se abrió / se bajó el PDF.
create or replace function public.propuesta_evento(t text, p_tipo text)
returns void language plpgsql security definer set search_path = public as $$
declare p public.propuestas;
begin
  if p_tipo not in ('propuesta_abierta','propuesta_pdf') then raise exception 'Evento inválido'; end if;
  if private.mi_persona() is not null then return; end if;
  select * into p from public.propuestas where token = t;
  if not found then return; end if;
  if p_tipo = 'propuesta_abierta' and exists (select 1 from public.seguimiento s where s.ref = p.id::text and s.tipo = 'propuesta_abierta' and s.created_at > now() - interval '30 minutes') then return; end if;
  insert into public.seguimiento (tipo, cliente_id, ref, detalle) values (p_tipo, p.cliente_id, p.id::text, coalesce(p.numero, ''));
end $$;
revoke execute on function public.propuesta_evento(text, text) from public;
grant execute on function public.propuesta_evento(text, text) to anon, authenticated;
