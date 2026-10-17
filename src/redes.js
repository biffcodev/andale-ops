// Redes: un "mes" por cliente con su planilla de piezas. El plan es una meta (no un molde): las piezas se suman cuando surgen
// y las que pasan el plan quedan como extras. Dropbox crea las carpetas, guarda el arte y cuenta lo que ya está.
// Mr. Piggy propone contenido, escribe copys y reparte lo que el cliente dice en un chat.
export const ESTADOS_PIEZA = ['Idea', 'En diseño', 'Revisión interna', 'Para el cliente', 'Cambios', 'Aprobada', 'Programada', 'Publicada'];
export const ESTADOS_MES = ['Planificación', 'Producción', 'Revisión interna', 'Con el cliente', 'Aprobado', 'Programado', 'Cerrado'];
// Un solo nombre para la primera etapa: "Planificación" (en la base sigue guardada como 'Idea').
export const pzNombre = e => (e === 'Idea' ? 'Planificación' : e);
export const PZ_COLOR = { 'Idea': '--s-empezar', 'En diseño': '--s-curso', 'Revisión interna': '--s-confirmar', 'Para el cliente': '--s-revision', 'Cambios': '--s-cancelado', 'Aprobada': '--s-entregado', 'Programada': '--s-presup', 'Publicada': '--s-entregado' };
const MES_COLOR = { 'Planificación': '--s-empezar', 'Producción': '--s-curso', 'Revisión interna': '--s-confirmar', 'Con el cliente': '--s-revision', 'Aprobado': '--s-entregado', 'Programado': '--s-presup', 'Cerrado': '--s-pausado' };
const REDES = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'YouTube', 'X'];
const FORMATOS_DEF = ['Reels', 'Posts', 'Historias', 'Carruseles'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
// A quién le toca cada estado de una pieza, según el rol que tiene en la cuenta (se edita en Opciones → Flujo de Redes).
// Varios roles en una etapa van con "+": "Revisión interna=Dirección+Cuentas y programación".
export const FLUJO_DEF = ['Idea=Cuentas y programación', 'En diseño=Diseño', 'Revisión interna=Dirección', 'Para el cliente=Cuentas y programación', 'Cambios=Diseño', 'Aprobada=Cuentas y programación', 'Programada=Cuentas y programación', 'Publicada='];
// Hora de publicación por formato (Opciones → Flujo de Redes). Si ese día ya hay otra del mismo formato a esa hora, se corre 3 h.
export const HORAS_DEF = ['Historias=10:00', 'Posts=12:30', 'Carruseles=12:30', 'Reels=19:00'];
// Un color por formato, para distinguir historias, posts, carruseles y reels de un vistazo.
const FMT_COLOR = [[/reel/i, '#8b5cf6'], [/histori|stor/i, '#e0598b'], [/carrus/i, '#14a07a'], [/post/i, '#2f7de1'], [/tiktok/i, '#0f9fb5'], [/video|youtube/i, '#d9822b']];
// Redes que se gestionan, con el color de cada marca (Instagram con su degradé). TikTok, X y Threads usan el negro de la app (se invierte en modo oscuro).
export const REDES_G = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'YouTube', 'X', 'Pinterest', 'Threads'];
// Íconos de cada red: Simple Icons (CC0), en blanco sobre el color de la marca.
const RED_INFO = { Instagram: ['IG', 'linear-gradient(45deg,#f58529,#dd2a7b 55%,#8134af)', siInstagram], Facebook: ['FB', '#1877F2', siFacebook], TikTok: ['TT', 'var(--red-negro)', siTiktok], LinkedIn: ['IN', '#0A66C2', siLinkedin], YouTube: ['YT', '#FF0000', siYoutube], X: ['X', 'var(--red-negro)', siX], Pinterest: ['P', '#E60023', siPinterest], Threads: ['TH', 'var(--red-negro)', siThreads], Behance: ['BE', '#1769FF', siBehance] };
const redIco = (r, ab, ic) => ic && ic.path ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ic.path + '"/></svg>' : escR(ab);
const redInfo = r => RED_INFO[r] || RED_INFO[Object.keys(RED_INFO).find(k => k.toLowerCase() === String(r || '').toLowerCase())] || [String(r || '?').slice(0, 2).toUpperCase(), '#888', null];
export const redesDe = txt => String(txt || '').split(/\s*[,+/]\s*/).map(x => x.trim()).filter(Boolean);
const escR = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const redBadges = txt => { const rs = redesDe(txt); return rs.length ? '<span class="rds">' + rs.map(r => { const [ab, c, ic] = redInfo(r); return '<span class="rd" style="--rc:' + c + '" title="' + escR(r) + '" aria-label="' + escR(r) + '">' + redIco(r, ab, ic) + '</span>'; }).join('') + '</span>' : ''; };
// Selector de redes con el color de cada una (una o varias)
export function redChips(id, sel, opciones, dis, esc) {
  const e = esc || escR, todas = [...new Set([...(opciones || []), ...(sel || [])])];
  return '<div class="rd-chips" id="' + e(id) + '">' + todas.map(r => { const [ab, c, ic] = redInfo(r); return '<label class="rd-chk" style="--rc:' + c + '"><input type="checkbox" value="' + e(r) + '"' + ((sel || []).includes(r) ? ' checked' : '') + (dis || '') + '><span class="rd">' + redIco(r, ab, ic) + '</span>' + e(r) + '</label>'; }).join('') + '</div>';
}
// "Qué va en la pieza" con jerarquía: cada "Etiqueta: texto" con la etiqueta en negrita, los detalles con flecha y aire entre bloques.
export function contenidoHtml(txt) {
  const out = []; let hueco = false;
  String(txt || '').replace(/\r/g, '').split('\n').forEach(l0 => {
    const l = l0.trim();
    if (!l) { if (out.length) hueco = true; return; }
    const sep = hueco ? ' ct-sep' : ''; hueco = false;
    let mm;
    if ((mm = l.match(/^(?:[-•*→]|->)\s*(.+)$/))) out.push('<div class="ct-b' + sep + '"><i>→</i><span>' + escR(mm[1]) + '</span></div>');
    else if ((mm = l.match(/^(\d{1,2})[.)]\s+(.+)$/))) out.push('<div class="ct-l ct-n' + sep + '"><b>' + escR(mm[1]) + '</b><span>' + escR(mm[2]) + '</span></div>');
    else if ((mm = l.match(/^([^:]{1,32}?)\s*[:—–]\s+(.+)$/)) && !/https?$/i.test(mm[1])) out.push('<div class="ct-l' + sep + '"><b>' + escR(mm[1]) + '</b><span>' + escR(mm[2]) + '</span></div>');
    else out.push('<div class="ct-p' + sep + '">' + escR(l) + '</div>');
  });
  return '<div class="ct">' + out.join('') + '</div>';
}
const FMT_OTROS = ['#b5893b', '#6b7fd7', '#c2569b', '#3f9a5f'];
export const fmtColor = f => { const x = FMT_COLOR.find(([re]) => re.test(f || '')); if (x) return x[1]; let h = 0; for (const c of String(f || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return FMT_OTROS[h % FMT_OTROS.length]; };
import { vistaSel, vistaDe, filtrosMenu } from './ui.js';
import { confirmar, pedirTexto } from './dialogo.js';
import { ICON } from './iconos.js';
import { siInstagram, siFacebook, siTiktok, siLinkedin, siYoutube, siX, siPinterest, siThreads, siBehance } from 'simple-icons';
const IMG = /\.(jpe?g|png|gif|webp|tiff?|bmp|heic)$/i;
const ICO_COPIAR = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';

export function initRedes(ctx) {
  const { S, esc, opt, toast, data, render, $, av, fotoDe, personas, pill, fmt, fmtShort, today, thisMonth, addMonth, monthLabel, isStaff, cmp, norm, emptyBox, hil, ISO, cfgGet, lsSet, lsGet } = ctx;
  const st = { mes: thisMonth(), sel: new Set(), fOff: new Set(), mio: false, vis: [], ia: {}, abiertos: new Set(), tab: lsGet('rmTab') || 'planilla', cargando: new Set(), thumbs: new Map(), pidiendo: new Set(), fpz: null, abrirPieza: null };
  const P = new Map(); // mesId -> piezas

  const formatos = () => (S.L.formatosRedes && S.L.formatosRedes.length ? S.L.formatosRedes : FORMATOS_DEF);
  const meses = () => S.RM || [];
  const mesDe = id => meses().find(m => m._id === id);
  const mesCliente = (cliente, mes) => meses().find(m => m.cliente === cliente && m.mes === mes);
  const abonoRedes = cliente => S.A.find(a => a.cliente === cliente && a.tipo === 'Redes' && a.estado === 'Activo');
  // Roles de la cuenta (Dirección, Cuentas y programación, Diseño, Ads…): a quién va el mes y a quién las piezas.
  const conRol = (cliente, re, tipo) => { for (const a of S.A.filter(x => x.cliente === cliente && x.estado === 'Activo' && (!tipo || x.tipo === tipo))) { const r = Object.entries(a.roles || {}).find(([al, rol]) => re.test(rol) && (a.responsables || []).includes(al)); if (r) return r[0]; } return ''; };
  const respMes = (cliente, ab) => conRol(cliente, /cuenta|community|programa/i, 'Redes') || ((ab && (ab.responsables || [])[0]) || '');
  // Las piezas nuevas no se asignan a una persona: le tocan al rol de cada etapa (ver quienes). "resp" queda para elegir a alguien puntual.
  // Las redes que se gestionan en la cuenta (servicio de Redes); si no están marcadas, las que el cliente tiene en su ficha.
  function redesCuenta(cliente) {
    const ab = abonoRedes(cliente); if (ab && Array.isArray(ab.redes) && ab.redes.length) return ab.redes;
    const c = S.C.find(x => x.nombre === cliente) || {}, o = c.redes || {};
    const rs = REDES_G.filter(r => String(o[r.toLowerCase()] || '').trim());
    return rs.length ? rs : ['Instagram'];
  }
  // Dónde se publica cada pieza: por defecto se replica en todas las redes de la cuenta. Las historias solo van donde hay historias.
  const CON_HISTORIAS = ['Instagram', 'Facebook', 'TikTok'];
  const redesPara = (formato, redes) => { if (!/histori|stor/i.test(formato || '')) return redes; const h = redes.filter(r => CON_HISTORIAS.includes(r)); return h.length ? h : redes.slice(0, 1); };
  const replicaDe = m => (st.repl && st.repl[m._id]) || redesCuenta(m.cliente);
  const replChips = (m, id) => { const todas = redesCuenta(m.cliente), sel = replicaDe(m);
    return '<div class="field full"><span class="lbl">Se publica en</span>' + redChips(id, sel, todas, '', esc) + '<span class="hint">' + (todas.length > 1 ? 'Por defecto el mismo contenido se replica en todas las redes de la cuenta (las historias, solo donde hay historias). Destildá las que no van.' : 'La cuenta gestiona solo ' + esc(todas[0]) + '. Las redes se marcan en el servicio de Redes del cliente.') + '</span></div>'; };
  const leerRepl = (m, id) => { const v = [...document.querySelectorAll('#' + id + ' input:checked')].map(i => i.value); const r = v.length ? v : redesCuenta(m.cliente).slice(0, 1); st.repl = st.repl || {}; st.repl[m._id] = r; return r; };
  const insPiezas = (m, lista) => data.piezasIns(m, lista.map(u => (u.red ? u : { ...u, red: redesCuenta(m.cliente).join(', ') })));
  const lista2 = (k, def) => (S.L[k] && S.L[k].length ? S.L[k] : def);
  const flujo = () => { const o = {}; lista2('flujoRedes', FLUJO_DEF).forEach(x => { const i = String(x).indexOf('='); if (i > 0) o[x.slice(0, i)] = x.slice(i + 1).split('+').map(r => r.trim()).filter(Boolean); }); return o; };
  const rolesEtapa = e => flujo()[e] || [];
  const mismoRol = (a, b) => norm(a || '') === norm(b || '');
  // El equipo de la cuenta: alias -> rol (el de Redes manda si está también en Ads).
  function equipo(cliente) {
    const m = new Map();
    S.A.filter(a => a.cliente === cliente && a.estado === 'Activo' && (a.tipo === 'Redes' || a.tipo === 'Ads')).sort((x, y) => (x.tipo === 'Redes' ? 0 : 1) - (y.tipo === 'Redes' ? 0 : 1))
      .forEach(a => (a.responsables || []).forEach(al => { if (!m.get(al)) m.set(al, (a.roles || {})[al] || ''); }));
    return m;
  }
  // Quiénes tienen que mover la pieza en el estado en que está: todos los de ese rol en la cuenta.
  // Si la pieza tiene a alguien elegido, reemplaza a los de su rol (o a diseño, si no tiene rol en la cuenta).
  function quienes(cliente, z, eq) {
    eq = eq || equipo(cliente);
    let roles = rolesEtapa(z.estado);
    if (soloAds(z) && [...eq.values()].some(r => /^ads/i.test(r))) roles = roles.map(r => (/diseñ/i.test(r) ? 'Ads' : r));
    let gente = [...eq].filter(([, r]) => roles.some(x => mismoRol(x, r))).map(([a]) => a);
    if (z.resp) {
      const rp = eq.get(z.resp), rol = rp && roles.find(x => mismoRol(x, rp)) ? rp : !rp ? roles.find(x => /diseñ|^ads/i.test(x)) : null;
      if (rol) gente = [z.resp, ...gente.filter(a => a !== z.resp && !mismoRol(eq.get(a), rol))];
    }
    return { roles, gente };
  }
  // Horarios propios de la cuenta (los define Mr. Piggy al analizarla); si no tiene, los generales de Opciones.
  const horariosCuenta = cliente => { const c = cliente && S.C.find(x => x.nombre === cliente); return (c && c.marca && c.marca.horarios && c.marca.horarios.formatos) || null; };
  const horaCuenta = (f, cliente) => { const h = horariosCuenta(cliente); const k = h && Object.keys(h).find(x => norm(x) === norm(f || '')); return k && /^\d{1,2}:\d{2}/.test(h[k].hora || '') ? h[k].hora : ''; };
  const horaDe = (f, cliente) => { const hc = horaCuenta(f, cliente); if (hc) return hc; const x = lista2('horasRedes', HORAS_DEF).find(y => norm(y.split('=')[0]) === norm(f || '')); return x ? x.slice(x.indexOf('=') + 1) : '12:00'; };
  const pad2 = n => String(n).padStart(2, '0');
  function horaLibre(ps, fecha, formato, cliente) {
    const h = horaDe(formato, cliente); if (!fecha || !/^\d{1,2}:\d{2}/.test(h)) return h;
    const usadas = new Set(ps.filter(z => z.fecha === fecha && z.hora && z.formato === formato).map(z => z.hora.slice(0, 5)));
    let [hh, mm] = h.split(':').map(Number);
    for (let i = 0; i < 6 && usadas.has(pad2(hh) + ':' + pad2(mm)); i++) hh = Math.min(23, hh + 3);
    return pad2(hh) + ':' + pad2(mm);
  }
  const planDeAbono = a => { const pl = a && a.plan ? S.L['plan:' + a.plan] : null; const o = {}; (pl || []).forEach(x => { const [f, n] = x.split('='); if (f && +n > 0) o[f] = +n; }); return o; };
  const clientesMes = mes => {
    const cs = new Set(S.A.filter(a => a.tipo === 'Redes' && a.estado === 'Activo').map(a => a.cliente));
    meses().filter(m => m.mes === mes).forEach(m => cs.add(m.cliente));
    return [...cs].filter(c => S.C.some(x => x.nombre === c)).sort(cmp);
  };
  const piezas = id => P.get(id) || null;
  async function cargar(ids, forzar) {
    const faltan = ids.filter(id => id && (forzar || !P.has(id)) && !st.cargando.has(id)); if (!faltan.length) return;
    faltan.forEach(id => st.cargando.add(id));
    try { const rows = await data.piezasDe(faltan); faltan.forEach(id => P.set(id, rows.filter(r => r.mesId === id))); }
    catch (e) { toast(e.message); faltan.forEach(id => { if (!P.has(id)) P.set(id, []); }); }
    faltan.forEach(id => st.cargando.delete(id));
    render();
  }
  // Ads: una pieza puede ser solo para anuncios (no cuenta en el plan de Redes ni como extra) o del plan y además pautada.
  const soloAds = z => z.ads === 'solo';
  const enPlan = ps => (ps || []).filter(z => !soloAds(z));
  const tieneAds = cliente => S.A.some(a => a.cliente === cliente && a.tipo === 'Ads' && a.estado === 'Activo');
  const ADS_OPC = [['', 'No va en Ads'], ['tambien', 'Del plan, y también se pauta'], ['solo', 'Solo para Ads (no cuenta en el plan)']];
  const adsTag = z => z.ads === 'solo' ? '<span class="rm-ads" title="Solo para Ads: no cuenta en el plan">Ads</span>' : z.ads === 'tambien' ? '<span class="rm-ads tb" title="Del plan, y también se pauta">+ Ads</span>' : '';
  // Copiar al portapapeles: data-sel = de un campo del formulario, o data-id + data-k = de una pieza (copy, hashtags o los dos).
  const copiarBtn = (sel, extra) => '<button type="button" class="btn ghost sm cp-b" data-act="rmCopiar"' + (sel ? ' data-sel="' + esc(sel) + '"' : '') + (extra || '') + ' title="Copiar" aria-label="Copiar">' + ICO_COPIAR + '</button>';
  const filas = (t, ancho, min, max) => Math.min(max, Math.max(min, String(t || '').split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / ancho)), 0)));
  // Cobro de las piezas extra de la cuenta (solo lo ven los administradores; para el resto, null)
  const xCfg = cliente => { const ab = abonoRedes(cliente); return (ab && ctx.extrasCfg && ctx.extrasCfg(ab._id)) || { cobro: false, precios: {}, moneda: 'ARS', admin: false }; };
  // Espaciado de los copys según la ficha de la cuenta: una o dos líneas entre bloques, o una línea "invisible" al copiar
  // (Instagram a veces junta los párrafos; con el carácter ⠀ en las líneas vacías los respeta).
  const espaciado = cliente => { const c = S.C.find(x => x.nombre === cliente); return String((c && c.marca && c.marca.espaciado) || ''); };
  const espaciar = (txt, cliente) => { const t = String(txt || '').replace(/[ \t]+\n/g, '\n').trim(); return /dos/i.test(espaciado(cliente)) ? t.replace(/\n\s*\n+/g, '\n\n\n') : t.replace(/\n\s*\n\s*\n+/g, '\n\n'); };
  const paraPegar = (txt, cliente) => /invisible/i.test(espaciado(cliente)) ? String(txt || '').replace(/\n(?=\n)/g, '\n⠀') : String(txt || '');
  const PH_CONT = f => /carrus/i.test(f) ? 'Slide 1: …\nSlide 2: …' : /reel/i.test(f) ? 'Gancho (0-3 s): …\n1. …\nAudio: …' : /histori/i.test(f) ? 'Texto: …\nSticker: encuesta (Sí / No)' : 'Título: …\nBajada: …\nImagen: …';
  const conteoPorFormato = ps => { const o = {}; enPlan(ps).forEach(z => { o[z.formato] = (o[z.formato] || 0) + 1; }); return o; };
  const pzPill = e => '<span class="pzst" style="--c:var(' + (PZ_COLOR[e] || '--muted') + ')">' + esc(pzNombre(e)) + '</span>';
  const mesPill = e => pill(e, MES_COLOR[e] || '--muted');
  const fechaMes = (mes, d) => mes + '-' + String(d).padStart(2, '0');
  const diasMes = mes => { const [y, m] = mes.split('-').map(Number); return new Date(y, m, 0).getDate(); };

  /* ---------- Vista general del mes ---------- */
  function vLista() {
    const cs = clientesMes(st.mes), ms = cs.map(c => mesCliente(c, st.mes)).filter(Boolean);
    const sinCargar = ms.filter(m => !P.has(m._id)).map(m => m._id); if (sinCargar.length) setTimeout(() => cargar(sinCargar), 0);
    let tot = 0, plan = 0, aprobar = 0, cambios = 0, extras = 0;
    ms.forEach(m => { const ps = piezas(m._id) || []; tot += enPlan(ps).length; plan += Object.values(m.plan || {}).reduce((a, n) => a + (+n || 0), 0); aprobar += ps.filter(z => z.estado === 'Para el cliente').length; cambios += ps.filter(z => z.estado === 'Cambios').length; extras += ps.filter(z => z.extra).length; });
    const nav = '<div class="rm-nav"><button class="btn ghost sm" data-act="rmMes" data-d="-1" aria-label="Mes anterior" data-kbd="[">←</button><b>' + esc(cap(monthLabel(st.mes))) + '</b><button class="btn ghost sm" data-act="rmMes" data-d="1" aria-label="Mes siguiente" data-kbd="]">→</button>' + (st.mes !== thisMonth() ? '<button class="btn ghost sm" data-act="rmMes" data-d="0">Este mes</button>' : '') + '</div>';
    const vista = vistaDe('redes', ['cuadricula', 'lista']);
    let h = '<div class="head"><div><h1>Redes</h1><p>El mes de cada cliente: qué hay que publicar, en qué está cada pieza y qué falta aprobar.</p></div><div class="toolbar">' + nav + vistaSel('redes', ['cuadricula', 'lista'], vista) + (ctx.autoBtn ? ctx.autoBtn('redes') : '') + '</div></div>';
    if (S.RM === null) return h + '<section class="sheet">' + emptyBox('Falta un paso en la base de datos', 'Para usar Redes hay que correr la migración 0016 en Supabase.') + '</section>';
    h += '<section class="hks rm-k">' +
      kpi('Clientes con el mes armado', ms.length + ' de ' + cs.length, cs.length - ms.length ? (cs.length - ms.length) + ' sin arrancar' : 'todos arrancados') +
      kpi('Piezas del mes', tot + (plan ? ' / ' + plan : ''), extras ? extras + ' extras fuera del plan' : 'según plan') +
      kpi('Para aprobar', aprobar, 'esperando al cliente', aprobar ? 'warn' : '') +
      kpi('Con cambios', cambios, 'pedidos por el cliente', cambios ? 'alert' : '') + '</section>';
    const sinMes = cs.filter(c => !mesCliente(c, st.mes));
    if (sinMes.length && isStaff()) h += '<div class="rm-bar"><span><b>' + sinMes.length + '</b> cliente' + (sinMes.length > 1 ? 's' : '') + ' sin el mes armado</span><button class="btn sm primary" data-act="rmArrancarTodos">Arrancar ' + esc(monthLabel(st.mes).split(' ')[0]) + ' para todos</button></div>';
    if (!cs.length) return h + '<section class="sheet">' + emptyBox('Todavía no hay clientes en Redes', 'Sumalos desde la pestaña “Clientes y planes”.') + '</section>';
    const rf = S.rf || (S.rf = { q: '', resp: '', estado: '', pend: false }), q = norm(rf.q);
    const pend = m => { const ps = m && piezas(m._id); return !!(ps && ps.some(z => z.estado === 'Para el cliente' || z.estado === 'Cambios')); };
    const vis = cs.filter(c => { const m = mesCliente(c, st.mes); return (!q || norm(c).includes(q)) && (!rf.resp || (rf.resp === '__none' ? !(m && m.resp) : m && m.resp === rf.resp)) && (!rf.estado || (rf.estado === '__sin' ? !m : m && m.estado === rf.estado)) && (!rf.pend || pend(m)); });
    h += '<div class="toolbar fbar2"><input class="in" type="search" id="rfq" data-bind="rf.q" placeholder="Buscar cliente" value="' + esc(rf.q) + '">' +
      (isStaff() ? '<button class="btn mio' + (rf.resp === S.me.alias ? ' on' : '') + '" data-act="soloMio" data-p="redes" aria-pressed="' + (rf.resp === S.me.alias) + '">Solo lo mío</button>' : '') +
      filtrosMenu('redes', '<label class="lbl" for="rfe">Estado del mes</label><select class="in" id="rfe" data-bind="rf.estado">' + opt('', 'Todos', rf.estado) + opt('__sin', 'Sin arrancar', rf.estado) + ESTADOS_MES.map(e => opt(e, e, rf.estado)).join('') + '</select>' +
        '<label class="lbl" for="rfr">Responsable</label><select class="in" id="rfr" data-bind="rf.resp">' + opt('', 'Todo el equipo', rf.resp) + opt('__none', 'Sin asignar', rf.resp) + personas().map(p => opt(p, p, rf.resp)).join('') + '</select>' +
        '<label class="chk"><input type="checkbox" data-bind="rf.pend"' + (rf.pend ? ' checked' : '') + '> Solo con algo para aprobar o con cambios</label>', (rf.estado ? 1 : 0) + (rf.resp ? 1 : 0) + (rf.pend ? 1 : 0)) + '</div>';
    if (!vis.length) return h + '<section class="sheet">' + emptyBox('Ningún cliente coincide', 'Probá con otro filtro.') + '</section>';
    if (vista === 'lista') {
      const fila = c => { const m = mesCliente(c, st.mes), cli = S.C.find(x => x.nombre === c) || {};
        if (!m) return '<tr><td class="name"><span class="who1">' + av(c, cli.avatar, 'sq') + esc(c) + '</span></td><td><span class="muted">Sin arrancar</span></td><td class="muted">—</td><td class="n muted">—</td><td class="n muted">—</td><td class="r">' + (isStaff() ? '<button class="btn sm" data-act="rmArrancar" data-c="' + esc(c) + '">Arrancar</button>' : '') + '</td></tr>';
        const ps = piezas(m._id), n = ps ? enPlan(ps).filter(z => !z.extra).length : null, nx = ps ? enPlan(ps).filter(z => z.extra).length : 0, plan = Object.values(m.plan || {}).reduce((a, x) => a + (+x || 0), 0);
        const ap = ps ? ps.filter(z => z.estado === 'Para el cliente').length : 0, ca = ps ? ps.filter(z => z.estado === 'Cambios').length : 0;
        return '<tr class="click" data-act="rmAbrir" data-id="' + esc(m._id) + '"><td class="name"><span class="who1">' + av(c, cli.avatar, 'sq') + esc(c) + '</span></td><td>' + mesPill(m.estado) + '</td><td>' + (m.resp ? esc(m.resp) : '<span class="muted">—</span>') + '</td>' +
          '<td class="n num">' + (n == null ? '…' : n + (plan ? ' / ' + plan : '') + (nx ? ' <span class="rm-xn" title="Piezas extra, fuera del plan">+' + nx + ' extra' + (nx > 1 ? 's' : '') + '</span>' : '')) + '</td><td class="n">' + (ap ? '<span class="pzst" style="--c:var(--s-revision)">' + ap + ' a aprobar</span>' : '') + (ca ? ' <span class="pzst" style="--c:var(--s-cancelado)">' + ca + (ca > 1 ? ' cambios' : ' cambio') + '</span>' : '') + (!ap && !ca ? '<span class="muted">—</span>' : '') + '</td><td class="r">' + (m.visible ? '<span class="muted" title="El cliente lo ve en el portal">En el portal</span>' : '') + '</td></tr>'; };
      return h + '<section class="sheet"><div class="tbl"><table><thead><tr><th>Cliente</th><th>Estado</th><th>Responsable</th><th class="n">Piezas</th><th class="n">Pendiente</th><th></th></tr></thead><tbody>' + vis.map(fila).join('') + '</tbody></table></div><div class="count num">' + vis.length + ' clientes</div></section>';
    }
    h += '<div class="rm-cards">' + vis.map(c => card(c, mesCliente(c, st.mes))).join('') + '</div>';
    return h;
  }
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const kpi = (l, n, sub, cls) => '<div class="hk ' + (cls || '') + '"><span class="hk-t"><span class="hk-l">' + esc(l) + '</span><b>' + esc(String(n)) + '</b><span class="hk-s">' + esc(sub) + '</span></span></div>';
  function barras(m, ps) {
    const pl = m ? (m.plan || {}) : {}, cnt = conteoPorFormato(ps), fs = [...new Set([...formatos(), ...Object.keys(pl), ...Object.keys(cnt)])];
    return '<div class="rm-fs">' + fs.filter(f => pl[f] || cnt[f]).map(f => {
      const n = cnt[f] || 0, p = +pl[f] || 0, pct = p ? Math.min(100, Math.round(n / p * 100)) : 100, db = m && m.conteo && m.conteo[f] != null ? m.conteo[f] : null;
      return '<div class="rm-f"><span class="rm-fl">' + esc(f) + '</span><span class="rm-fb"><i style="width:' + pct + '%"></i></span><span class="rm-fn"><b>' + n + '</b>' + (p ? '/' + p : '') + (n > p && p ? ' <em>+' + (n - p) + '</em>' : '') + (db != null ? ' <span class="rm-db" title="Archivos en la carpeta de Dropbox">▣ ' + db + '</span>' : '') + '</span></div>';
    }).join('') + adsLinea(ps) + '</div>';
  }
  function adsLinea(ps) {
    const so = (ps || []).filter(soloAds).length, tb = (ps || []).filter(z => z.ads === 'tambien').length; if (!so && !tb) return '';
    return '<p class="rm-adsl">' + adsTag({ ads: 'solo' }) + ' ' + [so ? so + (so === 1 ? ' pieza solo para Ads' : ' piezas solo para Ads') : '', tb ? tb + (tb === 1 ? ' del plan también se pauta' : ' del plan también se pautan') : ''].filter(Boolean).join(' · ') + '</p>';
  }
  function card(c, m) {
    const cli = S.C.find(x => x.nombre === c) || {};
    if (!m) return '<div class="rm-card vacio"><div class="rm-ch">' + av(c, cli.avatar, 'sq') + '<div><b>' + esc(c) + '</b>' + (ctx.servChips ? ctx.servChips(c) : '<span class="muted">' + esc((abonoRedes(c) || {}).plan || 'Sin plan') + '</span>') + '</div></div><p class="muted">Todavía no se armó ' + esc(monthLabel(st.mes).split(' ')[0]) + '.</p>' + (isStaff() ? '<button class="btn sm" data-act="rmArrancar" data-c="' + esc(c) + '">Arrancar el mes</button>' : '') + '</div>';
    const ps = piezas(m._id);
    const ap = ps ? ps.filter(z => z.estado === 'Para el cliente').length : 0, ca = ps ? ps.filter(z => z.estado === 'Cambios').length : 0;
    return '<button class="rm-card" data-act="rmAbrir" data-id="' + esc(m._id) + '"><div class="rm-ch">' + av(c, cli.avatar, 'sq') + '<div><b>' + esc(c) + '</b><span class="muted">' + (m.resp ? esc(m.resp) : 'Sin responsable') + '</span></div>' + mesPill(m.estado) + '</div>' + (ctx.servChips ? ctx.servChips(c) : '') +
      (ps ? barras(m, ps) : '<p class="muted">Cargando…</p>') +
      '<div class="rm-cf">' + (ap ? '<span class="pzst" style="--c:var(--s-revision)">' + ap + ' para aprobar</span>' : '') + (ca ? '<span class="pzst" style="--c:var(--s-cancelado)">' + ca + ' con cambios</span>' : '') + (m.visible ? '<span class="rm-vis" title="El cliente lo ve en el portal">👁 En el portal</span>' : '') + '</div></button>';
  }

  /* ---------- Un mes ---------- */
  function vMes(id) {
    const m = mesDe(id);
    if (!m) return '<section class="sheet">' + emptyBox('Ese mes no existe o no tenés acceso', '') + '<div class="sheet-b"><button class="btn" data-act="rmVolver">← Redes</button></div></section>';
    const ps = piezas(m._id); if (!ps) { setTimeout(() => cargar([m._id]), 0); }
    if (m.carpeta && (!m.conteoAt || Date.now() - new Date(m.conteoAt) > 10 * 60_000) && !st.pidiendo.has('c' + m._id)) { st.pidiendo.add('c' + m._id); setTimeout(() => contar(m, true), 50); }
    const cli = S.C.find(x => x.nombre === m.cliente) || {}, can = isStaff();
    const prev = mesCliente(m.cliente, addMonth(m.mes, -1)), next = mesCliente(m.cliente, addMonth(m.mes, 1));
    const lista = ps || [];
    const tabs = [['planilla', 'Planilla'], ['calendario', 'Calendario'], ['feed', 'Feed'], ['conv', 'Conversación'], ...(can && ctx.informe ? [['informe', 'Informe']] : [])];
    const tab = tabs.some(t => t[0] === st.tab) ? st.tab : 'planilla';
    let h = '<div class="pf-head rm-head"><div class="pf-top"><button class="pf-logo" data-act="ficha" data-cliente="' + esc(m.cliente) + '">' + av(m.cliente, cli.avatar, 'xl sq') + '</button><div class="pf-tit"><button class="btn link pf-cli" data-act="ficha" data-cliente="' + esc(m.cliente) + '">' + esc(m.cliente) + '</button>' +
      '<h1 class="rm-tit">' + (prev ? '<button class="btn ghost sm" data-act="rmAbrir" data-id="' + esc(prev._id) + '" aria-label="Mes anterior" data-kbd="[">←</button>' : '') + 'Redes · ' + esc(cap(monthLabel(m.mes))) + (next ? '<button class="btn ghost sm" data-act="rmAbrir" data-id="' + esc(next._id) + '" aria-label="Mes siguiente" data-kbd="]">→</button>' : '') + '</h1>' + (ctx.servChips ? '<div class="rm-serv">' + ctx.servChips(m.cliente, { precio: true, mes: m.mes }) + (can && ctx.servAb && ctx.servAb(m.cliente) ? '<button class="btn link sm" data-act="edit" data-kind="abono" data-id="' + esc(ctx.servAb(m.cliente)._id) + '">Editar servicio</button>' : '') + '</div>' : '') + '</div>' +
      '<div class="toolbar pf-acc">' + (can ? carpetaBtn(m) + enviarBtn(m, lista) + (ctx.masMenu ? ctx.masMenu([
        lista.length ? { act: 'rmPasar', label: 'Cambiar la etapa a mano', attrs: ' data-id="' + esc(m._id) + '"', icon: 'flecha' } : null,
        next ? null : { act: 'rmSiguiente', label: 'Arrancar ' + monthLabel(addMonth(m.mes, 1)).split(' ')[0], attrs: ' data-id="' + esc(m._id) + '"', icon: 'calendario' },
        { act: 'rmBorrarMes', label: 'Borrar este mes', attrs: ' data-id="' + esc(m._id) + '"', danger: true, icon: 'alerta' }]) : '') : '') + '</div></div>' +
      '<div class="pf-meta rm-meta">' + etapasHtml(m, lista, can) +
      '<span class="rm-resp">' + (m.resp ? av(m.resp, fotoDe(m.resp)) : '') + (can ? '<select class="in sm" data-rmupd="resp" data-id="' + esc(m._id) + '" aria-label="Responsable del mes">' + opt('', 'Sin responsable', m.resp) + personas().map(a => opt(a, a, m.resp)).join('') + '</select>' : esc(m.resp || '')) + '</span>' +
      (can ? '<label class="rm-portal sw"><input type="checkbox" data-rmupd="visible" data-id="' + esc(m._id) + '"' + (m.visible ? ' checked' : '') + '><span></span><b>Visible en el portal</b></label>' : '') +
      (m.aprobadoAt ? '<span class="pzst" style="--c:var(--s-entregado)">Aprobado por ' + esc(m.aprobadoPor || 'el cliente') + '</span>' : '') +
      '</div>' +
      '<div class="rm-plan">' + barras(m, lista) + '<div class="rm-plan-a">' + invBtn(m) + extrasBtn(m, lista) + (can ? '<button class="btn ghost sm" data-act="rmPlan" data-id="' + esc(m._id) + '">Editar plan</button>' : '') + '</div></div>' +
      '<nav class="pf-tabs">' + tabs.map(([k, l]) => '<button data-act="rmTab" data-t="' + k + '"' + (tab === k ? ' aria-current="page"' : '') + '>' + l + (k === 'planilla' && lista.length ? ' <span class="muted">' + lista.length + '</span>' : '') + '</button>').join('') + '</nav></div>';
    if (!ps) return h + '<section class="sheet">' + emptyBox('Cargando piezas…', '') + '</section>';
    if (tab === 'planilla') h += planilla(m, lista, can);
    else if (tab === 'calendario') h += calendario(m, lista);
    else if (tab === 'feed') h += feed(m, lista);
    else if (tab === 'informe') h += ctx.informe(m, lista);
    else if (tab === 'conv') h += '<div class="pf-grid"><div>' + hil().html('mes', m._id, { cliente: m.cliente, titulo: 'Conversación del mes', publico: true, vacio: 'Lo que se habla de las redes de ' + m.cliente + ' este mes. Marcá “Visible al cliente” para que lo lea en el portal.' }) + '</div><aside class="pf-side"><section class="pf-card"><h3>Notas del mes</h3><textarea class="in" rows="8" data-rmupd="notas" data-id="' + esc(m._id) + '" placeholder="Fechas especiales, promos, lo que pidió el cliente…"' + (can ? '' : ' disabled') + '>' + esc(m.notas) + '</textarea></section></aside></div>';
    return h;
  }
  const carpetaBtn = m => m.carpetaUrl ? '<a class="btn" href="' + esc(m.carpetaUrl) + '" target="_blank" rel="noopener" title="' + esc(m.carpeta) + '">Carpeta ↗</a><button class="btn ghost sm" data-act="rmContar" data-id="' + esc(m._id) + '" title="Contar los archivos de la carpeta">↻</button>' : cfgGet && cfgGet('dropbox', 'crear') === 'si' ? '<button class="btn" data-act="rmCarpeta" data-id="' + esc(m._id) + '">Crear carpetas en Dropbox</button>' : '';
  function enviarBtn(m, ps) {
    const listas = ps.filter(z => z.estado === 'Revisión interna').length;
    return '<button class="btn primary" data-act="rmEnviar" data-id="' + esc(m._id) + '"' + (listas ? '' : ' title="Pasa al cliente las piezas en Revisión interna"') + '>Enviar al cliente' + (listas ? ' (' + listas + ')' : '') + '</button>';
  }

  function planilla(m, ps, can) {
    const fs = formatos(), sel = st.sel, eq = equipo(m.cliente), yo = (st.mio && st.mioDe) || (S.me && S.me.alias), ocupado = st.ia[m._id];
    const ordenadas = [...ps].sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999') || (a.hora || '').localeCompare(b.hora || '') || a.orden - b.orden);
    const bulk = sel.size ? '<div class="bulkbar rm-bulk"><b>' + sel.size + ' seleccionada' + (sel.size > 1 ? 's' : '') + '</b><select class="in sm" id="rm-bk-est" aria-label="Cambiar el estado a mano">' + opt('', 'Estado a mano…', '') + ESTADOS_PIEZA.map(e => opt(e, pzNombre(e), '')).join('') + '</select>' +
      '<select class="in sm" id="rm-bk-resp" aria-label="A cargo de">' + opt('', 'A cargo de…', '') + opt('__nadie', 'Según el flujo', '') + personas().map(a => opt(a, a, '')).join('') + '</select>' +
      (etapaDe(m).general ? '' : '<button class="btn sm" data-act="rmListoSel" data-id="' + esc(m._id) + '">' + (etapaDe(m).cliente ? 'Aprobadas' : 'Marcar listas') + '</button>') + (iEt(etapaDe(m)) >= 2 ? '<button class="btn sm" data-act="rmDevolverSel" data-id="' + esc(m._id) + '">Devolver a diseño</button>' : '') +
      '<button class="btn sm" data-act="rmHoras" data-id="' + esc(m._id) + '" data-sel="1">Poner horarios</button>' +
      '<button class="btn sm" data-act="rmCopys"><span class="pig" aria-hidden="true">' + ISO + '</span> Escribir copys</button><button class="btn sm danger" data-act="rmBorrar">Borrar</button><button class="btn ghost sm" data-act="rmSelNada">Listo</button></div>' : '';
    const sinHora = ps.filter(z => !z.hora).length;
    // Filtro por formato (con check) y "lo que me toca", en el menú de filtros como en el resto de la app
    const presentes = [...new Set([...fs.filter(f => ps.some(z => z.formato === f)), ...ps.map(z => z.formato).filter(Boolean)])];
    const qz = new Map(ps.map(z => [z._id, quienes(m.cliente, z, eq)]));
    const mias = ps.filter(z => yo && qz.get(z._id).gente.includes(yo));
    const vis = ordenadas.filter(z => !st.fOff.has(z.formato) && (!st.mio || mias.includes(z)));
    st.vis = vis.map(z => z._id);
    const activos = presentes.filter(f => st.fOff.has(f)).length + (st.mio ? 1 : 0);
    const filtros = ps.length ? filtrosMenu('rmpz', '<span class="lbl">Formatos</span><div data-todos="rmff" data-todos-dentro style="display:flex;flex-direction:column">' + presentes.map(f => '<label class="chk rm-fck" style="--fc:' + fmtColor(f) + '"><input type="checkbox" data-rmff="' + esc(f) + '"' + (st.fOff.has(f) ? '' : ' checked') + '> <i class="rm-dot"></i>' + esc(f) + ' <span class="muted num">' + ps.filter(z => z.formato === f).length + '</span></label>').join('') + '</div>' +
      (yo && eq.has(yo) ? '<label class="chk" style="margin-top:6px"><input type="checkbox" data-rmmio' + (st.mio ? ' checked' : '') + '> ' + (st.mioDe && st.mioDe !== (S.me && S.me.alias) ? 'Solo lo de ' + esc(st.mioDe) : 'Solo lo que me toca') + ' <span class="muted num">' + mias.length + '</span></label>' : ''), activos) : '';
    const vista = vistaDe('redesPiezas', ['lista', 'cuadricula', 'tablero'], 'cuadricula');
    // Agregar piezas: un botón que abre el formulario (formato con color, cantidad y para qué)
    const addPop = '<details class="share rm-addm" data-keep="rmadd"><summary class="btn sm">' + ICON.sumar + ' Agregar</summary><div class="menu-pop rm-addp"><form class="rm-add" data-rmadd="' + esc(m._id) + '">' +
      '<span class="lbl">Formato</span><div class="rm-addf">' + fs.map((f, i) => '<label class="rm-fopt" style="--fc:' + fmtColor(f) + '"><input type="radio" name="f" value="' + esc(f) + '"' + (i === 0 ? ' checked' : '') + '><span>' + esc(f) + '</span></label>').join('') + '</div>' +
      '<span class="lbl">Cantidad</span><div class="rm-cant"><button type="button" class="btn ghost sm" data-act="rmCant" data-d="-1" aria-label="Menos">−</button><input class="in sm" type="number" min="1" max="60" name="n" value="1" aria-label="Cantidad"><button type="button" class="btn ghost sm" data-act="rmCant" data-d="1" aria-label="Más">+</button></div>' +
      (tieneAds(m.cliente) ? '<span class="lbl">Para</span><div class="seg rm-adds" role="group"><label><input type="radio" name="u" value="" checked><span>Del plan</span></label><label><input type="radio" name="u" value="solo"><span>Solo para Ads</span></label></div>' : '') +
      '<button class="btn sm primary">Agregar</button></form></div></details>';
    const btnIA = (act, ico, txt, tit) => '<button class="btn sm rm-w" data-act="' + act + '" data-id="' + esc(m._id) + '" title="' + esc(tit) + '"' + (ocupado ? ' disabled' : '') + '>' + ico + '<span>' + esc(txt) + '</span></button>';
    const tools = '<div class="toolbar rm-tools">' + (can ? addPop +
      '<button class="btn sm' + (ocupado ? ' ocupado' : '') + '" data-act="rmIdeas" data-id="' + esc(m._id) + '"' + (ocupado ? ' disabled' : '') + ' title="Mr. Piggy propone lo que falta del plan">' + (ocupado ? '<span class="ia-dots"><i></i><i></i><i></i></span> ' + esc(ocupado) : '<span class="pig" aria-hidden="true">' + ISO + '</span> Proponer') + '</button>' +
      (ps.length ? btnIA('rmRevisar', '<span class="pig" aria-hidden="true">' + ISO + '</span>', 'Revisar', 'Mr. Piggy revisa las piezas que ya están: tono, copys, hashtags y el mes completo') + btnIA('rmAgenda', ICON.calendario, 'Fechas y horas', 'Mr. Piggy propone día y hora para cada pieza') : '') +
      '<button class="btn sm ghost rm-w" data-act="rmChat" data-id="' + esc(m._id) + '" title="Chat, notas de reunión o transcripción de Meet: se reparte en las piezas">' + ICON.charla + '<span>Lo que dijo el cliente</span></button>' +
      (ctx.masMenu ? '<span class="rm-masw' + (sinHora || (ctx.marcaCtx && !ctx.marcaCtx(m.cliente).marca) ? ' siempre' : '') + '">' + ctx.masMenu([
        ps.length ? { act: 'rmRevisar', label: 'Revisar con Mr. Piggy', attrs: ' data-id="' + esc(m._id) + '" data-n="1"', icon: 'ia' } : null,
        ps.length ? { act: 'rmAgenda', label: 'Fechas y horas con Mr. Piggy', attrs: ' data-id="' + esc(m._id) + '" data-n="1"', icon: 'calendario' } : null,
        { act: 'rmChat', label: 'Lo que dijo el cliente (chat o reunión)', attrs: ' data-id="' + esc(m._id) + '" data-n="1"', icon: 'charla' },
        sinHora ? { act: 'rmHoras', label: 'Poner horarios a ' + sinHora + (sinHora === 1 ? ' pieza' : ' piezas'), attrs: ' data-id="' + esc(m._id) + '"', icon: 'reloj' } : null,
        ctx.marcaCtx && !ctx.marcaCtx(m.cliente).marca ? { act: 'ficha', label: 'Completar la ficha de marca (sin ficha, Mr. Piggy escribe genérico)', attrs: ' data-cliente="' + esc(m.cliente) + '" data-tab="marca"', icon: 'marca' } : null]) + '</span>' : '') : '') +
      '<span class="rm-sp"></span>' + filtros + (ps.length ? vistaSel('redesPiezas', ['lista', 'cuadricula', 'tablero'], vista) : '') + '</div>';
    if (!ps.length) return '<div class="rm-pl">' + tools + '<section class="sheet">' + emptyBox('Todavía no hay piezas este mes', can ? 'Sumalas con “+ Agregar” (de a muchas), o pedile a Mr. Piggy que proponga el contenido según el plan.' : '') + '</section></div>';
    const lunes = f => { const d = new Date(f + 'T12:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };
    const semTxt = f => { const l = lunes(f), dom = new Date(l); dom.setDate(l.getDate() + 6); const mesL = d => d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''); return 'Semana del ' + l.getDate() + (l.getMonth() !== dom.getMonth() ? ' ' + mesL(l) : '') + ' al ' + dom.getDate() + ' ' + mesL(dom); };
    const semDe = z => z.fecha ? semTxt(z.fecha) : 'Sin fecha';
    // Por semana; dentro de cada semana primero posts, carruseles y reels, y después las historias.
    const semK = z => z.fecha ? lunes(z.fecha).toISOString().slice(0, 10) : '9999';
    const pos = new Map(ordenadas.map((z, i) => [z._id, i]));
    // Primero todo el feed (posts, carruseles, reels) por semana; las historias van al final, aparte, también por semana.
    vis.sort((a, b) => (esHistoria(a) ? 1 : 0) - (esHistoria(b) ? 1 : 0) || semK(a).localeCompare(semK(b)) || pos.get(a._id) - pos.get(b._id));
    const sinFecha = ps.filter(z => !z.fecha).length;
    const agendaBtn = can && sinFecha ? '<button class="btn sm ghost rm-agb" data-act="rmAgenda" data-id="' + esc(m._id) + '"><span class="pig" aria-hidden="true">' + ISO + '</span> Definir fechas y horarios</button>' : '';
    const histSep = n => '<div class="rm-hsep"><span>Historias · ' + n + '</span></div>';
    const diaDe = z => z.fecha ? new Date(z.fecha + 'T12:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }).replace('.', '') : '';
    const quien = (z, corto) => { const q = qz.get(z._id);
      if (!q.roles.length) return '<span class="muted">—</span>';
      return '<div class="rm-quien">' + (q.gente.length ? '<span class="avs">' + q.gente.map(a => av(a, fotoDe(a))).join('') + '</span>' : '') + '<span class="rm-qt"><b>' + (q.gente.length ? esc(q.gente.join(', ')) : '<span class="muted">Nadie con ese rol</span>') + '</b>' + (corto ? '' : '<small>' + esc(q.roles.join(' + ')) + (z.resp && q.gente.includes(z.resp) ? ' · elegida' : '') + '</small>') + '</span></div>'; };
    // Texto de la pieza: copy (o, en historias, lo que va escrito), hashtags y botones para copiar
    const cpsHtml = z => (z.copy || z.hashtags ? '<span class="rm-cps">' + (z.copy ? '<button class="btn ghost sm" data-act="rmCopiar" data-id="' + esc(z._id) + '" data-k="copy">' + ICO_COPIAR + ' Copy</button>' : '') + (z.hashtags ? '<button class="btn ghost sm" data-act="rmCopiar" data-id="' + esc(z._id) + '" data-k="hashtags">' + ICO_COPIAR + ' Hashtags</button>' : '') + (z.copy && z.hashtags ? '<button class="btn ghost sm" data-act="rmCopiar" data-id="' + esc(z._id) + '" data-k="todo" title="Copy y hashtags juntos, listos para pegar">' + ICO_COPIAR + ' Todo</button>' : '') + '</span>' : '');
    const textos = (z, lineas, sinBotones) => { const hist = esHistoria(z), txt = z.copy || (hist ? z.contenido : '') || '', ab = st.abiertos.has(z._id);
      const largo = txt && (txt.length > lineas * 40 || txt.replace(/\n\s*\n/g, '\n').split('\n').length > lineas);
      return '<div class="rm-txt">' + (txt ? '<button class="rm-copy' + (ab ? ' abierto' : '') + '" style="-webkit-line-clamp:' + (ab ? 'unset' : lineas) + '" data-act="rmPieza" data-id="' + esc(z._id) + '">' + esc(ab ? txt : txt.replace(/\n\s*\n/g, '\n')) + '</button>' + (largo ? '<button class="rm-mas" data-act="rmVerMas" data-id="' + esc(z._id) + '" aria-expanded="' + ab + '">' + (ab ? 'Ver menos' : 'Ver más') + '</button>' : '') : '<button class="rm-copy vacio" data-act="rmPieza" data-id="' + esc(z._id) + '">' + (hist ? '+ Texto de la historia' : '+ Escribir el copy') + '</button>') +
        (z.hashtags ? '<p class="rm-hash">' + esc(z.hashtags) + '</p>' : '') +
        (sinBotones ? '' : cpsHtml(z)) + '</div>'; };
    const tags = (z, d) => '<div class="rm-tags">' + (d === null ? '<span class="rm-fpill">' + esc(z.formato) + '</span>' : '<select class="rm-fsel" data-pz="formato" data-id="' + esc(z._id) + '"' + d + ' aria-label="Formato">' + [...new Set([...fs, z.formato].filter(Boolean))].map(f => opt(f, f, z.formato)).join('') + '</select>') + (z.extra && !soloAds(z) ? '<span class="rm-extra" title="Fuera del plan">extra</span>' : '') + adsTag(z) + (z.fijo ? '<span class="rm-fijo" title="Se repite cada ' + esc(z.fijo) + '">↻ ' + esc(z.fijo) + '</span>' : '') + redBadges(z.red) + ((z.fuentes || []).length ? '<span class="rm-fu" title="Tiene ' + z.fuentes.length + ((z.fuentes.length === 1) ? ' fuente' : ' fuentes') + ' de la web">🔗 ' + z.fuentes.length + '</span>' : '') + '</div>';
    pedirThumbs(vis);
    if (!vis.length) return '<div class="rm-pl">' + tools + bulk + '<section class="sheet">' + emptyBox('No hay piezas con ese filtro', 'Cambiá los formatos en el filtro.') + '</section></div>';
    if (vista === 'tablero') return '<div class="rm-pl">' + tools + bulk + tablero(m, vis, can, qz) + '</div>';
    if (vista === 'cuadricula') {
      const agrupar = lista => { const gs = []; lista.forEach(z => { const k = semDe(z), g = gs[gs.length - 1]; if (g && g.k === k) g.zs.push(z); else gs.push({ k, zs: [z] }); }); return gs; };
      const feedV = vis.filter(z => !esHistoria(z)), histV = vis.filter(esHistoria);
      const carta = z => { const a = (z.arte || [])[0], t = a ? st.thumbs.get(a.path) : '';
        return '<article class="rm-pc' + (sel.has(z._id) ? ' sel' : '') + '" style="--fc:' + fmtColor(z.formato) + '">' +
          '<button class="rm-pc-a' + (t ? '' : ' ph') + '" data-act="rmPieza" data-id="' + esc(z._id) + '" aria-label="Abrir ' + esc(z.formato + ' ' + (z.tema || '')) + '">' + (t ? '<img src="' + esc(t) + '" alt="">' : '<span class="rm-pc-ph"><b>' + esc(z.formato) + '</b>' + (z.contenido ? '<span>' + esc(z.contenido.split('\n')[0].replace(/^[^:]{1,20}:\s*/, '')) + '</span>' : '') + '</span>') + '</button>' +
          (can ? '<input type="checkbox" class="rm-pc-sel" data-rmsel="' + esc(z._id) + '"' + (sel.has(z._id) ? ' checked' : '') + ' aria-label="Seleccionar">' : '') +
          '<div class="rm-pc-b"><div class="rm-pc-m">' + (z.fecha ? '<span class="rm-pc-d">' + esc(diaDe(z)) + (z.hora ? ' · ' + esc(z.hora) : '') + '</span>' : '<span class="rm-pc-d muted sf">Sin fecha</span>') + listoCtl(m, z, can) + '</div>' + tags(z, null) +
          '<b class="rm-pc-t" title="' + esc(z.tema || '') + '">' + esc(z.tema || 'Sin tema') + '</b>' + (st.rev && st.rev.mesId === m._id && st.rev.items.get(z._id) && !st.rev.items.get(z._id).aplicado ? '<button class="rv-badge" data-act="rmRevisar" data-id="' + esc(m._id) + '" title="Ver la revisión">' + ISO + ' ' + notaPill(st.rev.items.get(z._id).nota) + '</button>' : '') + textos(z, 4, true) + '<div class="rm-pc-bot">' + cpsHtml(z) + '<div class="rm-pc-f">' + quien(z, true) + '</div></div></div></article>'; };
      const bloque = (lista, cls) => agrupar(lista).map(g => '<div class="rm-semh"><h3>' + esc(g.k) + '</h3>' + (g.k === 'Sin fecha' ? agendaBtn : '') + '</div><div class="rm-pcs' + cls + '">' + g.zs.map(carta).join('') + '</div>').join('');
      return '<div class="rm-pl">' + tools + bulk + (feedV.length ? bloque(feedV, '') : '') + (histV.length ? histSep(histV.length) + bloque(histV, ' hist') : '') + '</div>';
    }
    const cols = can ? 7 : 6;
    let semPrev = null, histPrev = false;
    const fila = z => {
      const id = esc(z._id), d = can ? '' : ' disabled', sem = semDe(z), h = esHistoria(z);
      let cab = '';
      if (h && !histPrev) { cab += '<tr class="rm-hrow"><td colspan="' + cols + '">' + histSep(vis.filter(esHistoria).length) + '</td></tr>'; semPrev = null; }
      if (sem !== semPrev) cab += '<tr class="rm-sem"><td colspan="' + cols + '"><div class="rm-semr"><span>' + esc(sem) + '</span>' + (sem === 'Sin fecha' ? agendaBtn : '') + '</div></td></tr>';
      semPrev = sem; histPrev = h;
      return cab + '<tr class="rm-row ' + (sel.has(z._id) ? 'sel ' : '') + (z.estado === 'Cambios' ? 'cambios' : '') + '" style="--fc:' + fmtColor(z.formato) + '">' +
        (can ? '<td class="sel"><input type="checkbox" data-rmsel="' + id + '"' + (sel.has(z._id) ? ' checked' : '') + ' aria-label="Seleccionar"></td>' : '') +
        '<td class="rm-art">' + arteMini(z) + '</td>' +
        '<td class="rm-cuando">' + (z.fecha ? '<span class="rm-dia">' + esc(diaDe(z)) + '</span>' : '') + '<input class="in sm rm-fe" type="date" value="' + esc(z.fecha) + '" data-pz="fecha" data-id="' + id + '"' + d + ' aria-label="Fecha"><input class="in sm rm-ho" type="time" value="' + esc(z.hora) + '" data-pz="hora" data-id="' + id + '"' + d + ' aria-label="Hora"></td>' +
        '<td class="rm-tema">' + tags(z, d) + '<input class="in sm rm-tin" value="' + esc(z.tema) + '" placeholder="Tema" data-pz="tema" data-id="' + id + '"' + d + ' aria-label="Tema">' +
        (z.contenido && !esHistoria(z) ? '<div class="rm-cont" title="Qué va en la pieza">' + contenidoHtml(z.contenido) + '</div>' : '') + textos(z, 6) +
        (z.respuesta && z.estado === 'Cambios' ? '<span class="rm-resp-cli">“' + esc(z.respuesta.slice(0, 160)) + '”</span>' : '') + '</td>' +
        '<td>' + listoCtl(m, z, can) + '</td>' +
        '<td class="rm-qc">' + quien(z) + '</td>' +
        '<td><button class="btn ghost sm" data-act="rmPieza" data-id="' + id + '" aria-label="Abrir pieza">⋯</button></td></tr>';
    };
    return '<div class="rm-pl">' + tools + bulk + '<section class="sheet"><div class="tbl rm-tbl"><table><thead><tr>' + (can ? '<th class="sel"><input type="checkbox" data-rmselall="' + esc(m._id) + '" aria-label="Seleccionar las que se ven"></th>' : '') + '<th>Arte</th><th>Cuándo</th><th>Pieza</th><th>Etapa</th><th title="Según el rol de cada uno en la cuenta y el estado de la pieza">Le toca a</th><th></th></tr></thead><tbody>' +
      vis.map(fila).join('') + '</tbody></table></div></section></div>';
  }
  // Tablero: una columna por estado. Arrastrar a la columna siguiente = marcarla lista; hacia atrás = devolverla.
  function tablero(m, vis, can, qz) {
    const E = etapaDe(m), cols = ['Idea', 'En diseño', 'Cambios', 'Revisión interna', 'Para el cliente', 'Aprobada', 'Programada', 'Publicada'].filter(e => !['Cambios', 'Publicada'].includes(e) || vis.some(z => z.estado === e));
    const dia = z => z.fecha ? new Date(z.fecha + 'T12:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }).replace('.', '') + (z.hora ? ' · ' + z.hora : '') : 'Sin fecha';
    const carta = z => '<article class="rm-kc' + (z.lista ? ' lista' : '') + '"' + (can ? ' draggable="true" data-drag="' + esc(z._id) + '"' : '') + ' style="--fc:' + fmtColor(z.formato) + '">' +
      '<button class="rm-kc-a" data-act="rmPieza" data-id="' + esc(z._id) + '"><span class="rm-kc-m"><b>' + esc(z.formato) + '</b> · ' + esc(dia(z)) + '</span><span class="rm-kc-t">' + esc(z.tema || 'Sin tema') + '</span></button>' +
      '<div class="rm-kc-f">' + listoCtl(m, z, can) + ((qz.get(z._id) || {}).gente || []).map(a => av(a, fotoDe(a))).join('') + '</div></article>';
    return '<div class="rm-kb" role="list">' + cols.map(e => { const zs = vis.filter(z => z.estado === e).sort((a, b) => (a.lista ? 1 : 0) - (b.lista ? 1 : 0) || (a.fecha || '9').localeCompare(b.fecha || '9')), on = e === E.pz, nl = zs.filter(z => z.lista).length;
      return '<section class="rm-kcol' + (on ? ' on' : '') + '" data-drop="' + esc(e) + '" style="--c:var(' + (PZ_COLOR[e] || '--muted') + ')"><header><b>' + esc(pzNombre(e)) + '</b><span class="muted num">' + zs.length + (on && nl ? ' · ' + nl + ' listas' : '') + '</span></header><div class="rm-kcs">' + (zs.length ? zs.map(carta).join('') : '<p class="muted rm-kv">—</p>') + '</div></section>'; }).join('') + '</div>';
  }
  async function soltar(id, T) {
    const x = pzDe(id); if (!x) return; const { m, z } = x, E = etapaDe(m), S = z.estado; if (T === S) return;
    const iT = iPz(T), iS = iPz(S), l = lugar(m, z);
    if ((l === 'en' && iT === iEt(E) + 1) || (l === 'atras' && T === E.pz) || (l === 'en' && E.cliente && T === 'Aprobada')) {
      await marcarListas(m, [id], true);
      if (l === 'en' && !E.cliente && etapaDe(m) === E) toast('Quedó lista. Pasa a ' + ETAPAS[iEt(E) + 1].n + ' cuando estén todas.');
      return;
    }
    if (T === 'En diseño' || T === 'Cambios') { if (iS <= 1) return; const nota = await pedirNota(1); if (nota === null) return; await devolver(m, [id], nota); return; }
    if (!await confirmar('¿Pasar esta pieza a “' + pzNombre(T) + '” a mano? Saltea el flujo de la etapa.')) return;
    try { await data.piezasUpd([id], { estado: T, lista: false }); local(m._id, [id], { estado: T, lista: false }); render(); await revisarAvance(m); } catch (e) { toast(e.message); }
  }
  document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('[data-drag]'); if (!c) return; e.dataTransfer.setData('text/plain', c.dataset.drag); e.dataTransfer.effectAllowed = 'move'; c.classList.add('arr'); });
  document.addEventListener('dragend', e => { const c = e.target.closest && e.target.closest('[data-drag]'); if (c) c.classList.remove('arr'); document.querySelectorAll('.rm-kcol.sobre').forEach(x => x.classList.remove('sobre')); });
  document.addEventListener('dragover', e => { const c = e.target.closest && e.target.closest('[data-drop]'); if (!c) return; e.preventDefault(); document.querySelectorAll('.rm-kcol.sobre').forEach(x => { if (x !== c) x.classList.remove('sobre'); }); c.classList.add('sobre'); });
  document.addEventListener('drop', e => { const c = e.target.closest && e.target.closest('[data-drop]'); if (!c) return; e.preventDefault(); c.classList.remove('sobre'); const id = e.dataTransfer.getData('text/plain'); if (id) soltar(id, c.dataset.drop); });
  function arteMini(z) {
    const a = (z.arte || [])[0];
    if (!a) return isStaff() ? '<label class="rm-up" title="Subir arte"><input type="file" hidden data-rmup="' + esc(z._id) + '" multiple accept="image/*,video/*,application/pdf">⇪</label>' : '<span class="rm-sin">—</span>';
    const t = st.thumbs.get(a.path);
    return '<button class="rm-th" data-act="rmPieza" data-id="' + esc(z._id) + '" title="' + esc(a.nombre || '') + '">' + (t ? '<img src="' + esc(t) + '" alt="">' : '<span>' + (IMG.test(a.path) ? '…' : /\.(mp4|mov|m4v|webm)$/i.test(a.path) ? '▶' : '▣') + '</span>') + ((z.arte || []).length > 1 ? '<i>' + z.arte.length + '</i>' : '') + '</button>';
  }
  function pedirThumbs(ps) {
    const paths = []; ps.forEach(z => (z.arte || []).forEach(a => { if (a.path && IMG.test(a.path) && !st.thumbs.has(a.path) && !st.pidiendo.has(a.path)) paths.push(a.path); }));
    if (!paths.length) return;
    paths.forEach(p => st.pidiendo.add(p));
    for (let i = 0; i < paths.length; i += 25) {
      const lote = paths.slice(i, i + 25);
      data.dropbox({ accion: 'miniaturas', paths: lote }).then(r => { Object.entries(r.miniaturas || {}).forEach(([p, u]) => st.thumbs.set(p, u)); lote.forEach(p => { if (!st.thumbs.has(p)) st.thumbs.set(p, ''); }); render(); }, () => {});
    }
  }
  function calendario(m, ps) {
    const [y, mm] = m.mes.split('-').map(Number), first = new Date(y, mm - 1, 1), off = (first.getDay() + 6) % 7, n = diasMes(m.mes);
    let cells = '';
    for (let i = 0; i < off; i++) cells += '<div class="rm-cd vacia"></div>';
    for (let d = 1; d <= n; d++) {
      const f = fechaMes(m.mes, d), del = ps.filter(z => z.fecha === f).sort((a, b) => (a.hora || '').localeCompare(b.hora || ''));
      cells += '<div class="rm-cd' + (f === today() ? ' hoy' : '') + '"><span class="rm-cdn">' + d + '</span>' + del.map(z => '<button class="rm-cp" style="--c:var(' + (PZ_COLOR[z.estado] || '--muted') + ');--fc:' + fmtColor(z.formato) + '" data-act="rmPieza" data-id="' + esc(z._id) + '"><b>' + esc((z.hora ? z.hora + ' · ' : '') + z.formato) + '</b><span>' + esc(z.tema || 'Sin tema') + '</span></button>').join('') + '</div>';
    }
    const sin = ps.filter(z => !z.fecha);
    return '<section class="sheet"><div class="sheet-b"><div class="rm-cal"><div class="rm-dow">' + ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(x => '<span>' + x + '</span>').join('') + '</div><div class="rm-grid">' + cells + '</div></div>' +
      (sin.length ? '<p class="muted" style="margin:12px 0 6px">Sin fecha (' + sin.length + ')</p><div class="rm-sinf">' + sin.map(z => '<button class="rm-cp" style="--c:var(' + (PZ_COLOR[z.estado] || '--muted') + ');--fc:' + fmtColor(z.formato) + '" data-act="rmPieza" data-id="' + esc(z._id) + '"><b>' + esc(z.formato) + '</b><span>' + esc(z.tema || 'Sin tema') + '</span></button>').join('') + '</div>' : '') + '</div></section>';
  }
  function feed(m, ps) {
    const pubs = ps.filter(z => !/histori/i.test(z.formato)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '') || (b.hora || '').localeCompare(a.hora || ''));
    pedirThumbs(pubs);
    if (!pubs.length) return '<section class="sheet">' + emptyBox('No hay posteos ni reels este mes', 'El feed muestra cómo va a quedar la grilla de Instagram (las historias no aparecen).') + '</section>';
    return '<div class="rm-feedw"><p class="muted">Así queda la grilla, del más nuevo al más viejo. Las historias no se muestran.</p><div class="rm-feed">' + pubs.map(z => { const a = (z.arte || [])[0], t = a ? st.thumbs.get(a.path) : '';
      return '<button class="rm-fi" data-act="rmPieza" data-id="' + esc(z._id) + '">' + (t ? '<img src="' + esc(t) + '" alt="' + esc(z.tema) + '">' : '<span class="rm-fph"><b>' + esc(z.formato) + '</b>' + esc(z.tema || 'Sin tema') + '</span>') + '<span class="rm-fe2">' + (z.fecha ? '<span class="rm-fd">' + fmtShort(z.fecha) + '</span>' : '<span></span>') + pzPill(z.estado) + '</span>' + (/reel/i.test(z.formato) ? '<i class="rm-reel">▶</i>' : '') + '</button>'; }).join('') + '</div></div>';
  }

  /* ---------- Detalle de una pieza ---------- */
  function abrirPieza(id) {
    const m = meses().find(x => (piezas(x._id) || []).some(z => z._id === id)); if (!m) return;
    const z = piezas(m._id).find(x => x._id === id), can = isStaff(), d = can ? '' : ' disabled';
    st.fpz = { id, mesId: m._id }; S.form = null;
    pedirThumbs([z]);
    const artes = (z.arte || []).map((a, i) => { const t = st.thumbs.get(a.path); return '<div class="pz-a">' + (t ? '<img src="' + esc(t) + '" alt="">' : '<span class="pz-ai">' + (/\.(mp4|mov|m4v|webm)$/i.test(a.path) ? '▶' : '▣') + '</span>') + '<span class="pz-an">' + esc(a.nombre || a.path.split('/').pop()) + '</span><span class="pz-aa"><button type="button" class="btn ghost sm" data-act="rmArteVer" data-path="' + esc(a.path) + '">Abrir</button>' + (can ? '<button type="button" class="btn ghost sm" data-act="rmArteQuitar" data-i="' + i + '" aria-label="Quitar">✕</button>' : '') + '</span></div>'; }).join('');
    $('#panel').innerHTML = '<form id="pzform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(m.cliente) + ' · ' + esc(cap(monthLabel(m.mes))) + '</span><h2 id="panel-title">' + esc(z.formato || 'Pieza') + (z.fecha ? ' · ' + fmt(z.fecha) : '') + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b">' +
      (z.respuesta ? '<div class="pz-cli full"><b>' + (z.estado === 'Aprobada' ? '✓ El cliente la aprobó' : 'El cliente pidió cambios') + '</b><span>' + esc(z.respuesta) + '</span></div>' : '') +
      '<div class="field"><label for="pz-fecha">Fecha</label><input id="pz-fecha" type="date" value="' + esc(z.fecha) + '"' + d + '></div><div class="field"><label for="pz-hora">Hora</label><input id="pz-hora" type="time" value="' + esc(z.hora) + '"' + d + '></div>' +
      '<div class="field"><label for="pz-formato">Formato</label><select id="pz-formato"' + d + '>' + [...new Set([...formatos(), z.formato].filter(Boolean))].map(f => opt(f, f, z.formato)).join('') + '</select></div>' +
      '<div class="field full"><span class="lbl">Redes</span>' + redChips('pz-red', redesDe(z.red), redesCuenta(m.cliente), d, esc) + '</div>' +
      '<div class="field"><span class="lbl">Etapa · ' + esc(etapaDe(m).n) + '</span><div class="pz-et">' + listoCtl(m, z, can) + (can && iEt(etapaDe(m)) >= 2 && lugar(m, z) !== 'atras' && iPz(z.estado) < 6 ? '<button type="button" class="btn ghost sm" data-act="rmDevolverUno" data-id="' + esc(z._id) + '">Devolver a diseño</button>' : '') + '</div>' +
        '<details class="pz-man"><summary>Cambiar el estado a mano</summary><select id="pz-estado"' + d + '>' + ESTADOS_PIEZA.map(e => opt(e, pzNombre(e), z.estado)).join('') + '</select></details></div>' +
      '<div class="field"><label for="pz-resp">A cargo de esta pieza</label><select id="pz-resp"' + d + '>' + opt('', 'Según el flujo (el rol de cada etapa)', z.resp) + [...new Set([...personas(), z.resp].filter(Boolean))].map(a => opt(a, a + (equipo(m.cliente).get(a) ? ' · ' + equipo(m.cliente).get(a) : ''), z.resp)).join('') + '</select><span class="hint">Ahora le toca a ' + esc((q => q.gente.length ? q.gente.join(', ') : 'nadie') (quienes(m.cliente, z))) + '. Si elegís a alguien, reemplaza a los de su rol (p. ej. Cata en vez de Vale en el diseño).</span></div>' +
      '<div class="field full"><label for="pz-tema">Tema</label><div class="cp-box"><textarea id="pz-tema" class="pz-ta" rows="' + filas(z.tema, 60, 1, 4) + '"' + d + '>' + esc(z.tema) + '</textarea>' + copiarBtn('#pz-tema') + '</div>' + (can ? '<div class="pz-camb"><input id="pz-camb-q" class="in sm" placeholder="Opcional: qué querés en su lugar (otro tema, otra fuente…)"><button type="button" class="btn sm" data-act="rmCambiarIdea"><span class="pig" aria-hidden="true">' + ISO + '</span> Cambiar por otra idea</button></div>' : '') + '</div>' +
      (data.cols && data.cols.piezaContenido === false ? '' : '<div class="field full pz-cont' + (z.contenido ? ' ver' : '') + '"><div class="pz-lh"><label for="pz-contenido">' + (esHistoria(z) ? 'Texto de la historia' : 'Qué va en la pieza') + '</label>' + (z.contenido && can ? '<button type="button" class="btn ghost sm" data-act="rmContEditar">Editar</button>' : '') + '</div>' + (z.contenido ? '<div class="cp-box pz-cv">' + contenidoHtml(z.contenido) + copiarBtn('#pz-contenido') + '</div>' : '') + '<div class="cp-box pz-ce"><textarea id="pz-contenido" class="pz-ta" rows="' + filas(z.contenido, 60, 3, 40) + '" placeholder="' + esc(PH_CONT(z.formato)) + '"' + d + '>' + esc(z.contenido || '') + '</textarea>' + copiarBtn('#pz-contenido') + '</div>' + (can ? '<div class="toolbar pz-ia"><span class="hint" style="margin:0">Para quien diseña o graba.</span><button type="button" class="btn ghost sm" data-act="rmContUno"><span class="pig" aria-hidden="true">' + ISO + '</span> ' + (z.contenido ? 'Mejorar' : 'Escribir') + ' con Mr. Piggy</button></div>' : '<span class="hint">Para quien diseña o graba.</span>') + '</div>') +
      '<div class="field full"><label for="pz-copy">Copy</label><div class="cp-box"><textarea id="pz-copy" class="pz-ta" rows="' + filas(z.copy, 60, 5, 80) + '"' + d + '>' + esc(z.copy) + '</textarea>' + copiarBtn('#pz-copy') + '</div>' + (can ? '<div class="toolbar pz-ia"><span></span><button type="button" class="btn ghost sm" data-act="rmCopyUno"><span class="pig" aria-hidden="true">' + ISO + '</span> ' + (z.copy ? 'Mejorar' : 'Escribir') + ' el copy y los hashtags</button></div>' : '') + '</div>' +
      fuentesHtml(z, can) +
      '<div class="field full"><label for="pz-hashtags">Hashtags</label><div class="cp-box"><textarea id="pz-hashtags" class="pz-ta" rows="' + filas(z.hashtags, 60, 1, 4) + '"' + d + '>' + esc(z.hashtags) + '</textarea>' + copiarBtn('#pz-hashtags') + '</div></div>' +
      '<div class="field"><label for="pz-fijo">Se repite cada</label><select id="pz-fijo"' + d + '>' + opt('', 'No se repite', z.fijo) + DIAS.map(x => opt(x, x, z.fijo)).join('') + '</select><span class="hint">Al arrancar el mes siguiente se crea sola en ese día.</span></div>' +

      (z.ads || tieneAds(m.cliente) ? '<div class="field"><label for="pz-ads">Ads</label><select id="pz-ads"' + d + '>' + ADS_OPC.map(([k, l]) => opt(k, l, z.ads || '')).join('') + '</select><span class="hint">Si se diseñó aparte para los anuncios, va como “Solo para Ads”: no suma al plan ni como extra.</span></div>' : '') +
      '<label class="chk full"><input type="checkbox" id="pz-extra"' + (z.extra ? ' checked' : '') + d + '> Extra (fuera del plan)</label>' +
      (z.extra && !soloAds(z) && !(data.cols && data.cols.piezaExtraCobro === false) ? '<div class="field full"><label for="pz-xcobro">¿Esta extra se cobra?</label><select id="pz-xcobro"' + d + '>' + opt('', xCfg(m.cliente).admin ? 'Según la cuenta (' + (xCfg(m.cliente).cobro ? 'las extras se cobran' : 'las extras van sin cargo') + ')' : 'Según lo arreglado con la cuenta', z.extraCobro || '') + opt('si', 'Sí, se cobra', z.extraCobro || '') + opt('no', 'No, sin cargo (de onda)', z.extraCobro || '') + '</select></div>' : '') +
      '<div class="field full"><span class="lbl">Arte</span><div class="pz-artes">' + (artes || '<span class="muted">Sin arte todavía.</span>') + '</div>' + (can ? '<label class="btn sm" style="margin-top:8px;justify-self:start">Subir arte a Dropbox<input type="file" hidden data-rmup="' + esc(z._id) + '" multiple accept="image/*,video/*,application/pdf"></label>' : '') + '</div>' +
      versionesHtml(z, can) +
      '<div class="full">' + hil().html('pieza', z._id, { cliente: m.cliente, titulo: 'Comentarios', compacto: true, publico: true }) + '</div>' +
      '</div><div class="panel-f"><span>' + (can ? '<button type="button" class="btn ghost danger" data-act="rmPiezaBorrar">Borrar</button>' : '') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">' + (can ? 'Cancelar' : 'Cerrar') + '</button>' + (can ? '<button type="submit" class="btn primary">Guardar</button>' : '') + '</span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false; requestAnimationFrame(() => document.querySelectorAll('#pzform .pz-ta').forEach(autoAlto));
  }
  // Los campos de texto de la pieza crecen con el contenido: el copy se lee entero haciendo scroll en el panel.
  const autoAlto = ta => { if (!ta || !ta.offsetParent) return; ta.style.height = 'auto'; ta.style.height = (ta.scrollHeight + 2) + 'px'; };
  document.addEventListener('input', e => { if (e.target && e.target.classList && e.target.classList.contains('pz-ta')) autoAlto(e.target); });
  async function guardarPieza() {
    const f = st.fpz; if (!f) return;
    const g = k => ($('#pz-' + k) || {}).value;
    const rs = [...document.querySelectorAll('#pz-red input:checked')].map(i => i.value);
    const u = { fecha: g('fecha') || '', hora: g('hora') || '', formato: g('formato'), red: rs.join(', '), estado: g('estado'), resp: g('resp') || '', tema: (g('tema') || '').trim(), copy: (g('copy') || '').trim(), ...($('#pz-contenido') ? { contenido: (g('contenido') || '').trim() } : {}), hashtags: (g('hashtags') || '').trim(), fijo: g('fijo') || '', extra: $('#pz-extra').checked };
    if ($('#pz-ads')) { u.ads = g('ads') || ''; if (u.ads === 'solo') u.extra = false; }
    if ($('#pz-xcobro')) u.extraCobro = g('xcobro') || '';
    if (!u.extra) u.extraCobro = '';
    const z0 = (piezas(f.mesId) || []).find(x => x._id === f.id);
    const uv = f.ia && z0 ? conVersion(z0, u, 'Mr. Piggy (desde la pieza)') : u;
    try { await data.piezasUpd([f.id], uv); local(f.mesId, [f.id], uv); ctx.closeForm(); toast('Pieza guardada'); render(); }
    catch (e) { toast(e.message); }
  }
  function local(mesId, ids, u) { const ps = piezas(mesId) || []; ps.forEach(z => { if (ids.includes(z._id)) Object.assign(z, u); }); }

  /* ---------- Flujo: una sola etapa por mes ---------- */
  // El mes está en UNA etapa y se maneja desde el encabezado. Planificación se pasa entera (la revisa quien planifica);
  // en las demás cada pieza se marca "lista" y, cuando están todas, el mes pasa solo a la siguiente y se avisa a quien le toca.
  // Con el cliente: cada pieza la aprueba el cliente (o el equipo por él); las que piden cambios vuelven a diseño solas.
  const ETAPAS = [
    { mes: 'Planificación', pz: 'Idea', n: 'Planificación', general: true },
    { mes: 'Producción', pz: 'En diseño', n: 'Diseño', verbo: 'Diseñar' },
    { mes: 'Revisión interna', pz: 'Revisión interna', n: 'Revisión', verbo: 'Revisar' },
    { mes: 'Con el cliente', pz: 'Para el cliente', n: 'Cliente', cliente: true },
    { mes: 'Aprobado', pz: 'Aprobada', n: 'Programación', verbo: 'Programar' },
    { mes: 'Programado', pz: 'Programada', n: 'Publicación', verbo: 'Controlar la publicación de' },
    { mes: 'Cerrado', pz: 'Publicada', n: 'Cerrado' }];
  const etapaDe = m => ETAPAS.find(e => e.mes === m.estado) || ETAPAS[0];
  const iEt = e => ETAPAS.indexOf(e);
  const iPz = estado => estado === 'Cambios' ? 1 : Math.max(0, ETAPAS.findIndex(e => e.pz === estado));
  // Dónde está la pieza respecto de la etapa del mes: 'atras' (volvió o quedó atrás), 'en' (en la etapa) o 'adelante'
  const lugar = (m, z) => { const i = iEt(etapaDe(m)), j = iPz(z.estado); return z.estado === 'Cambios' || j < i ? 'atras' : j > i ? 'adelante' : 'en'; };
  const hecha = (m, z) => { const l = lugar(m, z); return l === 'adelante' || (l === 'en' && !etapaDe(m).cliente && !!z.lista); };
  const avance = (m, ps) => { const t = ps.length, h = ps.filter(z => hecha(m, z)).length; return { t, h, todo: t > 0 && h === t }; };
  const sinLista = () => data.cols && data.cols.piezaLista === false;
  // Marca piezas como listas (o las desmarca). Las que habían quedado atrás vuelven a la etapa del mes.
  async function marcarListas(m, ids, valor) {
    if (sinLista()) { toast('Para marcar piezas listas falta correr el SQL 0036 en Supabase.'); return; }
    const E = etapaDe(m), ps = piezas(m._id) || [], grupos = new Map();
    ps.filter(z => ids.includes(z._id)).forEach(z => {
      const l = lugar(m, z); let u = null;
      if (l === 'atras' && valor) u = { estado: E.cliente ? 'Para el cliente' : E.pz, lista: false };
      else if (l === 'en' && E.cliente) u = { estado: valor ? 'Aprobada' : 'Para el cliente' };
      else if (l === 'en' && !E.general) u = { lista: !!valor };
      if (!u) return; const k = JSON.stringify(u); grupos.set(k, [...(grupos.get(k) || []), z._id]);
    });
    if (!grupos.size) return;
    try { for (const [k, xs] of grupos) { const u = JSON.parse(k); await data.piezasUpd(xs, u); local(m._id, xs, u); } } catch (e) { toast(e.message); render(); return; }
    render(); await revisarAvance(m);
  }
  // Si están todas, el mes pasa a la etapa siguiente (las piezas también) y se avisa. Revisión → cliente pregunta antes de mandar.
  async function revisarAvance(m) {
    const E = etapaDe(m), ps = piezas(m._id) || [], a = avance(m, ps);
    if (E.general || !a.todo || iEt(E) >= ETAPAS.length - 1) return;
    if (E.mes === 'Revisión interna') {
      if (await confirmar('Está todo revisado. ¿Lo mandamos al cliente ahora? Se publica en su portal y le avisamos.')) { await enviarMes(m, true); return; }
      const q = quienes(m.cliente, { estado: 'Para el cliente', formato: '', resp: '' });
      if (q.gente.length) { try { await data.avisarEquipo(q.gente, 'redes', m.cliente + ': todo revisado, listo para mandar al cliente', cap(monthLabel(m.mes)), '#redes/' + m._id); } catch (e) { /* el aviso no frena */ } }
      toast('Todo revisado. Quedó listo para mandar al cliente' + (q.gente.length ? ' (avisé a ' + q.gente.join(', ') + ')' : '') + '.'); return;
    }
    const N = ETAPAS[iEt(E) + 1], ids = ps.filter(z => lugar(m, z) === 'en').map(z => z._id), antes = m.estado;
    try {
      if (ids.length && !E.cliente) { await data.piezasUpd(ids, { estado: N.pz, lista: false }); local(m._id, ids, { estado: N.pz, lista: false }); }
      await data.mesUpd(m._id, { estado: N.mes }); m.estado = N.mes;
    } catch (e) { toast(e.message); return; }
    const q = quienes(m.cliente, { estado: N.pz, formato: '', resp: '' }); let av = 0;
    if (q.gente.length) { try { const r = await data.avisarEquipo(q.gente, 'redes', m.cliente + ': te toca ' + N.n.toLowerCase(), cap(monthLabel(m.mes)) + ' · ' + ps.length + ' piezas pasaron a ' + N.n, '#redes/' + m._id); av = r === false ? -1 : r; } catch (e) { /* el aviso no frena */ } }
    render();
    const txt = 'Todo listo en ' + E.n + ': el mes pasó a ' + N.n + (av > 0 ? ' y le avisé a ' + q.gente.join(', ') : av === -1 ? ' (para avisar falta correr el SQL 0035)' : '');
    if (ctx.toastAccion) ctx.toastAccion(txt, 'Deshacer', async () => { if (ids.length && !E.cliente) { await data.piezasUpd(ids, { estado: E.pz, lista: true }); local(m._id, ids, { estado: E.pz, lista: true }); } await data.mesUpd(m._id, { estado: antes }); m.estado = antes; render(); }, 12000); else toast(txt);
  }
  // Devolver piezas a diseño (desde revisión o con el cliente), con un comentario para quien diseña.
  async function devolver(m, ids, nota) {
    try { await data.piezasUpd(ids, { estado: 'En diseño', lista: false }); local(m._id, ids, { estado: 'En diseño', lista: false }); } catch (e) { toast(e.message); return; }
    const q = quienes(m.cliente, { estado: 'En diseño', formato: '', resp: '' }), temas = (piezas(m._id) || []).filter(z => ids.includes(z._id)).map(z => z.tema).filter(Boolean);
    if (q.gente.length) { try { await data.avisarEquipo(q.gente, 'redes', m.cliente + ': ' + (ids.length === 1 ? 'una pieza volvió' : ids.length + ' piezas volvieron') + ' a diseño', (temas.slice(0, 3).join(' · ') + (nota ? ' — ' + nota : '')).slice(0, 400), '#redes/' + m._id); } catch (e) { /* sigue */ } }
    render(); toast((ids.length === 1 ? 'Volvió' : 'Volvieron') + ' a diseño' + (q.gente.length ? '; le avisé a ' + q.gente.join(', ') : ''));
  }
  // Control de la pieza según la etapa: "Marcar lista" / "✓ Lista", o el estado si va adelantada.
  function listoCtl(m, z, can) {
    const E = etapaDe(m), l = lugar(m, z), id = esc(z._id);
    if (E.general || l === 'adelante' || iEt(E) >= ETAPAS.length - 1) return pzPill(l === 'adelante' || E.general ? z.estado : z.estado);
    if (l === 'atras') return '<span class="rm-lc">' + pzPill(z.estado === 'Cambios' ? 'Cambios' : z.estado) + (can ? '<button class="rm-ok" data-act="rmListo" data-id="' + id + '" data-v="1" title="Ya está: vuelve a ' + esc(E.n) + '">Lista</button>' : '') + '</span>';
    if (E.cliente) return '<span class="rm-lc"><span class="pzst" style="--c:var(--s-revision)">Para aprobar</span>' + (can ? '<button class="rm-ok" data-act="rmListo" data-id="' + id + '" data-v="1" title="El cliente la aprobó por otro medio">Aprobó</button>' : '') + '</span>';
    return can ? '<button class="rm-ok' + (z.lista ? ' on' : '') + '" data-act="rmListo" data-id="' + id + '" data-v="' + (z.lista ? '0' : '1') + '" title="' + (z.lista ? 'Desmarcar' : 'Marcar lista en ' + esc(E.n)) + '">' + (z.lista ? '✓ Lista' : 'Marcar lista') + '</button>' : (z.lista ? '<span class="pzst" style="--c:var(--ok)">✓ Lista</span>' : pzPill(z.estado));
  }
  // Las etapas del mes, en una línea, con el avance de la actual.
  function etapasHtml(m, ps, can) {
    const E = etapaDe(m), i = iEt(E), a = avance(m, ps);
    const AYUDA = { 'Planificación': 'Se arma el contenido del mes y se pasa entero a Diseño.', 'Producción': 'Cada pieza se marca lista; cuando están todas, pasa sola a Revisión y avisa.', 'Revisión interna': 'Se revisa cada pieza (o se devuelve a diseño); con todo revisado, se manda al cliente.', 'Con el cliente': 'El cliente aprueba cada pieza en su portal; las que piden cambios vuelven a diseño.', 'Aprobado': 'Se programa cada pieza; cuando están todas, pasa a Publicación.', 'Programado': 'Se controla que cada pieza salga publicada.' };
    const pasos = ETAPAS.slice(0, ETAPAS.length - 1).map((e, k) => '<span class="rm-et' + (k < i ? ' ok' : k === i ? ' on' : '') + '" title="' + esc(e.n + ': ' + (AYUDA[e.mes] || '')) + '">' + (k < i ? '✓ ' : '') + esc(e.n) + '</span>').join('<i aria-hidden="true">›</i>');
    let acc = '';
    if (E.general && ps.length && can) acc = '<button class="btn sm primary" data-act="rmPasar" data-id="' + esc(m._id) + '" data-de="Idea">Planificación lista · pasar a Diseño →</button>';
    else if (!E.general && i < ETAPAS.length - 1 && ps.length) acc = '<span class="rm-prog" title="' + (E.cliente ? 'Aprobadas por el cliente' : 'Marcadas listas') + '"><b>' + a.h + '/' + a.t + '</b> ' + (E.cliente ? 'aprobadas' : 'listas') + '<span class="rm-pbar"><i style="width:' + (a.t ? Math.round(a.h / a.t * 100) : 0) + '%"></i></span></span>' + (can && !E.cliente && a.h < a.t ? '<button class="btn ghost sm" data-act="rmListoTodas" data-id="' + esc(m._id) + '">Marcar todas listas</button>' : '');
    else if (i === ETAPAS.length - 1) acc = '<span class="muted">Mes cerrado</span>';
    return '<div class="rm-etapas" role="list" aria-label="Etapa del mes">' + pasos + '</div>' + acc;
  }

  /* ---------- Acciones ---------- */
  // Deshacer un mes arrancado por error (o borrarlo después): se va el mes con sus piezas. La carpeta de Dropbox, si se creó, queda.
  async function borrarMes(m, silencioso) {
    await data.mesDel(m._id);
    const i = (S.RM || []).findIndex(x => x._id === m._id); if (i >= 0) S.RM.splice(i, 1);
    P.delete(m._id); st.sel.clear();
    if (S.rmFicha === m._id) ctx.irMes(null); else render();
    if (!silencioso) toast('Listo: se borró ' + monthLabel(m.mes) + ' de ' + m.cliente);
  }
  const ofrecerDeshacer = (msg, meses) => { if (ctx.toastAccion) ctx.toastAccion(msg, 'Deshacer', async () => { try { for (const m of meses) await borrarMes(m, true); toast(meses.length > 1 ? 'Se deshicieron ' + meses.length + ' meses' : 'Deshecho'); } catch (e) { toast(e.message); } }); else toast(msg); };
  async function arrancar(cliente, mes, base) {
    const ab = abonoRedes(cliente);
    const plan = base ? { ...(base.plan || {}) } : planDeAbono(ab);
    const m = await data.mesCrear({ cliente, mes, abonoId: ab ? ab._id : null, plan, resp: base && base.resp ? base.resp : respMes(cliente, ab), estado: 'Planificación' });
    S.RM = [...meses(), m];
    // Las piezas fijas (las que se repiten un día de la semana) se crean solas.
    let nuevas = [];
    if (base) {
      const bp = piezas(base._id) || (await data.piezasDe([base._id]));
      const fijas = bp.filter(z => z.fijo);
      const vistas = new Set();
      fijas.forEach(z => { const k = z.fijo + '|' + z.formato + '|' + norm(z.tema); if (vistas.has(k)) return; vistas.add(k);
        const dow = DIAS.indexOf(z.fijo); for (let d = 1; d <= diasMes(mes); d++) { const f = fechaMes(mes, d); if (new Date(f + 'T12:00').getDay() === dow) nuevas.push({ formato: z.formato, red: z.red, tema: z.tema, contenido: z.contenido || '', hashtags: z.hashtags, hora: z.hora, fecha: f, fijo: z.fijo, resp: z.resp, estado: 'Idea' }); } });
    }
    const ins = nuevas.length ? await insPiezas(m, nuevas) : [];
    P.set(m._id, ins);
    if (cfgGet && cfgGet('dropbox', 'crear') === 'si') data.dropbox({ accion: 'carpeta_mes', mes_id: m._id }).then(r => { m.carpeta = r.carpeta; m.carpetaUrl = r.carpeta_url; render(); }, () => {});
    return m;
  }
  async function contar(m, silencio) {
    try { const r = await data.dropbox({ accion: 'contar', mes_id: m._id }); if (r.conteo) { m.conteo = r.conteo; m.conteoAt = new Date().toISOString(); render(); if (!silencio) toast('Carpeta actualizada'); } }
    catch (e) { if (!silencio) toast(e.message); }
  }
  async function subir(input) {
    const id = input.dataset.rmup, files = [...input.files]; input.value = '';
    const m = meses().find(x => (piezas(x._id) || []).some(z => z._id === id)); if (!m || !files.length) return;
    const z = piezas(m._id).find(x => x._id === id);
    const nuevos = [];
    for (const f of files) {
      toast('Subiendo ' + f.name + '…');
      try {
        let path = null;
        try {
          const r = await data.dropbox({ accion: 'subida', destino: 'pieza', id, nombre: f.name });
          const up = await fetch(r.link, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: f });
          if (!up.ok) throw new Error('Dropbox no aceptó el archivo (' + up.status + ')');
          const meta = await up.json().catch(() => ({})); path = meta.path_display || r.path;
        } catch (e1) {
          if (f.size > 6e6) throw e1;
          const b64 = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = no; fr.readAsDataURL(f); });
          path = (await data.dropbox({ accion: 'subir', destino: 'pieza', id, nombre: f.name, base64: b64 })).path;
        }
        nuevos.push({ path, nombre: f.name, tipo: f.type, tam: f.size });
      } catch (e) { toast(f.name + ': ' + e.message); }
    }
    if (!nuevos.length) return;
    const arte = [...(z.arte || []), ...nuevos];
    try { await data.piezasUpd([id], { arte }); z.arte = arte; toast(nuevos.length === 1 ? 'Arte subido' : nuevos.length + ' archivos subidos'); render(); if (st.fpz && st.fpz.id === id) abrirPieza(id); contar(m, true); }
    catch (e) { toast(e.message); }
  }
  // Mr. Piggy propone lo que falta del plan, en dos pasos:
  // 1) el plan: qué pieza, qué día y qué va en cada una. A veces devuelve menos (o más) de lo pedido: se cuenta por formato,
  //    se le pide de nuevo lo que falta (hasta 2 veces más) y se descarta lo que sobra. Cada pieza sale con la hora de su formato.
  // 2) los copys y hashtags, de a tandas chicas y en paralelo (escribe mejor y no se corta). Las historias no llevan copy.
  const ctxIA = (m, extra) => { const cli = S.C.find(x => x.nombre === m.cliente) || {}, prev = mesCliente(m.cliente, addMonth(m.mes, -1)), pp = prev ? (piezas(prev._id) || []) : [];
    return { cliente: m.cliente, ...(ctx.marcaCtx ? ctx.marcaCtx(m.cliente, [...pp, ...(piezas(m._id) || [])]) : {}), notas_cliente: cli.notas || '', servicios: ctx.servicios ? ctx.servicios(m.cliente) : '', mes: m.mes, formatos: formatos(), plan: m.plan || {}, notas_del_mes: m.notas, redes: redesCuenta(m.cliente), ...(extra || {}), _pp: pp }; };
  const esHistoria = z => /histori|stor/i.test(z.formato || '');
  const trabajando = (m, txt) => { if (txt) st.ia[m._id] = txt; else delete st.ia[m._id]; render(); };
  // Si la IA no dio fecha, se reparten las piezas de cada formato a lo largo del mes.
  function repartirFechas(m, ps, nuevas) {
    const n = diasMes(m.mes), porF = {};
    nuevas.filter(z => !z.fecha).forEach(z => { (porF[z.formato] = porF[z.formato] || []).push(z); });
    Object.values(porF).forEach(lista => lista.forEach((z, i) => { const d = Math.min(n, Math.max(1, Math.round((i + 0.5) * n / lista.length))); z.fecha = fechaMes(m.mes, d); z.hora = horaLibre([...ps, ...nuevas.filter(y => y !== z && y.fecha)], z.fecha, z.formato, m.cliente); }));
  }
  // Antes de proponer: dónde se publica (replicar en las redes de la cuenta) y si se buscan fechas y novedades en la web.
  function abrirProponer(m) {
    const ps = piezas(m._id) || [], plan = m.plan || {}, cnt = conteoPorFormato(ps);
    const faltan = Object.entries(plan).map(([f, n]) => [f, Math.max(0, (+n || 0) - (cnt[f] || 0))]).filter(([, n]) => n > 0);
    const inv = m.investigacion, nInv = inv ? (inv.fechas || []).filter(x => x.usar !== false).length + (inv.novedades || []).filter(x => x.usar !== false).length : 0;
    $('#panel').innerHTML = '<form id="rmprop" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(m.cliente) + ' · ' + esc(cap(monthLabel(m.mes))) + '</span><h2 id="panel-title"><span class="pig" aria-hidden="true">' + ISO + '</span> Proponer contenido</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><div class="field full prop-f"><span class="lbl">Qué va a proponer</span>' + (faltan.length ? '<div class="prop-fs">' + faltan.map(([f, n]) => '<span class="rm-fpill" style="--fc:' + fmtColor(f) + '">' + n + ' ' + esc(f) + '</span>').join('') + '</div><span class="hint">Lo que falta para completar el plan del mes.</span>' : '<p class="muted" style="margin:0">El plan del mes ya está completo: propone 3 ideas extra.</p>') + '</div>' +
      replChips(m, 'prop-redes') +
      '<label class="chk full"><input type="checkbox" id="prop-web"' + (inv ? '' : ' checked') + '> ' + (inv ? 'Volver a buscar fechas y novedades en la web (ya hay ' + nInv + ' elegidas)' : 'Buscar antes fechas del mes y novedades del rubro en la web') + '</label>' +
      (inv ? '<button type="button" class="btn link sm full" style="justify-self:start" data-act="rmInv" data-id="' + esc(m._id) + '">Ver las fechas y novedades elegidas</button>' : '') +
      '</div><div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary"><span class="pig" aria-hidden="true">' + ISO + '</span> Proponer</button></span></div></form>';
    st.propMes = m._id; $('#panel').hidden = false; $('#scrim').hidden = false;
  }
  // Las fuentes que usó una pieza: solo URLs que estén en las fechas y novedades buscadas (con su título)
  function fuentesDe(m, urls) {
    const inv = m.investigacion || {}, todo = [...(inv.fechas || []).map(x => ({ titulo: x.nombre, url: x.fuente })), ...(inv.novedades || []).map(x => ({ titulo: x.titulo, url: x.fuente }))].filter(x => x.url);
    return [...new Set((Array.isArray(urls) ? urls : []).map(String))].map(u => todo.find(x => x.url === u) || (/^https?:\/\//.test(u) ? { titulo: '', url: u } : null)).filter(Boolean).slice(0, 5);
  }
  const dominio = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch (e) { return u; } };
  // En el copy se cita el medio, corto ("Fuente: La Nación"), no el título de la nota.
  const MEDIOS = [[/lanacion\.com\.ar$/, 'La Nación'], [/clarin\.com$/, 'Clarín'], [/infobae\.com$/, 'Infobae'], [/pagina12\.com\.ar$/, 'Página/12'], [/perfil\.com$/, 'Perfil'], [/ambito\.com$/, 'Ámbito'], [/cronista\.com$/, 'El Cronista'],
    [/lavoz\.com\.ar$/, 'La Voz'], [/infocampo\.com\.ar$/, 'Infocampo'], [/bcr\.com\.ar$/, 'Bolsa de Comercio de Rosario'], [/bccba\.org\.ar$|bccba\.com\.ar$/, 'Bolsa de Cereales de Córdoba'], [/argentina\.gob\.ar$|argentina\.ar$/, 'Gobierno de Argentina'],
    [/cba\.gov\.ar$|cordoba\.gob\.ar$/, 'Gobierno de Córdoba'], [/iprofesional\.com$/, 'iProfesional'], [/eldiarioar\.com$/, 'elDiarioAR'], [/tn\.com\.ar$/, 'TN'], [/lanueva\.com$/, 'La Nueva'], [/losandes\.com\.ar$/, 'Los Andes'],
    [/(^|\.)uba\.ar$/, 'UBA'], [/(^|\.)unc\.edu\.ar$/, 'UNC'], [/indec\.gob\.ar$/, 'INDEC'], [/agroempresario\.com$/, 'Agroempresario'], [/valorlocal\.com\.ar$/, 'Valor Local']];
  const medioDe = u => { const d = dominio(u); const m = MEDIOS.find(([re]) => re.test(d)); return m ? m[1] : d; };
  const citaDe = f => 'Fuente: ' + medioDe(f.url);
  async function ideas(btn, m, opts) {
    if (st.ia[m._id]) return;
    opts = opts || {};
    const redesP = opts.redes || replicaDe(m);
    const ps = piezas(m._id) || [], plan = m.plan || {}, cnt = conteoPorFormato(ps);
    const faltan = Object.fromEntries(Object.entries(plan).map(([f, n]) => [f, Math.max(0, (+n || 0) - (cnt[f] || 0))]).filter(([, n]) => n > 0));
    const extras = !Object.keys(faltan).length;
    if (extras && !opts.confirmado && !await confirmar('El plan del mes ya está completo. ¿Querés que Mr. Piggy proponga ideas extra igual?')) return;
    trabajando(m, 'Mr. Piggy está armando el plan…');
    let ins = [];
    // Primero las fechas y novedades del mes (búsqueda web), si todavía no se buscaron. Si falla, sigue sin ellas.
    if (opts.buscar === true || (opts.buscar !== false && !m.investigacion && !st.invFallo)) { trabajando(m, 'Buscando fechas y novedades del mes…'); try { await investigar(m); } catch (e) { st.invFallo = true; toast('No pude buscar en la web (' + e.message + '). Sigo sin fechas ni novedades.'); } trabajando(m, 'Mr. Piggy está armando el plan…'); }
    try {
      const fmtDe = x => formatos().includes(x) ? x : (formatos().find(f => norm(f).startsWith(norm(x || '').slice(0, 4))) || formatos()[0]);
      const pide = extras ? { _: 3 } : { ...faltan }, nuevas = [];
      const resta = () => Object.entries(pide).filter(([, n]) => n > 0);
      for (let vuelta = 0; vuelta < 3 && resta().length; vuelta++) {
        const lista = resta().map(([f, n]) => n + ' ' + f).join(', '), total = resta().reduce((a, [, n]) => a + n, 0);
        const texto = extras ? 'Proponé 3 ideas extra.' : (vuelta ? 'Todavía faltan piezas: proponé exactamente ' + lista + ' (' + total + ' en total), distintas a las que ya hay.' : 'Proponé exactamente estas piezas que faltan, ni más ni menos: ' + lista + ' (' + total + ' en total). Contá las de cada formato antes de responder.');
        const c = ctxIA(m); const pp = c._pp; delete c._pp;
        const inv = invElegidas(m);
        const r = await data.ia({ modo: 'redes_ideas', texto, contexto: { ...c, redes: redesP, ...(inv ? { fechas_y_novedades: inv } : {}), ya_cargadas: [...ps, ...nuevas].map(z => ({ fecha: z.fecha, formato: z.formato, tema: z.tema })), mes_anterior: pp.slice(0, 60).map(z => ({ formato: z.formato, tema: z.tema })) } });
        let llegaron = 0;
        for (const x of (Array.isArray(r.piezas) ? r.piezas : []).filter(x => x && x.tema)) {
          const formato = fmtDe(x.formato), k = extras ? '_' : formato;
          if (!(pide[k] > 0)) continue; // lo que sobra no se carga
          if (nuevas.some(z => norm(z.tema) === norm(String(x.tema)))) continue;
          const fecha = /^\d{4}-\d{2}-\d{2}$/.test(x.fecha || '') && String(x.fecha).startsWith(m.mes) ? x.fecha : '';
          nuevas.push({ formato, red: redesPara(formato, redesP).join(', '), fuentes: fuentesDe(m, x.fuentes), tema: String(x.tema).slice(0, 160), contenido: String(x.contenido || '').slice(0, 3000), copy: '', hashtags: '', fecha, hora: fecha ? horaLibre([...ps, ...nuevas], fecha, formato, m.cliente) : '', estado: 'Idea', extra: extras });
          pide[k]--; llegaron++;
        }
        if (!llegaron) break;
        if (resta().length) trabajando(m, 'Faltaron algunas, le pido el resto…');
      }
      if (!nuevas.length) { toast('Mr. Piggy no propuso nada. Probá de nuevo.'); trabajando(m, null); return; }
      // Todo lo que el equipo eligió en "Fechas y novedades" tiene que tener pieza: lo que quedó afuera reemplaza ideas genéricas.
      let cubiertas = 0;
      const faltanInv = sinPieza(m, [...ps, ...nuevas]);
      if (faltanInv.length) {
        try {
          trabajando(m, 'Sumando lo elegido que quedó afuera…');
          for (const z of await piezasPara(m, faltanInv, [...ps, ...nuevas], redesP)) {
            const gen = [...nuevas].reverse().find(y => y.formato === z.formato && !(y.fuentes || []).length && !y._cubre);
            if (gen) nuevas.splice(nuevas.indexOf(gen), 1, { ...z, extra: gen.extra, _cubre: true });
            else nuevas.push({ ...z, extra: true, _cubre: true });
            cubiertas++;
          }
        } catch (e) { /* sigue con lo que hay */ }
        nuevas.forEach(z => { delete z._cubre; });
      }
      repartirFechas(m, ps, nuevas);
      nuevas.forEach((z, i) => { z._id = 'nueva' + i; });
      const quedan = extras ? [] : resta();
      // 2) día y hora de cada pieza, pensados para la cuenta (si falla, quedan las fechas repartidas y la hora del formato)
      let agendo = false;
      try {
        trabajando(m, 'Eligiendo días y horarios…');
        const r = await agendaIA(m, [...ps, ...nuevas], nuevas);
        r.piezas.forEach(x => { const z = nuevas.find(y => y._id === x.id); if (z) { z.fecha = x.fecha; z.hora = x.hora; } });
        agendo = r.piezas.length > 0;
        if (agendo && !horariosCuenta(m.cliente)) { try { await guardarHorarios(m, r); } catch (e) { /* sigue igual */ } }
      } catch (e) { /* quedan las fechas repartidas */ }
      // 3) copys y hashtags (las historias no llevan: su texto va en la pieza). Se escriben antes de guardar: las piezas aparecen completas.
      let n = 0, fallo = null;
      const conCopy = nuevas.filter(z => !esHistoria(z));
      if (conCopy.length) {
        const res = await copysIA(m, conCopy, (h, t) => trabajando(m, 'Escribiendo copys ' + h + '/' + t + '…'));
        fallo = res.fallo;
        res.hechos.forEach((u, id) => { const z = nuevas.find(y => y._id === id); if (z) { Object.assign(z, u); n++; } });
      }
      // 4) se guarda todo junto
      trabajando(m, 'Guardando…');
      ins = await insPiezas(m, nuevas.map(({ _id, ...z }) => z)); P.set(m._id, [...ps, ...ins]);
      trabajando(m, null);
      toast('Mr. Piggy armó ' + ins.length + ' piezas' + (n ? ', con ' + n + ' copys y sus hashtags' : '') + (agendo ? ', día y horario para cada una' : '') + '. Quedaron en “Planificación”: revisalas.' + (conCopy.length > n ? ' ' + (conCopy.length - n) + ' quedaron sin copy' + (fallo ? ' (' + fallo.message + ')' : '') + ': seleccionalas y tocá “Escribir copys”.' : '') + (quedan.length ? ' Faltaron ' + quedan.map(([f, k]) => k + ' ' + f).join(', ') + '.' : '') + (cubiertas ? ' Sumó ' + cubiertas + ' de las fechas y novedades elegidas que habían quedado afuera.' : ''));
    } catch (e) { toast(e.message); trabajando(m, null); }
  }
  // Escribe copys y hashtags (sin guardar): de a 4 piezas por pedido, 3 pedidos a la vez. Devuelve { hechos: Map id → cambios, fallo }.
  async function copysIA(m, lista, avance) {
    const c = ctxIA(m); delete c._pp; delete c.plan;
    const hechos = new Map(); let fallo = null, hechas = 0;
    const tandas = []; for (let i = 0; i < lista.length; i += 4) tandas.push(lista.slice(i, i + 4));
    if (avance) avance(0, lista.length);
    const una = async t => {
      try {
        const r = await data.ia({ modo: 'redes_copys', texto: JSON.stringify(t.map(z => ({ id: z._id, formato: z.formato, redes: z.red, fecha: z.fecha, tema: z.tema, contenido: z.contenido || '', copy_actual: z.copy || '', ...((z.fuentes || []).length ? { fuentes: z.fuentes } : {}) }))), contexto: c });
        const rs = Array.isArray(r.piezas) ? r.piezas : [];
        rs.forEach((x, i) => {
          // si el modelo cambió los ids pero respetó el orden, se toma por posición
          const z = t.find(y => y._id === (x && x.id)) || (rs.length === t.length ? t[i] : null);
          if (!z || !x || (!x.copy && !esHistoria(z)) || hechos.has(z._id)) return;
          hechos.set(z._id, { copy: espaciar(x.copy, m.cliente), hashtags: String(x.hashtags || '').trim(), ...(x.contenido && !z.contenido ? { contenido: String(x.contenido).trim() } : {}) });
        });
      } catch (e) { fallo = e; }
      hechas += t.length; if (avance) avance(hechas, lista.length);
    };
    for (let i = 0; i < tandas.length; i += 3) await Promise.all(tandas.slice(i, i + 3).map(una));
    return { hechos, fallo };
  }
  // Copys y hashtags de varias piezas: de a 4 por pedido, 3 pedidos a la vez. Devuelve cuántas escribió.
  async function copys(ids, m, btn) {
    const ps = (piezas(m._id) || []).filter(z => ids.includes(z._id));
    if (!ps.length) return 0;
    const propio = !st.ia[m._id], t0 = btn ? btn.innerHTML : ''; let n = 0; const cambios = [];
    const avance = (h, t) => { if (btn) { btn.disabled = true; btn.textContent = 'Escribiendo ' + h + '/' + t + '…'; } else trabajando(m, 'Escribiendo copys ' + h + '/' + t + '…'); };
    const { hechos, fallo } = await copysIA(m, ps, avance);
    let error = fallo;
    for (const [id, u0] of hechos) {
      const z = ps.find(y => y._id === id); if (!z) continue;
      const antes = antesDe(z, u0), u = conVersion(z, u0, 'Copy de Mr. Piggy');
      try { await data.piezasUpd([z._id], u); Object.assign(z, u); n++; cambios.push({ id: z._id, antes }); } catch (e) { error = e; break; }
    }
    if (btn) { btn.disabled = false; btn.innerHTML = t0; }
    if (propio && !btn) trabajando(m, null);
    if (error && !n) toast(error.message); else if (propio || btn) { if (n) ofrecerDeshacerIA(m, cambios.filter(c => c.antes.copy || c.antes.hashtags || c.antes.contenido), 'Mr. Piggy escribió ' + n + (n === 1 ? ' copy' : ' copys') + '. Revisalos.'); if (!n || !cambios.some(c => c.antes.copy || c.antes.hashtags || c.antes.contenido)) toast(n ? 'Mr. Piggy escribió ' + n + (n === 1 ? ' copy' : ' copys') + '. Revisalos.' : 'No se pudo escribir los copys.'); }
    render();
    return n;
  }
  // Pone la hora de su formato a las piezas sin hora (o a las seleccionadas, pisando la que tengan).
  async function ponerHoras(m, soloSel) {
    const ps = piezas(m._id) || [], obj = soloSel ? ps.filter(z => st.sel.has(z._id)) : ps.filter(z => !z.hora);
    if (!obj.length) { toast('Todas las piezas ya tienen hora'); return; }
    const resto = ps.filter(z => !obj.includes(z)).map(z => ({ ...z })), grupos = new Map();
    [...obj].sort((a, b) => (a.fecha || '9').localeCompare(b.fecha || '9') || a.orden - b.orden).forEach(z => { const h = horaLibre(resto, z.fecha, z.formato, m.cliente); resto.push({ ...z, hora: h }); if (!grupos.has(h)) grupos.set(h, []); grupos.get(h).push(z._id); });
    try { for (const [h, ids] of grupos) { await data.piezasUpd(ids, { hora: h }); local(m._id, ids, { hora: h }); } toast(obj.length + (obj.length === 1 ? ' pieza con horario' : ' piezas con horario') + ' (se cambian en Opciones → Flujo de Redes)'); render(); }
    catch (e) { toast(e.message); render(); }
  }
  async function guardarLista(k, arr) {
    const prev = S.L[k]; S.L[k] = arr; render();
    try { await data.saveLista(k, arr); toast('Guardado'); } catch (e) { S.L[k] = prev; render(); toast(e.message); }
  }
  // Opciones → Flujo de Redes: a qué rol le toca cada estado y a qué hora sale cada formato.
  function opcionesHtml() {
    const f = flujo(), roles = (S.L.rolesCuenta && S.L.rolesCuenta.length ? S.L.rolesCuenta : ['Dirección', 'Cuentas y programación', 'Diseño', 'Ads']), dis = isStaff() ? '' : ' disabled';
    return '<h2 style="margin:24px 0 0">Flujo de Redes</h2><p class="muted" style="margin:0">A quién le toca cada pieza según en qué estado está. Le toca a todas las personas de la cuenta con ese rol (los roles se eligen en cada cuenta, en Redes → Clientes y planes).</p>' +
      '<section class="sheet" style="margin-top:12px"><div class="tbl"><table class="rm-flujo"><thead><tr><th>Estado de la pieza</th><th>Le toca a</th></tr></thead><tbody>' +
      ESTADOS_PIEZA.map(e => '<tr><td>' + pzPill(e) + '</td><td><div class="rm-fl-r">' + roles.map(r => '<label class="chk"><input type="checkbox" data-flujo="' + esc(e) + '" value="' + esc(r) + '"' + ((f[e] || []).some(x => mismoRol(x, r)) ? ' checked' : '') + dis + '> ' + esc(r) + '</label>').join('') + '</div></td></tr>').join('') + '</tbody></table></div></section>' +
      '<h2 style="margin:24px 0 0">Horario de publicación</h2><p class="muted" style="margin:0">La hora con la que sale cada formato cuando Mr. Piggy propone contenido o tocás “Poner horarios”. Si el mismo día hay dos del mismo formato, la segunda va 3 horas después. Cada cuenta puede tener los suyos: se guardan al usar “Fechas y horarios con Mr. Piggy” en su mes.</p>' +
      '<section class="sheet" style="margin-top:12px"><div class="sheet-b rm-hrs">' + formatos().map(fm => '<label class="field" style="--fc:' + fmtColor(fm) + '"><span class="lbl"><i class="rm-dot"></i>' + esc(fm) + '</span><input class="in" type="time" data-horared="' + esc(fm) + '" value="' + esc(horaDe(fm)) + '"' + dis + '></label>').join('') + '</div></section>';
  }
  // Para Mis trabajos: cuántas piezas del mes le tocan a una persona en una cuenta, por estado.
  // Meses abiertos (del mes pasado en adelante, sin cerrar): ahí está el trabajo de cada uno
  const mesesAbiertos = cliente => meses().filter(m => (!cliente || m.cliente === cliente) && m.estado !== 'Cerrado' && m.mes >= addMonth(thisMonth(), -1));
  function tocaA(cliente, alias) {
    const ms = mesesAbiertos(cliente); if (!ms.length) return null;
    const falta = ms.filter(m => !piezas(m._id)).map(m => m._id); if (falta.length) { setTimeout(() => cargar(falta), 0); return null; }
    const eq = equipo(cliente), o = {};
    ms.forEach(m => (piezas(m._id) || []).forEach(z => { if (z.estado !== 'Publicada' && quienes(cliente, z, eq).gente.includes(alias)) o[z.estado] = (o[z.estado] || 0) + 1; }));
    return ESTADOS_PIEZA.filter(e => o[e]).map(e => [e, o[e]]);
  }
  // Tareas de Redes de una persona: por mes y etapa, las piezas que le tocan (la Planificación va aparte, como "revisar la planificación")
  const VERBO = { 'En diseño': 'Diseñar', 'Revisión interna': 'Revisar', 'Para el cliente': 'Seguir la aprobación de', 'Cambios': 'Hacer los cambios de', 'Aprobada': 'Programar', 'Programada': 'Controlar la publicación de', 'Idea': 'Planificar' };
  function tareasRedes(alias) {
    const out = [], falta = [];
    mesesAbiertos().forEach(m => {
      const ps = piezas(m._id); if (!ps) { falta.push(m._id); return; }
      const eq = equipo(m.cliente); if (!eq.has(alias) && !ps.some(z => z.resp === alias)) return;
      const o = {}; ps.forEach(z => { if (z.estado === 'Publicada' || z.lista || (z.estado === 'Idea' && m.estado === 'Planificación')) return; if (quienes(m.cliente, z, eq).gente.includes(alias)) o[z.estado] = (o[z.estado] || 0) + 1; });
      ESTADOS_PIEZA.filter(e => o[e]).forEach(e => out.push({ m, estado: e, n: o[e], verbo: VERBO[e] || e }));
    });
    if (falta.length) setTimeout(() => cargar(falta), 0);
    return out.sort((a, b) => a.m.mes.localeCompare(b.m.mes) || ESTADOS_PIEZA.indexOf(b.estado) - ESTADOS_PIEZA.indexOf(a.estado) || cmp(a.m.cliente, b.m.cliente));
  }
  // Lo que dijo el cliente: chat de WhatsApp o mail, notas de una reunión o la transcripción de un Meet.
  // Mr. Piggy lo reparte en las piezas (aprobadas, cambios, nuevas) y, si es una reunión, queda además como charla del cliente.
  const TIPOS_CHAT = [['chat', 'Chat de WhatsApp o mail', 'WhatsApp', '[10/11 18:32] Laura: el posteo del lunes me encanta, el reel cambiale la música…'], ['reunion', 'Notas de una reunión', 'Reunión', 'Reunión con Laura y Pedro:\n- Les gustó el carrusel de consejos\n- Para noviembre quieren empujar las entregas a domicilio\n- Cambiar la foto del post del 12…'], ['meet', 'Transcripción de un Meet', 'Videollamada', 'Pegá acá la transcripción que deja Google Meet (o el resumen de Gemini)…']];
  // Meses en Planificación que le toca revisar a una persona (por su rol en la cuenta y el flujo de Redes)
  function planificacionesDe(alias) {
    const roles = rolesEtapa('Idea'); if (!roles.length) return [];
    return meses().filter(m => m.estado === 'Planificación' && m.mes >= addMonth(thisMonth(), -1)).filter(m => { const eq = equipo(m.cliente); return roles.some(r => mismoRol(r, eq.get(alias))); })
      .sort((a, b) => a.mes.localeCompare(b.mes) || cmp(a.cliente, b.cliente)).map(m => ({ m, n: (piezas(m._id) || []).length, cargadas: !!piezas(m._id) }));
  }
  function abrirChat(m, tipo) {
    st.chatMes = m._id; S.form = null; const tp = TIPOS_CHAT.find(x => x[0] === tipo) || TIPOS_CHAT[0];
    $('#panel').innerHTML = '<form id="rmchat" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(m.cliente) + ' · ' + esc(cap(monthLabel(m.mes))) + '</span><h2 id="panel-title">Lo que dijo el cliente</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><div class="field full"><span class="lbl">Qué vas a pegar</span><div class="seg rm-adds" role="group">' + TIPOS_CHAT.map(x => '<label><input type="radio" name="rmchat-tipo" value="' + x[0] + '"' + (x[0] === tp[0] ? ' checked' : '') + ' data-chattipo="' + esc(m._id) + '"><span>' + esc(x[1].replace(' de WhatsApp o mail', '').replace('Notas de una reunión', 'Notas de reunión').replace('Transcripción de un Meet', 'Transcripción de Meet')) + '</span></label>').join('') + '</div></div>' +
      '<p class="formnote full">Mr. Piggy relaciona cada comentario con su pieza: marca las aprobadas, anota los cambios y suma las piezas nuevas que se pidan.' + (tp[0] !== 'chat' ? ' Además queda guardada como charla del cliente, con lo acordado y los próximos pasos.' : '') + '</p>' +
      '<div class="field full"><label for="rmchat-t">' + esc(tp[1]) + '</label><textarea id="rmchat-t" rows="14" placeholder="' + esc(tp[3]) + '"></textarea></div>' +
      (tp[0] !== 'chat' ? '<label class="chk full"><input type="checkbox" id="rmchat-charla" checked> Guardarla también en Charlas con clientes</label>' : '') + '</div>' +
      '<div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary" id="rmchat-b">Repartir en las piezas</button></span></div></form>';
    st.chatTipo = tp[0]; $('#panel').hidden = false; $('#scrim').hidden = false; setTimeout(() => $('#rmchat-t') && $('#rmchat-t').focus(), 30);
  }
  async function repartirChat() {
    const m = mesDe(st.chatMes), t = ($('#rmchat-t') || {}).value || ''; if (!m || !t.trim()) { toast('Pegá el texto'); return; }
    const tp = TIPOS_CHAT.find(x => x[0] === st.chatTipo) || TIPOS_CHAT[0], charla = tp[0] !== 'chat' && $('#rmchat-charla') && $('#rmchat-charla').checked;
    const b = $('#rmchat-b'); b.disabled = true; b.textContent = 'Leyendo…';
    try {
      const ps = piezas(m._id) || [];
      const r = await data.ia({ modo: 'redes_chat', texto: (tp[0] === 'chat' ? '' : (tp[0] === 'meet' ? 'TRANSCRIPCIÓN DE UNA VIDEOLLAMADA CON EL CLIENTE (tomá solo lo que se decidió o pidió sobre las piezas y el contenido):\n' : 'NOTAS DE UNA REUNIÓN CON EL CLIENTE:\n')) + t, contexto: { cliente: m.cliente, ...(ctx.marcaCtx ? ctx.marcaCtx(m.cliente, ps) : {}), formatos: formatos(), piezas: ps.map(z => ({ id: z._id, fecha: z.fecha, formato: z.formato, tema: z.tema, estado: z.estado })) } });
      let ap = 0, ca = 0, nu = 0;
      for (const c of Array.isArray(r.cambios) ? r.cambios : []) {
        const z = ps.find(x => x._id === c.id); if (!z) continue;
        if (c.accion === 'aprobada') { await data.piezasUpd([z._id], { estado: 'Aprobada', respuesta: c.detalle || '' }); Object.assign(z, { estado: 'Aprobada', respuesta: c.detalle || '' }); ap++; }
        else if (c.accion === 'cambios') { await data.piezasUpd([z._id], { estado: 'Cambios', respuesta: c.detalle || '' }); Object.assign(z, { estado: 'Cambios', respuesta: c.detalle || '' }); ca++; }
        if (c.detalle) await data.comentar({ entidad: 'pieza', id: z._id, clienteId: m.cliente, texto: (c.accion === 'aprobada' ? '✓ Aprobada (por WhatsApp): ' : c.accion === 'cambios' ? 'Cambios pedidos (por WhatsApp): ' : 'Nota del cliente: ') + c.detalle, interno: true }).catch(() => {});
      }
      const nuevas = (Array.isArray(r.nuevas) ? r.nuevas : []).filter(x => x && x.tema).map(x => ({ formato: formatos().includes(x.formato) ? x.formato : formatos()[0], tema: x.tema, copy: x.copy || '', fecha: /^\d{4}-\d{2}-\d{2}$/.test(x.fecha || '') ? x.fecha : '', extra: true, estado: 'Idea' }));
      if (nuevas.length) { const ins = await insPiezas(m, nuevas); P.set(m._id, [...ps, ...ins]); nu = ins.length; }
      if (charla) { try { await data.save('comunicacion', null, { cliente: m.cliente, fecha: today(), canal: tp[2], conQuien: '', resumen: (tp[0] === 'meet' ? 'Transcripción de Meet' : 'Notas de reunión') + ' · Redes ' + monthLabel(m.mes) + '\n\n' + t.slice(0, 20000), acuerdo: [ap ? ap + ' piezas aprobadas' : '', ca ? ca + ' con cambios' : '', nu ? nu + ' piezas nuevas' : ''].filter(Boolean).join(', '), proximo: '', fechaProximo: '', hecho: false, responsable: (S.me && S.me.alias) || '' }); if (ctx.reload) ctx.reload(); } catch (e) { toast('Las piezas se actualizaron, pero no se pudo guardar la charla: ' + e.message); } }
      ctx.closeForm(); toast([ap ? ap + ' aprobadas' : '', ca ? ca + ' con cambios' : '', nu ? nu + ' nuevas (extra)' : '', charla ? 'charla guardada' : ''].filter(Boolean).join(' · ') || 'No encontré cambios en ese chat'); render();
    } catch (e) { toast(e.message); b.disabled = false; b.textContent = 'Repartir en las piezas'; }
  }
  // Reemplaza la pieza por otra idea (mismo formato y día), con copy y hashtags. Lo anterior queda en versiones y se puede deshacer.
  async function cambiarIdea(btn) {
    const f = st.fpz; if (!f) return; const m = mesDe(f.mesId), z = (piezas(f.mesId) || []).find(x => x._id === f.id); if (!m || !z) return;
    const pedido = (($('#pz-camb-q') || {}).value || '').trim();
    const txt0 = btn.innerHTML; btn.disabled = true; btn.textContent = 'Pensando otra idea…';
    try {
      const c = ctxIA(m); delete c._pp;
      const malas = (z.fuentes || []).map(x => dominio(x.url));
      const r = await data.ia({ modo: 'redes_ideas', texto: 'Reemplazá esta pieza por UNA idea distinta, del mismo formato (' + z.formato + ')' + (z.fecha ? ' y para el mismo día (' + z.fecha + ')' : '') + '. La que hay ahora y NO va: "' + (z.tema || '') + '"' + (malas.length ? ', con fuente de ' + malas.join(', ') + ' (no la uses)' : '') + '.' + (pedido ? ' Lo que pide el equipo: ' + pedido + '.' : '') + ' Proponé exactamente 1 pieza.',
        contexto: { ...c, redes: redesDe(z.red), ...(invElegidas(m) ? { fechas_y_novedades: invElegidas(m) } : {}), ya_cargadas: (piezas(m._id) || []).filter(y => y._id !== z._id).map(y => ({ fecha: y.fecha, formato: y.formato, tema: y.tema })) } });
      const x = (Array.isArray(r.piezas) ? r.piezas : []).find(y => y && y.tema); if (!x) throw new Error('Mr. Piggy no propuso nada. Probá de nuevo.');
      const nueva = { _id: z._id, formato: z.formato, red: z.red, fecha: z.fecha, tema: String(x.tema).slice(0, 160), contenido: String(x.contenido || '').slice(0, 3000), copy: '', hashtags: '', fuentes: fuentesDe(m, x.fuentes) };
      if (!esHistoria(z)) { btn.textContent = 'Escribiendo el copy…'; const res = await copysIA(m, [nueva]); const u = res.hechos.get(z._id); if (u) Object.assign(nueva, u); }
      const u = { tema: nueva.tema, contenido: nueva.contenido, copy: nueva.copy, hashtags: nueva.hashtags, ...(data.cols && data.cols.piezaFuentes === false ? {} : { fuentes: nueva.fuentes }) };
      const antes = { ...antesDe(z, u), ...(u.fuentes ? { fuentes: z.fuentes || [] } : {}) };
      const uv = conVersion(z, u, 'Otra idea de Mr. Piggy');
      await data.piezasUpd([z._id], uv); local(m._id, [z._id], uv); abrirPieza(z._id); render();
      if (ctx.toastAccion) ctx.toastAccion('Cambiada por: ' + nueva.tema, 'Deshacer', async () => { const zz = (piezas(m._id) || []).find(y => y._id === z._id); const ub = conVersion(zz, antes, 'Deshacer'); await data.piezasUpd([z._id], ub); local(m._id, [z._id], ub); render(); if (st.fpz && st.fpz.id === z._id) abrirPieza(z._id); }, 12000); else toast('Cambiada');
    } catch (e) { toast(e.message); if (btn.isConnected) { btn.disabled = false; btn.innerHTML = txt0; } }
  }
  const pzDe = id => { for (const m of meses()) { const z = (piezas(m._id) || []).find(x => x._id === id); if (z) return { m, z }; } return null; };
  // Comentario para quien diseña al devolver piezas (null si se cancela)
  const pedirNota = n => pedirTexto('¿Qué hay que cambiar? Le llega a quien diseña' + (n > 1 ? ' y vale para las ' + n + ' piezas' : '') + '.', { titulo: 'Devolver a diseño', ok: 'Devolver', ph: 'Ej.: achicar el logo, cambiar la foto del slide 3' });
  async function enviarMes(m, yaConfirmado) {
    const ps = piezas(m._id) || [];
    const ids = ps.filter(z => z.estado === 'Revisión interna').map(z => z._id);
    if (!ids.length && !ps.some(z => z.estado === 'Para el cliente')) { toast('No hay piezas revisadas para mandar.'); return; }
    if (!yaConfirmado && !await confirmar((ids.length ? ids.length + ' piezas pasan al cliente y ' : '') + 'el mes se publica en el portal de ' + m.cliente + '. ¿Seguimos?')) return;
    try {
      if (ids.length) { await data.piezasUpd(ids, { estado: 'Para el cliente', lista: false }); local(m._id, ids, { estado: 'Para el cliente', lista: false }); }
      const u = { visible: true, estado: 'Con el cliente', enviadoAt: new Date().toISOString() }; await data.mesUpd(m._id, u); Object.assign(m, u);
      toast('Listo: ' + m.cliente + ' ya lo ve en el portal'); render();
      if (ctx.avisarCliente) ctx.avisarCliente(m.cliente, 'redes', m);
    } catch (e) { toast(e.message); }
  }
  // Para el resumen de la ficha del cliente: cómo vienen sus meses de redes abiertos.
  async function resumenCliente(cliente) {
    const ms = meses().filter(m => m.cliente === cliente && m.mes >= addMonth(thisMonth(), -1)).sort((a, b) => a.mes.localeCompare(b.mes));
    const falta = ms.filter(m => !piezas(m._id)).map(m => m._id); if (falta.length) await cargar(falta);
    const hoy = new Date().toISOString().slice(0, 10);
    return ms.map(m => { const ps = piezas(m._id) || [], E = etapaDe(m), a = avance(m, ps), cnt = {}; ps.forEach(z => { cnt[pzNombre(z.estado)] = (cnt[pzNombre(z.estado)] || 0) + 1; });
      return { mes: monthLabel(m.mes), etapa: E.n, responsable: m.resp || '', piezas: ps.length, [E.cliente ? 'aprobadas_por_el_cliente' : 'listas_en_la_etapa']: a.h, por_estado: cnt, extras: ps.filter(z => z.extra).length,
        enviado_al_cliente: m.enviadoAt ? String(m.enviadoAt).slice(0, 10) : '', visible_en_portal: !!m.visible,
        cambios_que_pidio_el_cliente: ps.filter(z => z.estado === 'Cambios').map(z => ({ pieza: z.tema, pedido: (z.respuesta || '').slice(0, 200) })).slice(0, 8),
        proximas_publicaciones: ps.filter(z => z.fecha && z.fecha >= hoy && z.estado !== 'Publicada').sort((x, y) => (x.fecha + x.hora).localeCompare(y.fecha + y.hora)).slice(0, 4).map(z => ({ fecha: z.fecha, formato: z.formato, tema: z.tema, estado: pzNombre(z.estado) })),
        sin_fecha: ps.filter(z => !z.fecha).length, fechas_y_novedades_elegidas: invElegidas(m) ? [...invElegidas(m).fechas.map(x => x.nombre), ...invElegidas(m).novedades.map(x => x.titulo)].slice(0, 10) : [] }; });
  }
  /* ---------- Versiones: volver atrás lo que cambió Mr. Piggy ---------- */
  // Antes de que Mr. Piggy cambie el tema, lo que va en la pieza, el copy o los hashtags, se guarda lo anterior en la pieza (últimas 10).
  const CAMPOS_V = ['tema', 'contenido', 'copy', 'hashtags'];
  const NOM_V = { tema: 'Tema', contenido: 'Qué va en la pieza', copy: 'Copy', hashtags: 'Hashtags' };
  function conVersion(z, u, motivo) {
    const prev = {}; CAMPOS_V.forEach(k => { if (k in u && String(u[k] || '') !== String(z[k] || '')) prev[k] = z[k] || ''; });
    if (!Object.keys(prev).length || (data.cols && data.cols.piezaVersiones === false)) return u;
    return { ...u, versiones: [{ at: new Date().toISOString(), motivo, por: (S.me && S.me.alias) || '', ...prev }, ...(z.versiones || [])].slice(0, 10) };
  }
  // Deshacer de una vez lo que Mr. Piggy acaba de cambiar en varias piezas
  function ofrecerDeshacerIA(m, cambios, msg) {
    if (!cambios.length) return;
    if (!ctx.toastAccion) { toast(msg); return; }
    ctx.toastAccion(msg, 'Deshacer', async () => {
      let n = 0;
      for (const c of cambios) { const z = (piezas(m._id) || []).find(y => y._id === c.id); if (!z) continue; const u = conVersion(z, c.antes, 'Deshacer'); try { await data.piezasUpd([z._id], u); local(m._id, [z._id], u); n++; } catch (e) { toast(e.message); break; } }
      if (n) toast('Listo: volvieron ' + n + (n === 1 ? ' pieza' : ' piezas') + ' a como estaban'); render(); if (st.fpz) abrirPieza(st.fpz.id);
    }, 12000);
  }
  const antesDe = (z, u) => Object.fromEntries(CAMPOS_V.filter(k => k in u).map(k => [k, z[k] || '']));
  // Fuentes de la pieza (lo que Mr. Piggy sacó de la web): links y la cita lista para pegar o sumar al copy
  function fuentesHtml(z, can) {
    const fs = z.fuentes || []; if (!fs.length) return '';
    return '<div class="field full pz-fs"><span class="lbl">Fuentes <span class="muted">(de la búsqueda en la web)</span></span>' + fs.map((f, i) =>
      '<div class="pz-f"><a href="' + esc(f.url) + '" target="_blank" rel="noopener"><b>' + esc(f.titulo || dominio(f.url)) + '</b><span>' + esc(dominio(f.url)) + ' ↗</span></a><span class="pz-fa"><button type="button" class="btn ghost sm" data-act="rmCitaCopiar" data-i="' + i + '" title="Copiar la cita">' + ICO_COPIAR + ' Cita</button>' + (can ? '<button type="button" class="btn ghost sm" data-act="rmCitaSumar" data-i="' + i + '" title="Agregar la cita al final del copy">+ Al copy</button>' : '') + '</span></div>').join('') + '</div>';
  }
  function versionesHtml(z, can) {
    const vs = z.versiones || []; if (!vs.length) return '';
    return '<details class="full pz-vs"><summary>Versiones anteriores <span class="muted num">' + vs.length + '</span></summary>' + vs.map((v, i) =>
      '<div class="pz-v"><div class="pz-vh"><b>' + esc(new Date(v.at).toLocaleString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</b><span class="muted">' + esc([v.motivo, v.por].filter(Boolean).join(' · ')) + '</span>' + (can ? '<button type="button" class="btn sm" data-act="rmVolverV" data-i="' + i + '">Volver a esta</button>' : '') + '</div>' +
      CAMPOS_V.filter(k => k in v).map(k => '<div class="pz-vc"><span class="lbl">' + NOM_V[k] + '</span><p>' + (v[k] ? esc(v[k]) : '<span class="muted">(vacío)</span>') + '</p></div>').join('') + '</div>').join('') + '</details>';
  }

  /* ---------- Pasar el contenido del mes a otra etapa ---------- */
  // Mueve todas las piezas de una etapa a la siguiente (p. ej. de Planificación a En diseño), actualiza el estado del mes
  // y avisa a quienes les toca la etapa nueva (campanita y Slack).
  const MES_DE = { 'Idea': 'Planificación', 'En diseño': 'Producción', 'Cambios': 'Producción', 'Revisión interna': 'Revisión interna', 'Para el cliente': 'Con el cliente', 'Aprobada': 'Aprobado', 'Programada': 'Programado', 'Publicada': 'Cerrado' };
  function abrirPasar(m, desde) {
    const ps = piezas(m._id) || [], cnt = {}; ps.forEach(z => { cnt[z.estado] = (cnt[z.estado] || 0) + 1; });
    const de = desde && cnt[desde] ? desde : (ESTADOS_PIEZA.find(e => cnt[e]) || 'Idea');
    const sig = ESTADOS_PIEZA[Math.min(ESTADOS_PIEZA.indexOf(de) + 1, ESTADOS_PIEZA.length - 1)];
    st.pasar = { mesId: m._id };
    $('#panel').innerHTML = '<form id="rmpasar" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(m.cliente) + ' · ' + esc(cap(monthLabel(m.mes))) + '</span><h2 id="panel-title">Pasar a la siguiente etapa</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><div class="field"><label for="pa-de">Las piezas que están en</label><select id="pa-de" data-pasar="' + esc(m._id) + '">' + ESTADOS_PIEZA.filter(e => cnt[e]).map(e => opt(e, pzNombre(e) + ' (' + cnt[e] + ')', de)).join('') + '</select></div>' +
      '<div class="field"><label for="pa-a">Pasan a</label><select id="pa-a" data-pasar="' + esc(m._id) + '">' + ESTADOS_PIEZA.filter(e => e !== de).map(e => opt(e, pzNombre(e), sig)).join('') + '</select></div>' +
      '<div class="field full" id="pa-quien">' + pasarQuien(m, sig) + '</div>' +
      '<div class="field full"><label for="pa-msg">Mensaje <span class="muted">(opcional)</span></label><textarea id="pa-msg" class="pz-ta" rows="2" placeholder="Ej.: ojo con el carrusel del 12, el cliente quiere fotos reales"></textarea></div>' +
      (sig === 'Para el cliente' ? '<p class="hint full">Para que el cliente lo vea en su portal usá “Enviar al cliente”.</p>' : '') + '</div>' +
      '<div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Pasar y avisar</button></span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false;
  }
  function pasarQuien(m, a) {
    const q = quienes(m.cliente, { estado: a, formato: '', resp: '' });
    return '<span class="lbl">Se avisa a</span>' + (q.gente.length ? '<div class="pa-g">' + q.gente.map(x => '<label class="chk"><input type="checkbox" name="pa-avisar" value="' + esc(x) + '" checked> ' + av(x, fotoDe(x)) + ' ' + esc(x) + '</label>').join('') + '</div><span class="hint">' + esc(q.roles.join(' + ')) + ' en la cuenta, según el flujo de Redes.</span>' : '<p class="muted" style="margin:0">Nadie tiene ' + esc(q.roles.join(' + ') || 'ese rol') + ' en esta cuenta. Asignalo en el servicio de Redes del cliente.</p>');
  }
  async function pasarEtapa(m) {
    const de = ($('#pa-de') || {}).value, a = ($('#pa-a') || {}).value, msg = (($('#pa-msg') || {}).value || '').trim();
    const avisar = [...document.querySelectorAll('input[name="pa-avisar"]:checked')].map(i => i.value);
    const ps = (piezas(m._id) || []).filter(z => z.estado === de); if (!ps.length || !a) return;
    const ids = ps.map(z => z._id), mesAntes = m.estado, mesNuevo = MES_DE[a] || m.estado;
    try {
      await data.piezasUpd(ids, { estado: a }); local(m._id, ids, { estado: a });
      if (mesNuevo !== m.estado) { await data.mesUpd(m._id, { estado: mesNuevo }); m.estado = mesNuevo; }
      let avisados = 0;
      if (avisar.length) { const r = await data.avisarEquipo(avisar, 'redes', m.cliente + ': ' + ids.length + (ids.length === 1 ? ' pieza pasó' : ' piezas pasaron') + ' a ' + pzNombre(a), cap(monthLabel(m.mes)) + (msg ? ' · ' + msg : '') + ((S.me && S.me.alias) ? ' — ' + S.me.alias : ''), '#redes/' + m._id); avisados = r === false ? -1 : r; }
      ctx.closeForm(); render();
      const txt = ids.length + (ids.length === 1 ? ' pieza pasó' : ' piezas pasaron') + ' a ' + pzNombre(a) + (avisados > 0 ? ' · se avisó a ' + avisar.join(', ') : avisados === -1 ? ' · para avisar falta correr el SQL 0035' : '');
      if (ctx.toastAccion) ctx.toastAccion(txt, 'Deshacer', async () => { await data.piezasUpd(ids, { estado: de }); local(m._id, ids, { estado: de }); if (m.estado !== mesAntes) { await data.mesUpd(m._id, { estado: mesAntes }); m.estado = mesAntes; } render(); }, 12000); else toast(txt);
    } catch (e) { toast(e.message); }
  }

  /* ---------- Fechas y novedades del mes (búsqueda web) ---------- */
  // Mr. Piggy busca en la web las fechas que caen en el mes (patrias, internacionales, del rubro, comerciales) y novedades del rubro,
  // con su fuente. Quedan guardadas en el mes; el equipo destilda las que no sirven y "Proponer contenido" usa las elegidas.
  const TIPO_F = { nacional: ['Nacional', '--s-revision'], internacional: ['Internacional', '--s-presup'], rubro: ['Del rubro', '--s-entregado'], comercial: ['Comercial', '--s-confirmar'], local: ['Local', '--s-curso'] };
  const invElegidas = m => { const v = m.investigacion; if (!v) return null; return { fechas: (v.fechas || []).filter(x => x.usar !== false).map(({ usar, ...x }) => x), novedades: (v.novedades || []).filter(x => x.usar !== false).map(({ usar, ...x }) => x) }; };
  // Lo elegido que todavía no tiene pieza: se reconoce por la fuente citada o por una palabra distintiva en el tema.
  const STOPW = new Set('argentina argentino argentinas nacional nacionales feriado feriados noviembre diciembre octubre enero febrero marzo abril mayo junio julio agosto septiembre internacional mundial semana campaña producción contenido publicación'.split(' '));
  const palabras = t => norm(t || '').split(/[^a-z0-9ñ]+/).filter(w => w.length >= 5 && !STOPW.has(w) && !/^\d+$/.test(w));
  function sinPieza(m, lista) {
    const inv = invElegidas(m); if (!inv) return [];
    const urls = new Set(lista.flatMap(z => (z.fuentes || []).map(f => f && f.url)).filter(Boolean));
    const temas = lista.map(z => new Set(palabras(z.tema)));
    const cubre = x => (x.fuente && urls.has(x.fuente)) || palabras(x.nombre || x.titulo).some(w => temas.some(t => t.has(w)));
    return [...inv.fechas.map(x => ({ ...x, tipoItem: 'fecha' })), ...inv.novedades.map(x => ({ ...x, tipoItem: 'novedad' }))].filter(x => !cubre(x));
  }
  // Pide una pieza por cada fecha o novedad elegida que quedó afuera. Devuelve las piezas (sin guardar).
  async function piezasPara(m, faltan, base, redesP) {
    const fsPlan = Object.keys(m.plan || {}).filter(f => +m.plan[f] > 0), fmts = fsPlan.length ? fsPlan : formatos();
    const fmtDe = x => fmts.includes(x) ? x : (fmts.find(f => norm(f).startsWith(norm(x || '').slice(0, 4))) || fmts[0]);
    const c = ctxIA(m); delete c._pp;
    const texto = 'El equipo eligió estas fechas y novedades y todavía no tienen pieza: ' + JSON.stringify(faltan.map(({ usar, tipoItem, ...x }) => ({ tipo: tipoItem, ...x }))) +
      '. Proponé exactamente UNA pieza para cada una (' + faltan.length + ' en total), en este orden, cada una con su URL en "fuentes". Las fechas van en su día (o el día hábil anterior si es un aviso). Un feriado o día no laborable también lleva pieza: saludo, aviso de atención u horarios, o algo del rubro relacionado; en general una historia alcanza. Formatos posibles: ' + fmts.join(', ') + '.';
    const r = await data.ia({ modo: 'redes_ideas', texto, contexto: { ...c, redes: redesP, fechas_y_novedades: invElegidas(m), ya_cargadas: base.map(z => ({ fecha: z.fecha, formato: z.formato, tema: z.tema })) } });
    const out = [];
    (Array.isArray(r.piezas) ? r.piezas : []).filter(x => x && x.tema).slice(0, faltan.length).forEach((x, i) => {
      const formato = fmtDe(x.formato), it = faltan[i] || {};
      const fecha = /^\d{4}-\d{2}-\d{2}$/.test(x.fecha || '') && String(x.fecha).startsWith(m.mes) ? x.fecha : (/^\d{4}-\d{2}-\d{2}$/.test(it.fecha || '') && it.fecha.startsWith(m.mes) ? it.fecha : '');
      const fu = fuentesDe(m, Array.isArray(x.fuentes) && x.fuentes.length ? x.fuentes : [it.fuente].filter(Boolean));
      out.push({ formato, red: redesPara(formato, redesP).join(', '), fuentes: fu, tema: String(x.tema).slice(0, 160), contenido: String(x.contenido || '').slice(0, 3000), copy: '', hashtags: '', fecha, hora: fecha ? horaLibre([...base, ...out], fecha, formato, m.cliente) : '', estado: 'Idea', extra: false });
    });
    return out;
  }
  // Desde "Fechas y novedades": arma las piezas de lo elegido que quedó sin pieza (van como extra, fuera del plan).
  async function sumarFaltantes(m) {
    const ps = piezas(m._id) || [], faltan = sinPieza(m, ps); if (!faltan.length) { toast('Todo lo elegido ya tiene su pieza.'); return; }
    if (!await confirmar('Mr. Piggy arma ' + faltan.length + (faltan.length === 1 ? ' pieza' : ' piezas') + ' para lo elegido que quedó afuera (' + faltan.map(x => x.nombre || x.titulo).join('; ') + '). Como el plan ya está armado, van como extra: si no se cobran, marcalo en cada pieza.')) return;
    ctx.closeForm(); trabajando(m, 'Mr. Piggy arma las piezas que faltan…');
    try {
      const nuevas = await piezasPara(m, faltan, ps, replicaDe(m)); if (!nuevas.length) throw new Error('Mr. Piggy no propuso nada. Probá de nuevo.');
      nuevas.forEach((z, i) => { z._id = 'nueva' + i; z.extra = true; });
      const conCopy = nuevas.filter(z => !esHistoria(z));
      if (conCopy.length) { const res = await copysIA(m, conCopy, (h, t) => trabajando(m, 'Escribiendo copys ' + h + '/' + t + '…')); res.hechos.forEach((u, id) => { const z = nuevas.find(y => y._id === id); if (z) Object.assign(z, u); }); }
      trabajando(m, 'Guardando…');
      const ins = await insPiezas(m, nuevas.map(({ _id, ...z }) => z)); P.set(m._id, [...ps, ...ins]);
      trabajando(m, null); toast('Listo: ' + ins.length + (ins.length === 1 ? ' pieza nueva' : ' piezas nuevas') + ' (extra) para ' + faltan.map(x => x.nombre || x.titulo).join('; ') + '.');
    } catch (e) { trabajando(m, null); toast(e.message); }
  }
  // Sitios que el equipo descartó como fuente (poco conocidos, competencia…): no se vuelven a usar en ninguna cuenta.
  const fuentesNo = () => (S.L.fuentesNo || []).map(x => String(x).toLowerCase().replace(/^www\./, '')).filter(Boolean);
  const descartada = u => { const d = String(dominio(u || '')).toLowerCase(); return !!d && fuentesNo().some(x => d === x || d.endsWith('.' + x)); };
  async function investigar(m) {
    const c = ctxIA(m); delete c._pp; delete c.plan;
    const r = await data.ia({ modo: 'redes_investigar', contexto: { cliente: m.cliente, mes: m.mes, marca: c.marca ? { rubro: c.marca.rubro, publico: c.marca.publico, pilares: c.marca.pilares, fechas: c.marca.fechas, competencia: c.marca.referencias } : null, notas_cliente: c.notas_cliente, servicios: c.servicios, redes: c.redes, fuentes_descartadas: fuentesNo() } });
    const url = u => /^https?:\/\//.test(u || '') && !descartada(u) ? String(u).slice(0, 500) : '';
    const fechas = (Array.isArray(r.fechas) ? r.fechas : []).filter(x => x && x.nombre && /^\d{4}-\d{2}-\d{2}$/.test(x.fecha || '') && String(x.fecha).startsWith(m.mes))
      .filter(x => !x.fuente || !descartada(x.fuente)).map(x => ({ fecha: x.fecha, nombre: String(x.nombre).slice(0, 120), tipo: TIPO_F[x.tipo] ? x.tipo : 'nacional', idea: String(x.idea || '').slice(0, 240), fuente: url(x.fuente), usar: true })).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 15);
    const novedades = (Array.isArray(r.novedades) ? r.novedades : []).filter(x => x && x.titulo && x.fuente && !descartada(x.fuente)).map(x => ({ titulo: String(x.titulo).slice(0, 160), resumen: String(x.resumen || '').slice(0, 400), idea: String(x.idea || '').slice(0, 240), fuente: url(x.fuente), fecha: String(x.fecha || '').slice(0, 20), usar: true })).slice(0, 8);
    const inv = { at: new Date().toISOString(), fechas, novedades };
    m.investigacion = inv;
    try { if (!await data.mesInvestigacion(m._id, inv)) st.invSinGuardar = true; } catch (e) { st.invSinGuardar = true; }
    return inv;
  }
  function abrirInvestigacion(m) {
    const inv = m.investigacion, busy = st.invBusy === m._id;
    const link = u => u ? ' <a href="' + esc(u) + '" target="_blank" rel="noopener" class="inv-src" title="' + esc(u) + '">' + esc(medioDe(u)) + ' ↗</a>' + (isStaff() ? '<button type="button" class="inv-no" data-act="rmFuenteNo" data-u="' + esc(u) + '" title="Fuente poco conocida, poco seria o de la competencia: no usar más este sitio">No usar este sitio</button>' : '') : '';
    const psInv = piezas(m._id) || [], faltanSet = new Set(inv && psInv.length ? sinPieza(m, psInv).map(x => x.fuente || x.nombre || x.titulo) : []);
    const estadoIt = x => x.usar === false || !psInv.length ? '' : faltanSet.has(x.fuente || x.nombre || x.titulo) ? ' <span class="pzst" style="--c:var(--crit)">Sin pieza</span>' : ' <span class="pzst" style="--c:var(--s-entregado)">✓ Con pieza</span>';
    let body = '<p class="formnote full">Mr. Piggy busca en la web las fechas que caen en ' + esc(monthLabel(m.mes)) + ' (patrias, internacionales, del rubro y comerciales) y novedades del rubro que le sirvan al público de ' + esc(m.cliente) + ', cada una con su fuente. Destildá lo que no va: “Proponer contenido” usa solo lo elegido.</p>';
    if (busy) body += '<p class="full"><span class="ia-dots"><i></i><i></i><i></i></span> Buscando en la web… puede tardar un minuto.</p>';
    else if (inv) {
      body += '<div class="full inv-s"><h3>Fechas del mes <span class="muted num">' + inv.fechas.length + '</span></h3>' + (inv.fechas.length ? inv.fechas.map((x, i) => '<label class="inv-r"><input type="checkbox" data-invusar="f:' + i + '"' + (x.usar !== false ? ' checked' : '') + '><span class="inv-d">' + esc(new Date(x.fecha + 'T12:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }).replace('.', '')) + '</span><span class="inv-t"><b>' + esc(x.nombre) + '</b> <span class="pzst" style="--c:var(' + (TIPO_F[x.tipo] || TIPO_F.nacional)[1] + ')">' + esc((TIPO_F[x.tipo] || TIPO_F.nacional)[0]) + '</span>' + estadoIt(x) + (x.idea ? '<small>' + esc(x.idea) + '</small>' : '') + link(x.fuente) + '</span></label>').join('') : '<p class="muted">No encontró fechas para este mes.</p>') + '</div>' +
        '<div class="full inv-s"><h3>Novedades del rubro <span class="muted num">' + inv.novedades.length + '</span></h3>' + (inv.novedades.length ? inv.novedades.map((x, i) => '<label class="inv-r"><input type="checkbox" data-invusar="n:' + i + '"' + (x.usar !== false ? ' checked' : '') + '><span class="inv-d">' + esc(/^\d{4}-\d{2}-\d{2}$/.test(x.fecha || '') ? new Date(x.fecha + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }).replace('.', '') : (x.fecha || '')) + '</span><span class="inv-t"><b>' + esc(x.titulo) + '</b>' + estadoIt(x) + (x.resumen ? '<small>' + esc(x.resumen) + '</small>' : '') + (x.idea ? '<small class="inv-idea">→ ' + esc(x.idea) + '</small>' : '') + link(x.fuente) + '</span></label>').join('') : '<p class="muted">No encontró novedades que sirvan.</p>') + '</div>' +
        (fuentesNo().length ? '<p class="hint full">Sitios descartados: ' + fuentesNo().map(d => esc(d) + ' <button type="button" class="btn link sm" data-act="rmFuenteSi" data-d="' + esc(d) + '" title="Volver a permitirlo">✕</button>').join(' · ') + '</p>' : '') +
        '<p class="hint full">Buscado el ' + esc(fmt(inv.at.slice(0, 10))) + (st.invSinGuardar ? ' · para que quede guardado en el mes falta correr el SQL 0033' : '') + '.</p>';
    }
    $('#panel').innerHTML = '<div style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(m.cliente) + ' · ' + esc(cap(monthLabel(m.mes))) + '</span><h2 id="panel-title">Fechas y novedades</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b">' + body + '</div><div class="panel-f"><span>' + (inv && !busy ? '<button type="button" class="btn ghost" data-act="rmInvBuscar" data-id="' + esc(m._id) + '">Buscar de nuevo</button>' : '') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cerrar</button>' +
      (busy ? '' : inv && psInv.length && faltanSet.size ? '<button type="button" class="btn primary" data-act="rmInvSumar" data-id="' + esc(m._id) + '"><span class="pig" aria-hidden="true">' + ISO + '</span> Armar ' + faltanSet.size + (faltanSet.size === 1 ? ' pieza' : ' piezas') + ' para lo que falta</button>' : inv ? '<button type="button" class="btn primary" data-act="rmInvProponer" data-id="' + esc(m._id) + '"><span class="pig" aria-hidden="true">' + ISO + '</span> Proponer contenido con esto</button>' : '<button type="button" class="btn primary" data-act="rmInvBuscar" data-id="' + esc(m._id) + '">Buscar en la web</button>') + '</span></div></div>';
    st.invMes = m._id; $('#panel').hidden = false; $('#scrim').hidden = false;
  }
  async function buscarInv(m) {
    if (st.invBusy) return; st.invBusy = m._id; abrirInvestigacion(m);
    try { await investigar(m); } catch (e) { toast(e.message); }
    st.invBusy = null; if (st.invMes === m._id && $('#panel') && !$('#panel').hidden) abrirInvestigacion(m); render();
  }
  const invBtn = m => { const v = m.investigacion, n = v ? (v.fechas || []).filter(x => x.usar !== false).length + (v.novedades || []).filter(x => x.usar !== false).length : 0;
    return isStaff() ? '<button class="btn ghost sm" data-act="rmInv" data-id="' + esc(m._id) + '" title="Fechas del mes y novedades del rubro, buscadas en la web">' + ICON.calendario + ' ' + (v ? 'Fechas y novedades · ' + n : 'Buscar fechas y novedades') + '</button>' : ''; };

  /* ---------- Revisar el contenido con Mr. Piggy ---------- */
  // Revisa las piezas que ya están (tono de la marca, copys, hashtags, lo que va en la pieza) y el mes completo.
  // Devuelve una nota por pieza (bien / mejorar / rehacer) con comentarios y, si hace falta, el texto corregido para aplicar.
  const NOTA = { bien: ['Bien', '--s-entregado'], mejorar: ['Mejorar', '--s-confirmar'], rehacer: ['Rehacer', '--s-cancelado'] };
  const notaPill = n => { const x = NOTA[n] || [n, '--muted']; return '<span class="pzst" style="--c:var(' + x[1] + ')">' + esc(x[0]) + '</span>'; };
  function abrirRevision(m) {
    const ps = piezas(m._id) || [], rv = st.rev && st.rev.mesId === m._id ? st.rev : null, selN = ps.filter(z => st.sel.has(z._id)).length;
    const porId = new Map(ps.map(z => [z._id, z]));
    let body;
    if (!rv || (!rv.items.size && !rv.busy)) {
      body = '<p class="formnote full">Mr. Piggy revisa lo que ya está cargado como lo haría la directora de cuentas antes de mandarlo al cliente: si respeta la ficha de marca, si los copys tienen gancho, párrafos y llamado a la acción, los emojis, los hashtags y lo que va en cada pieza. También mira el mes completo. Te marca cada pieza y, si hace falta, te deja el texto corregido para aplicar.</p>' +
        '<div class="field full"><label for="rv-pedido">Qué querés que revise <span class="muted">(opcional)</span></label><textarea id="rv-pedido" class="pz-ta" rows="3" placeholder="Ej.: revisá solo los carruseles · fijate que los copys no repitan el cierre · las historias tienen que invitar a escribir por WhatsApp · ¿algo habla de precios?">' + esc(st.revPedido || '') + '</textarea><span class="hint">Si nombrás piezas o formatos, Mr. Piggy revisa solo esas.</span></div>' +
        '<fieldset class="full ag-alc"><legend class="lbl">Qué piezas</legend><label class="chk"><input type="radio" name="rv-alc" value="todas" checked> Todas las del mes <span class="muted num">' + ps.length + '</span></label>' +
        '<label class="chk"><input type="radio" name="rv-alc" value="sel"' + (selN ? '' : ' disabled') + '> Las seleccionadas <span class="muted num">' + selN + '</span></label></fieldset>' + replChips(m, 'rv-redes');
    } else {
      const its = [...rv.items.entries()].map(([id, x]) => ({ id, x, z: porId.get(id) })).filter(o => o.z).sort((a, b) => ['rehacer', 'mejorar', 'bien'].indexOf(a.x.nota) - ['rehacer', 'mejorar', 'bien'].indexOf(b.x.nota));
      const cuenta = n => its.filter(o => o.x.nota === n).length;
      body = (rv.pedido ? '<p class="full rv-ped"><b>Le pediste:</b> ' + esc(rv.pedido) + '</p>' : '') + (rv.busy ? '<p class="formnote full"><span class="ia-dots"><i></i><i></i><i></i></span> Revisando ' + rv.hechas + ' de ' + rv.total + '…</p>' : '') +
        (rv.resumen || rv.observaciones.length ? '<div class="full ag-crit"><b>El mes</b>' + (rv.resumen ? '<p>' + esc(rv.resumen) + '</p>' : '') + (rv.observaciones.length ? '<ul class="rv-obs">' + rv.observaciones.map(o => '<li>' + esc(o) + '</li>').join('') + '</ul>' : '') + '</div>' : '') +
        (its.length ? '<div class="full rv-cnt">' + ['rehacer', 'mejorar', 'bien'].map(n => cuenta(n) ? notaPill(n) + ' <b class="num">' + cuenta(n) + '</b>' : '').join(' ') + '</div>' : '') +
        '<div class="full rv-l">' + its.map(({ id, x, z }) => {
          const sug = ['contenido', 'copy', 'hashtags'].filter(k => x[k] && String(x[k]).trim() && String(x[k]).trim() !== String(z[k] || '').trim());
          return '<div class="rv-p" style="--fc:' + fmtColor(z.formato) + '"><div class="rv-h"><span class="rm-fpill">' + esc(z.formato) + '</span><button type="button" class="btn link rv-t" data-act="rmPieza" data-id="' + esc(id) + '">' + esc(z.tema || 'Sin tema') + '</button>' + notaPill(x.nota) + '</div>' +
            (x.comentarios.length ? '<ul class="rv-c">' + x.comentarios.map(c => '<li>' + esc(c) + '</li>').join('') + '</ul>' : '') +
            (x.aplicado ? '<p class="rv-ok">✓ Sugerencia aplicada</p>' : sug.length ? '<details class="rv-s"><summary>Ver lo que propone (' + sug.map(k => ({ contenido: 'qué va en la pieza', copy: 'copy', hashtags: 'hashtags' }[k])).join(', ') + ')</summary>' + sug.map(k => '<div class="rv-sb"><span class="lbl">' + ({ contenido: 'Qué va en la pieza', copy: 'Copy', hashtags: 'Hashtags' }[k]) + '</span><p>' + esc(x[k]) + '</p></div>').join('') + '</details><button type="button" class="btn sm" data-act="rmRevAplicar" data-id="' + esc(id) + '">Aplicar sugerencia</button>' : '') + '</div>'; }).join('') + '</div>';
    }
    const pend = rv ? [...rv.items.entries()].filter(([id, x]) => !x.aplicado && porId.get(id) && ['contenido', 'copy', 'hashtags'].some(k => x[k] && String(x[k]).trim() !== String(porId.get(id)[k] || '').trim())).length : 0;
    $('#panel').innerHTML = '<form id="rmrev" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(m.cliente) + ' · ' + esc(cap(monthLabel(m.mes))) + '</span><h2 id="panel-title">Revisión de Mr. Piggy</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b">' + body + '</div><div class="panel-f"><span>' + (rv && !rv.busy && rv.items.size ? '<button type="button" class="btn ghost" data-act="rmRevNueva">Revisar de nuevo</button>' : '') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cerrar</button>' +
      (!rv || (!rv.items.size && !rv.busy) ? '<button type="submit" class="btn primary">Revisar</button>' : pend && !rv.busy ? '<button type="button" class="btn primary" data-act="rmRevAplicarTodas">Aplicar ' + pend + (pend === 1 ? ' sugerencia' : ' sugerencias') + '</button>' : '') + '</span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false;
  }
  async function revisar(m) {
    const alc = (document.querySelector('input[name="rv-alc"]:checked') || {}).value || 'todas';
    const pedido = st.revPedido = (($('#rv-pedido') || {}).value || '').trim().slice(0, 2000);
    const ps = (piezas(m._id) || []).filter(z => alc === 'sel' ? st.sel.has(z._id) : true);
    if (!ps.length) { toast('No hay piezas para revisar'); return; }
    // Las piezas revisadas pasan a publicarse en las redes elegidas (por defecto, todas las de la cuenta)
    if ($('#rv-redes')) { const redes = leerRepl(m, 'rv-redes'), cambia = ps.filter(z => redesPara(z.formato, redes).join(', ') !== (z.red || ''));
      for (const z of cambia) { const red = redesPara(z.formato, redes).join(', '); try { await data.piezasUpd([z._id], { red }); z.red = red; } catch (e) { toast(e.message); break; } } }
    const rv = st.rev = { mesId: m._id, busy: true, hechas: 0, total: ps.length, items: new Map(), resumen: '', observaciones: [], pedido };
    abrirRevision(m);
    const c = ctxIA(m); delete c._pp;
    const todas = (piezas(m._id) || []).map(z => ({ fecha: z.fecha, hora: z.hora, formato: z.formato, tema: z.tema, estado: z.estado }));
    const tandas = []; for (let i = 0; i < ps.length; i += 6) tandas.push(ps.slice(i, i + 6));
    let fallo = null;
    const una = async (t, general) => {
      try {
        const r = await data.ia({ modo: 'redes_revision', texto: JSON.stringify(t.map(z => ({ id: z._id, formato: z.formato, redes: z.red, ...((z.fuentes || []).length ? { fuentes: z.fuentes } : {}), fecha: z.fecha, hora: z.hora, tema: z.tema, contenido: z.contenido || '', copy: z.copy, hashtags: z.hashtags }))), contexto: { ...c, general, ...(pedido ? { pedido } : {}), ...(general ? { todas } : {}) } });
        if (general) { rv.resumen = String(r.resumen || ''); rv.observaciones = (Array.isArray(r.observaciones) ? r.observaciones : []).map(String).slice(0, 8); }
        (Array.isArray(r.piezas) ? r.piezas : []).forEach(x => { if (!x || !t.some(z => z._id === x.id)) return; rv.items.set(x.id, { nota: NOTA[x.nota] ? x.nota : 'mejorar', comentarios: (Array.isArray(x.comentarios) ? x.comentarios : []).map(String).slice(0, 4), copy: x.copy || '', hashtags: x.hashtags || '', contenido: x.contenido || '' }); });
      } catch (e) { fallo = e; }
      rv.hechas += t.length; if (st.rev === rv && $('#rmrev')) abrirRevision(m);
    };
    for (let i = 0; i < tandas.length; i += 3) await Promise.all(tandas.slice(i, i + 3).map((t, j) => una(t, i + j === 0)));
    rv.busy = false;
    if (fallo && !rv.items.size) { st.rev = null; toast(fallo.message); }
    if ($('#rmrev')) abrirRevision(m); render();
  }
  async function aplicarRev(m, ids) {
    const rv = st.rev; if (!rv) return; let n = 0; const cambios = [];
    for (const id of ids) {
      const x = rv.items.get(id), z = (piezas(m._id) || []).find(y => y._id === id); if (!x || !z || x.aplicado) continue;
      const u = {}; ['contenido', 'copy', 'hashtags'].forEach(k => { if (x[k] && String(x[k]).trim() && String(x[k]).trim() !== String(z[k] || '').trim()) u[k] = k === 'copy' ? espaciar(x[k], m.cliente) : String(x[k]).trim(); });
      if (!Object.keys(u).length) continue;
      const antes = antesDe(z, u), uv = conVersion(z, u, 'Revisión de Mr. Piggy');
      try { await data.piezasUpd([id], uv); local(m._id, [id], uv); x.aplicado = true; n++; cambios.push({ id, antes }); } catch (e) { toast(e.message); break; }
    }
    if (n) ofrecerDeshacerIA(m, cambios, n + (n === 1 ? ' sugerencia aplicada' : ' sugerencias aplicadas'));
    abrirRevision(m); render();
  }

  /* ---------- Piezas extra (fuera del plan) ---------- */
  // Por cuenta se decide si las extras se cobran (con precio por formato) o van de onda; en cada pieza se puede cambiar.
  // Las que se cobran aparecen como sugerencia en el resumen del mes (Finanzas). Los precios solo los ven los administradores.
  const extrasDe = ps => (ps || []).filter(z => z.extra && !soloAds(z));
  const seCobra = (z, cfg) => z.extraCobro === 'si' || (cfg.cobro && z.extraCobro !== 'no');
  const precioX = (z, cfg) => { const k = Object.keys(cfg.precios || {}).find(f => norm(f) === norm(z.formato)); return k ? +cfg.precios[k] || 0 : null; };
  function extrasResumen(cliente, ps) {
    const cfg = xCfg(cliente), xs = extrasDe(ps), cob = xs.filter(z => seCobra(z, cfg));
    let total = 0, faltaPrecio = [];
    cob.forEach(z => { const p = precioX(z, cfg); if (p == null) faltaPrecio.push(z.formato); else total += p; });
    return { cfg, xs, cob, total, faltaPrecio: [...new Set(faltaPrecio)] };
  }
  function extrasBtn(m, ps) {
    const r = extrasResumen(m.cliente, ps); if (!r.xs.length) return '';
    return '<button class="btn ghost sm rm-xbtn" data-act="rmExtras" data-id="' + esc(m._id) + '">' + r.xs.length + (r.xs.length === 1 ? ' extra' : ' extras') + (r.cfg.admin ? (r.cob.length ? ' · ' + r.cob.length + ' a cobrar' + (r.total ? ' (' + (ctx.money ? ctx.money(r.total, r.cfg.moneda) : r.total) + ')' : '') : ' · sin cargo') : '') + '</button>';
  }
  function abrirExtras(m) {
    const ps = piezas(m._id) || [], r = extrasResumen(m.cliente, ps), cfg = r.cfg, can = isStaff();
    const fila = z => { const p = precioX(z, cfg), sc = seCobra(z, cfg);
      return '<div class="xp-r" style="--fc:' + fmtColor(z.formato) + '"><span class="rm-fpill">' + esc(z.formato) + '</span><span class="xp-t"><b>' + esc(z.tema || 'Sin tema') + '</b><small>' + (z.fecha ? esc(fmtShort(z.fecha)) : 'Sin fecha') + ' · ' + esc(z.estado) + '</small></span>' +
        '<select class="in sm" data-xcobro="' + esc(z._id) + '"' + (can ? '' : ' disabled') + ' aria-label="¿Se cobra?">' + opt('', cfg.admin ? 'Según la cuenta' : 'Según lo arreglado', z.extraCobro || '') + opt('si', 'Se cobra', z.extraCobro || '') + opt('no', 'Sin cargo', z.extraCobro || '') + '</select>' +
        (cfg.admin ? '<span class="xp-m num">' + (sc ? (p == null ? '<span class="muted">sin precio</span>' : esc(ctx.money ? ctx.money(p, cfg.moneda) : String(p))) : '<span class="muted">—</span>') + '</span>' : '') + '</div>'; };
    $('#panel').innerHTML = '<div style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(m.cliente) + ' · ' + esc(cap(monthLabel(m.mes))) + '</span><h2 id="panel-title">Piezas extra</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><p class="formnote full">Las piezas que se hicieron fuera del plan del mes. ' + (cfg.admin ? (cfg.cobro ? 'En esta cuenta las extras se cobran: las marcadas “se cobra” aparecen en el resumen del mes.' : 'En esta cuenta las extras van sin cargo, salvo las que marques “se cobra”.') : 'Si se cobran o no lo define administración.') + '</p>' +
      '<div class="full xp-l">' + r.xs.map(fila).join('') + '</div>' +
      (cfg.admin ? '<div class="full xp-tot"><span>' + r.cob.length + (r.cob.length === 1 ? ' pieza a cobrar' : ' piezas a cobrar') + '</span><b class="num">' + esc(ctx.money ? ctx.money(r.total, cfg.moneda) : String(r.total)) + '</b></div>' + (r.faltaPrecio.length ? '<p class="hint full">Falta el precio de ' + esc(r.faltaPrecio.join(', ')) + ' para esta cuenta.</p>' : '') +
        '<button type="button" class="btn sm full" style="justify-self:start" data-act="rmXCfg" data-c="' + esc(m.cliente) + '">Cobro de extras de ' + esc(m.cliente) + ': ' + (cfg.cobro ? 'se cobran' : 'de onda') + ' · cambiar precios</button>' : '') +
      '</div><div class="panel-f"><span></span><button type="button" class="btn" data-act="close">Listo</button></div></div>';
    st.xMes = m._id; $('#panel').hidden = false; $('#scrim').hidden = false;
  }

  /* ---------- Fechas y horarios con Mr. Piggy ---------- */
  // Mira la cuenta (rubro, público, ficha), el contenido de cada pieza, lo que ya está agendado y los informes anteriores si hay,
  // y propone día y hora para cada pieza, con el criterio. Se revisa antes de aplicar. Los horarios pueden quedar como los de la cuenta.
  const movibles = (ps, alc) => ps.filter(z => alc === 'todas' ? !['Programada', 'Publicada'].includes(z.estado) && !z.fijo : !z.fecha || !z.hora);
  function abrirAgenda(m) {
    const ps = piezas(m._id) || [], ag = st.ag && st.ag.mesId === m._id ? st.ag : (st.ag = { mesId: m._id, alc: ps.some(z => !z.fecha || !z.hora) ? 'sin' : 'todas', guardar: true, res: null, busy: false });
    const nSin = movibles(ps, 'sin').length, nTodas = movibles(ps, 'todas').length, hc = horariosCuenta(m.cliente), c = S.C.find(x => x.nombre === m.cliente) || {};
    const r = ag.res, porId = new Map(ps.map(z => [z._id, z]));
    const prop = r ? '<div class="full ag-res"><div class="ag-crit"><b>Criterio</b><p>' + esc(r.criterio || '') + '</p></div>' +
      (r.horarios.length ? '<div class="ag-hrs">' + r.horarios.map(h => '<span class="ag-h" style="--fc:' + fmtColor(h.formato) + '"><i class="rm-dot"></i><b>' + esc(h.formato) + '</b> ' + esc(h.hora) + (h.dias ? ' <span class="muted">· ' + esc(h.dias) + '</span>' : '') + '</span>').join('') + '</div>' : '') +
      '<div class="ag-lista">' + r.piezas.sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora)).map(x => { const z = porId.get(x.id); if (!z) return '';
        const d = new Date(x.fecha + 'T12:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
        return '<div class="ag-p" style="--fc:' + fmtColor(z.formato) + '"><span class="ag-d"><b>' + esc(d) + '</b> ' + esc(x.hora) + '</span><span class="ag-t"><span class="rm-fpill">' + esc(z.formato) + '</span> ' + esc(z.tema || 'Sin tema') + (x.motivo ? '<small>' + esc(x.motivo) + '</small>' : '') + '</span>' + (z.fecha && (z.fecha !== x.fecha || z.hora !== x.hora) ? '<span class="ag-antes muted" title="Lo que tenía">antes ' + esc(fmtShort(z.fecha)) + (z.hora ? ' ' + esc(z.hora) : '') + '</span>' : '') + '</div>'; }).join('') + '</div>' +
      (r.faltan ? '<p class="hint">' + r.faltan + (r.faltan === 1 ? ' pieza quedó' : ' piezas quedaron') + ' sin propuesta: se dejan como están.</p>' : '') + '</div>' : '';
    $('#panel').innerHTML = '<form id="rmagenda" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(m.cliente) + ' · ' + esc(cap(monthLabel(m.mes))) + '</span><h2 id="panel-title">Fechas y horarios con Mr. Piggy</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><p class="formnote full">Mr. Piggy mira el rubro y el público de ' + esc(m.cliente) + (c.marca && fm_lleno(c.marca) ? ' (ficha de marca)' : '') + ', qué dice cada pieza, lo que ya está agendado y los informes anteriores si hay, y propone día y hora para cada una. Sin datos de rendimiento de la cuenta es una estimación por rubro y público: lo revisás antes de aplicar.</p>' +
      '<fieldset class="full ag-alc"><legend class="lbl">Qué piezas</legend>' +
      '<label class="chk"><input type="radio" name="ag-alc" value="sin"' + (ag.alc === 'sin' ? ' checked' : '') + (nSin ? '' : ' disabled') + '> Las que no tienen fecha u hora <span class="muted num">' + nSin + '</span></label>' +
      '<label class="chk"><input type="radio" name="ag-alc" value="todas"' + (ag.alc === 'todas' ? ' checked' : '') + '> Todas, menos las programadas, publicadas y fijas <span class="muted num">' + nTodas + '</span></label></fieldset>' +
      '<label class="chk full"><input type="checkbox" id="ag-guardar"' + (ag.guardar ? ' checked' : '') + '> Guardar los horarios que proponga como los de ' + esc(m.cliente) + ' (los usa al proponer contenido y al poner horarios)</label>' +
      (hc ? '<p class="hint full">Horarios actuales de la cuenta: ' + esc(Object.entries(hc).map(([f, h]) => f + ' ' + h.hora).join(' · ')) + '</p>' : '') +
      prop + '</div>' +
      '<div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button>' +
      (r ? '<button type="button" class="btn" data-act="rmAgendaPedir"' + (ag.busy ? ' disabled' : '') + '>Pedir otra</button><button type="submit" class="btn primary" data-ag="aplicar"' + (ag.busy ? ' disabled' : '') + '>Aplicar a ' + r.piezas.length + (r.piezas.length === 1 ? ' pieza' : ' piezas') + '</button>'
        : '<button type="submit" class="btn primary"' + (ag.busy ? ' disabled' : '') + '>' + (ag.busy ? '<span class="ia-dots"><i></i><i></i><i></i></span> Analizando la cuenta…' : 'Analizar y proponer') + '</button>') + '</span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false;
  }
  const fm_lleno = mk => Object.entries(mk || {}).some(([k, v]) => !['horarios', 'fuentes', 'actualizado'].includes(k) && String(v || '').trim());
  async function pedirAgenda(m) {
    const ag = st.ag; if (!ag || ag.busy) return;
    const rad = document.querySelector('input[name="ag-alc"]:checked'); if (rad) ag.alc = rad.value; if ($('#ag-guardar')) ag.guardar = $('#ag-guardar').checked;
    const ps = piezas(m._id) || [], mov = movibles(ps, ag.alc);
    if (!mov.length) { toast('No hay piezas para ubicar'); return; }
    ag.busy = true; ag.res = null; abrirAgenda(m);
    try {
      ag.res = await agendaIA(m, ps, mov);
      if (!ag.res.piezas.length) toast('Mr. Piggy no devolvió fechas válidas. Probá de nuevo.');
    } catch (e) { toast(e.message); }
    ag.busy = false; if (st.ag === ag && $('#rmagenda')) abrirAgenda(m);
  }
  // Pide a Mr. Piggy día y hora para las piezas "mov" (las demás del mes quedan como ocupadas).
  async function agendaIA(m, ps, mov) {
    {
      const cli = S.C.find(x => x.nombre === m.cliente) || {};
      let infs = []; try { infs = (await data.informesDe(m.cliente)).slice(0, 3).map(i => ({ mes: i.mes, datos: i.datos })); } catch (e) { infs = []; }
      const movIds = new Set(mov.map(z => z._id));
      const r = await data.ia({ modo: 'redes_agenda', contexto: { cliente: m.cliente, ...(ctx.marcaCtx ? ctx.marcaCtx(m.cliente, ps) : {}), notas_cliente: cli.notas || '', servicios: ctx.servicios ? ctx.servicios(m.cliente) : '', mes: m.mes, formatos: formatos(),
        horarios_actuales: Object.fromEntries(formatos().map(f => [f, horaDe(f, m.cliente)])), informes_anteriores: JSON.stringify(infs).slice(0, 8000),
        a_ubicar: mov.map(z => ({ id: z._id, formato: z.formato, tema: z.tema, contenido: (z.contenido || z.copy || '').slice(0, 300), fecha_actual: z.fecha, hora_actual: z.hora })),
        ocupadas: ps.filter(z => !movIds.has(z._id) && z.fecha).map(z => ({ formato: z.formato, fecha: z.fecha, hora: z.hora, tema: z.tema })) } });
      const piezasR = (Array.isArray(r.piezas) ? r.piezas : []).filter(x => x && movIds.has(x.id) && /^\d{4}-\d{2}-\d{2}$/.test(x.fecha || '') && String(x.fecha).startsWith(m.mes) && /^\d{1,2}:\d{2}/.test(x.hora || ''))
        .map(x => ({ id: x.id, fecha: x.fecha, hora: String(x.hora).slice(0, 5).padStart(5, '0'), motivo: String(x.motivo || '').slice(0, 120) }));
      const unicos = [...new Map(piezasR.map(x => [x.id, x])).values()];
      const horarios = (Array.isArray(r.horarios) ? r.horarios : []).filter(h => h && h.formato && /^\d{1,2}:\d{2}/.test(h.hora || '')).map(h => ({ formato: formatos().find(f => norm(f) === norm(h.formato)) || h.formato, hora: String(h.hora).slice(0, 5).padStart(5, '0'), dias: String(h.dias || '').slice(0, 40) }));
      return { criterio: String(r.criterio || ''), horarios, piezas: unicos, faltan: mov.length - unicos.length };
    }
  }
  // Guarda los horarios que propuso Mr. Piggy como los de la cuenta
  async function guardarHorarios(m, r) {
    const c = S.C.find(x => x.nombre === m.cliente); if (!c || !r.horarios.length) return;
    const marca = { ...(c.marca || {}), horarios: { criterio: r.criterio, actualizado: today(), formatos: Object.fromEntries(r.horarios.map(h => [h.formato, { hora: h.hora, dias: h.dias }])) } };
    await data.marcaGuardar(c._id, marca); c.marca = marca;
  }
  async function aplicarAgenda(m) {
    const ag = st.ag, r = ag && ag.res; if (!r || !r.piezas.length || ag.busy) return;
    if ($('#ag-guardar')) ag.guardar = $('#ag-guardar').checked;
    ag.busy = true; abrirAgenda(m);
    try {
      for (const x of r.piezas) { await data.piezasUpd([x.id], { fecha: x.fecha, hora: x.hora }); local(m._id, [x.id], { fecha: x.fecha, hora: x.hora }); }
      if (ag.guardar && r.horarios.length) {
        const c = S.C.find(x => x.nombre === m.cliente);
        if (c) { const marca = { ...(c.marca || {}), horarios: { criterio: r.criterio, actualizado: today(), formatos: Object.fromEntries(r.horarios.map(h => [h.formato, { hora: h.hora, dias: h.dias }])) } };
          try { await data.marcaGuardar(c._id, marca); c.marca = marca; } catch (e) { toast('Las fechas se aplicaron, pero no se pudieron guardar los horarios de la cuenta: ' + e.message); } }
      }
      st.ag = null; ctx.closeForm(); toast(r.piezas.length + (r.piezas.length === 1 ? ' pieza agendada' : ' piezas agendadas') + (ag.guardar && r.horarios.length ? ' · horarios guardados para ' + m.cliente : '')); render();
    } catch (e) { ag.busy = false; toast(e.message); abrirAgenda(m); render(); }
  }
  function abrirPlan(m) {
    st.planMes = m._id; S.form = null;
    const fs = [...new Set([...formatos(), ...Object.keys(m.plan || {})])];
    $('#panel').innerHTML = '<form id="rmplan" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(m.cliente) + ' · ' + esc(cap(monthLabel(m.mes))) + '</span><h2 id="panel-title">Plan del mes</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><p class="formnote full">Cuántas piezas de cada formato incluye el abono este mes. Es una meta: si se hacen más, quedan como extras.</p>' +
      fs.map(f => '<div class="field"><label for="rmp-' + esc(norm(f).replace(/\W/g, '')) + '">' + esc(f) + '</label><input type="number" min="0" max="200" data-rmplan="' + esc(f) + '" id="rmp-' + esc(norm(f).replace(/\W/g, '')) + '" value="' + esc((m.plan || {})[f] || '') + '" placeholder="0"></div>').join('') +
      '<p class="hint full">Los formatos se editan en Opciones. Para que cada mes arranque con este plan, cargá las piezas de cada plan en Opciones → Piezas por plan.</p></div>' +
      '<div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary">Guardar plan</button></span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false;
  }

  document.addEventListener('submit', async e => {
    const f = e.target;
    if (f.id === 'pzform') { e.preventDefault(); e.stopImmediatePropagation(); guardarPieza(); return; }
    if (f.id === 'rmchat') { e.preventDefault(); e.stopImmediatePropagation(); repartirChat(); return; }
    if (f.id === 'rmpasar') { e.preventDefault(); e.stopImmediatePropagation(); const m = st.pasar && mesDe(st.pasar.mesId); if (m) pasarEtapa(m); return; }
    if (f.id === 'rmprop') { e.preventDefault(); e.stopImmediatePropagation(); const m = st.propMes && mesDe(st.propMes); if (!m) return; const redes = leerRepl(m, 'prop-redes'), buscar = !!($('#prop-web') || {}).checked; ctx.closeForm(); ideas(null, m, { redes, buscar, confirmado: true }); return; }
    if (f.id === 'rmrev') { e.preventDefault(); e.stopImmediatePropagation(); const m = st.revMes && mesDe(st.revMes); if (m) revisar(m); return; }
    if (f.id === 'rmagenda') { e.preventDefault(); e.stopImmediatePropagation(); const m = st.ag && mesDe(st.ag.mesId); if (!m) return; if (st.ag.res) aplicarAgenda(m); else pedirAgenda(m); return; }
    if (f.id === 'rmplan') {
      e.preventDefault(); e.stopImmediatePropagation();
      const m = mesDe(st.planMes); if (!m) return;
      const plan = {}; document.querySelectorAll('[data-rmplan]').forEach(i => { const n = Math.round(+i.value || 0); if (n > 0) plan[i.dataset.rmplan] = n; });
      try { await data.mesUpd(m._id, { plan }); m.plan = plan; ctx.closeForm(); toast('Plan guardado'); render(); } catch (er) { toast(er.message); }
      return;
    }
    if (f.dataset && f.dataset.rmadd) {
      e.preventDefault(); e.stopImmediatePropagation();
      const m = mesDe(f.dataset.rmadd); if (!m) return;
      const dd = f.closest('details'); if (dd) dd.open = false;
      const n = Math.max(1, Math.min(60, Math.round(+f.elements.n.value || 1))), fo = (f.querySelector('input[name="f"]:checked') || f.elements.f).value;
      const ps = piezas(m._id) || [], ya = enPlan(ps).filter(z => z.formato === fo).length, pl = +(m.plan || {})[fo] || 0, uso = f.querySelector('input[name="u"]:checked') ? f.querySelector('input[name="u"]:checked').value : '';
      if (uso === 'solo' && data.cols && data.cols.piezaAds === false) { toast('Para marcar piezas de Ads falta correr el SQL 0028 en Supabase'); return; }
      const nuevas = Array.from({ length: n }, (_, i) => ({ formato: fo, estado: 'Idea', extra: uso !== 'solo' && pl > 0 && ya + i >= pl, ...(uso ? { ads: uso } : {}) }));
      try { const ins = await insPiezas(m, nuevas); P.set(m._id, [...ps, ...ins]); toast(n === 1 ? 'Pieza agregada' : n + ' piezas agregadas'); render(); } catch (er) { toast(er.message); }
    }
  }, true);
  document.addEventListener('change', async e => {
    const t = e.target;
    if (t.dataset && t.dataset.rmup && t.files && t.files.length) { subir(t); return; }
    if (t.dataset && t.dataset.pz) {
      const id = t.dataset.id, k = t.dataset.pz, v = t.value;
      const m = meses().find(x => (piezas(x._id) || []).some(z => z._id === id)); if (!m) return;
      try { await data.piezasUpd([id], { [k]: v }); local(m._id, [id], { [k]: v }); if (k === 'estado' || k === 'formato' || k === 'fecha') render(); if (k === 'estado') revisarAvance(m); } catch (er) { toast(er.message); render(); }
      return;
    }
    if (t.dataset && t.dataset.rmupd) {
      const m = mesDe(t.dataset.id); if (!m) return;
      const k = t.dataset.rmupd, v = t.type === 'checkbox' ? t.checked : t.value;
      const u = { [k]: v };
      if (k === 'visible' && v && !m.enviadoAt) u.enviadoAt = new Date().toISOString();
      try { await data.mesUpd(m._id, u); Object.assign(m, u); if (k !== 'notas' && k !== 'horas') render(); if (k === 'visible') toast(v ? 'El cliente ya lo ve en su portal' : 'Ya no se ve en el portal'); } catch (er) { toast(er.message); }
      return;
    }
    if (t.dataset && t.dataset.rmsel) { if (t.checked) st.sel.add(t.dataset.rmsel); else st.sel.delete(t.dataset.rmsel); render(); return; }
    if (t.dataset && t.dataset.rmselall) { (piezas(t.dataset.rmselall) || []).filter(z => st.vis.includes(z._id)).forEach(z => t.checked ? st.sel.add(z._id) : st.sel.delete(z._id)); render(); return; }
    if (t.dataset && t.dataset.invusar) {
      const m = st.invMes && mesDe(st.invMes); if (!m || !m.investigacion) return;
      const [k, i] = t.dataset.invusar.split(':'), arr = k === 'f' ? m.investigacion.fechas : m.investigacion.novedades;
      if (arr[+i]) arr[+i].usar = t.checked;
      try { if (!await data.mesInvestigacion(m._id, m.investigacion)) st.invSinGuardar = true; } catch (er) { toast(er.message); }
      render(); return;
    }
    if (t.dataset && t.dataset.pasar) { const m = mesDe(t.dataset.pasar); if (!m) return; if (t.id === 'pa-de') { abrirPasar(m, t.value); return; } const q = $('#pa-quien'); if (q) q.innerHTML = pasarQuien(m, t.value); return; }
    if (t.dataset && t.dataset.chattipo) { const m = mesDe(t.dataset.chattipo), txt = ($('#rmchat-t') || {}).value || ''; if (m) { abrirChat(m, t.value); if ($('#rmchat-t')) $('#rmchat-t').value = txt; } return; }
    if (t.dataset && t.dataset.xcobro) {
      const id = t.dataset.xcobro, v = t.value, m = meses().find(x => (piezas(x._id) || []).some(z => z._id === id)); if (!m) return;
      try { await data.piezasUpd([id], { extraCobro: v }); local(m._id, [id], { extraCobro: v }); abrirExtras(m); render(); } catch (er) { toast(er.message); }
      return;
    }
    if (t.dataset && t.dataset.rmff != null) { const f = t.dataset.rmff; if (t.checked) st.fOff.delete(f); else st.fOff.add(f); st.sel.clear(); render(); return; }
    if (t.dataset && t.dataset.rmmio != null) { st.mio = t.checked; if (!t.checked) st.mioDe = null; st.sel.clear(); render(); return; }
    if (t.dataset && t.dataset.flujo) {
      const e = t.dataset.flujo, f = flujo(); const rs = new Set(f[e] || []); if (t.checked) rs.add(t.value); else rs.delete(t.value);
      f[e] = [...rs]; await guardarLista('flujoRedes', ESTADOS_PIEZA.map(x => x + '=' + (f[x] || []).join('+'))); return;
    }
    if (t.dataset && t.dataset.horared) {
      const f = t.dataset.horared, v = t.value; const resto = lista2('horasRedes', HORAS_DEF).filter(x => norm(x.split('=')[0]) !== norm(f));
      await guardarLista('horasRedes', [...resto, ...(v ? [f + '=' + v] : [])]); return;
    }
    if (t.id === 'rm-bk-est' || t.id === 'rm-bk-resp') {
      const ids = [...st.sel], v = t.value; if (!v || !ids.length) return;
      const u = t.id === 'rm-bk-est' ? { estado: v } : { resp: v === '__nadie' ? '' : v };
      const m = meses().find(x => (piezas(x._id) || []).some(z => ids.includes(z._id)));
      try { await data.piezasUpd(ids, u); if (m) local(m._id, ids, u); toast(ids.length + ' piezas actualizadas'); render(); } catch (er) { toast(er.message); }
    }
  });

  const acts = {
    rmMes: t => { const d = +t.dataset.d; st.mes = d ? addMonth(st.mes, d) : thisMonth(); render(); },
    rmAbrir: t => { st.mio = false; st.mioDe = null; ctx.irMes(t.dataset.id); },
    rmFuenteNo: async t => {
      const m = mesDe(st.invMes), d = String(dominio(t.dataset.u)).toLowerCase(); if (!d) return;
      const arr = [...new Set([...(S.L.fuentesNo || []), d])]; S.L.fuentesNo = arr;
      if (m && m.investigacion) { [...(m.investigacion.fechas || []), ...(m.investigacion.novedades || [])].forEach(x => { if (x.fuente && descartada(x.fuente)) x.usar = false; }); try { await data.mesInvestigacion(m._id, m.investigacion); } catch (e) { /* queda en pantalla */ } }
      try { await data.saveLista('fuentesNo', arr); toast(d + ' no se usa más como fuente. Lo que venía de ahí quedó destildado.'); } catch (e) { toast(e.message); }
      if (m) abrirInvestigacion(m);
    },
    rmFuenteSi: async t => { const arr = (S.L.fuentesNo || []).filter(x => String(x).toLowerCase().replace(/^www\./, '') !== t.dataset.d); S.L.fuentesNo = arr; try { await data.saveLista('fuentesNo', arr); } catch (e) { toast(e.message); } const m = mesDe(st.invMes); if (m) abrirInvestigacion(m); },
    rmCambiarIdea: t => cambiarIdea(t),
    rmInvSumar: t => { const m = mesDe(t.dataset.id); if (m) sumarFaltantes(m); },
    rmMio: t => { st.mio = true; st.mioDe = t.dataset.p || null; st.sel.clear(); ctx.irMes(t.dataset.id); },
    rmVolver: () => ctx.irMes(null),
    rmTab: t => { st.tab = t.dataset.t; lsSet('rmTab', st.tab); render(); },
    rmArrancar: async t => { t.disabled = true; try { const m = await arrancar(t.dataset.c, st.mes, mesCliente(t.dataset.c, addMonth(st.mes, -1))); ctx.irMes(m._id); ofrecerDeshacer('Mes arrancado para ' + t.dataset.c, [m]); } catch (e) { toast(e.message); t.disabled = false; } },
    rmBorrarMes: async t => {
      const m = mesDe(t.dataset.id); if (!m) return; const n = (piezas(m._id) || []).length;
      if (!await confirmar('¿Borrar ' + monthLabel(m.mes) + ' de ' + m.cliente + '?' + (n ? ' Se borran también sus ' + n + ' piezas.' : '') + ' No se puede deshacer.')) return;
      try { await borrarMes(m); } catch (e) { toast(e.message); }
    },
    rmArrancarTodos: async t => { t.disabled = true; const hechos = []; for (const c of clientesMes(st.mes).filter(c => !mesCliente(c, st.mes))) { try { hechos.push(await arrancar(c, st.mes, mesCliente(c, addMonth(st.mes, -1)))); } catch (e) { toast(c + ': ' + e.message); } } render(); if (hechos.length) ofrecerDeshacer(hechos.length + ' meses arrancados', hechos); },
    rmSiguiente: async t => { const m = mesDe(t.dataset.id); if (!m) return; t.disabled = true; try { const nm = await arrancar(m.cliente, addMonth(m.mes, 1), m); ctx.irMes(nm._id); ofrecerDeshacer(cap(monthLabel(nm.mes)) + ' arrancado con el plan y las piezas fijas', [nm]); } catch (e) { toast(e.message); t.disabled = false; } },
    rmCarpeta: async t => { const m = mesDe(t.dataset.id); if (!m) return; t.disabled = true; t.textContent = 'Creando…'; try { const r = await data.dropbox({ accion: 'carpeta_mes', mes_id: m._id }); m.carpeta = r.carpeta; m.carpetaUrl = r.carpeta_url; toast('Carpetas creadas en Dropbox'); render(); } catch (e) { toast(e.message); t.disabled = false; t.textContent = 'Crear carpetas en Dropbox'; } },
    rmContar: t => { const m = mesDe(t.dataset.id); if (m) contar(m); },
    rmEnviar: t => { const m = mesDe(t.dataset.id); if (m) enviarMes(m); },
    rmSoltar: t => soltar(t.dataset.id, t.dataset.e),
    rmListo: t => { const z = pzDe(t.dataset.id); if (z) marcarListas(z.m, [z.z._id], t.dataset.v === '1'); },
    rmListoTodas: async t => { const m = mesDe(t.dataset.id); if (!m) return; const ps = (piezas(m._id) || []).filter(z => !hecha(m, z)); if (ps.length && await confirmar('¿Marco las ' + ps.length + ' piezas que faltan como listas en ' + etapaDe(m).n + '?')) marcarListas(m, ps.map(z => z._id), true); },
    rmListoSel: t => { const m = mesDe(t.dataset.id); if (!m) return; const ids = [...st.sel]; st.sel.clear(); marcarListas(m, ids, true); },
    rmDevolverSel: async t => { const m = mesDe(t.dataset.id); if (!m) return; const ids = [...st.sel]; const nota = await pedirNota(ids.length); if (nota === null) return; st.sel.clear(); devolver(m, ids, nota); },
    rmDevolverUno: async t => { const z = pzDe(t.dataset.id); if (!z) return; const nota = await pedirNota(1); if (nota === null) return; await devolver(z.m, [z.z._id], nota); abrirPieza(z.z._id); },
    rmPlan: t => { const m = mesDe(t.dataset.id); if (m) abrirPlan(m); },
    rmIdeas: t => { const m = mesDe(t.dataset.id); if (m && !st.ia[m._id]) abrirProponer(m); },
    rmCopiar: t => {
      let v = '';
      if (t.dataset.sel) v = ($(t.dataset.sel) || {}).value || '';
      else { const z = [...P.values()].flat().find(x => x._id === t.dataset.id); if (z) v = t.dataset.k === 'hashtags' ? z.hashtags : t.dataset.k === 'contenido' ? (z.contenido || '') : t.dataset.k === 'todo' ? [z.copy, z.hashtags].filter(Boolean).join('\n\n') : z.copy; }
      if (!v.trim()) { toast('No hay nada para copiar'); return; }
      { const mm = meses().find(x => (piezas(x._id) || []).some(z => z._id === t.dataset.id)) || (st.fpz && mesDe(st.fpz.mesId)); if (mm && t.dataset.k !== 'hashtags' && t.dataset.sel !== '#pz-hashtags') v = paraPegar(v, mm.cliente); }
      const ok = () => toast(t.dataset.k === 'hashtags' ? 'Hashtags copiados' : t.dataset.k === 'todo' ? 'Copy y hashtags copiados' : 'Copiado');
      try { navigator.clipboard.writeText(v).then(ok, () => toast('No se pudo copiar')); } catch (e) { toast('No se pudo copiar'); }
    },
    rmAgenda: t => { const m = mesDe(t.dataset.id); if (!m) return; if (!st.ag || st.ag.mesId !== m._id || !st.ag.busy) st.ag = null; abrirAgenda(m); },
    rmAgendaPedir: () => { const m = st.ag && mesDe(st.ag.mesId); if (m) { st.ag.res = null; pedirAgenda(m); } },
    rmHoras: t => { const m = mesDe(t.dataset.id); if (m) ponerHoras(m, !!t.dataset.sel); },
    rmPlanOk: async t => {
      const m = mesDe(t.dataset.id); if (!m) return; t.checked = false;
      const ps = piezas(m._id) || (await cargar([m._id]), piezas(m._id)) || [];
      if (ps.some(z => z.estado === 'Idea')) { abrirPasar(m, 'Idea'); return; }
      try { await data.mesUpd(m._id, { estado: 'Producción' }); m.estado = 'Producción'; render(); toast('Planificación de ' + m.cliente + ' revisada'); } catch (e) { toast(e.message); }
    },
    rmPasar: t => { const m = mesDe(t.dataset.id); if (m) abrirPasar(m, t.dataset.de); },
    rmChat: t => { const m = mesDe(t.dataset.id); if (m) abrirChat(m); },
    rmCopys: t => { const ids = [...st.sel]; const m = meses().find(x => (piezas(x._id) || []).some(z => ids.includes(z._id))); if (m) copys(ids, m, t); },
    rmInv: t => { const m = mesDe(t.dataset.id); if (m) abrirInvestigacion(m); },
    rmInvBuscar: t => { const m = mesDe(t.dataset.id); if (m) buscarInv(m); },
    rmInvProponer: t => { const m = mesDe(t.dataset.id); if (!m) return; ctx.closeForm(); ideas(null, m, { buscar: false, confirmado: true }); },
    rmRevisar: t => { const m = mesDe(t.dataset.id); if (!m) return; st.revMes = m._id; if (st.rev && st.rev.mesId !== m._id) st.rev = null; abrirRevision(m); },
    rmRevNueva: () => { const m = st.revMes && mesDe(st.revMes); if (!m) return; st.rev = null; abrirRevision(m); },
    rmRevAplicar: t => { const m = st.revMes && mesDe(st.revMes); if (m) aplicarRev(m, [t.dataset.id]); },
    rmRevAplicarTodas: () => { const m = st.revMes && mesDe(st.revMes); if (m && st.rev) aplicarRev(m, [...st.rev.items.keys()]); },
    rmVolverV: async t => {
      const f = st.fpz; if (!f) return; const m = mesDe(f.mesId), z = (piezas(f.mesId) || []).find(x => x._id === f.id); if (!m || !z) return;
      const v = (z.versiones || [])[+t.dataset.i]; if (!v) return;
      const u = Object.fromEntries(CAMPOS_V.filter(k => k in v).map(k => [k, v[k] || ''])), antes = antesDe(z, u), uv = conVersion(z, u, 'Volvió a una versión anterior');
      try { await data.piezasUpd([z._id], uv); local(m._id, [z._id], uv); abrirPieza(z._id); render(); ofrecerDeshacerIA(m, [{ id: z._id, antes }], 'Volvió a la versión del ' + new Date(v.at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })); } catch (e) { toast(e.message); }
    },
    rmVerMas: t => { const id = t.dataset.id; if (st.abiertos.has(id)) st.abiertos.delete(id); else st.abiertos.add(id); render(); },
    rmCitaCopiar: t => { const f = st.fpz, z = f && (piezas(f.mesId) || []).find(x => x._id === f.id), fu = z && (z.fuentes || [])[+t.dataset.i]; if (!fu) return; try { navigator.clipboard.writeText(citaDe(fu) + ' ' + fu.url).then(() => toast('Cita copiada'), () => toast('No se pudo copiar')); } catch (e) { toast('No se pudo copiar'); } },
    rmCitaSumar: t => { const f = st.fpz, z = f && (piezas(f.mesId) || []).find(x => x._id === f.id), fu = z && (z.fuentes || [])[+t.dataset.i], ta = $('#pz-copy'); if (!fu || !ta) return; const c = citaDe(fu); if (ta.value.includes(c)) { toast('La cita ya está en el copy'); return; } ta.value = ta.value.replace(/\s+$/, '') + '\n\n' + c; autoAlto(ta); toast('Cita agregada al copy: guardá la pieza'); },
    rmCant: t => { const i = t.closest('form').elements.n; i.value = Math.max(1, Math.min(60, (+i.value || 1) + +t.dataset.d)); },
    rmContEditar: t => { const f = t.closest('.pz-cont'); if (!f) return; f.classList.toggle('ver'); t.textContent = f.classList.contains('ver') ? 'Editar' : 'Ver'; if (!f.classList.contains('ver')) { const ta = $('#pz-contenido'); if (ta) { autoAlto(ta); ta.focus(); } } else { const v = f.querySelector('.pz-cv'); if (v) v.innerHTML = contenidoHtml(($('#pz-contenido') || {}).value || '') + copiarBtn('#pz-contenido'); } },
    rmContUno: async t => {
      const f = st.fpz; if (!f) return; const m = mesDe(f.mesId); const z = (piezas(f.mesId) || []).find(x => x._id === f.id); if (!m || !z) return;
      const tema = ($('#pz-tema').value || '').trim() || z.tema, actual = ($('#pz-contenido') || {}).value || '';
      const t0 = t.innerHTML; t.disabled = true; t.textContent = 'Escribiendo…';
      try {
        const c = ctxIA(m); delete c._pp; delete c.plan;
        const r = await data.ia({ modo: 'redes_contenido', texto: JSON.stringify([{ id: z._id, formato: ($('#pz-formato') || {}).value || z.formato, fecha: z.fecha, tema, contenido_actual: actual.trim(), copy: (($('#pz-copy') || {}).value || '').trim() }]), contexto: c });
        const x = (Array.isArray(r.piezas) ? r.piezas : []).find(y => y && y.contenido);
        if (x && $('#pz-contenido')) { f.ia = true; $('#pz-contenido').value = String(x.contenido).trim(); const fc = $('#pz-contenido').closest('.pz-cont'); if (fc) { fc.classList.remove('ver'); const b = fc.querySelector('[data-act="rmContEditar"]'); if (b) b.textContent = 'Ver'; } autoAlto($('#pz-contenido')); toast('Listo: revisalo y guardá la pieza'); } else toast('Mr. Piggy no devolvió nada. Probá de nuevo.');
      } catch (e) { toast(e.message); }
      t.disabled = false; t.innerHTML = t0;
    },
    rmExtras: t => { const m = mesDe(t.dataset.id); if (m) abrirExtras(m); },
    rmXCfg: t => { const ab = abonoRedes(t.dataset.c); if (ab && ctx.formExtras) ctx.formExtras(ab._id); },
    rmCopyUno: async t => { const f = st.fpz; if (!f) return; const m = mesDe(f.mesId); const z = (piezas(f.mesId) || []).find(x => x._id === f.id); if (!m || !z) return; z.tema = ($('#pz-tema').value || '').trim() || z.tema; if ($('#pz-contenido')) z.contenido = $('#pz-contenido').value.trim(); if ($('#pz-copy')) z.copy = $('#pz-copy').value.trim(); await copys([z._id], m, t); const zz = piezas(f.mesId).find(x => x._id === f.id); if ($('#pz-copy') && zz) { $('#pz-copy').value = zz.copy; $('#pz-hashtags').value = zz.hashtags; if ($('#pz-contenido')) $('#pz-contenido').value = zz.contenido || ''; document.querySelectorAll('#pzform .pz-ta').forEach(autoAlto); } },
    rmBorrar: async () => { const ids = [...st.sel]; if (!ids.length || !await confirmar('¿Borrar ' + ids.length + ' pieza' + (ids.length > 1 ? 's' : '') + '?')) return; try { await data.piezasDel(ids); P.forEach((ps, k) => P.set(k, ps.filter(z => !ids.includes(z._id)))); st.sel.clear(); toast('Borradas'); render(); } catch (e) { toast(e.message); } },
    rmSelNada: () => { st.sel.clear(); render(); },
    rmPieza: t => abrirPieza(t.dataset.id),
    rmPiezaBorrar: async () => { const f = st.fpz; if (!f || !await confirmar('¿Borrar esta pieza?')) return; try { await data.piezasDel([f.id]); P.set(f.mesId, (piezas(f.mesId) || []).filter(z => z._id !== f.id)); ctx.closeForm(); toast('Pieza borrada'); render(); } catch (e) { toast(e.message); } },
    rmArteVer: async t => { const w = window.open('', '_blank'); try { const r = await data.dropbox({ accion: 'link', path: t.dataset.path }); if (r.link && w) w.location = r.link; else if (w) w.close(); } catch (e) { if (w) w.close(); toast(e.message); } },
    rmArteQuitar: async t => { const f = st.fpz; if (!f) return; const z = (piezas(f.mesId) || []).find(x => x._id === f.id); if (!z) return; const arte = z.arte.filter((_, i) => i !== +t.dataset.i); try { await data.piezasUpd([z._id], { arte }); z.arte = arte; abrirPieza(z._id); render(); toast('Quitado de la pieza (el archivo sigue en Dropbox)'); } catch (e) { toast(e.message); } },
  };
  // Cambio en vivo de piezas: se recargan solo las del mes afectado.
  function enVivo(ev) { const r = (ev && (ev.new && ev.new.mes_id ? ev.new : ev.old)) || {}; const id = r.mes_id || [...P.keys()].find(k => (P.get(k) || []).some(z => z._id === r.id)); if (id && P.has(id)) cargar([id], true); }
  // Para Finanzas: las extras de un mes que se cobran (carga las piezas si hace falta; devuelve null mientras cargan).
  function extrasACobrar(cliente, mes) {
    const m = mesCliente(cliente, mes); if (!m) return { cob: [], total: 0, faltaPrecio: [] };
    const ps = piezas(m._id); if (!ps) { setTimeout(() => cargar([m._id]), 0); return null; }
    return extrasResumen(cliente, ps);
  }
  return { resumenCliente, tareasRedes, planificacionesDe, extrasACobrar, opcionesHtml, tocaA, vLista, vMes, acts, enVivo, abrirPieza, piezas, cargar, meses, mesCliente, clientesMes, ESTADOS_PIEZA, closePieza: () => { st.fpz = null; }, mesActual: () => st.mes };
}
