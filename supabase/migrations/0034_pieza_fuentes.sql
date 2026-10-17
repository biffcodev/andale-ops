-- 0034 · Fuentes de cada pieza
-- Cuando Mr. Piggy arma una pieza con una fecha o una novedad que buscó en la web, guarda de dónde la sacó
-- ([{ "titulo": "…", "url": "https://…" }]) para poder verla y citarla en el copy si hace falta.
alter table public.piezas add column if not exists fuentes jsonb not null default '[]'::jsonb;
