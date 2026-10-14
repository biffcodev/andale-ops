// Emails de àndale — estética 2026. Carta corta, fondo blanco, todo alineado a la izquierda.
// Jerarquía: logotipo → etiqueta coral (qué es) → cifra o titular grande en Delight → mensaje → detalle compacto → firma → pie.
// El detalle completo (todas las cuentas, formato imprimible) va en el PDF; el mail resume.
// HTML "email-safe": tablas, estilos en línea, imágenes PNG alojadas en el sitio, Helvetica/Arial de respaldo (Gmail no carga fuentes).

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
  firma: t => !t ? '' : td(esc(t).replace(/\n/g, '<br>'), txt(15, INK)),
};

/** Estructura común: fondo blanco, columna de 560px alineada a la izquierda. `filas` = HTML de <tr>. */
export function layout({ cfg = {}, asunto = '', preheader = '', filas = '' }) {
  const red = (cfg.redes || []).map(([t, u]) => '<a href="' + esc(u) + '" style="color:' + INK + ';text-decoration:none;font-weight:700">' + esc(t.charAt(0).toUpperCase() + t.slice(1)) + '</a>').join('&nbsp;&nbsp;·&nbsp;&nbsp;');
  const contacto = (cfg.contacto || []).filter(([t]) => !t.startsWith('@')).map(([t, u]) => '<a href="' + esc(u) + '" style="color:' + MUTED + ';text-decoration:none;white-space:nowrap">' + esc(t) + '</a>').join('&nbsp;&nbsp;·&nbsp;&nbsp;');
  return '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light">' +
    '<title>' + esc(asunto) + '</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">' +
    '<style>@font-face{font-family:Delight;font-weight:700;src:url(' + APP_URL + '/fonts/Delight-Bold.woff2) format("woff2")}body{margin:0;padding:0;background:#ffffff}a{color:' + INK + '}' +
    '@media (max-width:600px){.col{padding:28px 20px 36px !important}.big{font-size:28px !important}}</style></head>' +
    '<body style="margin:0;padding:0;background:#ffffff">' +
    (preheader ? '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">' + esc(preheader) + '&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>' : '') +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff"><tr><td align="left" class="col" style="padding:40px 32px 48px">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">' +
    td('<img src="' + APP_URL + '/marca/email-logo.png" width="92" height="22" alt="àndale" style="display:block;border:0;width:92px;height:auto">') + sp(44) +
    filas +
    sp(48) + '<tr><td style="border-top:1px solid ' + LINE + ';padding:22px 0 0">' +
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>' +
    '<td valign="top" style="padding:2px 16px 0 0"><img src="' + APP_URL + '/marca/email-iso.png" width="44" height="33" alt="" style="display:block;border:0;width:44px;height:auto"></td>' +
    '<td valign="top" style="' + txt(12.5, MUTED, 'line-height:1.6') + '"><div style="font-family:' + TITLE + ';font-size:14px;font-weight:700;color:' + INK + '">àndale</div>' +
    (contacto ? '<div>' + contacto + '</div>' : '') + (red ? '<div style="padding:2px 0 0">' + red + '</div>' : '') +
    '<div style="padding:8px 0 0;font-size:11.5px">' + esc(cfg.pie || 'with ❤ from cordoba | © àndale Strictly Confidential') + '</div></td></tr></table>' +
    '</td></tr></table></td></tr></table></body></html>';
}

function textoPlano(partes, cfg) {
  return partes.filter(Boolean).join('\n\n') + '\n\n—\nàndale · ' + (cfg.contacto || []).map(c => c[0]).join(' · ');
}
const pagoTexto = cfg => (cfg.cuentas || []).map(c => c.titulo + (c.sub ? ' (' + c.sub + ')' : '') + '\n' + (c.campos || []).map(([k, v]) => k + ': ' + v).join('\n')).join('\n\n');
const venceTexto = cfg => cfg.vence_email || 'Se abona del 1 al 5 del mes en curso.';

