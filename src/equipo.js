// Sueldos y pagos: equipo, socias y proveedores. Sueldo u honorario con historial, extras fijos,
// aguinaldo, liquidación mensual y pago (que queda como egreso en Caja). Solo administradores.
import * as data from './data.js';

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
  const lineaRem = c => { const rs = remVig(c.id, AD.pg.mes), ex = extrasVig(c.id, AD.pg.mes); return { rs, ex, acc: [...rs, ...ex].reduce((acc, x) => add(acc, x.moneda, x.monto), {}) }; };

  /* ---------- vista ---------- */
  function vPagos() {
    const pg = AD.pg, m = pg.mes, y = m.slice(0, 4);
    const lq = liqMes(m), falt = faltantes(m);
    const pend = {}, pag = {}; lq.forEach(l => add(l.movimiento_id ? pag : pend, l.moneda, l.monto));
    const laboral = {}, prov = {}; AD.MV.filter(v => (v.fecha || '').startsWith(y) && v.egreso > 0).forEach(v => { if (v.cuenta === 'Costo Laboral') add(laboral, v.moneda, v.egreso); else if (v.cuenta === 'Proveedores') add(prov, v.moneda, v.egreso); });
    let h = '<div class="head"><div>' + lock + '<h1>Sueldos y proveedores</h1><p>Sueldos, honorarios, extras y aguinaldo. Al pagar, el gasto queda en Gastos e ingresos.</p></div>' +
      '<div class="toolbar"><div class="cal-h"><h2 style="min-width:170px">' + esc(cap(monthLabel(m))) + '</h2><button class="btn sm" data-act="pgMes" data-d="-1" aria-label="Mes anterior">←</button><button class="btn sm" data-act="pgMes" data-d="0">Este mes</button><button class="btn sm" data-act="pgMes" data-d="1" aria-label="Mes siguiente">→</button></div></div></div>';
    h += '<section class="kpis">' +
      '<div class="kpi ' + (Object.keys(pend).length ? 'warn' : '') + '"><span class="eyebrow">Falta pagar en ' + esc(monthLabel(m).split(' ')[0]) + '</span><b style="font-size:22px">' + esc(multi(pend)) + '</b><span>' + lq.filter(l => !l.movimiento_id).length + ' pagos</span></div>' +
      '<div class="kpi"><span class="eyebrow">Pagado en el mes</span><b style="font-size:22px;color:var(--money)">' + esc(multi(pag)) + '</b><span>' + lq.filter(l => l.movimiento_id).length + ' pagos</span></div>' +
      '<div class="kpi"><span class="eyebrow">Sueldos ' + esc(y) + '</span><b style="font-size:20px">' + esc(multi(laboral)) + '</b><span>equipo, socias y aguinaldos</span></div>' +
      '<div class="kpi"><span class="eyebrow">Proveedores ' + esc(y) + '</span><b style="font-size:20px">' + esc(multi(prov)) + '</b><span>según Gastos e ingresos</span></div></section>';
    h += '<div class="toolbar"><div class="seg" role="group" aria-label="Ver">' + [['liquidacion', 'Pagos del mes'], ['equipo', 'Personas y proveedores']].map(([kk, l]) => '<button data-act="pgVer" data-v="' + kk + '" aria-pressed="' + (pg.ver === kk) + '">' + l + '</button>').join('') + '</div></div>';
    return h + (pg.ver === 'equipo' ? vEquipo(m, y) : vLiquidacion(m, lq, falt));
  }

  function vLiquidacion(m, lq, falt) {
    let h = '';
    if (falt.length) h += '<section class="callout"><p><b>' + falt.length + ' pagos por calcular</b> en ' + esc(monthLabel(m)) + ' según los sueldos, honorarios y extras cargados' + (falt.some(f => f.tipo === 'Aguinaldo') ? ' (incluye aguinaldo)' : '') + ': ' + esc([...new Set(falt.map(f => (colab(f.colaborador_id) || {}).nombre))].join(', ')) + '.</p><button class="btn primary" data-act="pgGenerar">' + (lq.length ? 'Calcular los que faltan' : 'Calcular los pagos del mes') + '</button></section>';
    const sinRem = AD.CO.filter(c => activoEn(c, m) && c.tipo !== 'Proveedor' && !remVig(c.id, m).length);
    if (sinRem.length) h += '<section class="callout"><p>Sin sueldo cargado: <b>' + esc(sinRem.map(c => c.nombre).join(', ')) + '</b>. Cargalo en su ficha para que se calcule solo cada mes.</p><button class="btn" data-act="pgVer" data-v="equipo">Ver equipo</button></section>';
    const grupos = new Map(); lq.forEach(l => { if (!grupos.has(l.colaborador_id)) grupos.set(l.colaborador_id, []); grupos.get(l.colaborador_id).push(l); });
    const orden = [...grupos.keys()].map(colab).filter(Boolean).sort((a, b) => TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo) || cmp(a.nombre, b.nombre));
    const cards = orden.map(c => {
      const its = grupos.get(c.id).sort((a, b) => ['Sueldo', 'Honorario', 'Extra', 'Aguinaldo', 'Otro'].indexOf(a.tipo) - ['Sueldo', 'Honorario', 'Extra', 'Aguinaldo', 'Otro'].indexOf(b.tipo));
      const tot = {}; its.forEach(i => add(tot, i.moneda, i.monto));
      const pend = its.filter(i => !i.movimiento_id), movs = [...new Set(its.filter(i => i.movimiento_id).map(i => i.movimiento_id))].map(movDe).filter(Boolean);
      const estado = !pend.length ? '<span class="days" style="color:var(--ok)">✓ Pagado ' + esc(movs.map(v => fmt(v.fecha).slice(0, 5)).join(', ')) + '</span>' : '<button class="btn sm primary" data-act="pgPagar" data-id="' + esc(c.id) + '">Pagar ' + esc(multi(pend.reduce((acc, i) => add(acc, i.moneda, i.monto), {}))) + '</button>';
      return '<section class="sheet"><div class="sheet-h"><h2 style="font-size:17px"><button class="btn link" data-act="pgColab" data-id="' + esc(c.id) + '">' + esc(c.nombre) + '</button> <span class="muted" style="font-size:13px;font-weight:500">' + esc([c.tipo, c.rubro].filter(Boolean).join(' · ')) + '</span></h2><span class="toolbar">' + estado + '<button class="btn ghost sm" data-act="pgRecibo" data-id="' + esc(c.id) + '" title="Comprobante de pago en PDF">Recibo</button>' + (c.email ? '<button class="btn ghost sm" data-act="pgReciboMail" data-id="' + esc(c.id) + '" title="Mandar el comprobante de pago por email">Enviar</button>' : '') + '</span></div><div class="rows">' +
        its.map(i => '<div class="row" style="cursor:default"><span class="d">' + esc(i.tipo) + '</span><span class="t"><b>' + esc(i.concepto) + '</b>' + (i.notas ? '<span>' + esc(i.notas) + '</span>' : '') + '</span><span class="toolbar"><span class="money">' + money(i.monto, i.moneda) + '</span>' + (i.movimiento_id ? '<span class="days" style="color:var(--ok)">✓</span>' : '<button class="btn ghost sm" data-act="pgItem" data-id="' + esc(i.id) + '">Editar</button>') + '</span></div>').join('') +
        '</div><div class="count" style="display:flex;justify-content:space-between;gap:10px;align-items:center"><span>Total <b class="money">' + esc(multi(tot)) + '</b></span><button class="btn ghost sm" data-act="pgItem" data-colab="' + esc(c.id) + '">+ Agregar pago</button></div></section>';
    }).join('');
    h += '<div class="toolbar"><button class="btn" data-act="pgItem">+ Pago a proveedor o extra</button><span class="muted">Un trabajo puntual (fotos, web, una pauta) se carga acá y se paga igual.</span></div>';
    h += cards ? '<div class="grid2">' + cards + '</div>' : '<section class="sheet">' + emptyBox('Todavía no hay pagos calculados para ' + monthLabel(m), falt.length ? 'Tocá “Calcular los pagos del mes”: se arma con los sueldos, honorarios y extras vigentes.' : 'Cargá el sueldo u honorario de cada persona en “Personas y proveedores”.') + '</section>';
    return h;
  }

  function vEquipo(m, y) {
    const list = AD.CO.filter(c => AD.pg.inact || c.activo).sort((a, b) => TIPOS.indexOf(a.tipo) - TIPOS.indexOf(b.tipo) || cmp(a.nombre, b.nombre));
    const rows = list.map(c => {
      const { rs, ex } = lineaRem(c), pagos = pagosDe(c.id, y), ult = pagos[0], tot = {}; pagos.forEach(v => add(tot, v.moneda, v.egreso));
      return '<tr class="click" data-act="pgColab" data-id="' + esc(c.id) + '"><td class="name">' + esc(c.nombre) + (c.persona && c.persona !== c.nombre ? ' <span class="tag">' + esc(c.persona) + '</span>' : '') + '<span class="sub">' + esc([c.tipo, c.rubro, c.vinculo].filter(Boolean).join(' · ')) + (c.activo ? '' : ' · inactivo') + '</span></td>' +
        '<td class="r">' + (rs.length ? rs.map(r => '<span class="money">' + money(r.monto, r.moneda) + '</span><span class="sub">' + esc(r.concepto) + ' desde ' + fmt(r.desde) + '</span>').join('') : '<span class="muted">' + (c.tipo === 'Proveedor' ? 'por trabajo' : 'sin cargar') + '</span>') + '</td>' +
        '<td>' + (ex.length ? '<div class="tags">' + ex.map(x => '<span class="tag">' + esc(x.concepto) + ' ' + esc(money(x.monto, x.moneda)) + '</span>').join('') + '</div>' : '<span class="muted">—</span>') + '</td>' +
        '<td class="r">' + (pagos.length ? '<span class="money">' + esc(multi(tot)) + '</span><span class="sub">' + pagos.length + ' pagos</span>' : '<span class="muted">—</span>') + '</td>' +
        '<td>' + (ult ? '<span class="mono">' + fmt(ult.fecha) + '</span><span class="sub">' + esc(money(ult.egreso, ult.moneda)) + ' · ' + esc((ult.detalle || '').slice(0, 40)) + '</span>' : '<span class="muted">—</span>') + '</td></tr>';
    }).join('');
    return '<section class="sheet"><div class="sheet-h"><h2>Personas y proveedores</h2><div class="toolbar"><label class="chk"><input type="checkbox" data-pgk="inact"' + (AD.pg.inact ? ' checked' : '') + '> Ver inactivos</label><button class="btn sm" data-act="pgAumento">Aumento a todos</button><button class="btn sm primary" data-act="pgColab">+ Persona o proveedor</button></div></div>' +
      (rows ? '<div class="tbl"><table><thead><tr><th>Nombre</th><th class="r">Sueldo / honorario</th><th>Extras fijos</th><th class="r">Pagado en ' + esc(y) + '</th><th>Último pago</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : emptyBox('Sin personas cargadas', 'Agregá al equipo y a los proveedores con “+ Persona o proveedor”.')) +
      '<div class="count">Los pagos salen de Gastos e ingresos (sueldos y proveedores). Para que un pago viejo cuente, el nombre tiene que coincidir con el de la persona o con alguno de sus apodos.</div></section>';
  }

  /* ---------- formularios ---------- */
  function formColaborador(id) {
    const c = id ? colab(id) : null;
    const vals = c ? { ...c, otros_nombres: (c.otros_nombres || []).join(', ') } : { tipo: 'Proveedor', activo: true, aguinaldo: false };
    const hist = c ? histRem(c.id) : [], ex = c ? AD.CF.filter(x => x.colaborador_id === c.id).sort((a, b) => cmp(a.concepto, b.concepto)) : [], pagos = c ? pagosDe(c.id).slice(0, 12) : [];
    const box = (titulo, inner, btn) => '<div class="field full"><span class="lbl" style="display:flex;justify-content:space-between;align-items:center">' + titulo + (btn || '') + '</span>' + inner + '</div>';
    const lista = rows => rows.length ? '<div class="rows" style="border:1px solid var(--line);border-radius:8px">' + rows.join('') + '</div>' : '<span class="muted">Nada cargado.</span>';
    const extra = c ? box('Sueldo u honorario', lista(hist.map(r => '<div class="row" style="cursor:default"><span class="d">' + fmt(r.desde) + '</span><span class="t"><b class="money">' + money(r.monto, r.moneda) + '</b><span>' + esc(r.concepto + (r.motivo ? ' · ' + r.motivo : '')) + '</span></span><button type="button" class="btn ghost sm" data-act="pgRemDel" data-id="' + esc(r.id) + '" aria-label="Borrar">✕</button></div>')), '<button type="button" class="btn sm" data-act="pgRem" data-id="' + esc(c.id) + '">+ Sueldo o aumento</button>') +
      box('Extras fijos', lista(ex.map(x => '<div class="row" style="cursor:default"><span class="d">' + (x.desde ? fmt(x.desde) : 'siempre') + '</span><span class="t"><b>' + esc(x.concepto) + ' · <span class="money">' + money(x.monto, x.moneda) + '</span></b><span>' + esc((x.hasta ? 'hasta ' + fmt(x.hasta) : 'sin fecha de fin') + (x.notas ? ' · ' + x.notas : '')) + '</span></span><button type="button" class="btn ghost sm" data-act="pgExtraDel" data-id="' + esc(x.id) + '" aria-label="Borrar">✕</button></div>')), '<button type="button" class="btn sm" data-act="pgExtra" data-id="' + esc(c.id) + '">+ Extra</button>') +
      box('Últimos pagos', lista(pagos.map(v => '<div class="row" style="cursor:default"><span class="d">' + fmt(v.fecha) + '</span><span class="t"><b class="money">' + money(v.egreso, v.moneda) + '</b><span>' + esc(v.detalle || v.subcuenta) + '</span></span><span></span></div>'))) : '<p class="formnote" style="grid-column:1/-1">Después de guardar vas a poder cargar el sueldo u honorario y los extras.</p>';
    openPanel({
      title: c ? c.nombre : 'Nueva persona o proveedor', eyebrow: c ? (c.tipo + (c.rubro ? ' · ' + c.rubro : '')) : 'Sueldos y proveedores',
      values: vals,
      fields: [
        { k: 'nombre', label: 'Nombre', req: 1, full: 1 },
        { k: 'tipo', label: 'Tipo', type: 'select', opts: TIPOS },
        { k: 'rubro', label: 'Rubro', type: 'select', opts: RUBROS, blank: '—' },
        { k: 'vinculo', label: 'Vínculo', type: 'select', opts: VINCULOS, blank: '—' },
        { k: 'persona_id', label: 'Usuario de la app', type: 'select', html: v => opt('', 'No usa la app', v) + S.E.map(e => opt(e._id, e.persona, v)).join('') },
        { k: 'ingreso', label: 'Fecha de ingreso', type: 'date' },
        { k: 'egreso', label: 'Fecha de baja', type: 'date' },
        { k: 'aguinaldo', label: 'Cobra aguinaldo (junio y diciembre)', type: 'check' },
        { k: 'activo', label: 'Activo', type: 'check' },
        { k: 'cuit', label: 'CUIT / CUIL' },
        { k: 'banco', label: 'Banco' },
        { k: 'cbu', label: 'CBU / CVU' },
        { k: 'alias_cbu', label: 'Alias' },
        { k: 'email', label: 'Email', type: 'email' },
        { k: 'tel', label: 'Teléfono' },
        { k: 'contrato', label: 'Contrato o legajo (link)', type: 'url', full: 1, ph: 'https://drive.google.com/...' },
        { k: 'otros_nombres', label: 'Apodos (para reconocer pagos en el banco)', full: 1, hint: 'Separados por coma. Ej.: Vale, Valentina R.' },
        { k: 'notas', label: 'Notas', type: 'textarea', full: 1, rows: 2 },
      ],
      extra,
      onSave: async v => {
        const row = { ...v, persona_id: v.persona_id || null, ingreso: v.ingreso || null, egreso: v.egreso || null, otros_nombres: String(v.otros_nombres || '').split(',').map(s => s.trim()).filter(Boolean) };
        let cid = c && c.id;
        if (c) await data.upd('colaboradores', c.id, row); else cid = (await data.ins('colaboradores', row)).id;
        // Vincular pagos de Caja que todavía no tienen persona
        const nombres = [row.nombre, ...row.otros_nombres].map(norm);
        const sueltos = AD.MV.filter(x => !x.colaborador_id && x.egreso > 0 && nombres.includes(norm((x.contraparte || '').trim())));
        for (const x of sueltos) await data.upd('movimientos', x.id, { colaborador_id: cid });
        toast((c ? 'Datos guardados' : 'Agregado') + (sueltos.length ? ' · ' + sueltos.length + ' pagos anteriores reconocidos' : ''));
        if (!c) AD.postSave = () => formColaborador(cid);
      },
      onDelete: c ? async () => { await data.del('colaboradores', c.id); toast('Borrado. Sus pagos siguen en Gastos e ingresos.'); } : null,
    });
  }
  function formRem(cid) {
    const c = colab(cid); if (!c) return;
    const concepto = c.tipo === 'Proveedor' ? 'Honorario' : 'Sueldo';
    const cur = remVig(cid, thisMonth()).find(r => r.concepto === concepto);
    openPanel({
      title: c.nombre, eyebrow: cur ? 'Aumento o nuevo monto' : 'Sueldo u honorario', saveLabel: 'Guardar',
      intro: cur ? 'Vigente: <b class="money">' + esc(money(cur.monto, cur.moneda)) + '</b> desde ' + esc(fmt(cur.desde)) + '. Se guarda como monto nuevo sin perder el anterior. Podés poner el porcentaje y se calcula solo.' : 'El monto que se paga cada mes desde el mes indicado.',
      values: { concepto, desde: cur ? addMonth(thisMonth(), cur.desde >= thisMonth() ? 1 : 0) : thisMonth(), monto: '', pct: '', moneda: cur ? cur.moneda : 'ARS', motivo: cur ? '' : 'Inicial' },
      fields: [
        { k: 'concepto', label: 'Concepto', type: 'select', opts: ['Sueldo', 'Honorario'] },
        { k: 'desde', label: 'Desde qué mes', type: 'month', month: 1, req: 1 },
        ...(cur ? [{ k: 'pct', label: 'Aumento %', num: 1, ph: '5' }] : []),
        { k: 'monto', label: 'Monto mensual', num: 1, hint: cur ? 'Si ponés el %, dejalo vacío.' : '' },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'motivo', label: 'Motivo', ph: 'Paritaria, aumento semestral…', full: 1 },
      ],
      onSave: async v => {
        let monto = v.monto; if (monto == null && v.pct && cur) monto = r2(cur.monto * (1 + v.pct / 100));
        if (!monto) throw new Error('Poné el monto o el porcentaje');
        await data.upsert('remuneraciones', { colaborador_id: cid, concepto: v.concepto, desde: v.desde + '-01', monto, moneda: v.moneda, motivo: v.motivo || (v.pct ? 'Aumento ' + String(v.pct).replace('.', ',') + '%' : '') }, 'colaborador_id,concepto,desde');
        toast('Guardado: ' + money(monto, v.moneda) + ' desde ' + fmt(v.desde));
        AD.postSave = () => formColaborador(cid);
      },
    });
  }
  function formExtra(cid) {
    const c = colab(cid); if (!c) return;
    openPanel({
      title: c.nombre, eyebrow: 'Extra fijo', saveLabel: 'Agregar',
      intro: 'Se suma a los pagos de cada mes mientras esté vigente (bondi, Adobe, internet…).',
      values: { concepto: '', monto: '', moneda: 'ARS', desde: thisMonth(), hasta: '', notas: '' },
      fields: [
        { k: 'concepto', label: 'Concepto', req: 1, ph: 'Bondi' },
        { k: 'monto', label: 'Monto mensual', num: 1, req: 1 },
        { k: 'moneda', label: 'Moneda', type: 'select', opts: MONEDAS },
        { k: 'desde', label: 'Desde', type: 'month', month: 1 },
        { k: 'hasta', label: 'Hasta (opcional)', type: 'month', month: 1 },
        { k: 'notas', label: 'Notas', full: 1 },
      ],
      extra: '<datalist id="dl-extras">' + ['Bondi', 'Adobe', 'Internet', 'Monotributo', 'Capacitación'].map(s => '<option value="' + s + '">').join('') + '</datalist>',
      onSave: async v => { await data.ins('conceptos_fijos', { colaborador_id: cid, concepto: v.concepto, monto: v.monto, moneda: v.moneda, desde: v.desde ? v.desde + '-01' : null, hasta: v.hasta ? v.hasta + '-01' : null, notas: v.notas }); toast('Extra agregado'); AD.postSave = () => formColaborador(cid); },
    });
    const el = $('#af-concepto'); if (el) el.setAttribute('list', 'dl-extras');
  }
  function formItem(id, colabId) {
    const it = id ? AD.LQ.find(l => l.id === id) : null, m = AD.pg.mes;
    openPanel({
      title: it ? it.concepto : 'Nuevo pago', eyebrow: 'Pagos de ' + monthLabel(it ? it.periodo : m),
      values: it ? { ...it } : { colaborador_id: colabId || '', tipo: colabId && (colab(colabId) || {}).tipo !== 'Proveedor' ? 'Extra' : 'Honorario', concepto: '', monto: '', moneda: 'ARS', notas: '' },
      fields: [
        { k: 'colaborador_id', label: 'Para', type: 'select', req: 1, full: 1, html: v => opt('', 'Elegí', v) + AD.CO.filter(c => c.activo || c.id === v).map(c => opt(c.id, c.nombre + ' · ' + c.tipo, v)).join('') },
        { k: 'tipo', label: 'Tipo', type: 'select', opts: ['Sueldo', 'Honorario', 'Extra', 'Aguinaldo', 'Otro'] },
        { k: 'concepto', label: 'Concepto', req: 1, ph: 'Fotos Casa Ceibo' },
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
  function formAumento() {
    const objetivo = AD.CO.filter(c => c.activo && c.tipo !== 'Proveedor' && remVig(c.id, thisMonth()).some(r => r.concepto === 'Sueldo'));
    if (!objetivo.length) { toast('Primero cargá los sueldos vigentes'); return; }
    openPanel({
      title: 'Aumento de sueldos', eyebrow: 'Sueldos y proveedores', saveLabel: 'Aplicar',
      intro: 'Se guarda un sueldo nuevo para cada persona tildada, desde el mes indicado, sin perder el historial.',
      values: { pct: '', desde: addMonth(thisMonth(), 1), motivo: '' },
      fields: [{ k: 'pct', label: 'Aumento %', num: 1, req: 1 }, { k: 'desde', label: 'Desde qué mes', type: 'month', month: 1, req: 1 }, { k: 'motivo', label: 'Motivo', ph: 'Paritaria', full: 1 }],
      extra: '<div class="field full"><span class="lbl">A quiénes</span><div class="rows" style="border:1px solid var(--line);border-radius:8px">' + objetivo.map(c => { const r = remVig(c.id, thisMonth()).find(x => x.concepto === 'Sueldo'); return '<label class="row" style="cursor:pointer"><input type="checkbox" data-pgaum="' + esc(c.id) + '" checked><span class="t"><b>' + esc(c.nombre) + '</b><span>' + esc(c.tipo) + '</span></span><span class="money">' + money(r.monto, r.moneda) + '</span></label>'; }).join('') + '</div></div>',
      onSave: async v => {
        const sel = objetivo.filter(c => ($('[data-pgaum="' + c.id + '"]') || {}).checked);
        for (const c of sel) { const r = remVig(c.id, thisMonth()).find(x => x.concepto === 'Sueldo'); await data.upsert('remuneraciones', { colaborador_id: c.id, concepto: 'Sueldo', desde: v.desde + '-01', monto: r2(r.monto * (1 + v.pct / 100)), moneda: r.moneda, motivo: v.motivo || 'Aumento ' + String(v.pct).replace('.', ',') + '%' }, 'colaborador_id,concepto,desde'); }
        toast('Aumento cargado para ' + sel.length + ' personas');
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
    pgMes: t => { const n = +t.dataset.d; AD.pg.mes = n ? addMonth(AD.pg.mes, n) : thisMonth(); ctx.render(); },
    pgVer: t => { AD.pg.ver = t.dataset.v; ctx.render(); },
    pgColab: t => formColaborador(t.dataset.id || null),
    pgRem: t => formRem(t.dataset.id),
    pgRemDel: async t => { const r = AD.RM.find(x => x.id === t.dataset.id); try { await data.del('remuneraciones', t.dataset.id); await ctx.reload(); if (r) formColaborador(r.colaborador_id); } catch (err) { toast(err.message); } },
    pgExtra: t => formExtra(t.dataset.id),
    pgExtraDel: async t => { const x = AD.CF.find(y => y.id === t.dataset.id); try { await data.del('conceptos_fijos', t.dataset.id); await ctx.reload(); if (x) formColaborador(x.colaborador_id); } catch (err) { toast(err.message); } },
    pgItem: t => formItem(t.dataset.id || null, t.dataset.colab || null),
    pgPagar: t => formPagar(t.dataset.id),
    pgRecibo: async t => { const w = window.open('', '_blank'); try { const { abrirPdf } = await import('./docs.js'); const p = await reciboPdf(t.dataset.id); abrirPdf(p.bytes, p.nombre.replace(/\.pdf$/, ''), w); } catch (err) { if (w) w.close(); toast(err.message); } },
    pgReciboMail: async t => {
      let p; try { toast('Preparando el PDF…'); p = await reciboPdf(t.dataset.id); } catch (err) { toast(err.message); return; }
      const E = await import('./emails.js'), nom = p.c.nombre.split(' ')[0];
      k.openComposer({ titulo: 'Enviar comprobante', eyebrow: p.c.nombre + ' · ' + p.periodo, tipo: 'Otro', cliente: null, para: p.c.email, asunto: 'Comprobante de pago · ' + p.periodo,
        adjuntos: [{ nombre: p.nombre, base64: p.base64, bytes: p.bytes }],
        mensaje: 'Hola ' + nom + ', ¿cómo estás?\n\nTe mandamos adjunto el comprobante de ' + p.periodo + '.\n\nCualquier cosa, avisanos.',
        build: v => E.libreEmail({ cfg: k.cfgMarca(), contacto: p.c.nombre, cuenta: p.c.nombre, titulo: 'Comprobante de ' + p.periodo, mensaje: v.mensaje, firma: k.firma(), asunto: v.asunto }) });
    },
    pgAumento: () => formAumento(),
    pgGenerar: async () => {
      const m = AD.pg.mes, rows = faltantes(m).map(p => ({ ...p, periodo: m + '-01' }));
      if (!rows.length) { toast('No falta nada'); return; }
      try { await data.insMany('liquidaciones', rows); toast(rows.length + ' pagos calculados'); await ctx.reload(); } catch (err) { toast(err.message); }
    },
  };
  document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.pgk) { AD.pg[t.dataset.pgk] = t.type === 'checkbox' ? t.checked : t.value; ctx.render(); } });

  // Para el asistente y la Caja
  const colabPorNombre = nombre => { const n = norm((nombre || '').trim()); return n ? AD.CO.find(c => norm(c.nombre) === n || (c.otros_nombres || []).some(o => norm(o) === n)) : null; };
  return { actions, view: vPagos, faltantes, liqMes, colabPorNombre };
}
