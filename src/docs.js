// Documentos de àndale (PDF vectorial en el navegador, Delight + Inter embebidas).
// Un motor con primitivas comunes y un solo estilo (editorial, con el chancho arriba y el pie de los emails).
// Se usa para resúmenes de cuenta, presupuestos/propuestas, recibos y reportes.
import { PDFDocument, rgb, PDFString, PDFName } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ISO_PATHS, ISO_VB, LOGO_PATHS, LOGO_VB } from './marca.js';

export const W = 595.28, H = 841.89;
const hex = h => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
export const COL = { ink: hex('#17171C'), soft: hex('#3C3D45'), muted: hex('#7A7C86'), line: hex('#E3E4E8'), line2: hex('#C9CBD2'), coral: hex('#FC4855'), coralInk: hex('#D12A39'), coralSoft: hex('#FFEEF0'), paper: hex('#F6F6F8'), white: rgb(1, 1, 1) };
const FONT_FILES = { d: 'Delight-Bold', r: 'Inter-Regular', s: 'Inter-SemiBold', b: 'Inter-Bold' };
let fontBytes = null;
async function loadFonts() {
  if (!fontBytes) {
    const base = (typeof location !== 'undefined' ? location.origin : '') + '/fonts/pdf/';
    fontBytes = Object.fromEntries(await Promise.all(Object.entries(FONT_FILES).map(async ([k, f]) => {
      const r = await fetch(base + f + '.ttf'); if (!r.ok) throw new Error('No se pudo cargar la tipografía ' + f);
      return [k, new Uint8Array(await r.arrayBuffer())];
    })));
  }
  return fontBytes;
}
export function setFontBytes(b) { fontBytes = b; }
const clean = s => String(s ?? '').replace(/[  ]/g, ' ');
export function plata(n, moneda) {
  try { return clean(new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda || 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)); }
  catch (e) { return (moneda || '') + ' ' + n; }
}

/* ---------------- motor ---------------- */
export async function nuevoDoc(titulo, opts = {}) {
  const doc = await PDFDocument.create(); doc.registerFontkit(fontkit);
  const b = await loadFonts(); const F = {};
  for (const k of Object.keys(FONT_FILES)) F[k] = await doc.embedFont(b[k], { subset: true });
  doc.setTitle(titulo); doc.setAuthor('àndale'); doc.setCreator('àndale Operaciones'); doc.setProducer('àndale Operaciones');
  const M = opts.margen || 50;
  const D = { doc, F, M, cw: W - 2 * M, pages: [], page: null, y: 0, footH: opts.footH || 70, onPage: null };
  D.wid = (t, f, s) => f.widthOfTextAtSize(clean(t), s);
  D.text = (t, x, y, f, s, color = COL.ink, o = {}) => { D.page.drawText(clean(t), { x, y, font: f, size: s, color, opacity: o.op }); };
  D.right = (t, xr, y, f, s, color) => D.text(t, xr - D.wid(t, f, s), y, f, s, color);
  D.wrap = (t, f, s, max) => {
    const out = [];
    for (const para of clean(t).split('\n')) {
      let line = '';
      for (const w of para.split(/\s+/).filter(Boolean)) {
        const test = line ? line + ' ' + w : w;
        if (D.wid(test, f, s) <= max || !line) line = test; else { out.push(line); line = w; }
        while (D.wid(line, f, s) > max && line.length > 1) { let i = line.length; while (i > 1 && D.wid(line.slice(0, i), f, s) > max) i--; out.push(line.slice(0, i)); line = line.slice(i); }
      }
      out.push(line);
    }
    return out;
  };
  D.para = (t, x, f, s, max, color = COL.ink, lh = 1.45) => { const ls = D.wrap(t, f, s, max); ls.forEach(l => { D.need(s * lh); D.y -= s * lh; D.text(l, x, D.y, f, s, color); }); return ls.length; };
  D.hline = (y, x1 = D.M, x2 = W - D.M, color = COL.line, th = 0.75) => D.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: th, color });
  D.vline = (x, y1, y2, color = COL.line, th = 0.75) => D.page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: th, color });
  D.rect = (x, y, w, h, color, r = 0) => {
    if (!r) { D.page.drawRectangle({ x, y, width: w, height: h, color }); return; }
    const p = 'M' + r + ',0 H' + (w - r) + ' Q' + w + ',0 ' + w + ',' + r + ' V' + (h - r) + ' Q' + w + ',' + h + ' ' + (w - r) + ',' + h + ' H' + r + ' Q0,' + h + ' 0,' + (h - r) + ' V' + r + ' Q0,0 ' + r + ',0 Z';
    D.page.drawSvgPath(p, { x, y: y + h, color });
  };
  D.svg = (paths, vb, x, yTop, width, color = COL.ink) => { const sc = width / vb[0]; for (const d of paths) D.page.drawSvgPath(d, { x, y: yTop, scale: sc, color }); return vb[1] * sc; };
  D.logo = (x, yTop, w, color) => D.svg(LOGO_PATHS, LOGO_VB, x, yTop, w, color);
  D.iso = (x, yTop, w, color) => D.svg(ISO_PATHS, ISO_VB, x, yTop, w, color);
  D.link = (x, y, w, h, url) => {
    if (!url) return;
    const a = doc.context.register(doc.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [x, y, x + w, y + h], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) } }));
    const annots = D.page.node.lookup(PDFName.of('Annots')); if (annots) annots.push(a); else D.page.node.set(PDFName.of('Annots'), doc.context.obj([a]));
  };
  D.addPage = () => { D.page = doc.addPage([W, H]); D.pages.push(D.page); D.y = H - D.M; if (D.onPage) D.onPage(D.pages.length); return D.page; };
  D.need = h => { if (D.y - h < D.M + D.footH) D.addPage(); };
  D.save = async () => { if (opts.alPie) D.pages.forEach((p, i) => { D.page = p; opts.alPie(D, i + 1, D.pages.length); }); return doc.save(); };
  return D;
}

