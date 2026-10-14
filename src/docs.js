// Documentos de àndale (PDF vectorial en el navegador, Delight + Inter embebidas).
// Un motor con primitivas comunes y tres estilos: 'editorial', 'banda', 'grilla'.
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

/* ---------------- piezas por estilo ---------------- */
// Encabezado editorial: el chancho (isologo) + logotipo, y dos líneas de datos a la derecha.
function cabeceraEditorial(D, l1, l2) {
  const top = D.y + 8, iw = 42, ih = ISO_VB[1] * iw / ISO_VB[0];
  D.iso(D.M, top, iw, COL.ink);
  const lw = 76, lh = LOGO_VB[1] * lw / LOGO_VB[0];
  D.logo(D.M + iw + 12, top - (ih - lh) / 2 - 1, lw, COL.ink);
  const mid = top - ih / 2;
  D.right(l1, W - D.M, mid + 2, D.F.s, 9, COL.ink);
  if (l2) D.right(l2, W - D.M, mid - 10, D.F.r, 8.5, COL.muted);
  D.y = top - ih;
}
const TEMAS = ['editorial', 'banda', 'grilla'];
export const ESTILOS = { editorial: 'Editorial', banda: 'Banda de marca', grilla: 'Grilla' };

function pieEditorial(D, cfg, n, tot) {
  const y = D.M - 6;
  D.hline(y + 26, D.M, W - D.M, COL.line);
  D.text('weareandale.com', D.M, y + 5, D.F.s, 8.5, COL.ink);
  D.link(D.M, y + 2, D.wid('weareandale.com', D.F.s, 8.5), 11, 'https://weareandale.com/');
  const contacto = (cfg.contacto || []).filter(c => !/weareandale\.com\/?$/.test(c[1] || '')).slice(0, 3).map(c => c[0]).join('   ');
  D.right(contacto, W - D.M, y + 5, D.F.r, 8.5, COL.muted);
  if (tot > 1) D.right(n + ' / ' + tot, W - D.M, y - 9, D.F.r, 7.5, COL.muted);
}
function pieBanda(D, cfg, n, tot) {
  D.rect(0, 0, W, 4, COL.coral);
  const y = D.M - 10;
  const lw = 52; D.logo((W - lw) / 2, y + 22, lw, COL.ink);
  const t = (cfg.redes || []).map(r => r[0]).join('  ·  ');
  D.text(t, (W - D.wid(t, D.F.r, 8)) / 2, y, D.F.r, 8, COL.muted);
  if (tot > 1) D.right(n + ' / ' + tot, W - D.M, y, D.F.r, 7.5, COL.muted);
}
function pieGrilla(D, cfg, n, tot, col) {
  const y = D.M - 4;
  D.hline(y + 22, D.M, W - D.M, COL.ink, 0.6);
  D.logo(D.M, y + 13, 48, COL.ink);
  const xs = D.M + col + 18;
  const cont = (cfg.contacto || []).slice(0, 3).map(c => c[0]).join('   ');
  D.text(cont, xs, y + 4, D.F.r, 8, COL.soft);
  if (tot > 1) D.right(n + ' / ' + tot, W - D.M, y + 4, D.F.r, 7.5, COL.muted);
}

