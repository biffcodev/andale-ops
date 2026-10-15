// Portal de clientes de àndale: cada contacto con acceso entra con su email (link mágico, sin contraseña)
// y ve solo lo de su empresa que el equipo marcó como visible: redes del mes para aprobar, proyectos y entregas,
// la ficha de su web, sus tickets, los informes de redes y (si recibe cobros) su estado de cuenta.
// No hay acceso directo a tablas: todo pasa por las funciones portal_* de la base (ver 0016).
import './fonts.css';
import './style.css';
import './portal.css';
import { LOGO, ISO } from './marca.js';
import { iconizar, ICON } from './iconos.js';
import { informeVista } from './informe-vista.js';
import { sb, configured } from './data.js';
import { confirmar } from './dialogo.js';

const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mesTxt = m => { const [y, mm] = String(m).slice(0, 7).split('-'); return MESES[+mm - 1] + ' ' + y; };
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const fecha = d => { if (!d) return ''; const [y, m, dd] = String(d).slice(0, 10).split('-'); return dd + '/' + m + '/' + y; };
const corta = d => { if (!d) return ''; const x = new Date(String(d).slice(0, 10) + 'T12:00'); return x.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }); };
const plata = (n, m) => { try { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: m || 'ARS', maximumFractionDigits: 0 }).format(+n || 0); } catch (e) { return (m || '') + ' ' + n; } };
const IMG = /\.(jpe?g|png|gif|webp|heic)$/i;
const ESTADO_CLI = { 'Para el cliente': ['Para aprobar', '--s-revision'], 'Cambios': ['Pediste cambios', '--s-cancelado'], 'Aprobada': ['Aprobada', '--s-entregado'], 'Programada': ['Programada', '--s-presup'], 'Publicada': ['Publicada', '--s-entregado'] };
const pz = e => { const [l, c] = ESTADO_CLI[e] || [e, '--muted']; return '<span class="pzst" style="--c:var(' + c + ')">' + esc(l) + '</span>'; };
const S = { yo: null, clientes: [], c: null, d: null, tab: 'inicio', mes: null, archivos: {}, pidiendo: new Set(), vista: 'lista', busy: false };

let toastT; function toast(m) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 3200); }
const check = r => { if (r.error) throw new Error(/No tenés acceso/.test(r.error.message) ? r.error.message : r.error.message.replace(/^.*?: /, '')); return r.data; };

/* ---------- Entrar ---------- */
function login(msg) {
  $('#top').hidden = true; $('#tabs').hidden = true;
  $('#view').innerHTML = '<div class="login"><div class="login-card po-login"><span class="po-logo big">' + LOGO + '</span><h1>Portal de clientes</h1><p>Entrá con tu email. Te mandamos un link para ingresar, sin contraseña.</p>' +
    '<form id="login"><input class="in" type="email" required autocomplete="email" placeholder="tu@empresa.com" aria-label="Email"><button class="btn primary" type="submit">Enviarme el link</button></form><p id="login-msg" class="muted" role="status">' + esc(msg || '') + '</p></div></div>';
}
function sinAcceso(email) {
  $('#top').hidden = true; $('#tabs').hidden = true;
  $('#view').innerHTML = '<div class="login"><div class="login-card po-login"><span class="po-logo big">' + LOGO + '</span><h1>Tu email todavía no tiene acceso</h1><p>Entraste como <b>' + esc(email || '') + '</b>. Pedile a tu contacto en àndale que te habilite el portal con este email.</p><button class="btn" data-act="salir">Probar con otro email</button></div></div>';
}
async function arrancar() {
  let r;
  try { r = check(await sb.rpc('portal_yo')); } catch (e) { login(e.message); return; }
  S.yo = r; S.clientes = r.clientes || [];
  if (!S.clientes.length) { sinAcceso(r.email); return; }
  const prev = (() => { try { return localStorage.getItem('po-cli'); } catch (e) { return null; } })();
  S.c = S.clientes.find(c => c.cliente_id === prev) || S.clientes[0];
  await cargar();
}
async function cargar(silencio) {
  try { S.d = check(await sb.rpc('portal_datos', { p_cliente: S.c.cliente_id })); }
  catch (e) { if (!silencio) toast(e.message); return; }
  const ms = S.d.meses || [];
  if (!S.mes || !ms.some(m => m.id === S.mes)) S.mes = (ms.find(m => m.mes.slice(0, 7) === new Date().toISOString().slice(0, 7)) || ms[0] || {}).id || null;
  pedirArchivos();
  render();
}
// Miniaturas y links de Dropbox (de a lotes; las URLs duran unas horas).
async function pedirArchivos() {
  const items = [];
  (S.d.meses || []).filter(m => m.id === S.mes).forEach(m => m.piezas.forEach(z => { if (z.artes && !S.archivos[z.id] && !S.pidiendo.has(z.id)) items.push({ entidad: 'pieza', id: z.id }); }));
  (S.d.proyectos || []).forEach(p => (p.entregas || []).forEach(e => { if (e.archivos && !S.archivos[e.id] && !S.pidiendo.has(e.id)) items.push({ entidad: 'entrega', id: e.id }); }));
  if (!items.length) return;
  items.forEach(i => S.pidiendo.add(i.id));
  for (let i = 0; i < items.length; i += 30) {
    try { const { data } = await sb.functions.invoke('dropbox', { body: { accion: 'portal', items: items.slice(i, i + 30) } }); Object.assign(S.archivos, (data && data.items) || {}); render(); }
    catch (e) { /* sin Dropbox: se ven sin miniaturas */ }
  }
}

