// Emails de àndale — estética 2026. Carta corta, fondo blanco, todo alineado a la izquierda.
// Jerarquía: logotipo → etiqueta coral (qué es) → cifra o titular grande en Delight → mensaje → detalle compacto → firma → pie.
// El detalle completo (todas las cuentas, formato imprimible) va en el PDF; el mail resume.
// HTML "email-safe": tablas, estilos en línea, imágenes PNG alojadas en el sitio, Helvetica/Arial de respaldo (Gmail no carga fuentes).

import { firmaTexto } from './firma.js';
export const APP_URL = 'https://andale-ops.vercel.app';
const ACC = '#FC4855', INK = '#111111', SOFT = '#3d3d3d', MUTED = '#767676', LINE = '#e7e7e7';
const TITLE = "'Delight','Inter',Helvetica,Arial,sans-serif";
const BODY = "'Inter',Helvetica,Arial,sans-serif";

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function plata(n, moneda) {
  try { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda || 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0).replace(/ | /g, ' '); }
  catch (e) { return (moneda || '') + ' ' + n; }
}
const fecha = d => { if (!d) return ''; const [y, m, dd] = String(d).slice(0, 10).split('-'); return dd + '/' + m + '/' + y; };
const sp = h => '<tr><td style="height:' + h + 'px;line-height:' + h + 'px;font-size:0">&nbsp;</td></tr>';
const td = (html, style = '') => '<tr><td style="' + style + '">' + html + '</td></tr>';
const txt = (size, color, extra = '') => 'font-family:' + BODY + ';font-size:' + size + 'px;line-height:1.55;color:' + color + ';' + extra;

