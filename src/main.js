import './fonts.css';
import './style.css';
import { activarFormato, telefono as fmtTel, telefonoFijo as fmtFijo } from './formato.js';
import { siWhatsapp } from 'simple-icons';
import { LOGO, ISO } from './marca.js';
import { ICON, iconizar } from './iconos.js';
import { initExportar } from './exportar.js';
import * as data from './data.js';
import { initAdmin } from './admin.js';
import { initIA } from './ia.js';
import { initCombo } from './combo.js';
import { initMails } from './mails.js';
import { initIntegraciones } from './integraciones.js';
import { initTrabajo } from './trabajo.js';
import { initHilos } from './hilos.js';
import { initRedes, FLUJO_DEF, HORAS_DEF, PZ_COLOR, REDES_G, redChips, pzNombre } from './redes.js';
import { initTickets } from './tickets.js';
import { initEntregas } from './entregas.js';
import { initInformes } from './informes.js';
import { initReloj } from './reloj.js';
import { initFichaMarca } from './fichamarca.js';
import { initAutomatizar } from './automatizar.js';
import { firmaDe, firmanteDe, firmaConfig, firmantes, personaIdDe, FIRMA_YO, FIRMA_NO } from './firma.js';
import { initPerfil, aplicarTema, temaGuardado } from './perfil.js';
import { masMenu, vistaSel, vistaDe, guardarVista, toastAccion, uiActs, filtrosMenu, reabrir } from './ui.js';
import * as E from './emails.js';
import { confirmar, avisar as avisarDlg } from './dialogo.js';
import { initAtajos } from './atajos.js';
import { initAyuda } from './ayuda.js';
initCombo();
document.querySelectorAll('.brand .logo:empty').forEach(el => { el.innerHTML = LOGO; });
let ADM = null, ADM_FN = {}, MAIL = null;
let IA = null;
let TRAB = null, HIL = null, RED = null, TKS = null;

/* ---------- Constantes ---------- */
const DEF = {
  tipos: ['Redes', 'Branding', 'Packaging', 'Web', 'Ads', 'Diseño', 'Audiovisual', 'Otro'],
  tiposAbono: ['Redes', 'Ads'],
  estadosProyecto: ['Presupuestado', 'Por empezar', 'En curso', 'En revisión', 'Entregado', 'Pausado', 'Cancelado', 'A confirmar'],
  estadosCliente: ['Activo', 'A confirmar', 'Proyectos', 'Pausado', 'Inactivo'],
  canales: ['Reunión', 'Videollamada', 'WhatsApp', 'Email', 'Llamada', 'Instagram', 'Otro'],
  servicios: ['Redes sociales', 'Ads', 'Redes sociales + Ads', 'Branding', 'Web', 'Diseño', 'Audiovisual', 'Comunicación integral', 'Asesoramiento', 'Otro'],
  planes: ['SMALL', 'MEDIUM', 'PREMIUM', 'LARGE', 'SMALL+ADS', 'PACK RRSS', 'ESPECIAL'],
  rubros: ['Ads', 'Programación', 'Fotografía', 'Audiovisual', 'Contenido', 'Diseño', 'Contable', 'Otro'],
  monedas: ['ARS', 'USD', 'EUR', 'GBP'],
  formatosRedes: ['Reels', 'Posts', 'Historias', 'Carruseles'],
  rolesCuenta: ['Dirección', 'Cuentas y programación', 'Diseño', 'Ads', 'Contenido', 'Branding', 'Otro'],
  plataformasAds: ['Meta', 'Google', 'TikTok', 'LinkedIn', 'YouTube'],
  flujoRedes: FLUJO_DEF,
  horasRedes: HORAS_DEF,
  resultadosAds: ['Conversaciones iniciadas', 'Mensajes', 'Clics', 'Leads', 'Compras', 'Seguidores', 'Visitas al sitio'],
};
const LIST_LABELS = { tipos: 'Tipos de proyecto', tiposAbono: 'Tipos de abono', estadosProyecto: 'Estados de proyecto', estadosCliente: 'Estados de cliente', canales: 'Canales de comunicación', servicios: 'Servicios', planes: 'Planes', rubros: 'Rubros de proveedores', monedas: 'Monedas (código de 3 letras: ARS, USD, EUR, GBP…)', formatosRedes: 'Formatos de redes (son también las carpetas de cada mes en Dropbox)', rolesCuenta: 'Roles en las cuentas de Redes y Ads', plataformasAds: 'Plataformas de pauta (Ads)', resultadosAds: 'Qué se mide en Ads (resultado principal)' };
const ESTADOS_ABONO = ['Activo', 'Pausado', 'Baja'];
const ROLES = { admin: 'Administrador', equipo: 'Equipo', externo: 'Externo' };
const CERRADOS = new Set(['Entregado', 'Cancelado']);
const ST_COLOR = { 'Presupuestado': '--s-presup', 'Por empezar': '--s-empezar', 'En curso': '--s-curso', 'En revisión': '--s-revision', 'Entregado': '--s-entregado', 'Pausado': '--s-pausado', 'Cancelado': '--s-cancelado', 'A confirmar': '--s-confirmar' };
const CL_COLOR = { 'Activo': '--s-entregado', 'A confirmar': '--s-confirmar', 'Proyectos': '--s-curso', 'Pausado': '--s-pausado', 'Inactivo': '--s-empezar' };
const VER_CL = { 'Proyectos': 'Solo proyectos' }; // solo para mostrar: el valor guardado no cambia
const TIPO_COLOR = { Branding: '--accent', Packaging: '--t-naranja', Web: '--s-curso', Diseño: '--s-confirmar', Audiovisual: '--s-presup', Redes: '--t-rosa', Ads: '--t-ambar', Otro: '--s-empezar' };
const AB_COLOR = { 'Activo': '--s-entregado', 'Pausado': '--s-pausado', 'Baja': '--s-empezar' };
const ROL_COLOR = { admin: '--s-confirmar', equipo: '--s-curso', externo: '--s-revision' };
const ALL_VIEWS = [['inicio', 'Inicio'], ['proyectos', 'Proyectos'], ['redes', 'Redes'], ['tickets', 'Tickets'], ['briefs', 'Briefs'], ['mis', 'Mis trabajos'], ['clientes', 'Clientes'], ['equipo', 'Equipo'], ['comunicaciones', 'Charlas'], ['listas', 'Trabajo y Redes'], ['mails', 'Mails'], ['integraciones', 'Integraciones']];
// Menú lateral: grupos por tipo de tarea. Las vistas de administración las aporta admin.js.
// Menú en 5 secciones. Cada sección agrupa pantallas que se ven como pestañas arriba; las rutas (#proyectos, #cobros…) no cambian.
// Menú en secciones que se despliegan: lo del día a día (trabajo y clientes) por un lado, lo financiero por otro.
// Las rutas (#proyectos, #cobros…) no cambian; una sección se abre sola cuando estás adentro y se pliega o despliega con un clic.
const SECCIONES = [
  ['inicio', 'Inicio', 'inicio', ['inicio']],
  ['trabajo', 'Trabajo', 'tarea', ['mis', 'proyectos', 'redes', 'tickets']],
  ['clientes', 'Clientes', 'clientes', ['clientes', 'propuestas', 'briefs', 'comunicaciones']],
  ['equipo', 'Equipo', 'mis', ['equipo', 'sueldos', 'aumentos']],
  ['finanzas', 'Finanzas', 'plata', ['plata', 'cuentas', 'cobros', 'gastos', 'proveedores', 'precios', 'numeros']],
  ['config', 'Configuración', 'ajustes', ['ajustes', 'mails', 'listas', 'integraciones', 'automatizaciones', 'datos']],
];
const TAB_LABEL = { mis: 'Mis trabajos', plata: 'Hoy y lo que viene', cuentas: 'Saldos de clientes', propuestas: 'Presupuestos', equipo: 'Personas', sueldos: 'Sueldos del mes', precios: 'Precios a clientes', listas: 'Trabajo y Redes', ajustes: 'Facturación', datos: 'Datos de la app', comunicaciones: 'Charlas' };
const seccionDe = v => (SECCIONES.find(x => x[3].includes(v)) || SECCIONES[0])[0];
// Pantallas que ahora viven como pestañas de otra (los links viejos y los emails siguen funcionando).
const ALIAS = { asistente: ['cobros', 'mes'], cierre: ['cobros', 'mes'], facturas: ['cobros', 'facturas'], caja: ['gastos', 'movs'], abonos: ['redes', 'planes'], pagos: ['sueldos', 'mes'], estadisticas: ['numeros', 'stats'], rentabilidad: ['numeros', 'rent'] };
const resolver = v => { const a = ALIAS[v]; if (!a) return v; S.tab[a[0]] = a[1]; return a[0]; };
/** Pestañas de una pantalla: [[clave, rótulo, cantidad?], ...] */
function subnav(hub, tabs) {
  const cur = S.tab[hub] || tabs[0][0];
  const SUBI = { mes: 'cierre', facturas: 'facturas', drive: 'drive', movs: 'caja', banco: 'banco', stats: 'estadisticas', rent: 'rentabilidad', meses: 'redes', planes: 'abonos' };
  return '<nav class="subnav" aria-label="Secciones">' + tabs.map(([k, l, n]) => '<button data-act="tab" data-hub="' + hub + '" data-t="' + k + '"' + (cur === k ? ' aria-current="page"' : '') + '>' + (ICON[SUBI[k]] || '') + esc(l) + (n ? '<span class="snav-n hot">' + n + '</span>' : '') + '</button>').join('') + '</nav>';
}
const EXT_VIEWS = ['mis', 'proyectos', 'redes', 'clientes', 'comunicaciones'];

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
// "hace 2 años y 3 meses" a partir de un mes AAAA-MM
const antig = m => { const [y, mm] = String(m).slice(0, 7).split('-').map(Number), [ty, tm] = thisMonth().split('-').map(Number), n = (ty - y) * 12 + (tm - mm); if (n <= 0) return 'este mes'; const a = Math.floor(n / 12), r = n % 12; return 'hace ' + (a ? a + (a === 1 ? ' año' : ' años') : '') + (a && r ? ' y ' : '') + (r ? r + (r === 1 ? ' mes' : ' meses') : ''); };
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
  P: [], C: [], E: [], M: [], A: [], K: null, L: JSON.parse(JSON.stringify(DEF)),
  view: 'inicio', mode: lsGet('mode') || 'lista',
  f: { q: '', estado: '', tipo: '', resp: '', cliente: '', plazo: '', abiertos: true },
  af: { q: '', tipo: '', estado: 'Activo', resp: '' },
  cf: { q: '', estado: 'Activo' }, csel: new Set(), cmasivo: '', ficha: null,
  cal: null, yo: lsGet('yo') || '',
  mf: { q: '', cliente: '', pend: false },
  tab: {}, cuq: '',
  form: null, listDraft: {}, openPick: null, busy: false, gcl: new Set(JSON.parse(lsGet('gcl') || '[]')),
  T: false, FL: null, N: null, sinHilos: true, hq: null, tkVista: lsGet('tkVista') || 'etapa',
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
  const full = decodeURIComponent(location.hash.slice(1)); if (!full) return;
  const qi = full.indexOf('?'), h = qi >= 0 ? full.slice(0, qi) : full;
  S.hq = qi >= 0 ? Object.fromEntries(new URLSearchParams(full.slice(qi + 1))) : null;
  const [v, ...rest] = h.split('/'); const arg = rest.join('/');
  S.view = resolver(v); S.ficha = null; S.pficha = null; S.rmFicha = null;
  if (v === 'proyectos' && arg) S.pficha = arg;
  if (v === 'redes' && arg) S.rmFicha = arg;
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
/* ---------- Roles en las cuentas de Redes y Ads ---------- */
const rolesCuenta = () => (S.L.rolesCuenta && S.L.rolesCuenta.length ? S.L.rolesCuenta : DEF.rolesCuenta);
const rolDe = (a, alias) => (a && a.roles && a.roles[alias]) || '';
const ordenRol = r => { const i = rolesCuenta().indexOf(r); return i < 0 ? 99 : i; };
const equipoFijo = () => (S.L.equipoFijo || []).map(x => { const i = String(x).indexOf('='); return i > 0 ? { a: x.slice(0, i), rol: x.slice(i + 1) } : null; }).filter(x => x && personas().includes(x.a));
// El equipo de un cliente en Redes y Ads: quién está y con qué rol (el de Redes manda si está en las dos).
function equipoCuenta(cliente) {
  const m = new Map();
  S.A.filter(a => a.cliente === cliente && vivo(a) && (a.tipo === 'Redes' || a.tipo === 'Ads')).sort((x, y) => (x.tipo === 'Redes' ? 0 : 1) - (y.tipo === 'Redes' ? 0 : 1))
    .forEach(ab => resp(ab).forEach(x => { const e = m.get(x) || { a: x, rol: '', tipos: [] }; e.rol = e.rol || rolDe(ab, x); e.tipos.push(ab.tipo); m.set(x, e); }));
  return [...m.values()].sort((p, q) => ordenRol(p.rol) - ordenRol(q.rol) || cmp(p.a, q.a));
}
const conRolTxt = e => esc(e.a) + (e.rol ? ' <span class="muted">(' + esc(e.rol) + ')</span>' : '');
// Selector de equipo con rol, para la tabla de Redes y Ads
function pickerRol(o) {
  const sel = [...resp(o)].sort((x, y) => ordenRol(rolDe(o, x)) - ordenRol(rolDe(o, y))), key = 'abono:' + o._id;
  const resumen = sel.length ? '<span class="whos"><span class="avs">' + sel.map(p => av(p + (rolDe(o, p) ? ' · ' + rolDe(o, p) : ''), fotoDe(p))).join('') + '</span><span class="wn">' + esc(sel.join(', ')) + '</span></span>' : '<span class="muted">Sin asignar</span>';
  if (!isStaff()) return resumen;
  const ps = personas(), all = [...ps, ...sel.filter(p => !ps.includes(p))];
  return '<details class="pick" data-pick="' + esc(key) + '"' + (S.openPick === key ? ' open' : '') + '><summary title="Quién trabaja en esta cuenta">' + resumen + '</summary><div class="menu menu-rol">' +
    all.map(p => '<label class="rol-f"><span>' + av(p, fotoDe(p)) + esc(p) + '</span><select class="in sm" data-rrol="' + esc(o._id) + '" data-a="' + esc(p) + '" aria-label="Rol de ' + esc(p) + '">' + opt('', '—', sel.includes(p) ? '__' : '') + opt('__', 'Está, sin rol', sel.includes(p) && !rolDe(o, p) ? '__' : '') + rolesCuenta().map(r => opt(r, r, sel.includes(p) ? rolDe(o, p) : '')).join('') + '</select></label>').join('') + '</div></details>';
}
function equipoField(id, sel, roles, dis) {
  const ps = personas(), all = [...ps, ...sel.filter(p => !ps.includes(p))];
  const val = p => sel.includes(p) ? (roles[p] || '__') : '';
  return '<div class="rol-lista" id="' + id + '">' + (all.length ? all.map(p => '<label class="rol-f"><span>' + av(p, fotoDe(p)) + esc(p) + '</span><select class="in sm" data-eqa="' + esc(p) + '"' + dis + ' aria-label="Rol de ' + esc(p) + '">' + opt('', 'No está en la cuenta', val(p)) + opt('__', 'Está, sin rol', val(p)) + rolesCuenta().map(r => opt(r, r, val(p))).join('') + '</select></label>').join('') : '<span class="muted">Cargá personas en Equipo.</span>') + '</div>';
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
// WhatsApp directo (sin API): abre el chat con el teléfono del cliente.
// Número para wa.me: Argentina siempre como celular (54 9 + área + número), sin el 0 ni el 15. 0351 15 705-3527 → 5493517053527
function waNum(tel) {
  let d = String(tel || '').replace(/\D/g, ''); if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  const sin15 = x => x.length === 12 ? x.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2') : x;
  if (d.startsWith('54')) { let r = d.slice(2); if (r.startsWith('9')) return d; r = sin15(r.replace(/^0/, '')); return '549' + r; }
  const ar = sin15(d.replace(/^0/, ''));
  return ar.length === 10 ? '549' + ar : d; // si no parece argentino, va como está (con su código de país)
}
function waHref(tel, nombre, txt) {
  const n = waNum(tel); if (!n || !integ('whatsapp')) return '';
  const nom = String(nombre || '').split(/[,/]/)[0].trim().split(' ')[0];
  const m = txt || String(integr().cfgGet('whatsapp', 'msg') || '').replace(/\\n/g, '\n').replace(/\{nombre\}/g, nom).replace(/ ,/g, ',');
  return 'https://wa.me/' + n + (m ? '?text=' + encodeURIComponent(m) : '');
}
const WA_ICO = '<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="' + siWhatsapp.path + '"/></svg>';
function waBtn(c, txt) { const h = waHref(c.tel, c.contacto, txt); return h ? '<a class="btn ico-b wa-btn" data-act="ext" href="' + h + '" target="_blank" rel="noopener" title="Abrir WhatsApp" aria-label="Abrir WhatsApp">' + WA_ICO + '</a>' : ''; }

// Contactos del cliente (dueña, marketing, administración…). Si la tabla todavía no existe, se usa el contacto cargado en el cliente.
const ROLES_CONTACTO = ['Dueña/o', 'Gerencia', 'Marketing', 'Comunicación', 'Administración', 'Diseño', 'Ventas', 'RRHH', 'Agencia o proveedor'];
const conTabla = () => Array.isArray(S.K);
function contactosDe(nombre) {
  const c = S.C.find(x => x.nombre === nombre); if (!c) return [];
  if (conTabla()) return S.K.filter(k => k.cliente === nombre).sort((a, b) => (b.principal - a.principal) || (a.orden - b.orden) || cmp(a.nombre, b.nombre));
  const mails = String(c.email || '').split(/[,;\s]+/).filter(Boolean);
  return (c.contacto || mails.length || c.tel) ? [{ _id: '', _virt: true, cliente: nombre, nombre: c.contacto || '', rol: '', email: mails.join(', '), tel: c.tel || '', principal: true, cobros: true, notas: '' }] : [];
}
const nomContacto = k => (k.nombre || '').trim() || (k.email || '').split('@')[0] || 'Sin nombre';
function contactoTxt(c) { const ks = contactosDe(c.nombre); return ks.length ? nomContacto(ks[0]) + (ks.length > 1 ? ' +' + (ks.length - 1) : '') : ''; }
function contactosBusca(c) { return contactosDe(c.nombre).map(k => [k.nombre, k.rol, k.email].join(' ')).join(' '); }
function contactosHtml(c) {
  const ks = contactosDe(c.nombre), can = isStaff() && conTabla();
  const card = k => '<div class="ctc' + (can ? ' click' : '') + '"' + (can ? ' data-act="kEdit" data-id="' + esc(k._id) + '" data-cliente="' + esc(c.nombre) + '"' : '') + '>' + av(nomContacto(k), '', '') +
    '<div class="ctc-b"><div class="ctc-t"><b>' + esc(nomContacto(k)) + '</b>' + (k.rol ? '<span class="ctc-rol">' + esc(k.rol) + '</span>' : '') + '</div>' +
    '<div class="ctc-tags">' + (k.principal ? '<span class="ctag pri">Principal</span>' : '') + (k.cobros ? '<span class="ctag cob">Recibe cobros</span>' : '') + (k.portal ? '<span class="ctag por">Portal</span>' : '') + '</div>' +
    (k.email || k.tel || k.telFijo ? '<div class="ctc-l">' + [k.email, k.tel, k.telFijo ? 'Fijo ' + k.telFijo : ''].filter(Boolean).map(esc).join(' · ') + '</div>' : '') +
    (k.notas ? '<div class="ctc-n">' + esc(k.notas) + '</div>' : '') + '</div>' +
    '<div class="ctc-a">' + (k.email && isStaff() ? '<button class="ctc-ic" data-act="mail" data-cliente="' + esc(c.nombre) + '" data-para="' + esc(k.email) + '" title="Escribirle un mail desde la app" aria-label="Escribirle un mail a ' + esc(nomContacto(k)) + '">' + ICON.mail + '</button>' : '') +
    (waHref(k.tel, k.nombre) ? '<a class="ctc-ic wa" data-act="ext" href="' + waHref(k.tel, k.nombre) + '" target="_blank" rel="noopener" title="Abrir WhatsApp" aria-label="WhatsApp a ' + esc(nomContacto(k)) + '">' + WA_ICO + '</a>' : '') +
    (k.telFijo ? '<a class="ctc-ic" data-act="ext" href="tel:' + esc(String(k.telFijo).replace(/[^\d+]/g, '')) + '" title="Llamar al fijo" aria-label="Llamar al fijo de ' + esc(nomContacto(k)) + '">' + ICON.telefono + '</a>' : '') + '</div></div>';
  const cob = ks.filter(k => k.cobros && k.email).length;
  return '<section class="sheet"><div class="sheet-h"><div><h2>Contactos</h2><p class="muted" style="margin:4px 0 0;font-size:13px">' + (ks.length ? ks.length + (ks.length === 1 ? ' persona' : ' personas') + (cob ? ' · ' + cob + ' reciben resúmenes y facturas' : '') : 'Con quién hablamos en ' + esc(c.nombre) + '.') + '</p></div>' + (can ? '<button class="btn sm" data-act="kNuevo" data-cliente="' + esc(c.nombre) + '">+ Contacto</button>' : '') + '</div>' +
    (ks.length ? '<div class="ctcs">' + ks.map(card).join('') + '</div>' : emptyBox('Sin contactos', can ? 'Sumá a las personas con las que hablamos: dueña, marketing, administración…' : '')) + '</section>';
}
const PORTAL_URL = 'https://andale-ops.vercel.app/portal';
function invitacionPortal() {
  const g = n => ((($('#k-' + n) || {}).value) || '').trim(), nom = g('nombre').split(' ')[0];
  return 'Hola' + (nom ? ' ' + nom : '') + ', ¿cómo estás? Te habilitamos el portal de clientes de àndale: ahí vas a poder ver y aprobar el contenido de redes, revisar las entregas de los proyectos, seguir tu web y pedirnos cosas puntuales.\n\nEntrás acá con tu email' + (g('email') ? ' (' + g('email') + ')' : '') + ', sin contraseña: te llega un link para ingresar.\n' + PORTAL_URL + '\n\nCualquier cosa nos escribís.';
}
function abrirContacto(cliente, id) {
  const k = id ? (S.K || []).find(x => x._id === id) : null;
  if (id && !k) { toast('Ese contacto ya no existe'); return; }
  const primero = !contactosDe(cliente).length;
  const v = k || { nombre: '', rol: '', email: '', tel: '', telFijo: '', principal: primero, cobros: primero, notas: '' };
  S.form = null; S.kf = { cliente, id: id || null, principal: !!(k && k.principal) };
  const fld = (n, l, val, type, extra) => '<div class="field' + (extra && extra.full ? ' full' : '') + '"><label for="k-' + n + '">' + l + '</label><input id="k-' + n + '" type="' + (type || 'text') + '" value="' + esc(val || '') + '"' + (extra && extra.list ? ' list="' + extra.list + '"' : '') + (extra && extra.ph ? ' placeholder="' + esc(extra.ph) + '"' : '') + '>' + (extra && extra.hint ? '<span class="hint">' + esc(extra.hint) + '</span>' : '') + '<span class="err" id="ke-' + n + '" hidden></span></div>';
  const p = $('#panel');
  p.innerHTML = '<form id="kform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(cliente) + '</span><h2 id="panel-title">' + (k ? esc(nomContacto(k)) : 'Nuevo contacto') + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div><div class="panel-b">' +
    fld('nombre', 'Nombre', v.nombre, 'text', { ph: 'Ej.: Laura Pérez' }) + fld('rol', 'Rol', v.rol, 'text', { list: 'dl-roles', ph: 'Marketing, Dueña, Administración…' }) +
    '<datalist id="dl-roles">' + ROLES_CONTACTO.map(r => '<option value="' + esc(r) + '">').join('') + '</datalist>' +
    fld('email', 'Email', v.email, 'email') + fld('tel', 'WhatsApp / celular', v.tel, 'tel') + fld('telFijo', 'Teléfono fijo', v.telFijo, 'tel', { ph: 'Si tiene' }) +
    '<label class="chk full"><input type="checkbox" id="k-principal"' + (v.principal ? ' checked' : '') + (k && k.principal ? ' disabled' : '') + '> <span><b>Contacto principal</b> <span class="muted">· con quien hablamos del día a día. Es el que aparece en la lista de clientes y en el botón de WhatsApp.' + (k && k.principal ? ' Para cambiarlo, marcá a otra persona como principal.' : '') + '</span></span></label>' +
    '<label class="chk full"><input type="checkbox" id="k-cobros"' + (v.cobros ? ' checked' : '') + '> <span><b>Recibe resúmenes de cuenta y facturas</b> <span class="muted">· le llegan los resúmenes, facturas, invoices y recordatorios de pago.</span></span></label>' +
    (Array.isArray(S.RM) ? '<label class="chk full"><input type="checkbox" id="k-portal"' + (v.portal ? ' checked' : '') + '> <span><b>Acceso al portal de clientes</b> <span class="muted">· entra con su email a ' + esc(PORTAL_URL.replace('https://', '')) + ' y ve lo que marquen como visible: redes para aprobar, entregas, su web, pedidos e informes.' + (k && k.portalUltimo ? ' Entró por última vez el ' + esc(fmt(String(k.portalUltimo).slice(0, 10))) + '.' : '') + '</span></span></label>' +
      '<div class="toolbar full k-inv"' + (v.portal ? '' : ' hidden') + '><button type="button" class="btn sm" data-act="kInvitar" data-m="copiar">Copiar invitación</button><button type="button" class="btn sm" data-act="kInvitar" data-m="wa">Mandar por WhatsApp</button><button type="button" class="btn sm" data-act="kInvitar" data-m="mail">Mandar por email</button></div>' : '') +
    '<div class="field full"><label for="k-notas">Notas</label><textarea id="k-notas" rows="2" placeholder="Ej.: prefiere WhatsApp, no escribirle después de las 19">' + esc(v.notas || '') + '</textarea></div>' +
    '</div><div class="panel-f"><span id="kdelzone">' + (k ? '<button type="button" class="btn ghost danger" data-act="kDel">Eliminar</button>' : '') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary" id="ksave">' + (k ? 'Guardar' : 'Agregar contacto') + '</button></span></div></form>';
  p.hidden = false; $('#scrim').hidden = false;
  const f = $('#k-nombre'); if (f && !k) f.focus();
}
// Los campos contacto/email/tel del cliente reflejan al contacto principal (lista, búsqueda, WhatsApp, documentos).
async function sincPrincipal(cliente, k) {
  const c = S.C.find(x => x.nombre === cliente); if (!c) return;
  const patch = { contacto: k ? k.nombre : '', email: k ? k.email : '', tel: k ? k.tel : '' };
  if (patch.contacto !== (c.contacto || '') || patch.email !== (c.email || '') || patch.tel !== (c.tel || '')) await data.update('cliente', c._id, patch);
}
async function guardarContacto() {
  const f = S.kf; if (!f) return;
  const g = n => ((($('#k-' + n) || {}).value) || '').trim();
  const tel = g('tel') ? await fmtTel(g('tel')) : '', fijo = g('telFijo') ? await fmtFijo(g('telFijo')) : '';
  const row = { nombre: g('nombre'), rol: g('rol'), email: g('email').toLowerCase(), tel, ...(data.cols && data.cols.contactoFijo === false ? {} : { tel_fijo: fijo }), principal: f.principal || $('#k-principal').checked, cobros: $('#k-cobros').checked, notas: g('notas'), ...($('#k-portal') ? { portal: $('#k-portal').checked } : {}) };
  if (row.portal && !row.email) { const e = $('#ke-email'); if (e) { e.textContent = 'Para entrar al portal necesita email'; e.hidden = false; } return; }
  document.querySelectorAll('#kform .err').forEach(e => { e.hidden = true; });
  const err = (n, m) => { const e = $('#ke-' + n); if (e) { e.textContent = m; e.hidden = false; } };
  if (!row.nombre && !row.email && !row.tel) { err('nombre', 'Poné al menos el nombre, el email o el teléfono'); return; }
  if (row.email && !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(row.email)) { err('email', 'Ese email no parece válido (uno solo por contacto)'); return; }
  const otros = contactosDe(f.cliente).filter(x => x._id !== f.id);
  if (!otros.some(x => x.principal)) row.principal = true;
  if (row.email && otros.some(x => x.email && x.email.toLowerCase() === row.email)) { err('email', 'Ese email ya está en otro contacto de este cliente'); return; }
  const btn = $('#ksave'); if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  try {
    let kid = f.id;
    if (f.id) await data.upd('contactos', f.id, row);
    else kid = (await data.ins('contactos', { ...row, cliente_id: data.ids.cliente(f.cliente), orden: otros.length })).id;
    if (row.portal && kid) { try { await data.avisosFn({ accion: 'portal_alta', contacto_id: kid }); } catch (e) { toast('Guardado, pero no se pudo habilitar el acceso: ' + e.message); } }
    if (row.principal) { for (const o of otros.filter(x => x.principal)) await data.upd('contactos', o._id, { principal: false }); await sincPrincipal(f.cliente, row); }
    closeForm(); toast(f.id ? 'Contacto guardado' : 'Contacto agregado'); await reload();
  } catch (e) { toast(e.message); if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; } }
}
async function borrarContacto() {
  const f = S.kf; if (!f || !f.id) return;
  try {
    await data.del('contactos', f.id);
    if (f.principal) { const sig = contactosDe(f.cliente).find(x => x._id !== f.id); if (sig) await data.upd('contactos', sig._id, { principal: true }); await sincPrincipal(f.cliente, sig || null); }
    closeForm(); toast('Contacto eliminado'); await reload();
  } catch (e) { toast(e.message); }
}
function fillConQuien() {
  const dl = $('#dl-conQuien'), cl = ($('#f-cliente') || {}).value; if (!dl) return;
  dl.innerHTML = contactosDe(cl).filter(k => k.nombre).map(k => '<option value="' + esc(k.nombre) + '">' + esc(k.rol || '') + '</option>').join('');
}
// Integraciones simples que se prenden y apagan desde Configuración → Integraciones (lista 'integraciones').
const INTEG_DEF = ['whatsapp', 'calendario', 'ia', 'email'];
const integ = k => (S.L.integraciones || INTEG_DEF).includes(k);
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
const abonoLabel = a => (a.tipo || 'Redes') + (a.plan ? ' · ' + a.plan : '');
// Redes y Ads van juntos: Ads es un agregado de Redes (no hay Ads sin Redes). En las listas se muestran como un solo servicio por cliente.
const vivo = a => a && a.estado !== 'Baja';
function servicioRedes(cliente) {
  const as = S.A.filter(a => a.cliente === cliente);
  const pick = t => as.filter(a => a.tipo === t).sort((a, b) => (vivo(b) - vivo(a)) || ESTADOS_ABONO.indexOf(a.estado) - ESTADOS_ABONO.indexOf(b.estado) || cmp(b.desde || '', a.desde || ''))[0] || null;
  return { redes: pick('Redes'), ads: pick('Ads'), otros: as.filter(a => a.tipo !== 'Redes' && a.tipo !== 'Ads' && vivo(a)) };
}
const precioHoy = (a, m) => (a && isAdmin() && ADM && ADM.precioHoy) ? ADM.precioHoy(a._id, m) : null;
const svChip = (txt, c, attrs) => '<span class="sv" style="--c:var(' + c + ')"' + (attrs || '') + '>' + esc(txt) + '</span>';
// Chips del servicio: plan, Ads y (para admin) el precio de este mes.
function servChips(cliente, o) {
  o = o || {}; const s = servicioRedes(cliente), r = s.redes, ad = vivo(s.ads) ? s.ads : null;
  let h = '';
  if (r) h += svChip(r.plan ? 'Plan ' + r.plan : 'Redes · sin plan', '--t-rosa');
  if (ad) h += svChip('+ Ads' + (ad.estado !== 'Activo' ? ' (' + ad.estado.toLowerCase() + ')' : ''), '--t-naranja');
  else if (s.ads && o.todo) h += svChip('Ads dado de baja', '--muted');
  if (!vivo(r) && ad && isStaff()) h += svChip('Ads sin Redes', '--crit');
  if (r && r.estado !== 'Activo') h += svChip(r.estado === 'Baja' ? 'Dado de baja' : r.estado, AB_COLOR[r.estado] || '--muted');
  if (o.precio && isAdmin() && ADM && ADM.moneyFmt) {
    const tot = {}; [r, ad].filter(vivo).forEach(a => { const p = precioHoy(a, o.mes); if (p) tot[p.moneda] = (tot[p.moneda] || 0) + (+p.monto || 0); });
    const ks = Object.keys(tot); h += ks.length ? ks.map(m => '<span class="sv money-sv">' + esc(ADM.moneyFmt(tot[m], m)) + '<i>/mes</i></span>').join('') : (r ? '<span class="sv" style="--c:var(--crit)" title="No hay precio cargado que rija ' + (o.mes ? 'en ' + esc(monthLabel(o.mes)) : 'este mes') + '">Sin precio</span>' : '');
  }
  return h ? '<span class="svs">' + h + '</span>' : '';
}
const abonoTags = n => servChips(n);

