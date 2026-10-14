# àndale · Operaciones

Sistema interno de àndale: clientes, abonos mensuales, proyectos, comunicaciones y, para administradores, la administración de la agencia.

Proyecto independiente: no comparte código, base ni infraestructura con otros proyectos.

## Roles

| Rol | Ve | Puede |
|---|---|---|
| **Administrador** (socios) | Todo, incluida Administración | Todo, incluido gestionar accesos |
| **Equipo** | Clientes, abonos, proyectos, comunicaciones. Sin montos | Cargar y editar lo operativo |
| **Externo** (proveedores) | Solo proyectos y abonos donde figura como responsable, y sus clientes | Actualizar estado, fechas y links de sus proyectos; registrar comunicaciones propias |

Los permisos se aplican en la base de datos con Row Level Security (`supabase/migrations`). La interfaz solo oculta lo que de todas formas la base no devuelve. Las pruebas de permisos están en `supabase/tests/permisos.sql`.

Para dar acceso: **Equipo y accesos → persona → email de acceso + rol**. La persona entra con un link que le llega por email. Si se la marca como inactiva, pierde el acceso en el momento.

## Stack

- Front: Vite + JavaScript sin framework (`src/`), publicado como sitio estático en Vercel.
- Base, login y permisos: Supabase (Postgres + Auth por link de email + Realtime).

## Desarrollo

```bash
npm install
cp .env.example .env.local   # completar URL y anon key de Supabase
npm run dev
```

## Base de datos

1. `supabase/migrations/0001_schema.sql`: personas, roles, clientes, abonos, proyectos, comunicaciones, listas y RLS.
2. `supabase/migrations/0002_administracion.sql`: precios, resúmenes, facturas, caja y cobranza (solo administradores).
3. `supabase/seed/0001_datos_actuales.sql`: datos migrados desde la versión anterior.

## Pendiente

- Etapa 2: pantallas de Administración (precios y aumentos, resúmenes de cuenta, facturas ARCA/invoices, cobros, recordatorios, cierre de mes).
- Etapa 3: Caja (importación desde 1/1/2026).
- Login con Google.
