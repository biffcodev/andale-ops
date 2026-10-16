-- 0024 · Web, redes y teléfono fijo de cada cliente
-- redes: { instagram, facebook, linkedin, tiktok, youtube, behance, x, pinterest, otra } (solo las que tiene). La web sigue en "web".
-- tel_fijo: el teléfono del local u oficina; "tel" queda como WhatsApp / celular. Los contactos también suman su fijo.

alter table public.clientes add column if not exists redes jsonb not null default '{}'::jsonb;
alter table public.clientes add column if not exists tel_fijo text not null default '';
alter table public.contactos add column if not exists tel_fijo text not null default '';

-- Lo que hoy dice "Instagram / web": si es un Instagram (link o @usuario) pasa a redes.instagram y la web queda vacía.
update public.clientes
   set redes = redes || jsonb_build_object('instagram', trim(web)), web = ''
 where trim(coalesce(web, '')) ~* '(instagram\.com|^@)'
   and coalesce(redes->>'instagram', '') = '';

-- Si alguien cargó un Facebook o LinkedIn en ese campo, también se acomoda.
update public.clientes
   set redes = redes || jsonb_build_object('facebook', trim(web)), web = ''
 where trim(coalesce(web, '')) ~* 'facebook\.com' and coalesce(redes->>'facebook', '') = '';
update public.clientes
   set redes = redes || jsonb_build_object('linkedin', trim(web)), web = ''
 where trim(coalesce(web, '')) ~* 'linkedin\.com' and coalesce(redes->>'linkedin', '') = '';
