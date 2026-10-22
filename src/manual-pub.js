// Página pública del manual de marca: /m/<link>. Sin login; solo se ve si el manual está publicado (RPC manual_marca, SQL 0045).
import { createClient } from '@supabase/supabase-js';
import { manualHTML, MANUAL_CSS, cargarFuentesManual } from './manual-vista.js';
import { kitDeTexto } from './kitmarca.js';

const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const doc = document.getElementById('doc');
const slug = (location.pathname.match(/\/m\/([\w-]{4,})/) || [])[1] || new URLSearchParams(location.search).get('m') || '';
const css = document.createElement('style'); css.textContent = MANUAL_CSS; document.head.appendChild(css);
const msg = t => { doc.innerHTML = '<p class="mm-msg">' + t + '</p>'; };

async function cargar() {
  if (!slug) { msg('Falta el link del manual.'); return; }
  const { data, error } = await sb.rpc('manual_marca', { p_slug: slug });
  if (error || !data) { msg('Este manual no existe o todavía no está publicado.'); return; }
  document.title = (data.marca && data.marca.manual && data.marca.manual.version === 'simple' ? 'Guía de marca' : 'Manual de marca') + ' · ' + data.nombre;
  cargarFuentesManual(kitDeTexto(data.marca || {}));
  doc.innerHTML = manualHTML(data);
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-copiar]'); if (!b) return;
  try { await navigator.clipboard.writeText(b.dataset.copiar); const o = b.querySelector('.mm-cn'); if (o) { const t = o.textContent; o.textContent = 'Copiado ' + b.dataset.copiar; setTimeout(() => { o.textContent = t; }, 1200); } } catch (er) { /* sin portapapeles */ }
});
cargar();
