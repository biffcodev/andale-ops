// Emails de àndale con el estilo del resumen de cuenta: isologo arriba, título coral con filete,
// Delight en títulos e Inter en textos (con Helvetica/Arial de respaldo para Gmail y Outlook), pie con redes y logotipo.
// HTML "email-safe": tablas, estilos en línea, imágenes PNG alojadas en el sitio.

export const APP_URL = 'https://andale-ops.vercel.app';
const ACC = '#FC4855', INK = '#111111', MUTED = '#555555', RULE = '#8a8a8a';
const TITLE = "'Delight','Inter',Helvetica,Arial,sans-serif";
const BODY = "'Inter',Helvetica,Arial,sans-serif";

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function plata(n, moneda) {
  try { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda || 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0).replace(/ | /g, ' '); }
  catch (e) { return (moneda || '') + ' ' + n; }
}
const parrafos = t => String(t || '').trim().split(/\n{2,}/).filter(Boolean)
  .map(p => '<p style="margin:0 0 14px;font-family:' + BODY + ';font-size:15px;line-height:1.55;color:' + INK + '">' + esc(p).replace(/\n/g, '<br>') + '</p>').join('');
const fecha = d => { if (!d) return ''; const [y, m, dd] = String(d).slice(0, 10).split('-'); return dd + '/' + m + '/' + y; };

function enlaces(arr, font, size, color, bold) {
  return (arr || []).map(([t, u]) => '<a href="' + esc(u || '#') + '" style="color:' + color + ';text-decoration:none;font-family:' + font + ';font-size:' + size + 'px;' + (bold ? 'font-weight:700;' : '') + '">' + esc(t) + '</a>')
    .join('<span style="color:' + color + ';font-family:' + font + ';font-size:' + size + 'px;"> | </span>');
}

