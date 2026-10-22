-- 0048 · Manual de marca en dos versiones
-- /m/<slug>    → la guía (versión simple), pública si marca.manual.publicado.
-- /m/<slug_c>  → el manual completo, para el cliente (si marca.manual.completo): lo ve en su portal y puede compartir el link.
-- La guía pública no incluye la estrategia ni la voz. Se puede correr más de una vez.
create or replace function public.manual_marca(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c record; completo boolean;
begin
  if coalesce(p_slug, '') = '' then return null; end if;
  select * into c from public.clientes x
  where (x.marca -> 'manual' ->> 'slug' = p_slug and coalesce((x.marca -> 'manual' ->> 'publicado')::boolean, false))
     or (x.marca -> 'manual' ->> 'slug_c' = p_slug and coalesce((x.marca -> 'manual' ->> 'completo')::boolean, false))
  limit 1;
  if c.id is null then return null; end if;
  completo := c.marca -> 'manual' ->> 'slug_c' = p_slug;
  -- La guía pública no lleva la estrategia ni la voz: eso queda solo en el manual completo.
  return jsonb_build_object('nombre', c.nombre, 'avatar', c.avatar_url, 'version', case when completo then 'completo' else 'simple' end,
    'marca', jsonb_strip_nulls(jsonb_build_object(
      'kit', c.marca -> 'kit', 'visual', c.marca -> 'visual', 'colores', c.marca -> 'colores', 'tipografias', c.marca -> 'tipografias',
      'manual', case when completo then (c.marca -> 'manual') - 'slug' - 'slug_c'
        else (c.marca -> 'manual') - array['slug', 'slug_c', 'concepto', 'punto', 'proposito', 'posicionamiento', 'promesa', 'territorio', 'publico', 'personalidad', 'rasgos', 'manifiesto'] end)
      || case when completo then jsonb_strip_nulls(jsonb_build_object(
      'rubro', c.marca -> 'rubro', 'publico', c.marca -> 'publico', 'tono', c.marca -> 'tono', 'trato', c.marca -> 'trato', 'emojis', c.marca -> 'emojis',
      'palabras_si', c.marca -> 'palabras_si', 'palabras_no', c.marca -> 'palabras_no', 'pilares', c.marca -> 'pilares',
      'hashtags', c.marca -> 'hashtags', 'ejemplos', c.marca -> 'ejemplos')) else '{}'::jsonb end));
end $$;
grant execute on function public.manual_marca(text) to anon, authenticated;
