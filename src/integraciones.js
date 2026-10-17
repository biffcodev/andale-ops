// Integraciones: qué apps se conectan con àndale Operaciones, para qué le sirven a la agencia y cómo se configuran.
// Logos: set abierto Simple Icons (CC0). Las que no están en el set llevan monograma.
// Estado: 'on' conectada y funcionando · 'tog' se prende/apaga y se configura acá · 'prox' todavía no conectada (se puede pedir y priorizar).
// Guardado en listas (las ve todo el equipo): 'integraciones' (prendidas y pedidas: 'quiero:k') e 'integraciones_cfg' ('k.campo=valor').
import { confirmar } from './dialogo.js';
import {
  siWhatsapp, siGmail, siGooglecalendar, siGoogledrive, siGooglesheets, siMercadopago, siWise, siPayoneer, siPaypal, siStripe,
  siMeta, siInstagram, siTiktok, siLinkedin, siGoogleanalytics, siGoogleads, siSlack, siNotion, siTrello, siClickup, siCanva, siFigma,
  siAdobecreativecloud, siDropbox, siCalendly, siZoom, siGooglemeet, siTypeform, siHubspot, siZapier, siMake, siToggl, siHootsuite, siYoutube,
  siWordpress, siShopify, siWebflow, siMailchimp, siBehance, siPinterest, siN8n, siMiro, siLoom,
} from 'simple-icons';

const CATS = [
  ['clientes', 'Clientes y comunicación', 'Hablar con los clientes sin salir de la app y que todo quede anotado.'],
  ['redes', 'Redes y publicidad', 'El corazón de la agencia: métricas, pauta e informes de cada cuenta.'],
  ['diseno', 'Diseño y archivos', 'Las herramientas donde se hace el trabajo, a mano desde cada proyecto.'],
  ['plata', 'Cobros y plata', 'Facturar, cobrar y saber cuánto entró, en pesos y en el exterior.'],
  ['equipo', 'Equipo y organización', 'Agenda, avisos y horas del equipo.'],
  ['ventas', 'Ventas y webs de clientes', 'Nuevos clientes que llegan solos y las webs que mantenemos.'],
  ['ia', 'IA y automatización', 'Mr. Piggy y los conectores para unir cualquier otra app.'],
];
const ESF = { 1: 'Rápida', 2: 'Media', 3: 'Grande' };

