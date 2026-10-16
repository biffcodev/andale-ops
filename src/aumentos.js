// Aumentos por lote, para sueldos (Equipo) y para honorarios fijos (Proveedores). Solo administradores.
// Se elige a quiénes, el aumento (en % o en $, sobre el básico: los extras no cambian) y desde qué mes; se ve la vista previa
// fila por fila (con el % de cada una editable) y al confirmar queda un "lote". Cada lote agrega un monto nuevo por persona
// en remuneraciones (desde ese mes); el anterior queda cerrado solo. Se puede editar o deshacer hasta que empieza su mes.
import * as data from './data.js';
import { confirmar } from './dialogo.js';

export function initAumentos(ctx, k, h) {
  const { S, esc, fmt, monthLabel, thisMonth, addMonth, cmp, norm, emptyBox, toast } = ctx;
  const { AD, money, multi, add, r2, parseMonto, cap } = k;
  const { colab, esProv, pctTxt } = h;
  const nuevoEstado = () => ({ sel: new Set(), modo: 'porcentaje', valor: '', desde: addMonth(thisMonth(), 1), motivo: '', pctPor: {}, q: '', edit: null });
  AD.au = AD.au || { sueldos: nuevoEstado(), proveedores: nuevoEstado() };
  const st = a => AD.au[a];
  const MODOS = [['porcentaje', 'En %'], ['suma', 'En $']];
  const quien = id => ((S.E || []).find(e => e._id === id) || {}).persona || '';
  const loteDe = id => (AD.LA || []).find(l => l.id === id) || null;
  const filasLote = id => AD.RM.filter(r => r.lote_id === id);
  const fijo = l => l.desde <= thisMonth();
  const pctN = n => n == null ? '' : String(Math.round(n * 100) / 100).replace('.', ',');

  /* ---------- cálculo ---------- */
  // El monto sobre el que se aumenta: el último antes del mes del lote (sin contar las filas del lote que se está editando).
  function base(c, s) {
    const rows = AD.RM.filter(r => r.colaborador_id === c.id && (!s.edit || r.lote_id !== s.edit));
    if (!rows.length) return { sin: true };
    const concepto = rows.slice().sort((a, b) => b.desde.localeCompare(a.desde))[0].concepto;
    const choque = rows.find(r => r.concepto === concepto && r.desde === s.desde);
    const prev = rows.filter(r => r.concepto === concepto && r.desde < s.desde).sort((a, b) => b.desde.localeCompare(a.desde))[0];
    if (!prev) return { sin: true, concepto };
    return { r: prev, concepto, choque };
  }
  const ultimo = c => {
    const todos = AD.RM.filter(r => r.colaborador_id === c.id).sort((a, b) => b.desde.localeCompare(a.desde));
    const fut = todos.filter(r => r.desde > thisMonth()).pop(), prog = fut && todos.some(x => x.concepto === fut.concepto && x.desde < fut.desde) ? ' · programado ' + fmt(fut.desde) : '';
    const rs = todos.filter(r => r.desde <= thisMonth()); if (!rs.length) return todos.length ? fmt(todos[todos.length - 1].desde) + ' · inicial' : '—';
    return ultimoDe(rs) + prog;
  };
  const ultimoDe = rs => {
    const conAum = rs.find(r => r.lote_id || r.pct != null || rs.some(x => x.concepto === r.concepto && x.desde < r.desde));
    if (!conAum) return rs.length ? fmt(rs[rs.length - 1].desde) + ' · inicial' : '—';
    const ant = rs.filter(x => x.concepto === conAum.concepto && x.desde < conAum.desde)[0];
    const p = conAum.pct != null ? conAum.pct : (ant && ant.monto ? (conAum.monto / ant.monto - 1) * 100 : null);
    return fmt(conAum.desde) + (p != null ? ' · ' + pctTxt(Math.round(p * 10) / 10) : '') + (conAum.motivo ? ' · ' + conAum.motivo : '');
  };
  // Último monto cargado de cada uno y el primer mes en que puede regir un aumento (el siguiente a ese).
  const ultimaFila = c => AD.RM.filter(r => r.colaborador_id === c.id).sort((a, b) => b.desde.localeCompare(a.desde))[0] || null;
  const puedeDesde = c => { const u = ultimaFila(c); const sig = addMonth(thisMonth(), 1); return u && addMonth(u.desde, 1) > sig ? addMonth(u.desde, 1) : sig; };
  function sugerido(a) {
    const cs = candidatos(a).filter(ultimaFila); if (!cs.length) return addMonth(thisMonth(), 1);
    return cs.map(puedeDesde).sort()[0];
  }
  function calc(c, s) {
    const b = base(c, s); if (!b.r) return { b };
    const v = parseMonto(s.valor), propio = s.pctPor[c.id] != null && s.pctPor[c.id] !== '' ? parseMonto(s.pctPor[c.id]) : null;
    let nuevo = null;
    if (propio != null) nuevo = b.r.monto * (1 + propio / 100);
    else if (v != null) nuevo = s.modo === 'porcentaje' ? b.r.monto * (1 + v / 100) : s.modo === 'suma' ? b.r.monto + v : v;
    if (nuevo == null) return { b };
    nuevo = r2(nuevo); // siempre el valor exacto, sin redondeo
    const pct = b.r.monto ? Math.round((nuevo / b.r.monto - 1) * 10000) / 100 : null;
    return { b, nuevo, dif: r2(nuevo - b.r.monto), pct, propio: propio != null };
  }
  const candidatos = a => AD.CO.filter(c => c.activo && esProv(c) === (a === 'proveedores'))
    .filter(c => a === 'sueldos' || AD.RM.some(r => r.colaborador_id === c.id))
    .sort((x, y) => (a === 'sueldos' ? (x.tipo === 'Socio') - (y.tipo === 'Socio') : cmp(x.rubro, y.rubro)) || cmp(x.nombre, y.nombre));
  const grupoDe = (a, c) => a === 'sueldos' ? (c.tipo === 'Socio' ? 'Socios' : 'Empleados') : (c.rubro || 'Sin rubro');

  /* ---------- vista ---------- */
  function vista(a) {
    const s = st(a), cs = candidatos(a), q = norm(s.q);
    if (!s.desdeTocado && !s.edit) s.desde = sugerido(a);
    const grupos = [...new Set(cs.map(c => grupoDe(a, c)))];
    const vis = cs.filter(c => !q || norm(c.nombre).includes(q));
    const eligibles = cs.filter(c => { const b = base(c, s); return b.r && !b.choque; });
    [...s.sel].forEach(id => { if (!eligibles.some(c => c.id === id)) s.sel.delete(id); });
    const filas = vis.map(c => {
      const x = calc(c, s), b = x.b, on = s.sel.has(c.id), ok = b.r && !b.choque;
      const tipo = a === 'sueldos' ? c.tipo + (c.vinculo ? ' · ' + c.vinculo : '') : (c.rubro || 'Proveedor');
      const pctVal = s.pctPor[c.id] != null ? s.pctPor[c.id] : (x.pct != null ? pctN(x.pct) : '');
      return '<tr class="' + (on ? '' : 'lt-off') + '"><td><input type="checkbox" data-ausel="' + esc(c.id) + '" data-au-a="' + a + '"' + (on ? ' checked' : '') + (ok ? '' : ' disabled') + ' aria-label="Elegir a ' + esc(c.nombre) + '"></td>' +
        '<td><b>' + esc(c.nombre) + '</b><span class="sub">' + esc(tipo) + '</span></td>' +
        '<td class="r">' + (b.r ? '<span class="money">' + money(b.r.monto, b.r.moneda) + '</span><span class="sub">' + esc(b.r.moneda) + ' · ' + esc(b.concepto) + '</span>' : ultimaFila(c) ? '<span class="money">' + money(ultimaFila(c).monto, ultimaFila(c).moneda) + '</span><span class="sub">arranca ' + esc(fmt(ultimaFila(c).desde)) + '</span>' : '<span class="muted">' + (a === 'sueldos' ? 'sin sueldo cargado' : 'por trabajo') + '</span>') + '</td>' +
        '<td>' + esc(ultimo(c)) + '</td>' +
        '<td class="r">' + (!ok && ultimaFila(c) ? '<span class="muted" title="Un aumento rige después de que arranca el monto actual">desde ' + esc(fmt(puedeDesde(c))) + '</span>' : on ? '<input class="lt-pin' + (x.propio ? ' mod' : '') + '" id="au-pct-' + esc(c.id) + '" data-aupct="' + esc(c.id) + '" data-au-a="' + a + '" inputmode="decimal" data-nofmt value="' + esc(pctVal) + '" aria-label="Porcentaje para ' + esc(c.nombre) + '">' : '—') + '</td>' +
        '<td class="r">' + (on && x.nuevo != null ? '<b class="money">' + money(x.nuevo, b.r.moneda) + '</b>' : '<span class="muted">' + (on ? '—' : 'no cambia') + '</span>') + '</td>' +
        '<td class="r">' + (on && x.nuevo != null ? '<span class="lt-dif">' + (x.dif >= 0 ? '+' : '−') + esc(money(Math.abs(x.dif), b.r.moneda)) + '</span>' : '—') + '</td></tr>';
    }).join('');
    const sel = cs.filter(c => s.sel.has(c.id)).map(c => ({ c, x: calc(c, s) })).filter(o => o.x.nuevo != null);
    const antes = {}, despues = {}, dif = {}; sel.forEach(o => { add(antes, o.x.b.r.moneda, o.x.b.r.monto); add(despues, o.x.b.r.moneda, o.x.nuevo); add(dif, o.x.b.r.moneda, o.x.dif); });
    const tA = Object.values(antes).reduce((p, v) => p + v, 0), tD = Object.values(despues).reduce((p, v) => p + v, 0);
    const editando = s.edit && loteDe(s.edit);
    const sug = sugerido(a);
    let out = (!eligibles.length && cs.some(ultimaFila) ? '<section class="callout"><p><b>Nadie puede tener un aumento desde ' + esc(monthLabel(s.desde)) + '.</b> Un aumento rige después de que arranca el monto actual' + (sug !== s.desde ? ': el primer mes posible es ' + esc(monthLabel(sug)) + '.' : '.') + '</p>' + (sug !== s.desde ? '<button class="btn primary" data-act="auSet" data-a="' + a + '" data-k="desde" data-v="' + sug + '">Usar ' + esc(monthLabel(sug)) + '</button>' : '') + '</section>' : '') + (editando ? '<section class="callout"><p><b>Editando el lote desde ' + esc(fmt(editando.desde)) + '</b>' + (editando.motivo ? ' · ' + esc(editando.motivo) : '') + '. Al guardar se reemplaza por lo que ves acá.</p><button class="btn" data-act="auCancelar" data-a="' + a + '">Cancelar edición</button></section>' : '') +
      '<div class="lt-lay"><section class="sheet lt-tab"><div class="lt-sel"><div class="lt-chips">' +
      '<button class="lt-chip" data-act="auSel" data-a="' + a + '" data-g="*">Todos</button><button class="lt-chip" data-act="auSel" data-a="' + a + '" data-g="">Ninguno</button>' +
      grupos.map(g => '<button class="lt-chip' + (eligibles.filter(c => grupoDe(a, c) === g).length && eligibles.filter(c => grupoDe(a, c) === g).every(c => s.sel.has(c.id)) ? ' on' : '') + '" data-act="auSel" data-a="' + a + '" data-g="' + esc(g) + '">' + esc(g) + '</button>').join('') +
      '</div><input class="in" type="search" id="au-q-' + a + '" data-auk="q" data-au-a="' + a + '" placeholder="Buscar por nombre" value="' + esc(s.q) + '"></div>' +
      (filas ? '<div class="tbl"><table class="lt-t"><thead><tr><th></th><th>' + (a === 'sueldos' ? 'Persona' : 'Proveedor') + '</th><th class="r">Hoy</th><th>Último aumento</th><th class="r">%</th><th class="r">Nuevo</th><th class="r">Diferencia</th></tr></thead><tbody>' + filas + '</tbody></table></div>'
        : emptyBox(a === 'sueldos' ? 'No hay nadie con sueldo cargado' : 'No hay proveedores con honorario fijo', a === 'sueldos' ? 'Cargá el sueldo en la ficha de cada persona.' : 'Los que cobran por trabajo no tienen un monto para aumentar.')) +
      '<div class="lt-tot"><span>Elegidos: ' + sel.length + ' de ' + eligibles.length + ' · impacto mensual del lote' + (sel.length ? '<small>' + esc(multi(antes)) + ' → ' + esc(multi(despues)) + (tA ? ' · ' + pctTxt(Math.round((tD / tA - 1) * 1000) / 10) + ' promedio' : '') + '</small>' : '') + '</span><b>' + (sel.length ? '+' + esc(multi(dif)) + ' por mes' : '—') + '</b></div></section>' +
      '<aside class="sheet lt-form"><h3>El aumento</h3>' +
      '<div class="lt-f"><span class="lbl">Cómo</span><div class="seg" role="group" aria-label="Cómo">' + MODOS.map(([kk, l]) => '<button data-act="auSet" data-a="' + a + '" data-k="modo" data-v="' + kk + '" aria-pressed="' + (s.modo === kk) + '">' + l + '</button>').join('') + '</div></div>' +
      '<div class="lt-f"><label class="lbl" for="au-valor-' + a + '">' + (s.modo === 'porcentaje' ? 'Aumento en %' : 'Aumento en $ (se suma al básico)') + '</label><input class="in" id="au-valor-' + a + '" data-auk="valor" data-au-a="' + a + '" inputmode="decimal"' + (s.modo === 'porcentaje' ? ' data-nofmt' : '') + ' value="' + esc(s.valor) + '" placeholder="' + (s.modo === 'porcentaje' ? '10' : '50000') + '"></div>' +
      '<div class="lt-f"><label class="lbl" for="au-desde-' + a + '">Desde qué mes rige</label><input class="in" type="month" id="au-desde-' + a + '" data-auk="desde" data-au-a="' + a + '" min="' + thisMonth() + '" value="' + esc(s.desde) + '"></div>' +
      '<div class="lt-f"><label class="lbl" for="au-mot-' + a + '">Motivo (opcional)</label><input class="in" id="au-mot-' + a + '" data-auk="motivo" data-au-a="' + a + '" value="' + esc(s.motivo) + '" placeholder="Paritaria diciembre"></div>' +
      '<p class="hint">Se aplica sobre el básico; los extras no cambian. El % de cada fila se puede cambiar en la tabla (en naranja, el que es distinto al general).</p>' +
      '<button class="btn primary lt-ok" data-act="auOk" data-a="' + a + '"' + (sel.length ? '' : ' disabled') + '>' + (editando ? 'Guardar cambios del lote' : 'Confirmar lote · ' + (sel.length === 1 ? '1 persona' : sel.length + ' ' + (a === 'sueldos' ? 'personas' : 'proveedores'))) + '</button></aside></div>';
    // Lotes aplicados
    const lotes = (AD.LA || []).filter(l => l.ambito === a).sort((x, y) => y.desde.localeCompare(x.desde) || String(y.created_at).localeCompare(String(x.created_at)));
    out += '<section class="sheet"><div class="sheet-h"><h2>Lotes aplicados</h2><span class="muted">Se pueden editar o deshacer hasta que empieza su mes</span></div>' +
      (lotes.length ? '<div class="lt-lotes">' + lotes.map(l => {
        const rs = filasLote(l.id), d = {}; rs.forEach(r => add(d, r.moneda, r.monto - (r.monto_anterior || 0)));
        const nombres = rs.map(r => (colab(r.colaborador_id) || {}).nombre || '?');
        const distintos = l.modo === 'porcentaje' ? rs.filter(r => r.pct != null && Math.abs(r.pct - l.valor) > 0.01).map(r => ((colab(r.colaborador_id) || {}).nombre || '').split(' ')[0] + ' ' + pctTxt(r.pct)) : [];
        const como = l.modo === 'porcentaje' ? pctTxt(l.valor) : l.modo === 'suma' ? '+' + money(l.valor, (rs[0] || {}).moneda || 'ARS') : 'monto nuevo ' + money(l.valor, (rs[0] || {}).moneda || 'ARS');
        return '<div class="lt-lote"><span><b>Desde ' + esc(fmt(l.desde)) + '</b><small>aplicado ' + esc(fmt(String(l.created_at).slice(0, 10))) + '</small></span>' +
          '<span>' + esc(l.motivo || 'Sin motivo') + ' · <b>' + (rs.length === 1 ? '1 persona' : rs.length + ' personas') + '</b> · ' + esc(como) + (distintos.length ? ' (' + esc(distintos.join(', ')) + ')' : '') + ' · <b>+' + esc(multi(d)) + ' por mes</b>' +
          '<small>' + esc([quien(l.creado_por) ? 'por ' + quien(l.creado_por) : '', nombres.join(', ')].filter(Boolean).join(' · ')) + '</small></span>' +
          '<span class="lt-acc">' + (fijo(l) ? '<span class="lt-b fijo">Fijo · ya rige</span>' : '<span class="lt-b prog">Programado</span><button class="btn sm" data-act="auEdit" data-a="' + a + '" data-id="' + esc(l.id) + '">Editar</button><button class="btn sm ghost" data-act="auDel" data-id="' + esc(l.id) + '">Deshacer</button>') + '</span></div>';
      }).join('') + '</div>' : '<div class="sheet-b"><span class="muted">Todavía no se aplicó ningún lote.</span></div>') + '</section>';
    return out;
  }

  /* ---------- guardar ---------- */
  async function aplicar(a) {
    const s = st(a), cs = candidatos(a).filter(c => s.sel.has(c.id)), filas = cs.map(c => ({ c, x: calc(c, s) })).filter(o => o.x.nuevo != null && o.x.b.r && !o.x.b.choque);
    if (!filas.length) { toast('Elegí a quiénes y poné el aumento'); return; }
    if (!/^\d{4}-\d{2}$/.test(s.desde) || s.desde < thisMonth()) { toast('Elegí desde qué mes rige (este mes o uno que viene)'); return; }
    const valor = parseMonto(s.valor) ?? 0, dif = {}; filas.forEach(o => add(dif, o.x.b.r.moneda, o.x.dif));
    const ok = await confirmar((s.edit ? 'Se reemplaza el lote por estos montos: ' : '') + filas.length + (filas.length === 1 ? ' persona' : ' personas') + ' desde ' + monthLabel(s.desde) + ', +' + multi(dif) + ' por mes.' + (s.desde === thisMonth() ? '\n\nRige desde este mes: después no se va a poder editar ni deshacer.' : '\n\nSe puede editar o deshacer hasta que empiece ' + monthLabel(s.desde) + '.'),
      { titulo: s.edit ? '¿Guardar los cambios del lote?' : '¿Aplicar el aumento?', ok: s.edit ? 'Guardar' : 'Aplicar' });
    if (!ok) return;
    const loteRow = { ambito: a, desde: s.desde + '-01', modo: s.modo, valor, redondeo: 0, motivo: s.motivo.trim() };
    let lid = s.edit;
    try {
      if (lid) { await data.upd('lotes_aumento', lid, loteRow); for (const r of filasLote(lid)) await data.del('remuneraciones', r.id); }
      else lid = (await data.ins('lotes_aumento', { ...loteRow, creado_por: (S.me && S.me.id) || null })).id;
      const rows = filas.map(o => ({ colaborador_id: o.c.id, concepto: o.x.b.concepto, desde: s.desde + '-01', monto: o.x.nuevo, moneda: o.x.b.r.moneda, motivo: s.motivo.trim() || ('Aumento ' + pctTxt(o.x.pct)), lote_id: lid, monto_anterior: o.x.b.r.monto, pct: o.x.pct }));
      try { await data.insMany('remuneraciones', rows); }
      catch (e) { if (!s.edit) await data.del('lotes_aumento', lid).catch(() => {}); throw e; }
      toast((s.edit ? 'Lote actualizado: ' : 'Lote aplicado: ') + (filas.length === 1 ? '1 persona' : filas.length + ' personas'));
      AD.au[a] = { ...nuevoEstado(), desde: s.desde, desdeTocado: true };
      await ctx.reload();
    } catch (e) { toast(/candado|ya rige|lote/i.test(e.message || '') ? e.message : 'No se pudo guardar: ' + e.message); }
  }
  function editar(a, id) {
    const l = loteDe(id); if (!l || fijo(l)) { toast('Ese lote ya rige: corregilo con otro lote'); return; }
    const rs = filasLote(id), s = { ...nuevoEstado(), modo: l.modo, valor: l.modo === 'porcentaje' ? pctN(l.valor) : String(l.valor).replace('.', ','), desde: l.desde, motivo: l.motivo || '', edit: id };
    rs.forEach(r => { s.sel.add(r.colaborador_id); });
    AD.au[a] = s;
    rs.forEach(r => { const c = colab(r.colaborador_id); if (!c) return; const x = calc(c, s); if (x.nuevo != null && Math.abs(x.nuevo - r.monto) > 0.01 && r.pct != null) s.pctPor[c.id] = pctN(r.pct); });
    ctx.render(); window.scrollTo(0, 0);
  }

  /* ---------- línea de tiempo (ficha) ---------- */
  function timeline(c) {
    const rs = AD.RM.filter(r => r.colaborador_id === c.id).sort((a, b) => b.desde.localeCompare(a.desde) || cmp(a.concepto, b.concepto)), hoy = thisMonth();
    if (!rs.length) return '<span class="muted">Nada cargado.</span>';
    return '<div class="lt-tl">' + rs.map(r => {
      const sig = rs.filter(x => x.concepto === r.concepto && x.desde > r.desde).sort((a, b) => a.desde.localeCompare(b.desde))[0];
      const hasta = sig ? addMonth(sig.desde, -1) : '';
      const ant = rs.filter(x => x.concepto === r.concepto && x.desde < r.desde)[0];
      const p = r.pct != null ? r.pct : (ant && ant.monto && ant.moneda === r.moneda ? Math.round((r.monto / ant.monto - 1) * 1000) / 10 : null);
      const est = r.desde > hoy ? 'prog' : (!hasta || hasta >= hoy) ? 'hoy' : 'ant';
      const l = r.lote_id ? loteDe(r.lote_id) : null;
      const editable = !r.lote_id || r.desde > hoy;
      const det = l ? 'Lote “' + (l.motivo || 'sin motivo') + '”' + (quien(l.creado_por) ? ' · por ' + quien(l.creado_por) : '') + (est === 'prog' ? ' · se puede editar o deshacer hasta el ' + fmt(addMonth(r.desde, 0)) : '') : (ant ? (r.motivo || 'Cambio') : 'Carga inicial' + (r.motivo && !/^inicial$/i.test(r.motivo) ? ' · ' + r.motivo : ''));
      return '<div class="lt-tli ' + est + (ant ? '' : ' ini') + '"' + (editable ? ' data-act="pgRemEdit" data-id="' + esc(r.id) + '" title="' + (r.lote_id ? 'Editar el lote' : 'Corregir') + '" style="cursor:pointer"' : ' title="Ya rige: se corrige con otro lote"') + '>' +
        '<span class="lt-tm">' + esc(fmt(r.desde)) + (hasta ? ' → ' + esc(fmt(hasta)) : ' en adelante') + '</span>' + (est === 'prog' ? '<span class="lt-b prog">programado</span>' : est === 'hoy' ? '<span class="lt-b hoy">rige hoy</span>' : '') +
        '<div><b class="money">' + money(r.monto, r.moneda) + '</b>' + (p != null && ant ? '<span class="lt-pc">' + esc(pctTxt(Math.round(p * 10) / 10)) + '</span>' : '') + (r.concepto !== 'Sueldo' ? ' <span class="muted" style="font-size:12px">' + esc(r.concepto) + '</span>' : '') + '</div>' +
        '<small>' + esc(det) + '</small>' +
        (editable && !r.lote_id ? '<button type="button" class="btn ghost sm lt-x" data-act="pgRemDel" data-id="' + esc(r.id) + '" aria-label="Borrar">✕</button>' : '') + '</div>';
    }).join('') + '</div>';
  }

  /* ---------- eventos ---------- */
  const actions = {
    auSel: t => { const a = t.dataset.a, s = st(a), g = t.dataset.g; const el = candidatos(a).filter(c => { const b = base(c, s); return b.r && !b.choque; });
      if (g === '*') el.forEach(c => s.sel.add(c.id)); else if (g === '') s.sel.clear(); else { const del = el.filter(c => grupoDe(a, c) === g); const todos = del.every(c => s.sel.has(c.id)); del.forEach(c => todos ? s.sel.delete(c.id) : s.sel.add(c.id)); }
      ctx.render(); },
    auSet: t => { const s = st(t.dataset.a); s[t.dataset.k] = t.dataset.v; if (t.dataset.k === 'desde') s.desdeTocado = true; if (t.dataset.k === 'modo') s.valor = ''; ctx.render(); },
    auOk: t => aplicar(t.dataset.a),
    auEdit: t => editar(t.dataset.a, t.dataset.id),
    auCancelar: t => { AD.au[t.dataset.a] = nuevoEstado(); ctx.render(); },
    auDel: async t => {
      const l = loteDe(t.dataset.id); if (!l) return;
      const n = filasLote(l.id).length;
      if (!(await confirmar('Se borran los ' + (n === 1 ? 'montos de 1 persona' : 'montos de ' + n + ' personas') + ' desde ' + monthLabel(l.desde) + ' y vuelve a regir el anterior.', { titulo: '¿Deshacer el lote?', ok: 'Deshacer', tipo: 'peligro' }))) return;
      try { await data.del('lotes_aumento', l.id); toast('Lote deshecho'); await ctx.reload(); } catch (e) { toast(e.message); }
    },
  };
  const onInput = e => {
    const t = e.target; if (!t || !t.dataset) return;
    if (t.dataset.ausel) { const s = st(t.dataset.auA); if (t.checked) s.sel.add(t.dataset.ausel); else s.sel.delete(t.dataset.ausel); ctx.render(); return; }
    if (t.dataset.aupct) { const s = st(t.dataset.auA); s.pctPor[t.dataset.aupct] = t.value; if (e.type === 'change' || t.value === '') ctx.render(); else { clearTimeout(onInput.tm); onInput.tm = setTimeout(ctx.render, 350); } return; }
    if (t.dataset.auk) { const s = st(t.dataset.auA); s[t.dataset.auk] = t.value; if (t.dataset.auk === 'desde') s.desdeTocado = true; if (t.dataset.auk !== 'motivo') { clearTimeout(onInput.tm); onInput.tm = setTimeout(ctx.render, t.dataset.auk === 'q' ? 150 : 350); } }
  };
  document.addEventListener('input', onInput); document.addEventListener('change', e => { if (e.target && e.target.dataset && e.target.dataset.ausel) return; if (e.target && e.target.dataset && (e.target.dataset.aupct || e.target.dataset.auk === 'desde')) onInput(e); });
  return { vista, actions, timeline, editar, loteDe };
}
