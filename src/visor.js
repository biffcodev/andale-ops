// Visor para ampliar una pieza antes de bajarla (papelería, íconos, logos, aplicaciones…).
// Se activa sobre cualquier elemento con data-visor="<url de la imagen o video>" (y data-n con el nombre).
// Agrupa las piezas del mismo contenedor [data-visor-grupo] para pasar con las flechas, y muestra los formatos
// para descargar que tenga la ficha (.km-fxs, .mm-fxs o .mm-dl).
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const esVid = u => /\.(mp4|mov|m4v|webm)(\?|$)/i.test(u || '');
let st = null;

const CSS = `
.vz{position:fixed;inset:0;z-index:400;background:rgba(12,12,14,.92);display:grid;grid-template-rows:auto minmax(0,1fr) auto;color:#fff;font:14px/1.4 Inter,system-ui,sans-serif;animation:vzIn .25s ease}
@keyframes vzIn{from{opacity:0}}
.vz-top{display:flex;align-items:center;gap:12px;padding:14px 18px}
.vz-top b{font-size:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vz-top small{opacity:.6;font-variant-numeric:tabular-nums}
.vz-sp{flex:1}
.vz button{all:unset;cursor:pointer;display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:rgba(255,255,255,.1);transition:background .2s}
.vz button:hover{background:rgba(255,255,255,.2)}
.vz button:focus-visible{outline:2px solid #fff}
.vz button svg{width:20px;height:20px}
.vz-m{position:relative;display:grid;place-items:center;padding:0 72px;min-height:0}
.vz-m img,.vz-m video{max-width:100%;max-height:100%;object-fit:contain;border-radius:6px;box-shadow:0 30px 80px -30px rgba(0,0,0,.8);background:repeating-conic-gradient(#2a2a2e 0 25%,#333338 0 50%) 0 0/18px 18px;animation:vzZoom .35s cubic-bezier(.22,.8,.24,1)}
@keyframes vzZoom{from{transform:scale(.96);opacity:0}}
.vz-m .vz-prev,.vz-m .vz-next{position:absolute;top:50%;transform:translateY(-50%)}
.vz-prev{left:16px}.vz-next{right:16px}
.vz-bot{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px;padding:16px 18px 22px}
.vz-bot > span{opacity:.6;font-size:12.5px;margin-right:4px}
.vz-bot a{display:inline-flex;align-items:center;gap:6px;font:700 12px/1 Inter,system-ui,sans-serif;letter-spacing:.05em;color:#fff;text-decoration:none;background:rgba(255,255,255,.12);border-radius:99px;padding:10px 14px;box-shadow:none;transition:background .2s}
.vz-bot a:hover{background:#fff;color:#111}
.vz-bot a svg{width:15px;height:15px}
@media (max-width:640px){.vz-m{padding:0 10px}.vz-m .vz-prev,.vz-m .vz-next{top:auto;bottom:-56px;transform:none}.vz-prev{left:18px}.vz-next{right:18px}.vz-bot{padding-bottom:70px}}
`;
const S = d => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';

function pintar() {
  const it = st.items[st.i], n = st.items.length;
  const m = esVid(it.src) ? '<video src="' + esc(it.src) + '" controls autoplay playsinline></video>' : '<img src="' + esc(it.src) + '" alt="' + esc(it.n) + '">';
  st.el.innerHTML = '<div class="vz-top"><b>' + esc(it.n) + '</b>' + (n > 1 ? '<small>' + (st.i + 1) + ' de ' + n + '</small>' : '') + '<span class="vz-sp"></span><button data-vz="x" aria-label="Cerrar">' + S('<path d="M6 6l12 12M18 6 6 18"/>') + '</button></div>' +
    '<div class="vz-m">' + m + (n > 1 ? '<button class="vz-prev" data-vz="-1" aria-label="Anterior">' + S('<path d="m15 5-7 7 7 7"/>') + '</button><button class="vz-next" data-vz="1" aria-label="Siguiente">' + S('<path d="m9 5 7 7-7 7"/>') + '</button>' : '') + '</div>' +
    '<div class="vz-bot">' + (it.fx ? '<span>Descargar</span>' + it.fx : '') + '</div>';
  st.el.querySelectorAll('.vz-bot a').forEach(a => { a.removeAttribute('class'); if (!a.textContent.trim()) a.insertAdjacentText('beforeend', 'Descargar'); });
}
function cerrar() { if (!st) return; st.el.remove(); document.removeEventListener('keydown', st.key); document.documentElement.style.overflow = st.ov; const f = st.foco; st = null; if (f && f.focus) f.focus(); }
export function abrirVisor(items, i) {
  if (!items.length) return;
  if (!document.getElementById('vz-css')) { const s = document.createElement('style'); s.id = 'vz-css'; s.textContent = CSS; document.head.appendChild(s); }
  if (st) cerrar();
  const el = document.createElement('div'); el.className = 'vz'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Ver en grande');
  st = { el, items, i: Math.max(0, i), foco: document.activeElement, ov: document.documentElement.style.overflow };
  st.key = e => { if (e.key === 'Escape') cerrar(); else if (e.key === 'ArrowRight') mover(1); else if (e.key === 'ArrowLeft') mover(-1); };
  el.addEventListener('click', e => { const b = e.target.closest('[data-vz]'); if (b) { const v = b.dataset.vz; if (v === 'x') cerrar(); else mover(+v); return; } if (e.target === el || e.target.classList.contains('vz-m')) cerrar(); });
  document.addEventListener('keydown', st.key); document.documentElement.style.overflow = 'hidden';
  document.body.appendChild(el); pintar(); const x = el.querySelector('[data-vz="x"]'); if (x) x.focus();
}
function mover(d) { if (!st) return; st.i = (st.i + d + st.items.length) % st.items.length; pintar(); }

// Escucha los clics en [data-visor] dentro de root
export function activarVisor(root) {
  if (!root || root._visor) return; root._visor = true;
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-visor]'); if (!t || e.target.closest('a,button:not([data-visor]),input,label')) return;
    e.preventDefault();
    const g = t.closest('[data-visor-grupo]') || t.parentElement, els = [...g.querySelectorAll('[data-visor]')];
    const items = els.map(x => { const fig = x.closest('figure,.mm-ap,.mm-logo,.km-t') || x; const fx = fig.querySelector('.km-fxs,.mm-fxs,.mm-dl'); return { src: x.dataset.visor, n: x.dataset.n || '', fx: fx ? (fx.matches('.mm-dl') ? fx.outerHTML : fx.innerHTML) : '' }; });
    abrirVisor(items, els.indexOf(t));
  });
}