/* Estado del cliente: se calcula solo (abono activo → Activo; proyecto abierto → Proyectos; nada → Inactivo)
   salvo que se haya fijado a mano. La base aplica la misma regla con un trigger. */
const estadoAuto = nombre => S.A.some(a => a.cliente === nombre && a.estado === 'Activo') ? 'Activo' : S.P.some(p => p.cliente === nombre && isOpen(p)) ? 'Proyectos' : 'Inactivo';
const patchEstado = (c, v) => v === '__auto' ? { estadoManual: false } : { estado: v, estadoManual: v !== estadoAuto(c.nombre) };
function estadoSelect(c) {
  const auto = estadoAuto(c.nombre);
  return '<span class="estsel"><select class="cellsel st" style="--c:var(' + (CL_COLOR[c.estado] || '--muted') + ')" aria-label="Estado de ' + esc(c.nombre) + '" data-upd="cliente" data-id="' + esc(c._id) + '" data-field="estado">' +
    optsFrom(S.L.estadosCliente, c.estado || '', undefined, VER_CL) + (c.estadoManual ? opt('__auto', '↺ Volver a automático (' + (VER_CL[auto] || auto) + ')', '') : '') + '</select>' +
    (c.estadoManual && c.estado !== auto ? '<button type="button" class="fij" data-act="cAuto" data-id="' + esc(c._id) + '" title="Lo pusieron a mano. Según sus abonos y proyectos sería ' + esc(VER_CL[auto] || auto) + '. Tocá para volver al automático.">a mano ✕</button>' : '') + '</span>';
}
/* Etapas del proyecto: [{ n, ok }]. Plantillas por tipo en Listas (clave 'etapas:<Tipo>'). */
const plantilla = tipo => trab().plantillaTareas(tipo).map(x => x.n);
const plantillaTk = (tipo, inicio) => trab().plantillaTareas(tipo, inicio);
// Etapas de un proyecto: las de su flujo y las que tengan sus tareas.
function etapasProyecto(p) { const ets = trab().etapasFlujo(p.tipo).slice(); etapasDe(p).forEach(x => { if (x.etapa && !ets.includes(x.etapa)) ets.push(x.etapa); }); return ets; }
const etapasDe = p => Array.isArray(p.etapas) ? p.etapas : [];
function etapaInfo(p) {
  const e = etapasDe(p), done = e.filter(x => x.ok).length, cur = e.find(x => !x.ok);
  return { e, done, total: e.length, cur: p.etapaActual && cur ? p.etapaActual + ' · ' + cur.n : cur ? cur.n : (e.length ? 'Completo' : '') };
}
const segs = (e) => '<span class="prog" aria-hidden="true">' + e.map(x => '<i class="' + (x.ok ? 'on' : '') + '"></i>').join('') + '</span>';
function etapaCell(p) {
  const { e, done, total, cur } = etapaInfo(p), can = canEditProj(p);
  if (!total) return plantilla(p.tipo).length && can ? '<button class="btn ghost sm" data-act="etCargar" data-id="' + esc(p._id) + '">+ Tareas de ' + esc(p.tipo) + '</button>' : '<span class="muted">—</span>';
  const sum = '<span class="etp">' + segs(e) + '<span class="etn"><b>' + esc(cur) + '</b><span class="muted"> ' + done + '/' + total + '</span></span></span>';
  if (!can) return sum;
  const key = 'etapa:' + p._id;
  return '<details class="pick" data-pick="' + esc(key) + '"' + (S.openPick === key ? ' open' : '') + '><summary title="Marcar tareas">' + sum + '</summary><div class="menu">' +
    e.map((x, i) => '<label class="chk"><input type="checkbox" data-etoggle="' + esc(p._id) + '" data-i="' + i + '"' + (x.ok ? ' checked' : '') + '> ' + esc(x.n) + '</label>').join('') + '</div></details>';
}
const etapaTxt = p => { const { done, total, cur } = etapaInfo(p); return total ? cur + ' (' + done + '/' + total + ')' : ''; };

/* ---------- Tareas del proyecto (se guardan en etapas: [{ n, ok, resp, fecha }]) y prioridad ---------- */
const PRIOS = ['Urgente', 'Alta', 'Media', 'Baja'];
const PRIO_COLOR = { Urgente: '--p-urgente', Alta: '--p-alta', Media: '--p-media', Baja: '--p-baja' };
const FLAG = '<svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="M3.5 14.5V2.2M3.5 2.6h8.6l-1.9 3.2 1.9 3.2H3.5z" fill="currentColor" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
const prioFlag = (pr, txt) => pr ? '<span class="prio" style="--c:var(' + (PRIO_COLOR[pr] || '--muted') + ')" title="Prioridad ' + esc(pr) + '">' + FLAG + (txt ? '<span>' + esc(pr) + '</span>' : '') + '</span>' : '';
function prioSelect(p) {
  if (!canEditProj(p)) return prioFlag(p.prioridad, true) || '<span class="muted">—</span>';
  return '<select class="cellsel prio-sel' + (p.prioridad ? '' : ' vacia') + '" style="--c:var(' + (PRIO_COLOR[p.prioridad] || '--muted') + ')" aria-label="Prioridad de ' + esc(p.proyecto) + '" data-upd="proyecto" data-id="' + esc(p._id) + '" data-field="prioridad">' +
    opt('', 'Sin prioridad', p.prioridad || '') + PRIOS.map(x => opt(x, '⚑ ' + x, p.prioridad || '')).join('') + '</select>';
}
// Todas las tareas pendientes de una persona en proyectos abiertos.
function tareasDe(alias) {
  const out = [];
  S.P.filter(isOpen).forEach(p => etapasDe(p).forEach((x, i) => { if (!x.ok && x.resp === alias) out.push({ p, x, i }); }));
  return out.sort((a, b) => (a.x.fecha || '9999').localeCompare(b.x.fecha || '9999') || cmp(a.p.proyecto, b.p.proyecto));
}
function fechaTarea(f, ok) {
  if (!f) return '';
  const d = diff(f), cls = ok ? '' : d < 0 ? ' late' : d <= 2 ? ' soon' : '';
  return '<span class="tk-f' + cls + '">' + (ok ? fmtShort(f) : d === 0 ? 'Hoy' : d === 1 ? 'Mañana' : d === -1 ? 'Ayer' : fmtShort(f)) + '</span>';
}
function tareasHtml(p) {
  const can = canEditProj(p), e = etapasDe(p), ps = personas(), pid = esc(p._id);
  const fila = (x, i) => '<div class="tk' + (x.ok ? ' done' : '') + '">' +
    '<input type="checkbox" class="tk-ok" aria-label="Tarea hecha" data-etoggle="' + pid + '" data-i="' + i + '"' + (x.ok ? ' checked' : '') + (can ? '' : ' disabled') + '>' +
    (can ? '<input class="tk-n" value="' + esc(x.n) + '" aria-label="Tarea" data-tk="n" data-pid="' + pid + '" data-i="' + i + '">' : '<span class="tk-n">' + esc(x.n) + '</span>') +
    '<span class="tk-who">' + (x.resp ? av(x.resp, fotoDe(x.resp)) : '<span class="av vacio" title="Sin asignar">?</span>') +
    (can ? '<select aria-label="Quién la hace" data-tk="resp" data-pid="' + pid + '" data-i="' + i + '">' + opt('', 'Sin asignar', x.resp || '') + [...new Set([...ps, x.resp].filter(Boolean))].map(a => opt(a, a, x.resp || '')).join('') + '</select>' : '<span>' + esc(x.resp || 'Sin asignar') + '</span>') + '</span>' +
    (can ? '<label class="tk-date">' + (fechaTarea(x.fecha, x.ok) || '<span class="tk-f vacia">Fecha</span>') + '<input type="date" aria-label="Para cuándo" value="' + esc(x.fecha || '') + '" data-tk="fecha" data-pid="' + pid + '" data-i="' + i + '"></label>' : fechaTarea(x.fecha, x.ok)) +
    (can ? '<button type="button" class="btn ghost sm tk-del" data-act="tkDel" data-id="' + pid + '" data-i="' + i + '" aria-label="Borrar tarea">✕</button>' : '') + '</div>';
  const tpl = plantilla(p.tipo);
  return (e.length ? '<div class="tks">' + e.map(fila).join('') + '</div>' : emptyBox('Todavía no hay tareas', can ? 'Sumá la primera abajo' + (tpl.length ? ', usá las de ' + esc(p.tipo) : '') + (isStaff() ? ' o pedile a Mr. Piggy que las arme.' : '.') : '')) +
    (can ? '<form class="tk-add" data-tkadd="' + pid + '"><input class="in" name="n" placeholder="Nueva tarea… (Enter para agregar)" aria-label="Nueva tarea" autocomplete="off"><select class="in" name="resp" aria-label="Quién la hace">' + opt('', 'Sin asignar', '') + ps.map(a => opt(a, a, '')).join('') + '</select><input class="in" type="date" name="fecha" aria-label="Para cuándo"><button class="btn sm">Agregar</button></form>' +
      '<div class="toolbar tk-tools">' + (tpl.length ? '<button class="btn ghost sm" data-act="etCargar" data-id="' + pid + '">' + (e.length ? '+ Sumar' : '+ Usar') + ' tareas modelo de ' + esc(p.tipo) + '</button>' : '') +
      (isStaff() ? '<button class="btn ghost sm" data-act="tkIA" data-id="' + pid + '"><span class="pig" aria-hidden="true">' + ISO + '</span> Que Mr. Piggy arme las tareas</button>' : '') + '</div>' : '');
}
async function guardarTareas(p, next, msg) {
  if (!S.T) { p.etapas = next; render(); await upd('proyecto', p._id, { etapas: next }, null, true); if (msg) toast(msg); return; }
  const prev = etapasDe(p); p.etapas = next; render();
  try { await data.tareasSync(p._id, prev, next); if (msg) toast(msg); } catch (err) { toast(err.message); }
  await reload();
}
// Al cerrar una tarea: ¿cuánto te llevó? (opcional, con un toque)
let horasT = null;
function pedirHoras(p, x) {
  const b = $('#horasbar'); if (!b || !S.T || !x) return;
  b.dataset.pid = p._id; b.dataset.n = x.n; b.dataset.id = x._id || '';
  b.innerHTML = '<span class="hb-ok">✓</span><span class="hb-t"><b>' + esc(x.n) + '</b><span>¿Cuánto te llevó?</span></span>' + [['0.5', '½ h'], ['1', '1 h'], ['2', '2 h'], ['4', '4 h'], ['8', '1 día']].map(([h, l]) => '<button class="hb-c" data-act="hrSet" data-h="' + h + '">' + l + '</button>').join('') + '<button class="btn ghost sm" data-act="hrNo" aria-label="No cargar horas">✕</button>';
  b.hidden = false; clearTimeout(horasT); horasT = setTimeout(() => { b.hidden = true; }, 14000);
}

/* ---------- Vistas ---------- */
const kpiBtn = (n, label, sub, attrs, cls) => '<button class="kpi ' + (cls || '') + '" ' + attrs + '><span class="eyebrow">' + label + '</span><b>' + n + '</b><span>' + sub + '</span></button>';

function vInicio() {
  const t = today(), open = S.P.filter(isOpen), yo = S.me.alias;
  const late = open.filter(p => p.entrega && p.entrega < t);
  const in7 = open.filter(p => plazoOk(p, '7dias'));
  const pend = pendientes();
  const ab = S.A.filter(a => a.estado === 'Activo');
  const abR = new Set(ab.filter(a => a.tipo === 'Redes').map(a => a.cliente)).size, abA = new Set(ab.filter(a => a.tipo === 'Ads').map(a => a.cliente)).size;
  const conf = S.P.filter(p => p.estado === 'A confirmar').length;
  const sinResp = open.filter(p => !resp(p).length).length + ab.filter(a => !resp(a).length).length;
  const mias = tareasDe(yo), miasHoy = mias.filter(x => x.x.fecha && diff(x.x.fecha) <= 0);
  const cobVenc = isAdmin() && ADM ? (ADM.counts().cobros || 0) : 0;
  const hora = new Date().getHours(), saludo = hora < 13 ? 'Buen día' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  const icon = (k, c) => '<span class="hk-i" style="--c:var(' + c + ')">' + (ICON[k] || '') + '</span>';

  // 1. Portada: saludo, resumen del día, Mr. Piggy y accesos rápidos
  const resumen = [
    miasHoy.length ? '<b>' + miasHoy.length + '</b> tarea' + (miasHoy.length > 1 ? 's' : '') + ' para hoy' : (mias.length ? '<b>' + mias.length + '</b> tareas pendientes' : 'sin tareas pendientes'),
    in7.length ? '<b>' + in7.length + '</b> entrega' + (in7.length > 1 ? 's' : '') + ' esta semana' : '',
    late.length ? '<b class="rojo">' + late.length + ' atrasada' + (late.length > 1 ? 's' : '') + '</b>' : '',
    pend.length ? '<b>' + pend.length + '</b> paso' + (pend.length > 1 ? 's' : '') + ' con clientes' : '',
  ].filter(Boolean);
  const rapidos = [
    isStaff() ? '<button class="hq" data-act="new" data-kind="proyecto">' + ICON.proyectos + 'Proyecto</button>' : '',
    '<button class="hq" data-act="new" data-kind="comunicacion">' + ICON.comunicaciones + 'Anotar charla</button>',
    isStaff() ? '<button class="hq" data-act="mail">✉<span>Escribir mail</span></button>' : '',
    isAdmin() && ADM ? '<button class="hq" data-act="aMov">' + ICON.caja + 'Gasto o ingreso</button>' : '',
    '<button class="hq" data-act="go" data-view="mis">' + ICON.mis + 'Mis trabajos</button>',
  ].join('');
  let h = '<section class="hero"><div class="hero-t"><span class="hero-f">' + esc(cap1(new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' }))) + '</span>' +
    '<h1>' + saludo + ', ' + esc(yo) + '</h1><p>' + (resumen.length ? 'Hoy tenés ' + resumen.join(' · ') + '.' : 'Todo al día.') + '</p></div>' +
    (IA ? '<div class="hero-ia">' + IA.inicioHtml() + '</div>' : '') +
    '<div class="hero-q">' + rapidos + '</div></section>';

  // 2. Indicadores con color e ícono
  const estados = S.L.estadosProyecto.map(e => [e, open.filter(p => p.estado === e).length]).filter(x => x[1]);
  const mini = arr => '<span class="hk-bar">' + arr.map(([e, n]) => '<i style="flex:' + n + ';background:var(' + stVar(e) + ')" title="' + esc(e + ': ' + n) + '"></i>').join('') + '</span>';
  const kpi = (k, c, n, label, sub, attrs, extra, cls) => '<button class="hk ' + (cls || '') + '" ' + attrs + '>' + icon(k, c) + '<span class="hk-t"><span class="hk-l">' + label + '</span><b>' + n + '</b><span class="hk-s">' + sub + '</span>' + (extra || '') + '</span></button>';
  h += '<section class="hks">' +
    kpi('mis', '--accent', mias.length, 'Tus tareas', miasHoy.length ? miasHoy.length + ' para hoy o vencidas' : 'nada vence hoy', 'data-act="go" data-view="mis"', '', miasHoy.length ? 'warn' : '') +
    kpi('proyectos', '--s-curso', open.length, 'Proyectos abiertos', S.P.filter(p => p.estado === 'En curso').length + ' en curso', 'data-act="goProy"', mini(estados)) +
    kpi('abonos', '--t-rosa', abR, 'Clientes en Redes', abA ? abA + ' con Ads' : 'ninguno con Ads', 'data-act="go" data-view="redes" data-tab="planes"', '<span class="hk-bar"><i style="flex:' + Math.max(0, abR - abA) + ';background:var(--t-rosa)"></i><i style="flex:' + (abA || 0) + ';background:var(--t-naranja)"></i></span>') +
    (isAdmin() && ADM ? kpi('cobros', '--p-urgente', cobVenc, 'Cobros vencidos', cobVenc ? 'para reclamar' : 'nada vencido', 'data-act="go" data-view="cuentas"', '', cobVenc ? 'alert' : '')
      : kpi('comunicaciones', '--s-confirmar', pend.length, 'Pasos con clientes', 'pendientes', 'data-act="go" data-view="comunicaciones" data-pend="1"')) +
    '</section>';

  // 3. La semana: entregas y tareas por día
  const lunes = new Date(); lunes.setHours(12, 0, 0, 0); lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7));
  const dias = Array.from({ length: 7 }, (_, i) => { const d = new Date(lunes); d.setDate(d.getDate() + i); return d.toISOString().slice(0, 10); });
  const tksSemana = []; S.P.filter(isOpen).forEach(p => etapasDe(p).forEach((x, i) => { if (!x.ok && x.fecha && dias.includes(x.fecha) && (!isExt() || x.resp === yo)) tksSemana.push({ p, x, i }); }));
  const semana = '<div class="wk">' + dias.map((d, i) => {
    const ents = open.filter(p => p.entrega === d), tk = tksSemana.filter(o => o.x.fecha === d), hoy = d === t, pasado = d < t;
    const lab = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'][i];
    return '<div class="wk-d' + (hoy ? ' hoy' : '') + (pasado ? ' pas' : '') + (i > 4 ? ' fin' : '') + '"><div class="wk-h"><span>' + lab + '</span><b>' + +d.slice(8) + '</b></div><div class="wk-b">' +
      ents.map(p => '<button class="wk-e" style="--c:var(' + (TIPO_COLOR[p.tipo] || '--accent') + ')" data-act="pver" data-id="' + esc(p._id) + '" title="Entrega: ' + esc(p.proyecto + ' · ' + p.cliente) + '"><b>Entrega</b><span>' + esc(p.proyecto) + '</span><small>' + esc(p.cliente) + '</small></button>').join('') +
      tk.slice(0, 4).map(o => '<button class="wk-t' + (o.x.resp === yo ? ' mia' : '') + '" data-act="gqTarea" data-id="' + esc(o.p._id) + '" data-i="' + o.i + '" title="' + esc(o.x.n + ' · ' + o.p.proyecto) + '">' + (o.x.resp ? av(o.x.resp, fotoDe(o.x.resp)) : '') + '<span>' + esc(o.x.n) + '</span></button>').join('') +
      (tk.length > 4 ? '<span class="wk-mas">+' + (tk.length - 4) + ' tareas</span>' : '') +
      (!ents.length && !tk.length ? '<span class="wk-v">—</span>' : '') + '</div></div>';
  }).join('') + '</div>';

  // 4. Proyectos en curso con avance
  const enCurso = open.filter(p => p.estado !== 'A confirmar').sort((a, b) => (PRIOS.indexOf(a.prioridad) + 1 || 9) - (PRIOS.indexOf(b.prioridad) + 1 || 9) || sortByEntrega(a, b)).slice(0, 6);
  const pcards = enCurso.length ? '<div class="pcs">' + enCurso.map(projCard).join('') + '</div>'
    : emptyBox('No hay proyectos abiertos', '');

  // 5. Equipo: carga de cada persona
  const gente = personas().map(a => ({ a, tk: tareasDe(a).length, pr: open.filter(p => hasResp(p, a)).length, ab: ab.filter(x => hasResp(x, a)).length })).filter(g => g.tk || g.pr || g.ab).sort((x, y) => (y.tk + y.pr) - (x.tk + x.pr));
  const maxC = Math.max(1, ...gente.map(g => g.tk + g.pr + g.ab));
  const equipo = gente.length ? '<div class="eqs">' + gente.map(g => '<button class="eq" data-act="verDe" data-p="' + esc(g.a) + '">' + av(g.a, fotoDe(g.a)) + '<span class="eq-t"><b>' + esc(g.a) + '</b><span class="eq-bar"><i style="width:' + ((g.tk) / maxC * 100).toFixed(1) + '%;background:var(--accent)"></i><i style="width:' + (g.pr / maxC * 100).toFixed(1) + '%;background:var(--s-curso)"></i><i style="width:' + (g.ab / maxC * 100).toFixed(1) + '%;background:var(--s-entregado)"></i></span><small>' + [g.tk ? g.tk + ' tareas' : '', g.pr ? g.pr + ' proyectos' : '', g.ab ? g.ab + ' de Redes' : ''].filter(Boolean).join(' · ') + '</small></span></button>').join('') + '</div><p class="eq-ley"><i style="background:var(--accent)"></i>Tareas <i style="background:var(--s-curso)"></i>Proyectos <i style="background:var(--s-entregado)"></i>Redes</p>'
    : emptyBox('Sin trabajos asignados', 'Asigná responsables en proyectos y en Redes.');

  // 6. Próximos pasos con clientes
  const pasosHtml = pend.length ? '<div class="rows">' + pend.slice(0, 6).map(m => '<button class="row" data-act="edit" data-kind="comunicacion" data-id="' + esc(m._id) + '"><span class="d">' + (m.fechaProximo ? fmtShort(m.fechaProximo) : '—') + '</span><span class="t"><b>' + esc(m.proximo) + '</b><span>' + esc(m.cliente || '') + (m.responsable ? ' · ' + esc(m.responsable) : '') + '</span></span>' + (m.fechaProximo && diff(m.fechaProximo) < 0 ? '<span class="days late">Vencido</span>' : '') + '</button>').join('') + '</div>'
    : emptyBox('No hay pasos pendientes', 'Anotá las charlas con un próximo paso y aparecen acá.');

  const orden = (conf || sinResp) ? '<section class="sheet hordenar"><div class="sheet-h"><h2>Para ordenar</h2></div><div class="sheet-b"><div class="ho-l">' +
    (conf ? '<button class="ho" data-act="goProy" data-estado="A confirmar"><b>' + conf + '</b><span>proyectos sin estado definido</span><span class="ho-a">Revisar →</span></button>' : '') +
    (sinResp ? '<button class="ho" data-act="goProy" data-resp="__none"><b>' + sinResp + '</b><span>trabajos sin responsable</span><span class="ho-a">Asignar →</span></button>' : '') + '</div></div></section>' : '';

  h += '<div class="hgrid"><div class="stack">' +
    '<section class="sheet"><div class="sheet-h"><h2>Esta semana</h2><button class="btn ghost sm" data-act="calendar">Ver calendario</button></div><div class="sheet-b">' + semana + '</div></section>' +
    '<section class="sheet"><div class="sheet-h"><h2>Proyectos en marcha</h2><button class="btn ghost sm" data-act="goProy">Ver todos (' + open.length + ')</button></div><div class="sheet-b">' + pcards + '</div></section>' +
    '</div><div class="stack">' +
    (mias.length ? '<section class="sheet"><div class="sheet-h"><h2>Tus tareas</h2><button class="btn ghost sm" data-act="go" data-view="mis">Ver todas (' + mias.length + ')</button></div><div class="sheet-b"><div class="tks mis">' + mias.slice(0, 5).map(({ p, x, i }) =>
      '<div class="tk"><input type="checkbox" class="tk-ok" aria-label="Marcar hecha" data-etoggle="' + esc(p._id) + '" data-i="' + i + '"><button class="tk-n tk-lnk" data-act="gqTarea" data-id="' + esc(p._id) + '" data-i="' + i + '"><b>' + esc(x.n) + '</b><span>' + esc(p.proyecto + ' · ' + p.cliente) + '</span></button>' + prioFlag(x.prio || p.prioridad) + fechaTarea(x.fecha) + '</div>').join('') + '</div></div></section>' : '') +
    '<section class="sheet"><div class="sheet-h"><h2>Próximos pasos con clientes</h2>' + addBtn('comunicacion', 'Charla', null, 'ghost sm') + '</div>' + pasosHtml + '</section>' +
    (isStaff() ? '<section class="sheet"><div class="sheet-h"><h2>Equipo</h2><span class="muted num">quién tiene qué</span></div><div class="sheet-b">' + equipo + '</div></section>' : '') +
    orden + '</div></div>';
  return h;
}

const pcRing = pct => '<svg viewBox="0 0 36 36" class="ring" aria-hidden="true"><circle cx="18" cy="18" r="15" fill="none" stroke="var(--line)" stroke-width="4"/><circle cx="18" cy="18" r="15" fill="none" stroke="var(--s-entregado)" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + (pct * 0.9425).toFixed(1) + ' 100" transform="rotate(-90 18 18)"/></svg>';
function projCard(p) { const pct = avance(p), e = etapasDe(p); return '<button class="pc" style="--t:var(' + (TIPO_COLOR[p.tipo] || '--accent') + ')" data-act="pver" data-id="' + esc(p._id) + '"><span class="pc-top"><span class="pc-cli">' + esc(p.cliente) + '</span>' + prioFlag(p.prioridad) + '</span><b class="pc-n">' + esc(p.proyecto) + '</b>' +
    '<span class="pc-m"><span class="pc-r">' + pcRing(pct) + '<i>' + pct + '%</i></span><span class="pc-d">' + stPill(p.estado) + '<span>' + (e.length ? e.filter(x => x.ok).length + ' de ' + e.length + ' tareas' : 'Sin tareas') + '</span>' + (p.entrega ? '<span>Entrega ' + fmtShort(p.entrega) + ' ' + daysBadge(p) + '</span>' : '') + '</span></span>' +
    '<span class="pc-f">' + (resp(p).length ? '<span class="avs">' + resp(p).map(a => av(a, fotoDe(a))).join('') + '</span>' : '<span class="muted">Sin responsable</span>') + (p.tipo ? '<span class="tag svc" style="--c:var(' + (TIPO_COLOR[p.tipo] || '--s-empezar') + ')">' + esc(p.tipo) + '</span>' : '') + '</span></button>'; }
function vProyectos() {
  if (S.pficha) return vProyectoFicha();
  const f = S.f;
  const modos = ['lista', 'cuadricula', 'tablero', 'calendario']; if (!modos.includes(S.mode)) S.mode = 'lista';
  let h = '<div class="head"><div><h1>Proyectos</h1><p>' + (isExt() ? 'Los proyectos donde figurás como responsable.' : 'Trabajos puntuales con entrega: branding, web, packaging.') + '</p></div>' +
    '<div class="toolbar">' + vistaSel('proyectos', modos, S.mode) + aut().boton('proyectos') + addBtn('proyecto', 'Proyecto') + '</div></div>';
  const sec = (f.tipo ? 1 : 0) + (f.resp ? 1 : 0) + (f.plazo ? 1 : 0) + (S.mode !== 'tablero' && !f.abiertos ? 1 : 0);
  h += '<div class="toolbar fbar2">' +
    '<input class="in" type="search" id="pq" data-bind="f.q" placeholder="Buscar cliente o proyecto" value="' + esc(f.q) + '">' +
    (isStaff() ? '<button class="btn mio' + (f.resp === S.me.alias ? ' on' : '') + '" data-act="soloMio" data-p="proyectos" aria-pressed="' + (f.resp === S.me.alias) + '">Solo lo mío</button>' : '') +
    '<select class="in" id="pe" data-bind="f.estado" aria-label="Estado">' + optsFrom(S.L.estadosProyecto, f.estado, 'Todos los estados') + '</select>' +
    '<select class="in" id="pc" data-bind="f.cliente" aria-label="Cliente">' + clienteOpts(f.cliente, 'Todos los clientes') + '</select>' +
    filtrosMenu('proyectos', '<label class="lbl" for="pt">Tipo</label><select class="in" id="pt" data-bind="f.tipo" aria-label="Tipo">' + optsFrom(S.L.tipos, f.tipo, 'Todos los tipos') + '</select>' +
      (isStaff() ? '<label class="lbl" for="pr">Responsable</label><select class="in" id="pr" data-bind="f.resp" aria-label="Responsable">' + opt('', 'Todo el equipo', f.resp) + opt('__none', 'Sin asignar', f.resp) + personas().map(p => opt(p, p, f.resp)).join('') + '</select>' : '') +
      '<label class="lbl" for="pp">Plazo</label><select class="in" id="pp" data-bind="f.plazo" aria-label="Plazo">' + opt('', 'Cualquier plazo', f.plazo) + opt('atrasados', 'Atrasados', f.plazo) + opt('7dias', 'Entregas en 7 días', f.plazo) + opt('sinfecha', 'Sin fecha pactada', f.plazo) + '</select>' +
      (S.mode === 'tablero' ? '' : '<label class="chk"><input type="checkbox" id="pa" data-bind="f.abiertos"' + (f.abiertos ? ' checked' : '') + '> Solo abiertos</label>') +
      (f.q || f.estado || f.tipo || f.resp || f.cliente || f.plazo ? '<button class="btn link sm" data-act="clearF">Limpiar todos los filtros</button>' : ''), sec) +
    '</div>';
  if (S.mode === 'cuadricula') { const list = filtrarProyectos(false).sort(sortByEntrega); return h + (list.length ? '<div class="pcs">' + list.map(projCard).join('') + '</div>' : '<section class="sheet">' + emptyBox('Ningún proyecto coincide con los filtros', 'Probá limpiar los filtros.') + '</section>'); }
  if (S.mode === 'tablero') return h + vTablero();
  if (S.mode === 'calendario') return h + vCalendario();
  return h + vLista();
}