/* ---------- Pantallas ---------- */
const TABS = () => [['inicio', 'Inicio'], ...(S.d.meses.length ? [['redes', 'Redes']] : []), ...(S.d.proyectos.length ? [['proyectos', 'Proyectos']] : []), ['tickets', 'Pedidos'], ...(S.d.informes.length ? [['informes', 'Informes']] : []), ...(S.d.cuenta ? [['cuenta', 'Mi cuenta']] : [])];
function render() {
  if (!S.d) return;
  const c = S.d.cliente;
  $('#top').hidden = false; $('#tabs').hidden = false;
  $('#logo').innerHTML = LOGO;
  $('#cli').innerHTML = (c.avatar ? '<img src="' + esc(c.avatar) + '" alt="">' : '<span class="po-ini">' + esc(c.nombre.slice(0, 2).toUpperCase()) + '</span>') +
    (S.clientes.length > 1 ? '<select class="in sm" id="po-cl" aria-label="Empresa">' + S.clientes.map(x => '<option value="' + esc(x.cliente_id) + '"' + (x.cliente_id === S.c.cliente_id ? ' selected' : '') + '>' + esc(x.cliente) + '</option>').join('') + '</select>' : '<b>' + esc(c.nombre) + '</b>');
  $('#me').textContent = (S.d.yo && S.d.yo.nombre) || S.yo.email;
  const tabs = TABS(); if (!tabs.some(t => t[0] === S.tab)) S.tab = 'inicio';
  const nAprobar = (S.d.meses || []).reduce((a, m) => a + m.piezas.filter(z => z.estado === 'Para el cliente').length, 0) + (S.d.proyectos || []).reduce((a, p) => a + p.entregas.filter(e => e.estado === 'Enviada').length, 0);
  $('#tabs').innerHTML = tabs.map(([k, l]) => '<button data-act="tab" data-t="' + k + '"' + (S.tab === k ? ' aria-current="page"' : '') + '>' + l + (k === 'inicio' && nAprobar ? ' <span class="po-n">' + nAprobar + '</span>' : '') + '</button>').join('');
  const V = { inicio: vInicio, redes: vRedes, proyectos: vProyectos, tickets: vTickets, informes: vInformes, cuenta: vCuenta }[S.tab];
  $('#view').innerHTML = V();
  $('#foot').innerHTML = '<span class="po-iso">' + ISO + '</span><a href="https://weareandale.com" target="_blank" rel="noopener">weareandale.com</a>';
}
function vInicio() {
  const nom = ((S.d.yo && S.d.yo.nombre) || '').split(' ')[0];
  const piezas = (S.d.meses || []).flatMap(m => m.piezas.filter(z => z.estado === 'Para el cliente').map(z => ({ z, m })));
  const entregas = (S.d.proyectos || []).flatMap(p => p.entregas.filter(e => e.estado === 'Enviada').map(e => ({ e, p })));
  const tks = (S.d.pedidos || []).filter(t => !['Hecho', 'Descartado'].includes(t.estado));
  const inf = (S.d.informes || [])[0];
  let h = '<section class="po-hero"><h1>Hola' + (nom ? ', ' + esc(nom) : '') + '</h1><p>' + (piezas.length || entregas.length ? 'Tenés cosas para revisar. Aprobá o pedí cambios desde acá: nos llega al instante.' : 'Está todo al día. Si necesitás algo, cargá un pedido y lo vemos.') + '</p>' +
    '<div class="po-hq"><button class="btn primary" data-act="tab" data-t="tickets">+ Nuevo pedido</button>' + (S.d.meses.length ? '<button class="btn" data-act="tab" data-t="redes">Ver las redes del mes</button>' : '') + '</div></section>';
  if (piezas.length) h += '<section class="po-sec"><div class="po-sh"><h2>Para aprobar en redes</h2><button class="btn ghost sm" data-act="tab" data-t="redes">Ver todo →</button></div><div class="po-mini">' + piezas.slice(0, 6).map(({ z }) => miniPieza(z)).join('') + '</div></section>';
  if (entregas.length) h += '<section class="po-sec"><div class="po-sh"><h2>Entregas para revisar</h2></div>' + entregas.map(({ e, p }) => '<button class="po-row" data-act="irProy" data-id="' + esc(p.id) + '"><b>' + esc(p.nombre) + ' · ' + esc(e.titulo) + '</b><span>Enviada el ' + fecha(e.enviada_at) + '</span></button>').join('') + '</section>';
  if ((S.d.proyectos || []).length) h += '<section class="po-sec"><div class="po-sh"><h2>Proyectos</h2></div><div class="po-pcs">' + S.d.proyectos.map(p => proyCard(p)).join('') + '</div></section>';
  if (tks.length) h += '<section class="po-sec"><div class="po-sh"><h2>Tus pedidos abiertos</h2><button class="btn ghost sm" data-act="tab" data-t="tickets">Ver todos →</button></div>' + tks.slice(0, 5).map(t => '<div class="po-row"><b>#' + t.numero + ' · ' + esc(t.titulo) + '</b><span>' + esc(t.estado) + '</span></div>').join('') + '</section>';
  if (inf) h += '<section class="po-sec"><div class="po-sh"><h2>Último informe: ' + esc(cap(mesTxt(inf.mes))) + '</h2><button class="btn ghost sm" data-act="tab" data-t="informes">Ver →</button></div><p class="muted">' + esc(String(inf.texto || '').slice(0, 260)) + '…</p></section>';
  return h;
}
function arteDe(id) { return ((S.archivos[id] || {}).archivos || []); }
function miniPieza(z) {
  const a = arteDe(z.id)[0];
  return '<button class="po-pz" data-act="pieza" data-id="' + esc(z.id) + '">' + (a && a.miniatura ? '<img src="' + esc(a.miniatura) + '" alt="">' : '<span class="po-ph">' + esc(z.formato) + '</span>') + '<span class="po-pzt"><b>' + esc(z.tema || z.formato) + '</b><span>' + esc(corta(z.fecha)) + (z.hora ? ' · ' + esc(z.hora) : '') + '</span></span></button>';
}
function proyCard(p) {
  const pct = p.avance == null ? null : +p.avance;
  return '<button class="po-pc" data-act="irProy" data-id="' + esc(p.id) + '"><span class="po-pct">' + esc(p.tipo || 'Proyecto') + '</span><b>' + esc(p.nombre) + '</b>' + (pct != null ? '<span class="po-bar"><i style="width:' + pct + '%"></i></span><span class="muted">' + pct + '% · ' + esc(p.etapa || p.estado) + '</span>' : '<span class="muted">' + esc(p.estado) + '</span>') + (p.entrega ? '<span class="muted">Entrega estimada: ' + fecha(p.entrega) + '</span>' : '') + '</button>';
}

