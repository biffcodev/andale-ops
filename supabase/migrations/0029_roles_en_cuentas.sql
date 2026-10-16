-- 0029 · Qué hace cada persona en cada cuenta de Redes / Ads
-- Ej.: Jime (Dirección) y Mili (Cuentas y programación) están en todas; Vale o Cata (Diseño) según la cuenta;
-- un proveedor de Ads (MADS) como Ads. El rol ordena quién aparece primero y a quién se le asigna el mes y las piezas.

alter table public.abono_responsables add column if not exists rol text not null default '';

-- Roles de la cuenta (editables en Configuración › Opciones)
insert into public.listas (clave, valores) values
  ('rolesCuenta', array['Dirección', 'Cuentas y programación', 'Diseño', 'Ads', 'Contenido', 'Branding', 'Otro'])
on conflict (clave) do nothing;

-- Equipo fijo: está en todas las cuentas de Redes con ese rol (se edita en Configuración › Opciones)
insert into public.listas (clave, valores)
select 'equipoFijo', array_remove(array[
  (select 'Jime=Dirección' from public.personas where alias = 'Jime' and activo limit 1),
  (select 'Mili=Cuentas y programación' from public.personas where alias = 'Mili' and activo limit 1)
], null)
on conflict (clave) do nothing;

-- Completar el rol de quienes ya están asignados, según su puesto
update public.abono_responsables ar set rol = case
    when a.tipo = 'Ads' and p.rol = 'externo' then 'Ads'
    when p.alias = 'Jime' then 'Dirección'
    when p.alias = 'Mili' or p.puesto ilike '%account%' or p.puesto ilike '%cuentas%' or p.puesto ilike '%community%' then 'Cuentas y programación'
    when p.puesto ilike '%design%' or p.puesto ilike '%diseñ%' then 'Diseño'
    else ''
  end
from public.abonos a, public.personas p
where a.id = ar.abono_id and p.id = ar.persona_id and ar.rol = '';