/* ---------------- piezas comunes ---------------- */
// Encabezado: el chancho (isologo) + logotipo, y hasta tres líneas a la derecha (qué es, número, fecha).
function cabecera(D, l1, l2, l3) {
  const top = D.y + 8, iw = 42, ih = ISO_VB[1] * iw / ISO_VB[0];
  D.iso(D.M, top, iw, COL.ink);
  const lw = 76, lh = LOGO_VB[1] * lw / LOGO_VB[0];
  D.logo(D.M + iw + 12, top - (ih - lh) / 2 - 1, lw, COL.ink);
  const ls = [l2, l3].filter(Boolean), mid = top - ih / 2 + ls.length * 5;
  D.right(l1, W - D.M, mid, D.F.s, 9, COL.ink);
  ls.forEach((l, i) => D.right(l, W - D.M, mid - 12 - i * 11.5, D.F.r, 8.5, COL.muted));
  D.y = top - ih;
}

// Datos de las dos partes en dos columnas: a quién va y quién lo emite (àndale).
const fmtCuit = c => { const d = String(c || '').replace(/\D/g, ''); return d.length === 11 ? d.slice(0, 2) + '-' + d.slice(2, 10) + '-' + d.slice(10) : String(c || ''); };
const NOMBRES_EMISOR = { Fer: 'Fernando Ambordt', Jime: 'Jimena Moyano' };
export function datosAndale(cfg, emisor) {
  const e = emisor ? ((cfg.emisores || {})[emisor] || {}) : null;
  const contacto = (cfg.contacto || []).filter(([t]) => !t.startsWith('@') && !/^weareandale\.com$/.test(t)).map(([t]) => t);
  return { titulo: 'De', nombre: 'àndale', lineas: [
    emisor ? [e.nombre || NOMBRES_EMISOR[emisor] || emisor, e.cuit ? 'CUIT ' + fmtCuit(e.cuit) : ''].filter(Boolean).join(' · ') : '',
    'Córdoba, Argentina', contacto.join(' · ')] };
}
export function datosCliente(c = {}) {
  return { titulo: c.titulo || 'Para', nombre: c.razon_social || c.nombre || '', lineas: [
    c.alias !== false && c.razon_social && c.nombre && c.razon_social !== c.nombre ? c.nombre : '',
    [c.cuit ? 'CUIT ' + fmtCuit(c.cuit) : '', c.condicion_iva].filter(Boolean).join(' · '),
    c.domicilio, c.contacto ? 'Atención: ' + c.contacto : '', c.email] };
}
function partes(D, cols, x = D.M, w = D.cw) {
  const gap = 24, cwid = (w - gap) / 2;
  const prep = cols.map(p => ({ ...p, ls: (p.lineas || []).filter(Boolean).flatMap(l => D.wrap(l, D.F.r, 9, cwid)) }));
  const alto = Math.max(...prep.map(p => 30 + p.ls.length * 12.5));
  D.need(alto + 10);
  const top = D.y;
  prep.forEach((p, i) => {
    const cx = x + i * (cwid + gap); let yy = top - 14;
    D.text(p.titulo, cx, yy, D.F.s, 7.5, COL.muted); yy -= 15;
    D.text(p.nombre, cx, yy, D.F.s, 10.5, COL.ink);
    p.ls.forEach(l => { yy -= 12.5; D.text(l, cx, yy, D.F.r, 9, COL.soft); });
  });
  D.y = top - alto;
}

/* Pie: el mismo bloque que cierra los emails, con Delight e Inter.
   Isologo · weareandale.com · contacto · redes · leyenda (con el corazón dibujado).
   Va una sola vez, al final del documento y apoyado abajo; las demás páginas solo llevan el número. */
const HEART = 'M5,8.6 C5,8.6 0,5.4 0,2.6 C0,1.1 1.1,0 2.5,0 C3.6,0 4.5,0.7 5,1.5 C5.5,0.7 6.4,0 7.5,0 C8.9,0 10,1.1 10,2.6 C10,5.4 5,8.6 5,8.6 Z';
const GRIS_PIE = hex('#6B6B6B'), GRIS_LEYENDA = hex('#A3A3A3');
function textoConCorazon(D, t, x, y, f, s, color) {
  const trozos = String(t).replace(/️/g, '').split(/❤|♥/);
  trozos.forEach((p, i) => {
    if (p) { D.text(p, x, y, f, s, color); x += D.wid(p, f, s); }
    if (i < trozos.length - 1) { const hs = s * 1.05; D.page.drawSvgPath(HEART, { x: x + 1, y: y + hs * 0.82, scale: hs / 10, color: hex('#E8322F') }); x += hs + 2; }
  });
}
function lineaLinks(D, items, x, y, f, s, color) {
  const sep = '  ·  ';
  items.forEach(([t, u], i) => { const w = D.wid(t, f, s); D.text(t, x, y, f, s, color); D.link(x, y - 2, w, s + 3, u); x += w; if (i < items.length - 1) { D.text(sep, x, y, f, s, color); x += D.wid(sep, f, s); } });
}
const PIE_Y = 30, PIE_ALTO = 114; // desde el borde inferior de la hoja
function pieFinal(D, cfg) {
  if (D.y < PIE_Y + PIE_ALTO + 22) D.addPage(); // si no entra con aire, va a una hoja nueva
  const X = D.M; let y = PIE_Y;
  textoConCorazon(D, cfg.pie || 'with ❤ from cordoba | © àndale Strictly Confidential', X, y, D.F.r, 8.5, GRIS_LEYENDA);
  y += 22;
  lineaLinks(D, (cfg.redes || []).map(([t, u]) => [t.charAt(0).toUpperCase() + t.slice(1), u]), X, y, D.F.r, 10, GRIS_PIE);
  y += 15;
  lineaLinks(D, (cfg.contacto || []).filter(([t]) => !t.startsWith('@') && !/^weareandale\.com$/.test(t)), X, y, D.F.r, 10, GRIS_PIE);
  y += 21;
  D.text('weareandale.com', X, y, D.F.d, 15, COL.ink); D.link(X, y - 3, D.wid('weareandale.com', D.F.d, 15), 18, 'https://weareandale.com/');
  y += 19;
  const iw = 46; D.iso(X, y + ISO_VB[1] * iw / ISO_VB[0], iw, COL.ink);
}
const numeroPagina = (D, n, tot) => { if (tot > 1) D.right(n + ' / ' + tot, W - D.M, PIE_Y - 12, D.F.r, 7.5, COL.muted); };
const nuevo = (titulo, margen = 50) => nuevoDoc(titulo, { margen, footH: 30, alPie: numeroPagina });

