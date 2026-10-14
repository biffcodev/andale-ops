// Estadísticas (solo admins): cómo viene el año con los números de Caja, cobranza y operación.
// Gráficos en SVG propio: columnas con base común, barras horizontales y mini tendencias. Sin librerías.

const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
// Cuentas que no son operación: saldo inicial, compra/venta de divisas, retiros y aportes de socios.
const NO_OPERATIVAS = new Set(['Saldo Inicial', 'Ingresos en Pesos', 'Ingresos en USD', 'Egreso en Pesos', 'Egreso en USD', 'Inversiones']);
const ABONO_SUB = new Set(['S.Redes sociales', 'S.Redes Ads']);
const limpiaSub = s => String(s || 'Sin subcuenta').replace(/^S\./, '');

export function initStats(ctx, k) {
  const { S, esc, opt, cap, thisMonth, emptyBox, $ } = { ...ctx, cap: k.cap };
  const { AD, money, add, multi } = k;
  AD.st = { anio: String(new Date().getFullYear()), mon: 'ARS' };

  const compact = (n, cur) => {
    const sym = cur === 'USD' ? 'US$' : cur === 'EUR' ? '€' : '$';
    const a = Math.abs(n), sg = n < 0 ? '−' : '';
    const t = a >= 1e6 ? (a / 1e6).toLocaleString('es-AR', { maximumFractionDigits: a >= 1e8 ? 0 : 1 }) + ' M' : a >= 1e3 ? Math.round(a / 1e3).toLocaleString('es-AR') + ' k' : Math.round(a).toLocaleString('es-AR');
    return sg + sym + ' ' + t;
  };
  const niceMax = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
  const tip = (t, l) => ' data-tip="' + esc(t) + '" data-tip2="' + esc(l || '') + '"';

  /* ---------- datos ---------- */
  function base() {
    const y = AD.st.anio, mon = AD.st.mon;
    const mv = AD.MV.filter(v => (v.fecha || '').startsWith(y) && v.moneda === mon && !NO_OPERATIVAS.has(v.cuenta));
    const ing = mv.filter(v => v.ingreso > 0 && /^Venta/.test(v.cuenta)), eg = mv.filter(v => v.egreso > 0);
    const porMes = (xs, f) => MES.map((_, i) => xs.filter(v => +v.fecha.slice(5, 7) === i + 1).reduce((a, v) => a + f(v), 0));
    const ultimo = AD.st.anio === thisMonth().slice(0, 4) ? +thisMonth().slice(5, 7) : 12;
    return { y, mon, ing, eg, ultimo,
      ingMes: porMes(ing, v => v.ingreso).slice(0, ultimo), egMes: porMes(eg, v => v.egreso).slice(0, ultimo),
      aboMes: porMes(ing.filter(v => ABONO_SUB.has(v.subcuenta)), v => v.ingreso).slice(0, ultimo),
      proMes: porMes(ing.filter(v => !ABONO_SUB.has(v.subcuenta)), v => v.ingreso).slice(0, ultimo),
      labMes: porMes(eg.filter(v => v.cuenta === 'Costo Laboral'), v => v.egreso).slice(0, ultimo) };
  }
  const sum = a => a.reduce((x, y) => x + y, 0);
  function agrupar(xs, key, val) { const m = new Map(); xs.forEach(v => { const kk = key(v); m.set(kk, (m.get(kk) || 0) + val(v)); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); }

  /* ---------- piezas de gráfico ---------- */
  function spark(vals, color) {
    if (vals.length < 2) return '';
    const w = 120, h = 30, mx = Math.max(...vals, 1), st = w / (vals.length - 1);
    const pts = vals.map((v, i) => (i * st).toFixed(1) + ',' + (h - 3 - (v / mx) * (h - 6)).toFixed(1));
    const last = pts[pts.length - 1].split(',');
    return '<svg class="spark" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" aria-hidden="true"><polyline points="' + pts.join(' ') + '" fill="none" stroke="var(--muted)" stroke-opacity=".45" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/><circle cx="' + last[0] + '" cy="' + last[1] + '" r="4" fill="' + color + '" stroke="var(--surface)" stroke-width="2"/></svg>';
  }
  function tile(label, valor, sub, vals, color, cls) {
    return '<div class="kpi' + (cls ? ' ' + cls : '') + '" style="--k:' + color + '"><span class="eyebrow">' + esc(label) + '</span><b style="font-size:28px">' + esc(valor) + '</b><span>' + sub + '</span>' + (vals ? spark(vals, color) : '') + '</div>';
  }
  // Columnas por mes; agrupadas o apiladas. Una sola escala.
  function columnas(series, n, { apilado = false, mon = 'ARS', W = 720 } = {}) {
    const H = 250, L = 56, R = 8, T = 14, B = 26, iw = W - L - R, ih = H - T - B;
    const tot = i => apilado ? sum(series.map(s => s.v[i] || 0)) : Math.max(...series.map(s => s.v[i] || 0));
    const mx = niceMax(Math.max(...Array.from({ length: n }, (_, i) => tot(i)), 1));
    const band = iw / Math.max(n, 1), bw = apilado ? Math.min(24, band * 0.55) : Math.min(22, (band * 0.7 - 2) / series.length);
    const y = v => T + ih - (v / mx) * ih;
    let g = '';
    for (let t = 0; t <= 4; t++) { const v = mx * t / 4, yy = y(v).toFixed(1); g += '<line class="' + (t ? 'gl' : 'bl') + '" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text class="ax" x="' + (L - 8) + '" y="' + (+yy + 4) + '" text-anchor="end">' + esc(compact(v, mon).replace(/^\$ /, '')) + '</text>'; }
    const bar = (x, y0, y1, color, round, t1, t2) => {
      const h = Math.max(0, y0 - y1); if (h <= 0.5) return '';
      const r = round ? Math.min(4, h, bw / 2) : 0;
      const d = 'M' + x + ',' + y0 + 'V' + (y1 + r) + (r ? 'Q' + x + ',' + y1 + ' ' + (x + r) + ',' + y1 + 'H' + (x + bw - r) + 'Q' + (x + bw) + ',' + y1 + ' ' + (x + bw) + ',' + (y1 + r) : 'H' + (x + bw)) + 'V' + y0 + 'Z';
      return '<path class="m" d="' + d + '" fill="' + color + '"' + tip(t1, t2) + '/>';
    };
    for (let i = 0; i < n; i++) {
      const cx = L + band * i + band / 2;
      if (apilado) {
        let acc = 0; const x = cx - bw / 2;
        series.forEach((s, si) => { const v = s.v[i] || 0; if (!v) return; const y0 = y(acc) - (acc ? 2 : 0), y1 = y(acc + v); acc += v; g += bar(+x.toFixed(1), +y0.toFixed(1), +y1.toFixed(1), s.c, si === series.length - 1 || !series.slice(si + 1).some(z => z.v[i]), MES[i] + ' · ' + s.n, compact(v, mon) + ' (' + Math.round(v / tot(i) * 100) + '%)'); });
      } else {
        const gw = series.length * bw + (series.length - 1) * 2;
        series.forEach((s, si) => { const v = s.v[i] || 0; const x = cx - gw / 2 + si * (bw + 2); g += bar(+x.toFixed(1), y(0), +y(v).toFixed(1), s.c, true, MES[i] + ' · ' + s.n, money(v, mon)); });
      }
      g += '<text class="ax" x="' + cx.toFixed(1) + '" y="' + (H - 6) + '" text-anchor="middle">' + MES[i] + '</text>';
    }
    return '<div class="legend">' + series.map(s => '<span><i style="--c:' + s.c + '"></i>' + esc(s.n) + '</span>').join('') + '</div><div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(series.map(s => s.n).join(' y ') + ' por mes') + '">' + g + '</svg></div>';
  }
  function hbars(rows, color, mon, extra) {
    if (!rows.length) return emptyBox('Sin datos para este año', '');
    const mx = Math.max(...rows.map(r => r[1]), 1), tot = sum(rows.map(r => r[1]));
    return '<div class="hbars">' + rows.map(([l, v]) => '<div class="hb"' + tip(l, money(v, mon) + ' · ' + Math.round(v / tot * 100) + '% del total') + '><span class="lab">' + esc(l) + '</span><span class="tr"><i style="width:' + (v / mx * 100).toFixed(1) + '%;--c:' + color + '"></i></span><span class="v">' + esc(compact(v, mon)) + '<small>' + Math.round(v / tot * 100) + '%</small></span></div>').join('') + (extra || '') + '</div>';
  }
  const top = (rows, n) => rows.length > n ? [...rows.slice(0, n - 1), ['Otros (' + (rows.length - n + 1) + ')', sum(rows.slice(n - 1).map(r => r[1]))]] : rows;

  /* ---------- vista ---------- */
  function vStats() {
    const st = AD.st, b = base(), C1 = 'var(--c1)', C2 = 'var(--c2)', C3 = 'var(--c3)';
    const anios = [...new Set([...AD.MV.map(v => (v.fecha || '').slice(0, 4)), st.anio])].filter(Boolean).sort().reverse();
    const ti = sum(b.ingMes), te = sum(b.egMes), res = ti - te, lab = sum(b.labMes), meses = Math.max(b.ultimo, 1);
    const sinMov = !b.ing.length && !b.eg.length;
    let h = '<div class="head"><div><h1>Estadísticas</h1><p>Cómo viene ' + esc(st.anio) + ' según Caja: lo que entra, lo que sale y de dónde viene.</p></div>' +
      '<div class="toolbar"><div class="seg" role="group" aria-label="Moneda">' + ['ARS', 'USD'].map(m => '<button data-act="stMon" data-v="' + m + '" aria-pressed="' + (st.mon === m) + '">' + (m === 'ARS' ? 'Pesos' : 'Dólares') + '</button>').join('') + '</div><select class="in" data-stk="anio" aria-label="Año">' + anios.map(a => opt(a, a, st.anio)).join('') + '</select></div></div>';
    if (sinMov) return h + '<section class="sheet">' + emptyBox('Sin movimientos en ' + (st.mon === 'ARS' ? 'pesos' : 'dólares') + ' para ' + st.anio, 'Probá con la otra moneda u otro año.') + '</section>';
    h += '<section class="hero">' +
      tile('Ingresos', compact(ti, st.mon), 'promedio ' + esc(compact(ti / meses, st.mon)) + ' por mes', b.ingMes, C1) +
      tile('Egresos', compact(te, st.mon), 'promedio ' + esc(compact(te / meses, st.mon)) + ' por mes', b.egMes, C2) +
      tile('Resultado', compact(res, st.mon), ti ? Math.round(res / ti * 100) + '% de lo que entra' : '—', b.ingMes.map((v, i) => v - b.egMes[i]), res >= 0 ? 'var(--ok)' : 'var(--crit)', res < 0 ? 'alert' : '') +
      tile('Costo laboral', compact(lab, st.mon), ti ? Math.round(lab / ti * 100) + '% de los ingresos' : 'sueldos y aguinaldos', b.labMes, C3) + '</section>';

    // Ingresos vs egresos
    h += '<div class="stats"><section class="sheet w8"><div class="sheet-h"><h2>Ingresos y egresos por mes</h2><span class="muted">sin divisas ni retiros</span></div>' + columnas([{ n: 'Ingresos', c: C1, v: b.ingMes }, { n: 'Egresos', c: C2, v: b.egMes }], b.ultimo, { mon: st.mon }) + '</section>';
    // Fijos vs variables
    const ab = sum(b.aboMes), pr = sum(b.proMes);
    h += '<section class="sheet w4"><div class="sheet-h"><h2>Abonos y proyectos</h2></div>' +
      '<div class="hbars">' + [['Abonos (redes y Ads)', ab, C1], ['Proyectos', pr, C3]].map(([l, v, c]) => '<div class="hb"' + tip(l, money(v, st.mon)) + '><span class="lab">' + l + '</span><span class="tr"><i style="width:' + (v / Math.max(ab, pr, 1) * 100).toFixed(1) + '%;--c:' + c + '"></i></span><span class="v">' + esc(compact(v, st.mon)) + '<small>' + (ab + pr ? Math.round(v / (ab + pr) * 100) : 0) + '%</small></span></div>').join('') + '</div>' +
      '<p class="muted" style="margin:0;padding:0 18px 16px;font-size:13.5px">Lo recurrente sostiene ' + (ab + pr ? Math.round(ab / (ab + pr) * 100) : 0) + '% de los ingresos del año.</p></section>';
    h += '<section class="sheet w12"><div class="sheet-h"><h2>De dónde vienen los ingresos, mes a mes</h2></div>' + columnas([{ n: 'Abonos', c: C1, v: b.aboMes }, { n: 'Proyectos', c: C3, v: b.proMes }], b.ultimo, { apilado: true, mon: st.mon, W: 1140 }) +
      '<details style="padding:0 18px 14px"><summary class="muted" style="cursor:pointer;font-size:13px">Ver números</summary><div class="tbl"><table><thead><tr><th>Mes</th><th class="r">Abonos</th><th class="r">Proyectos</th><th class="r">Total</th></tr></thead><tbody>' + b.aboMes.map((v, i) => '<tr><td>' + MES[i] + '</td><td class="r">' + money(v, st.mon) + '</td><td class="r">' + money(b.proMes[i], st.mon) + '</td><td class="r"><b>' + money(v + b.proMes[i], st.mon) + '</b></td></tr>').join('') + '</tbody></table></div></details></section>';
    // Servicios, clientes, egresos
    h += '<section class="sheet"><div class="sheet-h"><h2>Ingresos por servicio</h2></div>' + hbars(top(agrupar(b.ing, v => limpiaSub(v.subcuenta), v => v.ingreso), 8), C1, st.mon) + '</section>';
    h += '<section class="sheet"><div class="sheet-h"><h2>Clientes que más facturaron</h2></div>' + hbars(top(agrupar(b.ing, v => v.cliente || v.contraparte || 'Sin cliente', v => v.ingreso), 10), C1, st.mon) + '</section>';
    h += '<section class="sheet"><div class="sheet-h"><h2>En qué se va la plata</h2></div>' + hbars(top(agrupar(b.eg, v => v.subcuenta || v.cuenta, v => v.egreso), 9), C2, st.mon) + '</section>';
    h += '<section class="sheet"><div class="sheet-h"><h2>Proveedores</h2></div>' + hbars(top(agrupar(b.eg.filter(v => v.cuenta === 'Proveedores'), v => v.contraparte || v.subcuenta, v => v.egreso), 8), C2, st.mon) + '</section>';
    // Operación y cobranza (todas las monedas)
    const porCobrar = {}, vencido = {}; AD.F.forEach(f => { if (f.saldo > 0.009) { add(porCobrar, f.moneda, f.saldo); if (k.estadoFactura(f) === 'Vencida') add(vencido, f.moneda, f.saldo); } });
    const ab2 = S.A.filter(a => a.estado === 'Activo'), est = {}; S.P.filter(p => !['Entregado', 'Cancelado'].includes(p.estado)).forEach(p => { est[p.estado] = (est[p.estado] || 0) + 1; });
    const totP = sum(Object.values(est));
    h += '<section class="sheet w12"><div class="sheet-h"><h2>Operación hoy</h2></div><div class="sheet-b" style="display:grid;gap:18px">' +
      '<div class="hero">' +
      '<div class="kpi" style="--k:var(--s-entregado)"><span class="eyebrow">Clientes activos</span><b style="font-size:28px">' + S.C.filter(c => c.estado === 'Activo').length + '</b><span>' + ab2.filter(a => a.tipo === 'Redes').length + ' con redes · ' + ab2.filter(a => a.tipo === 'Ads').length + ' con Ads</span></div>' +
      '<div class="kpi" style="--k:var(--s-curso)"><span class="eyebrow">Proyectos abiertos</span><b style="font-size:28px">' + totP + '</b><span>' + S.P.filter(p => p.estado === 'Entregado' && (p.entregaReal || p.entrega || '').startsWith(st.anio)).length + ' entregados en ' + esc(st.anio) + '</span></div>' +
      '<div class="kpi" style="--k:var(--warn)"><span class="eyebrow">Por cobrar</span><b style="font-size:24px">' + esc(multi(porCobrar)) + '</b><span>en comprobantes emitidos</span></div>' +
      '<div class="kpi ' + (Object.keys(vencido).length ? 'alert' : '') + '"><span class="eyebrow">Vencido</span><b style="font-size:24px">' + esc(multi(vencido)) + '</b><span>' + (n => n + (n === 1 ? ' comprobante' : ' comprobantes'))(AD.F.filter(f => k.estadoFactura(f) === 'Vencida').length) + '</span></div></div>' +
      (totP ? '<div><span class="eyebrow">Proyectos abiertos por estado</span><div style="display:flex;gap:2px;height:14px;margin:8px 0 10px;border-radius:7px;overflow:hidden">' + Object.entries(est).map(([e, n]) => '<span' + tip(e, n + ' proyectos') + ' style="flex:' + n + ';background:var(' + ctx.stVar(e) + ')"></span>').join('') + '</div><div class="tags" style="gap:8px">' + Object.entries(est).sort((a, b) => b[1] - a[1]).map(([e, n]) => ctx.pill(e + ' · ' + n, ctx.stVar(e))).join('') + '</div></div>' : '') +
      '</div></section></div>';
    return h;
  }

  /* ---------- tooltip compartido ---------- */
  let tipEl = null;
  document.addEventListener('mouseover', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    if (!t) { if (tipEl) tipEl.hidden = true; return; }
    if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'vtip'; document.body.appendChild(tipEl); }
    tipEl.innerHTML = '<b>' + esc(t.dataset.tip) + '</b>' + esc(t.dataset.tip2 || '');
    tipEl.hidden = false;
  });
  document.addEventListener('mousemove', e => { if (tipEl && !tipEl.hidden) { const x = Math.min(e.clientX + 14, innerWidth - tipEl.offsetWidth - 8); tipEl.style.left = x + 'px'; tipEl.style.top = (e.clientY + 14) + 'px'; } });
  document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.stk) { AD.st[t.dataset.stk] = t.value; ctx.render(); } });

  return { view: vStats, actions: { stMon: t => { AD.st.mon = t.dataset.v; ctx.render(); } } };
}