function vLista() {
  const list = filtrarProyectos(false).sort((a, b) => (PRIOS.indexOf(a.prioridad) + 1 || 9) - (PRIOS.indexOf(b.prioridad) + 1 || 9) || sortByEntrega(a, b));
  if (!list.length) return '<section class="sheet">' + emptyBox(S.P.length ? 'Ningún proyecto coincide con los filtros' : 'Todavía no hay proyectos', S.P.length ? 'Probá limpiar los filtros.' : (isStaff() ? 'Cargá el primero con “+ Proyecto”.' : '')) + '</section>';
  const orden = S.L.estadosProyecto;
  const grupos = [...orden.map(e => [e, list.filter(p => p.estado === e)]), ['Otros', list.filter(p => !orden.includes(p.estado))]].filter(g => g[1].length);
  const fila = p => {
    const dis = canEditProj(p) ? '' : ' disabled';
    return '<tr class="click" data-act="pver" data-id="' + esc(p._id) + '">' +
      '<td class="pjc"><b>' + esc(p.proyecto) + (p.prioridad ? ' ' + prioFlag(p.prioridad) : '') + '</b><span class="sub"><button class="btn link" data-act="ficha" data-cliente="' + esc(p.cliente) + '">' + esc(p.cliente || '—') + '</button></span></td>' +
      '<td>' + (p.tipo ? '<span class="tag svc" style="--c:var(' + (TIPO_COLOR[p.tipo] || '--s-empezar') + ')">' + esc(p.tipo) + '</span>' : '<span class="muted">—</span>') + '</td>' +
      '<td>' + picker('proyecto', p) + '</td>' +
      '<td>' + etapaCell(p) + '</td>' +
      '<td class="n">' + (p.entrega ? '<span class="mono">' + fmt(p.entrega) + '</span><span class="sub">' + daysBadge(p) + '</span>' : '<span class="muted">—</span>') + '</td>' +
      '<td><select class="cellsel st" style="--c:var(' + stVar(p.estado) + ')" aria-label="Estado" data-upd="proyecto" data-id="' + esc(p._id) + '" data-field="estado"' + dis + '>' + optsFrom(S.L.estadosProyecto, p.estado || '') + '</select></td>' +
      '</tr>';
  };
  const head = '<thead><tr><th>Proyecto</th><th>Tipo</th><th>Responsables</th><th>Tareas</th><th>Entrega</th><th>Estado</th></tr></thead>';
  return grupos.map(([e, arr]) => {
    const cerrado = S.gcl.has(e);
    return '<section class="sheet grp' + (cerrado ? ' cerrado' : '') + '" style="--c:var(' + stVar(e) + ')"><button class="grp-h" data-act="grpTog" data-g="' + esc(e) + '" aria-expanded="' + !cerrado + '"><span class="chev" aria-hidden="true">▾</span><span class="grp-pill">' + esc(e) + '</span><span class="grp-n">' + arr.length + '</span></button>' +
      (cerrado ? '' : '<div class="tbl"><table>' + head + '<tbody>' + arr.map(fila).join('') + '</tbody></table></div>') + '</section>';
  }).join('') + '<div class="count num" style="padding:0 4px">' + list.length + ' de ' + S.P.length + ' proyectos · tocá el nombre de un grupo para plegarlo</div>';
}

/* ---------- Detalle de una tarea (panel lateral) ---------- */
function abrirTarea(pid, i) {
  const p = S.P.find(x => x._id === pid); if (!p) return;
  const can = canEditProj(p), x = i >= 0 ? etapasDe(p)[i] : { n: '', ok: false, etapa: p.etapaActual || '' };
  if (!x) return;
  S.tkf = { pid, i }; S.form = null;
  const ro = can ? '' : ' disabled', k = estTk(x);
  $('#panel').innerHTML = '<form id="tkform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(p.proyecto) + ' · ' + esc(p.cliente) + '</span><h2 id="panel-title">' + (i >= 0 ? 'Tarea' : 'Nueva tarea') + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
    '<div class="panel-b">' +
    '<div class="field full"><label for="tk-n">Tarea</label><input id="tk-n" value="' + esc(x.n) + '" placeholder="Ej.: Presentar 2 rutas de logo"' + ro + '></div>' +
    '<div class="field"><label for="tk-est">Estado</label><select id="tk-est"' + ro + '>' + TK_EST.map(([v, l]) => opt(v, l, k)).join('') + '</select></div>' +
    '<div class="field"><label for="tk-prio">Prioridad</label><select id="tk-prio"' + ro + '>' + opt('', 'Sin prioridad', x.prio || '') + PRIOS.map(v => opt(v, v, x.prio || '')).join('') + '</select></div>' +
    '<div class="field"><label for="tk-resp">Responsable</label><select id="tk-resp"' + ro + '>' + opt('', 'Sin asignar', x.resp || '') + [...new Set([...personas(), x.resp].filter(Boolean))].map(a => opt(a, a, x.resp || '')).join('') + '</select></div>' +
    '<div class="field"><label for="tk-fecha">Para cuándo</label><input id="tk-fecha" type="date" value="' + esc(x.fecha || '') + '"' + ro + '></div>' +
    (S.T ? (() => { const ets = etapasProyecto(p); return (ets.length ? '<div class="field"><label for="tk-etapa">Etapa</label><select id="tk-etapa"' + ro + '>' + opt('', 'Sin etapa', x.etapa || '') + ets.map(e => opt(e, e, x.etapa || '')).join('') + '</select></div>' : ''); })() : '') +
    '<div class="field full"><label for="tk-nota">Notas</label><textarea id="tk-nota" rows="6" placeholder="Detalles, links, lo que pidió el cliente…"' + ro + '>' + esc(x.nota || '') + '</textarea></div>' +
    (x.fecha && integ('calendario') ? '<div class="toolbar full">' + calBtn(x.n + ' · ' + p.proyecto, x.fecha, 'Tarea del proyecto ' + p.proyecto + ' (' + p.cliente + ')', 'sm') + '</div>' : '') +
    (x.hechaPor ? '<p class="formnote full">Hecha por ' + esc(x.hechaPor) + (x.hechaAt ? ' el ' + fmt(x.hechaAt.slice(0, 10)) : '') + '</p>' : '') +
    (x._id ? '<div class="full">' + hil().html('tarea', x._id, { cliente: p.cliente, proyectoId: p._id, titulo: 'Comentarios', compacto: true }) + '</div>' : '') +
    '</div><div class="panel-f"><span>' + (can && i >= 0 ? '<button type="button" class="btn ghost danger" data-act="tkBorrar">Borrar tarea</button>' : '') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">' + (can ? 'Cancelar' : 'Cerrar') + '</button>' + (can ? '<button type="submit" class="btn primary">' + (i >= 0 ? 'Guardar' : 'Agregar') + '</button>' : '') + '</span></div></form>';
  $('#panel').hidden = false; $('#scrim').hidden = false;
  setTimeout(() => { const n = $('#tk-n'); if (n && i < 0) n.focus(); }, 30);
}
async function guardarTareaPanel() {
  const f = S.tkf; if (!f) return; const p = S.P.find(x => x._id === f.pid); if (!p) return;
  const n = ($('#tk-n').value || '').trim(); if (!n) { toast('Escribí la tarea'); $('#tk-n').focus(); return; }
  const base = f.i >= 0 ? etapasDe(p)[f.i] : {};
  const hv = $('#tk-horas') ? $('#tk-horas').value.trim() : (base.horas ?? '');
  const x = conEst({ ...base, n, resp: $('#tk-resp').value, fecha: $('#tk-fecha').value, prio: $('#tk-prio').value, nota: $('#tk-nota').value.trim(), etapa: $('#tk-etapa') ? $('#tk-etapa').value : (base.etapa || ''), horas: hv === '' ? '' : Math.max(0, +String(hv).replace(',', '.') || 0) }, $('#tk-est').value);
  const next = f.i >= 0 ? etapasDe(p).map((y, i) => i === f.i ? x : y) : [...etapasDe(p), x];
  closeForm(); S.tkf = null;
  await guardarTareas(p, next, f.i >= 0 ? 'Tarea guardada' : 'Tarea agregada');
}

/* ---------- Ficha del proyecto: gestor de proyecto (tareas, tablero, cronograma) ---------- */
const TK_EST = [['', 'Por hacer', '--s-empezar'], ['curso', 'En curso', '--s-curso'], ['hecha', 'Hecha', '--s-entregado']];
const estTk = x => x.ok ? 'hecha' : (x.est === 'curso' ? 'curso' : '');
const ESTV = k => (TK_EST.find(e => e[0] === k) || TK_EST[0]);
function conEst(x, k) { return { ...x, ok: k === 'hecha', est: k === 'curso' ? 'curso' : '' }; }
function avance(p) { const e = etapasDe(p); return e.length ? Math.round(e.filter(x => x.ok).length / e.length * 100) : 0; }
function tkPrioSel(p, x, i) {
  return '<select class="tk-prio' + (x.prio ? '' : ' vacia') + '" style="--c:var(' + (PRIO_COLOR[x.prio] || '--muted') + ')" aria-label="Prioridad de la tarea" data-tk="prio" data-pid="' + esc(p._id) + '" data-i="' + i + '">' + opt('', '⚑', x.prio || '') + PRIOS.map(v => opt(v, '⚑ ' + v, x.prio || '')).join('') + '</select>';
}
function tkRow(p, x, i, can) {
  const pid = esc(p._id), ps = personas(), k = estTk(x);
  return '<div class="tkr' + (x.ok ? ' done' : '') + '" data-tki="' + i + '">' +
    '<input type="checkbox" class="tk-ok" aria-label="Tarea hecha" data-etoggle="' + pid + '" data-i="' + i + '"' + (x.ok ? ' checked' : '') + (can ? '' : ' disabled') + '>' +
    '<button class="tkr-n" data-act="tkAbrir" data-id="' + pid + '" data-i="' + i + '"><span>' + esc(x.n) + '</span>' + (x.nota ? '<i class="tkr-nota" title="Tiene notas">≡</i>' : '') + '</button>' +
    '<span class="tk-who">' + (x.resp ? av(x.resp, fotoDe(x.resp)) : '<span class="av vacio" title="Sin asignar">+</span>') +
    (can ? '<select aria-label="Quién la hace" data-tk="resp" data-pid="' + pid + '" data-i="' + i + '">' + opt('', 'Sin asignar', x.resp || '') + [...new Set([...ps, x.resp].filter(Boolean))].map(a => opt(a, a, x.resp || '')).join('') + '</select>' : '<span>' + esc(x.resp || '—') + '</span>') + '</span>' +
    (can ? '<label class="tk-date">' + (fechaTarea(x.fecha, x.ok) || '<span class="tk-f vacia">Fecha</span>') + '<input type="date" aria-label="Para cuándo" value="' + esc(x.fecha || '') + '" data-tk="fecha" data-pid="' + pid + '" data-i="' + i + '"></label>' : (fechaTarea(x.fecha, x.ok) || '<span class="muted">—</span>')) +
    (can ? tkPrioSel(p, x, i) : (prioFlag(x.prio) || '<span></span>')) +
    '</div>';
}
function pfTareas(p, can) {
  const e = etapasDe(p).map((x, i) => ({ x, i }));
  const ets = S.T ? etapasProyecto(p) : [];
  const porEtapa = ets.length && e.some(o => o.x.etapa) && S.tkVista !== 'estado';
  const grupos = TK_EST.map(([k, l, c]) => [k, l, c, e.filter(o => estTk(o.x) === k)]);
  const tpl = plantilla(p.tipo), pid = esc(p._id);
  const addF = etapaDef => can ? '<form class="tkr-add" data-tkadd="' + pid + '"><span class="tkr-plus" aria-hidden="true">+</span><input class="in" name="n" placeholder="Agregar tarea y Enter" aria-label="Nueva tarea" autocomplete="off"><select class="in" name="resp" aria-label="Quién la hace">' + opt('', 'Sin asignar', '') + personas().map(a => opt(a, a, '')).join('') + '</select><input class="in" type="date" name="fecha" aria-label="Para cuándo">' + (porEtapa ? '<input type="hidden" name="etapa" value="' + esc(etapaDef || '') + '">' : '') + '<button class="btn sm primary">Agregar</button></form>' : '';
  const add = addF('');
  const vista = ets.length && e.some(o => o.x.etapa) ? '<div class="tk-vista"><span class="muted">Ver por</span><div class="seg"><button data-act="tkVista" data-v="etapa" aria-pressed="' + (porEtapa ? 'true' : 'false') + '">Etapa</button><button data-act="tkVista" data-v="estado" aria-pressed="' + (porEtapa ? 'false' : 'true') + '">Estado</button></div></div>' : '';
  if (porEtapa) {
    const orden = [...ets, ''];
    const actual = p.etapaActual || '';
    const idxAct = orden.indexOf(actual);
    let h = '<div class="tkl">' + vista + '<ol class="etl" aria-label="Etapas">' + ets.map((x, j) => { const arr = e.filter(o => o.x.etapa === x), hechas = arr.filter(o => o.x.ok).length; const st = x === actual ? 'cur' : (arr.length && hechas === arr.length) || (idxAct >= 0 && j < idxAct) ? 'ok' : ''; return '<li class="' + st + '"><span>' + (st === 'ok' ? '✓' : j + 1) + '</span><b>' + esc(x) + '</b>' + (arr.length ? '<small>' + hechas + '/' + arr.length + '</small>' : '') + '</li>'; }).join('') + '</ol>';
    orden.forEach(et => {
      const arr = e.filter(o => (o.x.etapa || '') === et && (et !== '' || !ets.includes(o.x.etapa)));
      if (!arr.length && et !== actual) return;
      const key = 'tke:' + p._id + ':' + et, hechas = arr.filter(o => o.x.ok).length, completa = arr.length && hechas === arr.length;
      const cerrado = completa && et !== actual ? !S.gcl.has(key + ':open') : S.gcl.has(key);
      const c = et === actual ? '--s-curso' : completa ? '--s-entregado' : '--s-empezar';
      h += '<section class="tkg' + (cerrado ? ' cerrado' : '') + (et === actual ? ' actual' : '') + '" style="--c:var(' + c + ')"><button class="grp-h" data-act="tkGrp" data-g="' + esc(key) + '" data-hecha="' + (completa && et !== actual ? 1 : '') + '" aria-expanded="' + !cerrado + '"><span class="chev" aria-hidden="true">▾</span><span class="grp-pill">' + esc(et || 'Otras tareas') + '</span><span class="grp-n">' + hechas + '/' + arr.length + '</span>' + (et === actual ? '<span class="tkg-act">Etapa actual</span>' : '') + '</button>' +
        (cerrado ? '' : '<div class="tkg-b"><div class="tkr tkr-h" aria-hidden="true"><span></span><span>Tarea</span><span>Responsable</span><span>Fecha</span><span>Prioridad</span></div>' + arr.map(o => tkRow(p, o.x, o.i, can)).join('') + addF(et) + '</div>') + '</section>';
    });
    return h + '</div>';
  }
  let h = '<div class="tkl">' + vista;
  if (!e.length) h += '<div class="tkl-empty"><b>Este proyecto todavía no tiene tareas.</b><span>Sumalas abajo' + (tpl.length ? ', usá las tareas modelo de ' + esc(p.tipo) : '') + (isStaff() ? ' o pedile a Mr. Piggy que las arme.' : '.') + '</span>' +
    (can ? '<span class="toolbar" style="justify-content:center">' + (tpl.length ? '<button class="btn sm" data-act="etCargar" data-id="' + pid + '">Usar tareas modelo de ' + esc(p.tipo) + '</button>' : '') + (isStaff() ? '<button class="btn sm primary" data-act="tkIA" data-id="' + pid + '"><span class="pig" aria-hidden="true">' + ISO + '</span> Que Mr. Piggy arme las tareas</button>' : '') + '</span>' : '') + '</div>';
  grupos.forEach(([k, l, c, arr]) => {
    if (!arr.length && k !== '') return;
    const key = 'tk:' + p._id + ':' + k, cerrado = k === 'hecha' ? !S.gcl.has(key + ':open') : S.gcl.has(key);
    h += '<section class="tkg' + (cerrado ? ' cerrado' : '') + '" style="--c:var(' + c + ')"><button class="grp-h" data-act="tkGrp" data-g="' + esc(key) + '" data-hecha="' + (k === 'hecha' ? 1 : '') + '" aria-expanded="' + !cerrado + '"><span class="chev" aria-hidden="true">▾</span><span class="grp-pill">' + l + '</span><span class="grp-n">' + arr.length + '</span></button>' +
      (cerrado ? '' : '<div class="tkg-b"><div class="tkr tkr-h" aria-hidden="true"><span></span><span>Tarea</span><span>Responsable</span><span>Fecha</span><span>Prioridad</span></div>' + arr.map(o => tkRow(p, o.x, o.i, can)).join('') + (k === '' ? add : '') + '</div>') + '</section>';
  });
  return h + '</div>';
}
function pfTablero(p, can) {
  const e = etapasDe(p).map((x, i) => ({ x, i }));
  if (!e.length) return pfTareas(p, can);
  return '<p class="muted" style="margin:0 0 10px">Arrastrá una tarea a otra columna para cambiarle el estado.</p><div class="tkb">' + TK_EST.map(([k, l, c]) => {
    const arr = e.filter(o => estTk(o.x) === k);
    return '<div class="col" style="--c:var(' + c + ')" data-drop="t:' + k + '"><div class="col-h">' + pill(l, c) + '<span class="n">' + arr.length + '</span></div>' +
      arr.map(({ x, i }) => '<button class="card tkc' + (x.ok ? ' done' : '') + '" style="--t:var(' + (PRIO_COLOR[x.prio] || '--line-2') + ')" data-act="tkAbrir" data-id="' + esc(p._id) + '" data-i="' + i + '" data-drag="t:' + esc(p._id) + ':' + i + '"' + (can ? ' draggable="true"' : '') + '><span class="pj">' + esc(x.n) + '</span>' + (x.nota ? '<span class="cl">' + esc(x.nota.slice(0, 90)) + '</span>' : '') + '<span class="ft">' + (x.resp ? whos([x.resp]) : '<span class="tag">Sin asignar</span>') + '<span class="ft-r">' + prioFlag(x.prio) + fechaTarea(x.fecha, x.ok) + '</span></span></button>').join('') +
      (k === '' && can ? '<button class="btn ghost sm tkb-add" data-act="tkNueva" data-id="' + esc(p._id) + '">+ Tarea</button>' : '') + '</div>';
  }).join('') + '</div>';
}
function pfCronograma(p) {
  const e = etapasDe(p).map((x, i) => ({ x, i }));
  const fechas = e.map(o => o.x.fecha).filter(Boolean);
  if (!fechas.length && !p.entrega) return emptyBox('Para ver el cronograma, poné fechas a las tareas', 'Cada tarea con fecha aparece en la línea de tiempo, junto con hoy y la entrega pactada.');
  const t = today(), ds = [p.fechaInicio, t, p.entrega, ...fechas].filter(Boolean).sort();
  const a = new Date(ds[0] + 'T12:00'), b = new Date(ds[ds.length - 1] + 'T12:00'); a.setDate(a.getDate() - 2); b.setDate(b.getDate() + 3);
  const tot = Math.max(1, Math.round((b - a) / 864e5)), pos = f => Math.max(0, Math.min(100, (new Date(f + 'T12:00') - a) / 864e5 / tot * 100));
  const semanas = []; const s = new Date(a); s.setDate(s.getDate() + ((8 - s.getDay()) % 7)); for (; s <= b; s.setDate(s.getDate() + 7)) semanas.push(s.toISOString().slice(0, 10));
  const marcas = '<div class="gt-axis">' + semanas.map(w => '<span style="left:' + pos(w).toFixed(2) + '%">' + fmtShort(w) + '</span>').join('') + '</div>';
  const lineas = '<i class="gt-hoy" style="left:' + pos(t).toFixed(2) + '%" title="Hoy"></i>' + (p.entrega ? '<i class="gt-ent" style="left:' + pos(p.entrega).toFixed(2) + '%" title="Entrega pactada ' + fmt(p.entrega) + '"></i>' : '');
  const ord = [...e].sort((x, y) => (x.x.fecha || '9999').localeCompare(y.x.fecha || '9999'));
  let prev = p.fechaInicio || (fechas.length ? [...fechas].sort()[0] : t);
  const filas = ord.map(({ x, i }) => {
    if (!x.fecha) return '<div class="gt-r"><button class="gt-n" data-act="tkAbrir" data-id="' + esc(p._id) + '" data-i="' + i + '">' + esc(x.n) + '</button><div class="gt-t">' + lineas + '<span class="gt-sin">sin fecha</span></div></div>';
    const desde = prev < x.fecha ? prev : x.fecha, l = pos(desde), r = pos(x.fecha); prev = x.fecha;
    const k = estTk(x), c = ESTV(k)[2], late = !x.ok && diff(x.fecha) < 0;
    return '<div class="gt-r"><button class="gt-n" data-act="tkAbrir" data-id="' + esc(p._id) + '" data-i="' + i + '">' + esc(x.n) + '</button><div class="gt-t">' + lineas +
      '<span class="gt-bar' + (late ? ' late' : '') + '" style="left:' + l.toFixed(2) + '%;width:' + Math.max(1.2, r - l).toFixed(2) + '%;--c:var(' + c + ')" title="' + esc(x.n + ' · ' + fmt(x.fecha) + (x.resp ? ' · ' + x.resp : '')) + '">' + (x.resp ? '<b>' + esc(initials(x.resp)) + '</b>' : '') + '</span></div></div>';
  }).join('');
  return '<div class="gt"><div class="gt-r gt-head"><span></span>' + marcas + '</div>' + filas + '</div><p class="muted gt-ley"><i class="gt-hoy-k"></i> Hoy' + (p.entrega ? ' &nbsp; <i class="gt-ent-k"></i> Entrega pactada ' + fmt(p.entrega) : '') + ' &nbsp;·&nbsp; Cada barra va de la tarea anterior a su fecha.</p>';
}
function pfDetalles(p, can) {
  const fila = (k, v) => '<dt>' + k + '</dt><dd>' + (v || '<span class="muted">—</span>') + '</dd>';
  const lk = links(p);
  return '<section class="sheet"><div class="sheet-h"><h2>Datos del proyecto</h2>' + (can ? '<button class="btn sm" data-act="edit" data-kind="proyecto" data-id="' + esc(p._id) + '">Editar</button>' : '') + '</div><div class="sheet-b"><dl class="kv">' +
    fila('Cliente', '<button class="btn link" data-act="ficha" data-cliente="' + esc(p.cliente) + '">' + esc(p.cliente) + '</button>') + fila('Tipo', esc(p.tipo || '')) + fila('Inicio', p.fechaInicio ? fmt(p.fechaInicio) : '') + fila('Entrega pactada', p.entrega ? fmt(p.entrega) : '') + fila('Entregado', p.entregaReal ? fmt(p.entregaReal) : '') +
    fila('Entregables', p.entregables ? '<span style="white-space:pre-wrap">' + esc(p.entregables) + '</span>' : '') + fila('Links', lk && lk.indexOf('href') > -1 ? lk : '') + fila('Notas', p.notas ? '<span style="white-space:pre-wrap">' + esc(p.notas) + '</span>' : '') +
    '</dl></div></section>';
}
function pfCharlas(p) {
  const ms = S.M.filter(m => m.cliente === p.cliente).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  return '<section class="sheet"><div class="sheet-h"><h2>Charlas con ' + esc(p.cliente) + '</h2>' + addBtn('comunicacion', 'Anotar charla', { cliente: p.cliente }) + '</div>' + (ms.length ? '<div class="timeline">' + ms.slice(0, 20).map(m => comItem(m, true)).join('') + '</div>' : emptyBox('Sin charlas anotadas', 'Anotá lo que se habló con el cliente y el próximo paso.')) + '</section>';
}
function pfLado(p) {
  const e = etapasDe(p), hechas = e.filter(x => x.ok).length, pct = avance(p), venc = e.filter(x => !x.ok && x.fecha && diff(x.fecha) < 0).length;
  const prox = e.filter(x => !x.ok && x.fecha).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const gente = [...new Set([...resp(p), ...e.map(x => x.resp).filter(Boolean)])];
  const ring = '<svg viewBox="0 0 36 36" class="ring" aria-hidden="true"><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--line)" stroke-width="4"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--s-entregado)" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + (pct * 0.974).toFixed(1) + ' 100" transform="rotate(-90 18 18)"/></svg>';
  const L = [['drive', 'Carpeta Drive'], ['slides', 'Presentación'], ['canva', 'Canva']].filter(([k]) => isUrl(p[k]));
  return '<aside class="pf-side">' +
    '<section class="pf-card"><div class="pf-av">' + ring + '<b>' + pct + '%</b></div><div class="pf-st"><span><b>' + hechas + '</b> de ' + e.length + ' tareas hechas</span>' + (venc ? '<span class="crit"><b>' + venc + '</b> vencida' + (venc > 1 ? 's' : '') + '</span>' : '') + (prox ? '<span>Próxima: <b>' + esc(prox.n) + '</b> · ' + fechaTarea(prox.fecha) + '</span>' : '') + (p.entrega && isOpen(p) ? '<span>Entrega pactada <b>' + fmt(p.entrega) + '</b> ' + daysBadge(p) + '</span>' : '') + '</div></section>' +
    '<section class="pf-card"><h3>Equipo</h3>' + (gente.length ? '<div class="pf-gente">' + gente.map(a => { const n = e.filter(x => x.resp === a && !x.ok).length; return '<span class="who1">' + av(a, fotoDe(a)) + '<span><b>' + esc(a) + '</b><small>' + (n ? n + ' tarea' + (n > 1 ? 's' : '') + ' pendiente' + (n > 1 ? 's' : '') : 'sin tareas pendientes') + '</small></span></span>'; }).join('') + '</div>' : '<p class="muted">Nadie asignado todavía.</p>') + '<div style="margin-top:8px">' + picker('proyecto', p) + '</div></section>' +
    (L.length ? '<section class="pf-card"><h3>Archivos</h3><div class="pf-links">' + L.map(([k, l]) => '<a class="btn sm" href="' + esc(p[k]) + '" target="_blank" rel="noopener">' + l + ' ↗</a>').join('') + '</div></section>' : '') +
    (isStaff() ? '<section class="pf-card pf-ia"><h3><span class="pig" aria-hidden="true">' + ISO + '</span> Mr. Piggy</h3><div class="pf-links"><button class="btn sm" data-act="tkIA" data-id="' + esc(p._id) + '">Armar o completar tareas</button><button class="btn sm" data-act="iaPreguntar" data-q="' + esc('¿Cómo viene el proyecto ' + p.proyecto + ' de ' + p.cliente + '? Qué falta, quién tiene qué y si llegamos a la entrega.') + '">¿Cómo viene?</button></div></section>' : '') +
    '</aside>';
}
function vProyectoFicha() {
  const p = S.P.find(x => x._id === S.pficha);
  if (!p) return '<section class="sheet">' + emptyBox('Ese proyecto no existe o no tenés acceso', '') + '<div class="sheet-b"><button class="btn" data-act="pback">← Volver a Proyectos</button></div></section>';
  const can = canEditProj(p), e = etapasDe(p), pct = avance(p);
  const ms = S.M.filter(m => m.cliente === p.cliente).length;
  const tabs = [['tareas', 'Tareas'], ['tablero', 'Tablero'], ['crono', 'Cronograma'], ...(S.T ? [['conv', 'Conversación']] : []), ...(Array.isArray(S.EN) ? [['entregas', 'Entregas' + (ent().cuenta(p).pend ? ' <span class="snav-n hot">' + ent().cuenta(p).pend + '</span>' : ent().cuenta(p).n ? ' <span class="muted">' + ent().cuenta(p).n + '</span>' : '')]] : []), ...(Array.isArray(S.SI) && (p.tipo === 'Web' || ent().tieneSitio(p)) ? [['web', 'Sitio web']] : []), ['detalles', 'Detalles'], ['charlas', 'Charlas' + (ms ? ' ' + ms : '')], ...(isAdmin() && ADM && ADM.proyectoSection ? [['plata', 'Precio y cobro']] : [])];
  const tab = tabs.some(t => t[0] === S.ptab) ? S.ptab : 'tareas';
  const estado = can ? '<select class="cellsel st" style="--c:var(' + stVar(p.estado) + ')" aria-label="Estado del proyecto" data-upd="proyecto" data-id="' + esc(p._id) + '" data-field="estado">' + optsFrom(S.L.estadosProyecto, p.estado || '') + '</select>' : stPill(p.estado);
  const fechas = (p.fechaInicio || p.entrega) ? '<span class="pf-fechas">' + (p.fechaInicio ? fmt(p.fechaInicio) : '…') + ' → ' + (p.entrega ? '<b>' + fmt(p.entrega) + '</b>' : 'sin entrega') + '</span>' : '';
  const cliC = S.C.find(c => c.nombre === p.cliente) || {};
  let body = '';
  if (tab === 'tareas') body = '<div class="pf-grid"><div>' + pfTareas(p, can) + '</div>' + pfLado(p) + '</div>';
  else if (tab === 'tablero') body = pfTablero(p, can);
  else if (tab === 'crono') body = '<section class="sheet"><div class="sheet-b">' + pfCronograma(p) + '</div></section>';
  else if (tab === 'detalles') body = '<div class="pf-grid"><div>' + pfDetalles(p, can) + '</div>' + pfLado(p) + '</div>';
  else if (tab === 'charlas') body = pfCharlas(p);
  else if (tab === 'conv') body = '<div class="pf-grid"><div>' + hil().html('proyecto', p._id, { cliente: p.cliente, proyectoId: p._id, titulo: 'Conversación del equipo', vacio: 'Lo que se habla de este proyecto, en un solo lugar. Con @ mencionás a alguien y le llega el aviso.' }) + '</div>' + pfLado(p) + '</div>';
  else if (tab === 'entregas') body = ent().entregasHtml(p);
  else if (tab === 'web') body = ent().sitioHtml(p);
  else if (tab === 'plata') body = ADM.proyectoSection(p);
  return '<div class="pf-head" style="--t:var(' + (TIPO_COLOR[p.tipo] || '--accent') + ')">' +
    '<div class="pf-top"><button class="pf-logo" data-act="ficha" data-cliente="' + esc(p.cliente) + '" title="Ficha de ' + esc(p.cliente) + '">' + av(p.cliente, cliC.avatar, 'xl sq') + '</button><div class="pf-tit"><button class="btn link pf-cli" data-act="ficha" data-cliente="' + esc(p.cliente) + '">' + esc(p.cliente) + '</button><h1>' + esc(p.proyecto) + '</h1></div>' +
    '<div class="toolbar pf-acc">' + (isStaff() ? '<button class="btn ico-b" data-act="mail" data-cliente="' + esc(p.cliente) + '" title="Escribirle un mail a ' + esc(p.cliente) + '" aria-label="Escribirle un mail a ' + esc(p.cliente) + '">' + ICON.mail + '</button>' : '') + calBtn('Entrega: ' + p.proyecto + ' · ' + p.cliente, isOpen(p) ? p.entrega : '', 'Entrega pactada del proyecto ' + p.proyecto + ' (' + p.cliente + ')') + (can ? '<button class="btn primary" data-act="edit" data-kind="proyecto" data-id="' + esc(p._id) + '">Editar proyecto</button>' : '') + '</div></div>' +
    '<div class="pf-meta">' + estado + (p.etapaActual ? '<span class="pf-etapa" title="Etapa del flujo">Etapa: <b>' + esc(p.etapaActual) + '</b></span>' : '') + prioSelect(p) + (p.tipo ? '<span class="tag svc" style="--c:var(' + (TIPO_COLOR[p.tipo] || '--s-empezar') + ')">' + esc(p.tipo) + '</span>' : '') + fechas + daysBadge(p) +
    '<span class="pf-prog" title="' + pct + '% de las tareas hechas"><span class="pf-bar"><i style="width:' + pct + '%"></i></span><b>' + pct + '%</b><span class="muted">' + e.filter(x => x.ok).length + '/' + e.length + '</span></span></div>' +
    '<nav class="pf-tabs" aria-label="Secciones del proyecto">' + tabs.map(([k, l]) => '<button data-act="ptab" data-t="' + k + '"' + (tab === k ? ' aria-current="page"' : '') + '>' + l + '</button>').join('') + '</nav></div>' + body;
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
  return '<div class="pagetools" role="group" aria-label="Descargar, imprimir y compartir">' + EXP.menuVista() +
    '<details class="share"><summary class="btn ghost sm" title="Compartir">' + ico.share + '<span>Compartir</span></summary><div class="menu-pop">' +
    '<button class="btn ghost sm" data-act="shareCopy">Copiar link</button><button class="btn ghost sm" data-act="shareWa">Enviar por WhatsApp</button><button class="btn ghost sm" data-act="shareMail">Enviar por email</button></div></details></div>';
}
// Barra superior: dónde estás, buscador, imprimir/exportar/compartir y "+ Nuevo".
function ponerHerramientas() {
  const tb = $('#topbar'); if (!tb || !S.me) return;
  tb.hidden = false;
  const lab = (views().find(v => v[0] === S.view) || [, 'Inicio'])[1];
  const sep = '<span class="cr-sep" aria-hidden="true">/</span>';
  let cr = '<button class="cr" data-act="go" data-view="' + esc(S.view) + '">' + (ICON[S.view] || '') + '<span>' + esc(lab) + '</span></button>';
  if (S.view === 'proyectos' && S.pficha) { const p = S.P.find(x => x._id === S.pficha); if (p) cr = '<button class="cr" data-act="pback">' + ICON.proyectos + '<span>Proyectos</span></button>' + sep + '<button class="cr" data-act="ficha" data-cliente="' + esc(p.cliente) + '"><span>' + esc(p.cliente) + '</span></button>' + sep + '<span class="cr on">' + esc(p.proyecto) + '</span>'; }
  else if (S.view === 'redes' && S.rmFicha) { const m = (S.RM || []).find(x => x._id === S.rmFicha); if (m) cr = '<button class="cr" data-act="go" data-view="redes">' + ICON.redes + '<span>Redes</span></button>' + sep + '<button class="cr" data-act="ficha" data-cliente="' + esc(m.cliente) + '"><span>' + esc(m.cliente) + '</span></button>' + sep + '<span class="cr on">' + esc(cap1(monthLabel(m.mes))) + '</span>'; }
  else if (S.view === 'clientes' && S.ficha) cr = '<button class="cr" data-act="back">' + ICON.clientes + '<span>Clientes</span></button>' + sep + '<span class="cr on">' + esc(S.ficha) + '</span>';
  $('#crumbs').innerHTML = cr;
  $('#ttools').innerHTML = herramientas();
  const n = [];
  if (isStaff()) n.push('<button class="btn ghost sm" data-act="new" data-kind="proyecto"' + (S.ficha ? ' data-preset="' + esc(JSON.stringify({ cliente: S.ficha })) + '"' : '') + '>Proyecto</button>');
  if (isStaff() && S.pficha) n.push('<button class="btn ghost sm" data-act="tkNueva" data-id="' + esc(S.pficha) + '">Tarea en este proyecto</button>');
  if (isStaff() || isExt()) n.push('<button class="btn ghost sm" data-act="new" data-kind="comunicacion"' + (S.ficha ? ' data-preset="' + esc(JSON.stringify({ cliente: S.ficha })) + '"' : '') + '>Charla</button>');
  if (isStaff()) n.push('<button class="btn ghost sm" data-act="new" data-kind="cliente">Cliente</button>', '<button class="btn ghost sm" data-act="mail"' + (S.ficha ? ' data-cliente="' + esc(S.ficha) + '"' : '') + '>Mail a clientes</button>');
  if (isAdmin() && ADM) n.push('<button class="btn ghost sm" data-act="aMov">Gasto o ingreso</button>');
  $('#tnew').innerHTML = n.length ? '<details class="share tnew"><summary class="btn primary sm" title="Crear algo nuevo" data-kbd="N">+ Nuevo</summary><div class="menu-pop">' + n.join('') + '</div></details>' : '';
}
/* Buscador global */
function buscar(q) {
  const k = norm(q).trim(); if (k.length < 2) return [];
  const out = [];
  S.C.filter(c => norm(c.nombre + ' ' + (c.contacto || '') + ' ' + contactosBusca(c)).includes(k)).slice(0, 5).forEach(c => { const kk = contactosDe(c.nombre).find(x => norm([x.nombre, x.rol, x.email].join(' ')).includes(k)); out.push({ g: 'Clientes', h: '<button class="tsr" data-act="ficha" data-cliente="' + esc(c.nombre) + '">' + av(c.nombre, c.avatar, 'sq') + '<span><b>' + esc(c.nombre) + '</b><small>' + esc(kk && !norm(c.nombre).includes(k) ? nomContacto(kk) + (kk.rol ? ' · ' + kk.rol : '') : (contactoTxt(c) || VER_CL[c.estado] || c.estado || '')) + '</small></span></button>' }); });
  // Atajos para el primer cliente que coincide: lo que más se hace con un cliente, sin entrar a buscarlo.
  const c0 = out.length && S.C.find(c => norm(c.nombre + ' ' + (c.contacto || '') + ' ' + contactosBusca(c)).includes(k));
  if (c0 && isStaff()) {
    const pre = esc(JSON.stringify({ cliente: c0.nombre })), cl = esc(c0.nombre);
    const a = [isAdmin() && ADM ? '<button class="tsr tsr-a" data-act="ficha" data-cliente="' + cl + '" data-tab="cuenta">' + ICON.plata + 'Facturación</button>' : '',
      isAdmin() && ADM ? '<button class="tsr tsr-a" data-act="aCuentaDe" data-cliente="' + cl + '">' + ICON.mail + 'Resumen del mes</button>' : '',
      '<button class="tsr tsr-a" data-act="ficha" data-cliente="' + cl + '" data-tab="trabajos">' + ICON.proyectos + 'Trabajos</button>',
      '<button class="tsr tsr-a" data-act="mail" data-cliente="' + cl + '">' + ICON.mail + 'Escribir mail</button>',
      '<button class="tsr tsr-a" data-act="new" data-kind="proyecto" data-preset="' + pre + '">+ Proyecto</button>'].filter(Boolean).join('');
    out.splice(1, 0, { g: 'Clientes', h: '<div class="tsr-as">' + a + '</div>' });
  }
  S.P.filter(p => norm(p.proyecto + ' ' + p.cliente + ' ' + (p.tipo || '')).includes(k)).sort((a, b) => isOpen(b) - isOpen(a)).slice(0, 6).forEach(p => out.push({ g: 'Proyectos', h: '<button class="tsr" data-act="pver" data-id="' + esc(p._id) + '"><span class="tsr-i" style="--c:var(' + stVar(p.estado) + ')"></span><span><b>' + esc(p.proyecto) + '</b><small>' + esc(p.cliente + ' · ' + p.estado) + '</small></span></button>' }));
  S.P.forEach(p => etapasDe(p).forEach((x, i) => { if (out.filter(o => o.g === 'Tareas').length < 6 && norm(x.n).includes(k)) out.push({ g: 'Tareas', h: '<button class="tsr" data-act="gqTarea" data-id="' + esc(p._id) + '" data-i="' + i + '"><span class="tsr-c' + (x.ok ? ' ok' : '') + '">' + (x.ok ? '✓' : '') + '</span><span><b>' + esc(x.n) + '</b><small>' + esc(p.proyecto + ' · ' + p.cliente + (x.resp ? ' · ' + x.resp : '')) + '</small></span></button>' }); }));
  // Ir a una pantalla escribiendo su nombre ("cobros", "sueldos", "cuentas"…).
  const vs = views(); const ir = [];
  vs.forEach(([v, l]) => { const lab = TAB_LABEL[v] || l; if (norm(lab + ' ' + l + ' ' + v).includes(k)) ir.push('<button class="tsr" data-act="go" data-view="' + v + '"><span class="tsr-i" style="--c:var(--muted)"></span><span><b>' + esc(lab) + '</b><small>' + esc((SECCIONES.find(x => x[3].includes(v)) || [, ''])[1]) + '</small></span></button>'); });
  ir.slice(0, 3).forEach(h => out.push({ g: 'Ir a', h }));
  return out;
}
function pintarBusqueda() {
  const i = $('#gq'), box = $('#gqres'); if (!i || !box) return;
  const r = buscar(i.value);
  if (!i.value.trim()) { box.hidden = true; return; }
  box.hidden = false;
  let g = ''; box.innerHTML = r.length ? r.map(o => (o.g !== g ? '<span class="tsr-g">' + (g = o.g) + '</span>' : '') + o.h).join('') : '<span class="tsr-v">Nada con “' + esc(i.value) + '”. <button class="btn link" data-act="gqPiggy">Preguntale a Mr. Piggy</button></span>';
}
document.addEventListener('input', e => { if (e.target.id === 'gq') pintarBusqueda(); });
document.addEventListener('focusin', e => { if (e.target.id === 'gq' && e.target.value.trim()) pintarBusqueda(); });
document.addEventListener('click', e => { const box = $('#gqres'); if (!box || box.hidden) return; if (e.target.closest && (e.target.closest('.tsr') || !e.target.closest('.tsearch'))) { box.hidden = true; if (e.target.closest('.tsr')) $('#gq').value = ''; } });
document.addEventListener('keydown', e => {
  const t = e.target, typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
  if (e.key === '/' && !typing && $('#gq') && !$('#topbar').hidden) { e.preventDefault(); $('#gq').focus(); return; }
  if (t && t.id === 'gq') {
    if (e.key === 'Escape') { t.value = ''; $('#gqres').hidden = true; t.blur(); }
    if (e.key === 'Enter') { const b = document.querySelector('#gqres .tsr'); if (b) { e.preventDefault(); b.click(); } }
    if (e.key === 'ArrowDown') { const b = document.querySelector('#gqres .tsr'); if (b) { e.preventDefault(); b.focus(); } }
  } else if (t && t.classList && t.classList.contains('tsr') && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault(); const all = [...document.querySelectorAll('#gqres .tsr')], k = all.indexOf(t) + (e.key === 'ArrowDown' ? 1 : -1); if (k < 0) $('#gq').focus(); else if (all[k]) all[k].focus();
  }
});
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
    return '<div class="col" style="--c:var(' + stVar(e) + ')" data-drop="' + esc(e) + '"><div class="col-h">' + stPill(e) + '<span class="n">' + items.length + '</span></div>' +
      items.map(p => {
        const late = p.entrega && isOpen(p) && diff(p.entrega) < 0;
        return '<button class="card' + (late ? ' late' : '') + '" style="--t:var(' + (TIPO_COLOR[p.tipo] || '--line-2') + ')" data-act="pver" data-id="' + esc(p._id) + '" data-drag="' + esc(p._id) + '"' + (canEditProj(p) ? ' draggable="true"' : '') + '><span class="cl"><span>' + esc(p.cliente) + '</span>' + (p.tipo ? '<span class="tag svc" style="--c:var(' + (TIPO_COLOR[p.tipo] || '--s-empezar') + ')">' + esc(p.tipo) + '</span>' : '') + '</span><span class="pj">' + esc(p.proyecto) + '</span>' + (etapasDe(p).length ? '<span class="et">' + segs(etapasDe(p)) + esc(etapaInfo(p).cur) + '</span>' : '') + '<span class="ft">' + (resp(p).length ? whos(resp(p)) : '<span class="tag">Sin responsable</span>') + '<span class="ft-r">' + prioFlag(p.prioridad) + (p.entrega ? '<span class="mono">' + fmtShort(p.entrega) + '</span>' : '') + '</span></span></button>';
      }).join('') + '</div>';
  }).join('');
  return '<p class="muted" style="margin:0">Arrastrá una tarjeta a otra columna para cambiarle el estado. Para ver más columnas usá las flechas ‹ › o arrastrá el fondo.</p><div class="kbw"><button type="button" class="kbnav l" data-act="kbMover" data-d="-1" aria-label="Ver columnas de la izquierda">‹</button><div class="kb">' + cols + '</div><button type="button" class="kbnav r" data-act="kbMover" data-d="1" aria-label="Ver columnas de la derecha">›</button></div>';
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