// Datos de pago en columnas
function cuentasPago(D, cfg, x, w) {
  const cols = (cfg.cuentas || []); if (!cols.length) return;
  const gap = 14, cwid = (w - gap * (cols.length - 1)) / cols.length;
  const alto = Math.max(...cols.map(c => 30 + (c.campos || []).reduce((a, [, v]) => a + 10 + D.wrap(v, D.F.s, 8.5, cwid).length * 10, 0)));
  D.need(alto + 30);
  D.y -= 22; D.text(cfg.tituloPago || 'Cómo pagar', x, D.y, D.F.d, 13, COL.ink); D.y -= 8;
  const top = D.y; let low = top;
  cols.forEach((c, i) => {
    const cx = x + i * (cwid + gap); let yy = top - 14;
    D.text(c.titulo, cx, yy, D.F.s, 10, COL.ink);
    if (c.sub) D.text(c.sub, cx + D.wid(c.titulo, D.F.s, 10) + 5, yy, D.F.r, 7.5, COL.muted);
    yy -= 5;
    for (const [k, v] of c.campos || []) {
      yy -= 10; D.text(k, cx, yy, D.F.r, 7.5, COL.muted);
      for (const l of D.wrap(v, D.F.s, 8.5, cwid)) { yy -= 10; D.text(l, cx, yy, D.F.s, 8.5, COL.ink); }
    }
    low = Math.min(low, yy);
  });
  D.y = Math.min(low, top - alto) - 6;
}

// Fila "Total a abonar" con la cifra a la derecha (y una nota chica en coral debajo del rótulo).
function filaTotal(D, rotulo, cifra, nota) {
  D.y -= 26;
  D.text(rotulo, D.M, D.y + 2, D.F.s, 10, COL.ink);
  if (nota) D.text(nota, D.M, D.y - 11, D.F.s, 8.5, COL.coralInk);
  D.right(cifra, W - D.M, D.y - 2, D.F.d, 22, COL.ink);
  D.y -= nota ? 22 : 16;
}

/* ---------------- resumen de cuenta ---------------- */
/**
 * @param {{cfg:object, numero?:string, emisor?:string, cliente?:object, contacto?:string, cuenta:string, periodo:string, moneda:string,
 *   items:{concepto:string,monto:number}[], total:number, nota?:string, vence?:string, emitido?:string}} r
 */
export async function resumenDoc(r) {
  const cfg = r.cfg || {};
  const D = await nuevo('Resumen-' + (r.numero ? r.numero + '-' : '') + r.cuenta + '-' + r.periodo);
  const { F } = D;
  D.addPage();
  const nota = [cfg.nota, (r.nota || '').trim()].filter(Boolean).join('\n');
  cabecera(D, 'Resumen de cuenta', r.numero ? 'N.º ' + r.numero : '', r.emitido ? 'Emitido ' + r.emitido : '');
  D.y -= 30;
  D.text('Resumen de cuenta · ' + r.periodo, D.M, D.y, F.s, 10, COL.coral);
  D.y -= 30; D.text(r.cuenta, D.M, D.y, F.d, 26, COL.ink);
  D.y -= 20; D.hline(D.y, D.M, W - D.M, COL.line);
  partes(D, [datosCliente({ nombre: r.cuenta, contacto: r.contacto, ...(r.cliente || {}), alias: false }), datosAndale(cfg, r.emisor)]);
  D.y -= 10; D.hline(D.y, D.M, W - D.M, COL.line);
  filaTotal(D, 'Total a abonar', plata(r.total, r.moneda), r.vence ? 'Vence el ' + r.vence : '');
  D.y -= 4;
  D.hline(D.y, D.M, W - D.M, COL.ink, 0.8); D.y -= 15;
  D.text('Concepto', D.M, D.y, F.s, 8.5, COL.muted); D.right('Importe', W - D.M, D.y, F.s, 8.5, COL.muted); D.y -= 7;
  for (const it of r.items) {
    const ls = D.wrap(it.concepto, F.r, 10.5, D.cw - 130); D.need(ls.length * 14 + 12);
    D.hline(D.y, D.M, W - D.M, COL.line); D.y -= 17;
    ls.forEach((l, i) => D.text(l, D.M, D.y - i * 14, F.r, 10.5, COL.ink));
    D.right(plata(it.monto, r.moneda), W - D.M, D.y, F.s, 10.5, COL.ink);
    D.y -= (ls.length - 1) * 14 + 8;
  }
  D.hline(D.y, D.M, W - D.M, COL.ink, 0.8); D.y -= 17;
  D.text('Total', D.M, D.y, F.b, 11, COL.ink); D.right(plata(r.total, r.moneda), W - D.M, D.y, F.b, 11, COL.ink);
  if (nota) { D.y -= 24; const top = D.y + 6; const n = D.wrap(nota, F.r, 9.5, D.cw - 16).length; D.page.drawRectangle({ x: D.M, y: top - n * 14 - 8, width: 2, height: n * 14 + 8, color: COL.coral }); D.y += 4; D.para(nota, D.M + 14, F.r, 9.5, D.cw - 16, COL.soft, 1.47); }
  cuentasPago(D, cfg, D.M, D.cw);
  if (cfg.cierre) { D.y -= 6; D.need(D.wrap(cfg.cierre, F.r, 9.5, D.cw).length * 14); D.para(cfg.cierre, D.M, F.r, 9.5, D.cw, COL.muted); }
  pieFinal(D, cfg);
  return D.save();
}

