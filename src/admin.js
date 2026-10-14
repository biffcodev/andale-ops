// Administración: precios y aumentos, cierre de mes (resumen → comprobante → cobro → recordatorio), facturas.
// Solo para administradores. La base de datos además lo impide para otros roles.
import * as data from './data.js';
import * as E from './emails.js';
import { initEquipo } from './equipo.js';
import { initAsistente } from './asistente.js';
import { initStats } from './stats.js';

export function initAdmin(ctx) {
  const { S, esc, opt, optsFrom, pill, fmt, monthLabel, thisMonth, addMonth, today, diff, cmp, norm, emptyBox, clienteOpts, toast, $ } = ctx;
  const MONEDAS = ['ARS', 'USD', 'EUR'];
  const EMISORES = ['Fer', 'Jime'];
  const TIPOS_COMP = ['Factura ARCA', 'Invoice', 'Otro'];
  const AD = { ok: false, CA: new Map(), PR: [], PF: [], R: [], F: [], CJ: [], PC: [], MV: [], G: [], EM: [], AJ: {}, adj: [], PFZ: new Map(), ABF: new Map(), IMP: [], impDraft: [], CO: [], RM: [], CF: [], LQ: [], DA: [], IL: [], postSave: null, rt: { anio: String(new Date().getFullYear()), ver: 'proyectos' },
    mes: thisMonth(), sel: null, rd: null, ff: { estado: 'abiertas', cliente: '', emisor: '', anio: String(new Date().getFullYear()) },
    pp: { sel: new Set(), pct: '', desde: addMonth(thisMonth(), 1), motivo: '' }, form: null };

  /* ---------- utilidades de plata ---------- */
  function money(n, cur) { if (n === null || n === undefined || n === '' || isNaN(n)) return '—'; try { return new Intl.NumberFormat('es-AR', { style: 'currency', currency: cur || 'ARS', maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(n); } catch (e) { return (cur || '') + ' ' + n; } }
  function parseMonto(s) {
    if (typeof s === 'number') return s;
    s = String(s || '').trim(); if (!s) return null;
    s = s.replace(/[^\d,.\-]/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    else if ((s.match(/\./g) || []).length > 1 || /\.\d{3}$/.test(s)) s = s.replace(/\./g, '');
    const n = Number(s); return isNaN(n) ? null : n;
  }
  const r2 = n => Math.round(n * 100) / 100;
  const add = (acc, cur, n) => { if (n) acc[cur || 'ARS'] = (acc[cur || 'ARS'] || 0) + n; return acc; };
  const multi = acc => { const e = Object.entries(acc).filter(([, v]) => Math.abs(v) > 0.004); return e.length ? e.map(([c, v]) => money(v, c)).join(' + ') : money(0, 'ARS'); };
  const lock = ''; // la barra lateral ya agrupa Administración
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

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
      if (a.tipo === 'Ads' && af && af.inversion && af.inversion_paga === 'àndale') out.push({ inc: true, origen: 'Pauta', ref: 'pauta:' + a._id + ':' + m, concepto: 'Inversión en pauta' + (af.plataformas ? ' (' + af.plataformas + ')' : '') + ' · ' + cap(monthLabel(m).split(' ')[0]), monto: String(af.inversion), moneda: af.inversion_moneda || 'ARS' });
    });
    S.P.filter(p => p.cliente === cliente).forEach(p => {
      AD.PF.filter(c => c.proyecto_id === p._id && c.periodo === m).forEach(c => out.push({ inc: true, origen: 'Proyecto', ref: 'pf:' + c.id, concepto: p.proyecto + (c.concepto ? ' · ' + c.concepto : ''), monto: c.monto == null ? '' : String(c.monto), moneda: c.moneda }));
    });
    return out;
  }
  const totalItems = items => items.filter(i => i.inc).reduce((s, i) => s + (parseMonto(i.monto) || 0), 0);
  function clientesDelMes(m) {
    const s = new Set();
    S.A.forEach(a => { if (abonoEnMes(a, m) && a.cliente) s.add(a.cliente); });
    AD.PF.forEach(c => { if (c.periodo === m) { const p = S.P.find(x => x._id === c.proyecto_id); if (p) s.add(p.cliente); } });
    AD.R.forEach(r => { if (r.periodo === m) s.add(r.cliente); });
    AD.F.forEach(f => { if (f.periodo === m) s.add(f.cliente); });
    return [...s].filter(Boolean).sort(cmp);
  }
  function estadoFactura(f) {
    if (f.saldo <= 0.009) return 'Pagada';
    if (f.vencimiento && f.vencimiento < today()) return 'Vencida';
    if (f.cobrado > 0) return 'Parcial';
    return 'Pendiente';
  }
  const EF_COLOR = { 'Pagada': '--s-entregado', 'Vencida': '--crit', 'Parcial': '--s-revision', 'Pendiente': '--s-empezar' };
  const efPill = f => pill(estadoFactura(f), EF_COLOR[estadoFactura(f)]);
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
  const contactoDe = cliente => { const c = S.C.find(x => x.nombre === cliente) || {}; return (c.contacto || '').split(/[,/]/)[0].trim().split(' ')[0]; };

  /* ---------- carga ---------- */
  async function load() {
    try { Object.assign(AD, await data.loadAdmin(), { ok: true }); }
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
    let h = '<div class="head"><div>' + lock + '<h1>Cierre de mes</h1><p>Resumen, comprobante, cobro y recordatorio de cada cliente del mes.</p></div>' +
      '<div class="toolbar"><div class="cal-h"><h2 style="min-width:170px">' + esc(cap(monthLabel(m))) + '</h2><button class="btn sm" data-act="aMes" data-d="-1" aria-label="Mes anterior">←</button><button class="btn sm" data-act="aMes" data-d="0">Este mes</button><button class="btn sm" data-act="aMes" data-d="1" aria-label="Mes siguiente">→</button></div></div></div>';
    h += '<section class="kpis">' +
      '<div class="kpi"><span class="eyebrow">A facturar</span><b style="font-size:22px;color:var(--money)">' + esc(multi(aFacturar)) + '</b><span>' + cl.length + ' clientes</span></div>' +
      '<div class="kpi"><span class="eyebrow">Resúmenes enviados</span><b>' + env + '</b><span>de ' + cl.length + '</span></div>' +
      '<div class="kpi"><span class="eyebrow">Comprobantes emitidos</span><b>' + conComp + '</b><span>' + esc(multi(emitido)) + '</span></div>' +
      '<div class="kpi ' + (Object.keys(pendientes).some(k => pendientes[k] > 0.009) ? 'warn' : '') + '"><span class="eyebrow">Cobrado</span><b style="font-size:22px;color:var(--money)">' + esc(multi(cobrado)) + '</b><span>falta cobrar ' + esc(multi(pendientes)) + '</span></div>' +
      '</section>';
    const sinPrecio = S.A.filter(a => abonoEnMes(a, m) && !precioEn(a._id, m));
    if (sinPrecio.length) h += '<section class="callout"><p><b>' + sinPrecio.length + ' abonos</b> de este mes no tienen precio cargado, así que el resumen sale sin monto. Cargalos en Precios.</p><button class="btn" data-act="go" data-view="precios">Ir a Precios</button></section>';
    const step = (ok, txt, warn) => pill(txt, ok ? '--s-entregado' : warn ? '--crit' : '--s-empezar');
    const tr = rows.map(r => {
      const resTxt = r.res ? (r.res.estado === 'Enviado' ? step(true, 'Enviado ' + fmt(r.res.enviado_el || '').slice(0, 5)) : step(false, 'Borrador')) : step(false, 'Sin armar');
      const compTxt = r.facs.length ? step(true, r.facs.map(f => (f.tipo === 'Invoice' ? 'Invoice ' : 'Fact. ') + (f.numero || 's/n') + (f.emisor ? ' · ' + f.emisor : '')).join(', ')) : step(false, 'Sin emitir');
      const venc = r.facs.some(f => estadoFactura(f) === 'Vencida');
      const cobTxt = !r.facs.length ? '<span class="muted">—</span>' : r.saldo <= 0.009 ? step(true, 'Cobrado') : step(false, (r.cobrado > 0 ? 'Debe ' : 'Pendiente ') + money(r.saldo, r.moneda), venc);
      const recTxt = r.rec ? '<span class="muted">' + fmt(r.rec.fecha) + '</span>' : (venc ? '<span class="days late">Mandar</span>' : '<span class="muted">—</span>');
      return '<tr class="click" data-act="aCuenta" data-cliente="' + esc(r.cliente) + '"><td class="name">' + esc(r.cliente) + '</td><td class="r"><span class="money"' + (r.res ? '' : ' style="opacity:.7"') + '>' + money(r.total, r.moneda) + '</span>' + (r.res ? '' : '<span class="sub">estimado</span>') + '</td><td>' + resTxt + '</td><td>' + compTxt + '</td><td>' + cobTxt + '</td><td>' + recTxt + '</td></tr>';
    }).join('');
    h += '<section class="sheet"><div class="sheet-h"><h2>Clientes del mes</h2><div class="toolbar"><select class="in" id="a-otro" aria-label="Otro cliente">' + clienteOpts('', 'Cuenta de otro cliente…') + '</select><button class="btn sm" data-act="aCuentaOtro">Abrir</button><button class="btn sm primary" data-act="aMailResumenes">Enviar resúmenes por email</button><button class="btn sm" data-act="aCSV" title="Para la combinación de correspondencia de Gmail">Exportar CSV</button></div></div>' +
      (tr ? '<div class="tbl"><table><thead><tr><th>Cliente</th><th class="r">Total</th><th>Resumen</th><th>Comprobante</th><th>Cobro</th><th>Recordatorio</th></tr></thead><tbody>' + tr + '</tbody></table></div>' : emptyBox('Nada para facturar en ' + monthLabel(m), 'Cargá precios en los abonos activos o meses de facturación en los proyectos.')) + '</section>';
    return h;
  }

  function openCuenta(cliente, m) {
    const r = AD.R.find(x => x.cliente === cliente && x.periodo === m);
    if (r) AD.rd = { id: r.id, cliente, m, moneda: r.moneda, items: r.items.map(i => ({ inc: !!i.inc, origen: i.origen || 'Manual', ref: i.ref || '', concepto: i.concepto || '', monto: i.monto == null ? '' : String(i.monto) })), nota: r.nota || '', estado: r.estado, enviado_el: r.enviado_el || '', link_pdf: r.link_pdf || '' };
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
    const items = rd.items.map((it, i) => '<div class="ri' + (it.inc ? '' : ' off') + '" style="display:grid;grid-template-columns:24px minmax(0,1fr) 150px 30px;gap:10px;align-items:center;padding:8px 16px;border-bottom:1px solid var(--line);' + (it.inc ? '' : 'opacity:.5') + '"><input type="checkbox" aria-label="Incluir" id="ri-' + i + '-inc" data-ri="' + i + '" data-rik="inc"' + (it.inc ? ' checked' : '') + '><div class="field" style="gap:2px"><input type="text" id="ri-' + i + '-c" data-ri="' + i + '" data-rik="concepto" value="' + esc(it.concepto) + '" placeholder="Concepto"><span class="hint">' + esc(it.origen || 'Manual') + '</span></div><div class="field"><input type="text" style="text-align:right" inputmode="decimal" id="ri-' + i + '-m" data-ri="' + i + '" data-rik="monto" value="' + esc(it.monto) + '" placeholder="Monto"></div><button class="btn ghost sm" data-act="aRiDel" data-i="' + i + '" aria-label="Quitar ítem">✕</button></div>').join('');
    const facs = c.facs.map(f => '<div class="row" style="cursor:default"><span class="d">' + fmt(f.fecha) + '</span><span class="t"><b>' + esc(f.tipo) + ' ' + esc(f.numero || 's/n') + (f.emisor ? ' · ' + esc(f.emisor) : '') + '</b><span><span class="money">' + money(f.monto, f.moneda) + '</span> · cobrado ' + money(f.cobrado, f.moneda) + (f.vencimiento ? ' · vence ' + fmt(f.vencimiento) : '') + (f.link_pdf ? ' · <a href="' + esc(f.link_pdf) + '" target="_blank" rel="noopener">PDF</a>' : '') + '</span></span><span class="toolbar">' + efPill(f) + (f.saldo > 0.009 ? '<button class="btn sm" data-act="aCobro" data-id="' + esc(f.id) + '">Registrar cobro</button>' : '') + '<button class="btn sm" data-act="aMailFactura" data-id="' + esc(f.id) + '">Enviar</button><button class="btn ghost sm" data-act="aFactura" data-id="' + esc(f.id) + '">Editar</button></span></div>').join('');
    const gest = c.gest.map(g => '<div class="row" style="cursor:default"><span class="d">' + fmt(g.fecha) + '</span><span class="t"><b>' + esc(g.tipo) + '</b><span>' + esc([g.canal, g.persona, g.nota].filter(Boolean).join(' · ')) + '</span></span><button class="btn ghost sm" data-act="aGestDel" data-id="' + esc(g.id) + '" aria-label="Borrar">✕</button></div>').join('');
    return '<button class="btn ghost sm" data-act="aBack" style="justify-self:start">← Cierre de ' + esc(monthLabel(rd.m)) + '</button>' +
      '<div class="head"><div>' + lock + '<h1>' + esc(rd.cliente) + '</h1><p style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">Cuenta de <b style="color:var(--fg)">' + esc(cap(monthLabel(rd.m))) + '</b>' + (ca.cuit ? ' · CUIT ' + esc(ca.cuit) : '') + (ca.carpeta_admin ? ' · <a href="' + esc(ca.carpeta_admin) + '" target="_blank" rel="noopener">Carpeta de administración</a>' : '') + '</p></div>' +
      '<div class="toolbar"><button class="btn" data-act="aClienteAdm" data-cliente="' + esc(rd.cliente) + '">Datos de facturación</button></div></div>' +
      '<div class="grid2"><div class="stack">' +
      '<section class="sheet"><div class="sheet-h"><h2>1 · Resumen de cuenta</h2><span class="toolbar">' + pill(rd.estado, rd.estado === 'Enviado' ? '--s-entregado' : rd.estado === 'Borrador' ? '--s-revision' : '--s-empezar') + '<label class="muted" for="rd-mon">Moneda</label><select class="in" id="rd-mon" data-rdk="moneda">' + optsFrom(MONEDAS, rd.moneda) + '</select></span></div>' +
      '<div>' + (items || emptyBox('Sin ítems', 'Agregá uno manual o sumá una sugerencia.')) + '</div>' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:14px 16px;font-family:var(--f-display);font-size:22px;font-weight:700"><span>Total</span><span class="money" style="font-size:26px">' + money(totalItems(rd.items), rd.moneda) + '</span></div>' +
      (sug.length ? '<div style="border-top:1px solid var(--line)">' + sug.map(s => '<div class="row" style="cursor:default"><span class="d">' + esc(s.origen) + '</span><span class="t"><b>' + esc(s.concepto) + '</b><span>' + (s.monto ? money(parseMonto(s.monto), s.moneda) : 'sin monto') + '</span></span><button class="btn sm" data-act="aSugAdd" data-ref="' + esc(s.ref) + '">Agregar</button></div>').join('') + '</div>' : '') +
      '<div class="sheet-b" style="display:grid;gap:10px;border-top:1px solid var(--line)"><div class="field"><label for="rd-nota">Nota al pie</label><textarea id="rd-nota" rows="2" data-rdk="nota" placeholder="Ej.: datos de pago, vencimiento">' + esc(rd.nota) + '</textarea></div>' +
      '<div class="field"><label for="rd-pdf">Link al PDF del resumen (Drive)</label><input id="rd-pdf" data-rdk="link_pdf" value="' + esc(rd.link_pdf) + '" placeholder="https://drive.google.com/..."></div>' +
      '<div class="toolbar"><button class="btn sm" data-act="aRiAdd">+ Ítem manual</button><button class="btn sm" data-act="aCopy" data-what="resumen">Copiar texto</button><button class="btn sm" data-act="aPrint">Ver PDF</button><button class="btn sm primary" data-act="aMailResumen">Enviar por email</button></div>' +
      '<div class="toolbar"><button class="btn" data-act="aResSave" data-estado="' + (sent ? 'Enviado' : 'Borrador') + '">Guardar' + (sent ? ' cambios' : ' borrador') + '</button>' + (sent ? '<button class="btn ghost" data-act="aResSave" data-estado="Borrador">Volver a borrador</button>' : '<button class="btn primary" data-act="aResSave" data-estado="Enviado">Marcar como enviado</button>') + '</div></div></section></div>' +
      '<div class="stack">' +
      '<section class="sheet"><div class="sheet-h"><h2>2 · Comprobantes</h2><button class="btn sm primary" data-act="aFactura">+ Comprobante</button></div>' + (facs ? '<div class="rows">' + facs + '</div>' : emptyBox('Sin comprobantes este mes', 'Cargá la factura ARCA o el invoice con su número y el link al PDF.')) +
      (c.facs.length ? '<div class="count">Emitido <b class="money">' + money(c.emitido, c.moneda) + '</b> · cobrado <b class="money">' + money(c.cobrado, c.moneda) + '</b> · saldo <b class="money">' + money(c.saldo, c.moneda) + '</b></div>' : '') + '</section>' +
      '<section class="sheet"><div class="sheet-h"><h2>3 · Seguimiento</h2><span class="toolbar"><button class="btn sm" data-act="aRecordatorio">Recordatorio de pago</button><button class="btn sm" data-act="aMailLibre">Email</button><button class="btn sm" data-act="aGest">+ Registrar</button></span></div>' + (gest ? '<div class="rows">' + gest + '</div>' : emptyBox('Sin gestiones registradas', 'Envíos de resumen, de factura y recordatorios quedan acá con fecha.')) + '</section>' +
      '</div></div>';
  }

  async function saveResumen(estado, opts = {}) {
    const rd = AD.rd; const cid = data.ids.cliente(rd.cliente); if (!cid) { toast('Cliente no encontrado'); return; }
    const items = rd.items.filter(i => i.concepto.trim() || i.monto).map(i => ({ inc: !!i.inc, origen: i.origen || 'Manual', ref: i.ref || '', concepto: i.concepto.trim(), monto: parseMonto(i.monto) }));
    const row = { cliente_id: cid, periodo: rd.m + '-01', moneda: rd.moneda, items, total: r2(totalItems(rd.items)), nota: rd.nota.trim(), estado, enviado_el: estado === 'Enviado' ? (rd.enviado_el || today()) : null, link_pdf: rd.link_pdf.trim() };
    try {
      if (rd.id) await data.upd('resumenes', rd.id, row); else rd.id = (await data.ins('resumenes', row)).id;
      if (estado === 'Enviado' && rd.estado !== 'Enviado' && !opts.sinGestion) await data.ins('gestiones', { cliente_id: cid, periodo: rd.m + '-01', tipo: 'Resumen de cuenta', fecha: today(), canal: 'Email', persona_id: data.ids.persona(S.me.alias) });
      rd.estado = estado; rd.enviado_el = row.enviado_el || '';
      if (!opts.silencioso) { toast(estado === 'Enviado' ? 'Resumen marcado como enviado' : 'Resumen guardado'); await ctx.reload(); }
    } catch (err) { if (opts.silencioso) throw err; toast(err.message); }
  }

  /* ---------- PDF y emails con la marca ---------- */
  const cfgMarca = () => (AD.AJ && AD.AJ.resumen_pdf) || {};
  const periodoTit = m => cap(monthLabel(m).replace(' de ', ' '));
  const periodoTxt = m => monthLabel(m).replace(' de ', ' ');
  const contactoFull = cliente => ((S.C.find(x => x.nombre === cliente) || {}).contacto || '').split(/[,/]/)[0].trim();
  const mailsDe = cliente => { const c = S.C.find(x => x.nombre === cliente) || {}; return (cadm(cliente).email_facturacion || c.email || '').split(/[,;\s]+/).filter(Boolean).join(', '); };
  const firma = () => 'Saludos,\n' + (((S.me && (S.me.nombre || S.me.alias)) || '').split(' ')[0] || 'Equipo') + '\nàndale';
  const pdfLib = () => import('./pdf.js');
  const itemsDe = r => r.items.filter(i => i.inc && String(i.concepto || '').trim()).map(i => ({ concepto: String(i.concepto).trim(), monto: parseMonto(i.monto) || 0 }));
  async function pdfResumen(r) { // r: { cliente, m, moneda, items, nota }
    const { resumenPdf, bytesBase64 } = await pdfLib();
    const items = itemsDe(r);
    const bytes = await resumenPdf({ cfg: cfgMarca(), contacto: contactoFull(r.cliente), cuenta: r.cliente, periodo: periodoTit(r.m), moneda: r.moneda, items, total: r2(items.reduce((a, i) => a + i.monto, 0)), nota: r.nota || '' });
    return { bytes, nombre: 'Resumen-' + r.cliente + '-' + periodoTit(r.m) + '.pdf', base64: bytesBase64(bytes) };
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
      extra: (adj.length ? '<div class="field full"><span class="lbl">Adjuntos</span><div class="tags" style="gap:6px">' + adj.map((a, i) => '<button type="button" class="btn sm" data-act="aAdjVer" data-i="' + i + '">📎 ' + esc(a.nombre) + '</button>').join('') + '</div></div>' : '') +
        '<div class="field full"><span class="lbl">Vista previa</span><iframe id="mail-prev" title="Vista previa del email" style="width:100%;height:560px;border:1px solid var(--line);border-radius:8px;background:#f1f1f1"></iframe></div>' +
        '<div class="toolbar" style="grid-column:1/-1"><button type="button" class="btn sm" data-act="aMailCopy">Copiar texto (WhatsApp)</button>' + (o.extraBtns || '') + '</div>',
      onSave: async v => {
        const b = o.build(v);
        const r = await data.sendEmail({ tipo: o.tipo, cliente_id: o.cliente ? data.ids.cliente(o.cliente) : null, periodo: o.periodo ? o.periodo + '-01' : null, factura_id: o.factura_id || null,
          para: v.para, cc: v.cc, asunto: v.asunto, html: b.html, texto: b.texto, copia: v.copia, adjuntos: adj.map(a => ({ nombre: a.nombre, base64: a.base64 })) });
        if (o.onSent) await o.onSent(v, r);
        toast('Email enviado a ' + v.para);
      },
    });
    AD.adj = adj;
    refreshPreview();
  }
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
        '<p class="formnote" id="bulk-prog" style="grid-column:1/-1" aria-live="polite"></p>',
      onSave: async v => {
        const sel = o.items.map((it, i) => [it, i]).filter(([it, i]) => it.para && ($('[data-bulk="' + i + '"]') || {}).checked);
        if (!sel.length) throw new Error('No hay destinatarios seleccionados');
        const fails = []; let n = 0;
        for (const [it, i] of sel) {
          const st = $('#bulk-st-' + i), prog = $('#bulk-prog');
          if (prog) prog.textContent = 'Enviando ' + (++n) + ' de ' + sel.length + '…';
          const fill = t => String(t || '').replace(/\{nombre\}/g, it.nombre || '').replace(/\{cuenta\}/g, it.label).replace(/\{periodo\}/g, it.periodo || '').replace(/Hola ,/g, 'Hola,');
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
  function datosAviso(p) {
    const a = S.A.find(x => x._id === p.abono_id); if (!a) return null;
    const prev = AD.PR.filter(x => x.abono_id === a._id && x.desde < p.desde).sort((x, y) => y.desde.localeCompare(x.desde))[0];
    const pct = prev && prev.monto ? String(Math.round((p.monto / prev.monto - 1) * 1000) / 10).replace('.', ',') : '';
    return { a, prev, pct };
  }

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
      const pend = abiertas.length ? abiertas.map(f => ({ concepto: f.tipo + ' ' + (f.numero || 's/n') + (f.vencimiento ? ' · venció ' + fmt(f.vencimiento) : ''), monto: f.saldo })) : itemsDe(c.res || { items: [] });
      const moneda = abiertas[0] ? abiertas[0].moneda : (c.moneda || 'ARS');
      const total = r2(pend.reduce((a, i) => a + i.monto, 0));
      if (!pend.length) { toast('No hay saldo pendiente para recordar'); return; }
      const go = adj => openComposer({
        titulo: 'Recordatorio de pago', eyebrow: c.cliente + ' · ' + periodoTit(c.m), tipo: 'Recordatorio de pago', cliente: c.cliente, periodo: c.m, factura_id: abiertas.length === 1 ? abiertas[0].id : null,
        para: mailsDe(c.cliente), mensaje: E.textos.recordatorio({ nombre: contactoDe(c.cliente), periodo: periodoTxt(c.m) }), adjuntos: adj,
        build: v => E.recordatorioEmail({ cfg: cfgMarca(), contacto: contactoFull(c.cliente), cuenta: c.cliente, periodo: periodoTit(c.m), moneda, pendientes: pend, total, mensaje: v.mensaje, firma: firma(), asunto: v.asunto }),
        extraBtns: '<button type="button" class="btn sm ghost" data-act="aRecordatorioManual">Registrar por otro canal</button>',
      });
      if (c.res && itemsDe(c.res).length) { toast('Preparando el PDF…'); pdfResumen({ cliente: c.cliente, m: c.m, moneda: c.res.moneda, items: c.res.items, nota: c.res.nota }).then(p => go([p])).catch(() => go([])); }
      else go([]);
    },
    async factura(f) {
      const comp = (f.tipo === 'Invoice' ? 'el invoice' : 'la factura') + (f.numero ? ' N° ' + f.numero : '');
      const da = AD.DA.find(x => x.factura_id === f.id); let adjuntos = [];
      if (da) {
        toast('Bajando el PDF de Drive…');
        try { const r = await data.asistente({ accion: 'drive_descargar', archivo_id: da.id }); adjuntos = [{ nombre: /\.pdf$/i.test(r.nombre) ? r.nombre : r.nombre + '.pdf', base64: r.base64, bytes: AS.b64Bytes(r.base64) }]; }
        catch (err) { toast('No se pudo adjuntar el PDF: ' + err.message); }
      }
      openComposer({ adjuntos,
        titulo: f.tipo + ' ' + (f.numero || 's/n'), eyebrow: f.cliente, tipo: 'Factura enviada', cliente: f.cliente, periodo: f.periodo || null, factura_id: f.id,
        para: mailsDe(f.cliente), mensaje: E.textos.factura({ nombre: contactoDe(f.cliente), comprobante: comp, periodo: f.periodo ? periodoTxt(f.periodo) : '' }),
        values: { conPago: f.saldo > 0.009 },
        extraFields: [{ k: 'conPago', label: 'Incluir datos de pago', type: 'check' }],
        build: v => E.facturaEmail({ cfg: cfgMarca(), contacto: contactoFull(f.cliente), cuenta: f.cliente, periodo: f.periodo ? periodoTit(f.periodo) : '', tipo: f.tipo, numero: f.numero, fecha: f.fecha, vencimiento: f.vencimiento, monto: f.monto, moneda: f.moneda, link: f.link_pdf, conPago: v.conPago, mensaje: v.mensaje, firma: firma(), asunto: v.asunto }),
        intro2: f.link_pdf || adjuntos.length ? '' : 'Este comprobante no tiene link al PDF: el email sale sin botón.',
      });
      if (!f.link_pdf && !adjuntos.length) toast('Ojo: el comprobante no tiene link al PDF cargado');
    },
    recordatorios() {
      const porCliente = new Map();
      AD.F.filter(f => estadoFactura(f) === 'Vencida').forEach(f => { if (!porCliente.has(f.cliente)) porCliente.set(f.cliente, []); porCliente.get(f.cliente).push(f); });
      if (!porCliente.size) { toast('No hay comprobantes vencidos'); return; }
      const items = [...porCliente.entries()].sort((a, b) => cmp(a[0], b[0])).map(([cliente, fs]) => {
        const moneda = fs[0].moneda, mismas = fs.filter(f => f.moneda === moneda), m = mismas.map(f => f.periodo).filter(Boolean).sort().pop() || thisMonth();
        const ult = AD.G.filter(g => g.cliente === cliente && g.tipo === 'Recordatorio de pago').sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
        return { label: cliente, nombre: contactoDe(cliente), para: mailsDe(cliente), periodo: periodoTxt(m), m, moneda, fs: mismas, sub: multi(fs.reduce((acc, f) => add(acc, f.moneda, f.saldo), {})) + (ult ? ' · último recordatorio ' + fmt(ult.fecha) : '') };
      });
      openBulk({
        titulo: 'Recordatorios de pago', asunto: 'Recordatorio de pago · {cuenta}', mensaje: E.textos.recordatorio({ nombre: '{nombre}', periodo: '{periodo}' }), items,
        send: async (it, v) => {
          const pend = it.fs.map(f => ({ concepto: f.tipo + ' ' + (f.numero || 's/n') + (f.vencimiento ? ' · venció ' + fmt(f.vencimiento) : ''), monto: f.saldo }));
          const b = E.recordatorioEmail({ cfg: cfgMarca(), contacto: contactoFull(it.label), cuenta: it.label, periodo: periodoTit(it.m), moneda: it.moneda, pendientes: pend, total: r2(pend.reduce((a, i) => a + i.monto, 0)), mensaje: v.mensaje, firma: firma(), asunto: v.asunto });
          await data.sendEmail({ tipo: 'Recordatorio de pago', cliente_id: data.ids.cliente(it.label), periodo: it.m + '-01', factura_id: it.fs.length === 1 ? it.fs[0].id : null, para: it.para, asunto: v.asunto, html: b.html, texto: b.texto, copia: v.copia });
        },
      });
    },
    aviso(p) {
      const d = datosAviso(p); if (!d) return;
      const { a, prev, pct } = d;
      openComposer({
        titulo: 'Aviso de aumento', eyebrow: a.cliente, tipo: 'Aviso de aumento', cliente: a.cliente, periodo: p.desde,
        para: mailsDe(a.cliente), mensaje: E.textos.aviso({ nombre: contactoDe(a.cliente), servicio: servicioDe(a).toLowerCase(), desde: periodoTxt(p.desde), pct }),
        build: v => E.avisoEmail({ cfg: cfgMarca(), contacto: contactoFull(a.cliente), cuenta: a.cliente, servicio: servicioDe(a), anterior: prev ? prev.monto : null, nuevo: p.monto, moneda: p.moneda, desde: periodoTit(p.desde), mensaje: v.mensaje, firma: firma(), asunto: v.asunto }),
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
    resumenes(m) {
      const rs = AD.R.filter(r => r.periodo === m && r.estado !== 'Enviado' && itemsDe(r).length).sort((a, b) => cmp(a.cliente, b.cliente));
      if (!rs.length) { toast('No hay resúmenes guardados sin enviar en ' + monthLabel(m) + '. Guardalos primero como borrador.'); return; }
      openBulk({
        titulo: 'Resúmenes de ' + periodoTit(m), asunto: 'Resumen de cuenta · {cuenta} · ' + periodoTit(m), mensaje: E.textos.resumen({ nombre: '{nombre}', periodo: periodoTxt(m) }),
        items: rs.map(r => ({ label: r.cliente, nombre: contactoDe(r.cliente), para: mailsDe(r.cliente), sub: money(r.total, r.moneda), periodo: periodoTxt(m), r })),
        send: async (it, v) => {
          const r = it.r, items = itemsDe(r), pdf = await pdfResumen({ cliente: r.cliente, m, moneda: r.moneda, items: r.items, nota: r.nota });
          const b = E.resumenEmail({ cfg: cfgMarca(), contacto: contactoFull(r.cliente), cuenta: r.cliente, periodo: periodoTit(m), moneda: r.moneda, items, total: r2(items.reduce((a, i) => a + i.monto, 0)), nota: r.nota, mensaje: v.mensaje, firma: firma(), asunto: v.asunto });
          await data.sendEmail({ tipo: 'Resumen de cuenta', cliente_id: r.cliente_id, periodo: m + '-01', para: it.para, asunto: v.asunto, html: b.html, texto: b.texto, copia: v.copia, adjuntos: [{ nombre: pdf.nombre, base64: pdf.base64 }] });
          await data.upd('resumenes', r.id, { estado: 'Enviado', enviado_el: today() });
        },
      });
    },
    avisos() {
      const m = thisMonth();
      const ps = AD.PR.filter(p => p.desde > m && !p.aviso_enviado).map(p => ({ p, d: datosAviso(p) })).filter(x => x.d && x.d.a.estado === 'Activo').sort((x, y) => cmp(x.d.a.cliente, y.d.a.cliente));
      if (!ps.length) { toast('No hay aumentos pendientes de avisar'); return; }
      openBulk({
        titulo: 'Avisos de aumento', asunto: 'Actualización de tu abono · desde ' + periodoTit(ps[0].p.desde),
        mensaje: E.textos.aviso({ nombre: '{nombre}', servicio: 'tu abono', desde: '{periodo}', pct: '' }),
        items: ps.map(({ p, d }) => ({ label: d.a.cliente, nombre: contactoDe(d.a.cliente), para: mailsDe(d.a.cliente), sub: servicioDe(d.a) + ' · ' + money(p.monto, p.moneda) + ' desde ' + fmt(p.desde), periodo: periodoTxt(p.desde), p, d })),
        send: async (it, v) => {
          const { p, d } = it;
          const b = E.avisoEmail({ cfg: cfgMarca(), contacto: contactoFull(d.a.cliente), cuenta: d.a.cliente, servicio: servicioDe(d.a), anterior: d.prev ? d.prev.monto : null, nuevo: p.monto, moneda: p.moneda, desde: periodoTit(p.desde), mensaje: v.mensaje, firma: firma(), asunto: v.asunto });
          await data.sendEmail({ tipo: 'Aviso de aumento', cliente_id: data.ids.cliente(d.a.cliente), periodo: p.desde + '-01', para: it.para, asunto: v.asunto, html: b.html, texto: b.texto, copia: v.copia });
          await data.upd('precios_abono', p.id, { aviso_enviado: today() });
        },
      });
    },
  };

  function exportCSV() {
    const m = AD.mes; const rows = [['Nombre', 'Apellido', 'Cuenta', 'Fecha', 'Servicio', 'email', 'Total', 'File Attachments']];
    clientesDelMes(m).forEach(cl => {
      const r = AD.R.find(x => x.cliente === cl && x.periodo === m); if (!r) return;
      const c = S.C.find(x => x.nombre === cl) || {}, ca = cadm(cl);
      const [nom, ...ape] = (c.contacto || '').split(' ');
      const servicio = r.items.filter(i => i.inc).map(i => i.concepto + ' ' + money(i.monto, r.moneda)).join('\n');
      const mails = (ca.email_facturacion || c.email || '').split(/[,;\s]+/).filter(Boolean);
      (mails.length ? mails : ['']).forEach(mail => rows.push([nom || '', ape.join(' '), cl, cap(monthLabel(m)), servicio, mail, money(r.total, r.moneda), r.link_pdf || '']));
    });
    if (rows.length === 1) { toast('No hay resúmenes guardados este mes para exportar'); return; }
    const csv = rows.map(r => r.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })); a.download = 'envio-resumenes-' + m + '.csv'; document.body.appendChild(a); a.click(); a.remove();
    toast('CSV descargado: ' + (rows.length - 1) + ' envíos');
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
    let h = '<div class="head"><div>' + lock + '<h1>Facturas e invoices</h1><p>Comprobantes emitidos y lo que falta cobrar.</p></div><div class="toolbar"><button class="btn primary" data-act="aFactura">+ Comprobante</button></div></div>' +
      '<div class="toolbar"><div class="seg" role="group" aria-label="Estado">' + [['abiertas', 'Por cobrar'], ['vencidas', 'Vencidas'], ['pagadas', 'Pagadas'], ['todas', 'Todas']].map(([k, l]) => '<button data-act="aFf" data-k="estado" data-v="' + k + '" aria-pressed="' + (ff.estado === k) + '">' + l + '</button>').join('') + '</div>' +
      '<select class="in" id="ff-c" data-aff="cliente" aria-label="Cliente">' + clienteOpts(ff.cliente, 'Todos los clientes') + '</select>' +
      '<select class="in" id="ff-e" data-aff="emisor" aria-label="Emisor">' + opt('', 'Todos los emisores', ff.emisor) + EMISORES.map(e => opt(e, 'Emite ' + e, ff.emisor)).join('') + '</select>' +
      '<select class="in" id="ff-a" data-aff="anio" aria-label="Año">' + opt('', 'Todos los años', ff.anio) + anios.map(a => opt(a, a, ff.anio)).join('') + '</select></div>';
    const deud = Object.entries(deudores).sort((a, b) => cmp(a[0], b[0]));
    if (deud.length) h += '<section class="sheet"><div class="sheet-h"><h2>Quién debe</h2><span class="muted">' + deud.length + ' clientes</span></div><div class="sheet-b"><div class="tags" style="gap:8px">' + deud.map(([c, acc]) => '<button class="btn sm" data-act="aFf" data-k="cliente" data-v="' + esc(c) + '">' + esc(c) + ' · <span class="money">' + esc(multi(acc)) + '</span></button>').join('') + '</div></div></section>';
    if (!list.length) return h + '<section class="sheet">' + emptyBox(AD.F.length ? 'Ningún comprobante coincide' : 'Todavía no hay comprobantes cargados', AD.F.length ? 'Probá con otro filtro.' : 'Se cargan desde el Cierre de mes o con “+ Comprobante”.') + '</section>';
    const rows = list.map(f => '<tr><td class="mono">' + fmt(f.fecha) + '</td><td class="name">' + esc(f.cliente) + '<span class="sub">' + esc(f.concepto || (f.periodo ? monthLabel(f.periodo) : '')) + '</span></td><td>' + esc(f.tipo) + ' ' + esc(f.numero || 's/n') + (f.link_pdf ? ' <a href="' + esc(f.link_pdf) + '" target="_blank" rel="noopener">PDF</a>' : '') + '</td><td>' + esc(f.emisor || '—') + '</td><td class="r"><span class="money">' + money(f.monto, f.moneda) + '</span></td><td class="r">' + (f.saldo > 0.009 ? '<span class="money">' + money(f.saldo, f.moneda) + '</span>' : '<span class="muted">—</span>') + '</td><td>' + efPill(f) + (f.vencimiento ? '<span class="sub">vence ' + fmt(f.vencimiento) + '</span>' : '') + '</td><td class="r"><span class="toolbar" style="justify-content:flex-end">' + (f.saldo > 0.009 ? '<button class="btn sm" data-act="aCobro" data-id="' + esc(f.id) + '">Cobro</button>' : '') + '<button class="btn sm" data-act="aMailFactura" data-id="' + esc(f.id) + '">Enviar</button><button class="btn ghost sm" data-act="aFactura" data-id="' + esc(f.id) + '">Editar</button></span></td></tr>').join('');
    return h + '<section class="sheet"><div class="tbl"><table><thead><tr><th>Fecha</th><th>Cliente</th><th>Comprobante</th><th>Emite</th><th class="r">Monto</th><th class="r">Saldo</th><th>Estado</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div><div class="count num">' + list.length + ' comprobantes · total ' + esc(multi(tot)) + ' · por cobrar ' + esc(multi(sal)) + '</div></section>';
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
    AD.IMP.filter(x => (kind === 'abono' ? x.abono_id : x.proyecto_id) === id).forEach(x => { const mv = movDe(x.movimiento_id); if (!mv || (anio && !(mv.fecha || '').startsWith(anio))) return; add(acc, mv.moneda, x.monto); });
    return acc;
  }
  function finProyecto(p) {
    const fz = AD.PFZ.get(p._id) || {}, cs = AD.PF.filter(x => x.proyecto_id === p._id).sort((a, b) => a.periodo.localeCompare(b.periodo)), env = refsEnviadas();
    const moneda = fz.moneda || (cs[0] && cs[0].moneda) || cadm(p.cliente).moneda || 'ARS';
    const programado = r2(cs.reduce((a, c) => a + (c.monto || 0), 0)), facturado = r2(cs.filter(c => env.has('pf:' + c.id)).reduce((a, c) => a + (c.monto || 0), 0));
    const presupuesto = fz.presupuesto != null ? fz.presupuesto : (programado || null);
    const cost = costos('proyecto', p._id), costMismo = cost[moneda] || 0, costOtras = Object.keys(cost).filter(k => k !== moneda);
    const margen = presupuesto != null ? r2(presupuesto - costMismo) : null;
    return { fz, cs, moneda, programado, facturado, presupuesto, cost, costMismo, costOtras, margen, pct: presupuesto ? Math.round(margen / presupuesto * 100) : null, env };
  }
  function formProyectoAdm(proyectoId) {
    const p = S.P.find(x => x._id === proyectoId); if (!p) return;
    const f = finProyecto(p), facturadas = f.cs.filter(c => f.env.has('pf:' + c.id)).length;
    const vals = { presupuesto: f.fz.presupuesto ?? (f.programado || ''), moneda: f.moneda, plan_pago: f.fz.plan_pago || (f.cs.length ? 'Personalizado' : '50/50'), inicio_cobro: f.fz.inicio_cobro || (f.cs[0] ? f.cs[0].periodo : thisMonth()), regenerar: !f.cs.length, notas: f.fz.notas || '' };
    const resumenHtml = () => '<div class="field full"><span class="lbl">Cómo viene</span><dl class="kv">' +
      '<dt>Presupuesto</dt><dd class="money">' + (f.presupuesto != null ? money(f.presupuesto, f.moneda) : '—') + '</dd>' +
      '<dt>Cuotas programadas</dt><dd class="money">' + money(f.programado, f.moneda) + ' <span class="muted">(' + f.cs.length + ')</span></dd>' +
      '<dt>Ya en resúmenes enviados</dt><dd class="money">' + money(f.facturado, f.moneda) + '</dd>' +
      '<dt>Costos de proveedores</dt><dd class="money">' + esc(multi(f.cost)) + '</dd>' +
      '<dt>Margen</dt><dd><b class="money">' + (f.margen != null ? money(f.margen, f.moneda) : '—') + '</b>' + (f.pct != null ? ' <span class="muted">' + f.pct + '%</span>' : '') + '</dd></dl></div>';
    const cuotasHtml = '<div class="field full"><span class="lbl">Cuotas cargadas</span>' + (f.cs.length ? '<div class="rows" style="border:1px solid var(--line);border-radius:8px">' + f.cs.map(c => '<div class="row" style="cursor:default"><span class="d">' + fmt(c.periodo) + '</span><span class="t"><b class="money">' + money(c.monto, c.moneda) + '</b><span>' + esc(c.concepto || '') + (f.env.has('pf:' + c.id) ? ' · <b style="color:var(--ok)">facturada</b>' : '') + '</span></span>' + (f.env.has('pf:' + c.id) ? '' : '<button type="button" class="btn ghost sm" data-act="aCuotaDel" data-id="' + esc(c.id) + '" aria-label="Quitar">✕</button>') + '</div>').join('') + '</div>' : '<span class="muted">Ninguna todavía.</span>') +
      '<span class="toolbar" style="margin-top:6px"><button type="button" class="btn ghost sm" data-act="aCuotas" data-id="' + esc(p._id) + '">+ Mes suelto</button></span></div>';
    openPanel({
      title: p.proyecto, eyebrow: 'Presupuesto y cobro · ' + p.cliente, saveLabel: 'Guardar',
      intro: 'Cargá el presupuesto aprobado y cómo se paga: las cuotas se generan solas y aparecen en el resumen de cada mes.' + (facturadas ? ' <b>Hay ' + facturadas + ' cuota(s) ya facturada(s): no se regeneran; ajustá las restantes a mano.</b>' : ''),
      values: vals,
      fields: [
        { k: 'presupuesto', label: 'Presupuesto aprobado', num: 1 },
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
        el.innerHTML = cs.length ? '<span class="lbl">Cuotas del plan</span><div class="tags" style="gap:6px">' + cs.map(c => '<span class="tag">' + esc(fmt(c.periodo)) + ' · ' + esc(c.concepto) + ' · ' + esc(money(c.monto, v.mon)) + '</span>').join('') + '</div>' : (v.plan === 'Personalizado' ? '<span class="hint">Personalizado: cargá cada mes con “+ Mes suelto”.</span>' : '');
      },
      onSave: async v => {
        await data.upsert('proyecto_finanzas', { proyecto_id: p._id, presupuesto: v.presupuesto, moneda: v.moneda, plan_pago: v.plan_pago, inicio_cobro: v.inicio_cobro ? v.inicio_cobro + '-01' : null, notas: v.notas, updated_at: new Date().toISOString() }, 'proyecto_id');
        const cs = cuotasPlan(v.plan_pago, v.presupuesto, v.inicio_cobro);
        if (v.regenerar && cs.length) {
          await data.del('proyecto_facturacion', p._id, 'proyecto_id');
          await data.insMany('proyecto_facturacion', cs.map(c => ({ proyecto_id: p._id, periodo: c.periodo + '-01', concepto: c.concepto, monto: c.monto, moneda: v.moneda })));
        }
        toast('Presupuesto guardado' + (v.regenerar && cs.length ? ' · ' + cs.length + ' cuota(s) generada(s)' : ''));
      },
    });
    AD.form.onInput();
  }
  function formAds(abonoId) {
    const a = S.A.find(x => x._id === abonoId); if (!a) return;
    const af = AD.ABF.get(abonoId) || {};
    openPanel({
      title: a.cliente + ' · Ads', eyebrow: 'Pauta publicitaria',
      intro: 'El honorario de gestión es el precio del abono. Acá va la inversión en pauta (Meta, Google), que es plata del cliente: si la adelanta àndale, se suma al resumen como ítem aparte para reintegro.',
      values: { inversion: af.inversion ?? '', inversion_moneda: af.inversion_moneda || (precioEn(abonoId, thisMonth()) || {}).moneda || 'ARS', inversion_paga: af.inversion_paga || 'Cliente', plataformas: af.plataformas || '', notas: af.notas || '' },
      fields: [
        { k: 'inversion', label: 'Inversión mensual en pauta', num: 1, hint: 'Valor habitual. Si un mes cambia, editalo en el resumen de ese mes.' },
        { k: 'inversion_moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'inversion_paga', label: 'Quién la paga', type: 'select', html: v => opt('Cliente', 'El cliente, con su tarjeta', v) + opt('àndale', 'La adelanta àndale y se cobra en el resumen', v), full: 1 },
        { k: 'plataformas', label: 'Plataformas', ph: 'Meta + Google', full: 1 },
        { k: 'notas', label: 'Notas', type: 'textarea', full: 1, rows: 2 },
      ],
      onSave: async v => { await data.upsert('abono_finanzas', { abono_id: abonoId, inversion: v.inversion, inversion_moneda: v.inversion_moneda, inversion_paga: v.inversion_paga, plataformas: v.plataformas, notas: v.notas, updated_at: new Date().toISOString() }, 'abono_id'); toast('Pauta guardada'); },
    });
  }

  // Imputación de un egreso a abonos / proyectos (para el margen)
  function destinosOpts(cur) {
    const ab = S.A.filter(a => a.estado !== 'Baja' || 'a:' + a._id === cur).sort((x, y) => cmp(x.cliente, y.cliente) || cmp(x.tipo, y.tipo));
    const pr = S.P.filter(p => p.estado !== 'Cancelado' || 'p:' + p._id === cur).sort((x, y) => cmp(x.cliente, y.cliente) || cmp(x.proyecto, y.proyecto));
    return opt('', 'Elegí abono o proyecto', cur) + '<optgroup label="Abonos">' + ab.map(a => opt('a:' + a._id, a.cliente + ' · ' + a.tipo + (a.plan ? ' ' + a.plan : ''), cur)).join('') + '</optgroup>' +
      '<optgroup label="Proyectos">' + pr.map(p => opt('p:' + p._id, p.cliente + ' · ' + p.proyecto, cur)).join('') + '</optgroup>';
  }
  function impSumHtml() {
    const total = parseMonto(($('#af-monto') || {}).value) || 0, sum = r2(AD.impDraft.reduce((a, x) => a + (parseMonto(x.monto) || 0), 0));
    const f = n => String(n).replace('.', ',');
    return AD.impDraft.length ? 'Imputado ' + esc(f(sum)) + ' de ' + esc(f(total)) + (sum > total + 0.01 ? ' · <b style="color:var(--danger)">supera el monto</b>' : sum < total - 0.01 ? ' · queda ' + esc(f(r2(total - sum))) + ' sin imputar' : ' ✓') : 'Opcional. Si este egreso es un costo de un cliente (Ads, web, fotos), imputalo para ver el margen.';
  }
  const updateImpSum = () => { const el = $('#imp-sum'); if (el) el.innerHTML = impSumHtml(); };
  function renderImp() {
    const box = $('#imp-box'); if (!box) return;
    box.innerHTML = AD.impDraft.map((x, i) => '<div class="improw"><select class="in" aria-label="Destino" data-impi="' + i + '" data-impk="dest">' + destinosOpts(x.dest) + '</select><input class="in" inputmode="decimal" aria-label="Monto" placeholder="Monto" data-impi="' + i + '" data-impk="monto" value="' + esc(x.monto) + '"><button type="button" class="btn ghost sm" data-act="aImpDel" data-i="' + i + '" aria-label="Quitar">✕</button></div>').join('') +
      '<div class="toolbar"><button type="button" class="btn sm" data-act="aImpAdd">+ Agregar destino</button>' + (AD.impDraft.length > 1 ? '<button type="button" class="btn ghost sm" data-act="aImpSplit">Repartir en partes iguales</button>' : '') + (AD.impCopy ? '<button type="button" class="btn ghost sm" data-act="aImpCopy">Copiar reparto del pago anterior a ' + esc(AD.impCopy.contraparte) + '</button>' : '') + '<button type="button" class="btn ghost sm" id="imp-ia" data-act="aImpIA">✨ Sugerir reparto</button></div>' +
      '<span class="hint" id="imp-sum">' + impSumHtml() + '</span>';
  }
  async function guardarImp(movId) {
    const rows = AD.impDraft.filter(x => x.dest && parseMonto(x.monto) > 0).map(x => ({ movimiento_id: movId, abono_id: x.dest.startsWith('a:') ? x.dest.slice(2) : null, proyecto_id: x.dest.startsWith('p:') ? x.dest.slice(2) : null, monto: r2(parseMonto(x.monto)) }));
    const prev = AD.IMP.filter(x => x.movimiento_id === movId);
    if (!prev.length && !rows.length) return;
    await data.del('imputaciones', movId, 'movimiento_id');
    if (rows.length) await data.insMany('imputaciones', rows);
  }

  /* ---------- Vista: Rentabilidad ---------- */
  function vRent() {
    const rt = AD.rt, y = rt.anio, m = thisMonth();
    const anios = [...new Set([...AD.MV.map(v => (v.fecha || '').slice(0, 4)), y])].filter(Boolean).sort().reverse();
    const provAnio = AD.MV.filter(v => (v.fecha || '').startsWith(y) && v.cuenta === 'Proveedores' && v.egreso > 0);
    const imputadoDe = id => r2(AD.IMP.filter(x => x.movimiento_id === id).reduce((a, x) => a + x.monto, 0));
    const sinImp = provAnio.map(v => ({ v, falta: r2(v.egreso - imputadoDe(v.id)) })).filter(x => x.falta > 0.009).sort((a, b) => (b.v.fecha || '').localeCompare(a.v.fecha || ''));
    const accSin = {}; sinImp.forEach(x => add(accSin, x.v.moneda, x.falta));
    const accImp = {}; AD.IMP.forEach(x => { const mv = movDe(x.movimiento_id); if (mv && (mv.fecha || '').startsWith(y)) add(accImp, mv.moneda, x.monto); });
    let h = '<div class="head"><div>' + lock + '<h1>Rentabilidad</h1><p>Lo que deja cada proyecto y abono después de pagar proveedores. No descuenta sueldos ni gastos fijos.</p></div>' +
      '<div class="toolbar"><div class="seg" role="group" aria-label="Ver">' + [['proyectos', 'Proyectos'], ['abonos', 'Abonos']].map(([k, l]) => '<button data-act="aRtVer" data-v="' + k + '" aria-pressed="' + (rt.ver === k) + '">' + l + '</button>').join('') + '</div>' +
      '<select class="in" aria-label="Año" data-art="anio">' + anios.map(a => opt(a, a, y)).join('') + '</select></div></div>';
    h += '<section class="kpis"><div class="kpi"><span class="eyebrow">Costos imputados ' + esc(y) + '</span><b style="font-size:20px" class="money">' + esc(multi(accImp)) + '</b><span>a abonos y proyectos</span></div>' +
      '<div class="kpi ' + (sinImp.length ? 'warn' : '') + '"><span class="eyebrow">Pagos a proveedores sin imputar</span><b style="font-size:20px" class="money">' + esc(multi(accSin)) + '</b><span>' + sinImp.length + ' movimientos en ' + esc(y) + '</span></div></section>';
    if (rt.ver === 'proyectos') {
      const ps = S.P.filter(p => p.estado !== 'Cancelado' && (AD.PFZ.has(p._id) || AD.PF.some(c => c.proyecto_id === p._id) || AD.IMP.some(x => x.proyecto_id === p._id))).map(p => ({ p, f: finProyecto(p) })).sort((a, b) => cmp(a.p.cliente, b.p.cliente));
      const sinPres = S.P.filter(p => isOpenP(p) && !AD.PFZ.has(p._id) && !AD.PF.some(c => c.proyecto_id === p._id)).length;
      h += '<section class="sheet"><div class="sheet-h"><h2>Proyectos</h2>' + (sinPres ? '<span class="muted">' + sinPres + ' abiertos sin presupuesto cargado</span>' : '') + '</div>' + (ps.length ? '<div class="tbl"><table><thead><tr><th>Proyecto</th><th>Estado</th><th class="r">Presupuesto</th><th class="r">Facturado</th><th class="r">Falta facturar</th><th class="r">Costos</th><th class="r">Margen</th><th></th></tr></thead><tbody>' +
        ps.map(({ p, f }) => '<tr><td class="name">' + esc(p.proyecto) + '<span class="sub">' + esc(p.cliente) + (f.fz.plan_pago ? ' · ' + esc(f.fz.plan_pago) : '') + '</span></td><td>' + pill(p.estado, ctx.stVar ? ctx.stVar(p.estado) : '--muted') + '</td>' +
          '<td class="r money">' + (f.presupuesto != null ? money(f.presupuesto, f.moneda) : '—') + '</td><td class="r money">' + money(f.facturado, f.moneda) + '</td><td class="r money">' + (f.presupuesto != null ? money(r2(f.presupuesto - f.facturado), f.moneda) : '—') + '</td>' +
          '<td class="r money">' + esc(multi(f.cost) || '—') + '</td><td class="r"><b class="money">' + (f.margen != null ? money(f.margen, f.moneda) : '—') + '</b>' + (f.pct != null ? '<span class="sub">' + f.pct + '%</span>' : '') + '</td>' +
          '<td class="r"><button class="btn ghost sm" data-act="aProyAdm" data-id="' + esc(p._id) + '">Editar</button></td></tr>').join('') + '</tbody></table></div>' : emptyBox('Todavía no hay proyectos con presupuesto', 'Abrí un proyecto → “Presupuesto y cobro” y cargá el monto aprobado y la forma de pago.')) + '</section>';
    } else {
      const meses = []; for (let i = 1; i <= 12; i++) { const mm = y + '-' + String(i).padStart(2, '0'); if (mm <= m) meses.push(mm); }
      const rows = S.A.map(a => {
        const ing = {}; meses.forEach(mm => { if (abonoEnMes(a, mm)) { const pr = precioEn(a._id, mm); if (pr) add(ing, pr.moneda, pr.monto); } });
        const cost = costos('abono', a._id, y);
        if (!Object.keys(ing).length && !Object.keys(cost).length) return null;
        const mon = Object.keys(ing)[0] || Object.keys(cost)[0], same = Object.keys(cost).every(k => k === mon);
        const margen = same ? r2((ing[mon] || 0) - (cost[mon] || 0)) : null;
        return { a, ing, cost, mon, margen, pct: margen != null && ing[mon] ? Math.round(margen / ing[mon] * 100) : null };
      }).filter(Boolean).sort((x, z) => cmp(x.a.cliente, z.a.cliente) || cmp(x.a.tipo, z.a.tipo));
      h += '<section class="sheet"><div class="sheet-h"><h2>Abonos · ' + esc(y) + '</h2><span class="muted">ingresos según precio vigente de cada mes; la pauta de Ads no cuenta como ingreso</span></div>' + (rows.length ? '<div class="tbl"><table><thead><tr><th>Abono</th><th class="r">Ingresos</th><th class="r">Costos</th><th class="r">Margen</th><th></th></tr></thead><tbody>' +
        rows.map(r => '<tr><td class="name">' + esc(r.a.cliente) + '<span class="sub">' + esc(r.a.tipo + (r.a.plan ? ' · ' + r.a.plan : '') + (r.a.estado !== 'Activo' ? ' · ' + r.a.estado : '')) + '</span></td><td class="r money">' + esc(multi(r.ing) || '—') + '</td><td class="r money">' + esc(multi(r.cost) || '—') + '</td><td class="r"><b class="money">' + (r.margen != null ? money(r.margen, r.mon) : '—') + '</b>' + (r.pct != null ? '<span class="sub">' + r.pct + '%</span>' : '') + '</td><td class="r">' + (r.a.tipo === 'Ads' ? '<button class="btn ghost sm" data-act="aAds" data-abono="' + esc(r.a._id) + '">Pauta</button>' : '') + '</td></tr>').join('') + '</tbody></table></div>' : emptyBox('Sin datos para ' + y, 'Cargá precios en los abonos.')) + '</section>';
    }
    h += '<section class="sheet"><div class="sheet-h"><h2>Pagos a proveedores sin imputar</h2><span class="toolbar"><span class="muted">' + sinImp.length + '</span>' + (sinImp.length ? '<button class="btn sm" data-act="aImpIAvarios">✨ Repartir con IA</button>' : '') + '</span></div>' + (sinImp.length ? '<div class="rows">' + sinImp.slice(0, 30).map(({ v, falta }) => '<div class="row" style="cursor:default"><span class="d">' + fmt(v.fecha) + '</span><span class="t"><b>' + esc(v.contraparte || v.subcuenta) + ' · <span class="money">' + money(falta, v.moneda) + '</span></b><span>' + esc(v.detalle || '') + '</span></span><button class="btn sm" data-act="aMov" data-id="' + esc(v.id) + '">Imputar</button></div>').join('') + '</div>' : emptyBox('Todo imputado', 'Los pagos a proveedores del año ya están asignados a abonos o proyectos.')) + '</section>';
    return h;
  }
  const isOpenP = p => !['Entregado', 'Cancelado'].includes(p.estado);

  /* ---------- Vista: Precios y aumentos ---------- */
  function vPrecios() {
    const pp = AD.pp, m = thisMonth();
    const ab = S.A.filter(a => a.estado === 'Activo').sort((a, b) => cmp(a.cliente, b.cliente) || cmp(a.tipo, b.tipo));
    const pct = parseMonto(pp.pct);
    const sel = ab.filter(a => pp.sel.has(a._id));
    let h = '<div class="head"><div>' + lock + '<h1>Precios y aumentos</h1><p>Precio vigente de cada abono, aumentos e historial.</p></div>' +
      (AD.PR.some(p => p.desde > m && !p.aviso_enviado) ? '<div class="toolbar"><button class="btn primary" data-act="aAvisos">Avisar aumentos por email</button></div>' : '') + '</div>';
    h += '<section class="sheet"><div class="sheet-h"><h2>Aplicar aumento</h2><span class="muted">' + sel.length + ' abonos seleccionados</span></div><div class="sheet-b"><div class="toolbar">' +
      '<div class="field"><label for="pp-pct">Aumento %</label><input class="in" id="pp-pct" data-app="pct" inputmode="decimal" value="' + esc(pp.pct) + '" placeholder="4" style="width:90px"></div>' +
      '<div class="field"><label for="pp-desde">Rige desde</label><input class="in" id="pp-desde" type="month" data-app="desde" value="' + esc(pp.desde) + '"></div>' +
      '<div class="field" style="flex:1;min-width:200px"><label for="pp-mot">Motivo</label><input class="in" id="pp-mot" data-app="motivo" value="' + esc(pp.motivo) + '" placeholder="Aumento bimestral"></div>' +
      '<div class="field"><span class="lbl">&nbsp;</span><span class="toolbar"><button class="btn sm" data-act="aPpAll">Seleccionar con precio</button><button class="btn primary" data-act="aPpApply"' + (sel.length && pct ? '' : ' disabled') + '>Aplicar a ' + sel.length + '</button></span></div></div></div></section>';
    const rows = ab.map(a => {
      const cur = precioEn(a._id, m), next = precioEn(a._id, '9999-12'), hist = historial(a._id);
      const futuro = next && next.desde > m ? next : null;
      const nuevo = pct && cur && pp.sel.has(a._id) ? r2(cur.monto * (1 + pct / 100)) : null;
      const aviso = futuro ? (futuro.aviso_enviado ? '<span class="muted">Avisado ' + fmt(futuro.aviso_enviado) + '</span>' : '<button class="btn sm" data-act="aAviso" data-id="' + esc(futuro.id) + '">Avisar por email</button>') : '';
      return '<tr><td><input type="checkbox" aria-label="Seleccionar" data-ppsel="' + esc(a._id) + '"' + (pp.sel.has(a._id) ? ' checked' : '') + (cur ? '' : ' disabled') + '></td><td class="name"><button class="btn link" data-act="ficha" data-cliente="' + esc(a.cliente) + '">' + esc(a.cliente) + '</button><span class="sub">' + esc(a.tipo + (a.plan ? ' · ' + a.plan : '')) + '</span></td>' +
        '<td class="r">' + (cur ? '<span class="money">' + money(cur.monto, cur.moneda) + '</span><span class="sub">desde ' + fmt(cur.desde) + '</span>' : '<span class="days late">Sin precio</span>') + '</td>' +
        '<td class="r">' + (futuro ? '<span class="money">' + money(futuro.monto, futuro.moneda) + '</span><span class="sub">desde ' + fmt(futuro.desde) + (futuro.motivo ? ' · ' + esc(futuro.motivo) : '') + '</span>' : nuevo ? '<span class="money" style="opacity:.7">' + money(nuevo, cur.moneda) + '</span><span class="sub">vista previa</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (a.tipo === 'Ads' ? (() => { const af = AD.ABF.get(a._id); return '<button class="btn ghost sm" data-act="aAds" data-abono="' + esc(a._id) + '">' + (af && af.inversion ? esc((af.inversion_paga === 'àndale' ? 'Adelanta àndale · ' : 'Paga el cliente · ') + money(af.inversion, af.inversion_moneda)) : 'Cargar pauta') + '</button>'; })() : '<span class="muted">—</span>') + '</td>' +
        '<td>' + aviso + '</td><td class="muted">' + hist.length + ' precios</td><td class="r"><button class="btn ghost sm" data-act="aPrecio" data-abono="' + esc(a._id) + '">' + (cur ? 'Cambiar precio' : 'Cargar precio') + '</button></td></tr>';
    }).join('');
    return h + '<section class="sheet"><div class="tbl"><table><thead><tr><th></th><th>Abono</th><th class="r">Precio vigente</th><th class="r">Próximo</th><th>Pauta</th><th>Aviso</th><th>Historial</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div></section>';
  }

  /* ---------- Sección en la ficha del cliente ---------- */
  function emailsDe(cliente) {
    const cid = data.ids.cliente(cliente), es = AD.EM.filter(x => x.cliente_id === cid).slice(0, 10);
    if (!es.length) return '';
    return '<div class="sheet-b" style="border-top:1px solid var(--line);display:grid;gap:6px"><b>Emails enviados</b><div class="rows">' + es.map(x => '<div class="row" style="cursor:default"><span class="d">' + fmt(String(x.created_at).slice(0, 10)) + '</span><span class="t"><b>' + esc(x.asunto) + '</b><span>' + esc(x.tipo + ' · ' + (x.para || []).join(', ') + (x.adjuntos && x.adjuntos.length ? ' · 📎 ' + x.adjuntos.join(', ') : '')) + (x.error ? ' · ' + esc(x.error) : '') + '</span></span>' + pill(x.estado, x.estado === 'Enviado' ? '--s-entregado' : '--s-cancelado') + '</div>').join('') + '</div></div>';
  }
  function fichaSection(c) {
    const ca = cadm(c.nombre);
    const facs = AD.F.filter(f => f.cliente === c.nombre).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
    const sal = {}; facs.forEach(f => add(sal, f.moneda, f.saldo));
    const proys = S.P.filter(p => p.cliente === c.nombre && !['Cancelado'].includes(p.estado));
    const cuotas = AD.PF.filter(x => proys.some(p => p._id === x.proyecto_id));
    return '<section class="sheet"><div class="sheet-h"><h2>Administración</h2><span class="toolbar">' + lock + '<button class="btn sm" data-act="aClienteAdm" data-cliente="' + esc(c.nombre) + '">Editar</button></span></div><div class="sheet-b"><dl class="kv">' +
      '<dt>Razón social</dt><dd>' + (ca.razon_social ? esc(ca.razon_social) : '<span class="muted">—</span>') + '</dd>' +
      '<dt>CUIT</dt><dd>' + (ca.cuit ? esc(ca.cuit) + (ca.condicion_iva ? ' · ' + esc(ca.condicion_iva) : '') : '<span class="muted">—</span>') + '</dd>' +
      '<dt>Comprobante</dt><dd>' + esc(ca.comprobante_default || 'Factura ARCA') + (ca.emisor_default ? ' · emite ' + esc(ca.emisor_default) : '') + ' · ' + esc(ca.moneda || 'ARS') + '</dd>' +
      '<dt>Email de facturación</dt><dd>' + (ca.email_facturacion ? esc(ca.email_facturacion) : '<span class="muted">—</span>') + '</dd>' +
      '<dt>Carpeta</dt><dd>' + (ca.carpeta_admin ? '<a href="' + esc(ca.carpeta_admin) + '" target="_blank" rel="noopener">Carpeta de administración</a>' : '<span class="muted">—</span>') + '</dd>' +
      '<dt>Saldo</dt><dd><span class="money">' + esc(multi(sal)) + '</span></dd></dl></div>' +
      (facs.length ? '<div class="rows" style="border-top:1px solid var(--line)">' + facs.slice(0, 8).map(f => '<button class="row" data-act="aFactura" data-id="' + esc(f.id) + '"><span class="d">' + fmt(f.fecha) + '</span><span class="t"><b>' + esc(f.tipo + ' ' + (f.numero || 's/n')) + '</b><span class="money">' + money(f.monto, f.moneda) + '</span></span>' + efPill(f) + '</button>').join('') + '</div>' : '') +
      '<div class="sheet-b" style="border-top:1px solid var(--line);display:grid;gap:8px"><b>Proyectos: presupuesto y cobro</b>' +
      (proys.length ? proys.map(p => { const f = finProyecto(p); return '<div class="toolbar" style="justify-content:space-between"><span>' + esc(p.proyecto) + (f.presupuesto != null ? ' · <span class="money">' + money(f.presupuesto, f.moneda) + '</span>' + (f.fz.plan_pago ? ' (' + esc(f.fz.plan_pago) + ')' : '') + ' · facturado ' + money(f.facturado, f.moneda) : ' <span class="muted">· sin presupuesto</span>') + '</span><button class="btn ghost sm" data-act="aProyAdm" data-id="' + esc(p._id) + '">Presupuesto</button></div>'; }).join('') : '<span class="muted">Sin proyectos.</span>') +
      '<span class="toolbar"><button class="btn sm" data-act="aCuentaDe" data-cliente="' + esc(c.nombre) + '">Cuenta de ' + esc(monthLabel(thisMonth())) + '</button><button class="btn sm" data-act="aMailLibre" data-cliente="' + esc(c.nombre) + '">Enviar email</button></span></div>' +
      emailsDe(c.nombre) + '</section>';
  }

  /* ---------- Formularios (panel lateral) ---------- */
  function field(f, v) {
    const id = 'af-' + f.k;
    if (f.type === 'check') return '<label class="chk full"><input type="checkbox" id="' + id + '"' + (v ? ' checked' : '') + '> ' + esc(f.label) + '</label>';
    let ctl;
    if (f.type === 'select') ctl = '<select id="' + id + '">' + (f.html ? f.html(v || '') : optsFrom(f.opts, v || '', f.blank)) + '</select>';
    else if (f.type === 'textarea') ctl = '<textarea id="' + id + '" rows="' + (f.rows || 3) + '">' + esc(v || '') + '</textarea>';
    else ctl = '<input id="' + id + '" type="' + (f.type || 'text') + '" value="' + esc(v ?? '') + '"' + (f.ph ? ' placeholder="' + esc(f.ph) + '"' : '') + (f.num ? ' inputmode="decimal"' : '') + '>';
    return '<div class="field' + (f.full ? ' full' : '') + '"><label for="' + id + '">' + esc(f.label) + (f.req ? ' <b>*</b>' : '') + '</label>' + ctl + (f.hint ? '<span class="hint">' + esc(f.hint) + '</span>' : '') + '<span class="err" id="ae-' + f.k + '" hidden></span></div>';
  }
  function openPanel(cfg) {
    AD.form = cfg;
    const p = $('#panel');
    p.innerHTML = '<form id="aform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(cfg.eyebrow || 'Administración') + '</span><h2 id="panel-title">' + esc(cfg.title) + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b">' + (cfg.intro ? '<p class="formnote">' + cfg.intro + '</p>' : '') + (cfg.fields || []).map(f => field(f, cfg.values[f.k])).join('') + (cfg.extra || '') + '</div>' +
      '<div class="panel-f"><span id="adel">' + (cfg.onDelete ? '<button type="button" class="btn ghost danger" data-act="aDel">Eliminar</button>' : '') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button>' + (cfg.onSave ? '<button type="submit" class="btn primary" id="asave">' + esc(cfg.saveLabel || 'Guardar') + '</button>' : '') + '</span></div></form>';
    p.hidden = false; $('#scrim').hidden = false;
  }
  function readPanel() {
    const out = {}; let bad = false;
    for (const f of AD.form.fields || []) {
      const el = $('#af-' + f.k); if (!el) continue;
      let v = f.type === 'check' ? el.checked : el.value.trim();
      if (f.num) { v = v === '' ? null : parseMonto(v); if (v === null && f.req) bad = true; }
      if (f.month && v && !/^\d{4}-\d{2}$/.test(v)) { const e = $('#ae-' + f.k); e.textContent = 'Formato AAAA-MM'; e.hidden = false; bad = true; }
      if (f.req && (v === '' || v === null)) { const e = $('#ae-' + f.k); e.textContent = 'Completá este campo'; e.hidden = false; bad = true; }
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
    const f = id ? AD.F.find(x => x.id === id) : null;
    const driveLibres = AD.DA.filter(d => !d.factura_id && d.estado !== 'Ignorado');
    const iaBox = '<div class="field full"><span class="lbl">Completar desde el PDF</span><div class="toolbar">' +
      '<label class="btn sm" style="cursor:pointer"><span id="ff-ia-lbl">✨ Leer PDF</span><input type="file" id="ff-ia" accept="application/pdf,image/*" hidden></label>' +
      (driveLibres.length ? '<select class="in" id="ff-drive" aria-label="Archivo de Drive">' + opt('', 'O elegí uno de Drive (' + driveLibres.length + ')', '') + driveLibres.slice(0, 200).map(d => opt(d.id, d.nombre + (d.datos && d.datos.total != null ? ' · ' + money(d.datos.total, d.datos.moneda) : ''), '')).join('') + '</select>' : '') +
      '</div><span class="hint">La IA lee el comprobante y completa los campos. Revisalos antes de guardar.</span></div>';
    const cliente = f ? f.cliente : (preset && preset.cliente) || (AD.rd && AD.rd.cliente) || '';
    const ca = cadm(cliente);
    const base = f || Object.assign({ tipo: ca.comprobante_default || 'Factura ARCA', emisor: ca.emisor_default || '', fecha: today(), moneda: AD.rd ? AD.rd.moneda : (ca.moneda || 'ARS'), monto: AD.rd ? r2(totalItems(AD.rd.items)) : '', periodo: AD.rd ? AD.rd.m : thisMonth(), concepto: AD.rd ? 'Servicios ' + monthLabel(AD.rd.m) : '' }, preset || {});
    if (!f && !base.vencimiento) { const d = new Date(); d.setDate(d.getDate() + 10); base.vencimiento = d.toISOString().slice(0, 10); }
    openPanel({
      title: f ? (f.tipo + ' ' + (f.numero || 's/n')) : 'Nuevo comprobante', eyebrow: f ? 'Editar comprobante' : 'Alta',
      values: Object.assign({}, base, { cliente }),
      fields: [
        { k: 'cliente', label: 'Cliente', type: 'select', html: v => clienteOpts(v), req: 1, full: 1 },
        { k: 'tipo', label: 'Tipo', type: 'select', opts: TIPOS_COMP },
        { k: 'emisor', label: 'Emite', type: 'select', opts: EMISORES, blank: '—', hint: 'Monotributo de quién sale la factura' },
        { k: 'numero', label: 'Número', ph: '00002-00000210' },
        { k: 'periodo', label: 'Mes que factura', type: 'month', month: 1 },
        { k: 'fecha', label: 'Fecha', type: 'date', req: 1 },
        { k: 'vencimiento', label: 'Vencimiento', type: 'date' },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'monto', label: 'Monto', num: 1, req: 1 },
        { k: 'concepto', label: 'Concepto', full: 1 },
        { k: 'link_pdf', label: 'Link al PDF (carpeta de administración)', type: 'url', full: 1, ph: 'https://drive.google.com/...' },
        { k: 'notas', label: 'Notas', type: 'textarea', full: 1, rows: 2 },
      ],
      extra: (f ? '' : iaBox) + (f && f.cobrado > 0 ? '<p class="formnote">Cobrado: ' + money(f.cobrado, f.moneda) + '. Los cobros están en Caja.</p>' : '') + (opts.archivo ? '<p class="formnote">Desde Drive: <a href="' + esc(opts.archivo.link) + '" target="_blank" rel="noopener">' + esc(opts.archivo.nombre) + '</a>. Al guardar queda vinculado.</p>' : ''),
      onSave: async v => {
        const row = { cliente_id: data.ids.cliente(v.cliente), tipo: v.tipo, emisor: v.emisor || '', numero: v.numero, periodo: v.periodo ? v.periodo + '-01' : null, fecha: v.fecha, vencimiento: v.vencimiento || null, moneda: v.moneda, monto: v.monto, concepto: v.concepto, link_pdf: v.link_pdf, notas: v.notas };
        const archivo = opts.archivo || (AD.form && AD.form.archivo) || null;
        let fid = f && f.id;
        if (f) await data.upd('facturas', f.id, row); else fid = (await data.ins('facturas', row)).id;
        if (opts.onSaved) await opts.onSaved(fid, v);
        else if (archivo && !f) { await data.upd('drive_archivos', archivo.id, { factura_id: fid }); await AS.aprender(archivo, v); }
        else if (!f && AD.form && AD.form.archivoDatos) await AS.aprender({ datos: AD.form.archivoDatos }, v);
        toast(f ? 'Comprobante actualizado' : 'Comprobante cargado');
      },
      onDelete: f ? async () => { await data.upd('facturas', f.id, { anulada: true }); toast('Comprobante anulado'); } : null,
    });
  }
  const cajasDe = moneda => AD.CJ.filter(c => c.activa && (!moneda || c.moneda === moneda));
  const subcuentaSugerida = cliente => { const a = S.A.find(x => x.cliente === cliente && x.estado === 'Activo'); return a && a.tipo === 'Ads' ? 'S.Redes Ads' : 'S.Redes sociales'; };
  const subcuentas = cuenta => [...new Set(AD.PC.filter(p => p.cuenta === cuenta).map(p => p.subcuenta).filter(Boolean))].sort(cmp);
  function formCobro(id) {
    const f = AD.F.find(x => x.id === id); if (!f) return;
    const cuenta = f.moneda === 'USD' ? 'Ventas en USD' : f.moneda === 'EUR' ? 'Venta en Euros' : 'Ventas en Pesos';
    const cjs = cajasDe(f.moneda);
    openPanel({
      title: 'Cobro de ' + f.cliente, eyebrow: f.tipo + ' ' + (f.numero || 's/n'), saveLabel: 'Registrar cobro',
      intro: 'Saldo pendiente: <b class="money">' + money(f.saldo, f.moneda) + '</b>. El cobro queda como ingreso en Caja.',
      values: { fecha: today(), monto: f.saldo, caja: cjs[0] ? cjs[0].id : '', subcuenta: subcuentaSugerida(f.cliente), detalle: (f.periodo ? 'Mes de ' + monthLabel(f.periodo) : f.concepto) },
      fields: [
        { k: 'fecha', label: 'Fecha de cobro', type: 'date', req: 1 },
        { k: 'monto', label: 'Monto cobrado (' + f.moneda + ')', num: 1, req: 1 },
        { k: 'caja', label: 'Entró en', type: 'select', html: v => cjs.map(c => opt(c.id, c.nombre, v)).join('') || opt('', 'Cargá cajas en ' + f.moneda, v), req: 1 },
        { k: 'subcuenta', label: 'Subcuenta', type: 'select', opts: subcuentas(cuenta).length ? subcuentas(cuenta) : ['S.Redes sociales', 'S.Redes Ads', 'S.Web', 'S.Branding', 'S.Diseño Grafico', 'S.Videos'] },
        { k: 'detalle', label: 'Detalle', full: 1 },
      ],
      onSave: async v => {
        await data.ins('movimientos', { fecha: v.fecha, cuenta, subcuenta: v.subcuenta, contraparte: f.cliente, cliente_id: f.cliente_id, detalle: v.detalle, ingreso: v.monto, egreso: 0, moneda: f.moneda, caja_id: v.caja || null, factura_id: f.id });
        toast('Cobro registrado');
      },
    });
  }
  function formGestion(tipo, texto) {
    const rd = AD.rd;
    openPanel({
      title: tipo || 'Registrar gestión', eyebrow: rd.cliente + ' · ' + monthLabel(rd.m), saveLabel: 'Registrar',
      intro: texto ? 'Copiá el texto, mandalo por el canal que corresponda y registralo.' : '',
      values: { tipo: tipo || 'Factura enviada', fecha: today(), canal: 'WhatsApp', nota: '', texto: texto || '' },
      fields: [
        ...(texto ? [{ k: 'texto', label: 'Mensaje', type: 'textarea', full: 1, rows: 6 }] : []),
        { k: 'tipo', label: 'Tipo', type: 'select', opts: ['Resumen de cuenta', 'Factura enviada', 'Recordatorio de pago', 'Aviso de aumento', 'Otro'] },
        { k: 'fecha', label: 'Fecha', type: 'date', req: 1 },
        { k: 'canal', label: 'Canal', type: 'select', opts: S.L.canales },
        { k: 'nota', label: 'Nota', full: 1 },
      ],
      extra: texto ? '<div class="toolbar" style="grid-column:1/-1"><button type="button" class="btn sm" data-act="aCopyPanel">Copiar mensaje</button></div>' : '',
      onSave: async v => { await data.ins('gestiones', { cliente_id: data.ids.cliente(rd.cliente), periodo: rd.m + '-01', tipo: v.tipo, fecha: v.fecha, canal: v.canal, nota: v.nota, persona_id: data.ids.persona(S.me.alias) }); toast('Gestión registrada'); },
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
        { k: 'comprobante_default', label: 'Comprobante habitual', type: 'select', opts: TIPOS_COMP },
        { k: 'emisor_default', label: 'Emite habitualmente', type: 'select', opts: EMISORES, blank: '—' },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'email_facturacion', label: 'Email(s) de facturación', hint: 'Separados por coma. Se usan en el CSV de envío.' },
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
        { k: 'desde', label: 'Rige desde', type: 'month', month: 1, req: 1 },
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
      title: p.proyecto, eyebrow: 'Meses de facturación · ' + p.cliente, saveLabel: 'Agregar mes',
      intro: 'Cada mes cargado aparece como ítem en el resumen de cuenta de ese mes. Para anticipo y saldo, cargá dos.',
      values: { periodo: thisMonth(), concepto: '', monto: '', moneda: cadm(p.cliente).moneda || 'ARS' },
      fields: [
        { k: 'periodo', label: 'Mes', type: 'month', month: 1, req: 1 },
        { k: 'monto', label: 'Monto', num: 1, req: 1 },
        { k: 'concepto', label: 'Concepto', ph: 'Anticipo 50%', full: 1 },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
      ],
      extra: cs.length ? '<div class="field full"><span class="lbl">Cargados</span><div class="rows" style="border:1px solid var(--line);border-radius:8px">' + cs.map(c => '<div class="row" style="cursor:default"><span class="d">' + fmt(c.periodo) + '</span><span class="t"><b class="money">' + money(c.monto, c.moneda) + '</b><span>' + esc(c.concepto || '') + '</span></span><button type="button" class="btn ghost sm" data-act="aCuotaDel" data-id="' + esc(c.id) + '" aria-label="Quitar">✕</button></div>').join('') + '</div></div>' : '',
      onSave: async v => { await data.ins('proyecto_facturacion', { proyecto_id: proyectoId, periodo: v.periodo + '-01', concepto: v.concepto, monto: v.monto, moneda: v.moneda }); toast('Mes de facturación agregado'); setTimeout(() => formCuotas(proyectoId), 400); },
    });
  }
  function avisoTexto(precioId) {
    const p = AD.PR.find(x => x.id === precioId); const a = p && S.A.find(x => x._id === p.abono_id); if (!a) return '';
    const prev = AD.PR.filter(x => x.abono_id === a._id && x.desde < p.desde).sort((x, y) => y.desde.localeCompare(x.desde))[0];
    const pct = prev && prev.monto ? Math.round((p.monto / prev.monto - 1) * 1000) / 10 : null;
    const nombre = contactoDe(a.cliente);
    return 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás? Te escribimos de àndale para contarte que a partir de ' + monthLabel(p.desde) + ' el abono de ' + (a.tipo === 'Redes' ? 'redes sociales' + (a.plan ? ' (plan ' + a.plan + ')' : '') : a.tipo) + ' pasa a ' + money(p.monto, p.moneda) + ' por mes' + (pct ? ', un ajuste del ' + String(pct).replace('.', ',') + '%' : '') + '. Cualquier consulta, estamos para conversarlo. ¡Gracias por seguir trabajando con nosotros!';
  }

  /* ---------- Vista: Caja ---------- */
  AD.cj = { mes: thisMonth(), q: '', cuenta: '', moneda: '' };
  function vCaja() {
    const cj = AD.cj, m = cj.mes, y = m.slice(0, 4), q = norm(cj.q);
    const saldo = {}; AD.MV.forEach(x => add(saldo, x.moneda, x.ingreso - x.egreso));
    const delMes = AD.MV.filter(x => (x.fecha || '').startsWith(m));
    const ingM = {}, egM = {}; delMes.forEach(x => { if (x.cuenta !== 'Saldo Inicial') { add(ingM, x.moneda, x.ingreso); add(egM, x.moneda, x.egreso); } });
    const deuda = AD.MV.filter(x => x.reintegro_a && !x.reintegrado && x.egreso > 0);
    const porSocio = {}; deuda.forEach(x => { porSocio[x.reintegro_a] = porSocio[x.reintegro_a] || {}; add(porSocio[x.reintegro_a], x.moneda, x.egreso); });
    let h = '<div class="head"><div>' + lock + '<h1>Caja</h1><p>Ingresos y egresos con el plan de cuentas de siempre. Los cobros de facturas entran solos.</p></div>' +
      '<div class="toolbar"><div class="cal-h"><h2 style="min-width:170px">' + esc(cap(monthLabel(m))) + '</h2><button class="btn sm" data-act="aCjMes" data-d="-1" aria-label="Mes anterior">←</button><button class="btn sm" data-act="aCjMes" data-d="0">Este mes</button><button class="btn sm" data-act="aCjMes" data-d="1" aria-label="Mes siguiente">→</button></div><button class="btn primary" data-act="aMov">+ Movimiento</button></div></div>';
    h += '<section class="kpis">' +
      '<div class="kpi"><span class="eyebrow">Saldo en pesos</span><b style="font-size:24px;color:var(--money)">' + money(saldo.ARS || 0, 'ARS') + '</b><span>hoy, todas las cajas</span></div>' +
      '<div class="kpi"><span class="eyebrow">Saldo en dólares</span><b style="font-size:24px;color:var(--money)">' + money(saldo.USD || 0, 'USD') + '</b><span>' + (saldo.EUR ? money(saldo.EUR, 'EUR') + ' en euros' : 'hoy, todas las cajas') + '</span></div>' +
      '<div class="kpi"><span class="eyebrow">Ingresos del mes</span><b style="font-size:20px">' + esc(multi(ingM)) + '</b><span>' + delMes.filter(x => x.ingreso > 0).length + ' movimientos</span></div>' +
      '<div class="kpi"><span class="eyebrow">Egresos del mes</span><b style="font-size:20px">' + esc(multi(egM)) + '</b><span>' + delMes.filter(x => x.egreso > 0).length + ' movimientos</span></div></section>';
    if (deuda.length) h += '<section class="sheet"><div class="sheet-h"><h2>Se les debe a los socios</h2><span class="muted">' + Object.entries(porSocio).map(([s, acc]) => esc(s) + ': <b class="money">' + esc(multi(acc)) + '</b>').join(' · ') + '</span></div><div class="rows">' +
      deuda.sort((a, b) => b.fecha.localeCompare(a.fecha)).map(x => '<div class="row" style="cursor:default"><span class="d">' + fmt(x.fecha) + '</span><span class="t"><b>' + esc(x.contraparte || x.subcuenta) + ' · <span class="money">' + money(x.egreso, x.moneda) + '</span></b><span>Lo pagó ' + esc(x.reintegro_a) + (x.detalle ? ' · ' + esc(x.detalle) : '') + '</span></span><button class="btn sm" data-act="aReint" data-id="' + esc(x.id) + '">Marcar devuelto</button></div>').join('') + '</div></section>';
    // Resumen del mes por cuenta
    const porCuenta = {}; delMes.forEach(x => { const k = x.cuenta || '(sin cuenta)'; porCuenta[k] = porCuenta[k] || { i: {}, e: {} }; add(porCuenta[k].i, x.moneda, x.ingreso); add(porCuenta[k].e, x.moneda, x.egreso); });
    const rc = Object.entries(porCuenta).sort((a, b) => cmp(a[0], b[0]));
    // Resumen anual por mes (pesos y dólares)
    const meses = Array.from({ length: 12 }, (_, i) => y + '-' + String(i + 1).padStart(2, '0'));
    const anual = meses.map(mm => { const xs = AD.MV.filter(x => (x.fecha || '').startsWith(mm) && x.cuenta !== 'Saldo Inicial'); const s = (cur, k) => xs.filter(x => x.moneda === cur).reduce((t, x) => t + x[k], 0); return { mm, iA: s('ARS', 'ingreso'), eA: s('ARS', 'egreso'), iU: s('USD', 'ingreso'), eU: s('USD', 'egreso'), n: xs.length }; }).filter(r => r.n);
    h += '<div class="grid2"><section class="sheet"><div class="sheet-h"><h2>Por cuenta en ' + esc(monthLabel(m)) + '</h2></div>' + (rc.length ? '<div class="tbl"><table><thead><tr><th>Cuenta</th><th class="r">Ingresos</th><th class="r">Egresos</th></tr></thead><tbody>' + rc.map(([k, v]) => '<tr class="click" data-act="aCjCuenta" data-cuenta="' + esc(k) + '"><td>' + esc(k) + '</td><td class="r">' + (Object.keys(v.i).length ? esc(multi(v.i)) : '<span class="muted">—</span>') + '</td><td class="r">' + (Object.keys(v.e).length ? esc(multi(v.e)) : '<span class="muted">—</span>') + '</td></tr>').join('') + '</tbody></table></div>' : emptyBox('Sin movimientos este mes', '')) + '</section>' +
      '<section class="sheet"><div class="sheet-h"><h2>Año ' + esc(y) + '</h2><span class="muted">sin saldo inicial</span></div>' + (anual.length ? '<div class="tbl"><table><thead><tr><th>Mes</th><th class="r">Neto $</th><th class="r">Neto US$</th></tr></thead><tbody>' + anual.map(r => '<tr class="click" data-act="aCjIr" data-mes="' + r.mm + '"' + (r.mm === m ? ' style="font-weight:600"' : '') + '><td style="text-transform:capitalize">' + esc(monthLabel(r.mm).split(' ')[0]) + '</td><td class="r" style="color:var(' + (r.iA - r.eA < 0 ? '--crit' : '--money') + ')">' + money(r.iA - r.eA, 'ARS') + '</td><td class="r" style="color:var(' + (r.iU - r.eU < 0 ? '--crit' : '--money') + ')">' + money(r.iU - r.eU, 'USD') + '</td></tr>').join('') + '</tbody></table></div>' : emptyBox('Sin movimientos este año', '')) + '</section></div>';
    const cuentasMes = [...new Set(delMes.map(x => x.cuenta))].sort(cmp);
    const list = delMes.filter(x => (!cj.cuenta || x.cuenta === cj.cuenta) && (!cj.moneda || x.moneda === cj.moneda) && (!q || norm([x.contraparte, x.detalle, x.subcuenta, x.cuenta].join(' ')).includes(q))).sort((a, b) => b.fecha.localeCompare(a.fecha) || (b.created_at || '').localeCompare(a.created_at || ''));
    h += '<section class="sheet"><div class="sheet-h"><h2>Movimientos</h2><div class="toolbar"><input class="in" type="search" id="cj-q" data-acj="q" placeholder="Buscar" value="' + esc(cj.q) + '"><select class="in" id="cj-c" data-acj="cuenta" aria-label="Cuenta">' + opt('', 'Todas las cuentas', cj.cuenta) + cuentasMes.map(c => opt(c, c, cj.cuenta)).join('') + '</select><select class="in" id="cj-m" data-acj="moneda" aria-label="Moneda">' + opt('', 'Todas las monedas', cj.moneda) + MONEDAS.map(c => opt(c, c, cj.moneda)).join('') + '</select></div></div>' +
      (list.length ? '<div class="tbl"><table><thead><tr><th>Fecha</th><th>Cuenta</th><th>Cliente / proveedor</th><th>Detalle</th><th class="r">Ingreso</th><th class="r">Egreso</th></tr></thead><tbody>' + list.map(x => '<tr class="click" data-act="aMov" data-id="' + esc(x.id) + '"><td class="mono">' + fmt(x.fecha) + '</td><td>' + esc(x.cuenta) + '<span class="sub">' + esc(x.subcuenta) + '</span></td><td>' + esc(x.contraparte) + (x.factura_id ? '<span class="sub">cobro de factura</span>' : '') + (x.reintegro_a ? '<span class="sub">pagó ' + esc(x.reintegro_a) + (x.reintegrado ? ' · devuelto' : '') + '</span>' : '') + '</td><td>' + esc(x.detalle) + '</td><td class="r">' + (x.ingreso ? '<span class="money">' + money(x.ingreso, x.moneda) + '</span>' : '') + '</td><td class="r">' + (x.egreso ? money(x.egreso, x.moneda) : '') + '</td></tr>').join('') + '</tbody></table></div>' : emptyBox('No hay movimientos con ese filtro', '')) +
      '<div class="count num">' + list.length + ' de ' + delMes.length + ' movimientos del mes</div></section>';
    return h;
  }
  function formMovimiento(id) {
    const x = id ? AD.MV.find(v => v.id === id) : null;
    const cuentas = [...new Set(AD.PC.map(p => p.cuenta))].sort(cmp);
    const subs = [...new Set(AD.PC.map(p => p.subcuenta).filter(Boolean))].sort(cmp);
    const partes = [...new Set([...S.C.map(c => c.nombre), ...S.E.map(e => e.persona), ...AD.MV.map(v => v.contraparte).filter(Boolean)])].sort(cmp);
    const vals = x ? { fecha: x.fecha, tipo: x.ingreso > 0 ? 'Ingreso' : 'Egreso', monto: x.ingreso || x.egreso, moneda: x.moneda, cuenta: x.cuenta, subcuenta: x.subcuenta, contraparte: x.contraparte, detalle: x.detalle, caja: x.caja_id || '', reintegro_a: x.reintegro_a, reintegrado: x.reintegrado }
      : { fecha: today(), tipo: 'Egreso', moneda: 'ARS', cuenta: 'Gastos Fijos', reintegro_a: '' };
    openPanel({
      title: x ? (x.contraparte || x.cuenta) : 'Nuevo movimiento', eyebrow: x ? 'Editar movimiento' : 'Caja',
      values: vals,
      fields: [
        { k: 'fecha', label: 'Fecha', type: 'date', req: 1 },
        { k: 'tipo', label: 'Tipo', type: 'select', opts: ['Ingreso', 'Egreso'] },
        { k: 'monto', label: 'Monto', num: 1, req: 1 },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'cuenta', label: 'Cuenta', type: 'select', opts: cuentas, req: 1 },
        { k: 'subcuenta', label: 'Subcuenta', ph: 'Elegí o escribí', hint: '' },
        { k: 'contraparte', label: 'Cliente / proveedor', full: 1 },
        { k: 'detalle', label: 'Detalle', full: 1 },
        { k: 'caja', label: 'Caja (opcional)', type: 'select', html: v => opt('', '—', v) + AD.CJ.map(c => opt(c.id, c.nombre + ' (' + c.moneda + ')', v)).join('') },
        { k: 'reintegro_a', label: 'Lo pagó un socio (se le debe)', type: 'select', opts: EMISORES, blank: 'No' },
        { k: 'reintegrado', label: 'Ya se le devolvió', type: 'check' },
      ],
      extra: '<div class="field full"><span class="lbl">Costo de… (para ver el margen)</span><div id="imp-box" class="impbox"></div></div><datalist id="dl-sub">' + subs.map(s => '<option value="' + esc(s) + '">').join('') + '</datalist><datalist id="dl-partes">' + partes.map(s => '<option value="' + esc(s) + '">').join('') + '</datalist>' + (x && x.factura_id ? '<p class="formnote">Es el cobro de una factura: si lo borrás, la factura vuelve a quedar con saldo.</p>' : ''),
      onSave: async v => {
        const cli = S.C.find(c => c.nombre === v.contraparte), per = S.E.find(e => e.persona === v.contraparte);
        const co = EQ.colabPorNombre(v.contraparte);
        const row = { fecha: v.fecha, cuenta: v.cuenta, subcuenta: v.subcuenta, contraparte: v.contraparte, cliente_id: cli ? cli._id : (x ? x.cliente_id : null), persona_id: per ? per._id : co && co.persona_id ? co.persona_id : (x ? x.persona_id : null), colaborador_id: co ? co.id : (x && x.contraparte === v.contraparte ? x.colaborador_id || null : null), detalle: v.detalle, ingreso: v.tipo === 'Ingreso' ? v.monto : 0, egreso: v.tipo === 'Egreso' ? v.monto : 0, moneda: v.moneda, caja_id: v.caja || null, reintegro_a: v.reintegro_a || '', reintegrado: !!v.reintegrado };
        let mid = x && x.id;
        if (x) await data.upd('movimientos', x.id, row); else mid = (await data.ins('movimientos', row)).id;
        if (v.tipo === 'Egreso') await guardarImp(mid); else if (x && AD.IMP.some(i => i.movimiento_id === x.id)) await data.del('imputaciones', x.id, 'movimiento_id');
        toast(x ? 'Movimiento actualizado' : 'Movimiento cargado');
      },
      onDelete: x ? async () => { await data.del('movimientos', x.id); toast('Movimiento borrado'); } : null,
    });
    const s = $('#af-subcuenta'); if (s) s.setAttribute('list', 'dl-sub');
    const c = $('#af-contraparte'); if (c) c.setAttribute('list', 'dl-partes');
    AD.impDraft = (x ? AD.IMP.filter(i => i.movimiento_id === x.id) : []).map(i => ({ dest: i.abono_id ? 'a:' + i.abono_id : 'p:' + i.proyecto_id, monto: String(i.monto) }));
    const prevMov = (contraparte) => AD.MV.filter(v => v.contraparte === contraparte && (!x || v.id !== x.id) && AD.IMP.some(i => i.movimiento_id === v.id)).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))[0];
    const setCopy = () => { const cp = ($('#af-contraparte') || {}).value; const pm = cp && prevMov(cp); AD.impCopy = pm ? { contraparte: cp, mov: pm } : null; };
    setCopy(); AD.form.onInput = () => { const had = !!AD.impCopy; setCopy(); if (had !== !!AD.impCopy) renderImp(); else updateImpSum(); };
    renderImp();
  }

  /* ---------- Módulos: sueldos y pagos, asistente ---------- */
  const kit = { AD, money, parseMonto, r2, add, multi, lock, cap, openPanel, MONEDAS, EMISORES, cadm, abonoEnMes, precioEn, sugerencias, clientesDelMes, estadoFactura, mail, cajasDe, subcuentas, renderImp,
    formFactura: (...a) => formFactura(...a), formMovimiento: (...a) => formMovimiento(...a) };
  const EQ = initEquipo(ctx, kit); kit.equipo = EQ;
  const AS = initAsistente(ctx, kit);
  const ST = initStats(ctx, kit);

  /* ---------- Acciones ---------- */
  const actions = {
    aCjMes: t => { const n = +t.dataset.d; AD.cj.mes = n ? addMonth(AD.cj.mes, n) : thisMonth(); ctx.render(); },
    aCjIr: t => { AD.cj.mes = t.dataset.mes; ctx.render(); },
    aCjCuenta: t => { AD.cj.cuenta = t.dataset.cuenta; ctx.render(); },
    aMov: t => formMovimiento(t.dataset.id || null),
    aReint: async t => { try { await data.upd('movimientos', t.dataset.id, { reintegrado: true }); toast('Marcado como devuelto'); await ctx.reload(); } catch (err) { toast(err.message); } },
    aMes: t => { const n = +t.dataset.d; AD.mes = n ? addMonth(AD.mes, n) : thisMonth(); ctx.render(); },
    aCuenta: t => openCuenta(t.dataset.cliente, AD.mes),
    aCuentaDe: t => openCuenta(t.dataset.cliente, thisMonth()),
    aCuentaOtro: () => { const v = $('#a-otro').value; if (v) openCuenta(v, AD.mes); },
    aBack: () => { AD.sel = null; AD.rd = null; ctx.render(); },
    aRiAdd: () => { AD.rd.items.push({ inc: true, origen: 'Manual', ref: '', concepto: '', monto: '' }); ctx.render(); const el = document.getElementById('ri-' + (AD.rd.items.length - 1) + '-c'); if (el) el.focus(); },
    aRiDel: t => { AD.rd.items.splice(+t.dataset.i, 1); ctx.render(); },
    aSugAdd: t => { const s = sugerencias(AD.rd.cliente, AD.rd.m).find(x => x.ref === t.dataset.ref); if (s) { AD.rd.items.push({ inc: true, origen: s.origen, ref: s.ref, concepto: s.concepto, monto: s.monto }); ctx.render(); } },
    aResSave: t => saveResumen(t.dataset.estado),
    aCopy: () => ctx.copyText(resumenTexto(AD.rd)),
    aCopyPanel: () => { const el = $('#af-texto'); if (el) ctx.copyText(el.value); },
    aPrint: () => printResumen(),
    aCSV: () => exportCSV(),
    aFactura: t => formFactura(t.dataset.id || null),
    aCobro: t => formCobro(t.dataset.id),
    aRecordatorio: () => mail.recordatorio(cuenta(AD.rd.cliente, AD.rd.m)),
    aRecordatorioManual: () => formGestion('Recordatorio de pago', recordatorioTexto(cuenta(AD.rd.cliente, AD.rd.m))),
    aMailResumen: () => mail.resumen(AD.rd),
    aMailResumenes: () => mail.resumenes(AD.mes),
    aMailFactura: t => { const f = AD.F.find(x => x.id === t.dataset.id); if (f) mail.factura(f); },
    aMailLibre: t => mail.libre(t.dataset.cliente || (AD.rd && AD.rd.cliente)),
    aAvisos: () => mail.avisos(),
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
    aRtVer: t => { AD.rt.ver = t.dataset.v; ctx.render(); },
    aImpAdd: () => { AD.impDraft.push({ dest: '', monto: '' }); renderImp(); },
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
      const pct = parseMonto(AD.pp.pct), desde = AD.pp.desde; if (!pct || !/^\d{4}-\d{2}$/.test(desde)) { toast('Completá el porcentaje y el mes'); return; }
      const rows = [...AD.pp.sel].map(id => { const cur = precioEn(id, thisMonth()); return cur ? { abono_id: id, desde: desde + '-01', monto: r2(cur.monto * (1 + pct / 100)), moneda: cur.moneda, motivo: AD.pp.motivo || ('Aumento ' + String(pct).replace('.', ',') + '%') } : null; }).filter(Boolean);
      try { for (const r of rows) await data.upsert('precios_abono', r, 'abono_id,desde'); toast('Aumento cargado en ' + rows.length + ' abonos'); AD.pp.sel.clear(); AD.pp.pct = ''; await ctx.reload(); } catch (err) { toast(err.message); }
    },
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
    if (t.dataset.acj && t.tagName !== 'SELECT') { AD.cj[t.dataset.acj] = t.value; ctx.render(); }
  });
  document.addEventListener('change', e => {
    const t = e.target;
    if (AD.form && AD.form.composer && t.type === 'checkbox' && t.closest && t.closest('#aform')) { refreshPreview(); return; }
    if (t.dataset.impi !== undefined) { AD.impDraft[+t.dataset.impi][t.dataset.impk] = t.value; return; }
    if (t.dataset.art) { AD.rt[t.dataset.art] = t.value; ctx.render(); return; }
    if (AD.form && AD.form.onInput && t.tagName === 'SELECT' && t.closest && t.closest('#aform')) AD.form.onInput();
    if (t.dataset.ri !== undefined && t.type === 'checkbox' && AD.rd) { AD.rd.items[+t.dataset.ri].inc = t.checked; ctx.render(); return; }
    if (t.dataset.rdk && t.tagName === 'SELECT' && AD.rd) { AD.rd[t.dataset.rdk] = t.value; ctx.render(); return; }
    if (t.dataset.aff) { AD.ff[t.dataset.aff] = t.value; ctx.render(); return; }
    if (t.dataset.acj && t.tagName === 'SELECT') { AD.cj[t.dataset.acj] = t.value; ctx.render(); return; }
    if (t.dataset.ppsel) { if (t.checked) AD.pp.sel.add(t.dataset.ppsel); else AD.pp.sel.delete(t.dataset.ppsel); ctx.render(); }
  });
  document.addEventListener('submit', e => { if (e.target.id === 'aform') { e.preventDefault(); submitPanel(); } });

  Object.assign(actions, EQ.actions, AS.actions, ST.actions);
  return {
    load, actions, fichaSection, AD,
    views: [['asistente', 'Asistente', AS.view], ['estadisticas', 'Estadísticas', ST.view], ['cierre', 'Cierre de mes', vCierre], ['facturas', 'Facturas', vFacturas], ['precios', 'Precios', vPrecios], ['caja', 'Caja', vCaja], ['pagos', 'Pagos', EQ.view], ['rentabilidad', 'Rentabilidad', vRent]],
    counts: () => (AD.ok ? { facturas: AD.F.filter(f => estadoFactura(f) === 'Vencida').length, asistente: AS.count() } : {}),
    resetView: () => { AD.sel = null; AD.rd = null; },
  };
}