// Redes › Clientes y planes: un renglón por cliente con su plan, si tiene Ads y (para admin) cuánto paga por mes.
function vPlanes() {
  const af = S.af, q = norm(af.q);
  const nombres = [...new Set(S.A.filter(a => a.tipo === 'Redes' || a.tipo === 'Ads').map(a => a.cliente))].filter(c => S.C.some(x => x.nombre === c));
  const todas = nombres.map(c => ({ c, ...servicioRedes(c) })).map(f => ({ ...f, base: f.redes || f.ads, est: vivo(f.redes) ? f.redes.estado : vivo(f.ads) ? f.ads.estado : 'Baja' }));
  const base = todas.filter(f => !af.estado || f.est === af.estado);
  const conAds = f => vivo(f.ads);
  const list = base.filter(f => (!af.tipo || (af.tipo === 'Ads' ? conAds(f) : !conAds(f))) && (!af.resp || (af.resp === '__none' ? !resp(f.base).length : hasResp(f.base, af.resp))) && (!q || norm(f.c + ' ' + ((f.redes || {}).plan || '') + ' ' + ((f.redes || {}).notas || '')).includes(q))).sort((x, y) => cmp(x.c, y.c));
  const dis = isStaff() ? '' : ' disabled';
  const activos = todas.filter(f => f.est === 'Activo');
  let h = '<div class="head"><div><h1>Redes</h1><p>' + (isExt() ? 'Los clientes de redes donde figurás como responsable.' : 'Qué plan tiene cada cliente, si suma Ads y desde cuándo. Ads siempre va con Redes.') + '</p></div><div class="toolbar">' + vistaSel('planes', ['lista', 'cuadricula'], vistaDe('planes', ['lista', 'cuadricula'])) + addBtn('abono', 'Cliente en Redes', { tipo: 'Redes' }) + '</div></div>';
  if (isStaff()) {
    const tot = {}; if (isAdmin()) activos.forEach(f => [f.redes, f.ads].filter(x => x && x.estado === 'Activo').forEach(a => { const p = precioHoy(a); if (p) tot[p.moneda] = (tot[p.moneda] || 0) + (+p.monto || 0); }));
    h += '<div class="svsum">' + '<span class="pill-s"><b>' + activos.length + '</b> clientes activos</span><span class="pill-s"><b>' + activos.filter(conAds).length + '</b> con Ads</span>' +
      (todas.some(f => f.est === 'Pausado') ? '<span class="pill-s"><b>' + todas.filter(f => f.est === 'Pausado').length + '</b> en pausa</span>' : '') +
      (isAdmin() && ADM && ADM.moneyFmt ? Object.keys(tot).map(m => '<span class="pill-s ok">' + esc(ADM.moneyFmt(tot[m], m)) + ' por mes</span>').join('') : '') +
      (todas.some(f => !vivo(f.redes) && vivo(f.ads)) ? '<span class="pill-s err">' + todas.filter(f => !vivo(f.redes) && vivo(f.ads)).length + ' con Ads sin Redes</span>' : '') + '</div>';
  }
  h += '<div class="toolbar fbar2"><input class="in" type="search" id="aq" data-bind="af.q" placeholder="Buscar cliente o plan" value="' + esc(af.q) + '">' +
    '<div class="seg" role="group" aria-label="Ads">' + [['', 'Todos'], ['Ads', 'Con Ads'], ['sin', 'Sin Ads']].map(([t, l]) => '<button data-act="afTipo" data-tipo="' + t + '" aria-pressed="' + (af.tipo === t) + '">' + l + ' <span class="c">' + base.filter(f => !t || (t === 'Ads' ? conAds(f) : !conAds(f))).length + '</span></button>').join('') + '</div>' +
    filtrosMenu('planes', '<label class="lbl" for="ae">Estado</label><select class="in" id="ae" data-bind="af.estado" aria-label="Estado">' + opt('', 'Todos', af.estado) + ESTADOS_ABONO.map(e => opt(e, e === 'Activo' ? 'Activos' : e === 'Pausado' ? 'En pausa' : 'Dados de baja', af.estado)).join('') + '</select>' +
    (isStaff() ? '<label class="lbl" for="ar">Responsable</label><select class="in" id="ar" data-bind="af.resp" aria-label="Responsable">' + opt('', 'Todo el equipo', af.resp) + opt('__none', 'Sin asignar', af.resp) + personas().map(p => opt(p, p, af.resp)).join('') + '</select>' : ''), (af.estado ? 1 : 0) + (af.resp ? 1 : 0)) + '</div>';
  if (!list.length) return h + '<section class="sheet">' + emptyBox(todas.length ? 'Ningún cliente coincide' : 'Todavía no hay clientes en Redes', todas.length ? 'Probá con otro filtro.' : (isStaff() ? 'Sumá el primero con “+ Cliente en Redes”.' : '')) + '</section>';
  const cl = n => S.C.find(c => c.nombre === n) || {};
  const mesHoy = f => red().mesCliente(f.c, thisMonth());
  const adsBtn = f => vivo(f.ads) ? '<button class="sv sv-b" style="--c:var(--t-naranja)" data-act="edit" data-kind="abono" data-id="' + esc(f.ads._id) + '">+ Ads' + (f.ads.estado !== 'Activo' ? ' · ' + esc(f.ads.estado.toLowerCase()) : '') + '</button>'
    : (isStaff() && vivo(f.redes) ? '<button class="btn ghost sm" data-act="sumarAds" data-c="' + esc(f.c) + '">Sumar Ads</button>' : '<span class="muted">—</span>');
  const precioCelda = f => {
    if (!isAdmin() || !ADM || !ADM.moneyFmt) return '';
    const ps = [['Redes', f.redes], ['Ads', f.ads]].filter(([, a]) => vivo(a)).map(([t, a]) => [t, precioHoy(a)]);
    const tot = {}; ps.forEach(([, p]) => { if (p) tot[p.moneda] = (tot[p.moneda] || 0) + (+p.monto || 0); });
    const ks = Object.keys(tot);
    return '<td class="r">' + (ks.length ? ks.map(m => '<span class="money">' + esc(ADM.moneyFmt(tot[m], m)) + '</span>').join('<br>') + (ps.length > 1 ? '<span class="sub">' + ps.map(([t, p]) => t + ' ' + (p ? esc(ADM.moneyFmt(p.monto, p.moneda)) : 'sin precio')).join('<br>') + '</span>' : '') : '<button class="btn link" data-act="go" data-view="precios">Cargar precio</button>') + '</td>';
  };
  if (vistaDe('planes', ['lista', 'cuadricula']) === 'cuadricula') {
    return h + '<div class="cgrid">' + list.map(f => '<button class="ccard" data-act="edit" data-kind="abono" data-id="' + esc(f.base._id) + '">' +
      '<span class="cc-top">' + av(f.c, cl(f.c).avatar, 'sq') + '<span class="cc-n"><b>' + esc(f.c) + '</b><span>' + (f.base.desde ? 'desde ' + esc(monthLabel(f.base.desde.slice(0, 7))) : '') + '</span></span></span>' +
      '<span class="cc-m">' + servChips(f.c, { precio: true }) + '</span>' +
      '<span class="cc-f">' + (resp(f.base).length ? '<span class="avs">' + resp(f.base).map(x => av(x, fotoDe(x))).join('') + '</span>' : '<span class="muted">Sin responsable</span>') + '</span></button>').join('') + '</div><div class="count num" style="padding:0 4px">' + list.length + ' clientes</div>';
  }
  const rows = list.map(f => { const r = f.redes, m = mesHoy(f);
    return '<tr><td class="name"><span class="who1">' + av(f.c, cl(f.c).avatar, 'sq') + '<span><button class="btn link" data-act="ficha" data-cliente="' + esc(f.c) + '">' + esc(f.c) + '</button>' + (!vivo(r) && vivo(f.ads) ? '<span class="sub"><span class="sv" style="--c:var(--crit)">Ads sin Redes</span></span>' : '') + '</span></span></td>' +
      '<td>' + (r ? svChip(r.plan ? 'Plan ' + r.plan : 'Sin plan', '--t-rosa') : '<span class="muted">—</span>') + '</td>' +
      '<td>' + adsBtn(f) + '</td>' + precioCelda(f) +
      '<td>' + pickerRol(f.base) + '</td>' +
      '<td class="mono">' + (f.base.desde ? esc(fmt(f.base.desde)) : '<span class="muted">—</span>') + (f.base.hasta ? ' → ' + esc(fmt(f.base.hasta)) : '') + '</td>' +
      '<td><select class="cellsel st" style="--c:var(' + (AB_COLOR[f.base.estado] || '--muted') + ')" aria-label="Estado de ' + esc(f.c) + '" data-upd="abono" data-id="' + esc(f.base._id) + '" data-field="estado"' + dis + '>' + optsFrom(ESTADOS_ABONO, f.base.estado || '') + '</select></td>' +
      '<td class="r nowrap">' + (m ? '<button class="btn ghost sm" data-act="rmAbrir" data-id="' + esc(m._id) + '">Ver el mes</button>' : '') + '<button class="btn ghost sm" data-act="edit" data-kind="abono" data-id="' + esc(f.base._id) + '">' + (isStaff() ? 'Editar' : 'Ver') + '</button></td></tr>'; }).join('');
  return h + '<section class="sheet"><div class="tbl"><table><thead><tr><th>Cliente</th><th>Plan</th><th>Ads</th>' + (isAdmin() && ADM && ADM.moneyFmt ? '<th class="r">Por mes</th>' : '') + '<th>Responsables</th><th>Desde</th><th>Estado</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="count num">' + list.length + ' clientes</div></section>';
}

// Las piezas del mes que le tocan a la persona en esa cuenta (según el flujo de Redes)
function tocaHtml(c, yo) {
  const t = red().tocaA(c, yo); if (!t || !t.length) return '';
  return '<span class="cta-toca">Te toca: ' + t.map(([e, n]) => '<span class="pzst" style="--c:var(' + (PZ_COLOR[e] || '--muted') + ')">' + n + ' ' + esc(pzNombre(e)) + '</span>').join(' ') + '</span>';
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
  const cuentas = S.A.filter(a => a.estado === 'Activo' && (a.tipo === 'Redes' || a.tipo === 'Ads') && hasResp(a, yo)).sort((a, b) => cmp(a.cliente, b.cliente));
  const myCl = S.C.filter(c => hasResp(c, yo)).sort((a, b) => cmp(a.nombre, b.nombre));
  const steps = pendientes().filter(m => m.responsable === yo);
  const tks = tareasDe(yo), tkLate = tks.filter(t => t.x.fecha && diff(t.x.fecha) < 0).length;
  // Meses de Redes en Planificación que le toca revisar (por su rol en la cuenta): son tareas aunque el mes lo haya arrancado otra persona
  const planif = RED || S.RM ? red().planificacionesDe(yo) : [];
  const trRedes = RED || S.RM ? red().tareasRedes(yo) : [];
  const redesTk = trRedes.map(({ m, estado, n, verbo }) => '<div class="tk tk-plan"><span class="tk-ok tk-pz" style="--c:var(' + (PZ_COLOR[estado] || '--muted') + ')" aria-hidden="true"></span><button class="tk-n tk-lnk" data-act="rmMio" data-id="' + esc(m._id) + '" data-p="' + esc(yo) + '"><b>' + esc(verbo) + ' ' + n + (n === 1 ? ' pieza' : ' piezas') + ' de ' + esc(m.cliente) + '</b><span>Redes · ' + esc(monthLabel(m.mes)) + ' · ' + esc(pzNombre(estado)) + '</span></button>' + av(m.cliente, (S.C.find(c => c.nombre === m.cliente) || {}).avatar, 'sq') + '</div>').join('');
  const planHtml = planif.map(({ m, n, cargadas }) => '<div class="tk tk-plan"><input type="checkbox" class="tk-ok" aria-label="Marcar la planificación como revisada" data-act="rmPlanOk" data-id="' + esc(m._id) + '"' + (isStaff() ? '' : ' disabled') + '><button class="tk-n tk-lnk" data-act="rmAbrir" data-id="' + esc(m._id) + '"><b>Revisar la planificación de ' + esc(m.cliente) + '</b><span>Redes · ' + esc(monthLabel(m.mes)) + (cargadas ? ' · ' + n + (n === 1 ? ' pieza' : ' piezas') : '') + '</span></button>' + av(m.cliente, (S.C.find(c => c.nombre === m.cliente) || {}).avatar, 'sq') + '</div>').join('');
  const kpi = (n, l, cls) => '<div class="kpi ' + (cls || '') + '"><span class="eyebrow">' + l + '</span><b>' + n + '</b></div>';
  h += '<section class="kpis">' + kpi(tks.length + planif.length + trRedes.length, 'Tareas pendientes', tkLate ? 'alert' : '') + kpi(mine.length, 'Proyectos abiertos') + kpi(late.length, 'Atrasados', late.length ? 'alert' : '') + kpi(new Set(cuentas.map(a => a.cliente)).size, 'Clientes de Redes') + '</section>';
  const tkHtml = '<section class="sheet"><div class="sheet-h"><h2>Tareas</h2><span class="muted num">' + (tks.length + planif.length + trRedes.length) + (tkLate ? ' · <b style="color:var(--crit)">' + tkLate + ' vencidas</b>' : '') + '</span></div>' + (tks.length || planif.length || trRedes.length ? '<div class="tks mis">' + planHtml + redesTk + tks.map(({ p, x, i }) =>
    '<div class="tk"><input type="checkbox" class="tk-ok" aria-label="Marcar hecha" data-etoggle="' + esc(p._id) + '" data-i="' + i + '"' + (canEditProj(p) ? '' : ' disabled') + '><button class="tk-n tk-lnk" data-act="pver" data-id="' + esc(p._id) + '"><b>' + esc(x.n) + '</b><span>' + esc(p.proyecto + ' · ' + p.cliente) + '</span></button>' + prioFlag(p.prioridad) + fechaTarea(x.fecha) + '</div>').join('') + '</div>' : emptyBox('Sin tareas a cargo de ' + yo, 'Las tareas se asignan desde la ficha de cada proyecto.')) + '</section>';
  if (!tks.length && !planif.length && !trRedes.length && !mine.length && !cuentas.length && !myCl.length && !steps.length) return h + '<section class="sheet">' + emptyBox('Todavía no hay nada a cargo de ' + yo, isStaff() ? 'Asigná responsables desde Proyectos o Redes y aparece acá.' : 'Cuando te asignen un trabajo aparece acá.') + '</section>';
  const others = o => resp(o).length > 1 ? ' · con ' + esc(resp(o).filter(x => x !== yo).join(', ')) : '';
  const group = (title, arr) => arr.length ? '<section class="sheet"><div class="sheet-h"><h2>' + title + '</h2><span class="muted num">' + arr.length + '</span></div><div class="rows">' + arr.map(p => '<button class="row" data-act="edit" data-kind="proyecto" data-id="' + esc(p._id) + '"><span class="d">' + (p.entrega ? fmt(p.entrega) : '—') + '</span><span class="t"><b>' + esc(p.proyecto) + '</b><span>' + esc([p.cliente, p.tipo, etapaTxt(p)].filter(Boolean).join(' · ')) + others(p) + '</span></span>' + (daysBadge(p) || stPill(p.estado)) + '</button>').join('') + '</div></section>' : '';
  const misCl = [...new Set(cuentas.map(a => a.cliente))];
  // Clientes de los que es responsable y que no están ya en sus cuentas de Redes (proyectos, branding…)
  const otrosCl = myCl.filter(c => !misCl.includes(c.nombre));
  const cuentasHtml = '<section class="sheet"><div class="sheet-h"><h2>Cuentas de Redes</h2><span class="muted num">' + misCl.length + '</span></div>' + (misCl.length ? '<div class="rows">' + misCl.map(c => { const sv = servicioRedes(c), a = sv.redes || sv.ads, m = red().mesCliente(c, thisMonth()), eq = equipoCuenta(c), yoE = eq.find(e => e.a === yo), otrosE = eq.filter(e => e.a !== yo);
    return '<button class="row row-cta" data-act="rmCuenta" data-c="' + esc(c) + '" title="' + (m ? 'Abrir el mes de Redes' : 'Ir a Redes') + '"><span class="d">' + av(c, (S.C.find(x => x.nombre === c) || {}).avatar, 'sq') + '</span><span class="t"><b>' + esc(c) + '</b><span>' + servChips(c) + '</span>' +
      '<span class="cta-eq">' + (yoE && yoE.rol ? '<strong>' + esc(yoE.rol) + '</strong>' : '') + (otrosE.length ? (yoE && yoE.rol ? ' · ' : '') + 'con ' + otrosE.map(conRolTxt).join(', ') : '') + '</span>' + tocaHtml(c, yo) + '</span><span></span></button>'; }).join('') + '</div>' : emptyBox('Sin cuentas de Redes a cargo', '')) + '</section>';
  h += '<div class="grid2"><div class="stack">' + tkHtml + group('Atrasados', late) + group('Esta semana', week) + group('Más adelante', later) + group('Sin fecha pactada', nodate) + '</div>' +
    '<div class="stack">' + cuentasHtml +
    '<section class="sheet"><div class="sheet-h"><div><h2>Pendientes con clientes</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Lo que quedó por hacer después de una reunión, llamada o WhatsApp con un cliente.</p></div>' + addBtn('comunicacion', 'Charla', null, 'sm') + '</div>' + (steps.length ? '<div class="rows">' + steps.map(m => '<button class="row" data-act="edit" data-kind="comunicacion" data-id="' + esc(m._id) + '"><span class="d">' + (m.fechaProximo ? fmt(m.fechaProximo) : '—') + '</span><span class="t"><b>' + esc(m.proximo) + '</b><span>' + esc(m.cliente || '') + '</span></span><span></span></button>').join('') + '</div>' : emptyBox('Nada pendiente', 'Cuando anotás una charla con un próximo paso a tu cargo, aparece acá hasta que la marcás como hecha.')) + '</section>' +
    (otrosCl.length ? '<section class="sheet"><div class="sheet-h"><h2>Otros clientes a cargo</h2><span class="muted num">' + otrosCl.length + '</span></div><div class="rows">' + otrosCl.map(c => '<button class="row row-cta" data-act="ficha" data-cliente="' + esc(c.nombre) + '"><span class="d">' + av(c.nombre, c.avatar, 'sq') + '</span><span class="t"><b>' + esc(c.nombre) + '</b><span>' + (serviciosDe(c.nombre).length ? servPills(c.nombre) : esc(c.servicio || '')) + '</span></span>' + clPill(c.estado) + '</button>').join('') + '</div></section>' : '') +
    '</div></div>';
  return h;
}