/* ---------------- propuesta / presupuesto ---------------- */
const lineasDe = v => (Array.isArray(v) ? v : String(v || '').split('\n')).map(x => String(x).trim()).filter(Boolean);
export async function propuestaDoc(p, cfg = {}) {
  const { totalDe, planTexto, venceEl, etapasDe } = await import('./propuesta-vista.js');
  const fecha = d => { if (!d) return ''; const [y, m, dd] = String(d).slice(0, 10).split('-'); return dd + '/' + m + '/' + y; };
  const pre = p.clase === 'Presupuesto', PAL = pre ? 'Presupuesto' : 'Propuesta';
  const D = await nuevo(PAL + ' ' + (p.numero || '') + ' ' + (p.cliente || p.prospecto || ''), 54);
  const { F } = D, c = p.contenido || {}, cur = p.moneda || 'ARS', X = D.M, CW = D.cw;
  D.addPage();
  const cliente = p.cliente || p.prospecto || '';
  const meta2 = fecha(p.fecha) + (p.fecha ? (pre ? ' · válido hasta ' : ' · válida hasta ') + fecha(venceEl(p)) : '');
  cabecera(D, PAL, p.numero ? 'N.º ' + p.numero : '', meta2); D.y -= 56;
  D.text([PAL, p.tipo].filter(Boolean).join(' · '), X, D.y, F.s, 10, COL.coral);
  D.y -= 4; for (const l of D.wrap(p.titulo || PAL, F.d, 30, CW)) { D.y -= 33; D.text(l, X, D.y, F.d, 30, COL.ink); }
  D.y -= 24; D.hline(D.y, X, W - X, COL.line);
  partes(D, [datosCliente({ nombre: cliente, contacto: p.contacto, email: p.email, ...(p.datos_cliente || {}) }), datosAndale(cfg, p.emisor)]);
  D.y -= 14; D.hline(D.y, X, W - X, COL.line); D.y -= 8;
  if (c.intro) { D.y -= 14; for (const par of lineasDe(c.intro)) { D.para(par, X, F.r, 12, CW * 0.86, COL.ink, 1.5); D.y -= 6; } }
  const seccion = t => { D.need(60); D.y -= 24; D.hline(D.y, X, W - X, COL.line); D.y -= 24; D.text(t, X, D.y, F.d, 15, COL.ink); D.y -= 6; };
  const parrafos = v => { for (const par of lineasDe(v)) { D.para(par, X, F.r, 10.5, CW, COL.soft, 1.5); D.y -= 4; } };
  const vinetas = (v, color = COL.soft) => { for (const it of lineasDe(v)) { const ls = D.wrap(it, F.r, 10.5, CW - 14); D.need(ls.length * 15 + 4); ls.forEach((l, i) => { D.y -= 15.5; if (!i) D.page.drawCircle({ x: X + 3, y: D.y + 3.4, size: 2, color: COL.coral }); D.text(l, X + 14, D.y, F.r, 10.5, color); }); D.y -= 2; } };
  if (lineasDe(c.objetivo).length) { seccion('Objetivo'); parrafos(c.objetivo); }
  if (lineasDe(c.alcance).length) { seccion('Alcance'); vinetas(c.alcance); }
  const et = etapasDe(p);
  if (et.length) {
    const sem = et.reduce((a, e) => a + (Number(e.semanas) || 0), 0);
    seccion('Etapas'); if (sem) D.text(sem + ' semanas aprox.', X + D.wid('Etapas', F.d, 15) + 10, D.y + 6, F.r, 9.5, COL.muted);
    et.forEach((e, i) => {
      const det = e.detalle ? D.wrap(e.detalle, F.r, 10, CW - 40) : [];
      D.need(26 + det.length * 14);
      D.y -= 22; D.page.drawCircle({ x: X + 10, y: D.y + 4, size: 10, color: COL.coralSoft });
      const nn = String(i + 1); D.text(nn, X + 10 - D.wid(nn, F.b, 9.5) / 2, D.y + 0.8, F.b, 9.5, COL.coralInk);
      D.text(e.nombre || '', X + 30, D.y, F.s, 11, COL.ink);
      if (e.semanas) D.right(e.semanas + ' sem.', W - X, D.y, F.r, 9.5, COL.muted);
      det.forEach(l => { D.y -= 14; D.text(l, X + 30, D.y, F.r, 10, COL.soft); });
      D.y -= 6;
    });
  }
  if (lineasDe(c.entregables).length) { seccion('Entregables'); vinetas(c.entregables); }
  if (lineasDe(c.no_incluye).length) { seccion('No incluye'); vinetas(c.no_incluye, COL.muted); }
  const items = (p.items || []).filter(i => i.concepto || i.monto);
  seccion(pre ? 'Detalle' : 'Inversión'); D.y -= 4;
  for (const it of items) {
    const det = it.detalle ? D.wrap(it.detalle, F.r, 9.5, CW - 140) : [];
    D.need(22 + det.length * 13);
    D.y -= 18; D.text(it.concepto || '', X, D.y, F.s, 10.5, COL.ink); D.right(plata(it.monto, cur), W - X, D.y, F.s, 10.5, COL.ink);
    det.forEach(l => { D.y -= 13; D.text(l, X, D.y, F.r, 9.5, COL.muted); });
    D.y -= 9; D.hline(D.y, X, W - X, COL.line);
  }
  if (Number(p.descuento)) { D.y -= 18; D.text('Descuento', X, D.y, F.r, 10.5, COL.muted); D.right('− ' + plata(p.descuento, cur), W - X, D.y, F.s, 10.5, COL.muted); D.y -= 9; D.hline(D.y, X, W - X, COL.line); }
  D.need(70);
  D.y -= 34; D.text('Total', X, D.y, F.s, 11, COL.ink); D.right(plata(totalDe(p), cur), W - X, D.y - 1, F.d, 20, COL.ink); D.y -= 18;
  const plan = planTexto(p); if (plan) { D.y -= 6; D.para('Forma de pago: ' + plan, X, F.r, 10, CW, COL.soft); }
  if (lineasDe(c.condiciones).length) { seccion('Condiciones'); parrafos(c.condiciones); }
  pieFinal(D, cfg);
  return D.save();
}

