import './fonts.css';
import './style.css';
import { LOGO } from './marca.js';
import { ICON } from './iconos.js';
import * as data from './data.js';
import { initAdmin } from './admin.js';
document.querySelectorAll('.brand .logo:empty').forEach(el => { el.innerHTML = LOGO; });
let ADM = null, ADM_FN = {};

/* ---------- Constantes ---------- */
const DEF = {
  tipos: ['Redes', 'Branding', 'Packaging', 'Web', 'Ads', 'Diseño', 'Audiovisual', 'Otro'],
  tiposAbono: ['Redes', 'Ads'],
  estadosProyecto: ['Presupuestado', 'Por empezar', 'En curso', 'En revisión', 'Entregado', 'Pausado', 'Cancelado', 'A confirmar'],
  estadosCliente: ['Activo', 'A confirmar', 'Proyectos', 'Pausado', 'Inactivo'],
  canales: ['Reunión', 'Videollamada', 'WhatsApp', 'Email', 'Llamada', 'Instagram', 'Otro'],
  servicios: ['Redes sociales', 'Ads', 'Redes sociales + Ads', 'Branding', 'Web', 'Diseño', 'Audiovisual', 'Comunicación integral', 'Asesoramiento', 'Otro'],
  planes: ['SMALL', 'MEDIUM', 'PREMIUM', 'LARGE', 'SMALL+ADS', 'PACK RRSS', 'ESPECIAL'],
};
const LIST_LABELS = { tipos: 'Tipos de proyecto', tiposAbono: 'Tipos de abono', estadosProyecto: 'Estados de proyecto', estadosCliente: 'Estados de cliente', canales: 'Canales de comunicación', servicios: 'Servicios', planes: 'Planes' };
const ESTADOS_ABONO = ['Activo', 'Pausado', 'Baja'];
const ROLES = { admin: 'Administrador', equipo: 'Equipo', externo: 'Externo' };
const CERRADOS = new Set(['Entregado', 'Cancelado']);
const ST_COLOR = { 'Presupuestado': '--s-presup', 'Por empezar': '--s-empezar', 'En curso': '--s-curso', 'En revisión': '--s-revision', 'Entregado': '--s-entregado', 'Pausado': '--s-pausado', 'Cancelado': '--s-cancelado', 'A confirmar': '--s-confirmar' };
const CL_COLOR = { 'Activo': '--s-entregado', 'A confirmar': '--s-confirmar', 'Proyectos': '--s-curso', 'Pausado': '--s-pausado', 'Inactivo': '--s-empezar' };
const VER_CL = { 'Proyectos': 'Solo proyectos' }; // solo para mostrar: el valor guardado no cambia
const TIPO_COLOR = { Branding: '--accent', Packaging: '--s-revision', Web: '--s-curso', Diseño: '--s-confirmar', Audiovisual: '--s-presup', Redes: '--accent', Ads: '--s-curso', Otro: '--s-empezar' };
const AB_COLOR = { 'Activo': '--s-entregado', 'Pausado': '--s-pausado', 'Baja': '--s-empezar' };
const ROL_COLOR = { admin: '--s-confirmar', equipo: '--s-curso', externo: '--s-revision' };
const ALL_VIEWS = [['inicio', 'Inicio'], ['proyectos', 'Proyectos'], ['abonos', 'Abonos'], ['mis', 'Mis trabajos'], ['clientes', 'Clientes'], ['equipo', 'Equipo'], ['comunicaciones', 'Seguimiento'], ['listas', 'Opciones']];
// Menú lateral: grupos por tipo de tarea. Las vistas de administración las aporta admin.js.
const GRUPOS = [['Trabajo', ['inicio', 'proyectos', 'abonos', 'mis']], ['Clientes', ['clientes', 'propuestas', 'comunicaciones']], ['Plata', ['cobros', 'gastos', 'pagos', 'numeros']], ['Configuración', ['equipo', 'listas', 'ajustes']]];
// Pantallas que ahora viven como pestañas de otra (los links viejos y los emails siguen funcionando).
const ALIAS = { asistente: ['cobros', 'mes'], cierre: ['cobros', 'mes'], facturas: ['cobros', 'facturas'], caja: ['gastos', 'movs'], precios: ['abonos', 'precios'], estadisticas: ['numeros', 'stats'], rentabilidad: ['numeros', 'rent'] };
const resolver = v => { const a = ALIAS[v]; if (!a) return v; S.tab[a[0]] = a[1]; return a[0]; };
/** Pestañas de una pantalla: [[clave, rótulo, cantidad?], ...] */
function subnav(hub, tabs) {
  const cur = S.tab[hub] || tabs[0][0];
  return '<nav class="subnav" aria-label="Secciones">' + tabs.map(([k, l, n]) => '<button data-act="tab" data-hub="' + hub + '" data-t="' + k + '"' + (cur === k ? ' aria-current="page"' : '') + '>' + esc(l) + (n ? '<span class="snav-n hot">' + n + '</span>' : '') + '</button>').join('') + '</nav>';
}
const EXT_VIEWS = ['mis', 'proyectos', 'abonos', 'clientes', 'comunicaciones'];

/* ---------- Utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const ym = d => d.getFullYear() + '-' + pad(d.getMonth() + 1);
const today = () => iso(new Date());
const thisMonth = () => ym(new Date());
const addMonth = (m, n) => { const [y, mm] = m.split('-').map(Number); return ym(new Date(y, mm - 1 + n, 1)); };
const monthLabel = m => { if (!/^\d{4}-\d{2}$/.test(m || '')) return m || ''; const [y, mm] = m.split('-').map(Number); return new Date(y, mm - 1, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }); };
const parse = s => { if (!s) return null; const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const diff = s => Math.round((parse(s) - parse(today())) / 864e5);
const fmt = s => { if (!s) return ''; const p = s.split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : p[1] + '/' + p[0]; };
const fmtShort = s => { if (!s) return ''; const [, m, d] = s.split('-'); return d + '/' + m; };
const cmp = (a, b) => String(a || '').localeCompare(String(b || ''), 'es', { sensitivity: 'base' });
const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const isOpen = p => !CERRADOS.has(p.estado);
const cap1 = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const initials = s => String(s || '?').trim().slice(0, 2).toUpperCase();
const AV_HUES = ['--s-curso', '--s-confirmar', '--s-presup', '--s-revision', '--s-entregado', '--accent', '--s-cancelado'];
const avStyle = n => { let h = 0; for (const ch of String(n || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return '--c:var(' + AV_HUES[h % AV_HUES.length] + ')'; };
const stVar = e => ST_COLOR[e] || '--muted';
const isUrl = s => /^https?:\/\//i.test(String(s || ''));
const resp = o => Array.isArray(o.responsables) ? o.responsables : [];
const hasResp = (o, p) => resp(o).includes(p);
function lsGet(k) { try { return localStorage.getItem('andale-ops:' + k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem('andale-ops:' + k, v); } catch (e) { } }

/* ---------- Estado ---------- */
const S = {
  me: null, status: 'loading',
  P: [], C: [], E: [], M: [], A: [], L: JSON.parse(JSON.stringify(DEF)),
  view: 'inicio', mode: lsGet('mode') || 'lista',
  f: { q: '', estado: '', tipo: '', resp: '', cliente: '', plazo: '', abiertos: true },
  af: { q: '', tipo: '', estado: 'Activo', resp: '' },
  cf: { q: '', estado: 'Activo' }, csel: new Set(), cmasivo: '', ficha: null,
  cal: null, yo: lsGet('yo') || '',
  mf: { q: '', cliente: '', pend: false },
  tab: {},
  form: null, listDraft: {}, openPick: null, busy: false,
};
const isAdmin = () => S.me && S.me.rol === 'admin';
const isStaff = () => S.me && (S.me.rol === 'admin' || S.me.rol === 'equipo');
const isExt = () => S.me && S.me.rol === 'externo';
const canEditProj = p => isStaff() || (S.me && hasResp(p, S.me.alias));
const views = () => {
  if (!isStaff()) return ALL_VIEWS.filter(v => EXT_VIEWS.includes(v[0]));
  if (!isAdmin() || !ADM) return ALL_VIEWS;
  const i = ALL_VIEWS.findIndex(v => v[0] === 'clientes') + 1;
  return [...ALL_VIEWS.slice(0, i), ...ADM.views.map(([k, l]) => [k, l]), ...ALL_VIEWS.slice(i)];
};
const viewFn = k => VIEW_FN[k] || (isAdmin() && ADM_FN[k]);
function leerHash() {
  const h = decodeURIComponent(location.hash.slice(1)); if (!h) return;
  const [v, ...rest] = h.split('/'); const arg = rest.join('/');
  S.view = resolver(v); S.ficha = null; S.pficha = null;
  if (v === 'proyectos' && arg) S.pficha = arg;
  if (v === 'clientes' && arg) S.ficha = arg;
}
leerHash();

/* ---------- Selects ---------- */
const opt = (v, label, cur) => '<option value="' + esc(v) + '"' + (v === cur ? ' selected' : '') + '>' + esc(label ?? v) + '</option>';
function optsFrom(arr, cur, blank, ver) {
  let h = blank !== undefined ? opt('', blank, cur) : '';
  h += arr.map(v => opt(v, (ver && ver[v]) || v, cur)).join('');
  if (cur && !arr.includes(cur)) h += opt(cur, cur + ' (fuera de lista)', cur);
  return h;
}
const personas = () => S.E.filter(e => e.activo !== false && e.persona).map(e => e.persona).sort(cmp);
function clienteOpts(cur, blankLabel) {
  let h = opt('', blankLabel || 'Elegí un cliente', cur); const seen = new Set();
  for (const g of S.L.estadosCliente) {
    const cs = S.C.filter(c => c.estado === g).sort((a, b) => cmp(a.nombre, b.nombre));
    if (!cs.length) continue;
    h += '<optgroup label="' + esc(VER_CL[g] || g) + '">' + cs.map(c => { seen.add(c.nombre); return opt(c.nombre, c.nombre, cur); }).join('') + '</optgroup>';
  }
  const rest = S.C.filter(c => !seen.has(c.nombre)).sort((a, b) => cmp(a.nombre, b.nombre));
  if (rest.length) h += '<optgroup label="Otros">' + rest.map(c => opt(c.nombre, c.nombre, cur)).join('') + '</optgroup>';
  if (cur && !S.C.some(c => c.nombre === cur)) h += opt(cur, cur, cur);
  return h;
}

/* ---------- Piezas ---------- */
const pill = (txt, v) => txt ? '<span class="pill" style="--c:var(' + v + ')">' + esc(txt) + '</span>' : '<span class="muted">—</span>';
const stPill = e => pill(e, stVar(e));
const clPill = e => pill(VER_CL[e] || e, CL_COLOR[e] || '--muted');
const abPill = e => pill(e, AB_COLOR[e] || '--muted');
const fotoDe = alias => (S.E.find(e => e.persona === alias) || {}).avatar || '';
function av(nombre, foto, cls) { return foto ? '<span class="av' + (cls ? ' ' + cls : '') + '" title="' + esc(nombre) + '"><img src="' + esc(foto) + '" alt="" loading="lazy"></span>' : '<span class="av' + (cls ? ' ' + cls : '') + '" style="' + avStyle(nombre) + '" title="' + esc(nombre) + '">' + esc(initials(nombre)) + '</span>'; }
function whos(arr) {
  if (!arr || !arr.length) return '<span class="muted">Sin asignar</span>';
  return '<span class="whos"><span class="avs">' + arr.map(p => av(p, fotoDe(p))).join('') + '</span><span class="wn">' + esc(arr.join(', ')) + '</span></span>';
}
// Foto editable: un label con input de archivo encima del avatar
function avEditable(kind, id, nombre, foto, cls, propia) { return '<label class="avedit" title="Cambiar foto">' + av(nombre, foto, cls) + '<input type="file" accept="image/png,image/jpeg,image/webp" hidden data-avatar="' + kind + '" data-id="' + esc(id) + '"' + (propia ? ' data-propia="1"' : '') + '><span class="avedit-i" aria-hidden="true">✎</span></label>'; }
function picker(kind, o) {
  const sel = resp(o), key = kind + ':' + o._id;
  if (!isStaff()) return whos(sel);
  const ps = personas(); const all = [...ps, ...sel.filter(p => !ps.includes(p))];
  return '<details class="pick" data-pick="' + esc(key) + '"' + (S.openPick === key ? ' open' : '') + '><summary title="Cambiar responsables">' + whos(sel) + '</summary><div class="menu">' +
    all.map(p => '<label class="chk"><input type="checkbox" data-rtoggle="' + kind + '" data-id="' + esc(o._id) + '" value="' + esc(p) + '"' + (sel.includes(p) ? ' checked' : '') + '> ' + esc(p) + '</label>').join('') + '</div></details>';
}
function daysBadge(p) {
  if (!p.entrega || !isOpen(p)) return '';
  const d = diff(p.entrega);
  if (d < 0) return '<span class="days late">Atrasado ' + (-d) + ' d</span>';
  if (d === 0) return '<span class="days soon">Hoy</span>';
  if (d <= 7) return '<span class="days soon">En ' + d + ' d</span>';
  return '<span class="days far">En ' + d + ' d</span>';
}
function links(o) {
  const L = [['drive', 'Drive'], ['slides', 'Slides'], ['canva', 'Canva']].filter(([k]) => isUrl(o[k]));
  return L.length ? '<span class="links">' + L.map(([k, l]) => '<a href="' + esc(o[k]) + '" target="_blank" rel="noopener">' + l + '</a>').join('') + '</span>' : '';
}
const emptyBox = (title, text) => '<div class="empty"><b>' + esc(title) + '</b>' + (text || '') + '</div>';
function addBtn(kind, label, preset, cls) {
  const ok = kind === 'comunicacion' ? (isStaff() || isExt()) : kind === 'persona' ? isAdmin() : isStaff();
  return ok ? '<button class="btn ' + (cls || 'primary') + '" data-act="new" data-kind="' + kind + '"' + (preset ? ' data-preset="' + esc(JSON.stringify(preset)) + '"' : '') + '>+ ' + esc(label) + '</button>' : '';
}

