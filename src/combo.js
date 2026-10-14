// Autocompletar con el estilo de la app (reemplaza la lista nativa del navegador de los <input list="…">).
// Funciona solo: cualquier input con atributo list toma las opciones de su <datalist>.
export function initCombo() {
  let pop = null, inp = null, opts = [], act = -1;
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function fuente(el) {
    const id = el.getAttribute('list') || el.dataset.combo; if (!id) return null;
    if (el.getAttribute('list')) { el.dataset.combo = id; el.removeAttribute('list'); el.setAttribute('autocomplete', 'off'); el.setAttribute('role', 'combobox'); el.setAttribute('aria-autocomplete', 'list'); }
    const dl = document.getElementById(id); return dl ? [...dl.options].map(o => o.value).filter(Boolean) : [];
  }
  function cerrar() { if (pop) pop.remove(); pop = null; if (inp) inp.setAttribute('aria-expanded', 'false'); act = -1; }
  function pintar() {
    const q = norm(inp.value), lista = (q ? opts.filter(o => norm(o).includes(q)) : opts).slice(0, 60);
    if (!lista.length || (lista.length === 1 && lista[0] === inp.value)) { cerrar(); return; }
    if (!pop) { pop = document.createElement('div'); pop.className = 'combo-pop'; pop.setAttribute('role', 'listbox'); pop.id = 'combo-pop'; document.body.appendChild(pop); }
    act = Math.min(act, lista.length - 1);
    pop.innerHTML = lista.map((o, i) => { const k = norm(o).indexOf(q); const t = q && k >= 0 ? esc(o.slice(0, k)) + '<b>' + esc(o.slice(k, k + q.length)) + '</b>' + esc(o.slice(k + q.length)) : esc(o); return '<div class="combo-op' + (i === act ? ' on' : '') + '" role="option" data-v="' + esc(o) + '">' + t + '</div>'; }).join('');
    const r = inp.getBoundingClientRect(), abajo = window.innerHeight - r.bottom;
    pop.style.left = r.left + 'px'; pop.style.width = r.width + 'px';
    if (abajo < 220 && r.top > abajo) { pop.style.top = ''; pop.style.bottom = (window.innerHeight - r.top + 4) + 'px'; } else { pop.style.bottom = ''; pop.style.top = (r.bottom + 4) + 'px'; }
    inp.setAttribute('aria-expanded', 'true'); inp.setAttribute('aria-controls', 'combo-pop');
  }
  function elegir(v) {
    inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); cerrar();
  }
  document.addEventListener('focusin', e => {
    const el = e.target; if (!(el instanceof HTMLInputElement) || !(el.getAttribute('list') || el.dataset.combo)) return;
    inp = el; opts = fuente(el) || []; act = -1; pintar();
  });
  document.addEventListener('input', e => { if (e.target === inp && pop !== undefined && document.activeElement === inp) { act = -1; pintar(); } });
  document.addEventListener('keydown', e => {
    if (!inp || e.target !== inp) return;
    const n = pop ? pop.querySelectorAll('.combo-op').length : 0;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!pop) pintar(); act = Math.min(n - 1, act + 1); pintar(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); act = Math.max(0, act - 1); pintar(); }
    else if (e.key === 'Enter' && pop && act >= 0) { e.preventDefault(); const o = pop.querySelectorAll('.combo-op')[act]; if (o) elegir(o.dataset.v); }
    else if (e.key === 'Escape' && pop) { e.stopPropagation(); cerrar(); }
  }, true);
  document.addEventListener('mousedown', e => {
    const o = e.target.closest && e.target.closest('.combo-op');
    if (o) { e.preventDefault(); elegir(o.dataset.v); return; }
    if (pop && !pop.contains(e.target) && e.target !== inp) cerrar();
  });
  document.addEventListener('focusout', e => { if (e.target === inp) setTimeout(() => { if (document.activeElement !== inp) cerrar(); }, 120); });
  window.addEventListener('resize', cerrar);
  document.addEventListener('scroll', e => { if (pop && !(pop.contains(e.target))) cerrar(); }, true);
}