function vRedes() {
  const ms = S.d.meses || [];
  if (!ms.length) return '<section class="po-sec"><p class="muted">Todavía no hay contenido para revisar.</p></section>';
  const m = ms.find(x => x.id === S.mes) || ms[0];
  const ps = m.piezas, pend = ps.filter(z => z.estado === 'Para el cliente').length;
  const plan = Object.entries(m.plan || {}).map(([f, n]) => n + ' ' + f.toLowerCase()).join(' · ');
  let h = '<section class="po-sec"><div class="po-sh"><div><h1>Redes · ' + esc(cap(mesTxt(m.mes))) + '</h1><p class="muted">' + (plan ? 'Tu plan: ' + esc(plan) + '. ' : '') + ps.length + ' piezas para ver' + (m.aprobado_at ? ' · ✓ Aprobaste el mes el ' + fecha(m.aprobado_at) : '') + '</p></div>' +
    (ms.length > 1 ? '<select class="in" id="po-mes" aria-label="Mes">' + ms.map(x => '<option value="' + esc(x.id) + '"' + (x.id === m.id ? ' selected' : '') + '>' + esc(cap(mesTxt(x.mes))) + '</option>').join('') + '</select>' : '') + '</div>' +
    '<div class="po-bar2"><div class="seg">' + [['lista', 'Lista'], ['feed', 'Así queda el feed'], ['calendario', 'Calendario']].map(([k, l]) => '<button data-act="vista" data-v="' + k + '" aria-pressed="' + (S.vista === k) + '">' + l + '</button>').join('') + '</div>' +
    (pend ? '<button class="btn primary" data-act="aprobarMes" data-id="' + esc(m.id) + '">' + (pend === 1 ? 'Aprobar la pieza pendiente' : 'Aprobar las ' + pend + ' piezas pendientes') + '</button>' : '') + '</div>';
  if (!ps.length) return h + '<p class="muted">Todavía no hay piezas para revisar este mes.</p></section>';
  if (S.vista === 'feed') {
    const pubs = ps.filter(z => !/histori/i.test(z.formato)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    h += '<div class="rm-feed po-feed">' + pubs.map(z => { const a = arteDe(z.id)[0]; return '<button class="rm-fi" data-act="pieza" data-id="' + esc(z.id) + '">' + (a && a.miniatura ? '<img src="' + esc(a.miniatura) + '" alt="">' : '<span class="rm-fph"><b>' + esc(z.formato) + '</b>' + esc(z.tema) + '</span>') + '<span class="rm-fe2">' + (z.fecha ? '<span class="rm-fd">' + esc(fecha(z.fecha).slice(0, 5)) + '</span>' : '<span></span>') + pz(z.estado) + '</span></button>'; }).join('') + '</div>';
  } else if (S.vista === 'calendario') {
    const dias = [...new Set(ps.map(z => z.fecha).filter(Boolean))].sort();
    h += dias.map(d => '<div class="po-dia"><h3>' + esc(cap(corta(d))) + '</h3>' + ps.filter(z => z.fecha === d).map(fichaPieza).join('') + '</div>').join('') + (ps.some(z => !z.fecha) ? '<div class="po-dia"><h3>Sin fecha</h3>' + ps.filter(z => !z.fecha).map(fichaPieza).join('') + '</div>' : '');
  } else h += '<div class="po-pzs">' + [...ps].sort((a, b) => (a.estado === 'Para el cliente' ? 0 : 1) - (b.estado === 'Para el cliente' ? 0 : 1) || (a.fecha || '9').localeCompare(b.fecha || '9')).map(fichaPieza).join('') + '</div>';
  return h + '</section>';
}
function fichaPieza(z) {
  const as = arteDe(z.id), a = as[0], coms = (S.d.comentarios || []).filter(c => c.entidad === 'pieza' && c.entidad_id === z.id);
  return '<article class="po-card' + (z.estado === 'Para el cliente' ? ' pend' : '') + '" id="pz-' + esc(z.id) + '"><div class="po-art">' + (a ? (a.miniatura ? '<img src="' + esc(a.miniatura) + '" alt="">' : '<span class="po-ph">' + (/\.(mp4|mov|m4v|webm)$/i.test(a.path) ? '▶ Video' : 'Archivo') + '</span>') : '<span class="po-ph">' + esc(z.formato) + '</span>') +
    (as.length ? '<span class="po-arts">' + as.map(x => x.link ? '<a href="' + esc(x.link) + '" target="_blank" rel="noopener">' + (IMG.test(x.path) ? 'Ver imagen' : /\.(mp4|mov|m4v|webm)$/i.test(x.path) ? 'Ver video' : 'Abrir') + ' ↗</a>' : '').join('') + '</span>' : '') + '</div>' +
    '<div class="po-cb"><div class="po-cm"><b>' + esc(z.formato) + '</b> · ' + esc(z.red) + (z.fecha ? ' · ' + esc(corta(z.fecha)) : '') + (z.hora ? ' ' + esc(z.hora) : '') + pz(z.estado) + '</div>' +
    (z.tema ? '<h3>' + esc(z.tema) + '</h3>' : '') + (z.copy ? '<p class="po-copy">' + esc(z.copy) + '</p>' : '') + (z.hashtags ? '<p class="po-tags">' + esc(z.hashtags) + '</p>' : '') +
    (z.respuesta ? '<p class="po-resp">' + (z.estado === 'Cambios' ? 'Pediste: ' : 'Tu comentario: ') + esc(z.respuesta) + '</p>' : '') +
    (['Para el cliente', 'Cambios', 'Aprobada'].includes(z.estado) ? '<div class="po-acc"><button class="btn primary sm" data-act="aprobar" data-e="pieza" data-id="' + esc(z.id) + '"' + (z.estado === 'Aprobada' ? ' disabled' : '') + '>' + (z.estado === 'Aprobada' ? '✓ Aprobada' : 'Aprobar') + '</button><button class="btn sm" data-act="cambios" data-e="pieza" data-id="' + esc(z.id) + '">Pedir cambios</button></div>' : '') +
    hiloHtml('pieza', z.id, coms) + '</div></article>';
}
function hiloHtml(entidad, id, coms, etiqueta) {
  return '<details class="po-hilo"' + (coms.length ? ' open' : '') + '><summary>' + (coms.length ? coms.length + ' comentario' + (coms.length > 1 ? 's' : '') : (etiqueta || 'Comentar')) + '</summary>' +
    coms.map(c => '<div class="po-c' + (c.de_cliente ? ' yo' : '') + '"><b>' + esc(c.autor || (c.de_cliente ? 'Vos' : 'àndale')) + '</b><span>' + esc(c.texto) + '</span><small>' + esc(fecha(c.created_at)) + '</small></div>').join('') +
    '<form class="po-cf" data-com="' + esc(entidad) + '" data-id="' + esc(id) + '"><textarea class="in" rows="2" placeholder="Escribí un comentario para el equipo" aria-label="Comentario"></textarea><button class="btn sm">Enviar</button></form></details>';
}
function vProyectos() {
  const ps = S.d.proyectos || [];
  return '<section class="po-sec"><h1>Proyectos</h1>' + ps.map(p => {
    const s = p.sitio;
    return '<article class="po-proy" id="py-' + esc(p.id) + '"><div class="po-ph2"><div><span class="po-pct">' + esc(p.tipo || 'Proyecto') + '</span><h2>' + esc(p.nombre) + '</h2></div>' + (p.avance != null ? '<span class="po-ring"><b>' + p.avance + '%</b><span>' + esc(p.etapa || p.estado) + '</span></span>' : '<span class="muted">' + esc(p.estado) + '</span>') + '</div>' +
      (p.entrega ? '<p class="muted">Entrega estimada: ' + fecha(p.entrega) + '</p>' : '') +
      (p.entregas.length ? '<h3>Entregas</h3>' + p.entregas.map(e => entregaHtml(e)).join('') : '') +
      (s ? sitioHtml(s) : '') + hiloHtml('proyecto', p.id, (S.d.comentarios || []).filter(c => c.entidad === 'proyecto' && c.entidad_id === p.id), 'Escribirle al equipo sobre este proyecto') + '</article>';
  }).join('') + '</section>';
}
function entregaHtml(e) {
  const as = arteDe(e.id), coms = (S.d.comentarios || []).filter(c => c.entidad === 'entrega' && c.entidad_id === e.id);
  const est = { Enviada: ['Para revisar', '--s-revision'], Cambios: ['Pediste cambios', '--s-cancelado'], Aprobada: ['Aprobada', '--s-entregado'] }[e.estado] || [e.estado, '--muted'];
  return '<div class="po-ent"><div class="po-cm"><b>' + esc(e.tipo) + '</b> · ' + esc(e.titulo) + ' <span class="pzst" style="--c:var(' + est[1] + ')">' + esc(est[0]) + '</span></div>' +
    (e.descripcion ? '<p>' + esc(e.descripcion) + '</p>' : '') +
    ((e.links || []).length || as.length ? '<div class="po-links">' + (e.links || []).map(l => '<a class="btn sm" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.nombre || 'Ver') + ' ↗</a>').join('') + as.map(a => a.link ? '<a class="btn sm" href="' + esc(a.link) + '" target="_blank" rel="noopener">' + esc(a.nombre) + ' ↓</a>' : '').join('') + '</div>' : '') +
    (as.some(a => a.miniatura) ? '<div class="po-thumbs">' + as.filter(a => a.miniatura).map(a => '<img src="' + esc(a.miniatura) + '" alt="">').join('') + '</div>' : '') +
    (e.respuesta ? '<p class="po-resp">' + (e.estado === 'Cambios' ? 'Pediste: ' : 'Tu comentario: ') + esc(e.respuesta) + '</p>' : '') +
    (e.estado === 'Aprobada' ? '<p class="po-ok">✓ Aprobada por ' + esc(e.aprobado_por || 'vos') + ' el ' + fecha(e.respondida_at) + '</p>' : '<div class="po-acc"><button class="btn primary sm" data-act="aprobar" data-e="entrega" data-id="' + esc(e.id) + '">Aprobar</button><button class="btn sm" data-act="cambios" data-e="entrega" data-id="' + esc(e.id) + '">Pedir cambios</button></div>') +
    hiloHtml('entrega', e.id, coms) + '</div>';
}
function sitioHtml(s) {
  const cl = s.checklist || [];
  return '<div class="po-sitio"><h3>Tu sitio web</h3><div class="po-links">' + (s.url_preview ? '<a class="btn sm primary" href="' + esc(s.url_preview) + '" target="_blank" rel="noopener">Ver la versión de prueba ↗</a>' : '') + (s.url_prod ? '<a class="btn sm" href="' + esc(s.url_prod) + '" target="_blank" rel="noopener">Sitio publicado ↗</a>' : '') + '</div>' +
    (s.etapa ? '<p class="muted">Etapa: ' + esc(s.etapa) + '</p>' : '') +
    (cl.length ? '<h4>Lo que falta</h4><div class="po-check">' + cl.map((x, i) => '<label class="chk' + (x.de === 'cliente' ? '' : ' nuestro') + '"><input type="checkbox" data-chk="' + esc(s.id) + '" data-i="' + i + '"' + (x.ok ? ' checked' : '') + (x.de === 'cliente' ? '' : ' disabled') + '> <span>' + esc(x.n) + ' <small class="muted">' + (x.de === 'cliente' ? '· te toca a vos' : '· lo hace àndale') + '</small></span></label>').join('') + '</div>' : '') +
    (s.accesos ? '<p class="muted po-acc-n">🔒 ' + esc(s.accesos) + '</p>' : '') + '</div>';
}
function vTickets() {
  const ts = S.d.pedidos || [];
  return '<section class="po-sec"><h1>Pedidos</h1><p class="muted">Para cambios chicos y pedidos puntuales: un ajuste en la web, una pieza extra, subir algo. Te avisamos acá cuando esté.</p>' +
    '<form id="po-tk" class="po-form"><div class="field full"><label for="tk-t">¿Qué necesitás?</label><input id="tk-t" required maxlength="200" placeholder="Ej.: Cambiar el horario de atención en la web"></div>' +
    '<div class="field full"><label for="tk-d">Detalle (opcional)</label><textarea id="tk-d" rows="3" placeholder="Todo lo que nos ayude: textos, links, a dónde va"></textarea></div>' +
    '<div class="field"><label for="tk-p">¿Para cuándo? (opcional)</label><input id="tk-p" type="date"></div><div class="field" style="align-self:end"><button class="btn primary">Enviar pedido</button></div></form>' +
    (ts.length ? '<div class="po-tks">' + ts.map(t => '<article class="po-tkc"><div class="po-cm"><b>#' + t.numero + '</b> · ' + esc(fecha(t.created_at)) + ' <span class="pzst" style="--c:var(' + ({ Nuevo: '--s-revision', 'En curso': '--s-curso', 'Esperando al cliente': '--s-confirmar', Hecho: '--s-entregado', Descartado: '--s-empezar' }[t.estado] || '--muted') + ')">' + esc(t.estado === 'Esperando al cliente' ? 'Esperamos tu respuesta' : t.estado) + '</span></div><h3>' + esc(t.titulo) + '</h3>' + (t.detalle ? '<p>' + esc(t.detalle) + '</p>' : '') + (t.respuesta ? '<p class="po-resp ok">àndale: ' + esc(t.respuesta) + '</p>' : '') + (t.cobro && t.cobro !== 'A definir' ? '<p class="muted" style="font-size:13px">' + esc(t.cobro === 'A facturar' ? 'Se suma al próximo resumen de cuenta' : t.cobro === 'Incluido en el abono' ? 'Incluido en tu abono' : 'Sin cargo') + '</p>' : '') + hiloHtml('pedido', t.id, (S.d.comentarios || []).filter(c => c.entidad === 'pedido' && c.entidad_id === t.id)) + '</article>').join('') + '</div>' : '') + '</section>';
}
// Informes: el último abierto con todo su color; los anteriores en una lista para abrir. Cada uno se baja en PDF.
const mesDeInforme = i => (S.d.meses || []).find(m => String(m.mes).slice(0, 7) === String(i.mes).slice(0, 7));
function vInformes() {
  const is = S.d.informes || [], sel = is.find(i => i.id === S.inf) || is[0];
  if (!sel) return '<section class="po-sec"><h1>Informes de redes</h1><p class="muted">Todavía no hay informes.</p></section>';
  const btn = '<button type="button" class="btn" data-act="infPdf" data-id="' + esc(sel.id) + '">' + ICON.descargar + 'Descargar PDF</button>';
  return '<section class="po-sec po-infs">' + (is.length > 1 ? '<div class="po-inf-meses" role="tablist" aria-label="Elegí el mes">' + is.map(i => '<button role="tab" data-act="infVer" data-id="' + esc(i.id) + '" aria-selected="' + (i === sel) + '">' + esc(cap(mesTxt(i.mes))) + '</button>').join('') + '</div>' : '') +
    informeVista({ inf: sel, cliente: S.d.cliente.nombre, mesLabel: mesTxt(sel.mes), piezas: (mesDeInforme(sel) || {}).piezas, descargar: btn }) + '</section>';
}
function vCuenta() {
  const c = S.d.cuenta || {}, fs = c.facturas || [], rs = c.resumenes || [];
  const deuda = {}; fs.forEach(f => { if (+f.saldo > 0.009) deuda[f.moneda] = (deuda[f.moneda] || 0) + +f.saldo; });
  return '<section class="po-sec"><h1>Mi cuenta</h1>' + (Object.keys(deuda).length ? '<div class="po-deuda">Saldo pendiente: <b>' + Object.entries(deuda).map(([m, n]) => plata(n, m)).join(' · ') + '</b></div>' : '<div class="po-deuda ok">✓ No tenés saldo pendiente.</div>') +
    (rs.length ? '<h2>Resúmenes de cuenta</h2><div class="po-tbl">' + rs.map(r => '<div class="po-tr"><span>' + esc(cap(mesTxt(r.periodo))) + (r.numero ? ' · ' + esc(r.numero) : '') + '</span><b>' + plata(r.total, r.moneda) + '</b>' + (r.link_pdf ? '<a href="' + esc(r.link_pdf) + '" target="_blank" rel="noopener">PDF ↗</a>' : '<span></span>') + '</div>').join('') + '</div>' : '') +
    (fs.length ? '<h2>Facturas</h2><div class="po-tbl">' + fs.map(f => '<div class="po-tr"><span>' + esc(f.tipo === 'Invoice' ? 'Invoice' : 'Factura') + ' ' + esc(f.numero || '') + ' · ' + fecha(f.fecha) + '</span><b>' + plata(f.monto, f.moneda) + '</b>' + (+f.saldo > 0.009 ? '<span class="po-sal">Pendiente ' + plata(f.saldo, f.moneda) + '</span>' : '<span class="po-pag">Pagada</span>') + (f.link_pdf ? '<a href="' + esc(f.link_pdf) + '" target="_blank" rel="noopener">PDF ↗</a>' : '') + '</div>').join('') + '</div>' : '') + '</section>';
}

/* ---------- Acciones ---------- */
function pedirTexto(titulo, ayuda, cb) {
  $('#panel').innerHTML = '<form id="po-txt" style="display:contents"><div class="panel-h"><div><h2 id="panel-title">' + esc(titulo) + '</h2></div><button type="button" class="btn ghost" data-act="cerrar" aria-label="Cerrar">✕</button></div><div class="panel-b"><p class="formnote full">' + esc(ayuda) + '</p><div class="field full"><textarea id="po-t" class="in" rows="6" required></textarea></div></div><div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="cerrar">Cancelar</button><button class="btn primary">Enviar</button></span></div></form>';
  $('#panel').hidden = false; $('#scrim').hidden = false; setTimeout(() => $('#po-t').focus(), 30);
  S.cbTexto = cb;
}
const cerrar = () => { $('#panel').hidden = true; $('#scrim').hidden = true; S.cbTexto = null; };
async function responder(entidad, id, accion, texto) {
  if (S.busy) return; S.busy = true;
  try { check(await sb.rpc('portal_responder', { p_entidad: entidad, p_id: id, p_accion: accion, p_texto: texto || '' })); toast(accion === 'aprobar' ? '¡Gracias! Le avisamos al equipo.' : 'Listo, le llegó al equipo.'); await cargar(true); }
  catch (e) { toast(e.message); }
  S.busy = false;
}
const ACT = {
  infVer: t => { S.inf = t.dataset.id; render(); window.scrollTo(0, 0); },
  infPdf: async t => {
    const i = (S.d.informes || []).find(x => x.id === t.dataset.id); if (!i) return;
    const txt = t.innerHTML; t.disabled = true; t.textContent = 'Preparando…';
    try {
      const { informeDoc, abrirPdf } = await import('./docs.js');
      abrirPdf(await informeDoc({ cliente: S.d.cliente.nombre, mesLabel: mesTxt(i.mes), inf: i, piezas: (mesDeInforme(i) || {}).piezas }), 'Informe de redes ' + mesTxt(i.mes) + ' ' + S.d.cliente.nombre);
    } catch (e) { toast('No se pudo armar el PDF'); }
    t.disabled = false; t.innerHTML = txt;
  },
  tab: t => { S.tab = t.dataset.t; render(); window.scrollTo(0, 0); },
  vista: t => { S.vista = t.dataset.v; render(); },
  salir: async () => { await sb.auth.signOut(); location.reload(); },
  cerrar: () => cerrar(),
  pieza: t => { S.tab = 'redes'; S.vista = 'lista'; render(); setTimeout(() => { const el = document.getElementById('pz-' + t.dataset.id); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.classList.add('flash'); } }, 50); },
  irProy: t => { S.tab = 'proyectos'; render(); setTimeout(() => { const el = document.getElementById('py-' + t.dataset.id); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 50); },
  aprobar: t => responder(t.dataset.e, t.dataset.id, 'aprobar', ''),
  cambios: t => pedirTexto('¿Qué cambiarías?', 'Contanos qué cambiar. Cuanto más concreto, mejor (textos, colores, fotos…).', txt => responder(t.dataset.e, t.dataset.id, 'cambios', txt)),
  aprobarMes: async t => { const m = (S.d.meses || []).find(x => x.id === t.dataset.id); if (!m) return; if (!await confirmar('¿Aprobás todas las piezas pendientes de ' + mesTxt(m.mes) + '?')) return; responder('mes', m.id, 'aprobar', ''); },
};
document.addEventListener('click', e => { const t = e.target.closest('[data-act]'); if (!t || t.tagName === 'A') return; const fn = ACT[t.dataset.act]; if (fn) { e.preventDefault(); fn(t); } });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#panel').hidden) cerrar(); });
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.id === 'po-cl') { S.c = S.clientes.find(c => c.cliente_id === t.value) || S.c; try { localStorage.setItem('po-cli', S.c.cliente_id); } catch (er) { } S.mes = null; S.archivos = {}; S.pidiendo.clear(); await cargar(); return; }
  if (t.id === 'po-mes') { S.mes = t.value; render(); pedirArchivos(); return; }
  if (t.dataset && t.dataset.chk) { try { check(await sb.rpc('portal_checklist', { p_sitio: t.dataset.chk, p_i: +t.dataset.i, p_ok: t.checked })); toast('Guardado'); await cargar(true); } catch (er) { toast(er.message); t.checked = !t.checked; } }
});
document.addEventListener('submit', async e => {
  const f = e.target; e.preventDefault();
  if (f.id === 'login') {
    const email = f.querySelector('input').value.trim(), btn = f.querySelector('button'), msg = $('#login-msg'); if (!email) return;
    btn.disabled = true; btn.textContent = 'Enviando…';
    const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + '/portal', shouldCreateUser: false } });
    if (error) { msg.textContent = /not allowed|not found|signups/i.test(error.message) ? 'Ese email no tiene acceso al portal. Pedile a tu contacto en àndale que te habilite.' : error.message; btn.disabled = false; btn.textContent = 'Enviarme el link'; return; }
    msg.textContent = 'Listo. Revisá tu email (' + email + ') y abrí el link. Si no aparece, mirá en spam.'; btn.textContent = 'Link enviado ✓';
    return;
  }
  if (f.id === 'po-txt') { const v = $('#po-t').value.trim(); if (!v) return; const cb = S.cbTexto; cerrar(); if (cb) cb(v); return; }
  if (f.id === 'po-tk') {
    const tt = $('#tk-t').value.trim(); if (!tt) return;
    const b = f.querySelector('button'); b.disabled = true;
    try { check(await sb.rpc('portal_pedido', { p_cliente: S.c.cliente_id, p_titulo: tt, p_detalle: $('#tk-d').value.trim(), p_para: $('#tk-p').value || null })); toast('¡Recibido! Te avisamos por acá cuando esté.'); await cargar(true); }
    catch (er) { toast(er.message); b.disabled = false; }
    return;
  }
  if (f.dataset.com) {
    const ta = f.querySelector('textarea'), v = ta.value.trim(); if (!v) return;
    try { check(await sb.rpc('portal_comentar', { p_entidad: f.dataset.com, p_id: f.dataset.id, p_texto: v })); ta.value = ''; toast('Comentario enviado'); await cargar(true); }
    catch (er) { toast(er.message); }
  }
});

(async () => {
  iconizar(document.body);
  document.querySelectorAll('.po-logo:empty').forEach(el => { el.innerHTML = LOGO; });
  if (!configured) { $('#view').innerHTML = '<p style="padding:40px">Falta configurar la base de datos.</p>'; return; }
  sb.auth.onAuthStateChange((ev, s) => { if (ev === 'SIGNED_IN' && s && !S.yo) arrancar(); });
  const { data } = await sb.auth.getSession();
  if (data.session) arrancar(); else login();
  // Se actualiza solo cada dos minutos y al volver a la pestaña.
  setInterval(() => { if (S.c && document.visibilityState === 'visible') cargar(true); }, 120000);
  window.addEventListener('focus', () => { if (S.c) cargar(true); });
})();
