// Equipo (socias y empleados: sueldos y aumentos) y Proveedores (honorarios y trabajos puntuales), por separado.
// Sueldos y pagos: Sueldo u honorario con historial, extras fijos,
// aguinaldo, liquidación mensual y pago (que queda como egreso en Caja). Solo administradores.
import * as data from './data.js';
import { initAumentos } from './aumentos.js';

export const MES_CORTO = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const TIPOS = ['Empleado', 'Socio', 'Proveedor'];
const VINCULOS = ['Relación de dependencia', 'Monotributo', 'Informal', 'Exterior'];
const RUBROS = ['Ads', 'Programación', 'Fotografía', 'Audiovisual', 'Contenido', 'Diseño', 'Contable', 'Otro'];
const SUB_RUBRO = { Ads: 'Proveedor Ads', Audiovisual: 'Proveedor Audiovisual', Fotografía: 'Proveedor Audiovisual', Contenido: 'Proveedor contenido', Programación: 'Proveedor de Programacion', Contable: 'Servicios Contables' };

export function initEquipo(ctx, k) {
  const { S, esc, opt, optsFrom, pill, fmt, monthLabel, thisMonth, addMonth, today, cmp, norm, emptyBox, toast, $ } = ctx;
  const { AD, money, parseMonto, r2, add, multi, lock, cap, openPanel, MONEDAS } = k;
  AD.pg = { mes: thisMonth(), ver: 'liquidacion', inact: false };

  /* ---------- cálculos ---------- */
  const colab = id => AD.CO.find(c => c.id === id);
  const enMes = (desde, hasta, m) => (!desde || desde <= m) && (!hasta || hasta >= m);
  const activoEn = (c, m) => c.activo && enMes(c.ingreso ? c.ingreso.slice(0, 7) : '', c.egreso ? c.egreso.slice(0, 7) : '', m);
  function remVig(cid, m) { // la vigente de cada concepto
    const out = {};
    AD.RM.filter(r => r.colaborador_id === cid && r.desde <= m).forEach(r => { if (!out[r.concepto] || r.desde > out[r.concepto].desde) out[r.concepto] = r; });
    return Object.values(out);
  }
  const extrasVig = (cid, m) => AD.CF.filter(x => x.colaborador_id === cid && enMes(x.desde, x.hasta, m));
  const histRem = cid => AD.RM.filter(r => r.colaborador_id === cid).sort((a, b) => b.desde.localeCompare(a.desde) || cmp(a.concepto, b.concepto));
  const semestre = m => { const [y, mo] = m.split('-').map(Number); return mo <= 6 ? { n: 1, y, ini: y + '-01-01', fin: y + '-06-30', meses: [1, 2, 3, 4, 5, 6] } : { n: 2, y, ini: y + '-07-01', fin: y + '-12-31', meses: [7, 8, 9, 10, 11, 12] }; };
  function aguinaldo(c, m) { // SAC: 50% de la mejor remuneración mensual del semestre, proporcional a los días trabajados
    if (!c.aguinaldo || !/-(06|12)$/.test(m)) return null;
    const s = semestre(m);
    let best = 0, moneda = 'ARS';
    s.meses.forEach(mo => { const mm = s.y + '-' + String(mo).padStart(2, '0'); const r = remVig(c.id, mm).find(x => x.concepto === 'Sueldo'); if (r && r.monto > best) { best = r.monto; moneda = r.moneda; } });
    if (!best) return null;
    const ini = c.ingreso && c.ingreso > s.ini ? c.ingreso : s.ini, fin = c.egreso && c.egreso < s.fin ? c.egreso : s.fin;
    const dias = d => new Date(d + 'T12:00:00Z').getTime() / 864e5;
    const trab = Math.max(0, Math.round(dias(fin) - dias(ini)) + 1), tot = Math.round(dias(s.fin) - dias(s.ini)) + 1;
    return { monto: r2(best / 2 * Math.min(1, trab / tot)), moneda, concepto: 'Aguinaldo ' + (s.n === 1 ? '1er' : '2do') + ' semestre ' + s.y, prop: trab < tot ? trab + ' de ' + tot + ' días' : '' };
  }
  function propuesta(m) {
    const out = [];
    AD.CO.filter(c => activoEn(c, m)).forEach(c => {
      remVig(c.id, m).forEach(r => out.push({ colaborador_id: c.id, tipo: r.concepto, concepto: r.concepto, monto: r.monto, moneda: r.moneda }));
      extrasVig(c.id, m).forEach(x => out.push({ colaborador_id: c.id, tipo: 'Extra', concepto: x.concepto, monto: x.monto, moneda: x.moneda }));
      const ag = aguinaldo(c, m); if (ag) out.push({ colaborador_id: c.id, tipo: 'Aguinaldo', concepto: ag.concepto, monto: ag.monto, moneda: ag.moneda });
    });
    return out;
  }
  const liqMes = m => AD.LQ.filter(l => l.periodo === m);
  const faltantes = m => { const ya = liqMes(m); return propuesta(m).filter(p => !ya.some(l => l.colaborador_id === p.colaborador_id && l.concepto === p.concepto)); };
  const movDe = id => AD.MV.find(v => v.id === id);
  const pagosDe = (cid, anio) => AD.MV.filter(v => v.colaborador_id === cid && v.egreso > 0 && (!anio || (v.fecha || '').startsWith(anio))).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  const mesCorto = m => MES_CORTO[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
  function cuentaPago(c, items) {
    if (items.every(i => i.tipo === 'Aguinaldo')) return ['Costo Laboral', 'Aguinaldo'];
    if (c.tipo === 'Socio') return ['Costo Laboral', 'Sueldos Socias'];
    if (c.tipo === 'Empleado' && items.some(i => i.tipo === 'Sueldo' || i.tipo === 'Extra')) return ['Costo Laboral', 'Sueldos Empleados'];
    return ['Proveedores', SUB_RUBRO[c.rubro] || 'Proveedor contenido'];
  }
  function detallePago(items, m) {
    if (!items.length) return '';
    const ag = items.filter(i => i.tipo === 'Aguinaldo');
    if (ag.length === items.length) return ag.map(i => i.concepto).join(' + ');
    const [p, ...rest] = items.filter(i => i.tipo !== 'Aguinaldo');
    return (['Sueldo', 'Honorario'].includes(p.tipo) ? p.concepto + ' ' + mesCorto(m) : p.concepto + ' ' + mesCorto(m)) + rest.map(i => ' + ' + i.concepto).join('');
  }
  const lineaRem = (c, m = AD.pg.mes) => { const rs = remVig(c.id, m), ex = extrasVig(c.id, m); return { rs, ex, acc: [...rs, ...ex].reduce((acc, x) => add(acc, x.moneda, x.monto), {}) }; };

  /* ---------- quién es quién ---------- */
  // Equipo = socias y empleados (cobran sueldo). Proveedores = freelancers y empresas (cobran por trabajo u honorario).
  // Comparten la tabla de colaboradores; quien entra a la app además tiene su usuario (personas), unido por persona_id.
  const esProv = c => c.tipo === 'Proveedor';
  const ROLES = { admin: 'Administrador', equipo: 'Equipo', externo: 'Externo' };
  const ROL_COLOR = { admin: '--s-confirmar', equipo: '--s-curso', externo: '--s-revision' };
  const persona = id => (id ? S.E.find(e => e._id === id) : null) || null;
  const colabDePersona = pid => AD.CO.find(c => c.persona_id === pid);
  function integrantes(prov) {
    const out = AD.CO.filter(c => esProv(c) === prov).map(c => ({ c, p: persona(c.persona_id) }));
    S.E.filter(p => !colabDePersona(p._id) && (prov ? p.rol === 'externo' : p.rol !== 'externo')).forEach(p => out.push({ c: null, p }));
    return out;
  }
  const activoI = x => x.c ? !!x.c.activo : x.p.activo !== false;
  const nombreI = x => x.c ? x.c.nombre : (x.p.nombre || x.p.persona);
  const deGrupo = prov => l => { const c = colab(l.colaborador_id); return !!c && esProv(c) === prov; };
  const pl = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
  const pctTxt = n => (n > 0 ? '+' : '') + String(n).replace('.', ',') + '%';
  const pctDe = (a, b) => a && b && a.moneda === b.moneda && b.monto ? Math.round((a.monto / b.monto - 1) * 1000) / 10 : null;
  const remAnterior = r => AD.RM.filter(x => x.colaborador_id === r.colaborador_id && x.concepto === r.concepto && x.desde < r.desde).sort((a, b) => b.desde.localeCompare(a.desde))[0] || null;
  const abiertoP = p => !['Entregado', 'Cancelado'].includes(p.estado);
  const mesNav = () => '<div class="cal-h"><h2 style="min-width:170px">' + esc(cap(monthLabel(AD.pg.mes))) + '</h2><button class="btn sm" data-act="pgMes" data-d="-1" aria-label="Mes anterior">←</button><button class="btn sm" data-act="pgMes" data-d="0">Este mes</button><button class="btn sm" data-act="pgMes" data-d="1" aria-label="Mes siguiente">→</button></div>';
  const stc = (cls, big, lab, sub) => '<div class="stc ' + cls + '"><span class="stc-l">' + lab + '</span><b>' + esc(big) + '</b><small>' + sub + '</small></div>';
  const verInact = () => '<label class="chk"><input type="checkbox" data-pgk="inact"' + (AD.pg.inact ? ' checked' : '') + '> Ver inactivos</label>';
  // Mes de referencia: hoy, o el primer mes con sueldo si todavía no arrancó (ej. cargado desde noviembre).
  const mesRef = c => { const m = thisMonth(); if (remVig(c.id, m).length) return m; const fut = AD.RM.filter(r => r.colaborador_id === c.id && r.desde > m).map(r => r.desde).sort()[0]; return fut || m; };
  const costoMensual = cs => cs.reduce((acc, c) => { const { rs, ex } = lineaRem(c, mesRef(c)); [...rs, ...ex].forEach(x => add(acc, x.moneda, x.monto)); return acc; }, {});
  const AU = initAumentos(ctx, k, { colab, esProv, pctTxt });
  // Ir a una pantalla desde un panel (el botón "go" de la app)
  const irA = (view, tab) => { const b = document.createElement('button'); b.dataset.act = 'go'; b.dataset.view = view; if (tab) b.dataset.tab = tab; b.hidden = true; document.body.appendChild(b); b.click(); b.remove(); };

  /* ---------- Equipo › Personas ---------- */
  function vPersonas() {
    const todos = integrantes(false), act = todos.filter(activoI);
    const list = todos.filter(x => AD.pg.inact || activoI(x)).sort((a, b) => (activoI(b) - activoI(a)) || ((a.c ? (a.c.tipo === 'Socio' ? 0 : 1) : 2) - (b.c ? (b.c.tipo === 'Socio' ? 0 : 1) : 2)) || cmp(nombreI(a), nombreI(b)));
    const sinSueldo = act.filter(x => !x.c || !remVig(x.c.id, mesRef(x.c)).length);
    let h = '<div class="head"><div><h1>Equipo</h1><p>Socias y empleados: datos, sueldo y acceso a la app, todo en la ficha de cada persona. Los proveedores están en Finanzas › Proveedores.</p></div><div class="toolbar">' + verInact() + '<button class="btn primary" data-act="pgColab" data-g="eq">+ Persona</button></div></div>';
    h += '<section class="stc3" aria-label="Resumen del equipo">' +
      stc('azul', String(act.length), 'Personas en el equipo', esc([pl(act.filter(x => x.c && x.c.tipo === 'Socio').length, 'socio', 'socios'), pl(act.filter(x => x.c && x.c.tipo !== 'Socio').length, 'empleado', 'empleados'), act.filter(x => !x.c).length ? act.filter(x => !x.c).length + ' sin completar' : ''].filter(Boolean).join(' · '))) +
      stc('', multi(costoMensual(act.filter(x => x.c).map(x => x.c))), 'Costo mensual', 'sueldos y extras vigentes · <button class="btn link" data-act="go" data-view="aumentos">aumentos</button>') +
      stc('tinta', String(sinSueldo.length), 'Sin sueldo cargado', sinSueldo.length ? esc(sinSueldo.map(x => x.p ? x.p.persona : nombreI(x)).join(', ')) : 'todos con sueldo') + '</section>';
    const rows = list.map(x => {
      const { c, p } = x, alias = p ? p.persona : '';
      const mr = c ? mesRef(c) : thisMonth(), lr = c ? lineaRem(c, mr) : { rs: [], ex: [], acc: {} }, rs = lr.rs;
      const ab = alias ? S.A.filter(a => a.estado === 'Activo' && (a.responsables || []).includes(alias)).length : 0, pr = alias ? S.P.filter(q => abiertoP(q) && (q.responsables || []).includes(alias)).length : 0;
      const attr = c ? 'data-id="' + esc(c.id) + '"' : 'data-pid="' + esc(p._id) + '"';
      return '<tr class="click" data-act="pgColab" ' + attr + ' data-g="eq"' + (activoI(x) ? '' : ' style="opacity:.55"') + '>' +
        '<td><span class="who1">' + (p && ctx.avEditable ? ctx.avEditable('persona', p._id, alias, p.avatar, '', false) : ctx.av ? ctx.av(alias || nombreI(x), p ? p.avatar : '') : '') + '<b>' + esc(alias || nombreI(x)) + '</b></span><span class="sub">' + esc([nombreI(x) !== alias ? nombreI(x) : '', p && p.puesto].filter(Boolean).join(' · ')) + '</span></td>' +
        '<td>' + (c ? esc(c.tipo) + '<span class="sub">' + esc([c.vinculo, c.ingreso ? 'desde ' + fmt(c.ingreso.slice(0, 7)) : ''].filter(Boolean).join(' · ')) + '</span>' : '<span class="muted">sin completar</span>') + '</td>' +
        '<td class="r"' + (lr.ex.length ? ' title="' + esc([...rs, ...lr.ex].map(x => x.concepto + ': ' + money(x.monto, x.moneda)).join(' · ')) + '"' : '') + '>' + (rs.length ? '<span class="money">' + esc(multi(lr.acc)) + '</span><span class="sub">' + esc(rs.map(r => r.concepto + ' ' + money(r.monto, r.moneda)).join(' + ') + (lr.ex.length ? ' + ' + (lr.ex.length === 1 ? lr.ex[0].concepto.toLowerCase() : lr.ex.length + ' extras') : '') + (mr > thisMonth() ? ' · desde ' + fmt(mr) : '')) + '</span>' : '<span class="pill" style="--c:var(--s-revision)">Cargar sueldo</span>') + '</td>' +
        '<td>' + (p && p.email && p.activo !== false ? pill(ROLES[p.rol] || p.rol, ROL_COLOR[p.rol] || '--muted') + '<span class="sub">' + esc(p.email) + '</span>' : '<span class="muted">sin acceso</span>') + '</td>' +
        '<td class="r num">' + (ab || pr ? esc([ab ? ab + ' redes' : '', pr ? pr + ' proyectos' : ''].filter(Boolean).join(' · ')) : '<span class="muted">—</span>') + '</td></tr>';
    }).join('');
    return h + '<section class="sheet">' + (rows ? '<div class="tbl"><table><thead><tr><th>Persona</th><th>Relación</th><th class="r">Cobra por mes</th><th>Acceso a la app</th><th class="r">A cargo</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : emptyBox('Todavía no hay nadie en el equipo', 'Sumá a cada persona con “+ Persona”.')) + '</section>';
  }

  /* ---------- Equipo › Sueldos del mes ---------- */
  function vSueldos() {
    const m = AD.pg.mes, y = m.slice(0, 4), lq = liqMes(m).filter(deGrupo(false)), falt = faltantes(m).filter(deGrupo(false));
    const pend = {}, pag = {}; lq.forEach(l => add(l.movimiento_id ? pag : pend, l.moneda, l.monto));
    const laboral = {}; AD.MV.filter(v => (v.fecha || '').startsWith(y) && v.egreso > 0 && v.cuenta === 'Costo Laboral').forEach(v => add(laboral, v.moneda, v.egreso));
    let h = '<div class="head"><div><h1>Sueldos</h1><p>Lo que se le paga al equipo cada mes: sueldo, extras y aguinaldo. Al pagar, queda como gasto en Gastos e ingresos.</p></div><div class="toolbar">' + mesNav() + '</div></div>';
    h += '<section class="stc3" aria-label="Sueldos del mes">' +
      stc('azul', multi(pend), 'Falta pagar en ' + esc(monthLabel(m).split(' ')[0]), pl(lq.filter(l => !l.movimiento_id).length, 'pago pendiente', 'pagos pendientes')) +
      stc('', multi(pag), 'Pagado en el mes', pl(lq.filter(l => l.movimiento_id).length, 'pago', 'pagos')) +
      stc('tinta', multi(laboral), 'Sueldos ' + esc(y), 'equipo, socias y aguinaldos') + '</section>';
    return h + vLiquidacion(m, lq, falt, false);
  }

  /* ---------- Equipo › Aumentos ---------- */
  function vAumentos() {
    return '<div class="head"><div><h1>Aumentos</h1><p>Elegí a quiénes, definí el aumento y revisá antes de confirmar. Los que no tildes no cambian. Cada tanda queda como un lote con su historial.</p></div></div>' + AU.vista('sueldos');
  }

  /* ---------- Finanzas › Proveedores ---------- */
  function vProveedores() {
    const t = ['lista', 'aumentos'].includes(S.tab.proveedores) ? S.tab.proveedores : 'pagos', m = AD.pg.mes, y = m.slice(0, 4);
    const lq = liqMes(m).filter(deGrupo(true)), falt = faltantes(m).filter(deGrupo(true));
    const pend = {}, pag = {}; lq.forEach(l => add(l.movimiento_id ? pag : pend, l.moneda, l.monto));
    const anio = {}; AD.MV.filter(v => (v.fecha || '').startsWith(y) && v.egreso > 0 && v.cuenta === 'Proveedores').forEach(v => add(anio, v.moneda, v.egreso));
    let h = '<div class="head"><div><h1>Proveedores</h1><p>Freelancers y empresas que trabajan para àndale: trabajos puntuales, honorarios fijos y cuánto se les pagó. El equipo y sus sueldos están en Equipo.</p></div><div class="toolbar">' + (t === 'pagos' ? mesNav() : t === 'lista' ? verInact() + '<button class="btn primary" data-act="pgColab" data-g="prov">+ Proveedor</button>' : '') + '</div></div>';
    h += ctx.subnav('proveedores', [['pagos', 'Pagos del mes', lq.filter(l => !l.movimiento_id).length || ''], ['lista', 'Proveedores'], ['aumentos', 'Aumentos']]);
    if (t === 'aumentos') return h + AU.vista('proveedores');
    h += '<section class="stc3" aria-label="Proveedores">' +
      stc('azul', multi(pend), 'Falta pagar en ' + esc(monthLabel(m).split(' ')[0]), pl(lq.filter(l => !l.movimiento_id).length, 'pago pendiente', 'pagos pendientes')) +
      stc('', multi(pag), 'Pagado en el mes', pl(lq.filter(l => l.movimiento_id).length, 'pago', 'pagos')) +
      stc('tinta', multi(anio), 'Proveedores ' + esc(y), 'según Gastos e ingresos') + '</section>';
    if (t === 'pagos') return h + saldosProv() + vLiquidacion(m, lq, falt, true);
    const list = integrantes(true).filter(x => AD.pg.inact || activoI(x)).sort((a, b) => (activoI(b) - activoI(a)) || cmp(nombreI(a), nombreI(b)));
    const rows = list.map(x => {
      const { c, p } = x, pagos = c ? pagosDe(c.id, y) : [], ult = pagos[0], tot = {}; pagos.forEach(v => add(tot, v.moneda, v.egreso));
      const rs = c ? remVig(c.id, thisMonth()) : [];
      const attr = c ? 'data-id="' + esc(c.id) + '"' : 'data-pid="' + esc(p._id) + '"';
      return '<tr class="click" data-act="pgColab" ' + attr + ' data-g="prov"' + (activoI(x) ? '' : ' style="opacity:.55"') + '><td class="name">' + esc(nombreI(x)) + '<span class="sub">' + esc([c && c.rubro, c && c.vinculo, c && ctcDe(c.id).map(z => z.nombre.split(' ')[0]).filter(Boolean).join(' y ')].filter(Boolean).join(' · ') || (c ? '' : 'sin completar')) + '</span></td>' +
        '<td class="r">' + (rs.length ? rs.map(r => '<span class="money">' + money(r.monto, r.moneda) + '</span><span class="sub">fijo por mes</span>').join('') : '<span class="muted">por trabajo</span>') + '</td>' +
        '<td class="r">' + (pagos.length ? '<span class="money">' + esc(multi(tot)) + '</span><span class="sub">' + pl(pagos.length, 'pago', 'pagos') + '</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (ult ? '<span class="mono">' + fmt(ult.fecha) + '</span><span class="sub">' + esc(money(ult.egreso, ult.moneda)) + ' · ' + esc((ult.detalle || '').slice(0, 40)) + '</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td class="r">' + (c && Object.keys(saldoDe(c.id)).length ? '<b class="money">' + esc(multi(saldoDe(c.id))) + '</b>' : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (p && p.email && p.activo !== false ? pill(ROLES[p.rol] || p.rol, ROL_COLOR[p.rol] || '--muted') : '<span class="muted">no entra</span>') + '</td></tr>';
    }).join('');
    return h + '<section class="sheet">' + (rows ? '<div class="tbl"><table><thead><tr><th>Proveedor</th><th class="r">Honorario</th><th class="r">Pagado en ' + esc(y) + '</th><th>Último pago</th><th class="r">Le debemos</th><th>App</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : emptyBox('Todavía no hay proveedores', 'Sumalos con “+ Proveedor”: rubro, CUIT y datos para transferirles.')) +
      '<div class="count">Para que un pago viejo de Gastos e ingresos cuente, el nombre tiene que coincidir con el del proveedor o con alguno de sus apodos.</div></section>';
  }

  // Trabajos por proyecto con saldo: lo acordado menos lo pagado a cuenta (se carga en la ficha del proyecto › Precio y cobro).
  function saldosProv() {
    const cs = k.cxpAbiertos ? k.cxpAbiertos() : []; if (!cs.length) return '';
    const tot = {}; cs.forEach(c => add(tot, c.moneda, c.saldo));
    return '<section class="sheet"><div class="sheet-h"><h2>Saldos con proveedores</h2><span class="muted">Lo acordado por proyecto que falta pagar · <b class="money">' + esc(multi(tot)) + '</b></span></div><div class="rows cxp">' +
      cs.map(c => '<div class="row" style="cursor:default"><span class="t"><b>' + esc(c.nombre) + ' · ' + esc(c.p.cliente) + ' · ' + esc(c.p.proyecto) + '</b><span>' + (c.concepto ? esc(c.concepto) + ' · ' : '') + 'acordado <span class="money">' + money(c.monto, c.moneda) + '</span> · pagado <span class="money">' + money(c.pagado, c.moneda) + '</span>' + (c.pagos.length ? ' (último ' + fmt(c.pagos[c.pagos.length - 1].fecha) + ')' : ' · sin pagos todavía') + '</span></span>' +
        pill('Debe ' + money(c.saldo, c.moneda), '--s-revision') + '<span class="toolbar"><button class="btn sm" data-act="aCxpPagar" data-id="' + esc(c.id) + '">Pago a cuenta</button></span></div>').join('') + '</div></section>';
  }
  const saldoDe = cid => { const acc = {}; (k.cxpAbiertos ? k.cxpAbiertos() : []).filter(c => c.colaborador_id === cid).forEach(c => add(acc, c.moneda, c.saldo)); return acc; };

  /* ---------- pagos del mes (equipo o proveedores) ---------- */
  function vLiquidacion(m, lq, falt, prov) {
    const g = prov ? 'prov' : 'eq';
    let h = '';
    if (falt.length) h += '<section class="callout"><p><b>' + falt.length + ' pagos por calcular</b> en ' + esc(monthLabel(m)) + ' según ' + (prov ? 'los honorarios fijos' : 'los sueldos y extras') + ' cargados' + (falt.some(f => f.tipo === 'Aguinaldo') ? ' (incluye aguinaldo)' : '') + ': ' + esc([...new Set(falt.map(f => (colab(f.colaborador_id) || {}).nombre))].join(', ')) + '.</p><button class="btn primary" data-act="pgGenerar" data-g="' + g + '">' + (lq.length ? 'Calcular los que faltan' : 'Calcular los pagos del mes') + '</button></section>';
    if (!prov) {
      const sinRem = AD.CO.filter(c => activoEn(c, m) && !esProv(c) && !remVig(c.id, m).length && !AD.RM.some(r => r.colaborador_id === c.id && r.desde > m));
      if (sinRem.length) h += '<section class="callout"><p>Sin sueldo cargado: <b>' + esc(sinRem.map(c => c.nombre).join(', ')) + '</b>. Cargalo en su ficha para que se calcule solo cada mes.</p><button class="btn" data-act="go" data-view="equipo">Ver equipo</button></section>';
    }
    const grupos = new Map(); lq.forEach(l => { if (!grupos.has(l.colaborador_id)) grupos.set(l.colaborador_id, []); grupos.get(l.colaborador_id).push(l); });
    const orden = [...grupos.keys()].map(colab).filter(Boolean).sort((a, b) => TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo) || cmp(a.nombre, b.nombre));
    const ORD = ['Sueldo', 'Honorario', 'Extra', 'Aguinaldo', 'Otro'];
    const cards = orden.map(c => {
      const its = grupos.get(c.id).sort((a, b) => ORD.indexOf(a.tipo) - ORD.indexOf(b.tipo));
      const tot = {}; its.forEach(i => add(tot, i.moneda, i.monto));
      const pend = its.filter(i => !i.movimiento_id), movs = [...new Set(its.filter(i => i.movimiento_id).map(i => i.movimiento_id))].map(movDe).filter(Boolean);
      const estado = !pend.length ? '<span class="days" style="color:var(--ok)">✓ Pagado ' + esc(movs.map(v => fmt(v.fecha).slice(0, 5)).join(', ')) + '</span>' : '<button class="btn sm primary" data-act="pgPagar" data-id="' + esc(c.id) + '">Pagar ' + esc(multi(pend.reduce((acc, i) => add(acc, i.moneda, i.monto), {}))) + '</button>';
      return '<section class="sheet"><div class="sheet-h"><h2 style="font-size:17px"><button class="btn link" data-act="pgColab" data-id="' + esc(c.id) + '">' + esc(c.nombre) + '</button> <span class="muted" style="font-size:13px;font-weight:500">' + esc([prov ? c.rubro : (c.tipo)].filter(Boolean).join(' · ')) + '</span></h2><span class="toolbar">' + estado + '<button class="btn ghost sm" data-act="pgRecibo" data-id="' + esc(c.id) + '" title="Comprobante de pago en PDF">Recibo</button>' + (mailsPagos(c) ? '<button class="btn ghost sm" data-act="pgReciboMail" data-id="' + esc(c.id) + '" title="Mandar el comprobante de pago por email">Enviar</button>' : '') + '</span></div><div class="rows">' +
        its.map(i => '<div class="row" style="cursor:default"><span class="d">' + esc(i.tipo) + '</span><span class="t"><b>' + esc(i.concepto) + '</b>' + (i.notas ? '<span>' + esc(i.notas) + '</span>' : '') + '</span><span class="toolbar"><span class="money">' + money(i.monto, i.moneda) + '</span>' + (i.movimiento_id ? '<span class="days" style="color:var(--ok)">✓</span>' : '<button class="btn ghost sm" data-act="pgItem" data-id="' + esc(i.id) + '">Editar</button>') + '</span></div>').join('') +
        '</div><div class="count" style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span>Total <b class="money">' + esc(multi(tot)) + '</b></span><button class="btn ghost sm" data-act="pgItem" data-colab="' + esc(c.id) + '" data-g="' + g + '">+ Agregar pago</button></div></section>';
    }).join('');
    h += '<div class="toolbar" style="justify-content:space-between"><span class="muted">' + (prov ? 'Un trabajo puntual (fotos, web, una pauta) se carga acá y se paga igual.' : 'Un bono, un reintegro o algo fuera del sueldo se carga acá.') + '</span><button class="btn" data-act="pgItem" data-g="' + g + '">' + (prov ? '+ Pago a proveedor' : '+ Extra o pago puntual') + '</button></div>';
    h += cards ? '<div class="grid2">' + cards + '</div>' : '<section class="sheet">' + emptyBox('Todavía no hay pagos ' + (prov ? 'a proveedores' : 'de sueldos') + ' para ' + monthLabel(m), falt.length ? 'Tocá “Calcular los pagos del mes”.' : prov ? 'Cargá cada trabajo con “+ Pago a proveedor”, o el honorario fijo en la ficha del proveedor.' : 'Cargá el sueldo de cada persona en su ficha (Equipo › Personas).') + '</section>';
    return h;
  }

  /* ---------- formularios ---------- */
  // Una sola ficha por persona: datos, cómo se le paga y si entra a la app.
  // Contactos del proveedor: una empresa (Cronopia) o un equipo (MADS) con una o varias personas.
  const ctcDe = cid => (AD.CTP || []).filter(x => x.colaborador_id === cid).sort((a, b) => (b.principal - a.principal) || (a.orden - b.orden) || cmp(a.nombre, b.nombre));
  const mailsPagos = c => { const ks = ctcDe(c.id), ms = (ks.some(x => x.pagos) ? ks.filter(x => x.pagos) : ks).map(x => x.email).filter(Boolean); return ms.length ? [...new Set(ms)].join(', ') : (c.email || ''); };
  const ctcIconos = k2 => '<span class="ctc-a">' + (k2.email ? '<button type="button" class="ctc-ic" data-act="pgCtcMail" data-id="' + esc(k2.id) + '" title="Escribirle un mail desde la app" aria-label="Mail a ' + esc(k2.nombre) + '">' + (ctx.icoMail || '✉') + '</button>' : '') +
    (k2.tel && ctx.waHref && ctx.waHref(k2.tel, k2.nombre) ? '<a class="ctc-ic wa" data-act="ext" href="' + ctx.waHref(k2.tel, k2.nombre) + '" target="_blank" rel="noopener" title="Abrir WhatsApp" aria-label="WhatsApp a ' + esc(k2.nombre) + '">' + (ctx.WA_ICO || 'WA') + '</a>' : '') +
    (k2.tel_fijo ? '<a class="ctc-ic" data-act="ext" href="tel:' + esc(String(k2.tel_fijo).replace(/[^\d+]/g, '')) + '" title="Llamar al fijo" aria-label="Llamar a ' + esc(k2.nombre) + '">' + (ctx.icoTel || '☎') + '</a>' : '') + '</span>';
  function ctcLista(c) {
    const ks = ctcDe(c.id);
    if (!ks.length) return '<span class="muted">Sin contactos. Si es una empresa o un equipo, cargá a cada persona con la que hablan.</span>';
    return '<div class="rows cxp" style="border:1px solid var(--line);border-radius:8px">' + ks.map(k2 => '<div class="row" style="cursor:default"><span class="t"><b>' + esc(k2.nombre || '—') + (k2.rol ? ' <span class="muted" style="font-weight:500">· ' + esc(k2.rol) + '</span>' : '') + '</b><span>' +
      [k2.principal ? 'Principal' : '', k2.pagos ? 'Recibe los comprobantes' : '', k2.persona ? 'Entra a la app como ' + k2.persona : '', k2.email, k2.tel, k2.tel_fijo].filter(Boolean).map(esc).join(' · ') + '</span></span>' +
      ctcIconos(k2) + '<button type="button" class="btn ghost sm" data-act="pgCtc" data-id="' + esc(k2.id) + '">Editar</button></div>').join('') + '</div>';
  }
  function formContacto(cid, kid) {
    const c = colab(cid), x = kid ? (AD.CTP || []).find(y => y.id === kid) : null; if (!c) return;
    const ext = S.E.filter(e => e.rol === 'externo' || (x && e._id === x.persona_id)).sort((a, b) => cmp(a.persona, b.persona));
    const primero = !ctcDe(cid).length;
    openPanel({
      title: x ? (x.nombre || 'Contacto') : 'Nuevo contacto', eyebrow: 'Contacto de ' + c.nombre, saveLabel: x ? 'Guardar' : 'Agregar',
      values: x ? { ...x } : { principal: primero, pagos: primero },
      fields: [
        { k: 'nombre', label: 'Nombre', req: 1 }, { k: 'rol', label: 'Qué hace', ph: 'Socia, diseño, administración…' },
        { k: 'email', label: 'Email', type: 'email' }, { k: 'tel', label: 'WhatsApp / celular', type: 'tel' }, { k: 'tel_fijo', label: 'Teléfono fijo', type: 'tel', ph: 'Si tiene' },
        { k: 'persona_id', label: 'Entra a la app como', type: 'select', html: v => opt('', 'No entra', v) + ext.map(e => opt(e._id, e.persona + (e.nombre && e.nombre !== e.persona ? ' (' + e.nombre + ')' : ''), v)).join(''), hint: 'Si trabaja en la app (le asignamos tareas o redes). El acceso se da desde la ficha de la persona.' },
        { k: 'principal', label: 'Es con quien hablamos del día a día', type: 'check', full: 1 },
        { k: 'pagos', label: 'Le mandamos los comprobantes de pago', type: 'check', full: 1 },
        { k: 'notas', label: 'Notas', type: 'textarea', full: 1, rows: 2 },
      ],
      onSave: async v => {
        const row = { colaborador_id: cid, nombre: String(v.nombre || '').trim(), rol: v.rol || '', email: String(v.email || '').trim().toLowerCase(), tel: v.tel || '', tel_fijo: v.tel_fijo || '', persona_id: v.persona_id || null, principal: !!v.principal, pagos: !!v.pagos, notas: v.notas || '' };
        if (x) await data.upd('contactos_proveedor', x.id, row); else await data.ins('contactos_proveedor', { ...row, orden: ctcDe(cid).length });
        if (row.principal) for (const o of ctcDe(cid).filter(o => o.principal && (!x || o.id !== x.id))) await data.upd('contactos_proveedor', o.id, { principal: false });
        toast(x ? 'Contacto guardado' : 'Contacto agregado');
        AD.postSave = () => formColaborador(cid);
      },
      onDelete: x ? async () => { await data.del('contactos_proveedor', x.id); toast('Contacto borrado'); AD.postSave = () => formColaborador(cid); } : null,
    });
  }

  const COLS = ['nombre', 'tipo', 'rubro', 'cuit', 'alias_cbu', 'cbu', 'banco', 'email', 'tel', 'activo', 'vinculo', 'ingreso', 'egreso', 'aguinaldo', 'contrato', 'notas'];
  function formColaborador(id, pid, prov) {
    const c = id ? colab(id) : null, p = persona(c ? c.persona_id : pid);
    const esP = c ? esProv(c) : (prov != null ? prov : !!(p && p.rol === 'externo'));
    const enApp = !!(p && p.activo !== false);
    const vals = {
      ...(c || {}), otros_nombres: c ? (c.otros_nombres || []).join(', ') : '',
      nombre: c ? c.nombre : (p ? (p.nombre || p.persona) : ''), tipo: c ? c.tipo : (esP ? 'Proveedor' : 'Empleado'),
      email: c ? (c.email || '') : (p ? p.email : ''), tel: c ? (c.tel || '') : (p ? (p.tel || '') : ''),
      activo: c ? c.activo : (p ? p.activo !== false : true), aguinaldo: c ? c.aguinaldo : !esP, notas: c ? c.notas : (p ? p.notas : ''),
      alias: p ? p.persona : '', puesto: p ? (p.puesto || '') : '', app: enApp, acceso: !!(p && p.email && p.activo !== false), email_acceso: p ? (p.email || '') : '', rol: p ? p.rol : (esP ? 'externo' : 'equipo'),
    };
    const hist = c ? histRem(c.id) : [], ex = c ? AD.CF.filter(x => x.colaborador_id === c.id).sort((a, b) => cmp(a.concepto, b.concepto)) : [], pagos = c ? pagosDe(c.id).slice(0, 12) : [];
    const box = (titulo, inner, btn) => '<div class="field full"><span class="lbl" style="display:flex;justify-content:space-between;align-items:center">' + titulo + (btn || '') + '</span>' + inner + '</div>';
    const lista = rows => rows.length ? '<div class="rows" style="border:1px solid var(--line);border-radius:8px">' + rows.join('') + '</div>' : '<span class="muted">Nada cargado.</span>';
    const pagRows = pagos.map(v => '<div class="row" style="cursor:default"><span class="d">' + fmt(v.fecha) + '</span><span class="t"><b class="money">' + money(v.egreso, v.moneda) + '</b><span>' + esc(v.detalle || v.subcuenta) + '</span></span><span></span></div>');
    const extra = !c ? '<p class="formnote" style="grid-column:1/-1">Después de guardar vas a poder cargar ' + (esP ? 'sus contactos, su honorario fijo (si tiene) y sus pagos.' : 'el sueldo, los aumentos y los extras.') + '</p>' : esP
      ? box('Contactos', ctcLista(c), '<button type="button" class="btn sm" data-act="pgCtc" data-colab="' + esc(c.id) + '">+ Contacto</button>') + box('Honorario fijo por mes', AU.timeline(c) + '<span class="hint">Solo si cobra lo mismo todos los meses. Si cobra por trabajo, dejalo vacío y cargá cada trabajo en Pagos del mes.</span>', '<button type="button" class="btn sm" data-act="pgRem" data-id="' + esc(c.id) + '">+ Honorario</button>') + box('Últimos pagos', lista(pagRows))
      : (remVig(c.id, mesRef(c)).length ? box('Por mes se le transfiere', '<div><b class="money" style="font-size:20px">' + esc(multi(lineaRem(c, mesRef(c)).acc)) + '</b> <span class="muted">sueldo + extras' + (mesRef(c) > thisMonth() ? ', desde ' + fmt(mesRef(c)) : ' vigentes') + '</span></div>') : '') + box('Sueldo', AU.timeline(c), '<button type="button" class="btn sm" data-act="pgRem" data-id="' + esc(c.id) + '">' + (hist.length ? '+ Aumento' : '+ Sueldo') + '</button>') +
        box('Extras fijos', lista(ex.map(x => '<div class="row" data-act="pgExtra" data-id="' + esc(c.id) + '" data-x="' + esc(x.id) + '" title="Editar" style="cursor:pointer"><span class="d">' + (x.desde ? fmt(x.desde) : 'siempre') + '</span><span class="t"><b>' + esc(x.concepto) + ' · <span class="money">' + money(x.monto, x.moneda) + '</span></b><span>' + esc((x.hasta ? 'hasta ' + fmt(x.hasta) : 'sin fecha de fin') + (x.notas ? ' · ' + x.notas : '')) + '</span></span><button type="button" class="btn ghost sm" data-act="pgExtraDel" data-id="' + esc(x.id) + '" aria-label="Borrar">✕</button></div>')), '<button type="button" class="btn sm" data-act="pgExtra" data-id="' + esc(c.id) + '">+ Extra</button>') +
        box('Últimos pagos', lista(pagRows));
    const rolOpts = esP ? ['externo', 'equipo'] : ['equipo', 'admin'];
    const fRol = { k: 'rol', label: 'Qué ve en la app', type: 'select', html: v => rolOpts.map(r => opt(r, ROLES[r] + (r === 'externo' ? ' (solo lo suyo)' : r === 'admin' ? ' (todo, con la plata)' : ' (todo menos la plata)'), v)).join('') };
    const fAcceso = [{ k: 'acceso', label: 'Entra a la app con su email', type: 'check' }, { k: 'email_acceso', label: 'Email para entrar', type: 'email', hint: 'Vacío = usa el email de arriba.' }, fRol];
    const fBanco = [{ k: 'cuit', label: 'CUIT / CUIL' }, { k: 'alias_cbu', label: 'Alias para transferirle' }, { k: 'cbu', label: 'CBU / CVU' }, { k: 'banco', label: 'Banco' }];
    const fComunes = [{ k: 'ingreso', label: esP ? 'Trabaja con nosotros desde' : 'Fecha de ingreso', type: 'date', adv: 1 }, { k: 'egreso', label: 'Fecha de baja', type: 'date', adv: 1 },
      { k: 'contrato', label: 'Contrato o legajo (link)', type: 'url', full: 1, ph: 'https://drive.google.com/...', adv: 1 },
      { k: 'otros_nombres', label: 'Apodos (para reconocer pagos en el banco)', full: 1, hint: 'Separados por coma. Ej.: Vale, Valentina R.', adv: 1 },
      { k: 'notas', label: 'Notas', type: 'textarea', full: 1, rows: 2, adv: 1 }];
    const fields = esP ? [
      { k: 'nombre', label: 'Nombre o empresa', req: 1, full: 1, hint: 'Si es una empresa o un equipo (Cronopia, MADS), poné ese nombre y cargá a cada persona en Contactos.' },
      { k: 'rubro', label: 'Rubro', type: 'select', html: v => opt('', '—', v) + [...new Set([...((S.L && S.L.rubros) || RUBROS), v].filter(Boolean))].map(r => opt(r, r, v)).join(''), hint: 'Los rubros se cambian en Configuración › Opciones.' },
      { k: 'vinculo', label: 'Cómo factura', type: 'select', opts: VINCULOS, blank: '—', hint: 'Informal: no nos factura, le transferimos lo que nos pasa.' },
      ...fBanco,
      { k: 'email', label: 'Email', type: 'email' }, { k: 'tel', label: 'Teléfono' },
      { k: 'activo', label: 'Activo', type: 'check', full: 1 },
      { k: 'app', label: 'Trabaja en la app (le asignamos tareas o redes)', type: 'check', full: 1, adv: 1 },
      { k: 'alias', label: 'Cómo le decimos en la app', adv: 1 }, ...fAcceso.map(f => ({ ...f, adv: 1 })),
      { k: 'tipo', label: 'Es', type: 'select', opts: TIPOS, adv: 1, hint: 'Si pasa a ser del equipo, cambialo a Empleado o Socio.' },
      ...fComunes,
    ] : [
      { k: 'nombre', label: 'Nombre completo', req: 1, full: 1 },
      { k: 'alias', label: 'Cómo le decimos', req: 1, hint: 'Así aparece como responsable en proyectos y redes.' },
      { k: 'puesto', label: 'Puesto', ph: 'Diseñadora, community manager…' },
      { k: 'tipo', label: 'Es', type: 'select', opts: ['Socio', 'Empleado', 'Proveedor'] },
      { k: 'vinculo', label: 'Vínculo', type: 'select', opts: VINCULOS, blank: '—' },
      { k: 'email', label: 'Email', type: 'email' }, { k: 'tel', label: 'Teléfono' },
      ...fAcceso,
      { k: 'activo', label: 'Activa/o (si no, deja de cobrar y pierde el acceso)', type: 'check', full: 1 },
      ...fBanco.map(f => ({ ...f, adv: 1 })),
      { k: 'aguinaldo', label: 'Cobra aguinaldo (junio y diciembre)', type: 'check', adv: 1 },
      ...fComunes,
    ];
    openPanel({
      masLabel: esP ? 'Acceso a la app, fechas y más' : 'Datos para pagarle, fechas y más',
      title: c ? c.nombre : p ? (p.nombre || p.persona) : (esP ? 'Nuevo proveedor' : 'Nueva persona del equipo'),
      eyebrow: esP ? 'Proveedor' + (c && c.rubro ? ' · ' + c.rubro : '') : 'Equipo' + (c ? ' · ' + (c.tipo) : ''),
      values: vals, fields, extra,
      onSave: async v => {
        const quiereApp = 'app' in v ? !!v.app : true;
        let pid2 = p ? p._id : null;
        if (quiereApp) {
          const alias = String(v.alias || String(v.nombre).split(/\s+/)[0] || '').trim();
          if (!pid2) { const mismo = S.E.find(e => norm(e.persona) === norm(alias) && !colabDePersona(e._id)); if (mismo) pid2 = mismo._id; }
          if (S.E.some(e => norm(e.persona) === norm(alias) && e._id !== pid2)) throw new Error('Ya hay alguien que en la app se llama “' + alias + '”. Poné otro nombre corto.');
          const mail = v.acceso ? String(v.email_acceso || v.email || '').trim() : '';
          if (v.acceso && !mail) throw new Error('Para entrar a la app necesita un email');
          if (mail && S.E.some(e => e.email && norm(e.email) === norm(mail) && e._id !== pid2)) throw new Error('Ese email ya lo usa otra persona para entrar');
          if (S.me && pid2 === S.me.id && (v.rol !== 'admin' || !mail || !v.activo)) throw new Error('No podés quitarte el acceso de administrador a vos mismo');
          const ui = { persona: alias, nombre: v.nombre, email: mail, tel: v.tel || '', rol: v.rol || (esP ? 'externo' : 'equipo'), activo: !!v.activo };
          if ('puesto' in v) ui.puesto = v.puesto || ''; else if (!pid2) ui.puesto = v.rubro ? 'Proveedor · ' + v.rubro : 'Proveedor';
          pid2 = await data.save('persona', pid2, ui);
        } else if (pid2) {
          if (S.me && pid2 === S.me.id) throw new Error('No podés quitarte el acceso a vos mismo');
          await data.save('persona', pid2, { email: '', activo: false });
        }
        const row = {}; COLS.forEach(k2 => { if (k2 in v) row[k2] = v[k2]; });
        Object.assign(row, { persona_id: pid2 || null, ingreso: v.ingreso || null, egreso: v.egreso || null, otros_nombres: String(v.otros_nombres || '').split(',').map(s => s.trim()).filter(Boolean) });
        // Si pasó de "Cintia Weker" a "Cronopia", el nombre anterior queda como apodo para seguir reconociendo sus pagos.
        if (c && c.nombre && norm(c.nombre) !== norm(row.nombre || '') && !row.otros_nombres.some(o => norm(o) === norm(c.nombre))) row.otros_nombres.push(c.nombre);
        let cid = c && c.id;
        if (c) await data.upd('colaboradores', c.id, row); else cid = (await data.ins('colaboradores', row)).id;
        // Vincular pagos de Caja que todavía no tienen persona
        const nombres = [row.nombre, ...row.otros_nombres].map(norm);
        const sueltos = AD.MV.filter(x => !x.colaborador_id && x.egreso > 0 && nombres.includes(norm((x.contraparte || '').trim())));
        for (const x of sueltos) await data.upd('movimientos', x.id, { colaborador_id: cid });
        toast((c ? 'Datos guardados' : 'Agregado') + (sueltos.length ? ' · ' + sueltos.length + ' pagos anteriores reconocidos' : ''));
        if (!c) AD.postSave = () => formColaborador(cid);
      },
      onDelete: c ? async () => {
        if (c.persona_id && S.me && c.persona_id === S.me.id) throw new Error('No podés borrarte a vos mismo');
        await data.del('colaboradores', c.id);
        if (c.persona_id) await data.save('persona', c.persona_id, { email: '', activo: false });
        toast('Borrado. Sus pagos siguen en Gastos e ingresos.');
      } : null,
    });
  }
  // Corregir un sueldo u honorario ya cargado (monto, mes, motivo), sin crear un aumento.
  function formRemEdit(rid) {
    const r = AD.RM.find(x => x.id === rid), c = r && colab(r.colaborador_id); if (!c) return;
    if (r.lote_id) {
      if (r.desde <= thisMonth()) { toast('Ese monto ya rige: se corrige con otro lote'); return; }
      const amb = esProv(c) ? 'proveedores' : 'sueldos';
      ctx.closeForm(); irA(amb === 'sueldos' ? 'aumentos' : 'proveedores', amb === 'sueldos' ? null : 'aumentos'); AU.editar(amb, r.lote_id); return;
    }
    openPanel({
      title: c.nombre, eyebrow: 'Corregir ' + r.concepto.toLowerCase(), saveLabel: 'Guardar',
      intro: 'Cambia este monto tal cual, sin sumar un aumento al historial. Para un aumento usá “+ Aumento”.',
      values: { concepto: r.concepto, desde: r.desde, monto: String(r.monto).replace('.', ','), moneda: r.moneda, motivo: r.motivo || '' },
      fields: [
        { k: 'concepto', label: 'Concepto', type: 'select', opts: ['Sueldo', 'Honorario'] },
        { k: 'desde', label: 'Desde qué mes', type: 'month', month: 1, req: 1 },
        { k: 'monto', label: 'Monto mensual', num: 1, req: 1 },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'motivo', label: 'Motivo', full: 1 },
      ],
      onSave: async v => {
        if (AD.RM.some(x => x.id !== rid && x.colaborador_id === c.id && x.concepto === v.concepto && x.desde === v.desde)) throw new Error('Ya hay un ' + v.concepto.toLowerCase() + ' cargado desde ' + fmt(v.desde) + '. Cambiá ese o elegí otro mes.');
        await data.upd('remuneraciones', rid, { concepto: v.concepto, desde: v.desde + '-01', monto: v.monto, moneda: v.moneda, motivo: v.motivo || '' });
        toast('Corregido: ' + money(v.monto, v.moneda) + ' desde ' + fmt(v.desde));
        AD.postSave = () => formColaborador(c.id);
      },
      deleteLabel: 'Borrar', onDelete: async () => { await data.del('remuneraciones', rid); toast('Borrado'); AD.postSave = () => formColaborador(c.id); },
    });
  }
  function formRem(cid, desde) {
    const c = colab(cid); if (!c) return;
    const concepto = c.tipo === 'Proveedor' ? 'Honorario' : (histRem(cid)[0] || {}).concepto || 'Sueldo';
    const cur = remVig(cid, mesRef(c)).find(r => r.concepto === concepto);
    openPanel({
      title: c.nombre, eyebrow: cur ? (concepto === 'Sueldo' ? 'Aumento de sueldo' : 'Nuevo honorario') : (concepto === 'Sueldo' ? 'Sueldo' : 'Honorario fijo'), saveLabel: 'Guardar',
      intro: cur ? 'Vigente: <b class="money">' + esc(money(cur.monto, cur.moneda)) + '</b> desde ' + esc(fmt(cur.desde)) + '. El aumento va sobre el básico (los extras no cambian) y queda en el historial. Poné el % o el monto en $ a sumar.' : 'El monto que se paga cada mes desde el mes indicado.',
      values: { concepto, desde: cur ? addMonth(cur.desde > thisMonth() ? cur.desde : thisMonth(), 1) : thisMonth(), monto: '', pct: '', suma: '', moneda: cur ? cur.moneda : 'ARS', motivo: cur ? '' : 'Inicial' },
      fields: [
        { k: 'concepto', label: 'Concepto', type: 'select', opts: ['Sueldo', 'Honorario'] },
        { k: 'desde', label: 'Desde qué mes', type: 'month', month: 1, req: 1 },
        ...(cur ? [{ k: 'pct', label: 'Aumento en %', num: 1, ph: '5' }, { k: 'suma', label: 'o aumento en $', num: 1, ph: '50000', hint: 'Se suma al básico. Completá uno de los dos.' }] : [{ k: 'monto', label: 'Monto mensual (básico)', num: 1, req: 1 }]),
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'motivo', label: 'Motivo', ph: 'Paritaria, aumento semestral…', full: 1 },
      ],
      onSave: async v => {
        // El monto anterior: el último antes del mes elegido
        const prev = AD.RM.filter(x => x.colaborador_id === cid && x.concepto === v.concepto && x.desde < v.desde).sort((a, b) => b.desde.localeCompare(a.desde))[0];
        let monto = cur ? null : v.monto;
        if (cur && prev) { if (v.pct && v.suma) throw new Error('Poné el % o el monto en $, no los dos'); if (v.pct) monto = r2(prev.monto * (1 + v.pct / 100)); else if (v.suma) monto = r2(prev.monto + v.suma); }
        if (!monto) throw new Error(cur ? 'Poné el % o el monto en $ del aumento' : 'Poné el monto');
        if (AD.RM.some(x => x.colaborador_id === cid && x.concepto === v.concepto && x.desde === v.desde)) throw new Error('Ya hay un monto cargado desde ' + fmt(v.desde) + '. Tocalo en la línea de tiempo para corregirlo.');
        if (prev && v.desde < thisMonth()) throw new Error('Un aumento rige desde este mes o uno que viene');
        const motivo = v.motivo || (v.pct ? 'Aumento ' + String(v.pct).replace('.', ',') + '%' : v.suma ? 'Aumento de ' + money(v.suma, v.moneda) : '');
        let lote_id = null;
        // Con un monto anterior es un aumento: queda como lote de una persona (con su historial, editable hasta que empiece)
        if (prev) lote_id = (await data.ins('lotes_aumento', { ambito: esProv(c) ? 'proveedores' : 'sueldos', desde: v.desde + '-01', modo: v.pct ? 'porcentaje' : 'suma', valor: v.pct || v.suma, redondeo: 0, motivo, creado_por: (S.me && S.me.id) || null })).id;
        await data.ins('remuneraciones', { colaborador_id: cid, concepto: v.concepto, desde: v.desde + '-01', monto, moneda: v.moneda, motivo, ...(prev ? { lote_id, monto_anterior: prev.monto, pct: prev.monto ? Math.round((monto / prev.monto - 1) * 10000) / 100 : null } : {}) });
        toast('Guardado: ' + money(monto, v.moneda) + ' desde ' + fmt(v.desde));
        if (desde !== 'aum') AD.postSave = () => formColaborador(cid);
      },
    });
  }
  function formExtra(cid, xid) {
    const c = colab(cid); if (!c) return;
    const x = xid ? AD.CF.find(y => y.id === xid) : null;
    openPanel({
      title: c.nombre, eyebrow: x ? 'Editar extra' : 'Extra fijo', saveLabel: x ? 'Guardar' : 'Agregar',
      intro: x ? 'Si el monto cambia desde un mes en adelante, poné “Hasta” en este y cargá uno nuevo; así queda el historial. Si fue un error, corregilo acá.' : 'Se suma a los pagos de cada mes mientras esté vigente (bondi, Adobe, internet…).',
      values: x ? { concepto: x.concepto, monto: String(x.monto).replace('.', ','), moneda: x.moneda, desde: x.desde || '', hasta: x.hasta || '', notas: x.notas || '' } : { concepto: '', monto: '', moneda: 'ARS', desde: mesRef(c), hasta: '', notas: '' },
      fields: [
        { k: 'concepto', label: 'Concepto', req: 1, ph: 'Bondi' },
        { k: 'monto', label: 'Monto mensual', num: 1, req: 1 },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'desde', label: 'Desde', type: 'month', month: 1 },
        { k: 'hasta', label: 'Hasta (opcional)', type: 'month', month: 1 },
        { k: 'notas', label: 'Notas', full: 1 },
      ],
      extra: '<datalist id="dl-extras">' + ['Bondi', 'Adobe', 'Internet', 'Monotributo', 'Capacitación'].map(s => '<option value="' + s + '">').join('') + '</datalist>',
      onSave: async v => { const row = { colaborador_id: cid, concepto: v.concepto, monto: v.monto, moneda: v.moneda, desde: v.desde ? v.desde + '-01' : null, hasta: v.hasta ? v.hasta + '-01' : null, notas: v.notas }; if (x) await data.upd('conceptos_fijos', x.id, row); else await data.ins('conceptos_fijos', row); toast(x ? 'Extra actualizado' : 'Extra agregado'); AD.postSave = () => formColaborador(cid); },
      ...(x ? { deleteLabel: 'Borrar', onDelete: async () => { await data.del('conceptos_fijos', x.id); toast('Extra borrado'); AD.postSave = () => formColaborador(cid); } } : {}),
    });
    const el = $('#af-concepto'); if (el) el.setAttribute('list', 'dl-extras');
  }
  function formItem(id, colabId, prov) {
    const it = id ? AD.LQ.find(l => l.id === id) : null, m = AD.pg.mes;
    openPanel({
      title: it ? it.concepto : 'Nuevo pago', eyebrow: 'Pagos de ' + monthLabel(it ? it.periodo : m),
      values: it ? { ...it } : { colaborador_id: colabId || '', tipo: prov ? 'Honorario' : 'Extra', concepto: '', monto: '', moneda: 'ARS', notas: '' },
      fields: [
        { k: 'colaborador_id', label: 'Para', type: 'select', req: 1, full: 1, html: v => opt('', 'Elegí', v) + AD.CO.filter(c => (c.activo && (it || prov == null || esProv(c) === prov)) || c.id === v).map(c => opt(c.id, c.nombre + ' · ' + (c.tipo === 'Proveedor' ? (c.rubro || 'Proveedor') : c.tipo), v)).join('') },
        { k: 'tipo', label: 'Tipo', type: 'select', opts: ['Sueldo', 'Honorario', 'Extra', 'Aguinaldo', 'Otro'] },
        { k: 'concepto', label: 'Concepto', req: 1, ph: prov ? 'Fotos Casa Ceibo' : 'Bono fin de año' },
        { k: 'monto', label: 'Monto', num: 1, req: 1 },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'notas', label: 'Notas', full: 1 },
      ],
      onSave: async v => {
        const row = { periodo: (it ? it.periodo : m) + '-01', colaborador_id: v.colaborador_id, tipo: v.tipo, concepto: v.concepto, monto: v.monto, moneda: v.moneda, notas: v.notas };
        if (it) await data.upd('liquidaciones', it.id, row); else await data.ins('liquidaciones', row);
        toast(it ? 'Pago actualizado' : 'Pago agregado');
      },
      onDelete: it ? async () => { await data.del('liquidaciones', it.id); toast('Pago quitado'); } : null,
    });
  }
  function formPagar(cid) {
    const c = colab(cid), m = AD.pg.mes; if (!c) return;
    const its = liqMes(m).filter(l => l.colaborador_id === cid && !l.movimiento_id);
    if (!its.length) { toast('No hay pagos pendientes'); return; }
    const moneda = its[0].moneda, cjs = k.cajasDe(moneda);
    const [cuenta, subcuenta] = cuentaPago(c, its.filter(i => i.tipo !== 'Aguinaldo').length ? its.filter(i => i.tipo !== 'Aguinaldo') : its);
    const datosPago = [c.banco, c.cbu && 'CBU ' + c.cbu, c.alias_cbu && 'alias ' + c.alias_cbu, c.cuit && 'CUIT ' + c.cuit].filter(Boolean).join(' · ');
    openPanel({
      title: 'Pagar a ' + c.nombre, eyebrow: 'Pagos de ' + monthLabel(m), saveLabel: 'Registrar pago',
      intro: 'Se carga como gasto en Gastos e ingresos con este detalle. ' + (its.some(i => i.tipo === 'Aguinaldo') && its.some(i => i.tipo !== 'Aguinaldo') ? 'El aguinaldo se carga aparte. ' : '') + (datosPago ? '<br><b>Datos de pago:</b> ' + esc(datosPago) : ''),
      values: { fecha: today(), caja: cjs[0] ? cjs[0].id : '', cuenta, subcuenta, detalle: detallePago(its.filter(i => i.tipo !== 'Aguinaldo'), m) || detallePago(its, m), imputar: c.tipo === 'Proveedor' },
      fields: [
        { k: 'fecha', label: 'Fecha de pago', type: 'date', req: 1 },
        { k: 'caja', label: 'Sale de la cuenta', type: 'select', html: v => cjs.map(x => opt(x.id, x.nombre, v)).join('') || opt('', 'Sin cuentas en ' + moneda, v) },
        { k: 'cuenta', label: 'Categoría', type: 'select', opts: [...new Set(AD.PC.map(p => p.cuenta))].sort(cmp) },
        { k: 'subcuenta', label: 'Detalle de la categoría' },
        { k: 'detalle', label: 'Detalle', full: 1 },
        ...(c.tipo === 'Proveedor' ? [{ k: 'imputar', label: 'Después, repartir el gasto entre clientes (para ver cuánto deja cada uno)', type: 'check' }] : []),
      ],
      extra: '<div class="field full"><span class="lbl">Qué se paga</span><div class="rows" style="border:1px solid var(--line);border-radius:8px">' + its.map(i => '<label class="row" style="cursor:pointer"><input type="checkbox" data-pgsel="' + esc(i.id) + '" checked><span class="t"><b>' + esc(i.concepto) + '</b><span>' + esc(i.tipo) + '</span></span><span class="money">' + money(i.monto, i.moneda) + '</span></label>').join('') + '</div></div>',
      onSave: async v => {
        const sel = its.filter(i => ($('[data-pgsel="' + i.id + '"]') || {}).checked);
        if (!sel.length) throw new Error('Elegí al menos un pago');
        const grupos = new Map();
        sel.forEach(i => { const kk = i.moneda + '|' + (i.tipo === 'Aguinaldo' && sel.some(x => x.tipo !== 'Aguinaldo') ? 'ag' : 'main'); if (!grupos.has(kk)) grupos.set(kk, []); grupos.get(kk).push(i); });
        let ultimo = null;
        for (const [kk, g] of grupos) {
          const [mon, cual] = kk.split('|');
          const [cta, sub] = cual === 'ag' ? ['Costo Laboral', 'Aguinaldo'] : [v.cuenta, v.subcuenta];
          const caja = mon === moneda ? (v.caja || null) : ((k.cajasDe(mon)[0] || {}).id || null);
          const mv = await data.ins('movimientos', { fecha: v.fecha, cuenta: cta, subcuenta: sub, contraparte: c.nombre, persona_id: c.persona_id || null, colaborador_id: c.id, detalle: cual === 'ag' ? detallePago(g, m) : v.detalle, ingreso: 0, egreso: r2(g.reduce((a, i) => a + i.monto, 0)), moneda: mon, caja_id: caja });
          for (const i of g) await data.upd('liquidaciones', i.id, { movimiento_id: mv.id });
          if (cual === 'main') ultimo = mv.id;
        }
        toast('Pago cargado en Gastos e ingresos');
        if (v.imputar && ultimo) AD.postSave = () => k.formMovimiento(ultimo);
      },
    });
  }
  /* ---------- comprobante de pago ---------- */
  async function reciboPdf(cid) {
    const c = colab(cid), m = AD.pg.mes, its = liqMes(m).filter(l => l.colaborador_id === cid);
    if (!c || !its.length) throw new Error('No hay pagos para ' + ((c && c.nombre) || 'esta persona') + ' en ' + monthLabel(m));
    const movs = [...new Set(its.filter(i => i.movimiento_id).map(i => i.movimiento_id))].map(movDe).filter(Boolean);
    const caja = id => ((AD.CJ || []).find(x => x.id === id) || {}).nombre || '';
    const dmy = d => { const [y, mm, dd] = String(d).slice(0, 10).split('-'); return dd + '/' + mm + '/' + y; };
    const { reciboDoc, bytesBase64 } = await import('./docs.js');
    const periodo = cap(monthLabel(m).replace(' de ', ' '));
    let numero = ''; try { numero = await data.rpc('numero_comprobante_pago', { cid, per: m + '-01' }); } catch (e) { /* sin número hasta correr la migración 0011 */ }
    const bytes = await reciboDoc({ cfg: k.cfgDocs(), estilo: k.estiloDoc(), emitido: k.hoyDMY(), periodo, numero, email: c.email || '', nombre: c.nombre,
      detalle: [c.tipo, c.vinculo, c.rubro].filter(Boolean).join(' · '), cuit: c.cuit || '',
      items: its.map(i => ({ tipo: i.tipo, concepto: i.concepto, monto: i.monto, moneda: i.moneda, pagado: !!i.movimiento_id })),
      pagos: movs.map(v => ({ fecha: dmy(v.fecha), caja: caja(v.caja_id), monto: v.egreso, moneda: v.moneda })),
      destino: [['Banco', c.banco], ['CBU / CVU', c.cbu], ['Alias', c.alias_cbu]] });
    return { bytes, nombre: 'Comprobante-' + (numero ? numero + '-' : '') + c.nombre.replace(/\s+/g, '-') + '-' + periodo.replace(/\s+/g, '-') + '.pdf', base64: bytesBase64(bytes), c, periodo };
  }

  /* ---------- acciones ---------- */
  const actions = {
    pgMes: t => { const n = +t.dataset.d; AD.pg.tocado = true; AD.pg.mes = n ? addMonth(AD.pg.mes, n) : thisMonth(); ctx.render(); },
    pgColab: t => formColaborador(t.dataset.id || null, t.dataset.pid || null, t.dataset.g === 'prov' ? true : t.dataset.g === 'eq' ? false : null),
    pgRem: t => formRem(t.dataset.id, t.dataset.from),
    pgRemEdit: t => formRemEdit(t.dataset.id),
    pgRemDel: async t => { const r = AD.RM.find(x => x.id === t.dataset.id); try { await data.del('remuneraciones', t.dataset.id); await ctx.reload(); if (r) formColaborador(r.colaborador_id); } catch (err) { toast(err.message); } },
    pgExtra: t => formExtra(t.dataset.id, t.dataset.x || null),
    pgExtraDel: async t => { const x = AD.CF.find(y => y.id === t.dataset.id); try { await data.del('conceptos_fijos', t.dataset.id); await ctx.reload(); if (x) formColaborador(x.colaborador_id); } catch (err) { toast(err.message); } },
    pgItem: t => formItem(t.dataset.id || null, t.dataset.colab || null, t.dataset.g === 'prov' ? true : t.dataset.g === 'eq' ? false : null),
    pgPagar: t => formPagar(t.dataset.id),
    pgCtc: t => { const x = t.dataset.id ? (AD.CTP || []).find(y => y.id === t.dataset.id) : null; formContacto(x ? x.colaborador_id : t.dataset.colab, x ? x.id : null); },
    pgCtcMail: async t => {
      const x = (AD.CTP || []).find(y => y.id === t.dataset.id), c = x && colab(x.colaborador_id); if (!x || !c) return;
      const E = await import('./emails.js');
      k.openComposer({ titulo: 'Mail a ' + x.nombre, eyebrow: c.nombre, tipo: 'Otro', cliente: null, para: x.email, asunto: '',
        mensaje: 'Hola ' + (x.nombre || '').split(' ')[0] + ', ¿cómo estás?\n\n',
        build: v => E.libreEmail({ cfg: k.cfgMarca(), contacto: x.nombre, cuenta: c.nombre, titulo: v.asunto, mensaje: v.mensaje, firma: k.firma(), asunto: v.asunto }) });
    },
    pgRecibo: async t => { const w = window.open('', '_blank'); try { const { abrirPdf } = await import('./docs.js'); const p = await reciboPdf(t.dataset.id); abrirPdf(p.bytes, p.nombre.replace(/\.pdf$/, ''), w); } catch (err) { if (w) w.close(); toast(err.message); } },
    pgReciboMail: async t => {
      let p; try { toast('Preparando el PDF…'); p = await reciboPdf(t.dataset.id); } catch (err) { toast(err.message); return; }
      const E = await import('./emails.js'), kp = ctcDe(p.c.id).filter(x => x.pagos && x.email), nom = (kp.length ? kp.map(x => x.nombre.split(' ')[0]).join(' y ') : p.c.nombre.split(' ')[0]);
      k.openComposer({ titulo: 'Enviar comprobante', eyebrow: p.c.nombre + ' · ' + p.periodo, tipo: 'Otro', cliente: null, para: mailsPagos(p.c), asunto: 'Comprobante de pago · ' + p.periodo,
        adjuntos: [{ nombre: p.nombre, base64: p.base64, bytes: p.bytes }],
        mensaje: 'Hola ' + nom + ', ¿cómo estás?\n\nTe mandamos adjunto el comprobante de ' + p.periodo + '.\n\nCualquier cosa, avisanos.',
        build: v => E.libreEmail({ cfg: k.cfgMarca(), contacto: p.c.nombre, cuenta: p.c.nombre, titulo: 'Comprobante de ' + p.periodo, mensaje: v.mensaje, firma: k.firma(), asunto: v.asunto }) });
    },
    pgAumento: () => irA('aumentos'),
    pgGenerar: async t => {
      const m = AD.pg.mes, g = t && t.dataset ? t.dataset.g : '', rows = faltantes(m).filter(x => !g || deGrupo(g === 'prov')(x)).map(p => ({ ...p, periodo: m + '-01' }));
      if (!rows.length) { toast('No falta nada'); return; }
      try { await data.insMany('liquidaciones', rows); toast(rows.length + ' pagos calculados'); await ctx.reload(); } catch (err) { toast(err.message); }
    },
  };
  document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.pgk) { AD.pg[t.dataset.pgk] = t.type === 'checkbox' ? t.checked : t.value; ctx.render(); } });

  // Para el asistente y la Caja
  const colabPorNombre = nombre => { const n = norm((nombre || '').trim()); return n ? AD.CO.find(c => norm(c.nombre) === n || (c.otros_nombres || []).some(o => norm(o) === n)) : null; };
  Object.assign(actions, AU.actions);
  return { actions, view: vSueldos, vSueldos, vAumentos, vProveedores, vPersonas, faltantes, liqMes, colabPorNombre };
}