// Datos de pago en columnas
function cuentasPago(D, cfg, x, w, tema) {
  const cols = (cfg.cuentas || []); if (!cols.length) return;
  const gap = 14, cwid = (w - gap * (cols.length - 1)) / cols.length;
  // alto previo para no cortar
  const alto = Math.max(...cols.map(c => 34 + (c.campos || []).reduce((a, [, v]) => a + 11 + D.wrap(v, D.F.r, 8.5, cwid - (tema === 'banda' ? 20 : 0)).length * 10.5, 0)));
  D.need(alto + 34);
  if (tema === 'editorial') { D.y -= 26; D.text('Cómo pagar', x, D.y, D.F.d, 13, COL.ink); D.y -= 10; }
  else if (tema === 'banda') { D.y -= 24; D.text('Datos para el pago', x, D.y, D.F.d, 13, COL.coralInk); D.y -= 12; }
  const top = D.y;
  let low = top;
  cols.forEach((c, i) => {
    const cx = x + i * (cwid + gap);
    if (tema === 'banda') D.rect(cx, top - alto - 4, cwid, alto + 4, COL.paper, 6);
    const px = tema === 'banda' ? cx + 10 : cx;
    let yy = top - (tema === 'banda' ? 18 : 14);
    D.text(c.titulo, px, yy, D.F.s, 10, COL.ink);
    if (c.sub) D.text(c.sub, px + D.wid(c.titulo, D.F.s, 10) + 5, yy, D.F.r, 7.5, COL.muted);
    yy -= 6;
    for (const [k, v] of c.campos || []) {
      yy -= 11; D.text(k, px, yy, D.F.r, 7.5, COL.muted);
      for (const l of D.wrap(v, D.F.s, 8.5, cwid - (tema === 'banda' ? 20 : 0))) { yy -= 10.5; D.text(l, px, yy, D.F.s, 8.5, COL.ink); }
    }
    low = Math.min(low, yy);
  });
  D.y = Math.min(low, top - alto) - 8;
}

/* ---------------- resumen de cuenta ---------------- */
/**
 * @param {{cfg:object, estilo?:string, contacto?:string, cuenta:string, periodo:string, moneda:string, items:{concepto:string,monto:number}[], total:number, nota?:string, vence?:string, emitido?:string}} r
 */
