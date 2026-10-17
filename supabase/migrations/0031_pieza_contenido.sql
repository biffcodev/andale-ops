-- 0031 · Lo que va en cada pieza de Redes, aparte del copy
-- Para quien diseña o graba: los slides de un carrusel, el título de la placa de un post,
-- el guion de un reel o el texto y el sticker de una historia. El copy queda para el texto de la publicación.
alter table public.piezas add column if not exists contenido text not null default '';
