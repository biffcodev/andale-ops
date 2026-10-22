-- 0045 · Manual de marca online de cada cliente (/m/<link>)
-- Se arma con el kit de marca y la ficha de voz (clientes.marca). Lo ve cualquiera con el link, sin login,
-- solo si está publicado (marca.manual.publicado). No muestra lo interno de la ficha (fechas, referencias, horarios, fuentes).
-- Se puede correr más de una vez.

create or replace function public.manual_marca(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'nombre', c.nombre, 'avatar', c.avatar_url,
    'marca', jsonb_strip_nulls(jsonb_build_object(
      'kit', c.marca -> 'kit', 'manual', c.marca -> 'manual', 'visual', c.marca -> 'visual',
      'rubro', c.marca -> 'rubro', 'publico', c.marca -> 'publico', 'tono', c.marca -> 'tono', 'trato', c.marca -> 'trato', 'emojis', c.marca -> 'emojis',
      'palabras_si', c.marca -> 'palabras_si', 'palabras_no', c.marca -> 'palabras_no', 'pilares', c.marca -> 'pilares',
      'hashtags', c.marca -> 'hashtags', 'ejemplos', c.marca -> 'ejemplos', 'colores', c.marca -> 'colores', 'tipografias', c.marca -> 'tipografias')))
  from public.clientes c
  where coalesce(p_slug, '') <> '' and c.marca -> 'manual' ->> 'slug' = p_slug and coalesce((c.marca -> 'manual' ->> 'publicado')::boolean, false)
  limit 1
$$;
grant execute on function public.manual_marca(text) to anon, authenticated;