// k, nombre, categoría, logo, estado, qué hace (1 línea), detalle (viñetas), qué hace falta, esfuerzo (1-3), config (solo 'tog')
const CAT = [
  // Clientes y comunicación
  { k: 'email', n: 'Email', cat: 'clientes', mono: '@', color: '#FC4855', st: 'on', cred: 'email', que: 'Mails a clientes, resúmenes de cuenta, recordatorios e invoices con la estética de àndale.', det: ['Sale desde administracion@weareandale.com con el nombre de quien escribe.', 'Las respuestas le llegan a esa persona.', 'Cada mail queda anotado en las charlas del cliente.'], falta: 'Ya está conectado (Resend).' },
  { k: 'whatsapp', n: 'WhatsApp', cat: 'clientes', ic: siWhatsapp, st: 'tog', que: 'Botón en cada cliente que abre el chat con su número y un saludo listo.', det: ['Abre WhatsApp Web o la app con el número del cliente.', 'El mensaje inicial se configura acá ({nombre} se reemplaza solo).', 'Para pegar una charla de WhatsApp como charla, usá “Anotar charla”.'], falta: 'Nada: funciona con links directos.', cfg: [{ c: 'msg', l: 'Mensaje inicial', tipo: 'textarea', def: 'Hola {nombre}, ¿cómo estás?' }] },
  { k: 'whatsapp_api', n: 'WhatsApp Business', cat: 'clientes', ic: siWhatsapp, st: 'prox', esf: 3, cred: 'whatsapp', que: 'Mandar resúmenes, recordatorios y avisos por WhatsApp de forma automática.', det: ['Resumen de cuenta y recordatorio de pago por WhatsApp, además del mail.', 'Respuestas del cliente anotadas como charla.', 'Avisos de entregas listas.'], falta: 'Cuenta de WhatsApp Business API (Meta) con un número propio y plantillas aprobadas.' },
  { k: 'gmail', n: 'Gmail', cat: 'clientes', ic: siGmail, st: 'prox', esf: 2, que: 'Ver los mails con cada cliente en su ficha y anotarlos como charla con un clic.', det: ['Hilos de mail por cliente en la ficha.', 'Mr. Piggy resume el hilo y propone el próximo paso.'], falta: 'Autorizar las casillas de Google Workspace de cada persona.' },
  { k: 'calendly', n: 'Calendly', cat: 'clientes', ic: siCalendly, st: 'prox', esf: 1, que: 'Las reuniones que agendan los clientes quedan como charla con fecha.', det: ['Reunión agendada → charla pendiente en la ficha del cliente.', 'Recordatorio al responsable.'], falta: 'Cuenta de Calendly y un webhook.' },
  { k: 'meet', n: 'Google Meet y Zoom', cat: 'clientes', ic: siGooglemeet, st: 'prox', esf: 2, que: 'Link de reunión al anotar una charla y resumen automático con Mr. Piggy.', det: ['Crear la reunión desde la ficha del cliente.', 'La transcripción se convierte en charla con acuerdos y próximos pasos.'], falta: 'Google Workspace o Zoom con transcripciones activadas.' },

  // Redes y publicidad
  { k: 'meta', n: 'Instagram y Facebook', cat: 'redes', ic: siInstagram, st: 'prox', esf: 3, que: 'Métricas de cada cuenta que manejamos para el informe mensual del cliente.', det: ['Seguidores, alcance y posteos por mes, por cliente.', 'Informe mensual en PDF con la estética de àndale.', 'Alerta si una cuenta cae o deja de publicar.'], falta: 'App de Meta aprobada y acceso a las cuentas de los clientes (Business Manager).' },
  { k: 'meta_ads', n: 'Meta Ads', cat: 'redes', ic: siMeta, st: 'prox', esf: 2, que: 'La inversión real del mes en pauta entra sola al resumen de cuenta de Ads.', det: ['Gasto por cliente y por campaña.', 'Pauta adelantada por àndale → línea en el resumen del mes.', 'Resultados para el informe.'], falta: 'Acceso de lectura a las cuentas publicitarias de los clientes.' },
  { k: 'google_ads', n: 'Google Ads', cat: 'redes', ic: siGoogleads, st: 'prox', esf: 2, que: 'Inversión y resultados de Google Ads por cliente.', det: ['Gasto del mes al resumen de Ads.', 'Clics, conversiones y costo por resultado.'], falta: 'Cuenta de administrador (MCC) con los clientes vinculados.' },
  { k: 'tiktok', n: 'TikTok', cat: 'redes', ic: siTiktok, st: 'prox', esf: 2, que: 'Métricas de las cuentas de TikTok de los clientes.', det: ['Vistas, seguidores y videos por mes.'], falta: 'TikTok for Business y autorización de cada cuenta.' },
  { k: 'linkedin', n: 'LinkedIn', cat: 'redes', ic: siLinkedin, st: 'prox', esf: 2, que: 'Métricas de las páginas de empresa que manejamos.', det: ['Seguidores, impresiones y publicaciones.'], falta: 'Acceso de administrador a las páginas.' },
  { k: 'youtube', n: 'YouTube', cat: 'redes', ic: siYoutube, st: 'prox', esf: 2, que: 'Vistas y suscriptores de los canales de clientes.', det: ['Para clientes con producción audiovisual.'], falta: 'Autorización de cada canal.' },
  { k: 'analytics', n: 'Google Analytics', cat: 'redes', ic: siGoogleanalytics, st: 'prox', esf: 2, que: 'Visitas de las webs que hicimos, en la ficha del cliente y en el informe.', det: ['Visitas, origen y conversiones por mes.'], falta: 'Acceso de lectura a cada propiedad de GA4.' },
  { k: 'programacion', n: 'Programación de posteos', cat: 'redes', ic: siHootsuite, st: 'prox', esf: 3, que: 'Ver la grilla de cada cliente y qué se publicó (Hootsuite, Metricool, Meta).', det: ['Grilla del mes por abono de Redes.', 'Aviso si falta contenido para la semana.'], falta: 'Definir la herramienta que usa el equipo.' },
  { k: 'pinterest', n: 'Pinterest', cat: 'redes', ic: siPinterest, st: 'prox', esf: 2, que: 'Métricas de tableros de clientes.', det: ['Impresiones y guardados.'], falta: 'Autorización de cada cuenta.' },

  // Diseño y archivos
  { k: 'drive', n: 'Google Drive', cat: 'diseno', ic: siGoogledrive, st: 'on', cred: 'google', que: 'Lee las facturas de la carpeta de administración y las carga solas.', det: ['En Cobros → Asistente.', 'Links de carpeta en cada cliente y proyecto.'], falta: 'Ya está conectado.' },
  { k: 'drive_carpetas', n: 'Carpetas automáticas en Drive', cat: 'diseno', ic: siGoogledrive, st: 'prox', esf: 2, que: 'Al crear un cliente o proyecto, se crea su carpeta con la estructura de àndale.', det: ['Cliente / Proyecto / Brief, Diseño, Entregables.', 'El link queda guardado solo.'], falta: 'Permiso de escritura en la unidad compartida.' },
  { k: 'canva', n: 'Canva', cat: 'diseno', ic: siCanva, st: 'prox', esf: 2, que: 'Diseños del proyecto con vista previa desde la ficha.', det: ['Ver y abrir los diseños de cada cliente.', 'Exportar piezas al entregar.'], falta: 'Canva para equipos y la app de Canva Connect.' },
  { k: 'figma', n: 'Figma', cat: 'diseno', ic: siFigma, st: 'prox', esf: 2, que: 'Archivos y prototipos de cada proyecto, con miniatura.', det: ['Ver la última versión sin abrir Figma.', 'Comentarios del cliente como tareas.'], falta: 'Token de Figma del equipo.' },
  { k: 'adobe', n: 'Adobe Creative Cloud', cat: 'diseno', ic: siAdobecreativecloud, st: 'prox', esf: 3, que: 'Bibliotecas de marca de cada cliente a mano.', det: ['Logos, colores y tipografías por cliente.'], falta: 'Cuenta de Adobe para equipos.' },
  { k: 'dropbox', n: 'Dropbox', cat: 'diseno', ic: siDropbox, st: 'cred', cred: 'dropbox', que: 'Las carpetas de redes y entregas se crean solas, el arte se sube desde la app y se cuenta lo que ya está listo.', det: ['Al arrancar un mes de redes se crea Cliente / RRSS / Año / Mes / Historias · Reels · Posts.', 'Subís el arte a cada pieza desde la app y queda en su carpeta.', 'La app cuenta lo que hay en cada carpeta: “Historias 18 de 20”.', 'Las miniaturas se ven en la planilla, en el feed y en el portal del cliente.'], falta: 'La cuenta de Dropbox de la agencia y una app de Dropbox (son 5 minutos).',
    cfg: [{ c: 'crear', l: '¿La app crea carpetas en Dropbox?', tipo: 'select', def: 'no', opts: [['no', 'No: las carpetas las arma el equipo, la app solo las abre'], ['si', 'Sí: al arrancar un mes, crea su carpeta con este formato']] }, { c: 'patron_redes', l: 'Carpeta de cada mes de redes', tipo: 'text', def: '{cliente}/RRSS/{año}/{mes}' }, { c: 'mes', l: 'Cómo se escribe el mes', tipo: 'text', def: '{mm} {Mes}' }, { c: 'patron_proyectos', l: 'Carpeta de las entregas de proyectos', tipo: 'text', def: '{cliente}/Proyectos/{proyecto}/Entregas' }],
    ayuda: 'Las rutas son relativas a la carpeta base. Se reemplazan {cliente}, {proyecto}, {año}, {mes}, {mm} (11) y {Mes} (Noviembre). Las subcarpetas de cada mes son los formatos de redes (se editan en Opciones).' },
  { k: 'behance', n: 'Behance', cat: 'diseno', ic: siBehance, st: 'prox', esf: 2, que: 'Al terminar un proyecto, armar el caso para el portfolio.', det: ['Mr. Piggy redacta el texto del caso.', 'Checklist de imágenes a exportar.'], falta: 'Cuenta de Behance de àndale.' },
  { k: 'loom', n: 'Loom', cat: 'diseno', ic: siLoom, st: 'prox', esf: 1, que: 'Videos explicativos para clientes guardados en el proyecto.', det: ['Presentar una propuesta grabada.'], falta: 'Cuenta de Loom.' },

  // Cobros y plata
  { k: 'bancos', n: 'Resúmenes del banco', cat: 'plata', mono: 'B', color: '#0E7A5A', st: 'on', que: 'Subís el resumen (PDF o Excel) y Mr. Piggy encuentra qué cobros y gastos faltan cargar.', det: ['En Cobros → Asistente → Leer el resumen.', 'Funciona con cualquier banco.'], falta: 'Ya está conectado.' },
  { k: 'sheets', n: 'Excel y Google Sheets', cat: 'plata', ic: siGooglesheets, st: 'on', que: 'Cualquier lista se baja a Excel desde la barra de arriba.', det: ['Se abre igual en Google Sheets.'], falta: 'Ya está conectado.' },
  { k: 'arca', n: 'ARCA', cat: 'plata', mono: 'A', color: '#1F4E9E', st: 'prox', esf: 3, que: 'Facturas electrónicas sin salir de la app: el resumen se convierte en factura.', det: ['Factura A, B, C o E desde el resumen del mes.', 'Número y PDF quedan cargados solos.', 'Sin volver a tipear montos.'], falta: 'Certificado digital de ARCA por cada socia que factura y punto de venta web service.' },
  { k: 'mercadopago', n: 'Mercado Pago', cat: 'plata', ic: siMercadopago, st: 'prox', esf: 2, que: 'Link de pago en cada resumen y el cobro se marca solo cuando pagan.', det: ['Botón “Pagar” en el mail del resumen.', 'Cobro registrado automáticamente en Gastos e ingresos.'], falta: 'Cuenta de Mercado Pago y credenciales de producción.' },
  { k: 'wise', n: 'Wise', cat: 'plata', ic: siWise, st: 'prox', esf: 2, que: 'Cobros del exterior en USD, EUR y GBP con los USD recibidos cargados solos.', det: ['Ingreso del invoice marcado como cobrado.', 'Conversión real a dólares sin cargarla a mano.'], falta: 'Cuenta Wise Business y token de lectura.' },
  { k: 'payoneer', n: 'Payoneer', cat: 'plata', ic: siPayoneer, st: 'prox', esf: 2, que: 'Lo mismo que Wise, para clientes que pagan por Payoneer.', det: ['Cobros del exterior conciliados.'], falta: 'Cuenta Payoneer.' },
  { k: 'stripe', n: 'Stripe y PayPal', cat: 'plata', ic: siStripe, st: 'prox', esf: 2, que: 'Clientes del exterior pagan el invoice con tarjeta.', det: ['Link de pago en el invoice.'], falta: 'Cuenta de Stripe (vía LLC) o PayPal.' },
  { k: 'dolar', n: 'Cotización del dólar', cat: 'plata', mono: '$', color: '#2E7D32', st: 'prox', esf: 1, que: 'Dólar oficial y blue del día en Números y al cargar un movimiento.', det: ['Ver los números del mes en pesos o en dólares.', 'Sugerir la cotización al pasar plata.'], falta: 'Nada: usa una fuente pública. Es la más rápida de hacer.' },

  // Equipo y organización
  { k: 'calendario', n: 'Google Calendar', cat: 'equipo', ic: siGooglecalendar, st: 'tog', que: 'Botón “Al calendario” en entregas de proyectos y tareas con fecha.', det: ['Abre Google Calendar con el evento armado.', 'Cada persona lo guarda en su calendario.'], falta: 'Nada: funciona con links directos.', cfg: [{ c: 'aviso', l: 'Agregar al detalle del evento', tipo: 'text', def: 'àndale Operaciones' }] },
  { k: 'calendario_sync', n: 'Calendario sincronizado', cat: 'equipo', ic: siGooglecalendar, st: 'prox', esf: 2, que: 'Las entregas y tareas aparecen solas en el calendario de cada persona.', det: ['Un calendario “àndale” por persona, siempre al día.'], falta: 'Autorizar Google Calendar de cada persona.' },
  { k: 'slack', n: 'Slack', cat: 'equipo', ic: siSlack, st: 'cred', cred: 'slack', que: 'Cada aviso de la app le llega a la persona por mensaje directo en Slack, y a la mañana su resumen del día.', det: ['Te asignan una tarea, te mencionan, te toca una etapa o escribe un cliente → mensaje directo.', 'De lunes a viernes 8:30: tareas atrasadas, para hoy y de la semana, y tickets abiertos.', 'Tickets nuevos y respuestas de clientes también en un canal general (opcional).', 'Quien no esté en Slack recibe el resumen por mail.'], falta: 'El Slack de la agencia y una app de Slack con un bot (son 5 minutos).' },
  { k: 'horas', n: 'Toggl y Clockify', cat: 'equipo', ic: siToggl, st: 'prox', esf: 2, que: 'Horas por proyecto para saber cuánto deja cada trabajo de verdad.', det: ['Horas × costo por persona en “Qué deja cada cliente”.', 'Alertas de proyectos que se pasan de horas.'], falta: 'Que el equipo registre horas en Toggl o Clockify.' },
  { k: 'notion', n: 'Notion', cat: 'equipo', ic: siNotion, st: 'prox', esf: 2, que: 'Briefs y actas de reunión enlazados a cada cliente y proyecto.', det: ['Ver la página del brief desde el proyecto.'], falta: 'Token de integración de Notion.' },
  { k: 'importar', n: 'ClickUp, Trello y Asana', cat: 'equipo', ic: siClickup, st: 'prox', esf: 2, que: 'Traer proyectos y tareas que hoy están en otra herramienta.', det: ['Importación única con responsables y fechas.'], falta: 'Exportación o token de la herramienta.' },
  { k: 'miro', n: 'Miro', cat: 'equipo', ic: siMiro, st: 'prox', esf: 1, que: 'Tableros de workshop y estrategia en la ficha del proyecto.', det: ['Vista previa del tablero.'], falta: 'Cuenta de Miro.' },

  // Ventas y webs
  { k: 'tally', n: 'Tally (briefs)', cat: 'clientes', mono: 'T', color: '#1F1F1F', st: 'cred', cred: 'tally', que: 'Los briefs que completan los clientes entran solos a su ficha y a su proyecto, con un resumen de Mr. Piggy.', det: ['Marcás cada formulario como Branding, Web o Redes y se conecta.', 'Cada respuesta llega al momento (webhook) y queda en el cliente y el proyecto.', 'Mr. Piggy resume el brief y anota lo que falta preguntar.', 'Desde la ficha mandás el link del brief ya atado a ese cliente.'], falta: 'La clave de la API de Tally.' },
  { k: 'formularios', n: 'Formularios de contacto', cat: 'ventas', ic: siTypeform, st: 'prox', esf: 1, que: 'Cada consulta de la web de àndale entra como presupuesto en borrador.', det: ['Typeform, Tally o el formulario de la web.', 'Mr. Piggy arma el primer borrador del presupuesto.'], falta: 'Un webhook desde el formulario.' },
  { k: 'hubspot', n: 'HubSpot', cat: 'ventas', ic: siHubspot, st: 'prox', esf: 3, que: 'Seguimiento comercial de prospectos antes de que sean clientes.', det: ['Prospecto → presupuesto → cliente.'], falta: 'Cuenta de HubSpot (el plan gratis alcanza).' },
  { k: 'webs', n: 'WordPress y Webflow', cat: 'ventas', ic: siWordpress, st: 'prox', esf: 2, que: 'Estado de las webs de clientes: si están online, actualizaciones y vencimientos.', det: ['Aviso si una web se cae.', 'Vencimientos de hosting y dominio como cobro.'], falta: 'Lista de sitios y accesos.' },
  { k: 'shopify', n: 'Shopify', cat: 'ventas', ic: siShopify, st: 'prox', esf: 2, que: 'Ventas de las tiendas que manejamos, para el informe del cliente.', det: ['Ventas por mes vinculadas a la pauta.'], falta: 'App privada en cada tienda.' },
  { k: 'mailchimp', n: 'Mailchimp y Brevo', cat: 'ventas', ic: siMailchimp, st: 'prox', esf: 2, que: 'Newsletters de clientes: aperturas y clics en el informe.', det: ['Métricas de campañas de email.'], falta: 'Token de la cuenta de cada cliente.' },

  // IA y automatización
  { k: 'ia', n: 'Mr. Piggy', cat: 'ia', pig: 1, st: 'on', cred: 'anthropic', que: 'Responde preguntas, redacta mails, arma tareas, carga gastos y charlas.', det: ['Funciona con Claude.', 'Nada se guarda sin que lo revises.'], falta: 'Ya está conectado.' },
  { k: 'zapier', n: 'Zapier y Make', cat: 'ia', ic: siZapier, st: 'prox', esf: 2, que: 'Conectar cualquier otra app sin programar.', det: ['“Cuando pase X en àndale, hacé Y en otra app” y al revés.'], falta: 'Cuenta de Zapier o Make y los webhooks de la app.' },
  { k: 'n8n', n: 'n8n', cat: 'ia', ic: siN8n, st: 'prox', esf: 2, que: 'Automatizaciones propias más complejas, en servidor de àndale.', det: ['Flujos a medida con IA.'], falta: 'Un servidor de n8n.' },
  { k: 'webhooks', n: 'Webhooks', cat: 'ia', mono: '{ }', color: '#4B5563', st: 'prox', esf: 1, que: 'Avisar a otra app cuando pasa algo: proyecto entregado, cobro, presupuesto aceptado.', det: ['La base para Slack, Zapier y cualquier otra.'], falta: 'Nada del lado de ustedes.' },
];
// Cuentas que se cambian desde la app (las claves se guardan cifradas en el servidor y no se vuelven a mostrar).
const CREDS = {
  anthropic: { titulo: 'Cuenta de Anthropic (la IA)', campos: [
    { c: 'key', l: 'Clave de la API', tipo: 'password', ph: 'sk-ant-…' },
    { c: 'cuenta', l: 'Nombre para reconocerla', ph: 'Ej.: àndale' },
    { c: 'modelo', l: 'Modelo preciso (opcional)', ph: 'claude-sonnet-5-5' },
    { c: 'modelo_rapido', l: 'Modelo rápido (opcional)', ph: 'claude-haiku-5-5' }],
    pasos: ['Entrá a console.anthropic.com con el email de la agencia y creá la organización “àndale”.', 'En Billing cargá saldo (se paga por uso).', 'En API Keys tocá “Create Key”, ponele de nombre “andale-ops” y copiala.', 'Pegala acá y tocá “Guardar y probar”. Desde ese momento Mr. Piggy usa la cuenta de la agencia.'] },
  google: { titulo: 'Cuenta de Google (Drive)', campos: [
    { c: 'service_account', l: 'Archivo .json de la cuenta de servicio', tipo: 'textarea', ph: '{ "type": "service_account", "project_id": … }' }],
    pasos: ['Entrá a console.cloud.google.com con el Google de la agencia y creá un proyecto “andale-ops”.', 'En “APIs y servicios” habilitá Google Drive API.', 'En IAM → Cuentas de servicio creá una (“andale-ops”), entrá a Claves → Agregar clave → JSON. Se descarga un archivo.', 'Abrí el archivo con el Bloc de notas, copiá todo y pegalo acá.', 'En Drive compartí la carpeta de administración (y la de presupuestos) con el email que aparece como “client_email”, como Lector.'] },
  email: { titulo: 'Cuenta de envío de mails (Resend)', campos: [
    { c: 'key', l: 'Clave de la API', tipo: 'password', ph: 're_…' },
    { c: 'from', l: 'Remitente', ph: 'àndale <administracion@weareandale.com>' },
    { c: 'reply_to', l: 'Las respuestas van a (opcional)', ph: 'administracion@weareandale.com' }],
    pasos: ['Entrá a resend.com con el email de la agencia.', 'En Domains agregá weareandale.com y cargá los registros DNS que te muestra donde está el dominio.', 'Cuando el dominio diga “Verified”, en API Keys creá una clave con permiso de envío.', 'Pegala acá con el remitente y tocá “Guardar y probar”.'] },
  slack: { titulo: 'Slack de àndale', campos: [
    { c: 'token', l: 'Bot User OAuth Token', tipo: 'password', ph: 'xoxb-…' },
    { c: 'canal', l: 'Canal para tickets y respuestas de clientes (opcional)', ph: 'Ej.: clientes' }],
    pasos: ['Entrá a api.slack.com/apps → “Create New App” → “From scratch”. Nombre: àndale Operaciones. Elegí el Slack de la agencia.', 'En “OAuth & Permissions” → “Bot Token Scopes” agregá: chat:write, users:read, users:read.email (y chat:write.public si querés usar un canal sin invitar al bot).', 'Arriba tocá “Install to Workspace” y aceptá.', 'Copiá el “Bot User OAuth Token” (empieza con xoxb-) y pegalo acá.', 'Importante: en Equipo, cada persona tiene que tener el mismo email que usa en Slack. Así le llegan sus avisos.'] },
  dropbox: { titulo: 'Dropbox de la agencia', campos: [
    { c: 'app_key', l: 'App key', ph: 'De dropbox.com/developers' },
    { c: 'app_secret', l: 'App secret', tipo: 'password' },
    { c: 'raiz', l: 'Carpeta base de clientes', ph: '/Clientes' },
    { c: 'codigo', l: 'Código de autorización', ph: 'Lo da Dropbox al tocar “Autorizar”' }],
    boton: { l: 'Autorizar en Dropbox ↗', act: 'igDbxAuth' },
    pasos: ['Entrá a dropbox.com/developers/apps con la cuenta de la agencia → “Create app” → “Scoped access” → “Full Dropbox”. Nombre: andale-ops.', 'En “Permissions” marcá files.metadata.read, files.metadata.write, files.content.read, files.content.write y account_info.read. Tocá “Submit”.', 'En “Settings” copiá App key y App secret y pegalos acá. Poné también la carpeta donde están los clientes (por ejemplo /Clientes).', 'Tocá “Autorizar en Dropbox”, aceptá y copiá el código que te muestra.', 'Pegá el código y tocá “Guardar y probar”.'] },
  tally: { titulo: 'Cuenta de Tally', campos: [
    { c: 'key', l: 'Clave de la API', tipo: 'password', ph: 'tly-…' }],
    pasos: ['En tally.so → Settings → API keys tocá “Create API key” y copiala.', 'Pegala acá y tocá “Guardar y probar”.', 'Abajo marcá qué formulario es de Branding, Web o Redes y tocá “Conectar”. Desde ese momento cada respuesta entra sola.', 'Para que cada brief caiga en el cliente correcto, en cada formulario de Tally agregá un bloque “Hidden fields” con dos campos: cliente y proyecto. El link que manda la app los completa solo.'] },
  whatsapp: { titulo: 'Número de WhatsApp de àndale', campos: [
    { c: 'numero', l: 'Número (como se ve)', ph: '+54 9 351 …' },
    { c: 'phone_id', l: 'Phone number ID', ph: 'Número largo que da Meta' },
    { c: 'waba_id', l: 'WhatsApp Business Account ID', ph: 'Opcional' },
    { c: 'token', l: 'Token de acceso permanente', tipo: 'password', ph: 'EAA…' }],
    pasos: ['Conseguí un número nuevo solo para àndale: un chip prepago o una línea que pueda recibir SMS o llamada. No tiene que estar usado en WhatsApp.', 'En business.facebook.com verificá la empresa (te pide CUIT y una constancia).', 'En developers.facebook.com creá una app tipo “Business” y agregale el producto WhatsApp.', 'En WhatsApp → Configuración de la API agregá el número nuevo y verificalo con el código que llega.', 'En el Business Manager creá un “usuario del sistema”, generá un token permanente con permisos whatsapp_business_messaging y whatsapp_business_management.', 'Copiá acá el Phone number ID, el ID de la cuenta y el token. Con eso armamos los envíos automáticos.'] },
};

