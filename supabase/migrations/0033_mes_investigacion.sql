-- 0033 · Fechas y novedades de cada mes de Redes, y versiones de cada pieza
-- Mr. Piggy busca en la web las fechas del mes (patrias, internacionales, del rubro, comerciales) y novedades del rubro,
-- con su fuente. El equipo elige cuáles usar y "Proponer contenido" las tiene en cuenta.
alter table public.redes_meses add column if not exists investigacion jsonb;

-- Versiones de cada pieza: antes de que Mr. Piggy cambie el tema, lo que va en la pieza, el copy o los hashtags,
-- se guarda lo anterior (las últimas 10) para poder volver atrás.
alter table public.piezas add column if not exists versiones jsonb not null default '[]'::jsonb;