/* ---------- Derivados ---------- */
function plazoOk(p, plazo) {
  if (!plazo) return true;
  if (plazo === 'sinfecha') return isOpen(p) && !p.entrega;
  if (!p.entrega || !isOpen(p)) return false;
  const d = diff(p.entrega);
  if (plazo === 'atrasados') return d < 0;
  if (plazo === '7dias') return d >= 0 && d <= 7;
  return true;
}
function filtrarProyectos(ignoreAbiertos) {
  const f = S.f, q = norm(f.q);
  return S.P.filter(p =>
    (!q || norm(p.cliente + ' ' + p.proyecto + ' ' + (p.notas || '') + ' ' + (p.entregables || '')).includes(q)) &&
    (!f.estado || p.estado === f.estado) && (!f.tipo || p.tipo === f.tipo) &&
    (!f.resp || (f.resp === '__none' ? !resp(p).length : hasResp(p, f.resp))) &&
    (!f.cliente || p.cliente === f.cliente) && plazoOk(p, f.plazo) &&
    (ignoreAbiertos || !f.abiertos || isOpen(p)));
}
const sortByEntrega = (a, b) => (a.entrega || '9999').localeCompare(b.entrega || '9999') || cmp(a.cliente, b.cliente) || cmp(a.proyecto, b.proyecto);
const proyectosDe = n => S.P.filter(p => p.cliente === n);
const abonosDe = n => S.A.filter(a => a.cliente === n);
const pendientes = () => S.M.filter(m => !m.hecho && m.proximo).sort((a, b) => (a.fechaProximo || '9999').localeCompare(b.fechaProximo || '9999'));
const abonoLabel = a => (a.tipo || 'Abono') + (a.plan ? ' · ' + a.plan : '');
const abonoTags = n => { const as = abonosDe(n).filter(a => a.estado === 'Activo'); return as.length ? '<span class="tags">' + as.map(a => '<span class="tag svc" style="--c:var(' + (a.tipo === 'Ads' ? '--s-curso' : '--accent') + ')">' + esc(abonoLabel(a)) + '</span>').join('') + '</span>' : ''; };

/* Estado del cliente: se calcula solo (abono activo → Activo; proyecto abierto → Proyectos; nada → Inactivo)
   salvo que se haya fijado a mano. La base aplica la misma regla con un trigger. */
const estadoAuto = nombre => S.A.some(a => a.cliente === nombre && a.estado === 'Activo') ? 'Activo' : S.P.some(p => p.cliente === nombre && isOpen(p)) ? 'Proyectos' : 'Inactivo';
const patchEstado = (c, v) => v === '__auto' ? { estadoManual: false } : { estado: v, estadoManual: v !== estadoAuto(c.nombre) };
function estadoSelect(c) {
  const auto = estadoAuto(c.nombre);
  return '<span class="estsel"><select class="cellsel st" style="--c:var(' + (CL_COLOR[c.estado] || '--muted') + ')" aria-label="Estado de ' + esc(c.nombre) + '" data-upd="cliente" data-id="' + esc(c._id) + '" data-field="estado">' +
    optsFrom(S.L.estadosCliente, c.estado || '', undefined, VER_CL) + (c.estadoManual ? opt('__auto', '↺ Volver a automático (' + (VER_CL[auto] || auto) + ')', '') : '') + '</select>' +
    (c.estadoManual ? '<span class="fij" title="Fijado a mano. El automático diría: ' + esc(VER_CL[auto] || auto) + '">fijado</span>' : '') + '</span>';
}
/* Etapas del proyecto: [{ n, ok }]. Plantillas por tipo en Listas (clave 'etapas:<Tipo>'). */
const plantilla = tipo => (S.L['etapas:' + tipo] || []).slice();
const etapasDe = p => Array.isArray(p.etapas) ? p.etapas : [];
function etapaInfo(p) {
  const e = etapasDe(p), done = e.filter(x => x.ok).length, cur = e.find(x => !x.ok);
  return { e, done, total: e.length, cur: cur ? cur.n : (e.length ? 'Completo' : '') };
}
const segs = (e) => '<span class="prog" aria-hidden="true">' + e.map(x => '<i class="' + (x.ok ? 'on' : '') + '"></i>').join('') + '</span>';
function etapaCell(p) {
  const { e, done, total, cur } = etapaInfo(p), can = canEditProj(p);
  if (!total) return plantilla(p.tipo).length && can ? '<button class="btn ghost sm" data-act="etCargar" data-id="' + esc(p._id) + '">+ Etapas de ' + esc(p.tipo) + '</button>' : '<span class="muted">—</span>';
  const sum = '<span class="etp">' + segs(e) + '<span class="etn"><b>' + esc(cur) + '</b><span class="muted"> ' + done + '/' + total + '</span></span></span>';
  if (!can) return sum;
  const key = 'etapa:' + p._id;
  return '<details class="pick" data-pick="' + esc(key) + '"' + (S.openPick === key ? ' open' : '') + '><summary title="Marcar etapas">' + sum + '</summary><div class="menu">' +
    e.map((x, i) => '<label class="chk"><input type="checkbox" data-etoggle="' + esc(p._id) + '" data-i="' + i + '"' + (x.ok ? ' checked' : '') + '> ' + esc(x.n) + '</label>').join('') + '</div></details>';
}
const etapaTxt = p => { const { done, total, cur } = etapaInfo(p); return total ? cur + ' (' + done + '/' + total + ')' : ''; };

/* ---------- Vistas ---------- */
const kpiBtn = (n, label, sub, attrs, cls) => '<button class="kpi ' + (cls || '') + '" ' + attrs + '><span class="eyebrow">' + label + '</span><b>' + n + '</b><span>' + sub + '</span></button>';

function vInicio() {
  const t = today(), open = S.P.filter(isOpen);
  const late = open.filter(p => p.entrega && p.entrega < t);
  const in7 = open.filter(p => plazoOk(p, '7dias'));
  const pend = pendientes();
  const ab = S.A.filter(a => a.estado === 'Activo');
  const abR = ab.filter(a => a.tipo === 'Redes').length, abA = ab.filter(a => a.tipo === 'Ads').length;
  const conf = S.P.filter(p => p.estado === 'A confirmar').length;
  const sinResp = open.filter(p => !resp(p).length).length + ab.filter(a => !resp(a).length).length;

  const hora = new Date().getHours(), saludo = hora < 13 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  let h = '<div class="head"><div><h1>' + saludo + ', ' + esc(S.me.alias) + '</h1><p>' + esc(cap1(new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }))) + (late.length ? ' · <b style="color:var(--crit)">' + late.length + ' entregas atrasadas</b>' : '') + '</p></div></div>' +
    '<section class="kpis">' +
    kpiBtn(ab.length, 'Abonos activos', abR + ' de redes · ' + abA + ' de Ads', 'data-act="go" data-view="abonos"') +
    kpiBtn(open.length, 'Proyectos abiertos', S.P.filter(p => p.estado === 'En curso').length + ' en curso', 'data-act="goProy"') +
    kpiBtn(late.length, 'Atrasados', in7.length + ' entregan en 7 días', 'data-act="goProy" data-plazo="' + (late.length ? 'atrasados' : '7dias') + '"', late.length ? 'alert' : (in7.length ? 'warn' : '')) +
    kpiBtn(pend.length, 'Próximos pasos', 'Pendientes con clientes', 'data-act="go" data-view="comunicaciones" data-pend="1"') +
    '</section>';

  if (conf || sinResp) {
    const parts = [];
    if (conf) parts.push('<b>' + conf + ' proyectos sin estado definido</b>: elegí en qué estado están');
    if (sinResp) parts.push('<b>' + sinResp + '</b> trabajos abiertos no tienen responsable');
    h += '<section class="callout"><p>' + parts.join('. ') + '. Estado y responsables se cambian directo en la fila de cada lista.</p><button class="btn" data-act="goProy" data-estado="' + (conf ? 'A confirmar' : '') + '">Revisar proyectos</button></section>';
  }

  const estados = S.L.estadosProyecto.map(e => [e, S.P.filter(p => p.estado === e).length]).filter(x => x[1]);
  const maxE = Math.max(1, ...estados.map(x => x[1]));
  const tipos = S.L.tipos.map(t => [t, open.filter(p => p.tipo === t).length]).filter(x => x[1]);
  const maxT = Math.max(1, ...tipos.map(x => x[1]));
  const bars = (arr, max, colorFn, attr) => '<div class="bars">' + arr.map(([k, n]) => '<button class="bar" data-act="goProy" ' + attr + '="' + esc(k) + '" style="--c:var(' + colorFn(k) + ')"><span class="lab">' + esc(k) + '</span><span class="track"><span class="fill" style="width:' + (n / max * 100).toFixed(1) + '%"></span></span><span class="n">' + n + '</span></button>').join('') + '</div>';
  h += '<div class="grid2">' +
    '<section class="sheet"><div class="sheet-h"><h2>Proyectos por estado</h2><span class="muted num">' + S.P.length + ' en total</span></div><div class="sheet-b"><div class="stbar">' + estados.map(([e, n]) => '<span style="flex:' + n + ';background:var(' + stVar(e) + ')" title="' + esc(e + ': ' + n) + '"></span>').join('') + '</div>' + bars(estados, maxE, stVar, 'data-estado') + '</div></section>' +
    '<section class="sheet"><div class="sheet-h"><h2>Proyectos abiertos por tipo</h2><span class="muted num">' + open.length + ' abiertos</span></div><div class="sheet-b">' + (tipos.length ? bars(tipos, maxT, t => TIPO_COLOR[t] || '--accent', 'data-tipo') : emptyBox('Sin proyectos abiertos', '')) + '</div></section>' +
    '</div>';

  const prox = open.filter(p => p.entrega).sort(sortByEntrega).slice(0, 12);
  const proxHtml = prox.length ? '<div class="rows">' + prox.map(p => '<button class="row" data-act="pver" data-id="' + esc(p._id) + '"><span class="d">' + fmt(p.entrega) + '</span><span class="t"><b>' + esc(p.proyecto) + '</b><span>' + esc(p.cliente) + ' · ' + (resp(p).length ? esc(resp(p).join(', ')) : 'sin responsable') + '</span></span>' + daysBadge(p) + '</button>').join('') + '</div>'
    : emptyBox('Todavía no hay fechas de entrega cargadas', 'Cargá la entrega pactada en cada proyecto y acá aparece lo que viene.');
  const pasosHtml = pend.length ? '<div class="rows">' + pend.slice(0, 12).map(m => '<button class="row" data-act="edit" data-kind="comunicacion" data-id="' + esc(m._id) + '"><span class="d">' + (m.fechaProximo ? fmt(m.fechaProximo) : 'sin fecha') + '</span><span class="t"><b>' + esc(m.proximo) + '</b><span>' + esc(m.cliente || '') + (m.responsable ? ' · ' + esc(m.responsable) : '') + '</span></span>' + (m.fechaProximo && diff(m.fechaProximo) < 0 ? '<span class="days late">Vencido</span>' : '') + '</button>').join('') + '</div>'
    : emptyBox('No hay pasos pendientes', 'Registrá reuniones y acuerdos en Seguimiento con un próximo paso.');
  h += '<div class="grid2">' +
    '<section class="sheet"><div class="sheet-h"><h2>Próximas entregas</h2><button class="btn ghost sm" data-act="calendar">Ver calendario</button></div>' + proxHtml + '</section>' +
    '<section class="sheet"><div class="sheet-h"><h2>Próximos pasos con clientes</h2>' + addBtn('comunicacion', 'Seguimiento') + '</div>' + pasosHtml + '</section>' +
    '</div>';
  return h;
}