/* ---------------- comprobante de pago (sueldos, honorarios y proveedores) ---------------- */
/**
 * @param {{cfg?:object, numero?:string, periodo:string, emitido?:string, nombre:string, detalle?:string, cuit?:string, email?:string,
 *   items:{tipo?:string,concepto:string,monto:number,moneda:string,pagado?:boolean}[], pagos?:{fecha:string,caja?:string,monto:number,moneda:string}[],
 *   destino?:[string,string][]}} r
 */
export async function reciboDoc(r) {
  const cfg = r.cfg || {};
  const D = await nuevo('Comprobante-' + (r.numero ? r.numero + '-' : '') + r.nombre + '-' + r.periodo);
  const { F } = D, X = D.M, CW = D.cw;
  D.addPage();
  const totales = {}; r.items.forEach(i => { totales[i.moneda] = (totales[i.moneda] || 0) + (Number(i.monto) || 0); });
  const totTxt = Object.entries(totales).map(([m, v]) => plata(v, m)).join('  +  ');
  const pagado = r.items.length && r.items.every(i => i.pagado);
  cabecera(D, 'Comprobante de pago', r.numero ? 'N.º ' + r.numero : '', r.emitido ? 'Emitido ' + r.emitido : ''); D.y -= 30;
  D.text('Comprobante de pago · ' + r.periodo, X, D.y, F.s, 10, COL.coral);
  D.y -= 30; D.text(r.nombre, X, D.y, F.d, 26, COL.ink);
  D.y -= 20; D.hline(D.y, X, W - X, COL.line);
  partes(D, [datosCliente({ titulo: 'A favor de', alias: false, nombre: r.nombre, cuit: r.cuit, condicion_iva: r.detalle, email: r.email }), datosAndale(cfg, null)]);
  D.y -= 10; D.hline(D.y, X, W - X, COL.line);
  filaTotal(D, pagado ? 'Total pagado' : 'Total a pagar', totTxt, pagado && r.pagos && r.pagos.length ? 'Pagado el ' + r.pagos.map(p => p.fecha).join(', ') : '');
  D.y -= 4;
  D.hline(D.y, X, W - X, COL.ink, 0.8); D.y -= 15;
  D.text('Concepto', X, D.y, F.s, 8.5, COL.muted); D.right('Importe', W - X, D.y, F.s, 8.5, COL.muted); D.y -= 7;
  for (const it of r.items) {
    const ls = D.wrap(it.concepto, F.r, 10.5, CW - 190); D.need(ls.length * 14 + 12);
    D.hline(D.y, X, W - X, COL.line); D.y -= 17;
    if (it.tipo) D.text(it.tipo, X, D.y, F.s, 8.5, COL.muted);
    ls.forEach((l, i) => D.text(l, X + 80, D.y - i * 14, F.r, 10.5, COL.ink));
    D.right(plata(it.monto, it.moneda), W - X, D.y, F.s, 10.5, COL.ink);
    D.y -= (ls.length - 1) * 14 + 8;
  }
  D.hline(D.y, X, W - X, COL.ink, 0.8); D.y -= 17;
  D.text('Total', X, D.y, F.b, 11, COL.ink); D.right(totTxt, W - X, D.y, F.b, 11, COL.ink);
  if (r.pagos && r.pagos.length) {
    D.need(40 + r.pagos.length * 16); D.y -= 30; D.text('Pagos', X, D.y, F.d, 13, COL.ink); D.y -= 4;
    r.pagos.forEach(p => { D.y -= 16; D.text(p.fecha, X, D.y, F.r, 9.5, COL.soft); D.text(p.caja || '', X + 80, D.y, F.r, 9.5, COL.soft); D.right(plata(p.monto, p.moneda), W - X, D.y, F.s, 9.5, COL.ink); });
  }
  const dest = (r.destino || []).filter(([, v]) => v);
  if (dest.length) {
    D.need(40 + dest.length * 22); D.y -= 30; D.text('Cuenta de destino', X, D.y, F.d, 13, COL.ink); D.y -= 4;
    dest.forEach(([k, v]) => { D.y -= 12; D.text(k, X, D.y, F.r, 7.5, COL.muted); D.y -= 11; D.text(v, X, D.y, F.s, 9, COL.ink); });
  }
  D.y -= 26; D.need(16);
  D.para('Comprobante interno de àndale. No reemplaza la factura del proveedor ni el recibo de sueldo legal.', X, F.r, 8.5, CW, COL.muted);
  pieFinal(D, cfg);
  return D.save();
}

/* ---------------- invoice (clientes del exterior, en inglés) ---------------- */
// En Argentina las facturas se hacen en ARCA; esto es el invoice comercial que piden afuera (no es un comprobante fiscal argentino).
export function money(n, moneda) {
  try { return clean(new Intl.NumberFormat('en-US', { style: 'currency', currency: moneda || 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)); }
  catch (e) { return (moneda || '') + ' ' + n; }
}
const fechaEn = d => { if (!d) return ''; const [y, m, dd] = String(d).slice(0, 10).split('-'); return new Date(+y, +m - 1, +dd).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); };
/**
 * @param {{cfg:object, numero:string, fecha:string, vence?:string, emisor?:string, moneda:string, cliente:object,
 *   items:{concepto:string,monto:number}[], total:number, nota?:string, pago?:string}} r
 */
