-- 0032 · Qué redes gestionamos en cada cuenta y cómo se cobran las piezas extra
-- 1) En cada servicio de Redes se marcan las redes que se gestionan (Instagram, Facebook, TikTok…):
--    las piezas nuevas salen para esas redes y se puede elegir una o varias por pieza.
-- 2) Piezas extra (fuera del plan): por cuenta se decide si se cobran o van de onda, con un precio por formato.
--    En cada pieza extra se puede cambiar: "se cobra" o "sin cargo". Si se cobran, aparecen en el resumen del mes.

alter table public.abonos add column if not exists redes text[] not null default '{}';

-- Precios: solo administradores (abono_finanzas ya es solo admin)
alter table public.abono_finanzas add column if not exists extras_cobro boolean not null default false;
alter table public.abono_finanzas add column if not exists extras_precios jsonb not null default '{}'::jsonb;  -- { "Posts": 25000, "Reels": 40000 }
alter table public.abono_finanzas add column if not exists extras_moneda text not null default 'ARS';

-- En cada pieza: '' = según la cuenta · 'si' = se cobra · 'no' = sin cargo
alter table public.piezas add column if not exists extra_cobro text not null default '';
do $$ begin
  alter table public.piezas add constraint piezas_extra_cobro_chk check (extra_cobro in ('', 'si', 'no'));
exception when duplicate_object then null; end $$;

-- Las cuentas de Redes que ya existen arrancan con las redes que el cliente tiene cargadas en su ficha (o Instagram).
update public.abonos a set redes = coalesce((
    select array_agg(x.nombre order by x.ord) from (values
      ('instagram', 'Instagram', 1), ('facebook', 'Facebook', 2), ('tiktok', 'TikTok', 3), ('linkedin', 'LinkedIn', 4), ('youtube', 'YouTube', 5), ('x', 'X', 6)
    ) as x(k, nombre, ord)
    join public.clientes c on c.id = a.cliente_id
    where coalesce(c.redes ->> x.k, '') <> ''
  ), array['Instagram'])
where a.tipo = 'Redes' and a.redes = '{}';