function vClientes() {
  if (S.ficha) return vFicha();
  const cf = S.cf, q = norm(cf.q);
  if (isExt()) cf.estado = '';
  const estados = ['', ...S.L.estadosCliente];
  const counts = e => S.C.filter(c => !e || c.estado === e).length;
  const list = S.C.filter(c => (!cf.estado || c.estado === cf.estado) && (!q || norm(c.nombre + ' ' + (c.contacto || '') + ' ' + contactosBusca(c) + ' ' + (c.servicio || '')).includes(q))).sort((a, b) => cmp(a.nombre, b.nombre));
  let h = '<div class="head"><div><h1>Clientes</h1><p>' + (isExt() ? 'Los clientes de los trabajos que tenés asignados.' : 'El estado se calcula solo con sus abonos y proyectos.') + '</p></div><div class="toolbar">' + vistaSel('clientes', ['lista', 'cuadricula'], vistaDe('clientes', ['lista', 'cuadricula'])) + addBtn('cliente', 'Cliente') + '</div></div>' +
    '<div class="toolbar fbar2"><input class="in" type="search" id="cq" data-bind="cf.q" placeholder="Buscar cliente o contacto" value="' + esc(cf.q) + '">' +
    (isStaff() ? '<div class="seg" role="group" aria-label="Estado">' + estados.map(e => '<button data-act="cfEstado" data-estado="' + esc(e) + '" aria-pressed="' + (cf.estado === e) + '">' + (VER_CL[e] || e || 'Todos') + ' <span class="c">' + counts(e) + '</span></button>').join('') + '</div>' : '') + '</div>';
  if (!list.length) return h + '<section class="sheet">' + emptyBox(S.C.length ? 'Ningún cliente coincide' : 'Todavía no hay clientes', S.C.length ? 'Probá con otro estado o búsqueda.' : '') + '</section>';
  if (vistaDe('clientes', ['lista', 'cuadricula']) === 'cuadricula') return h + '<div class="cgrid">' + list.map(c => {
    const act = proyectosDe(c.nombre).filter(isOpen).length;
    return '<button class="ccard" data-act="ficha" data-cliente="' + esc(c.nombre) + '"><span class="cc-top">' + av(c.nombre, c.avatar, 'sq') + '<span class="cc-n"><b>' + esc(c.nombre) + '</b><span>' + esc(contactoTxt(c) || 'Sin contacto') + '</span></span></span>' +
      '<span class="cc-m">' + clPill(c.estado) + (act ? '<span class="muted">' + act + ' proyecto' + (act > 1 ? 's' : '') + ' abierto' + (act > 1 ? 's' : '') + '</span>' : '') + '</span>' +
      (serviciosDe(c.nombre).length ? servPills(c.nombre) : '') +
      '<span class="cc-f">' + (resp(c).length ? '<span class="avs">' + resp(c).map(x => av(x, fotoDe(x))).join('') + '</span>' : '<span class="muted">Sin responsable</span>') + '</span></button>';
  }).join('') + '</div><div class="count num" style="padding:0 4px">' + list.length + ' clientes</div>';
  const staff = isStaff();
  S.csel.forEach(id => { if (!list.some(c => c._id === id)) S.csel.delete(id); });
  const rows = list.map(c => {
    const act = proyectosDe(c.nombre).filter(isOpen).length;
    const est = staff ? estadoSelect(c) : clPill(c.estado);
    return '<tr class="click" data-act="ficha" data-cliente="' + esc(c.nombre) + '">' + (staff ? '<td class="sel"><input type="checkbox" aria-label="Seleccionar ' + esc(c.nombre) + '" data-csel="' + esc(c._id) + '"' + (S.csel.has(c._id) ? ' checked' : '') + '></td>' : '') + '<td class="name"><span class="who1">' + av(c.nombre, c.avatar, 'sq') + '<span>' + esc(c.nombre) + (c.desde ? '<span class="sub">desde ' + esc(monthLabel(c.desde)) + '</span>' : '') + '</span></span></td><td>' + est + '</td><td>' + (servPills(c.nombre) || '<span class="muted">—</span>') + '</td><td>' + (resp(c).length ? whos(resp(c)) : '<span class="muted">—</span>') + '</td><td class="n">' + (act || '<span class="muted">0</span>') + '</td><td>' + esc(contactoTxt(c)) + '</td></tr>';
  }).join('');
  const bulk = staff && S.csel.size ? '<div class="bulkbar" role="region" aria-label="Acción sobre seleccionados"><b>' + S.csel.size + ' seleccionado' + (S.csel.size > 1 ? 's' : '') + '</b><label class="muted" for="cmas">Pasar a</label><select class="in" id="cmas" data-bind="cmasivo">' + optsFrom(S.L.estadosCliente, S.cmasivo, 'Elegí un estado', VER_CL) + opt('__auto', '↺ Automático', S.cmasivo) + '</select><button class="btn primary sm" data-act="cMasivo"' + (S.cmasivo ? '' : ' disabled') + '>Aplicar</button><span class="bulk-sep"></span><button class="btn sm" data-act="mail">✉ Escribir mail a ' + (S.csel.size > 1 ? 'los ' + S.csel.size : 'este cliente') + '</button><button class="btn ghost sm" data-act="cSelNone">Quitar selección</button></div>' : '';
  const allSel = staff && list.length && list.every(c => S.csel.has(c._id));
  return h + bulk + '<section class="sheet"><div class="tbl"><table><thead><tr>' + (staff ? '<th class="sel"><input type="checkbox" aria-label="Seleccionar todos" data-cselall="1"' + (allSel ? ' checked' : '') + '></th>' : '') + '<th>Cliente</th><th>Estado</th><th>Servicios</th><th>Responsables</th><th>Proyectos abiertos</th><th>Contacto</th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="count num">' + list.length + ' clientes</div></section>';
}

// Servicios de un cliente: salen solos de sus proyectos y abonos (lo vigente resaltado).
/* ---------- Seguimiento: qué abrió, miró o bajó el cliente ---------- */
const SEG_T = {
  mail_abierto: ['ojo', 'Abrió el mail', 'mail'], mail_click: ['enlace', 'Hizo clic en el mail', 'mail'],
  portal_entro: ['inicio', 'Entró al portal', 'portal'], portal_vio: ['ojo', 'Miró', 'portal'],
  pdf_descargado: ['descargar', 'Descargó', 'pdf'], pdf_abierto: ['doc', 'Abrió', 'pdf'],
  propuesta_abierta: ['propuestas', 'Abrió el presupuesto', 'prop'], propuesta_pdf: ['descargar', 'Descargó el presupuesto en PDF', 'prop'],
};
// Se vuelve a pedir si pasó más de un minuto, así lo que hace el cliente aparece sin recargar la página.
function segDe(cliente) {
  S.SEG = S.SEG || new Map();
  const x = S.SEG.get(cliente);
  if (!x || (!x.pidiendo && Date.now() - x.t > 60_000)) {
    S.SEG.set(cliente, { r: x ? x.r : undefined, t: Date.now(), pidiendo: true });
    data.seguimientoDe(cliente).then(r => { S.SEG.set(cliente, { r, t: Date.now() }); render(); }).catch(e => { S.SEG.set(cliente, { r: [], t: Date.now() }); toast(e.message); });
  }
  return (S.SEG.get(cliente) || {}).r;
}
const haceTxt = iso => { const m = Math.round((Date.now() - new Date(iso)) / 60000); if (m < 1) return 'recién'; if (m < 60) return 'hace ' + m + ' min'; const h = Math.round(m / 60); if (h < 24) return 'hace ' + h + ' h'; const d = Math.round(h / 24); return d < 7 ? 'hace ' + d + (d === 1 ? ' día' : ' días') : fmt(String(iso).slice(0, 10)); };
// ---------- Mails del cliente: lo que se le mandó desde la app, con su texto, si lo abrió, archivar y borrar ----------
const MAIL_COBRO = ['Resumen de cuenta', 'Factura enviada', 'Recordatorio de pago', 'Aviso de aumento', 'Invoice'];
const MAIL_TIPO = { Mensaje: 'Novedades', 'Resumen de cuenta': 'Resumen de cuenta', 'Factura enviada': 'Factura', 'Recordatorio de pago': 'Recordatorio de pago', 'Aviso de aumento': 'Aviso de aumento', Invoice: 'Invoice', Otro: 'Otro' };
function mailsDe(cliente) {
  S.MLS = S.MLS || new Map();
  const x = S.MLS.get(cliente);
  if (!x || (!x.pidiendo && Date.now() - x.t > 60_000)) {
    S.MLS.set(cliente, { r: x ? x.r : undefined, t: Date.now(), pidiendo: true });
    data.mailsCliente(cliente).then(r => { S.MLS.set(cliente, { r, t: Date.now() }); render(); }).catch(e => { S.MLS.set(cliente, { r: [], t: Date.now() }); toast(e.message); });
  }
  return (S.MLS.get(cliente) || {}).r;
}
const mailBuscar = id => { for (const [cl, x] of (S.MLS || new Map())) { const m = (x.r || []).find(y => y.id === id); if (m) return { m, cl }; } return {}; };
function mailsHtml(c) {
  const ms = mailsDe(c.nombre);
  if (ms === undefined) return '<section class="sheet">' + emptyBox('Cargando…', '') + '</section>';
  const ev = segDe(c.nombre) || [];
  const abrio = id => ev.find(e => e.email_id === id && e.tipo === 'mail_abierto'), clics = id => ev.filter(e => e.email_id === id && e.tipo === 'mail_click').length;
  const f = S.mlF || 'todos', esCobro = m => MAIL_COBRO.includes(m.tipo);
  const n = { todos: ms.filter(m => !m.archivado).length, novedades: ms.filter(m => !m.archivado && !esCobro(m)).length, cobranza: ms.filter(m => !m.archivado && esCobro(m)).length, archivados: ms.filter(m => m.archivado).length };
  const vis = ms.filter(m => f === 'archivados' ? m.archivado : !m.archivado && (f === 'todos' || (f === 'novedades' ? !esCobro(m) : esCobro(m))));
  const quien = id => (S.E.find(e => e._id === id) || {}).persona || '';
  const chip = (k, l) => (k === 'archivados' && !n.archivados) || (k === 'cobranza' && !n.cobranza) ? '' : '<button data-act="mlF" data-f="' + k + '"' + (f === k ? ' aria-current="page"' : '') + '>' + l + ' <span class="snav-n">' + n[k] + '</span></button>';
  const fila = m => {
    const ab = S.mlAbierto === m.id, sg = abrio(m.id), cl = clics(m.id);
    const hh = new Date(m.created_at), cuando = fmt(String(m.created_at).slice(0, 10)) + ' · ' + hh.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return '<div class="ml-r' + (ab ? ' on' : '') + (m.estado === 'Error' ? ' err' : '') + '"><button class="ml-h" data-act="mlVer" data-id="' + esc(m.id) + '" aria-expanded="' + ab + '">' +
      '<span class="ml-d">' + esc(cuando) + '</span><span class="ml-t"><b>' + esc(m.asunto) + '</b><span>' + esc((m.para || []).join(', ')) + (quien(m.persona_id) ? ' · mandó ' + esc(quien(m.persona_id)) : '') + '</span></span>' +
      '<span class="ml-tags"><span class="ml-tipo' + (esCobro(m) ? ' cob' : '') + '">' + esc(MAIL_TIPO[m.tipo] || m.tipo) + '</span>' + (m.estado === 'Error' ? '<span class="seg-p no sm">No salió</span>' : sg ? '<span class="seg-p on sm" title="Lo abrió ' + esc(new Date(sg.created_at).toLocaleString('es-AR')) + '">' + (ICON.ojo || '') + 'Visto</span>' : '') + (cl ? '<span class="seg-p clic sm">' + cl + (cl === 1 ? ' clic' : ' clics') + '</span>' : '') + '</span></button>' +
      (ab ? '<div class="ml-b">' + ((m.cc || []).length ? '<p class="muted">Con copia a ' + esc(m.cc.join(', ')) + '</p>' : '') + ((m.adjuntos || []).length ? '<p class="muted">Adjuntos: ' + esc(m.adjuntos.join(', ')) + '</p>' : '') +
        (m.texto ? '<div class="ml-txt">' + esc(m.texto) + '</div>' : '<p class="muted">El texto de este mail no quedó guardado: se mandó antes de que la app empezara a guardarlo. Lo tenés en la copia que te llegó a tu casilla.</p>') +
        (m.estado === 'Error' && m.error ? '<p class="err-t">' + esc(m.error) + '</p>' : '') +
        '<div class="toolbar">' + (m.estado === 'Enviado' ? '<button class="btn sm" data-act="mlResp" data-id="' + esc(m.id) + '">Anotar la respuesta</button>' : '') +
        '<button class="btn ghost sm" data-act="mlArch" data-id="' + esc(m.id) + '">' + (m.archivado ? 'Sacar de archivados' : 'Archivar') + '</button>' +
        '<button class="btn ghost sm danger" data-act="mlDel" data-id="' + esc(m.id) + '">Borrar del historial</button></div></div>' : '') + '</div>';
  };
  return '<section class="sheet"><div class="sheet-h"><div><h2>Mails</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Lo que se le mandó a ' + esc(c.nombre) + ' desde la app: novedades, resúmenes, facturas y recordatorios. Las respuestas le llegan a la casilla de quien lo mandó; si importa, anotala acá.</p></div>' +
    '<button class="btn ico-b" data-act="mail" data-cliente="' + esc(c.nombre) + '" title="Escribir un mail" aria-label="Escribir un mail">' + ICON.mail + '</button></div>' +
    (ms.length ? '<div class="sheet-b ml-fil"><div class="subnav">' + chip('todos', 'Todos') + chip('novedades', 'Novedades') + chip('cobranza', 'Cobranza') + chip('archivados', 'Archivados') + '</div></div>' : '') +
    (vis.length ? '<div class="ml-l">' + vis.map(fila).join('') + '</div>' : emptyBox(f === 'archivados' ? 'No hay mails archivados' : 'Todavía no se le mandó nada', f === 'archivados' ? '' : 'Los mails que salen desde la app quedan acá, con su texto y si los abrió.')) + '</section>';
}
function segHtml(c) {
  const ev = segDe(c.nombre);
  if (ev === undefined) return '<section class="sheet">' + emptyBox('Cargando…', '') + '</section>';
  if (ev === null) return '<section class="sheet">' + emptyBox('Falta un paso en la base de datos', 'Para ver el seguimiento hay que correr el SQL 0020 en Supabase.') + '</section>';
  const AD = ADM && ADM.AD, asunto = id => { const m = AD && (AD.EM || []).find(x => x.id === id); return m ? '“' + m.asunto + '”' : ''; };
  const n = t => ev.filter(e => e.tipo === t).length, ult = t => (ev.find(e => e.tipo === t) || {}).created_at;
  const mailsAb = new Set(ev.filter(e => e.tipo === 'mail_abierto').map(e => e.email_id)).size;
  const pill = (ic, txt, cls) => '<span class="seg-p ' + (cls || '') + '">' + (ICON[ic] || '') + txt + '</span>';
  let h = '<section class="sheet"><div class="sheet-h"><div><h2>Seguimiento</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Lo que abrió, miró o descargó ' + esc(c.nombre) + ': mails, portal, PDFs y presupuestos.</p></div></div>' +
    '<div class="sheet-b"><div class="svsum">' +
    pill('mail', mailsAb + (mailsAb === 1 ? ' mail abierto' : ' mails abiertos'), mailsAb ? 'on' : '') +
    (n('mail_click') ? pill('enlace', n('mail_click') + (n('mail_click') === 1 ? ' clic' : ' clics') + ' en mails', 'clic') : '') +
    pill('inicio', n('portal_entro') ? 'Entró al portal ' + n('portal_entro') + (n('portal_entro') === 1 ? ' vez' : ' veces') + ' · ' + haceTxt(ult('portal_entro')) : 'Todavía no entró al portal', n('portal_entro') ? 'on' : 'no') +
    (n('pdf_descargado') + n('pdf_abierto') ? pill('descargar', (n('pdf_descargado') + n('pdf_abierto')) + ' PDF vistos o descargados', 'pdf') : '') +
    (n('propuesta_abierta') ? pill('propuestas', 'Abrió presupuestos ' + n('propuesta_abierta') + (n('propuesta_abierta') === 1 ? ' vez' : ' veces'), 'clic') : '') + '</div>' +
    '<p class="muted" style="margin:10px 0 0;font-size:12.5px">“Abrió el mail” es aproximado: algunos correos (como Apple Mail) cargan las imágenes solos y otros las bloquean. Los clics, el portal y las descargas son exactos.</p></div></section>';
  if (!ev.length) return h + '<section class="sheet">' + emptyBox('Todavía no hay movimientos', 'Cuando abra un mail, entre al portal o baje un PDF, aparece acá.') + '</section>';
  // Agrupado por día; los eventos iguales seguidos se juntan (×n).
  const dias = new Map();
  ev.forEach(e => { const d = String(e.created_at).slice(0, 10), arr = dias.get(d) || dias.set(d, []).get(d), k = e.tipo + '|' + (e.email_id || '') + '|' + e.ref, prev = arr[arr.length - 1]; if (prev && prev.k === k) prev.n++; else arr.push({ ...e, k, n: 1 }); });
  h += '<section class="sheet"><div class="seg-tl">' + [...dias.entries()].map(([d, arr]) => '<div class="seg-dia"><span class="seg-fecha">' + (d === today() ? 'Hoy' : esc(fmt(d))) + '</span><div class="seg-evs">' + arr.map(e => {
    const [ic, txt, cl] = SEG_T[e.tipo] || ['ojo', e.tipo, ''];
    const que = e.tipo.startsWith('mail') ? asunto(e.email_id) : e.detalle ? (e.tipo === 'propuesta_abierta' || e.tipo === 'propuesta_pdf' ? (e.detalle ? 'N.º ' + e.detalle : '') : e.detalle) : '';
    const hh = new Date(e.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    return '<div class="seg-ev ' + cl + '"><span class="seg-ic">' + (ICON[ic] || '') + '</span><span class="seg-tx"><b>' + esc(txt) + (que ? ' ' : '') + '</b>' + esc(que) + (e.n > 1 ? ' <span class="muted">×' + e.n + '</span>' : '') + '<small>' + esc(hh) + (e.quien ? ' · ' + esc(e.quien) : '') + '</small></span></div>';
  }).join('') + '</div></div>').join('') + '</div></section>';
  return h;
}
function serviciosDe(nombre) {
  const m = new Map();
  const sumar = (tipo, desde, hasta, vigente) => { if (!tipo) return; const x = m.get(tipo) || { tipo, desde: desde || '', hasta: hasta || '', vigente: false }; if (desde && (!x.desde || desde < x.desde)) x.desde = desde; if (hasta && hasta > x.hasta) x.hasta = hasta; x.vigente = x.vigente || vigente; m.set(tipo, x); };
  S.A.filter(a => a.cliente === nombre).forEach(a => sumar(a.tipo, a.desde, a.hasta, a.estado === 'Activo'));
  S.P.filter(p => p.cliente === nombre && p.estado !== 'Cancelado').forEach(p => sumar(p.tipo, p.fechaInicio || p.entrega, p.entregaReal || p.entrega, isOpen(p)));
  return [...m.values()].sort((a, b) => (b.vigente - a.vigente) || (a.desde || '9').localeCompare(b.desde || '9'));
}
const servPills = nombre => '<span class="srvs">' + serviciosDe(nombre).map(x => '<span class="srv' + (x.vigente ? ' on' : '') + '" style="--c:var(' + (TIPO_COLOR[x.tipo] || '--muted') + ')" title="' + (x.vigente ? 'Vigente' : 'Antes') + '">' + esc(x.tipo) + '</span>').join('') + '</span>';
// Lo que se hizo con el cliente, en orden: proyectos y abonos.
function historiaCliente(nombre) {
  const it = [];
  S.P.filter(p => p.cliente === nombre && p.estado !== 'Cancelado').forEach(p => it.push({ f: p.fechaInicio || p.entrega || '', tipo: p.tipo || 'Proyecto', t: p.proyecto, sub: isOpen(p) ? (p.entrega ? 'entrega ' + fmt(p.entrega) : p.estado) : 'entregado' + (p.entregaReal || p.entrega ? ' ' + fmt(p.entregaReal || p.entrega) : ''), on: isOpen(p), act: 'pver', id: p._id }));
  S.A.filter(a => a.cliente === nombre).forEach(a => it.push({ f: a.desde ? a.desde + (a.desde.length === 7 ? '-01' : '') : '', tipo: a.tipo, t: (a.tipo === 'Ads' ? 'Ads' : a.tipo + (a.plan ? ' · plan ' + a.plan : '')), sub: a.estado === 'Activo' ? (a.desde ? 'desde ' + monthLabel(a.desde.slice(0, 7)) : 'vigente') : 'de ' + (a.desde ? monthLabel(a.desde.slice(0, 7)) : '—') + (a.hasta ? ' a ' + monthLabel(a.hasta.slice(0, 7)) : ''), on: a.estado === 'Activo', act: 'edit', kind: 'abono', id: a._id }));
  return it.sort((a, b) => (a.f || '9').localeCompare(b.f || '9'));
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
  const abRow = a => '<button class="row nod" data-act="edit" data-kind="abono" data-id="' + esc(a._id) + '"><span class="t"><b>' + esc(a.tipo === 'Ads' ? 'Ads' : abonoLabel(a)) + '</b><span>' + (resp(a).length ? [...resp(a)].sort((x, y) => ordenRol(rolDe(a, x)) - ordenRol(rolDe(a, y))).map(x => esc(x) + (rolDe(a, x) ? ' (' + esc(rolDe(a, x)) + ')' : '')).join(', ') : 'sin responsable') + '</span></span>' + abPill(a.estado) + '</button>';
  const preset = esc(JSON.stringify({ cliente: c.nombre }));
  const pendN = ms.filter(m => m.proximo && !m.hecho).length;
  const tabs = [['resumen', 'Resumen'], ...(isAdmin() && ADM ? [['cuenta', 'Facturación']] : []), ['trabajos', 'Trabajos'], ...(isStaff() ? [['marca', 'Marca y voz' + (c.marca && Object.values(c.marca).some(Boolean) ? '' : ' <span class="tab-dot" title="Sin completar"></span>')]] : []),
    ['charlas', 'Charlas' + (pendN ? ' <span class="snav-n hot">' + pendN + '</span>' : '')], ...(conTabla() && (isStaff() || contactosDe(c.nombre).length) ? [['contactos', 'Contactos']] : []), ...(isStaff() ? [['mails', 'Mails'], ['seguimiento', 'Seguimiento']] : [])];
  const tab = tabs.some(t => t[0] === S.ctab) ? S.ctab : 'resumen';
  const acciones = isStaff() ? '<button class="btn ico-b" data-act="mail" data-cliente="' + esc(c.nombre) + '" title="Escribirle un mail" aria-label="Escribirle un mail a ' + esc(c.nombre) + '">' + ICON.mail + '</button>' + waBtn(c) + '<button class="btn primary" data-act="new" data-kind="proyecto" data-preset="' + preset + '">+ Proyecto</button>' +
    masMenu([{ act: 'edit', label: 'Editar cliente', attrs: ' data-kind="cliente" data-id="' + esc(c._id) + '"', icon: 'clientes' }, { act: 'new', label: 'Anotar charla', attrs: ' data-kind="comunicacion" data-preset="' + preset + '"', icon: 'charla' }, { act: 'new', label: 'Sumar a Redes', attrs: ' data-kind="abono" data-preset="' + preset + '"', icon: 'abonos' }])
    : addBtn('comunicacion', 'Charla', { cliente: c.nombre });
  let body = '';
  if (tab === 'resumen') body = (isAdmin() && ADM && ADM.deudaLinea ? ADM.deudaLinea(c.nombre) : '') + (IA ? IA.fichaHtml(c.nombre) : '') + '<div class="ficha"><div class="stack"><section class="sheet"><div class="sheet-h"><h2>Datos</h2></div><div class="sheet-b"><dl class="kv">' +
    '<dt>Cliente desde</dt><dd>' + (c.desde ? esc(cap1(monthLabel(c.desde))) + ' <span class="muted">· ' + esc(antig(c.desde)) + '</span>' : '<span class="muted">—</span>') + '</dd>' +
    '<dt>Responsables</dt><dd>' + whos(resp(c)) + '</dd>' +
    (conTabla() ? '' : '<dt>Contacto</dt><dd>' + (c.contacto ? esc(c.contacto) : '<span class="muted">—</span>') + '</dd>' +
    '<dt>Email</dt><dd>' + copy(c.email) + '</dd>' +
    '<dt>WhatsApp</dt><dd>' + copy(c.tel) + '</dd>') +
    (!conTabla() && c.telFijo ? '<dt>Teléfono fijo</dt><dd>' + copy(c.telFijo) + '</dd>' : '') +
    '<dt>Web y redes</dt><dd>' + (redesLinks(c) ? '<div class="red-ls">' + redesLinks(c) + '</div>' : '') + (isStaff() ? '<button class="btn ghost sm red-mas" data-act="edit" data-kind="cliente" data-id="' + esc(c._id) + '">+ Agregar</button>' : (redesLinks(c) ? '' : '<span class="muted">—</span>')) + '</dd>' +
    '<dt>Carpeta</dt><dd>' + link(c.carpeta) + '</dd>' +
    '<dt>Notas</dt><dd>' + (c.notas ? '<span style="white-space:pre-wrap">' + esc(c.notas) + '</span>' : '<span class="muted">—</span>') + '</dd>' +
    '</dl></div></section>' + '</div><div class="stack">' +
    '<section class="sheet"><div class="sheet-h"><h2>' + (as.some(a => a.tipo !== 'Redes' && a.tipo !== 'Ads') ? 'Servicios mensuales' : 'Redes') + '</h2>' + (isStaff() && !vivo(servicioRedes(c.nombre).redes) ? '<button class="btn ghost sm" data-act="new" data-kind="abono" data-preset="' + esc(JSON.stringify({ cliente: c.nombre, tipo: 'Redes' })) + '">Sumar a Redes</button>' : isStaff() && !vivo(servicioRedes(c.nombre).ads) ? '<button class="btn ghost sm" data-act="sumarAds" data-c="' + esc(c.nombre) + '">Sumar Ads</button>' : '') + '</div>' + (as.length ? '<div class="sheet-b">' + servChips(c.nombre, { precio: true, todo: true }) + '</div><div class="rows">' + as.map(abRow).join('') + '</div>' : emptyBox('No tiene Redes', '')) + '</section>' +
    '<section class="sheet"><div class="sheet-h"><h2>Proyectos</h2><span class="muted num">' + open.length + ' abiertos · ' + closed.length + ' cerrados</span></div>' + (ps.length ? '<div class="rows">' + open.map(projRow).join('') + closed.map(projRow).join('') + '</div>' : emptyBox('Sin proyectos cargados', '')) + '</section>' + '</div></div>';
  else if (tab === 'marca') body = fm().html(c);
  else if (tab === 'trabajos') body = '<div class="stack">' + (S.T && isStaff() ? tk().fichaHtml(c.nombre) : '') + redesFicha(c) +
    (() => { const hs = historiaCliente(c.nombre); return hs.length ? '<section class="sheet"><div class="sheet-h"><h2>Lo que hicimos juntos</h2><span class="muted num">' + hs.length + '</span></div><ol class="hist">' + hs.map(x => '<li class="' + (x.on ? 'on' : '') + '"><button class="hist-i" data-act="' + x.act + '"' + (x.kind ? ' data-kind="' + x.kind + '"' : '') + ' data-id="' + esc(x.id) + '"><span class="srv' + (x.on ? ' on' : '') + '" style="--c:var(' + (TIPO_COLOR[x.tipo] || '--muted') + ')">' + esc(x.tipo) + '</span><span class="t"><b>' + esc(x.t) + '</b><span>' + esc(x.sub) + '</span></span><span class="mono muted">' + (x.f ? esc(x.f.slice(0, 4)) : '') + '</span></button></li>').join('') + '</ol></section>' : ''; })() + '' + '</div>';
  else if (tab === 'charlas') body = (() => { const pend = ms.filter(m => m.proximo && !m.hecho), resto = ms.filter(m => !(m.proximo && !m.hecho));
      return '<section class="sheet"><div class="sheet-h"><div><h2>Charlas y pendientes</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Lo que se habló con ' + esc(c.nombre) + ', qué se acordó y lo que falta hacer.</p></div>' + ((isStaff() || isExt()) ? '<button class="btn sm" data-act="new" data-kind="comunicacion" data-preset="' + preset + '">+ Anotar charla</button>' : '') + '</div>' +
        (ms.length ? (pend.length ? '<div class="sheet-b" style="padding-bottom:0"><span class="eyebrow">Pendiente</span></div><div class="timeline">' + pend.map(m => comItem(m, true)).join('') + '</div>' : '') + (resto.length ? (pend.length ? '<div class="sheet-b" style="padding-bottom:0"><span class="eyebrow">Historial</span></div>' : '') + '<div class="timeline">' + resto.map(m => comItem(m, true)).join('') + '</div>' : '')
          : emptyBox('Todavía no hay charlas anotadas', 'Anotá reuniones, llamadas o WhatsApps. Si pegás el chat, Mr. Piggy completa todo.')) + '</section>'; })() + '';
  else if (tab === 'contactos') body = contactosHtml(c);
  else if (tab === 'seguimiento') body = segHtml(c);
  else if (tab === 'mails') body = mailsHtml(c);
  else if (tab === 'cuenta') body = ADM.fichaSection(c) || '<section class="sheet">' + emptyBox('Sin datos de cuenta', '') + '</section>';
  return back +
    '<div class="head"><div class="head-av">' + (isStaff() ? avEditable('cliente', c._id, c.nombre, c.avatar, 'xl sq') : av(c.nombre, c.avatar, 'xl sq')) + '<div><span class="eyebrow">Ficha de cliente</span><h1 style="font-size:32px;margin-top:4px">' + esc(c.nombre) + '</h1><p style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + (isStaff() ? estadoSelect(c) : clPill(c.estado)) + servPills(c.nombre) + '</p></div></div>' +
    '<div class="toolbar">' + acciones + '</div></div>' +
    '<nav class="pf-tabs ftabs" aria-label="Secciones del cliente">' + tabs.map(([k, l]) => '<button data-act="ctab" data-t="' + k + '"' + (tab === k ? ' aria-current="page"' : '') + '>' + l + '</button>').join('') + '</nav>' + body;
}

// Ficha del cliente: cómo viene el mes de redes.
function redesFicha(c) {
  if (!S.RM || !S.A.some(a => a.cliente === c.nombre && a.tipo === 'Redes')) return '';
  const ms = S.RM.filter(m => m.cliente === c.nombre).sort((a, b) => b.mes.localeCompare(a.mes)).slice(0, 4);
  return '<section class="sheet"><div class="sheet-h"><h2>Redes</h2>' + (isStaff() ? '<button class="btn sm" data-act="go" data-view="redes">Ver todos</button>' : '') + '</div>' +
    (ms.length ? '<div class="rows">' + ms.map(m => '<button class="row" data-act="rmAbrir" data-id="' + esc(m._id) + '"><span class="d">' + esc(cap1(monthLabel(m.mes)).split(' ')[0]) + '</span><span class="t"><b>' + esc(m.estado) + '</b><span>' + esc([m.resp || 'sin responsable', Object.entries(m.plan || {}).map(([f, n]) => n + ' ' + f).join(', ')].filter(Boolean).join(' · ')) + '</span></span>' + (m.visible ? '<span class="rm-vis">👁 En el portal</span>' : '') + '</button>').join('') + '</div>' : emptyBox('Todavía no se armó ningún mes', 'Desde Redes arrancás el mes con su plan.')) + '</section>';
}
function comItem(m, inFicha) {
  const can = isStaff() || (S.me && m.responsable === S.me.alias);
  return '<div class="ti"><div class="meta"><span class="mono">' + (m.fecha ? fmt(m.fecha) : '—') + '</span>' + (inFicha ? '' : '<b style="color:var(--fg)">' + esc(m.cliente || '') + '</b>') + (m.canal ? '<span class="tag">' + esc(m.canal) + '</span>' : '') + (m.conQuien ? '<span>con ' + esc(m.conQuien) + '</span>' : '') + (m.responsable ? '<span>· ' + esc(m.responsable) + '</span>' : '') + '<button class="btn ghost sm" style="margin-left:auto" data-act="edit" data-kind="comunicacion" data-id="' + esc(m._id) + '">' + (can ? 'Editar' : 'Ver') + '</button></div>' +
    (m.resumen ? '<p>' + esc(m.resumen) + '</p>' : '') + (m.acuerdo ? '<p><b>Acuerdo:</b> ' + esc(m.acuerdo) + '</p>' : '') +
    (m.proximo ? '<label class="next' + (m.hecho ? ' done' : '') + '"><input type="checkbox" id="h-' + esc(m._id) + '" data-upd="comunicacion" data-id="' + esc(m._id) + '" data-field="hecho"' + (m.hecho ? ' checked' : '') + (can ? '' : ' disabled') + '> <span>' + esc(m.proximo) + '</span>' + (m.fechaProximo ? '<span class="mono">' + fmt(m.fechaProximo) + '</span>' : '') + '</label>' : '') + '</div>';
}

function vEquipo() {
  if (isAdmin() && ADM && ADM.equipoView) return ADM.equipoView();
  const list = [...S.E].sort((a, b) => (b.activo !== false) - (a.activo !== false) || cmp(a.persona, b.persona));
  let h = '<div class="head"><div><h1>Equipo</h1><p>Quién es quién en àndale y en qué está cada uno.</p></div><div class="toolbar">' + addBtn('persona', 'Persona') + '</div></div>';
  if (!list.length) return h + '<section class="sheet">' + emptyBox('Todavía no hay personas cargadas', '') + '</section>';
  const rows = list.map(e => {
    const ab = S.A.filter(a => a.estado === 'Activo' && hasResp(a, e.persona)).length, pr = S.P.filter(p => isOpen(p) && hasResp(p, e.persona)).length;
    return '<tr class="click" data-act="edit" data-kind="persona" data-id="' + esc(e._id) + '"' + (e.activo === false ? ' style="opacity:.55"' : '') + '><td><span class="who1">' + (isStaff() || (S.me && S.me.alias === e.persona) ? avEditable('persona', e._id, e.persona, e.avatar, '', !isAdmin()) : av(e.persona, e.avatar)) + '<b>' + esc(e.persona) + '</b></span></td><td>' + esc(e.nombre || '') + (e.puesto ? '<span class="sub">' + esc(e.puesto) + '</span>' : '') + '</td><td>' + pill(ROLES[e.rol] || e.rol, ROL_COLOR[e.rol] || '--muted') + '</td><td>' + (e.email ? esc(e.email) : '<span class="muted">Sin acceso</span>') + '</td><td class="n">' + ab + '</td><td class="n">' + pr + '</td><td>' + (e.activo === false ? '<span class="tag">Inactiva/o</span>' : '<span class="pill" style="--c:var(--ok)">Activa/o</span>') + '</td></tr>';
  }).join('');
  return h + '<section class="sheet"><div class="tbl"><table><thead><tr><th>Persona</th><th>Nombre completo</th><th>Rol</th><th>Email de acceso</th><th>Redes</th><th>Proyectos abiertos</th><th>Estado</th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
}

function vComs() {
  const mf = S.mf, q = norm(mf.q);
  const list = S.M.filter(m => (!mf.cliente || m.cliente === mf.cliente) && (!mf.pend || (!m.hecho && m.proximo)) && (!q || norm([m.cliente, m.resumen, m.acuerdo, m.proximo, m.conQuien].join(' ')).includes(q)))
    .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.creado || '').localeCompare(a.creado || ''));
  let h = '<div class="head"><div><h1>Charlas con clientes</h1><p>Lo que se habló con cada cliente (reunión, llamada, WhatsApp), qué se acordó y el próximo paso. Lo pendiente aparece en Inicio.</p></div><div class="toolbar">' + addBtn('comunicacion', 'Charla') + '</div></div>' +
    '<div class="toolbar"><input class="in" type="search" id="mq" data-bind="mf.q" placeholder="Buscar en resúmenes y acuerdos" value="' + esc(mf.q) + '"><select class="in" id="mc" data-bind="mf.cliente" aria-label="Cliente">' + clienteOpts(mf.cliente, 'Todos los clientes') + '</select><label class="chk"><input type="checkbox" id="mp" data-bind="mf.pend"' + (mf.pend ? ' checked' : '') + '> Solo con paso pendiente</label></div>';
  if (!list.length) return h + '<section class="sheet">' + emptyBox(S.M.length ? 'Ningún registro coincide' : 'Todavía no hay charlas anotadas', S.M.length ? '' : 'Registrá la primera reunión o llamada con un cliente.') + '</section>';
  return h + '<section class="sheet"><div class="timeline">' + list.map(m => comItem(m, false)).join('') + '</div><div class="count num">' + list.length + ' registros</div></section>';
}

