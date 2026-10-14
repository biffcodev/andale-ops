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
3. `supabase/seed/0001_datos_actuales.sql`: clientes, abonos, proyectos y equipo migrados desde la versión anterior.
4. `supabase/seed/0002_administracion.sql`: cajas, plan de cuentas, precios vigentes de octubre 2026 y datos fiscales encontrados en las planillas (todo marcado "confirmar").
5. `supabase/seed/0003_caja_2026.sql`: movimientos de caja 2026 + saldo inicial al 1/1/2026. Verificado contra la hoja "Saldo de Cajas" (ARS 637.968,30 · USD 2.314,06 al 10/10/2026).

## Administración (solo administradores)

- **Cierre de mes**: por cliente, resumen de cuenta → comprobante (factura ARCA de Fer o Jime, o invoice) → cobro → recordatorio. Exporta el CSV para la combinación de correspondencia de Gmail y arma la versión imprimible del resumen.
- **Facturas**: comprobantes, saldos y quién debe. Los cobros se registran como ingresos de caja vinculados a la factura.
- **Precios**: precio vigente de cada abono con historial; aumentos masivos por porcentaje y aviso al cliente.
- **Caja**: movimientos con el plan de cuentas de la planilla, saldos por moneda, lo que se les debe a los socios y resumen anual.

## Pendiente

- Facturas de junio a octubre 2026: la planilla de facturación dejó de actualizarse en mayo; cargar con Jime.
- Login con Google.

## Deploy (Vercel Hobby)

Cada push a `main` se publica solo. En el plan Hobby, Vercel **bloquea** los deploys de commits cuyo autor no es la cuenta dueña del proyecto.
Commitear siempre como `biffcodev <257424274+biffcodev@users.noreply.github.com>` (configurado en `git config` local del repo).

## Emails (Resend)

La app manda emails con el estilo del resumen de cuenta: resumen (con PDF adjunto), recordatorio de pago, aviso de aumento,
comprobante (factura ARCA / invoice) y mensajes libres. Uno por uno o en masa (resúmenes del mes, avisos de aumento).

- Plantillas: `src/emails.js` · PDF vectorial: `src/pdf.js` (fuentes en `public/fonts/pdf/`, TrueType)
- Envío: Edge Function `supabase/functions/enviar-email` (solo admins) → Resend. Registra cada envío en `emails` y la gestión del cliente.
- Secretos de la función: `RESEND_API_KEY` (obligatorio), `EMAIL_FROM`, `EMAIL_REPLY_TO` (opcionales).
- Imágenes del email: `public/marca/email-iso.png` y `email-logo.png`, servidas desde `https://andale-ops.vercel.app`.
- Mails de acceso (login): `supabase/templates/*.html` → pegar en Supabase → Authentication → Emails, con Resend como SMTP.

## Fijos y variables

- **Estado del cliente automático** (trigger en la base): abono activo → Activo; proyecto abierto → Proyectos; nada → Inactivo. Si se elige otro a mano queda `estado_manual` (fijado) hasta volver a automático.
- **Etapas de proyecto** (`proyectos.etapas`), con plantillas por tipo en Listas (`listas.clave = 'etapas:<Tipo>'`). Estado nuevo: Presupuestado.
- **Presupuesto y plan de pagos** (`proyecto_finanzas`, solo admins): genera las cuotas en `proyecto_facturacion`.
- **Pauta de Ads** (`abono_finanzas`, solo admins): si la adelanta àndale, el resumen suma “Inversión en pauta” aparte del honorario.
- **Costos** (`imputaciones`, solo admins): un egreso de Caja se reparte entre abonos/proyectos → vista Rentabilidad (margen de contribución).
