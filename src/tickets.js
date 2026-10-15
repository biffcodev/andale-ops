// Tickets: pedidos chicos de los clientes (desde el portal o cargados por el equipo desde un WhatsApp o un mail).
// Cada uno tiene número, responsable, horas y si se cobra; los "A facturar" aparecen al armar el resumen del mes.
// Briefs: lo que completan los clientes en Tally, con resumen de Mr. Piggy y asignación a cliente y proyecto.
import { vistaSel, vistaDe, filtrosMenu } from './ui.js';
export const ESTADOS_TK = ['Nuevo', 'En curso', 'Esperando al cliente', 'Hecho', 'Descartado'];
const TK_COLOR = { 'Nuevo': '--s-revision', 'En curso': '--s-curso', 'Esperando al cliente': '--s-confirmar', 'Hecho': '--s-entregado', 'Descartado': '--s-empezar' };
export const COBROS = ['A definir', 'Incluido en el abono', 'A facturar', 'Sin cargo'];
const ORIGEN = { portal: 'Portal', equipo: 'Equipo', whatsapp: 'WhatsApp', mail: 'Mail' };

export function initTickets(ctx) {
  const { S, esc, opt, toast, data, render, $, av, fotoDe, personas, fmt, fmtShort, today, thisMonth, isStaff, isAdmin, cmp, norm, emptyBox, hil, clienteOpts, closeForm, reload, ISO, money } = ctx;
  const st = { f: { estado: 'abiertos', cliente: '', resp: '', cobro: '' }, abierto: null, bf: { estado: 'Nuevo' }, brief: null };
  window.addEventListener('horas-cargadas', () => { st.hp = null; if (S.view === 'tickets') render(); });
  const tks = () => S.PD || [];
  const abierto = t => !['Hecho', 'Descartado'].includes(t.estado);
  const pillTk = e => '<span class="pzst" style="--c:var(' + (TK_COLOR[e] || '--muted') + ')">' + esc(e) + '</span>';
  const kpi = (l, n, sub, cls, act) => '<button class="hk ' + (cls || '') + '"' + (act || '') + '><span class="hk-t"><span class="hk-l">' + esc(l) + '</span><b>' + esc(String(n)) + '</b><span class="hk-s">' + esc(sub) + '</span></span></button>';
  const horasTxt = h => h === '' || h == null ? '' : String(h).replace('.', ',') + ' h';
  const mon = (n, m) => money ? money(n, m) : (m + ' ' + n);

  function vTickets() {
    let h = '<div class="head"><div><h1>Tickets</h1><p>Pedidos chicos de los clientes, con quién lo hace, horas y si se cobra.</p></div>' +
      '<div class="toolbar">' + vistaSel('tickets', ['lista', 'tablero'], vistaDe('tickets', ['lista', 'tablero'])) + (ctx.autoBtn ? ctx.autoBtn('tickets') : '') + (isStaff() ? '<button class="btn primary" data-act="tkNuevo">+ Ticket</button>' : '') + '</div></div>';
    if (S.PD === null) return h + '<section class="sheet">' + emptyBox('Falta un paso en la base de datos', 'Para usar Tickets hay que correr la migración 0016 en Supabase.') + '</section>';
    const ab = tks().filter(abierto), sinResp = ab.filter(t => !t.resp), m = thisMonth();
    const delMes = tks().filter(t => String(t.cerrado || t.creado || '').slice(0, 7) === m);
    if (!st.hp && !st.hpCargando) { st.hpCargando = true; data.horasPorPedido().then(mp => { st.hp = mp || new Map(); st.hpCargando = false; render(); }); }
    const minDe = t => (st.hp && st.hp.get(t._id)) || 0;
    const hs = delMes.reduce((a, t) => a + minDe(t), 0) / 60 + delMes.reduce((a, t) => a + (+t.horas || 0), 0);
    const aFac = tks().filter(t => t.cobro === 'A facturar' && !t.facturado && t.estado !== 'Descartado');
    const porMon = {}; aFac.forEach(t => { if (t.monto !== '') porMon[t.moneda] = (porMon[t.moneda] || 0) + (+t.monto || 0); });
    h += '<section class="hks">' + kpi('Abiertos', ab.length, ab.filter(t => t.estado === 'Nuevo').length + ' nuevos', '', ' data-act="tkF" data-k="estado" data-v="abiertos"') +
      kpi('Sin responsable', sinResp.length, 'para asignar', sinResp.length ? 'warn' : '', ' data-act="tkF" data-k="resp" data-v="__nadie"') +
      kpi('Horas este mes', horasTxt(Math.round(hs * 10) / 10) || '0 h', delMes.length + ' tickets', '', '') +
      kpi('A facturar', aFac.length, Object.entries(porMon).map(([mo, n]) => mon(n, mo)).join(' · ') || 'sin montos cargados', aFac.length ? 'alert' : '', ' data-act="tkF" data-k="cobro" data-v="A facturar"') + '</section>';
    const f = st.f, q = norm(f.q || ''), tablero = vistaDe('tickets', ['lista', 'tablero']) === 'tablero';
    const lista = tks().filter(t => (tablero ? t.estado !== 'Descartado' && (abierto(t) || String(t.cerrado || t.creado || '').slice(0, 7) >= m) : f.estado === 'abiertos' ? abierto(t) : f.estado === 'cerrados' ? !abierto(t) : true) && (!f.cliente || t.cliente === f.cliente) &&
      (!f.resp || (f.resp === '__nadie' ? !t.resp : t.resp === f.resp)) && (!f.cobro || (f.cobro === 'A facturar' ? t.cobro === 'A facturar' && !t.facturado : t.cobro === f.cobro)) &&
      (!q || norm(t.titulo + ' ' + t.cliente + ' ' + t.detalle + ' #' + t.numero).includes(q)))
      .sort((a, b) => (abierto(b) - abierto(a)) || (b.creado || '').localeCompare(a.creado || ''));
    h += '<div class="toolbar fbar2"><input class="in" type="search" id="tk-q" placeholder="Buscar ticket, cliente o #número" value="' + esc(f.q || '') + '">' +
      (tablero ? '' : '<select class="in" data-tkf="estado" aria-label="Estado">' + [['abiertos', 'Abiertos'], ['cerrados', 'Cerrados'], ['todos', 'Todos']].map(([v, l]) => opt(v, l, f.estado)).join('') + '</select>') +
      '<select class="in" data-tkf="cliente" aria-label="Cliente">' + clienteOpts(f.cliente, 'Todos los clientes') + '</select>' +
      filtrosMenu('tickets', '<label class="lbl">Responsable</label><select class="in" data-tkf="resp" aria-label="Responsable">' + opt('', 'Todo el equipo', f.resp) + opt('__nadie', 'Sin responsable', f.resp) + personas().map(a => opt(a, a, f.resp)).join('') + '</select>' +
        '<label class="lbl">Cobro</label><select class="in" data-tkf="cobro" aria-label="Cobro">' + opt('', 'Cualquier cobro', f.cobro) + COBROS.map(c => opt(c, c === 'A facturar' ? 'A facturar (sin facturar)' : c, f.cobro)).join('') + '</select>', (f.resp ? 1 : 0) + (f.cobro ? 1 : 0)) + '</div>';
    if (tablero) {
      const can = isStaff();
      const cols = ESTADOS_TK.filter(e => e !== 'Descartado').map(e => { const its = lista.filter(t => t.estado === e);
        return '<div class="col" style="--c:var(' + (TK_COLOR[e] || '--muted') + ')" data-tkdrop="' + esc(e) + '"><div class="col-h">' + pillTk(e) + '<span class="n">' + its.length + '</span></div>' +
          its.map(t => '<button class="card" data-act="tkVer" data-id="' + esc(t._id) + '" data-tkdrag="' + esc(t._id) + '"' + (can ? ' draggable="true"' : '') + '><span class="cl"><span>#' + t.numero + ' · ' + esc(t.cliente) + '</span></span><b>' + esc(t.titulo) + '</b>' +
            '<span class="tk-cf">' + (t.resp ? av(t.resp, fotoDe(t.resp)) : '<span class="muted">Sin responsable</span>') + (t.cobro === 'A facturar' && !t.facturado ? '<span class="tk-cob fac">A facturar</span>' : '') + (t.paraCuando && abierto(t) ? '<span class="mono muted">para ' + fmtShort(t.paraCuando) + '</span>' : '') + '</span></button>').join('') + '</div>'; }).join('');
      return h + (can ? '<p class="muted" style="margin:0">Arrastrá un ticket a otra columna para cambiarle el estado. En “Hecho” se ven los cerrados de este mes.</p>' : '') + '<div class="kbw"><div class="kb tk-kb">' + cols + '</div></div>';
    }
    if (!lista.length) return h + '<section class="sheet">' + emptyBox(tks().length ? 'Ningún ticket con ese filtro' : 'Todavía no hay tickets', tks().length ? '' : 'Los clientes los cargan desde su portal, o ustedes con “+ Ticket” cuando llega un pedido por WhatsApp o mail.') + '</section>';
    const can = isStaff();
    h += '<section class="sheet"><div class="tbl"><table><thead><tr><th>#</th><th>Ticket</th><th>Estado</th><th>Quién</th><th>Horas</th><th>Cobro</th><th>Fecha</th></tr></thead><tbody>' + lista.map(t => '<tr class="click" data-act="tkVer" data-id="' + esc(t._id) + '">' +
      '<td class="mono muted">' + t.numero + '</td>' +
      '<td class="name"><b>' + esc(t.titulo) + '</b><span class="sub">' + esc(t.cliente) + (t.autor ? ' · ' + esc(t.autor) : '') + ' · ' + esc(ORIGEN[t.origen] || t.origen) + (t.prio ? ' · ⚑ ' + esc(t.prio) : '') + '</span></td>' +
      '<td>' + (can ? '<select class="cellsel st" style="--c:var(' + (TK_COLOR[t.estado] || '--muted') + ')" data-tkupd="estado" data-id="' + esc(t._id) + '" aria-label="Estado">' + ESTADOS_TK.map(e => opt(e, e, t.estado)).join('') + '</select>' : pillTk(t.estado)) + '</td>' +
      '<td>' + (can ? '<select class="in sm" data-tkupd="resp" data-id="' + esc(t._id) + '" aria-label="Responsable">' + opt('', '—', t.resp) + [...new Set([...personas(), t.resp].filter(Boolean))].map(a => opt(a, a, t.resp)).join('') + '</select>' : esc(t.resp || '—')) + '</td>' +
      '<td class="muted">' + (horasTxt(Math.round((minDe(t) / 60 + (+t.horas || 0)) * 100) / 100 || '') || '—') + '</td>' +
      '<td><span class="tk-cob' + (t.cobro === 'A facturar' && !t.facturado ? ' fac' : '') + '">' + esc(t.cobro) + (t.cobro === 'A facturar' ? (t.facturado ? ' ✓' : t.monto !== '' ? ' · ' + mon(t.monto, t.moneda) : '') : '') + '</span></td>' +
      '<td class="mono">' + (t.creado ? fmtShort(t.creado.slice(0, 10)) : '') + (t.paraCuando && abierto(t) ? '<span class="sub">para ' + fmtShort(t.paraCuando) + '</span>' : '') + '</td></tr>').join('') + '</tbody></table></div><div class="count">' + lista.length + ' tickets</div></section>';
    return h;
  }

  function abrir(id, preset) {
    const t = id ? tks().find(x => x._id === id) : null;
    if (id && !t) { toast('Ese ticket ya no existe'); return; }
    const v = t || Object.assign({ cliente: '', titulo: '', detalle: '', origen: 'equipo', prio: '', estado: 'Nuevo', resp: S.me ? S.me.alias : '', horas: '', cobro: 'A definir', monto: '', moneda: 'ARS', paraCuando: '', respuesta: '' }, preset || {});
    st.abierto = id || null; S.form = null;
    const can = isStaff(), d = can ? '' : ' disabled';
    const pys = S.P.filter(p => p.cliente === v.cliente && !['Entregado', 'Cancelado'].includes(p.estado));
    $('#panel').innerHTML = '<form id="tkpform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + (t ? 'Ticket #' + t.numero + (t.deCliente ? ' · lo cargó ' + esc(t.autor) + ' desde el portal' : '') : 'Nuevo ticket') + '</span><h2 id="panel-title">' + esc(t ? t.titulo : 'Ticket') + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b">' +
      '<div class="field full"><label for="tp-cliente">Cliente <b>*</b></label><select id="tp-cliente"' + d + '>' + clienteOpts(v.cliente) + '</select></div>' +
      '<div class="field full"><label for="tp-titulo">Qué pidió <b>*</b></label><input id="tp-titulo" value="' + esc(v.titulo) + '" placeholder="Ej.: Cambiar el horario en la web"' + d + '></div>' +
      '<div class="field full"><label for="tp-detalle">Detalle</label><textarea id="tp-detalle" rows="3"' + d + '>' + esc(v.detalle) + '</textarea></div>' +
      '<div class="field"><label for="tp-origen">Llegó por</label><select id="tp-origen"' + d + '>' + Object.entries(ORIGEN).map(([k, l]) => opt(k, l, v.origen)).join('') + '</select></div>' +
      '<div class="field"><label for="tp-prio">Prioridad</label><select id="tp-prio"' + d + '>' + opt('', 'Normal', v.prio) + ['Urgente', 'Alta', 'Media', 'Baja'].map(x => opt(x, x, v.prio)).join('') + '</select></div>' +
      '<div class="field"><label for="tp-estado">Estado</label><select id="tp-estado"' + d + '>' + ESTADOS_TK.map(e => opt(e, e, v.estado)).join('') + '</select></div>' +
      '<div class="field"><label for="tp-resp">Responsable</label><select id="tp-resp"' + d + '>' + opt('', 'Sin asignar', v.resp) + [...new Set([...personas(), v.resp].filter(Boolean))].map(a => opt(a, a, v.resp)).join('') + '</select></div>' +
      '<div class="field"><label for="tp-para">Para cuándo</label><input id="tp-para" type="date" value="' + esc(v.paraCuando) + '"' + d + '></div>' +

      '<div class="field"><label for="tp-cobro">¿Se cobra?</label><select id="tp-cobro"' + d + '>' + COBROS.map(c => opt(c, c, v.cobro)).join('') + '</select></div>' +
      '<div class="field tp-mon"' + (v.cobro === 'A facturar' ? '' : ' hidden') + '><label for="tp-monto">Monto</label><span style="display:flex;gap:6px"><input id="tp-monto" type="number" min="0" step="1" value="' + esc(v.monto) + '"' + d + '><select id="tp-moneda" style="width:90px"' + d + '>' + (S.L.monedas || ['ARS', 'USD']).map(m => opt(m, m, v.moneda)).join('') + '</select></span></div>' +
      (t && t.facturado ? '<p class="formnote full">✓ Ya se incluyó en un resumen de cuenta.</p>' : '') +
      '<div class="field full"><label for="tp-resp-cli">Respuesta para el cliente</label><textarea id="tp-resp-cli" rows="2" placeholder="La ve en su portal. Ej.: Listo, ya está actualizado."' + d + '>' + esc(v.respuesta) + '</textarea></div>' +
      (t && can && pys.length ? '<div class="field full"><label for="tp-proy">Pasarlo a un proyecto como tarea</label><span style="display:flex;gap:6px"><select id="tp-proy">' + opt('', 'Elegí el proyecto', '') + pys.map(p => opt(p._id, p.proyecto, '')).join('') + '</select><button type="button" class="btn sm" data-act="tkATarea">Crear tarea</button></span></div>' : '') +
      (t ? '<div class="full">' + hil().html('pedido', t._id, { cliente: t.cliente, titulo: 'Conversación', compacto: true, publico: true }) + '</div>' : '') +
      '</div><div class="panel-f"><span id="tkdel">' + (t && can ? '<button type="button" class="btn ghost danger" data-act="tkBorrar1">Borrar</button>' : '') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">' + (can ? 'Cancelar' : 'Cerrar') + '</button>' + (can ? '<button type="submit" class="btn primary">' + (t ? 'Guardar' : 'Crear ticket') + '</button>' : '') + '</span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false;
    if (!t) setTimeout(() => { const el = v.cliente ? $('#tp-titulo') : $('#tp-cliente'); if (el) el.focus(); }, 30);
  }
  async function guardar() {
    const g = k => (($('#tp-' + k) || {}).value || '').trim();
    const u = { cliente: g('cliente'), titulo: g('titulo'), detalle: g('detalle'), origen: g('origen'), prio: g('prio'), estado: g('estado'), resp: g('resp'), paraCuando: g('para'), cobro: g('cobro'), monto: g('cobro') === 'A facturar' ? g('monto') : '', moneda: g('moneda') || 'ARS', respuesta: g('resp-cli') };
    if (!u.cliente || !u.titulo) { toast('Completá el cliente y qué pidió'); return; }
    try { await data.pedidoGuardar(st.abierto, u); closeForm(); toast(st.abierto ? 'Ticket guardado' : 'Ticket creado'); await reload(); } catch (e) { toast(e.message); }
  }

  /* ---------- Briefs (Tally) ---------- */
  function vBriefs() {
    let h = '<div class="head"><div><h1>Briefs</h1><p>Lo que completan los clientes en los formularios de Tally. Mr. Piggy los resume y marca lo que falta preguntar.</p></div>' + (isStaff() ? '<button class="btn" data-act="bfLink">Mandar un brief a un cliente</button>' : '') + '</div>';
    if (S.BF === null) return h + '<section class="sheet">' + emptyBox('Falta un paso en la base de datos', 'Para usar Briefs hay que correr la migración 0016 en Supabase.') + '</section>';
    const bs = S.BF || [];
    if (!bs.length) return h + '<section class="sheet">' + emptyBox('Todavía no llegó ningún brief', 'Conectá Tally en Integraciones y marcá qué formularios son briefs. Desde ahí cada respuesta entra sola.') + '</section>';
    const sin = bs.filter(b => !b.cliente);
    h += '<div class="subnav">' + [['Nuevo', 'Nuevos'], ['Visto', 'Vistos'], ['Archivado', 'Archivados'], ['', 'Todos']].map(([k, l]) => '<button data-act="bfF" data-v="' + k + '"' + (st.bf.estado === k ? ' aria-current="page"' : '') + '>' + l + ' <span class="snav-n">' + (k ? bs.filter(b => b.estado === k).length : bs.length) + '</span></button>').join('') + '</div>';
    if (sin.length) h += '<div class="rm-bar"><span><b>' + sin.length + '</b> sin cliente asignado: abrilos y elegí de quién son.</span></div>';
    const lista = bs.filter(b => !st.bf.estado || b.estado === st.bf.estado);
    h += '<section class="sheet"><div class="rows">' + (lista.length ? lista.map(b => '<button class="row" data-act="bfVer" data-id="' + esc(b._id) + '"><span class="d">' + (b.respondido ? fmtShort(b.respondido.slice(0, 10)) : '') + '</span><span class="t"><b>' + esc(b.cliente || b.empresa || b.nombre || 'Sin cliente') + (b.tipo ? ' · ' + esc(b.tipo) : '') + '</b><span>' + esc(b.form) + (b.resumen && b.resumen.resumen ? ' · ' + esc(b.resumen.resumen.slice(0, 120)) : '') + '</span></span>' + (b.cliente ? '' : '<span class="pzst" style="--c:var(--s-revision)">Asignar</span>') + '</button>').join('') : emptyBox('Nada por acá', '')) + '</div></section>';
    return h;
  }
  function abrirBrief(id) {
    const b = (S.BF || []).find(x => x._id === id); if (!b) return;
    st.brief = id; S.form = null;
    if (b.estado === 'Nuevo' && isStaff()) data.briefUpd(id, { estado: 'Visto' }).then(() => { b.estado = 'Visto'; }, () => {});
    if (!b.resumen && isStaff() && !st.resumiendo) resumir(b);
    const pys = b.cliente ? S.P.filter(p => p.cliente === b.cliente) : [];
    const r = b.resumen;
    const lst = (l, a) => a && a.length ? '<div class="bf-l"><b>' + l + '</b><ul>' + a.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '';
    $('#panel').innerHTML = '<div class="panel-h"><div><span class="eyebrow">Brief' + (b.tipo ? ' de ' + esc(b.tipo) : '') + ' · ' + (b.respondido ? fmt(b.respondido.slice(0, 10)) : '') + '</span><h2 id="panel-title">' + esc(b.cliente || b.empresa || b.nombre || 'Sin cliente') + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b">' +
      (isStaff() ? '<div class="field"><label for="bf-cli">Cliente</label><select id="bf-cli" data-bfupd="cliente" data-id="' + esc(b._id) + '">' + clienteOpts(b.cliente, 'Sin asignar') + '</select></div>' +
        '<div class="field"><label for="bf-proy">Proyecto</label><select id="bf-proy" data-bfupd="proyectoId" data-id="' + esc(b._id) + '">' + opt('', pys.length ? 'Sin proyecto' : 'Elegí antes el cliente', b.proyectoId || '') + pys.map(p => opt(p._id, p.proyecto, b.proyectoId || '')).join('') + '</select></div>' : '') +
      '<div class="iabox full bf-ia"><span class="lbl"><span class="pig" aria-hidden="true">' + ISO + '</span> Lo importante, según Mr. Piggy</span>' +
      (r ? '<p style="margin:0">' + esc(r.resumen || '') + '</p>' + (r.publico ? '<p style="margin:0"><b>Público:</b> ' + esc(r.publico) + '</p>' : '') + (r.tono ? '<p style="margin:0"><b>Tono:</b> ' + esc(r.tono) + '</p>' : '') + lst('Objetivos', r.objetivos) + lst('Entregables', r.entregables) + lst('Referencias', r.referencias) + lst('Para preguntar antes de arrancar', r.dudas)
        : '<p class="muted" style="margin:0">' + (isStaff() ? '<span class="ia-dots"><i></i><i></i><i></i></span> Leyendo el brief…' : 'Sin resumen todavía.') + '</p>') + '</div>' +
      '<div class="field full"><span class="lbl">Respuestas</span><dl class="bf-r">' + b.respuestas.map(x => '<dt>' + esc(x.pregunta) + '</dt><dd>' + esc(x.respuesta).replace(/(https?:\/\/[^\s<,]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>') + '</dd>').join('') + '</dl></div>' +
      '</div><div class="panel-f"><span class="toolbar">' + (b.pdf ? '<a class="btn sm" href="' + esc(b.pdf) + '" target="_blank" rel="noopener">PDF</a>' : '') + (b.preview ? '<a class="btn sm" href="' + esc(b.preview) + '" target="_blank" rel="noopener">Ver en Tally</a>' : '') + '</span><span style="display:flex;gap:8px">' + (isStaff() ? '<button type="button" class="btn" data-act="bfArchivar">' + (b.estado === 'Archivado' ? 'Desarchivar' : 'Archivar') + '</button>' : '') + '<button type="button" class="btn primary" data-act="close">Listo</button></span></div>';
    $('#panel').hidden = false; $('#scrim').hidden = false;
  }
  async function resumir(b) {
    st.resumiendo = true;
    try {
      const r = await data.ia({ modo: 'brief', texto: b.respuestas.map(x => x.pregunta + ': ' + x.respuesta).join('\n'), contexto: { cliente: b.cliente || b.empresa, tipo: b.tipo, formulario: b.form } });
      b.resumen = r; await data.briefUpd(b._id, { resumen: r });
      if (st.brief === b._id && !$('#panel').hidden) abrirBrief(b._id);
    } catch (e) { if (st.brief === b._id) toast('Mr. Piggy no pudo resumirlo: ' + e.message); }
    st.resumiendo = false;
  }
  // Link del formulario de Tally ya atado al cliente (y al proyecto): los campos ocultos se completan solos.
  function linkBrief(tipo, cliente, proyectoId) {
    const cfg = S.L.integraciones_cfg || [];
    const f = cfg.find(x => x.startsWith('tally.form.') && x.slice(x.indexOf('=') + 1) === tipo);
    if (!f) return '';
    const id = f.slice(11, f.indexOf('='));
    const c = S.C.find(x => x.nombre === cliente);
    return 'https://tally.so/r/' + id + '?' + new URLSearchParams({ ...(c ? { cliente: c._id } : {}), ...(proyectoId ? { proyecto: proyectoId } : {}) }).toString();
  }
  function tiposBrief() { return [...new Set((S.L.integraciones_cfg || []).filter(x => x.startsWith('tally.form.')).map(x => x.slice(x.indexOf('=') + 1)).filter(Boolean))]; }
  function abrirLink(preset) {
    const ts = tiposBrief();
    if (!ts.length) { toast('Primero conectá Tally en Integraciones y marcá qué formularios son briefs.'); return; }
    S.form = null; st.brief = null;
    const pv = preset || {};
    $('#panel').innerHTML = '<form id="bflform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">Briefs</span><h2 id="panel-title">Mandar un brief</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><p class="formnote full">El link ya va atado al cliente: cuando lo completa, el brief cae solo en su ficha (y en el proyecto, si elegís uno).</p>' +
      '<div class="field"><label for="bfl-tipo">Brief de</label><select id="bfl-tipo">' + ts.map(t => opt(t, t, pv.tipo || ts[0])).join('') + '</select></div>' +
      '<div class="field"><label for="bfl-cli">Cliente</label><select id="bfl-cli">' + clienteOpts(pv.cliente || '') + '</select></div>' +
      '<div class="field full"><label for="bfl-proy">Proyecto (opcional)</label><select id="bfl-proy">' + opt('', 'Sin proyecto', '') + S.P.filter(p => !pv.cliente || p.cliente === pv.cliente).map(p => opt(p._id, p.cliente + ' · ' + p.proyecto, pv.proyectoId || '')).join('') + '</select></div>' +
      '<div class="field full"><label for="bfl-url">Link</label><input id="bfl-url" readonly></div></div>' +
      '<div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="bfCopiar">Copiar link</button><button type="button" class="btn" data-act="bfWa">WhatsApp</button><button type="submit" class="btn primary">Mandar por mail</button></span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false; pintarLink();
  }
  function pintarLink() { const u = linkBrief($('#bfl-tipo').value, $('#bfl-cli').value, $('#bfl-proy').value); $('#bfl-url').value = u; return u; }

  document.addEventListener('submit', async e => {
    const f = e.target;
    if (f.id === 'tkpform') { e.preventDefault(); e.stopImmediatePropagation(); guardar(); }
    if (f.id === 'bflform') {
      e.preventDefault(); e.stopImmediatePropagation();
      const u = pintarLink(), c = $('#bfl-cli').value; if (!c) { toast('Elegí el cliente'); return; }
      closeForm(); if (ctx.openMail) ctx.openMail({ clientes: [c], asunto: 'Brief para arrancar', mensaje: 'Hola {nombre}, ¿cómo estás?\n\nPara arrancar necesitamos que completes este brief. Te lleva unos 10 minutos y nos ayuda a entender bien lo que necesitás:\n\n' + u + '\n\n¡Gracias!' });
    }
  }, true);
  document.addEventListener('input', e => { if (e.target.id === 'tk-q') { st.f.q = e.target.value; clearTimeout(st.t); st.t = setTimeout(() => { const pos = e.target.selectionStart; render(); const i = $('#tk-q'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (er) { } } }, 200); } });
  document.addEventListener('change', async e => {
    const t = e.target;
    if (t.dataset && t.dataset.tkf) { st.f[t.dataset.tkf] = t.value; render(); return; }
    if (t.id === 'tp-cobro') { const m = document.querySelector('.tp-mon'); if (m) m.hidden = t.value !== 'A facturar'; return; }
    if (t.id === 'bfl-tipo' || t.id === 'bfl-cli' || t.id === 'bfl-proy') { if (t.id === 'bfl-cli') { const ps = S.P.filter(p => !t.value || p.cliente === t.value); $('#bfl-proy').innerHTML = opt('', 'Sin proyecto', '') + ps.map(p => opt(p._id, p.cliente + ' · ' + p.proyecto, '')).join(''); } pintarLink(); return; }
    if (t.dataset && t.dataset.tkupd) {
      const k = t.dataset.tkupd, x = tks().find(y => y._id === t.dataset.id); if (!x) return;
      const v = t.value; try { await data.pedidoGuardar(x._id, { [k]: v }); x[k] = k === 'horas' ? (v === '' ? '' : +v) : v; if (k === 'estado') render(); toast('Ticket #' + x.numero + ' actualizado'); } catch (er) { toast(er.message); render(); }
      return;
    }
    if (t.dataset && t.dataset.bfupd) {
      const b = (S.BF || []).find(x => x._id === t.dataset.id); if (!b) return;
      const u = { [t.dataset.bfupd]: t.value || null };
      if (t.dataset.bfupd === 'cliente') { u.proyectoId = null; }
      try { await data.briefUpd(b._id, u); Object.assign(b, t.dataset.bfupd === 'cliente' ? { cliente: t.value, proyectoId: null } : { proyectoId: t.value || null }); abrirBrief(b._id); render(); toast('Brief asignado'); } catch (er) { toast(er.message); }
    }
  });
  // Arrastrar tickets entre columnas del tablero
  let drag = null;
  document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('[data-tkdrag]'); if (!c) return; drag = c.dataset.tkdrag; try { e.dataTransfer.setData('text/plain', drag); e.dataTransfer.effectAllowed = 'move'; } catch (_) { /* nada */ } c.classList.add('dragging'); });
  document.addEventListener('dragend', () => { drag = null; document.querySelectorAll('.dragging,[data-tkdrop].over').forEach(x => x.classList.remove('dragging', 'over')); });
  document.addEventListener('dragover', e => { const col = drag && e.target.closest && e.target.closest('[data-tkdrop]'); if (!col) return; e.preventDefault(); document.querySelectorAll('[data-tkdrop].over').forEach(x => { if (x !== col) x.classList.remove('over'); }); col.classList.add('over'); });
  document.addEventListener('drop', async e => {
    const col = drag && e.target.closest && e.target.closest('[data-tkdrop]'); if (!col) return;
    e.preventDefault(); const x = tks().find(y => y._id === drag), v = col.dataset.tkdrop; drag = null; col.classList.remove('over');
    if (!x || x.estado === v) return;
    const antes = x.estado; x.estado = v; render();
    try { await data.pedidoGuardar(x._id, { estado: v }); toast('Ticket #' + x.numero + ' → ' + v); } catch (er) { x.estado = antes; render(); toast(er.message); }
  });
  const acts = {
    tkNuevo: t => abrir(null, t.dataset.cliente ? { cliente: t.dataset.cliente } : null),
    tkVer: t => abrir(t.dataset.id),
    tkF: t => { st.f = { estado: 'todos', cliente: '', resp: '', cobro: '' }; st.f[t.dataset.k] = t.dataset.v; if (t.dataset.k === 'resp') st.f.estado = 'abiertos'; render(); },
    tkBorrar1: () => { $('#tkdel').innerHTML = '<span class="muted" style="font-size:13px">¿Seguro?</span> <button type="button" class="btn danger sm" data-act="tkBorrarSi">Sí, borrar</button>'; },
    tkBorrarSi: async () => { try { await data.pedidoDel(st.abierto); closeForm(); toast('Ticket borrado'); await reload(); } catch (e) { toast(e.message); } },
    tkATarea: async () => {
      const x = tks().find(y => y._id === st.abierto), pid = ($('#tp-proy') || {}).value, p = S.P.find(y => y._id === pid); if (!x || !p) { toast('Elegí el proyecto'); return; }
      try { const lista = [...(p.etapas || []), { n: x.titulo + ' (ticket #' + x.numero + ')', ok: false, resp: x.resp, fecha: x.paraCuando || '', nota: x.detalle, etapa: p.etapaActual || '' }]; await data.tareasSync(p._id, p.etapas || [], lista); await data.pedidoGuardar(x._id, { estado: 'En curso', proyectoId: p._id }); closeForm(); toast('Tarea creada en ' + p.proyecto); await reload(); } catch (e) { toast(e.message); }
    },
    bfVer: t => abrirBrief(t.dataset.id),
    bfF: t => { st.bf.estado = t.dataset.v; render(); },
    bfArchivar: async () => { const b = (S.BF || []).find(x => x._id === st.brief); if (!b) return; const e = b.estado === 'Archivado' ? 'Visto' : 'Archivado'; try { await data.briefUpd(b._id, { estado: e }); b.estado = e; closeForm(); render(); } catch (er) { toast(er.message); } },
    bfLink: t => abrirLink({ cliente: t.dataset.cliente || '', proyectoId: t.dataset.proyecto || '', tipo: t.dataset.tipo || '' }),
    bfCopiar: () => { const u = pintarLink(); if (ctx.copyText) ctx.copyText(u); },
    bfWa: () => { const u = pintarLink(), c = S.C.find(x => x.nombre === $('#bfl-cli').value); window.open('https://wa.me/' + (c && ctx.waNum ? ctx.waNum(c.tel) : '') + '?text=' + encodeURIComponent('Hola! Para arrancar te pedimos que completes este brief (te lleva unos 10 minutos): ' + u), '_blank', 'noopener'); },
  };
  // Briefs y tickets de un cliente (para su ficha).
  function fichaHtml(cliente) {
    const bs = (S.BF || []).filter(b => b.cliente === cliente), ts = tks().filter(t => t.cliente === cliente);
    if (S.PD === null && S.BF === null) return '';
    const ab = ts.filter(abierto);
    return '<section class="sheet"><div class="sheet-h"><h2>Tickets y briefs</h2><span class="toolbar">' + (isStaff() ? '<button class="btn sm" data-act="tkNuevo" data-cliente="' + esc(cliente) + '">+ Ticket</button>' + (tiposBrief().length ? '<button class="btn sm" data-act="bfLink" data-cliente="' + esc(cliente) + '">Mandar brief</button>' : '') : '') + '</span></div>' +
      (ab.length || bs.length ? '<div class="rows">' + ab.slice(0, 6).map(t => '<button class="row" data-act="tkVer" data-id="' + esc(t._id) + '"><span class="d mono">#' + t.numero + '</span><span class="t"><b>' + esc(t.titulo) + '</b><span>' + esc([t.resp || 'sin responsable', t.cobro].join(' · ')) + '</span></span>' + pillTk(t.estado) + '</button>').join('') +
        bs.slice(0, 4).map(b => '<button class="row" data-act="bfVer" data-id="' + esc(b._id) + '"><span class="d">Brief</span><span class="t"><b>' + esc(b.tipo || b.form) + '</b><span>' + (b.respondido ? fmt(b.respondido.slice(0, 10)) : '') + '</span></span></button>').join('') + '</div>'
        : emptyBox('Sin tickets abiertos ni briefs', '')) + (ts.length > ab.length ? '<div class="count">' + (ts.length - ab.length) + ' tickets cerrados</div>' : '') + '</section>';
  }
  return { vTickets, vBriefs, acts, abrir, abrirBrief, fichaHtml, linkBrief, tiposBrief, abiertos: () => tks().filter(abierto).length };
}