/* ---------- Bloques ---------- */
export const B = {
  /** Etiqueta superior: qué es el mail y de quién (coral, mayúsculas chicas). */
  etiqueta: partes => td(esc(partes.filter(Boolean).join('  ·  ')), txt(12, ACC, 'font-weight:700;letter-spacing:.08em;text-transform:uppercase;line-height:1.4')),
  /** Titular grande (una cifra o una frase corta). `antes` es una línea chica arriba. */
  titular: (t, antes, despues) =>
    (antes ? td(esc(antes), txt(14, MUTED, 'padding:0 0 2px')) : '') +
    '<tr><td class="big" style="font-family:' + TITLE + ';font-size:34px;line-height:1.15;font-weight:700;color:' + INK + ';letter-spacing:-.01em">' + esc(t) + '</td></tr>' +
    (despues ? td(esc(despues), txt(14, MUTED, 'padding:6px 0 0')) : ''),
  mensaje: t => !t || !t.trim() ? '' : td(String(t).trim().split(/\n{2,}/).filter(Boolean)
    .map(p => '<p style="margin:0 0 14px;' + txt(15, INK) + '">' + esc(p).replace(/\n/g, '<br>') + '</p>').join('')),
  /** Lista de conceptos con importe, filetes finos, total opcional. */
  detalle: (titulo, filas, total) => {
    const row = (k, v, fuerte) => '<tr><td style="padding:11px 0;border-top:1px solid ' + LINE + ';' + txt(14, fuerte ? INK : SOFT, fuerte ? 'font-weight:700' : '') + '">' + esc(k) +
      '</td><td align="right" style="padding:11px 0 11px 16px;border-top:1px solid ' + LINE + ';white-space:nowrap;' + txt(14, INK, 'font-weight:' + (fuerte ? 700 : 600)) + '">' + esc(v) + '</td></tr>';
    return td((titulo ? '<div style="' + txt(12, MUTED, 'font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:0 0 6px') + '">' + esc(titulo) + '</div>' : '') +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">' + filas.map(([k, v]) => row(k, v)).join('') +
      (total ? row(total[0], total[1], true) : '') + '<tr><td colspan="2" style="border-top:1px solid ' + LINE + ';font-size:0;line-height:0">&nbsp;</td></tr></table>');
  },
  /** Cómo pagar: la primera cuenta (Argentina) completa, las del exterior en una línea cada una. */
  pago: cfg => {
    const cs = cfg.cuentas || []; if (!cs.length) return '';
    const [ar, ...ext] = cs;
    const v = (c, k) => ((c.campos || []).find(([kk]) => kk.toLowerCase().startsWith(k)) || [])[1] || '';
    const main = [['Alias', v(ar, 'alias')], ['CBU', v(ar, 'cbu')], ['Banco', v(ar, 'nombre del banco')], ['Titular', v(ar, 'nombre del benef')]].filter(([, x]) => x);
    return td('<div style="' + txt(12, MUTED, 'font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:0 0 10px') + '">Cómo pagar</div>' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f6f6f6;border-radius:8px"><tr><td style="padding:16px 18px">' +
      '<div style="' + txt(13, INK, 'font-weight:700;padding:0 0 6px') + '">' + esc(ar.titulo) + '</div>' +
      main.map(([k, x]) => '<div style="' + txt(14, INK) + '"><span style="color:' + MUTED + '">' + esc(k) + '</span>&nbsp;&nbsp;<b style="font-weight:600;word-break:break-word">' + esc(x) + '</b></div>').join('') +
      ext.map(c => '<div style="' + txt(12.5, SOFT, 'padding:10px 0 0') + '"><b style="color:' + INK + '">' + esc(c.titulo) + '</b>' + (c.sub ? ' <span style="color:' + MUTED + '">(' + esc(c.sub) + ')</span>' : '') + '<br>' +
        esc((c.campos || []).filter(([k]) => !/benef|tipo de cuenta/i.test(k)).map(([k, x]) => (k.replace(/^Nombre del banco$/, '').replace(/^Dirección del banco$/, 'Dirección').replace(/^Enrutamiento de ABA$/, 'ABA').replace(/^Número de cuenta$/, 'Cuenta') ).trim() + ' ' + x).map(t => t.trim()).join(' · ')) + '</div>').join('') +
      '</td></tr></table>');
  },
  boton: (texto, url) => !url ? '' : td('<a href="' + esc(url) + '" style="display:inline-block;background:' + INK + ';color:#ffffff;text-decoration:none;font-family:' + TITLE + ';font-size:15px;font-weight:700;padding:13px 24px;border-radius:999px">' + esc(texto) + '&nbsp;&nbsp;→</a>'),
  nota: t => !t ? '' : td(esc(t), txt(13, MUTED)),
  firma: t => {
    if (!t) return '';
    if (typeof t !== 'object') return td(esc(t).replace(/\n/g, '<br>'), txt(15, INK));
    // Firma armada: saludo y, al lado de la foto, nombre, cargo y contacto.
    const tel = t.tel ? '<a href="tel:' + esc(String(t.tel).replace(/[^\d+]/g, '')) + '" style="color:' + SOFT + ';text-decoration:none">' + esc(t.tel) + '</a>' : '';
    const mail = t.email ? '<a href="mailto:' + esc(t.email) + '" style="color:' + SOFT + ';text-decoration:none">' + esc(t.email) + '</a>' : '';
    const foto = t.foto ? '<td width="64" valign="top" style="width:64px;padding:0 14px 0 0"><img src="' + esc(t.foto) + '" width="56" height="56" alt="' + esc(t.nombre) + '" style="display:block;width:56px;height:56px;min-width:56px;max-width:56px;border-radius:28px;object-fit:cover;border:0"></td>' : '';
    return (t.saludo ? td(esc(t.saludo), txt(15, INK, 'padding:0 0 12px')) : '') +
      td('<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' + foto + '<td valign="middle" style="' + txt(14, SOFT) + '">' +
        '<div style="' + txt(15.5, INK, 'font-weight:700') + '">' + esc(t.nombre) + '</div>' +
        ((t.cargo || t.marca) ? '<div style="' + txt(13.5, MUTED) + '">' + esc([t.cargo, t.marca].filter(Boolean).join(' · ')) + '</div>' : '') +
        ((tel || mail) ? '<div style="' + txt(13.5, SOFT, 'padding-top:2px') + '">' + [tel, mail].filter(Boolean).join('&nbsp;&nbsp;·&nbsp;&nbsp;') + '</div>' : '') +
        '</td></tr></table>');
  },
};

