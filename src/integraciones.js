// Integraciones: qué apps se conectan con àndale Operaciones, para qué le sirven a la agencia y cómo se configuran.
// Logos: set abierto Simple Icons (CC0). Las que no están en el set llevan monograma.
// Estado: 'on' conectada y funcionando · 'tog' se prende/apaga y se configura acá · 'prox' todavía no conectada (se puede pedir y priorizar).
// Guardado en listas (las ve todo el equipo): 'integraciones' (prendidas y pedidas: 'quiero:k') e 'integraciones_cfg' ('k.campo=valor').
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
  { k: 'email', n: 'Email', cat: 'clientes', mono: '@', color: '#FC4855', st: 'on', que: 'Mails a clientes, resúmenes de cuenta, recordatorios e invoices con la estética de àndale.', det: ['Sale desde administracion@weareandale.com con el nombre de quien escribe.', 'Las respuestas le llegan a esa persona.', 'Cada mail queda anotado en las charlas del cliente.'], falta: 'Ya está conectado (Resend).' },
  { k: 'whatsapp', n: 'WhatsApp', cat: 'clientes', ic: siWhatsapp, st: 'tog', que: 'Botón en cada cliente que abre el chat con su número y un saludo listo.', det: ['Abre WhatsApp Web o la app con el número del cliente.', 'El mensaje inicial se configura acá ({nombre} se reemplaza solo).', 'Para pegar una charla de WhatsApp como charla, usá “Anotar charla”.'], falta: 'Nada: funciona con links directos.', cfg: [{ c: 'msg', l: 'Mensaje inicial', tipo: 'textarea', def: 'Hola {nombre}, ¿cómo estás?' }] },
  { k: 'whatsapp_api', n: 'WhatsApp Business', cat: 'clientes', ic: siWhatsapp, st: 'prox', esf: 3, que: 'Mandar resúmenes, recordatorios y avisos por WhatsApp de forma automática.', det: ['Resumen de cuenta y recordatorio de pago por WhatsApp, además del mail.', 'Respuestas del cliente anotadas como charla.', 'Avisos de entregas listas.'], falta: 'Cuenta de WhatsApp Business API (Meta) con un número propio y plantillas aprobadas.' },
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
  { k: 'drive', n: 'Google Drive', cat: 'diseno', ic: siGoogledrive, st: 'on', que: 'Lee las facturas de la carpeta de administración y las carga solas.', det: ['En Cobros → Asistente.', 'Links de carpeta en cada cliente y proyecto.'], falta: 'Ya está conectado.' },
  { k: 'drive_carpetas', n: 'Carpetas automáticas en Drive', cat: 'diseno', ic: siGoogledrive, st: 'prox', esf: 2, que: 'Al crear un cliente o proyecto, se crea su carpeta con la estructura de àndale.', det: ['Cliente / Proyecto / Brief, Diseño, Entregables.', 'El link queda guardado solo.'], falta: 'Permiso de escritura en la unidad compartida.' },
  { k: 'canva', n: 'Canva', cat: 'diseno', ic: siCanva, st: 'prox', esf: 2, que: 'Diseños del proyecto con vista previa desde la ficha.', det: ['Ver y abrir los diseños de cada cliente.', 'Exportar piezas al entregar.'], falta: 'Canva para equipos y la app de Canva Connect.' },
  { k: 'figma', n: 'Figma', cat: 'diseno', ic: siFigma, st: 'prox', esf: 2, que: 'Archivos y prototipos de cada proyecto, con miniatura.', det: ['Ver la última versión sin abrir Figma.', 'Comentarios del cliente como tareas.'], falta: 'Token de Figma del equipo.' },
  { k: 'adobe', n: 'Adobe Creative Cloud', cat: 'diseno', ic: siAdobecreativecloud, st: 'prox', esf: 3, que: 'Bibliotecas de marca de cada cliente a mano.', det: ['Logos, colores y tipografías por cliente.'], falta: 'Cuenta de Adobe para equipos.' },
  { k: 'dropbox', n: 'Dropbox', cat: 'diseno', ic: siDropbox, st: 'prox', esf: 2, que: 'Entregas pesadas (video, fotos) con link guardado en el proyecto.', det: ['Subir entregables y mandar el link al cliente.'], falta: 'Cuenta de Dropbox.' },
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
  { k: 'slack', n: 'Slack', cat: 'equipo', ic: siSlack, st: 'prox', esf: 1, que: 'Avisos al equipo: entregas del día, tareas vencidas, pagos que entraron.', det: ['Resumen diario a las 9.', 'Aviso cuando un cliente acepta un presupuesto.'], falta: 'Un workspace de Slack y un webhook.' },
  { k: 'horas', n: 'Toggl y Clockify', cat: 'equipo', ic: siToggl, st: 'prox', esf: 2, que: 'Horas por proyecto para saber cuánto deja cada trabajo de verdad.', det: ['Horas × costo por persona en “Qué deja cada cliente”.', 'Alertas de proyectos que se pasan de horas.'], falta: 'Que el equipo registre horas en Toggl o Clockify.' },
  { k: 'notion', n: 'Notion', cat: 'equipo', ic: siNotion, st: 'prox', esf: 2, que: 'Briefs y actas de reunión enlazados a cada cliente y proyecto.', det: ['Ver la página del brief desde el proyecto.'], falta: 'Token de integración de Notion.' },
  { k: 'importar', n: 'ClickUp, Trello y Asana', cat: 'equipo', ic: siClickup, st: 'prox', esf: 2, que: 'Traer proyectos y tareas que hoy están en otra herramienta.', det: ['Importación única con responsables y fechas.'], falta: 'Exportación o token de la herramienta.' },
  { k: 'miro', n: 'Miro', cat: 'equipo', ic: siMiro, st: 'prox', esf: 1, que: 'Tableros de workshop y estrategia en la ficha del proyecto.', det: ['Vista previa del tablero.'], falta: 'Cuenta de Miro.' },

  // Ventas y webs
  { k: 'formularios', n: 'Formularios de contacto', cat: 'ventas', ic: siTypeform, st: 'prox', esf: 1, que: 'Cada consulta de la web de àndale entra como presupuesto en borrador.', det: ['Typeform, Tally o el formulario de la web.', 'Mr. Piggy arma el primer borrador del presupuesto.'], falta: 'Un webhook desde el formulario.' },
  { k: 'hubspot', n: 'HubSpot', cat: 'ventas', ic: siHubspot, st: 'prox', esf: 3, que: 'Seguimiento comercial de prospectos antes de que sean clientes.', det: ['Prospecto → presupuesto → cliente.'], falta: 'Cuenta de HubSpot (el plan gratis alcanza).' },
  { k: 'webs', n: 'WordPress y Webflow', cat: 'ventas', ic: siWordpress, st: 'prox', esf: 2, que: 'Estado de las webs de clientes: si están online, actualizaciones y vencimientos.', det: ['Aviso si una web se cae.', 'Vencimientos de hosting y dominio como cobro.'], falta: 'Lista de sitios y accesos.' },
  { k: 'shopify', n: 'Shopify', cat: 'ventas', ic: siShopify, st: 'prox', esf: 2, que: 'Ventas de las tiendas que manejamos, para el informe del cliente.', det: ['Ventas por mes vinculadas a la pauta.'], falta: 'App privada en cada tienda.' },
  { k: 'mailchimp', n: 'Mailchimp y Brevo', cat: 'ventas', ic: siMailchimp, st: 'prox', esf: 2, que: 'Newsletters de clientes: aperturas y clics en el informe.', det: ['Métricas de campañas de email.'], falta: 'Token de la cuenta de cada cliente.' },

  // IA y automatización
  { k: 'ia', n: 'Mr. Piggy', cat: 'ia', pig: 1, st: 'on', que: 'Responde preguntas, redacta mails, arma tareas, carga gastos y charlas.', det: ['Funciona con Claude.', 'Nada se guarda sin que lo revises.'], falta: 'Ya está conectado.' },
  { k: 'zapier', n: 'Zapier y Make', cat: 'ia', ic: siZapier, st: 'prox', esf: 2, que: 'Conectar cualquier otra app sin programar.', det: ['“Cuando pase X en àndale, hacé Y en otra app” y al revés.'], falta: 'Cuenta de Zapier o Make y los webhooks de la app.' },
  { k: 'n8n', n: 'n8n', cat: 'ia', ic: siN8n, st: 'prox', esf: 2, que: 'Automatizaciones propias más complejas, en servidor de àndale.', det: ['Flujos a medida con IA.'], falta: 'Un servidor de n8n.' },
  { k: 'webhooks', n: 'Webhooks', cat: 'ia', mono: '{ }', color: '#4B5563', st: 'prox', esf: 1, que: 'Avisar a otra app cuando pasa algo: proyecto entregado, cobro, presupuesto aceptado.', det: ['La base para Slack, Zapier y cualquier otra.'], falta: 'Nada del lado de ustedes.' },
];
// Variantes que comparten logo con otra marca (para no repetir en la grilla queda el principal).
const EXTRA = { meta: siMeta, meet: siZoom, stripe: siPaypal, importar: siTrello, webs: siWebflow, horas: siToggl, zapier: siMake, programacion: siHootsuite };

