// Redes: un "mes" por cliente con su planilla de piezas. El plan es una meta (no un molde): las piezas se suman cuando surgen
// y las que pasan el plan quedan como extras. Dropbox crea las carpetas, guarda el arte y cuenta lo que ya está.
// Mr. Piggy propone contenido, escribe copys y reparte lo que el cliente dice en un chat.
export const ESTADOS_PIEZA = ['Idea', 'En diseño', 'Revisión interna', 'Para el cliente', 'Cambios', 'Aprobada', 'Programada', 'Publicada'];
export const ESTADOS_MES = ['Planificación', 'Producción', 'Revisión interna', 'Con el cliente', 'Aprobado', 'Programado', 'Cerrado'];
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
const FMT_OTROS = ['#b5893b', '#6b7fd7', '#c2569b', '#3f9a5f'];
export const fmtColor = f => { const x = FMT_COLOR.find(([re]) => re.test(f || '')); if (x) return x[1]; let h = 0; for (const c of String(f || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return FMT_OTROS[h % FMT_OTROS.length]; };
import { vistaSel, vistaDe, filtrosMenu } from './ui.js';
import { confirmar } from './dialogo.js';
const IMG = /\.(jpe?g|png|gif|webp|tiff?|bmp|heic)$/i;
const ICO_COPIAR = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>';

export function initRedes(ctx) {
  const { S, esc, opt, toast, data, render, $, av, fotoDe, personas, pill, fmt, fmtShort, today, thisMonth, addMonth, monthLabel, isStaff, cmp, norm, emptyBox, hil, ISO, cfgGet, lsSet, lsGet } = ctx;
  const st = { mes: thisMonth(), sel: new Set(), fOff: new Set(), mio: false, vis: [], ia: {}, tab: lsGet('rmTab') || 'planilla', cargando: new Set(), thumbs: new Map(), pidiendo: new Set(), fpz: null, abrirPieza: null };
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
  const insPiezas = (m, lista) => data.piezasIns(m, lista);
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
  const PH_CONT = f => /carrus/i.test(f) ? 'Slide 1: …\nSlide 2: …' : /reel/i.test(f) ? 'Gancho (0-3 s): …\n1. …\nAudio: …' : /histori/i.test(f) ? 'Texto: …\nSticker: encuesta (Sí / No)' : 'Título: …\nBajada: …\nImagen: …';
  const conteoPorFormato = ps => { const o = {}; enPlan(ps).forEach(z => { o[z.formato] = (o[z.formato] || 0) + 1; }); return o; };
  const pzPill = e => '<span class="pzst" style="--c:var(' + (PZ_COLOR[e] || '--muted') + ')">' + esc(e) + '</span>';
  const mesPill = e => pill(e, MES_COLOR[e] || '--muted');
  const fechaMes = (mes, d) => mes + '-' + String(d).padStart(2, '0');
  const diasMes = mes => { const [y, m] = mes.split('-').map(Number); return new Date(y, m, 0).getDate(); };

  /* ---------- Vista general del mes ---------- */
  function vLista() {
    const cs = clientesMes(st.mes), ms = cs.map(c => mesCliente(c, st.mes)).filter(Boolean);
    const sinCargar = ms.filter(m => !P.has(m._id)).map(m => m._id); if (sinCargar.length) setTimeout(() => cargar(sinCargar), 0);
    let tot = 0, plan = 0, aprobar = 0, cambios = 0, extras = 0;
    ms.forEach(m => { const ps = piezas(m._id) || []; tot += enPlan(ps).length; plan += Object.values(m.plan || {}).reduce((a, n) => a + (+n || 0), 0); aprobar += ps.filter(z => z.estado === 'Para el cliente').length; cambios += ps.filter(z => z.estado === 'Cambios').length; extras += ps.filter(z => z.extra).length; });
    const nav = '<div class="rm-nav"><button class="btn ghost sm" data-act="rmMes" data-d="-1" aria-label="Mes anterior">←</button><b>' + esc(cap(monthLabel(st.mes))) + '</b><button class="btn ghost sm" data-act="rmMes" data-d="1" aria-label="Mes siguiente">→</button>' + (st.mes !== thisMonth() ? '<button class="btn ghost sm" data-act="rmMes" data-d="0">Este mes</button>' : '') + '</div>';
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
        const ps = piezas(m._id), n = ps ? enPlan(ps).length : null, plan = Object.values(m.plan || {}).reduce((a, x) => a + (+x || 0), 0);
        const ap = ps ? ps.filter(z => z.estado === 'Para el cliente').length : 0, ca = ps ? ps.filter(z => z.estado === 'Cambios').length : 0;
        return '<tr class="click" data-act="rmAbrir" data-id="' + esc(m._id) + '"><td class="name"><span class="who1">' + av(c, cli.avatar, 'sq') + esc(c) + '</span></td><td>' + mesPill(m.estado) + '</td><td>' + (m.resp ? esc(m.resp) : '<span class="muted">—</span>') + '</td>' +
          '<td class="n num">' + (n == null ? '…' : n + (plan ? ' / ' + plan : '')) + '</td><td class="n">' + (ap ? '<span class="pzst" style="--c:var(--s-revision)">' + ap + ' a aprobar</span>' : '') + (ca ? ' <span class="pzst" style="--c:var(--s-cancelado)">' + ca + (ca > 1 ? ' cambios' : ' cambio') + '</span>' : '') + (!ap && !ca ? '<span class="muted">—</span>' : '') + '</td><td class="r">' + (m.visible ? '<span class="muted" title="El cliente lo ve en el portal">En el portal</span>' : '') + '</td></tr>'; };
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
      '<h1 class="rm-tit">' + (prev ? '<button class="btn ghost sm" data-act="rmAbrir" data-id="' + esc(prev._id) + '" aria-label="Mes anterior">←</button>' : '') + 'Redes · ' + esc(cap(monthLabel(m.mes))) + (next ? '<button class="btn ghost sm" data-act="rmAbrir" data-id="' + esc(next._id) + '" aria-label="Mes siguiente">→</button>' : '') + '</h1>' + (ctx.servChips ? '<div class="rm-serv">' + ctx.servChips(m.cliente, { precio: true }) + (can && ctx.servAb && ctx.servAb(m.cliente) ? '<button class="btn link sm" data-act="edit" data-kind="abono" data-id="' + esc(ctx.servAb(m.cliente)._id) + '">Editar servicio</button>' : '') + '</div>' : '') + '</div>' +
      '<div class="toolbar pf-acc">' + (can ? carpetaBtn(m) + enviarBtn(m, lista) + (ctx.masMenu ? ctx.masMenu([
        next ? null : { act: 'rmSiguiente', label: 'Arrancar ' + monthLabel(addMonth(m.mes, 1)).split(' ')[0], attrs: ' data-id="' + esc(m._id) + '"', icon: 'calendario' },
        { act: 'rmBorrarMes', label: 'Borrar este mes', attrs: ' data-id="' + esc(m._id) + '"', danger: true, icon: 'alerta' }]) : '') : '') + '</div></div>' +
      '<div class="pf-meta">' + (can ? '<select class="cellsel st" style="--c:var(' + (MES_COLOR[m.estado] || '--muted') + ')" data-rmupd="estado" data-id="' + esc(m._id) + '" aria-label="Estado del mes">' + ESTADOS_MES.map(e => opt(e, e, m.estado)).join('') + '</select>' : mesPill(m.estado)) +
      '<span class="rm-resp">' + (m.resp ? av(m.resp, fotoDe(m.resp)) : '') + (can ? '<select class="in sm" data-rmupd="resp" data-id="' + esc(m._id) + '" aria-label="Responsable del mes">' + opt('', 'Sin responsable', m.resp) + personas().map(a => opt(a, a, m.resp)).join('') + '</select>' : esc(m.resp || '')) + '</span>' +
      (can ? '<label class="rm-portal sw"><input type="checkbox" data-rmupd="visible" data-id="' + esc(m._id) + '"' + (m.visible ? ' checked' : '') + '><span></span><b>Visible en el portal</b></label>' : '') +
      (m.aprobadoAt ? '<span class="pzst" style="--c:var(--s-entregado)">Aprobado por ' + esc(m.aprobadoPor || 'el cliente') + '</span>' : '') +
      '</div>' +
      '<div class="rm-plan">' + barras(m, lista) + (can ? '<button class="btn ghost sm" data-act="rmPlan" data-id="' + esc(m._id) + '">Editar plan</button>' : '') + '</div>' +
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
    const fs = formatos(), sel = st.sel, eq = equipo(m.cliente), yo = S.me && S.me.alias, ocupado = st.ia[m._id];
    const ordenadas = [...ps].sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999') || (a.hora || '').localeCompare(b.hora || '') || a.orden - b.orden);
    const bulk = sel.size ? '<div class="bulkbar rm-bulk"><b>' + sel.size + ' seleccionada' + (sel.size > 1 ? 's' : '') + '</b><select class="in sm" id="rm-bk-est" aria-label="Cambiar estado">' + opt('', 'Cambiar estado…', '') + ESTADOS_PIEZA.map(e => opt(e, e, '')).join('') + '</select>' +
      '<select class="in sm" id="rm-bk-resp" aria-label="A cargo de">' + opt('', 'A cargo de…', '') + opt('__nadie', 'Según el flujo', '') + personas().map(a => opt(a, a, '')).join('') + '</select>' +
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
    const filtros = ps.length ? filtrosMenu('rmpz', '<span class="lbl">Formatos</span>' + presentes.map(f => '<label class="chk rm-fck" style="--fc:' + fmtColor(f) + '"><input type="checkbox" data-rmff="' + esc(f) + '"' + (st.fOff.has(f) ? '' : ' checked') + '> <i class="rm-dot"></i>' + esc(f) + ' <span class="muted num">' + ps.filter(z => z.formato === f).length + '</span></label>').join('') +
      (yo && eq.has(yo) ? '<label class="chk" style="margin-top:6px"><input type="checkbox" data-rmmio' + (st.mio ? ' checked' : '') + '> Solo lo que me toca <span class="muted num">' + mias.length + '</span></label>' : ''), activos) : '';
    const vista = vistaDe('redesPiezas', ['lista', 'cuadricula'], 'cuadricula');
    const tools = '<div class="toolbar rm-tools">' + (can ? '<form class="rm-add" data-rmadd="' + esc(m._id) + '"><input class="in sm" type="number" min="1" max="60" name="n" value="1" aria-label="Cantidad"><select class="in sm" name="f" aria-label="Formato">' + fs.map(f => opt(f, f, '')).join('') + '</select>' + (tieneAds(m.cliente) ? '<select class="in sm" name="u" aria-label="Para qué">' + opt('', 'Del plan', '') + opt('solo', 'Solo Ads', '') + '</select>' : '') + '<button class="btn sm" title="Agregar piezas">+ Agregar</button></form>' +
      '<button class="btn sm' + (ocupado ? ' ocupado' : '') + '" data-act="rmIdeas" data-id="' + esc(m._id) + '"' + (ocupado ? ' disabled' : '') + '>' + (ocupado ? '<span class="ia-dots"><i></i><i></i><i></i></span> ' + esc(ocupado) : '<span class="pig" aria-hidden="true">' + ISO + '</span> Proponer contenido') + '</button>' +
      (ctx.masMenu ? ctx.masMenu([
        ps.length ? { act: 'rmAgenda', label: 'Fechas y horarios con Mr. Piggy', attrs: ' data-id="' + esc(m._id) + '"', icon: 'calendario' } : null,
        { act: 'rmChat', label: 'Pegar chat del cliente', attrs: ' data-id="' + esc(m._id) + '"' },
        sinHora ? { act: 'rmHoras', label: 'Poner horarios a ' + sinHora + (sinHora === 1 ? ' pieza' : ' piezas'), attrs: ' data-id="' + esc(m._id) + '"' } : null,
        ctx.marcaCtx && !ctx.marcaCtx(m.cliente).marca ? { act: 'ficha', label: 'Completar la ficha de marca (sin ficha, Mr. Piggy escribe genérico)', attrs: ' data-cliente="' + esc(m.cliente) + '" data-tab="marca"' } : null]) : '') : '') +
      '<span class="rm-sp"></span>' + filtros + (ps.length ? vistaSel('redesPiezas', ['lista', 'cuadricula'], vista) : '') + '</div>';
    if (!ps.length) return '<div class="rm-pl">' + tools + '<section class="sheet">' + emptyBox('Todavía no hay piezas este mes', can ? 'Sumalas con “+ Agregar” (de a muchas), o pedile a Mr. Piggy que proponga el contenido según el plan.' : '') + '</section></div>';
    const lunes = f => { const d = new Date(f + 'T12:00'); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d; };
    const semTxt = f => { const l = lunes(f), dom = new Date(l); dom.setDate(l.getDate() + 6); const mesL = d => d.toLocaleDateString('es-AR', { month: 'short' }).replace('.', ''); return 'Semana del ' + l.getDate() + (l.getMonth() !== dom.getMonth() ? ' ' + mesL(l) : '') + ' al ' + dom.getDate() + ' ' + mesL(dom); };
    const semDe = z => z.fecha ? semTxt(z.fecha) : 'Sin fecha';
    // Por semana; dentro de cada semana primero posts, carruseles y reels, y después las historias.
    const semK = z => z.fecha ? lunes(z.fecha).toISOString().slice(0, 10) : '9999';
    const pos = new Map(ordenadas.map((z, i) => [z._id, i]));
    vis.sort((a, b) => semK(a).localeCompare(semK(b)) || (esHistoria(a) ? 1 : 0) - (esHistoria(b) ? 1 : 0) || pos.get(a._id) - pos.get(b._id));
    const sinFecha = ps.filter(z => !z.fecha).length;
    const agendaBtn = can && sinFecha ? '<button class="btn sm ghost rm-agb" data-act="rmAgenda" data-id="' + esc(m._id) + '"><span class="pig" aria-hidden="true">' + ISO + '</span> Definir fechas y horarios</button>' : '';
    const histSep = n => '<div class="rm-hsep"><span>Historias · ' + n + '</span></div>';
    const diaDe = z => z.fecha ? new Date(z.fecha + 'T12:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric' }).replace('.', '') : '';
    const quien = (z, corto) => { const q = qz.get(z._id);
      if (!q.roles.length) return '<span class="muted">—</span>';
      return '<div class="rm-quien">' + (q.gente.length ? '<span class="avs">' + q.gente.map(a => av(a, fotoDe(a))).join('') + '</span>' : '') + '<span class="rm-qt"><b>' + (q.gente.length ? esc(q.gente.join(', ')) : '<span class="muted">Nadie con ese rol</span>') + '</b>' + (corto ? '' : '<small>' + esc(q.roles.join(' + ')) + (z.resp && q.gente.includes(z.resp) ? ' · elegida' : '') + '</small>') + '</span></div>'; };
    // Texto de la pieza: copy (o, en historias, lo que va escrito), hashtags y botones para copiar
    const textos = (z, lineas) => { const hist = esHistoria(z), txt = z.copy || (hist ? z.contenido : '') || '';
      return '<div class="rm-txt">' + (txt ? '<button class="rm-copy" style="-webkit-line-clamp:' + lineas + '" data-act="rmPieza" data-id="' + esc(z._id) + '">' + esc(txt.replace(/\n\s*\n/g, '\n')) + '</button>' : '<button class="rm-copy vacio" data-act="rmPieza" data-id="' + esc(z._id) + '">' + (hist ? '+ Texto de la historia' : '+ Escribir el copy') + '</button>') +
        (z.hashtags ? '<p class="rm-hash">' + esc(z.hashtags) + '</p>' : '') +
        (z.copy || z.hashtags ? '<span class="rm-cps">' + (z.copy ? '<button class="btn ghost sm" data-act="rmCopiar" data-id="' + esc(z._id) + '" data-k="copy">' + ICO_COPIAR + ' Copy</button>' : '') + (z.hashtags ? '<button class="btn ghost sm" data-act="rmCopiar" data-id="' + esc(z._id) + '" data-k="hashtags">' + ICO_COPIAR + ' Hashtags</button>' : '') + (z.copy && z.hashtags ? '<button class="btn ghost sm" data-act="rmCopiar" data-id="' + esc(z._id) + '" data-k="todo" title="Copy y hashtags juntos, listos para pegar">' + ICO_COPIAR + ' Todo</button>' : '') + '</span>' : '') + '</div>'; };
    const tags = (z, d) => '<div class="rm-tags">' + (d === null ? '<span class="rm-fpill">' + esc(z.formato) + '</span>' : '<select class="rm-fsel" data-pz="formato" data-id="' + esc(z._id) + '"' + d + ' aria-label="Formato">' + [...new Set([...fs, z.formato].filter(Boolean))].map(f => opt(f, f, z.formato)).join('') + '</select>') + (z.extra && !soloAds(z) ? '<span class="rm-extra" title="Fuera del plan">extra</span>' : '') + adsTag(z) + (z.fijo ? '<span class="rm-fijo" title="Se repite cada ' + esc(z.fijo) + '">↻ ' + esc(z.fijo) + '</span>' : '') + '</div>';
    pedirThumbs(vis);
    if (!vis.length) return '<div class="rm-pl">' + tools + bulk + '<section class="sheet">' + emptyBox('No hay piezas con ese filtro', 'Cambiá los formatos en el filtro.') + '</section></div>';
    if (vista === 'cuadricula') {
      const grupos = []; vis.forEach(z => { const k = semDe(z), g = grupos[grupos.length - 1]; if (g && g.k === k) g.zs.push(z); else grupos.push({ k, zs: [z] }); });
      const carta = z => { const a = (z.arte || [])[0], t = a ? st.thumbs.get(a.path) : '';
        return '<article class="rm-pc' + (sel.has(z._id) ? ' sel' : '') + '" style="--fc:' + fmtColor(z.formato) + '">' +
          '<button class="rm-pc-a' + (t ? '' : ' ph') + '" data-act="rmPieza" data-id="' + esc(z._id) + '" aria-label="Abrir ' + esc(z.formato + ' ' + (z.tema || '')) + '">' + (t ? '<img src="' + esc(t) + '" alt="">' : '<span class="rm-pc-ph"><b>' + esc(z.formato) + '</b>' + (z.contenido ? '<span>' + esc(z.contenido.split('\n')[0].replace(/^[^:]{1,20}:\s*/, '')) + '</span>' : '') + '</span>') + '</button>' +
          (can ? '<input type="checkbox" class="rm-pc-sel" data-rmsel="' + esc(z._id) + '"' + (sel.has(z._id) ? ' checked' : '') + ' aria-label="Seleccionar">' : '') +
          '<div class="rm-pc-b"><div class="rm-pc-m">' + (z.fecha ? '<span class="rm-pc-d">' + esc(diaDe(z)) + (z.hora ? ' · ' + esc(z.hora) : '') + '</span>' : '<span class="rm-pc-d muted sf">Sin fecha</span>') + pzPill(z.estado) + '</div>' + tags(z, null) +
          '<b class="rm-pc-t">' + esc(z.tema || 'Sin tema') + '</b>' + textos(z, 4) + '<div class="rm-pc-f">' + quien(z, true) + '</div></div></article>'; };
      return '<div class="rm-pl">' + tools + bulk + grupos.map(g => { const feed = g.zs.filter(z => !esHistoria(z)), hist = g.zs.filter(esHistoria);
        return '<div class="rm-semh"><h3>' + esc(g.k) + '</h3>' + (g.k === 'Sin fecha' ? agendaBtn : '') + '</div>' + (feed.length ? '<div class="rm-pcs">' + feed.map(carta).join('') + '</div>' : '') + (hist.length ? histSep(hist.length) + '<div class="rm-pcs hist">' + hist.map(carta).join('') + '</div>' : ''); }).join('') + '</div>';
    }
    const cols = can ? 7 : 6;
    let semPrev = null, histPrev = false;
    const fila = z => {
      const id = esc(z._id), d = can ? '' : ' disabled', sem = semDe(z), h = esHistoria(z);
      let cab = '';
      if (sem !== semPrev) { cab = '<tr class="rm-sem"><td colspan="' + cols + '"><div class="rm-semr"><span>' + esc(sem) + '</span>' + (sem === 'Sin fecha' ? agendaBtn : '') + '</div></td></tr>'; histPrev = false; }
      if (h && !histPrev) cab += '<tr class="rm-hrow"><td colspan="' + cols + '">' + histSep(vis.filter(y => esHistoria(y) && semDe(y) === sem).length) + '</td></tr>';
      semPrev = sem; histPrev = h;
      return cab + '<tr class="rm-row ' + (sel.has(z._id) ? 'sel ' : '') + (z.estado === 'Cambios' ? 'cambios' : '') + '" style="--fc:' + fmtColor(z.formato) + '">' +
        (can ? '<td class="sel"><input type="checkbox" data-rmsel="' + id + '"' + (sel.has(z._id) ? ' checked' : '') + ' aria-label="Seleccionar"></td>' : '') +
        '<td class="rm-art">' + arteMini(z) + '</td>' +
        '<td class="rm-cuando">' + (z.fecha ? '<span class="rm-dia">' + esc(diaDe(z)) + '</span>' : '') + '<input class="in sm rm-fe" type="date" value="' + esc(z.fecha) + '" data-pz="fecha" data-id="' + id + '"' + d + ' aria-label="Fecha"><input class="in sm rm-ho" type="time" value="' + esc(z.hora) + '" data-pz="hora" data-id="' + id + '"' + d + ' aria-label="Hora"></td>' +
        '<td class="rm-tema">' + tags(z, d) + '<input class="in sm rm-tin" value="' + esc(z.tema) + '" placeholder="Tema" data-pz="tema" data-id="' + id + '"' + d + ' aria-label="Tema">' +
        (z.contenido && !esHistoria(z) ? '<p class="rm-cont" title="Qué va en la pieza">' + esc(z.contenido) + '</p>' : '') + textos(z, 6) +
        (z.respuesta && z.estado === 'Cambios' ? '<span class="rm-resp-cli">“' + esc(z.respuesta.slice(0, 160)) + '”</span>' : '') + '</td>' +
        '<td><select class="cellsel st" style="--c:var(' + (PZ_COLOR[z.estado] || '--muted') + ')" data-pz="estado" data-id="' + id + '"' + d + ' aria-label="Estado">' + ESTADOS_PIEZA.map(e => opt(e, e, z.estado)).join('') + '</select></td>' +
        '<td class="rm-qc">' + quien(z) + '</td>' +
        '<td><button class="btn ghost sm" data-act="rmPieza" data-id="' + id + '" aria-label="Abrir pieza">⋯</button></td></tr>';
    };
    return '<div class="rm-pl">' + tools + bulk + '<section class="sheet"><div class="tbl rm-tbl"><table><thead><tr>' + (can ? '<th class="sel"><input type="checkbox" data-rmselall="' + esc(m._id) + '" aria-label="Seleccionar las que se ven"></th>' : '') + '<th>Arte</th><th>Cuándo</th><th>Pieza</th><th>Estado</th><th title="Según el rol de cada uno en la cuenta y el estado de la pieza">Le toca a</th><th></th></tr></thead><tbody>' +
      vis.map(fila).join('') + '</tbody></table></div></section></div>';
  }
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
      '<div class="field"><label for="pz-red">Red</label><select id="pz-red"' + d + '>' + [...new Set([...REDES, z.red].filter(Boolean))].map(f => opt(f, f, z.red)).join('') + '</select></div>' +
      '<div class="field"><label for="pz-estado">Estado</label><select id="pz-estado"' + d + '>' + ESTADOS_PIEZA.map(e => opt(e, e, z.estado)).join('') + '</select></div>' +
      '<div class="field"><label for="pz-resp">A cargo de esta pieza</label><select id="pz-resp"' + d + '>' + opt('', 'Según el flujo (el rol de cada etapa)', z.resp) + [...new Set([...personas(), z.resp].filter(Boolean))].map(a => opt(a, a + (equipo(m.cliente).get(a) ? ' · ' + equipo(m.cliente).get(a) : ''), z.resp)).join('') + '</select><span class="hint">Ahora le toca a ' + esc((q => q.gente.length ? q.gente.join(', ') : 'nadie') (quienes(m.cliente, z))) + '. Si elegís a alguien, reemplaza a los de su rol (p. ej. Cata en vez de Vale en el diseño).</span></div>' +
      '<div class="field full"><label for="pz-tema">Tema</label><input id="pz-tema" value="' + esc(z.tema) + '"' + d + '></div>' +
      (data.cols && data.cols.piezaContenido === false ? '' : '<div class="field full"><div class="pz-lh"><label for="pz-contenido">' + (esHistoria(z) ? 'Texto de la historia' : 'Qué va en la pieza') + '</label>' + copiarBtn('#pz-contenido') + '</div><textarea id="pz-contenido" rows="' + Math.min(10, Math.max(3, (z.contenido || '').split('\n').length + 1)) + '" placeholder="' + esc(PH_CONT(z.formato)) + '"' + d + '>' + esc(z.contenido || '') + '</textarea><span class="hint">Para quien diseña o graba.</span></div>') +
      '<div class="field full"><div class="pz-lh"><label for="pz-copy">Copy</label>' + copiarBtn('#pz-copy') + '</div><textarea id="pz-copy" rows="' + Math.min(14, Math.max(5, (z.copy || '').split('\n').length + 2)) + '"' + d + '>' + esc(z.copy) + '</textarea>' + (can ? '<div class="toolbar" style="margin-top:6px"><span class="muted" style="font-size:13px">Mr. Piggy:</span><button type="button" class="btn ghost sm" data-act="rmCopyUno">' + (z.copy ? 'Mejorar' : 'Escribir') + ' el copy</button></div>' : '') + '</div>' +
      '<div class="field full"><div class="pz-lh"><label for="pz-hashtags">Hashtags</label>' + copiarBtn('#pz-hashtags') + '</div><input id="pz-hashtags" value="' + esc(z.hashtags) + '"' + d + '></div>' +
      '<div class="field"><label for="pz-fijo">Se repite cada</label><select id="pz-fijo"' + d + '>' + opt('', 'No se repite', z.fijo) + DIAS.map(x => opt(x, x, z.fijo)).join('') + '</select><span class="hint">Al arrancar el mes siguiente se crea sola en ese día.</span></div>' +

      (z.ads || tieneAds(m.cliente) ? '<div class="field"><label for="pz-ads">Ads</label><select id="pz-ads"' + d + '>' + ADS_OPC.map(([k, l]) => opt(k, l, z.ads || '')).join('') + '</select><span class="hint">Si se diseñó aparte para los anuncios, va como “Solo para Ads”: no suma al plan ni como extra.</span></div>' : '') +
      '<label class="chk full"><input type="checkbox" id="pz-extra"' + (z.extra ? ' checked' : '') + d + '> Extra (fuera del plan)</label>' +
      '<div class="field full"><span class="lbl">Arte</span><div class="pz-artes">' + (artes || '<span class="muted">Sin arte todavía.</span>') + '</div>' + (can ? '<label class="btn sm" style="margin-top:8px;justify-self:start">Subir arte a Dropbox<input type="file" hidden data-rmup="' + esc(z._id) + '" multiple accept="image/*,video/*,application/pdf"></label>' : '') + '</div>' +
      '<div class="full">' + hil().html('pieza', z._id, { cliente: m.cliente, titulo: 'Comentarios', compacto: true, publico: true }) + '</div>' +
      '</div><div class="panel-f"><span>' + (can ? '<button type="button" class="btn ghost danger" data-act="rmPiezaBorrar">Borrar</button>' : '') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">' + (can ? 'Cancelar' : 'Cerrar') + '</button>' + (can ? '<button type="submit" class="btn primary">Guardar</button>' : '') + '</span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false;
  }
  async function guardarPieza() {
    const f = st.fpz; if (!f) return;
    const g = k => ($('#pz-' + k) || {}).value;
    const u = { fecha: g('fecha') || '', hora: g('hora') || '', formato: g('formato'), red: g('red'), estado: g('estado'), resp: g('resp') || '', tema: (g('tema') || '').trim(), copy: (g('copy') || '').trim(), ...($('#pz-contenido') ? { contenido: (g('contenido') || '').trim() } : {}), hashtags: (g('hashtags') || '').trim(), fijo: g('fijo') || '', extra: $('#pz-extra').checked };
    if ($('#pz-ads')) { u.ads = g('ads') || ''; if (u.ads === 'solo') u.extra = false; }
    try { await data.piezasUpd([f.id], u); local(f.mesId, [f.id], u); ctx.closeForm(); toast('Pieza guardada'); render(); }
    catch (e) { toast(e.message); }
  }
  function local(mesId, ids, u) { const ps = piezas(mesId) || []; ps.forEach(z => { if (ids.includes(z._id)) Object.assign(z, u); }); }

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
    return { cliente: m.cliente, ...(ctx.marcaCtx ? ctx.marcaCtx(m.cliente, [...pp, ...(piezas(m._id) || [])]) : {}), notas_cliente: cli.notas || '', servicios: ctx.servicios ? ctx.servicios(m.cliente) : '', mes: m.mes, formatos: formatos(), plan: m.plan || {}, notas_del_mes: m.notas, ...(extra || {}), _pp: pp }; };
  const esHistoria = z => /histori|stor/i.test(z.formato || '');
  const trabajando = (m, txt) => { if (txt) st.ia[m._id] = txt; else delete st.ia[m._id]; render(); };
  // Si la IA no dio fecha, se reparten las piezas de cada formato a lo largo del mes.
  function repartirFechas(m, ps, nuevas) {
    const n = diasMes(m.mes), porF = {};
    nuevas.filter(z => !z.fecha).forEach(z => { (porF[z.formato] = porF[z.formato] || []).push(z); });
    Object.values(porF).forEach(lista => lista.forEach((z, i) => { const d = Math.min(n, Math.max(1, Math.round((i + 0.5) * n / lista.length))); z.fecha = fechaMes(m.mes, d); z.hora = horaLibre([...ps, ...nuevas.filter(y => y !== z && y.fecha)], z.fecha, z.formato, m.cliente); }));
  }
  async function ideas(btn, m) {
    if (st.ia[m._id]) return;
    const ps = piezas(m._id) || [], plan = m.plan || {}, cnt = conteoPorFormato(ps);
    const faltan = Object.fromEntries(Object.entries(plan).map(([f, n]) => [f, Math.max(0, (+n || 0) - (cnt[f] || 0))]).filter(([, n]) => n > 0));
    const extras = !Object.keys(faltan).length;
    if (extras && !await confirmar('El plan del mes ya está completo. ¿Querés que Mr. Piggy proponga ideas extra igual?')) return;
    trabajando(m, 'Mr. Piggy está armando el plan…');
    let ins = [];
    try {
      const fmtDe = x => formatos().includes(x) ? x : (formatos().find(f => norm(f).startsWith(norm(x || '').slice(0, 4))) || formatos()[0]);
      const pide = extras ? { _: 3 } : { ...faltan }, nuevas = [];
      const resta = () => Object.entries(pide).filter(([, n]) => n > 0);
      for (let vuelta = 0; vuelta < 3 && resta().length; vuelta++) {
        const lista = resta().map(([f, n]) => n + ' ' + f).join(', '), total = resta().reduce((a, [, n]) => a + n, 0);
        const texto = extras ? 'Proponé 3 ideas extra.' : (vuelta ? 'Todavía faltan piezas: proponé exactamente ' + lista + ' (' + total + ' en total), distintas a las que ya hay.' : 'Proponé exactamente estas piezas que faltan, ni más ni menos: ' + lista + ' (' + total + ' en total). Contá las de cada formato antes de responder.');
        const c = ctxIA(m); const pp = c._pp; delete c._pp;
        const r = await data.ia({ modo: 'redes_ideas', texto, contexto: { ...c, ya_cargadas: [...ps, ...nuevas].map(z => ({ fecha: z.fecha, formato: z.formato, tema: z.tema })), mes_anterior: pp.slice(0, 60).map(z => ({ formato: z.formato, tema: z.tema })) } });
        let llegaron = 0;
        for (const x of (Array.isArray(r.piezas) ? r.piezas : []).filter(x => x && x.tema)) {
          const formato = fmtDe(x.formato), k = extras ? '_' : formato;
          if (!(pide[k] > 0)) continue; // lo que sobra no se carga
          if (nuevas.some(z => norm(z.tema) === norm(String(x.tema)))) continue;
          const fecha = /^\d{4}-\d{2}-\d{2}$/.test(x.fecha || '') && String(x.fecha).startsWith(m.mes) ? x.fecha : '';
          nuevas.push({ formato, tema: String(x.tema).slice(0, 160), contenido: String(x.contenido || '').slice(0, 3000), copy: '', hashtags: '', fecha, hora: fecha ? horaLibre([...ps, ...nuevas], fecha, formato, m.cliente) : '', estado: 'Idea', extra: extras });
          pide[k]--; llegaron++;
        }
        if (!llegaron) break;
        if (resta().length) trabajando(m, 'Faltaron algunas, le pido el resto…');
      }
      if (!nuevas.length) { toast('Mr. Piggy no propuso nada. Probá de nuevo.'); trabajando(m, null); return; }
      repartirFechas(m, ps, nuevas);
      ins = await insPiezas(m, nuevas); P.set(m._id, [...ps, ...ins]);
      const quedan = extras ? [] : resta();
      if (quedan.length) toast('Faltaron ' + quedan.map(([f, n]) => n + ' ' + f).join(', ') + ': volvé a tocar “Proponer contenido”.');
    } catch (e) { toast(e.message); trabajando(m, null); return; }
    // 2) copys de lo que no es historia
    const conCopy = ins.filter(z => !esHistoria(z)).map(z => z._id);
    const n = conCopy.length ? await copys(conCopy, m) : 0;
    trabajando(m, null);
    toast('Mr. Piggy armó ' + ins.length + ' piezas' + (n ? ' y escribió ' + n + ' copys' : '') + ', con día y horario. Quedaron como “Idea”: revisalas.');
  }
  // Copys y hashtags de varias piezas: de a 4 por pedido, 3 pedidos a la vez. Devuelve cuántas escribió.
  async function copys(ids, m, btn) {
    const ps = (piezas(m._id) || []).filter(z => ids.includes(z._id));
    if (!ps.length) return 0;
    const propio = !st.ia[m._id], t0 = btn ? btn.innerHTML : ''; let hechas = 0, n = 0, fallo = null;
    const avance = () => { if (btn) { btn.disabled = true; btn.textContent = 'Escribiendo ' + hechas + '/' + ps.length + '…'; } else trabajando(m, 'Escribiendo copys ' + hechas + '/' + ps.length + '…'); };
    avance();
    const c = ctxIA(m); delete c._pp; delete c.plan;
    const tandas = []; for (let i = 0; i < ps.length; i += 4) tandas.push(ps.slice(i, i + 4));
    const una = async t => {
      try {
        const r = await data.ia({ modo: 'redes_copys', texto: JSON.stringify(t.map(z => ({ id: z._id, formato: z.formato, fecha: z.fecha, tema: z.tema, contenido: z.contenido || '', copy_actual: z.copy }))), contexto: c });
        for (const x of Array.isArray(r.piezas) ? r.piezas : []) {
          const z = t.find(y => y._id === x.id); if (!z || (!x.copy && !esHistoria(z))) continue;
          const u = { copy: String(x.copy || '').trim(), hashtags: String(x.hashtags || '').trim(), ...(x.contenido && !z.contenido ? { contenido: String(x.contenido).trim() } : {}) };
          await data.piezasUpd([z._id], u); Object.assign(z, u); n++;
        }
      } catch (e) { fallo = e; }
      hechas += t.length; avance();
    };
    for (let i = 0; i < tandas.length; i += 3) await Promise.all(tandas.slice(i, i + 3).map(una));
    if (btn) { btn.disabled = false; btn.innerHTML = t0; }
    if (propio && !btn) trabajando(m, null);
    if (fallo && !n) toast(fallo.message); else if (propio) toast(n ? 'Mr. Piggy escribió ' + n + ' copys. Revisalos.' : 'No se pudo escribir los copys.');
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
  function tocaA(cliente, alias) {
    const m = mesCliente(cliente, thisMonth()); if (!m) return null;
    const ps = piezas(m._id); if (!ps) { setTimeout(() => cargar([m._id]), 0); return null; }
    const eq = equipo(cliente), o = {};
    ps.forEach(z => { if (quienes(cliente, z, eq).gente.includes(alias)) o[z.estado] = (o[z.estado] || 0) + 1; });
    return ESTADOS_PIEZA.filter(e => o[e]).map(e => [e, o[e]]);
  }
  function abrirChat(m) {
    st.chatMes = m._id; S.form = null;
    $('#panel').innerHTML = '<form id="rmchat" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(m.cliente) + '</span><h2 id="panel-title">Pegar lo que dijo el cliente</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><p class="formnote full">Pegá el chat de WhatsApp o el mail donde el cliente opina sobre las piezas. Mr. Piggy relaciona cada comentario con su pieza: marca las aprobadas, anota los cambios y suma las piezas nuevas que pida.</p>' +
      '<div class="field full"><label for="rmchat-t">Chat o mail</label><textarea id="rmchat-t" rows="12" placeholder="[10/11 18:32] Laura: el posteo del lunes me encanta, el reel cambiale la música…"></textarea></div></div>' +
      '<div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary" id="rmchat-b">Repartir en las piezas</button></span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false; setTimeout(() => $('#rmchat-t').focus(), 30);
  }
  async function repartirChat() {
    const m = mesDe(st.chatMes), t = ($('#rmchat-t') || {}).value || ''; if (!m || !t.trim()) { toast('Pegá el chat'); return; }
    const b = $('#rmchat-b'); b.disabled = true; b.textContent = 'Leyendo…';
    try {
      const ps = piezas(m._id) || [];
      const r = await data.ia({ modo: 'redes_chat', texto: t, contexto: { cliente: m.cliente, ...(ctx.marcaCtx ? ctx.marcaCtx(m.cliente, ps) : {}), formatos: formatos(), piezas: ps.map(z => ({ id: z._id, fecha: z.fecha, formato: z.formato, tema: z.tema, estado: z.estado })) } });
      let ap = 0, ca = 0, nu = 0;
      for (const c of Array.isArray(r.cambios) ? r.cambios : []) {
        const z = ps.find(x => x._id === c.id); if (!z) continue;
        if (c.accion === 'aprobada') { await data.piezasUpd([z._id], { estado: 'Aprobada', respuesta: c.detalle || '' }); Object.assign(z, { estado: 'Aprobada', respuesta: c.detalle || '' }); ap++; }
        else if (c.accion === 'cambios') { await data.piezasUpd([z._id], { estado: 'Cambios', respuesta: c.detalle || '' }); Object.assign(z, { estado: 'Cambios', respuesta: c.detalle || '' }); ca++; }
        if (c.detalle) await data.comentar({ entidad: 'pieza', id: z._id, clienteId: m.cliente, texto: (c.accion === 'aprobada' ? '✓ Aprobada (por WhatsApp): ' : c.accion === 'cambios' ? 'Cambios pedidos (por WhatsApp): ' : 'Nota del cliente: ') + c.detalle, interno: true }).catch(() => {});
      }
      const nuevas = (Array.isArray(r.nuevas) ? r.nuevas : []).filter(x => x && x.tema).map(x => ({ formato: formatos().includes(x.formato) ? x.formato : formatos()[0], tema: x.tema, copy: x.copy || '', fecha: /^\d{4}-\d{2}-\d{2}$/.test(x.fecha || '') ? x.fecha : '', extra: true, estado: 'Idea' }));
      if (nuevas.length) { const ins = await insPiezas(m, nuevas); P.set(m._id, [...ps, ...ins]); nu = ins.length; }
      ctx.closeForm(); toast([ap ? ap + ' aprobadas' : '', ca ? ca + ' con cambios' : '', nu ? nu + ' nuevas (extra)' : ''].filter(Boolean).join(' · ') || 'No encontré cambios en ese chat'); render();
    } catch (e) { toast(e.message); b.disabled = false; b.textContent = 'Repartir en las piezas'; }
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
      ag.res = { criterio: String(r.criterio || ''), horarios, piezas: unicos, faltan: mov.length - unicos.length };
      if (!unicos.length) toast('Mr. Piggy no devolvió fechas válidas. Probá de nuevo.');
    } catch (e) { toast(e.message); }
    ag.busy = false; if (st.ag === ag && $('#rmagenda')) abrirAgenda(m);
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
      const n = Math.max(1, Math.min(60, Math.round(+f.elements.n.value || 1))), fo = f.elements.f.value;
      const ps = piezas(m._id) || [], ya = enPlan(ps).filter(z => z.formato === fo).length, pl = +(m.plan || {})[fo] || 0, uso = f.elements.u ? f.elements.u.value : '';
      if (uso === 'solo' && data.cols && data.cols.piezaAds === false) { toast('Para marcar piezas de Ads falta correr el SQL 0028 en Supabase'); return; }
      const nuevas = Array.from({ length: n }, (_, i) => ({ formato: fo, estado: 'Idea', extra: uso !== 'solo' && pl > 0 && ya + i >= pl, red: 'Instagram', ...(uso ? { ads: uso } : {}) }));
      try { const ins = await insPiezas(m, nuevas); P.set(m._id, [...ps, ...ins]); toast(n === 1 ? 'Pieza agregada' : n + ' piezas agregadas'); render(); } catch (er) { toast(er.message); }
    }
  }, true);
  document.addEventListener('change', async e => {
    const t = e.target;
    if (t.dataset && t.dataset.rmup && t.files && t.files.length) { subir(t); return; }
    if (t.dataset && t.dataset.pz) {
      const id = t.dataset.id, k = t.dataset.pz, v = t.value;
      const m = meses().find(x => (piezas(x._id) || []).some(z => z._id === id)); if (!m) return;
      try { await data.piezasUpd([id], { [k]: v }); local(m._id, [id], { [k]: v }); if (k === 'estado' || k === 'formato' || k === 'fecha') render(); } catch (er) { toast(er.message); render(); }
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
    if (t.dataset && t.dataset.rmff != null) { const f = t.dataset.rmff; if (t.checked) st.fOff.delete(f); else st.fOff.add(f); st.sel.clear(); render(); return; }
    if (t.dataset && t.dataset.rmmio != null) { st.mio = t.checked; st.sel.clear(); render(); return; }
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
    rmAbrir: t => ctx.irMes(t.dataset.id),
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
    rmEnviar: async t => {
      const m = mesDe(t.dataset.id); if (!m) return; const ps = piezas(m._id) || [];
      const ids = ps.filter(z => z.estado === 'Revisión interna').map(z => z._id);
      if (!ids.length && !ps.some(z => z.estado === 'Para el cliente')) { toast('No hay piezas en “Revisión interna” para mandar. Pasalas a ese estado cuando estén listas.'); return; }
      if (!await confirmar((ids.length ? ids.length + ' piezas pasan a “Para el cliente” y ' : '') + 'el mes se publica en el portal de ' + m.cliente + '. ¿Seguimos?')) return;
      try {
        if (ids.length) { await data.piezasUpd(ids, { estado: 'Para el cliente' }); local(m._id, ids, { estado: 'Para el cliente' }); }
        const u = { visible: true, estado: 'Con el cliente', enviadoAt: new Date().toISOString() }; await data.mesUpd(m._id, u); Object.assign(m, u);
        toast('Listo: ' + m.cliente + ' ya lo ve en el portal'); render();
        if (ctx.avisarCliente) ctx.avisarCliente(m.cliente, 'redes', m);
      } catch (e) { toast(e.message); }
    },
    rmPlan: t => { const m = mesDe(t.dataset.id); if (m) abrirPlan(m); },
    rmIdeas: t => { const m = mesDe(t.dataset.id); if (m) ideas(t, m); },
    rmCopiar: t => {
      let v = '';
      if (t.dataset.sel) v = ($(t.dataset.sel) || {}).value || '';
      else { const z = [...P.values()].flat().find(x => x._id === t.dataset.id); if (z) v = t.dataset.k === 'hashtags' ? z.hashtags : t.dataset.k === 'contenido' ? (z.contenido || '') : t.dataset.k === 'todo' ? [z.copy, z.hashtags].filter(Boolean).join('\n\n') : z.copy; }
      if (!v.trim()) { toast('No hay nada para copiar'); return; }
      const ok = () => toast(t.dataset.k === 'hashtags' ? 'Hashtags copiados' : t.dataset.k === 'todo' ? 'Copy y hashtags copiados' : 'Copiado');
      try { navigator.clipboard.writeText(v).then(ok, () => toast('No se pudo copiar')); } catch (e) { toast('No se pudo copiar'); }
    },
    rmAgenda: t => { const m = mesDe(t.dataset.id); if (!m) return; if (!st.ag || st.ag.mesId !== m._id || !st.ag.busy) st.ag = null; abrirAgenda(m); },
    rmAgendaPedir: () => { const m = st.ag && mesDe(st.ag.mesId); if (m) { st.ag.res = null; pedirAgenda(m); } },
    rmHoras: t => { const m = mesDe(t.dataset.id); if (m) ponerHoras(m, !!t.dataset.sel); },
    rmChat: t => { const m = mesDe(t.dataset.id); if (m) abrirChat(m); },
    rmCopys: t => { const ids = [...st.sel]; const m = meses().find(x => (piezas(x._id) || []).some(z => ids.includes(z._id))); if (m) copys(ids, m, t); },
    rmCopyUno: async t => { const f = st.fpz; if (!f) return; const m = mesDe(f.mesId); const z = (piezas(f.mesId) || []).find(x => x._id === f.id); if (!m || !z) return; z.tema = ($('#pz-tema').value || '').trim() || z.tema; if ($('#pz-contenido')) z.contenido = $('#pz-contenido').value.trim(); if ($('#pz-copy')) z.copy = $('#pz-copy').value.trim(); await copys([z._id], m, t); const zz = piezas(f.mesId).find(x => x._id === f.id); if ($('#pz-copy') && zz) { $('#pz-copy').value = zz.copy; $('#pz-hashtags').value = zz.hashtags; if ($('#pz-contenido')) $('#pz-contenido').value = zz.contenido || ''; } },
    rmBorrar: async () => { const ids = [...st.sel]; if (!ids.length || !await confirmar('¿Borrar ' + ids.length + ' pieza' + (ids.length > 1 ? 's' : '') + '?')) return; try { await data.piezasDel(ids); P.forEach((ps, k) => P.set(k, ps.filter(z => !ids.includes(z._id)))); st.sel.clear(); toast('Borradas'); render(); } catch (e) { toast(e.message); } },
    rmSelNada: () => { st.sel.clear(); render(); },
    rmPieza: t => abrirPieza(t.dataset.id),
    rmPiezaBorrar: async () => { const f = st.fpz; if (!f || !await confirmar('¿Borrar esta pieza?')) return; try { await data.piezasDel([f.id]); P.set(f.mesId, (piezas(f.mesId) || []).filter(z => z._id !== f.id)); ctx.closeForm(); toast('Pieza borrada'); render(); } catch (e) { toast(e.message); } },
    rmArteVer: async t => { const w = window.open('', '_blank'); try { const r = await data.dropbox({ accion: 'link', path: t.dataset.path }); if (r.link && w) w.location = r.link; else if (w) w.close(); } catch (e) { if (w) w.close(); toast(e.message); } },
    rmArteQuitar: async t => { const f = st.fpz; if (!f) return; const z = (piezas(f.mesId) || []).find(x => x._id === f.id); if (!z) return; const arte = z.arte.filter((_, i) => i !== +t.dataset.i); try { await data.piezasUpd([z._id], { arte }); z.arte = arte; abrirPieza(z._id); render(); toast('Quitado de la pieza (el archivo sigue en Dropbox)'); } catch (e) { toast(e.message); } },
  };
  // Cambio en vivo de piezas: se recargan solo las del mes afectado.
  function enVivo(ev) { const r = (ev && (ev.new && ev.new.mes_id ? ev.new : ev.old)) || {}; const id = r.mes_id || [...P.keys()].find(k => (P.get(k) || []).some(z => z._id === r.id)); if (id && P.has(id)) cargar([id], true); }
  return { opcionesHtml, tocaA, vLista, vMes, acts, enVivo, abrirPieza, piezas, cargar, meses, mesCliente, clientesMes, ESTADOS_PIEZA, closePieza: () => { st.fpz = null; }, mesActual: () => st.mes };
}