// Configuración › Trabajo y Redes: las opciones de los desplegables, agrupadas por tema.
function listaHtml(k, label) {
  const arr = S.L[k] || [];
  return '<section class="sheet"><div class="sheet-h"><h3>' + esc(label) + '</h3><span class="muted num">' + arr.length + '</span></div><div class="sheet-b"><div class="chips">' +
    arr.map((v, i) => '<span class="chip">' + esc(v) + (isStaff() && !(k === 'estadosProyecto' && CERRADOS.has(v)) ? '<button aria-label="Quitar ' + esc(v) + '" data-act="listDel" data-k="' + k + '" data-i="' + i + '">×</button>' : '<span style="width:8px"></span>') + '</span>').join('') +
    '</div>' + (isStaff() ? '<form class="addrow" data-list="' + k + '"><input class="in" id="li-' + k + '" placeholder="Agregar valor" value="' + esc(S.listDraft[k] || '') + '" data-bind="listDraft.' + k + '"><button class="btn" type="submit">Agregar</button></form>' : '') + '</div></section>';
}
const cfgGrupo = (t, d, inner, id) => '<section class="cfg-g"' + (id ? ' id="' + id + '"' : '') + '><div class="cfg-gh"><h2>' + t + '</h2>' + (d ? '<p>' + d + '</p>' : '') + '</div>' + inner + '</section>';
function vListas() {
  const L = ks => '<div class="lists">' + ks.map(k => listaHtml(k, LIST_LABELS[k])).join('') + '</div>';
  const etapaKeys = S.FL ? [] : (S.L.tipos || []).filter(t => !['Redes', 'Ads'].includes(t)).map(t => ['etapas:' + t, 'Tareas modelo · ' + t]);
  const etapas = etapaKeys.length ? '<h3 class="cfg-st">Etapas por tipo de proyecto</h3><p class="cfg-nota">Se cargan al crear un proyecto de ese tipo. Cambiarlas no modifica los proyectos que ya existen.</p><div class="lists">' + etapaKeys.map(([k, l]) => listaHtml(k, l)).join('') + '</div>' : '';
  const grupos = [['proyectos', 'Proyectos'], ['clientes', 'Clientes'], ['redes', 'Redes'], ['ads', 'Ads'], ['otros', 'Proveedores y monedas']];
  return '<div class="head"><div><h1>Trabajo y Redes</h1><p>Las opciones que aparecen al cargar proyectos, clientes y piezas, y cómo trabaja el equipo en Redes.</p></div></div>' +
    '<nav class="cfg-idx" aria-label="Ir a">' + grupos.map(([id, t]) => '<a href="#listas" data-act="cfgIr" data-to="cfg-' + id + '">' + t + '</a>').join('') + '</nav>' +
    cfgGrupo('Proyectos', 'Tipos, estados y cómo avanza cada proyecto.', L(['tipos', 'estadosProyecto']) + etapas + (S.FL ? trab().flujosHtml() : ''), 'cfg-proyectos') +
    cfgGrupo('Clientes', 'Estados, servicios que se venden y por dónde se habla.', L(['estadosCliente', 'servicios', 'tiposAbono', 'canales']), 'cfg-clientes') +
    cfgGrupo('Redes', 'Planes, formatos, el flujo del mes y quién está en cada cuenta.', L(['planes', 'formatosRedes', 'rolesCuenta']) + (S.FL ? planesHtml() : '') + red().opcionesHtml() + equipoFijoHtml(), 'cfg-redes') +
    cfgGrupo('Ads', 'Dónde se pauta y qué se mide.', L(['plataformasAds', 'resultadosAds']), 'cfg-ads') +
    cfgGrupo('Proveedores y monedas', '', L(['rubros', 'monedas']), 'cfg-otros');
}
// Configuración › Mails
function vMails() {
  return '<div class="head"><div><h1>Mails</h1><p>Con qué firma salen los mails de la app. Todos llevan además los datos de àndale al pie.</p></div></div>' + firmasHtml(true);
}
// Quién firma los mails (se puede cambiar en cada mail antes de mandarlo).
function firmasHtml(solo) {
  const c = firmaConfig(S), ps = firmantes(S);
  const sel = (k, v) => '<select class="in" data-firmacfg="' + k + '"' + (isStaff() ? '' : ' disabled') + '>' + opt(FIRMA_YO, 'Quien lo manda', v) + ps.map(e => opt(e.persona, (e.nombre || e.persona) + (e.puesto ? ' · ' + e.puesto : ''), v)).join('') + opt(FIRMA_NO, 'Sin firma', v) + '</select>';
  return '<div class="cfg-gh"><h2>Firma de los mails</h2><p>Una para la cobranza y otra para el resto. En cada mail se ve la firma y se puede cambiar antes de mandarlo.</p></div>' +
    '<section class="sheet"><div class="sheet-b" style="display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))">' +
    '<div class="field"><label>Cobranza: resúmenes, facturas, recordatorios y aumentos</label>' + sel('cobranza', c.cobranza) + '</div>' +
    '<div class="field"><label>El resto: mensajes a clientes, avisos del portal, proveedores y presupuestos</label>' + sel('otros', c.otros) + '<span class="hint">Si firma otra persona, el mail sale con su nombre y las respuestas le llegan a ella.</span></div></div></section>';
}
// Quiénes están en todas las cuentas de Redes y con qué rol (se suman solos a cada cuenta nueva).
function equipoFijoHtml() {
  const fijo = equipoFijo(), rolF = a => (fijo.find(x => x.a === a) || {}).rol || '';
  const staff = S.E.filter(e => e.activo !== false && e.persona && e.rol !== 'externo').map(e => e.persona).sort(cmp);
  return '<h2 style="margin:24px 0 0">Equipo de las cuentas de Redes</h2><p class="muted" style="margin:0">Quién está en todas las cuentas y con qué rol. Se suman solos a cada cuenta nueva; el resto (diseño, Ads) se elige en cada cuenta.</p>' +
    '<section class="sheet" style="margin-top:12px"><div class="rol-lista" style="padding:12px 16px">' + staff.map(a => '<label class="rol-f"><span>' + av(a, fotoDe(a)) + esc(a) + '</span><select class="in sm" data-eqfijo="' + esc(a) + '"' + (isStaff() ? '' : ' disabled') + ' aria-label="Rol fijo de ' + esc(a) + '">' + opt('', 'Según cada cuenta', rolF(a)) + rolesCuenta().map(r => opt(r, 'En todas · ' + r, rolF(a))).join('') + '</select></label>').join('') + '</div>' +
    (isStaff() && fijo.length ? '<div class="count" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span>' + esc(fijo.map(x => x.a + ' (' + x.rol + ')').join(', ')) + '</span><button class="btn sm" data-act="equipoFijoAplicar">Sumarlos a las cuentas activas</button></div>' : '') + '</section>';
}

// Piezas que incluye cada plan de redes (con eso arranca cada mes).
function planesHtml() {
  const fs = S.L.formatosRedes || DEF.formatosRedes;
  const val = (p, f) => { const x = (S.L['plan:' + p] || []).find(y => y.startsWith(f + '=')); return x ? x.slice(f.length + 1) : ''; };
  return '<h2 style="margin:24px 0 0">Piezas por plan de redes</h2><p class="muted" style="margin:0">Con esto arranca cada mes de un cliente según su plan. Es una meta: lo que se haga de más queda como extra.</p>' +
    '<section class="sheet" style="margin-top:12px"><div class="tbl"><table><thead><tr><th>Plan</th>' + fs.map(f => '<th>' + esc(f) + '</th>').join('') + '</tr></thead><tbody>' +
    (S.L.planes || []).map(p => '<tr><td class="name">' + esc(p) + '</td>' + fs.map(f => '<td><input class="in sm" type="number" min="0" max="200" style="width:80px" value="' + esc(val(p, f)) + '" data-plan="' + esc(p) + '" data-fmt="' + esc(f) + '"' + (isStaff() ? '' : ' disabled') + ' aria-label="' + esc(f + ' en ' + p) + '"></td>').join('') + '</tr>').join('') + '</tbody></table></div></section>';
}
/* ---------- Integraciones (catálogo y configuración en integraciones.js) ---------- */
let INTEGR = null;
const integr = () => INTEGR || (INTEGR = initIntegraciones({ S, esc, opt, toast, $, data, render, isAdmin, isStaff, closeForm, ISO, emptyBox, DEF: INTEG_DEF, extraCuentas: () => (ADM && ADM.carpetasDrive ? ADM.carpetasDrive() : '') }));
const vIntegraciones = () => integr().view();
const trab = () => TRAB || (TRAB = initTrabajo({ S, esc, opt, toast, data, render, isStaff, personas }));
let PRF = null;
const prf = () => PRF || (PRF = initPerfil({ S, esc, toast, data, $, avEditable, closeForm, ROLES, render }));
let FM = null;
let AUT = null;
const aut = () => AUT || (AUT = initAutomatizar({ S, esc, opt, toast, data, $, isAdmin, isStaff, render }));
const fm = () => FM || (FM = initFichaMarca({ S, esc, toast, data, render, emptyBox, isStaff, closeForm }));
let RLJ = null;
const rlj = () => RLJ || (RLJ = initReloj({ S, esc, opt, toast, data, $, today, cmp }));
let INF = null;
const inf = () => INF || (INF = initInformes({ marcaCtx: (c, ps) => fm().contexto(c, ps), S, esc, toast, data, render, emptyBox, monthLabel, addMonth, isStaff, fmt, piezas: id => red().piezas(id) || [], cfgMarca: () => (ADM && ADM.cfgMarca ? ADM.cfgMarca() : null), segDe: c => segDe(c), avisarCliente: (c, t, i) => avisarCliente(c, t, i) }));
const red = () => RED || (RED = initRedes({ reload: () => reload(), extrasCfg: id => (ADM && ADM.extrasCfg ? ADM.extrasCfg(id) : null), formExtras: id => ADM && ADM.formExtras && ADM.formExtras(id), money: (n, m) => moneyFmt(n, m), servChips: (c, o) => servChips(c, o), servAb: c => servicioRedes(c).redes, autoBtn: p => aut().boton(p), toastAccion, masMenu, marcaCtx: (c, ps) => fm().contexto(c, ps), avisarCliente: (c, t, i) => avisarCliente(c, t, i), informe: (m, ps) => inf().html(m, ps), S, esc, opt, toast, data, render, $, av, fotoDe, personas, pill, fmt, fmtShort, today, thisMonth, addMonth, monthLabel, isStaff, cmp, norm, emptyBox, hil, ISO, lsSet, lsGet, closeForm,
  cfgGet: (k, c) => integr().cfgGet(k, c), servicios: n => serviciosDe(n).map(x => x.tipo).join(', '),
  irMes: id => { S.view = 'redes'; S.rmFicha = id || null; S.ficha = null; S.pficha = null; try { history.replaceState(null, '', '#redes' + (id ? '/' + id : '')); } catch (e) { } render(); window.scrollTo(0, 0); } }));
const moneyFmt = (n, m) => { try { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: m || 'ARS', maximumFractionDigits: 0 }).format(+n || 0); } catch (e) { return (m || '') + ' ' + n; } };
const tk = () => TKS || (TKS = initTickets({ autoBtn: p => aut().boton(p), S, esc, opt, toast, data, render, $, av, fotoDe, personas, fmt, fmtShort, today, thisMonth, isStaff, isAdmin, cmp, norm, emptyBox, hil, clienteOpts, closeForm, reload, ISO, money: moneyFmt, copyText, waNum, openMail: o => MAIL && MAIL.open(o) }));
const vTickets = () => tk().vTickets();
const vBriefs = () => tk().vBriefs();
const redTabs = () => subnav('redes', [['meses', 'El mes'], ['planes', 'Clientes y planes']]);
const vRedes = () => S.rmFicha ? red().vMes(S.rmFicha) : redTabs() + (S.tab.redes === 'planes' ? vPlanes() : red().vLista());
let ENT = null;
const ent = () => ENT || (ENT = initEntregas({ S, esc, opt, toast, data, render, $, fmt, isStaff, emptyBox, hil, closeForm, reload: () => reload(), avisarCliente: (c, t, i) => avisarCliente(c, t, i) }));
// Aviso por email a los contactos con acceso al portal cuando algo queda para revisar (mes de redes o entrega).
async function avisarCliente(cliente, tipo, info) {
  let ks = contactosDe(cliente).filter(k => k.portal && k.email);
  if (!ks.length) {
    // Sin nadie con acceso al portal: se ofrece darle acceso al contacto con email (principal primero) y seguir con el aviso.
    const cand = contactosDe(cliente).filter(k => k.email && k._id && !k._virt);
    if (!cand.length) { await avisarDlg('Nadie de ' + cliente + ' puede recibir el aviso. Cargale un email a un contacto en su ficha (Contactos) y dale acceso al portal; después tocá “Enviar al cliente” de nuevo.', { titulo: 'Falta un contacto con email' }); return false; }
    const k = cand[0];
    if (!await confirmar('Nadie de ' + cliente + ' tiene acceso al portal todavía. ¿Le doy acceso a ' + nomContacto(k) + ' (' + k.email + ') y le mando el aviso? Entra al portal con ese email.', { titulo: 'Darle acceso al portal', ok: 'Dar acceso y avisar' })) return false;
    try { await data.upd('contactos', k._id, { portal: true }); k.portal = true; try { await data.avisosFn({ accion: 'portal_alta', contacto_id: k._id }); } catch (e) { /* el aviso sale igual */ } }
    catch (e) { toast('No pude darle acceso: ' + e.message); return false; }
    ks = [k];
  }
  const mesTxt = monthLabel(String(info.mes || '').slice(0, 7));
  const que = tipo === 'redes' ? 'el contenido de redes de ' + mesTxt : tipo === 'informe' ? 'el informe de redes de ' + mesTxt : '“' + info.titulo + '” de ' + info.proyecto;
  if (!await confirmar('Le llega un mail a ' + ks.map(k => nomContacto(k) + (k.email ? ' (' + k.email + ')' : '')).join(', ') + (tipo === 'informe' ? ' avisando que ya puede ver ' : ' avisando que tiene para revisar ') + que + ', con el link a su portal.', { titulo: '¿Avisamos a ' + cliente + '?', ok: 'Mandar el mail', tipo: 'mail' })) return false;
  const nombres = ks.map(k => (k.nombre || '').split(' ')[0]).filter(Boolean);
  const mensaje = 'Hola' + (nombres.length === 1 ? ' ' + nombres[0] : '') + ', ¿cómo estás?\n\n' + (tipo === 'informe' ? 'Ya está en el portal de àndale ' + que + ': cómo fue el mes, qué funcionó mejor y qué proponemos para el que viene.' : 'Ya tenés para revisar ' + que + ' en el portal de àndale. Desde ahí podés aprobar o pedirnos cambios, y comentar lo que quieras.') + '\n\nEntrás con tu email, sin contraseña.';
  const fir = firmanteDe(S, 'Mensaje');
  const b = E.libreEmail({ cfg: {}, cuenta: cliente, titulo: tipo === 'redes' ? 'Tus redes del mes, listas para revisar' : tipo === 'informe' ? 'Tu informe de redes de ' + mesTxt : 'Tenés una entrega para revisar', mensaje, botonUrl: PORTAL_URL, botonTexto: 'Ir al portal', firma: fir ? firmaDe(S, fir) : null, asunto: tipo === 'redes' ? 'Tus redes del mes para revisar · àndale' : tipo === 'informe' ? 'Informe de redes de ' + mesTxt + ' · àndale' : 'Entrega para revisar: ' + info.titulo + ' · àndale' });
  try { await data.sendEmail({ tipo: 'Mensaje', cliente_id: data.ids.cliente(cliente), para: ks.map(k => k.email).join(', '), cc: '', asunto: b.asunto, html: b.html, texto: b.texto, copia: false, firmante_id: fir ? personaIdDe(S, fir) : null }); toast('Aviso enviado a ' + ks.map(nomContacto).join(', ')); return true; }
  catch (e) { toast('No se pudo mandar el aviso: ' + e.message); return false; }
}
const hil = () => HIL || (HIL = initHilos({ S, esc, toast, data, $, av, fotoDe, personas, go, abrirLink }));
// Link a Google Calendar (sin API): abre el evento ya armado para guardarlo.
function gcalUrl(titulo, fecha, detalle) {
  if (!fecha) return ''; const d = fecha.replace(/-/g, ''); const n = new Date(fecha + 'T12:00'); n.setDate(n.getDate() + 1);
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(titulo) + '&dates=' + d + '/' + n.toISOString().slice(0, 10).replace(/-/g, '') + '&details=' + encodeURIComponent(detalle || 'àndale Operaciones');
}
const calBtn = (titulo, fecha, detalle, cls) => integ('calendario') && fecha ? '<a class="btn ico-b ' + (cls || '') + '" href="' + esc(gcalUrl(titulo, fecha, [detalle, integr().cfgGet('calendario', 'aviso')].filter(Boolean).join(' · '))) + '" target="_blank" rel="noopener" title="Agregar a Google Calendar" aria-label="Agregar a Google Calendar">' + ICON.calendario + '</a>' : '';
const VIEW_FN = { inicio: vInicio, redes: () => vRedes(), tickets: () => vTickets(), briefs: () => vBriefs(), proyectos: vProyectos, mis: vMis, clientes: vClientes, equipo: vEquipo, comunicaciones: vComs, listas: vListas, mails: vMails, integraciones: vIntegraciones };

/* ---------- Render ---------- */
document.addEventListener('change', e => {
  const sa = e.target.closest && e.target.closest('select.red-add'); if (!sa || !sa.value) return;
  const box = sa.parentElement.querySelector('.redes'); const k = sa.value;
  if (box && !box.querySelector('[data-redk="' + k + '"]')) box.insertAdjacentHTML('beforeend', redFila(k, '', ''));
  sa.querySelector('option[value="' + k + '"]').remove(); sa.value = '';
  const inp = box && box.querySelector('[data-red="' + k + '"]'); if (inp) inp.focus();
});
document.addEventListener('change', e => { if (e.target.id === 'k-portal') { const b = document.querySelector('.k-inv'); if (b) b.hidden = !e.target.checked; } });
// Alta de cliente: Ads arrastra Redes (no hay Ads sin Redes) y sacar Redes saca Ads.
document.addEventListener('change', e => {
  const t = e.target;
  if (t.matches && t.matches('[data-srvpr]')) { const sel = document.querySelector('[data-srvmodo="' + t.dataset.srvpr + '"]'); if (sel) sel.hidden = !t.checked; return; }
  if (!t.matches || !t.matches('[data-srvab]')) return;
  const r = document.querySelector('[data-srvab="Redes"]'), a = document.querySelector('[data-srvab="Ads"]');
  if (t === a && a.checked && r) r.checked = true;
  if (t === r && !r.checked && a) a.checked = false;
  const b = document.getElementById('srvplan'); if (b && r) b.hidden = !r.checked;
});
function kbFlechas(kb) {
  const w = kb && kb.parentElement; if (!w) return;
  kb.style.setProperty('--kb-top', Math.round(kb.getBoundingClientRect().top + window.scrollY + 24) + 'px');
  const max = kb.scrollWidth - kb.clientWidth;
  w.classList.toggle('puede-l', kb.scrollLeft > 4); w.classList.toggle('puede-r', kb.scrollLeft < max - 4);
}
document.addEventListener('scroll', e => { if (e.target.classList && e.target.classList.contains('kb')) kbFlechas(e.target); }, true);
window.addEventListener('resize', () => kbFlechas(document.querySelector('.kb')));
// Rueda vertical sobre los títulos de columna (o el fondo) => desplaza de costado
document.addEventListener('wheel', e => {
  const kb = e.target.closest && e.target.closest('.kb'); if (!kb || e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
  const col = e.target.closest('.col'), enTitulo = e.target.closest('.col-h');
  if (col && !enTitulo && col.scrollHeight > col.clientHeight) return;
  if (kb.scrollWidth <= kb.clientWidth) return;
  e.preventDefault(); kb.scrollLeft += e.deltaY;
}, { passive: false });
// Arrastrar el fondo del tablero para moverlo de costado
document.addEventListener('pointerdown', e => {
  const kb = e.target.closest && e.target.closest('.kb'); if (!kb || e.button !== 0 || e.pointerType !== 'mouse' || e.target.closest('.card,button,a,input,select')) return;
  const x0 = e.clientX, l0 = kb.scrollLeft; let movio = false;
  const mv = ev => { const dx = ev.clientX - x0; if (Math.abs(dx) > 3) { movio = true; kb.classList.add('paneando'); } kb.scrollLeft = l0 - dx; };
  const up = () => { document.removeEventListener('pointermove', mv); document.removeEventListener('pointerup', up); kb.classList.remove('paneando'); if (movio) { const k = ev => ev.stopPropagation(); document.addEventListener('click', k, true); setTimeout(() => document.removeEventListener('click', k, true), 0); } };
  document.addEventListener('pointermove', mv); document.addEventListener('pointerup', up);
});
// Pestañas de la sección actual (no se muestran adentro de una ficha: ahí manda la miga de pan de arriba).
function secTabs() {
  if (S.ficha || S.pficha || S.rmFicha) return '';
  const sec = SECCIONES.find(x => x[0] === seccionDe(S.view)), vs = new Map(views().map(v => [v[0], v[1]]));
  const its = sec[3].filter(k => vs.has(k)); if (its.length < 2) return '';
  const c = S.secCounts || {};
  return '<nav class="sectabs" aria-label="' + esc(sec[1]) + '">' + its.map(k => '<button data-act="go" data-view="' + k + '"' + (S.view === k ? ' aria-current="page"' : '') + '>' + esc(TAB_LABEL[k] || vs.get(k)) +
    (c[k] && !['proyectos', 'abonos', 'clientes'].includes(k) ? '<span class="snav-n' + (k === 'cobros' ? ' hot' : '') + '">' + c[k] + '</span>' : '') + '</button>').join('') + '</nav>';
}
function render() {
  if (!S.me) return;
  const a = document.activeElement, fid = a && a.id && $('#view').contains(a) ? a.id : null;
  const sel = fid && typeof a.selectionStart === 'number' ? [a.selectionStart, a.selectionEnd] : null;
  const kb = document.querySelector('.kb'), kbLeft = kb ? kb.scrollLeft : 0, kbTops = kb ? [...kb.querySelectorAll('.col')].map(c => c.scrollTop) : [];
  if (!views().some(v => v[0] === S.view)) S.view = isExt() ? 'mis' : 'inicio';
  const counts = { ...(isAdmin() && ADM ? ADM.counts() : {}), proyectos: S.P.filter(isOpen).length, abonos: S.A.filter(a => a.estado === 'Activo').length, clientes: isStaff() ? S.C.filter(c => c.estado === 'Activo').length : 0, comunicaciones: pendientes().length, tickets: S.PD ? S.PD.filter(t => t.estado === 'Nuevo').length : 0, briefs: S.BF ? S.BF.filter(b => b.estado === 'Nuevo').length : 0 };
  const vs = new Map(views().map(v => [v[0], v[1]]));
  const secAct = seccionDe(S.view);
  S.secLast = S.secLast || {}; S.secLast[secAct] = S.view;
  // Acordeón: queda abierta una sola sección. Al entrar a otra sección se abre esa; con un clic en el título se abre o se cierra.
  if (S.navUlt !== secAct) { S.navUlt = secAct; S.navSec = secAct; }
  const hot = k => k === 'cobros';
  const cnt = k => counts[k] && !['proyectos', 'abonos', 'clientes'].includes(k) ? '<span class="snav-n' + (hot(k) ? ' hot' : '') + '">' + counts[k] + '</span>' : '';
  $('#nav').innerHTML = SECCIONES.map(([k, l, ic, ks]) => {
    const its = ks.filter(x => vs.has(x)); if (!its.length) return '';
    if (its.length === 1 && k === 'inicio') return '<button class="snav-i" data-act="go" data-view="inicio"' + (S.view === 'inicio' ? ' aria-current="page"' : '') + '>' + ICON.inicio + '<span class="snav-l">Inicio</span></button>';
    const abierta = S.navSec === k, n = its.reduce((a, x) => a + (cnt(x) ? counts[x] : 0), 0);
    return (k === 'finanzas' ? '<span class="snav-sep" aria-hidden="true"></span>' : '') +
      '<div class="snav-sec' + (abierta ? ' open' : '') + (secAct === k ? ' act' : '') + '"><button class="snav-i snav-h" data-act="secTog" data-s="' + k + '" aria-expanded="' + abierta + '">' + (ICON[ic] || '') + '<span class="snav-l">' + l + '</span>' +
      (!abierta && n ? '<span class="snav-n' + (k === 'finanzas' ? ' hot' : '') + '">' + n + '</span>' : '') + '<span class="snav-chev" aria-hidden="true"></span></button>' +
      '<div class="snav-sub"' + (abierta ? '' : ' hidden') + '>' + its.map(x => '<button class="snav-i snav-c" data-act="go" data-view="' + x + '"' + (S.view === x ? ' aria-current="page"' : '') + '><span class="snav-l">' + esc(TAB_LABEL[x] || vs.get(x)) + '</span>' + cnt(x) + '</button>').join('') + '</div></div>';
  }).join('');
  S.secCounts = counts;
  $('#nav2').hidden = true;
  const sync = $('#sync');
  sync.className = 'sync ' + (S.status === 'ok' ? 'ok' : S.status === 'offline' ? 'err' : '');
  sync.lastElementChild.textContent = S.status === 'ok' ? 'En vivo' : S.status === 'offline' ? 'Sin conexión' : 'Conectando';
  $('#me').innerHTML = '<button class="me-b" data-act="perfil" title="Tu perfil, avisos y tema">' + av(S.me.alias, fotoDe(S.me.alias), '') + '<span class="me-t"><b>' + esc(S.me.alias) + '</b><span>' + esc(ROLES[S.me.rol]) + '</span></span>' + ICON.ajustes + '</button>' ; atajos(); initAyuda({ rol: S.me.rol, toast, atajos: () => atajos().ayuda() });
  if (S.status === 'loading') { $('#view').innerHTML = '<section class="sheet">' + emptyBox('Cargando datos del equipo…', '') + '</section>'; return; }
  $('#view').innerHTML = secTabs() + viewFn(S.view)();
  reabrir($('#view'));
  ponerHerramientas();
  const kb2 = document.querySelector('.kb'); if (kb2) { kb2.scrollLeft = kbLeft; kb2.querySelectorAll('.col').forEach((c, i) => { c.scrollTop = kbTops[i] || 0; }); kbFlechas(kb2); }
  if (fid) { const el = document.getElementById(fid); if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange) try { el.setSelectionRange(sel[0], sel[1]); } catch (e) { } } }
}
function banner(msg, err) { const b = $('#banner'); if (!msg) { b.hidden = true; return; } b.innerHTML = msg; b.className = 'banner' + (err ? ' err' : ''); b.hidden = false; }
// Impresión con la estética de los documentos: encabezado (Mr. Piggy + logotipo, qué es y fecha) y pie (sitio y contacto)
// que se repiten en cada hoja. La pantalla se mueve adentro de una tabla solo mientras se imprime.
function marcoImpresion() {
  const vista = (views().find(v => v[0] === S.view) || [])[1] || '';
  const pest = document.querySelector('#view .subnav [aria-current="page"]');
  const que = [vista, pest ? pest.childNodes[0].textContent : ''].filter(Boolean).join(' · ');
  const cfg = (ADM && ADM.AD && ADM.AD.AJ && ADM.AD.AJ.resumen_pdf) || {};
  const contacto = (cfg.contacto || [['+54 9 351 705 3527'], ['hello@weareandale.com']]).map(c => c[0]).filter(t => !t.startsWith('@') && !/^weareandale\.com$/.test(t));
  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const cab = '<div class="pr-h"><span class="pr-marca"><span class="pr-iso">' + ISO + '</span><span class="pr-logo">' + LOGO + '</span></span><span class="pr-meta"><b>' + esc(que) + '</b><span>Impreso el ' + fecha + (S.me ? ' · ' + esc(S.me.alias) : '') + '</span></span></div>';
  const pie = '<div class="pr-f"><b>weareandale.com</b><span>' + esc(contacto.join('  ·  ')) + '</span><span class="pr-ley">' + esc(cfg.pie || 'with ❤ from cordoba | © àndale Strictly Confidential').replace(/❤️?|♥/g, '<i>♥</i>') + '</span></div>';
  return { cab, pie };
}
window.addEventListener('beforeprint', () => {
  const v = $('#view'); if (!v || !S.me || $('#printwrap')) return;
  const { cab, pie } = marcoImpresion();
  const t = document.createElement('table'); t.id = 'printwrap';
  // El encabezado se repite como cabecera de la tabla; el pie va fijo abajo en cada hoja (y la tfoot le reserva el lugar).
  t.innerHTML = '<thead><tr><td>' + cab + pie.replace('class="pr-f"', 'class="pr-f pr-fijo"') + '</td></tr></thead><tfoot><tr><td><div class="pr-esp"></div></td></tr></tfoot><tbody><tr><td id="pw-body"></td></tr></tbody>';
  const marca = document.createComment('view'); v.parentNode.insertBefore(marca, v);
  t.querySelector('#pw-body').appendChild(v); document.body.appendChild(t); document.body.classList.add('imprimiendo');
  window.__pwMarca = marca;
});
window.addEventListener('afterprint', () => {
  const t = $('#printwrap'), m = window.__pwMarca, v = $('#view'); if (!t) return;
  if (m && v) { m.parentNode.insertBefore(v, m); m.remove(); }
  t.remove(); document.body.classList.remove('imprimiendo'); window.__pwMarca = null;
});
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
let toastT; function toast(msg) { if (esVersionVieja(msg) && recargarVersion()) return; const t = $('#toast'); t.classList.remove('con-acc'); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600); }
const EXP = initExportar({ $, toast: m => toast(m), titulo: () => tituloVista() });