function vProyectos() {
  if (S.pficha) return vProyectoFicha();
  const f = S.f;
  const modes = [['lista', 'Lista'], ['tablero', 'Tablero'], ['calendario', 'Calendario']];
  let h = '<div class="head"><div><h1>Proyectos</h1><p>' + (isExt() ? 'Los proyectos donde figurás como responsable.' : 'Trabajos puntuales con entrega: branding, web, packaging.') + '</p></div>' +
    '<div class="toolbar"><div class="seg" role="group" aria-label="Vista">' + modes.map(([k, l]) => '<button data-act="mode" data-mode="' + k + '" aria-pressed="' + (S.mode === k) + '">' + l + '</button>').join('') + '</div>' + addBtn('proyecto', 'Proyecto') + '</div></div>';
  h += '<div class="toolbar">' +
    '<input class="in" type="search" id="pq" data-bind="f.q" placeholder="Buscar cliente o proyecto" value="' + esc(f.q) + '">' +
    '<select class="in" id="pe" data-bind="f.estado" aria-label="Estado">' + optsFrom(S.L.estadosProyecto, f.estado, 'Todos los estados') + '</select>' +
    '<select class="in" id="pt" data-bind="f.tipo" aria-label="Tipo">' + optsFrom(S.L.tipos, f.tipo, 'Todos los tipos') + '</select>' +
    (isStaff() ? '<select class="in" id="pr" data-bind="f.resp" aria-label="Responsable">' + opt('', 'Todo el equipo', f.resp) + opt('__none', 'Sin asignar', f.resp) + personas().map(p => opt(p, p, f.resp)).join('') + '</select>' : '') +
    '<select class="in" id="pc" data-bind="f.cliente" aria-label="Cliente">' + clienteOpts(f.cliente, 'Todos los clientes') + '</select>' +
    '<select class="in" id="pp" data-bind="f.plazo" aria-label="Plazo">' + opt('', 'Cualquier plazo', f.plazo) + opt('atrasados', 'Atrasados', f.plazo) + opt('7dias', 'Entregas en 7 días', f.plazo) + opt('sinfecha', 'Sin fecha pactada', f.plazo) + '</select>' +
    (S.mode === 'tablero' ? '' : '<label class="chk"><input type="checkbox" id="pa" data-bind="f.abiertos"' + (f.abiertos ? ' checked' : '') + '> Solo abiertos</label>') +
    (f.q || f.estado || f.tipo || f.resp || f.cliente || f.plazo ? '<button class="btn ghost sm" data-act="clearF">Limpiar filtros</button>' : '') +
    '</div>';
  if (S.mode === 'tablero') return h + vTablero();
  if (S.mode === 'calendario') return h + vCalendario();
  return h + vLista();
}

function vLista() {
  const list = filtrarProyectos(false).sort(sortByEntrega);
  if (!list.length) return '<section class="sheet">' + emptyBox(S.P.length ? 'Ningún proyecto coincide con los filtros' : 'Todavía no hay proyectos', S.P.length ? 'Probá limpiar los filtros.' : (isStaff() ? 'Cargá el primero con “+ Proyecto”.' : '')) + '</section>';
  const rows = list.map(p => {
    const dis = canEditProj(p) ? '' : ' disabled';
    return '<tr class="click" data-act="pver" data-id="' + esc(p._id) + '">' +
      '<td class="name"><button class="btn link" data-act="ficha" data-cliente="' + esc(p.cliente) + '">' + esc(p.cliente || '—') + '</button></td>' +
      '<td><button class="btn link" style="font-weight:500" data-act="pver" data-id="' + esc(p._id) + '">' + esc(p.proyecto) + '</button>' + (p.tipo ? '<span class="sub"><span class="tag svc" style="--c:var(' + (TIPO_COLOR[p.tipo] || '--s-empezar') + ')">' + esc(p.tipo) + '</span></span>' : '') + '</td>' +
      '<td>' + picker('proyecto', p) + '</td>' +
      '<td>' + etapaCell(p) + '</td>' +
      '<td class="n">' + (p.entrega ? '<span class="mono">' + fmt(p.entrega) + '</span><span class="sub">' + daysBadge(p) + '</span>' : '<span class="muted">—</span>') + '</td>' +
      '<td><select class="cellsel st" style="--c:var(' + stVar(p.estado) + ')" aria-label="Estado" data-upd="proyecto" data-id="' + esc(p._id) + '" data-field="estado"' + dis + '>' + optsFrom(S.L.estadosProyecto, p.estado || '') + '</select></td>' +
      '<td>' + links(p) + '</td>' +
      '</tr>';
  }).join('');
  return '<section class="sheet"><div class="tbl"><table><thead><tr><th>Cliente</th><th>Proyecto</th><th>Responsables</th><th>Etapa</th><th>Entrega</th><th>Estado</th><th>Links</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="count num">' + list.length + ' de ' + S.P.length + ' proyectos</div></section>';
}

function vProyectoFicha() {
  const p = S.P.find(x => x._id === S.pficha);
  const back = '<button class="btn ghost sm" data-act="pback" style="justify-self:start">← Proyectos</button>';
  if (!p) return back + '<section class="sheet">' + emptyBox('Ese proyecto no existe o no tenés acceso', '') + '</section>';
  const can = canEditProj(p), { e, done, total } = etapaInfo(p);
  const ms = S.M.filter(m => m.cliente === p.cliente).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 6);
  const fila = (k, v) => '<dt>' + k + '</dt><dd>' + (v || '<span class="muted">—</span>') + '</dd>';
  const lk = links(p);
  const estado = can ? '<select class="cellsel st" style="--c:var(' + stVar(p.estado) + ')" aria-label="Estado" data-upd="proyecto" data-id="' + esc(p._id) + '" data-field="estado">' + optsFrom(S.L.estadosProyecto, p.estado || '') + '</select>' : stPill(p.estado);
  const etapas = total ? '<div class="checklist">' + e.map((x, i) => '<label class="chk' + (x.ok ? ' done' : '') + '"><input type="checkbox" data-etoggle="' + esc(p._id) + '" data-i="' + i + '"' + (x.ok ? ' checked' : '') + (can ? '' : ' disabled') + '> <span>' + esc(x.n) + '</span></label>').join('') + '</div>' :
    emptyBox('Sin etapas', plantilla(p.tipo).length && can ? '' : 'Cargalas desde Editar.') + (plantilla(p.tipo).length && can ? '<div class="sheet-b"><button class="btn sm" data-act="etCargar" data-id="' + esc(p._id) + '">+ Cargar etapas de ' + esc(p.tipo) + '</button></div>' : '');
  return back +
    '<div class="head"><div><button class="btn link eyebrow" data-act="ficha" data-cliente="' + esc(p.cliente) + '">' + esc(p.cliente) + '</button><h1 style="margin-top:4px">' + esc(p.proyecto) + '</h1>' +
    '<p style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px">' + estado + (p.tipo ? '<span class="tag svc" style="--c:var(' + (TIPO_COLOR[p.tipo] || '--s-empezar') + ')">' + esc(p.tipo) + '</span>' : '') + daysBadge(p) + '</p></div>' +
    '<div class="toolbar">' + (can ? '<button class="btn primary" data-act="edit" data-kind="proyecto" data-id="' + esc(p._id) + '">Editar proyecto</button>' : '') + '</div></div>' +
    '<div class="ficha"><div class="stack"><section class="sheet"><div class="sheet-h"><h2>Datos</h2></div><div class="sheet-b"><dl class="kv">' +
    fila('Responsables', picker('proyecto', p)) + fila('Inicio', p.fechaInicio ? fmt(p.fechaInicio) : '') + fila('Entrega pactada', p.entrega ? fmt(p.entrega) : '') + fila('Entregado', p.entregaReal ? fmt(p.entregaReal) : '') +
    fila('Entregables', p.entregables ? '<span style="white-space:pre-wrap">' + esc(p.entregables) + '</span>' : '') + fila('Links', lk && lk.indexOf('href') > -1 ? lk : '') + fila('Notas', p.notas ? '<span style="white-space:pre-wrap">' + esc(p.notas) + '</span>' : '') +
    '</dl></div></section>' + (isAdmin() && ADM && ADM.proyectoSection ? ADM.proyectoSection(p) : '') + '</div>' +
    '<div class="stack"><section class="sheet"><div class="sheet-h"><h2>Etapas</h2>' + (total ? '<span class="etp">' + segs(e) + '<span class="muted num">' + done + ' de ' + total + '</span></span>' : '') + '</div>' + (total ? '<div class="sheet-b">' + etapas + '</div>' : etapas) + '</section>' +
    '<section class="sheet"><div class="sheet-h"><h2>Seguimiento con ' + esc(p.cliente) + '</h2>' + addBtn('comunicacion', 'Registrar', { cliente: p.cliente }) + '</div>' + (ms.length ? '<div class="timeline">' + ms.map(m => comItem(m, true)).join('') + '</div>' : emptyBox('Sin reuniones ni acuerdos registrados', 'Registrá lo que se habló con el cliente y el próximo paso.')) + '</section>' +
    '</div></div>';
}

/* ---------- Imprimir, exportar y compartir (en todas las vistas) ---------- */
function tituloVista() { const h = document.querySelector('#view h1'); return h ? h.textContent.trim() : 'àndale'; }
function cerrarShare() { document.querySelectorAll('details.share[open]').forEach(d => { d.open = false; }); }
function herramientas() {
  const ico = {
    print: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/></svg>',
    exp: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
    share: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/></svg>',
  };
  const hayTabla = !!document.querySelector('#view table');
  return '<div class="pagetools" role="group" aria-label="Imprimir, exportar y compartir">' +
    '<button class="btn ghost sm" data-act="print" title="Imprimir o guardar como PDF">' + ico.print + '<span>Imprimir</span></button>' +
    (hayTabla ? '<button class="btn ghost sm" data-act="exportar" title="Descargar en Excel">' + ico.exp + '<span>Excel</span></button>' : '') +
    '<details class="share"><summary class="btn ghost sm" title="Compartir">' + ico.share + '<span>Compartir</span></summary><div class="menu-pop">' +
    '<button class="btn ghost sm" data-act="shareCopy">Copiar link</button><button class="btn ghost sm" data-act="shareWa">Enviar por WhatsApp</button><button class="btn ghost sm" data-act="shareMail">Enviar por email</button></div></details></div>';
}
function ponerHerramientas() {
  const head = document.querySelector('#view .head'); if (!head || head.querySelector('.pagetools')) return;
  head.insertAdjacentHTML('beforeend', herramientas());
}
async function exportarVista() {
  const tablas = [...document.querySelectorAll('#view table')];
  if (!tablas.length) { toast('Esta vista no tiene tablas para exportar'); return; }
  try {
    const XLSX = await import('xlsx'); const wb = XLSX.utils.book_new(); const usados = new Set();
    tablas.forEach((t, i) => {
      const c = t.cloneNode(true);
      c.querySelectorAll('select').forEach(sel => { const o = sel.options[sel.selectedIndex]; sel.replaceWith(document.createTextNode(o ? o.textContent : '')); });
      c.querySelectorAll('input[type=checkbox], th.sel, td.sel').forEach(x => x.remove());
      c.querySelectorAll('details.pick').forEach(d => { const sm = d.querySelector('summary'); d.replaceWith(document.createTextNode(sm ? sm.textContent : '')); });
      c.querySelectorAll('button:not(.link)').forEach(b => b.remove());
      const sh = t.closest('.sheet'), h2 = sh && sh.querySelector('.sheet-h h2');
      let nombre = (h2 ? h2.textContent : tituloVista()).replace(/[\\/?*\[\]:]/g, ' ').slice(0, 28).trim() || 'Hoja ' + (i + 1);
      while (usados.has(nombre)) nombre = nombre.slice(0, 25) + ' ' + (i + 1); usados.add(nombre);
      XLSX.utils.book_append_sheet(wb, XLSX.utils.table_to_sheet(c, { raw: false }), nombre);
    });
    XLSX.writeFile(wb, tituloVista().replace(/[^\wáéíóúñÁÉÍÓÚÑ -]/g, '').trim() + ' · àndale.xlsx');
    toast('Excel descargado');
  } catch (err) { toast('No se pudo exportar: ' + err.message); }
}

function vTablero() {
  const list = filtrarProyectos(true);
  const cols = S.L.estadosProyecto.map(e => {
    const items = list.filter(p => p.estado === e).sort(sortByEntrega);
    return '<div class="col" data-drop="' + esc(e) + '"><div class="col-h">' + stPill(e) + '<span class="n">' + items.length + '</span></div>' +
      items.map(p => {
        const late = p.entrega && isOpen(p) && diff(p.entrega) < 0;
        return '<button class="card' + (late ? ' late' : '') + '" data-act="pver" data-id="' + esc(p._id) + '" data-drag="' + esc(p._id) + '"' + (canEditProj(p) ? ' draggable="true"' : '') + '><span class="cl">' + esc(p.cliente) + '</span><span class="pj">' + esc(p.proyecto) + '</span>' + (etapasDe(p).length ? '<span class="et">' + segs(etapasDe(p)) + esc(etapaInfo(p).cur) + '</span>' : '') + '<span class="ft">' + (resp(p).length ? whos(resp(p)) : '<span class="tag">Sin responsable</span>') + (p.entrega ? '<span class="mono">' + fmtShort(p.entrega) + '</span>' : '') + '</span></button>';
      }).join('') + '</div>';
  }).join('');
  return '<p class="muted" style="margin:0">Arrastrá una tarjeta a otra columna para cambiarle el estado. En el celular, tocala y cambiá el estado en el formulario.</p><div class="kb">' + cols + '</div>';
}

