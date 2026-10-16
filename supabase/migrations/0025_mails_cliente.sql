-- 0025 · Mails de cada cliente: ver lo que se mandó, archivar y borrar del historial
-- - emails.texto: el texto del mail, para poder releerlo desde la ficha (los anteriores no lo tienen).
-- - emails.archivado: se oculta de las listas sin borrarlo.
-- - comunicaciones.email_id: la charla que se anota sola al mandar un mail queda atada a ese mail; si se borra el mail, se va.
-- - El equipo ve, archiva y borra sus propios mails de novedades (tipo "Mensaje"). La cobranza sigue siendo solo de administradores.

alter table public.emails add column if not exists texto text not null default '';
alter table public.emails add column if not exists archivado boolean not null default false;
alter table public.comunicaciones add column if not exists email_id uuid references public.emails(id) on delete cascade;
create index if not exists comunicaciones_email_idx on public.comunicaciones (email_id) where email_id is not null;

-- Atar las charlas "Mail: …" que ya se anotaron solas a su mail (mismo cliente, mismo día y mismo asunto).
update public.comunicaciones c
   set email_id = e.id
  from public.emails e
 where c.email_id is null
   and c.canal = 'Email'
   and e.tipo = 'Mensaje'
   and e.cliente_id = c.cliente_id
   and (e.created_at at time zone 'America/Argentina/Cordoba')::date = c.fecha
   and c.resumen like 'Mail: ' || e.asunto || '%';

-- El equipo: sus propios mails de novedades
drop policy if exists emails_propios on public.emails;
create policy emails_propios on public.emails for all to authenticated
  using (tipo = 'Mensaje' and persona_id = private.mi_persona())
  with check (tipo = 'Mensaje' and persona_id = private.mi_persona());
grant select, update, delete on public.emails to authenticated;