export async function invoiceDoc(r) {
  const cfg = r.cfg || {}, c = r.cliente || {};
  const D = await nuevo('Invoice-' + (r.numero || '') + '-' + (c.nombre || ''));
  const { F } = D, X = D.M;
  D.addPage();
  cabecera(D, 'Invoice', r.numero ? 'No. ' + r.numero : '', r.fecha ? 'Issued ' + fechaEn(r.fecha) : '');
  D.y -= 30;
  D.text('INVOICE' + (r.vence ? '  ·  DUE ' + fechaEn(r.vence).toUpperCase() : ''), X, D.y, F.s, 10, COL.coral);
  D.y -= 30; D.text(c.razon_social || c.nombre || '', X, D.y, F.d, 26, COL.ink);
  D.y -= 20; D.hline(D.y, X, W - X, COL.line);
  const e = r.emisor ? ((cfg.emisores || {})[r.emisor] || {}) : {};
  const contacto = (cfg.contacto || []).filter(([t]) => !t.startsWith('@') && !/^weareandale\.com$/.test(t)).map(([t]) => t);
  partes(D, [
    { titulo: 'Bill to', nombre: c.razon_social || c.nombre || '', lineas: [c.razon_social && c.nombre && c.razon_social !== c.nombre ? c.nombre : '', c.domicilio, c.cuit ? 'Tax ID ' + c.cuit : '', c.contacto ? 'Attn: ' + c.contacto : '', c.email] },
    { titulo: 'From', nombre: 'àndale', lineas: [r.emisor ? [e.nombre || NOMBRES_EMISOR[r.emisor] || r.emisor, e.cuit ? 'Tax ID (CUIT) ' + fmtCuit(e.cuit) : ''].filter(Boolean).join(' · ') : '', 'Córdoba, Argentina', contacto.join(' · '), 'weareandale.com'] },
  ]);
  D.y -= 10; D.hline(D.y, X, W - X, COL.line);
  // Total destacado (Inter: tiene € y £)
  D.y -= 26; D.text('Amount due', X, D.y + 2, F.s, 10, COL.ink);
  if (r.vence) D.text('Due ' + fechaEn(r.vence), X, D.y - 11, F.s, 8.5, COL.coralInk);
  D.right(money(r.total, r.moneda), W - X, D.y - 2, F.b, 20, COL.ink);
  D.y -= r.vence ? 22 : 16; D.y -= 4;
  D.hline(D.y, X, W - X, COL.ink, 0.8); D.y -= 15;
  D.text('Description', X, D.y, F.s, 8.5, COL.muted); D.right('Amount', W - X, D.y, F.s, 8.5, COL.muted); D.y -= 7;
  for (const it of r.items) {
    const ls = D.wrap(it.concepto, F.r, 10.5, D.cw - 130); D.need(ls.length * 14 + 12);
    D.hline(D.y, X, W - X, COL.line); D.y -= 17;
    ls.forEach((l, i) => D.text(l, X, D.y - i * 14, F.r, 10.5, COL.ink));
    D.right(money(it.monto, r.moneda), W - X, D.y, F.s, 10.5, COL.ink);
    D.y -= (ls.length - 1) * 14 + 8;
  }
  D.hline(D.y, X, W - X, COL.ink, 0.8); D.y -= 17;
  D.text('Total ' + (r.moneda || ''), X, D.y, F.b, 11, COL.ink); D.right(money(r.total, r.moneda), W - X, D.y, F.b, 11, COL.ink);
  const nota = (r.nota || '').trim();
  if (nota) { D.y -= 24; const top = D.y + 6; const n = D.wrap(nota, F.r, 9.5, D.cw - 16).length; D.page.drawRectangle({ x: X, y: top - n * 14 - 8, width: 2, height: n * 14 + 8, color: COL.coral }); D.y += 4; D.para(nota, X + 14, F.r, 9.5, D.cw - 16, COL.soft, 1.47); }
  // Cómo pagar: texto propio del invoice o las cuentas del exterior de Ajustes.
  const pago = (r.pago || '').trim();
  if (pago) { D.need(60); D.y -= 30; D.text('Payment instructions', X, D.y, F.d, 13, COL.ink); D.y -= 8; D.para(pago, X, F.r, 9.5, D.cw, COL.soft, 1.5); }
  else {
    const todas = cfg.cuentas || [], ext = todas.length > 1 ? todas.slice(1) : todas;
    const porMoneda = ext.filter(k => new RegExp('\\b' + (r.moneda || 'USD') + '\\b', 'i').test((k.titulo || '') + ' ' + (k.sub || '')));
    const cs = porMoneda.length ? porMoneda : ext;
    const EN = { 'Nombre del banco': 'Bank name', 'Dirección del banco': 'Bank address', 'Enrutamiento de ABA': 'ABA routing number', 'Número de cuenta': 'Account number', 'Tipo de cuenta': 'Account type', 'Nombre del beneficiario': 'Beneficiary', 'Titular': 'Account holder', 'Banco': 'Bank', 'Alias': 'Alias', 'EEUU': 'USA', 'Europa': 'Europe', 'Reino Unido': 'United Kingdom', 'solo cuentas Empresa': 'business accounts only', 'Dirección': 'Address' };
    const tr = t => EN[String(t || '').trim()] || t;
    if (cs.length) cuentasPago(D, { cuentas: cs.map(k => ({ ...k, titulo: tr(k.titulo), sub: tr(k.sub), campos: (k.campos || []).map(([a, b]) => [tr(a), b]) })), tituloPago: 'Payment instructions' }, X, D.cw);
  }
  D.y -= 26; D.need(16);
  D.para('Commercial invoice for services rendered from Argentina (export of services). Please include the invoice number in your payment reference.', X, F.r, 8.5, D.cw, COL.muted);
  pieFinal(D, cfg);
  return D.save();
}

