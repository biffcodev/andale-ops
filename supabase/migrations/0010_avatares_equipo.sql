-- Fotos de perfil: el equipo (admins y equipo) puede cargar las de clientes y las de cualquier persona del equipo;
-- los externos, solo la propia. Agrega la lectura que necesita el "reemplazar foto" (upsert) de Storage.

drop policy if exists avatares_ver on storage.objects;
drop policy if exists avatares_subir on storage.objects;
drop policy if exists avatares_cambiar on storage.objects;
drop policy if exists avatares_borrar on storage.objects;

-- El bucket es público (las fotos se ven por URL); esto solo habilita a la app a reemplazarlas.
create policy avatares_ver on storage.objects for select to authenticated using (bucket_id = 'avatares');
create policy avatares_subir on storage.objects for insert to authenticated with check (
  bucket_id = 'avatares' and (
    (name like 'clientes/%' and public.es_staff()) or
    (name like 'personas/%' and (public.es_staff() or split_part(split_part(name, '/', 2), '.', 1) = private.mi_persona()::text))));
create policy avatares_cambiar on storage.objects for update to authenticated using (
  bucket_id = 'avatares' and (
    (name like 'clientes/%' and public.es_staff()) or
    (name like 'personas/%' and (public.es_staff() or split_part(split_part(name, '/', 2), '.', 1) = private.mi_persona()::text))));
create policy avatares_borrar on storage.objects for delete to authenticated using (
  bucket_id = 'avatares' and (
    (name like 'clientes/%' and public.es_staff()) or
    (name like 'personas/%' and (public.es_staff() or split_part(split_part(name, '/', 2), '.', 1) = private.mi_persona()::text))));

-- Guardar la foto de una persona sin abrir el resto de su ficha: equipo para cualquiera, externos solo la suya.
-- Solo acepta una URL del bucket de avatares para esa misma persona (o vacío, para sacarla).
create or replace function public.avatar_persona(pid uuid, url text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not (public.es_staff() or pid = private.mi_persona()) then raise exception 'No tenés permiso para cambiar esta foto'; end if;
  if coalesce(url, '') <> '' and position('/storage/v1/object/public/avatares/personas/' || pid::text || '.' in url) = 0 then
    raise exception 'Foto inválida';
  end if;
  update public.personas set avatar_url = coalesce(url, '') where id = pid;
end $$;
revoke execute on function public.avatar_persona(uuid, text) from public, anon;
grant execute on function public.avatar_persona(uuid, text) to authenticated;
