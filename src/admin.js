// Administración: precios y aumentos, cierre de mes (resumen → comprobante → cobro → recordatorio), facturas.
// Solo para administradores. La base de datos además lo impide para otros roles.
import { leerNumero, cuit as fmtCuit } from './formato.js';
import { firmaDe, firmanteDe, firmaSelect, personaIdDe } from './firma.js';
import * as data from './data.js';
import * as E from './emails.js';
import { initEquipo } from './equipo.js';
import { initAsistente } from './asistente.js';
import { initStats } from './stats.js';
import { masMenu } from './ui.js';
import { confirmar } from './dialogo.js';
import { rango, enRango, selector } from './periodo.js';
import { ICON } from './iconos.js';
import { initMantenimiento } from './mantenimiento.js';
import { initPropuestas } from './propuestas.js';

export function initAdmin(ctx) {
  const { S, esc, opt, optsFrom, pill, fmt, monthLabel, thisMonth, addMonth, today, diff, cmp, norm, emptyBox, clienteOpts, toast, $ } = ctx;
  // Monedas: se editan en Configuración → Opciones. Es un arreglo vivo (se actualiza en cada carga) para que todos los formularios lo vean.
  const MONEDAS = ['ARS', 'USD', 'EUR', 'GBP'];
  const syncMonedas = () => { const l = (S.L.monedas || []).map(m => String(m).trim().toUpperCase()).filter(m => /^[A-Z]{3}$/.test(m)); if (l.length) { MONEDAS.length = 0; MONEDAS.push(...new Set(['ARS', 'USD', ...l])); } };
  const esExterior = m => m && m !== 'ARS' && m !== 'USD';
  const EMISORES = ['Fer', 'Jime'];
  const TIPOS_COMP = ['Factura ARCA', 'Invoice', 'Otro'];
  const AD = { EP: [], EI: [], CXP: [], CTP: [], ok: false, CA: new Map(), PR: [], PF: [], R: [], F: [], CJ: [], PC: [], MV: [], G: [], EM: [], AJ: {}, adj: [], PFZ: new Map(), ABF: new Map(), IMP: [], impDraft: [], CO: [], RM: [], LA: [], CF: [], LQ: [], DA: [], IL: [], postSave: null, rt: { anio: String(new Date().getFullYear()), ver: 'horas' },
    mes: thisMonth(), sel: null, rd: null, ff: { estado: 'abiertas', cliente: '', emisor: '', anio: String(new Date().getFullYear()) },
    pp: { sel: new Set(), pct: '', desde: addMonth(thisMonth(), 1), motivo: '' }, form: null };

  /* ---------- utilidades de plata ---------- */
  function money(n, cur) { if (n === null || n === undefined || n === '' || isNaN(n)) return '—'; try { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur || 'ARS', maximumFractionDigits: 2, minimumFractionDigits: Math.abs(Math.round(n * 100)) % 100 ? 2 : 0 }).format(n); } catch (e) { return (cur || '') + ' ' + n; } }
  // Punto o coma: el símbolo que se use es el decimal (ver formato.js).
  const parseMonto = leerNumero;
  const r2 = n => Math.round(n * 100) / 100;
  const add = (acc, cur, n) => { if (n) acc[cur || 'ARS'] = (acc[cur || 'ARS'] || 0) + n; return acc; };
  const multi = acc => { const e = Object.entries(acc).filter(([, v]) => Math.abs(v) > 0.004); return e.length ? e.map(([c, v]) => money(v, c)).join(' + ') : money(0, 'ARS'); };
  const lock = ''; // la barra lateral ya agrupa Administración
  // Lo que suma a "hay en las cuentas": desde el saldo inicial de cada cuenta en adelante.
  // Lo cargado con fecha anterior (cobros y gastos viejos) queda como historial y no se cuenta dos veces.
  let cortesC = null, cortesMV = null, cortesCJ = null;
  function cortes() {
    if (cortesC && cortesMV === AD.MV && cortesCJ === AD.CJ) return cortesC;
    const caja = new Map(), mon = new Map();
    AD.CJ.forEach(c => { if (c.saldo_inicial_fecha) caja.set(c.id, c.saldo_inicial_fecha); });
    AD.MV.forEach(v => { if (v.cuenta === 'Saldo Inicial' && v.caja_id && v.fecha) caja.set(v.caja_id, v.fecha); });
    AD.CJ.forEach(c => { const k = caja.get(c.id); if (k && (!mon.has(c.moneda) || k < mon.get(c.moneda))) mon.set(c.moneda, k); });
    cortesMV = AD.MV; cortesCJ = AD.CJ; return (cortesC = { caja, mon });
  }
  const enSaldo = v => { if (v.cuenta === 'Saldo Inicial') return true; const c = cortes(), k = v.caja_id ? c.caja.get(v.caja_id) : c.mon.get(v.moneda); return !k || (v.fecha || '') >= k; };
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  // Tarjeta de número con varias monedas: una fila por moneda, con su píldora, y una línea de contexto.
  const MON_L = { ARS: 'Pesos', USD: 'Dólares', EUR: 'Euros', GBP: 'Libras' };
  function kq(label, acc, { sub = '', tono = '', act = '' } = {}) {
    const e = Object.entries(acc || {}).filter(([, v]) => Math.abs(v) > 0.004).sort((a, b) => ['ARS', 'USD', 'EUR', 'GBP'].indexOf(a[0]) - ['ARS', 'USD', 'EUR', 'GBP'].indexOf(b[0]));
    const filas = (e.length ? e : [['ARS', 0]]).map(([c, v]) => '<div class="kq-r"><span class="kq-c">' + (MON_L[c] || c) + '</span><b class="' + (tono === 'auto' ? (v < -0.004 ? 'neg' : v > 0.004 ? 'pos' : '') : tono) + '">' + esc(money(v, c)) + '</b></div>');
    return '<div class="kq' + (act ? ' click' : '') + '"' + act + '><span class="kq-l">' + esc(label) + '</span>' + filas.join('') + (sub ? '<span class="kq-s">' + sub + '</span>' : '') + '</div>';
  }
  const kqs = items => '<section class="sheet kqs">' + items.join('') + '</section>';

  /* ---------- datos derivados ---------- */
  const cadm = cliente => AD.CA.get(cliente) || {};
  function abonoEnMes(a, m) {
    if (a.desde && a.desde > m) return false;
    if (a.hasta && a.hasta < m) return false;
    if (a.estado === 'Activo') return true;
    if (a.estado === 'Baja') return !!a.hasta;
    return false;
  }
  function precioEn(abonoId, m) {
    let best = null;
    for (const p of AD.PR) if (p.abono_id === abonoId && p.desde <= m && (!best || p.desde > best.desde)) best = p;
    return best;
  }
  const historial = abonoId => AD.PR.filter(p => p.abono_id === abonoId).sort((a, b) => b.desde.localeCompare(a.desde));
  function conceptoAbono(a, m) {
    const mes = cap(monthLabel(m).split(' ')[0]);
    if (a.tipo === 'Redes') return 'Redes sociales · plan ' + (a.plan || '') + ' · ' + mes;
    if (a.tipo === 'Ads') return 'Campañas de Ads · gestión ' + mes;
    return a.tipo + (a.plan ? ' · ' + a.plan : '') + ' · ' + mes;
  }
  function sugerencias(cliente, m) {
    const out = [];
    S.A.filter(a => a.cliente === cliente && abonoEnMes(a, m)).sort((a, b) => cmp(a.tipo, b.tipo)).forEach(a => {
      const p = precioEn(a._id, m);
      out.push({ inc: true, origen: 'Abono', ref: 'abono:' + a._id, concepto: conceptoAbono(a, m), monto: p ? String(p.monto) : '', moneda: p ? p.moneda : (cadm(cliente).moneda || 'ARS') });
      const af = AD.ABF.get(a._id);
      // Piezas extra de Redes que se cobran (si la cuenta las cobra o se marcaron una por una)
      if (a.tipo === 'Redes' && ctx.extrasACobrar) { const x = ctx.extrasACobrar(cliente, m); if (x && x.cob.length) {
        const cnt = {}; x.cob.forEach(z => { cnt[z.formato] = (cnt[z.formato] || 0) + 1; });
        const xm = (af && af.extras_moneda) || (p ? p.moneda : 'ARS');
        out.push({ inc: true, origen: 'Extras', ref: 'extras:' + a._id + ':' + m, concepto: 'Piezas extra fuera del plan · ' + Object.entries(cnt).map(([f, n]) => n + ' ' + (n === 1 ? f.replace(/es$/, '').replace(/s$/, '') : f)).join(', ') + ' · ' + cap(monthLabel(m).split(' ')[0]) + (x.faltaPrecio.length ? ' (falta precio de ' + x.faltaPrecio.join(', ') + ')' : ''), monto: x.total ? String(x.total) : '', moneda: xm }); } }
      if (a.tipo === 'Ads' && af && af.inversion && af.inversion_paga === 'àndale') out.push({ inc: true, origen: 'Pauta', ref: 'pauta:' + a._id + ':' + m, concepto: 'Inversión en pauta' + (af.plataformas ? ' (' + af.plataformas + ')' : '') + ' · ' + cap(monthLabel(m).split(' ')[0]), monto: String(af.inversion), moneda: af.inversion_moneda || 'ARS' });
    });
    S.P.filter(p => p.cliente === cliente).forEach(p => {
      AD.PF.filter(c => c.proyecto_id === p._id && c.periodo === m).forEach(c => out.push({ inc: true, origen: 'Proyecto', ref: 'pf:' + c.id, concepto: p.proyecto + (c.concepto ? ' · ' + c.concepto : ''), monto: c.monto == null ? '' : String(c.monto), moneda: c.moneda }));
    });
    // Tickets marcados "A facturar" que todavía no se facturaron (los de ese mes o de antes).
    ticketsAFacturar(cliente, m).forEach(t => out.push({ inc: true, origen: 'Ticket', ref: 'ticket:' + t._id, concepto: 'Ticket #' + t.numero + ' · ' + t.titulo, monto: t.monto === '' ? '' : String(t.monto), moneda: t.moneda || 'ARS' }));
    return out;
  }
  const ticketsAFacturar = (cliente, m) => (S.PD || []).filter(t => t.cliente === cliente && t.cobro === 'A facturar' && !t.facturado && t.estado !== 'Descartado' && String(t.cerrado || t.creado || '').slice(0, 7) <= m);
  const totalItems = items => items.filter(i => i.inc).reduce((s, i) => s + (parseMonto(i.monto) || 0), 0);
  /** Mes desde el que àndale usa la app para cobrar (Ajustes → Carga inicial). Antes de ese mes no se pide preparar nada. */
  function arranque() { const d = (AD.AJ && AD.AJ.operacion && AD.AJ.operacion.desde) || ''; return /^\d{4}-\d{2}$/.test(d) ? d : ''; }
  const antesDeArrancar = m => !!arranque() && m < arranque();
  function clientesDelMes(m) {
    const s = new Set();
    S.A.forEach(a => { if (abonoEnMes(a, m) && a.cliente) s.add(a.cliente); });
    AD.PF.forEach(c => { if (c.periodo === m) { const p = S.P.find(x => x._id === c.proyecto_id); if (p) s.add(p.cliente); } });
    AD.R.forEach(r => { if (r.periodo === m) s.add(r.cliente); });
    AD.F.forEach(f => { if (f.periodo === m) s.add(f.cliente); });
    (S.PD || []).forEach(t => { if (ticketsAFacturar(t.cliente, m).length) s.add(t.cliente); });
    return [...s].filter(Boolean).sort(cmp);
  }
  function estadoFactura(f) {
    if (f.saldo <= 0.009) return 'Pagada';
    if (f.vencimiento && f.vencimiento < today()) return 'Vencida';
    if (f.cobrado > 0) return 'Parcial';
    return 'Pendiente';
  }
  const EF_COLOR = { 'Pagada': '--s-entregado', 'Vencida': '--crit', 'Parcial': '--s-revision', 'Pendiente': '--s-empezar' };
  const VER_EF = { 'Parcial': 'Pagó una parte' };
  const efPill = f => pill(VER_EF[estadoFactura(f)] || estadoFactura(f), EF_COLOR[estadoFactura(f)]);
  // Solo para mostrar: los valores guardados no cambian.
  const VER_RES = { 'Sin armar': 'Sin preparar', 'Borrador': 'Preparado' };
  const verTipo = t => t === 'Invoice' ? 'Invoice' : t === 'Factura ARCA' ? 'Factura ARCA' : t;
  function cuenta(cliente, m) {
    const res = AD.R.find(r => r.cliente === cliente && r.periodo === m);
    const sug = sugerencias(cliente, m);
    const facs = AD.F.filter(f => f.cliente === cliente && f.periodo === m);
    const moneda = res ? res.moneda : (sug[0] && sug[0].moneda) || cadm(cliente).moneda || 'ARS';
    const total = res ? res.total : totalItems(sug);
    const emitido = facs.reduce((s, f) => s + f.monto, 0), cobrado = facs.reduce((s, f) => s + f.cobrado, 0);
    const gest = AD.G.filter(g => g.cliente === cliente && g.periodo === m).sort((a, b) => b.fecha.localeCompare(a.fecha));
    const rec = gest.find(g => g.tipo === 'Recordatorio de pago');
    return { cliente, m, res, sug, facs, moneda, total, emitido, cobrado, saldo: emitido - cobrado, gest, rec };
  }
  // Quién recibe resúmenes, facturas y recordatorios: los contactos marcados "Recibe cobros" (pueden ser varios).
  // Si nadie está marcado, el email de facturación o el del cliente, como antes.
  const cobrosDe = cliente => (ctx.contactos ? ctx.contactos(cliente) : []).filter(k => k.cobros && k.email);
  const pnom = v => String(v || '').split(/[,/]/)[0].trim().split(' ')[0];
  const contactoDe = cliente => {
    const ks = cobrosDe(cliente);
    if (ks.length) { const n = [...new Set(ks.map(k => pnom(k.nombre)).filter(x => x && !/^administraci/i.test(x)))]; return n.length === 1 ? n[0] : n.length === 2 ? n.join(' y ') : ''; }
    const c = S.C.find(x => x.nombre === cliente) || {}; return pnom(c.contacto);
  };

  /* ---------- carga ---------- */
  async function load() {
    syncMonedas();
    try { Object.assign(AD, await data.loadAdmin(), { ok: true }); if (!AD.mesTocado && arranque() && AD.mes < arranque()) AD.mes = arranque(); if (AD.pg && !AD.pg.tocado && arranque() && AD.pg.mes < arranque()) AD.pg.mes = arranque(); }
    catch (err) { AD.ok = false; toast('Administración: ' + err.message); }
  }

  /* ---------- Vista: Cierre de mes ---------- */
  function vCierre() {
    if (AD.sel && AD.rd) return vCuenta();
    const m = AD.mes, cl = clientesDelMes(m), rows = cl.map(c => cuenta(c, m));
    const aFacturar = {}, emitido = {}, cobrado = {};
    rows.forEach(r => { add(aFacturar, r.moneda, r.total); r.facs.forEach(f => { add(emitido, f.moneda, f.monto); add(cobrado, f.moneda, f.cobrado); }); });
    const pendientes = {}; rows.forEach(r => r.facs.forEach(f => add(pendientes, f.moneda, f.saldo)));
    const env = rows.filter(r => r.res && r.res.estado === 'Enviado').length, conComp = rows.filter(r => r.facs.length).length;
    let h = '<div class="head"><div>' + lock + '<h1>Cobros del mes</h1><p>Para cada cliente: resumen, factura y cobro.</p></div>' +
      '<div class="toolbar"><div class="cal-h"><h2 style="min-width:170px">' + esc(cap(monthLabel(m))) + '</h2><button class="btn sm" data-act="aMes" data-d="-1" aria-label="Mes anterior">←</button><button class="btn sm" data-act="aMes" data-d="0">Este mes</button><button class="btn sm" data-act="aMes" data-d="1" aria-label="Mes siguiente">→</button></div>' + (ctx.autoBtn ? ctx.autoBtn('cobros') : '') + '</div></div>';
    if (antesDeArrancar(m)) {
      const hechos = rows.filter(r => r.res);
      h += '<section class="callout"><p><b>Con la app arrancamos en ' + esc(monthLabel(arranque())) + '.</b> ' + esc(cap(monthLabel(m))) + ' se cobra como hasta ahora: acá no hace falta preparar nada.</p><button class="btn primary" data-act="aMesIr" data-m="' + esc(arranque()) + '">Ir a ' + esc(monthLabel(arranque()).split(' ')[0]) + '</button></section>';
      if (hechos.length) h += '<section class="sheet"><div class="sheet-h"><h2>Resúmenes cargados de este mes</h2><span class="muted">' + hechos.length + '</span></div><div class="rows">' + hechos.map(r => '<button class="row" data-act="aCuenta" data-cliente="' + esc(r.cliente) + '"><span class="t"><b>' + esc(r.cliente) + '</b><span>' + esc(r.res.estado === 'Enviado' ? 'Enviado' : 'Preparado') + ' · si fue un error, abrilo y en Más → Borrar este resumen</span></span></button>').join('') + '</div></section>';
      return h;
    }
    // A fin de mes se arman los resúmenes del mes que viene (se pagan del 1 al 5): atajo para no quedarse en el mes equivocado.
    if (m === thisMonth() && +today().slice(8, 10) >= 20) { const sig = addMonth(m, 1); h += '<section class="callout"><p><b>¿Armando los resúmenes de ' + esc(monthLabel(sig).split(' ')[0]) + '?</b> Los que se mandan a fin de mes son del mes que viene.</p><button class="btn primary" data-act="aMes" data-d="1">Ir a ' + esc(monthLabel(sig).split(' ')[0]) + '</button></section>'; }
    h += epCard(m);
    h += '<section class="kpis">' +
      '<div class="kpi"><span class="eyebrow">A facturar</span><b style="font-size:22px;color:var(--money)">' + esc(multi(aFacturar)) + '</b><span>' + cl.length + ' clientes</span></div>' +
      '<div class="kpi"><span class="eyebrow">Resúmenes enviados</span><b>' + env + '</b><span>de ' + cl.length + '</span></div>' +
      '<div class="kpi"><span class="eyebrow">Facturas hechas</span><b>' + conComp + '</b><span>' + esc(multi(emitido)) + '</span></div>' +
      '<div class="kpi ' + (Object.keys(pendientes).some(k => pendientes[k] > 0.009) ? 'warn' : '') + '"><span class="eyebrow">Cobrado</span><b style="font-size:22px;color:var(--money)">' + esc(multi(cobrado)) + '</b><span>falta cobrar ' + esc(multi(pendientes)) + '</span></div>' +
      '</section>';
    h += AS.pendientesHtml(m);
    const step = (ok, txt, warn) => pill(txt, ok ? '--s-entregado' : warn ? '--crit' : '--s-empezar');
    const tr = rows.map(r => {
      const resTxt = r.res ? (r.res.estado === 'Enviado' ? step(true, 'Enviado ' + fmt(r.res.enviado_el || '').slice(0, 5)) + vistoChip(mailDe(r.cliente, 'Resumen de cuenta', m)) : step(false, 'Preparado')) : step(false, 'Sin preparar');
      const compTxt = r.facs.length ? step(true, r.facs.map(f => (f.tipo === 'Invoice' ? 'Factura al exterior ' : 'Factura ') + (f.numero || 'sin número') + (f.emisor ? ' · ' + f.emisor : '')).join(', ')) : step(false, 'Sin facturar');
      const venc = r.facs.some(f => estadoFactura(f) === 'Vencida');
      const cobTxt = !r.facs.length ? '<span class="muted">—</span>' : r.saldo <= 0.009 ? step(true, 'Cobrado') : step(false, (r.cobrado > 0 ? 'Debe ' : 'Pendiente ') + money(r.saldo, r.moneda), venc);
      const recTxt = r.rec ? '<span class="muted">' + fmt(r.rec.fecha) + '</span>' : (venc ? '<span class="days late">Mandar</span>' : '<span class="muted">—</span>');
      return '<tr class="click" data-act="aCuenta" data-cliente="' + esc(r.cliente) + '"><td class="name">' + esc(r.cliente) + '</td><td class="r"><span class="money"' + (r.res ? '' : ' style="opacity:.7"') + '>' + money(r.total, r.moneda) + '</span>' + (r.res ? '' : '<span class="sub">estimado</span>') + '</td><td>' + resTxt + '</td><td>' + compTxt + '</td><td>' + cobTxt + '</td><td>' + recTxt + '</td></tr>';
    }).join('');
    h += '<section class="sheet"><div class="sheet-h"><h2>Clientes del mes</h2><div class="toolbar"><button class="btn sm primary" data-act="aMailResumenes">Enviar resúmenes por email</button>' + (epDe(m) ? '' : '<button class="btn sm" data-act="epNuevo">' + (ICON.calendario || '') + 'Programar envío</button>') + '' + masMenu(['<div class="mm-otro"><label class="lbl" for="a-otro">Cuenta de otro cliente</label><span style="display:flex;gap:6px"><select class="in" id="a-otro" aria-label="Otro cliente">' + clienteOpts('', 'Elegí un cliente…') + '</select><button class="btn sm" data-act="aCuentaOtro">Abrir</button></span></div>', { act: 'aCSV', label: 'Descargar planilla (CSV)', icon: 'csv' }]) + '</div></div>' +
      (tr ? '<div class="tbl"><table><thead><tr><th>Cliente</th><th class="r">Total</th><th>Resumen</th><th>Factura</th><th>Cobro</th><th>Recordatorio</th></tr></thead><tbody>' + tr + '</tbody></table></div>' : emptyBox('Nada para facturar en ' + monthLabel(m), 'Cargá precios en los abonos activos o meses de cobro en los proyectos.')) + '</section>';
    return h;
  }

  function openCuenta(cliente, m) {
    const r = AD.R.find(x => x.cliente === cliente && x.periodo === m);
    if (r) AD.rd = { id: r.id, numero: r.numero || '', cliente, m, moneda: r.moneda, items: r.items.map(i => ({ inc: !!i.inc, origen: i.origen || 'Manual', ref: i.ref || '', concepto: i.concepto || '', monto: i.monto == null ? '' : String(i.monto) })), nota: r.nota || '', estado: r.estado, enviado_el: r.enviado_el || '', link_pdf: r.link_pdf || '' };
    else { const sug = sugerencias(cliente, m); AD.rd = { id: null, cliente, m, moneda: (sug[0] && sug[0].moneda) || cadm(cliente).moneda || 'ARS', items: sug.map(s => ({ inc: true, origen: s.origen, ref: s.ref, concepto: s.concepto, monto: s.monto })), nota: '', estado: 'Sin armar', enviado_el: '', link_pdf: '' }; }
    AD.sel = cliente; AD.mes = m; S.view = 'cierre';
    try { history.replaceState(null, '', '#cierre'); } catch (e) { }
    ctx.render(); window.scrollTo(0, 0);
  }
  function resumenTexto(rd) {
    const inc = rd.items.filter(i => i.inc && i.concepto.trim());
    return 'Resumen de cuenta · ' + cap(monthLabel(rd.m)) + '\n' + rd.cliente + '\n\n' + inc.map(i => '• ' + i.concepto.trim() + ': ' + money(parseMonto(i.monto), rd.moneda)).join('\n') + '\n\nTotal: ' + money(totalItems(rd.items), rd.moneda) + (rd.nota.trim() ? '\n\n' + rd.nota.trim() : '') + '\n\nàndale';
  }
  function recordatorioTexto(c) {
    const nombre = contactoDe(c.cliente);
    const venc = c.facs.filter(f => f.saldo > 0.009);
    const det = venc.map(f => (f.tipo === 'Invoice' ? 'invoice' : 'factura') + (f.numero ? ' N° ' + f.numero : '') + ' por ' + money(f.saldo, f.moneda) + (f.vencimiento ? ' (vencimiento ' + fmt(f.vencimiento) + ')' : '')).join('; ');
    return 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás? Te escribimos de àndale para recordarte que está pendiente el pago de ' + monthLabel(c.m) + ': ' + (det || money(c.total, c.moneda)) + '. Si ya lo abonaste, desestimá este mensaje. ¡Gracias!';
  }

  function vCuenta() {
    const rd = AD.rd, c = cuenta(rd.cliente, rd.m), ca = cadm(rd.cliente);
    const sug = sugerencias(rd.cliente, rd.m).filter(s => !rd.items.some(i => i.ref && i.ref === s.ref));
    const sent = rd.estado === 'Enviado';
    const items = rd.items.map((it, i) => '<div class="ri' + (it.inc ? '' : ' off') + '" style="display:grid;grid-template-columns:24px minmax(0,1fr) 150px 30px;gap:10px;align-items:center;padding:8px 16px;border-bottom:1px solid var(--line);' + (it.inc ? '' : 'opacity:.5') + '"><input type="checkbox" aria-label="Incluir" id="ri-' + i + '-inc" data-ri="' + i + '" data-rik="inc"' + (it.inc ? ' checked' : '') + '><div class="field" style="gap:2px"><input type="text" id="ri-' + i + '-c" data-ri="' + i + '" data-rik="concepto" value="' + esc(it.concepto) + '" placeholder="Concepto"><span class="hint">' + esc(it.origen || 'Manual') + '</span></div><div class="field"><input type="text" style="text-align:right" inputmode="decimal" id="ri-' + i + '-m" data-ri="' + i + '" data-rik="monto" value="' + esc(it.monto) + '" placeholder="Monto"></div><button class="btn ghost sm" data-act="aRiDel" data-i="' + i + '" aria-label="Quitar línea">✕</button></div>').join('');
    const facs = c.facs.map(f => '<div class="row" style="cursor:default;grid-template-columns:92px minmax(0,1fr)"><span class="d">' + fmt(f.fecha) + '</span><span class="t"><b>' + esc(verTipo(f.tipo)) + ' ' + esc(f.numero || 'sin número') + (f.emisor ? ' · ' + esc(f.emisor) : '') + '</b><span><span class="money">' + money(f.monto, f.moneda) + '</span> · cobrado ' + money(f.cobrado, f.moneda) + (f.vencimiento ? ' · vence ' + fmt(f.vencimiento) : '') + (f.link_pdf ? ' · <a href="' + esc(f.link_pdf) + '" target="_blank" rel="noopener">PDF</a>' : '') + '</span><span class="toolbar" style="margin-top:8px;flex-wrap:wrap">' + efPill(f) + (f.saldo > 0.009 ? '<button class="btn sm" data-act="aCobro" data-id="' + esc(f.id) + '">Registrar cobro</button>' : '') + '<button class="btn sm" data-act="aMailFactura" data-id="' + esc(f.id) + '">Enviar</button><button class="btn ghost sm" data-act="aFactura" data-id="' + esc(f.id) + '">Editar</button></span></span></div>').join('');
    const gest = c.gest.map(g => '<div class="row" style="cursor:default"><span class="d">' + fmt(g.fecha) + '</span><span class="t"><b>' + esc(g.tipo) + '</b><span>' + esc([g.canal, g.persona, g.nota].filter(Boolean).join(' · ')) + '</span></span><button class="btn ghost sm" data-act="aGestDel" data-id="' + esc(g.id) + '" aria-label="Borrar">✕</button></div>').join('');
    return '<button class="btn ghost sm" data-act="aBack" style="justify-self:start">← Cobros de ' + esc(monthLabel(rd.m)) + '</button>' +
      '<div class="head"><div>' + lock + '<h1>' + esc(rd.cliente) + '</h1><p style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">Cuenta de <b style="color:var(--fg)">' + esc(cap(monthLabel(rd.m))) + '</b>' + (ca.cuit ? ' · CUIT ' + esc(ca.cuit) : '') + (ca.carpeta_admin ? ' · <a href="' + esc(ca.carpeta_admin) + '" target="_blank" rel="noopener">Carpeta de administración</a>' : '') + '</p></div>' +
      '<div class="toolbar"><button class="btn" data-act="aClienteAdm" data-cliente="' + esc(rd.cliente) + '">Datos de facturación</button></div></div>' +
      '<div class="grid2"><div class="stack">' +
      '<section class="sheet"><div class="sheet-h"><h2>1 · Resumen de cuenta</h2><span class="toolbar">' + pill(VER_RES[rd.estado] || rd.estado, rd.estado === 'Enviado' ? '--s-entregado' : rd.estado === 'Borrador' ? '--s-revision' : '--s-empezar') + '<label class="muted" for="rd-mon">Moneda</label><select class="in" id="rd-mon" data-rdk="moneda">' + optsFrom(MONEDAS, rd.moneda) + '</select></span></div>' +
      '<div>' + (items || emptyBox('Sin líneas', 'Agregá una línea o sumá una sugerencia.')) + '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:14px 16px;font-family:var(--f-display);font-size:22px;font-weight:700"><span>Total</span><span class="money" style="font-size:26px">' + money(totalItems(rd.items), rd.moneda) + '</span></div>' +
      (sug.length ? '<div style="border-top:1px solid var(--line)">' + sug.map(s => '<div class="row" style="cursor:default"><span class="d">' + esc(s.origen) + '</span><span class="t"><b>' + esc(s.concepto) + '</b><span>' + (s.monto ? money(parseMonto(s.monto), s.moneda) : 'sin monto') + '</span></span><button class="btn sm" data-act="aSugAdd" data-ref="' + esc(s.ref) + '">Agregar</button></div>').join('') + '</div>' : '') +
      '<div class="sheet-b" style="display:grid;gap:10px;border-top:1px solid var(--line)"><div class="field"><label for="rd-nota">Nota al pie</label><textarea id="rd-nota" rows="2" data-rdk="nota" placeholder="Ej.: datos de pago, vencimiento">' + esc(rd.nota) + '</textarea></div>' +
      '<div class="field"><label for="rd-pdf">Link al PDF del resumen (Drive)</label><input id="rd-pdf" data-rdk="link_pdf" value="' + esc(rd.link_pdf) + '" placeholder="https://drive.google.com/..."></div>' +
      '<div class="toolbar"><button class="btn sm" data-act="aRiAdd">+ Agregar línea</button></div>' +
      '<div class="toolbar res-acc"><button class="btn" data-act="aResSave" data-estado="' + (sent ? 'Enviado' : 'Borrador') + '">Guardar' + (sent ? ' cambios' : '') + '</button><button class="btn" data-act="aPrint">Ver PDF</button>' + (sent ? '' : '<button class="btn primary" data-act="aMailResumen">Enviar por email</button>') +
      '<details class="share"><summary class="btn ghost" title="Más opciones">Más</summary><div class="menu-pop">' + (sent ? '<button class="btn ghost sm" data-act="aMailResumen">Volver a mandarlo por email</button>' : '') + '<button class="btn ghost sm" data-act="aCopy" data-what="resumen">Copiar el texto (para WhatsApp)</button>' + (sent ? '<button class="btn ghost sm" data-act="aResSave" data-estado="Borrador">Volver a editar</button>' : '<button class="btn ghost sm" data-act="aResSave" data-estado="Enviado">Ya lo mandé por otro lado</button>') + (rd.id ? '<button class="btn ghost sm danger" data-act="aResDel">Borrar este resumen</button>' : '') + '</div></details></div></div></section></div>' +
      '<div class="stack">' +
      '<section class="sheet"><div class="sheet-h"><h2>2 · Facturas</h2><button class="btn sm primary" data-act="aFactura">+ Factura</button></div>' + (facs ? '<div class="rows">' + facs + '</div>' : emptyBox('Sin facturas este mes', 'Cargá la factura con su número y el link al PDF.')) +
      (c.facs.length ? '<div class="count">Facturado <b class="money">' + money(c.emitido, c.moneda) + '</b> · cobrado <b class="money">' + money(c.cobrado, c.moneda) + '</b> · falta cobrar <b class="money">' + money(c.saldo, c.moneda) + '</b></div>' : '') + '</section>' +
      '<section class="sheet"><div class="sheet-h"><h2>3 · Avisos de cobro</h2><span class="toolbar"><button class="btn sm" data-act="aRecordatorio">Recordatorio de pago</button><button class="btn sm" data-act="aMailLibre">Email</button><button class="btn sm" data-act="aGest">+ Anotar aviso</button></span></div>' + (gest ? '<div class="rows">' + gest + '</div>' : emptyBox('Todavía no se le avisó nada', 'Los envíos de resumen, de factura y los recordatorios quedan acá con fecha.')) + '</section>' +
      '</div></div>';
  }

  async function saveResumen(estado, opts = {}) {
    const rd = AD.rd; const cid = data.ids.cliente(rd.cliente); if (!cid) { toast('Cliente no encontrado'); return; }
    const items = rd.items.filter(i => i.concepto.trim() || i.monto).map(i => ({ inc: !!i.inc, origen: i.origen || 'Manual', ref: i.ref || '', concepto: i.concepto.trim(), monto: parseMonto(i.monto) }));
    const row = { cliente_id: cid, periodo: rd.m + '-01', moneda: rd.moneda, items, total: r2(totalItems(rd.items)), nota: rd.nota.trim(), estado, enviado_el: estado === 'Enviado' ? (rd.enviado_el || today()) : null, link_pdf: rd.link_pdf.trim() };
    try {
      if (rd.id) await data.upd('resumenes', rd.id, row); else { const nr = await data.ins('resumenes', row); rd.id = nr.id; rd.numero = nr.numero || ''; }
      // Los tickets incluidos en el resumen quedan como facturados.
      const tks = items.filter(i => i.inc && String(i.ref).startsWith('ticket:')).map(i => i.ref.slice(7));
      if (tks.length && data.pedidosUpd) await data.pedidosUpd(tks, { facturado: true });
      if (estado === 'Enviado' && rd.estado !== 'Enviado' && !opts.sinGestion) await data.ins('gestiones', { cliente_id: cid, periodo: rd.m + '-01', tipo: 'Resumen de cuenta', fecha: today(), canal: 'Email', persona_id: data.ids.persona(S.me.alias) });
      rd.estado = estado; rd.enviado_el = row.enviado_el || '';
      if (!opts.silencioso) { toast(estado === 'Enviado' ? 'Resumen marcado como enviado' : 'Resumen guardado'); await ctx.reload(); }
    } catch (err) { if (opts.silencioso) throw err; toast(err.message); }
  }

  /* ---------- PDF y emails con la marca ---------- */
  const cfgMarca = () => (AD.AJ && AD.AJ.resumen_pdf) || {};
  const periodoTit = m => cap(monthLabel(m).replace(' de ', ' '));
  const periodoTxt = m => monthLabel(m).replace(' de ', ' ');
  const contactoFull = cliente => { const k = cobrosDe(cliente).find(x => x.nombre && !/^administraci/i.test(x.nombre)); return k ? k.nombre.trim() : ((S.C.find(x => x.nombre === cliente) || {}).contacto || '').split(/[,/]/)[0].trim(); };
  const mailsDe = cliente => {
    const c = S.C.find(x => x.nombre === cliente) || {}, ks = cobrosDe(cliente);
    const l = ks.length ? ks.map(k => k.email) : [cadm(cliente).email_facturacion || c.email || ''];
    return [...new Set(l.flatMap(x => String(x).split(/[,;\s]+/)).map(x => x.trim().toLowerCase()).filter(Boolean))].join(', ');
  };
  // Firma del mail que se está armando: AD.firmante = alias de quien firma, '' = sin firma (se elige en cada mail).
  const firma = () => (AD.firmante === '' ? null : firmaDe(S, AD.firmante || undefined));
  const firmaBox = () => '<div class="field full"><label for="mail-firma">Firma</label>' + firmaSelect('mail-firma', S, AD.firmante, esc) + '<span class="hint">Quién firma este mail. El de cada tipo se elige en Configuración › Opciones.</span></div>';
  const pdfLib = () => import('./docs.js');
  const estiloDoc = () => ((AD.AJ && AD.AJ.documentos) || {}).estilo || 'editorial';
  const hoyDMY = () => { const [y, m, d] = today().split('-'); return d + '/' + m + '/' + y; };
  const itemsDe = r => r.items.filter(i => i.inc && String(i.concepto || '').trim()).map(i => ({ concepto: String(i.concepto).trim(), monto: parseMonto(i.monto) || 0 }));
  const cfgDocs = () => ({ ...cfgMarca(), emisores: (AD.AJ && AD.AJ.emisores) || {} });
  const datosClienteDoc = cliente => { const c = S.C.find(x => x.nombre === cliente) || {}, a = cadm(cliente) || {};
    return { razon_social: a.razon_social || '', cuit: fmtCuit(a.cuit || ''), condicion_iva: a.condicion_iva || '', domicilio: a.domicilio || '', email: mailsDe(cliente).split(', ')[0] || '' }; };
  async function pdfResumen(r) { // r: { id?, numero?, cliente, m, moneda, items, nota }
    const { resumenDoc, bytesBase64 } = await pdfLib();
    // El número lo pone la base al guardar: si es el borrador abierto y todavía no se guardó, se guarda antes.
    if (!r.id && r === AD.rd) { try { await saveResumen(r.estado || 'Borrador', { silencioso: true }); } catch (e) { /* sale sin número */ } }
    const numero = r.numero || ((AD.R || []).find(x => x.id === r.id) || {}).numero || '';
    const items = itemsDe(r);
    const bytes = await resumenDoc({ cfg: cfgDocs(), estilo: estiloDoc(), emitido: hoyDMY(), numero, emisor: cadm(r.cliente).emisor_default || '', cliente: datosClienteDoc(r.cliente), contacto: contactoFull(r.cliente), cuenta: r.cliente, periodo: periodoTit(r.m), moneda: r.moneda, items, total: r2(items.reduce((a, i) => a + i.monto, 0)), nota: r.nota || '' });
    return { bytes, nombre: 'Resumen-' + (numero ? numero + '-' : '') + r.cliente + '-' + periodoTit(r.m) + '.pdf', base64: bytesBase64(bytes) };
  }
  async function printResumen() {
    const rd = AD.rd; if (!itemsDe(rd).length) { toast('El resumen no tiene ítems'); return; }
    const w = window.open('', '_blank');
    try { const { abrirPdf } = await pdfLib(); const p = await pdfResumen(rd); abrirPdf(p.bytes, p.nombre.replace(/\.pdf$/, ''), w); }
    catch (err) { if (w) w.close(); toast(err.message); }
  }

  // Compositor: vista previa en vivo del email con la marca, edición de destinatarios, asunto y mensaje.
  let prevT;
  function openComposer(o) {
    AD.firmante = o.firmante !== undefined ? o.firmante : firmanteDe(S, o.tipo);
    const base = o.build({ mensaje: o.mensaje || '', ...(o.values || {}) });
    const vals = Object.assign({ para: o.para || '', cc: '', asunto: o.asunto || base.asunto, mensaje: o.mensaje || '', copia: true }, o.values || {});
    const adj = o.adjuntos || [];
    openPanel({
      title: o.titulo, eyebrow: o.eyebrow || 'Enviar email', saveLabel: 'Enviar', busyLabel: 'Enviando…', composer: o,
      intro: 'Sale desde <b>administracion@weareandale.com</b>. Las respuestas del cliente llegan a esa casilla.' + (o.intro2 ? '<br><b>' + esc(o.intro2) + '</b>' : ''),
      values: vals,
      fields: [
        { k: 'para', label: 'Para', req: 1, full: 1, hint: (vals.para ? 'Email de facturación del cliente. ' : 'Este cliente no tiene email cargado. ') + 'Varios, separados por coma.', ph: 'cliente@empresa.com' },
        { k: 'cc', label: 'CC', full: 1, ph: 'Opcional' },
        { k: 'asunto', label: 'Asunto', req: 1, full: 1 },
        ...(o.extraFields || []),
        { k: 'mensaje', label: 'Mensaje', type: 'textarea', rows: 7, full: 1 },
        { k: 'copia', label: 'Mandarme una copia a administracion@weareandale.com', type: 'check' },
      ],
      extra: '<div class="field full" id="mail-adj">' + adjHtml(adj, o) + '</div>' + firmaBox() +
        '<div class="field full"><span class="lbl">Vista previa</span><iframe id="mail-prev" title="Vista previa del email" style="width:100%;height:560px;border:1px solid var(--line);border-radius:8px;background:#f1f1f1"></iframe></div>' +
        '<div class="toolbar" style="grid-column:1/-1"><button type="button" class="btn sm" data-act="aMailCopy">Copiar texto (WhatsApp)</button>' + (o.extraBtns || '') + '</div>',
      onSave: async v => {
        if (o.pideAdjunto && !adj.length && !AD.sinAdjOk) { AD.sinAdjOk = true; throw new Error('No tiene el PDF adjunto: adjuntalo con “Adjuntar archivo”. Si igual querés mandarlo así, tocá Enviar otra vez.'); }
        const b = o.build(v);
        const r = await data.sendEmail({ tipo: o.tipo, cliente_id: o.cliente ? data.ids.cliente(o.cliente) : null, periodo: o.periodo ? o.periodo + '-01' : null, factura_id: o.factura_id || null,
          para: v.para, cc: v.cc, asunto: v.asunto, html: b.html, texto: b.texto, copia: v.copia, adjuntos: adj.map(a => ({ nombre: a.nombre, base64: a.base64 })), firmante_id: AD.firmante ? personaIdDe(S, AD.firmante) : null });
        if (o.onSent) await o.onSent(v, r);
        toast('Email enviado a ' + v.para);
      },
    });
    AD.adj = adj; AD.sinAdjOk = false;
    refreshPreview();
  }
  const adjHtml = (adj, o) => (adj.length || (o && o.adjuntar) ? '<span class="lbl">Adjuntos</span><div class="tags" style="gap:6px;align-items:center">' + adj.map((a, i) => '<span class="adj-ch"><button type="button" class="btn sm" data-act="aAdjVer" data-i="' + i + '">' + ICON.clip + esc(a.nombre) + '</button><button type="button" class="btn ghost sm" data-act="aAdjQuitar" data-i="' + i + '" aria-label="Quitar adjunto">✕</button></span>').join('') +
    ((o && o.adjuntar) || adj.length ? '<label class="btn sm ghost">' + ICON.clip + 'Adjuntar archivo<input type="file" data-mailadj="1" accept="application/pdf,image/*" multiple hidden></label>' : '') + '</div>' : '');
  // Cambiar quién firma el mail que se está armando
  document.addEventListener('change', e => { if (e.target && e.target.id === 'mail-firma') { AD.firmante = e.target.value; refreshPreview(); } });
  // Adjuntar desde la compu (por ejemplo el PDF de la factura de ARCA).
  document.addEventListener('change', async e => {
    const t = e.target; if (!t.dataset || !t.dataset.mailadj || !AD.form || !AD.form.composer) return;
    const files = [...t.files]; t.value = '';
    for (const f of files) {
      if (f.size > 8e6) { toast(f.name + ' pesa más de 8 MB'); continue; }
      const bytes = new Uint8Array(await f.arrayBuffer()); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      AD.adj.push({ nombre: f.name, base64: btoa(bin), bytes });
    }
    const box = $('#mail-adj'); if (box) box.innerHTML = adjHtml(AD.adj, AD.form.composer);
    const m = $('#af-mensaje');
    if (m && AD.form.composer.tipo === 'Factura enviada' && AD.adj.length && !/adjunt/i.test(m.value)) { m.value = m.value.replace(/(\n\n¡Gracias!)?\s*$/, '\n\nTe la adjuntamos en este mail.$1'); refreshPreview(); }
    toast(files.length === 1 ? 'Adjunto: ' + files[0].name : files.length + ' archivos adjuntos');
  });
  function composerValues() {
    const o = AD.form && AD.form.composer; if (!o) return null;
    const v = {}; for (const f of AD.form.fields) { const el = $('#af-' + f.k); if (el) v[f.k] = f.type === 'check' ? el.checked : el.value; }
    return v;
  }
  function refreshPreview() {
    const o = AD.form && AD.form.composer, fr = $('#mail-prev'); if (!o || !fr) return;
    const v = composerValues(); fr.srcdoc = o.build(v).html.split(E.APP_URL).join(location.origin); // imágenes del deploy actual en la vista previa
  }

  // Envío masivo: misma plantilla para varios clientes, uno por uno, con su PDF si corresponde.
  function openBulk(o) {
    AD.firmante = firmanteDe(S, o.tipo || 'Resumen de cuenta');
    const conMail = o.items.filter(i => i.para);
    openPanel({
      title: o.titulo, eyebrow: 'Envío por email', saveLabel: 'Enviar', busyLabel: 'Enviando…',
      intro: 'Se manda un email a cada cliente con sus propios datos. En el mensaje podés usar <b>{nombre}</b>, <b>{cuenta}</b> y <b>{periodo}</b>. ' + (o.items.length - conMail.length ? '<b>' + (o.items.length - conMail.length) + '</b> sin email cargado quedan afuera.' : ''),
      values: { asunto: o.asunto, mensaje: o.mensaje, copia: true },
      fields: [
        { k: 'asunto', label: 'Asunto', req: 1, full: 1 },
        { k: 'mensaje', label: 'Mensaje', type: 'textarea', rows: 7, full: 1 },
        { k: 'copia', label: 'Mandarme copia de cada uno', type: 'check' },
      ],
      extra: '<div class="field full"><span class="lbl">Destinatarios</span><div class="rows" style="border:1px solid var(--line);border-radius:8px">' +
        o.items.map((it, i) => '<label class="row" style="cursor:pointer"><input type="checkbox" data-bulk="' + i + '"' + (it.para ? ' checked' : ' disabled') + '><span class="t"><b>' + esc(it.label) + '</b><span>' + esc(it.para || 'sin email · cargalo en Datos de facturación') + (it.sub ? ' · ' + esc(it.sub) : '') + '</span></span><span class="days far" id="bulk-st-' + i + '"></span></label>').join('') + '</div></div>' +
        firmaBox() + '<p class="formnote" id="bulk-prog" style="grid-column:1/-1" aria-live="polite"></p>',
      onSave: async v => {
        const sel = o.items.map((it, i) => [it, i]).filter(([it, i]) => it.para && ($('[data-bulk="' + i + '"]') || {}).checked);
        if (!sel.length) throw new Error('No hay destinatarios seleccionados');
        const fails = []; let n = 0;
        for (const [it, i] of sel) {
          const st = $('#bulk-st-' + i), prog = $('#bulk-prog');
          if (prog) prog.textContent = 'Enviando ' + (++n) + ' de ' + sel.length + '…';
          const fill = t => String(t || '').replace(/\{nombre\}/g, it.nombre || '').replace(/\{cuenta\}/g, it.label).replace(/\{periodo\}/g, it.periodo || '').replace(/ \(un ajuste del \{pct\}%\)/g, it.pct ? ' (un ajuste del ' + it.pct + '%)' : '').replace(/\{pct\}/g, it.pct || '').replace(/\n\nEl motivo: \{motivo\}\./g, it.motivo ? '\n\nEl motivo: ' + it.motivo + '.' : '').replace(/\{motivo\}/g, it.motivo || '').replace(/Hola ,/g, 'Hola,');
          try { await o.send(it, { asunto: fill(v.asunto), mensaje: fill(v.mensaje), copia: v.copia }); if (st) { st.textContent = '✓ Enviado'; st.className = 'days'; st.style.color = 'var(--ok)'; } }
          catch (err) { fails.push(it.label + ': ' + err.message); if (st) { st.textContent = 'Error'; st.className = 'days late'; } }
          await new Promise(r => setTimeout(r, 600)); // Resend: máx. 2 por segundo
        }
        if (fails.length) { await ctx.reload(); throw new Error(fails.length + ' sin enviar. ' + fails[0]); }
        toast(sel.length + ' emails enviados');
      },
    });
  }

  function servicioDe(a) { return a.tipo === 'Redes' ? 'Redes sociales' + (a.plan ? ' · plan ' + a.plan : '') : a.tipo === 'Ads' ? 'Ads (gestión de campañas)' : a.tipo; }
  const motivoReal = mt => { const x = String(mt || '').trim(); return /^aumento\s*[\d.,]+\s*%?$/i.test(x) ? '' : x; };
  function datosAviso(p) {
    const a = S.A.find(x => x._id === p.abono_id); if (!a) return null;
    const prev = AD.PR.filter(x => x.abono_id === a._id && x.desde < p.desde).sort((x, y) => y.desde.localeCompare(x.desde))[0];
    const pct = prev && prev.monto ? String(Math.round((p.monto / prev.monto - 1) * 1000) / 10).replace('.', ',') : '';
    return { a, prev, pct };
  }

  function bulkRecordatorios() {
      const porCliente = new Map();
      AD.F.filter(f => estadoFactura(f) === 'Vencida').forEach(f => { if (!porCliente.has(f.cliente)) porCliente.set(f.cliente, []); porCliente.get(f.cliente).push(f); });
      if (!porCliente.size) return null;
      const items = [...porCliente.entries()].sort((a, b) => cmp(a[0], b[0])).map(([cliente, fs]) => {
        const moneda = fs[0].moneda, mismas = fs.filter(f => f.moneda === moneda), m = mismas.map(f => f.periodo).filter(Boolean).sort().pop() || thisMonth();
        const ult = AD.G.filter(g => g.cliente === cliente && g.tipo === 'Recordatorio de pago').sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
        return { label: cliente, nombre: contactoDe(cliente), para: mailsDe(cliente), periodo: periodoTxt(m), m, moneda, fs: mismas, sub: multi(fs.reduce((acc, f) => add(acc, f.moneda, f.saldo), {})) + (ult ? ' · último recordatorio ' + fmt(ult.fecha) : '') };
      });
      return {
        titulo: 'Recordatorios de pago', asunto: 'Recordatorio de pago · {cuenta}', mensaje: E.textos.recordatorio({ nombre: '{nombre}', periodo: '{periodo}' }), items,
        send: async (it, v) => {
          const pend = it.fs.map(f => ({ concepto: f.tipo + ' ' + (f.numero || 'sin número') + (f.vencimiento ? ' · venció ' + fmt(f.vencimiento) : ''), monto: f.saldo }));
          const b = E.recordatorioEmail({ cfg: cfgMarca(), contacto: contactoFull(it.label), cuenta: it.label, periodo: periodoTit(it.m), moneda: it.moneda, pendientes: pend, total: r2(pend.reduce((a, i) => a + i.monto, 0)), mensaje: v.mensaje, firma: firma(), asunto: v.asunto });
          await data.sendEmail({ tipo: 'Recordatorio de pago', cliente_id: data.ids.cliente(it.label), periodo: it.m + '-01', factura_id: it.fs.length === 1 ? it.fs[0].id : null, para: it.para, asunto: v.asunto, html: b.html, texto: b.texto, copia: v.copia });
        },
      };
  }
  function bulkResumenes(m) {
      const rs = AD.R.filter(r => r.periodo === m && r.estado !== 'Enviado' && itemsDe(r).length).sort((a, b) => cmp(a.cliente, b.cliente));
      if (!rs.length) return null;
      return {
        titulo: 'Resúmenes de ' + periodoTit(m), asunto: 'Resumen de cuenta · {cuenta} · ' + periodoTit(m), mensaje: E.textos.resumen({ nombre: '{nombre}', periodo: periodoTxt(m) }),
        items: rs.map(r => ({ label: r.cliente, nombre: contactoDe(r.cliente), para: mailsDe(r.cliente), sub: money(r.total, r.moneda), periodo: periodoTxt(m), r })),
        send: async (it, v) => {
          const r = it.r, items = itemsDe(r), pdf = await pdfResumen({ id: r.id, numero: r.numero, cliente: r.cliente, m, moneda: r.moneda, items: r.items, nota: r.nota });
          const b = E.resumenEmail({ cfg: cfgMarca(), contacto: contactoFull(r.cliente), cuenta: r.cliente, periodo: periodoTit(m), moneda: r.moneda, items, total: r2(items.reduce((a, i) => a + i.monto, 0)), nota: r.nota, mensaje: v.mensaje, firma: firma(), asunto: v.asunto });
          await data.sendEmail({ tipo: 'Resumen de cuenta', cliente_id: r.cliente_id, periodo: m + '-01', para: it.para, asunto: v.asunto, html: b.html, texto: b.texto, copia: v.copia, adjuntos: [{ nombre: pdf.nombre, base64: pdf.base64 }] });
          await data.upd('resumenes', r.id, { estado: 'Enviado', enviado_el: today() });
        },
      };
  }
  /* ---------- Envío programado de resúmenes (con confirmación) ---------- */
  const EP_VIVOS = ['Esperando confirmación', 'Confirmado', 'Enviando'];
  const epDe = m => (AD.EP || []).find(e => e.periodo === m && EP_VIVOS.includes(e.estado));
  const epReciente = m => (AD.EP || []).find(e => e.periodo === m && ['Vencido', 'Enviado', 'Con errores'].includes(e.estado) && Date.now() - new Date(e.enviado_at || e.enviar_el).getTime() < 4 * 86400_000);
  const cuandoTxt = iso => { const d = new Date(iso), tz = 'America/Argentina/Cordoba'; return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: tz }) + ' a las ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }); };
  const alias = id => (S.E.find(e => e._id === id) || {}).persona || '';
  // Resúmenes que se cambiaron después de confirmar (la huella es el updated_at que tenían al confirmar).
  const epCambiados = e => (AD.EI || []).filter(i => i.envio_id === e.id && i.estado === 'Pendiente').filter(i => { const r = AD.R.find(x => x.id === i.resumen_id); return r && String(r.updated_at) !== String(i.huella); }).map(i => (AD.R.find(x => x.id === i.resumen_id) || {}).cliente).filter(Boolean);
  function epCard(m) {
    const e = epDe(m) || epReciente(m); if (!e) return '';
    const n = (e.resumen_ids || []).length, res = e.resultado || {};
    if (e.estado === 'Esperando confirmación') return '<section class="callout ep"><p><b>Envío programado: ' + n + (n === 1 ? ' resumen' : ' resúmenes') + ' el ' + esc(cuandoTxt(e.enviar_el)) + '.</b> Falta tu confirmación: sin ella no sale nada. El día antes te llega un aviso.</p><div class="toolbar"><button class="btn primary" data-act="epConfirmar" data-id="' + esc(e.id) + '">Revisar y confirmar</button><button class="btn" data-act="epEditar" data-id="' + esc(e.id) + '">Cambiar</button><button class="btn ghost" data-act="epCancelar" data-id="' + esc(e.id) + '">Cancelar</button></div></section>';
    if (e.estado === 'Confirmado') { const ch = epCambiados(e); return '<section class="callout ep ok"><p><b>Confirmado' + (alias(e.confirmado_por) ? ' por ' + esc(alias(e.confirmado_por)) : '') + ': salen ' + n + (n === 1 ? ' resumen' : ' resúmenes') + ' el ' + esc(cuandoTxt(e.enviar_el)) + '.</b>' + (ch.length ? ' <span class="ep-warn">Cambiaste ' + esc(ch.join(', ')) + ' después de confirmar: volvé a confirmar, o ' + (ch.length === 1 ? 'ese no sale' : 'esos no salen') + '.</span>' : ' Se manda solo, tal cual lo revisaste.') + '</p><div class="toolbar">' + (ch.length ? '<button class="btn primary" data-act="epConfirmar" data-id="' + esc(e.id) + '">Volver a confirmar</button>' : '') + '<button class="btn" data-act="epEditar" data-id="' + esc(e.id) + '">Cambiar fecha</button><button class="btn ghost" data-act="epCancelar" data-id="' + esc(e.id) + '">Cancelar</button></div></section>'; }
    if (e.estado === 'Enviando') return '<section class="callout ep"><p><b>Mandando los resúmenes…</b> En unos minutos queda todo en la pestaña Mails de cada cliente.</p></section>';
    if (e.estado === 'Vencido') return '<section class="callout ep warn"><p><b>No se mandaron los resúmenes programados para el ' + esc(cuandoTxt(e.enviar_el)) + ':</b> faltó la confirmación. Mandalos ahora o programalos de nuevo.</p><div class="toolbar"><button class="btn primary" data-act="aMailResumenes">Enviar ahora</button><button class="btn" data-act="epNuevo">Programar de nuevo</button></div></section>';
    return '<section class="callout ep ' + (e.estado === 'Enviado' ? 'ok' : 'warn') + '"><p><b>Envío programado: ' + (res.ok || 0) + ' enviados.</b>' + ((res.cambiaron || []).length ? ' No salieron porque se cambiaron después de confirmar: ' + esc(res.cambiaron.join(', ')) + '.' : '') + ((res.errores || []).length ? ' Con error: ' + esc(res.errores.join(' · ')) + '.' : '') + '</p></section>';
  }
  function defEnvio(m) { // por defecto, el 28 del mes anterior a las 10
    let f = addMonth(m, -1) + '-28';
    if (new Date(f + 'T10:00:00-03:00').getTime() < Date.now() + 3600_000) { const d = new Date(Date.now() + 86400_000); f = d.toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Cordoba' }); }
    return { fecha: f, hora: '10:00' };
  }
  function epPanel(m, e) {
    const o = bulkResumenes(m);
    if (!o && !e) { toast('No hay resúmenes preparados de ' + monthLabel(m) + ' para programar. Preparalos primero.'); return; }
    const items = o ? o.items : [], sel = new Set(e ? e.resumen_ids : items.filter(i => i.para).map(i => i.r.id));
    const d = e ? { fecha: new Date(e.enviar_el).toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Cordoba' }), hora: new Date(e.enviar_el).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Cordoba' }) } : defEnvio(m);
    openPanel({
      title: 'Programar el envío de ' + periodoTit(m), eyebrow: 'Resúmenes de cuenta', saveLabel: e ? 'Guardar cambios' : 'Programar',
      intro: 'Elegí el día y la hora. <b>El día antes te avisamos</b> (campanita y mail) para que los revises y confirmes. <b>Sin tu confirmación no se manda nada.</b> En el mensaje podés usar <b>{nombre}</b>, <b>{cuenta}</b> y <b>{periodo}</b>.',
      values: { fecha: d.fecha, hora: d.hora, asunto: e ? e.asunto : o.asunto, mensaje: e ? e.mensaje : o.mensaje, copia: e ? e.copia : true },
      fields: [
        { k: 'fecha', label: 'Día', type: 'date', req: 1 }, { k: 'hora', label: 'Hora', type: 'time', req: 1 },
        { k: 'asunto', label: 'Asunto', req: 1, full: 1 }, { k: 'mensaje', label: 'Mensaje', type: 'textarea', rows: 6, full: 1 },
        { k: 'copia', label: 'Mandarme copia de cada uno', type: 'check' },
      ],
      extra: '<div class="field full"><span class="lbl">Qué resúmenes salen</span><div class="rows" style="border:1px solid var(--line);border-radius:8px">' +
        (items.length ? items.map((it, i) => '<label class="row" style="cursor:pointer"><input type="checkbox" data-epsel="' + esc(it.r.id) + '"' + (it.para && sel.has(it.r.id) ? ' checked' : '') + (it.para ? '' : ' disabled') + '><span class="t"><b>' + esc(it.label) + '</b><span>' + esc(it.para || 'sin email · cargalo en Contactos') + '</span></span><span class="money">' + esc(it.sub) + '</span></label>').join('') : '<p class="muted" style="padding:10px 12px;margin:0">No quedan resúmenes preparados sin enviar.</p>') + '</div></div>',
      onSave: async v => {
        const ids = [...document.querySelectorAll('[data-epsel]:checked')].map(x => x.dataset.epsel);
        if (!ids.length) throw new Error('Elegí al menos un resumen');
        const cuando = new Date(v.fecha + 'T' + v.hora + ':00-03:00');
        if (!(cuando.getTime() > Date.now() + 5 * 60_000)) throw new Error('Elegí un día y una hora que todavía no pasaron');
        const row = { periodo: m + '-01', enviar_el: cuando.toISOString(), resumen_ids: ids, asunto: v.asunto, mensaje: v.mensaje, copia: !!v.copia };
        if (e) {
          const mismos = ids.length === e.resumen_ids.length && ids.every(x => e.resumen_ids.includes(x)) && v.asunto === e.asunto && v.mensaje === e.mensaje && !!v.copia === !!e.copia;
          const cambio = mismos ? {} : { estado: 'Esperando confirmación', confirmado_por: null, confirmado_at: null };
          if (!mismos) await data.del('envios_items', e.id, 'envio_id');
          await data.upd('envios_programados', e.id, { ...row, ...cambio, avisado_at: mismos ? e.avisado_at : null });
          toast(mismos ? 'Listo: cambió la fecha, sigue confirmado' : 'Guardado. Como cambiaste qué sale, hay que volver a confirmar');
        } else {
          await data.ins('envios_programados', { ...row, creado_por: S.me.id });
          toast('Programado. El día antes te avisamos para que lo confirmes');
        }
      },
    });
  }
  function epConfirmarPanel(e) {
    AD.firmante = firmanteDe(S, 'Resumen de cuenta');
    const m = e.periodo, o = bulkResumenes(m), items = (o ? o.items : []).filter(it => e.resumen_ids.includes(it.r.id));
    if (!items.length) { toast('Esos resúmenes ya no están pendientes de enviar'); return; }
    openPanel({
      title: 'Confirmar el envío de ' + periodoTit(m), eyebrow: 'Resúmenes de cuenta', saveLabel: 'Confirmar envío', busyLabel: 'Preparando los PDF…',
      intro: 'Salen el <b>' + esc(cuandoTxt(e.enviar_el)) + '</b>. Revisá cada uno (tocá <b>Ver PDF</b>) y, si está todo bien, confirmá. Se manda exactamente esto; si después cambiás algún resumen, ese no sale hasta que vuelvas a confirmar.',
      values: {}, fields: [],
      extra: '<div class="field full"><div class="rows" style="border:1px solid var(--line);border-radius:8px">' + items.map(it => '<div class="row" style="cursor:default"><span class="t"><b>' + esc(it.label) + '</b><span>' + esc(it.para || 'sin email: no sale') + '</span></span><span class="money">' + esc(it.sub) + '</span><button type="button" class="btn sm" data-act="epVer" data-id="' + esc(it.r.id) + '">Ver PDF</button></div>').join('') + '</div>' +
        '<p class="formnote">Asunto: <b>' + esc(e.asunto) + '</b></p></div>' + firmaBox() + '<p class="formnote" id="ep-prog" aria-live="polite" style="grid-column:1/-1"></p>',
      onSave: async () => {
        await data.del('envios_items', e.id, 'envio_id');
        const filas = []; let n = 0;
        for (const it of items.filter(x => x.para)) {
          const prog = $('#ep-prog'); if (prog) prog.textContent = 'Preparando ' + (++n) + ' de ' + items.length + '…';
          const r = it.r, its = itemsDe(r), fill = t => String(t || '').replace(/\{nombre\}/g, it.nombre || '').replace(/\{cuenta\}/g, it.label).replace(/\{periodo\}/g, it.periodo || '').replace(/Hola ,/g, 'Hola,');
          const pdf = await pdfResumen({ id: r.id, numero: r.numero, cliente: r.cliente, m, moneda: r.moneda, items: r.items, nota: r.nota });
          const b = E.resumenEmail({ cfg: cfgMarca(), contacto: contactoFull(r.cliente), cuenta: r.cliente, periodo: periodoTit(m), moneda: r.moneda, items: its, total: r2(its.reduce((a, i) => a + i.monto, 0)), nota: r.nota, mensaje: fill(e.mensaje), firma: firma(), asunto: fill(e.asunto) });
          filas.push({ envio_id: e.id, resumen_id: r.id, cliente_id: r.cliente_id, para: it.para.split(/[,;\s]+/).filter(Boolean), asunto: fill(e.asunto), html: b.html, texto: b.texto || '', pdf_nombre: pdf.nombre, pdf_base64: pdf.base64, huella: String(r.updated_at || '') });
        }
        for (const f of filas) await data.ins('envios_items', f);
        await data.upd('envios_programados', e.id, { estado: 'Confirmado', confirmado_por: S.me.id, confirmado_at: new Date().toISOString(), avisado_at: e.avisado_at || new Date().toISOString() });
        toast('Confirmado: salen el ' + cuandoTxt(e.enviar_el));
        if (new Date(e.enviar_el).getTime() <= Date.now()) { try { await data.enviosCorrer(); } catch (err) { toast(err.message); } }
      },
    });
  }
  function bulkAvisos() {
      const m = thisMonth();
      const ps = AD.PR.filter(p => p.desde > m && !p.aviso_enviado).map(p => ({ p, d: datosAviso(p) })).filter(x => x.d && x.d.a.estado === 'Activo').sort((x, y) => cmp(x.d.a.cliente, y.d.a.cliente));
      if (!ps.length) return null;
      return {
        titulo: 'Avisos de aumento', asunto: 'Actualización de tu abono · desde ' + periodoTit(ps[0].p.desde),
        mensaje: E.textos.aviso({ nombre: '{nombre}', servicio: 'tu abono', desde: '{periodo}', pct: '{pct}', motivo: '{motivo}' }),
        items: ps.map(({ p, d }) => ({ label: d.a.cliente, nombre: contactoDe(d.a.cliente), para: mailsDe(d.a.cliente), sub: servicioDe(d.a) + ' · ' + money(p.monto, p.moneda) + ' desde ' + fmt(p.desde) + (d.pct ? ' · +' + d.pct + '%' : '') + (motivoReal(p.motivo) ? ' · ' + motivoReal(p.motivo) : ' · sin motivo cargado'), periodo: periodoTxt(p.desde), pct: d.pct, motivo: motivoReal(p.motivo), p, d })),
        send: async (it, v) => {
          const { p, d } = it;
          const b = E.avisoEmail({ cfg: cfgMarca(), contacto: contactoFull(d.a.cliente), cuenta: d.a.cliente, servicio: servicioDe(d.a), anterior: d.prev ? d.prev.monto : null, nuevo: p.monto, moneda: p.moneda, desde: periodoTit(p.desde), pct: d.pct, motivo: motivoReal(p.motivo), mensaje: v.mensaje, firma: firma(), asunto: v.asunto });
          await data.sendEmail({ tipo: 'Aviso de aumento', cliente_id: data.ids.cliente(d.a.cliente), periodo: p.desde + '-01', para: it.para, asunto: v.asunto, html: b.html, texto: b.texto, copia: v.copia });
          await data.upd('precios_abono', p.id, { aviso_enviado: today() });
        },
      };
  }
  // Manda un envío masivo sin abrir el panel (para el cierre en un clic). Saltea a quien no tiene email.
  async function enviarDirecto(o, onProg) {
    const sel = o.items.filter(it => it.para); const fails = []; let ok = 0;
    for (const [n, it] of sel.entries()) {
      if (onProg) onProg(n + 1, sel.length);
      const fill = t => String(t || '').replace(/\{nombre\}/g, it.nombre || '').replace(/\{cuenta\}/g, it.label).replace(/\{periodo\}/g, it.periodo || '').replace(/Hola ,/g, 'Hola,');
      try { await o.send(it, { asunto: fill(o.asunto), mensaje: fill(o.mensaje), copia: true }); ok++; } catch (err) { fails.push(it.label + ': ' + err.message); }
      await new Promise(r => setTimeout(r, 600));
    }
    return { ok, fails, sinMail: o.items.filter(it => !it.para).map(it => it.label) };
  }
  // Factura que entra desde Drive: se manda sola al cliente, con el PDF de Drive adjunto.
  // Solo si el cliente tiene email de cobros; si no se puede bajar el PDF, no se manda (mejor nada que un mail sin factura).
  async function enviarFacturaDrive({ f, cliente, periodo, da }) {
    const para = mailsDe(cliente); if (!para) return { ok: false, motivo: cliente + ' no tiene email de cobros' };
    let adjuntos;
    try { const r = await data.asistente({ accion: 'drive_descargar', archivo_id: da.id }); adjuntos = [{ nombre: /\.pdf$/i.test(r.nombre) ? r.nombre : r.nombre + '.pdf', base64: r.base64 }]; }
    catch (err) { return { ok: false, motivo: 'no se pudo bajar el PDF de ' + cliente + ' (' + err.message + ')' }; }
    const comp = (f.tipo === 'Invoice' ? 'el invoice' : 'la factura') + (f.numero ? ' N° ' + f.numero : '');
    const per = periodo ? String(periodo).slice(0, 7) : '';
    const b = E.facturaEmail({ cfg: cfgMarca(), contacto: contactoFull(cliente), cuenta: cliente, periodo: per ? periodoTit(per) : '', tipo: f.tipo, numero: f.numero, fecha: f.fecha, vencimiento: f.vencimiento, monto: f.monto, moneda: f.moneda, link: f.link_pdf, conPago: true,
      mensaje: E.textos.factura({ nombre: contactoDe(cliente), comprobante: comp, periodo: per ? periodoTxt(per) : '', como: 'adjunto' }), firma: firma() });
    await data.sendEmail({ tipo: 'Factura enviada', cliente_id: data.ids.cliente(cliente), periodo: per ? per + '-01' : null, factura_id: f.id, para, cc: '', asunto: b.asunto, html: b.html, texto: b.texto, copia: true, adjuntos });
    return { ok: true, para };
  }
  const envioAutoDrive = () => !AD.AJ || !AD.AJ.drive || AD.AJ.drive.enviar_auto !== false;
  const mail = {
    resumen(rd) {
      const items = itemsDe(rd); if (!items.length) { toast('El resumen no tiene ítems'); return; }
      const total = r2(items.reduce((a, i) => a + i.monto, 0)), nombre = contactoDe(rd.cliente);
      toast('Preparando el PDF…');
      pdfResumen(rd).then(pdf => openComposer({
        titulo: 'Resumen de cuenta', eyebrow: rd.cliente + ' · ' + periodoTit(rd.m), tipo: 'Resumen de cuenta', cliente: rd.cliente, periodo: rd.m,
        para: mailsDe(rd.cliente), mensaje: E.textos.resumen({ nombre, periodo: periodoTxt(rd.m) }), adjuntos: [pdf],
        build: v => E.resumenEmail({ cfg: cfgMarca(), contacto: contactoFull(rd.cliente), cuenta: rd.cliente, periodo: periodoTit(rd.m), moneda: rd.moneda, items, total, nota: rd.nota, mensaje: v.mensaje, firma: firma(), asunto: v.asunto }),
        onSent: async () => { AD.rd = rd; await saveResumen('Enviado', { sinGestion: true, silencioso: true }); },
      })).catch(err => toast(err.message));
    },
    recordatorio(c) {
      const abiertas = c.facs.filter(f => f.saldo > 0.009);
      const pend = abiertas.length ? abiertas.map(f => ({ concepto: f.tipo + ' ' + (f.numero || 'sin número') + (f.vencimiento ? ' · venció ' + fmt(f.vencimiento) : ''), monto: f.saldo })) : itemsDe(c.res || { items: [] });
      const moneda = abiertas[0] ? abiertas[0].moneda : (c.moneda || 'ARS');
      const total = r2(pend.reduce((a, i) => a + i.monto, 0));
      if (!pend.length) { toast('No hay nada pendiente de cobro para recordar'); return; }
      const go = adj => openComposer({
        titulo: 'Recordatorio de pago', eyebrow: c.cliente + ' · ' + periodoTit(c.m), tipo: 'Recordatorio de pago', cliente: c.cliente, periodo: c.m, factura_id: abiertas.length === 1 ? abiertas[0].id : null,
        para: mailsDe(c.cliente), mensaje: E.textos.recordatorio({ nombre: contactoDe(c.cliente), periodo: periodoTxt(c.m) }), adjuntos: adj,
        build: v => E.recordatorioEmail({ cfg: cfgMarca(), contacto: contactoFull(c.cliente), cuenta: c.cliente, periodo: periodoTit(c.m), moneda, pendientes: pend, total, mensaje: v.mensaje, firma: firma(), asunto: v.asunto }),
        extraBtns: '<button type="button" class="btn sm ghost" data-act="aRecordatorioManual">Registrar por otro canal</button>',
      });
      if (c.res && itemsDe(c.res).length) { toast('Preparando el PDF…'); pdfResumen({ id: c.res.id, numero: c.res.numero, cliente: c.cliente, m: c.m, moneda: c.res.moneda, items: c.res.items, nota: c.res.nota }).then(p => go([p])).catch(() => go([])); }
      else go([]);
    },
    async factura(f) {
      if (f.tipo === 'Invoice' && !AD.DA.some(x => x.factura_id === f.id)) {
        let adjuntos = [];
        try { const pdf = await invoicePdf(f); adjuntos = [{ nombre: pdf.nombre + '.pdf', base64: pdf.base64, bytes: pdf.bytes }]; } catch (err) { toast('No se pudo armar el PDF: ' + err.message); }
        const nom = contactoDe(f.cliente);
        openComposer({ adjuntos,
          titulo: 'Invoice ' + (f.numero || ''), eyebrow: f.cliente, tipo: 'Factura enviada', cliente: f.cliente, periodo: f.periodo || null, factura_id: f.id,
          para: mailsDe(f.cliente), asunto: 'Invoice ' + (f.numero || '') + ' · àndale',
          mensaje: 'Hi' + (nom ? ' ' + nom : '') + ',\n\nPlease find attached invoice ' + (f.numero || '') + ' for ' + PDFm(f.monto, f.moneda) + (f.vencimiento ? ', due ' + new Date(f.vencimiento + 'T12:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '') + '. Payment details are included in the PDF.\n\nThank you!',
          build: v => E.libreEmail({ cfg: cfgMarca(), cuenta: f.cliente, titulo: 'Invoice ' + (f.numero || ''), mensaje: v.mensaje, firma: firma(), asunto: v.asunto }),
        });
        return;
      }
      const comp = (f.tipo === 'Invoice' ? 'el invoice' : 'la factura') + (f.numero ? ' N° ' + f.numero : '');
      const da = AD.DA.find(x => x.factura_id === f.id); let adjuntos = [];
      if (da) {
        toast('Bajando el PDF de Drive…');
        try { const r = await data.asistente({ accion: 'drive_descargar', archivo_id: da.id }); adjuntos = [{ nombre: /\.pdf$/i.test(r.nombre) ? r.nombre : r.nombre + '.pdf', base64: r.base64, bytes: AS.b64Bytes(r.base64) }]; }
        catch (err) { toast('No se pudo adjuntar el PDF: ' + err.message); }
      }
      openComposer({ adjuntos,
        titulo: verTipo(f.tipo) + ' ' + (f.numero || 'sin número'), eyebrow: f.cliente, tipo: 'Factura enviada', cliente: f.cliente, periodo: f.periodo || null, factura_id: f.id,
        para: mailsDe(f.cliente), mensaje: E.textos.factura({ nombre: contactoDe(f.cliente), comprobante: comp, periodo: f.periodo ? periodoTxt(f.periodo) : '', como: adjuntos.length ? 'adjunto' : f.link_pdf ? 'boton' : '' }),
        values: { conPago: f.saldo > 0.009 },
        extraFields: [{ k: 'conPago', label: 'Incluir datos de pago', type: 'check' }],
        adjuntar: true, pideAdjunto: !f.link_pdf,
        build: v => E.facturaEmail({ cfg: cfgMarca(), contacto: contactoFull(f.cliente), cuenta: f.cliente, periodo: f.periodo ? periodoTit(f.periodo) : '', tipo: f.tipo, numero: f.numero, fecha: f.fecha, vencimiento: f.vencimiento, monto: f.monto, moneda: f.moneda, link: f.link_pdf, conPago: v.conPago, mensaje: v.mensaje, firma: firma(), asunto: v.asunto }),
        intro2: f.link_pdf || adjuntos.length ? '' : 'Esta factura no tiene el PDF cargado: adjuntalo abajo con “Adjuntar archivo” para que le llegue al cliente.',
      });
    },
    recordatorios() { const o = bulkRecordatorios(); if (!o) { toast('No hay facturas vencidas'); return; } openBulk(o); },
    aviso(p) {
      const d = datosAviso(p); if (!d) return;
      const { a, prev, pct } = d;
      openComposer({
        titulo: 'Aviso de aumento', eyebrow: a.cliente, tipo: 'Aviso de aumento', cliente: a.cliente, periodo: p.desde,
        para: mailsDe(a.cliente), mensaje: E.textos.aviso({ nombre: contactoDe(a.cliente), servicio: servicioDe(a).toLowerCase(), desde: periodoTxt(p.desde), pct, motivo: motivoReal(p.motivo) }),
        build: v => E.avisoEmail({ cfg: cfgMarca(), contacto: contactoFull(a.cliente), cuenta: a.cliente, servicio: servicioDe(a), anterior: prev ? prev.monto : null, nuevo: p.monto, moneda: p.moneda, desde: periodoTit(p.desde), pct, motivo: motivoReal(p.motivo), mensaje: v.mensaje, firma: firma(), asunto: v.asunto }),
        onSent: async () => { await data.upd('precios_abono', p.id, { aviso_enviado: today() }); },
        extraBtns: '<button type="button" class="btn sm ghost" data-act="aAvisoManual" data-id="' + esc(p.id) + '">Avisado por otro canal</button>',
      });
    },
    libre(cliente) {
      openComposer({
        titulo: 'Email a ' + cliente, eyebrow: 'Notificación', tipo: 'Otro', cliente,
        para: mailsDe(cliente), mensaje: E.textos.libre({ nombre: contactoDe(cliente) }), asunto: '',
        values: { titulo: '', botonUrl: '', botonTexto: 'Ver más', conPago: false },
        extraFields: [
          { k: 'titulo', label: 'Título (opcional)', full: 1, ph: 'Ej.: Novedades de la cuenta' },
          { k: 'botonUrl', label: 'Link (opcional)', type: 'url', ph: 'https://…' },
          { k: 'botonTexto', label: 'Texto del botón' },
          { k: 'conPago', label: 'Incluir datos de pago', type: 'check' },
        ],
        build: v => E.libreEmail({ cfg: cfgMarca(), contacto: contactoFull(cliente), cuenta: cliente, titulo: v.titulo, mensaje: v.mensaje, botonUrl: v.botonUrl, botonTexto: v.botonTexto, conPago: v.conPago, firma: firma(), asunto: v.asunto || (v.titulo ? v.titulo + ' · àndale' : '') }),
      });
    },
    resumenes(m) { const o = bulkResumenes(m); if (!o) { toast('No hay resúmenes preparados sin enviar en ' + monthLabel(m) + '.'); return; } openBulk(o); },
    avisos() { const o = bulkAvisos(); if (!o) { toast('No hay aumentos pendientes de avisar'); return; } openBulk(o); },
  };

  function exportCSV() {
    const m = AD.mes; const rows = [['Nombre', 'Apellido', 'Cuenta', 'Fecha', 'Servicio', 'email', 'Total', 'File Attachments']];
    clientesDelMes(m).forEach(cl => {
      const r = AD.R.find(x => x.cliente === cl && x.periodo === m); if (!r) return;
      const c = S.C.find(x => x.nombre === cl) || {}, ca = cadm(cl);
      const [nom, ...ape] = (c.contacto || '').split(' ');
      const servicio = r.items.filter(i => i.inc).map(i => i.concepto + ' ' + money(i.monto, r.moneda)).join('\n');
      const mails = mailsDe(cl).split(', ').filter(Boolean);
      (mails.length ? mails : ['']).forEach(mail => rows.push([nom || '', ape.join(' '), cl, cap(monthLabel(m)), servicio, mail, money(r.total, r.moneda), r.link_pdf || '']));
    });
    if (rows.length === 1) { toast('No hay resúmenes guardados este mes para exportar'); return; }
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = 'envio-resumenes-' + m + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    toast('Planilla descargada: ' + (rows.length - 1) + ' filas');
  }

  /* ---------- Vista: Facturas ---------- */
  function vFacturas() {
    const ff = AD.ff;
    const anios = [...new Set(AD.F.map(f => (f.fecha || '').slice(0, 4)).filter(Boolean))].sort().reverse();
    if (!anios.includes(ff.anio)) anios.unshift(ff.anio);
    const list = AD.F.filter(f => (!ff.anio || (f.fecha || '').startsWith(ff.anio)) && (!ff.cliente || f.cliente === ff.cliente) && (!ff.emisor || f.emisor === ff.emisor) &&
      (ff.estado === 'todas' || (ff.estado === 'abiertas' ? f.saldo > 0.009 : ff.estado === 'vencidas' ? estadoFactura(f) === 'Vencida' : estadoFactura(f) === 'Pagada')))
      .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const tot = {}, sal = {}; list.forEach(f => { add(tot, f.moneda, f.monto); add(sal, f.moneda, f.saldo); });
    const deudores = {}; AD.F.filter(f => f.saldo > 0.009).forEach(f => { (deudores[f.cliente] = deudores[f.cliente] || {}); add(deudores[f.cliente], f.moneda, f.saldo); });
    let h = '<div class="head"><div>' + lock + '<h1>Facturas</h1><p>Facturas hechas y lo que falta cobrar.</p></div><div class="toolbar"><button class="btn" data-act="aInvoice">+ Invoice (exterior)</button><button class="btn primary" data-act="aFactura">+ Factura ARCA</button></div></div>' +
      '<div class="toolbar"><div class="seg" role="group" aria-label="Estado">' + [['abiertas', 'Por cobrar'], ['vencidas', 'Vencidas'], ['pagadas', 'Pagadas'], ['todas', 'Todas']].map(([k, l]) => '<button data-act="aFf" data-k="estado" data-v="' + k + '" aria-pressed="' + (ff.estado === k) + '">' + l + '</button>').join('') + '</div>' +
      '<select class="in" id="ff-c" data-aff="cliente" aria-label="Cliente">' + clienteOpts(ff.cliente, 'Todos los clientes') + '</select>' +
      '<select class="in" id="ff-e" data-aff="emisor" aria-label="¿Quién factura?">' + opt('', 'Factura cualquiera', ff.emisor) + EMISORES.map(e => opt(e, 'Factura ' + e, ff.emisor)).join('') + '</select>' +
      '<select class="in" id="ff-a" data-aff="anio" aria-label="Año">' + opt('', 'Todos los años', ff.anio) + anios.map(a => opt(a, a, ff.anio)).join('') + '</select></div>';
    const deud = Object.entries(deudores).sort((a, b) => cmp(a[0], b[0]));
    if (deud.length) h += '<section class="sheet"><div class="sheet-h"><h2>Quién debe</h2><span class="muted">' + deud.length + ' clientes</span></div><div class="sheet-b"><div class="tags" style="gap:8px">' + deud.map(([c, acc]) => '<button class="btn sm" data-act="aFf" data-k="cliente" data-v="' + esc(c) + '">' + esc(c) + ' · <span class="money">' + esc(multi(acc)) + '</span></button>').join('') + '</div></div></section>';
    if (!list.length) return h + '<section class="sheet">' + emptyBox(AD.F.length ? 'Ninguna factura coincide' : 'Todavía no hay facturas cargadas', AD.F.length ? 'Probá con otro filtro.' : 'Se cargan desde Cobros del mes o con “+ Factura”.') + '</section>';
    const rows = list.map(f => '<tr><td class="mono">' + fmt(f.fecha) + '</td><td class="name">' + esc(f.cliente) + '<span class="sub">' + esc(f.concepto || (f.periodo ? monthLabel(f.periodo) : '')) + '</span></td><td>' + esc(verTipo(f.tipo)) + ' ' + esc(f.numero || 'sin número') + (f.link_pdf ? ' <a href="' + esc(f.link_pdf) + '" target="_blank" rel="noopener">PDF</a>' : '') + '</td><td>' + esc(f.emisor || '—') + '</td><td class="r"><span class="money">' + money(f.monto, f.moneda) + '</span></td><td class="r">' + (f.saldo > 0.009 ? '<span class="money">' + money(f.saldo, f.moneda) + '</span>' : '<span class="muted">—</span>') + '</td><td>' + efPill(f) + (f.vencimiento ? '<span class="sub">vence ' + fmt(f.vencimiento) + '</span>' : '') + '</td><td class="r"><span class="toolbar" style="justify-content:flex-end">' + (f.saldo > 0.009 ? '<button class="btn sm" data-act="aCobro" data-id="' + esc(f.id) + '">Cobro</button>' : '') + (f.tipo === 'Invoice' ? '<button class="btn sm" data-act="aInvoicePdf" data-id="' + esc(f.id) + '">PDF</button>' : '') + '<button class="btn sm" data-act="aMailFactura" data-id="' + esc(f.id) + '">Enviar</button><button class="btn ghost sm" data-act="aFactura" data-id="' + esc(f.id) + '">Editar</button></span></td></tr>').join('');
    return h + '<section class="sheet"><div class="tbl"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Factura</th><th>Quién factura</th><th class="r">Monto</th><th class="r">Falta cobrar</th><th>Estado</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="count num">' + list.length + ' facturas · total ' + esc(multi(tot)) + ' · por cobrar ' + esc(multi(sal)) + '</div></section>';
  }

  /* ---------- Presupuesto, plan de pagos, costos y margen ---------- */
  const PLANES_PAGO = ['Contado', '50/50', '3 cuotas', '4 cuotas', '6 cuotas', 'Personalizado'];
  function cuotasPlan(plan, total, m0) {
    if (!total || !m0 || !/^\d{4}-\d{2}$/.test(m0)) return [];
    const n = plan === 'Contado' ? 1 : plan === '50/50' ? 2 : parseInt(plan, 10) || 0; if (!n) return [];
    const base = Math.floor(total / n * 100) / 100;
    return Array.from({ length: n }, (_, i) => ({
      periodo: addMonth(m0, i), monto: i === n - 1 ? r2(total - base * (n - 1)) : base,
      concepto: plan === 'Contado' ? 'Pago total' : plan === '50/50' ? (i ? 'Saldo 50%' : 'Anticipo 50%') : 'Cuota ' + (i + 1) + '/' + n,
    }));
  }
  const refsEnviadas = () => { const s = new Set(); AD.R.filter(r => r.estado === 'Enviado').forEach(r => r.items.forEach(i => { if (i.inc && i.ref) s.add(i.ref); })); return s; };
  const movDe = id => AD.MV.find(v => v.id === id);
  function costos(kind, id, anio) { // { moneda: monto } de egresos imputados
    const acc = {};
    AD.IMP.filter(x => (kind === 'abono' ? x.abono_id : x.proyecto_id) === id).forEach(x => { const mv = movDe(x.movimiento_id); if (!mv || (anio && (typeof anio === 'object' ? !enRango(mv.fecha, anio) : !(mv.fecha || '').startsWith(anio)))) return; add(acc, mv.moneda, x.monto); });
    return acc;
  }
  function finProyecto(p) {
    const fz = AD.PFZ.get(p._id) || {}, cs = AD.PF.filter(x => x.proyecto_id === p._id).sort((a, b) => a.periodo.localeCompare(b.periodo)), env = refsEnviadas();
    const moneda = fz.moneda || (cs[0] && cs[0].moneda) || cadm(p.cliente).moneda || 'ARS';
    const programado = r2(cs.reduce((a, c) => a + (c.monto || 0), 0)), facturado = r2(cs.filter(c => env.has('pf:' + c.id)).reduce((a, c) => a + (c.monto || 0), 0));
    const presupuesto = fz.presupuesto != null ? fz.presupuesto : (programado || null);
    const cost = costos('proyecto', p._id), costMismo = cost[moneda] || 0, costOtras = Object.keys(cost).filter(k => k !== moneda);
    // Lo que todavía se le debe a cada proveedor (acordado − pagado) también es costo: así el margen no se infla con los pagos a cuenta.
    const cxp = cxpDe(p._id).map(estadoCosto), pend = {}; cxp.forEach(c => add(pend, c.moneda, c.saldo));
    const pendMismo = pend[moneda] || 0;
    const margen = presupuesto != null ? r2(presupuesto - costMismo - pendMismo) : null;
    const cobrado = cobradoProyecto(cs, env);
    return { fz, cs, moneda, programado, facturado, presupuesto, cost, costMismo, costOtras, cxp, pend, pendMismo, cobrado, enCaja: r2(cobrado - costMismo), margen, pct: presupuesto ? Math.round(margen / presupuesto * 100) : null, env };
  }
  /* ---------- Acordado con proveedores y pagos a cuenta ---------- */
  const colabDe = id => (AD.CO || []).find(c => c.id === id);
  const cxpDe = proyId => (AD.CXP || []).filter(c => c.proyecto_id === proyId);
  // Pagos de un acuerdo: los egresos asignados al proyecto con ese acuerdo, o (si no se marcó) los del mismo proveedor y moneda.
  function estadoCosto(c) {
    const pares = cxpDe(c.proyecto_id).filter(x => x.colaborador_id === c.colaborador_id && x.moneda === c.moneda), primero = pares[0] && pares[0].id === c.id;
    const pagos = [];
    AD.IMP.filter(i => i.proyecto_id === c.proyecto_id).forEach(i => {
      const mv = movDe(i.movimiento_id); if (!mv || mv.moneda !== c.moneda) return;
      if (i.costo_id === c.id || (!i.costo_id && primero && mv.colaborador_id === c.colaborador_id)) pagos.push({ fecha: mv.fecha, monto: i.monto, mv });
    });
    pagos.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    const pagado = r2(pagos.reduce((a, x) => a + x.monto, 0)), co = colabDe(c.colaborador_id), p = S.P.find(x => x._id === c.proyecto_id);
    return { ...c, co, nombre: co ? co.nombre : '—', p, pagos, pagado, saldo: c.cerrado ? 0 : Math.max(0, r2(c.monto - pagado)), pasado: pagado > c.monto + 0.009 };
  }
  const cxpAbiertos = () => (AD.CXP || []).map(estadoCosto).filter(c => c.saldo > 0.009 && c.p && c.p.estado !== 'Cancelado').sort((a, b) => cmp(a.nombre, b.nombre) || cmp(a.p.cliente, b.p.cliente));
  // Cuánto del proyecto pagó ya el cliente: cada cuota facturada cuenta en la proporción cobrada de las facturas de ese mes.
  function cobradoProyecto(cs, env) {
    let tot = 0;
    cs.filter(c => env.has('pf:' + c.id)).forEach(c => {
      const r = AD.R.find(x => x.estado === 'Enviado' && x.items.some(i => i.inc && i.ref === 'pf:' + c.id)); if (!r || !r.total) return;
      const fs = AD.F.filter(f => f.cliente === r.cliente && f.periodo === r.periodo && f.moneda === r.moneda);
      const ratio = Math.min(1, fs.reduce((a, f) => a + f.cobrado, 0) / r.total);
      tot += (c.monto || 0) * ratio;
    });
    return r2(tot);
  }
  function cxpFilas(f, conAcciones) {
    if (!f.cxp.length) return '';
    return '<div class="rows cxp">' + f.cxp.map(c => '<div class="row" style="cursor:default"><span class="t"><b>' + esc(c.nombre) + (c.concepto ? ' · ' + esc(c.concepto) : '') + '</b><span>' +
      'Acordado <strong class="money">' + money(c.monto, c.moneda) + '</strong> · pagado <span class="money">' + money(c.pagado, c.moneda) + '</span>' + (c.pagos.length ? ' en ' + c.pagos.length + (c.pagos.length === 1 ? ' pago' : ' pagos') + ' (' + esc(c.pagos.map(x => fmt(x.fecha).slice(0, 5) + ' ' + money(x.monto, c.moneda)).join(', ')) + ')' : '') +
      (c.pasado ? ' · <strong style="color:var(--danger)">se pagó más de lo acordado</strong>' : '') + '</span></span>' +
      (c.saldo > 0.009 ? pill('Debe ' + money(c.saldo, c.moneda), '--s-revision') : pill(c.cerrado && c.pagado < c.monto - 0.009 ? 'Cerrado' : 'Saldado', '--s-entregado')) +
      (conAcciones ? '<span class="toolbar">' + (c.saldo > 0.009 ? '<button type="button" class="btn sm" data-act="aCxpPagar" data-id="' + esc(c.id) + '">Pago a cuenta</button>' : '') + '<button type="button" class="btn ghost sm" data-act="aCxp" data-id="' + esc(c.id) + '">Editar</button></span>' : '') + '</div>').join('') + '</div>';
  }
  function formCxp(proyId, id) {
    const x = id ? (AD.CXP || []).find(c => c.id === id) : null, pid = x ? x.proyecto_id : proyId, p = S.P.find(z => z._id === pid); if (!p) return;
    const provs = (AD.CO || []).filter(c => c.activo || (x && c.id === x.colaborador_id)).sort((a, b) => (a.tipo === 'Proveedor' ? 0 : 1) - (b.tipo === 'Proveedor' ? 0 : 1) || cmp(a.nombre, b.nombre));
    if (!provs.length) { toast('Primero cargá al proveedor en Finanzas › Proveedores'); return; }
    const st = x ? estadoCosto(x) : null;
    openPanel({
      title: x ? st.nombre + ' · ' + p.proyecto : 'Proveedor del proyecto', eyebrow: 'Acordado con proveedores · ' + p.cliente, saveLabel: x ? 'Guardar' : 'Agregar',
      intro: 'Cuánto le vamos a pagar en total por este trabajo. Después le pagás a cuenta cuando entra plata o cuando lo pide, y la app lleva el saldo. El margen del proyecto se calcula contra lo acordado, no solo contra lo ya pagado.' + (st && st.pagos.length ? '<br><b>Ya se le pagó ' + esc(money(st.pagado, st.moneda)) + '.</b>' : ''),
      values: x ? { colaborador_id: x.colaborador_id, concepto: x.concepto, monto: x.monto, moneda: x.moneda, cerrado: x.cerrado, notas: x.notas } : { moneda: (AD.PFZ.get(pid) || {}).moneda || cadm(p.cliente).moneda || 'ARS', cerrado: false },
      fields: [
        { k: 'colaborador_id', label: 'Proveedor', type: 'select', req: 1, html: v => opt('', 'Elegí', v) + provs.map(c => opt(c.id, c.nombre + (c.rubro ? ' · ' + c.rubro : '') + (c.tipo !== 'Proveedor' ? ' (' + c.tipo.toLowerCase() + ')' : ''), v)).join('') },
        { k: 'concepto', label: 'Qué hace', ph: 'Desarrollo web, fotos de producto…' },
        { k: 'monto', label: 'Total acordado', num: 1, req: 1 },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        ...(x ? [{ k: 'cerrado', label: 'Dar por saldado (ya no se le debe nada, aunque lo pagado sea menos)', type: 'check' }] : []),
        { k: 'notas', label: 'Notas', type: 'textarea', full: 1, rows: 2, ph: 'Ej.: anticipo al arrancar, el resto contra entrega' },
      ],
      onSave: async v => {
        if (!v.colaborador_id) throw new Error('Elegí el proveedor');
        if (!(v.monto > 0)) throw new Error('Poné el total acordado');
        const row = { proyecto_id: pid, colaborador_id: v.colaborador_id, concepto: v.concepto || '', monto: v.monto, moneda: v.moneda, cerrado: !!v.cerrado, notas: v.notas || '' };
        if (x) await data.upd('costos_acordados', x.id, row); else await data.ins('costos_acordados', row);
        toast(x ? 'Guardado' : 'Proveedor agregado al proyecto');
      },
      onDelete: x ? async () => { await data.del('costos_acordados', x.id); toast('Quitado' + (st.pagos.length ? ': los pagos ya hechos siguen en Gastos e ingresos' : '')); } : null,
    });
  }
  function formCxpPagar(id) {
    const x = (AD.CXP || []).find(c => c.id === id); if (!x) return;
    const c = estadoCosto(x), p = c.p, co = c.co; if (!p || !co) { toast('Falta el proyecto o el proveedor'); return; }
    const f = finProyecto(p), cjs = cajasDe(c.moneda), mismo = f.moneda === c.moneda;
    const ult = AD.MV.filter(v => v.colaborador_id === co.id && v.egreso > 0).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0];
    const datosPago = [co.banco, co.cbu && 'CBU ' + co.cbu, co.alias_cbu && 'alias ' + co.alias_cbu, co.cuit && 'CUIT ' + co.cuit].filter(Boolean).join(' · ');
    const nPago = c.pagos.length + 1;
    openPanel({
      title: 'Pago a cuenta a ' + c.nombre, eyebrow: p.cliente + ' · ' + p.proyecto, saveLabel: 'Registrar pago',
      intro: 'Se carga como gasto en Gastos e ingresos, asignado a este proyecto y a cuenta de lo acordado.' + (datosPago ? '<br><b>Datos de pago:</b> ' + esc(datosPago) : ''),
      top: '<div class="field full"><dl class="kv"><dt>Acordado</dt><dd class="money">' + money(c.monto, c.moneda) + '</dd><dt>Ya pagado</dt><dd class="money">' + money(c.pagado, c.moneda) + (c.pagos.length ? ' <span class="muted">(' + c.pagos.length + ')</span>' : '') + '</dd><dt>Saldo</dt><dd><b class="money">' + money(c.saldo, c.moneda) + '</b></dd>' +
        (mismo ? '<dt>El cliente pagó</dt><dd class="money">' + money(f.cobrado, f.moneda) + (f.presupuesto ? ' <span class="muted">de ' + money(f.presupuesto, f.moneda) + '</span>' : '') + '</dd><dt>Plata del proyecto en caja</dt><dd class="money">' + money(f.enCaja, f.moneda) + ' <span class="muted">(cobrado − pagado a proveedores)</span></dd>' : '') + '</dl></div>',
      values: { monto: c.saldo, fecha: today(), caja: cjs[0] ? cjs[0].id : '', cuenta: (ult && ult.cuenta) || 'Proveedores', subcuenta: (ult && ult.subcuenta) || '', detalle: (nPago === 1 ? 'Anticipo' : 'A cuenta') + ' · ' + p.proyecto + (c.concepto ? ' (' + c.concepto + ')' : '') },
      fields: [
        { k: 'monto', label: 'Monto', num: 1, req: 1, hint: 'Por defecto, todo el saldo. Si es un pago parcial, cambialo.' },
        { k: 'fecha', label: 'Fecha de pago', type: 'date', req: 1 },
        { k: 'caja', label: 'Sale de la cuenta', type: 'select', html: v => cjs.map(z => opt(z.id, z.nombre, v)).join('') || opt('', 'Sin cuentas en ' + c.moneda, v) },
        { k: 'detalle', label: 'Detalle', full: 1 },
        { k: 'cuenta', label: 'Categoría', type: 'select', opts: [...new Set(AD.PC.map(z => z.cuenta))].sort(cmp), adv: 1 },
        { k: 'subcuenta', label: 'Detalle de la categoría', adv: 1 },
      ],
      masLabel: 'Categoría',
      extra: '<p class="formnote" id="cxp-av" aria-live="polite"></p>',
      onInput: () => {
        const m = parseMonto(($('#af-monto') || {}).value) || 0, el = $('#cxp-av'); if (!el) return;
        const av = [];
        if (m > c.saldo + 0.009) av.push('Es más que el saldo: le quedarías pagando ' + money(r2(c.pagado + m), c.moneda) + ' de ' + money(c.monto, c.moneda) + ' acordados.');
        if (mismo && m > f.enCaja + 0.009) av.push('Con este pago le estás pagando más de lo que el cliente ya pagó del proyecto: ' + money(r2(m - Math.max(0, f.enCaja)), c.moneda) + ' salen de otra plata.');
        el.innerHTML = av.map(a => '<b style="color:var(--warn,#b45309)">' + esc(a) + '</b>').join('<br>');
      },
      onSave: async v => {
        if (!(v.monto > 0)) throw new Error('Poné el monto');
        const mv = await data.ins('movimientos', { fecha: v.fecha, cuenta: v.cuenta || 'Proveedores', subcuenta: v.subcuenta || '', contraparte: co.nombre, persona_id: co.persona_id || null, colaborador_id: co.id, cliente_id: data.ids.cliente(p.cliente), detalle: v.detalle, ingreso: 0, egreso: r2(v.monto), moneda: c.moneda, caja_id: v.caja || null });
        await data.ins('imputaciones', { movimiento_id: mv.id, proyecto_id: p._id, monto: r2(v.monto), costo_id: c.id });
        const queda = Math.max(0, r2(c.saldo - v.monto));
        toast('Pago cargado en Gastos e ingresos · ' + (queda > 0.009 ? 'saldo ' + money(queda, c.moneda) : 'saldado'));
      },
    });
    AD.form.onInput();
  }
  function formProyectoAdm(proyectoId) {
    const p = S.P.find(x => x._id === proyectoId); if (!p) return;
    const f = finProyecto(p), facturadas = f.cs.filter(c => f.env.has('pf:' + c.id)).length;
    const vals = { presupuesto: f.fz.presupuesto ?? (f.programado || ''), moneda: f.moneda, plan_pago: f.fz.plan_pago || (f.cs.length ? 'Personalizado' : '50/50'), inicio_cobro: f.fz.inicio_cobro || (f.cs[0] ? f.cs[0].periodo : thisMonth()), regenerar: !f.cs.length, notas: f.fz.notas || '' };
    const resumenHtml = () => '<div class="field full"><span class="lbl">Cómo viene</span><dl class="kv">' +
      '<dt>Precio total</dt><dd class="money">' + (f.presupuesto != null ? money(f.presupuesto, f.moneda) : '—') + '</dd>' +
      '<dt>Cobros planificados</dt><dd class="money">' + money(f.programado, f.moneda) + ' <span class="muted">(' + f.cs.length + ')</span></dd>' +
      '<dt>Ya incluido en resúmenes enviados</dt><dd class="money">' + money(f.facturado, f.moneda) + '</dd>' +
      '<dt>Pagado a proveedores</dt><dd class="money">' + esc(multi(f.cost)) + '</dd>' +
      (nada(f.pend) ? '' : '<dt>Falta pagar a proveedores</dt><dd class="money">' + esc(multi(f.pend)) + '</dd>') +
      '<dt>Margen</dt><dd><b class="money">' + (f.margen != null ? money(f.margen, f.moneda) : '—') + '</b>' + (f.pct != null ? ' <span class="muted">' + f.pct + '%</span>' : '') + '</dd></dl></div>';
    const cuotasHtml = '<div class="field full"><span class="lbl">Cuotas cargadas</span>' + (f.cs.length ? '<div class="rows" style="border:1px solid var(--line);border-radius:8px">' + f.cs.map(c => '<div class="row" style="cursor:default"><span class="d">' + fmt(c.periodo) + '</span><span class="t"><b class="money">' + money(c.monto, c.moneda) + '</b><span>' + esc(c.concepto || '') + (f.env.has('pf:' + c.id) ? ' · <b style="color:var(--ok)">facturada</b>' : '') + '</span></span>' + (f.env.has('pf:' + c.id) ? '' : '<button type="button" class="btn ghost sm" data-act="aCuotaDel" data-id="' + esc(c.id) + '" aria-label="Quitar">✕</button>') + '</div>').join('') + '</div>' : '<span class="muted">Ninguna todavía.</span>') +
      '<span class="toolbar" style="margin-top:6px"><button type="button" class="btn ghost sm" data-act="aCuotas" data-id="' + esc(p._id) + '">+ Agregar cobro</button></span></div>';
    openPanel({
      title: p.proyecto, eyebrow: 'Precio y cobro · ' + p.cliente, saveLabel: 'Guardar',
      intro: 'Cuánto nos paga el cliente por este trabajo y en cuántas veces. Con eso se arman las cuotas solas y aparecen en el resumen de cada mes. Si el proyecto salió de un presupuesto aceptado (“Convertir en proyecto”), esto ya viene cargado.' + (facturadas ? ' <b>Hay ' + facturadas + ' cuota(s) ya facturada(s): no se regeneran; ajustá las restantes a mano.</b>' : ''),
      values: vals,
      fields: [
        { k: 'presupuesto', label: 'Precio total acordado', num: 1, ph: 'Ej: 1.200.000', hint: 'El total que el cliente aceptó pagar por este trabajo, sin la pauta. Si se cobra en cuotas, poné el total igual.' },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'plan_pago', label: 'Forma de pago', type: 'select', opts: PLANES_PAGO },
        { k: 'inicio_cobro', label: 'Primera cuota (mes)', type: 'month', month: 1 },
        ...(facturadas ? [] : [{ k: 'regenerar', label: f.cs.length ? 'Reemplazar las cuotas cargadas por las de este plan' : 'Generar las cuotas de este plan', type: 'check' }]),
        { k: 'notas', label: 'Notas', type: 'textarea', full: 1, rows: 2 },
      ],
      extra: '<div class="field full" id="pf-prev"></div>' + cuotasHtml + resumenHtml(),
      onInput: () => {
        const v = { pres: parseMonto(($('#af-presupuesto') || {}).value), plan: ($('#af-plan_pago') || {}).value, m0: ($('#af-inicio_cobro') || {}).value, mon: ($('#af-moneda') || {}).value };
        const cs = cuotasPlan(v.plan, v.pres, v.m0), el = $('#pf-prev'); if (!el) return;
        el.innerHTML = cs.length ? '<span class="lbl">Cuotas del plan</span><div class="tags" style="gap:6px">' + cs.map(c => '<span class="tag">' + esc(fmt(c.periodo)) + ' · ' + esc(c.concepto) + ' · ' + esc(money(c.monto, v.mon)) + '</span>').join('') + '</div>' : (v.plan === 'Personalizado' ? '<span class="hint">Personalizado: cargá cada mes con “+ Agregar cobro”.</span>' : '');
      },
      onSave: async v => {
        await data.upsert('proyecto_finanzas', { proyecto_id: p._id, presupuesto: v.presupuesto, moneda: v.moneda, plan_pago: v.plan_pago, inicio_cobro: v.inicio_cobro ? v.inicio_cobro + '-01' : null, notas: v.notas, updated_at: new Date().toISOString() }, 'proyecto_id');
        const cs = cuotasPlan(v.plan_pago, v.presupuesto, v.inicio_cobro);
        if (v.regenerar && cs.length) {
          await data.del('proyecto_facturacion', p._id, 'proyecto_id');
          await data.insMany('proyecto_facturacion', cs.map(c => ({ proyecto_id: p._id, periodo: c.periodo + '-01', concepto: c.concepto, monto: c.monto, moneda: v.moneda })));
        }
        toast('Precio guardado' + (v.regenerar && cs.length ? ' · ' + cs.length + ' cuota(s) generada(s)' : ''));
      },
    });
    AD.form.onInput();
  }
  // Cobro de las piezas extra de una cuenta de Redes: de onda o con precio por formato.
  const extrasCfg = abonoId => { if (!AD.ok) return null; const af = AD.ABF.get(abonoId) || {}; return { admin: true, cobro: !!af.extras_cobro, precios: af.extras_precios && typeof af.extras_precios === 'object' ? af.extras_precios : {}, moneda: af.extras_moneda || (precioEn(abonoId, thisMonth()) || {}).moneda || 'ARS' }; };
  function formExtras(abonoId) {
    const a = S.A.find(x => x._id === abonoId); if (!a) return;
    const af = AD.ABF.get(abonoId) || {}, cfg = extrasCfg(abonoId) || { precios: {} };
    const fs = (S.L.formatosRedes && S.L.formatosRedes.length ? S.L.formatosRedes : ['Reels', 'Posts', 'Historias', 'Carruseles']);
    const pre = f => { const k = Object.keys(cfg.precios).find(x => x.toLowerCase() === f.toLowerCase()); return k ? cfg.precios[k] : ''; };
    openPanel({
      title: a.cliente + ' · Piezas extra', eyebrow: 'Redes',
      intro: 'Las piezas que se hacen fuera del plan del mes. Si se cobran, las del mes aparecen como sugerencia en el resumen, con el precio de cada formato. En cada pieza se puede marcar una excepción (cobrar una suelta o regalar una).',
      values: { extras_cobro: af.extras_cobro ? 'si' : 'no', extras_moneda: cfg.moneda, ...Object.fromEntries(fs.map(f => ['p_' + f, pre(f)])) },
      fields: [
        { k: 'extras_cobro', label: 'Las extras de esta cuenta', type: 'select', html: v => opt('no', 'Van sin cargo (de onda)', v) + opt('si', 'Se cobran', v), full: 1 },
        { k: 'extras_moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        ...fs.map(f => ({ k: 'p_' + f, label: 'Precio por ' + f.toLowerCase().replace(/es$/, '').replace(/s$/, ''), num: 1 })),
      ],
      onSave: async v => {
        const precios = {}; fs.forEach(f => { const n = v['p_' + f]; if (n !== '' && n != null && !isNaN(+n)) precios[f] = +n; });
        await data.upsert('abono_finanzas', { abono_id: abonoId, extras_cobro: v.extras_cobro === 'si', extras_precios: precios, extras_moneda: v.extras_moneda, updated_at: new Date().toISOString() }, 'abono_id');
        AD.ABF.set(abonoId, { ...af, abono_id: abonoId, extras_cobro: v.extras_cobro === 'si', extras_precios: precios, extras_moneda: v.extras_moneda });
        toast('Cobro de extras guardado');
      },
    });
  }
  function formAds(abonoId) {
    const a = S.A.find(x => x._id === abonoId); if (!a) return;
    const af = AD.ABF.get(abonoId) || {};
    openPanel({
      title: a.cliente + ' · Ads', eyebrow: 'Pauta publicitaria',
      intro: 'El honorario de gestión es el precio del abono. Acá va la inversión en pauta (Meta, Google), que es plata del cliente: si la adelanta àndale, se suma al resumen como línea aparte para que la devuelva.',
      values: { inversion: af.inversion ?? '', inversion_moneda: af.inversion_moneda || (precioEn(abonoId, thisMonth()) || {}).moneda || 'ARS', inversion_paga: af.inversion_paga || 'Cliente', plataformas: af.plataformas || '', notas: af.notas || '' },
      fields: [
        { k: 'inversion', label: 'Inversión mensual en pauta', num: 1, hint: 'Valor habitual. Si un mes cambia, editalo en el resumen de ese mes.' },
        { k: 'inversion_moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'inversion_paga', label: 'Quién la paga', type: 'select', html: v => opt('Cliente', 'El cliente, con su tarjeta', v) + opt('àndale', 'La adelanta àndale y se cobra en el resumen', v), full: 1 },
        { k: 'notas', label: 'Notas', type: 'textarea', full: 1, rows: 2 },
      ],
      // Plataformas: de la lista de Opciones (así quedan todas escritas igual). Lo viejo escrito a mano se reconoce.
      extra: (() => {
        const lista = (S.L.plataformasAds && S.L.plataformasAds.length ? S.L.plataformasAds : ['Meta', 'Google', 'TikTok', 'LinkedIn']);
        const tiene = String(af.plataformas || '').split(/\s*[+,/;]\s*|\s+y\s+/i).map(x => x.trim()).filter(Boolean);
        const elegidas = [...new Set(tiene.map(x => lista.find(l => l.toLowerCase() === x.toLowerCase()) || lista.find(l => x.toLowerCase().includes(l.toLowerCase())) || x))];
        const todas = [...lista, ...elegidas.filter(x => !lista.includes(x))];
        return '<div class="field full"><span class="lbl">Plataformas</span><div class="multi" id="ads-plat">' + todas.map(x => '<label><input type="checkbox" value="' + esc(x) + '"' + (elegidas.includes(x) ? ' checked' : '') + '> ' + esc(x) + '</label>').join('') + '</div><span class="hint">Se agregan o cambian en Configuración › Opciones.</span></div>';
      })(),
      onSave: async v => { const plat = [...document.querySelectorAll('#ads-plat input:checked')].map(i => i.value).join(' + '); await data.upsert('abono_finanzas', { abono_id: abonoId, inversion: v.inversion, inversion_moneda: v.inversion_moneda, inversion_paga: v.inversion_paga, plataformas: plat, notas: v.notas, updated_at: new Date().toISOString() }, 'abono_id'); toast('Pauta guardada'); },
    });
  }

  // Imputación de un egreso a abonos / proyectos (para el margen)
  function destinosOpts(cur) {
    const ab = S.A.filter(a => a.estado !== 'Baja' || 'a:' + a._id === cur).sort((x, y) => cmp(x.cliente, y.cliente) || cmp(x.tipo, y.tipo));
    const pr = S.P.filter(p => p.estado !== 'Cancelado' || 'p:' + p._id === cur).sort((x, y) => cmp(x.cliente, y.cliente) || cmp(x.proyecto, y.proyecto));
    return opt('', 'Elegí abono o proyecto', cur) + '<optgroup label="Redes y Ads">' + ab.map(a => opt('a:' + a._id, a.cliente + ' · ' + a.tipo + (a.plan ? ' ' + a.plan : ''), cur)).join('') + '</optgroup>' +
      '<optgroup label="Proyectos">' + pr.map(p => opt('p:' + p._id, p.cliente + ' · ' + p.proyecto, cur)).join('') + '</optgroup>';
  }
  function impSumHtml() {
    const total = parseMonto(($('#af-monto') || {}).value) || 0, sum = r2(AD.impDraft.reduce((a, x) => a + (parseMonto(x.monto) || 0), 0));
    const f = n => String(n).replace('.', ',');
    return AD.impDraft.length ? 'Asignado ' + esc(f(sum)) + ' de ' + esc(f(total)) + (sum > total + 0.01 ? ' · <b style="color:var(--danger)">supera el monto</b>' : sum < total - 0.01 ? ' · queda ' + esc(f(r2(total - sum))) + ' sin asignar' : ' ✓') : 'Opcional. Si este gasto es para un cliente (Ads, web, fotos), asignáselo para ver cuánto te deja.';
  }
  const updateImpSum = () => { const el = $('#imp-sum'); if (el) el.innerHTML = impSumHtml(); };
  function saldosDe(quien) { // acuerdos con saldo del proveedor que se está pagando
    const co = quien && EQ.colabPorNombre(quien); if (!co) return [];
    const usados = new Set(AD.impDraft.map(i => i.costo_id).filter(Boolean));
    return cxpAbiertos().filter(c => c.colaborador_id === co.id && !usados.has(c.id));
  }
  function renderImp() {
    const box = $('#imp-box'); if (!box) return;
    const sug = saldosDe(($('#af-contraparte') || {}).value);
    AD.impSug = sug;
    box.innerHTML = (sug.length ? '<div class="tags" style="gap:6px;margin-bottom:6px">' + sug.map((c, i) => '<button type="button" class="btn sm" data-act="aImpCxp" data-i="' + i + '">A cuenta de ' + esc(c.p.proyecto) + ' · saldo ' + esc(money(c.saldo, c.moneda)) + '</button>').join('') + '</div>' : '') +
      AD.impDraft.map((x, i) => '<div class="improw"><select class="in" aria-label="Cliente o proyecto" data-impi="' + i + '" data-impk="dest">' + destinosOpts(x.dest) + '</select><input class="in" inputmode="decimal" aria-label="Monto" placeholder="Monto" data-impi="' + i + '" data-impk="monto" value="' + esc(x.monto) + '"><button type="button" class="btn ghost sm" data-act="aImpDel" data-i="' + i + '" aria-label="Quitar">✕</button></div>').join('') +
      '<div class="toolbar"><button type="button" class="btn sm" data-act="aImpAdd">+ Otro cliente</button>' + (AD.impDraft.length > 1 ? '<button type="button" class="btn ghost sm" data-act="aImpSplit">Repartir en partes iguales</button>' : '') + (AD.impCopy ? '<button type="button" class="btn ghost sm" data-act="aImpCopy">Copiar reparto del pago anterior a ' + esc(AD.impCopy.contraparte) + '</button>' : '') + '<button type="button" class="btn ghost sm" id="imp-ia" data-act="aImpIA">✨ Sugerir reparto</button></div>' +
      '<span class="hint" id="imp-sum">' + impSumHtml() + '</span>';
  }
  async function guardarImp(movId) {
    const rows = AD.impDraft.filter(x => x.dest && parseMonto(x.monto) > 0).map(x => { const pid = x.dest.startsWith('p:') ? x.dest.slice(2) : null, cid = pid && x.costo_id && (AD.CXP || []).some(c => c.id === x.costo_id && c.proyecto_id === pid) ? x.costo_id : null; return { movimiento_id: movId, abono_id: x.dest.startsWith('a:') ? x.dest.slice(2) : null, proyecto_id: pid, monto: r2(parseMonto(x.monto)), ...(cid ? { costo_id: cid } : {}) }; });
    const prev = AD.IMP.filter(x => x.movimiento_id === movId);
    if (!prev.length && !rows.length) return;
    await data.del('imputaciones', movId, 'movimiento_id');
    if (rows.length) await data.insMany('imputaciones', rows);
  }

  /* ---------- Vista: Rentabilidad ---------- */
  function vRent() {
    const rt = AD.rt, R = rango(AD.per || (AD.per = { k: 'anio' }), today()), y = R.label, m = thisMonth();
    const anios = [...new Set(AD.MV.map(v => (v.fecha || '').slice(0, 4)))].filter(Boolean).sort().reverse();
    const provAnio = AD.MV.filter(v => enRango(v.fecha, R) && v.cuenta === 'Proveedores' && v.egreso > 0);
    const imputadoDe = id => r2(AD.IMP.filter(x => x.movimiento_id === id).reduce((a, x) => a + x.monto, 0));
    const sinImp = provAnio.map(v => ({ v, falta: r2(v.egreso - imputadoDe(v.id)) })).filter(x => x.falta > 0.009).sort((a, b) => (b.v.fecha || '').localeCompare(a.v.fecha || ''));
    const accSin = {}; sinImp.forEach(x => add(accSin, x.v.moneda, x.falta));
    const accImp = {}; AD.IMP.forEach(x => { const mv = movDe(x.movimiento_id); if (mv && enRango(mv.fecha, R)) add(accImp, mv.moneda, x.monto); });
    let h = '<div class="head"><div>' + lock + '<h1>Qué deja cada cliente</h1><p>Lo que queda de cada cliente de Redes y de cada proyecto después de pagar proveedores (sin sueldos ni gastos fijos).</p></div>' +
      '<div class="toolbar"><div class="seg" role="group" aria-label="Ver">' + [['horas', 'Con horas'], ['proyectos', 'Proyectos'], ['abonos', 'Redes']].map(([k, l]) => '<button data-act="aRtVer" data-v="' + k + '" aria-pressed="' + (rt.ver === k) + '">' + l + '</button>').join('') + '</div>' +
      selector(AD.per, anios, esc, today()) + '</div></div>';
    h += '<section class="kpis"><div class="kpi"><span class="eyebrow">Gastos asignados a clientes ' + esc(y) + '</span><b style="font-size:20px" class="money">' + esc(multi(accImp)) + '</b><span>a abonos y proyectos</span></div>' +
      '<div class="kpi ' + (sinImp.length ? 'warn' : '') + '"><span class="eyebrow">Pagos a proveedores sin asignar</span><b style="font-size:20px" class="money">' + esc(multi(accSin)) + '</b><span>' + sinImp.length + ' pagos · ' + esc(y) + '</span></div></section>';
    if (rt.ver === 'horas') h += rentHoras(R);
    else if (rt.ver === 'proyectos') {
      const ps = S.P.filter(p => p.estado !== 'Cancelado' && (AD.PFZ.has(p._id) || AD.PF.some(c => c.proyecto_id === p._id) || AD.IMP.some(x => x.proyecto_id === p._id) || cxpDe(p._id).length)).map(p => ({ p, f: finProyecto(p) })).sort((a, b) => cmp(a.p.cliente, b.p.cliente));
      const sinPres = S.P.filter(p => isOpenP(p) && !AD.PFZ.has(p._id) && !AD.PF.some(c => c.proyecto_id === p._id)).length;
      h += '<section class="sheet"><div class="sheet-h"><h2>Proyectos</h2>' + (sinPres ? '<span class="muted">' + sinPres + ' abiertos sin presupuesto cargado</span>' : '') + '</div>' + (ps.length ? '<div class="tbl"><table><thead><tr><th>Proyecto</th><th>Estado</th><th class="r">Presupuesto</th><th class="r">Facturado</th><th class="r">Falta facturar</th><th class="r">Costos</th><th class="r">Margen</th><th></th></tr></thead><tbody>' +
        ps.map(({ p, f }) => '<tr><td class="name">' + esc(p.proyecto) + '<span class="sub">' + esc(p.cliente) + (f.fz.plan_pago ? ' · ' + esc(f.fz.plan_pago) : '') + '</span></td><td>' + pill(p.estado, ctx.stVar ? ctx.stVar(p.estado) : '--muted') + '</td>' +
          '<td class="r money">' + (f.presupuesto != null ? money(f.presupuesto, f.moneda) : '—') + '</td><td class="r money">' + money(f.facturado, f.moneda) + '</td><td class="r money">' + (f.presupuesto != null ? money(r2(f.presupuesto - f.facturado), f.moneda) : '—') + '</td>' +
          '<td class="r money">' + esc(multi(f.cost) || '—') + (nada(f.pend) ? '' : '<span class="sub">falta pagar ' + esc(multi(f.pend)) + '</span>') + '</td><td class="r"><b class="money">' + (f.margen != null ? money(f.margen, f.moneda) : '—') + '</b>' + (f.pct != null ? '<span class="sub">' + f.pct + '%</span>' : '') + '</td>' +
          '<td class="r"><button class="btn ghost sm" data-act="aProyAdm" data-id="' + esc(p._id) + '">Editar</button></td></tr>').join('') + '</tbody></table></div>' : emptyBox('Todavía no hay proyectos con precio cargado', 'Abrí un proyecto → “Precio y cobro” y cargá cuánto se cobra y en cuántas veces.')) + '</section>';
    } else {
      const meses = []; for (let mm = R.desde.slice(0, 7); mm <= R.hasta.slice(0, 7) && mm <= m; mm = addMonth(mm, 1)) meses.push(mm);
      // Redes y Ads se suman en un solo renglón por cliente (Ads va con Redes).
      const porCl = new Map();
      S.A.forEach(a => {
        const ing = {}; meses.forEach(mm => { if (abonoEnMes(a, mm)) { const pr = precioEn(a._id, mm); if (pr) add(ing, pr.moneda, pr.monto); } });
        const cost = costos('abono', a._id, R);
        if (!Object.keys(ing).length && !Object.keys(cost).length) return;
        const g = porCl.get(a.cliente) || { cliente: a.cliente, abs: [], ing: {}, cost: {} };
        g.abs.push(a); Object.entries(ing).forEach(([k, v]) => add(g.ing, k, v)); Object.entries(cost).forEach(([k, v]) => add(g.cost, k, v)); porCl.set(a.cliente, g);
      });
      const rows = [...porCl.values()].map(g => {
        const mon = Object.keys(g.ing)[0] || Object.keys(g.cost)[0], same = Object.keys(g.cost).every(k => k === mon) && Object.keys(g.ing).length <= 1;
        const margen = same ? r2((g.ing[mon] || 0) - (g.cost[mon] || 0)) : null;
        const red = g.abs.find(a => a.tipo === 'Redes'), ads = g.abs.find(a => a.tipo === 'Ads');
        const desc = [red ? 'Redes' + (red.plan ? ' · plan ' + red.plan : '') : '', ads ? '+ Ads' : '', ...g.abs.filter(a => a.tipo !== 'Redes' && a.tipo !== 'Ads').map(a => a.tipo)].filter(Boolean).join(' ');
        return { ...g, mon, margen, desc, ads, pct: margen != null && g.ing[mon] ? Math.round(margen / g.ing[mon] * 100) : null };
      }).sort((x, z) => cmp(x.cliente, z.cliente));
      h += '<section class="sheet"><div class="sheet-h"><h2>Redes · ' + esc(R.label) + '</h2><span class="muted">ingresos según el precio vigente de cada mes; la pauta de Ads no cuenta como ingreso</span></div>' + (rows.length ? '<div class="tbl"><table><thead><tr><th>Cliente</th><th class="r">Ingresos</th><th class="r">Costos</th><th class="r">Margen</th><th></th></tr></thead><tbody>' +
        rows.map(r => '<tr><td class="name">' + esc(r.cliente) + '<span class="sub">' + esc(r.desc) + '</span></td><td class="r money">' + esc(multi(r.ing) || '—') + '</td><td class="r money">' + esc(multi(r.cost) || '—') + '</td><td class="r"><b class="money">' + (r.margen != null ? money(r.margen, r.mon) : '—') + '</b>' + (r.pct != null ? '<span class="sub">' + r.pct + '%</span>' : '') + '</td><td class="r">' + (r.ads ? '<button class="btn ghost sm" data-act="aAds" data-abono="' + esc(r.ads._id) + '">Pauta de Ads</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : emptyBox('Sin datos para ' + R.label, 'Cargá los precios en Finanzas › Precios y aumentos.')) + '</section>';
    }
    h += '<section class="sheet"><div class="sheet-h"><h2>Pagos a proveedores sin asignar</h2><span class="toolbar"><span class="muted">' + sinImp.length + '</span>' + (sinImp.length ? '<button class="btn sm" data-act="aImpIAvarios">✨ Repartir con IA</button>' : '') + '</span></div>' + (sinImp.length ? '<div class="rows">' + sinImp.slice(0, 30).map(({ v, falta }) => '<div class="row" style="cursor:default"><span class="d">' + fmt(v.fecha) + '</span><span class="t"><b>' + esc(v.contraparte || v.subcuenta) + ' · <span class="money">' + money(falta, v.moneda) + '</span></b><span>' + esc(v.detalle || '') + '</span></span><button class="btn sm" data-act="aMov" data-id="' + esc(v.id) + '">Asignar</button></div>').join('') + '</div>' : emptyBox('Todo asignado', 'Los pagos a proveedores del año ya están asignados a clientes.')) + '</section>';
    return h;
  }
  const isOpenP = p => !['Entregado', 'Cancelado'].includes(p.estado);

  /* ---------- Qué deja cada cliente, contando las horas ---------- */
  // Horas: las que carga el equipo (opcional) al cerrar tareas, en piezas, en el mes de redes y en tickets.
  // Costo de la hora: el que pongan las socias o, si no hay, sueldos del año ÷ horas disponibles del equipo (140 h por persona por mes).
  const cfgRent = () => (AD.AJ && AD.AJ.rentabilidad) || {};
  window.addEventListener('horas-cargadas', () => { AD.HR = null; });
  function costoHoraEstimado(R) {
    const meses = R.meses;
    const lab = AD.MV.filter(v => enRango(v.fecha, R) && v.cuenta === 'Costo Laboral' && v.moneda === 'ARS').reduce((a, v) => a + v.egreso, 0);
    // La gente que cobra sueldo (Equipo); si todavía no hay fichas, los usuarios del equipo.
    const conFicha = AD.CO.filter(c => c.activo && c.tipo !== 'Proveedor').length;
    const gente = Math.max(1, conFicha || S.E.filter(e => e.activo !== false && e.rol !== 'externo').length);
    return lab ? Math.round(lab / (meses * gente * 140)) : 0;
  }
  function filasHoras(R) {
    const hr = AD.HR, ch = +cfgRent().costo_hora || costoHoraEstimado(R), out = new Map();
    const fila = c => { if (!out.has(c)) out.set(c, { cliente: c, ing: 0, ingUsd: 0, hT: 0, hP: 0, hM: 0, hK: 0, hR: 0, extras: 0, prov: 0, proyectos: new Set() }); return out.get(c); };
    const cliMov = v => v.cliente || ((S.C.find(c => c.nombre === v.contraparte) || {}).nombre) || '';
    AD.MV.filter(v => enRango(v.fecha, R) && v.ingreso > 0 && /^Venta/.test(v.cuenta) && cliMov(v)).forEach(v => { const f = fila(cliMov(v)); if (v.moneda === 'ARS') f.ing += v.ingreso; else if (v.moneda === 'USD') f.ingUsd += v.ingreso; else if (v.usd) f.ingUsd += +v.usd; });
    S.P.forEach(p => (p.etapas || []).forEach(t => { if (t.horas && (!t.hechaAt || enRango(String(t.hechaAt), R))) { const f = fila(p.cliente); f.hT += +t.horas; f.proyectos.add(p.proyecto); } }));
    if (hr) {
      hr.piezas.forEach(z => { if (!z.cliente) return; const f = fila(z.cliente); f.hP += z.horas; if (z.extra) f.extras++; });
      hr.meses.forEach(m => { if (m.cliente) fila(m.cliente).hM += m.horas; });
      hr.pedidos.forEach(t => { if (t.cliente) fila(t.cliente).hK += t.horas; });
      (hr.registro || []).forEach(r => { if (r.cliente) fila(r.cliente).hR += r.horas; });
    }
    AD.IMP.forEach(x => { const mv = movDe(x.movimiento_id); if (!mv || !enRango(mv.fecha, R) || mv.moneda !== 'ARS') return; const a = x.abono_id ? S.A.find(z => z._id === x.abono_id) : null, p = x.proyecto_id ? S.P.find(z => z._id === x.proyecto_id) : null; const c = (a && a.cliente) || (p && p.cliente); if (c) fila(c).prov += x.monto; });
    return { ch, filas: [...out.values()].map(f => { const horas = Math.round((f.hT + f.hP + f.hM + f.hK + f.hR) * 100) / 100, costo = horas * ch, queda = f.ing - costo - f.prov; return { ...f, horas, costo, queda, pct: f.ing ? Math.round(queda / f.ing * 100) : null, vh: horas && f.ing ? Math.round(f.ing / horas) : null }; }).filter(f => f.ing || f.horas).sort((a, b) => (a.pct ?? 999) - (b.pct ?? 999)) };
  }
  function rentHoras(R) {
    const y = R.desde + '|' + R.hasta;
    if (!AD.HR || AD.HR.y !== y) { if (!AD.hrCargando) { AD.hrCargando = true; data.horasRango(R.desde, R.hasta).then(r => { AD.HR = { ...r, y }; }, () => { AD.HR = { y, piezas: [], meses: [], pedidos: [] }; }).finally(() => { AD.hrCargando = false; ctx.render(); }); } return '<section class="sheet">' + emptyBox('Juntando las horas del período…', '') + '</section>'; }
    const { ch, filas } = filasHoras(R), est = costoHoraEstimado(R), cfg = cfgRent();
    const totH = filas.reduce((a, f) => a + f.horas, 0), conHoras = filas.filter(f => f.horas).length;
    const M = v => money(Math.round(v), 'ARS');
    let h = '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.reloj + '</span><h2>Lo que deja cada cliente, contando el tiempo <span class="sx-sub">(' + esc(R.label) + ', en pesos)</span></h2></div>' +
      '<div class="sx-ns pl-ns"><div class="sx-n"><b>' + esc(Math.round(totH).toLocaleString('es-AR')) + ' h</b><span>Horas cargadas</span><small>' + conHoras + ' de ' + filas.length + ' clientes tienen horas</small></div>' +
      '<div class="sx-n"><b>' + esc(M(ch)) + '</b><span>Costo de la hora</span><small>' + (cfg.costo_hora ? 'el que pusieron ustedes' : est ? 'estimado con los sueldos del período' : 'cargalo abajo') + '</small></div></div>' +
      '<div class="sx-panel rt-ch"><label for="rt-ch">Costo de la hora del equipo</label><input class="in" id="rt-ch" type="number" min="0" step="100" value="' + esc(cfg.costo_hora || '') + '" placeholder="' + esc(est ? String(est) : 'Ej.: 9000') + '"><button class="btn sm" data-act="aRtCh">Guardar</button>' +
      '<span class="muted">' + (est ? 'Estimado: ' + esc(M(est)) + ' (sueldos del período ÷ 140 h por persona por mes). ' : '') + 'Si lo dejan vacío se usa el estimado.</span></div>' +
      (totH ? '' : '<div class="sx-panel"><p class="sx-lead" style="margin:0"><b>Todavía no hay horas cargadas.</b> Cada uno las anota con el reloj de arriba (“¿En qué estuviste trabajando?”). Con unas semanas de datos esto empieza a decir algo; mientras tanto, los números son orientativos.</p></div>') +
      (filas.length ? '<div class="tbl sx-tbl"><table><thead><tr><th>Cliente</th><th class="r">Ingresó</th><th class="r">Horas</th><th class="r">Costo del tiempo</th><th class="r">Proveedores</th><th class="r">Queda</th><th class="r">Valor hora real</th><th class="r">Extras</th></tr></thead><tbody>' +
        filas.map(f => '<tr><td><span class="sx-cl">' + (ctx.av ? ctx.av(f.cliente, (S.C.find(x => x.nombre === f.cliente) || {}).avatar, 'sq') : '') + '<span><b>' + esc(f.cliente) + '</b>' + (f.ingUsd ? '<span class="sub">+ ' + esc(money(f.ingUsd, 'USD')) + ' en dólares (no suma acá)</span>' : '') + '</span></span></td><td class="r">' + esc(M(f.ing)) + '</td>' +
          '<td class="r" title="' + esc('Reloj ' + Math.round(f.hR * 10) / 10 + ' h' + (f.hT + f.hP + f.hM + f.hK ? ' · cargadas antes en tareas, piezas y tickets ' + Math.round((f.hT + f.hP + f.hM + f.hK) * 10) / 10 + ' h' : '')) + '">' + (f.horas ? esc(f.horas.toLocaleString('es-AR')) + ' h' : '<span class="muted">—</span>') + '</td><td class="r">' + (f.horas ? esc(M(f.costo)) : '—') + '</td><td class="r">' + (f.prov ? esc(M(f.prov)) : '—') + '</td>' +
          '<td class="r"><b class="sx-big' + (f.queda < 0 ? ' neg' : '') + '">' + esc(M(f.queda)) + '</b>' + (f.pct != null ? '<span class="sub">' + f.pct + '%</span>' : '') + '</td><td class="r">' + (f.vh != null ? '<span class="' + (ch && f.vh < ch ? 'neg' : '') + '">' + esc(M(f.vh)) + '</span>' : '—') + '</td><td class="r">' + (f.extras || '—') + '</td></tr>').join('') + '</tbody></table></div>' : '') +
      '</section>';
    // Lectura de Mr. Piggy
    const an = AD.rtIA;
    h += '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.ia + '</span><h2>Qué ve Mr. Piggy</h2><div class="sx-der"><button class="btn sm" data-act="aRtIA"' + (AD.rtIABusy || !filas.length ? ' disabled' : '') + '>' + (AD.rtIABusy ? 'Mirando los números…' : an ? 'Volver a analizar' : 'Analizar') + '</button></div></div>' +
      (an ? '<div class="sx-panel rt-ia"><p class="sx-lead" style="color:var(--fg)">' + esc(an.resumen) + '</p>' +
        ((an.alertas || []).length ? '<div class="bl">' + an.alertas.map(a => '<div class="bl-r"><div class="bl-t">' + (ctx.av ? ctx.av(a.cliente, (S.C.find(x => x.nombre === a.cliente) || {}).avatar, 'sq') : '') + '<span class="bl-l">' + esc(a.cliente) + '</span></div><p class="rt-p"><b>' + esc(a.problema) + '</b> ' + esc(a.sugerencia) + '</p></div>').join('') + '</div>' : '') +
        ((an.oportunidades || []).length ? '<h4 style="margin:14px 0 6px">Oportunidades</h4><ul class="rt-ul">' + an.oportunidades.map(o => '<li>' + esc(o) + '</li>').join('') + '</ul>' : '') + '</div>'
        : '<div class="sx-panel"><p class="sx-lead" style="margin:0">Mira margen, horas y extras de cada cliente y marca dónde conviene ajustar precio o alcance. Las horas son aproximadas, así que lo toma con pinzas.</p></div>') + '</section>';
    // Presupuestador
    const pr = AD.rtPre;
    h += '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.precios + '</span><h2>¿Cuánto nos llevó algo parecido?</h2></div>' +
      '<div class="sx-panel rt-pre"><div class="field full"><label for="rt-pre-t">Contá el trabajo nuevo</label><textarea id="rt-pre-t" rows="3" placeholder="Ej.: branding completo para una cervecería artesanal, con logo, paleta, tipografías y aplicaciones en etiqueta y redes">' + esc((pr && pr.pedido) || '') + '</textarea></div>' +
      '<div class="toolbar"><select class="in" id="rt-pre-tipo" aria-label="Tipo">' + opt('', 'Tipo de trabajo', (pr && pr.tipo) || '') + (S.L.tipos || []).map(t => opt(t, t, (pr && pr.tipo) || '')).join('') + '</select><button class="btn primary" data-act="aRtPre"' + (AD.rtPreBusy ? ' disabled' : '') + '>' + ICON.ia + (AD.rtPreBusy ? 'Calculando…' : 'Estimar con Mr. Piggy') + '</button></div>' +
      (pr && pr.r ? '<div class="sx-ns pl-ns rt-pre-r"><div class="sx-n"><b>' + esc(String(pr.r.horas)) + ' h</b><span>Horas estimadas</span>' + (pr.r.horas_min != null ? '<small>entre ' + pr.r.horas_min + ' y ' + pr.r.horas_max + ' h</small>' : '') + '</div>' +
        (pr.r.precio_sugerido ? '<div class="sx-n"><b>' + esc(money(pr.r.precio_sugerido, pr.r.moneda || 'ARS')) + '</b><span>Precio sugerido</span><small>con el costo de la hora y margen</small></div>' : '') + '</div><p class="sx-lead" style="margin:0">' + esc(pr.r.explicacion) + '</p>' : '') + '</div></section>';
    return h;
  }

  /* ---------- Vista: Precios y aumentos ---------- */
  // Meses entre dos 'AAAA-MM'.
  const mesesEntre = (a, b) => { if (!a || !b) return null; const [y1, m1] = a.slice(0, 7).split('-').map(Number), [y2, m2] = b.slice(0, 7).split('-').map(Number); return (y2 - y1) * 12 + (m2 - m1); };
  const pctDe = id => { const v = AD.pp.pctPor && AD.pp.pctPor[id]; return parseMonto(v != null && v !== '' ? v : AD.pp.pct); };
  function vPrecios() {
    const pp = AD.pp, m = thisMonth(); pp.pctPor = pp.pctPor || {}; pp.minMeses = pp.minMeses || '3';
    const ordT = t => t === 'Redes' ? 0 : t === 'Ads' ? 1 : 2;
    const ab = S.A.filter(a => a.estado === 'Activo').sort((a, b) => cmp(a.cliente, b.cliente) || ordT(a.tipo) - ordT(b.tipo));
    const pct = parseMonto(pp.pct);
    const sel = ab.filter(a => pp.sel.has(a._id));
    const sinAum = a => { const cur = precioEn(a._id, m); const ref = cur ? cur.desde : (a.desde || ''); return mesesEntre(ref, pp.desde || m); };
    let h = '<div class="head"><div>' + lock + '<h1>Precios a clientes</h1><p>Lo que paga cada cliente por Redes (y Ads, si lo suma), los aumentos y el historial. Elegí a quiénes les aplicás cada aumento.</p></div>' +
      (AD.PR.some(p => p.desde > m && !p.aviso_enviado) ? '<div class="toolbar"><button class="btn primary" data-act="aAvisos">Avisar aumentos por email</button></div>' : '') + '</div>';
    h += '<section class="sheet"><div class="sheet-h"><h2>Aplicar aumento</h2><span class="muted">' + sel.length + (sel.length === 1 ? ' elegido' : ' elegidos') + '</span></div><div class="sheet-b" style="display:grid;gap:12px"><div class="toolbar" style="align-items:flex-end">' +
      '<div class="field"><label for="pp-pct">Aumento %</label><input class="in" id="pp-pct" data-app="pct" inputmode="decimal" value="' + esc(pp.pct) + '" placeholder="4" style="width:90px"></div>' +
      '<div class="field"><label for="pp-desde">Desde qué mes</label><input class="in" id="pp-desde" type="month" data-app="desde" value="' + esc(pp.desde) + '"></div>' +
      '<div class="field" style="flex:1;min-width:240px"><label for="pp-mot">Motivo (sale en el mail al cliente)</label><input class="in" id="pp-mot" data-app="motivo" list="dl-motivos" value="' + esc(pp.motivo) + '" placeholder="Ej.: la inflación de los últimos meses">' +
      '<datalist id="dl-motivos"><option value="la inflación de los últimos meses"><option value="el aumento de nuestros costos (herramientas, licencias y equipo)"><option value="la suma de servicios al abono"><option value="la actualización anual de tarifas"></datalist></div></div>' +
      '<div class="toolbar pp-sel"><span class="muted">Elegir:</span><button class="btn sm" data-act="aPpAll">Todos</button><button class="btn sm" data-act="aPpSin">Los que llevan</button><select class="in sm" data-app="minMeses" aria-label="Meses sin aumento">' + ['2', '3', '4', '6', '12'].map(n => opt(n, n + ' meses o más', pp.minMeses)).join('') + '</select><span class="muted">sin aumento</span><button class="btn sm ghost" data-act="aPpNone">Ninguno</button>' +
      '<span style="flex:1"></span><button class="btn primary" data-act="aPpApply"' + (sel.length && sel.every(a => pctDe(a._id)) ? '' : ' disabled') + '>Aplicar a ' + sel.length + '</button></div>' +
      '<p class="muted" style="margin:0;font-size:13px">Podés cambiar el % de un cliente en particular en su fila. Los que entraron hace poco o aumentaron hace poco aparecen marcados.</p></div></section>';
    const rows = ab.map((a, i) => {
      const first = i === 0 || ab[i - 1].cliente !== a.cliente;
      const cur = precioEn(a._id, m), next = precioEn(a._id, '9999-12'), hist = historial(a._id);
      const futuro = next && next.desde > m ? next : null, on = pp.sel.has(a._id), pr = pctDe(a._id);
      const nuevo = pr && cur && on ? r2(cur.monto * (1 + pr / 100)) : null;
      const desdeAlta = mesesEntre(a.desde, m), ult = cur ? mesesEntre(cur.desde, m) : null, sa = sinAum(a);
      const reciente = (desdeAlta != null && desdeAlta < 3) || (cur && ult != null && ult < 2 && hist.length > 1);
      const aviso = futuro ? (futuro.aviso_enviado ? '<span class="muted">Avisado ' + fmt(futuro.aviso_enviado) + '</span>' : '<button class="btn sm" data-act="aAviso" data-id="' + esc(futuro.id) + '">Avisar por email</button>') : '';
      const serv = a.tipo === 'Redes' ? 'Redes' + (a.plan ? ' · plan ' + a.plan : '') : a.tipo === 'Ads' ? '+ Ads' : a.tipo;
      return '<tr class="' + (on ? 'pp-on' : '') + (first ? ' pp-g' : ' pp-sub') + '"><td><input type="checkbox" aria-label="Elegir ' + esc(a.cliente + ' ' + a.tipo) + '" data-ppsel="' + esc(a._id) + '"' + (on ? ' checked' : '') + (cur ? '' : ' disabled') + '></td><td class="name">' + (first ? '<button class="btn link" data-act="ficha" data-cliente="' + esc(a.cliente) + '">' + esc(a.cliente) + '</button>' : '') + '<span class="pp-sv"><span class="sv" style="--c:var(' + (a.tipo === 'Ads' ? '--t-naranja' : '--t-rosa') + ')">' + esc(serv) + '</span>' + (a.tipo === 'Ads' ? (a.tipo === 'Ads' ? (() => { const af = AD.ABF.get(a._id); return '<button class="sv sv-b" style="--c:var(--c6)" data-act="aAds" data-abono="' + esc(a._id) + '">' + (af && af.inversion ? esc((af.inversion_paga === 'àndale' ? 'Adelanta àndale · ' : 'Paga el cliente · ') + money(af.inversion, af.inversion_moneda)) : 'Cargar pauta') + '</button>'; })() : '') : '') + (a.tipo === 'Redes' ? (() => { const af = AD.ABF.get(a._id); return '<button class="sv sv-b" style="--c:var(--c6)" data-act="aExtras" data-abono="' + esc(a._id) + '" title="Piezas fuera del plan">' + (af && af.extras_cobro ? 'Extras: se cobran' : 'Extras: de onda') + '</button>'; })() : '') + (desdeAlta != null && desdeAlta < 3 ? '<span class="sv" style="--c:var(--s-revision)">nuevo · entró ' + (desdeAlta <= 0 ? 'este mes' : 'hace ' + desdeAlta + (desdeAlta === 1 ? ' mes' : ' meses')) + '</span>' : '') + '</span></td>' +

        '<td class="r">' + (cur ? '<b class="money">' + money(cur.monto, cur.moneda) + '</b><span class="sub">desde ' + fmt(cur.desde) + '</span>' : '<span class="sv" style="--c:var(--crit)">Sin precio</span>') + '</td>' +
        '<td>' + (sa != null ? '<span class="sv" style="--c:var(' + (sa >= 6 ? '--s-cancelado' : sa >= 3 ? '--s-revision' : '--s-entregado') + ')">' + (sa <= 0 ? 'este mes' : sa + (sa === 1 ? ' mes' : ' meses')) + '</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td class="r">' + (on && cur ? '<input class="in sm pp-pct" inputmode="decimal" data-pppct="' + esc(a._id) + '" value="' + esc(pp.pctPor[a._id] != null ? pp.pctPor[a._id] : '') + '" placeholder="' + esc(pp.pct || '%') + '" aria-label="% para ' + esc(a.cliente) + '"> %' : '') + '</td>' +
        '<td class="r">' + (futuro ? '<b class="money">' + money(futuro.monto, futuro.moneda) + '</b><span class="sub">desde ' + fmt(futuro.desde) + '</span>' + (futuro.motivo && !/^Aumento \d/i.test(futuro.motivo) ? '<span class="sub muted" title="' + esc(futuro.motivo) + '">' + esc(futuro.motivo.length > 28 ? futuro.motivo.slice(0, 27) + '…' : futuro.motivo) + '</span>' : '') : nuevo ? '<b class="money" style="opacity:.7">' + money(nuevo, cur.moneda) + '</b><span class="sub">vista previa · +' + esc(String(pr).replace('.', ',')) + '%</span>' : '<span class="muted">—</span>') + (reciente && on ? '<span class="sub t-crit">ojo: es reciente</span>' : '') + '</td>' +
        '<td class="r nowrap">' + aviso + '<button class="btn ghost sm" data-act="aPrecio" data-abono="' + esc(a._id) + '" title="' + hist.length + (hist.length === 1 ? ' precio cargado' : ' precios cargados') + '">' + (cur ? 'Cambiar' : 'Cargar precio') + '</button></td></tr>';
    }).join('');
    return h + '<section class="sheet"><div class="tbl"><table class="pp-t"><thead><tr><th></th><th>Cliente y servicio</th><th class="r">Hoy paga</th><th>Sin aumento</th><th class="r">% propio</th><th class="r">Próximo</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  }

  /* ---------- Sección en la ficha del cliente ---------- */
  // Seguimiento de mails: si el cliente lo abrió (y cuándo) o hizo clic. Los mails anteriores a esta función no tienen seguimiento.
  const SEG_DESDE = '2026-10-15T16:00:00Z';
  const hora = iso => { const d = new Date(iso); return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }); };
  function segMail(x) {
    if (x.estado !== 'Enviado') return pill(x.estado, '--crit');
    const sg = AD.SEGM && AD.SEGM.get(x.id);
    if (sg && sg.abierto) return '<span class="seg-ps"><span class="seg-p on" title="La primera vez: ' + esc(hora(sg.primera)) + '">' + ICON.ojo + 'Abierto' + (sg.abierto > 1 ? ' ×' + sg.abierto : '') + ' · ' + esc(hora(sg.ultima)) + '</span>' + (sg.clics ? '<span class="seg-p clic">' + ICON.enlace + (sg.clics > 1 ? sg.clics + ' clics' : 'Hizo clic') + '</span>' : '') + '</span>';
    if (sg && sg.clics) return '<span class="seg-p clic">' + ICON.enlace + 'Hizo clic</span>';
    if (String(x.created_at) < SEG_DESDE) return '<span class="seg-p">Enviado</span>';
    return '<span class="seg-p no">Sin abrir todavía</span>';
  }
  // ¿Abrió el mail de este tipo y mes? (para marcar "visto" en Cobros)
  const mailDe = (cliente, tipo, per) => { const cid = data.ids.cliente(cliente); return AD.EM.find(x => x.cliente_id === cid && x.tipo === tipo && (!per || String(x.periodo || '').slice(0, 7) === per) && x.estado === 'Enviado'); };
  const vistoChip = m => { const sg = m && AD.SEGM && AD.SEGM.get(m.id); return sg && sg.abierto ? ' <span class="seg-p on sm" title="Lo abrió ' + esc(hora(sg.ultima)) + '">' + ICON.ojo + 'Visto</span>' : ''; };
  function emailsDe(cliente) {
    const cid = data.ids.cliente(cliente), es = AD.EM.filter(x => x.cliente_id === cid && x.tipo !== 'Mensaje' && !x.archivado).slice(0, 10); // los de novedades viven en la pestaña Mails
    if (!es.length) return '';
    return '<div class="sheet-b" style="border-top:1px solid var(--line);display:grid;gap:6px"><b>Emails enviados</b><div class="rows">' + es.map(x => '<div class="row" style="cursor:default"><span class="d">' + fmt(String(x.created_at).slice(0, 10)) + '</span><span class="t"><b>' + esc(x.asunto) + '</b><span>' + esc(x.tipo + ' · ' + (x.para || []).join(', ') + (x.adjuntos && x.adjuntos.length ? ' · 📎 ' + x.adjuntos.join(', ') : '')) + (x.error ? ' · ' + esc(x.error) : '') + '</span></span>' + segMail(x) + '</div>').join('') + '</div></div>';
  }
  // Estado de cuenta de un cliente: lo facturado (cargos) y lo cobrado (pagos), con el saldo que va quedando.
  function estadoCuenta(cliente, R) {
    const y = today().slice(0, 4); R = R || rango({ k: 'anio' }, today());
    const facs = AD.F.filter(f => f.cliente === cliente);
    const ids = new Set(facs.map(f => f.id));
    const pagos = AD.MV.filter(v => v.ingreso > 0 && (ids.has(v.factura_id) || (v.cliente === cliente && /^Venta/.test(v.cuenta) && !v.factura_id)));
    // Si una factura figura cobrada pero el pago no está atado a un movimiento, igual se muestra (con la fecha de la factura).
    facs.forEach(f => { const ya = pagos.filter(v => v.factura_id === f.id).reduce((a, v) => a + v.ingreso, 0); if (f.cobrado - ya > 0.009) pagos.push({ fecha: f.fecha, ingreso: r2(f.cobrado - ya), moneda: f.moneda, detalle: 'registrado en la factura ' + (f.numero || ''), factura_id: f.id }); });
    const debe = {}, venc = {}, facAnio = {}, cobAnio = {};
    facs.forEach(f => { if (f.saldo > 0.009) { add(debe, f.moneda, f.saldo); if (estadoFactura(f) === 'Vencida') add(venc, f.moneda, f.saldo); } if (enRango(f.fecha, R)) add(facAnio, f.moneda, f.monto); });
    pagos.forEach(v => { if (enRango(v.fecha, R)) add(cobAnio, v.moneda, v.ingreso); });
    const ultimoPago = pagos.reduce((a, v) => (v.fecha || '') > a ? v.fecha : a, '');
    const vencidas = facs.filter(f => estadoFactura(f) === 'Vencida').sort((a, b) => (a.vencimiento || '').localeCompare(b.vencimiento || ''));
    return { facs, pagos, debe, venc, facAnio, cobAnio, ultimoPago, vencidas, y, R };
  }
  const nada = o => !Object.values(o).some(v => Math.abs(v) > 0.009);
  const monto = o => nada(o) ? money(0, 'ARS') : multi(o);
  // Movimientos de la cuenta en orden, con el saldo acumulado (una tabla por moneda).
  function libroCuenta(ec) {
    const porMon = {};
    ec.facs.forEach(f => (porMon[f.moneda] = porMon[f.moneda] || []).push({ f: f.fecha || '', t: verTipo(f.tipo) + ' ' + (f.numero || 'sin número') + (f.concepto ? ' · ' + f.concepto : ''), cargo: f.monto, pago: 0, act: 'aFactura', id: f.id, pill: efPill(f) }));
    ec.pagos.forEach(v => (porMon[v.moneda] = porMon[v.moneda] || []).push({ f: v.fecha || '', t: 'Pago' + (v.detalle ? ' · ' + v.detalle : ''), cargo: 0, pago: v.ingreso }));
    const mons = Object.keys(porMon); if (!mons.length) return emptyBox('Todavía no hay facturas ni pagos', 'Cuando se le facture o pague, aparece acá con el saldo que va quedando.');
    return mons.map(mo => {
      const xs = porMon[mo].sort((a, b) => a.f.localeCompare(b.f) || (b.cargo - a.cargo)); let sal = 0;
      xs.forEach(x => { sal += x.cargo - x.pago; x.sal = sal; });
      const vis = xs.slice(-14).reverse();
      return (mons.length > 1 ? '<div class="ec-mon">' + esc(mo) + '</div>' : '') + '<div class="tbl"><table class="ec"><thead><tr><th>Fecha</th><th>Qué</th><th class="r">Se facturó</th><th class="r">Pagó</th><th class="r">Saldo</th></tr></thead><tbody>' +
        vis.map(x => '<tr' + (x.act ? ' class="click" data-act="' + x.act + '" data-id="' + esc(x.id) + '"' : '') + '><td class="mono">' + (x.f ? fmt(x.f) : '—') + '</td><td>' + esc(x.t) + (x.pill ? ' ' + x.pill : '') + '</td><td class="r money">' + (x.cargo ? money(x.cargo, mo) : '') + '</td><td class="r money" style="color:var(--money)">' + (x.pago ? money(x.pago, mo) : '') + '</td><td class="r money"' + (x.sal > 0.009 ? ' style="font-weight:650"' : '') + '>' + money(x.sal, mo) + '</td></tr>').join('') +
        '</tbody></table></div>' + (xs.length > 14 ? '<p class="muted ec-mas">Se ven los últimos 14 movimientos. El detalle completo está en Cobros → Facturas.</p>' : '');
    }).join('');
  }
  function fichaSection(c) {
    const ca = cadm(c.nombre), ec = estadoCuenta(c.nombre), m = thisMonth(), cu = cuenta(c.nombre, m);
    const proys = S.P.filter(p => p.cliente === c.nombre && !['Cancelado'].includes(p.estado));
    const n = (v, l, sub, cls) => '<div class="sx-n' + (cls ? ' ' + cls : '') + '"><b>' + esc(v) + '</b><span>' + esc(l) + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    const resEst = cu.res ? (cu.res.estado === 'Enviado' ? 'Enviado el ' + fmt(cu.res.enviado_el || '').slice(0, 5) : 'Preparado, sin enviar') : (cu.total ? 'Sin preparar' : 'Nada para cobrar este mes');
    let h = '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.plata + '</span><h2>Estado de cuenta</h2><div class="sx-der toolbar">' +
      (ec.vencidas.length ? '<button class="btn sm" data-act="aRecCliente" data-cliente="' + esc(c.nombre) + '">Mandar recordatorio</button>' : '') +
      masMenu([{ act: 'aMailLibre', label: 'Escribir un email', icon: 'mail', attrs: ' data-cliente="' + esc(c.nombre) + '"' }, { act: 'aClienteAdm', label: 'Datos de facturación', icon: 'doc', attrs: ' data-cliente="' + esc(c.nombre) + '"' }]) + '</div></div>' +
      '<div class="kqs kqs-in">' + kq('Debe hoy', ec.debe, { sub: nada(ec.debe) ? '<span class="pill-n pos">Está al día</span>' : nada(ec.venc) ? 'nada vencido' : '<span class="pill-n neg">' + esc(multi(ec.venc)) + ' vencido</span>', tono: nada(ec.venc) ? '' : 'neg' }) +
      kq('Pagó en ' + ec.y, ec.cobAnio, { sub: ec.ultimoPago ? 'último pago ' + fmt(ec.ultimoPago) : 'sin pagos registrados', tono: 'pos' }) +
      kq('Se le facturó en ' + ec.y, ec.facAnio, { sub: ec.facs.length + ' factura' + (ec.facs.length === 1 ? '' : 's') + ' en total' }) + '</div>' +
      '<div class="ec-mes"><div><span class="lbl">' + esc(cap(monthLabel(m))) + '</span><b class="money">' + (cu.total ? money(cu.total, cu.moneda) : '—') + '</b><span class="muted">' + esc(resEst) + (cu.res ? '' : cu.total ? ' · estimado con abonos y cuotas' : '') + '</span></div>' +
      (cu.total || cu.res ? '<button class="btn ' + (cu.res && cu.res.estado === 'Enviado' ? '' : 'primary') + '" data-act="aCuentaDe" data-cliente="' + esc(c.nombre) + '">' + (cu.res && cu.res.estado === 'Enviado' ? 'Ver resumen' : cu.res ? 'Revisar y mandar resumen' : 'Preparar resumen') + '</button>' : '') + '</div>' +
      '<div class="sx-panel">' + libroCuenta(ec) + '</div></section>';
    if (proys.length) h += '<section class="sheet"><div class="sheet-h"><h2>Proyectos: precio y cobro</h2></div><div class="rows">' + proys.map(p => { const f = finProyecto(p), pend = f.presupuesto != null ? Math.max(0, (f.presupuesto || 0) - f.facturado) : null;
      return '<button class="row" data-act="aProyAdm" data-id="' + esc(p._id) + '"><span class="d">' + esc(p.estado || '') + '</span><span class="t"><b>' + esc(p.proyecto) + '</b><span>' + (f.presupuesto != null ? 'Precio ' + money(f.presupuesto, f.moneda) + (f.fz.plan_pago ? ' · ' + esc(f.fz.plan_pago) : '') + ' · facturado ' + money(f.facturado, f.moneda) + (pend > 0.009 ? ' · falta facturar ' + money(pend, f.moneda) : '') : 'Sin precio cargado') + '</span></span><span class="muted">' + (f.presupuesto != null ? 'Editar' : 'Cargar precio') + '</span></button>'; }).join('') + '</div></section>';
    h += '<details class="sheet ec-datos"><summary class="sheet-h"><h2>Datos de facturación</h2><span class="muted">' + esc([ca.razon_social, fmtCuit(ca.cuit || '')].filter(Boolean).join(' · ') || 'sin cargar') + '</span></summary><div class="sheet-b"><dl class="kv">' +
      '<dt>Razón social</dt><dd>' + (ca.razon_social ? esc(ca.razon_social) : '<span class="muted">—</span>') + '</dd>' +
      '<dt>CUIT</dt><dd>' + (ca.cuit ? esc(fmtCuit(ca.cuit)) + (ca.condicion_iva ? ' · ' + esc(ca.condicion_iva) : '') : '<span class="muted">—</span>') + '</dd>' +
      '<dt>Domicilio</dt><dd>' + (ca.domicilio ? esc(ca.domicilio) : '<span class="muted">—</span>') + '</dd>' +
      '<dt>Cómo se factura</dt><dd>' + esc(verTipo(ca.comprobante_default || 'Factura ARCA')) + (ca.emisor_default ? ' · la hace ' + esc(ca.emisor_default) : '') + ' · ' + esc(ca.moneda || 'ARS') + '</dd>' +
      '<dt>Resúmenes y facturas a</dt><dd>' + (mailsDe(c.nombre) ? esc(mailsDe(c.nombre)) + (cobrosDe(c.nombre).length ? '' : ' <span class="muted">(email de facturación)</span>') : '<span class="muted">Nadie. Marcá en Contactos quién los recibe.</span>') + '</dd>' +
      '<dt>Carpeta</dt><dd>' + (ca.carpeta_admin ? '<a href="' + esc(ca.carpeta_admin) + '" target="_blank" rel="noopener">Carpeta de administración</a>' : '<span class="muted">—</span>') + '</dd></dl>' +
      '<button class="btn sm" data-act="aClienteAdm" data-cliente="' + esc(c.nombre) + '">Editar datos</button></div></details>';
    return h + emailsDe(c.nombre);
  }

  // Una línea para el resumen del cliente: cuánto debe y cómo está el mes.
  function deudaLinea(cliente) {
    const ec = estadoCuenta(cliente);
    if (!ec.facs.length && nada(ec.cobAnio)) return '';
    return '<button class="ec-linea" data-act="ctab" data-t="cuenta">' + ICON.plata + '<span>' + (nada(ec.debe) ? 'Está al día' : 'Debe <b class="money">' + esc(multi(ec.debe)) + '</b>' + (nada(ec.venc) ? '' : ' · <b style="color:var(--crit)">' + esc(multi(ec.venc)) + ' vencido</b>')) + (ec.ultimoPago ? ' · último pago ' + fmt(ec.ultimoPago) : '') + '</span><span class="muted">Ver facturación →</span></button>';
  }
  // Todas las cuentas juntas: quién debe, cuánto pagó y cómo está el resumen del mes.
  function vCuentas() {
    const m = thisMonth(), mesN = monthLabel(m).split(' ')[0], cf = AD.cf || (AD.cf = { debe: false });
    const q = norm(S.cuq || '');
    const P = AD.cuPer || (AD.cuPer = { k: 'anio' }), R = rango(P, today());
    const filas = S.C.filter(c => c.estado !== 'Inactivo' || AD.F.some(f => f.cliente === c.nombre && f.saldo > 0.009)).map(c => ({ c, ec: estadoCuenta(c.nombre, R), cu: cuenta(c.nombre, m) }))
      .filter(r => r.ec.facs.length || r.cu.total || r.c.estado === 'Activo');
    const tot = { debe: {}, venc: {}, cob: {} }; let nDeben = 0, nVenc = 0;
    filas.forEach(r => { Object.entries(r.ec.debe).forEach(([mo, v]) => add(tot.debe, mo, v)); Object.entries(r.ec.venc).forEach(([mo, v]) => add(tot.venc, mo, v)); Object.entries(r.ec.cobAnio).forEach(([mo, v]) => add(tot.cob, mo, v)); if (!nada(r.ec.debe)) nDeben++; if (!nada(r.ec.venc)) nVenc++; });
    const peso = o => (o.ARS || 0) + (o.USD || 0) * 1000 + (o.EUR || 0) * 1100;
    const vis = filas.filter(r => (!q || norm(r.c.nombre).includes(q)) && (!cf.debe || !nada(r.ec.debe))).sort((a, b) => peso(b.ec.venc) - peso(a.ec.venc) || peso(b.ec.debe) - peso(a.ec.debe) || cmp(a.c.nombre, b.c.nombre));
    const n = (v, l, sub, cls) => '<div class="sx-n' + (cls ? ' ' + cls : '') + '"><b>' + esc(v) + '</b><span>' + esc(l) + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    let h = '<div class="head"><div><h1>Saldos de clientes</h1><p>Cuánto debe y cuánto pagó cada cliente. Tocá uno para ver sus facturas y pagos.</p></div></div>';
    h += kqs([kq('Falta cobrar', tot.debe, { sub: nDeben ? '<span class="pill-s">' + nDeben + ' cliente' + (nDeben === 1 ? '' : 's') + ' con saldo</span>' : '<span class="pill-n pos">Nadie debe</span>' }),
      kq('Vencido', tot.venc, { sub: nVenc ? '<span class="pill-n neg">' + nVenc + ' cliente' + (nVenc === 1 ? '' : 's') + '</span>' : 'nada vencido', tono: nada(tot.venc) ? '' : 'neg' }),
      kq('Cobrado · ' + R.label, tot.cob, { tono: 'pos' })]);
    h += '<div class="toolbar fbar2"><input class="in" type="search" id="cuq" data-bind="cuq" placeholder="Buscar cliente" value="' + esc(S.cuq || '') + '"><button class="btn mio' + (cf.debe ? ' on' : '') + '" data-act="aCuDebe" aria-pressed="' + !!cf.debe + '">Solo los que deben</button><span style="flex:1"></span>' + selector(P, [...new Set(AD.MV.map(v => (v.fecha || '').slice(0, 4)))].filter(Boolean).sort().reverse(), esc, today(), 'cuper') + '</div>';
    if (!vis.length) return h + '<section class="sheet">' + emptyBox('Ningún cliente coincide', '') + '</section>';
    const resTxt = cu => cu.res ? (cu.res.estado === 'Enviado' ? pill('Enviado', '--s-entregado') : pill('Preparado', '--s-revision')) : cu.total ? pill('Sin preparar', '--s-empezar') : '<span class="muted">—</span>';
    h += '<section class="sheet"><div class="tbl"><table><thead><tr><th>Cliente</th><th class="r">Debe</th><th class="r">Pagó · ' + esc(R.label) + '</th><th>Último pago</th><th>Resumen de ' + esc(mesN) + '</th><th></th></tr></thead><tbody>' +
      vis.map(({ c, ec, cu }) => '<tr class="click" data-act="ficha" data-cliente="' + esc(c.nombre) + '" data-tab="cuenta"><td class="name"><span class="who1">' + ctx.av(c.nombre, c.avatar, 'sq') + esc(c.nombre) + '</span></td>' +
        '<td class="r money"' + (nada(ec.venc) ? '' : ' style="color:var(--crit);font-weight:650"') + '>' + (nada(ec.debe) ? '<span class="muted">—</span>' : esc(multi(ec.debe))) + (nada(ec.venc) ? '' : '<span class="sub">' + esc(multi(ec.venc)) + ' vencido</span>') + '</td>' +
        '<td class="r money">' + (nada(ec.cobAnio) ? '<span class="muted">—</span>' : esc(multi(ec.cobAnio))) + '</td><td class="mono">' + (ec.ultimoPago ? fmt(ec.ultimoPago) : '<span class="muted">—</span>') + '</td><td>' + resTxt(cu) + '</td>' +
        '<td class="r"><span class="toolbar" style="justify-content:flex-end">' + (ec.vencidas.length ? '<button class="btn sm" data-act="aRecCliente" data-cliente="' + esc(c.nombre) + '">Recordatorio</button>' : '') + (cu.total || cu.res ? '<button class="btn sm ghost" data-act="aCuentaDe" data-cliente="' + esc(c.nombre) + '">Resumen</button>' : '') + '</span></td></tr>').join('') +
      '</tbody></table></div><div class="count num">' + vis.length + ' clientes</div></section>';
    return h;
  }

  /* ---------- Sección en la ficha del proyecto ---------- */
  function proyectoSection(p) {
    const f = finProyecto(p), pend = r2((f.presupuesto || 0) - f.facturado);
    const cuotas = f.cs.map(c => '<div class="row" style="cursor:default"><span class="d">' + fmt(c.periodo) + '</span><span class="t"><b class="money">' + money(c.monto, c.moneda) + '</b><span>' + esc(c.concepto || '') + '</span></span>' + (f.env.has('pf:' + c.id) ? pill('Facturada', '--s-entregado') : pill('Pendiente', '--s-empezar')) + '</div>').join('');
    return '<section class="sheet"><div class="sheet-h"><h2>Precio y cobro</h2><button class="btn sm" data-act="aProyAdm" data-id="' + esc(p._id) + '">' + (f.presupuesto != null ? 'Editar' : 'Cargar precio') + '</button></div>' +
      (f.presupuesto != null || f.cs.length ? '<div class="sheet-b"><dl class="kv">' +
        '<dt>Precio total</dt><dd><b class="money">' + (f.presupuesto != null ? money(f.presupuesto, f.moneda) : '—') + '</b>' + (f.fz.plan_pago ? ' <span class="muted">' + esc(f.fz.plan_pago) + '</span>' : '') + '</dd>' +
        '<dt>Facturado</dt><dd class="money">' + money(f.facturado, f.moneda) + (f.presupuesto != null && pend > 0.009 ? ' <span class="muted">· falta ' + money(pend, f.moneda) + '</span>' : '') + '</dd>' +
        (f.facturado ? '<dt>Cobrado</dt><dd class="money">' + money(f.cobrado, f.moneda) + ' <span class="muted">según lo cobrado de cada mes</span></dd>' : '') +
        '<dt>Pagado a proveedores</dt><dd class="money">' + esc(multi(f.cost)) + '</dd>' +
        (nada(f.pend) ? '' : '<dt>Falta pagar a proveedores</dt><dd class="money"><b>' + esc(multi(f.pend)) + '</b></dd>') +
        (f.facturado || f.costMismo ? '<dt>Plata del proyecto en caja</dt><dd class="money">' + money(f.enCaja, f.moneda) + (f.pendMismo > 0.009 ? ' <span class="muted">· ' + (f.enCaja - f.pendMismo >= -0.009 ? 'libre después de pagar lo que se debe: ' + money(r2(f.enCaja - f.pendMismo), f.moneda) : 'faltan ' + money(r2(f.pendMismo - f.enCaja), f.moneda) + ' para cubrir lo que se debe a proveedores') + '</span>' : '') + '</dd>' : '') +
        '<dt>Margen</dt><dd><b class="money">' + (f.margen != null ? money(f.margen, f.moneda) : '—') + '</b>' + (f.pct != null ? ' ' + pill(f.pct + '%', f.pct >= 50 ? '--s-entregado' : f.pct >= 25 ? '--s-revision' : '--s-cancelado') : '') + (f.pendMismo > 0.009 ? ' <span class="muted">contando lo que falta pagar</span>' : '') + '</dd></dl></div>' + (cuotas ? '<div class="rows" style="border-top:1px solid var(--line)">' + cuotas + '</div>' : '')
        : emptyBox('Todavía no cargaste cuánto se cobra', 'Poné el precio total y en cuántas veces: las cuotas aparecen solas en el resumen de cada mes.')) + '</section>' +
      '<section class="sheet"><div class="sheet-h"><h2>Proveedores</h2><button class="btn sm" data-act="aCxp" data-proy="' + esc(p._id) + '">+ Proveedor</button></div>' +
      (f.cxp.length ? cxpFilas(f, true) : emptyBox('Sin proveedores cargados', 'Si alguien de afuera trabaja en este proyecto (web, fotos, video), cargá cuánto se le acordó: vas a ver lo pagado, el saldo y el margen real.')) + '</section>';
  }

  /* ---------- Formularios (panel lateral) ---------- */
  function field(f, v) {
    const id = 'af-' + f.k;
    if (f.type === 'check') return '<label class="chk full"><input type="checkbox" id="' + id + '"' + (v ? ' checked' : '') + '> ' + esc(f.label) + '</label>';
    let ctl;
    if (f.type === 'select') ctl = '<select id="' + id + '">' + (f.html ? f.html(v || '') : optsFrom(f.opts, v || '', f.blank)) + '</select>';
    else if (f.type === 'textarea') ctl = '<textarea id="' + id + '" rows="' + (f.rows || 3) + '">' + esc(v || '') + '</textarea>';
    else ctl = '<input id="' + id + '" type="' + (f.type || 'text') + '" value="' + esc(v ?? '') + '"' + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.num ? ' inputmode="decimal"' : '') + '>';
    const lbl = '<label for="' + id + '">' + esc(f.label) + (f.req ? ' <b>*</b>' : '') + '</label>';
    return '<div class="field' + (f.full ? ' full' : '') + '">' + (f.piggy ? '<div class="lbl-row">' + lbl + '<button type="button" class="btn link sm piggy-f" data-act="aPiggyCampo" data-k="' + esc(f.k) + '">' + ICON.ia + 'Que lo escriba Mr. Piggy</button></div>' : lbl) + ctl + (f.hint ? '<span class="hint" id="ah-' + f.k + '">' + esc(f.hint) + '</span>' : '') + '<span class="err" id="ae-' + f.k + '" hidden></span></div>';
  }
  function openPanel(cfg) {
    AD.form = cfg;
    const p = $('#panel');
    p.innerHTML = '<form id="aform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(cfg.eyebrow || 'Administración') + '</span><h2 id="panel-title">' + esc(cfg.title) + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b">' + (cfg.intro ? '<p class="formnote">' + cfg.intro + '</p>' : '') + (cfg.top || '') + (cfg.fields || []).filter(f => !f.adv).map(f => field(f, cfg.values[f.k])).join('') +
      ((cfg.fields || []).some(f => f.adv) ? '<details class="mas full" id="af-mas"' + (cfg.masAbierto ? ' open' : '') + '><summary>' + esc(cfg.masLabel || 'Más opciones') + '</summary><div class="mas-b">' + (cfg.fields || []).filter(f => f.adv).map(f => field(f, cfg.values[f.k])).join('') + '</div></details>' : '') +
      (cfg.extra || '') + '</div>' +
      '<div class="panel-f"><span id="adel">' + (cfg.onDelete ? '<button type="button" class="btn ghost danger" data-act="aDel">' + esc(cfg.deleteLabel || 'Eliminar') + '</button>' : '') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button>' + (cfg.onSave ? '<button type="submit" class="btn primary" id="asave">' + esc(cfg.saveLabel || 'Guardar') + '</button>' : '') + '</span></div></form>';
    p.hidden = false; $('#scrim').hidden = false;
  }
  function readPanel() {
    const out = {}; let bad = false;
    for (const f of AD.form.fields || []) {
      const el = $('#af-' + f.k); if (!el) continue;
      let v = f.type === 'check' ? el.checked : el.value.trim();
      if (f.num) { v = v === '' ? null : parseMonto(v); if (v === null && f.req) bad = true; }
      if (f.month && v && !/^\d{4}-\d{2}$/.test(v)) { const e = $('#ae-' + f.k); e.textContent = 'Formato AAAA-MM'; e.hidden = false; bad = true; }
      if (f.req && (v === '' || v === null)) { const e = $('#ae-' + f.k); e.textContent = 'Completá este campo'; e.hidden = false; bad = true; if (f.adv && $('#af-mas')) $('#af-mas').open = true; }
      out[f.k] = v;
    }
    return bad ? null : out;
  }
  async function submitPanel() {
    const v = readPanel(); if (!v) return;
    const btn = $('#asave'); if (btn) { btn.disabled = true; btn.textContent = AD.form.busyLabel || 'Guardando…'; }
    try { await AD.form.onSave(v); ctx.closeForm(); await ctx.reload(); const after = AD.postSave; AD.postSave = null; if (after) after(); }
    catch (err) { toast(err.message); if (btn) { btn.disabled = false; btn.textContent = AD.form.saveLabel || 'Guardar'; } }
  }

  function formFactura(id, preset, opts = {}) {
    if (id && (AD.F.find(x => x.id === id) || {}).tipo === 'Invoice' && !opts.comoFactura) return formInvoice(id);
    const f = id ? AD.F.find(x => x.id === id) : null;
    const driveLibres = AD.DA.filter(d => !d.factura_id && d.estado !== 'Ignorado');
    const iaBox = '<div class="field full iabox"><span class="lbl">✨ ¿Tenés el PDF? La IA completa todo</span><div class="toolbar">' +
      '<label class="btn sm primary" style="cursor:pointer"><span id="ff-ia-lbl">Subir el PDF</span><input type="file" id="ff-ia" accept="application/pdf,image/*" hidden></label>' +
      (driveLibres.length ? '<select class="in" id="ff-drive" aria-label="Archivo de Drive">' + opt('', 'O elegí uno de Drive (' + driveLibres.length + ')', '') + driveLibres.slice(0, 200).map(d => opt(d.id, d.nombre + (d.datos && d.datos.total != null ? ' · ' + money(d.datos.total, d.datos.moneda) : ''), '')).join('') + '</select>' : '') +
      '</div><span class="hint">La IA lee la factura y completa los campos. Revisalos antes de guardar.</span></div>';
    const cliente = f ? f.cliente : (preset && preset.cliente) || (AD.rd && AD.rd.cliente) || '';
    const ca = cadm(cliente);
    const base = f || Object.assign({ tipo: ca.comprobante_default || 'Factura ARCA', emisor: ca.emisor_default || '', fecha: today(), moneda: AD.rd ? AD.rd.moneda : (ca.moneda || 'ARS'), monto: AD.rd ? r2(totalItems(AD.rd.items)) : '', periodo: AD.rd ? AD.rd.m : thisMonth(), concepto: AD.rd ? 'Servicios ' + monthLabel(AD.rd.m) : '' }, preset || {});
    if (!f && !base.vencimiento) { const d = new Date(); d.setDate(d.getDate() + 10); base.vencimiento = d.toISOString().slice(0, 10); }
    openPanel({
      title: f ? (verTipo(f.tipo) + ' ' + (f.numero || 'sin número')) : 'Nueva factura', eyebrow: f ? 'Editar factura' : 'Nueva',
      values: Object.assign({}, base, { cliente }),
      fields: [
        { k: 'cliente', label: 'Cliente', type: 'select', html: v => clienteOpts(v), req: 1, full: 1 },
        { k: 'monto', label: 'Monto', num: 1, req: 1 },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'numero', label: 'Número', ph: '00002-00000210', hint: 'Las facturas argentinas se hacen en ARCA: acá anotás número y monto para seguir el cobro. Para clientes del exterior usá “+ Invoice”.' },
        { k: 'fecha', label: 'Fecha', type: 'date', req: 1 },
        { k: 'emisor', label: '¿Quién factura?', type: 'select', opts: EMISORES, blank: '—' },
        { k: 'periodo', label: '¿De qué mes es?', type: 'month', month: 1 },
        { k: 'tipo', label: 'Tipo', type: 'select', html: v => TIPOS_COMP.map(t => opt(t, verTipo(t), v)).join(''), adv: 1 },
        { k: 'vencimiento', label: 'Vencimiento', type: 'date', adv: 1 },
        { k: 'concepto', label: 'Concepto', full: 1, adv: 1, piggy: () => {
          const g = k => (($('#af-' + k) || {}).value || '').trim(), cl = g('cliente');
          const ej = [...new Set(AD.F.filter(x => x.concepto && x.cliente === cl).map(x => x.concepto))].slice(0, 6);
          const ab = S.A.filter(a => a.cliente === cl && a.estado === 'Activo').map(a => a.tipo + (a.plan ? ' ' + a.plan : '')), pr = S.P.filter(p => p.cliente === cl && !['Cancelado'].includes(p.estado)).slice(0, 5).map(p => p.proyecto);
          return { tarea: 'concepto', texto: ['Cliente: ' + cl, 'Tipo: ' + g('tipo'), 'Monto: ' + g('monto') + ' ' + g('moneda'), g('periodo') ? 'Mes: ' + g('periodo') : '', ab.length ? 'Servicios mensuales (Redes y Ads): ' + ab.join(', ') : '', pr.length ? 'Proyectos: ' + pr.join(', ') : '', g('concepto') ? 'Lo que ya escribieron: ' + g('concepto') : '', ej.length ? 'Conceptos de otras facturas a este cliente:\n- ' + ej.join('\n- ') : ''].filter(Boolean).join('\n') };
        } },
        { k: 'link_pdf', label: 'Link al PDF (carpeta de administración)', type: 'url', full: 1, ph: 'https://drive.google.com/...', adv: 1 },
        { k: 'notas', label: 'Notas', type: 'textarea', full: 1, rows: 2, adv: 1 },
      ],
      masAbierto: !!f,
      top: f ? '' : iaBox,
      extra: (f && f.cobrado > 0 ? '<p class="formnote">Cobrado: ' + money(f.cobrado, f.moneda) + '. Los cobros están en Gastos e ingresos.</p>' : '') + (opts.archivo ? '<p class="formnote">Desde Drive: <a href="' + esc(opts.archivo.link) + '" target="_blank" rel="noopener">' + esc(opts.archivo.nombre) + '</a>. Al guardar queda unido a esta factura.</p>' : ''),
      onSave: async v => {
        // La misma factura cargada dos veces deja una deuda que no existe (una queda cobrada y la otra "vencida").
        const nNum = x => String(x || '').split(/\D+/).filter(Boolean).map(t => t.replace(/^0+/, '') || '0').join('-');
        const dup = v.numero && nNum(v.numero) ? AD.F.find(x => !x.anulada && (!f || x.id !== f.id) && x.tipo === v.tipo && (x.emisor || '') === (v.emisor || '') && nNum(x.numero) === nNum(v.numero)) : null;
        if (dup) throw new Error('La factura N° ' + dup.numero + ' ya está cargada (' + dup.cliente + (dup.periodo ? ', ' + monthLabel(dup.periodo) : '') + '). Si es la misma, abrí esa y editala en vez de cargarla de nuevo.');
        const row = { cliente_id: data.ids.cliente(v.cliente), tipo: v.tipo, emisor: v.emisor || '', numero: v.numero, periodo: v.periodo ? v.periodo + '-01' : null, fecha: v.fecha, vencimiento: v.vencimiento || null, moneda: v.moneda, monto: v.monto, concepto: v.concepto, link_pdf: v.link_pdf, notas: v.notas };
        const archivo = opts.archivo || (AD.form && AD.form.archivo) || null;
        let fid = f && f.id;
        if (f) await data.upd('facturas', f.id, row); else fid = (await data.ins('facturas', row)).id;
        if (opts.onSaved) await opts.onSaved(fid, v);
        else if (archivo && !f) { await data.upd('drive_archivos', archivo.id, { factura_id: fid }); await AS.aprender(archivo, v); }
        else if (!f && AD.form && AD.form.archivoDatos) await AS.aprender({ datos: AD.form.archivoDatos }, v);
        toast(f ? 'Factura actualizada' : 'Factura cargada');
      },
      deleteLabel: 'Anular factura',
      onDelete: f ? async () => { await data.upd('facturas', f.id, { anulada: true }); toast('Factura anulada'); } : null,
    });
  }
  /* ---------- Invoice para clientes del exterior (en inglés). En Argentina se factura en ARCA. ---------- */
  const PDFm = (n, m) => { try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: m || 'USD' }).format(n || 0); } catch (e) { return m + ' ' + n; } };
  const itemsInv = f => Array.isArray(f.items) && f.items.length ? f.items : [{ concepto: f.concepto || 'Professional services', monto: f.monto }];
  async function invoicePdf(f) {
    const docs = await pdfLib(); const c = datosClienteDoc(f.cliente);
    const notaPago = (f.notas || '').split('\n---pago---\n');
    const bytes = await docs.invoiceDoc({ cfg: cfgDocs(), numero: f.numero, fecha: f.fecha, vence: f.vencimiento, emisor: f.emisor, moneda: f.moneda, cliente: { ...c, nombre: f.cliente }, items: itemsInv(f).map(i => ({ concepto: i.concepto, monto: +i.monto || 0 })), total: f.monto, nota: notaPago[0] || '', pago: notaPago[1] || '' });
    const nombre = 'Invoice ' + (f.numero || '') + ' ' + f.cliente;
    return { bytes, nombre, base64: docs.bytesBase64(bytes), docs };
  }
  function invItemsHtml() {
    const it = AD.invDraft;
    return it.map((x, i) => '<div class="improw"><input class="in" data-inv="concepto" data-i="' + i + '" value="' + esc(x.concepto) + '" placeholder="Description (in English)" aria-label="Descripción"><input class="in" data-inv="monto" data-i="' + i + '" value="' + esc(x.monto) + '" inputmode="decimal" placeholder="0" aria-label="Importe"><button type="button" class="btn ghost sm" data-act="aInvDel" data-i="' + i + '" aria-label="Quitar">✕</button></div>').join('') +
      '<div class="toolbar" style="margin-top:6px"><button type="button" class="btn ghost sm" data-act="aInvAdd">+ Ítem</button><button type="button" class="btn ghost sm" data-act="aInvEn">Pasar al inglés con Mr. Piggy</button><span style="flex:1"></span><b class="money" id="inv-tot"></b></div>';
  }
  function invTotal() { const m = ($('#af-moneda') || {}).value || 'USD'; const t = r2(AD.invDraft.reduce((a, x) => a + (parseMonto(x.monto) || 0), 0)); const el = $('#inv-tot'); if (el) el.textContent = 'Total ' + PDFm(t, m); return t; }
  function renderInv() { const b = $('#inv-items'); if (b) b.innerHTML = invItemsHtml(); invTotal(); }
  function formInvoice(id, preset) {
    const f = id ? AD.F.find(x => x.id === id) : null;
    const cliente = f ? f.cliente : (preset && preset.cliente) || '';
    const ca = cadm(cliente) || {};
    const [nota, pago] = f ? String(f.notas || '').split('\n---pago---\n') : ['', lsGetPago()];
    const ext = MONEDAS.filter(m => m !== 'ARS');
    const vence = () => { const d = new Date(); d.setDate(d.getDate() + 15); return d.toISOString().slice(0, 10); };
    AD.invDraft = f ? itemsInv(f).map(i => ({ concepto: i.concepto, monto: String(i.monto) })) : [{ concepto: '', monto: '' }];
    openPanel({
      title: f ? 'Invoice ' + (f.numero || '') : 'Nuevo invoice', eyebrow: 'Cliente del exterior', saveLabel: f ? 'Guardar' : 'Crear invoice',
      intro: 'Para clientes de afuera que piden invoice (no es una factura argentina: esas se hacen en ARCA). Sale en inglés con número propio' + (f ? '' : ' (INV-' + new Date().getFullYear() + '-…)') + ', los datos del cliente y cómo pagar.',
      values: f ? { cliente, fecha: f.fecha, vencimiento: f.vencimiento || '', moneda: f.moneda, emisor: f.emisor || '', periodo: f.periodo ? f.periodo.slice(0, 7) : '', nota, pago } : { cliente, fecha: today(), vencimiento: vence(), moneda: ext.includes(ca.moneda) ? ca.moneda : 'USD', emisor: ca.emisor_default || '', periodo: thisMonth(), nota: '', pago },
      fields: [
        { k: 'cliente', label: 'Cliente', type: 'select', html: v => clienteOpts(v), req: 1, full: 1, hint: 'Razón social, dirección y Tax ID salen de Administración del cliente.' },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: ext },
        { k: 'emisor', label: '¿Quién factura?', type: 'select', opts: EMISORES, blank: '—' },
        { k: 'fecha', label: 'Fecha', type: 'date', req: 1 },
        { k: 'vencimiento', label: 'Vence', type: 'date' },
        { k: 'periodo', label: '¿De qué mes es?', type: 'month', month: 1, adv: 1 },
        { k: 'nota', label: 'Nota en el invoice (inglés)', type: 'textarea', rows: 2, full: 1, adv: 1, ph: 'Thank you for your business!' },
        { k: 'pago', label: 'Payment instructions (opcional)', type: 'textarea', rows: 4, full: 1, adv: 1, hint: 'Si lo dejás vacío salen las cuentas del exterior cargadas en Ajustes. Lo último que escribas queda como predeterminado.' },
      ],
      masLabel: 'Mes, nota y datos de pago',
      top: '<div class="field full"><span class="lbl">Ítems</span><div id="inv-items" class="impbox"></div></div>',
      onInput: () => invTotal(),
      onSave: async v => {
        const items = AD.invDraft.map(x => ({ concepto: String(x.concepto || '').trim(), monto: parseMonto(x.monto) || 0 })).filter(x => x.concepto || x.monto);
        if (!items.length) throw new Error('Cargá al menos un ítem');
        const monto = r2(items.reduce((a, x) => a + x.monto, 0));
        if (v.pago) lsSetPago(v.pago);
        const row = { cliente_id: data.ids.cliente(v.cliente), tipo: 'Invoice', emisor: v.emisor || '', periodo: v.periodo ? v.periodo + '-01' : null, fecha: v.fecha, vencimiento: v.vencimiento || null, moneda: v.moneda, monto, concepto: items[0].concepto, items, notas: [v.nota || '', v.pago || ''].join('\n---pago---\n').replace(/\n---pago---\n$/, '') };
        let fid = f && f.id;
        if (f) await data.upd('facturas', f.id, row); else fid = (await data.ins('facturas', row)).id;
        toast(f ? 'Invoice actualizado' : 'Invoice creado. Abrilo en PDF o mandalo desde la lista.');
        AD.postSave = () => { const nf = AD.F.find(x => x.id === fid); if (nf && !f) actions.aInvoicePdf({ dataset: { id: fid } }); };
      },
      deleteLabel: 'Anular invoice',
      onDelete: f ? async () => { await data.upd('facturas', f.id, { anulada: true }); toast('Invoice anulado'); } : null,
    });
    renderInv();
  }
  function lsGetPago() { try { return localStorage.getItem('andale-ops:invpago') || ''; } catch (e) { return ''; } }
  function lsSetPago(v) { try { localStorage.setItem('andale-ops:invpago', v); } catch (e) { } }
  document.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.inv && AD.invDraft) { AD.invDraft[+t.dataset.i][t.dataset.inv] = t.value; invTotal(); } });
  const cajasDe = moneda => AD.CJ.filter(c => c.activa && (!moneda || c.moneda === moneda));
  const subcuentaSugerida = cliente => { const a = S.A.find(x => x.cliente === cliente && x.estado === 'Activo'); return a && a.tipo === 'Ads' ? 'S.Redes Ads' : 'S.Redes sociales'; };
  const subcuentas = cuenta => [...new Set(AD.PC.filter(p => p.cuenta === cuenta).map(p => p.subcuenta).filter(Boolean))].sort(cmp);
  function formCobro(id) {
    const f = AD.F.find(x => x.id === id); if (!f) return;
    const cuenta = f.moneda === 'USD' ? 'Ventas en USD' : f.moneda === 'EUR' ? 'Venta en Euros' : f.moneda === 'GBP' ? 'Venta en Libras' : f.moneda === 'ARS' ? 'Ventas en Pesos' : 'Venta en ' + f.moneda;
    const cjs = cajasDe(f.moneda);
    openPanel({
      title: 'Cobro de ' + f.cliente, eyebrow: verTipo(f.tipo) + ' ' + (f.numero || 'sin número'), saveLabel: 'Registrar cobro',
      intro: 'Falta cobrar: <b class="money">' + money(f.saldo, f.moneda) + '</b>. El cobro queda como ingreso en Gastos e ingresos.',
      values: { fecha: today(), monto: f.saldo, caja: cjs[0] ? cjs[0].id : '', subcuenta: subcuentaSugerida(f.cliente), detalle: (f.periodo ? 'Mes de ' + monthLabel(f.periodo) : f.concepto) },
      fields: [
        { k: 'fecha', label: 'Fecha de cobro', type: 'date', req: 1 },
        { k: 'monto', label: 'Monto cobrado (' + f.moneda + ')', num: 1, req: 1 },
        ...(esExterior(f.moneda) ? [{ k: 'usd', label: '¿Cuántos USD entraron?', num: 1, hint: 'Si ya lo pasaste a dólares (Wise, banco), poné lo que llegó. Si todavía no, dejalo vacío y lo completás después.' }] : []),
        { k: 'caja', label: 'Entró a la cuenta', type: 'select', html: v => cjs.map(c => opt(c.id, c.nombre, v)).join('') || opt('', 'Cargá cuentas en ' + f.moneda, v), req: 1 },
        { k: 'subcuenta', label: 'Detalle de la categoría', type: 'select', opts: subcuentas(cuenta).length ? subcuentas(cuenta) : ['S.Redes sociales', 'S.Redes Ads', 'S.Web', 'S.Branding', 'S.Diseño Grafico', 'S.Videos'] },
        { k: 'detalle', label: 'Detalle', full: 1 },
      ],
      onSave: async v => {
        await data.ins('movimientos', { fecha: v.fecha, cuenta, subcuenta: v.subcuenta, contraparte: f.cliente, cliente_id: f.cliente_id, detalle: v.detalle, ingreso: v.monto, egreso: 0, moneda: f.moneda, caja_id: v.caja || null, factura_id: f.id, ...(esExterior(f.moneda) ? { usd: v.usd ?? null } : {}) });
        toast('Cobro registrado');
      },
    });
  }
  function formGestion(tipo, texto) {
    const rd = AD.rd;
    openPanel({
      title: tipo || 'Anotar aviso', eyebrow: rd.cliente + ' · ' + monthLabel(rd.m), saveLabel: 'Anotar',
      intro: texto ? 'Copiá el texto, mandalo por donde corresponda y anotalo acá.' : '',
      values: { tipo: tipo || 'Factura enviada', fecha: today(), canal: 'WhatsApp', nota: '', texto: texto || '' },
      fields: [
        ...(texto ? [{ k: 'texto', label: 'Mensaje', type: 'textarea', full: 1, rows: 6 }] : []),
        { k: 'tipo', label: 'Tipo', type: 'select', opts: ['Resumen de cuenta', 'Factura enviada', 'Recordatorio de pago', 'Aviso de aumento', 'Otro'] },
        { k: 'fecha', label: 'Fecha', type: 'date', req: 1 },
        { k: 'canal', label: 'Canal', type: 'select', opts: S.L.canales },
        { k: 'nota', label: 'Nota', full: 1 },
      ],
      extra: texto ? '<div class="toolbar" style="grid-column:1/-1"><button type="button" class="btn sm" data-act="aCopyPanel">Copiar mensaje</button></div>' : '',
      onSave: async v => { await data.ins('gestiones', { cliente_id: data.ids.cliente(rd.cliente), periodo: rd.m + '-01', tipo: v.tipo, fecha: v.fecha, canal: v.canal, nota: v.nota, persona_id: data.ids.persona(S.me.alias) }); toast('Aviso anotado'); },
    });
  }
  function formClienteAdm(cliente) {
    const ca = cadm(cliente);
    openPanel({
      title: cliente, eyebrow: 'Datos de facturación',
      values: Object.assign({ moneda: 'ARS', comprobante_default: 'Factura ARCA' }, ca),
      fields: [
        { k: 'razon_social', label: 'Razón social', full: 1 },
        { k: 'cuit', label: 'CUIT' },
        { k: 'condicion_iva', label: 'Condición frente al IVA', type: 'select', opts: ['Responsable inscripto', 'Monotributo', 'Consumidor final', 'Exento', 'Exterior'], blank: '—' },
        { k: 'domicilio', label: 'Domicilio', full: 1, ph: 'Calle 123, ciudad', hint: 'Sale en los resúmenes y propuestas.' },
        { k: 'comprobante_default', label: 'Factura habitual', type: 'select', html: v => TIPOS_COMP.map(t => opt(t, verTipo(t), v)).join('') },
        { k: 'emisor_default', label: 'Factura habitualmente', type: 'select', opts: EMISORES, blank: '—' },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'email_facturacion', label: 'Email(s) de facturación (respaldo)', hint: 'Se usan solo si ningún contacto tiene marcado “Recibe resúmenes y facturas”. Lo ideal es manejarlo desde Contactos, en la ficha del cliente.' },
        { k: 'carpeta_admin', label: 'Carpeta de administración (Drive)', type: 'url', full: 1, ph: 'https://drive.google.com/...' },
        { k: 'notas', label: 'Notas administrativas', type: 'textarea', full: 1, rows: 2 },
      ],
      onSave: async v => { await data.upsert('clientes_admin', Object.assign({ cliente_id: data.ids.cliente(cliente), updated_at: new Date().toISOString() }, v), 'cliente_id'); toast('Datos de facturación guardados'); },
    });
  }
  function formPrecio(abonoId) {
    const a = S.A.find(x => x._id === abonoId); if (!a) return;
    const cur = precioEn(abonoId, thisMonth()); const hist = historial(abonoId);
    openPanel({
      title: a.cliente + ' · ' + a.tipo + (a.plan ? ' ' + a.plan : ''), eyebrow: 'Precio del abono',
      values: { desde: cur ? addMonth(thisMonth(), 1) : thisMonth(), monto: '', moneda: cur ? cur.moneda : (cadm(a.cliente).moneda || 'ARS'), motivo: cur ? '' : 'Precio inicial' },
      fields: [
        { k: 'desde', label: 'Desde qué mes', type: 'month', month: 1, req: 1 },
        { k: 'monto', label: 'Monto mensual', num: 1, req: 1 },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'motivo', label: 'Motivo', ph: 'Aumento 4%, voucher, ajuste' },
      ],
      extra: hist.length ? '<div class="field full"><span class="lbl">Historial</span><div class="rows" style="border:1px solid var(--line);border-radius:8px">' + hist.map(p => '<div class="row" style="cursor:default"><span class="d">' + fmt(p.desde) + '</span><span class="t"><b class="money">' + money(p.monto, p.moneda) + '</b><span>' + esc(p.motivo || '') + (p.aviso_enviado ? ' · avisado ' + fmt(p.aviso_enviado) : '') + '</span></span><button type="button" class="btn ghost sm" data-act="aPrecioDel" data-id="' + esc(p.id) + '" aria-label="Borrar precio">✕</button></div>').join('') + '</div></div>' : '',
      onSave: async v => { await data.upsert('precios_abono', { abono_id: abonoId, desde: v.desde + '-01', monto: v.monto, moneda: v.moneda, motivo: v.motivo }, 'abono_id,desde'); toast('Precio guardado'); },
    });
  }
  function formCuotas(proyectoId) {
    const p = S.P.find(x => x._id === proyectoId); if (!p) return;
    const cs = AD.PF.filter(x => x.proyecto_id === proyectoId).sort((a, b) => a.periodo.localeCompare(b.periodo));
    openPanel({
      title: p.proyecto, eyebrow: 'Meses de cobro · ' + p.cliente, saveLabel: 'Agregar mes',
      intro: 'Cada mes cargado aparece como una línea en el resumen de cuenta de ese mes. Para anticipo y saldo, cargá dos.',
      values: { periodo: thisMonth(), concepto: '', monto: '', moneda: cadm(p.cliente).moneda || 'ARS' },
      fields: [
        { k: 'periodo', label: 'Mes', type: 'month', month: 1, req: 1 },
        { k: 'monto', label: 'Monto', num: 1, req: 1 },
        { k: 'concepto', label: 'Concepto', ph: 'Anticipo 50%', full: 1 },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
      ],
      extra: cs.length ? '<div class="field full"><span class="lbl">Cargados</span><div class="rows" style="border:1px solid var(--line);border-radius:8px">' + cs.map(c => '<div class="row" style="cursor:default"><span class="d">' + fmt(c.periodo) + '</span><span class="t"><b class="money">' + money(c.monto, c.moneda) + '</b><span>' + esc(c.concepto || '') + '</span></span><button type="button" class="btn ghost sm" data-act="aCuotaDel" data-id="' + esc(c.id) + '" aria-label="Quitar">✕</button></div>').join('') + '</div></div>' : '',
      onSave: async v => { await data.ins('proyecto_facturacion', { proyecto_id: proyectoId, periodo: v.periodo + '-01', concepto: v.concepto, monto: v.monto, moneda: v.moneda }); toast('Cobro agregado'); setTimeout(() => formCuotas(proyectoId), 400); },
    });
  }
  function avisoTexto(precioId) {
    const p = AD.PR.find(x => x.id === precioId); const a = p && S.A.find(x => x._id === p.abono_id); if (!a) return '';
    const prev = AD.PR.filter(x => x.abono_id === a._id && x.desde < p.desde).sort((x, y) => y.desde.localeCompare(x.desde))[0];
    const pct = prev && prev.monto ? Math.round((p.monto / prev.monto - 1) * 1000) / 10 : null;
    const nombre = contactoDe(a.cliente);
    return 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás? Te escribimos de àndale para contarte que a partir de ' + monthLabel(p.desde) + ' el abono de ' + (a.tipo === 'Redes' ? 'redes sociales' + (a.plan ? ' (plan ' + a.plan + ')' : '') : a.tipo) + ' pasa a ' + money(p.monto, p.moneda) + ' por mes' + (pct ? ', un ajuste del ' + String(pct).replace('.', ',') + '%' : '') + '.' + (motivoReal(p.motivo) ? ' El motivo: ' + motivoReal(p.motivo) + '.' : '') + ' Cualquier consulta, estamos para conversarlo. ¡Gracias por seguir trabajando con nosotros!';
  }

  /* ---------- Vista: Plata hoy (las tres preguntas) ---------- */
  // ¿Cuánto entra? ¿Quién nos debe? ¿Cuánto nos queda? Con los mismos datos de Cobros, Gastos e ingresos y Sueldos.
  // Flujo de plata: cuánto hay hoy, qué entra y qué sale en los próximos meses, y cómo viene quedando.
  // Todo sale de lo que ya está cargado (facturas, resúmenes, abonos, cuotas, sueldos y gastos); lo que es estimado se dice.
  function flujo(mon, nMeses) {
    const m0 = thisMonth(), meses = Array.from({ length: nMeses }, (_, k) => addMonth(m0, k));
    const ult = meses[meses.length - 1];
    const hay = AD.MV.filter(v => v.moneda === mon && enSaldo(v)).reduce((a, v) => a + v.ingreso - v.egreso, 0);
    const F = meses.map(m => ({ m, ent: { fact: 0, venc: 0, porFacturar: 0 }, sal: { sueldos: 0, gastos: 0 }, det: { fact: [], porFacturar: [], sueldos: [] } }));
    const de = m => F.find(x => x.m === m);
    // Entradas 1: facturas hechas que faltan cobrar, en el mes que vencen (las vencidas, este mes).
    AD.F.filter(f => f.moneda === mon && f.saldo > 0.009).forEach(f => {
      let mm = String(f.vencimiento || f.fecha || today()).slice(0, 7), venc = false;
      if (mm < m0) { mm = m0; venc = true; } if (mm > ult) return;
      const x = de(mm); if (venc || estadoFactura(f) === 'Vencida') x.ent.venc += f.saldo; else x.ent.fact += f.saldo;
      x.det.fact.push([f.cliente, f.saldo, estadoFactura(f) === 'Vencida']);
    });
    // Entradas 2: lo que corresponde cobrar cada mes (resumen o, si no está, abonos, cuotas y tickets) y todavía no se facturó.
    meses.forEach(m => {
      const x = de(m);
      clientesDelMes(m).forEach(c => {
        const res = AD.R.find(r => r.cliente === c && r.periodo === m);
        let esp = 0;
        if (res) { if ((res.moneda || 'ARS') === mon) esp = res.total || 0; }
        else sugerencias(c, m).filter(it => (it.moneda || 'ARS') === mon).forEach(it => { esp += parseMonto(it.monto) || 0; });
        const emit = AD.F.filter(f => f.cliente === c && f.periodo === m && f.moneda === mon).reduce((a, f) => a + f.monto, 0);
        const falta = esp - emit; if (falta > 0.009) { x.ent.porFacturar += falta; x.det.porFacturar.push([c, falta, !res]); }
      });
    });
    // Salidas 1: sueldos, honorarios y extras (lo calculado y no pagado, más lo que todavía no se calculó).
    meses.forEach(m => {
      const x = de(m);
      EQ.liqMes(m).filter(l => !l.movimiento_id && l.moneda === mon).forEach(l => { x.sal.sueldos += +l.monto || 0; });
      EQ.faltantes(m).filter(p => p.moneda === mon).forEach(p => { x.sal.sueldos += +p.monto || 0; });
    });
    // Salidas 2: gastos habituales = promedio de los últimos 3 meses cerrados (sin sueldos ni honorarios, que ya están arriba).
    const gasto = mm => AD.MV.filter(v => v.moneda === mon && v.egreso > 0 && !v.colaborador_id && v.cuenta !== 'Saldo Inicial' && (v.fecha || '').startsWith(mm)).reduce((a, v) => a + v.egreso, 0);
    const prev = [1, 2, 3].map(k => gasto(addMonth(m0, -k))), prom = prev.reduce((a, v) => a + v, 0) / 3;
    F.forEach((x, k) => { x.sal.gastos = k === 0 ? Math.max(0, prom - gasto(m0)) : prom; });
    let saldo = hay;
    F.forEach(x => { x.entra = x.ent.fact + x.ent.venc + x.ent.porFacturar; x.sale = x.sal.sueldos + x.sal.gastos; saldo += x.entra - x.sale; x.saldo = saldo; });
    // Lo que pasó: últimos 6 meses cerrados más el actual.
    const hist = Array.from({ length: 7 }, (_, k) => addMonth(m0, k - 6)).map(mm => { const xs = AD.MV.filter(v => v.moneda === mon && v.cuenta !== 'Saldo Inicial' && (v.fecha || '').startsWith(mm)); return { m: mm, entro: xs.reduce((a, v) => a + v.ingreso, 0), salio: xs.reduce((a, v) => a + v.egreso, 0) }; });
    return { mon, hay, F, prom, prev, hist, m0 };
  }
  function vPlata() {
    const P = AD.pl || (AD.pl = { mon: 'ARS', n: 3 });
    const mons = [...new Set(['ARS', ...AD.MV.map(v => v.moneda), ...AD.F.filter(f => f.saldo > 0.009).map(f => f.moneda)].filter(Boolean))];
    if (!mons.includes(P.mon)) P.mon = 'ARS';
    const fl = flujo(P.mon, P.n), mon = P.mon, M = v => money(v, mon);
    const mesL = m => cap(monthLabel(m).split(' ')[0]);
    const n = (v, l, sub, cls) => '<div class="sx-n' + (cls ? ' ' + cls : '') + '"><b>' + esc(v) + '</b><span>' + esc(l) + '</span>' + (sub ? '<small>' + sub + '</small>' : '') + '</div>';
    const x0 = fl.F[0], ultimo = fl.F[fl.F.length - 1], neg = fl.F.find(x => x.saldo < 0);
    const debeTot = AD.F.filter(f => f.moneda === mon && f.saldo > 0.009).reduce((a, f) => a + f.saldo, 0), vencTot = AD.F.filter(f => f.moneda === mon && estadoFactura(f) === 'Vencida').reduce((a, f) => a + f.saldo, 0);
    let h = '<div class="head"><div><h1>Hoy y lo que viene</h1><p>Cuánto hay, qué entra y qué sale en los próximos meses, y cómo venimos.</p></div><div class="toolbar">' +
      (mons.length > 1 ? '<div class="seg" role="group" aria-label="Moneda">' + mons.map(mo => '<button data-act="plMon" data-v="' + mo + '" aria-pressed="' + (mo === mon) + '">' + (mo === 'ARS' ? 'Pesos' : mo === 'USD' ? 'Dólares' : mo) + '</button>').join('') + '</div>' : '') +
      '<div class="seg" role="group" aria-label="Meses">' + [3, 6].map(k => '<button data-act="plN" data-v="' + k + '" aria-pressed="' + (k === P.n) + '">' + k + ' meses</button>').join('') + '</div></div></div>';
    // Hoy
    // Hoy: tres bloques con jerarquía (azul = lo que hay, blanco = lo que nos deben, tinta = lo que hay que pagar)
    const stc = (cls, big, lab, sub, neg) => '<div class="stc ' + cls + (neg ? ' neg' : '') + '"><span class="stc-l">' + lab + '</span><b>' + esc(big) + '</b><small>' + sub + '</small></div>';
    h += '<section class="stc3" aria-label="Hoy">' +
      stc('azul', M(fl.hay), 'Hay en las cuentas', 'en ' + (mon === 'ARS' ? 'pesos' : mon) + ' · <button class="btn link" data-act="go" data-view="ajustes" data-tab="bancos">ver cuentas</button>', fl.hay < 0) +
      stc('', M(debeTot), 'Nos deben', vencTot > 0.009 ? '<span class="t-crit">' + esc(M(vencTot)) + ' vencido</span> · <button class="btn link" data-act="go" data-view="cuentas">ver quién</button>' : 'nada vencido') +
      stc('tinta', M(x0.sal.sueldos), 'Falta pagar este mes', 'sueldos, honorarios y extras · <button class="btn link" data-act="go" data-view="sueldos">sueldos</button> · <button class="btn link" data-act="go" data-view="proveedores">proveedores</button>') + '</section>';
    // Lo que viene
    const max = Math.max(1, ...fl.F.map(x => Math.max(x.entra, x.sale)), ...fl.F.map(x => Math.abs(x.saldo)), Math.abs(fl.hay));
    h += '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.calendario + '</span><h2>Lo que viene</h2><div class="sx-der">' + leyenda([['Entra', 'var(--g-in)'], ['Sale', 'var(--g-out)'], ['Queda en las cuentas', 'var(--g-line)']]) + '</div></div>' +
      (neg ? '<div class="pl-alerta">' + ICON.alerta + '<span>Ojo: en <b>' + esc(mesL(neg.m)) + '</b> las cuentas quedarían en <b>' + esc(M(neg.saldo)) + '</b> si todo sale como está cargado. Conviene cobrar lo vencido o mover pagos.</span></div>' : '') +
      grafBarras(fl.F.map(x => ({ l: mesL(x.m), a: x.entra, b: x.sale, v: x.saldo })), M, { titulo: 'Flujo de plata' }) +
      '<div class="tbl"><table class="pl-t"><thead><tr><th>Mes</th><th class="r">Entra</th><th class="r">Sale</th><th class="r">Diferencia</th><th class="r">Queda al final</th></tr></thead><tbody>' +
      fl.F.map((x, k) => '<tr class="click" data-act="plDet" data-k="' + k + '"' + (P.det === k ? ' aria-expanded="true"' : '') + '><td><b>' + esc(mesL(x.m)) + '</b>' + (k === 0 ? ' <span class="muted">· lo que falta</span>' : '') + '</td><td class="r money" style="color:var(--money)">' + esc(M(x.entra)) + '</td><td class="r money">' + esc(M(x.sale)) + '</td><td class="r money"' + (x.entra - x.sale < 0 ? ' style="color:var(--crit)"' : '') + '>' + esc(M(x.entra - x.sale)) + '</td><td class="r money"><b' + (x.saldo < 0 ? ' style="color:var(--crit)"' : '') + '>' + esc(M(x.saldo)) + '</b></td></tr>' +
        (P.det === k ? '<tr class="pl-det"><td colspan="5">' + detFlujo(x, k, fl, M) + '</td></tr>' : '')).join('') +
      '</tbody></table></div><p class="muted pl-nota">Tocá un mes para ver de dónde sale cada número.</p>' +
      '<details class="pl-como"><summary>Cómo se calcula</summary><ul>' +
      '<li><b>Entra:</b> las facturas que faltan cobrar, en el mes en que vencen (las vencidas cuentan en este mes), más lo que corresponde cobrar cada mes y todavía no se facturó: el resumen si ya está armado o, si no, los abonos con su precio, las cuotas de proyectos y los tickets a facturar.</li>' +
      '<li><b>Sale:</b> sueldos, honorarios y extras de cada mes (lo que figura en Sueldos y proveedores), más los gastos habituales: el promedio de los últimos 3 meses (' + fl.prev.map(v => esc(M(v))).join(', ') + ' → ' + esc(M(fl.prom)) + ' por mes, sin sueldos).</li>' +
      '<li><b>Supone</b> que cada cliente paga en el mes que corresponde. Si alguien suele pagar tarde, lo vas a ver en lo vencido. No convierte monedas: pesos y dólares van por separado.</li></ul></details></section>';
    // Lo que pasó, en el período que elijan (por defecto, los últimos 6 meses).
    const PP = AD.plPer || (AD.plPer = { k: '6m' }), R = rango(PP, today());
    const anios = [...new Set(AD.MV.map(v => (v.fecha || '').slice(0, 4)))].filter(Boolean).sort().reverse();
    const movs = AD.MV.filter(v => v.moneda === mon && v.cuenta !== 'Saldo Inicial');
    const hist = R.grupos.map(gr => { const xs = movs.filter(v => (v.fecha || '') >= gr.d && (v.fecha || '').slice(0, 10) <= gr.h); const entro = xs.reduce((a2, v) => a2 + v.ingreso, 0), salio = xs.reduce((a2, v) => a2 + v.egreso, 0); return { l: gr.l, d: gr.d, h: gr.h, entro, salio, quedo: entro - salio }; });
    const tE = hist.reduce((a2, r) => a2 + r.entro, 0), tS = hist.reduce((a2, r) => a2 + r.salio, 0);
    const pill = (v, txt) => '<span class="pill-n ' + (v < -0.004 ? 'neg' : v > 0.004 ? 'pos' : 'cero') + '">' + esc(txt || M(v)) + '</span>';
    h += '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.barras + '</span><h2>Cómo venimos <span class="sx-sub">(' + esc(R.label) + ')</span></h2><div class="sx-der toolbar">' + selector(PP, anios, esc, today(), 'plper') + '<button class="btn sm ghost" data-act="go" data-view="gastos">Ver movimientos</button></div></div>' +
      '<div class="pl-res"><div><span class="lbl">Entró</span><b class="money">' + esc(M(tE)) + '</b></div><div><span class="lbl">Salió</span><b>' + esc(M(tS)) + '</b></div><div><span class="lbl">Quedó</span>' + pill(tE - tS) + '</div></div>' +
      grafBarras(hist.map(r => ({ l: r.l, a: r.entro, b: r.salio, v: r.quedo })), M, { linea: 'Quedó', titulo: 'Cómo venimos' }) +
      '<div class="tbl"><table class="pl-t"><thead><tr><th>' + (R.porSemana ? 'Semana' : 'Mes') + '</th><th class="r">Entró</th><th class="r">Salió</th><th class="r">Quedó</th></tr></thead><tbody>' +
      hist.slice().reverse().map(r => '<tr><td>' + esc(r.l) + (r.h === today() || (r.d <= today() && r.h >= today()) ? ' <span class="muted">· hasta hoy</span>' : '') + '</td><td class="r money">' + esc(M(r.entro)) + '</td><td class="r money">' + esc(M(r.salio)) + '</td><td class="r">' + pill(r.quedo) + '</td></tr>').join('') + '</tbody></table></div></section>';
    return h;
  }
  const leyenda = items => '<div class="sx-ley">' + items.map(([nm, c]) => '<span><i style="--c:' + c + '"></i>' + esc(nm) + '</span>').join('') + '</div>';
  // Gráfico de barras: por cada período, lo que entra y lo que sale; una línea fina con lo que queda (opcional).
  // filas = [{ l, a, b, v? }]  a = entra, b = sale, v = valor de la línea
  function grafBarras(filas, M, { linea = 'Queda en las cuentas', titulo = 'Entra y sale' } = {}) {
    const n = filas.length; if (!n) return '';
    const W = 1000, H = 290, L = 104, R = 14, T = 24, B = 32, iw = W - L - R, ih = H - T - B;
    const conLinea = filas.some(f => f.v != null);
    const vals = filas.flatMap(f => [f.a || 0, f.b || 0, ...(conLinea ? [f.v || 0] : [])]);
    const top = Math.max(1, ...vals), bot = Math.min(0, ...vals);
    const paso = (x => { const p = Math.pow(10, Math.floor(Math.log10(x))); const f = x / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; })((top - bot) / 4 || 1);
    const yMax = Math.ceil(top / paso) * paso, yMin = Math.floor(bot / paso) * paso, rangoY = yMax - yMin || 1;
    const Y = v => T + ih - ((v - yMin) / rangoY) * ih, col = iw / n, bw = Math.max(6, Math.min(24, col * 0.2));
    const corto = v => (v < 0 ? '−' : '') + Math.round(Math.abs(v)).toLocaleString('es-AR'); // números enteros, sin abreviar (nada de k ni M)
    let g = '';
    for (let v = yMin; v <= yMax + 1e-9; v += paso) { const y = Y(v).toFixed(1); g += '<line class="' + (Math.abs(v) < 1e-9 ? 'bl' : 'gl') + '" x1="' + L + '" x2="' + (W - R) + '" y1="' + y + '" y2="' + y + '"/><text class="ax" x="' + (L - 8) + '" y="' + (+y + 4) + '" text-anchor="end">' + esc(corto(v)) + '</text>'; }
    const y0 = Y(0), barra = (x, v, c) => { const y = Y(Math.max(0, v)), h = Math.abs(Y(v) - y0); return '<path d="M' + x.toFixed(1) + ',' + (y + h).toFixed(1) + 'V' + (y + 4).toFixed(1) + 'q0,-4 4,-4h' + (bw - 8).toFixed(1) + 'q4,0 4,4V' + (y + h).toFixed(1) + 'Z" fill="' + c + '"/>'; };
    const pts = [];
    filas.forEach((f, k) => {
      const cx = L + col * k + col / 2;
      if (f.a > 0) g += barra(cx - bw - 2, f.a, 'var(--g-in)');
      if (f.b > 0) g += barra(cx + 2, f.b, 'var(--g-out)');
      g += '<text class="ax" x="' + cx.toFixed(1) + '" y="' + (H - 9) + '" text-anchor="middle">' + esc(f.l) + '</text>';
      if (f.v != null) pts.push([cx, Y(f.v), f.v]);
      g += '<rect class="hz" x="' + (L + col * k).toFixed(1) + '" y="' + T + '" width="' + col.toFixed(1) + '" height="' + ih + '"><title>' + esc(f.l + ' · entra ' + M(f.a || 0) + ' · sale ' + M(f.b || 0) + (f.v != null ? ' · ' + linea.toLowerCase() + ' ' + M(f.v) : '')) + '</title></rect>';
    });
    if (pts.length) {
      g += '<path d="' + pts.map((p, k) => (k ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('') + '" fill="none" stroke="var(--g-line)" stroke-opacity=".75" stroke-width="1.25" stroke-linejoin="round" stroke-linecap="round"/>';
      pts.forEach(p => { g += '<circle cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) + '" r="3" fill="var(--surface)" stroke="var(--g-line)" stroke-width="1.25"/>'; if (n <= 8 && Math.abs(p[2]) > 0.5) g += '<text class="pl-lab" x="' + p[0].toFixed(1) + '" y="' + (p[1] - 9).toFixed(1) + '" text-anchor="middle">' + esc(corto(p[2])) + '</text>'; });
    }
    return '<div class="sx-chart pl-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(titulo) + '">' + g + '</svg></div>' +
      '<table class="sr-only" data-titulo="' + esc(titulo) + '"><thead><tr><th>Período</th><th>Entra</th><th>Sale</th>' + (conLinea ? '<th>' + esc(linea) + '</th>' : '') + '</tr></thead><tbody>' + filas.map(f => '<tr><td>' + esc(f.l) + '</td><td>' + esc(M(f.a || 0)) + '</td><td>' + esc(M(f.b || 0)) + '</td>' + (conLinea ? '<td>' + esc(M(f.v || 0)) + '</td>' : '') + '</tr>').join('') + '</tbody></table>';
  }
  function detFlujo(x, k, fl, M) {
    const fila = (l, v, sub) => '<div class="pl-dr"><span>' + l + (sub ? '<small>' + sub + '</small>' : '') + '</span><b class="money">' + esc(M(v)) + '</b></div>';
    const quien = arr => arr.sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c, v, f]) => esc(c) + ' ' + esc(M(v)) + (f ? '*' : '')).join(' · ') + (arr.length > 6 ? ' y ' + (arr.length - 6) + ' más' : '');
    return '<div class="pl-det-g"><div><span class="lbl">Entra</span>' +
      (x.ent.venc ? fila('Facturas vencidas', x.ent.venc, 'ya deberían haber entrado') : '') +
      fila('Facturas por cobrar', x.ent.fact, x.det.fact.filter(d => !d[2]).length ? quien(x.det.fact.filter(d => !d[2])) : '') +
      fila('Por facturar', x.ent.porFacturar, x.det.porFacturar.length ? quien(x.det.porFacturar) + (x.det.porFacturar.some(d => d[2]) ? ' · * estimado con el abono' : '') : 'nada') + '</div>' +
      '<div><span class="lbl">Sale</span>' + fila('Sueldos, honorarios y extras', x.sal.sueldos, '') + fila('Gastos habituales', x.sal.gastos, k === 0 ? 'lo que falta para llegar al promedio' : 'promedio de los últimos 3 meses') + '</div></div>' +
      '<div class="toolbar" style="margin-top:10px"><button class="btn sm" data-act="plCobros" data-m="' + x.m + '">Cobros de ' + esc(cap(monthLabel(x.m).split(' ')[0])) + '</button><button class="btn sm ghost" data-act="go" data-view="sueldos">Sueldos</button><button class="btn sm ghost" data-act="go" data-view="proveedores">Proveedores</button></div>';
  }


  /* ---------- Vista: Caja ---------- */
  AD.cj = { mes: thisMonth(), q: '', cuenta: '', moneda: '' };
  function vCaja() {
    const cj = AD.cj, m = cj.mes, q = norm(cj.q);
    const P = AD.cjPer || (AD.cjPer = { k: 'm' });
    const finMes = mm => { const [yy, mo] = mm.split('-').map(Number); return new Date(Date.UTC(yy, mo, 0)).toISOString().slice(0, 10); };
    const R = P.k === 'm' ? { desde: m + '-01', hasta: finMes(m), label: monthLabel(m) } : rango(P, today());
    const y = R.hasta.slice(0, 4);
    const saldo = {}; AD.MV.filter(enSaldo).forEach(x => add(saldo, x.moneda, x.ingreso - x.egreso));
    const delMes = AD.MV.filter(x => enRango(x.fecha, R));
    const ingM = {}, egM = {}; delMes.forEach(x => { if (x.cuenta !== 'Saldo Inicial') { add(ingM, x.moneda, x.ingreso); add(egM, x.moneda, x.egreso); } });
    const deuda = AD.MV.filter(x => x.reintegro_a && !x.reintegrado && x.egreso > 0);
    const porSocio = {}; deuda.forEach(x => { porSocio[x.reintegro_a] = porSocio[x.reintegro_a] || {}; add(porSocio[x.reintegro_a], x.moneda, x.egreso); });
    let h = '<div class="head"><div>' + lock + '<h1>Gastos e ingresos</h1><p>Lo que entra y sale, con las categorías de siempre. Los cobros de facturas se cargan solos.</p></div>' +
      '<div class="toolbar">' + selector(P, [...new Set(AD.MV.map(v => (v.fecha || '').slice(0, 4)))].filter(Boolean).sort().reverse(), esc, today(), 'cjper', [['m', 'Un mes']]) + (P.k === 'm' ? '<div class="cal-h"><button class="btn sm" data-act="aCjMes" data-d="-1" aria-label="Mes anterior">←</button><b class="cj-mes">' + esc(cap(monthLabel(m))) + '</b><button class="btn sm" data-act="aCjMes" data-d="1" aria-label="Mes siguiente">→</button>' + (m !== thisMonth() ? '<button class="btn sm ghost" data-act="aCjMes" data-d="0">Este mes</button>' : '') + '</div>' : '') + '<button class="btn primary" data-act="aMov">+ Cargar gasto o ingreso</button></div></div>';
    const quedoM = {}; Object.entries(ingM).forEach(([c, v]) => add(quedoM, c, v)); Object.entries(egM).forEach(([c, v]) => add(quedoM, c, -v));
    h += kqs([kq('Hay hoy', saldo, { sub: 'en todas las cuentas', tono: 'auto' }), kq('Entró', ingM, { sub: delMes.filter(x => x.ingreso > 0 && x.cuenta !== 'Saldo Inicial').length + ' ingresos · ' + esc(R.label), tono: 'pos' }),
      kq('Salió', egM, { sub: delMes.filter(x => x.egreso > 0).length + ' gastos · ' + esc(R.label) }), kq('Quedó', quedoM, { sub: 'lo que entró menos lo que salió', tono: 'auto' })]);
    if (deuda.length) h += '<section class="sheet"><div class="sheet-h"><div><h2>Se les debe a los socios</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Gastos de àndale que una socia pagó con su plata o su tarjeta. Cuando se lo devuelvan, tocá “Ya se lo devolvimos”.</p></div><span class="muted">' + Object.entries(porSocio).map(([s, acc]) => esc(s) + ': <b class="money">' + esc(multi(acc)) + '</b>').join(' · ') + '</span></div><div class="rows">' +
      deuda.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(x => '<div class="row click" data-act="aMov" data-id="' + esc(x.id) + '" title="Tocá para editar o borrar"><span class="d">' + fmt(x.fecha) + '</span><span class="t"><b>' + esc(x.contraparte || x.subcuenta) + ' · <span class="money">' + money(x.egreso, x.moneda) + '</span></b><span>Lo pagó ' + esc(x.reintegro_a) + (x.detalle ? ' · ' + esc(x.detalle) : '') + '</span></span><button class="btn sm" data-act="aReint" data-id="' + esc(x.id) + '">Ya se lo devolvimos</button></div>').join('') + '</div></section>';
    // Resumen del mes por cuenta
    const porCuenta = {}; delMes.forEach(x => { const k = x.cuenta || '(sin cuenta)'; porCuenta[k] = porCuenta[k] || { i: {}, e: {} }; add(porCuenta[k].i, x.moneda, x.ingreso); add(porCuenta[k].e, x.moneda, x.egreso); });
    const rc = Object.entries(porCuenta).sort((a, b) => cmp(a[0], b[0]));
    // Resumen anual por mes (pesos y dólares)
    const meses = Array.from({ length: 12 }, (_, i) => y + '-' + String(i + 1).padStart(2, '0'));
    const anual = meses.map(mm => { const xs = AD.MV.filter(x => (x.fecha || '').startsWith(mm) && x.cuenta !== 'Saldo Inicial'); const s = (cur, k) => xs.filter(x => x.moneda === cur).reduce((t, x) => t + x[k], 0); return { mm, iA: s('ARS', 'ingreso'), eA: s('ARS', 'egreso'), iU: s('USD', 'ingreso'), eU: s('USD', 'egreso'), n: xs.length }; }).filter(r => r.n);
    h += '<div class="grid2"><section class="sheet"><div class="sheet-h"><h2>Por categoría en ' + esc(monthLabel(m)) + '</h2></div>' + (rc.length ? '<div class="tbl"><table><thead><tr><th>Categoría</th><th class="r">Ingresos</th><th class="r">Gastos</th></tr></thead><tbody>' + rc.map(([k, v]) => '<tr class="click" data-act="aCjCuenta" data-cuenta="' + esc(k) + '"><td>' + esc(k) + '</td><td class="r">' + (Object.keys(v.i).length ? esc(multi(v.i)) : '<span class="muted">—</span>') + '</td><td class="r">' + (Object.keys(v.e).length ? esc(multi(v.e)) : '<span class="muted">—</span>') + '</td></tr>').join('') + '</tbody></table></div>' : emptyBox('Sin gastos ni ingresos este mes', '')) + '</section>' +
      '<section class="sheet"><div class="sheet-h"><h2>Año ' + esc(y) + '</h2><span class="muted">sin contar la plata con la que arrancó</span></div>' + (anual.length ? '<div class="tbl"><table><thead><tr><th>Mes</th><th class="r">Quedó $</th><th class="r">Quedó US$</th></tr></thead><tbody>' + anual.map(r => '<tr class="click" data-act="aCjIr" data-mes="' + r.mm + '"' + (r.mm === m ? ' style="font-weight:600"' : '') + '><td style="text-transform:capitalize">' + esc(monthLabel(r.mm).split(' ')[0]) + '</td><td class="r" style="color:var(' + (r.iA - r.eA < 0 ? '--crit' : '--money') + ')">' + money(r.iA - r.eA, 'ARS') + '</td><td class="r" style="color:var(' + (r.iU - r.eU < 0 ? '--crit' : '--money') + ')">' + money(r.iU - r.eU, 'USD') + '</td></tr>').join('') + '</tbody></table></div>' : emptyBox('Sin gastos ni ingresos este año', '')) + '</section></div>';
    const cuentasMes = [...new Set(delMes.map(x => x.cuenta))].sort(cmp);
    const list = delMes.filter(x => (!cj.cuenta || x.cuenta === cj.cuenta) && (!cj.moneda || x.moneda === cj.moneda) && (!q || norm([x.contraparte, x.detalle, x.subcuenta, x.cuenta].join(' ')).includes(q))).sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.created_at || '').localeCompare(a.created_at || ''));
    h += '<section class="sheet"><div class="sheet-h"><div><h2>Movimientos</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Tocá cualquiera para corregirlo o borrarlo.</p></div></div><div class="fbar"><label class="fbar-q">' + ICON.buscar + '<input class="in" type="search" id="cj-q" data-acj="q" placeholder="Buscar por cliente, proveedor o detalle" aria-label="Buscar" value="' + esc(cj.q) + '"></label><select class="in" id="cj-c" data-acj="cuenta" aria-label="Categoría">' + opt('', 'Todas las categorías', cj.cuenta) + cuentasMes.map(c => opt(c, c, cj.cuenta)).join('') + '</select><select class="in" id="cj-m" data-acj="moneda" aria-label="Moneda">' + opt('', 'Todas las monedas', cj.moneda) + MONEDAS.map(c => opt(c, c, cj.moneda)).join('') + '</select></div>' +
      (list.length ? '<div class="tbl"><table><thead><tr><th>Fecha</th><th>Categoría</th><th>Cliente / proveedor</th><th>Detalle</th><th class="r">Ingreso</th><th class="r">Gasto</th></tr></thead><tbody>' + list.map(x => '<tr class="click" data-act="aMov" data-id="' + esc(x.id) + '"><td class="mono">' + fmt(x.fecha) + '</td><td>' + esc(x.cuenta) + '<span class="sub">' + esc(x.subcuenta) + '</span></td><td>' + esc(x.contraparte) + (x.factura_id ? '<span class="sub">cobro de factura</span>' : '') + (x.reintegro_a ? '<span class="sub">pagó ' + esc(x.reintegro_a) + (x.reintegrado ? ' · devuelto' : '') + '</span>' : '') + '</td><td>' + esc(x.detalle) + '</td><td class="r">' + (x.ingreso ? '<span class="money">' + money(x.ingreso, x.moneda) + '</span>' : '') + '</td><td class="r">' + (x.egreso ? money(x.egreso, x.moneda) : '') + '</td></tr>').join('') + '</tbody></table></div>' : emptyBox('No hay nada con ese filtro', '')) +
      '<div class="count num">' + list.length + ' de ' + delMes.length + ' gastos e ingresos · ' + esc(R.label) + '</div></section>';
    return h;
  }
  // Cómo se cargó la última vez a esa persona o empresa (para completar categoría y cuenta solas).
  function ultimoDe(quien, salvo) {
    const n = norm((quien || '').trim()); if (!n) return null;
    return AD.MV.filter(v => v.id !== salvo && norm(v.contraparte || '') === n).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0] || null;
  }
  // El campo "¿Cuántos USD fueron?" aparece solo para EUR, GBP y otras monedas del exterior.
  function usdToggle() { const m = $('#af-moneda'), u = $('#af-usd'); if (!m || !u) return; const w = u.closest('.field'); const on = esExterior(m.value); w.hidden = !on; const l = w.querySelector('label'); if (l) l.textContent = '¿Cuántos USD fueron? (' + m.value + ' → USD)'; if (!m.dataset.usdOk) { m.dataset.usdOk = '1'; m.addEventListener('change', usdToggle); } }
  function formMovimiento(id, preset) {
    const x = id ? AD.MV.find(v => v.id === id) : null;
    const cuentas = [...new Set(AD.PC.map(p => p.cuenta))].sort(cmp);
    const subs = [...new Set(AD.PC.map(p => p.subcuenta).filter(Boolean))].sort(cmp);
    const partes = [...new Set([...S.C.map(c => c.nombre), ...S.E.map(e => e.persona), ...AD.MV.map(v => v.contraparte).filter(Boolean)])].sort(cmp);
    const vals = x ? { fecha: x.fecha, tipo: x.ingreso > 0 ? 'Ingreso' : 'Egreso', monto: x.ingreso || x.egreso, moneda: x.moneda, usd: x.usd ?? '', cuenta: x.cuenta, subcuenta: x.subcuenta, contraparte: x.contraparte, detalle: x.detalle, caja: x.caja_id || '', reintegro_a: x.reintegro_a, reintegrado: x.reintegrado }
      : Object.assign({ fecha: today(), tipo: 'Egreso', moneda: 'ARS', cuenta: 'Gastos Fijos', reintegro_a: '' }, preset || {});
    if (!x && preset && preset.contraparte && !preset.cuenta) { const u = ultimoDe(preset.contraparte); if (u) Object.assign(vals, { cuenta: u.cuenta, subcuenta: u.subcuenta, caja: vals.caja || u.caja_id || '' }); }
    openPanel({
      title: x ? (x.contraparte || x.cuenta) : 'Nuevo gasto o ingreso', eyebrow: x ? 'Editar gasto o ingreso' : 'Gastos e ingresos',
      values: vals,
      masLabel: 'Categoría, cuenta y más', masAbierto: !!x,
      fields: [
        { k: 'tipo', label: 'Tipo', type: 'select', html: v => opt('Egreso', 'Egreso', v) + opt('Ingreso', 'Ingreso', v) },
        { k: 'fecha', label: 'Fecha', type: 'date', req: 1 },
        { k: 'monto', label: 'Monto', num: 1, req: 1 },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'usd', label: '¿Cuántos USD fueron?', num: 1, hint: 'Lo que entró (o salió) de verdad al pasarlo a dólares. Así Estadísticas lo suma en USD.' },
        { k: 'contraparte', label: '¿A quién / de quién?', full: 1, ph: 'Meta, Adobe, Cata, Apromax…', hint: 'Si ya le pagaste antes, la categoría y la cuenta se completan solas.' },
        { k: 'detalle', label: 'Detalle', full: 1, ph: 'Ej.: Ads octubre P4 y Cultu', piggy: () => {
          const g = k => (($('#af-' + k) || {}).value || '').trim(), quien = g('contraparte');
          const imp = (AD.impDraft || []).map(i => { const [t, id] = String(i.dest || '').split(':'); const a = t === 'a' ? S.A.find(z => z._id === id || z.id === id) : S.P.find(z => z._id === id); return a ? (a.cliente || '') + (a.proyecto ? ' · ' + a.proyecto : '') : ''; }).filter(Boolean);
          const ej = [...new Set(AD.MV.filter(v => v.detalle && (v.contraparte === quien || v.subcuenta === g('subcuenta'))).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).map(v => v.detalle))].slice(0, 8);
          return { tarea: 'detalle', texto: ['Tipo: ' + g('tipo'), 'Fecha: ' + g('fecha'), 'Monto: ' + g('monto') + ' ' + g('moneda'), 'A quién / de quién: ' + quien, 'Categoría: ' + g('cuenta') + (g('subcuenta') ? ' / ' + g('subcuenta') : ''), imp.length ? 'Asignado a: ' + imp.join(', ') : '', g('detalle') ? 'Lo que ya escribieron: ' + g('detalle') : '', ej.length ? 'Ejemplos de cómo lo escribimos otras veces:\n- ' + ej.join('\n- ') : ''].filter(Boolean).join('\n') };
        } },
        { k: 'cuenta', label: 'Categoría', type: 'select', opts: cuentas, req: 1, adv: 1 },
        { k: 'subcuenta', label: 'Detalle de la categoría', ph: 'Elegí o escribí', hint: '', adv: 1 },
        { k: 'caja', label: 'Cuenta de banco o efectivo', type: 'select', html: v => opt('', '—', v) + AD.CJ.map(c => opt(c.id, c.nombre + ' (' + c.moneda + ')', v)).join(''), adv: 1 },
        { k: 'reintegro_a', label: 'Lo pagó un socio de su bolsillo', type: 'select', opts: EMISORES, blank: 'No', adv: 1 },
        { k: 'reintegrado', label: 'Ya se le devolvió', type: 'check', adv: 1 },
      ],
      extra: '<div class="field full"><span class="lbl">Asignar a un cliente (para ver cuánto deja)</span><div id="imp-box" class="impbox"></div></div><datalist id="dl-sub">' + subs.map(s => '<option value="' + esc(s) + '">').join('') + '</datalist><datalist id="dl-partes">' + partes.map(s => '<option value="' + esc(s) + '">').join('') + '</datalist>' + (x && x.factura_id ? '<p class="formnote">Es el cobro de una factura: si lo borrás, la factura vuelve a quedar sin cobrar.</p>' : ''),
      onSave: async v => {
        const cli = S.C.find(c => c.nombre === v.contraparte), per = S.E.find(e => e.persona === v.contraparte);
        const co = EQ.colabPorNombre(v.contraparte);
        const row = { fecha: v.fecha, cuenta: v.cuenta, subcuenta: v.subcuenta, contraparte: v.contraparte, cliente_id: cli ? cli._id : (x ? x.cliente_id : null), persona_id: per ? per._id : co && co.persona_id ? co.persona_id : (x ? x.persona_id : null), colaborador_id: co ? co.id : (x && x.contraparte === v.contraparte ? x.colaborador_id || null : null), detalle: v.detalle, ingreso: v.tipo === 'Ingreso' ? v.monto : 0, egreso: v.tipo === 'Egreso' ? v.monto : 0, moneda: v.moneda, caja_id: v.caja || null, reintegro_a: v.reintegro_a || '', reintegrado: !!v.reintegrado };
        if (esExterior(v.moneda)) row.usd = v.usd ?? null; else if (x && x.usd != null) row.usd = null;
        let mid = x && x.id;
        if (x) await data.upd('movimientos', x.id, row); else mid = (await data.ins('movimientos', row)).id;
        if (v.tipo === 'Egreso') await guardarImp(mid); else if (x && AD.IMP.some(i => i.movimiento_id === x.id)) await data.del('imputaciones', x.id, 'movimiento_id');
        toast(x ? 'Cambios guardados' : v.tipo === 'Egreso' ? 'Gasto cargado' : 'Ingreso cargado');
      },
      onDelete: x ? async () => { await data.del('movimientos', x.id); toast('Borrado'); } : null,
    });
    const s = $('#af-subcuenta'); if (s) s.setAttribute('list', 'dl-sub');
    const c = $('#af-contraparte'); if (c) c.setAttribute('list', 'dl-partes');
    usdToggle();
    AD.impDraft = (x ? AD.IMP.filter(i => i.movimiento_id === x.id) : []).map(i => ({ dest: i.abono_id ? 'a:' + i.abono_id : 'p:' + i.proyecto_id, monto: String(i.monto), costo_id: i.costo_id || null }));
    const prevMov = (contraparte) => AD.MV.filter(v => v.contraparte === contraparte && (!x || v.id !== x.id) && AD.IMP.some(i => i.movimiento_id === v.id)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0];
    const setCopy = () => { const cp = ($('#af-contraparte') || {}).value; const pm = cp && prevMov(cp); AD.impCopy = pm ? { contraparte: cp, mov: pm } : null; };
    const tocados = new Set(Object.keys(preset || {}));
    ['cuenta', 'subcuenta', 'caja', 'tipo'].forEach(k => { const el = $('#af-' + k); if (el) el.addEventListener('change', () => tocados.add(k)); });
    let ultimoQuien = '';
    const autocompletar = () => {
      const q = ($('#af-contraparte') || {}).value || ''; if (x || q === ultimoQuien) return; ultimoQuien = q;
      const u = ultimoDe(q); const h = $('#ah-contraparte');
      if (!u) { if (h) h.textContent = 'Si ya le pagaste antes, la categoría y la cuenta se completan solas.'; return; }
      const set = (k, v) => { const el = $('#af-' + k); if (el && !tocados.has(k) && v != null && v !== '') el.value = v; };
      set('tipo', u.ingreso > 0 ? 'Ingreso' : 'Egreso'); set('cuenta', u.cuenta); set('subcuenta', u.subcuenta); set('caja', u.caja_id || ''); set('moneda', u.moneda);
      const cj = AD.CJ.find(c => c.id === u.caja_id);
      if (h) h.textContent = '✓ Como la última vez (' + fmt(u.fecha) + '): ' + [u.cuenta, u.subcuenta, cj && cj.nombre].filter(Boolean).join(' · ');
    };
    const sugKey = () => saldosDe(($('#af-contraparte') || {}).value).map(c => c.id).join(',');
    let sugPrev = '';
    setCopy(); AD.form.onInput = () => { autocompletar(); const had = !!AD.impCopy; setCopy(); const sk = sugKey(); if (had !== !!AD.impCopy || sk !== sugPrev) { sugPrev = sk; renderImp(); } else updateImpSum(); };
    const cpEl = $('#af-contraparte'); if (cpEl) { cpEl.addEventListener('input', () => AD.form && AD.form.onInput && AD.form.onInput()); cpEl.addEventListener('change', () => AD.form && AD.form.onInput && AD.form.onInput()); }
    if (preset && preset.contraparte) autocompletar();
    if (preset && preset.imp) AD.impDraft = preset.imp;
    renderImp();
  }

  /* ---------- Módulos: sueldos y pagos, asistente ---------- */
  const kit = { arranque, antesDeArrancar, cierre: { bulkResumenes, bulkRecordatorios, bulkAvisos, enviarDirecto, enviarFacturaDrive, envioAutoDrive }, estiloDoc, hoyDMY, cfgDocs, datosClienteDoc, AD, money, parseMonto, r2, add, multi, lock, cap, openPanel, MONEDAS, EMISORES, cadm, abonoEnMes, precioEn, sugerencias, clientesDelMes, estadoFactura, mail, cajasDe, subcuentas, renderImp, cxpAbiertos,
    formFactura: (...a) => formFactura(...a), formMovimiento: (...a) => formMovimiento(...a),
    openComposer: o => openComposer(o), cfgMarca: () => cfgMarca(), firma: () => firma(), mailsDe: c => mailsDe(c), cuotasPlan };
  const EQ = initEquipo(ctx, kit); kit.equipo = EQ;
  const MT = initMantenimiento(ctx, { ...kit, data });
  const AS = initAsistente(ctx, kit);
  const ST = initStats(ctx, kit);
  const PZ = initPropuestas(ctx, kit);

  /* ---------- Acciones ---------- */
  const actions = {
    aCjMes: t => { const n = +t.dataset.d; AD.cj.mes = n ? addMonth(AD.cj.mes, n) : thisMonth(); ctx.render(); },
    aCjIr: t => { AD.cj.mes = t.dataset.mes; AD.cjPer = { k: 'm' }; ctx.render(); },
    aCjCuenta: t => { AD.cj.cuenta = t.dataset.cuenta; ctx.render(); },
    aMov: t => formMovimiento(t.dataset.id || null),
    aReint: async t => { try { await data.upd('movimientos', t.dataset.id, { reintegrado: true }); toast('Listo: ya no figura como deuda con la socia'); await ctx.reload(); } catch (err) { toast(err.message); } },
    aMes: t => { const n = +t.dataset.d; AD.mesTocado = true; AD.mes = n ? addMonth(AD.mes, n) : thisMonth(); ctx.render(); },
    aMesIr: t => { AD.mesTocado = true; AD.mes = t.dataset.m; ctx.render(); window.scrollTo(0, 0); },
    aArranque: async t => {
      const v = (document.getElementById('aj-arranque') || {}).value || '';
      try { await data.upsert('ajustes', { clave: 'operacion', valor: { ...(AD.AJ.operacion || {}), desde: v } }, 'clave'); AD.AJ.operacion = { ...(AD.AJ.operacion || {}), desde: v }; toast(v ? 'Listo: la app cobra desde ' + monthLabel(v) : 'Sin mes de arranque'); ctx.render(); }
      catch (e) { toast(e.message); }
    },
    aCuenta: t => openCuenta(t.dataset.cliente, AD.mes),
    aRtCh: async () => {
      const v = (($('#rt-ch') || {}).value || '').trim();
      try { await data.upsert('ajustes', { clave: 'rentabilidad', valor: { ...cfgRent(), costo_hora: v ? +v : null } }, 'clave'); toast(v ? 'Costo de la hora guardado' : 'Se usa el estimado'); await ctx.reload(); }
      catch (err) { toast(err.message); }
    },
    aRtIA: async () => {
      const y = rango(AD.per || { k: 'anio' }, today()), { ch, filas } = filasHoras(y);
      AD.rtIABusy = true; ctx.render();
      try {
        AD.rtIA = await data.ia({ modo: 'rentabilidad', contexto: { periodo: y.label + ' (' + y.desde + ' a ' + y.hasta + ')', moneda: 'ARS', costo_hora: ch, aclaracion: 'Las horas las carga el equipo de forma aproximada y opcional; clientes sin horas no tienen dato, no significa cero.',
          clientes: filas.map(f => ({ cliente: f.cliente, ingreso: Math.round(f.ing), ingreso_usd: Math.round(f.ingUsd), horas: f.horas, costo_horas: Math.round(f.costo), proveedores: Math.round(f.prov), queda: Math.round(f.queda), margen_pct: f.pct, valor_hora_real: f.vh, piezas_extra: f.extras, abonos: S.A.filter(a => a.cliente === f.cliente && a.estado === 'Activo').map(a => a.tipo + (a.plan ? ' ' + a.plan : '')) })) } });
      } catch (err) { toast(err.message); }
      AD.rtIABusy = false; ctx.render();
    },
    aRtPre: async () => {
      const pedido = (($('#rt-pre-t') || {}).value || '').trim(), tipo = ($('#rt-pre-tipo') || {}).value || '';
      if (!pedido) { toast('Contá qué trabajo hay que presupuestar'); return; }
      const ch = +cfgRent().costo_hora || costoHoraEstimado(rango(AD.per || { k: 'anio' }, today()));
      const reg = new Map(); ((AD.HR && AD.HR.registro) || []).forEach(r => { if (r.proyectoId) reg.set(r.proyectoId, (reg.get(r.proyectoId) || 0) + r.horas); });
      const hsP = p => (p.etapas || []).reduce((a, t) => a + (+t.horas || 0), 0) + (reg.get(p._id) || 0);
      const historial = S.P.filter(p => hsP(p) > 0).map(p => { const f = AD.PFZ.get(p._id); return { proyecto: p.proyecto, cliente: p.cliente, tipo: p.tipo, estado: p.estado, horas: Math.round(hsP(p) * 10) / 10, tareas: (p.etapas || []).length, presupuesto: f ? f.presupuesto : null, moneda: f ? f.moneda : null, inicio: p.inicio || '', entrega: p.entregaReal || p.entrega || '' }; });
      AD.rtPre = { pedido, tipo, r: AD.rtPre && AD.rtPre.r }; AD.rtPreBusy = true; ctx.render();
      try { AD.rtPre.r = await data.ia({ modo: 'presupuesto', texto: (tipo ? 'Tipo: ' + tipo + '\n' : '') + pedido, contexto: { costo_hora: ch, moneda: 'ARS', proyectos_con_horas: historial, aclaracion: historial.length < 3 ? 'Hay muy pocos proyectos con horas cargadas: dalo como rango amplio y decilo.' : '' } }); }
      catch (err) { toast(err.message); }
      AD.rtPreBusy = false; ctx.render();
    },
    aCuentaDe: t => openCuenta(t.dataset.cliente, thisMonth()),
    plCobros: t => { AD.mes = t.dataset.m; S.tab.cobros = 'mes'; S.view = 'cobros'; try { history.replaceState(null, '', '#cobros'); } catch (e) { /* nada */ } ctx.render(); window.scrollTo(0, 0); },
    plMon: t => { AD.pl = AD.pl || { n: 3 }; AD.pl.mon = t.dataset.v; AD.pl.det = null; ctx.render(); },
    plN: t => { AD.pl = AD.pl || { mon: 'ARS' }; AD.pl.n = +t.dataset.v; AD.pl.det = null; ctx.render(); },
    plDet: t => { AD.pl = AD.pl || { mon: 'ARS', n: 3 }; const k = +t.dataset.k; AD.pl.det = AD.pl.det === k ? null : k; ctx.render(); },
    bkCaja: t => formCaja(t.dataset.id || null),
    bkPago: t => formPago(t.dataset.i != null ? +t.dataset.i : null),
    bkFila: () => { const box = $('#bk-rows'); if (box) { box.insertAdjacentHTML('beforeend', filaPago('', '')); box.lastElementChild.querySelector('input').focus(); } },
    bkQuitar: t => { const r = t.closest('.bk-row'); if (r && r.parentElement.children.length > 1) r.remove(); else if (r) r.querySelectorAll('input').forEach(i => { i.value = ''; }); },
    bkSubir: async t => { const i = +t.dataset.i, cfg = cfgMarca(), cs = [...(cfg.cuentas || [])]; if (i < 1 || !cs[i]) return; [cs[i - 1], cs[i]] = [cs[i], cs[i - 1]]; try { await data.upsert('ajustes', { clave: 'resumen_pdf', valor: { ...cfg, cuentas: cs } }, 'clave'); toast(i === 1 ? 'Ahora es la principal' : 'Orden guardado'); await ctx.reload(); } catch (err) { toast(err.message); } },
    aRecCliente: t => { const ec = estadoCuenta(t.dataset.cliente), f = ec.vencidas[0]; if (!f) { toast('No tiene facturas vencidas'); return; } mail.recordatorio(cuenta(t.dataset.cliente, f.periodo ? String(f.periodo).slice(0, 7) : thisMonth())); },
    aCuDebe: () => { AD.cf = AD.cf || {}; AD.cf.debe = !AD.cf.debe; ctx.render(); },
    aCuentaOtro: () => { const v = $('#a-otro').value; if (v) openCuenta(v, AD.mes); },
    aBack: () => { AD.sel = null; AD.rd = null; ctx.render(); },
    aRiAdd: () => { AD.rd.items.push({ inc: true, origen: 'Manual', ref: '', concepto: '', monto: '' }); ctx.render(); const el = document.getElementById('ri-' + (AD.rd.items.length - 1) + '-c'); if (el) el.focus(); },
    aRiDel: t => { AD.rd.items.splice(+t.dataset.i, 1); ctx.render(); },
    aSugAdd: t => { const s = sugerencias(AD.rd.cliente, AD.rd.m).find(x => x.ref === t.dataset.ref); if (s) { AD.rd.items.push({ inc: true, origen: s.origen, ref: s.ref, concepto: s.concepto, monto: s.monto }); ctx.render(); } },
    aResSave: t => saveResumen(t.dataset.estado),
    aResDel: async () => {
      const rd = AD.rd; if (!rd || !rd.id) return;
      const txt = rd.estado === 'Enviado'
        ? 'Este resumen ya figura como enviado. Si lo borrás, desaparece de la app y del portal del cliente, pero el mail que ya le llegó no se puede recuperar.'
        : 'Se borra el resumen de ' + monthLabel(rd.m) + ' de ' + rd.cliente + '. Las facturas y los cobros de ese mes no se tocan.';
      if (!(await confirmar(txt, { titulo: '¿Borrar este resumen?', ok: 'Borrar', tipo: 'peligro' }))) return;
      try {
        await data.del('resumenes', rd.id);
        AD.R = AD.R.filter(x => x.id !== rd.id);
        toast('Resumen borrado'); await ctx.reload(); openCuenta(rd.cliente, rd.m); ctx.render();
      } catch (err) { toast(err.message); }
    },
    aCopy: () => ctx.copyText(resumenTexto(AD.rd)),
    aPiggyCampo: async t => {
      const f = ((AD.form && AD.form.fields) || []).find(x => x.k === t.dataset.k), el = $('#af-' + t.dataset.k); if (!f || !f.piggy || !el) return;
      const q = f.piggy(); t.disabled = true; const t0 = t.innerHTML; t.textContent = 'Escribiendo…';
      try { const r = await data.ia({ modo: 'texto', tarea: q.tarea, texto: q.texto }); const v = String(r.texto || '').trim().replace(/^["“]|["”]$/g, ''); if (v) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.focus(); } }
      catch (err) { toast(err.message); }
      t.disabled = false; t.innerHTML = t0;
    },
    aCopyPanel: () => { const el = $('#af-texto'); if (el) ctx.copyText(el.value); },
    aPrint: () => printResumen(),
    aCSV: () => exportCSV(),
    aFactura: t => formFactura(t.dataset.id || null),
    aInvoice: t => formInvoice(t.dataset.id || null, t.dataset.cliente ? { cliente: t.dataset.cliente } : null),
    aInvAdd: () => { AD.invDraft.push({ concepto: '', monto: '' }); renderInv(); const ins = document.querySelectorAll('[data-inv="concepto"]'); if (ins.length) ins[ins.length - 1].focus(); },
    aInvDel: t => { AD.invDraft.splice(+t.dataset.i, 1); if (!AD.invDraft.length) AD.invDraft.push({ concepto: '', monto: '' }); renderInv(); },
    aInvEn: async t => {
      const txt = AD.invDraft.map(x => x.concepto).filter(Boolean); if (!txt.length) return;
      t.disabled = true; t.textContent = 'Traduciendo…';
      try { const r = await data.ia({ modo: 'texto', tarea: 'ingles', texto: 'Traducí cada línea por separado y devolvé las líneas en el mismo orden, una por renglón:\n' + txt.join('\n') }); const ls = String(r.texto || '').split('\n').map(s => s.replace(/^[-•\d.)\s]+/, '').trim()).filter(Boolean); let j = 0; AD.invDraft.forEach(x => { if (x.concepto && ls[j]) x.concepto = ls[j++]; }); renderInv(); }
      catch (err) { toast(err.message); }
      t.disabled = false; t.textContent = 'Pasar al inglés con Mr. Piggy';
    },
    aInvoicePdf: async t => {
      const f = AD.F.find(x => x.id === t.dataset.id); if (!f) return;
      const w = window.open('', '_blank');
      try { const p = await invoicePdf(f); p.docs.abrirPdf(p.bytes, p.nombre, w); } catch (err) { if (w) w.close(); toast('No se pudo armar el PDF: ' + err.message); }
    },
    aCobro: t => formCobro(t.dataset.id),
    aRecordatorio: () => mail.recordatorio(cuenta(AD.rd.cliente, AD.rd.m)),
    aRecordatorioManual: () => formGestion('Recordatorio de pago', recordatorioTexto(cuenta(AD.rd.cliente, AD.rd.m))),
    aMailResumen: () => mail.resumen(AD.rd),
    aMailResumenes: () => mail.resumenes(AD.mes),
    epNuevo: () => epPanel(AD.mes),
    epEditar: t => { const e = AD.EP.find(x => x.id === t.dataset.id); if (e) epPanel(e.periodo, e); },
    epConfirmar: t => { const e = AD.EP.find(x => x.id === t.dataset.id); if (e) epConfirmarPanel(e); },
    epVer: async t => { const r = AD.R.find(x => x.id === t.dataset.id); if (!r) return; const w = window.open('', '_blank'); try { const { abrirPdf } = await pdfLib(); const p = await pdfResumen({ id: r.id, numero: r.numero, cliente: r.cliente, m: r.periodo, moneda: r.moneda, items: r.items, nota: r.nota }); abrirPdf(p.bytes, p.nombre.replace(/\.pdf$/, ''), w); } catch (err) { if (w) w.close(); toast(err.message); } },
    epCancelar: async t => {
      const e = AD.EP.find(x => x.id === t.dataset.id); if (!e) return;
      if (!(await confirmar('Se cancela el envío programado del ' + cuandoTxt(e.enviar_el) + '. Los resúmenes quedan preparados, sin enviar.', { titulo: '¿Cancelar el envío programado?', ok: 'Cancelar el envío', no: 'Volver', tipo: 'peligro' }))) return;
      try { await data.del('envios_items', e.id, 'envio_id'); await data.upd('envios_programados', e.id, { estado: 'Cancelado' }); toast('Envío cancelado'); await ctx.reload(); } catch (err) { toast(err.message); }
    },
    aMailFactura: t => { const f = AD.F.find(x => x.id === t.dataset.id); if (f) mail.factura(f); },
    aMailLibre: t => mail.libre(t.dataset.cliente || (AD.rd && AD.rd.cliente)),
    aAvisos: () => mail.avisos(),
    aAdjQuitar: t => { AD.adj.splice(+t.dataset.i, 1); const box = $('#mail-adj'); if (box) box.innerHTML = adjHtml(AD.adj, AD.form && AD.form.composer); },
    aAdjVer: async t => { const a = AD.adj[+t.dataset.i]; if (!a) return; const w = window.open('', '_blank'); const { abrirPdf } = await pdfLib(); abrirPdf(a.bytes, a.nombre.replace(/\.pdf$/, ''), w); },
    aMailCopy: () => { const o = AD.form && AD.form.composer; if (o) ctx.copyText(o.build(composerValues()).texto); },
    aGest: () => formGestion(),
    aGestDel: async t => { try { await data.del('gestiones', t.dataset.id); await ctx.reload(); } catch (err) { toast(err.message); } },
    aClienteAdm: t => formClienteAdm(t.dataset.cliente),
    aPrecio: t => formPrecio(t.dataset.abono),
    aPrecioDel: async t => { try { await data.del('precios_abono', t.dataset.id); ctx.closeForm(); toast('Precio borrado'); await ctx.reload(); } catch (err) { toast(err.message); } },
    aCuotas: t => formCuotas(t.dataset.id),
    aProyAdm: t => formProyectoAdm(t.dataset.id),
    aAds: t => formAds(t.dataset.abono),
    aExtras: t => formExtras(t.dataset.abono),
    aRtVer: t => { AD.rt.ver = t.dataset.v; ctx.render(); },
    aImpAdd: () => { AD.impDraft.push({ dest: '', monto: '' }); renderImp(); },
    aImpCxp: t => {
      const c = (AD.impSug || [])[+t.dataset.i]; if (!c) return;
      const total = parseMonto(($('#af-monto') || {}).value) || 0, asig = AD.impDraft.reduce((a, x) => a + (parseMonto(x.monto) || 0), 0);
      const m = total ? Math.min(c.saldo, Math.max(0, r2(total - asig))) : c.saldo;
      AD.impDraft = AD.impDraft.filter(x => x.dest || x.monto);
      AD.impDraft.push({ dest: 'p:' + c.proyecto_id, monto: String(m).replace('.', ','), costo_id: c.id });
      if (!total) { const el = $('#af-monto'); if (el) el.value = String(c.saldo).replace('.', ','); }
      const d = $('#af-detalle'); if (d && !d.value.trim()) d.value = (c.pagos.length ? 'A cuenta' : 'Anticipo') + ' · ' + c.p.proyecto + (c.concepto ? ' (' + c.concepto + ')' : '');
      renderImp();
    },
    aCxp: t => formCxp(t.dataset.proy, t.dataset.id),
    aCxpPagar: t => formCxpPagar(t.dataset.id),
    aImpDel: t => { AD.impDraft.splice(+t.dataset.i, 1); renderImp(); },
    aImpSplit: () => { const total = parseMonto(($('#af-monto') || {}).value) || 0, n = AD.impDraft.length; if (!n || !total) return; const base = Math.floor(total / n * 100) / 100; AD.impDraft.forEach((x, i) => { x.monto = String(i === n - 1 ? r2(total - base * (n - 1)) : base); }); renderImp(); },
    aImpCopy: () => {
      const c = AD.impCopy; if (!c) return; const total = parseMonto(($('#af-monto') || {}).value) || 0;
      const prev = AD.IMP.filter(i => i.movimiento_id === c.mov.id), sum = prev.reduce((a, i) => a + i.monto, 0) || 1;
      AD.impDraft = prev.map(i => ({ dest: i.abono_id ? 'a:' + i.abono_id : 'p:' + i.proyecto_id, monto: total ? String(r2(total * i.monto / sum)) : String(i.monto) }));
      renderImp();
    },
    aCuotaDel: async t => { const pid = (AD.PF.find(x => x.id === t.dataset.id) || {}).proyecto_id; const enPres = AD.form && AD.form.eyebrow && AD.form.eyebrow.startsWith('Presupuesto'); try { await data.del('proyecto_facturacion', t.dataset.id); await ctx.reload(); if (pid) (enPres ? formProyectoAdm : formCuotas)(pid); } catch (err) { toast(err.message); } },
    aFf: t => { AD.ff[t.dataset.k] = t.dataset.v; ctx.render(); },
    aPpAll: () => { S.A.filter(a => a.estado === 'Activo' && precioEn(a._id, thisMonth())).forEach(a => AD.pp.sel.add(a._id)); ctx.render(); },
    aPpApply: async () => {
      const desde = AD.pp.desde; if (!/^\d{4}-\d{2}$/.test(desde)) { toast('Elegí desde qué mes'); return; }
      const motivo = String(AD.pp.motivo || '').trim(); if (!motivo) { toast('Contá el motivo del aumento: se incluye en el mail al cliente'); const i = $('#pp-mot'); if (i) i.focus(); return; }
      const rows = [...AD.pp.sel].map(id => { const cur = precioEn(id, thisMonth()), pct = pctDe(id); return cur && pct ? { abono_id: id, desde: desde + '-01', monto: r2(cur.monto * (1 + pct / 100)), moneda: cur.moneda, motivo } : null; }).filter(Boolean);
      if (!rows.length) { toast('Poné el % del aumento'); return; }
      try { for (const r of rows) await data.upsert('precios_abono', r, 'abono_id,desde'); toast('Aumento cargado en ' + rows.length + ' abonos'); AD.pp.sel.clear(); AD.pp.pct = ''; AD.pp.pctPor = {}; await ctx.reload(); } catch (err) { toast(err.message); }
    },
    aPpNone: () => { AD.pp.sel.clear(); ctx.render(); },
    aPpSin: () => { const m = thisMonth(), n = +AD.pp.minMeses || 3; AD.pp.sel.clear(); S.A.filter(a => a.estado === 'Activo').forEach(a => { const cur = precioEn(a._id, m); if (!cur) return; const sa = mesesEntre(cur.desde, AD.pp.desde || m); if (sa != null && sa >= n) AD.pp.sel.add(a._id); }); toast(AD.pp.sel.size + ' abonos llevan ' + n + ' meses o más sin aumento'); ctx.render(); },
    aAviso: t => { const p = AD.PR.find(x => x.id === t.dataset.id); if (p) mail.aviso(p); },
    aAvisoManual: t => {
      const p = AD.PR.find(x => x.id === t.dataset.id); const a = p && S.A.find(x => x._id === p.abono_id); if (!a) return;
      openPanel({ title: 'Aviso de aumento', eyebrow: a.cliente, saveLabel: 'Marcar como avisado', intro: 'Copiá el mensaje, ajustalo si hace falta y mandalo. Después marcalo como avisado.',
        values: { texto: avisoTexto(p.id), fecha: today(), canal: 'WhatsApp' },
        fields: [{ k: 'texto', label: 'Mensaje', type: 'textarea', full: 1, rows: 7 }, { k: 'fecha', label: 'Fecha', type: 'date', req: 1 }, { k: 'canal', label: 'Canal', type: 'select', opts: S.L.canales }],
        extra: '<div class="toolbar" style="grid-column:1/-1"><button type="button" class="btn sm" data-act="aCopyPanel">Copiar mensaje</button></div>',
        onSave: async v => { await data.upd('precios_abono', p.id, { aviso_enviado: v.fecha }); await data.ins('gestiones', { cliente_id: data.ids.cliente(a.cliente), periodo: p.desde + '-01', tipo: 'Aviso de aumento', fecha: v.fecha, canal: v.canal, persona_id: data.ids.persona(S.me.alias) }); toast('Aviso registrado'); } });
    },
    aDel: () => { $('#adel').innerHTML = '<span class="muted" style="font-size:13px">¿Seguro?</span> <button type="button" class="btn danger sm" data-act="aDelYes">Sí</button>'; },
    aDelYes: async () => { try { await AD.form.onDelete(); ctx.closeForm(); await ctx.reload(); } catch (err) { toast(err.message); } },
  };

  // Entradas propias de Administración
  document.addEventListener('input', e => {
    const t = e.target;
    if (AD.form && AD.form.composer && t.closest && t.closest('#aform')) { clearTimeout(prevT); prevT = setTimeout(refreshPreview, 250); return; }
    if (t.dataset.impi !== undefined) { AD.impDraft[+t.dataset.impi][t.dataset.impk] = t.value; updateImpSum(); return; }
    if (AD.form && AD.form.onInput && t.closest && t.closest('#aform')) AD.form.onInput();
    if (t.dataset.ri !== undefined && t.type !== 'checkbox' && AD.rd) { AD.rd.items[+t.dataset.ri][t.dataset.rik] = t.value; ctx.render(); return; }
    if (t.dataset.rdk && t.tagName !== 'SELECT' && AD.rd) { AD.rd[t.dataset.rdk] = t.value; return; }
    if (t.dataset.app) { AD.pp[t.dataset.app] = t.value; ctx.render(); return; }
    if (t.dataset.pppct) { AD.pp.pctPor = AD.pp.pctPor || {}; AD.pp.pctPor[t.dataset.pppct] = t.value; ctx.render(); return; }
    if (t.dataset.acj && t.tagName !== 'SELECT') { AD.cj[t.dataset.acj] = t.value; ctx.render(); }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (AD.form && AD.form.composer && t.type === 'checkbox' && t.closest && t.closest('#aform')) { refreshPreview(); return; }
    if (t.dataset.impi !== undefined) { AD.impDraft[+t.dataset.impi][t.dataset.impk] = t.value; return; }
    if (t.dataset.art) { AD.rt[t.dataset.art] = t.value; ctx.render(); return; }
    if (t.dataset.cjper) { const P = AD.cjPer || (AD.cjPer = { k: 'm' }); P[t.dataset.cjper] = t.value; if (t.dataset.cjper === 'k' && t.value === 'rango' && !(P.d && P.h)) { const r = rango({ k: '3m' }, today()); P.d = r.desde; P.h = r.hasta; } ctx.render(); return; }
    if (t.dataset.cuper) { const P = AD.cuPer || (AD.cuPer = { k: 'anio' }); P[t.dataset.cuper] = t.value; if (t.dataset.cuper === 'k' && t.value === 'rango' && !(P.d && P.h)) { const r = rango({ k: '6m' }, today()); P.d = r.desde; P.h = r.hasta; } ctx.render(); return; }
    if (t.dataset.plper) { const P = AD.plPer || (AD.plPer = { k: '6m' }); P[t.dataset.plper] = t.value; if (t.dataset.plper === 'k' && t.value === 'rango' && !(P.d && P.h)) { const r = rango({ k: '6m' }, today()); P.d = r.desde; P.h = r.hasta; } ctx.render(); return; }
    if (AD.form && AD.form.onInput && t.tagName === 'SELECT' && t.closest && t.closest('#aform')) AD.form.onInput();
    if (t.dataset.ri !== undefined && t.type === 'checkbox' && AD.rd) { AD.rd.items[+t.dataset.ri].inc = t.checked; ctx.render(); return; }
    if (t.dataset.rdk && t.tagName === 'SELECT' && AD.rd) { AD.rd[t.dataset.rdk] = t.value; ctx.render(); return; }
    if (t.dataset.aff) { AD.ff[t.dataset.aff] = t.value; ctx.render(); return; }
    if (t.dataset.acj && t.tagName === 'SELECT') { AD.cj[t.dataset.acj] = t.value; ctx.render(); return; }
    if (t.dataset.app && t.tagName === 'SELECT') { AD.pp[t.dataset.app] = t.value; ctx.render(); return; }
    if (t.dataset.ppsel) { if (t.checked) AD.pp.sel.add(t.dataset.ppsel); else AD.pp.sel.delete(t.dataset.ppsel); ctx.render(); }
  });
  document.addEventListener('submit', e => { if (e.target.id === 'aform') { e.preventDefault(); submitPanel(); } });

  /* ---------- contexto de plata para la IA (solo admins) ---------- */
  function contextoIA() {
    const m = thisMonth(), r = n => Math.round(Number(n) || 0);
    const cajaN = id => ((AD.CJ.find(c => c.id === id) || {}).nombre || '');
    const pend = AD.F.filter(f => !f.anulada && f.saldo > 0.009).map(f => ({ cliente: f.cliente, factura: verTipo(f.tipo) + ' ' + (f.numero || 'sin número'), de_que_mes: f.periodo || '', monto: r(f.monto), falta_cobrar: r(f.saldo), moneda: f.moneda, vence: f.vencimiento || '', estado: estadoFactura(f) === 'Vencida' ? 'vencida' : 'a cobrar' }));
    const mes = clientesDelMes(m).map(c => cuenta(c, m)).map(x => ({ cliente: x.cliente, a_cobrar_este_mes: r(x.total), moneda: x.moneda, resumen: x.res ? (x.res.estado === 'Enviado' ? 'enviado' : 'preparado sin enviar') : 'sin preparar', facturado: x.facs.length > 0, falta_cobrar: r(x.saldo) }));
    const precios = S.A.filter(a => a.estado === 'Activo').map(a => { const p = precioEn(a._id, m); return { cliente: a.cliente, abono: a.tipo + (a.plan ? ' ' + a.plan : ''), precio: p ? r(p.monto) : null, moneda: p ? p.moneda : '' }; });
    const movs = [...AD.MV].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 40).map(v => ({ fecha: v.fecha, tipo: v.ingreso > 0 ? 'ingreso' : 'gasto', monto: r(v.ingreso || v.egreso), moneda: v.moneda, quien: v.contraparte, categoria: v.cuenta, detalle_categoria: v.subcuenta, detalle: v.detalle, cuenta: cajaN(v.caja_id) }));
    const pat = new Map(); [...AD.MV].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).forEach(v => { const k = (v.contraparte || '').trim(); if (!k) return; const p = pat.get(k); if (p) p.veces++; else pat.set(k, { quien: k, categoria: v.cuenta, detalle_categoria: v.subcuenta, cuenta_id: v.caja_id || '', veces: 1 }); });
    const cats = {}; AD.PC.forEach(p => { (cats[p.cuenta] = cats[p.cuenta] || []).push(p.subcuenta); });
    const tot = { ingresos: {}, gastos: {} }; AD.MV.filter(v => (v.fecha || '').startsWith(m)).forEach(v => { if (v.ingreso > 0) add(tot.ingresos, v.moneda, v.ingreso); else add(tot.gastos, v.moneda, v.egreso); });
    return { mes_actual: m, facturas_sin_cobrar: pend, cobros_del_mes: mes, precios_de_abonos: precios, gastos_e_ingresos_recientes: movs, totales_del_mes: tot,
      como_se_cargo_antes: [...pat.values()].sort((a, b) => b.veces - a.veces).slice(0, 50), categorias: cats, cuentas: AD.CJ.filter(c => c.activa !== false).map(c => ({ id: c.id, nombre: c.nombre, moneda: c.moneda })) };
  }

  /* ---------- Bancos y datos de pago ---------- */
  // Dos cosas distintas: dónde está la plata (cuentas de banco y efectivo, con su saldo) y los datos que ven los clientes para pagar.
  const CAMPOS_PAGO = ['Alias', 'CBU', 'CVU', 'Nombre del banco', 'Nombre del beneficiario', 'CUIT', 'Tipo de cuenta', 'Número de cuenta', 'Dirección del banco', 'Enrutamiento de ABA', 'IBAN', 'BIC / SWIFT'];
  const saldoCaja = c => AD.MV.filter(v => v.caja_id === c.id && enSaldo(v)).reduce((a, v) => a + v.ingreso - v.egreso, 0);
  const movsCaja = c => AD.MV.filter(v => v.caja_id === c.id).length;
  function vBancos() {
    const cfg = cfgMarca(), cs = cfg.cuentas || [];
    const cajas = AD.CJ.slice().sort((a, b) => (b.activa !== false) - (a.activa !== false) || (a.orden || 0) - (b.orden || 0));
    let h = '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.banco + '</span><h2>Dónde está la plata</h2><div class="sx-der"><button class="btn sm primary" data-act="bkCaja">+ Cuenta</button></div></div>' +
      '<div class="sx-panel"><p class="sx-lead" style="margin:0 0 10px">Las cuentas de banco y el efectivo donde entran y salen los pagos. El saldo sale de Gastos e ingresos.</p>' +
      (cajas.length ? '<div class="bk-l">' + cajas.map(c => '<button class="bk-c' + (c.activa === false ? ' off' : '') + '" data-act="bkCaja" data-id="' + esc(c.id) + '"><span class="bk-n"><b>' + esc(c.nombre) + '</b><span>' + esc(c.moneda) + (c.activa === false ? ' · desactivada' : '') + ' · ' + movsCaja(c) + ' movimientos</span></span><b class="money' + (saldoCaja(c) < 0 ? ' t-crit' : '') + '">' + esc(money(saldoCaja(c), c.moneda)) + '</b><span class="muted">Editar</span></button>').join('') + '</div>' : emptyBox('Todavía no hay cuentas cargadas', 'Sumá la cuenta del banco y el efectivo, con la plata que tenían el día que empezaron a usar la app.')) + '</div></section>';
    h += '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.mail + '</span><h2>Datos para que te paguen</h2><div class="sx-der"><button class="btn sm primary" data-act="bkPago">+ Datos de pago</button></div></div>' +
      '<div class="sx-panel"><p class="sx-lead" style="margin:0 0 10px">Es lo que sale en “Cómo pagar” en los mails de resúmenes, facturas y recordatorios, y en los PDF. La primera es la principal (la que se ve destacada).</p>' +
      (cs.length ? '<div class="bk-l">' + cs.map((c, i) => '<div class="bk-c bk-p"><span class="bk-n"><b>' + esc(c.titulo || 'Sin título') + (i === 0 ? ' <span class="pzst" style="--c:var(--s-entregado)">principal</span>' : '') + '</b><span>' + esc((c.sub ? c.sub + ' · ' : '') + (c.campos || []).filter(x => x[1]).map(x => x[0] + ' ' + x[1]).join(' · ')) + '</span></span>' +
        '<span class="toolbar">' + (i > 0 ? '<button class="btn ghost sm" data-act="bkSubir" data-i="' + i + '" title="Subir">↑</button>' : '') + '<button class="btn sm" data-act="bkPago" data-i="' + i + '">Editar</button></span></div>').join('') + '</div>' : emptyBox('No hay datos de pago', 'Sin esto, los mails no muestran cómo pagar.')) + '</div></section>';
    return h;
  }
  function formCaja(id) {
    const c = id ? AD.CJ.find(x => x.id === id) : null;
    const ini = c ? AD.MV.find(v => v.caja_id === c.id && v.cuenta === 'Saldo Inicial') : null;
    const n = c ? movsCaja(c) : 0;
    openPanel({ title: c ? c.nombre : 'Nueva cuenta', eyebrow: 'Dónde está la plata',
      intro: c ? 'Saldo hoy: <b>' + esc(money(saldoCaja(c), c.moneda)) + '</b> · ' + n + ' movimientos.' : 'Una cuenta de banco, una billetera virtual o el efectivo.',
      values: { nombre: c ? c.nombre : '', moneda: c ? c.moneda : 'ARS', ini: ini ? String(ini.ingreso - ini.egreso) : '', fini: ini ? ini.fecha : (c && c.saldo_inicial_fecha) || today(), activa: c ? c.activa !== false : true },
      fields: [
        { k: 'nombre', label: 'Nombre', req: 1, full: 1, ph: 'Ej.: Galicia pesos, Mercado Pago, Efectivo' },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: ['ARS', 'USD', 'EUR', 'GBP'] },
        { k: 'activa', label: 'En uso (aparece al cargar gastos e ingresos)', type: 'check' },
        { k: 'ini', label: 'Plata que tenía al empezar', hint: 'Lo que decía el banco al empezar ese día. Vacío si no corresponde.', ph: 'Ej.: 1250000' },
        { k: 'fini', label: 'A qué fecha', type: 'date', hint: 'Desde ese día suman los movimientos. Lo cargado antes queda como historial y no cambia el saldo.' },
      ],
      onDelete: c ? async () => { if (n - (ini ? 1 : 0) > 0) throw new Error('Tiene movimientos: desactivala en vez de borrarla, así no se pierde el historial.'); if (ini) await data.del('movimientos', ini.id); await data.del('cajas', c.id); toast('Cuenta borrada'); } : null,
      deleteLabel: 'Borrar cuenta',
      onSave: async v => {
        const row = { nombre: v.nombre.trim(), moneda: v.moneda, activa: !!v.activa, saldo_inicial_fecha: v.fini || null };
        if (AD.CJ.some(x => x.nombre.toLowerCase() === row.nombre.toLowerCase() && (!c || x.id !== c.id))) throw new Error('Ya hay una cuenta con ese nombre');
        let cid = c && c.id;
        if (c) await data.upd('cajas', c.id, row); else { const r = await data.ins('cajas', { ...row, orden: AD.CJ.length }); cid = r.id; }
        const monto = parseMonto(v.ini);
        if (monto != null && !isNaN(monto)) {
          const mv = { fecha: v.fini || today(), cuenta: 'Saldo Inicial', subcuenta: '', detalle: 'Saldo inicial', ingreso: monto > 0 ? monto : 0, egreso: monto < 0 ? -monto : 0, moneda: row.moneda, caja_id: cid };
          if (ini) await data.upd('movimientos', ini.id, mv); else await data.ins('movimientos', mv);
        } else if (ini) await data.del('movimientos', ini.id);
        toast(c ? 'Cuenta guardada' : 'Cuenta creada');
      },
    });
  }
  function formPago(i) {
    const cfg = cfgMarca(), cs = (cfg.cuentas || []).map(c => ({ ...c, campos: (c.campos || []).map(x => [...x]) }));
    const c = i != null && cs[i] ? cs[i] : { titulo: '', sub: '', campos: [['Alias', ''], ['CBU', ''], ['Nombre del banco', ''], ['Nombre del beneficiario', '']] };
    const filas = c.campos.length ? c.campos : [['', '']];
    openPanel({ title: i != null ? (c.titulo || 'Datos de pago') : 'Nuevos datos de pago', eyebrow: 'Datos para que te paguen',
      intro: 'Así aparecen en los mails: un título (por ejemplo “Argentina” o “EEUU”), una aclaración opcional y los datos uno por renglón.',
      values: { titulo: c.titulo || '', sub: c.sub || '' },
      fields: [{ k: 'titulo', label: 'Título', req: 1, ph: 'Ej.: Argentina' }, { k: 'sub', label: 'Aclaración', ph: 'Ej.: solo cuentas Empresa' }],
      extra: '<div class="field full"><span class="lbl">Datos</span><div id="bk-rows" class="bk-rows">' + filas.map(([kk, vv]) => filaPago(kk, vv)).join('') + '</div><button type="button" class="btn sm ghost" data-act="bkFila">+ Otro dato</button>' +
        '<datalist id="dl-pago">' + CAMPOS_PAGO.map(x => '<option value="' + esc(x) + '">').join('') + '</datalist></div>',
      onDelete: i != null && cs[i] ? async () => { cs.splice(i, 1); await data.upsert('ajustes', { clave: 'resumen_pdf', valor: { ...cfg, cuentas: cs } }, 'clave'); toast('Datos de pago borrados'); } : null,
      deleteLabel: 'Borrar estos datos',
      onSave: async v => {
        const campos = [...document.querySelectorAll('#bk-rows .bk-row')].map(r => [r.querySelector('[data-bk="k"]').value.trim(), r.querySelector('[data-bk="v"]').value.trim()]).filter(([kk, vv]) => kk && vv);
        if (!campos.length) throw new Error('Cargá al menos un dato (por ejemplo el alias o el CBU)');
        const nuevo = { titulo: v.titulo.trim(), sub: v.sub.trim(), campos };
        if (i != null && cs[i]) cs[i] = { ...cs[i], ...nuevo }; else cs.push(nuevo);
        await data.upsert('ajustes', { clave: 'resumen_pdf', valor: { ...cfg, cuentas: cs } }, 'clave'); toast('Datos de pago guardados');
      },
    });
  }
  const filaPago = (kk, vv) => '<div class="bk-row"><input class="in" data-bk="k" list="dl-pago" value="' + esc(kk || '') + '" placeholder="Dato (ej.: Alias)" aria-label="Dato"><input class="in" data-bk="v" value="' + esc(vv || '') + '" placeholder="Valor" aria-label="Valor"><button type="button" class="btn ghost sm" data-act="bkQuitar" aria-label="Quitar este dato">✕</button></div>';

  /* ---------- pantallas con pestañas ---------- */
  function vCobros() {
    const venc = AD.F.filter(f => estadoFactura(f) === 'Vencida').length, drv = AS.driveCount();
    const tabs = ctx.subnav('cobros', [['mes', 'Este mes'], ['facturas', 'Facturas', venc], ['drive', 'Facturas en Drive', drv]]);
    const t = S.tab.cobros || 'mes';
    if (t === 'facturas') return tabs + vFacturas();
    if (t === 'drive') return tabs + AS.driveView();
    return tabs + vCierre();
  }
  function vGastos() {
    const tabs = ctx.subnav('gastos', [['movs', 'Movimientos'], ['banco', 'Resumen del banco']]);
    return tabs + ((S.tab.gastos || 'movs') === 'banco' ? AS.bancoView() : vCaja());
  }
  function vAjustes() {
    const tabs = ctx.subnav('ajustes', [['conexiones', 'Conexiones y facturación'], ['bancos', 'Bancos y datos de pago'], ['auto', 'Automatizaciones'], ['carga', 'Carga inicial'], ['datos', 'Copia y datos']]);
    const t = S.tab.ajustes || 'conexiones';
    return tabs + (t === 'bancos' ? vBancos() : t === 'auto' && ctx.autoVista ? ctx.autoVista() : t === 'carga' ? MT.html('carga') : t === 'datos' ? MT.html('datos') : AS.ajustes());
  }
  function vNumeros() {
    const tabs = ctx.subnav('numeros', [['stats', 'General'], ['rent', 'Qué deja cada cliente']]);
    return tabs + ((S.tab.numeros || 'stats') === 'rent' ? vRent() : ST.view());
  }

  Object.assign(actions, EQ.actions, AS.actions, ST.actions, PZ.actions, MT.actions);
  return {
    load, actions, extrasCfg, formExtras, fichaSection, deudaLinea, proyectoSection, AD, cfgMarca: () => cfgMarca(),
    precioHoy: (id, m) => (AD.ok ? precioEn(id, m || thisMonth()) : null), moneyFmt: (n, m) => money(n, m),
    // Para la IA: abrir formularios ya completos (nada se guarda sin confirmar).
    abrir: {
      movimiento: preset => formMovimiento(null, preset),
      cuenta: cliente => { S.tab.cobros = 'mes'; actions.aCuenta({ dataset: { cliente } }); },
      propuesta: preset => actions.pzNueva({ dataset: { clase: preset.clase || 'Presupuesto', preset: JSON.stringify(preset) } }),
    },
    contexto: () => contextoIA(),
    views: [['plata', 'Hoy y lo que viene', vPlata], ['cuentas', 'Saldos de clientes', vCuentas], ['propuestas', 'Presupuestos', PZ.view], ['cobros', 'Cobros', vCobros], ['gastos', 'Gastos e ingresos', vGastos], ['sueldos', 'Sueldos', EQ.vSueldos], ['aumentos', 'Aumentos', EQ.vAumentos], ['proveedores', 'Proveedores', EQ.vProveedores], ['numeros', 'Estadísticas', vNumeros], ['ajustes', 'Ajustes', vAjustes],
      ['asistente', 'Asistente', AS.view], ['estadisticas', 'Estadísticas', ST.view], ['cierre', 'Cobros del mes', vCierre], ['facturas', 'Facturas', vFacturas], ['precios', 'Precios a clientes', vPrecios], ['caja', 'Gastos e ingresos', vCaja], ['rentabilidad', 'Qué deja cada cliente', vRent]],
    equipoView: () => EQ.vPersonas(),
    counts: () => (AD.ok ? { cobros: AD.F.filter(f => estadoFactura(f) === 'Vencida').length + AS.count() } : {}),
    resetView: () => { AD.sel = null; AD.rd = null; PZ.reset(); },
  };
}