/** Bloques reutilizables */
export const B = {
  meta: pares => '<tr><td style="padding:0 0 26px;font-family:' + BODY + ';font-size:15px;line-height:1.45;color:' + INK + '">' +
    pares.filter(([, v]) => v).map(([k, v]) => esc(k) + ': <b>' + esc(v) + '</b>').join('<br>') + '</td></tr>',
  titulo: t => '<tr><td style="padding:0 0 8px;border-bottom:1px solid ' + RULE + ';font-family:' + TITLE + ';font-size:22px;font-weight:700;color:' + ACC + '">' + esc(t) + '</td></tr><tr><td style="height:20px;line-height:20px;font-size:0">&nbsp;</td></tr>',
  mensaje: t => t && t.trim() ? '<tr><td style="padding:0 0 6px">' + parrafos(t) + '</td></tr>' : '',
  items: (items, total, moneda, etiquetaTotal = 'Total a abonar') => '<tr><td style="padding:8px 0 0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
    items.map(i => '<tr><td style="padding:6px 0;font-family:' + BODY + ';font-size:14px;font-weight:600;color:' + INK + '">' + esc(i.concepto) + '</td><td align="right" style="padding:6px 0 6px 16px;white-space:nowrap;font-family:' + BODY + ';font-size:14px;font-weight:600;color:' + INK + '">' + esc(plata(i.monto, moneda)) + '</td></tr>').join('') +
    '</table></td></tr>' + (total === null || total === undefined ? '' :
      '<tr><td style="padding:22px 0 22px;border-bottom:1px solid ' + RULE + '"><span style="font-family:' + TITLE + ';font-size:21px;font-weight:700;color:' + INK + '">' + esc(etiquetaTotal) + '</span><span style="display:inline-block;width:28px"></span><span style="font-family:' + TITLE + ';font-size:21px;font-weight:700;color:' + INK + ';white-space:nowrap">' + esc(plata(total, moneda)) + '</span></td></tr>'),
  nota: (cfg, extra) => (cfg.nota ? '<tr><td style="padding:16px 0 0;font-family:' + BODY + ';font-size:14px;line-height:1.5;color:' + INK + '"><b>NOTA</b> ' + esc(cfg.nota).replace('SIN EXCEPCIÓN', '<b>SIN EXCEPCIÓN</b>') + '</td></tr>' : '') +
    (extra && extra.trim() ? '<tr><td style="padding:6px 0 0;font-family:' + BODY + ';font-size:14px;line-height:1.5;color:' + INK + '">' + esc(extra.trim()).replace(/\n/g, '<br>') + '</td></tr>' : ''),
  pago: cfg => !(cfg.cuentas || []).length ? '' : '<tr><td style="padding:26px 0 0"><table class="pago" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    cfg.cuentas.map(c => '<td valign="top" width="' + Math.floor(100 / cfg.cuentas.length) + '%" style="padding:0 10px 0 0">' +
      '<div style="font-family:' + TITLE + ';font-size:17px;font-weight:700;color:' + ACC + ';padding:0 0 10px">' + esc(c.titulo) + (c.sub ? '<br><span style="font-family:' + BODY + ';font-size:10px;font-weight:400;color:' + INK + '">(' + esc(c.sub) + ')</span>' : '') + '</div>' +
      (c.campos || []).map(([k, v]) => '<div style="font-family:' + BODY + ';font-size:12px;line-height:1.35;color:' + INK + '"><b>' + esc(k) + ':</b><br><span style="word-break:break-word;overflow-wrap:anywhere">' + esc(v) + '</span></div>').join('<div style="height:3px;line-height:3px;font-size:0">&nbsp;</div>') +
      '</td>').join('') + '</tr></table></td></tr>',
  boton: (texto, url) => !url ? '' : '<tr><td style="padding:10px 0 18px"><a href="' + esc(url) + '" style="display:inline-block;background:' + INK + ';color:#ffffff;text-decoration:none;font-family:' + TITLE + ';font-size:15px;font-weight:700;padding:12px 22px;border-radius:6px">' + esc(texto) + '</a></td></tr>',
  tabla: filas => '<tr><td style="padding:4px 0 18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
    filas.map(([k, v, fuerte]) => '<tr><td style="padding:7px 0;border-bottom:1px solid #e6e6e6;font-family:' + BODY + ';font-size:14px;color:' + MUTED + '">' + esc(k) + '</td><td align="right" style="padding:7px 0 7px 16px;border-bottom:1px solid #e6e6e6;font-family:' + (fuerte ? TITLE : BODY) + ';font-size:' + (fuerte ? 17 : 14) + 'px;font-weight:' + (fuerte ? 700 : 600) + ';color:' + INK + ';white-space:nowrap">' + esc(v) + '</td></tr>').join('') + '</table></td></tr>',
  cierre: t => t ? '<tr><td style="padding:26px 0 0;font-family:' + BODY + ';font-size:14px;line-height:1.5;color:' + INK + '">' + esc(t) + '</td></tr>' : '',
  firma: t => t ? '<tr><td style="padding:22px 0 0;font-family:' + BODY + ';font-size:15px;line-height:1.5;color:' + INK + '">' + esc(t).replace(/\n/g, '<br>') + '</td></tr>' : '',
};

/** Estructura común de todos los emails. `filas` es HTML de <tr> (usar los bloques de B). */
export function layout({ cfg = {}, asunto = '', preheader = '', filas = '' }) {
  const pie = esc(cfg.pie || 'with ❤ from cordoba | © àndale Strictly Confidential');
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">' +
    '<title>' + esc(asunto) + '</title>' +
    '<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">' +
    '<style>@font-face{font-family:Delight;font-weight:700;src:url(' + APP_URL + '/fonts/Delight-Bold.woff2) format("woff2")}' +
    'body{margin:0;padding:0;background:#f1f1f1}a{color:' + INK + '}@media (max-width:620px){.wrap{padding:28px 20px !important}.pago td{display:block !important;width:100% !important;padding:0 0 18px !important}}</style></head>' +
    '<body style="margin:0;padding:0;background:#f1f1f1">' +
    (preheader ? '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">' + esc(preheader) + '</div>' : '') +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f1f1"><tr><td align="center" style="padding:24px 12px">' +
    '<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background:#ffffff">' +
    '<tr><td class="wrap" style="padding:40px 44px 32px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' +
    '<tr><td align="center" style="padding:0 0 34px"><img src="' + APP_URL + '/marca/email-iso.png" width="120" height="90" alt="àndale" style="display:block;border:0;width:120px;height:auto"></td></tr>' +
    filas +
    '<tr><td align="center" style="padding:40px 0 0">' +
    '<div style="padding:0 0 4px">' + enlaces(cfg.redes, TITLE, 14, INK, true) + '</div>' +
    '<div style="padding:0 0 14px">' + enlaces(cfg.contacto, BODY, 12, '#333333', false) + '</div>' +
    '<img src="' + APP_URL + '/marca/email-logo.png" width="96" height="23" alt="àndale" style="display:block;margin:0 auto 8px;border:0;width:96px;height:auto">' +
    '<div style="font-family:' + TITLE + ';font-size:12px;font-weight:700;color:' + INK + '">' + pie + '</div>' +
    '</td></tr></table></td></tr></table></td></tr></table></body></html>';
}

