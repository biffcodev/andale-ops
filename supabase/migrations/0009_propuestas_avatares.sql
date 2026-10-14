-- Propuestas y presupuestos (con link privado para el cliente) y fotos de perfil de equipo y clientes.

/* ---------- 1. Fotos de perfil ---------- */
alter table public.personas add column if not exists avatar_url text not null default '';
alter table public.clientes add column if not exists avatar_url text not null default '';

-- Bucket público de solo lectura: las imágenes se ven por URL; subir y borrar solo desde la app.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 2097152, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

drop policy if exists avatares_subir on storage.objects;
drop policy if exists avatares_cambiar on storage.objects;
drop policy if exists avatares_borrar on storage.objects;
-- personas/<id>.ext: cada uno la suya, o un admin; clientes/<id>.ext: equipo y admins.
create policy avatares_subir on storage.objects for insert to authenticated with check (
  bucket_id = 'avatares' and (
    (name like 'clientes/%' and public.es_staff()) or
    (name like 'personas/%' and (public.es_admin() or split_part(split_part(name, '/', 2), '.', 1) = private.mi_persona()::text))));
create policy avatares_cambiar on storage.objects for update to authenticated using (
  bucket_id = 'avatares' and (
    (name like 'clientes/%' and public.es_staff()) or
    (name like 'personas/%' and (public.es_admin() or split_part(split_part(name, '/', 2), '.', 1) = private.mi_persona()::text))));
create policy avatares_borrar on storage.objects for delete to authenticated using (
  bucket_id = 'avatares' and (
    (name like 'clientes/%' and public.es_staff()) or
    (name like 'personas/%' and (public.es_admin() or split_part(split_part(name, '/', 2), '.', 1) = private.mi_persona()::text))));

-- Cada persona puede cambiar su propia foto aunque no sea admin.
create or replace function public.mi_avatar(url text) returns void
language sql security definer set search_path = public as $$
  update public.personas set avatar_url = coalesce(url, '') where id = private.mi_persona()
$$;
revoke execute on function public.mi_avatar(text) from public, anon;
grant execute on function public.mi_avatar(text) to authenticated;

/* ---------- 2. Propuestas y presupuestos (solo admins) ---------- */
create table if not exists public.propuestas (
  id uuid primary key default gen_random_uuid(),
  numero text not null default '',
  cliente_id uuid references public.clientes(id) on delete set null,
  prospecto text not null default '',          -- si todavía no es cliente
  contacto text not null default '',
  email text not null default '',
  titulo text not null default '',
  tipo text not null default '',
  estado text not null default 'Borrador' check (estado in ('Borrador', 'Enviada', 'Aceptada', 'Rechazada', 'Vencida')),
  fecha date not null default current_date,
  validez_dias int not null default 15,
  moneda text not null default 'ARS',
  items jsonb not null default '[]'::jsonb,      -- [{concepto, detalle, monto}]
  descuento numeric(14,2) not null default 0,
  total numeric(14,2) not null default 0,
  plan_pago text not null default '50/50',
  contenido jsonb not null default '{}'::jsonb,  -- intro, objetivo, alcance[], etapas[], entregables[], no_incluye[], condiciones
  brief text not null default '',                -- notas internas para la IA
  notas text not null default '',                -- notas internas
  token text unique,                             -- link privado para el cliente
  vista_el timestamptz,
  respuesta jsonb,                               -- {accion, nombre, comentario, fecha}
  proyecto_id uuid references public.proyectos(id) on delete set null,
  persona_id uuid references public.personas(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists propuestas_upd on public.propuestas;
create trigger propuestas_upd before update on public.propuestas for each row execute function public.set_updated_at();
alter table public.propuestas enable row level security;
drop policy if exists propuestas_admin on public.propuestas;
create policy propuestas_admin on public.propuestas for all to authenticated using (public.es_admin()) with check (public.es_admin());
revoke all on public.propuestas from anon;

-- Lo que ve el cliente con el link (sin notas internas ni brief). Marca la primera vista.
create or replace function public.propuesta_publica(t text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.propuestas; c text; r jsonb;
begin
  if t is null or length(t) < 24 then return null; end if;
  select * into p from public.propuestas where token = t and estado <> 'Borrador';
  if not found then return null; end if;
  if p.vista_el is null then update public.propuestas set vista_el = now() where id = p.id; end if;
  select nombre into c from public.clientes where id = p.cliente_id;
  r := jsonb_build_object('numero', p.numero, 'cliente', coalesce(c, p.prospecto), 'contacto', p.contacto, 'titulo', p.titulo, 'tipo', p.tipo,
    'estado', p.estado, 'fecha', p.fecha, 'validez_dias', p.validez_dias, 'moneda', p.moneda, 'items', p.items, 'descuento', p.descuento,
    'total', p.total, 'plan_pago', p.plan_pago, 'contenido', p.contenido, 'respuesta', p.respuesta,
    'marca', (select valor from public.ajustes where clave = 'resumen_pdf'));
  return r;
end $$;

create or replace function public.responder_propuesta(t text, accion text, nombre text, comentario text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.propuestas;
begin
  if accion not in ('Aceptada', 'Consulta', 'Rechazada') then raise exception 'Respuesta inválida'; end if;
  select * into p from public.propuestas where token = t and estado in ('Enviada', 'Vencida');
  if not found then raise exception 'La propuesta no está disponible para responder'; end if;
  update public.propuestas set
    respuesta = jsonb_build_object('accion', accion, 'nombre', left(coalesce(nombre, ''), 120), 'comentario', left(coalesce(comentario, ''), 2000), 'fecha', now()),
    estado = case when accion = 'Aceptada' then 'Aceptada' when accion = 'Rechazada' then 'Rechazada' else estado end
  where id = p.id;
  return jsonb_build_object('ok', true);
end $$;
revoke execute on function public.propuesta_publica(text) from public;
revoke execute on function public.responder_propuesta(text, text, text, text) from public;
grant execute on function public.propuesta_publica(text) to anon, authenticated;
grant execute on function public.responder_propuesta(text, text, text, text) to anon, authenticated;

do $$ begin alter publication supabase_realtime add table public.propuestas; exception when others then null; end $$;

insert into public.ajustes (clave, valor) values ('documentos', '{"estilo": "editorial"}'::jsonb) on conflict (clave) do nothing;
