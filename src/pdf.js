// PDFs de àndale con la marca 2026, generados en el navegador (vectoriales, con Delight + Inter embebidas).
// Mismo diseño que el resumen de cuenta histórico: isologo arriba, título coral con filete, datos de pago en 3 columnas,
// pie con redes, contacto y logotipo. Se usa para descargar y para adjuntar en los emails.
import { PDFDocument, rgb, PDFString, PDFName } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ISO_PATHS, ISO_VB, LOGO_PATHS, LOGO_VB } from './marca.js';

const MM = 72 / 25.4;
const W = 595.28, H = 841.89, MX = 21 * MM;
const C = { ink: rgb(0.067, 0.067, 0.067), acc: rgb(252 / 255, 72 / 255, 85 / 255), rule: rgb(0.54, 0.54, 0.54), soft: rgb(0.2, 0.2, 0.2) };
const FONT_FILES = { dBold: 'Delight-Bold', reg: 'Inter-Regular', semi: 'Inter-SemiBold', bold: 'Inter-Bold' };
let fontBytes = null;

async function loadFonts() {
  if (!fontBytes) {
    const base = (typeof location !== 'undefined' ? location.origin : '') + '/fonts/pdf/';
    const entries = await Promise.all(Object.entries(FONT_FILES).map(async ([k, f]) => {
      const r = await fetch(base + f + '.ttf'); if (!r.ok) throw new Error('No se pudo cargar la tipografía ' + f);
      return [k, new Uint8Array(await r.arrayBuffer())];
    }));
    fontBytes = Object.fromEntries(entries);
  }
  return fontBytes;
}
// Para tests en Node: permite inyectar los bytes de las fuentes.
export function setFontBytes(b) { fontBytes = b; }

const clean = s => String(s ?? '').replace(/ | /g, ' ');
export function plata(n, moneda) {
  try { return clean(new Intl.NumberFormat('es-AR', { style: 'currency', currency: moneda || 'ARS', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0)); }
  catch (e) { return (moneda || '') + ' ' + n; }
}

async function base(title) {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const b = await loadFonts();
  const F = {};
  for (const k of Object.keys(FONT_FILES)) F[k] = await doc.embedFont(b[k], { subset: true });
  doc.setTitle(title); doc.setAuthor('àndale'); doc.setCreator('àndale Operaciones'); doc.setProducer('àndale Operaciones');
  const page = doc.addPage([W, H]);
  return { doc, page, F };
}

function kit(doc, page, F) {
  const wid = (t, f, s) => f.widthOfTextAtSize(clean(t), s);
  const text = (t, x, y, f, s, color = C.ink) => page.drawText(clean(t), { x, y, font: f, size: s, color });
  const runs = (rs, x, y, s) => { for (const r of rs) { text(r.t, x, y, r.f, s, r.c || C.ink); x += wid(r.t, r.f, s); } return x; };
  const wrap = (t, f, s, max) => {
    const out = [];
    for (const para of clean(t).split('\n')) {
      let line = '';
      for (const w of para.split(/\s+/).filter(Boolean)) {
        const test = line ? line + ' ' + w : w;
        if (wid(test, f, s) <= max || !line) line = test; else { out.push(line); line = w; }
        while (wid(line, f, s) > max && line.length > 1) { // palabra más larga que la columna (CBU, IBAN)
          let i = line.length; while (i > 1 && wid(line.slice(0, i), f, s) > max) i--;
          out.push(line.slice(0, i)); line = line.slice(i);
        }
      }
      out.push(line);
    }
    return out;
  };
  const rule = (y) => page.drawLine({ start: { x: MX - 1.5 * MM, y }, end: { x: W - MX + 1.5 * MM, y }, thickness: 0.75, color: C.rule });
  const link = (x, y, w, h, url) => {
    if (!url) return;
    const a = doc.context.register(doc.context.obj({ Type: 'Annot', Subtype: 'Link', Rect: [x, y, x + w, y + h], Border: [0, 0, 0], A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) } }));
    const annots = page.node.lookup(PDFName.of('Annots'));
    if (annots) annots.push(a); else page.node.set(PDFName.of('Annots'), doc.context.obj([a]));
  };
  const svg = (paths, vb, x, yTop, width) => { const sc = width / vb[0]; for (const d of paths) page.drawSvgPath(d, { x, y: yTop, scale: sc, color: C.ink }); return vb[1] * sc; };
  const heart = (x, yBase, s) => { // corazón vectorial (Delight no trae el glifo)
    const k = s / 10;
    page.drawSvgPath('M5 9 C5 9 0 5.6 0 2.8 C0 1.2 1.2 0 2.7 0 C3.7 0 4.5 .6 5 1.4 C5.5 .6 6.3 0 7.3 0 C8.8 0 10 1.2 10 2.8 C10 5.6 5 9 5 9 Z', { x, y: yBase + 8.2 * k, scale: k, color: C.ink });
    return 10 * k;
  };
  return { wid, text, runs, wrap, rule, link, svg, heart };
}

