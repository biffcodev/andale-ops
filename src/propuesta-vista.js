// Propuesta de àndale en HTML: la misma pieza en el editor (vista previa) y en el link que ve el cliente.
import { LOGO, ISO } from './marca.js';

export const PLANES = ['Contado', '50/50', '3 cuotas', '4 cuotas', '6 cuotas', 'Personalizado'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lineas = v => (Array.isArray(v) ? v : String(v || '').split('\n')).map(x => String(x).trim()).filter(Boolean);
export function plata(n, cur) { try { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur || 'ARS', maximumFractionDigits: 0 }).format(n || 0).replace(/ /g, ' '); } catch (e) { return (cur || '') + ' ' + n; } }
export const subtotal = p => (p.items || []).reduce((a, i) => a + (Number(i.monto) || 0), 0);
export const totalDe = p => Math.max(0, subtotal(p) - (Number(p.descuento) || 0));
const fecha = d => { if (!d) return ''; const [y, m, dd] = String(d).slice(0, 10).split('-'); return dd + '/' + m + '/' + y; };
export function venceEl(p) { if (!p.fecha) return ''; const d = new Date(String(p.fecha).slice(0, 10) + 'T12:00:00'); d.setDate(d.getDate() + (Number(p.validez_dias) || 15)); return d.toISOString().slice(0, 10); }
export function planTexto(p) {
  const t = totalDe(p), cur = p.moneda;
  if (p.plan_pago === 'Contado') return '100% al aceptar la propuesta.';
  if (p.plan_pago === '50/50') return '50% al aceptar la propuesta (' + plata(t / 2, cur) + ') y 50% a la entrega (' + plata(t / 2, cur) + ').';
  const n = parseInt(p.plan_pago, 10); if (n) return n + ' cuotas mensuales de ' + plata(t / n, cur) + ', la primera al aceptar.';
  return '';
}
export function etapasDe(p) { return (p.contenido && Array.isArray(p.contenido.etapas) ? p.contenido.etapas : []).filter(e => e && (e.nombre || e.detalle)); }

/** @param {object} p propuesta  @param {{contacto?:Array, redes?:Array}} marca  @param {{interno?:boolean}} o */
export function propuestaHTML(p, marca = {}, o = {}) {
  const c = p.contenido || {}, cur = p.moneda || 'ARS';
  const sec = (t, inner) => inner ? '<section class="pz-s"><h2>' + esc(t) + '</h2>' + inner + '</section>' : '';
  const lista = (v, cls) => { const l = lineas(v); return l.length ? '<ul' + (cls ? ' class="' + cls + '"' : '') + '>' + l.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : ''; };
  const parr = v => lineas(v).map(x => '<p>' + esc(x) + '</p>').join('');
  const et = etapasDe(p);
  const semanas = et.reduce((a, e) => a + (Number(e.semanas) || 0), 0);
  const items = (p.items || []).filter(i => i.concepto || i.monto);
  const cliente = p.cliente || p.prospecto || '';
  return '<article class="pz">' +
    '<header class="pz-h"><span class="pz-brand"><span class="pz-isoh">' + ISO + '</span><span class="pz-logo">' + LOGO + '</span></span><span class="pz-meta">Propuesta ' + esc(p.numero || '') + '<br><span>' + esc(fecha(p.fecha)) + (p.fecha ? ' · válida hasta ' + esc(fecha(venceEl(p))) : '') + '</span></span></header>' +
    '<p class="pz-eye">' + esc(['Propuesta', p.tipo].filter(Boolean).join(' · ')) + '</p>' +
    '<h1>' + esc(p.titulo || 'Propuesta sin título') + '</h1>' +
    (cliente ? '<p class="pz-para">Para ' + esc(cliente) + (p.contacto ? ' · ' + esc(p.contacto) : '') + '</p>' : '') +
    (c.intro ? '<div class="pz-intro">' + parr(c.intro) + '</div>' : '') +
    sec('Objetivo', parr(c.objetivo)) +
    sec('Alcance', lista(c.alcance)) +
    (et.length ? '<section class="pz-s"><h2>Etapas' + (semanas ? ' <span>· ' + semanas + ' semanas aprox.</span>' : '') + '</h2><ol class="pz-et">' + et.map(e => '<li><b>' + esc(e.nombre) + '</b>' + (e.semanas ? '<span class="pz-sem">' + esc(e.semanas) + ' sem.</span>' : '') + (e.detalle ? '<p>' + esc(e.detalle) + '</p>' : '') + '</li>').join('') + '</ol></section>' : '') +
    sec('Entregables', lista(c.entregables)) +
    sec('No incluye', lista(c.no_incluye, 'pz-no')) +
    '<section class="pz-s pz-inv"><h2>Inversión</h2>' +
    (items.length ? '<table><tbody>' + items.map(i => '<tr><td><b>' + esc(i.concepto) + '</b>' + (i.detalle ? '<span>' + esc(i.detalle) + '</span>' : '') + '</td><td class="r">' + esc(plata(i.monto, cur)) + '</td></tr>').join('') +
      (Number(p.descuento) ? '<tr class="pz-desc"><td>Descuento</td><td class="r">− ' + esc(plata(p.descuento, cur)) + '</td></tr>' : '') + '</tbody></table>' : '') +
    '<div class="pz-total"><span>Total</span><b>' + esc(plata(totalDe(p), cur)) + '</b></div>' +
    (planTexto(p) ? '<p class="pz-plan"><b>Forma de pago:</b> ' + esc(planTexto(p)) + '</p>' : '') + '</section>' +
    sec('Condiciones', parr(c.condiciones)) +
    '<footer class="pz-f"><span>weareandale.com</span><span class="pz-c">' + esc((marca.contacto || []).filter(x => !/weareandale\.com\/?$/.test(x[1] || '')).slice(0, 2).map(x => x[0]).join('  ·  ')) + '</span></footer>' +
    '</article>';
}
