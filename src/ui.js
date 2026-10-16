// Piezas de interfaz compartidas, para que todas las pantallas se comporten igual:
// - masMenu: las acciones secundarias van a un menú "Más" (una sola acción principal a la vista).
// - vistaSel / vistaDe: selector Lista · Cuadrícula · Tablero · Calendario, recordado por pantalla.
// - toastAccion: aviso con un botón (por ejemplo "Deshacer").
import { ICON } from './iconos.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* sin storage */ } };

// items: [{ act, label, attrs?, danger?, icon? }] o strings HTML ya armados. Los vacíos se ignoran.
export function masMenu(items, etiqueta) {
  const its = items.filter(Boolean);
  if (!its.length) return '';
  return '<details class="share mas-m"><summary class="btn ghost" aria-label="Más opciones" title="Más opciones">' + ICON.mas + (etiqueta ? '<span>' + esc(etiqueta) + '</span>' : '') + '</summary><div class="menu-pop">' +
    its.map(i => typeof i === 'string' ? i : '<button class="btn ghost sm' + (i.danger ? ' danger' : '') + '" data-act="' + esc(i.act) + '"' + (i.attrs || '') + '>' + (i.icon && ICON[i.icon] ? ICON[i.icon] : '') + esc(i.label) + '</button>').join('') + '</div></details>';
}

const VISTAS = { lista: ['Lista', 'barras'], cuadricula: ['Cuadrícula', 'grilla'], tablero: ['Tablero', 'tablero'], calendario: ['Calendario', 'calendario'] };
export const vistaDe = (pantalla, opciones, def) => { const v = lsGet('vista:' + pantalla); return opciones.includes(v) ? v : (def || opciones[0]); };
export function vistaSel(pantalla, opciones, actual) {
  return '<div class="seg vsel" role="group" aria-label="Ver como">' + opciones.map(k => '<button data-act="uiVista" data-p="' + esc(pantalla) + '" data-v="' + k + '" aria-pressed="' + (actual === k) + '" title="Ver en ' + esc(VISTAS[k][0].toLowerCase()) + '" aria-label="' + esc(VISTAS[k][0]) + '">' + (ICON[VISTAS[k][1]] || '') + '</button>').join('') + '</div>';
}
export const guardarVista = (p, v) => lsSet('vista:' + p, v);

let accT = null, accFn = null;
export function toastAccion(msg, etiqueta, fn, ms) {
  const t = document.getElementById('toast'); if (!t) return;
  accFn = fn; t.innerHTML = '<span>' + esc(msg) + '</span><button class="toast-b" data-act="uiToastAcc">' + esc(etiqueta) + '</button>'; t.hidden = false; t.classList.add('con-acc');
  clearTimeout(accT); accT = setTimeout(() => { t.hidden = true; t.classList.remove('con-acc'); accFn = null; }, ms || 9000);
}
export const uiActs = {
  uiToastAcc: () => { const fn = accFn; accFn = null; const t = document.getElementById('toast'); if (t) { t.hidden = true; t.classList.remove('con-acc'); } if (fn) fn(); },
};

// Filtros secundarios en un desplegable "Filtros (n)": la barra queda con la búsqueda y uno o dos filtros a la vista.
export function filtrosMenu(clave, html, activos) {
  return '<details class="share fmenu" data-keep="f:' + esc(clave) + '"><summary class="btn ico-b' + (activos ? ' on' : '') + '" title="Filtros' + (activos ? ' (' + activos + ' activos)' : '') + '" aria-label="Filtros' + (activos ? ', ' + activos + ' activos' : '') + '">' + ICON.filtro + (activos ? '<span class="ico-n">' + activos + '</span>' : '') + '</summary><div class="menu-pop fpop">' + html + '</div></details>';
}
// Los desplegables con data-keep siguen abiertos después de volver a dibujar la pantalla.
const ABIERTOS = new Set();
document.addEventListener('toggle', e => { const d = e.target; if (d && d.dataset && d.dataset.keep) { if (d.open) ABIERTOS.add(d.dataset.keep); else ABIERTOS.delete(d.dataset.keep); } }, true);
document.addEventListener('click', e => { if (!e.target.closest || e.target.closest('details[data-keep]')) return; document.querySelectorAll('details[data-keep][open]').forEach(d => { d.open = false; }); ABIERTOS.clear(); });
export function reabrir(raiz) { (raiz || document).querySelectorAll('details[data-keep]').forEach(d => { if (ABIERTOS.has(d.dataset.keep)) d.open = true; }); }