function vCalendario() {
  const [y, m] = (S.cal || thisMonth()).split('-').map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  const t = today();
  const list = filtrarProyectos(false).filter(p => p.entrega && p.estado !== 'Cancelado');
  const steps = S.M.filter(x => !x.hecho && x.proximo && x.fechaProximo && (!S.f.cliente || x.cliente === S.f.cliente) && (!S.f.resp || x.responsable === S.f.resp));
  const byDay = {};
  list.forEach(p => { (byDay[p.entrega] = byDay[p.entrega] || { p: [], s: [] }).p.push(p); });
  steps.forEach(s => { (byDay[s.fechaProximo] = byDay[s.fechaProximo] || { p: [], s: [] }).s.push(s); });
  let cells = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => '<div class="dow">' + d + '</div>').join('');
  const d = new Date(start);
  for (let i = 0; i < 42; i++) {
    const k = iso(d), inMonth = d.getMonth() === m - 1, it = byDay[k];
    if (i >= 35 && !inMonth) break;
    cells += '<div class="cell' + (inMonth ? '' : ' out') + (k === t ? ' today' : '') + '"><span class="dn">' + d.getDate() + '</span>' +
      (it ? it.p.map(p => '<button class="ev' + (isOpen(p) && p.entrega < t ? ' late' : '') + '" style="--c:var(' + stVar(p.estado) + ')" title="' + esc(p.cliente + ' · ' + p.proyecto) + '" data-act="edit" data-kind="proyecto" data-id="' + esc(p._id) + '">' + esc(p.cliente + ' · ' + p.proyecto) + '</button>').join('') +
        it.s.map(s => '<button class="ev step" title="' + esc('Paso: ' + s.proximo) + '" data-act="edit" data-kind="comunicacion" data-id="' + esc(s._id) + '">↳ ' + esc(s.proximo) + '</button>').join('') : '') + '</div>';
    d.setDate(d.getDate() + 1);
  }
  const mk = y + '-' + pad(m);
  const agenda = [...list.filter(p => p.entrega.startsWith(mk)).map(p => ({ d: p.entrega, kind: 'proyecto', id: p._id, t: p.proyecto, s: p.cliente, b: stPill(p.estado) })),
  ...steps.filter(s => s.fechaProximo.startsWith(mk)).map(s => ({ d: s.fechaProximo, kind: 'comunicacion', id: s._id, t: s.proximo, s: 'Próximo paso · ' + (s.cliente || ''), b: '' }))].sort((a, b) => a.d.localeCompare(b.d));
  const sinFecha = S.P.filter(p => isOpen(p) && !p.entrega).length;
  return '<section class="sheet"><div class="sheet-h"><div class="cal-h"><h2>' + esc(monthLabel(mk)) + '</h2><button class="btn sm" data-act="calMove" data-d="-1" aria-label="Mes anterior">←</button><button class="btn sm" data-act="calMove" data-d="0">Hoy</button><button class="btn sm" data-act="calMove" data-d="1" aria-label="Mes siguiente">→</button></div>' +
    (sinFecha ? '<button class="btn ghost sm" data-act="goProy" data-plazo="sinfecha">' + sinFecha + ' abiertos sin fecha pactada</button>' : '') + '</div>' +
    '<div class="tbl"><div class="cal">' + cells + '</div></div></section>' +
    '<section class="sheet"><div class="sheet-h"><h2>Agenda del mes</h2><span class="muted num">' + agenda.length + ' ítems</span></div>' +
    (agenda.length ? '<div class="rows">' + agenda.map(a => '<button class="row" data-act="edit" data-kind="' + a.kind + '" data-id="' + esc(a.id) + '"><span class="d">' + fmt(a.d) + '</span><span class="t"><b>' + esc(a.t) + '</b><span>' + esc(a.s) + '</span></span>' + a.b + '</button>').join('') + '</div>'
      : emptyBox('Nada agendado este mes', 'Las entregas pactadas y los próximos pasos con fecha aparecen acá.')) + '</section>';
}

function vAbonos() {
  const pest = isAdmin() && ADM_FN.precios ? subnav('abonos', [['abonos', 'Abonos'], ['precios', 'Precios y aumentos']]) : '';
  if (pest && S.tab.abonos === 'precios') return pest + ADM_FN.precios();
  const af = S.af, q = norm(af.q);
  const tipos = ['', ...S.L.tiposAbono];
  const base = S.A.filter(a => (!af.estado || a.estado === af.estado));
  const list = base.filter(a => (!af.tipo || a.tipo === af.tipo) && (!af.resp || (af.resp === '__none' ? !resp(a).length : hasResp(a, af.resp))) && (!q || norm(a.cliente + ' ' + (a.plan || '') + ' ' + (a.notas || '')).includes(q))).sort((a, b) => cmp(a.cliente, b.cliente) || cmp(a.tipo, b.tipo));
  const dis = isStaff() ? '' : ' disabled';
  let h = pest + '<div class="head"><div><h1>Abonos</h1><p>' + (isExt() ? 'Los abonos donde figurás como responsable.' : 'Lo que se factura todos los meses: redes y Ads.') + '</p></div><div class="toolbar">' + addBtn('abono', 'Abono') + '</div></div>' +
    '<div class="toolbar"><input class="in" type="search" id="aq" data-bind="af.q" placeholder="Buscar cliente o plan" value="' + esc(af.q) + '">' +
    '<div class="seg" role="group" aria-label="Tipo">' + tipos.map(t => '<button data-act="afTipo" data-tipo="' + esc(t) + '" aria-pressed="' + (af.tipo === t) + '">' + (t || 'Todos') + ' <span class="c">' + base.filter(a => !t || a.tipo === t).length + '</span></button>').join('') + '</div>' +
    '<select class="in" id="ae" data-bind="af.estado" aria-label="Estado">' + opt('', 'Todos los estados', af.estado) + ESTADOS_ABONO.map(e => opt(e, e === 'Activo' ? 'Activos' : e === 'Pausado' ? 'Pausados' : 'Dados de baja', af.estado)).join('') + '</select>' +
    (isStaff() ? '<select class="in" id="ar" data-bind="af.resp" aria-label="Responsable">' + opt('', 'Todo el equipo', af.resp) + opt('__none', 'Sin asignar', af.resp) + personas().map(p => opt(p, p, af.resp)).join('') + '</select>' : '') + '</div>';
  if (!list.length) return h + '<section class="sheet">' + emptyBox(S.A.length ? 'Ningún abono coincide' : 'Todavía no hay abonos', S.A.length ? 'Probá con otro filtro.' : (isStaff() ? 'Cargá el primero con “+ Abono”.' : '')) + '</section>';
  const rows = list.map(a => '<tr><td class="name"><button class="btn link" data-act="ficha" data-cliente="' + esc(a.cliente) + '">' + esc(a.cliente) + '</button></td>' +
    '<td><span class="tag svc" style="--c:var(' + (a.tipo === 'Ads' ? '--s-curso' : '--accent') + ')">' + esc(a.tipo || '—') + '</span></td><td>' + (a.plan ? esc(a.plan) : '<span class="muted">—</span>') + '</td>' +
    '<td>' + picker('abono', a) + '</td>' +
    '<td class="mono">' + (a.desde ? esc(fmt(a.desde)) : '<span class="muted">—</span>') + (a.hasta ? ' → ' + esc(fmt(a.hasta)) : '') + '</td>' +
    '<td><select class="cellsel st" style="--c:var(' + (AB_COLOR[a.estado] || '--muted') + ')" aria-label="Estado" data-upd="abono" data-id="' + esc(a._id) + '" data-field="estado"' + dis + '>' + optsFrom(ESTADOS_ABONO, a.estado || '') + '</select></td>' +
    '<td class="r"><button class="btn ghost sm" data-act="edit" data-kind="abono" data-id="' + esc(a._id) + '">' + (isStaff() ? 'Editar' : 'Ver') + '</button></td></tr>').join('');
  return h + '<section class="sheet"><div class="tbl"><table><thead><tr><th>Cliente</th><th>Tipo</th><th>Plan</th><th>Responsables</th><th>Desde</th><th>Estado</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="count num">' + list.length + ' abonos</div></section>';
}

function vMis() {
  const ps = personas();
  if (isExt()) S.yo = S.me.alias;
  if (!S.yo && S.me) S.yo = S.me.alias;
  let h = '<div class="head"><div><h1>' + (isExt() ? 'Mis trabajos' : 'Mis trabajos') + '</h1><p>Lo que tiene a cargo cada persona.</p></div>' +
    (isStaff() ? '<div class="toolbar"><label class="muted" for="yo">Ver trabajos de</label><select class="in" id="yo" data-bind="yo">' + ps.map(p => opt(p, p, S.yo)).join('') + '</select></div>' : '') + '</div>';
  const yo = S.yo, mine = S.P.filter(p => hasResp(p, yo) && isOpen(p)).sort(sortByEntrega);
  const late = mine.filter(p => plazoOk(p, 'atrasados')), week = mine.filter(p => plazoOk(p, '7dias'));
  const later = mine.filter(p => p.entrega && diff(p.entrega) > 7), nodate = mine.filter(p => !p.entrega);
  const cuentas = S.A.filter(a => a.estado === 'Activo' && hasResp(a, yo)).sort((a, b) => cmp(a.cliente, b.cliente));
  const myCl = S.C.filter(c => hasResp(c, yo)).sort((a, b) => cmp(a.nombre, b.nombre));
  const steps = pendientes().filter(m => m.responsable === yo);
  const kpi = (n, l, cls) => '<div class="kpi ' + (cls || '') + '"><span class="eyebrow">' + l + '</span><b>' + n + '</b></div>';
  h += '<section class="kpis">' + kpi(cuentas.length, 'Abonos') + kpi(mine.length, 'Proyectos abiertos') + kpi(late.length, 'Atrasados', late.length ? 'alert' : '') + kpi(steps.length, 'Pasos pendientes') + '</section>';
  if (!mine.length && !cuentas.length && !myCl.length && !steps.length) return h + '<section class="sheet">' + emptyBox('Todavía no hay nada a cargo de ' + yo, isStaff() ? 'Asigná responsables desde Proyectos o Abonos y aparece acá.' : 'Cuando te asignen un trabajo aparece acá.') + '</section>';
  const others = o => resp(o).length > 1 ? ' · con ' + esc(resp(o).filter(x => x !== yo).join(', ')) : '';
  const group = (title, arr) => arr.length ? '<section class="sheet"><div class="sheet-h"><h2>' + title + '</h2><span class="muted num">' + arr.length + '</span></div><div class="rows">' + arr.map(p => '<button class="row" data-act="edit" data-kind="proyecto" data-id="' + esc(p._id) + '"><span class="d">' + (p.entrega ? fmt(p.entrega) : '—') + '</span><span class="t"><b>' + esc(p.proyecto) + '</b><span>' + esc([p.cliente, p.tipo, etapaTxt(p)].filter(Boolean).join(' · ')) + others(p) + '</span></span>' + (daysBadge(p) || stPill(p.estado)) + '</button>').join('') + '</div></section>' : '';
  const cuentasHtml = '<section class="sheet"><div class="sheet-h"><h2>Abonos</h2><span class="muted num">' + cuentas.length + '</span></div>' + (cuentas.length ? '<div class="rows">' + cuentas.map(a => '<button class="row" data-act="edit" data-kind="abono" data-id="' + esc(a._id) + '"><span class="d">' + esc(a.tipo || '') + '</span><span class="t"><b>' + esc(a.cliente) + '</b><span>' + esc(a.plan ? 'Plan ' + a.plan : '') + others(a) + '</span></span><span></span></button>').join('') + '</div>' : emptyBox('Sin cuentas mensuales a cargo', '')) + '</section>';
  h += '<div class="grid2"><div class="stack">' + cuentasHtml + group('Atrasados', late) + group('Esta semana', week) + group('Más adelante', later) + group('Sin fecha pactada', nodate) + '</div>' +
    '<div class="stack">' +
    '<section class="sheet"><div class="sheet-h"><h2>Próximos pasos</h2>' + addBtn('comunicacion', 'Seguimiento', null, 'sm') + '</div>' + (steps.length ? '<div class="rows">' + steps.map(m => '<button class="row" data-act="edit" data-kind="comunicacion" data-id="' + esc(m._id) + '"><span class="d">' + (m.fechaProximo ? fmt(m.fechaProximo) : '—') + '</span><span class="t"><b>' + esc(m.proximo) + '</b><span>' + esc(m.cliente || '') + '</span></span><span></span></button>').join('') + '</div>' : emptyBox('Sin pasos pendientes', '')) + '</section>' +
    (myCl.length ? '<section class="sheet"><div class="sheet-h"><h2>Clientes a cargo</h2><span class="muted num">' + myCl.length + '</span></div><div class="rows">' + myCl.map(c => '<button class="row" data-act="ficha" data-cliente="' + esc(c.nombre) + '"><span class="d">' + esc(c.plan || '') + '</span><span class="t"><b>' + esc(c.nombre) + '</b><span>' + esc(c.servicio || '') + '</span></span>' + clPill(c.estado) + '</button>').join('') + '</div></section>' : '') +
    '</div></div>';
  return h;
}