// Variantes que comparten logo con otra marca (para no repetir en la grilla queda el principal).
const EXTRA = { meta: siMeta, meet: siZoom, stripe: siPaypal, importar: siTrello, webs: siWebflow, horas: siToggl, zapier: siMake, programacion: siHootsuite };

import { MODELOS_IA, MODELO_REDES_DEF, gastoIA, nombreModelo, usd } from './iacosto.js';

export function initIntegraciones(ctx) {
  const { S, esc, opt, toast, $, data, render, isAdmin, isStaff, closeForm, ISO } = ctx;
  const st = { cat: '', q: '', ver: '', est: null, cargando: false };
  const L = () => S.L.integraciones || ctx.DEF;
  const CFG = () => S.L.integraciones_cfg || [];
  const cfgGet = (k, c) => { const p = k + '.' + c + '='; const v = CFG().find(x => x.startsWith(p)); const d = ((CAT.find(x => x.k === k) || {}).cfg || []).find(x => x.c === c); return v != null ? v.slice(p.length) : (d ? d.def : ''); };
  const on = x => x.st === 'on' || (x.st === 'tog' && L().includes(x.k)) || (x.st === 'cred' && !!(cuentaDe(x) && (cuentaDe(x).cuenta || cuentaDe(x).secreto_viejo)));
  const quiere = k => L().includes('quiero:' + k);
  const prio = k => { const v = cfgGet(k, 'prio'); return v || (quiere(k) ? 'Media' : ''); };

  function logo(x, big) {
    const sz = big ? 30 : 22;
    if (x.pig) return '<span class="lg pig-lg' + (big ? ' big' : '') + '">' + ISO + '</span>';
    const ic = x.ic;
    if (ic) return '<span class="lg' + (big ? ' big' : '') + '" title="' + esc(x.n) + '"><svg viewBox="0 0 24 24" width="' + sz + '" height="' + sz + '" role="img" aria-label="' + esc(x.n) + '"><path fill="#' + ic.hex + '" d="' + ic.path + '"/></svg>' + (EXTRA[x.k] ? '<svg class="lg2" viewBox="0 0 24 24" width="' + Math.round(sz * .62) + '" height="' + Math.round(sz * .62) + '" aria-hidden="true"><path fill="#' + EXTRA[x.k].hex + '" d="' + EXTRA[x.k].path + '"/></svg>' : '') + '</span>';
    return '<span class="lg mono' + (big ? ' big' : '') + '" style="--c:' + (x.color || '#6B7280') + '">' + esc(x.mono || x.n.charAt(0)) + '</span>';
  }
  const badge = x => x.st === 'cred' ? (!isAdmin() ? '<span class="ig-b off">La configuran las socias</span>' : on(x) ? '<span class="ig-b on">Conectada</span>' : '<span class="ig-b off">Para conectar</span>') : x.st === 'prox' ? (quiere(x.k) ? '<span class="ig-b pedida">★ Pedida</span>' : '<span class="ig-b prox">Próximamente</span>') : on(x) ? '<span class="ig-b on">' + (x.st === 'on' ? 'Conectada' : 'Activa') + '</span>' : '<span class="ig-b off">Apagada</span>';

  async function guardar(k, arr, msg) { const prev = S.L[k]; S.L[k] = arr; render(); try { await data.saveLista(k, arr); if (msg) toast(msg); } catch (e) { S.L[k] = prev; render(); toast(e.message); } }
  function setCfg(k, c, v) { const p = k + '.' + c + '='; return [...CFG().filter(x => !x.startsWith(p)), ...(v ? [p + v] : [])]; }

  async function cargarEstado(forzar) {
    if (!isAdmin() || st.cargando || (st.est && !forzar)) return;
    st.cargando = true;
    try { st.est = await data.credenciales({ accion: 'estado' }); } catch (e) { st.est = { error: e.message, cuentas: {} }; }
    st.cargando = false; if (S.view === 'integraciones') render(); if (st.abierto && $('#igform') && !$('#panel').hidden) panel(st.abierto);
  }
  const cuentaDe = x => { const e = x.cred && st.est && st.est.cuentas ? st.est.cuentas[x.cred] : null; return e || null; };
  function lineaCuenta(x) {
    const e = cuentaDe(x); if (!e) return '';
    if (e.cuenta) return '<span class="ig-cta' + (e.ok === false ? ' mal' : '') + '">' + (e.ok === false ? '⚠ ' : '● ') + esc(e.cuenta) + '</span>';
    if (e.secreto_viejo) return '<span class="ig-cta viejo">● Cuenta cargada a mano en Supabase</span>';
    return x.st === 'prox' ? '' : '<span class="ig-cta mal">Sin cuenta conectada</span>';
  }
  function credHtml(x) {
    const def = CREDS[x.cred]; if (!def || !isAdmin()) return '';
    const e = cuentaDe(x);
    let est = st.cargando && !st.est ? '<p class="muted">Consultando…</p>' : '';
    if (st.est && st.est.error) est = '<p class="ig-warn">' + esc(st.est.error) + '</p>';
    else if (e && e.cuenta) est = '<div class="ig-acc"><b>' + esc(e.cuenta) + '</b><span>' + esc([e.pista ? 'clave ' + e.pista : '', e.por ? 'cargada por ' + e.por : '', e.actualizado ? new Date(e.actualizado).toLocaleDateString('es-AR') : ''].filter(Boolean).join(' · ')) + '</span>' + (e.ok_detalle ? '<span class="' + (e.ok ? 'ok' : 'mal') + '">' + (e.ok ? '✓ ' : '⚠ ') + esc(e.ok_detalle) + '</span>' : '') + '</div>';
    else if (e && e.secreto_viejo) est = '<div class="ig-acc"><b>Cuenta cargada a mano en Supabase</b><span>La que se configuró al principio. Si cargás una nueva acá, pasa a usarse esa.</span></div>';
    else if (st.est) est = '<div class="ig-acc"><b>Todavía no hay ninguna cuenta conectada.</b></div>';
    const campos = def.campos.map(f => '<div class="field' + (f.tipo === 'textarea' ? ' full' : '') + '"><label for="cr-' + f.c + '">' + esc(f.l) + '</label>' + (f.tipo === 'textarea' ? '<textarea id="cr-' + f.c + '" rows="5" placeholder="' + esc(f.ph || '') + '" spellcheck="false" autocomplete="off"></textarea>' : '<input id="cr-' + f.c + '" type="' + (f.tipo === 'password' ? 'password' : 'text') + '" placeholder="' + esc(f.ph || '') + '" autocomplete="off" spellcheck="false">') + '</div>').join('');
    return '<div class="ig-cred full"><div class="ig-cred-h"><span class="lbl">' + esc(def.titulo) + '</span>' + (e && (e.cuenta || e.secreto_viejo) ? '<button type="button" class="btn ghost sm" data-act="igCredProbar" data-n="' + x.cred + '">Probar conexión</button>' : '') + '</div>' + est +
      '<details class="mas"' + (e && (e.cuenta || e.secreto_viejo) ? '' : ' open') + '><summary>' + (e && (e.cuenta || e.secreto_viejo) ? 'Cambiar de cuenta' : 'Conectar una cuenta') + '</summary><div class="mas-b">' +
      '<ol class="ig-pasos full">' + def.pasos.map(p => '<li>' + esc(p) + '</li>').join('') + '</ol>' + campos +
      '<p class="hint full">🔒 La clave se guarda cifrada en el servidor. Nadie la vuelve a ver: la app solo muestra la cuenta y los últimos 4 caracteres.</p>' +
      '<div class="toolbar full">' + (def.boton ? '<button type="button" class="btn sm" data-act="' + def.boton.act + '">' + esc(def.boton.l) + '</button>' : '') + '<button type="button" class="btn primary sm" data-act="igCredGuardar" data-n="' + x.cred + '">Guardar y probar</button>' + (e && e.cuenta ? '<button type="button" class="btn ghost sm danger" data-act="igCredBorrar" data-n="' + x.cred + '">Desconectar</button>' : '') + '</div>' +
      '</div></details></div>';
  }
  async function credGuardar(t) {
    const n = t.dataset.n, def = CREDS[n]; if (!def) return;
    const datos = {}; def.campos.forEach(f => { const el = $('#cr-' + f.c); datos[f.c] = el ? el.value.trim() : ''; });
    if (!Object.values(datos).some(Boolean)) { toast('Completá los datos de la cuenta'); return; }
    t.disabled = true; t.textContent = 'Probando la conexión…';
    try {
      let r = await data.credenciales({ accion: 'guardar', nombre: n, datos });
      if (!r.guardado) {
        if (!await confirmar('La prueba falló: ' + r.detalle + '\n\n¿La guardo igual?')) { t.disabled = false; t.textContent = 'Guardar y probar'; toast(r.detalle); return; }
        r = await data.credenciales({ accion: 'guardar', nombre: n, datos, forzar: true });
      }
      toast((r.ok ? '✓ ' : '⚠ ') + r.detalle);
      def.campos.forEach(f => { const el = $('#cr-' + f.c); if (el) el.value = ''; });
      await cargarEstado(true);
    } catch (e) { toast(e.message); t.disabled = false; t.textContent = 'Guardar y probar'; }
  }

  function card(x) {

    const pie = x.st === 'tog' ? (isAdmin() ? '<label class="sw"><input type="checkbox" data-integ="' + x.k + '"' + (on(x) ? ' checked' : '') + '><span></span><b>' + (on(x) ? 'Prendida' : 'Apagada') + '</b></label>' : '<span class="muted">' + (on(x) ? 'Prendida' : 'Apagada') + '</span>')
      : x.st === 'prox' ? '<span class="ig-esf">' + (x.esf ? 'Esfuerzo: ' + ESF[x.esf] : '') + '</span>' : x.st === 'cred' ? '<span class="muted">' + (on(x) ? 'Funcionando' : 'Lista para conectar') + '</span>' : '<span class="muted">Funcionando</span>';
    return '<article class="ig' + (x.st === 'prox' ? ' prox' : '') + '"><button class="ig-x" data-act="igVer" data-k="' + x.k + '" aria-label="Ver ' + esc(x.n) + '"></button><div class="ig-h">' + logo(x) + badge(x) + '</div><h3>' + esc(x.n) + '</h3><p>' + esc(x.que) + '</p>' + lineaCuenta(x) + '<div class="ig-f">' + pie + '<span class="ig-mas">' + ((x.st === 'tog' || x.cred) && isAdmin() ? 'Configurar' : 'Ver más') + ' →</span></div></article>';
  }

  function view() {
    if (isAdmin() && !st.est && !st.cargando) setTimeout(() => cargarEstado(), 0);
    const all = CAT, nOn = all.filter(x => x.st === 'on' || (x.st === 'cred' && on(x))).length, nTog = all.filter(x => x.st === 'tog' && on(x)).length, nPed = all.filter(x => x.st === 'prox' && quiere(x.k)).length, nProx = all.filter(x => x.st === 'prox').length;
    const q = st.q.toLowerCase();
    const filtro = x => (!st.cat || x.cat === st.cat) && (!q || (x.n + ' ' + x.que + ' ' + (x.det || []).join(' ')).toLowerCase().includes(q)) &&
      (!st.ver || (st.ver === 'func' ? x.st !== 'prox' && (x.st !== 'cred' || on(x)) : st.ver === 'prox' ? x.st === 'prox' || (x.st === 'cred' && !on(x)) : quiere(x.k)));
    const ped = all.filter(x => x.st === 'prox' && quiere(x.k)).sort((a, b) => ['Alta', 'Media', 'Baja'].indexOf(prio(a.k)) - ['Alta', 'Media', 'Baja'].indexOf(prio(b.k)) || (a.esf || 2) - (b.esf || 2));
    let h = '<div class="head"><div><h1>Integraciones</h1><p>Las apps que se conectan con àndale Operaciones y para qué le sirven a la agencia. Tocá cualquiera para ver qué hace, qué hace falta y configurarla.</p></div></div>' +
      '<section class="kpis">' +
      '<button class="kpi" data-act="igVerF" data-v="func"><span class="eyebrow">Funcionando</span><b>' + (nOn + nTog) + '</b><span>' + nOn + ' conectadas · ' + nTog + ' activas</span></button>' +
      '<button class="kpi" data-act="igVerF" data-v="prox"><span class="eyebrow">Para sumar</span><b>' + nProx + '</b><span>ideas pensadas para àndale</span></button>' +
      '<button class="kpi" data-act="igVerF" data-v="ped"><span class="eyebrow">Pedidas</span><b>' + nPed + '</b><span>las que quieren primero</span></button>' +
      '</section>';
    if (ped.length) h += '<section class="sheet"><div class="sheet-h"><h2>Hoja de ruta</h2><span class="muted">Lo pedido, por prioridad. Lo usamos para decidir qué conectar primero.</span></div><div class="rows">' +
      ped.map((x, i) => '<button class="row ig-road" data-act="igVer" data-k="' + x.k + '"><span class="d">' + (i + 1) + '</span><span class="t" style="display:flex;align-items:center;gap:10px">' + logo(x) + '<span><b>' + esc(x.n) + '</b><span>' + esc(cfgGet(x.k, 'nota') || x.que) + '</span></span></span><span class="ig-rt"><span class="ig-p p-' + prio(x.k).toLowerCase() + '">' + esc(prio(x.k)) + '</span><span class="ig-esf">' + (x.esf ? ESF[x.esf] : '') + '</span></span></button>').join('') + '</div></section>';
    h += '<div class="toolbar ig-tb"><input class="in" type="search" id="ig-q" placeholder="Buscar: pagos, Instagram, facturas…" value="' + esc(st.q) + '" aria-label="Buscar integración">' +
      '<div class="seg" role="group" aria-label="Área">' + [['', 'Todas'], ...CATS.map(c => [c[0], c[1].split(' y ')[0]])].map(([k, l]) => '<button data-act="igCat" data-v="' + k + '" aria-pressed="' + (st.cat === k) + '">' + esc(l) + '</button>').join('') + '</div>' +
      '<select class="in" id="ig-ver" aria-label="Mostrar">' + opt('', 'Todas', st.ver) + opt('func', 'Funcionando', st.ver) + opt('prox', 'Próximamente', st.ver) + opt('ped', 'Pedidas', st.ver) + '</select></div>';
    let alguna = false;
    CATS.forEach(([k, l, d]) => {
      const xs = all.filter(x => x.cat === k && filtro(x)); if (!xs.length) return; alguna = true;
      h += '<section class="ig-sec"><div class="ig-sh"><h2>' + esc(l) + '</h2><span class="muted">' + esc(d) + '</span></div><div class="igs">' + xs.map(card).join('') + '</div></section>';
    });
    if (!alguna) h += '<section class="sheet">' + ctx.emptyBox('No hay integraciones con ese filtro', 'Probá con otra palabra o área.') + '</section>';
    return h;
  }

  function panel(k) {
    const x = CAT.find(y => y.k === k); if (!x) return;
    const adm = isAdmin(), staff = isStaff();
    const catL = (CATS.find(c => c[0] === x.cat) || [])[1] || '';
    let cfg = '';
    if (x.st === 'tog') {
      cfg = '<div class="field full"><span class="lbl">Estado</span>' + (adm ? '<label class="sw"><input type="checkbox" id="ig-on"' + (on(x) ? ' checked' : '') + '><span></span><b>' + (on(x) ? 'Prendida' : 'Apagada') + '</b></label>' : '<span>' + (on(x) ? 'Prendida' : 'Apagada') + '</span>') + '</div>' +
        (x.cfg || []).map(f => '<div class="field full"><label for="ig-c-' + f.c + '">' + esc(f.l) + '</label>' + (f.tipo === 'select' ? '<select id="ig-c-' + f.c + '"' + (adm ? '' : ' disabled') + '>' + f.opts.map(([v, l]) => '<option value="' + esc(v) + '"' + (cfgGet(k, f.c) === v ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>' : (f.tipo === 'textarea' ? '<textarea id="ig-c-' + f.c + '" rows="3"' + (adm ? '' : ' disabled') + '>' + esc(cfgGet(k, f.c)) + '</textarea>' : '<input id="ig-c-' + f.c + '" value="' + esc(cfgGet(k, f.c)) + '"' + (adm ? '' : ' disabled') + '>')) + '</div>').join('');
    } else if (x.st === 'cred' && (x.cfg || []).length) {
      cfg = '<div class="field full"><span class="lbl">Cómo se organizan las carpetas</span>' + (x.ayuda ? '<span class="hint">' + esc(x.ayuda) + '</span>' : '') + '</div>' +
        x.cfg.map(f => '<div class="field full"><label for="ig-c-' + f.c + '">' + esc(f.l) + '</label>' + (f.tipo === 'select' ? '<select id="ig-c-' + f.c + '"' + (adm ? '' : ' disabled') + '>' + f.opts.map(([v, l]) => '<option value="' + esc(v) + '"' + (cfgGet(k, f.c) === v ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>' : '<input id="ig-c-' + f.c + '" value="' + esc(cfgGet(k, f.c)) + '"' + (adm ? '' : ' disabled') + '>') + '</div>').join('');
    } else if (x.st === 'prox') {
      cfg = '<div class="field full"><span class="lbl">¿La queremos?</span><label class="sw"><input type="checkbox" id="ig-quiero"' + (quiere(k) ? ' checked' : '') + (staff ? '' : ' disabled') + '><span></span><b>Sumarla a la hoja de ruta</b></label></div>' +
        '<div class="field"><label for="ig-prio">Prioridad</label><select id="ig-prio"' + (staff ? '' : ' disabled') + '>' + ['Alta', 'Media', 'Baja'].map(v => opt(v, v, prio(k) || 'Media')).join('') + '</select></div>' +
        '<div class="field"><span class="lbl">Esfuerzo estimado</span><span style="padding:9px 0">' + esc(ESF[x.esf] || '—') + '</span></div>' +
        '<div class="field full"><label for="ig-nota">¿Para qué la usarían? (opcional)</label><textarea id="ig-nota" rows="3" placeholder="Ej.: que el informe mensual de redes salga solo para los 13 clientes"' + (staff ? '' : ' disabled') + '>' + esc(cfgGet(k, 'nota')) + '</textarea></div>';
    }
    if (x.k === 'ia' && adm) {
      const sel = cfgGet('ia', 'modelo_redes') || MODELO_REDES_DEF;
      cfg += '<div class="field full"><label for="ig-modelo">Modelo para Redes <span class="muted">(planificar, copys, revisar y buscar fechas)</span></label><select id="ig-modelo">' +
        MODELOS_IA.map(m => '<option value="' + esc(m.id) + '"' + (m.id === sel ? ' selected' : '') + '>' + esc(m.n + ' · ' + m.nota + ' (US$ ' + m.in + ' / ' + m.out + ' por millón de tokens)') + '</option>').join('') + '</select>' +
        '<span class="hint">Las tareas cortas (mails, respuestas, comandos) siguen con el modelo rápido. Si el modelo elegido no está disponible en la cuenta, Mr. Piggy usa Sonnet 5.5.</span></div>' +
        '<div class="field full" id="ig-iagasto"><span class="lbl">Gasto</span><p class="muted" style="margin:0">Calculando…</p></div>';
    }
    if (x.k === 'slack' && adm) cfg += '<div class="field full"><span class="lbl">Probar</span><div class="toolbar"><button type="button" class="btn sm" data-act="igSlackProbar">Mandarme mi resumen del día ahora</button></div></div>';
    if (x.k === 'tally' && adm) cfg += '<div class="field full" id="ig-tally"><span class="lbl">Formularios</span><p class="muted" style="margin:0">' + (on(x) ? 'Cargando formularios…' : 'Conectá la cuenta para ver los formularios.') + '</p></div>';
    const puede = (x.k === 'ia' && adm) || (x.st === 'tog' && adm) || (x.st === 'prox' && staff) || (x.st === 'cred' && adm && (x.cfg || []).length);
    $('#panel').innerHTML = '<form id="igform" novalidate style="display:contents"><div class="panel-h"><div class="ig-ph">' + logo(x, true) + '<div><span class="eyebrow">' + esc(catL) + '</span><h2 id="panel-title">' + esc(x.n) + '</h2></div></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><div class="full">' + badge(x) + '</div>' +
      '<p class="formnote full">' + esc(x.que) + '</p>' +
      '<div class="field full"><span class="lbl">Qué hace en àndale</span><ul class="ig-ul">' + (x.det || []).map(d => '<li>' + esc(d) + '</li>').join('') + '</ul></div>' +
      '<div class="field full"><span class="lbl">' + (x.st === 'prox' ? 'Qué hace falta para conectarla' : 'Conexión') + '</span><p style="margin:0">' + esc(x.falta) + '</p></div>' + credHtml(x) + cfg + '</div>' +
      '<div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">' + (puede ? 'Cancelar' : 'Cerrar') + '</button>' + (puede ? '<button type="submit" class="btn primary">Guardar</button>' : '') + '</span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false; st.abierto = k;
    if (x.cred && isAdmin() && !st.est) cargarEstado();
    if (x.k === 'tally' && adm && on(x)) tallyForms();
    if (x.k === 'ia' && adm) iaGasto();
  }
  // Gasto estimado de la IA: este mes y el anterior, por modelo, con los precios de la API.
  async function iaGasto() {
    const box = $('#ig-iagasto'); if (!box) return;
    const hoy = new Date(), ini = new Date(hoy.getFullYear(), hoy.getMonth(), 1), ant = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1);
    try {
      const rows = await data.iaUsos(ant.toISOString());
      const este = gastoIA(rows.filter(r => new Date(r.created_at) >= ini)), pasado = gastoIA(rows.filter(r => new Date(r.created_at) < ini));
      const primero = rows.length ? rows.map(r => r.created_at).sort()[0] : null;
      const mes = d => d.toLocaleDateString('es-AR', { month: 'long' });
      if (!$('#ig-iagasto')) return;
      $('#ig-iagasto').innerHTML = '<span class="lbl">Gasto estimado</span><div class="ig-gasto"><div><b>' + usd(este.usd) + '</b><span>en ' + esc(mes(hoy)) + ' · ' + este.consultas + ' consultas</span></div>' +
        (pasado.consultas ? '<div><b>' + usd(pasado.usd) + '</b><span>en ' + esc(mes(ant)) + ' · ' + pasado.consultas + ' consultas</span></div>' : '') + '</div>' +
        (este.porModelo.length ? '<ul class="ig-ul">' + este.porModelo.map(m => '<li>' + esc(nombreModelo(m.modelo)) + ': ' + usd(m.usd) + ' (' + m.n + ')</li>').join('') + '</ul>' : '') +
        '<span class="hint">Estimado con los tokens que registra la app' + (este.busquedas ? ', más ' + usd(este.busquedas) + ' de búsquedas web' : '') + (primero ? ' (registra desde el ' + new Date(primero).toLocaleDateString('es-AR') + ')' : '') + '. El gasto real, con lo de antes del registro, está en console.anthropic.com → Usage.</span>';
    } catch (e) { box.innerHTML = '<span class="lbl">Gasto</span><p class="muted" style="margin:0">No pude leer el uso (' + esc(e.message) + ').</p>'; }
  }
  // Tally: formularios de la cuenta, qué tipo de brief es cada uno y si está conectado.
  async function tallyForms() {
    const box = $('#ig-tally'); if (!box) return;
    try {
      const r = await data.tally({ accion: 'formularios' });
      const fs = r.formularios || [];
      box.innerHTML = '<span class="lbl">Formularios</span>' + (fs.length ? '<div class="ig-forms">' + fs.map(f => '<div class="ig-form"><span><b>' + esc(f.nombre) + '</b><small>' + f.respuestas + ' respuestas · ' + esc(f.estado) + '</small></span>' +
        '<select class="in" data-tallytipo="' + esc(f.id) + '" aria-label="Tipo de brief">' + ['', 'Branding', 'Web', 'Redes', 'Otro'].map(t => opt(t, t || 'No usar', f.tipo || '')).join('') + '</select>' +
        (f.conectado ? '<span class="ig-b on">Conectado</span>' : '<button type="button" class="btn sm" data-act="igTallyConectar" data-id="' + esc(f.id) + '">Conectar</button>') + '</div>').join('') + '</div>' +
        '<div class="toolbar" style="margin-top:10px"><button type="button" class="btn sm" data-act="igTallySync">Traer respuestas de los últimos 6 meses</button></div>' : '<p class="muted" style="margin:0">No hay formularios en esa cuenta.</p>');
    } catch (e) { box.innerHTML = '<span class="lbl">Formularios</span><p class="ig-warn" style="margin:0">' + esc(e.message) + '</p>'; }
  }
  async function guardarPanel() {
    const k = st.abierto, x = CAT.find(y => y.k === k); if (!x) return;
    let lst = [...L()], cfg = [...CFG()];
    if (x.k === 'ia') {
      const v = ($('#ig-modelo') || {}).value || ''; const p = 'ia.modelo_redes='; cfg = [...cfg.filter(y => !y.startsWith(p)), ...(v ? [p + v] : [])];
    } else if (x.st === 'cred') {
      (x.cfg || []).forEach(f => { const el = $('#ig-c-' + f.c); const val = el ? el.value.trim() : ''; const p = k + '.' + f.c + '='; cfg = [...cfg.filter(y => !y.startsWith(p)), ...(val && val !== f.def ? [p + val] : [])]; });
    } else if (x.st === 'tog') {
      const v = $('#ig-on').checked; lst = lst.filter(y => y !== k); if (v) lst.push(k);
      (x.cfg || []).forEach(f => { const el = $('#ig-c-' + f.c); const val = el ? el.value.trim() : ''; const p = k + '.' + f.c + '='; cfg = [...cfg.filter(y => !y.startsWith(p)), ...(val && val !== f.def ? [p + val.replace(/\n/g, '\\n')] : [])]; });
    } else if (x.st === 'prox') {
      const q = $('#ig-quiero').checked; lst = lst.filter(y => y !== 'quiero:' + k); if (q) lst.push('quiero:' + k);
      [['prio', $('#ig-prio').value], ['nota', $('#ig-nota').value.trim()]].forEach(([c, v]) => { const p = k + '.' + c + '='; cfg = [...cfg.filter(y => !y.startsWith(p)), ...(v && q ? [p + v.replace(/\n/g, ' ')] : [])]; });
    }
    closeForm(); st.abierto = null;
    try { S.L.integraciones = lst; S.L.integraciones_cfg = cfg; render(); await data.saveLista('integraciones', lst); await data.saveLista('integraciones_cfg', cfg); toast(x.n + ': guardado'); }
    catch (e) { toast(e.message); }
  }

  document.addEventListener('input', e => { if (e.target.id === 'ig-q') { st.q = e.target.value; clearTimeout(st.t); st.t = setTimeout(() => { const pos = e.target.selectionStart; render(); const i = $('#ig-q'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (er) { } } }, 180); } });
  document.addEventListener('change', e => {
    if (e.target.id === 'ig-ver') { st.ver = e.target.value; render(); }
    if (e.target.dataset && e.target.dataset.tallytipo) { const id = e.target.dataset.tallytipo; data.tally({ accion: 'tipo', form_id: id, tipo: e.target.value }).then(() => toast('Guardado'), er => toast(er.message)); }
    if (e.target.dataset && e.target.dataset.integ) { const k = e.target.dataset.integ; const l = L().filter(x => x !== k); guardar('integraciones', e.target.checked ? [...l, k] : l, (CAT.find(x => x.k === k) || {}).n + (e.target.checked ? ' prendida' : ' apagada')); }
  });
  document.addEventListener('submit', e => { if (e.target.id === 'igform') { e.preventDefault(); e.stopImmediatePropagation(); guardarPanel(); } }, true);

  return {
    view,
    cfgGet,
    acts: {
      igVer: t => panel(t.dataset.k),
      igCat: t => { st.cat = t.dataset.v; render(); },
      igCredGuardar: t => credGuardar(t),
      igCredProbar: async t => { t.disabled = true; t.textContent = 'Probando…'; try { const r = await data.credenciales({ accion: 'probar', nombre: t.dataset.n }); toast((r.ok ? '✓ ' : '⚠ ') + r.detalle); await cargarEstado(true); } catch (e) { toast(e.message); } t.disabled = false; t.textContent = 'Probar conexión'; },
      igCredBorrar: async t => { if (!await confirmar('¿Desconectar esta cuenta? Si había una cargada a mano en Supabase, vuelve a usarse esa.')) return; try { await data.credenciales({ accion: 'borrar', nombre: t.dataset.n }); toast('Cuenta desconectada'); await cargarEstado(true); } catch (e) { toast(e.message); } },
      igVerF: t => { st.ver = st.ver === t.dataset.v ? '' : t.dataset.v; render(); },
      igDbxAuth: () => { const k = ($('#cr-app_key') || {}).value; if (!k || !k.trim()) { toast('Pegá primero la App key'); return; } window.open('https://www.dropbox.com/oauth2/authorize?client_id=' + encodeURIComponent(k.trim()) + '&response_type=code&token_access_type=offline', '_blank', 'noopener'); },
      igSlackProbar: async t => { t.disabled = true; t.textContent = 'Mandando…'; try { const r = await data.avisosFn({ accion: 'probar' }); toast((r.ok ? '✓ ' : '⚠ ') + r.detalle); } catch (e) { toast(e.message); } t.disabled = false; t.textContent = 'Mandarme mi resumen del día ahora'; },
      igTallyConectar: async t => {
        const id = t.dataset.id, tipo = ($('[data-tallytipo="' + id + '"]') || {}).value; if (!tipo) { toast('Elegí primero qué tipo de brief es'); return; }
        t.disabled = true; t.textContent = 'Conectando…';
        try { await data.tally({ accion: 'conectar', form_id: id, tipo }); toast('Conectado: las respuestas nuevas entran solas'); await tallyForms(); } catch (e) { toast(e.message); t.disabled = false; t.textContent = 'Conectar'; }
      },
      igTallySync: async t => { t.disabled = true; t.textContent = 'Trayendo…'; try { const r = await data.tally({ accion: 'sincronizar' }); toast('Listo: ' + (r.nuevos || 0) + ' briefs nuevos' + (r.sin_cliente ? ' · ' + r.sin_cliente + ' para asignar' : '')); } catch (e) { toast(e.message); } t.disabled = false; t.textContent = 'Traer respuestas de los últimos 6 meses'; },
    },
  };
}