export function initIntegraciones(ctx) {
  const { S, esc, opt, toast, $, data, render, isAdmin, isStaff, closeForm, ISO } = ctx;
  const st = { cat: '', q: '', ver: '' };
  const L = () => S.L.integraciones || ctx.DEF;
  const CFG = () => S.L.integraciones_cfg || [];
  const cfgGet = (k, c) => { const p = k + '.' + c + '='; const v = CFG().find(x => x.startsWith(p)); const d = ((CAT.find(x => x.k === k) || {}).cfg || []).find(x => x.c === c); return v != null ? v.slice(p.length) : (d ? d.def : ''); };
  const on = x => x.st === 'on' || (x.st === 'tog' && L().includes(x.k));
  const quiere = k => L().includes('quiero:' + k);
  const prio = k => { const v = cfgGet(k, 'prio'); return v || (quiere(k) ? 'Media' : ''); };

  function logo(x, big) {
    const sz = big ? 30 : 22;
    if (x.pig) return '<span class="lg pig-lg' + (big ? ' big' : '') + '">' + ISO + '</span>';
    const ic = x.ic;
    if (ic) return '<span class="lg' + (big ? ' big' : '') + '" title="' + esc(x.n) + '"><svg viewBox="0 0 24 24" width="' + sz + '" height="' + sz + '" role="img" aria-label="' + esc(x.n) + '"><path fill="#' + ic.hex + '" d="' + ic.path + '"/></svg>' + (EXTRA[x.k] ? '<svg class="lg2" viewBox="0 0 24 24" width="' + Math.round(sz * .62) + '" height="' + Math.round(sz * .62) + '" aria-hidden="true"><path fill="#' + EXTRA[x.k].hex + '" d="' + EXTRA[x.k].path + '"/></svg>' : '') + '</span>';
    return '<span class="lg mono' + (big ? ' big' : '') + '" style="--c:' + (x.color || '#6B7280') + '">' + esc(x.mono || x.n.charAt(0)) + '</span>';
  }
  const badge = x => x.st === 'prox' ? (quiere(x.k) ? '<span class="ig-b pedida">★ Pedida</span>' : '<span class="ig-b prox">Próximamente</span>') : on(x) ? '<span class="ig-b on">' + (x.st === 'on' ? 'Conectada' : 'Activa') + '</span>' : '<span class="ig-b off">Apagada</span>';

  async function guardar(k, arr, msg) { const prev = S.L[k]; S.L[k] = arr; render(); try { await data.saveLista(k, arr); if (msg) toast(msg); } catch (e) { S.L[k] = prev; render(); toast(e.message); } }
  function setCfg(k, c, v) { const p = k + '.' + c + '='; return [...CFG().filter(x => !x.startsWith(p)), ...(v ? [p + v] : [])]; }

  function card(x) {
    const pie = x.st === 'tog' ? (isAdmin() ? '<label class="sw"><input type="checkbox" data-integ="' + x.k + '"' + (on(x) ? ' checked' : '') + '><span></span><b>' + (on(x) ? 'Prendida' : 'Apagada') + '</b></label>' : '<span class="muted">' + (on(x) ? 'Prendida' : 'Apagada') + '</span>')
      : x.st === 'prox' ? '<span class="ig-esf">' + (x.esf ? 'Esfuerzo: ' + ESF[x.esf] : '') + '</span>' : '<span class="muted">Funcionando</span>';
    return '<article class="ig' + (x.st === 'prox' ? ' prox' : '') + '"><button class="ig-x" data-act="igVer" data-k="' + x.k + '" aria-label="Ver ' + esc(x.n) + '"></button><div class="ig-h">' + logo(x) + badge(x) + '</div><h3>' + esc(x.n) + '</h3><p>' + esc(x.que) + '</p><div class="ig-f">' + pie + '<span class="ig-mas">' + (x.st === 'tog' && isAdmin() ? 'Configurar' : 'Ver más') + ' →</span></div></article>';
  }

  function view() {
    const all = CAT, nOn = all.filter(x => x.st === 'on').length, nTog = all.filter(x => x.st === 'tog' && on(x)).length, nPed = all.filter(x => x.st === 'prox' && quiere(x.k)).length, nProx = all.filter(x => x.st === 'prox').length;
    const q = st.q.toLowerCase();
    const filtro = x => (!st.cat || x.cat === st.cat) && (!q || (x.n + ' ' + x.que + ' ' + (x.det || []).join(' ')).toLowerCase().includes(q)) &&
      (!st.ver || (st.ver === 'func' ? x.st !== 'prox' : st.ver === 'prox' ? x.st === 'prox' : quiere(x.k)));
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
        (x.cfg || []).map(f => '<div class="field full"><label for="ig-c-' + f.c + '">' + esc(f.l) + '</label>' + (f.tipo === 'textarea' ? '<textarea id="ig-c-' + f.c + '" rows="3"' + (adm ? '' : ' disabled') + '>' + esc(cfgGet(k, f.c)) + '</textarea>' : '<input id="ig-c-' + f.c + '" value="' + esc(cfgGet(k, f.c)) + '"' + (adm ? '' : ' disabled') + '>') + '</div>').join('');
    } else if (x.st === 'prox') {
      cfg = '<div class="field full"><span class="lbl">¿La queremos?</span><label class="sw"><input type="checkbox" id="ig-quiero"' + (quiere(k) ? ' checked' : '') + (staff ? '' : ' disabled') + '><span></span><b>Sumarla a la hoja de ruta</b></label></div>' +
        '<div class="field"><label for="ig-prio">Prioridad</label><select id="ig-prio"' + (staff ? '' : ' disabled') + '>' + ['Alta', 'Media', 'Baja'].map(v => opt(v, v, prio(k) || 'Media')).join('') + '</select></div>' +
        '<div class="field"><span class="lbl">Esfuerzo estimado</span><span style="padding:9px 0">' + esc(ESF[x.esf] || '—') + '</span></div>' +
        '<div class="field full"><label for="ig-nota">¿Para qué la usarían? (opcional)</label><textarea id="ig-nota" rows="3" placeholder="Ej.: que el informe mensual de redes salga solo para los 13 clientes"' + (staff ? '' : ' disabled') + '>' + esc(cfgGet(k, 'nota')) + '</textarea></div>';
    }
    const puede = (x.st === 'tog' && adm) || (x.st === 'prox' && staff);
    $('#panel').innerHTML = '<form id="igform" novalidate style="display:contents"><div class="panel-h"><div class="ig-ph">' + logo(x, true) + '<div><span class="eyebrow">' + esc(catL) + '</span><h2 id="panel-title">' + esc(x.n) + '</h2></div></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><div class="full">' + badge(x) + '</div>' +
      '<p class="formnote full">' + esc(x.que) + '</p>' +
      '<div class="field full"><span class="lbl">Qué hace en àndale</span><ul class="ig-ul">' + (x.det || []).map(d => '<li>' + esc(d) + '</li>').join('') + '</ul></div>' +
      '<div class="field full"><span class="lbl">' + (x.st === 'prox' ? 'Qué hace falta para conectarla' : 'Conexión') + '</span><p style="margin:0">' + esc(x.falta) + '</p></div>' + cfg + '</div>' +
      '<div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">' + (puede ? 'Cancelar' : 'Cerrar') + '</button>' + (puede ? '<button type="submit" class="btn primary">Guardar</button>' : '') + '</span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false; st.abierto = k;
  }
  async function guardarPanel() {
    const k = st.abierto, x = CAT.find(y => y.k === k); if (!x) return;
    let lst = [...L()], cfg = [...CFG()];
    if (x.st === 'tog') {
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
    if (e.target.dataset && e.target.dataset.integ) { const k = e.target.dataset.integ; const l = L().filter(x => x !== k); guardar('integraciones', e.target.checked ? [...l, k] : l, (CAT.find(x => x.k === k) || {}).n + (e.target.checked ? ' prendida' : ' apagada')); }
  });
  document.addEventListener('submit', e => { if (e.target.id === 'igform') { e.preventDefault(); e.stopImmediatePropagation(); guardarPanel(); } }, true);

  return {
    view,
    cfgGet,
    acts: {
      igVer: t => panel(t.dataset.k),
      igCat: t => { st.cat = t.dataset.v; render(); },
      igVerF: t => { st.ver = st.ver === t.dataset.v ? '' : t.dataset.v; render(); },
    },
  };
}