export async function resumenDoc(r) {
  const cfg = r.cfg || {}, tema = TEMAS.includes(r.estilo) ? r.estilo : (TEMAS.includes(cfg.estilo) ? cfg.estilo : 'editorial');
  const col = 150; // ancho de la columna izquierda en 'grilla'
  const D = await nuevoDoc('Resumen-' + r.cuenta + '-' + r.periodo, { margen: tema === 'grilla' ? 46 : 50, footH: 54, alPie: (D, n, t) => (tema === 'editorial' ? pieEditorial : tema === 'banda' ? pieBanda : (d, c, a, b) => pieGrilla(d, c, a, b, col))(D, cfg, n, t) });
  const { F } = D;
  D.addPage();
  const nota = [cfg.nota, (r.nota || '').trim()].filter(Boolean).join('\n');
  const vence = r.vence || '';

  if (tema === 'editorial') {
    cabeceraEditorial(D, 'Resumen de cuenta', r.emitido ? 'Emitido ' + r.emitido : '');
    D.y -= 50;
    D.text('Resumen de cuenta · ' + r.periodo, D.M, D.y, F.s, 10, COL.coral);
    D.y -= 34; D.text(r.cuenta, D.M, D.y, F.d, 30, COL.ink);
    if (r.contacto) { D.y -= 18; D.text('Para ' + r.contacto, D.M, D.y, F.r, 10.5, COL.muted); }
    D.y -= 40; D.text('Total a abonar', D.M, D.y, F.r, 9.5, COL.muted);
    D.y -= 42; D.text(plata(r.total, r.moneda), D.M - 1.5, D.y, F.d, 42, COL.ink);
    if (vence) { D.y -= 18; D.text('Vence el ' + vence, D.M, D.y, F.s, 9.5, COL.coralInk); }
    D.y -= 34;
    D.hline(D.y, D.M, W - D.M, COL.ink, 0.8); D.y -= 15;
    D.text('Concepto', D.M, D.y, F.s, 8.5, COL.muted); D.right('Importe', W - D.M, D.y, F.s, 8.5, COL.muted); D.y -= 8;
    for (const it of r.items) {
      const ls = D.wrap(it.concepto, F.r, 10.5, D.cw - 130); D.need(ls.length * 14 + 14);
      D.hline(D.y, D.M, W - D.M, COL.line); D.y -= 18;
      ls.forEach((l, i) => D.text(l, D.M, D.y - i * 14, F.r, 10.5, COL.ink));
      D.right(plata(it.monto, r.moneda), W - D.M, D.y, F.s, 10.5, COL.ink);
      D.y -= (ls.length - 1) * 14 + 8;
    }
    D.hline(D.y, D.M, W - D.M, COL.ink, 0.8); D.y -= 18;
    D.text('Total', D.M, D.y, F.b, 11, COL.ink); D.right(plata(r.total, r.moneda), W - D.M, D.y, F.b, 11, COL.ink);
    if (nota) { D.y -= 30; const top = D.y + 6; const n = D.wrap(nota, F.r, 9.5, D.cw - 16).length; D.page.drawRectangle({ x: D.M, y: top - n * 14 - 8, width: 2, height: n * 14 + 8, color: COL.coral }); D.y += 4; D.para(nota, D.M + 14, F.r, 9.5, D.cw - 16, COL.soft, 1.47); }
    cuentasPago(D, cfg, D.M, D.cw, tema);
    if (cfg.cierre) { D.y -= 8; D.need(D.wrap(cfg.cierre, F.r, 9.5, D.cw).length * 14); D.para(cfg.cierre, D.M, F.r, 9.5, D.cw, COL.muted); }
  }

  if (tema === 'banda') {
    const bh = 176; D.rect(0, H - bh, W, bh, COL.coral);
    D.logo(D.M, H - 40, 70, COL.white);
    D.right('Emitido ' + (r.emitido || ''), W - D.M, H - 50, F.r, 8.5, COL.white);
    D.text('Resumen de cuenta', D.M, H - 112, F.d, 30, COL.white);
    D.text(r.periodo, D.M, H - 136, F.s, 12, COL.white);
    D.y = H - bh - 26;
    const cells = [['Cliente', r.cuenta], ['Contacto', r.contacto || '—'], ['Vencimiento', vence || '—']];
    const cwid = D.cw / 3;
    cells.forEach(([k, v], i) => { D.text(k, D.M + i * cwid, D.y, F.r, 8.5, COL.muted); D.text(v, D.M + i * cwid, D.y - 15, F.s, 11, COL.ink); });
    D.y -= 44;
    D.text('Detalle', D.M, D.y, F.d, 13, COL.coralInk); D.y -= 8;
    r.items.forEach((it, i) => {
      const ls = D.wrap(it.concepto, F.r, 10.5, D.cw - 150); const h = ls.length * 14 + 14; D.need(h);
      if (i % 2 === 0) D.rect(D.M - 8, D.y - h, D.cw + 16, h, COL.coralSoft, 4);
      D.y -= 18; ls.forEach((l, j) => D.text(l, D.M, D.y - j * 14, F.r, 10.5, COL.ink));
      D.right(plata(it.monto, r.moneda), W - D.M, D.y, F.s, 10.5, COL.ink); D.y -= (ls.length - 1) * 14 + 10;
    });
    D.y -= 16; const th = 64; D.need(th + 10);
    D.rect(D.M - 8, D.y - th, D.cw + 16, th, COL.ink, 8);
    D.text('Total a abonar', D.M + 10, D.y - 26, F.s, 10, COL.white);
    if (vence) D.text('Vence el ' + vence, D.M + 10, D.y - 42, F.r, 9, COL.white);
    D.right(plata(r.total, r.moneda), W - D.M - 10, D.y - 42, F.d, 28, COL.white);
    D.y -= th + 8;
    if (nota) { D.y -= 10; D.para(nota, D.M, F.r, 9.5, D.cw, COL.soft); }
    cuentasPago(D, cfg, D.M, D.cw, tema);
    if (cfg.cierre) { D.y -= 6; D.para(cfg.cierre, D.M, F.r, 9.5, D.cw, COL.muted); }
  }

  if (tema === 'grilla') {
    const xr = D.M + col + 18, rw = W - D.M - xr;
    D.iso(D.M, D.y + 4, 64, COL.ink);
    const yTop = D.y;
    D.text('Resumen de cuenta', xr, yTop - 22, F.s, 9.5, COL.coral);
    D.text(r.cuenta, xr, yTop - 58, F.d, 34, COL.ink);
    let yl = yTop - 96;
    [['Cliente', r.contacto || r.cuenta], ['Período', r.periodo], ['Emitido', r.emitido || '—'], ['Vence', vence || '—']].forEach(([k, v]) => { D.text(k, D.M, yl, F.r, 8, COL.muted); D.text(v, D.M, yl - 13, F.s, 10, COL.ink); yl -= 34; });
    D.y = yTop - 96;
    D.hline(D.y + 12, xr, W - D.M, COL.ink, 0.8);
    for (const it of r.items) {
      const ls = D.wrap(it.concepto, F.r, 10.5, rw - 120); D.y -= 6;
      ls.forEach((l, i) => D.text(l, xr, D.y - i * 14, F.r, 10.5, COL.ink));
      D.right(plata(it.monto, r.moneda), W - D.M, D.y, F.s, 10.5, COL.ink);
      D.y -= (ls.length - 1) * 14 + 12; D.hline(D.y + 2, xr, W - D.M, COL.line); D.y -= 10;
    }
    D.y -= 18;
    D.text('Total a abonar', xr, D.y, F.r, 9.5, COL.muted);
    D.y -= 36; D.right(plata(r.total, r.moneda), W - D.M, D.y, F.d, 34, COL.ink);
    D.page.drawRectangle({ x: W - D.M - 60, y: D.y - 12, width: 60, height: 3, color: COL.coral });
    D.y -= 40;
    if (nota) { D.para(nota, xr, F.r, 9.5, rw, COL.soft); D.y -= 6; }
    D.vline(D.M + col, yTop - 80, D.M + 70, COL.line);
    // pago en la columna derecha, apilado
    const cols = cfg.cuentas || [];
    if (cols.length) { D.y -= 14; D.text('Cómo pagar', xr, D.y, F.d, 12.5, COL.ink); D.y -= 4;
      const gap = 12, cwid = (rw - gap * (cols.length - 1)) / cols.length, top = D.y; let low = top;
      cols.forEach((c, i) => { const cx = xr + i * (cwid + gap); let yy = top - 16; D.text(c.titulo, cx, yy, F.s, 9.5, COL.ink); yy -= 4;
        for (const [k, v] of c.campos || []) { yy -= 10.5; D.text(k, cx, yy, F.r, 7, COL.muted); for (const l of D.wrap(v, F.s, 7.8, cwid)) { yy -= 9.5; D.text(l, cx, yy, F.s, 7.8, COL.ink); } }
        low = Math.min(low, yy); });
      D.y = low - 10; }
    if (cfg.cierre) { D.y -= 4; D.para(cfg.cierre, xr, F.r, 8.5, rw, COL.muted); }
  }
  return D.save();
}