function vClientes() {
  if (S.ficha) return vFicha();
  const cf = S.cf, q = norm(cf.q);
  if (isExt()) cf.estado = '';
  const estados = ['', ...S.L.estadosCliente];
  const counts = e => S.C.filter(c => !e || c.estado === e).length;
  const list = S.C.filter(c => (!cf.estado || c.estado === cf.estado) && (!q || norm(c.nombre + ' ' + (c.contacto || '') + ' ' + (c.servicio || '')).includes(q))).sort((a, b) => cmp(a.nombre, b.nombre));
  let h = '<div class="head"><div><h1>Clientes</h1><p>' + (isExt() ? 'Los clientes de los trabajos que tenés asignados.' : 'El estado se calcula solo con sus abonos y proyectos.') + '</p></div><div class="toolbar">' + addBtn('cliente', 'Cliente') + '</div></div>' +
    '<div class="toolbar"><input class="in" type="search" id="cq" data-bind="cf.q" placeholder="Buscar cliente o contacto" value="' + esc(cf.q) + '">' +
    (isStaff() ? '<div class="seg" role="group" aria-label="Estado">' + estados.map(e => '<button data-act="cfEstado" data-estado="' + esc(e) + '" aria-pressed="' + (cf.estado === e) + '">' + (VER_CL[e] || e || 'Todos') + ' <span class="c">' + counts(e) + '</span></button>').join('') + '</div>' : '') + '</div>';
  if (!list.length) return h + '<section class="sheet">' + emptyBox(S.C.length ? 'Ningún cliente coincide' : 'Todavía no hay clientes', S.C.length ? 'Probá con otro estado o búsqueda.' : '') + '</section>';
  const staff = isStaff();
  S.csel.forEach(id => { if (!list.some(c => c._id === id)) S.csel.delete(id); });
  const rows = list.map(c => {
    const act = proyectosDe(c.nombre).filter(isOpen).length;
    const est = staff ? estadoSelect(c) : clPill(c.estado);
    return '<tr class="click" data-act="ficha" data-cliente="' + esc(c.nombre) + '">' + (staff ? '<td class="sel"><input type="checkbox" aria-label="Seleccionar ' + esc(c.nombre) + '" data-csel="' + esc(c._id) + '"' + (S.csel.has(c._id) ? ' checked' : '') + '></td>' : '') + '<td class="name"><span class="who1">' + av(c.nombre, c.avatar, 'sq') + esc(c.nombre) + '</span></td><td>' + est + '</td><td>' + (abonoTags(c.nombre) || '<span class="muted">—</span>') + '</td><td>' + esc(c.servicio || '') + '</td><td>' + (resp(c).length ? whos(resp(c)) : '<span class="muted">—</span>') + '</td><td class="n">' + (act || '<span class="muted">0</span>') + '</td><td>' + esc(c.contacto || '') + '</td></tr>';
  }).join('');
  const bulk = staff && S.csel.size ? '<div class="bulkbar" role="region" aria-label="Acción sobre seleccionados"><b>' + S.csel.size + ' seleccionado' + (S.csel.size > 1 ? 's' : '') + '</b><label class="muted" for="cmas">Pasar a</label><select class="in" id="cmas" data-bind="cmasivo">' + optsFrom(S.L.estadosCliente, S.cmasivo, 'Elegí un estado', VER_CL) + opt('__auto', '↺ Automático', S.cmasivo) + '</select><button class="btn primary sm" data-act="cMasivo"' + (S.cmasivo ? '' : ' disabled') + '>Aplicar</button><button class="btn ghost sm" data-act="cSelNone">Quitar selección</button></div>' : '';
  const allSel = staff && list.length && list.every(c => S.csel.has(c._id));
  return h + bulk + '<section class="sheet"><div class="tbl"><table><thead><tr>' + (staff ? '<th class="sel"><input type="checkbox" aria-label="Seleccionar todos" data-cselall="1"' + (allSel ? ' checked' : '') + '></th>' : '') + '<th>Cliente</th><th>Estado</th><th>Abonos activos</th><th>Servicio</th><th>Responsables</th><th>Proyectos abiertos</th><th>Contacto</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="count num">' + list.length + ' clientes</div></section>';
}

function vFicha() {
  const c = S.C.find(x => x.nombre === S.ficha);
  const back = '<button class="btn ghost sm" data-act="back" style="justify-self:start">← Clientes</button>';
  if (!c) return back + '<section class="sheet">' + emptyBox('Ese cliente no existe o no tenés acceso', '') + '</section>';
  const ps = proyectosDe(c.nombre).sort(sortByEntrega), open = ps.filter(isOpen), closed = ps.filter(p => !isOpen(p));
  const as = abonosDe(c.nombre).sort((a, b) => ESTADOS_ABONO.indexOf(a.estado) - ESTADOS_ABONO.indexOf(b.estado) || cmp(a.tipo, b.tipo));
  const ms = S.M.filter(m => m.cliente === c.nombre).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const copy = v => v ? '<span>' + esc(v) + '</span><button class="btn ghost sm" data-act="copy" data-v="' + esc(v) + '">Copiar</button>' : '<span class="muted">—</span>';
  const link = v => v ? (isUrl(v) ? '<a href="' + esc(v) + '" target="_blank" rel="noopener">' + esc(v.replace(/^https?:\/\/(www\.)?/, '')) + '</a>' : '<span>' + esc(v) + '</span>') : '<span class="muted">—</span>';
  const projRow = p => '<button class="row" data-act="pver" data-id="' + esc(p._id) + '"><span class="d">' + (p.entrega ? fmt(p.entrega) : '—') + '</span><span class="t"><b>' + esc(p.proyecto) + '</b><span>' + esc([p.tipo, etapaTxt(p), resp(p).join(', ')].filter(Boolean).join(' · ')) + '</span></span>' + stPill(p.estado) + '</button>';
  const abRow = a => '<button class="row" data-act="edit" data-kind="abono" data-id="' + esc(a._id) + '"><span class="d">' + esc(a.tipo || '') + '</span><span class="t"><b>' + esc(abonoLabel(a)) + '</b><span>' + (resp(a).length ? esc(resp(a).join(', ')) : 'sin responsable') + (a.desde ? ' · desde ' + esc(fmt(a.desde)) : '') + '</span></span>' + abPill(a.estado) + '</button>';
  const preset = esc(JSON.stringify({ cliente: c.nombre }));
  return back +
    '<div class="head"><div class="head-av">' + (isStaff() ? avEditable('cliente', c._id, c.nombre, c.avatar, 'xl sq') : av(c.nombre, c.avatar, 'xl sq')) + '<div><span class="eyebrow">Ficha de cliente</span><h1 style="font-size:32px;margin-top:4px">' + esc(c.nombre) + '</h1><p style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + (isStaff() ? estadoSelect(c) : clPill(c.estado)) + abonoTags(c.nombre) + '<span>' + esc(c.servicio || '') + '</span></p></div></div>' +
    '<div class="toolbar">' + (isStaff() ? '<button class="btn" data-act="edit" data-kind="cliente" data-id="' + esc(c._id) + '">Editar cliente</button><button class="btn" data-act="new" data-kind="comunicacion" data-preset="' + preset + '">+ Seguimiento</button><button class="btn" data-act="new" data-kind="abono" data-preset="' + preset + '">+ Abono</button><button class="btn primary" data-act="new" data-kind="proyecto" data-preset="' + preset + '">+ Proyecto</button>' : addBtn('comunicacion', 'Comunicación', { cliente: c.nombre })) + '</div></div>' +
    '<div class="ficha"><div class="stack"><section class="sheet"><div class="sheet-h"><h2>Datos</h2></div><div class="sheet-b"><dl class="kv">' +
    '<dt>Responsables</dt><dd>' + whos(resp(c)) + '</dd>' +
    '<dt>Contacto</dt><dd>' + (c.contacto ? esc(c.contacto) : '<span class="muted">—</span>') + '</dd>' +
    '<dt>Email</dt><dd>' + copy(c.email) + '</dd>' +
    '<dt>Teléfono</dt><dd>' + copy(c.tel) + '</dd>' +
    '<dt>Instagram / web</dt><dd>' + link(c.web) + '</dd>' +
    '<dt>Carpeta</dt><dd>' + link(c.carpeta) + '</dd>' +
    '<dt>Notas</dt><dd>' + (c.notas ? '<span style="white-space:pre-wrap">' + esc(c.notas) + '</span>' : '<span class="muted">—</span>') + '</dd>' +
    '</dl></div></section>' + (isAdmin() && ADM ? ADM.fichaSection(c) : '') + '</div>' +
    '<div class="stack">' +
    '<section class="sheet"><div class="sheet-h"><h2>Abonos</h2><span class="muted num">' + as.filter(a => a.estado === 'Activo').length + ' activos</span></div>' + (as.length ? '<div class="rows">' + as.map(abRow).join('') + '</div>' : emptyBox('Sin abonos', '')) + '</section>' +
    '<section class="sheet"><div class="sheet-h"><h2>Proyectos</h2><span class="muted num">' + open.length + ' abiertos · ' + closed.length + ' cerrados</span></div>' + (ps.length ? '<div class="rows">' + open.map(projRow).join('') + closed.map(projRow).join('') + '</div>' : emptyBox('Sin proyectos cargados', '')) + '</section>' +
    '<section class="sheet"><div class="sheet-h"><h2>Seguimiento</h2><span class="muted num">' + ms.length + '</span></div>' + (ms.length ? '<div class="timeline">' + ms.map(m => comItem(m, true)).join('') + '</div>' : emptyBox('Todavía no hay seguimiento', 'Registrá reuniones, llamadas y acuerdos con este cliente.')) + '</section>' +
    '</div></div>';
}

function comItem(m, inFicha) {
  const can = isStaff() || (S.me && m.responsable === S.me.alias);
  return '<div class="ti"><div class="meta"><span class="mono">' + (m.fecha ? fmt(m.fecha) : '—') + '</span>' + (inFicha ? '' : '<b style="color:var(--fg)">' + esc(m.cliente || '') + '</b>') + (m.canal ? '<span class="tag">' + esc(m.canal) + '</span>' : '') + (m.conQuien ? '<span>con ' + esc(m.conQuien) + '</span>' : '') + (m.responsable ? '<span>· ' + esc(m.responsable) + '</span>' : '') + '<button class="btn ghost sm" style="margin-left:auto" data-act="edit" data-kind="comunicacion" data-id="' + esc(m._id) + '">' + (can ? 'Editar' : 'Ver') + '</button></div>' +
    (m.resumen ? '<p>' + esc(m.resumen) + '</p>' : '') + (m.acuerdo ? '<p><b>Acuerdo:</b> ' + esc(m.acuerdo) + '</p>' : '') +
    (m.proximo ? '<label class="next' + (m.hecho ? ' done' : '') + '"><input type="checkbox" id="h-' + esc(m._id) + '" data-upd="comunicacion" data-id="' + esc(m._id) + '" data-field="hecho"' + (m.hecho ? ' checked' : '') + (can ? '' : ' disabled') + '> <span>' + esc(m.proximo) + '</span>' + (m.fechaProximo ? '<span class="mono">' + fmt(m.fechaProximo) + '</span>' : '') + '</label>' : '') + '</div>';
}

function vEquipo() {
  const list = [...S.E].sort((a, b) => (b.activo !== false) - (a.activo !== false) || cmp(a.persona, b.persona));
  let h = '<div class="head"><div><h1>Equipo</h1><p>Quién entra a la app y qué ve cada uno.</p></div><div class="toolbar">' + addBtn('persona', 'Persona') + '</div></div>';
  if (!list.length) return h + '<section class="sheet">' + emptyBox('Todavía no hay personas cargadas', '') + '</section>';
  const rows = list.map(e => {
    const ab = S.A.filter(a => a.estado === 'Activo' && hasResp(a, e.persona)).length, pr = S.P.filter(p => isOpen(p) && hasResp(p, e.persona)).length;
    return '<tr class="click" data-act="edit" data-kind="persona" data-id="' + esc(e._id) + '"' + (e.activo === false ? ' style="opacity:.55"' : '') + '><td><span class="who1">' + (isStaff() || (S.me && S.me.alias === e.persona) ? avEditable('persona', e._id, e.persona, e.avatar, '', !isAdmin()) : av(e.persona, e.avatar)) + '<b>' + esc(e.persona) + '</b></span></td><td>' + esc(e.nombre || '') + (e.puesto ? '<span class="sub">' + esc(e.puesto) + '</span>' : '') + '</td><td>' + pill(ROLES[e.rol] || e.rol, ROL_COLOR[e.rol] || '--muted') + '</td><td>' + (e.email ? esc(e.email) : '<span class="muted">Sin acceso</span>') + '</td><td class="n">' + ab + '</td><td class="n">' + pr + '</td><td>' + (e.activo === false ? '<span class="tag">Inactiva/o</span>' : '<span class="pill" style="--c:var(--ok)">Activa/o</span>') + '</td></tr>';
  }).join('');
  return h + '<section class="sheet"><div class="tbl"><table><thead><tr><th>Persona</th><th>Nombre completo</th><th>Rol</th><th>Email de acceso</th><th>Abonos</th><th>Proyectos abiertos</th><th>Estado</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
}

function vComs() {
  const mf = S.mf, q = norm(mf.q);
  const list = S.M.filter(m => (!mf.cliente || m.cliente === mf.cliente) && (!mf.pend || (!m.hecho && m.proximo)) && (!q || norm([m.cliente, m.resumen, m.acuerdo, m.proximo, m.conQuien].join(' ')).includes(q)))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.creado || '').localeCompare(a.creado || ''));
  let h = '<div class="head"><div><h1>Seguimiento</h1><p>Lo que se habló con cada cliente (reunión, llamada, WhatsApp), qué se acordó y el próximo paso. Lo pendiente aparece en Inicio.</p></div><div class="toolbar">' + addBtn('comunicacion', 'Seguimiento') + '</div></div>' +
    '<div class="toolbar"><input class="in" type="search" id="mq" data-bind="mf.q" placeholder="Buscar en resúmenes y acuerdos" value="' + esc(mf.q) + '"><select class="in" id="mc" data-bind="mf.cliente" aria-label="Cliente">' + clienteOpts(mf.cliente, 'Todos los clientes') + '</select><label class="chk"><input type="checkbox" id="mp" data-bind="mf.pend"' + (mf.pend ? ' checked' : '') + '> Solo con paso pendiente</label></div>';
  if (!list.length) return h + '<section class="sheet">' + emptyBox(S.M.length ? 'Ningún registro coincide' : 'Todavía no hay seguimiento registrado', S.M.length ? '' : 'Registrá la primera reunión o llamada con un cliente.') + '</section>';
  return h + '<section class="sheet"><div class="timeline">' + list.map(m => comItem(m, false)).join('') + '</div><div class="count num">' + list.length + ' registros</div></section>';
}

