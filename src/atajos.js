// Atajos de teclado y tooltips de toda la app.
// - Tooltips: cualquier elemento con title (o un botón de solo ícono con aria-label) muestra un globito propio al dejar el mouse
//   encima. Si tiene data-kbd, el globito muestra también su atajo.
// - Atajos: "?" muestra la lista. Nada se dispara mientras se escribe en un campo.

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const escribiendo = t => t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent || '');
export const MOD = mac ? '⌘' : 'Ctrl';

/* ---------- Tooltips ---------- */
// Solo donde ayudan: botones de solo ícono, textos cortados (…) y lo marcado a propósito con data-tip.
// Uno a la vez, con demora, y se va apenas el mouse sale, se hace clic, se escribe o se mueve la pantalla.
// Los title se pasan a data-tt para que el navegador no muestre además el suyo. En pantallas táctiles, nada.
let tip = null, tipT = null, tipEl = null;
const DEMORA = 650;
const visibleTexto = el => (el.innerText || el.textContent || '').trim();
const cortado = el => el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 2;
function textoDe(el) {
  if (el.dataset.tip) return el.dataset.tip;
  const t = el.dataset.tt || el.getAttribute('aria-label') || '';
  if (!t) return '';
  const sinTexto = !visibleTexto(el);
  if (sinTexto) return t; // botón de solo ícono
  if (cortado(el) && t.trim() !== visibleTexto(el)) return t; // texto cortado con "…"
  if (cortado(el)) return t;
  return '';
}
// El title del navegador no se muestra nunca (queda como data-tt; si no hay nombre accesible, pasa a aria-label)
function sacarTitle(el) {
  for (let x = el; x && x !== document.body; x = x.parentElement) {
    if (x.hasAttribute && x.hasAttribute('title')) {
      const t = x.getAttribute('title'); x.removeAttribute('title'); if (!x.dataset.tt) x.dataset.tt = t;
      if (!x.getAttribute('aria-label') && !visibleTexto(x) && /^(BUTTON|A|SUMMARY|LABEL)$/.test(x.tagName)) x.setAttribute('aria-label', t);
    }
  }
}
function mostrar(el) {
  const txt = textoDe(el); if (!txt) return;
  if (!tip) { tip = document.createElement('div'); tip.className = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip); }
  tip.innerHTML = esc(txt) + (el.dataset.kbd ? ' <span class="tip-k">' + el.dataset.kbd.split(' ').map(k => '<kbd>' + esc(k) + '</kbd>').join('') + '</span>' : '');
  tip.style.left = '0px'; tip.style.top = '0px'; tip.hidden = false; tip.classList.remove('on');
  const r = el.getBoundingClientRect(), w = tip.offsetWidth, h = tip.offsetHeight, vw = window.innerWidth;
  let x = r.left + r.width / 2 - w / 2, y = r.bottom + 8;
  if (y + h > window.innerHeight - 6) y = r.top - h - 8;
  x = Math.max(8, Math.min(x, vw - w - 8));
  tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.add('on');
}
function ocultar() { clearTimeout(tipT); tipT = null; if (tip) { tip.classList.remove('on'); tip.hidden = true; } tipEl = null; }
const candidato = el => el && el.closest && el.closest('[data-tip], [title], [data-tt], button[aria-label], a[aria-label], summary[aria-label], label[aria-label], [role="button"][aria-label]');
if (typeof document !== 'undefined') {
  document.addEventListener('pointerover', e => {
    if (e.pointerType && e.pointerType !== 'mouse') { ocultar(); return; }
    sacarTitle(e.target);
    const el = candidato(e.target);
    if (el === tipEl) return;
    ocultar();
    if (!el || el.matches('input, textarea, select, iframe') || el.closest('.tip')) return;
    tipEl = el; tipT = setTimeout(() => { if (tipEl === el && el.isConnected && el.matches(':hover')) mostrar(el); }, DEMORA);
  });
  document.addEventListener('pointerout', e => { if (tipEl && (!e.relatedTarget || !tipEl.contains(e.relatedTarget))) ocultar(); });
  // Si la pantalla se redibuja bajo el mouse, el elemento ya no está: el globito se va.
  document.addEventListener('pointermove', () => { if (tipEl && (!tipEl.isConnected || !tipEl.matches(':hover'))) ocultar(); }, { passive: true });
  ['pointerdown', 'keydown', 'scroll', 'wheel', 'blur'].forEach(ev => (ev === 'blur' ? window : document).addEventListener(ev, () => { if (tipEl || (tip && !tip.hidden)) ocultar(); }, true));
}
/* ---------- Atajos ---------- */
// ctx: { go(view), views() → [[key, label]], isStaff() }
const NAV = { i: 'inicio', m: 'mis', p: 'proyectos', r: 'redes', t: 'tickets', c: 'clientes', e: 'equipo' };
export function initAtajos(ctx) {
  let g = 0;
  const general = () => [
    ['/', 'Buscar'], [MOD + ' K', 'Preguntarle a Mr. Piggy'], ['N', 'Nuevo (proyecto, charla, cliente…)'],
    ['F', 'Abrir los filtros de la pantalla'], ['V', 'Cambiar la vista (lista, cuadrícula, tablero…)'],
    ['[ ]', 'Mes anterior / siguiente (en Redes)'], [MOD + ' Enter', 'Guardar el panel abierto'], ['Esc', 'Cerrar el panel o el menú'], ['?', 'Ver estos atajos']];
  const irA = () => Object.entries(NAV).filter(([, v]) => ctx.views().some(x => x[0] === v)).map(([k, v]) => ['G ' + k.toUpperCase(), ctx.views().find(x => x[0] === v)[1]]);
  const teclas = k => k.split(' ').map(x => '<kbd>' + esc(x) + '</kbd>').join('');
  function ayuda() {
    const bg = document.createElement('div'); bg.className = 'atj-bg';
    const ir = irA();
    bg.innerHTML = '<div class="atj" role="dialog" aria-modal="true" aria-labelledby="atj-t" tabindex="-1"><div class="atj-h"><b id="atj-t">Atajos de teclado</b><button type="button" class="atj-x" aria-label="Cerrar">✕</button></div>' +
      '<div class="atj-b"><dl class="atj-l">' + general().map(([k, d]) => '<div><dt>' + teclas(k) + '</dt><dd>' + esc(d) + '</dd></div>').join('') + '</dl>' +
      (ir.length ? '<div class="atj-ir"><span class="atj-k">Ir a… <small>tocá G y después la letra</small></span><dl>' + ir.map(([k, d]) => '<div><dt>' + teclas(k.split(' ')[1]) + '</dt><dd>' + esc(d) + '</dd></div>').join('') + '</dl></div>' : '') + '</div></div>';
    const fin = () => { bg.remove(); document.removeEventListener('keydown', kd, true); };
    const kd = e => { if (e.key === 'Escape' || e.key === '?') { e.preventDefault(); e.stopPropagation(); fin(); } };
    bg.addEventListener('click', e => { if (e.target === bg || e.target.closest('.atj-x')) fin(); });
    document.addEventListener('keydown', kd, true); document.body.appendChild(bg); bg.querySelector('.atj').focus();
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
    if (escribiendo(t) || e.ctrlKey || e.metaKey || e.altKey || document.querySelector('.dlg-bg, .atj-bg')) return;
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
