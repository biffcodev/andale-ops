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

// "Seleccionar todos / Deseleccionar todos" en toda la app: cualquier grupo de 3 o más checkboxes habilitados dentro de
// uno de estos contenedores recibe el botón (los interruptores .sw y las tareas no cuentan). Para sumar un grupo nuevo,
// alcanza con ponerle data-todos al contenedor.
const GRUPOS = '[data-todos], .multi, .rd-chips, .pa-g, .fl-reglas, .inv-s, details.pick .menu';
const cajas = g => [...g.querySelectorAll('input[type="checkbox"]')].filter(i => !i.disabled && !i.closest('.sw') && !i.classList.contains('tk-ok') && i.closest(GRUPOS) === g);
const todosTxt = g => cajas(g).every(i => i.checked) ? 'Deseleccionar todos' : 'Seleccionar todos';
function ponerTodos() {
  const vistos = {};
  document.querySelectorAll(GRUPOS).forEach(g => {
    const base = g.dataset.todos || g.id || (g.className || g.tagName).toString().split(' ')[0];
    vistos[base] = (vistos[base] || 0) + 1; g.dataset.todosK = base + ':' + vistos[base];
    const cs = cajas(g); let b = g.querySelector(':scope > .todos-b, :scope > h3 > .todos-b') || (g.previousElementSibling && g.previousElementSibling.classList.contains('todos-b') ? g.previousElementSibling : null);
    if (cs.length < 3) { if (b) b.remove(); return; }
    if (!b) {
      b = document.createElement('button'); b.type = 'button'; b.className = 'todos-b';
      const h = g.querySelector(':scope > h3');
      if (h) h.appendChild(b); else if (g.matches('.menu, [data-todos-dentro]')) g.prepend(b); else g.before(b);
    }
    b.dataset.todosG = g.dataset.todosK;
    const t = todosTxt(g); if (b.textContent !== t) b.textContent = t;
  });
}
let todosPend = false;
const todosLuego = () => { if (todosPend) return; todosPend = true; setTimeout(() => { todosPend = false; ponerTodos(); }, 0); };
if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
  new MutationObserver(ms => { if (ms.some(m => [...m.addedNodes, ...m.removedNodes].some(n => !(n.classList && n.classList.contains('todos-b'))))) todosLuego(); }).observe(document.documentElement, { childList: true, subtree: true });
  document.addEventListener('change', e => { if (e.target && e.target.type === 'checkbox') todosLuego(); }, true);
  document.addEventListener('click', async e => {
    const b = e.target.closest && e.target.closest('.todos-b'); if (!b) return;
    e.preventDefault(); e.stopPropagation();
    const k = b.dataset.todosG, grupo = () => document.querySelector('[data-todos-k="' + k + '"]');
    const g0 = grupo(); if (!g0) return; const quiero = !cajas(g0).every(i => i.checked);
    // De a una y volviendo a buscar el grupo: hay pantallas que se redibujan con cada cambio.
    for (let n = 0; n < 300; n++) {
      const g = grupo(), i = g && cajas(g).find(x => x.checked !== quiero); if (!i) break;
      i.checked = quiero; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(r => setTimeout(r, 0)); ponerTodos();
    }
    ponerTodos();
  }, true);
}
