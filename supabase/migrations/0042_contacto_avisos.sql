-- 0042 · Avisos por mail a cada contacto del cliente
-- Cuando se lo menciona en un comentario o tiene algo para revisar en el portal, le llega un aviso por mail (con seguimiento).
-- Si un contacto pide no recibirlos, se destilda "Recibe avisos por mail" en su ficha y listo.
-- Se puede correr más de una vez.
alter table public.contactos add column if not exists avisos boolean not null default true;