/* ---------- Textos por defecto (editables antes de enviar) ---------- */
export const textos = {
  resumen: ({ nombre, periodo }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nTe mandamos el resumen de cuenta de ' + periodo + '. Abajo tenés el detalle y los datos para el pago, y el PDF va adjunto por si lo necesitás para tu administración.\n\nCuando lo abones, respondé este mail con el comprobante así lo registramos. ¡Gracias!',
  recordatorio: ({ nombre, periodo }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nTe escribimos porque todavía figura pendiente el pago de ' + periodo + '. Te dejamos el detalle y los datos para abonar.\n\nSi ya lo pagaste, desestimá este mensaje y, si podés, respondenos con el comprobante. ¡Gracias!',
  aviso: ({ nombre, servicio, desde, pct }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nQueríamos contarte con tiempo que a partir de ' + desde + ' actualizamos el valor de ' + servicio + (pct ? ' (un ajuste del ' + pct + '%)' : '') + '.\n\nCualquier duda la charlamos. ¡Gracias por seguir trabajando con nosotros!',
  factura: ({ nombre, comprobante, periodo }) => 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nTe enviamos ' + comprobante + (periodo ? ' de ' + periodo : '') + '. Podés verlo y descargarlo desde el botón.\n\n¡Gracias!',
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
    B.titular(plata(d.total, d.moneda), 'Saldo pendiente') + sp(30) +
    B.mensaje(d.mensaje) + sp(12) +
    B.detalle('Pendiente', d.pendientes.map(i => [i.concepto, plata(i.monto, d.moneda)]), d.pendientes.length > 1 ? ['Total', plata(d.total, d.moneda)] : null) + sp(30) +
    B.pago(d.cfg) + sp(32) + B.firma(d.firma);
  const texto = textoPlano([d.mensaje, d.pendientes.map(i => '• ' + i.concepto + ': ' + plata(i.monto, d.moneda)).join('\n') + '\nSaldo pendiente: ' + plata(d.total, d.moneda), pagoTexto(d.cfg), d.firma], d.cfg);
  return { asunto, html: layout({ cfg: d.cfg, asunto, preheader: 'Saldo pendiente ' + plata(d.total, d.moneda), filas }), texto };
}

export function avisoEmail(d) {
  const asunto = d.asunto || ('Actualización de tu abono · desde ' + d.desde);
  const filas = B.etiqueta(['Actualización de abono', d.cuenta]) + sp(18) +
    B.titular(plata(d.nuevo, d.moneda), 'Desde ' + d.desde, 'por mes · ' + d.servicio) + sp(30) +
    B.mensaje(d.mensaje) + sp(12) +
    B.detalle('', [['Servicio', d.servicio], ...(d.anterior ? [['Valor actual', plata(d.anterior, d.moneda)]] : []), ['Rige desde', d.desde]], ['Valor nuevo', plata(d.nuevo, d.moneda)]) + sp(32) +
    B.firma(d.firma);
  const texto = textoPlano([d.mensaje, 'Servicio: ' + d.servicio + (d.anterior ? '\nValor actual: ' + plata(d.anterior, d.moneda) : '') + '\nValor nuevo: ' + plata(d.nuevo, d.moneda) + '\nRige desde: ' + d.desde, d.firma], d.cfg);
  return { asunto, html: layout({ cfg: d.cfg, asunto, preheader: 'Desde ' + d.desde + ': ' + plata(d.nuevo, d.moneda) + ' por mes', filas }), texto };
}

export function facturaEmail(d) {
  const nombreComp = d.tipo + (d.numero ? ' ' + d.numero : '');
  const asunto = d.asunto || (nombreComp + ' · ' + d.cuenta + (d.periodo ? ' · ' + d.periodo : ''));
  const filas = B.etiqueta([d.tipo === 'Invoice' ? 'Invoice' : 'Comprobante', d.cuenta, d.periodo]) + sp(18) +
    B.titular(plata(d.monto, d.moneda), nombreComp, d.vencimiento ? 'Vence el ' + fecha(d.vencimiento) : '') + sp(30) +
    B.mensaje(d.mensaje) + sp(6) + B.boton(d.tipo === 'Invoice' ? 'Ver invoice' : 'Ver comprobante', d.link) + sp(30) +
    B.detalle('', [['Comprobante', nombreComp], ['Fecha', fecha(d.fecha)], ...(d.vencimiento ? [['Vencimiento', fecha(d.vencimiento)]] : [])], ['Importe', plata(d.monto, d.moneda)]) +
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

/** Plantillas para los mails de acceso de Supabase (se pegan en Authentication → Emails). */
export function authEmail(cfg, { titulo, mensaje, boton }) {
  return layout({ cfg, asunto: titulo, preheader: mensaje, filas: B.etiqueta(['àndale Operaciones']) + sp(18) + B.titular(titulo) + sp(26) + B.mensaje(mensaje) + sp(6) +
    B.boton(boton, '{{ .ConfirmationURL }}') + sp(26) + B.nota('Si no pediste este acceso, ignorá este mensaje. El link vence en una hora y sirve una sola vez.') });
}