function vListas() {
  let h = '<div class="head"><div><h1>Opciones</h1><p>Las opciones que aparecen en los desplegables.</p></div></div><div class="lists">';
  const etapaKeys = (S.L.tipos || []).filter(t => !['Redes', 'Ads'].includes(t)).map(t => ['etapas:' + t, 'Etapas · ' + t]);
  for (const [k, label] of [...Object.entries(LIST_LABELS), ...etapaKeys]) {
    const arr = S.L[k] || [];
    h += (etapaKeys.length && k === etapaKeys[0][0] ? '</div><h2 style="margin:8px 0 0">Etapas por tipo de proyecto</h2><p class="muted" style="margin:0">Se cargan al crear un proyecto de ese tipo. Cambiarlas no modifica los proyectos que ya existen.</p><div class="lists">' : '') + '<section class="sheet"><div class="sheet-h"><h3>' + esc(label) + '</h3><span class="muted num">' + arr.length + '</span></div><div class="sheet-b"><div class="chips">' +
      arr.map((v, i) => '<span class="chip">' + esc(v) + (isStaff() && !(k === 'estadosProyecto' && CERRADOS.has(v)) ? '<button aria-label="Quitar ' + esc(v) + '" data-act="listDel" data-k="' + k + '" data-i="' + i + '">×</button>' : '<span style="width:8px"></span>') + '</span>').join('') +
      '</div>' + (isStaff() ? '<form class="addrow" data-list="' + k + '"><input class="in" id="li-' + k + '" placeholder="Agregar valor" value="' + esc(S.listDraft[k] || '') + '" data-bind="listDraft.' + k + '"><button class="btn" type="submit">Agregar</button></form>' : '') + '</div></section>';
  }
  return h + '</div>';
}

const VIEW_FN = { inicio: vInicio, proyectos: vProyectos, abonos: vAbonos, mis: vMis, clientes: vClientes, equipo: vEquipo, comunicaciones: vComs, listas: vListas };

