// Atajos de teclado y tooltips de toda la app.
// - Tooltips: cualquier elemento con title (o un botón de solo ícono con aria-label) muestra un globito propio al dejar el mouse
//   encima. Si tiene data-kbd, el globito muestra también su atajo.
// - Atajos: "?" muestra la lista. Nada se dispara mientras se escribe en un campo.

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escribiendo = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
export const MOD = mac ? '⌘' : 'Ctrl';

/* ---------- Tooltips ---------- */
let tip = null, tipT = null, tipEl = null;
function textoDe(el) {
  const t = el.dataset.tip || el.getAttribute('title') || '';
  if (t) return t;
  // Botón o link sin texto visible: se usa su aria-label
  if ((el.tagName === 'BUTTON' || el.tagName === 'A' || el.tagName === 'SUMMARY') && !(el.textContent || '').trim()) return el.getAttribute('aria-label') || '';
  return '';
}
function mostrar(el) {
  const txt = textoDe(el); if (!txt) return;
  if (el.hasAttribute('title')) { el.dataset.tip = el.getAttribute('title'); el.removeAttribute('title'); } // que no salga además el del navegador
  if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
  tip.innerHTML = esc(txt) + (el.dataset.kbd ? ' <span class="tip-k">' + el.dataset.kbd.split(' ').map(k => '<kbd>' + esc(k) + '</kbd>').join('') + '</span>' : '');
  tip.style.left = '0px'; tip.style.top = '0px'; tip.hidden = false; tip.classList.remove('on');
  const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, vw = window.innerWidth;
  let x = r.left + r.width / 2 - w / 2, y = r.bottom + 8;
  if (y + h > window.innerHeight - 6) y = r.top - h - 8;
  x = Math.max(8, Math.min(x, vw - w - 8));
  tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('on');
}
function ocultar() { clearTimeout(tipT); tipT = null; if (tip) { tip.classList.remove('on'); tip.hidden = true; } if (tipEl && tipEl.dataset.tip && !tipEl.hasAttribute('title')) { tipEl.setAttribute('title', tipEl.dataset.tip); delete tipEl.dataset.tip; } tipEl = null; }
const conTip = el => el && el.closest && el.closest('[title], [data-tip], button[aria-label], a[aria-label], summary[aria-label]');
if (typeof document !== 'undefined') {
  document.addEventListener('mouseover', e => {
    const el = conTip(e.target);
    if (el === tipEl) return;
    ocultar();
    if (!el || el.closest('.tip') || el.matches('input, textarea, select, iframe') || !textoDe(el)) return;
    tipEl = el; tipT = setTimeout(() => { if (tipEl === el && el.isConnected) mostrar(el); }, 450);
  });
  document.addEventListener('mouseout', e => { if (tipEl && (!e.relatedTarget || !tipEl.contains(e.relatedTarget))) ocultar(); });
  ['mousedown', 'keydown', 'scroll', 'wheel'].forEach(ev => document.addEventListener(ev, () => { if (tipEl) ocultar(); }, true));
}

/* ---------- Atajos ---------- */
// ctx: { go(view), views() → [[key, label]], isStaff() }
const NAV = { i: 'inicio', m: 'mis', p: 'proyectos', r: 'redes', t: 'tickets', c: 'clientes', e: 'equipo' };
export function initAtajos(ctx) {
  let g = 0;
  const lista = () => [
    ['/', 'Buscar'], [MOD + ' K', 'Preguntarle a Mr. Piggy'], ['N', 'Nuevo (proyecto, charla, cliente…)'],
    ['F', 'Abrir los filtros de la pantalla'], ['V', 'Cambiar la vista (lista, cuadrícula, tablero…)'],
    ['[ ]', 'Mes anterior / siguiente (en Redes)'], [MOD + ' Enter', 'Guardar el panel abierto'], ['Esc', 'Cerrar el panel o el menú'],
    ...Object.entries(NAV).filter(([, v]) => ctx.views().some(x => x[0] === v)).map(([k, v]) => ['G ' + k.toUpperCase(), 'Ir a ' + ctx.views().find(x => x[0] === v)[1]]),
    ['?', 'Ver estos atajos']];
  function ayuda() {
    const bg = document.createElement('div'); bg.className = 'kb-bg';
    bg.innerHTML = '<div class="kb" role="dialog" aria-modal="true" aria-label="Atajos de teclado"><div class="kb-h"><b>Atajos de teclado</b><button type="button" class="btn ghost sm" aria-label="Cerrar">✕</button></div><dl>' +
      lista().map(([k, d]) => '<dt>' + k.split(' ').map(x => '<kbd>' + esc(x) + '</kbd>').join(' ') + '</dt><dd>' + esc(d) + '</dd>').join('') + '</dl></div>';
    const fin = () => { bg.remove(); document.removeEventListener('keydown', kd, true); };
    const kd = e => { if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); e.stopPropagation(); fin(); } };
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('.kb-h button')) fin(); });
    document.addEventListener('keydown', kd, true); document.body.appendChild(bg); bg.querySelector('.kb-h button').focus();
  }
  const visible = el => el && el.offsetParent !== null;
  const panelAbierto = () => { const p = document.getElementById('panel'); return p && !p.hidden; };
  document.addEventListener('keydown', e => {
    const t = e.target;
    // Ctrl/⌘ + Enter guarda el formulario del panel abierto (también escribiendo)
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && panelAbierto()) {
      const f = document.querySelector('#panel form'); if (f && !(t.closest && t.closest('[data-hlform]'))) { e.preventDefault(); if (f.requestSubmit) f.requestSubmit(); else f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }
      return;
    }
    if (escribiendo(t) || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.dlg-bg, .kb-bg')) return;
    const k = e.key;
    if (g && Date.now() - g < 1200) { g = 0; const v = NAV[k.toLowerCase()]; if (v && ctx.views().some(x => x[0] === v)) { e.preventDefault(); ctx.go(v); } return; }
    g = 0;
    if (k === '?') { e.preventDefault(); ayuda(); return; }
    if (k === 'g' || k === 'G') { g = Date.now(); return; }
    if (panelAbierto()) return; // con un panel abierto solo valen Esc y guardar
    if (k === 'n' || k === 'N') { const d = document.querySelector('#tnew details'); if (d) { e.preventDefault(); d.open = true; const b = d.querySelector('.menu-pop button'); if (b) b.focus(); } return; }
    if (k === 'f' || k === 'F') { const d = [...document.querySelectorAll('#view details.fmenu')].find(visible); if (d) { e.preventDefault(); d.open = !d.open; if (d.open) { const i = d.querySelector('input, select, button'); if (i) i.focus(); } } return; }
    if (k === 'v' || k === 'V') { const s = [...document.querySelectorAll('#view .vsel')].find(visible); if (s) { const bs = [...s.querySelectorAll('button')], i = bs.findIndex(b => b.getAttribute('aria-pressed') === 'true'); const nx = bs[(i + 1) % bs.length]; if (nx) { e.preventDefault(); nx.click(); } } return; }
    if (k === '[' || k === ']') { const b = document.querySelector('.rm-tit button[aria-label="' + (k === '[' ? 'Mes anterior' : 'Mes siguiente') + '"]'); if (b) { e.preventDefault(); b.click(); } }
  });
  return { ayuda };
}