/* ---------------- propuesta / presupuesto ---------------- */
const lineasDe = v => (Array.isArray(v) ? v : String(v || '').split('\n')).map(x => String(x).trim()).filter(Boolean);
export async function propuestaDoc(p, cfg = {}, estilo) {
  const tema = TEMAS.includes(estilo) ? estilo : (TEMAS.includes(cfg.estilo) ? cfg.estilo : 'editorial');
  const { totalDe, planTexto, venceEl, etapasDe } = await import('./propuesta-vista.js');
  const fecha = d => { if (!d) return ''; const [y, m, dd] = String(d).slice(0, 10).split('-'); return dd + '/' + m + '/' + y; };
  const D = await nuevoDoc('Propuesta ' + (p.numero || '') + ' ' + (p.cliente || p.prospecto || ''), { margen: 54, footH: 56, alPie: (D, n, t) => (tema === 'banda' ? pieBanda : tema === 'grilla' ? (d, c, a, b) => pieGrilla(d, c, a, b, 0) : pieEditorial)(D, cfg, n, t) });
  const { F } = D, c = p.contenido || {}, cur = p.moneda || 'ARS', X = D.M, CW = D.cw;
  D.addPage();
  const cliente = p.cliente || p.prospecto || '';
  if (tema === 'banda') {
    const bh = 210; D.rect(0, H - bh, W, bh, COL.coral);
    D.logo(X, H - 44, 70, COL.white);
    D.right('Propuesta ' + (p.numero || ''), W - X, H - 52, F.s, 9, COL.white);
    D.y = H - 104; D.text(['Propuesta', p.tipo].filter(Boolean).join(' · '), X, D.y, F.s, 10, COL.white);
    D.y -= 6; for (const l of D.wrap(p.titulo || '', F.d, 28, CW)) { D.y -= 31; D.text(l, X, D.y, F.d, 28, COL.white); }
    D.y = H - bh - 30;
  } else {
    const meta2 = fecha(p.fecha) + (p.fecha ? ' · válida hasta ' + fecha(venceEl(p)) : '');
    if (tema === 'grilla') { D.iso(X, D.y + 4, 52, COL.ink); D.right('Propuesta ' + (p.numero || ''), W - X, D.y - 8, F.s, 9, COL.ink); D.right(meta2, W - X, D.y - 20, F.r, 8.5, COL.muted); D.y -= 96; }
    else { cabeceraEditorial(D, 'Propuesta ' + (p.numero || ''), meta2); D.y -= 62; }
    D.text(['Propuesta', p.tipo].filter(Boolean).join(' · '), X, D.y, F.s, 10, COL.coral);
    D.y -= 4; for (const l of D.wrap(p.titulo || 'Propuesta', F.d, 30, CW)) { D.y -= 33; D.text(l, X, D.y, F.d, 30, COL.ink); }
    D.y -= 6;
  }
  if (cliente) { D.y -= 16; D.text('Para ' + cliente + (p.contacto ? ' · ' + p.contacto : ''), X, D.y, F.r, 10.5, COL.muted); }
  if (c.intro) { D.y -= 14; for (const par of lineasDe(c.intro)) { D.para(par, X, F.r, 12, CW * 0.86, COL.ink, 1.5); D.y -= 6; } }
  const seccion = (t) => { D.need(60); D.y -= 24; D.hline(D.y, X, W - X, COL.line); D.y -= 24; D.text(t, X, D.y, F.d, 15, tema === 'banda' ? COL.coralInk : COL.ink); D.y -= 6; };
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
  // Inversión
  const items = (p.items || []).filter(i => i.concepto || i.monto);
  seccion('Inversión'); D.y -= 4;
  for (const it of items) {
    const det = it.detalle ? D.wrap(it.detalle, F.r, 9.5, CW - 140) : [];
    D.need(22 + det.length * 13);
    D.y -= 18; D.text(it.concepto || '', X, D.y, F.s, 10.5, COL.ink); D.right(plata(it.monto, cur), W - X, D.y, F.s, 10.5, COL.ink);
    det.forEach(l => { D.y -= 13; D.text(l, X, D.y, F.r, 9.5, COL.muted); });
    D.y -= 9; D.hline(D.y, X, W - X, COL.line);
  }
  if (Number(p.descuento)) { D.y -= 18; D.text('Descuento', X, D.y, F.r, 10.5, COL.muted); D.right('− ' + plata(p.descuento, cur), W - X, D.y, F.s, 10.5, COL.muted); D.y -= 9; D.hline(D.y, X, W - X, COL.line); }
  D.need(70);
  if (tema === 'banda') { D.y -= 16; D.rect(X - 8, D.y - 54, CW + 16, 54, COL.ink, 8); D.text('Total', X + 10, D.y - 32, F.s, 11, COL.white); D.right(plata(totalDe(p), cur), W - X - 10, D.y - 36, F.d, 26, COL.white); D.y -= 62; }
  else { D.y -= 40; D.text('Total', X, D.y, F.s, 11, COL.ink); D.right(plata(totalDe(p), cur), W - X, D.y - 2, F.d, 30, COL.ink); if (tema === 'grilla') D.page.drawRectangle({ x: W - X - 60, y: D.y - 14, width: 60, height: 3, color: COL.coral }); D.y -= 18; }
  const plan = planTexto(p); if (plan) { D.y -= 6; D.para('Forma de pago: ' + plan, X, F.r, 10, CW, COL.soft); }
  if (lineasDe(c.condiciones).length) { seccion('Condiciones'); parrafos(c.condiciones); }
  return D.save();
}

