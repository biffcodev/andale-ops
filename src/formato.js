// Formato automático de campos, en toda la app (paneles, formularios, portal):
//   · Montos y porcentajes (inputmode="decimal"): se tipea con punto o coma; el símbolo que se use es el decimal.
//     Al salir del campo se muestra como en pantalla y documentos: 1.250.000,50 (punto de miles, coma decimal).
//   · Teléfonos (type="tel" o id …-tel): +54 9 351 705 3527. Sin código de país se toma como celular de Argentina.
//   · CUIT / CUIL (id …-cuit / …-cuil): 20-30238683-9. Si no tiene 11 dígitos (un Tax ID del exterior) queda como está.

/**
 * Lee un número escrito a mano.
 * Con punto y coma a la vez, el último es el decimal (1.250.000,50 · 1,250,000.50).
 * Con un solo tipo de símbolo: si aparece una vez es el decimal (1250.5 · 1250,5); si se repite son miles (1.250.000).
 */
export function leerNumero(s) {
  if (typeof s === 'number') return isFinite(s) ? s : null;
  let t = String(s ?? '').trim(); if (!t) return null;
  const neg = /^[-−–]/.test(t) || /^\(.*\)$/.test(t);
  t = t.replace(/[^\d.,]/g, ''); if (!/\d/.test(t)) return null;
  const nd = (t.match(/\./g) || []).length, nc = (t.match(/,/g) || []).length;
  if (nd && nc) { const dec = t.lastIndexOf('.') > t.lastIndexOf(',') ? '.' : ','; t = t.split(dec === '.' ? ',' : '.').join('').replace(dec, '.'); }
  else if (nd + nc) { const sym = nd ? '.' : ','; t = nd + nc > 1 ? t.split(sym).join('') : t.replace(sym, '.'); }
  const n = Number(t); return isNaN(n) ? null : (neg ? -n : n);
}

/** Cómo se muestra un número dentro de un campo: sin ambigüedad al volver a leerlo (1.250,00 · 500 · 5,5). */
export function numeroEnCampo(n) {
  if (n == null || isNaN(n)) return '';
  const dec = Math.abs(n % 1) > 1e-9, f = Math.abs(n) >= 1000 || dec ? 2 : 0;
  return n.toLocaleString('es-AR', { minimumFractionDigits: f, maximumFractionDigits: 2 });
}

export function cuit(s) {
  const t = String(s ?? '').trim(), d = t.replace(/\D/g, '');
  if (d.length === 11 && /^[\d\s.\-/]+$/.test(t)) return d.slice(0, 2) + '-' + d.slice(2, 10) + '-' + d.slice(10);
  return t.replace(/\s+/g, ' ');
}

let LIB = null;
const lib = () => LIB || (LIB = import('libphonenumber-js/min').catch(() => null));
export async function telefono(s) {
  const t = String(s ?? '').trim(); if (!t) return '';
  const m = await lib(); if (!m) return t;
  const p = m.parsePhoneNumberFromString;
  let d = t.replace(/\D/g, '');
  // Sin "+": número argentino, celular (igual que el link de WhatsApp): 0351 15 705-3527 → +54 9 351 705 3527
  if (!/^\s*(\+|00)/.test(t) && !d.startsWith('54')) {
    d = d.replace(/^0/, '').replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');
    const x = p('+549' + d); if (x && x.isValid()) return x.formatInternational();
  }
  const x = p(t.replace(/^00/, '+'), 'AR');
  return x && x.isValid() ? x.formatInternational() : t;
}

const esMonto = el => el.tagName === 'INPUT' && el.getAttribute('inputmode') === 'decimal' && !el.hasAttribute('data-nofmt');
const esTel = el => el.tagName === 'INPUT' && (el.type === 'tel' || /(^|-)tel$/.test(el.id || ''));
const esCuit = el => el.tagName === 'INPUT' && /(^|-)(cuit|cuil)(-|$)/i.test(el.id || '');

async function formatear(el) {
  const v = el.value; if (!v || !v.trim()) return;
  let nv = v;
  if (esMonto(el)) { const n = leerNumero(v); if (n != null) nv = numeroEnCampo(n); }
  else if (esCuit(el)) nv = cuit(v);
  else if (esTel(el)) nv = await telefono(v);
  if (nv !== v && el.value === v) el.value = nv;
}

let activo = false;
export function activarFormato(root = document) {
  if (activo || typeof document === 'undefined') return; activo = true;
  root.addEventListener('focusout', e => { const el = e.target; if (el && el.tagName === 'INPUT') formatear(el); }, true);
  // Lo que ya viene cargado (fichas que se abren, filas nuevas) también se muestra formateado.
  const pasar = n => { if (n.nodeType !== 1) return; const ins = n.tagName === 'INPUT' ? [n] : n.querySelectorAll ? n.querySelectorAll('input') : []; ins.forEach(el => { if (el !== document.activeElement && (esMonto(el) || esTel(el) || esCuit(el))) formatear(el); }); };
  new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(pasar))).observe(root.body || root, { childList: true, subtree: true });
  pasar(root.body || root);
}