/* ---------- Render ---------- */
function render() {
  if (!S.me) return;
  const a = document.activeElement, fid = a && a.id && $('#view').contains(a) ? a.id : null;
  const sel = fid && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
  const kb = document.querySelector('.kb'), kbLeft = kb ? kb.scrollLeft : 0;
  if (!views().some(v => v[0] === S.view)) S.view = isExt() ? 'mis' : 'inicio';
  const counts = { ...(isAdmin() && ADM ? ADM.counts() : {}), proyectos: S.P.filter(isOpen).length, abonos: S.A.filter(a => a.estado === 'Activo').length, clientes: isStaff() ? S.C.filter(c => c.estado === 'Activo').length : 0, comunicaciones: pendientes().length };
  const item = ([k, l]) => '<button class="snav-i" data-act="go" data-view="' + k + '"' + (S.view === k ? ' aria-current="page"' : '') + '>' + (ICON[k] || '') + '<span class="snav-l">' + l + '</span>' + (counts[k] ? '<span class="snav-n' + (k === 'cobros' ? ' hot' : '') + '">' + counts[k] + '</span>' : '') + '</button>';
  const vs = new Map(views().map(v => [v[0], v[1]]));
  $('#nav').innerHTML = GRUPOS.map(([g, ks]) => { const its = ks.filter(k => vs.has(k)); return its.length ? '<span class="snav-g">' + g + '</span>' + its.map(k => item([k, vs.get(k)])).join('') : ''; }).join('');
  $('#nav2').hidden = true;
  const sync = $('#sync');
  sync.className = 'sync ' + (S.status === 'ok' ? 'ok' : S.status === 'offline' ? 'err' : '');
  sync.lastElementChild.textContent = S.status === 'ok' ? 'En vivo' : S.status === 'offline' ? 'Sin conexión' : 'Conectando';
  $('#me').innerHTML = avEditable('persona', S.me.id, S.me.alias, fotoDe(S.me.alias), '', true) + '<span class="me-t"><b>' + esc(S.me.alias) + '</b><span>' + esc(ROLES[S.me.rol]) + '</span></span>';
  if (S.status === 'loading') { $('#view').innerHTML = '<section class="sheet">' + emptyBox('Cargando datos del equipo…', '') + '</section>'; return; }
  $('#view').innerHTML = viewFn(S.view)();
  ponerHerramientas();
  const kb2 = document.querySelector('.kb'); if (kb2) kb2.scrollLeft = kbLeft;
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { } } }
}
function banner(msg, err) { const b = $('#banner'); if (!msg) { b.hidden = true; return; } b.innerHTML = msg; b.className = 'banner' + (err ? ' err' : ''); b.hidden = false; }
// Después de publicar una versión nueva, una pestaña abierta de antes pide archivos que ya no existen.
// En ese caso se recarga sola (una vez cada 30 s como máximo) en vez de mostrar el error.
const esVersionVieja = m => /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Unable to preload CSS/i.test(String(m || ''));
function recargarVersion() {
  let t = 0; try { t = +sessionStorage.getItem('andale-recarga') || 0; } catch (e) { /* sin storage */ }
  if (Date.now() - t < 30000) return false;
  try { sessionStorage.setItem('andale-recarga', String(Date.now())); } catch (e) { /* sin storage */ }
  const el = $('#toast'); if (el) { el.textContent = 'Hay una versión nueva de la app. Recargando…'; el.hidden = false; }
  setTimeout(() => location.reload(), 600); return true;
}
window.addEventListener('vite:preloadError', e => { if (recargarVersion()) e.preventDefault(); });
window.addEventListener('unhandledrejection', e => { if (esVersionVieja(e.reason && e.reason.message)) recargarVersion(); });
let toastT; function toast(msg) { if (esVersionVieja(msg) && recargarVersion()) return; const t = $('#toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }

/* ---------- Formularios ---------- */
const FORMS = {
  proyecto: { arr: 'P', title: 'proyecto', nuevo: 'Nuevo proyecto', label: p => p.proyecto, fields: [
    { k: 'cliente', label: 'Cliente', type: 'select', html: v => clienteOpts(v), req: 1, staffOnly: 1 },
    { k: 'proyecto', label: 'Proyecto', req: 1, staffOnly: 1 },
    { k: 'tipo', label: 'Tipo', type: 'select', opts: () => S.L.tipos, blank: '—', staffOnly: 1 },
    { k: 'estado', label: 'Estado', type: 'select', opts: () => S.L.estadosProyecto },
    { k: 'responsables', label: 'Responsables', type: 'multi', full: 1, staffOnly: 1 },
    { k: 'etapas', label: 'Etapas', type: 'etapas', full: 1 },
    { k: 'fechaInicio', label: 'Fecha de inicio', type: 'date' },
    { k: 'entrega', label: 'Entrega pactada', type: 'date', hint: 'Opcional' },
    { k: 'entregaReal', label: 'Entrega real', type: 'date' },
    { k: 'entregables', label: 'Entregables', type: 'textarea', full: 1, rows: 2 },
    { k: 'drive', label: 'Carpeta (Drive)', type: 'url', full: 1, ph: 'https://' },
    { k: 'slides', label: 'Presentación (Slides)', type: 'url', ph: 'https://' },
    { k: 'canva', label: 'Canva', type: 'url', ph: 'https://' },
    { k: 'notas', label: 'Notas', type: 'textarea', full: 1 },
  ], defaults: () => ({ estado: 'Por empezar', fechaInicio: today(), responsables: [] }), can: rec => rec ? canEditProj(rec) : isStaff() },
  abono: { arr: 'A', title: 'abono', nuevo: 'Nuevo abono', label: a => a.cliente + ' · ' + abonoLabel(a), fields: [
    { k: 'cliente', label: 'Cliente', type: 'select', html: v => clienteOpts(v), req: 1, full: 1 },
    { k: 'tipo', label: 'Tipo', type: 'select', opts: () => S.L.tiposAbono, req: 1 },
    { k: 'plan', label: 'Plan', type: 'select', opts: () => S.L.planes, blank: 'Sin plan' },
    { k: 'responsables', label: 'Responsables', type: 'multi', full: 1 },
    { k: 'desde', label: 'Desde (mes)', type: 'month' },
    { k: 'hasta', label: 'Hasta (mes, si se dio de baja)', type: 'month' },
    { k: 'estado', label: 'Estado', type: 'select', opts: () => ESTADOS_ABONO },
    { k: 'notas', label: 'Notas', type: 'textarea', full: 1 },
  ], defaults: () => ({ tipo: 'Redes', estado: 'Activo', desde: thisMonth(), responsables: [] }), can: () => isStaff() },
  cliente: { arr: 'C', title: 'cliente', nuevo: 'Nuevo cliente', label: c => c.nombre, fields: [
    { k: 'nombre', label: 'Cliente', req: 1, full: 1 },
    { k: 'estado', label: 'Estado', type: 'select', html: v => opt('__auto', 'Automático', v) + optsFrom(S.L.estadosCliente, v === '__auto' ? '' : v, undefined, VER_CL), hint: 'Se calcula solo con sus abonos y proyectos. Elegí otro solo si no coincide.' },
    { k: 'servicio', label: 'Servicio', type: 'select', opts: () => S.L.servicios, blank: '—' },
    { k: 'responsables', label: 'Responsables', type: 'multi', full: 1 },
    { k: 'plan', label: 'Plan', type: 'select', opts: () => S.L.planes, blank: '—' },
    { k: 'contacto', label: 'Contacto (nombre)' },
    { k: 'email', label: 'Email', type: 'email' },
    { k: 'tel', label: 'Teléfono / WhatsApp', type: 'tel' },
    { k: 'web', label: 'Instagram / web', ph: 'https:// o @usuario' },
    { k: 'carpeta', label: 'Carpeta del cliente', type: 'url', ph: 'https://' },
    { k: 'notas', label: 'Notas', type: 'textarea', full: 1, hint: 'No guardes contraseñas acá: usá el gestor de contraseñas del equipo.' },
  ], defaults: () => ({ estado: '__auto', responsables: [] }), can: () => isStaff() },
  persona: { arr: 'E', title: 'persona', nuevo: 'Nueva persona', label: e => e.persona, fields: [
    { k: 'persona', label: 'Cómo le decimos', req: 1 },
    { k: 'nombre', label: 'Nombre completo' },
    { k: 'puesto', label: 'Puesto o servicio', full: 1, ph: 'Ej.: Diseñadora, Proveedora de Ads' },
    { k: 'email', label: 'Email de acceso', type: 'email', full: 1, hint: 'Con este email entra a la app. Vacío = sin acceso.' },
    { k: 'rol', label: 'Rol', type: 'select', html: v => Object.entries(ROLES).map(([k, l]) => opt(k, l, v || 'equipo')).join('') },
    { k: 'tel', label: 'Teléfono', type: 'tel' },
    { k: 'activo', label: 'Activa/o (si no, pierde el acceso)', type: 'check', full: 1 },
    { k: 'notas', label: 'Notas', type: 'textarea', full: 1 },
  ], defaults: () => ({ activo: true, rol: 'equipo' }), can: () => isAdmin() },
  comunicacion: { arr: 'M', title: 'seguimiento', nuevo: 'Registrar seguimiento', label: m => m.cliente, fields: [
    { k: 'fecha', label: 'Fecha', type: 'date', req: 1 },
    { k: 'cliente', label: 'Cliente', type: 'select', html: v => clienteOpts(v), req: 1 },
    { k: 'canal', label: 'Canal', type: 'select', opts: () => S.L.canales, blank: '—' },
    { k: 'conQuien', label: 'Con quién' },
    { k: 'resumen', label: 'Resumen', type: 'textarea', full: 1 },
    { k: 'acuerdo', label: 'Acuerdo', type: 'textarea', full: 1, rows: 2 },
    { k: 'proximo', label: 'Próximo paso', full: 1 },
    { k: 'fechaProximo', label: 'Fecha del próximo paso', type: 'date' },
    { k: 'responsable', label: 'Responsable del paso', type: 'select', opts: personas, blank: 'Sin asignar', staffOnly: 1 },
    { k: 'hecho', label: 'Próximo paso hecho', type: 'check', full: 1 },
  ], defaults: () => ({ fecha: today(), responsable: S.me ? S.me.alias : '' }), can: rec => rec ? (isStaff() || (S.me && rec.responsable === S.me.alias)) : (isStaff() || isExt()) },
};

function etapasInner() {
  const e = (S.form && S.form.etapas) || [], ro = S.form && S.form.ro, tipo = ($('#f-tipo') || {}).value || '';
  return (e.length ? e.map((x, i) => '<div class="etrow"><label class="chk"><input type="checkbox" data-fet="' + i + '"' + (x.ok ? ' checked' : '') + (ro ? ' disabled' : '') + '> ' + esc(x.n) + '</label>' + (ro ? '' : '<button type="button" class="btn ghost sm" data-act="fetDel" data-i="' + i + '" aria-label="Quitar etapa">✕</button>') + '</div>').join('') : '<span class="muted">Sin etapas.</span>') +
    (ro ? '' : '<div class="etadd"><input class="in" id="f-etapa-nueva" placeholder="Agregar etapa"><button type="button" class="btn sm" data-act="fetAdd">Agregar</button>' + (plantilla(tipo).length ? '<button type="button" class="btn ghost sm" data-act="fetTpl">' + (e.length ? 'Reemplazar por' : 'Usar') + ' plantilla de ' + esc(tipo) + '</button>' : '') + '</div>');
}
function renderEtapasField() { const el = $('#f-etapas'); if (el) el.innerHTML = etapasInner(); }
function fieldHtml(f, v, ro) {
  if (f.type === 'etapas') return '<div class="field full"><span class="lbl">' + esc(f.label) + '</span><div id="f-etapas" class="etapas"></div><span class="hint">El avance del proyecto se ve por etapas. Las plantillas por tipo se editan en Opciones.</span></div>';
  const id = 'f-' + f.k, dis = (ro || (f.staffOnly && !isStaff())) ? ' disabled' : '';
  const hint = f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '';
  if (f.type === 'check') return '<label class="chk ' + (f.full ? 'full' : '') + '"><input type="checkbox" id="' + id + '"' + (v ? ' checked' : '') + dis + '> ' + esc(f.label) + '</label>';
  if (f.type === 'multi') {
    const sel = Array.isArray(v) ? v : (v ? [v] : []); const ps = personas(); const all = [...ps, ...sel.filter(p => !ps.includes(p))];
    return '<div class="field full"><span class="lbl">' + esc(f.label) + '</span><div class="multi" id="' + id + '">' + (all.length ? all.map(p => '<label><input type="checkbox" value="' + esc(p) + '"' + (sel.includes(p) ? ' checked' : '') + dis + '> ' + esc(p) + '</label>').join('') : '<span class="muted">Cargá personas en Equipo.</span>') + '</div></div>';
  }
  let ctl;
  if (f.type === 'textarea') ctl = '<textarea id="' + id + '" rows="' + (f.rows || 3) + '"' + dis + '>' + esc(v || '') + '</textarea>';
  else if (f.type === 'select') ctl = '<select id="' + id + '"' + dis + '>' + (f.html ? f.html(v || '') : optsFrom(f.opts(), v || '', f.blank)) + '</select>';
  else if (f.type === 'month') ctl = '<input id="' + id + '" type="month" value="' + esc(v || '') + '" placeholder="AAAA-MM"' + dis + '>';
  else ctl = '<input id="' + id + '" type="' + (f.type || 'text') + '" value="' + esc(v || '') + '"' + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + dis + '>';
  return '<div class="field ' + (f.full ? 'full' : '') + '"><label for="' + id + '">' + esc(f.label) + (f.req ? ' <b>*</b>' : '') + '</label>' + ctl + hint + '<span class="err" id="e-' + f.k + '" hidden></span></div>';
}

function openForm(kind, id, preset) {
  const def = FORMS[kind];
  const rec = id ? S[def.arr].find(x => x._id === id) : null;
  if (id && !rec) { toast('Ese registro ya no existe'); return; }
  const ro = !def.can(rec);
  S.form = { kind, id: id || null, ro };
  const vals = rec ? Object.assign({}, rec) : Object.assign(def.defaults(), preset || {});
  if (kind === 'cliente' && rec && !rec.estadoManual) vals.estado = '__auto';
  let foot;
  if (ro) foot = '<span class="muted">Solo lectura.</span><button type="button" class="btn" data-act="close">Cerrar</button>';
  else foot = '<span id="delzone">' + (rec && (isStaff() && (kind !== 'persona' || isAdmin())) ? '<button type="button" class="btn ghost danger" data-act="del">Eliminar</button>' : '') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary" id="savebtn">' + (rec ? 'Guardar cambios' : 'Crear ' + def.title) + '</button></span>';
  let adminBtn = '';
  if (isAdmin() && rec && kind === 'proyecto') adminBtn = '<div class="toolbar" style="grid-column:1/-1"><button type="button" class="btn sm" data-act="aProyAdm" data-id="' + esc(rec._id) + '">Presupuesto y cobro (administración)</button></div>';
  if (isAdmin() && rec && kind === 'abono') adminBtn = '<div class="toolbar" style="grid-column:1/-1"><button type="button" class="btn sm" data-act="aPrecio" data-abono="' + esc(rec._id) + '">Precio del abono (administración)</button>' + (rec.tipo === 'Ads' ? '<button type="button" class="btn sm" data-act="aAds" data-abono="' + esc(rec._id) + '">Pauta de Ads (administración)</button>' : '') + '</div>';
  const extra = adminBtn + (rec && rec.creado ? '<p class="formnote">Cargado el ' + fmt(rec.creado.slice(0, 10)) + (rec.actualizado ? ' · última edición ' + fmt(rec.actualizado.slice(0, 10)) : '') + '</p>' : '');
  const p = $('#panel');
  p.innerHTML = '<form id="form" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + (rec ? (ro ? 'Ver ' : 'Editar ') + def.title : 'Alta') + '</span><h2 id="panel-title">' + (rec ? esc(def.label(rec) || def.title) : def.nuevo) + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
    '<div class="panel-b">' + def.fields.map(f => fieldHtml(f, vals[f.k], ro)).join('') + extra + '</div><div class="panel-f">' + foot + '</div></form>';
  p.hidden = false; $('#scrim').hidden = false;
  if (kind === 'proyecto') { S.form.etapas = JSON.parse(JSON.stringify(vals.etapas || [])); if (!S.form.etapas.length && plantilla(vals.tipo).length && !rec) S.form.etapas = plantilla(vals.tipo).map(n => ({ n, ok: false })); renderEtapasField(); }
  if (!rec) { const first = p.querySelector('.panel-b input:not([type=checkbox]):not([disabled]),.panel-b select:not([disabled]),.panel-b textarea:not([disabled])'); if (first) first.focus(); }
}
function closeForm() { $('#panel').hidden = true; $('#scrim').hidden = true; S.form = null; }

async function saveForm() {
  if (!S.form || S.form.ro) return;
  const { kind, id } = S.form, def = FORMS[kind];
  const out = {}; let bad = false;
  const showErr = (k, msg) => { const e = $('#e-' + k); if (e) { e.textContent = msg; e.hidden = false; } bad = true; };
  for (const f of def.fields) {
    if (f.staffOnly && !isStaff()) continue;
    const el = $('#f-' + f.k);
    if (f.type === 'etapas') { out[f.k] = S.form.etapas || []; continue; }
    if (f.type === 'multi') out[f.k] = [...el.querySelectorAll('input:checked')].map(i => i.value);
    else out[f.k] = f.type === 'check' ? el.checked : el.value.trim();
    const e = $('#e-' + f.k); if (e) e.hidden = true;
    if (f.req && !out[f.k]) showErr(f.k, 'Completá este campo');
  }
  if (kind === 'comunicacion' && !isStaff()) out.responsable = S.me.alias;
  if (kind === 'cliente' && S.C.some(c => norm(c.nombre) === norm(out.nombre) && c._id !== id)) showErr('nombre', 'Ya existe un cliente con ese nombre');
  if (kind === 'persona' && S.E.some(x => norm(x.persona) === norm(out.persona) && x._id !== id)) showErr('persona', 'Ya hay alguien con ese nombre');
  if (kind === 'persona' && out.email && S.E.some(x => norm(x.email) === norm(out.email) && x._id !== id)) showErr('email', 'Ese email ya lo usa otra persona');
  if (kind === 'persona' && id && S.me && id === S.me.id && out.rol !== 'admin') showErr('rol', 'No podés quitarte el rol de administrador a vos mismo');
  if (kind === 'abono') {
    if (out.desde && !/^\d{4}-\d{2}$/.test(out.desde)) showErr('desde', 'Usá el formato AAAA-MM');
    if (out.hasta && !/^\d{4}-\d{2}$/.test(out.hasta)) showErr('hasta', 'Usá el formato AAAA-MM');
    if (out.estado === 'Baja' && !out.hasta) out.hasta = thisMonth();
  }
  if (bad) return;
  if (kind === 'proyecto' && out.estado === 'Entregado' && !out.entregaReal) out.entregaReal = today();
  if (kind === 'proyecto' && out.etapas && !out.etapas.length && !id && plantilla(out.tipo).length) out.etapas = plantilla(out.tipo).map(n => ({ n, ok: false }));
  if (kind === 'cliente') { if (out.estado === '__auto') { out.estadoManual = false; delete out.estado; } else out.estadoManual = out.estado !== estadoAuto(out.nombre); }
  const prev = id ? S[def.arr].find(x => x._id === id) : null;
  const btn = $('#savebtn'); if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  try {
    await data.save(kind, id, out, prev ? resp(prev) : []);
    closeForm(); toast(prev ? 'Cambios guardados' : 'Creado'); await reload();
  } catch (err) { toast(err.message); if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; } }
}
async function delRecord() {
  if (!S.form || !S.form.id) return;
  try { await data.remove(S.form.kind, S.form.id); if (S.form.kind === 'cliente') S.ficha = null; closeForm(); toast('Eliminado'); await reload(); }
  catch (err) { toast(err.message); }
}
async function upd(kind, id, patch, prevResp, quiet) {
  try { await data.update(kind, id, patch, prevResp); if (!quiet) toast('Actualizado'); await reload(); }
  catch (err) { toast(err.message); await reload(); }
}

/* ---------- Acciones ---------- */
function setBind(path, v) {
  const ks = path.split('.'); let o = S;
  for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
  o[ks[ks.length - 1]] = v;
  if (path === 'yo') lsSet('yo', v);
}
function menu(open) { const o = open === undefined ? !document.body.classList.contains('menu-open') : open; document.body.classList.toggle('menu-open', o); $('#sidescrim').hidden = !o; }
function go(view) { menu(false); view = resolver(view); S.view = view; S.ficha = null; S.pficha = null; if (ADM) ADM.resetView(); try { history.replaceState(null, '', '#' + view); } catch (e) { } render(); window.scrollTo(0, 0); }
async function saveListas(k, arr) {
  const prev = S.L[k]; S.L[k] = arr; render();
  try { await data.saveLista(k, arr); toast('Lista actualizada'); }
  catch (err) { S.L[k] = prev; render(); toast(err.message); }
}
function copyText(v) { try { navigator.clipboard.writeText(v).then(() => toast('Copiado'), () => toast(v)); } catch (e) { toast(v); } }
const ACT = {
  go: t => { if (t.dataset.pend) S.mf.pend = true; go(t.dataset.view); },
  tab: t => { S.tab[t.dataset.hub] = t.dataset.t; if (ADM) ADM.resetView(); render(); window.scrollTo(0, 0); },
  goProy: t => { S.f = { q: '', estado: t.dataset.estado || '', tipo: t.dataset.tipo || '', resp: '', cliente: '', plazo: t.dataset.plazo || '', abiertos: !(t.dataset.estado && CERRADOS.has(t.dataset.estado)) }; S.mode = 'lista'; go('proyectos'); },
  calendar: () => { S.mode = 'calendario'; lsSet('mode', 'calendario'); go('proyectos'); },
  mode: t => { S.mode = t.dataset.mode; lsSet('mode', S.mode); render(); },
  clearF: () => { S.f = { q: '', estado: '', tipo: '', resp: '', cliente: '', plazo: '', abiertos: true }; render(); },
  cfEstado: t => { S.cf.estado = t.dataset.estado; render(); },
  afTipo: t => { S.af.tipo = t.dataset.tipo; render(); },
  ficha: t => { S.ficha = t.dataset.cliente; S.pficha = null; S.view = 'clientes'; try { history.replaceState(null, '', '#clientes/' + encodeURIComponent(S.ficha)); } catch (e) { } render(); window.scrollTo(0, 0); },
  back: () => { S.ficha = null; try { history.replaceState(null, '', '#clientes'); } catch (e) { } render(); },
  pver: t => { const id = t.dataset.id; S.pficha = id; S.ficha = null; S.view = 'proyectos'; closeForm(); try { history.replaceState(null, '', '#proyectos/' + id); } catch (e) { } render(); window.scrollTo(0, 0); },
  pback: () => { S.pficha = null; try { history.replaceState(null, '', '#proyectos'); } catch (e) { } render(); },
  print: () => window.print(),
  exportar: () => exportarVista(),
  shareCopy: () => { copyText(location.href); cerrarShare(); },
  shareWa: () => { window.open('https://wa.me/?text=' + encodeURIComponent(tituloVista() + '\n' + location.href), '_blank', 'noopener'); cerrarShare(); },
  shareMail: () => { location.href = 'mailto:?subject=' + encodeURIComponent(tituloVista() + ' · àndale') + '&body=' + encodeURIComponent(tituloVista() + '\n' + location.href); cerrarShare(); },
  new: t => openForm(t.dataset.kind, null, t.dataset.preset ? JSON.parse(t.dataset.preset) : null),
  edit: t => openForm(t.dataset.kind, t.dataset.id),
  close: () => closeForm(),
  del: () => { $('#delzone').innerHTML = '<span class="muted" style="font-size:13px">¿Seguro?</span> <button type="button" class="btn danger sm" data-act="delYes">Sí, eliminar</button> <button type="button" class="btn ghost sm" data-act="delNo">No</button>'; },
  delNo: () => { $('#delzone').innerHTML = '<button type="button" class="btn ghost danger" data-act="del">Eliminar</button>'; },
  delYes: () => delRecord(),
  calMove: t => { const n = +t.dataset.d; S.cal = n ? addMonth(S.cal || thisMonth(), n) : null; render(); },
  copy: t => copyText(t.dataset.v),
  listDel: t => { const k = t.dataset.k, i = +t.dataset.i; saveListas(k, S.L[k].filter((_, j) => j !== i)); },
  menu: () => menu(),
  logout: async () => { await data.logout(); location.reload(); },
  cSelNone: () => { S.csel.clear(); render(); },
  etCargar: t => { const p = S.P.find(x => x._id === t.dataset.id); if (p) upd('proyecto', p._id, { etapas: plantilla(p.tipo).map(n => ({ n, ok: false })) }); },
  fetDel: t => { S.form.etapas.splice(+t.dataset.i, 1); renderEtapasField(); },
  fetAdd: () => { const i = $('#f-etapa-nueva'); const v = i && i.value.trim(); if (!v) return; S.form.etapas.push({ n: v, ok: false }); renderEtapasField(); const n = $('#f-etapa-nueva'); if (n) n.focus(); },
  fetTpl: () => { const tipo = ($('#f-tipo') || {}).value; S.form.etapas = plantilla(tipo).map(n => ({ n, ok: false })); renderEtapasField(); },
  cMasivo: async () => {
    const est = S.cmasivo, ids = [...S.csel]; if (!est || !ids.length) return;
    let ok = 0; const fails = [];
    for (const id of ids) { const c = S.C.find(x => x._id === id); if (!c) continue; try { await data.update('cliente', id, patchEstado(c, est)); ok++; } catch (err) { fails.push(err.message); } }
    S.csel.clear(); S.cmasivo = '';
    toast(ok + ' cliente' + (ok === 1 ? '' : 's') + ' → ' + (est === '__auto' ? 'automático' : VER_CL[est] || est) + (fails.length ? ' · ' + fails.length + ' con error: ' + fails[0] : ''));
    await reload();
  },
};

document.addEventListener('click', e => {
  if (!e.target.closest('details.pick') && S.openPick) { S.openPick = null; document.querySelectorAll('details.pick[open]').forEach(d => d.open = false); }
  const t = e.target.closest('[data-act]'); if (!t || t.tagName === 'A') return;
  if (t.tagName === 'TR' && e.target.closest('details.pick, select, input, label, td.sel')) return;
  const fn = ACT[t.dataset.act]; if (fn) { e.preventDefault(); fn(t, e); }
});
document.addEventListener('toggle', e => { const d = e.target; if (!d.matches || !d.matches('details.pick')) return; if (d.open) { S.openPick = d.dataset.pick; document.querySelectorAll('details.pick[open]').forEach(x => { if (x !== d) x.open = false; }); } else if (S.openPick === d.dataset.pick) S.openPick = null; }, true);
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset.bind && t.type !== 'checkbox' && t.tagName !== 'SELECT') { setBind(t.dataset.bind, t.value); if (!t.dataset.bind.startsWith('listDraft')) render(); }
});
document.addEventListener('change', async e => {
  const t = e.target;
  if (t.dataset && t.dataset.avatar && t.files && t.files[0]) {
    const f0 = t.files[0]; t.value = '';
    if (f0.size > 8e6) { toast('La imagen pesa demasiado (máx. 8 MB)'); return; }
    toast('Subiendo foto…');
    try { await data.subirAvatar(t.dataset.avatar, t.dataset.id, f0, !!t.dataset.propia); toast('Foto actualizada'); await reload(); }
    catch (err) { toast(err.message); }
    return;
  }
  if (t.dataset.bind && (t.type === 'checkbox' || t.tagName === 'SELECT')) { setBind(t.dataset.bind, t.type === 'checkbox' ? t.checked : t.value); render(); return; }
  if (t.dataset.rtoggle) {
    const kind = t.dataset.rtoggle, arr = S[FORMS[kind].arr];
    const rec = arr.find(x => x._id === t.dataset.id); if (!rec) return;
    let next = resp(rec).filter(p => p !== t.value); if (t.checked) next.push(t.value);
    upd(kind, rec._id, { responsables: next }, resp(rec), true);
    return;
  }
  if (t.dataset.etoggle) {
    const p = S.P.find(x => x._id === t.dataset.etoggle); if (!p) return;
    const next = etapasDe(p).map((x, i) => i === +t.dataset.i ? { ...x, ok: t.checked } : x);
    p.etapas = next; S.openPick = 'etapa:' + p._id;
    upd('proyecto', p._id, { etapas: next }, null, true);
    if (next.length && next.every(x => x.ok) && isOpen(p)) toast('Todas las etapas listas. ¿Lo pasás a Entregado?');
    return;
  }
  if (t.dataset.fet !== undefined && S.form && S.form.etapas) { S.form.etapas[+t.dataset.fet].ok = t.checked; return; }
  if (t.id === 'f-tipo' && S.form && S.form.kind === 'proyecto' && S.form.etapas && !S.form.etapas.length && plantilla(t.value).length) { S.form.etapas = plantilla(t.value).map(n => ({ n, ok: false })); renderEtapasField(); return; }
  if (t.id === 'f-tipo' && S.form && S.form.kind === 'proyecto') { renderEtapasField(); return; }
  if (t.dataset.csel) { if (t.checked) S.csel.add(t.dataset.csel); else S.csel.delete(t.dataset.csel); render(); return; }
  if (t.dataset.cselall) { const ids = [...document.querySelectorAll('[data-csel]')].map(x => x.dataset.csel); ids.forEach(id => t.checked ? S.csel.add(id) : S.csel.delete(id)); render(); return; }
  if (t.dataset.upd === 'cliente' && t.dataset.field === 'estado') {
    const c = S.C.find(x => x._id === t.dataset.id);
    if (!c) return;
    const pe = patchEstado(c, t.value);
    (async () => { try { await data.update('cliente', t.dataset.id, pe); toast(c.nombre + (t.value === '__auto' ? ' vuelve al estado automático' : ' → ' + (VER_CL[t.value] || t.value) + (pe.estadoManual ? ' (fijado a mano)' : ''))); await reload(); } catch (err) { toast(err.message); await reload(); } })();
    return;
  }
  if (t.dataset.upd) {
    const kind = t.dataset.upd, field = t.dataset.field, val = t.type === 'checkbox' ? t.checked : t.value;
    const patch = { [field]: val };
    if (kind === 'proyecto' && field === 'estado' && val === 'Entregado') { const p = S.P.find(x => x._id === t.dataset.id); if (p && !p.entregaReal) patch.entregaReal = today(); }
    if (kind === 'abono' && field === 'estado' && val === 'Baja') { const a = S.A.find(x => x._id === t.dataset.id); if (a && !a.hasta) patch.hasta = thisMonth(); }
    upd(kind, t.dataset.id, patch);
  }
});
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'form') { saveForm(); return; }
  if (f.id === 'login') {
    const email = f.querySelector('input').value.trim(), btn = f.querySelector('button'), msg = $('#login-msg');
    if (!email) return;
    btn.disabled = true; btn.textContent = 'Enviando…';
    try {
      await data.sendLink(email);
      msg.textContent = 'Listo. Revisá tu email (' + email + ') y abrí el link para entrar. Puede tardar un minuto; si no aparece, mirá en spam.';
      btn.textContent = 'Link enviado ✓';
      setTimeout(() => { btn.disabled = false; btn.textContent = 'Reenviar el link'; }, 60000);
    }
    catch (err) { msg.textContent = err.message; btn.disabled = false; btn.textContent = 'Enviarme el link'; }
    return;
  }
  if (f.dataset.list) {
    const k = f.dataset.list, v = f.querySelector('input').value.trim();
    if (!v) return;
    if ((S.L[k] || []).some(x => norm(x) === norm(v))) { toast('Ese valor ya está en la lista'); return; }
    S.listDraft[k] = '';
    saveListas(k, [...(S.L[k] || []), v]);
  }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape' && (S.form || !$('#panel').hidden)) closeForm(); });
