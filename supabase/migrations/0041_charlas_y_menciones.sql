-- 0041 · Charlas más claras y menciones a contactos del cliente
-- Charla = una conversación con el cliente fuera de la app (reunión, llamada, Meet, WhatsApp o un mail que nos mandó).
-- Ahora tiene tema y quiénes de àndale participaron; si es la respuesta a un mail, queda atada a ese mail (email_id, SQL 0025).
-- Los mails que manda la app ya no se anotan solos como charla: se ven en la ficha del cliente → Conversaciones.
-- Comentarios: además de @personas del equipo, se puede @mencionar a contactos del cliente (les llega un mail).
-- Se puede correr más de una vez.

alter table public.comunicaciones add column if not exists tema text not null default '';
alter table public.comunicaciones add column if not exists equipo uuid[] not null default '{}';   -- quiénes de àndale participaron

-- Las charlas que se crearon solas al mandar un mail (ahora el mail se ve directamente, sin charla).
delete from public.comunicaciones where email_id is not null and resumen like 'Mail: %' and coalesce(proximo, '') = '' and coalesce(acuerdo, '') = '';

-- A quiénes del cliente se mencionó en un comentario.
alter table public.comentarios add column if not exists menciones_contactos uuid[] not null default '{}';