/** Estructura común: fondo blanco, columna de 560px alineada a la izquierda. `filas` = HTML de <tr>. */
const PIE_TXT = cfg => esc(cfg.pie || 'with ❤ from cordoba | © àndale Strictly Confidential');
const links = (arr, color, extra = '') => (arr || []).map(([t, u]) => '<a href="' + esc(u) + '" style="color:' + color + ';text-decoration:none;white-space:nowrap;' + extra + '">' + esc(t) + '</a>');
const redesCap = cfg => (cfg.redes || []).map(([t, u]) => [t.charAt(0).toUpperCase() + t.slice(1), u]);
const contactoSin = cfg => (cfg.contacto || []).filter(([t]) => !t.startsWith('@'));
const DOT = '&nbsp;&nbsp;·&nbsp;&nbsp;';

/** Variantes de pie. `cfg.pie_estilo`: 'editorial' | 'minimo' | 'banda' | 'firma' (la primera versión). */
export const PIES = {
  // Isologo grande solo, sitio en Delight, contacto y redes en gris en dos líneas.
  editorial: cfg => sp(56) +
    td('<img src="' + APP_URL + '/marca/email-iso.png" width="64" height="48" alt="àndale" style="display:block;border:0;width:64px;height:auto">') + sp(16) +
    td('<a href="https://weareandale.com/" style="font-family:' + TITLE + ';font-size:20px;font-weight:700;color:' + INK + ';text-decoration:none">weareandale.com</a>') + sp(6) +
    td(links(contactoSin(cfg).filter(([t]) => !/weareandale\.com$/.test(t) || t.includes('@')), MUTED).join(DOT), txt(13, MUTED)) +
    td(links(redesCap(cfg), MUTED).join(DOT), txt(13, MUTED)) + sp(18) +
    td(PIE_TXT(cfg), txt(11.5, '#a3a3a3')),
  // Sin imágenes: tres líneas de texto gris, separadas por un filete.
  minimo: cfg => sp(48) + '<tr><td style="border-top:1px solid ' + LINE + ';padding:18px 0 0;' + txt(12.5, MUTED, 'line-height:1.7') + '">' +
    '<b style="color:' + INK + ';font-family:' + TITLE + '">àndale</b>' + DOT + 'Córdoba, Argentina<br>' +
    links(contactoSin(cfg), MUTED).join(DOT) + '<br>' + links(redesCap(cfg), MUTED).join(DOT) +
    '<br><span style="color:#a3a3a3;font-size:11.5px">' + PIE_TXT(cfg) + '</span></td></tr>',
  // Banda negra al pie con isologo y logotipo en blanco.
  banda: cfg => sp(48) + '<tr><td style="background:#111111;padding:28px 28px 26px;border-radius:10px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td valign="middle"><img src="' + APP_URL + '/marca/email-logo-neg.png" width="92" height="22" alt="àndale" style="display:block;border:0;width:92px;height:auto"></td>' +
    '<td valign="middle" align="right"><img src="' + APP_URL + '/marca/email-iso-neg.png" width="52" height="39" alt="" style="display:block;border:0;width:52px;height:auto;margin-left:auto"></td></tr></table>' +
    '<div style="height:18px;line-height:18px;font-size:0">&nbsp;</div>' +
    '<div style="' + txt(13, '#d6d6d6', 'line-height:1.75') + '">' + links(contactoSin(cfg), '#ffffff').join('<span style="color:#6b6b6b">' + DOT + '</span>') + '<br>' +
    links(redesCap(cfg), '#ffffff', 'font-weight:700').join('<span style="color:#6b6b6b">' + DOT + '</span>') + '</div>' +
    '<div style="' + txt(11.5, '#8c8c8c', 'padding:14px 0 0') + '">' + PIE_TXT(cfg) + '</div></td></tr>',
  // Primera versión (isologo chico + bloque de texto al lado).
  firma: cfg => sp(48) + '<tr><td style="border-top:1px solid ' + LINE + ';padding:22px 0 0">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td valign="top" style="padding:2px 16px 0 0"><img src="' + APP_URL + '/marca/email-iso.png" width="44" height="33" alt="" style="display:block;border:0;width:44px;height:auto"></td>' +
    '<td valign="top" style="' + txt(12.5, MUTED, 'line-height:1.6') + '"><div style="font-family:' + TITLE + ';font-size:14px;font-weight:700;color:' + INK + '">àndale</div>' +
    '<div>' + links(contactoSin(cfg), MUTED).join(DOT) + '</div><div style="padding:2px 0 0">' + links(redesCap(cfg), INK, 'font-weight:700').join(DOT) + '</div>' +
    '<div style="padding:8px 0 0;font-size:11.5px">' + PIE_TXT(cfg) + '</div></td></tr></table></td></tr>',
};