window.addEventListener('hashchange', () => { const prev = [S.view, S.ficha, S.pficha].join('|'); leerHash(); if (!viewFn(S.view)) S.view = 'inicio'; if ([S.view, S.ficha, S.pficha].join('|') !== prev) { render(); window.scrollTo(0, 0); } });

/* Arrastrar en el tablero */
let dragId = null;
document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('[data-drag]'); if (!c) return; dragId = c.dataset.drag; try { e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; } catch (_) { } c.classList.add('dragging'); });
document.addEventListener('dragend', e => { const c = e.target.closest && e.target.closest('[data-drag]'); if (c) c.classList.remove('dragging'); document.querySelectorAll('.col.over').forEach(x => x.classList.remove('over')); });
document.addEventListener('dragover', e => { const col = e.target.closest && e.target.closest('[data-drop]'); if (!col || !dragId) return; e.preventDefault(); document.querySelectorAll('.col.over').forEach(x => { if (x !== col) x.classList.remove('over'); }); col.classList.add('over'); });
document.addEventListener('drop', e => {
  const col = e.target.closest && e.target.closest('[data-drop]'); if (!col || !dragId) return;
  e.preventDefault(); col.classList.remove('over');
  const p = S.P.find(x => x._id === dragId), estado = col.dataset.drop; dragId = null;
  if (!p || p.estado === estado) return;
  const patch = { estado }; if (estado === 'Entregado' && !p.entregaReal) patch.entregaReal = today();
  p.estado = estado; render();
  upd('proyecto', p._id, patch);
});

/* ---------- Arranque ---------- */
async function reload() {
  try {
    const d = await data.loadAll();
    const L = {}; for (const k of Object.keys(DEF)) L[k] = Array.isArray(d.L[k]) && d.L[k].length ? [...d.L[k]] : [...DEF[k]];
    for (const [k, v] of Object.entries(d.L || {})) if (k.startsWith('etapas:') && Array.isArray(v)) L[k] = [...v];
    Object.assign(S, { P: d.P, C: d.C, E: d.E, M: d.M, A: d.A, L, status: 'ok' });
    if (isAdmin() && ADM) await ADM.load();
    banner('');
  } catch (err) { S.status = 'offline'; banner(esc(err.message), true); }
  render();
}
function showLogin(msg) {
  $('#top').hidden = true;
  $('#view').innerHTML = '<div class="login"><div class="login-card"><div class="brand"><span class="logo" role="img" aria-label="àndale">' + LOGO + '</span> <small>Operaciones</small></div><p>Entrá con tu email de trabajo. Te mandamos un link para ingresar, sin contraseña.</p>' +
    '<form id="login"><input class="in" type="email" required autocomplete="email" placeholder="tu@email.com" aria-label="Email"><button class="btn primary" type="submit">Enviarme el link</button></form><p id="login-msg" class="muted" role="status">' + esc(msg || '') + '</p></div></div>';
}
function showNoAccess(email) {
  $('#top').hidden = true;
  $('#view').innerHTML = '<div class="login"><div class="login-card"><div class="brand"><span class="logo" role="img" aria-label="àndale">' + LOGO + '</span> <small>Operaciones</small></div><h2>Tu email todavía no tiene acceso</h2><p>Entraste como <b>' + esc(email || '') + '</b>, pero no figura en el equipo. Pedile a Fer o a Jime que te carguen en Equipo con este email.</p><button class="btn" data-act="logout">Salir y probar con otro email</button></div></div>';
}
let started = false;
async function start(sess) {
  if (started) return; started = true;
  let me = null;
  try { me = await data.yo(); } catch (err) { showLogin(err.message); started = false; return; }
  if (!me) { showNoAccess(sess && sess.user && sess.user.email); started = false; return; }
  S.me = me;
  if (me.rol === 'admin' && !ADM) {
    ADM = initAdmin({ S, subnav, esc, opt, optsFrom, pill, stVar, fmt, monthLabel, thisMonth, addMonth, today, diff, cmp, norm, emptyBox, clienteOpts, toast, $, render, reload, closeForm, copyText });
    ADM_FN = Object.fromEntries(ADM.views.map(([k, , fn]) => [k, fn]));
    Object.assign(ACT, ADM.actions);
  }
  $('#top').hidden = false;
  $('#hoy').textContent = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  if (isExt()) S.yo = me.alias; else if (!S.yo) S.yo = me.alias;
  render();
  await reload();
  data.live(reload, s => { if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { S.status = 'offline'; render(); } });
  window.addEventListener('focus', reload);
}

(async () => {
  if (!data.configured) { $('#view').innerHTML = '<div class="login"><div class="login-card"><h2>Falta configurar la base de datos</h2><p>Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</p></div></div>'; return; }
  data.onAuth((ev, s) => { if (ev === 'SIGNED_IN' && s) start(s); if (ev === 'SIGNED_OUT') { S.me = null; started = false; showLogin(); } });
  const s = await data.session();
  if (s) start(s); else showLogin();
})();
