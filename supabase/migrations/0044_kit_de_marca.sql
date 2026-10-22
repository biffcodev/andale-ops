-- 0044 · Kit de marca de cada cliente: logos, tipografías, imágenes y archivos
-- Los archivos se guardan en el bucket "marcas" (público, para que los logos se vean y se descarguen sin vueltas).
-- Solo el equipo (staff) sube, cambia o borra. Lo demás del kit (colores, tipografías, links) vive en clientes.marca.kit.
-- Se puede correr más de una vez.

insert into storage.buckets (id, name, public, file_size_limit)
values ('marcas', 'marcas', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = 52428800;

drop policy if exists marcas_ver on storage.objects;
create policy marcas_ver on storage.objects for select to authenticated using (bucket_id = 'marcas');
drop policy if exists marcas_subir on storage.objects;
create policy marcas_subir on storage.objects for insert to authenticated with check (bucket_id = 'marcas' and es_staff());
drop policy if exists marcas_cambiar on storage.objects;
create policy marcas_cambiar on storage.objects for update to authenticated using (bucket_id = 'marcas' and es_staff());
drop policy if exists marcas_borrar on storage.objects;
create policy marcas_borrar on storage.objects for delete to authenticated using (bucket_id = 'marcas' and es_staff());