/** Estructura común: fondo blanco, columna de 560px alineada a la izquierda. `filas` = HTML de <tr>. */
export function layout({ cfg = {}, asunto = '', preheader = '', filas = '' }) {
  const pie = PIES[cfg.pie_estilo] || PIES.editorial;
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">' +
    '<title>' + esc(asunto) + '</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">' +
    '<style>@font-face{font-family:Delight;font-weight:700;src:url(' + APP_URL + '/fonts/Delight-Bold.woff2) format("woff2")}body{margin:0;padding:0;background:#ffffff}a{color:' + INK + '}' +
    '@media (max-width:600px){.col{padding:28px 20px 36px !important}.big{font-size:28px !important}}</style></head>' +
    '<body style="margin:0;padding:0;background:#ffffff">' +
    (preheader ? '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">' + esc(preheader) + '&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>' : '') +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff"><tr><td align="left" class="col" style="padding:40px 32px 48px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">' +
    td('<img src="' + APP_URL + '/marca/email-logo.png" width="92" height="22" alt="àndale" style="display:block;border:0;width:92px;height:auto">') + sp(44) +
    filas + pie(cfg) +
    '</table></td></tr></table></body></html>';
}

function textoPlano(partes, cfg) {
  return partes.map(p => p && typeof p === 'object' ? firmaTexto(p) : p).filter(Boolean).join('\n\n') + '\n\n—\nàndale · ' + (cfg.contacto || []).map(c => c[0]).join(' · ');
}
const pagoTexto = cfg => (cfg.cuentas || []).map(c => c.titulo + (c.sub ? ' (' + c.sub + ')' : '') + '\n' + (c.campos || []).map(([k, v]) => k + ': ' + v).join('\n')).join('\n\n');
const venceTexto = cfg => cfg.vence_email || 'Se abona del 1 al 5 del mes en curso.';