/* ---------- Formularios ---------- */
const FORMS = {
  proyecto: { arr: 'P', title: 'proyecto', nuevo: 'Nuevo proyecto', label: p => p.proyecto, fields: [
    { k: 'cliente', label: 'Cliente', type: 'select', html: v => clienteOpts(v), req: 1, staffOnly: 1 },
    { k: 'proyecto', label: 'Proyecto', req: 1, staffOnly: 1 },
    { k: 'tipo', label: 'Tipo', type: 'select', opts: () => S.L.tipos, blank: '—', staffOnly: 1 },
    { k: 'estado', label: 'Estado', type: 'select', opts: () => S.L.estadosProyecto },
    { k: 'responsables', label: 'Responsables', type: 'multi', full: 1, staffOnly: 1 },
    { k: 'prioridad', label: 'Prioridad', type: 'select', opts: () => PRIOS, blank: 'Sin prioridad' },
    { k: 'etapas', label: 'Tareas', type: 'etapas', full: 1 },
    { k: 'fechaInicio', label: 'Fecha de inicio', type: 'date' },
    { k: 'entrega', label: 'Entrega pactada', type: 'date', hint: 'Opcional' },
    { k: 'entregaReal', label: 'Entrega real', type: 'date', adv: 1 },
    { k: 'entregables', label: 'Entregables', type: 'textarea', full: 1, rows: 2, adv: 1 },
    { k: 'drive', label: 'Carpeta (Drive)', type: 'url', full: 1, ph: 'https://', adv: 1 },
    { k: 'slides', label: 'Presentación (Slides)', type: 'url', ph: 'https://', adv: 1 },
    { k: 'canva', label: 'Canva', type: 'url', ph: 'https://', adv: 1 },
    { k: 'notas', label: 'Notas', type: 'textarea', full: 1, adv: 1 },
  ], masLabel: 'Links, entregables y notas', defaults: () => ({ estado: 'Por empezar', fechaInicio: today(), responsables: [] }), can: rec => rec ? canEditProj(rec) : isStaff() },
  abono: { arr: 'A', title: 'servicio mensual', nuevo: 'Servicio mensual', label: a => a.cliente + ' · ' + abonoLabel(a), fields: [
    { k: 'cliente', label: 'Cliente', type: 'select', html: v => clienteOpts(v), req: 1, full: 1 },
    { k: 'tipo', label: 'Servicio', type: 'select', opts: () => [...new Set([...(S.L.tiposAbono || ['Redes', 'Ads']), ...(S.L.tipos || [])])], req: 1, hint: 'Lo que se cobra todos los meses con precio fijo: Redes, Ads o, si va mes a mes, Audiovisual, Diseño… Ads va siempre junto con Redes.' },
    { k: 'plan', label: 'Plan', type: 'select', opts: () => S.L.planes, blank: 'Sin plan' },
    { k: 'redes', label: 'Redes que gestionamos (servicio de Redes)', type: 'chips', opts: () => REDES_G, full: 1, hint: 'Las piezas nuevas salen para estas redes; en cada pieza se puede elegir una o varias.' },
    { k: 'responsables', label: 'Quién trabaja en esta cuenta', type: 'equipo', full: 1, hint: 'Elegí el rol de cada persona. El mes de Redes se asigna a quien está en Cuentas y las piezas nuevas a quien está en Diseño.' },
    { k: 'desde', label: 'Desde (mes)', type: 'month' },
    { k: 'hasta', label: 'Hasta (mes, si se dio de baja)', type: 'month' },
    { k: 'estado', label: 'Estado', type: 'select', opts: () => ESTADOS_ABONO },
    { k: 'notas', label: 'Notas', type: 'textarea', full: 1 },
  ], defaults: () => ({ tipo: 'Redes', estado: 'Activo', desde: thisMonth(), responsables: equipoFijo().map(x => x.a), roles: Object.fromEntries(equipoFijo().map(x => [x.a, x.rol])) }), can: () => isStaff() },
  cliente: { arr: 'C', title: 'cliente', nuevo: 'Nuevo cliente', label: c => c.nombre, fields: [
    { k: 'nombre', label: 'Cliente', req: 1, full: 1 },
    { k: 'desde', label: 'Cliente desde (mes y año)', type: 'month', hint: 'Cuándo empezó a trabajar con àndale. No hace falta el día.' },
    { k: 'estado', label: 'Estado', type: 'select', html: v => opt('__auto', 'Automático', v) + optsFrom(S.L.estadosCliente, v === '__auto' ? '' : v, undefined, VER_CL), hint: 'Se calcula solo con sus abonos y proyectos. Elegí otro solo si no coincide.' },
    { k: 'responsables', label: 'Responsables', type: 'multi', full: 1 },
    { k: 'contacto', label: 'Contacto principal (nombre)', alta: 1 },
    { k: 'email', label: 'Email', type: 'email', alta: 1 },
    { k: 'tel', label: 'WhatsApp / celular', type: 'tel', alta: 1, hint: 'Después sumás más contactos desde la ficha.' },
    { k: 'telFijo', label: 'Teléfono fijo', type: 'tel', alta: 1, ph: 'Si tiene' },
    { k: 'redes', label: 'Web y redes', type: 'redes', full: 1 },
    { k: 'carpeta', label: 'Carpeta del cliente', type: 'url', ph: 'https://', full: 1, hint: 'La carpeta madre del cliente (Drive o Dropbox), donde está su marca y los entregables. El contenido mensual de redes va en las carpetas de Dropbox de cada mes.' },
    { k: 'notas', label: 'Notas', type: 'textarea', full: 1, hint: 'No guardes contraseñas acá: usá el gestor de contraseñas del equipo.' },
  ], defaults: () => ({ estado: '__auto', desde: thisMonth(), responsables: [] }), can: () => isStaff() },
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
  comunicacion: { arr: 'M', title: 'charla', nuevo: 'Anotar charla', label: m => m.cliente, fields: [
    { k: 'fecha', label: 'Fecha', type: 'date', req: 1 },
    { k: 'cliente', label: 'Cliente', type: 'select', html: v => clienteOpts(v), req: 1 },
    { k: 'canal', label: 'Canal', type: 'select', opts: () => S.L.canales, blank: '—' },
    { k: 'conQuien', label: 'Con quién', list: 1 },
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
  return (e.length ? e.map((x, i) => '<div class="etrow"><label class="chk"><input type="checkbox" data-fet="' + i + '"' + (x.ok ? ' checked' : '') + (ro ? ' disabled' : '') + '> ' + esc(x.n) + '</label>' + (ro ? '' : '<button type="button" class="btn ghost sm" data-act="fetDel" data-i="' + i + '" aria-label="Quitar tarea">✕</button>') + '</div>').join('') : '<span class="muted">Sin tareas. Después, en la ficha del proyecto, les asignás quién y para cuándo.</span>') +
    (ro ? '' : '<div class="etadd"><input class="in" id="f-etapa-nueva" placeholder="Agregar tarea"><button type="button" class="btn sm" data-act="fetAdd">Agregar</button>' + (plantilla(tipo).length ? '<button type="button" class="btn ghost sm" data-act="fetTpl">' + (e.length ? 'Reemplazar por' : 'Usar') + ' tareas modelo de ' + esc(tipo) + '</button>' : '') + '</div>');
}
function renderEtapasField() { const el = $('#f-etapas'); if (el) el.innerHTML = etapasInner(); }
// Web y redes del cliente: Web e Instagram siempre a mano; las demás se suman con "+ Agregar red". Vacías no se guardan ni se muestran en la ficha.
const REDES = [['web', 'Web', 'https://…'], ['instagram', 'Instagram', '@usuario'], ['facebook', 'Facebook', 'facebook.com/…'], ['linkedin', 'LinkedIn', 'linkedin.com/company/…'], ['tiktok', 'TikTok', '@usuario'], ['youtube', 'YouTube', 'youtube.com/@…'], ['behance', 'Behance', 'behance.net/…'], ['x', 'X (Twitter)', '@usuario'], ['pinterest', 'Pinterest', 'pinterest.com/…'], ['otra', 'Otra', 'https://…']];
const BASE_RED = { instagram: 'https://instagram.com/', facebook: 'https://facebook.com/', tiktok: 'https://tiktok.com/@', x: 'https://x.com/', youtube: 'https://youtube.com/@', behance: 'https://behance.net/', pinterest: 'https://pinterest.com/', linkedin: 'https://linkedin.com/in/' };
function redUrl(k, v) {
  v = String(v || '').trim(); if (!v) return '';
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/|$)/.test(v)) return 'https://' + v;
  const u = v.replace(/^@/, '');
  return BASE_RED[k] ? BASE_RED[k] + (k === 'tiktok' || k === 'youtube' ? u.replace(/^@/, '') : u) : '';
}
const redFila = (k, v, dis) => { const r = REDES.find(x => x[0] === k) || [k, k, '']; return '<div class="red-f" data-redk="' + esc(k) + '"><label for="f-red-' + esc(k) + '">' + esc(r[1]) + '</label><input id="f-red-' + esc(k) + '" data-red="' + esc(k) + '" value="' + esc(v || '') + '" placeholder="' + esc(r[2]) + '"' + dis + '>' + (k === 'web' || k === 'instagram' || dis ? '' : '<button type="button" class="btn ghost sm" data-act="redQuitar" aria-label="Quitar ' + esc(r[1]) + '">✕</button>') + '</div>'; };
function redesHtml(id, v, dis) {
  const o = v || {}, ks = REDES.map(x => x[0]).filter(k => k === 'web' || k === 'instagram' || o[k]);
  const resto = REDES.filter(x => !ks.includes(x[0]));
  return '<div class="redes" id="' + id + '">' + ks.map(k => redFila(k, o[k], dis)).join('') + '</div>' +
    (dis ? '' : '<select class="in sm red-add" aria-label="Agregar otra red"><option value="">+ Agregar red</option>' + resto.map(x => '<option value="' + x[0] + '">' + esc(x[1]) + '</option>').join('') + '</select>');
}
function redesLinks(c) {
  const o = Object.assign({}, c.redes || {}, c.web ? { web: c.web } : {});
  const ks = REDES.map(x => x[0]).filter(k => String(o[k] || '').trim());
  return ks.map(k => { const u = redUrl(k, o[k]), l = REDES.find(x => x[0] === k)[1], t = esc(String(o[k]).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''));
    return '<span class="red-l"><b>' + esc(l) + '</b> ' + (u ? '<a href="' + esc(u) + '" target="_blank" rel="noopener">' + t + '</a>' : t) + '</span>'; }).join('');
}
function fieldHtml(f, v, ro) {
  if (f.type === 'redes') return '<div class="field full"><span class="lbl">' + esc(f.label) + '</span>' + redesHtml('f-' + f.k, v, (ro || (f.staffOnly && !isStaff())) ? ' disabled' : '') + '<span class="hint">Si no tiene alguna, dejala vacía: en la ficha solo aparecen las que tienen algo.</span></div>';
  if (f.type === 'etapas') return '<div class="field full"><span class="lbl">' + esc(f.label) + '</span><div id="f-etapas" class="etapas"></div><span class="hint">El avance se ve por tareas hechas. Las tareas modelo de cada tipo se editan en Opciones.</span></div>';
  const id = 'f-' + f.k, dis = (ro || (f.staffOnly && !isStaff())) ? ' disabled' : '';
  const hint = f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '';
  if (f.type === 'check') return '<label class="chk ' + (f.full ? 'full' : '') + '"><input type="checkbox" id="' + id + '"' + (v ? ' checked' : '') + dis + '> ' + esc(f.label) + '</label>';
  if (f.type === 'equipo') return '<div class="field full"><span class="lbl">' + esc(f.label) + '</span>' + equipoField(id, Array.isArray(v) ? v : [], (S.form && S.form.roles) || {}, dis) + hint + '</div>';
  if (f.type === 'chips') return '<div class="field full"><span class="lbl">' + esc(f.label) + '</span>' + redChips('f-' + f.k, Array.isArray(v) ? v : [], f.opts(), dis, esc) + hint + '</div>';
  if (f.type === 'multi') {
    const sel = Array.isArray(v) ? v : (v ? [v] : []); const ps = personas(); const all = [...ps, ...sel.filter(p => !ps.includes(p))];
    return '<div class="field full"><span class="lbl">' + esc(f.label) + '</span><div class="multi" id="' + id + '">' + (all.length ? all.map(p => '<label><input type="checkbox" value="' + esc(p) + '"' + (sel.includes(p) ? ' checked' : '') + dis + '> ' + esc(p) + '</label>').join('') : '<span class="muted">Cargá personas en Equipo.</span>') + '</div></div>';
  }
  let ctl;
  if (f.type === 'textarea') ctl = '<textarea id="' + id + '" rows="' + (f.rows || 3) + '"' + dis + '>' + esc(v || '') + '</textarea>';
  else if (f.type === 'select') ctl = '<select id="' + id + '"' + dis + '>' + (f.html ? f.html(v || '') : optsFrom(f.opts(), v || '', f.blank)) + '</select>';
  else if (f.type === 'month') ctl = '<input id="' + id + '" type="month" value="' + esc(v || '') + '" placeholder="AAAA-MM"' + dis + '>';
  else ctl = '<input id="' + id + '" type="' + (f.type || 'text') + '" value="' + esc(v || '') + '"' + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.list ? ' list="dl-' + f.k + '" autocomplete="off"' : '') + dis + '>' + (f.list ? '<datalist id="dl-' + f.k + '"></datalist>' : '');
  return '<div class="field ' + (f.full ? 'full' : '') + '"><label for="' + id + '">' + esc(f.label) + (f.req ? ' <b>*</b>' : '') + '</label>' + ctl + hint + '<span class="err" id="e-' + f.k + '" hidden></span></div>';
}

function openForm(kind, id, preset) {
  const def = FORMS[kind];
  const rec = id ? S[def.arr].find(x => x._id === id) : null;
  if (id && !rec) { toast('Ese registro ya no existe'); return; }
  const ro = !def.can(rec);
  S.form = { kind, id: id || null, ro };
  const vals = rec ? Object.assign({}, rec) : Object.assign(def.defaults(), preset || {});
  if (kind === 'abono') { S.form.roles = Object.assign({}, vals.roles || {}); S.form.rolesPrev = rec ? Object.assign({}, rec.roles || {}) : {}; }
  if (kind === 'cliente' && rec && !rec.estadoManual) vals.estado = '__auto';
  if (kind === 'cliente') vals.redes = Object.assign({}, vals.redes || {}, { web: vals.web || '' });
  let foot;
  if (ro) foot = '<span class="muted">Solo lectura.</span><button type="button" class="btn" data-act="close">Cerrar</button>';
  else foot = '<span id="delzone">' + (rec && (isStaff() && (kind !== 'persona' || isAdmin())) ? '<button type="button" class="btn ghost danger" data-act="del">Eliminar</button>' : '') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary" id="savebtn">' + (rec ? 'Guardar cambios' : 'Crear ' + def.title) + '</button></span>';
  let adminBtn = '';
  if (isAdmin() && rec && kind === 'proyecto') adminBtn = '<div class="toolbar" style="grid-column:1/-1"><button type="button" class="btn sm" data-act="aProyAdm" data-id="' + esc(rec._id) + '">Precio y cobro</button></div>';
  if (isAdmin() && rec && kind === 'abono') adminBtn = '<div class="toolbar" style="grid-column:1/-1"><button type="button" class="btn sm" data-act="aPrecio" data-abono="' + esc(rec._id) + '">Precio (administración)</button>' + (rec.tipo === 'Ads' ? '<button type="button" class="btn sm" data-act="aAds" data-abono="' + esc(rec._id) + '">Pauta de Ads (administración)</button>' : '') + '</div>';
  let servBox = '';
  if (kind === 'cliente' && !ro) {
    const tAb = S.L.tiposAbono || ['Redes', 'Ads'], tPr = (S.L.tipos || []).filter(t => !tAb.includes(t));
    servBox = rec
      ? '<div class="field full"><span class="lbl">Servicios</span><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">' + (servPills(rec.nombre).replace('<span class="srvs"></span>', '<span class="muted">Todavía ninguno</span>')) + '</div><div class="toolbar" style="margin-top:8px"><button type="button" class="btn sm" data-act="new" data-kind="abono" data-preset="' + esc(JSON.stringify({ cliente: rec.nombre })) + '">+ Servicio mensual</button><button type="button" class="btn sm" data-act="new" data-kind="proyecto" data-preset="' + esc(JSON.stringify({ cliente: rec.nombre })) + '">+ Proyecto (branding, web…)</button></div><span class="hint">Mensual: Redes, Ads o lo que se cobre todos los meses con precio fijo. Proyecto: un trabajo puntual con su presupuesto (por ejemplo, un audiovisual de vez en cuando).</span></div>'
      : '<div class="field full srvpick"><span class="lbl">¿Qué le vamos a hacer?</span><div class="multi">' +
        tAb.map(t => '<label><input type="checkbox" data-srvab="' + esc(t) + '"> ' + esc(t) + ' <small class="muted">· mensual</small></label>').join('') +
        tPr.map(t => '<label class="srv-pr"><input type="checkbox" data-srvpr="' + esc(t) + '"> ' + esc(t) + '<select class="in sm" data-srvmodo="' + esc(t) + '" aria-label="Cómo se cobra ' + esc(t) + '" hidden><option value="puntual">puntual (un proyecto)</option><option value="mensual">mes a mes (precio fijo)</option></select></label>').join('') + '</div>' +
        '<div id="srvplan" hidden style="margin-top:10px;max-width:260px"><label class="lbl" for="f-srvplan">Plan de redes</label><select id="f-srvplan">' + optsFrom(S.L.planes, '', '—') + '</select></div>' +
        '<span class="hint">Lo mensual (Redes, Ads o lo que elijas “mes a mes”) se cobra todos los meses con su precio. Lo puntual se crea como proyecto “Por empezar” y se cobra por presupuesto cada vez.</span></div>';
  }
  const notaTel = kind === 'cliente' && rec && conTabla() ? '<p class="formnote full">El WhatsApp, el fijo y el mail de cada persona se cargan en la pestaña <b>Contactos</b> de la ficha.</p>' : '';
  const extra = notaTel + servBox + adminBtn + (rec && rec.creado ? '<p class="formnote">Cargado el ' + fmt(rec.creado.slice(0, 10)) + (rec.actualizado ? ' · última edición ' + fmt(rec.actualizado.slice(0, 10)) : '') + '</p>' : '');
  const p = $('#panel');
  p.innerHTML = '<form id="form" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + (rec ? (ro ? 'Ver ' : 'Editar ') + def.title : 'Alta') + '</span><h2 id="panel-title">' + (rec ? esc(def.label(rec) || def.title) : def.nuevo) + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
    '<div class="panel-b">' + (IA && kind === 'comunicacion' && !rec ? IA.charlaHtml() : '') + def.fields.filter(f => !f.adv && !(f.alta && rec && conTabla())).map(f => fieldHtml(f, vals[f.k], ro)).join('') +
      (def.fields.some(f => f.adv) ? '<details class="mas full" id="f-mas"' + (rec ? ' open' : '') + '><summary>' + esc(def.masLabel || 'Más opciones') + '</summary><div class="mas-b">' + def.fields.filter(f => f.adv).map(f => fieldHtml(f, vals[f.k], ro)).join('') + '</div></details>' : '') + extra + '</div><div class="panel-f">' + foot + '</div></form>';
  p.hidden = false; $('#scrim').hidden = false;
  if (kind === 'comunicacion') fillConQuien();
  if (kind === 'proyecto') { S.form.etapas = JSON.parse(JSON.stringify(vals.etapas || [])); if (!S.form.etapas.length && plantilla(vals.tipo).length && !rec) S.form.etapas = plantillaTk(vals.tipo, vals.fechaInicio); renderEtapasField(); }
  if (!rec) { const first = p.querySelector('.panel-b input:not([type=checkbox]):not([disabled]),.panel-b select:not([disabled]),.panel-b textarea:not([disabled])'); if (first) first.focus(); }
}
function closeForm() { $('#panel').hidden = true; $('#scrim').hidden = true; S.form = null; S.tkf = null; S.kf = null; if (RED) RED.closePieza(); }