/** Abre un PDF en una pestaña nueva (o lo descarga si el navegador bloquea la ventana). */
export function abrirPdf(bytes, nombre, ventana) {
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  if (ventana && !ventana.closed) { ventana.location.href = url; return; }
  const a = document.createElement('a'); a.href = url; a.download = nombre + '.pdf'; document.body.appendChild(a); a.click(); a.remove();
}
export function bytesBase64(bytes) {
  let s = ''; const step = 0x8000;
  for (let i = 0; i < bytes.length; i += step) s += String.fromCharCode.apply(null, bytes.subarray(i, i + step));
  return btoa(s);
}

/* ---------------- informe de redes (PDF a color, para descargar desde la app o el portal) ---------------- */
// i = { cliente, mesLabel, inf: { datos, texto }, piezas, cfg }
export async function informeDoc(i) {
  const { PALETA, variacion, corto, porRed, porFormato } = await import('./informe-vista.js');
  const inf = i.inf || {}, d = inf.datos || {};
  const met = (d.metricas || []).filter(x => x && x.nombre && String(x.nombre).trim());
  const dst = (d.destacadas || []).filter(x => x && x.titulo && String(x.titulo).trim()), rec = (d.recomendaciones || []).filter(Boolean);
  const D = await nuevo('Informe de redes ' + i.mesLabel + ' ' + i.cliente);
  const { F } = D, M = D.M, CW = D.cw, WHITE = rgb(1, 1, 1);
  const mix = (h, k) => { const c = [1, 3, 5].map(j => parseInt(h.slice(j, j + 2), 16) / 255); return rgb(...c.map(v => v * k + (1 - k))); };
  const dark = (h, k) => { const c = [1, 3, 5].map(j => parseInt(h.slice(j, j + 2), 16) / 255); return rgb(...c.map(v => v * k)); };
  const UP = hex('#0B86C4'), DOWN = hex('#D97A00'), PREV = hex('#E4E6EC');
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  D.addPage();
  // Encabezado y pie de todos los documentos de àndale; el color va en el contenido.
  cabecera(D, 'Informe de redes', cap(i.mesLabel), i.emitido ? 'Emitido ' + i.emitido : '');
  D.y -= 30;
  D.text('Informe de redes · ' + cap(i.mesLabel), M, D.y, F.s, 10, hex('#0B86C4'));
  D.y -= 30; D.text(i.cliente || '', M, D.y, F.d, 26, COL.ink);
  const conAnt = met.filter(x => variacion(x) != null), sub = conAnt.filter(x => variacion(x) > 0).length;
  if (conAnt.length) { D.y -= 24; const t = sub + ' de ' + conAnt.length + ' métricas crecieron contra el mes anterior', w = D.wid(t, F.s, 9) + 20; D.rect(M, D.y - 5, w, 18, mix('#1CB0F6', 0.15), 9); D.text(t, M + 10, D.y + 1, F.s, 9, hex('#0B86C4')); }
  D.y -= 18; D.hline(D.y, M, W - M, COL.line); D.y -= 18;
  const titulo = (t, extra) => { D.need(40); D.y -= 18; D.text(t, M, D.y, F.b, 12.5, COL.ink); if (extra) D.text(extra, M + D.wid(t, F.b, 12.5) + 8, D.y, F.s, 9.5, COL.muted); D.y -= 12; };
  // Números
  if (met.length) {
    const cols = 3, gap = 10, tw = (CW - gap * (cols - 1)) / cols, th = 84;
    for (let r = 0; r < Math.ceil(met.length / cols); r++) {
      D.need(th + gap); const top = D.y;
      met.slice(r * cols, r * cols + cols).forEach((x, k) => {
        const idx = r * cols + k, c = PALETA[idx % PALETA.length], xx = M + k * (tw + gap), v = variacion(x);
        D.rect(xx, top - th, tw, th, mix(c, 0.14), 12);
        D.text(x.nombre, xx + 14, top - 20, F.s, 9.5, dark(c, 0.6));
        if (x.red) { const rw = D.wid(x.red, F.r, 7.5) + 10, rx = xx + 14 + D.wid(x.nombre, F.s, 9.5) + 6; if (rx + rw < xx + tw - 8) { D.rect(rx, top - 23, rw, 12, mix(c, 0.28), 6); D.text(x.red, rx + 5, top - 19.5, F.r, 7.5, dark(c, 0.55)); } }
        { const t = corto(x.valor), fs = Math.min(24, 24 * (tw - 28) / Math.max(1, D.wid(t, F.d, 24))); D.text(t, xx + 14, top - 50, F.d, fs, COL.ink); }
        if (v != null) { const t = (v > 0 ? '+' : '') + v + '%', w = D.wid(t, F.b, 9); D.rect(xx + 14, top - 72, w + 14, 15, WHITE, 7.5); D.text(t, xx + 21, top - 67, F.b, 9, v > 0 ? UP : v < 0 ? DOWN : COL.muted); D.text('vs. ' + corto(x.anterior), xx + 34 + w, top - 67, F.r, 8.5, COL.muted); }
        else D.text('primer mes medido', xx + 14, top - 67, F.r, 8.5, COL.muted);
      });
      D.y = top - th - gap;
    }
  }
  // Este mes vs. el anterior
  const comp = met.filter(x => x.anterior != null && x.anterior !== '' && x.valor != null);
  if (comp.length) {
    titulo('Este mes vs. el anterior');
    const bw = CW - 70;
    D.need(14); D.rect(M, D.y - 2, 8, 8, PREV, 2); D.text('Mes anterior', M + 12, D.y - 1, F.r, 8.5, COL.muted); [0, 1, 2].forEach(k => D.rect(M + 80 + k * 5, D.y - 2, 5, 8, hex(PALETA[k]), 0)); D.text('Este mes', M + 100, D.y - 1, F.r, 8.5, COL.muted); D.y -= 10;
    comp.forEach(x => {
      D.need(44); const c = PALETA[met.indexOf(x) % PALETA.length], mx = Math.max(+x.valor, +x.anterior) || 1, v = variacion(x);
      D.y -= 14; D.text(x.nombre + (x.red ? ' · ' + x.red : ''), M, D.y, F.s, 9.5, COL.ink);
      if (v != null) D.right((v > 0 ? '+' : '') + v + '%', M + CW, D.y, F.b, 9.5, v >= 0 ? UP : DOWN);
      D.y -= 12; const w1 = Math.max(4, x.anterior / mx * bw); D.rect(M, D.y, w1, 6, PREV, 3); D.text(corto(x.anterior), M + w1 + 6, D.y, F.r, 8, COL.muted);
      D.y -= 13; const w2 = Math.max(4, x.valor / mx * bw); D.rect(M, D.y, w2, 9, hex(c), 4.5); D.text(corto(x.valor), M + w2 + 6, D.y + 1, F.s, 8.5, COL.ink);
      D.y -= 4;
    });
  }
  // Por red y por formato, lado a lado
  const red = porRed(met), fmts = porFormato(i.piezas);
  if (red || fmts.length) {
    const alto = 140; D.need(alto + 34); D.y -= 14;
    const top = D.y, half = (CW - 12) / 2, two = red && fmts.length;
    let x0 = M;
    if (red) {
      const w = two ? half : CW; D.rect(x0, top - alto, w, alto, COL.paper, 12);
      D.text(red.nombre + ' por red', x0 + 14, top - 20, F.b, 10.5, COL.ink);
      const tot = red.filas.reduce((s, f) => s + f.valor, 0) || 1, cx = x0 + 62, cy = top - 82, R = 40, r = 25;
      let a0 = -Math.PI / 2;
      red.filas.forEach((f, k) => {
        const a1 = a0 + f.valor / tot * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0, P = (rr, a) => (rr * Math.cos(a)).toFixed(2) + ' ' + (rr * Math.sin(a)).toFixed(2);
        D.page.drawSvgPath('M' + P(R, a0) + ' A' + R + ' ' + R + ' 0 ' + big + ' 1 ' + P(R, a1) + ' L' + P(r, a1) + ' A' + r + ' ' + r + ' 0 ' + big + ' 0 ' + P(r, a0) + 'Z', { x: cx, y: cy, color: hex(PALETA[k % PALETA.length]) });
        a0 = a1;
      });
      const t = corto(tot); D.text(t, cx - D.wid(t, F.b, 10) / 2, cy - 4, F.b, 10, COL.ink);
      red.filas.forEach((f, k) => { const ly = top - 50 - k * 18; D.page.drawCircle({ x: x0 + 124, y: ly + 3, size: 4, color: hex(PALETA[k % PALETA.length]) }); D.text(f.red, x0 + 134, ly, F.s, 9.5, COL.ink); D.right(Math.round(f.valor / tot * 100) + '%', Math.min(x0 + w - 14, x0 + 290), ly, F.s, 9.5, COL.muted); });
      x0 += half + 12;
    }
    if (fmts.length) {
      const w = two ? half : CW, mx = Math.max(...fmts.map(f => f[1])), tot = fmts.reduce((s, f) => s + f[1], 0);
      D.rect(x0, top - alto, w, alto, COL.paper, 12);
      D.text('Lo que publicamos', x0 + 14, top - 20, F.b, 10.5, COL.ink); D.right(tot + ' piezas', x0 + w - 14, top - 20, F.s, 9, COL.muted);
      const lab = 92, bw = w - lab - 54;
      fmts.slice(0, 5).forEach(([f, n], k) => { const ly = top - 46 - k * 19; D.text(D.wrap(f, F.s, 9, lab - 6)[0], x0 + 14, ly, F.s, 9, COL.ink); const bwi = Math.max(4, n / mx * bw); D.rect(x0 + 14 + lab, ly - 1, bwi, 9, hex(PALETA[(k + 3) % PALETA.length]), 4.5); D.text(String(n), x0 + 20 + lab + bwi, ly, F.s, 8.5, COL.muted); });
    }
    D.y = top - alto - 4;
  }
  // Texto
  if (inf.texto) { titulo('Cómo fue el mes'); String(inf.texto).split(/\n\s*\n/).forEach(p => { D.para(p, M, F.r, 10.5, CW, COL.soft, 1.55); D.y -= 8; }); }
  // Lo que mejor funcionó
  if (dst.length) {
    titulo('Lo que mejor funcionó');
    dst.forEach((x, k) => {
      const c = PALETA[(k * 3 + 1) % PALETA.length], tl = D.wrap(x.titulo, F.b, 10.5, CW - 60), pl = x.por_que ? D.wrap(x.por_que, F.r, 9.5, CW - 60) : [];
      const h = 22 + tl.length * 14 + pl.length * 13.5; D.need(h + 8); const top = D.y;
      D.rect(M, top - h, CW, h, mix(c, 0.12), 12);
      D.page.drawCircle({ x: M + 24, y: top - 22, size: 11, color: hex(c) }); const n = String(k + 1); D.text(n, M + 24 - D.wid(n, F.b, 10) / 2, top - 25.5, F.b, 10, WHITE);
      let y = top - 26; tl.forEach(l => { D.text(l, M + 46, y, F.b, 10.5, COL.ink); y -= 14; }); pl.forEach(l => { D.text(l, M + 46, y, F.r, 9.5, COL.soft); y -= 13.5; });
      D.y = top - h - 8;
    });
  }
  // Para el mes que viene
  if (rec.length) {
    titulo('Para el mes que viene');
    rec.forEach((x, k) => {
      const c = PALETA[(k + 2) % PALETA.length], ls = D.wrap(x, F.r, 10, CW - 52), h = 16 + ls.length * 14; D.need(h + 6); const top = D.y;
      D.rect(M, top - h, CW, h, mix(c, 0.11), 10); D.rect(M + 10, top - 8 - 16, 16, 16, hex(c), 5); D.text('>', M + 15, top - 20, F.b, 10, WHITE);
      let y = top - 19; ls.forEach(l => { D.text(l, M + 36, y, F.r, 10, COL.ink); y -= 14; });
      D.y = top - h - 6;
    });
  }
  pieFinal(D, i.cfg || {});
  return D.save();
}
