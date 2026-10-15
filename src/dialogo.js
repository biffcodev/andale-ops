// Modales propios para confirmar o avisar (reemplazan confirm() y alert() del navegador, que no siguen el estilo de la app).
// confirmar(texto, opciones) → Promise<boolean>; avisar(texto, opciones) → Promise<void>.
// Funcionan igual en la app, el portal del cliente y las páginas públicas: traen su propio CSS y usan los tokens de color si están.

const CSS = `
.dlg-bg{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:16px;background:color-mix(in srgb,#14141a 42%,transparent);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);animation:dlg-f .14s ease-out}
.dlg{width:min(440px,100%);background:var(--surface,#fff);color:var(--fg,#17171c);border-radius:20px;box-shadow:0 24px 64px -12px rgba(20,20,26,.35),0 2px 8px rgba(20,20,26,.08);padding:24px 24px 20px;display:grid;gap:10px;animation:dlg-u .18s cubic-bezier(.2,.9,.3,1.2);font-family:var(--f-body,Inter,system-ui,sans-serif)}
.dlg-ic{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:color-mix(in srgb,var(--dc) 14%,var(--surface,#fff));color:var(--dc)}
.dlg-ic svg{width:22px;height:22px}
.dlg h2{margin:4px 0 0;font-size:18px;line-height:1.25;font-weight:750;letter-spacing:-.01em}
.dlg p{margin:0;font-size:14.5px;line-height:1.5;color:var(--muted,#6b6d76);white-space:pre-line}
.dlg-b{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap}
.dlg-b button{font:inherit;font-size:14px;font-weight:650;border:0;border-radius:12px;padding:10px 18px;cursor:pointer;transition:filter .12s,background .12s}
.dlg-no{background:var(--surface-2,#f1f1f4);color:var(--fg,#17171c)}
.dlg-no:hover{filter:brightness(.96)}
.dlg-si{background:var(--dc);color:#fff}
.dlg-si:hover{filter:brightness(1.06)}
.dlg-b button:focus-visible{outline:2px solid var(--dc);outline-offset:2px}
@keyframes dlg-f{from{opacity:0}}
@keyframes dlg-u{from{opacity:0;transform:translateY(8px) scale(.98)}}
@media (max-width:520px){.dlg-bg{align-items:end;padding:10px}.dlg{border-radius:20px}.dlg-b button{flex:1}}
`;
const ICONOS = {
  pregunta: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M9.3 9.2a2.8 2.8 0 0 1 5.4 1c0 1.9-2.7 2.5-2.7 4"/><path d="M12 17.3h.01"/></svg>',
  peligro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4h6v3"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>',
  enviar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3 10 14"/><path d="M21 3l-7 18-4-7-7-4z"/></svg>',
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 11v6"/><path d="M12 7.5h.01"/></svg>',
  error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9.5"/><path d="M12 7v6"/><path d="M12 16.5h.01"/></svg>',
};
const COLOR = { pregunta: 'var(--accent,#FF595E)', peligro: 'var(--crit,#E5484D)', mail: 'var(--accent,#FF595E)', enviar: 'var(--accent,#FF595E)', info: 'var(--s-curso,#3399CC)', error: 'var(--crit,#E5484D)' };
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let listo = false;
function css() { if (listo || typeof document === 'undefined') return; const s = document.createElement('style'); s.textContent = CSS; document.head.appendChild(s); listo = true; }

// Si el texto empieza con una pregunta corta, esa va de título y el resto de detalle.
function partir(texto) {
  const t = String(texto || '').trim();
  const m = t.match(/^(¿[^?]{3,140}\?)\s*([\s\S]*)$/);
  if (m) return [m[1], m[2]];
  const p = t.match(/^([^.?!\n]{3,90}[.:])\s+([\s\S]+)$/);
  if (p && p[2].length > 20) return [p[1].replace(/[.:]$/, ''), p[2]];
  return [t, ''];
}

function abrir({ titulo, texto, ok, no, tipo }) {
  css();
  return new Promise(resolve => {
    const prev = document.activeElement;
    const bg = document.createElement('div');
    bg.className = 'dlg-bg';
    bg.innerHTML = '<div class="dlg" role="' + (no ? 'alertdialog' : 'dialog') + '" aria-modal="true" aria-labelledby="dlg-t" aria-describedby="dlg-p" style="--dc:' + COLOR[tipo] + '">' +
      '<span class="dlg-ic" aria-hidden="true">' + ICONOS[tipo] + '</span><h2 id="dlg-t">' + esc(titulo) + '</h2>' + (texto ? '<p id="dlg-p">' + esc(texto) + '</p>' : '') +
      '<div class="dlg-b">' + (no ? '<button type="button" class="dlg-no">' + esc(no) + '</button>' : '') + '<button type="button" class="dlg-si">' + esc(ok) + '</button></div></div>';
    const fin = v => { document.removeEventListener('keydown', key, true); bg.remove(); try { prev && prev.focus && prev.focus(); } catch (e) { /* nada */ } resolve(v); };
    const key = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fin(false); }
      else if (e.key === 'Tab') { const bs = [...bg.querySelectorAll('button')]; const i = bs.indexOf(document.activeElement); e.preventDefault(); bs[(i + (e.shiftKey ? -1 : 1) + bs.length) % bs.length].focus(); }
    };
    bg.addEventListener('click', e => { if (e.target === bg) fin(false); else if (e.target.closest('.dlg-si')) fin(true); else if (e.target.closest('.dlg-no')) fin(false); });
    document.addEventListener('keydown', key, true);
    document.body.appendChild(bg);
    // En borrados, el foco arranca en "Cancelar" para que un Enter distraído no borre nada.
    (bg.querySelector(tipo === 'peligro' ? '.dlg-no' : '.dlg-si') || bg.querySelector('button')).focus();
  });
}

const PELIGRO = /^\s*¿?\s*(borrar|eliminar|desconectar|vaciar)|se borra|no se puede deshacer|última confirmación/i;
/** Pide confirmación. o = { titulo, ok, no, tipo: 'pregunta'|'peligro'|'mail'|'enviar' } */
export function confirmar(texto, o = {}) {
  const [t, d] = o.titulo ? [o.titulo, texto] : partir(texto);
  const tipo = o.tipo || (PELIGRO.test(texto) ? 'peligro' : 'pregunta');
  const ok = o.ok || (tipo === 'peligro' ? (/desconectar/i.test(texto) ? 'Desconectar' : /última confirmación/i.test(texto) ? 'Sí, borrar todo' : 'Borrar') : 'Sí, seguir');
  return abrir({ titulo: t, texto: d, ok, no: o.no || 'Cancelar', tipo });
}
/** Aviso con un solo botón. */
export function avisar(texto, o = {}) {
  const [t, d] = o.titulo ? [o.titulo, texto] : partir(texto);
  return abrir({ titulo: t, texto: d, ok: o.ok || 'Entendido', no: null, tipo: o.tipo || 'info' }).then(() => undefined);
}
