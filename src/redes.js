// Redes: un "mes" por cliente con su planilla de piezas. El plan es una meta (no un molde): las piezas se suman cuando surgen
// y las que pasan el plan quedan como extras. Dropbox crea las carpetas, guarda el arte y cuenta lo que ya está.
// Mr. Piggy propone contenido, escribe copys y reparte lo que el cliente dice en un chat.
export const ESTADOS_PIEZA = ['Idea', 'En diseño', 'Revisión interna', 'Para el cliente', 'Cambios', 'Aprobada', 'Programada', 'Publicada'];
export const ESTADOS_MES = ['Planificación', 'Producción', 'Revisión interna', 'Con el cliente', 'Aprobado', 'Programado', 'Cerrado'];
export const PZ_COLOR = { 'Idea': '--s-empezar', 'En diseño': '--s-curso', 'Revisión interna': '--s-confirmar', 'Para el cliente': '--s-revision', 'Cambios': '--s-cancelado', 'Aprobada': '--s-entregado', 'Programada': '--s-presup', 'Publicada': '--s-entregado' };
const MES_COLOR = { 'Planificación': '--s-empezar', 'Producción': '--s-curso', 'Revisión interna': '--s-confirmar', 'Con el cliente': '--s-revision', 'Aprobado': '--s-entregado', 'Programado': '--s-presup', 'Cerrado': '--s-pausado' };
const REDES = ['Instagram', 'Facebook', 'TikTok', 'LinkedIn', 'YouTube', 'X'];
const FORMATOS_DEF = ['Historias', 'Reels', 'Posts y carruseles'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const IMG = /\.(jpe?g|png|gif|webp|tiff?|bmp|heic)$/i;

export function initRedes(ctx) {
  const { S, esc, opt, toast, data, render, $, av, fotoDe, personas, pill, fmt, fmtShort, today, thisMonth, addMonth, monthLabel, isStaff, cmp, norm, emptyBox, hil, ISO, cfgGet, lsSet, lsGet } = ctx;
  const st = { mes: thisMonth(), sel: new Set(), tab: lsGet('rmTab') || 'planilla', cargando: new Set(), thumbs: new Map(), pidiendo: new Set(), fpz: null, abrirPieza: null };
  const P = new Map(); // mesId -> piezas

  const formatos = () => (S.L.formatosRedes && S.L.formatosRedes.length ? S.L.formatosRedes : FORMATOS_DEF);
  const meses = () => S.RM || [];
  const mesDe = id => meses().find(m => m._id === id);
  const mesCliente = (cliente, mes) => meses().find(m => m.cliente === cliente && m.mes === mes);
  const abonoRedes = cliente => S.A.find(a => a.cliente === cliente && a.tipo === 'Redes' && a.estado === 'Activo');
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
  const conteoPorFormato = ps => { const o = {}; (ps || []).forEach(z => { o[z.formato] = (o[z.formato] || 0) + 1; }); return o; };
  const pzPill = e => '<span class="pzst" style="--c:var(' + (PZ_COLOR[e] || '--muted') + ')">' + esc(e) + '</span>';
  const mesPill = e => pill(e, MES_COLOR[e] || '--muted');
  const fechaMes = (mes, d) => mes + '-' + String(d).padStart(2, '0');
  const diasMes = mes => { const [y, m] = mes.split('-').map(Number); return new Date(y, m, 0).getDate(); };

  /* ---------- Vista general del mes ---------- */
  function vLista() {
    const cs = clientesMes(st.mes), ms = cs.map(c => mesCliente(c, st.mes)).filter(Boolean);
    const sinCargar = ms.filter(m => !P.has(m._id)).map(m => m._id); if (sinCargar.length) setTimeout(() => cargar(sinCargar), 0);
    let tot = 0, plan = 0, aprobar = 0, cambios = 0, extras = 0;
    ms.forEach(m => { const ps = piezas(m._id) || []; tot += ps.length; plan += Object.values(m.plan || {}).reduce((a, n) => a + (+n || 0), 0); aprobar += ps.filter(z => z.estado === 'Para el cliente').length; cambios += ps.filter(z => z.estado === 'Cambios').length; extras += ps.filter(z => z.extra).length; });
    const nav = '<div class="rm-nav"><button class="btn ghost sm" data-act="rmMes" data-d="-1" aria-label="Mes anterior">←</button><b>' + esc(cap(monthLabel(st.mes))) + '</b><button class="btn ghost sm" data-act="rmMes" data-d="1" aria-label="Mes siguiente">→</button>' + (st.mes !== thisMonth() ? '<button class="btn ghost sm" data-act="rmMes" data-d="0">Este mes</button>' : '') + '</div>';
    let h = '<div class="head"><div><h1>Redes</h1><p>El mes de cada cliente: qué hay que publicar, en qué está cada pieza y qué falta aprobar.</p></div>' + nav + '</div>';
    if (S.RM === null) return h + '<section class="sheet">' + emptyBox('Falta un paso en la base de datos', 'Para usar Redes hay que correr la migración 0016 en Supabase.') + '</section>';
    h += '<section class="hks rm-k">' +
      kpi('Clientes con el mes armado', ms.length + ' de ' + cs.length, cs.length - ms.length ? (cs.length - ms.length) + ' sin arrancar' : 'todos arrancados') +
      kpi('Piezas del mes', tot + (plan ? ' / ' + plan : ''), extras ? extras + ' extras fuera del plan' : 'según plan') +
      kpi('Para aprobar', aprobar, 'esperando al cliente', aprobar ? 'warn' : '') +
      kpi('Con cambios', cambios, 'pedidos por el cliente', cambios ? 'alert' : '') + '</section>';
    const sinMes = cs.filter(c => !mesCliente(c, st.mes));
    if (sinMes.length && isStaff()) h += '<div class="rm-bar"><span><b>' + sinMes.length + '</b> cliente' + (sinMes.length > 1 ? 's' : '') + ' sin el mes armado</span><button class="btn sm primary" data-act="rmArrancarTodos">Arrancar ' + esc(monthLabel(st.mes).split(' ')[0]) + ' para todos</button></div>';
    if (!cs.length) return h + '<section class="sheet">' + emptyBox('No hay clientes con abono de Redes activo', 'Cuando un cliente tenga un abono de Redes, aparece acá.') + '</section>';
    h += '<div class="rm-cards">' + cs.map(c => card(c, mesCliente(c, st.mes))).join('') + '</div>';
    return h;
  }
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const kpi = (l, n, sub, cls) => '<div class="hk ' + (cls || '') + '"><span class="hk-t"><span class="hk-l">' + esc(l) + '</span><b>' + esc(String(n)) + '</b><span class="hk-s">' + esc(sub) + '</span></span></div>';
  function barras(m, ps) {
    const pl = m ? (m.plan || {}) : {}, cnt = conteoPorFormato(ps), fs = [...new Set([...formatos(), ...Object.keys(pl), ...Object.keys(cnt)])];
    return '<div class="rm-fs">' + fs.filter(f => pl[f] || cnt[f]).map(f => {
      const n = cnt[f] || 0, p = +pl[f] || 0, pct = p ? Math.min(100, Math.round(n / p * 100)) : 100, db = m && m.conteo && m.conteo[f] != null ? m.conteo[f] : null;
      return '<div class="rm-f"><span class="rm-fl">' + esc(f) + '</span><span class="rm-fb"><i style="width:' + pct + '%"></i></span><span class="rm-fn"><b>' + n + '</b>' + (p ? '/' + p : '') + (n > p && p ? ' <em>+' + (n - p) + '</em>' : '') + (db != null ? ' <span class="rm-db" title="Archivos en la carpeta de Dropbox">▣ ' + db + '</span>' : '') + '</span></div>';
    }).join('') + '</div>';
  }
  function card(c, m) {
    const cli = S.C.find(x => x.nombre === c) || {};
    if (!m) return '<div class="rm-card vacio"><div class="rm-ch">' + av(c, cli.avatar, 'sq') + '<div><b>' + esc(c) + '</b><span class="muted">' + esc((abonoRedes(c) || {}).plan || 'Sin plan') + '</span></div></div><p class="muted">Todavía no se armó ' + esc(monthLabel(st.mes).split(' ')[0]) + '.</p>' + (isStaff() ? '<button class="btn sm" data-act="rmArrancar" data-c="' + esc(c) + '">Arrancar el mes</button>' : '') + '</div>';
    const ps = piezas(m._id);
    const ap = ps ? ps.filter(z => z.estado === 'Para el cliente').length : 0, ca = ps ? ps.filter(z => z.estado === 'Cambios').length : 0;
    return '<button class="rm-card" data-act="rmAbrir" data-id="' + esc(m._id) + '"><div class="rm-ch">' + av(c, cli.avatar, 'sq') + '<div><b>' + esc(c) + '</b><span class="muted">' + (m.resp ? esc(m.resp) : 'Sin responsable') + '</span></div>' + mesPill(m.estado) + '</div>' +
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
      '<h1 class="rm-tit">' + (prev ? '<button class="btn ghost sm" data-act="rmAbrir" data-id="' + esc(prev._id) + '" aria-label="Mes anterior">←</button>' : '') + 'Redes · ' + esc(cap(monthLabel(m.mes))) + (next ? '<button class="btn ghost sm" data-act="rmAbrir" data-id="' + esc(next._id) + '" aria-label="Mes siguiente">→</button>' : '') + '</h1></div>' +
      '<div class="toolbar pf-acc">' + (can ? carpetaBtn(m) + (next ? '' : '<button class="btn" data-act="rmSiguiente" data-id="' + esc(m._id) + '">Arrancar ' + esc(monthLabel(addMonth(m.mes, 1)).split(' ')[0]) + '</button>') + enviarBtn(m, lista) : '') + '</div></div>' +
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
    const fs = formatos(), sel = st.sel;
    const ordenadas = [...ps].sort((a, b) => (a.fecha || '9999').localeCompare(b.fecha || '9999') || (a.hora || '').localeCompare(b.hora || '') || a.orden - b.orden);
    const bulk = sel.size ? '<div class="bulkbar rm-bulk"><b>' + sel.size + ' seleccionada' + (sel.size > 1 ? 's' : '') + '</b><select class="in sm" id="rm-bk-est" aria-label="Cambiar estado">' + opt('', 'Cambiar estado…', '') + ESTADOS_PIEZA.map(e => opt(e, e, '')).join('') + '</select>' +
      '<select class="in sm" id="rm-bk-resp" aria-label="Asignar">' + opt('', 'Asignar a…', '') + opt('__nadie', 'Sin responsable', '') + personas().map(a => opt(a, a, '')).join('') + '</select>' +
      '<button class="btn sm" data-act="rmCopys"><span class="pig" aria-hidden="true">' + ISO + '</span> Escribir copys</button><button class="btn sm danger" data-act="rmBorrar">Borrar</button><button class="btn ghost sm" data-act="rmSelNada">Listo</button></div>' : '';
    const tools = can ? '<div class="toolbar rm-tools"><form class="rm-add" data-rmadd="' + esc(m._id) + '"><span>+</span><input class="in sm" type="number" min="1" max="60" name="n" value="1" aria-label="Cantidad"><select class="in sm" name="f" aria-label="Formato">' + fs.map(f => opt(f, f, '')).join('') + '</select><button class="btn sm">Agregar</button></form>' +
      '<button class="btn sm" data-act="rmIdeas" data-id="' + esc(m._id) + '"><span class="pig" aria-hidden="true">' + ISO + '</span> Proponer contenido</button>' +
      '<button class="btn sm" data-act="rmChat" data-id="' + esc(m._id) + '">Pegar chat del cliente</button></div>' : '';
    if (!ps.length) return tools + '<section class="sheet">' + emptyBox('Todavía no hay piezas este mes', can ? 'Sumalas con “+ Agregar” (de a muchas), o pedile a Mr. Piggy que proponga el contenido según el plan.' : '') + '</section>';
    const fila = z => {
      const id = esc(z._id), d = can ? '' : ' disabled';
      return '<tr class="' + (sel.has(z._id) ? 'sel ' : '') + (z.estado === 'Cambios' ? 'cambios' : '') + '">' +
        (can ? '<td class="sel"><input type="checkbox" data-rmsel="' + id + '"' + (sel.has(z._id) ? ' checked' : '') + ' aria-label="Seleccionar"></td>' : '') +
        '<td class="rm-art">' + arteMini(z) + '</td>' +
        '<td><input class="in sm rm-fe" type="date" value="' + esc(z.fecha) + '" data-pz="fecha" data-id="' + id + '"' + d + ' aria-label="Fecha"><input class="in sm rm-ho" type="time" value="' + esc(z.hora) + '" data-pz="hora" data-id="' + id + '"' + d + ' aria-label="Hora"></td>' +
        '<td><select class="in sm" data-pz="formato" data-id="' + id + '"' + d + ' aria-label="Formato">' + [...new Set([...fs, z.formato].filter(Boolean))].map(f => opt(f, f, z.formato)).join('') + '</select>' + (z.extra ? '<span class="rm-extra" title="Fuera del plan">extra</span>' : '') + (z.fijo ? '<span class="rm-fijo" title="Se repite cada ' + esc(z.fijo) + '">↻ ' + esc(z.fijo) + '</span>' : '') + '</td>' +
        '<td class="rm-tema"><input class="in sm" value="' + esc(z.tema) + '" placeholder="Tema" data-pz="tema" data-id="' + id + '"' + d + ' aria-label="Tema"><button class="rm-copy" data-act="rmPieza" data-id="' + id + '">' + (z.copy ? esc(z.copy.slice(0, 90)) + (z.copy.length > 90 ? '…' : '') : '<span class="muted">+ copy</span>') + '</button>' + (z.respuesta && z.estado === 'Cambios' ? '<span class="rm-resp-cli">“' + esc(z.respuesta.slice(0, 120)) + '”</span>' : '') + '</td>' +
        '<td><select class="cellsel st" style="--c:var(' + (PZ_COLOR[z.estado] || '--muted') + ')" data-pz="estado" data-id="' + id + '"' + d + ' aria-label="Estado">' + ESTADOS_PIEZA.map(e => opt(e, e, z.estado)).join('') + '</select></td>' +
        '<td><select class="in sm" data-pz="resp" data-id="' + id + '"' + d + ' aria-label="Responsable">' + opt('', '—', z.resp) + [...new Set([...personas(), z.resp].filter(Boolean))].map(a => opt(a, a, z.resp)).join('') + '</select></td>' +
        '<td><button class="btn ghost sm" data-act="rmPieza" data-id="' + id + '" aria-label="Abrir pieza">⋯</button></td></tr>';
    };
    pedirThumbs(ps);
    return tools + bulk + '<section class="sheet"><div class="tbl rm-tbl"><table><thead><tr>' + (can ? '<th class="sel"><input type="checkbox" data-rmselall="' + esc(m._id) + '" aria-label="Seleccionar todas"></th>' : '') + '<th>Arte</th><th>Fecha y hora</th><th>Formato</th><th>Tema y copy</th><th>Estado</th><th>Quién</th><th></th></tr></thead><tbody>' + ordenadas.map(fila).join('') + '</tbody></table></div></section>';
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
      cells += '<div class="rm-cd' + (f === today() ? ' hoy' : '') + '"><span class="rm-cdn">' + d + '</span>' + del.map(z => '<button class="rm-cp" style="--c:var(' + (PZ_COLOR[z.estado] || '--muted') + ')" data-act="rmPieza" data-id="' + esc(z._id) + '"><b>' + esc((z.hora ? z.hora + ' · ' : '') + z.formato) + '</b><span>' + esc(z.tema || 'Sin tema') + '</span></button>').join('') + '</div>';
    }
    const sin = ps.filter(z => !z.fecha);
    return '<section class="sheet"><div class="sheet-b"><div class="rm-cal"><div class="rm-dow">' + ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(x => '<span>' + x + '</span>').join('') + '</div><div class="rm-grid">' + cells + '</div></div>' +
      (sin.length ? '<p class="muted" style="margin:12px 0 6px">Sin fecha (' + sin.length + ')</p><div class="rm-sinf">' + sin.map(z => '<button class="rm-cp" style="--c:var(' + (PZ_COLOR[z.estado] || '--muted') + ')" data-act="rmPieza" data-id="' + esc(z._id) + '"><b>' + esc(z.formato) + '</b><span>' + esc(z.tema || 'Sin tema') + '</span></button>').join('') + '</div>' : '') + '</div></section>';
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
      '<div class="field"><label for="pz-resp">Responsable</label><select id="pz-resp"' + d + '>' + opt('', 'Sin asignar', z.resp) + [...new Set([...personas(), z.resp].filter(Boolean))].map(a => opt(a, a, z.resp)).join('') + '</select></div>' +
      '<div class="field full"><label for="pz-tema">Tema</label><input id="pz-tema" value="' + esc(z.tema) + '"' + d + '></div>' +
      '<div class="field full"><label for="pz-copy">Copy</label><textarea id="pz-copy" rows="6"' + d + '>' + esc(z.copy) + '</textarea>' + (can ? '<div class="toolbar" style="margin-top:6px"><span class="muted" style="font-size:13px">Mr. Piggy:</span><button type="button" class="btn ghost sm" data-act="rmCopyUno">' + (z.copy ? 'Mejorar' : 'Escribir') + ' el copy</button></div>' : '') + '</div>' +
      '<div class="field full"><label for="pz-hashtags">Hashtags</label><input id="pz-hashtags" value="' + esc(z.hashtags) + '"' + d + '></div>' +
      '<div class="field"><label for="pz-fijo">Se repite cada</label><select id="pz-fijo"' + d + '>' + opt('', 'No se repite', z.fijo) + DIAS.map(x => opt(x, x, z.fijo)).join('') + '</select><span class="hint">Al arrancar el mes siguiente se crea sola en ese día.</span></div>' +

      '<label class="chk full"><input type="checkbox" id="pz-extra"' + (z.extra ? ' checked' : '') + d + '> Extra (fuera del plan)</label>' +
      '<div class="field full"><span class="lbl">Arte</span><div class="pz-artes">' + (artes || '<span class="muted">Sin arte todavía.</span>') + '</div>' + (can ? '<label class="btn sm" style="margin-top:8px;justify-self:start">Subir arte a Dropbox<input type="file" hidden data-rmup="' + esc(z._id) + '" multiple accept="image/*,video/*,application/pdf"></label>' : '') + '</div>' +
      '<div class="full">' + hil().html('pieza', z._id, { cliente: m.cliente, titulo: 'Comentarios', compacto: true, publico: true }) + '</div>' +
      '</div><div class="panel-f"><span>' + (can ? '<button type="button" class="btn ghost danger" data-act="rmPiezaBorrar">Borrar</button>' : '') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">' + (can ? 'Cancelar' : 'Cerrar') + '</button>' + (can ? '<button type="submit" class="btn primary">Guardar</button>' : '') + '</span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false;
  }
  async function guardarPieza() {
    const f = st.fpz; if (!f) return;
    const g = k => ($('#pz-' + k) || {}).value;
    const u = { fecha: g('fecha') || '', hora: g('hora') || '', formato: g('formato'), red: g('red'), estado: g('estado'), resp: g('resp') || '', tema: (g('tema') || '').trim(), copy: (g('copy') || '').trim(), hashtags: (g('hashtags') || '').trim(), fijo: g('fijo') || '', extra: $('#pz-extra').checked };
    try { await data.piezasUpd([f.id], u); local(f.mesId, [f.id], u); ctx.closeForm(); toast('Pieza guardada'); render(); }
    catch (e) { toast(e.message); }
  }
  function local(mesId, ids, u) { const ps = piezas(mesId) || []; ps.forEach(z => { if (ids.includes(z._id)) Object.assign(z, u); }); }

  /* ---------- Acciones ---------- */
  async function arrancar(cliente, mes, base) {
    const ab = abonoRedes(cliente);
    const plan = base ? { ...(base.plan || {}) } : planDeAbono(ab);
    const m = await data.mesCrear({ cliente, mes, abonoId: ab ? ab._id : null, plan, resp: base ? base.resp : ((ab && (ab.responsables || [])[0]) || ''), estado: 'Planificación' });
    S.RM = [...meses(), m];
    // Las piezas fijas (las que se repiten un día de la semana) se crean solas.
    let nuevas = [];
    if (base) {
      const bp = piezas(base._id) || (await data.piezasDe([base._id]));
      const fijas = bp.filter(z => z.fijo);
      const vistas = new Set();
      fijas.forEach(z => { const k = z.fijo + '|' + z.formato + '|' + norm(z.tema); if (vistas.has(k)) return; vistas.add(k);
        const dow = DIAS.indexOf(z.fijo); for (let d = 1; d <= diasMes(mes); d++) { const f = fechaMes(mes, d); if (new Date(f + 'T12:00').getDay() === dow) nuevas.push({ formato: z.formato, red: z.red, tema: z.tema, hashtags: z.hashtags, hora: z.hora, fecha: f, fijo: z.fijo, resp: z.resp, estado: 'Idea' }); } });
    }
    const ins = nuevas.length ? await data.piezasIns(m, nuevas) : [];
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
  async function ideas(btn, m) {
    const ps = piezas(m._id) || [], plan = m.plan || {}, cnt = conteoPorFormato(ps);
    const faltan = Object.fromEntries(Object.entries(plan).map(([f, n]) => [f, Math.max(0, (+n || 0) - (cnt[f] || 0))]).filter(([, n]) => n > 0));
    if (!Object.keys(faltan).length && !window.confirm('El plan del mes ya está completo. ¿Querés que Mr. Piggy proponga ideas extra igual?')) return;
    btn.disabled = true; const t0 = btn.innerHTML; btn.innerHTML = '<span class="ia-dots"><i></i><i></i><i></i></span> Mr. Piggy está pensando el mes…';
    try {
      const prev = mesCliente(m.cliente, addMonth(m.mes, -1)), pp = prev ? (piezas(prev._id) || []) : [];
      const cli = S.C.find(x => x.nombre === m.cliente) || {};
      const r = await data.ia({ modo: 'redes_ideas', texto: Object.keys(faltan).length ? 'Proponé estas piezas que faltan: ' + Object.entries(faltan).map(([f, n]) => n + ' ' + f).join(', ') + '.' : 'Proponé 3 ideas extra.',
        contexto: { cliente: m.cliente, notas_cliente: cli.notas || '', servicios: ctx.servicios ? ctx.servicios(m.cliente) : '', mes: m.mes, formatos: formatos(), plan, notas_del_mes: m.notas, ya_cargadas: ps.map(z => ({ fecha: z.fecha, formato: z.formato, tema: z.tema })), mes_anterior: pp.slice(0, 60).map(z => ({ formato: z.formato, tema: z.tema })) } });
      const nuevas = (Array.isArray(r.piezas) ? r.piezas : []).filter(x => x && x.tema).map(x => ({ formato: formatos().includes(x.formato) ? x.formato : (formatos().find(f => norm(f).startsWith(norm(x.formato).slice(0, 4))) || formatos()[0]), tema: String(x.tema).slice(0, 200), copy: x.copy || '', hashtags: x.hashtags || '',
        fecha: /^\d{4}-\d{2}-\d{2}$/.test(x.fecha || '') && String(x.fecha).startsWith(m.mes) ? x.fecha : '', estado: 'Idea', extra: !Object.keys(faltan).length }));
      if (!nuevas.length) { toast('Mr. Piggy no propuso nada. Probá de nuevo.'); }
      else { const ins = await data.piezasIns(m, nuevas); P.set(m._id, [...ps, ...ins]); toast('Mr. Piggy propuso ' + ins.length + ' piezas. Quedaron como “Idea”: revisalas.'); }
    } catch (e) { toast(e.message); }
    btn.disabled = false; btn.innerHTML = t0; render();
  }
  async function copys(ids, m, btn) {
    const ps = (piezas(m._id) || []).filter(z => ids.includes(z._id));
    if (!ps.length) return;
    if (btn) { btn.disabled = true; btn.textContent = 'Escribiendo…'; }
    try {
      const cli = S.C.find(x => x.nombre === m.cliente) || {};
      const r = await data.ia({ modo: 'redes_copys', texto: JSON.stringify(ps.map(z => ({ id: z._id, formato: z.formato, fecha: z.fecha, tema: z.tema, copy_actual: z.copy }))), contexto: { cliente: m.cliente, notas_cliente: cli.notas || '', notas_del_mes: m.notas } });
      let n = 0;
      for (const x of Array.isArray(r.piezas) ? r.piezas : []) { const z = ps.find(y => y._id === x.id); if (!z || !x.copy) continue; const u = { copy: x.copy, ...(x.hashtags ? { hashtags: x.hashtags } : {}) }; await data.piezasUpd([z._id], u); Object.assign(z, u); n++; }
      toast(n ? 'Mr. Piggy escribió ' + n + ' copys. Revisalos.' : 'No se pudo escribir los copys.');
    } catch (e) { toast(e.message); }
    if (btn) { btn.disabled = false; btn.textContent = 'Escribir copys'; }
    render();
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
      const r = await data.ia({ modo: 'redes_chat', texto: t, contexto: { formatos: formatos(), piezas: ps.map(z => ({ id: z._id, fecha: z.fecha, formato: z.formato, tema: z.tema, estado: z.estado })) } });
      let ap = 0, ca = 0, nu = 0;
      for (const c of Array.isArray(r.cambios) ? r.cambios : []) {
        const z = ps.find(x => x._id === c.id); if (!z) continue;
        if (c.accion === 'aprobada') { await data.piezasUpd([z._id], { estado: 'Aprobada', respuesta: c.detalle || '' }); Object.assign(z, { estado: 'Aprobada', respuesta: c.detalle || '' }); ap++; }
        else if (c.accion === 'cambios') { await data.piezasUpd([z._id], { estado: 'Cambios', respuesta: c.detalle || '' }); Object.assign(z, { estado: 'Cambios', respuesta: c.detalle || '' }); ca++; }
        if (c.detalle) await data.comentar({ entidad: 'pieza', id: z._id, clienteId: m.cliente, texto: (c.accion === 'aprobada' ? '✓ Aprobada (por WhatsApp): ' : c.accion === 'cambios' ? 'Cambios pedidos (por WhatsApp): ' : 'Nota del cliente: ') + c.detalle, interno: true }).catch(() => {});
      }
      const nuevas = (Array.isArray(r.nuevas) ? r.nuevas : []).filter(x => x && x.tema).map(x => ({ formato: formatos().includes(x.formato) ? x.formato : formatos()[0], tema: x.tema, copy: x.copy || '', fecha: /^\d{4}-\d{2}-\d{2}$/.test(x.fecha || '') ? x.fecha : '', extra: true, estado: 'Idea' }));
      if (nuevas.length) { const ins = await data.piezasIns(m, nuevas); P.set(m._id, [...ps, ...ins]); nu = ins.length; }
      ctx.closeForm(); toast([ap ? ap + ' aprobadas' : '', ca ? ca + ' con cambios' : '', nu ? nu + ' nuevas (extra)' : ''].filter(Boolean).join(' · ') || 'No encontré cambios en ese chat'); render();
    } catch (e) { toast(e.message); b.disabled = false; b.textContent = 'Repartir en las piezas'; }
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
      const ps = piezas(m._id) || [], ya = ps.filter(z => z.formato === fo).length, pl = +(m.plan || {})[fo] || 0;
      const nuevas = Array.from({ length: n }, (_, i) => ({ formato: fo, estado: 'Idea', extra: pl > 0 && ya + i >= pl, red: 'Instagram' }));
      try { const ins = await data.piezasIns(m, nuevas); P.set(m._id, [...ps, ...ins]); toast(n === 1 ? 'Pieza agregada' : n + ' piezas agregadas'); render(); } catch (er) { toast(er.message); }
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
    if (t.dataset && t.dataset.rmselall) { (piezas(t.dataset.rmselall) || []).forEach(z => t.checked ? st.sel.add(z._id) : st.sel.delete(z._id)); render(); return; }
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
    rmArrancar: async t => { t.disabled = true; try { const m = await arrancar(t.dataset.c, st.mes, mesCliente(t.dataset.c, addMonth(st.mes, -1))); toast('Mes arrancado para ' + t.dataset.c); ctx.irMes(m._id); } catch (e) { toast(e.message); t.disabled = false; } },
    rmArrancarTodos: async t => { t.disabled = true; let n = 0; for (const c of clientesMes(st.mes).filter(c => !mesCliente(c, st.mes))) { try { await arrancar(c, st.mes, mesCliente(c, addMonth(st.mes, -1))); n++; } catch (e) { toast(c + ': ' + e.message); } } toast(n + ' meses arrancados'); render(); },
    rmSiguiente: async t => { const m = mesDe(t.dataset.id); if (!m) return; t.disabled = true; try { const nm = await arrancar(m.cliente, addMonth(m.mes, 1), m); toast(cap(monthLabel(nm.mes)) + ' arrancado con el plan y las piezas fijas'); ctx.irMes(nm._id); } catch (e) { toast(e.message); t.disabled = false; } },
    rmCarpeta: async t => { const m = mesDe(t.dataset.id); if (!m) return; t.disabled = true; t.textContent = 'Creando…'; try { const r = await data.dropbox({ accion: 'carpeta_mes', mes_id: m._id }); m.carpeta = r.carpeta; m.carpetaUrl = r.carpeta_url; toast('Carpetas creadas en Dropbox'); render(); } catch (e) { toast(e.message); t.disabled = false; t.textContent = 'Crear carpetas en Dropbox'; } },
    rmContar: t => { const m = mesDe(t.dataset.id); if (m) contar(m); },
    rmEnviar: async t => {
      const m = mesDe(t.dataset.id); if (!m) return; const ps = piezas(m._id) || [];
      const ids = ps.filter(z => z.estado === 'Revisión interna').map(z => z._id);
      if (!ids.length && !ps.some(z => z.estado === 'Para el cliente')) { toast('No hay piezas en “Revisión interna” para mandar. Pasalas a ese estado cuando estén listas.'); return; }
      if (!window.confirm((ids.length ? ids.length + ' piezas pasan a “Para el cliente” y ' : '') + 'el mes se publica en el portal de ' + m.cliente + '. ¿Seguimos?')) return;
      try {
        if (ids.length) { await data.piezasUpd(ids, { estado: 'Para el cliente' }); local(m._id, ids, { estado: 'Para el cliente' }); }
        const u = { visible: true, estado: 'Con el cliente', enviadoAt: new Date().toISOString() }; await data.mesUpd(m._id, u); Object.assign(m, u);
        toast('Listo: ' + m.cliente + ' ya lo ve en el portal'); render();
        if (ctx.avisarCliente) ctx.avisarCliente(m.cliente, 'redes', m);
      } catch (e) { toast(e.message); }
    },
    rmPlan: t => { const m = mesDe(t.dataset.id); if (m) abrirPlan(m); },
    rmIdeas: t => { const m = mesDe(t.dataset.id); if (m) ideas(t, m); },
    rmChat: t => { const m = mesDe(t.dataset.id); if (m) abrirChat(m); },
    rmCopys: t => { const ids = [...st.sel]; const m = meses().find(x => (piezas(x._id) || []).some(z => ids.includes(z._id))); if (m) copys(ids, m, t); },
    rmCopyUno: async t => { const f = st.fpz; if (!f) return; const m = mesDe(f.mesId); const z = (piezas(f.mesId) || []).find(x => x._id === f.id); if (!m || !z) return; z.tema = ($('#pz-tema').value || '').trim() || z.tema; await copys([z._id], m, t); const zz = piezas(f.mesId).find(x => x._id === f.id); if ($('#pz-copy') && zz) { $('#pz-copy').value = zz.copy; $('#pz-hashtags').value = zz.hashtags; } },
    rmBorrar: async () => { const ids = [...st.sel]; if (!ids.length || !window.confirm('¿Borrar ' + ids.length + ' pieza' + (ids.length > 1 ? 's' : '') + '?')) return; try { await data.piezasDel(ids); P.forEach((ps, k) => P.set(k, ps.filter(z => !ids.includes(z._id)))); st.sel.clear(); toast('Borradas'); render(); } catch (e) { toast(e.message); } },
    rmSelNada: () => { st.sel.clear(); render(); },
    rmPieza: t => abrirPieza(t.dataset.id),
    rmPiezaBorrar: async () => { const f = st.fpz; if (!f || !window.confirm('¿Borrar esta pieza?')) return; try { await data.piezasDel([f.id]); P.set(f.mesId, (piezas(f.mesId) || []).filter(z => z._id !== f.id)); ctx.closeForm(); toast('Pieza borrada'); render(); } catch (e) { toast(e.message); } },
    rmArteVer: async t => { const w = window.open('', '_blank'); try { const r = await data.dropbox({ accion: 'link', path: t.dataset.path }); if (r.link && w) w.location = r.link; else if (w) w.close(); } catch (e) { if (w) w.close(); toast(e.message); } },
    rmArteQuitar: async t => { const f = st.fpz; if (!f) return; const z = (piezas(f.mesId) || []).find(x => x._id === f.id); if (!z) return; const arte = z.arte.filter((_, i) => i !== +t.dataset.i); try { await data.piezasUpd([z._id], { arte }); z.arte = arte; abrirPieza(z._id); render(); toast('Quitado de la pieza (el archivo sigue en Dropbox)'); } catch (e) { toast(e.message); } },
  };
  // Cambio en vivo de piezas: se recargan solo las del mes afectado.
  function enVivo(ev) { const r = (ev && (ev.new && ev.new.mes_id ? ev.new : ev.old)) || {}; const id = r.mes_id || [...P.keys()].find(k => (P.get(k) || []).some(z => z._id === r.id)); if (id && P.has(id)) cargar([id], true); }
  return { vLista, vMes, acts, enVivo, abrirPieza, piezas, cargar, meses, mesCliente, clientesMes, ESTADOS_PIEZA, closePieza: () => { st.fpz = null; }, mesActual: () => st.mes };
}