async function saveForm() {
  if (!S.form || S.form.ro) return;
  const { kind, id } = S.form, def = FORMS[kind];
  const out = {}; let bad = false;
  const showErr = (k, msg) => { const e = $('#e-' + k); if (e) { e.textContent = msg; e.hidden = false; } bad = true; };
  for (const f of def.fields) {
    if (f.staffOnly && !isStaff()) continue;
    const el = $('#f-' + f.k);
    if (f.type === 'etapas') { out[f.k] = S.form.etapas || []; continue; }
    if (!el) continue;
    if (f.type === 'multi' || f.type === 'chips') out[f.k] = [...el.querySelectorAll('input:checked')].map(i => i.value);
    else if (f.type === 'equipo') { const ss = [...el.querySelectorAll('select[data-eqa]')].filter(x => x.value); out[f.k] = ss.map(x => x.dataset.eqa); out.roles = Object.fromEntries(ss.map(x => [x.dataset.eqa, x.value === '__' ? '' : x.value])); out.rolesPrev = (S.form && S.form.rolesPrev) || {}; }
    else if (f.type === 'redes') { const o = {}; el.querySelectorAll('input[data-red]').forEach(i => { if (i.value.trim()) o[i.dataset.red] = i.value.trim(); }); out.web = o.web || ''; delete o.web; out[f.k] = o; }
    else out[f.k] = f.type === 'check' ? el.checked : el.value.trim();
    const e = $('#e-' + f.k); if (e) e.hidden = true;
    if (f.req && !out[f.k]) showErr(f.k, 'Completá este campo');
  }
  if (kind === 'comunicacion' && !isStaff()) out.responsable = S.me.alias;
  if (kind === 'cliente' && S.C.some(c => norm(c.nombre) === norm(out.nombre) && c._id !== id)) showErr('nombre', 'Ya existe un cliente con ese nombre');
  if (kind === 'persona' && S.E.some(x => norm(x.persona) === norm(out.persona) && x._id !== id)) showErr('persona', 'Ya hay alguien con ese nombre');
  if (kind === 'persona' && out.email && S.E.some(x => norm(x.email) === norm(out.email) && x._id !== id)) showErr('email', 'Ese email ya lo usa otra persona');
  if (kind === 'persona' && id && S.me && id === S.me.id && out.rol !== 'admin') showErr('rol', 'No podés quitarte el rol de administrador a vos mismo');
  if (kind === 'cliente' && out.desde && (!/^\d{4}-\d{2}$/.test(out.desde) || out.desde > thisMonth())) showErr('desde', out.desde > thisMonth() ? 'Elegí este mes o uno anterior' : 'Elegí mes y año');
  if (kind === 'abono') {
    if (out.desde && !/^\d{4}-\d{2}$/.test(out.desde)) showErr('desde', 'Usá el formato AAAA-MM');
    if (out.hasta && !/^\d{4}-\d{2}$/.test(out.hasta)) showErr('hasta', 'Usá el formato AAAA-MM');
    if (out.estado === 'Baja' && !out.hasta) out.hasta = thisMonth();
    const otros = S.A.filter(a => a.cliente === out.cliente && a._id !== id && vivo(a));
    if (out.tipo === 'Ads' && out.estado !== 'Baja' && !otros.some(a => a.tipo === 'Redes')) showErr('tipo', 'Ads va siempre con Redes: ' + (out.cliente || 'este cliente') + ' no tiene Redes. Cargá primero Redes.');
  }
  if (bad) return;
  if (kind === 'proyecto' && out.estado === 'Entregado' && !out.entregaReal) out.entregaReal = today();
  if (kind === 'proyecto' && out.etapas && !out.etapas.length && !id && plantilla(out.tipo).length) out.etapas = plantillaTk(out.tipo, out.fechaInicio);
  if (kind === 'cliente') { if (out.estado === '__auto') { out.estadoManual = false; delete out.estado; } else out.estadoManual = out.estado !== estadoAuto(out.nombre); }
  const prev = id ? S[def.arr].find(x => x._id === id) : null;
  const btn = $('#savebtn'); if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  try {
    const srvAb = kind === 'cliente' && !prev ? [...document.querySelectorAll('[data-srvab]:checked')].map(x => x.dataset.srvab) : [];
    const srvChk = kind === 'cliente' && !prev ? [...document.querySelectorAll('[data-srvpr]:checked')].map(x => x.dataset.srvpr) : [];
    const modoDe = t => ((document.querySelector('[data-srvmodo="' + t + '"]') || {}).value || 'puntual');
    const srvPr = srvChk.filter(t => modoDe(t) !== 'mensual');
    srvAb.push(...srvChk.filter(t => modoDe(t) === 'mensual'));
    const plan = ($('#f-srvplan') || {}).value || '';
    let tks = null;
    if (kind === 'proyecto' && S.T && Array.isArray(out.etapas)) { tks = out.etapas; delete out.etapas; }
    const nid = await data.save(kind, id, out, prev ? resp(prev) : []);
    if (kind === 'abono' && out.tipo === 'Redes' && out.estado === 'Baja') await bajaAds(out.cliente, out.hasta);
    if (tks) await data.tareasSync(nid, prev ? etapasDe(prev) : [], tks);
    if (kind === 'cliente' && !prev && conTabla() && (out.contacto || out.email || out.tel || out.telFijo)) {
      const k0 = { cliente_id: nid, nombre: out.contacto || '', email: (out.email || '').toLowerCase(), tel: out.tel || '', principal: true, cobros: true, orden: 0 };
      try { if (out.telFijo && !(data.cols && data.cols.contactoFijo === false)) { try { await data.ins('contactos', { ...k0, tel_fijo: out.telFijo }); } catch (e) { await data.ins('contactos', k0); } } else await data.ins('contactos', k0); } catch (e) { toast(e.message); }
    }
    if (srvAb.length || srvPr.length) {
      await reload();
      for (const t of srvAb) await data.save('abono', null, { cliente: out.nombre, tipo: t, plan: t === 'Redes' ? plan : '', desde: out.desde || thisMonth(), estado: 'Activo', responsables: out.responsables || [] }, []);
      for (const t of srvPr) {
        const tk = plantillaTk(t, today());
        const pid = await data.save('proyecto', null, { cliente: out.nombre, proyecto: t + ' · ' + out.nombre, tipo: t, estado: 'Por empezar', fechaInicio: today(), responsables: out.responsables || [], ...(S.T ? {} : { etapas: tk }) }, []);
        if (S.T && tk.length) await data.tareasSync(pid, [], tk);
      }
    }
    closeForm(); toast(prev ? 'Cambios guardados' : 'Creado' + (srvAb.length + srvPr.length ? ' con ' + (srvAb.length + srvPr.length) + ' servicios' : '')); await reload();
  } catch (err) { toast(err.message); if (btn) { btn.disabled = false; btn.textContent = 'Guardar'; } }
}
async function delRecord() {
  if (!S.form || !S.form.id) return;
  try { await data.remove(S.form.kind, S.form.id); if (S.form.kind === 'cliente') S.ficha = null; closeForm(); toast('Eliminado'); await reload(); }
  catch (err) { toast(err.message); }
}
// Si Redes se da de baja, Ads se va con Redes.
async function bajaAds(cliente, hasta) {
  const ads = S.A.filter(a => a.cliente === cliente && a.tipo === 'Ads' && vivo(a)); if (!ads.length) return;
  for (const a of ads) await data.update('abono', a._id, { estado: 'Baja', hasta: a.hasta || hasta || thisMonth() });
  toast('También se dio de baja Ads de ' + cliente + ' (va con Redes)');
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
function go(view) { menu(false); view = resolver(view); S.view = view; S.ficha = null; S.pficha = null; S.rmFicha = null; if (ADM) ADM.resetView(); try { history.replaceState(null, '', '#' + view); } catch (e) { } render(); window.scrollTo(0, 0); }
async function saveListas(k, arr) {
  const prev = S.L[k]; S.L[k] = arr; render();
  try { await data.saveLista(k, arr); toast('Lista actualizada'); }
  catch (err) { S.L[k] = prev; render(); toast(err.message); }
}
function copyText(v) { try { navigator.clipboard.writeText(v).then(() => toast('Copiado'), () => toast(v)); } catch (e) { toast(v); } }
let ATAJ = null;
const atajos = () => ATAJ || (ATAJ = initAtajos({ go, views, isStaff }));
const ACT = {
  atajos: () => atajos().ayuda(),
  soloMio: t => { const yo = S.me.alias; if (t.dataset.p === 'proyectos') S.f.resp = S.f.resp === yo ? '' : yo; else if (t.dataset.p === 'redes') { S.rf = S.rf || { q: '', resp: '', estado: '', pend: false }; S.rf.resp = S.rf.resp === yo ? '' : yo; } render(); },
  secTog: t => { const k = t.dataset.s; S.navSec = S.navSec === k ? null : k; render(); },
  sec: t => { const sec = SECCIONES.find(x => x[0] === t.dataset.s); if (!sec) return; const vs = new Set(views().map(v => v[0])); const last = S.secLast && S.secLast[sec[0]];
    go(last && vs.has(last) && last !== S.view ? last : (sec[3].find(k => vs.has(k) && k !== 'mis') || sec[3].find(k => vs.has(k)))); },
  go: t => { if (t.dataset.pend) S.mf.pend = true; if (t.dataset.tab) S.tab[t.dataset.view] = t.dataset.tab; go(t.dataset.view); },
  gqTarea: t => { ACT.pver(t); setTimeout(() => abrirTarea(t.dataset.id, +t.dataset.i), 0); },
  gqPiggy: () => { const q = $('#gq').value; $('#gq').value = ''; $('#gqres').hidden = true; if (IA) { IA.abrir(q); } },
  ptab: t => { S.ptab = t.dataset.t; render(); },
  tkGrp: t => { const g = t.dataset.g, k = t.dataset.hecha ? g + ':open' : g; if (S.gcl.has(k)) S.gcl.delete(k); else S.gcl.add(k); lsSet('gcl', JSON.stringify([...S.gcl])); render(); },
  tkAbrir: t => abrirTarea(t.dataset.id, +t.dataset.i),
  tkVista: t => { S.tkVista = t.dataset.v; lsSet('tkVista', S.tkVista); render(); },
  redQuitar: t => { const f = t.closest('.red-f'), k = f.dataset.redk, sa = f.closest('.field').querySelector('select.red-add'); f.remove(); const r = REDES.find(x => x[0] === k); if (sa && r) sa.insertAdjacentHTML('beforeend', '<option value="' + k + '">' + esc(r[1]) + '</option>'); },
  hrNo: () => { $('#horasbar').hidden = true; },
  hrSet: t => {
    const b = $('#horasbar'); b.hidden = true;
    const p = S.P.find(x => x._id === b.dataset.pid); if (!p) return;
    const i = etapasDe(p).findIndex(x => (b.dataset.id && x._id === b.dataset.id) || (!b.dataset.id && x.n === b.dataset.n)); if (i < 0) return;
    guardarTareas(p, etapasDe(p).map((x, j) => j === i ? { ...x, horas: +t.dataset.h } : x), 'Anotadas ' + (t.dataset.h === '8' ? '8 h' : t.dataset.h.replace('.5', ',5') + ' h'));
  },
  kNuevo: t => abrirContacto(t.dataset.cliente, null),
  kEdit: t => abrirContacto(t.dataset.cliente, t.dataset.id),
  kDel: () => { $('#kdelzone').innerHTML = '<span class="muted" style="font-size:13px">¿Seguro?</span> <button type="button" class="btn danger sm" data-act="kDelYes">Sí, eliminar</button> <button type="button" class="btn ghost sm" data-act="kDelNo">No</button>'; },
  kDelNo: () => { $('#kdelzone').innerHTML = '<button type="button" class="btn ghost danger" data-act="kDel">Eliminar</button>'; },
  kDelYes: () => borrarContacto(),
  tkNueva: t => abrirTarea(t.dataset.id, -1),
  tkGuardar: () => guardarTareaPanel(),
  tkBorrar: () => { const f = S.tkf; if (!f) return; const p = S.P.find(x => x._id === f.pid); if (!p) return; closeForm(); guardarTareas(p, etapasDe(p).filter((x, i) => i !== f.i), 'Tarea borrada'); },
  grpTog: t => { const g = t.dataset.g; if (S.gcl.has(g)) S.gcl.delete(g); else S.gcl.add(g); lsSet('gcl', JSON.stringify([...S.gcl])); render(); },
  kbMover: t => { const kb = document.querySelector('.kb'); if (kb) kb.scrollBy({ left: +t.dataset.d * Math.max(260, kb.clientWidth * .8), behavior: 'smooth' }); },
  tab: t => { S.tab[t.dataset.hub] = t.dataset.t; if (ADM) ADM.resetView(); render(); window.scrollTo(0, 0); },
  verDe: t => { S.yo = t.dataset.p; lsSet('yo', S.yo); go('mis'); },
  goProy: t => { S.f = { q: '', estado: t.dataset.estado || '', tipo: t.dataset.tipo || '', resp: t.dataset.resp || '', cliente: '', plazo: t.dataset.plazo || '', abiertos: !(t.dataset.estado && CERRADOS.has(t.dataset.estado)) }; S.mode = 'lista'; go('proyectos'); },
  calendar: () => { S.mode = 'calendario'; lsSet('mode', 'calendario'); go('proyectos'); },
  mode: t => { S.mode = t.dataset.mode; lsSet('mode', S.mode); render(); },
  clearF: () => { S.f = { q: '', estado: '', tipo: '', resp: '', cliente: '', plazo: '', abiertos: true }; render(); },
  cfEstado: t => { S.cf.estado = t.dataset.estado; render(); },
  afTipo: t => { S.af.tipo = t.dataset.tipo; render(); },
  cAuto: async t => { const c = S.C.find(x => x._id === t.dataset.id); if (!c) return; try { await data.update('cliente', c._id, { estadoManual: false }); toast(c.nombre + ' vuelve al estado automático'); } catch (err) { toast(err.message); } await reload(); },
  // Abrir el trabajo de una cuenta de Redes: el mes actual; si todavía no se arrancó, Redes filtrado por el cliente (ahí se arranca).
  rmCuenta: t => {
    const c = t.dataset.c, m = (S.RM || []).find(x => x.cliente === c && x.mes === thisMonth());
    S.ficha = null; S.pficha = null; S.view = 'redes';
    if (m) { S.rmFicha = m._id; try { history.replaceState(null, '', '#redes/' + m._id); } catch (e) { } render(); window.scrollTo(0, 0); return; }
    S.rmFicha = null; S.rf = Object.assign(S.rf || { resp: '', estado: '', pend: false }, { q: c }); if (S.tab) S.tab.redes = 'mes';
    go('redes'); toast('Todavía no se arrancó ' + monthLabel(thisMonth()).split(' ')[0] + ' para ' + c + ': arrancalo desde acá');
  },
  equipoFijoAplicar: async t => {
    const fijo = equipoFijo(); if (!fijo.length) return; t.disabled = true; let n = 0;
    try {
      for (const a of S.A.filter(x => vivo(x) && x.tipo === 'Redes')) {
        const antes = resp(a), next = [...new Set([...antes, ...fijo.map(x => x.a)])], roles = {};
        fijo.forEach(x => { if (!rolDe(a, x.a)) roles[x.a] = x.rol; });
        if (next.length === antes.length && !Object.keys(roles).length) continue;
        if (next.length !== antes.length) await data.update('abono', a._id, { responsables: next }, antes);
        if (Object.keys(roles).length) await data.syncRoles(a._id, roles, a.roles || {});
        n++;
      }
      toast(n ? 'Listo: ' + n + (n === 1 ? ' cuenta actualizada' : ' cuentas actualizadas') : 'Ya estaban en todas');
    } catch (err) { toast(err.message); }
    await reload();
  },
  sumarAds: t => { const r = servicioRedes(t.dataset.c).redes; openForm('abono', null, { cliente: t.dataset.c, tipo: 'Ads', plan: '', responsables: r ? resp(r).slice() : [], roles: r ? Object.assign({}, r.roles || {}) : {}, desde: thisMonth() }); },
  ctab: t => { S.ctab = t.dataset.t; render(); },
  mlF: t => { S.mlF = t.dataset.f; S.mlAbierto = null; render(); },
  mlVer: t => { S.mlAbierto = S.mlAbierto === t.dataset.id ? null : t.dataset.id; render(); },
  mlResp: t => { const { m, cl } = mailBuscar(t.dataset.id); if (!m) return; openForm('comunicacion', null, { cliente: cl, canal: 'Email', fecha: today(), conQuien: (m.para || []).join(', '), resumen: 'Respondió al mail “' + m.asunto + '”: ' }); },
  mlArch: async t => {
    const { m, cl } = mailBuscar(t.dataset.id); if (!m) return;
    try { await data.upd('emails', m.id, { archivado: !m.archivado }); m.archivado = !m.archivado; S.mlAbierto = null; toast(m.archivado ? 'Mail archivado' : 'Volvió a la lista'); render(); }
    catch (e) { toast(/archivado|column/i.test(e.message) ? 'Falta correr el SQL 0025 en Supabase para poder archivar.' : e.message); }
  },
  mlDel: async t => {
    const { m, cl } = mailBuscar(t.dataset.id); if (!m) return;
    if (!(await confirmar('Se borra de la app: de esta lista, del seguimiento y la charla que se anotó sola. El mail ya le llegó al cliente y eso no se puede deshacer.', { titulo: '¿Borrar “' + m.asunto + '” del historial?', ok: 'Borrar', tipo: 'peligro' }))) return;
    try { await data.del('emails', m.id); const x = S.MLS.get(cl); if (x && x.r) x.r = x.r.filter(y => y.id !== m.id); if (S.SEG) S.SEG.delete(cl); S.mlAbierto = null; toast('Mail borrado del historial'); await reload(); }
    catch (e) { toast(e.message); }
  },
  ficha: t => { S.ctab = t.dataset.tab || (S.ficha !== t.dataset.cliente ? 'resumen' : S.ctab); S.ficha = t.dataset.cliente; S.pficha = null; S.view = 'clientes'; try { history.replaceState(null, '', '#clientes/' + encodeURIComponent(S.ficha)); } catch (e) { } render(); window.scrollTo(0, 0); },
  back: () => { S.ficha = null; try { history.replaceState(null, '', '#clientes'); } catch (e) { } render(); },
  pver: t => { const id = t.dataset.id; if (S.pficha !== id) S.ptab = 'tareas'; S.pficha = id; S.ficha = null; S.view = 'proyectos'; closeForm(); try { history.replaceState(null, '', '#proyectos/' + id); } catch (e) { } render(); window.scrollTo(0, 0); },
  pback: () => { S.pficha = null; try { history.replaceState(null, '', '#proyectos'); } catch (e) { } render(); },
  kInvitar: t => {
    const txt = invitacionPortal(), tel = (($('#k-tel') || {}).value || ''), mail = (($('#k-email') || {}).value || '').trim();
    if (t.dataset.m === 'copiar') { copyText(txt); return; }
    if (t.dataset.m === 'wa') { const n = waNum(tel); window.open('https://wa.me/' + (n || '') + '?text=' + encodeURIComponent(txt), '_blank', 'noopener'); return; }
    if (!mail) { toast('Cargá el email del contacto'); return; }
    location.href = 'mailto:' + encodeURIComponent(mail) + '?subject=' + encodeURIComponent('Tu acceso al portal de àndale') + '&body=' + encodeURIComponent(txt);
  },
  ...uiActs,
  uiVista: t => { guardarVista(t.dataset.p, t.dataset.v); if (t.dataset.p === 'proyectos') { S.mode = t.dataset.v; lsSet('mode', S.mode); } render(); },
  print: () => window.print(),
  exportar: () => exportarVista(),
  ...EXP.actions,
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
  cfgIr: (t, e) => { if (e && e.preventDefault) e.preventDefault(); const el = document.getElementById(t.dataset.to); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
  listDel: t => { const k = t.dataset.k, i = +t.dataset.i; saveListas(k, S.L[k].filter((_, j) => j !== i)); },
  menu: () => menu(),
  logout: async () => { await data.logout(); location.reload(); },
  cSelNone: () => { S.csel.clear(); render(); },
  etCargar: t => { const p = S.P.find(x => x._id === t.dataset.id); if (!p) return; const ya = new Set(etapasDe(p).map(x => norm(x.n))); const nuevas = plantillaTk(p.tipo, today()).filter(x => !ya.has(norm(x.n))); if (!nuevas.length) { toast('Ya están todas las tareas modelo de ' + p.tipo); return; } guardarTareas(p, [...etapasDe(p), ...nuevas], nuevas.length + ' tareas sumadas'); },
  tkDel: t => { const p = S.P.find(x => x._id === t.dataset.id); if (!p) return; guardarTareas(p, etapasDe(p).filter((x, i) => i !== +t.dataset.i)); },
  tkIA: async t => {
    const p = S.P.find(x => x._id === t.dataset.id); if (!p) return;
    t.disabled = true; t.innerHTML = '<span class="ia-dots"><i></i><i></i><i></i></span> Mr. Piggy está armando las tareas…';
    try {
      const r = await data.ia({ modo: 'tareas', texto: JSON.stringify({ proyecto: p.proyecto, cliente: p.cliente, tipo: p.tipo, inicio: p.fechaInicio || today(), entrega: p.entrega || '', entregables: p.entregables || '', notas: p.notas || '', responsables: resp(p), tareas_existentes: etapasDe(p).map(x => x.n + (x.etapa ? ' [' + x.etapa + ']' : '')) }), contexto: { equipo: S.E.filter(e => e.activo !== false).map(e => ({ alias: e.persona, puesto: e.puesto })), tareas_modelo: plantilla(p.tipo), etapas_flujo: S.T ? etapasProyecto(p) : [] } });
      const ets = S.T ? etapasProyecto(p) : [];
      const nuevas = (Array.isArray(r.tareas) ? r.tareas : []).filter(x => x && x.titulo).map(x => ({ n: String(x.titulo).slice(0, 140), ok: false, resp: personas().includes(x.responsable) ? x.responsable : '', fecha: /^\d{4}-\d{2}-\d{2}$/.test(x.fecha || '') ? x.fecha : '', etapa: ets.includes(x.etapa) ? x.etapa : '' }));
      if (!nuevas.length) { toast('Mr. Piggy no encontró tareas para sumar'); render(); return; }
      // Con etapas, cada tarea nueva se ubica al final de su etapa.
      let lista = [...etapasDe(p)];
      nuevas.forEach(x => { let pos = lista.length; if (x.etapa) { const ult = lista.map(y => y.etapa).lastIndexOf(x.etapa); if (ult >= 0) pos = ult + 1; else { const orden = ets.indexOf(x.etapa); const sig = lista.findIndex(y => ets.indexOf(y.etapa) > orden); if (sig >= 0) pos = sig; } } lista = [...lista.slice(0, pos), x, ...lista.slice(pos)]; });
      await guardarTareas(p, lista, 'Mr. Piggy sumó ' + nuevas.length + ' tareas. Revisalas y borrá las que no sirvan.');
    } catch (err) { toast(err.message); render(); }
  },
  fetDel: t => { S.form.etapas.splice(+t.dataset.i, 1); renderEtapasField(); },
  fetAdd: () => { const i = $('#f-etapa-nueva'); const v = i && i.value.trim(); if (!v) return; S.form.etapas.push({ n: v, ok: false }); renderEtapasField(); const n = $('#f-etapa-nueva'); if (n) n.focus(); },
  fetTpl: () => { const tipo = ($('#f-tipo') || {}).value; S.form.etapas = plantillaTk(tipo, ($('#f-fechaInicio') || {}).value); renderEtapasField(); },
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
  if (t.dataset.rrol) { // rol de una persona en una cuenta (tabla de Redes)
    const rec = S.A.find(x => x._id === t.dataset.rrol), a = t.dataset.a; if (!rec) return;
    const v = t.value, antes = resp(rec), next = v ? [...new Set([...antes, a])] : antes.filter(x => x !== a);
    try { await data.update('abono', rec._id, { responsables: next }, antes); if (v) await data.syncRoles(rec._id, { [a]: v === '__' ? '' : v }, rec.roles || {}); toast(v ? a + (v === '__' ? ' está en la cuenta' : ': ' + v) : a + ' ya no está en la cuenta'); }
    catch (err) { toast(err.message); }
    await reload(); return;
  }
  if (t.dataset.firmacfg) { const c = { ...firmaConfig(S), [t.dataset.firmacfg]: t.value }; saveListas('firmas', Object.entries(c).map(([k, v]) => k + '=' + v)); return; }
  if (t.dataset.eqfijo !== undefined) { // equipo fijo de Redes (Opciones)
    const a = t.dataset.eqfijo, otros = equipoFijo().filter(x => x.a !== a);
    saveListas('equipoFijo', [...otros, ...(t.value ? [{ a, rol: t.value }] : [])].map(x => x.a + '=' + x.rol)); return;
  }
  if (t.dataset.rtoggle) {
    const kind = t.dataset.rtoggle, arr = S[FORMS[kind].arr];
    const rec = arr.find(x => x._id === t.dataset.id); if (!rec) return;
    let next = resp(rec).filter(p => p !== t.value); if (t.checked) next.push(t.value);
    upd(kind, rec._id, { responsables: next }, resp(rec), true);
    return;
  }
  if (t.dataset.integ) return;
  if (t.dataset.plan) { const k = 'plan:' + t.dataset.plan, f = t.dataset.fmt, n = Math.max(0, Math.round(+t.value || 0)); saveListas(k, [...(S.L[k] || []).filter(x => !x.startsWith(f + '=')), ...(n ? [f + '=' + n] : [])]); return; }
  if (t.dataset.tk) {
    const p = S.P.find(x => x._id === t.dataset.pid); if (!p) return;
    const k = t.dataset.tk, v = t.value.trim(); if (k === 'n' && !v) { render(); return; }
    guardarTareas(p, etapasDe(p).map((x, i) => i === +t.dataset.i ? { ...x, [k]: v } : x));
    return;
  }
  if (t.dataset.etoggle) {
    const p = S.P.find(x => x._id === t.dataset.etoggle); if (!p) return;
    const ti = +t.dataset.i, next = etapasDe(p).map((x, i) => i === ti ? { ...x, ok: t.checked, est: t.checked ? '' : x.est } : x);
    S.openPick = 'etapa:' + p._id;
    if (S.T) guardarTareas(p, next);
    else { p.etapas = next; if (S.view === 'mis' || S.view === 'inicio' || S.pficha) render(); upd('proyecto', p._id, { etapas: next }, null, true); }
    if (next.length && next.every(x => x.ok) && isOpen(p)) toast('Todas las tareas listas. ¿Lo pasás a Entregado?');
    return;
  }
  if (t.dataset.fet !== undefined && S.form && S.form.etapas) { S.form.etapas[+t.dataset.fet].ok = t.checked; return; }
  if (t.id === 'f-tipo' && S.form && S.form.kind === 'proyecto' && S.form.etapas && !S.form.etapas.length && plantilla(t.value).length) { S.form.etapas = plantillaTk(t.value, ($('#f-fechaInicio') || {}).value); renderEtapasField(); return; }
  if (t.id === 'f-tipo' && S.form && S.form.kind === 'proyecto') { renderEtapasField(); return; }
  if (t.id === 'f-cliente' && S.form && S.form.kind === 'comunicacion') { fillConQuien(); return; }
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
    if (kind === 'abono' && field === 'estado') {
      const a = S.A.find(x => x._id === t.dataset.id);
      if (val === 'Baja' && a && !a.hasta) patch.hasta = thisMonth();
      if (a && a.tipo === 'Ads' && val !== 'Baja' && !S.A.some(x => x.cliente === a.cliente && x.tipo === 'Redes' && vivo(x))) { toast('Ads va siempre con Redes: ' + a.cliente + ' no tiene Redes activo.'); render(); return; }
      if (a && a.tipo === 'Redes' && val === 'Baja') { (async () => { await data.update('abono', a._id, patch); await bajaAds(a.cliente, patch.hasta || a.hasta); await reload(); })().catch(err => { toast(err.message); reload(); }); return; }
    }
    upd(kind, t.dataset.id, patch);
  }
});
document.addEventListener('click', e => { const i = e.target.closest && e.target.closest('.tk-date input'); if (i && i.showPicker) try { i.showPicker(); } catch (er) { } });
document.addEventListener('submit', async e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === 'form') { saveForm(); return; }
  if (f.id === 'tkform') { guardarTareaPanel(); return; }
  if (f.id === 'kform') { guardarContacto(); return; }
  if (f.dataset.tkadd) {
    const p = S.P.find(x => x._id === f.dataset.tkadd), n = f.elements.n.value.trim(); if (!p || !n) return;
    const et = f.elements.etapa ? f.elements.etapa.value : (p.etapaActual || '');
    const lista = etapasDe(p), nueva = { n, ok: false, resp: f.elements.resp.value, fecha: f.elements.fecha.value, etapa: et };
    // Con etapas, la tarea nueva va al final de su etapa.
    let pos = lista.length; if (et) { const ult = lista.map(x => x.etapa).lastIndexOf(et); if (ult >= 0) pos = ult + 1; }
    await guardarTareas(p, [...lista.slice(0, pos), nueva, ...lista.slice(pos)]);
    const i = document.querySelector('[data-tkadd="' + p._id + '"] [name="n"]'); if (i) i.focus();
    return;
  }
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
window.addEventListener('hashchange', () => { const prev = [S.view, S.ficha, S.pficha, S.rmFicha].join('|'); leerHash(); if (!viewFn(S.view)) S.view = 'inicio'; if ([S.view, S.ficha, S.pficha, S.rmFicha].join('|') !== prev) { render(); window.scrollTo(0, 0); } aplicarQuery(); });
// Links de los avisos: #proyectos/<id>?t=<tarea>, #tickets?k=<ticket>, #redes/<mes>?p=<pieza>
function abrirLink(link) { if (!link) return; if (location.hash === link) { leerHash(); render(); aplicarQuery(); } else location.hash = link; }
function aplicarQuery() {
  const q = S.hq; if (!q || S.status !== 'ok') return;
  if (q.t && S.pficha) { const p = S.P.find(x => x._id === S.pficha); const i = p ? etapasDe(p).findIndex(x => x._id === q.t) : -1; if (i >= 0) { S.hq = null; setTimeout(() => abrirTarea(p._id, i), 0); } }
  if (q.k && S.view === 'tickets') { S.hq = null; setTimeout(() => tk().abrir(q.k), 0); }
  if (q.b && S.view === 'briefs') { S.hq = null; setTimeout(() => tk().abrirBrief(q.b), 0); }
  if (q.p && S.rmFicha && RED) { const ps = RED.piezas(S.rmFicha); if (ps && ps.some(z => z._id === q.p)) { S.hq = null; setTimeout(() => RED.abrirPieza(q.p), 0); } else if (!ps) RED.cargar([S.rmFicha]).then(() => aplicarQuery()); }
  if (window.__queryExtra) window.__queryExtra(q);
}
// Errores de la app: se guardan para revisarlos (máximo unos pocos por sesión).
const errVistos = new Set();
function registrarError(msg, det) {
  if (!S.me || !S.T || errVistos.size > 8 || esVersionVieja(msg)) return;
  const k = String(msg).slice(0, 200); if (errVistos.has(k)) return; errVistos.add(k);
  data.logError({ mensaje: msg, detalle: det || '', url: location.hash, version: (document.querySelector('meta[name="version"]') || {}).content || '' });
}
window.addEventListener('error', e => registrarError(e.message || 'Error', e.error && e.error.stack));
window.addEventListener('unhandledrejection', e => registrarError((e.reason && e.reason.message) || String(e.reason), e.reason && e.reason.stack));

/* Arrastrar en el tablero */
let dragId = null;
document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('[data-drag]'); if (!c) return; dragId = c.dataset.drag; try { e.dataTransfer.setData('text/plain', dragId); e.dataTransfer.effectAllowed = 'move'; } catch (_) { } c.classList.add('dragging'); });
document.addEventListener('dragend', e => { const c = e.target.closest && e.target.closest('[data-drag]'); if (c) c.classList.remove('dragging'); document.querySelectorAll('.col.over').forEach(x => x.classList.remove('over')); });
document.addEventListener('dragover', e => { const col = e.target.closest && e.target.closest('[data-drop]'); if (!col || !dragId) return; e.preventDefault(); document.querySelectorAll('.col.over').forEach(x => { if (x !== col) x.classList.remove('over'); }); col.classList.add('over'); });
document.addEventListener('drop', e => {
  const col = e.target.closest && e.target.closest('[data-drop]'); if (!col || !dragId) return;
  e.preventDefault(); col.classList.remove('over');
  if (dragId.startsWith('t:')) {
    const [, pid, si] = dragId.split(':'), k = (col.dataset.drop || '').slice(2); dragId = null;
    const p = S.P.find(x => x._id === pid); if (!p || !col.dataset.drop.startsWith('t:')) return;
    const i = +si, x = etapasDe(p)[i]; if (!x || estTk(x) === k) return;
    guardarTareas(p, etapasDe(p).map((y, j) => j === i ? conEst(y, k) : y));
    return;
  }
  if (col.dataset.drop.startsWith('t:')) { dragId = null; return; }
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
    for (const [k, v] of Object.entries(d.L || {})) if ((k.startsWith('etapas:') || k.startsWith('plan:')) && Array.isArray(v)) L[k] = [...v];
    L.integraciones = Array.isArray(d.L.integraciones) ? [...d.L.integraciones] : [...INTEG_DEF];
    L.integraciones_cfg = Array.isArray(d.L.integraciones_cfg) ? [...d.L.integraciones_cfg] : [];
    L.equipoFijo = Array.isArray(d.L.equipoFijo) ? [...d.L.equipoFijo] : [];
    L.firmas = Array.isArray(d.L.firmas) ? [...d.L.firmas] : [];
    Object.assign(S, { P: d.P, C: d.C, E: d.E, M: d.M, A: d.A, K: Array.isArray(d.K) ? d.K : null, L, status: 'ok', T: !!d.T, FL: d.FL || null, sinHilos: !d.T });
    if (Array.isArray(d.N)) S.N = d.N;
    Object.assign(S, { RM: d.RM === undefined ? null : d.RM, PD: d.PD === undefined ? null : d.PD, BF: d.BF === undefined ? null : d.BF, EN: d.EN === undefined ? null : d.EN, SI: d.SI === undefined ? null : d.SI });
    if (isAdmin() && ADM) await ADM.load();
    banner('');
  } catch (err) { S.status = 'offline'; banner(esc(err.message), true); }
  render();
  if (HIL) HIL.campana();
  aplicarQuery();
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
    ADM = initAdmin({ extrasACobrar: (c, m) => red().extrasACobrar(c, m), waHref, WA_ICO, icoMail: ICON.mail, icoTel: ICON.telefono, autoBtn: p => aut().boton(p), autoVista: () => aut().vista(), S, av, avEditable, contactos: n => contactosDe(n), conTabla, subnav, esc, opt, optsFrom, pill, stVar, fmt, monthLabel, thisMonth, addMonth, today, diff, cmp, norm, emptyBox, clienteOpts, toast, $, render, reload, closeForm, copyText });
    ADM_FN = Object.fromEntries(ADM.views.map(([k, , fn]) => [k, fn]));
    Object.assign(ACT, ADM.actions);
  }
  if (isStaff() && !IA) {
    MAIL = initMails({ S, contactos: n => contactosDe(n), data, esc, opt, toast, $, closeForm, reload, ISO, marca: () => (ADM && ADM.cfgMarca ? ADM.cfgMarca() : null), servicios: n => serviciosDe(n).map(x => x.tipo).join(', ') });
    Object.assign(ACT, MAIL.acts);
    Object.assign(ACT, integr().acts);
    IA = initIA({ S, redesResumen: n => red().resumenCliente(n), contactos: n => contactosDe(n), esc, toast, $, openForm, go, render, isAdmin, isStaff, today, getADM: () => ADM, openMail: o => MAIL.open(o) });
    Object.assign(ACT, IA.actions);
  }
  if (!ACT.flEditar) { Object.assign(ACT, trab().acts); Object.assign(ACT, hil().acts); Object.assign(ACT, red().acts); Object.assign(ACT, tk().acts); Object.assign(ACT, ent().acts); Object.assign(ACT, inf().acts); Object.assign(ACT, rlj().acts); Object.assign(ACT, fm().acts); Object.assign(ACT, prf().acts); Object.assign(ACT, aut().acts); }
  rlj().iniciar();
  $('#askbtn').hidden = !IA; $('#askbtn .askbtn-i').innerHTML = ISO; document.querySelectorAll('.askmini').forEach(b => { b.hidden = !IA; b.innerHTML = ISO; });
  $('#top').hidden = false;
  $('#hoy').textContent = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
  if (isExt()) S.yo = me.alias; else if (!S.yo) S.yo = me.alias;
  render();
  await reload();
  data.live(reload, s => { if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') { S.status = 'offline'; render(); } }, (tabla, ev) => { if (tabla === 'piezas') { if (RED) RED.enVivo(ev); } else hil().enVivo(tabla, ev); });
  window.addEventListener('focus', reload);
}

(async () => {
  aplicarTema(temaGuardado());
  iconizar(document.body); EXP.observar();
  if (!data.configured) { $('#view').innerHTML = '<div class="login"><div class="login-card"><h2>Falta configurar la base de datos</h2><p>Definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</p></div></div>'; return; }
  data.onAuth((ev, s) => { if (ev === 'SIGNED_IN' && s) start(s); if (ev === 'SIGNED_OUT') { S.me = null; started = false; showLogin(); } });
  const s = await data.session();
  if (s) start(s); else showLogin();
})();

// Montos, teléfonos y CUIT se formatean solos al salir de cada campo.
activarFormato();
