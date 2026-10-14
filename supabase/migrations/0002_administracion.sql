-- àndale · Administración — solo administradores (socios).
-- Precios, resúmenes de cuenta, facturas/invoices, cobranza y caja.

-- Datos fiscales y administrativos del cliente (separados para que el equipo no los vea)
create table if not exists public.clientes_admin (
  cliente_id uuid primary key references public.clientes(id) on delete cascade,
  razon_social text not null default '',
  cuit text not null default '',
  condicion_iva text not null default '',
  email_facturacion text not null default '',
  carpeta_admin text not null default '',     -- link a la carpeta de administración (Drive)
  moneda text not null default 'ARS',
  emisor_default text not null default '',    -- 'Fer' | 'Jime' | ''
  comprobante_default text not null default 'Factura ARCA', -- o 'Invoice'
  notas text not null default '',
  updated_at timestamptz not null default now()
);

-- Precio de cada abono con historial (cada aumento es una fila nueva)
create table if not exists public.precios_abono (
  id uuid primary key default gen_random_uuid(),
  abono_id uuid not null references public.abonos(id) on delete cascade,
  desde date not null,                        -- primer día del mes desde el que rige
  monto numeric(14,2) not null,
  moneda text not null default 'ARS',
  motivo text not null default '',            -- 'Aumento 4%', 'Precio inicial', 'Voucher'...
  aviso_enviado date,                         -- cuándo se avisó al cliente
  created_at timestamptz not null default now(),
  unique (abono_id, desde)
);

-- Meses de facturación de proyectos (anticipo, saldo, cuotas)
create table if not exists public.proyecto_facturacion (
  id uuid primary key default gen_random_uuid(),
  proyecto_id uuid not null references public.proyectos(id) on delete cascade,
  periodo date not null,
  concepto text not null default '',
  monto numeric(14,2),
  moneda text not null default 'ARS',
  created_at timestamptz not null default now()
);

-- Resumen de cuenta mensual por cliente
create table if not exists public.resumenes (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  periodo date not null,
  moneda text not null default 'ARS',
  items jsonb not null default '[]',
  total numeric(14,2) not null default 0,
  nota text not null default '',
  estado text not null default 'Borrador' check (estado in ('Borrador','Enviado')),
  enviado_el date,
  link_pdf text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cliente_id, periodo)
);

-- Comprobantes emitidos: factura ARCA (monotributo de Fer o Jime) o invoice
create table if not exists public.facturas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete restrict,
  periodo date,                               -- mes al que corresponde
  tipo text not null default 'Factura ARCA' check (tipo in ('Factura ARCA','Invoice','Otro')),
  emisor text not null default '',            -- 'Fer' | 'Jime'
  numero text not null default '',
  fecha date not null default current_date,
  vencimiento date,
  concepto text not null default '',
  moneda text not null default 'ARS',
  monto numeric(14,2) not null,
  link_pdf text not null default '',
  anulada boolean not null default false,
  notas text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cajas y cuentas donde está la plata
create table if not exists public.cajas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  moneda text not null default 'ARS',
  saldo_inicial numeric(14,2) not null default 0,
  saldo_inicial_fecha date,
  activa boolean not null default true,
  orden int not null default 0
);

-- Plan de cuentas (cuenta / subcuenta) heredado de la planilla de caja
create table if not exists public.plan_cuentas (
  id uuid primary key default gen_random_uuid(),
  cuenta text not null,
  subcuenta text not null default '',
  unique (cuenta, subcuenta)
);

-- Movimientos de caja (ingresos y egresos). Un cobro de factura es un ingreso con factura_id.
create table if not exists public.movimientos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  cuenta text not null,
  subcuenta text not null default '',
  contraparte text not null default '',       -- cliente o proveedor tal como figura
  cliente_id uuid references public.clientes(id) on delete set null,
  persona_id uuid references public.personas(id) on delete set null, -- proveedor externo o socio
  detalle text not null default '',
  ingreso numeric(14,2) not null default 0,
  egreso numeric(14,2) not null default 0,
  moneda text not null default 'ARS',
  caja_id uuid references public.cajas(id) on delete set null,
  factura_id uuid references public.facturas(id) on delete set null,
  reintegro_a text not null default '',       -- 'Fer' | 'Jime' si lo pagó un socio y se le debe
  reintegrado boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists movimientos_fecha on public.movimientos(fecha);
create index if not exists movimientos_factura on public.movimientos(factura_id);

-- Gestiones de cobranza: resumen enviado, factura enviada, recordatorio, aviso de aumento
create table if not exists public.gestiones (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  factura_id uuid references public.facturas(id) on delete set null,
  periodo date,
  tipo text not null check (tipo in ('Resumen de cuenta','Factura enviada','Recordatorio de pago','Aviso de aumento','Otro')),
  fecha date not null default current_date,
  canal text not null default '',
  nota text not null default '',
  persona_id uuid references public.personas(id) on delete set null,
  created_at timestamptz not null default now()
);

do $$ declare t text; begin
  foreach t in array array['resumenes','facturas','movimientos'] loop
    execute format('create trigger %I_upd before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- Todo lo de administración: solo admin
do $$ declare t text; begin
  foreach t in array array['clientes_admin','precios_abono','proyecto_facturacion','resumenes','facturas','cajas','plan_cuentas','movimientos','gestiones'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for all to authenticated using (public.es_admin()) with check (public.es_admin())', t||'_admin', t);
  end loop;
end $$;

-- Saldo de cada factura (pagos = ingresos de caja vinculados)
create or replace view public.facturas_saldo with (security_invoker = true) as
select f.*,
  coalesce((select sum(m.ingreso) from public.movimientos m where m.factura_id = f.id), 0) as cobrado,
  f.monto - coalesce((select sum(m.ingreso) from public.movimientos m where m.factura_id = f.id), 0) as saldo
from public.facturas f where not f.anulada;

do $$ begin
  alter publication supabase_realtime add table public.clientes_admin, public.precios_abono, public.proyecto_facturacion, public.resumenes, public.facturas, public.cajas, public.movimientos, public.gestiones;
exception when others then null; end $$;

revoke all on all tables in schema public from anon;
