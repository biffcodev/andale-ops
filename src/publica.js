// Página pública de una propuesta: la ve el cliente con el link privado, sin login.
// Solo puede leer esa propuesta (RPC propuesta_publica) y responderla (RPC responder_propuesta).
import './fonts.css';
import './propuesta.css';
import { createClient } from '@supabase/supabase-js';
import { propuestaHTML } from './propuesta-vista.js';
import { LOGO } from './marca.js';

const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const token = (location.pathname.match(/\/p\/([\w-]{24,})/) || [])[1] || new URLSearchParams(location.search).get('t') || '';
const css = document.createElement('style');
css.textContent = `body.pub{margin:0;background:#F5F5F6;font:15px/1.5 Inter,system-ui,sans-serif;color:#17171C}
.pub-bar{position:sticky;top:0;z-index:5;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px max(16px,calc((100vw - 760px)/2));background:rgba(245,245,246,.9);backdrop-filter:blur(8px);border-bottom:1px solid #E6E7EB}
.pub-logo{width:76px;display:block}.pub-logo svg{width:100%;height:auto;display:block}
.pub-acc{display:flex;gap:8px}
.pub-btn{border:1px solid #D5D7DD;background:#fff;border-radius:9px;padding:8px 13px;font:600 14px Inter,sans-serif;cursor:pointer;color:#17171C}
.pub-btn:hover{border-color:#8A8C95}.pub-btn.pri{background:#FC4855;border-color:#FC4855;color:#fff}
main{padding:28px 16px}
.pub-msg{max-width:760px;margin:60px auto;text-align:center;color:#6E707A}
.pub-resp{max-width:760px;margin:0 auto 64px;padding:0 16px}
.pub-card{background:#fff;border-radius:14px;padding:26px 28px;box-shadow:0 1px 0 #E6E7EB}
.pub-card h2{font-family:Delight,Inter,sans-serif;margin:0 0 6px;font-size:22px;letter-spacing:-.02em}
.pub-card p{margin:0 0 14px;color:#4A4B53}
.pub-f{display:grid;gap:10px;margin-bottom:14px}
.pub-f input,.pub-f textarea{border:1px solid #D5D7DD;border-radius:9px;padding:10px 12px;font:15px Inter,sans-serif;width:100%;box-sizing:border-box}
.pub-f input:focus,.pub-f textarea:focus{outline:none;border-color:#FC4855;box-shadow:0 0 0 3px #FFE8EA}
.pub-row{display:flex;gap:8px;flex-wrap:wrap}
.pub-ok{border-left:4px solid #2B7A55}
@media print{.pub-bar,.pub-resp{display:none}main{padding:0}body.pub{background:#fff}}`;
document.head.appendChild(css);
$('#logo').innerHTML = LOGO;

let P = null, PAL = 'propuesta', LA = 'la propuesta';
async function cargar() {
  if (!token) { $('#doc').innerHTML = '<p class="pub-msg">El link está incompleto. Pedile a àndale que te lo reenvíe.</p>'; return; }
  const { data, error } = await sb.rpc('propuesta_publica', { t: token });
  if (error || !data) { $('#doc').innerHTML = '<p class="pub-msg">Este documento no está disponible. Puede que el link haya cambiado: escribinos a hello@weareandale.com.</p>'; return; }
  P = data; const pre = P.clase === 'Presupuesto'; PAL = pre ? 'presupuesto' : 'propuesta'; LA = pre ? 'el presupuesto' : 'la propuesta';
  document.title = (P.titulo || (pre ? 'Presupuesto' : 'Propuesta')) + ' · àndale';
  $('#doc').innerHTML = propuestaHTML(P, P.marca || {});
  $('#bar').hidden = false;
  respuesta();
}
function respuesta() {
  const r = P.respuesta, box = $('#resp'); box.hidden = false;
  if (r && r.accion) {
    const t = r.accion === 'Aceptada' ? '¡Gracias! ' + LA.charAt(0).toUpperCase() + LA.slice(1) + (PAL === 'presupuesto' ? ' quedó aceptado.' : ' quedó aceptada.') : r.accion === 'Rechazada' ? 'Gracias por avisarnos.' : 'Recibimos tu consulta.';
    box.innerHTML = '<div class="pub-card pub-ok"><h2>' + esc(t) + '</h2><p>' + esc(r.accion === 'Aceptada' ? 'Te vamos a escribir para arrancar con los próximos pasos.' : 'Te respondemos a la brevedad.') + '</p></div>';
    return;
  }
  if (P.estado !== 'Enviada' && P.estado !== 'Vencida') { box.hidden = true; return; }
  box.innerHTML = '<div class="pub-card"><h2>¿Avanzamos?</h2><p>Si ' + LA + ' te cierra, ' + (PAL === 'presupuesto' ? 'aceptalo' : 'aceptala') + ' acá y coordinamos el arranque. Si tenés dudas, dejanos tu consulta.</p>' +
    '<div class="pub-f"><input id="nom" placeholder="Tu nombre" autocomplete="name"><textarea id="com" rows="3" placeholder="Comentario o consulta (opcional)"></textarea></div>' +
    '<div class="pub-row"><button class="pub-btn pri" data-r="Aceptada">Aceptar ' + PAL + '</button><button class="pub-btn" data-r="Consulta">Tengo una consulta</button><button class="pub-btn" data-r="Rechazada">No por ahora</button></div></div>';
}
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-r]');
  if (b) {
    const nombre = ($('#nom') || {}).value || '', comentario = ($('#com') || {}).value || '';
    if (!nombre.trim()) { $('#nom').focus(); $('#nom').placeholder = 'Contanos tu nombre para registrar la respuesta'; return; }
    if (b.dataset.r === 'Consulta' && !comentario.trim()) { $('#com').focus(); return; }
    b.disabled = true;
    const { error } = await sb.rpc('responder_propuesta', { t: token, accion: b.dataset.r, nombre, comentario });
    if (error) { b.disabled = false; alert('No se pudo registrar la respuesta: ' + error.message); return; }
    P.respuesta = { accion: b.dataset.r, nombre, comentario }; respuesta();
  }
  if (e.target.id === 'imp') window.print();
  if (e.target.id === 'pdf') {
    e.target.disabled = true; e.target.textContent = 'Preparando…';
    try {
      const { propuestaDoc, abrirPdf } = await import('./docs.js');
      const bytes = await propuestaDoc(P, P.marca || {});
      abrirPdf(bytes, PAL.charAt(0).toUpperCase() + PAL.slice(1) + ' ' + (P.numero || '') + ' ' + (P.cliente || ''));
    } catch (err) { alert('No se pudo generar el PDF'); }
    e.target.disabled = false; e.target.textContent = 'Descargar PDF';
  }
});
cargar();