/* ---------------- comprobante de pago (sueldos, honorarios y proveedores) ---------------- */
/**
 * @param {{cfg?:object, estilo?:string, periodo:string, emitido?:string, nombre:string, detalle?:string, cuit?:string,
 *   items:{tipo?:string,concepto:string,monto:number,moneda:string,pagado?:boolean}[], pagos?:{fecha:string,caja?:string,monto:number,moneda:string}[],
 *   destino?:[string,string][]}} r
 */
export async function reciboDoc(r) {
  const cfg = r.cfg || {}, tema = TEMAS.includes(r.estilo) ? r.estilo : (TEMAS.includes(cfg.estilo) ? cfg.estilo : 'editorial');
  const D = await nuevoDoc('Comprobante-' + r.nombre + '-' + r.periodo, { margen: 50, footH: 54, alPie: (D, n, t) => (tema === 'banda' ? pieBanda : tema === 'grilla' ? (d, c, a, b) => pieGrilla(d, c, a, b, 0) : pieEditorial)(D, cfg, n, t) });
  const { F } = D, X = D.M, CW = D.cw;
  D.addPage();
  const totales = {}; r.items.forEach(i => { totales[i.moneda] = (totales[i.moneda] || 0) + (Number(i.monto) || 0); });
  const totTxt = Object.entries(totales).map(([m, v]) => plata(v, m)).join('  +  ');
  const pagado = r.items.length && r.items.every(i => i.pagado);
  if (tema === 'banda') {
    const bh = 160; D.rect(0, H - bh, W, bh, COL.coral);
    D.logo(X, H - 40, 70, COL.white); D.right(r.emitido ? 'Emitido ' + r.emitido : '', W - X, H - 50, F.r, 8.5, COL.white);
    D.text('Comprobante de pago', X, H - 106, F.d, 28, COL.white); D.text(r.periodo, X, H - 128, F.s, 12, COL.white);
    D.y = H - bh - 34; D.text(r.nombre, X, D.y, F.d, 22, COL.ink);
  } else {
    if (tema === 'grilla') { D.iso(X, D.y + 4, 52, COL.ink); D.right('Comprobante de pago', W - X, D.y - 8, F.s, 9, COL.ink); D.right(r.emitido ? 'Emitido ' + r.emitido : '', W - X, D.y - 20, F.r, 8.5, COL.muted); D.y -= 96; }
    else { cabeceraEditorial(D, 'Comprobante de pago', r.emitido ? 'Emitido ' + r.emitido : ''); D.y -= 50; }
    D.text('Comprobante de pago · ' + r.periodo, X, D.y, F.s, 10, COL.coral);
    D.y -= 34; D.text(r.nombre, X, D.y, F.d, 30, COL.ink);
  }
  const sub = [r.detalle, r.cuit ? 'CUIT ' + r.cuit : ''].filter(Boolean).join(' · ');
  if (sub) { D.y -= 18; D.text(sub, X, D.y, F.r, 10.5, COL.muted); }
  D.y -= 40; D.text(pagado ? 'Total pagado' : 'Total a pagar', X, D.y, F.r, 9.5, COL.muted);
  D.y -= 38; D.text(totTxt, X - 1.5, D.y, F.d, 36, COL.ink);
  if (pagado && r.pagos && r.pagos.length) { D.y -= 18; D.text('Pagado el ' + r.pagos.map(p => p.fecha).join(', '), X, D.y, F.s, 9.5, COL.coralInk); }
  D.y -= 34;
  D.hline(D.y, X, W - X, COL.ink, 0.8); D.y -= 15;
  D.text('Concepto', X, D.y, F.s, 8.5, COL.muted); D.right('Importe', W - X, D.y, F.s, 8.5, COL.muted); D.y -= 8;
  for (const it of r.items) {
    const ls = D.wrap(it.concepto, F.r, 10.5, CW - 190); D.need(ls.length * 14 + 14);
    D.hline(D.y, X, W - X, COL.line); D.y -= 18;
    if (it.tipo) D.text(it.tipo, X, D.y, F.s, 8.5, COL.muted);
    ls.forEach((l, i) => D.text(l, X + 80, D.y - i * 14, F.r, 10.5, COL.ink));
    D.right(plata(it.monto, it.moneda), W - X, D.y, F.s, 10.5, COL.ink);
    D.y -= (ls.length - 1) * 14 + 8;
  }
  D.hline(D.y, X, W - X, COL.ink, 0.8); D.y -= 18;
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
  D.y -= 30; D.need(16);
  D.para('Comprobante interno de àndale. No reemplaza la factura del proveedor ni el recibo de sueldo legal.', X, F.r, 8.5, CW, COL.muted);
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