/** Texto plano de respaldo (algunos clientes y filtros de spam lo leen). */
function textoPlano(partes, cfg) {
  return partes.filter(Boolean).join('\n\n') + '\n\n—\nàndale · ' + (cfg.contacto || []).map(c => c[0]).join(' · ');
}
const pagoTexto = cfg => (cfg.cuentas || []).map(c => c.titulo + (c.sub ? ' (' + c.sub + ')' : '') + '\n' + (c.campos || []).map(([k, v]) => k + ': ' + v).join('\n')).join('\n\n');

/* ---------- Plantillas ---------- */

export const textos = {
  resumen: ({ nombre, periodo }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nTe compartimos el resumen de cuenta de ' + periodo + '. Abajo tenés el detalle y los datos para el pago; también va adjunto en PDF.\n\n¡Gracias!',
  recordatorio: ({ nombre, periodo }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nTe escribimos para recordarte que está pendiente el pago de ' + periodo + '. Te dejamos el detalle y los datos para abonar.\n\nSi ya lo abonaste, desestimá este mensaje y, si podés, mandanos el comprobante. ¡Gracias!',
  aviso: ({ nombre, servicio, desde, pct }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nTe escribimos para contarte que a partir de ' + desde + ' actualizamos el valor del abono de ' + servicio + (pct ? ', con un ajuste del ' + pct + '%' : '') + '. Abajo tenés el detalle.\n\nCualquier consulta, estamos para conversarlo. ¡Gracias por seguir trabajando con nosotros!',
  factura: ({ nombre, comprobante, periodo }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nTe enviamos ' + comprobante + (periodo ? ' correspondiente a ' + periodo : '') + '. Podés verlo y descargarlo desde el botón de abajo.\n\n¡Gracias!',
  libre: ({ nombre }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\n',
};

export function resumenEmail(d) {
  const asunto = d.asunto || ('Resumen de cuenta · ' + d.cuenta + ' · ' + d.periodo);
  const filas = B.meta([['Cliente', d.contacto], ['Cuenta', d.cuenta], ['Periodo', d.periodo]]) + B.titulo('Resumen de Cuenta') + B.mensaje(d.mensaje) +
    B.items(d.items, d.total, d.moneda) + B.nota(d.cfg, d.nota) + B.pago(d.cfg) + B.cierre(d.cfg.cierre) + B.firma(d.firma);
  const texto = textoPlano([d.mensaje, d.items.map(i => '• ' + i.concepto + ': ' + plata(i.monto, d.moneda)).join('\n') + '\nTotal a abonar: ' + plata(d.total, d.moneda),
    d.cfg.nota ? 'NOTA ' + d.cfg.nota : '', d.nota, pagoTexto(d.cfg), d.cfg.cierre, d.firma], d.cfg);
  return { asunto, html: layout({ cfg: d.cfg, asunto, preheader: 'Total a abonar ' + plata(d.total, d.moneda), filas }), texto };
}

export function recordatorioEmail(d) {
  const asunto = d.asunto || ('Recordatorio de pago · ' + d.cuenta + ' · ' + d.periodo);
  const filas = B.meta([['Cliente', d.contacto], ['Cuenta', d.cuenta], ['Periodo', d.periodo]]) + B.titulo('Recordatorio de pago') + B.mensaje(d.mensaje) +
    B.items(d.pendientes, d.total, d.moneda, 'Saldo pendiente') + B.nota(d.cfg, '') + B.pago(d.cfg) + B.cierre(d.cfg.cierre) + B.firma(d.firma);
  const texto = textoPlano([d.mensaje, d.pendientes.map(i => '• ' + i.concepto + ': ' + plata(i.monto, d.moneda)).join('\n') + '\nSaldo pendiente: ' + plata(d.total, d.moneda), pagoTexto(d.cfg), d.firma], d.cfg);
  return { asunto, html: layout({ cfg: d.cfg, asunto, preheader: 'Saldo pendiente ' + plata(d.total, d.moneda), filas }), texto };
}

export function avisoEmail(d) {
  const asunto = d.asunto || ('Actualización de tu abono · desde ' + d.desde);
  const filas = B.meta([['Cliente', d.contacto], ['Cuenta', d.cuenta]]) + B.titulo('Actualización de abono') + B.mensaje(d.mensaje) +
    B.tabla([['Servicio', d.servicio], ...(d.anterior ? [['Valor actual', plata(d.anterior, d.moneda)]] : []), ['Valor nuevo', plata(d.nuevo, d.moneda), true], ['Rige desde', d.desde]]) + B.firma(d.firma);
  const texto = textoPlano([d.mensaje, 'Servicio: ' + d.servicio + (d.anterior ? '\nValor actual: ' + plata(d.anterior, d.moneda) : '') + '\nValor nuevo: ' + plata(d.nuevo, d.moneda) + '\nRige desde: ' + d.desde, d.firma], d.cfg);
  return { asunto, html: layout({ cfg: d.cfg, asunto, preheader: 'Desde ' + d.desde + ': ' + plata(d.nuevo, d.moneda) + ' por mes', filas }), texto };
}

export function facturaEmail(d) {
  const nombreComp = d.tipo + (d.numero ? ' ' + d.numero : '');
  const asunto = d.asunto || (nombreComp + ' · ' + d.cuenta + (d.periodo ? ' · ' + d.periodo : ''));
  const filas = B.meta([['Cliente', d.contacto], ['Cuenta', d.cuenta], ['Periodo', d.periodo]]) + B.titulo(d.tipo === 'Invoice' ? 'Invoice' : 'Comprobante') + B.mensaje(d.mensaje) +
    B.tabla([['Comprobante', nombreComp], ['Fecha', fecha(d.fecha)], ...(d.vencimiento ? [['Vencimiento', fecha(d.vencimiento)]] : []), ['Importe', plata(d.monto, d.moneda), true]]) +
    B.boton(d.tipo === 'Invoice' ? 'Ver invoice' : 'Ver comprobante', d.link) + (d.conPago ? B.pago(d.cfg) : '') + B.firma(d.firma);
  const texto = textoPlano([d.mensaje, nombreComp + ' · ' + plata(d.monto, d.moneda) + (d.vencimiento ? ' · vence ' + fecha(d.vencimiento) : ''), d.link ? 'Ver: ' + d.link : '', d.conPago ? pagoTexto(d.cfg) : '', d.firma], d.cfg);
  return { asunto, html: layout({ cfg: d.cfg, asunto, preheader: nombreComp + ' · ' + plata(d.monto, d.moneda), filas }), texto };
}

export function libreEmail(d) {
  const asunto = d.asunto || 'Novedades de àndale';
  const filas = (d.cuenta ? B.meta([['Cliente', d.contacto], ['Cuenta', d.cuenta]]) : '') + (d.titulo ? B.titulo(d.titulo) : '') + B.mensaje(d.mensaje) +
    (d.conPago ? B.pago(d.cfg) : '') + B.boton(d.botonTexto || 'Ver más', d.botonUrl) + B.firma(d.firma);
  return { asunto, html: layout({ cfg: d.cfg, asunto, preheader: (d.mensaje || '').replace(/\s+/g, ' ').slice(0, 90), filas }), texto: textoPlano([d.mensaje, d.botonUrl, d.firma], d.cfg) };
}

/** Plantillas para los mails de acceso de Supabase (se pegan en Authentication → Emails). */
export function authEmail(cfg, { titulo, mensaje, boton }) {
  return layout({ cfg, asunto: titulo, preheader: mensaje, filas: B.titulo(titulo) + B.mensaje(mensaje) + B.boton(boton, '{{ .ConfirmationURL }}') +
    '<tr><td style="padding:6px 0 0;font-family:' + BODY + ';font-size:12px;line-height:1.5;color:' + MUTED + '">Si no pediste este acceso, ignorá este mensaje. El link vence en una hora y sirve una sola vez.</td></tr>' });
}
