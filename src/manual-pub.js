// Página pública del manual de marca: /m/<link>. Sin login; solo se ve si el manual está publicado (RPC manual_marca, SQL 0045).
// /m/previa: lo que abre "Ver como cliente" desde la app con un manual sin publicar (los datos los deja la app en este navegador).
import { createClient } from '@supabase/supabase-js';
import { manualHTML, MANUAL_CSS, cargarFuentesManual, activarManual } from './manual-vista.js';
import { kitDeTexto } from './kitmarca.js';

const doc = document.getElementById('doc');
const slug = (location.pathname.match(/\/m\/([\w-]{4,})/) || [])[1] || new URLSearchParams(location.search).get('m') || '';
const css = document.createElement('style'); css.textContent = MANUAL_CSS + `
.mm-aviso{position:fixed;left:16px;bottom:16px;z-index:50;max-width:calc(100vw - 32px);background:#141414;color:#fff;font:600 13px Inter,system-ui,sans-serif;padding:9px 16px;border-radius:99px;box-shadow:0 10px 30px -10px rgba(0,0,0,.5);animation:mmAviso 6s forwards}
@keyframes mmAviso{0%,80%{opacity:1}100%{opacity:0;visibility:hidden}}`;
document.head.appendChild(css);
const msg = t => { doc.innerHTML = '<p class="mm-msg">' + t + '</p>'; };

function pintar(data, previa) {
  document.title = (data.marca && data.marca.manual && data.marca.manual.version === 'simple' ? 'Guía de marca' : 'Manual de marca') + ' · ' + data.nombre;
  cargarFuentesManual(kitDeTexto(data.marca || {}));
  doc.innerHTML = manualHTML(data) + (previa ? '<div class="mm-aviso">Vista previa · así lo va a ver el cliente cuando lo publiques</div>' : '');
  activarManual(doc);
}
async function cargar() {
  if (slug === 'previa') {
    let d = null; try { d = JSON.parse(localStorage.getItem('mm-previa') || 'null'); } catch (e) { d = null; }
    if (!d) { msg('Abrí la vista previa desde la app (Kit de marca → Ver como cliente).'); return; }
    pintar(d, true); return;
  }
  if (!slug) { msg('Falta el link del manual.'); return; }
  const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
  const { data, error } = await sb.rpc('manual_marca', { p_slug: slug });
  if (error || !data) { msg('Este manual no existe o todavía no está publicado.'); return; }
  pintar(data, false);
}
cargar();