function footer(K, F, cfg) {
  const { wid, text, runs, link, svg, heart } = K;
  let y = 12 * MM; // pie, desde abajo
  const pie = clean(cfg.pie || 'with ❤ from cordoba | © àndale Strictly Confidential');
  const [pre, post] = pie.includes('❤') ? pie.split('❤') : [pie, null];
  const s = 9.5, hw = post !== null ? s * 0.95 : 0;
  const total = wid(pre, F.dBold, s) + hw + (post !== null ? wid(post, F.dBold, s) : 0);
  let x = (W - total) / 2;
  text(pre, x, y, F.dBold, s); x += wid(pre, F.dBold, s);
  if (post !== null) { heart(x + 0.6, y, s * 0.82); x += hw; text(post, x, y, F.dBold, s); }
  y += 5 * MM;
  const lw = 24 * MM, lh = LOGO_VB[1] * lw / LOGO_VB[0];
  svg(LOGO_PATHS, LOGO_VB, (W - lw) / 2, y + lh, lw);
  y += lh + 4 * MM;
  const line = (items, f, sz, color) => {
    const sep = ' | ';
    const tw = items.reduce((a, [t], i) => a + wid(t, f, sz) + (i ? wid(sep, f, sz) : 0), 0);
    let xx = (W - tw) / 2;
    items.forEach(([t, u], i) => { if (i) { text(sep, xx, y, f, sz, color); xx += wid(sep, f, sz); } text(t, xx, y, f, sz, color); link(xx, y - 2, wid(t, f, sz), sz + 3, u); xx += wid(t, f, sz); });
  };
  if ((cfg.contacto || []).length) { line(cfg.contacto, F.reg, 9, C.soft); y += 5.2 * MM; }
  if ((cfg.redes || []).length) line(cfg.redes, F.dBold, 10.5, C.ink);
  return y + 8 * MM; // límite superior del pie
}

/**
 * Resumen de cuenta.
 * @param {{cfg:object, contacto?:string, cuenta:string, periodo:string, moneda:string, items:{concepto:string,monto:number}[], total:number, nota?:string}} r
 * @returns {Promise<Uint8Array>}
 */
export async function resumenPdf(r) {
  const cfg = r.cfg || {};
  const { doc, page, F } = await base('Resumen-' + r.cuenta + '-' + r.periodo);
  const K = kit(doc, page, F);
  const { wid, text, runs, wrap, rule, svg } = K;
  const cw = W - 2 * MX;
  const footTop = footer(K, F, cfg);

  let y = H - 16 * MM;
  const iw = 32 * MM; y -= svg(ISO_PATHS, ISO_VB, (W - iw) / 2, y, iw) + 11 * MM;

  const ms = 11.5;
  if (r.contacto) { y -= ms; runs([{ t: 'Cliente: ', f: F.reg }, { t: r.contacto, f: F.bold }], MX, y, ms); y -= 3; }
  y -= ms; runs([{ t: 'Cuenta: ', f: F.reg }, { t: r.cuenta, f: F.bold }, { t: ' Periodo: ', f: F.reg }, { t: r.periodo, f: F.bold }], MX, y, ms);

  y -= 10 * MM + 15; text('Resumen de Cuenta', MX, y, F.dBold, 15, C.acc);
  y -= 3 * MM + 2; rule(y);

  y -= 6 * MM;
  const is = 10.5, amtW = 40 * MM;
  for (const it of r.items) {
    const lines = wrap(it.concepto, F.semi, is, cw - amtW - 6 * MM);
    y -= is + 2;
    lines.forEach((l, i) => text(l, MX + 1.5 * MM, y - i * (is + 3), F.semi, is));
    const m = plata(it.monto, r.moneda); text(m, W - MX - 1.5 * MM - wid(m, F.semi, is), y, F.semi, is);
    y -= (lines.length - 1) * (is + 3) + 2 * MM;
  }

  y -= 9 * MM; const ts = 15;
  text('Total a abonar', MX, y, F.dBold, ts);
  text(plata(r.total, r.moneda), MX + wid('Total a abonar', F.dBold, ts) + 10 * MM, y, F.dBold, ts);
  y -= 9 * MM; rule(y);

  const ns = 10.5;
  if (cfg.nota) {
    y -= 5 * MM + ns;
    const parts = clean(cfg.nota).split('SIN EXCEPCIÓN');
    const rs = [{ t: 'NOTA ', f: F.bold }, { t: parts[0], f: F.reg }];
    if (parts.length > 1) rs.push({ t: 'SIN EXCEPCIÓN', f: F.bold }, { t: parts.slice(1).join('SIN EXCEPCIÓN'), f: F.reg });
    runs(rs, MX, y, ns);
  }
  if (r.nota && r.nota.trim()) { for (const l of wrap(r.nota.trim(), F.reg, ns, cw)) { y -= ns + 4; text(l, MX, y, F.reg, ns); } }

  const cols = cfg.cuentas || [];
  if (cols.length) {
    y -= 9 * MM;
    const gap = 8 * MM, colW = (cw - 3 * MM - gap * (cols.length - 1)) / cols.length;
    let low = y;
    cols.forEach((c, i) => {
      const x = MX + 1.5 * MM + i * (colW + gap);
      let yy = y - 13;
      text(c.titulo, x, yy, F.dBold, 13, C.acc);
      if (c.sub) text(' (' + c.sub + ')', x + wid(c.titulo, F.dBold, 13), yy, F.reg, 8);
      yy -= 5 * MM;
      for (const [k, v] of c.campos || []) {
        yy -= 9.5 + 2; text(k + ':', x, yy, F.bold, 9.5);
        for (const l of wrap(v, F.reg, 9.5, colW)) { yy -= 9.5 + 2.4; text(l, x, yy, F.reg, 9.5); }
      }
      low = Math.min(low, yy);
    });
    y = low;
  }
  if (cfg.cierre) { y -= 9 * MM; wrap(cfg.cierre, F.reg, ns, cw).forEach((l, i) => text(l, MX, y - i * (ns + 4), F.reg, ns)); }
  if (y < footTop) console.warn('El contenido del resumen se superpone con el pie');
  return doc.save();
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