/* ---------- Textos por defecto (editables antes de enviar) ---------- */
export const textos = {
  resumen: ({ nombre, periodo }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nTe mandamos el resumen de cuenta de ' + periodo + '. Abajo tenés el detalle y los datos para el pago, y el PDF va adjunto por si lo necesitás para tu administración.\n\nCuando lo abones, respondé este mail con el comprobante así lo registramos. ¡Gracias!',
  recordatorio: ({ nombre, periodo }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nTe escribimos porque todavía figura pendiente el pago de ' + periodo + '. Te dejamos el detalle y los datos para abonar.\n\nSi ya lo pagaste, desestimá este mensaje y, si podés, respondenos con el comprobante. ¡Gracias!',
  aviso: ({ nombre, servicio, desde, pct, motivo }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nQueríamos contarte con tiempo que a partir de ' + desde + ' actualizamos el valor de ' + servicio + (pct ? ' (un ajuste del ' + pct + '%)' : '') + '.' + (motivo ? '\n\nEl motivo: ' + motivo + '.' : '') + '\n\nCualquier duda la charlamos. ¡Gracias por seguir trabajando con nosotros!',
  factura: ({ nombre, comprobante, periodo, como }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nTe enviamos ' + comprobante + (periodo ? ' de ' + periodo : '') + '.' + (como === 'adjunto' ? ' Te la adjuntamos en este mail.' : como === 'boton' ? ' La podés ver y descargar desde el botón.' : '') + '\n\n¡Gracias!',
  libre: ({ nombre }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\n',
};

/* ---------- Plantillas ---------- */
export function resumenEmail(d) {
  const asunto = d.asunto || ('Resumen de cuenta · ' + d.cuenta + ' · ' + d.periodo);
  const filas = B.etiqueta(['Resumen de cuenta', d.cuenta, d.periodo]) + sp(18) +
    B.titular(plata(d.total, d.moneda), 'Total a abonar', venceTexto(d.cfg)) + sp(30) +
    B.mensaje(d.mensaje) + sp(12) +
    B.detalle('Detalle', d.items.map(i => [i.concepto, plata(i.monto, d.moneda)]), ['Total', plata(d.total, d.moneda)]) +
    (d.nota && d.nota.trim() ? sp(12) + B.nota(d.nota.trim()) : '') + sp(30) +
    B.pago(d.cfg) + sp(32) + B.firma(d.firma);
  const texto = textoPlano([d.mensaje, 'Total a abonar: ' + plata(d.total, d.moneda) + ' — ' + venceTexto(d.cfg), d.items.map(i => '• ' + i.concepto + ': ' + plata(i.monto, d.moneda)).join('\n'), d.nota, pagoTexto(d.cfg), d.firma], d.cfg);
  return { asunto, html: layout({ cfg: d.cfg, asunto, preheader: 'Total a abonar ' + plata(d.total, d.moneda) + ' · ' + venceTexto(d.cfg), filas }), texto };
}

export function recordatorioEmail(d) {
  const asunto = d.asunto || ('Recordatorio de pago · ' + d.cuenta + ' · ' + d.periodo);
  const filas = B.etiqueta(['Recordatorio de pago', d.cuenta, d.periodo]) + sp(18) +
    B.titular(plata(d.total, d.moneda), 'Pendiente de pago') + sp(30) +
    B.mensaje(d.mensaje) + sp(12) +
    B.detalle('Pendiente', d.pendientes.map(i => [i.concepto, plata(i.monto, d.moneda)]), d.pendientes.length > 1 ? ['Total', plata(d.total, d.moneda)] : null) + sp(30) +
    B.pago(d.cfg) + sp(32) + B.firma(d.firma);
  const texto = textoPlano([d.mensaje, d.pendientes.map(i => '• ' + i.concepto + ': ' + plata(i.monto, d.moneda)).join('\n') + '\nPendiente de pago: ' + plata(d.total, d.moneda), pagoTexto(d.cfg), d.firma], d.cfg);
  return { asunto, html: layout({ cfg: d.cfg, asunto, preheader: 'Pendiente de pago ' + plata(d.total, d.moneda), filas }), texto };
}

export function avisoEmail(d) {
  const asunto = d.asunto || ('Actualización de tu abono · desde ' + d.desde);
  const filas = B.etiqueta(['Actualización de abono', d.cuenta]) + sp(18) +
    B.titular(plata(d.nuevo, d.moneda), 'Desde ' + d.desde, 'por mes · ' + d.servicio) + sp(30) +
    B.mensaje(d.mensaje) + sp(12) +
    B.detalle('', [['Servicio', d.servicio], ...(d.anterior ? [['Valor actual', plata(d.anterior, d.moneda)]] : []), ...(d.pct ? [['Ajuste', d.pct + '%']] : []), ...(d.motivo ? [['Motivo', d.motivo]] : []), ['Desde', d.desde]], ['Valor nuevo', plata(d.nuevo, d.moneda)]) + sp(32) +
    B.firma(d.firma);
  const texto = textoPlano([d.mensaje, 'Servicio: ' + d.servicio + (d.anterior ? '\nValor actual: ' + plata(d.anterior, d.moneda) : '') + (d.pct ? '\nAjuste: ' + d.pct + '%' : '') + (d.motivo ? '\nMotivo: ' + d.motivo : '') + '\nValor nuevo: ' + plata(d.nuevo, d.moneda) + '\nDesde: ' + d.desde, d.firma], d.cfg);
  return { asunto, html: layout({ cfg: d.cfg, asunto, preheader: 'Desde ' + d.desde + ': ' + plata(d.nuevo, d.moneda) + ' por mes', filas }), texto };
}

export function facturaEmail(d) {
  const nombreComp = d.tipo + (d.numero ? ' ' + d.numero : '');
  const asunto = d.asunto || (nombreComp + ' · ' + d.cuenta + (d.periodo ? ' · ' + d.periodo : ''));
  const filas = B.etiqueta([d.tipo === 'Invoice' ? 'Invoice' : 'Factura', d.cuenta, d.periodo]) + sp(18) +
    B.titular(plata(d.monto, d.moneda), nombreComp, d.vencimiento ? 'Vence el ' + fecha(d.vencimiento) : '') + sp(30) +
    B.mensaje(d.mensaje) + sp(6) + B.boton(d.tipo === 'Invoice' ? 'Ver invoice' : 'Ver factura', d.link) + sp(30) +
    B.detalle('', [[d.tipo === 'Invoice' ? 'Invoice' : 'Factura', nombreComp], ['Fecha', fecha(d.fecha)], ...(d.vencimiento ? [['Vencimiento', fecha(d.vencimiento)]] : [])], ['Importe', plata(d.monto, d.moneda)]) +
    (d.conPago ? sp(30) + B.pago(d.cfg) : '') + sp(32) + B.firma(d.firma);
  const texto = textoPlano([d.mensaje, nombreComp + ' · ' + plata(d.monto, d.moneda) + (d.vencimiento ? ' · vence ' + fecha(d.vencimiento) : ''), d.link ? 'Ver: ' + d.link : '', d.conPago ? pagoTexto(d.cfg) : '', d.firma], d.cfg);
  return { asunto, html: layout({ cfg: d.cfg, asunto, preheader: nombreComp + ' · ' + plata(d.monto, d.moneda), filas }), texto };
}

export function libreEmail(d) {
  const asunto = d.asunto || 'Novedades de àndale';
  const filas = B.etiqueta([d.cuenta]) + sp(18) + (d.titulo ? B.titular(d.titulo) + sp(26) : '') + B.mensaje(d.mensaje) +
    (d.botonUrl ? sp(6) + B.boton(d.botonTexto || 'Ver más', d.botonUrl) : '') + (d.conPago ? sp(30) + B.pago(d.cfg) : '') + sp(32) + B.firma(d.firma);
  return { asunto, html: layout({ cfg: d.cfg, asunto, preheader: (d.mensaje || '').replace(/\s+/g, ' ').slice(0, 90), filas }), texto: textoPlano([d.mensaje, d.botonUrl, d.firma], d.cfg) };
}

/** Mail personal: se ve como uno escrito a mano (sin logo, sin botón grande, sin pie de agencia).
 *  Para avisos uno a uno (una mención, "tenés para revisar"): Gmail los trata como correspondencia y no como promoción. */
export function personalEmail(d) {
  const asunto = d.asunto || 'àndale';
  const par = t => '<p style="margin:0 0 14px">' + esc(t).replace(/\n/g, '<br>') + '</p>';
  const cuerpo = String(d.mensaje || '').split(/\n{2,}/).filter(Boolean).map(par).join('') +
    (d.linkUrl ? '<p style="margin:0 0 14px">' + esc(d.linkTexto || 'Ver') + ': <a href="' + esc(d.linkUrl) + '" style="color:#0B86C4">' + esc(d.linkUrl.replace(/^https?:\/\//, '')) + '</a></p>' : '');
  const f = d.firma && typeof d.firma === 'object' ? [d.firma.saludo, d.firma.nombre, [d.firma.cargo, d.firma.marca || 'àndale'].filter(Boolean).join(' · '), d.firma.tel].filter(Boolean) : d.firma ? [String(d.firma)] : [];
  const html = '<!doctype html><html lang="es"><head><meta charset="utf-8"><title>' + esc(asunto) + '</title></head><body style="margin:0;padding:0">' +
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#1f2328;max-width:600px;padding:8px 4px">' + cuerpo +
    (f.length ? '<p style="margin:18px 0 0;color:#444">' + f.map(esc).join('<br>') + '</p>' : '') + '</div></body></html>';
  const texto = [d.mensaje, d.linkUrl ? (d.linkTexto || 'Ver') + ': ' + d.linkUrl : '', f.join('\n')].filter(Boolean).join('\n\n');
  return { asunto, html, texto };
}

/** Plantillas para los mails de acceso de Supabase (se pegan en Authentication → Emails). */
export function authEmail(cfg, { titulo, mensaje, boton }) {
  return layout({ cfg, asunto: titulo, preheader: mensaje, filas: B.etiqueta(['àndale Operaciones']) + sp(18) + B.titular(titulo) + sp(26) + B.mensaje(mensaje) + sp(6) +
    B.boton(boton, '{{ .ConfirmationURL }}') + sp(26) + B.nota('Si no pediste este acceso, ignorá este mensaje. El link vence en una hora y sirve una sola vez.') });
}

/** Vista previa de la firma (para Mi perfil). */
export const firmaPreview = f => '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:10px;padding:16px 18px;width:100%">' + B.firma(f) + '</table>';
