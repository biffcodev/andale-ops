// Estadísticas (solo admins): cómo viene el año con los números de Caja, cobranza y operación.
// Lenguaje visual: números grandes y claros, listas de barras finas, una dona y curvas suaves
// comparadas con el año anterior. Todo en SVG propio, sin librerías. Cada gráfico lleva su tabla
// de datos (oculta a la vista) para leerlo con lector de pantalla y para descargarlo en Excel o CSV.
import { ICON } from './iconos.js';
import { rango, enRango, selector } from './periodo.js';

const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
// Cuentas que no son operación: saldo inicial, compra/venta de divisas, retiros y aportes de socios.
const NO_OPERATIVAS = new Set(['Saldo Inicial', 'Ingresos en Pesos', 'Ingresos en USD', 'Egreso en Pesos', 'Egreso en USD', 'Inversiones']);
const ABONO_SUB = new Set(['S.Redes sociales', 'S.Redes Ads']);
const limpiaSub = s => String(s || 'Sin categoría').replace(/^S\./, '');

export function initStats(ctx, k) {
  const { S, esc, opt, thisMonth, emptyBox } = ctx;
  const { AD, money, add } = k;
  AD.st = { mon: 'ARS', clTodos: false };
  AD.per = AD.per || { k: 'anio' };
  const hoy = () => ctx.today ? ctx.today() : new Date().toISOString().slice(0, 10);

  const compact = (n, cur) => {
    const sym = cur === 'USD' ? 'US$' : cur === 'EUR' ? '€' : cur === 'GBP' ? '£' : '$';
    const a = Math.abs(n), sg = n < 0 ? '−' : '';
    const t = Math.round(a).toLocaleString('es-AR'); // sin abreviar: nada de k ni M
    return sg + sym + ' ' + t;
  };
  const niceMax = v => { if (v <= 0) return 1; const p = Math.pow(10, Math.floor(Math.log10(v))); const f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; };
  const tip = (t, l) => ' data-tip="' + esc(t) + '" data-tip2="' + esc(l || '') + '"';
  const sum = a => a.reduce((x, y) => x + y, 0);
  const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
  function agrupar(xs, key, val) { const m = new Map(); xs.forEach(v => { const kk = key(v); m.set(kk, (m.get(kk) || 0) + val(v)); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); }
  const top = (rows, n) => rows.length > n ? [...rows.slice(0, n - 1), ['Otros (' + (rows.length - n + 1) + ')', sum(rows.slice(n - 1).map(r => r[1]))]] : rows;

  /* ---------- datos ---------- */
  function base(r, grupos) {
    const mon = AD.st.mon;
    // En dólares también entran EUR, GBP y otras monedas del exterior, por los USD que realmente se recibieron.
    const ext = v => mon === 'USD' && v.moneda !== 'ARS' && v.moneda !== 'USD' && v.usd != null && v.usd !== '';
    const mv = AD.MV.filter(v => enRango(v.fecha, r) && (v.moneda === mon || ext(v)) && !NO_OPERATIVAS.has(v.cuenta))
      .map(v => ext(v) ? { ...v, ingreso: v.ingreso > 0 ? +v.usd : 0, egreso: v.egreso > 0 ? +v.usd : 0 } : v);
    const ing = mv.filter(v => v.ingreso > 0 && /^Venta/.test(v.cuenta)), eg = mv.filter(v => v.egreso > 0);
    const sinUsd = mon === 'USD' ? AD.MV.filter(v => enRango(v.fecha, r) && v.moneda !== 'ARS' && v.moneda !== 'USD' && (v.usd == null || v.usd === '') && !NO_OPERATIVAS.has(v.cuenta)) : [];
    const gs = grupos || r.grupos;
    const porG = (xs, f) => gs.map(g => xs.filter(v => v.fecha.slice(0, 10) >= g.d && v.fecha.slice(0, 10) <= g.h).reduce((a, v) => a + f(v), 0));
    return { mon, ing, eg, sinUsd, n: gs.length,
      ingMes: porG(ing, v => v.ingreso), egMes: porG(eg, v => v.egreso),
      aboMes: porG(ing.filter(v => ABONO_SUB.has(v.subcuenta)), v => v.ingreso),
      proMes: porG(ing.filter(v => !ABONO_SUB.has(v.subcuenta)), v => v.ingreso),
      labMes: porG(eg.filter(v => v.cuenta === 'Costo Laboral'), v => v.egreso) };
  }

  /* ---------- piezas ---------- */
  const tituloSec = (icon, t, sub, der) => '<div class="sx-h"><span class="sx-i">' + (ICON[icon] || '') + '</span><h2>' + t + (sub ? ' <span class="sx-sub">' + sub + '</span>' : '') + '</h2>' + (der ? '<div class="sx-der">' + der + '</div>' : '') + '</div>';
  // Tabla de datos del gráfico: invisible en pantalla, la leen el lector de pantalla y las descargas.
  const datos = (titulo, cab, filas) => '<table class="sr-only" data-titulo="' + esc(titulo) + '"><caption>' + esc(titulo) + '</caption><thead><tr>' + cab.map(c => '<th>' + esc(c) + '</th>').join('') + '</tr></thead><tbody>' + filas.map(f => '<tr>' + f.map(c => '<td>' + esc(c) + '</td>').join('') + '</tr>').join('') + '</tbody></table>';
  const delta = (a, b, alReves) => {
    if (!b) return '<span class="sx-d nada">sin datos para comparar</span>';
    const d = Math.round((a / b - 1) * 100); const bien = alReves ? d <= 0 : d >= 0;
    return '<span class="sx-d ' + (d === 0 ? 'igual' : bien ? 'up' : 'down') + '">' + (d > 0 ? '▲ ' : d < 0 ? '▼ ' : '') + Math.abs(d) + '% vs. ' + esc(rango(AD.per, hoy()).prev.label) + '</span>';
  };
  const grande = (valor, label, extra, cls) => '<div class="sx-n' + (cls ? ' ' + cls : '') + '"><b>' + esc(valor) + '</b><span>' + esc(label) + '</span>' + (extra || '') + '</div>';

  // Curva suave (monótona: no inventa picos ni baja de cero) con área y comparación gris.
  function curva(main0, prev0, etiquetas, mon, { W = (window.matchMedia && window.matchMedia('(max-width: 760px)').matches ? 360 : 600), H = 230, color = 'var(--c1)', nombre = '', nombrePrev = '' } = {}) {
    const n0 = etiquetas.length;
    // Arranca en el primer mes con datos (de este año o del anterior), así no se pierde medio gráfico en ceros.
    let d0 = 0; while (d0 < n0 - 2 && !(main0[d0] || (prev0 && prev0[d0]))) d0++;
    const main = main0.slice(d0), prev = prev0 ? prev0.slice(d0) : null, n = n0 - d0, MS = etiquetas.slice(d0);
    const L = W < 500 ? 70 : 92, R = 12, T = 12, B = 26, iw = W - L - R, ih = H - T - B;
    const mx = niceMax(Math.max(...main.slice(0, n), ...(prev || []).slice(0, n), 1));
    const X = i => n > 1 ? L + iw * i / (n - 1) : L + iw / 2, Y = v => T + ih - (v / mx) * ih;
    const path = vals => {
      const p = vals.slice(0, n).map((v, i) => [X(i), Y(v)]); if (p.length < 2) return p.length ? 'M' + p[0][0] + ',' + p[0][1] : '';
      const m = p.map((_, i) => { if (i === 0) return (p[1][1] - p[0][1]) / (p[1][0] - p[0][0]); if (i === p.length - 1) return (p[i][1] - p[i - 1][1]) / (p[i][0] - p[i - 1][0]); const d0 = (p[i][1] - p[i - 1][1]) / (p[i][0] - p[i - 1][0]), d1 = (p[i + 1][1] - p[i][1]) / (p[i + 1][0] - p[i][0]); return d0 * d1 <= 0 ? 0 : 2 / (1 / d0 + 1 / d1); });
      let d = 'M' + p[0][0].toFixed(1) + ',' + p[0][1].toFixed(1);
      for (let i = 0; i < p.length - 1; i++) { const h = (p[i + 1][0] - p[i][0]) / 3; d += 'C' + (p[i][0] + h).toFixed(1) + ',' + (p[i][1] + m[i] * h).toFixed(1) + ' ' + (p[i + 1][0] - h).toFixed(1) + ',' + (p[i + 1][1] - m[i + 1] * h).toFixed(1) + ' ' + p[i + 1][0].toFixed(1) + ',' + p[i + 1][1].toFixed(1); }
      return d;
    };
    const id = 'g' + Math.random().toString(36).slice(2, 8);
    let g = '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + color + '" stop-opacity=".28"/><stop offset="1" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>';
    for (let t = 0; t <= 4; t++) { const v = mx * t / 4, yy = Y(v).toFixed(1); g += '<line class="' + (t ? 'gl' : 'bl') + '" x1="' + L + '" x2="' + (W - R) + '" y1="' + yy + '" y2="' + yy + '"/><text class="ax" x="' + (L - 8) + '" y="' + (+yy + 4) + '" text-anchor="end">' + esc(compact(v, mon).replace(/^(US)?\$ |^[€£] /, '')) + '</text>'; }
    for (let i = 0; i < n; i++) g += '<text class="ax" x="' + X(i).toFixed(1) + '" y="' + (H - 6) + '" text-anchor="' + (n > 1 && i === 0 ? 'start' : n > 1 && i === n - 1 ? 'end' : 'middle') + '">' + MS[i] + '</text>';
    const pm = path(main);
    if (prev && prev.some(v => v)) g += '<path d="' + path(prev) + '" fill="none" stroke="var(--muted)" stroke-opacity=".5" stroke-width="1.25" stroke-dasharray="3 3"/>';
    if (n > 1) g += '<path d="' + pm + 'L' + X(n - 1).toFixed(1) + ',' + Y(0) + 'L' + L + ',' + Y(0) + 'Z" fill="url(#' + id + ')"/>';
    g += '<path d="' + pm + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linecap="round"/>';
    const last = main[n - 1] || 0; g += '<circle cx="' + X(n - 1).toFixed(1) + '" cy="' + Y(last).toFixed(1) + '" r="3.5" fill="' + color + '" stroke="var(--surface)" stroke-width="1.5"/>';
    // Zonas para el tooltip, una por mes.
    const band = n > 1 ? iw / (n - 1) : iw;
    for (let i = 0; i < n; i++) g += '<rect class="hz" x="' + Math.max(L, X(i) - band / 2).toFixed(1) + '" y="' + T + '" width="' + band.toFixed(1) + '" height="' + ih + '"' + tip(MS[i], nombre + ': ' + money(main[i] || 0, mon) + (prev && prev.some(v => v) ? ' · ' + nombrePrev + ': ' + money(prev[i] || 0, mon) : '')) + '/>';
    return '<div class="sx-chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(nombre + ' por mes') + '">' + g + '</svg></div>';
  }
  const leyenda = items => '<div class="sx-ley">' + items.map(([n, c]) => '<span><i style="--c:' + c + '"></i>' + esc(n) + '</span>').join('') + '</div>';

  // Lista de barras: nombre a la izquierda, valor a la derecha, barra fina abajo. La primera, en color pleno.
  function barras(rows, color, fmt, { tituloDatos, avatar } = {}) {
    if (!rows.length) return emptyBox('Sin datos en este período', '');
    const mx = Math.max(...rows.map(r => r[1]), 1), tot = sum(rows.map(r => r[1]));
    return '<div class="bl">' + rows.map(([l, v], i) => '<div class="bl-r"' + tip(l, fmt(v) + ' · ' + pct(v, tot) + '% del total') + '><div class="bl-t">' + (avatar ? avatar(l) : '') + '<span class="bl-l">' + esc(l) + '</span><span class="bl-v">' + esc(fmt(v)) + '<small>' + pct(v, tot) + '%</small></span></div><span class="bl-tr" style="--c:' + color + '"><i class="' + (i ? '' : 'top') + '" style="width:' + Math.max(1, v / mx * 100).toFixed(1) + '%"></i></span></div>').join('') + '</div>' +
      (tituloDatos ? datos(tituloDatos, ['Concepto', 'Monto', '% del total'], rows.map(([l, v]) => [l, money(v, AD.st.mon), pct(v, tot) + '%'])) : '');
  }
  function dona(rows, colores, fmt, centro) {
    const tot = sum(rows.map(r => r[1])); if (!tot) return '';
    const R = 60, r = 40, C = 74; let a0 = -Math.PI / 2, g = '';
    rows.forEach(([l, v], i) => {
      if (!v) return; const a1 = a0 + (v / tot) * Math.PI * 2 - (rows.filter(x => x[1]).length > 1 ? 0.025 : 0);
      const big = a1 - a0 > Math.PI ? 1 : 0, p = (rad, ang) => (C + rad * Math.cos(ang)).toFixed(2) + ',' + (C + rad * Math.sin(ang)).toFixed(2);
      const d = v / tot > 0.9999 ? 'M' + p(R, 0) + 'A' + R + ',' + R + ' 0 1 1 ' + p(R, Math.PI) + 'A' + R + ',' + R + ' 0 1 1 ' + p(R, 0) + 'M' + p(r, 0) + 'A' + r + ',' + r + ' 0 1 0 ' + p(r, Math.PI) + 'A' + r + ',' + r + ' 0 1 0 ' + p(r, 0) + 'Z'
        : 'M' + p(R, a0) + 'A' + R + ',' + R + ' 0 ' + big + ' 1 ' + p(R, a1) + 'L' + p(r, a1) + 'A' + r + ',' + r + ' 0 ' + big + ' 0 ' + p(r, a0) + 'Z';
      g += '<path d="' + d + '" fill="' + colores[i % colores.length] + '" fill-rule="evenodd"' + tip(l, fmt(v) + ' · ' + pct(v, tot) + '%') + '/>';
      a0 = a1 + (rows.filter(x => x[1]).length > 1 ? 0.025 : 0);
    });
    return '<div class="sx-dona"><svg viewBox="0 0 148 148" width="168" height="168" role="img" aria-label="Distribución">' + g + (centro ? '<text x="74" y="72" text-anchor="middle" class="dn-b">' + esc(centro[0]) + '</text><text x="74" y="90" text-anchor="middle" class="dn-s">' + esc(centro[1]) + '</text>' : '') + '</svg>' +
      '<ul>' + rows.map(([l, v], i) => '<li><i style="--c:' + colores[i % colores.length] + '"></i><span>' + esc(l) + '</span><b>' + pct(v, tot) + '%</b></li>').join('') + '</ul></div>';
  }

  /* ---------- vista ---------- */
  function vStats() {
    const st = AD.st, r = rango(AD.per, hoy()), b = base(r), prev = base(r.prev, r.prev.grupos.length === r.grupos.length ? r.prev.grupos : null), C1 = 'var(--g-in)', C2 = 'var(--g-out-ink)', C3 = 'var(--c4)';
    const anios = [...new Set(AD.MV.map(v => (v.fecha || '').slice(0, 4)))].filter(Boolean).sort().reverse();
    const ti = sum(b.ingMes), te = sum(b.egMes), res = ti - te, lab = sum(b.labMes), meses = r.meses;
    const pi = sum(prev.ingMes), pe = sum(prev.egMes), pl = sum(prev.labMes);
    const hayPrev = prev.ing.length + prev.eg.length > 0, y0 = r.prev.label, M = v => money(v, st.mon), K = v => compact(v, st.mon);
    const periodo = r.label, labels = r.grupos.map(g => g.l), cada = r.porSemana ? 'por semana' : 'por mes', div = r.porSemana ? Math.max(1, r.grupos.length) : meses;
    let h = '<div class="head"><div><h1>Estadísticas</h1><p>Cómo viene ' + esc(periodo) + ' según Gastos e ingresos: lo que entra, lo que sale y de dónde viene.</p></div>' +
      '<div class="toolbar">' + selector(AD.per, anios, esc, hoy()) + '<div class="seg" role="group" aria-label="Moneda">' + ['ARS', 'USD'].map(m => '<button data-act="stMon" data-v="' + m + '" aria-pressed="' + (st.mon === m) + '">' + (m === 'ARS' ? 'Pesos' : 'Dólares') + '</button>').join('') + '</div></div></div>' +
      (b.sinUsd.length ? '<section class="callout"><p><b>' + b.sinUsd.length + ' movimientos en ' + esc([...new Set(b.sinUsd.map(v => v.moneda))].join(' y ')) + ' sin los USD cargados</b>: no se suman acá. Abrilos en Gastos e ingresos y completá “¿Cuántos USD fueron?”.</p></section>' : '');
    if (!b.ing.length && !b.eg.length) return h + '<section class="sheet">' + emptyBox('Sin gastos ni ingresos en ' + (st.mon === 'ARS' ? 'pesos' : 'dólares') + ' en ' + periodo, 'Probá con otro período o la otra moneda.') + '</section>';

    // 1. El período en cuatro números
    h += '<section class="sheet sx">' + tituloSec('resultado', 'En números', '(' + esc(periodo) + ')') +
      '<div class="sx-ns">' +
      grande(K(ti), 'Ingresos', '<small>' + esc(K(ti / div)) + ' ' + cada + '</small>' + (hayPrev ? delta(ti, pi) : '')) +
      grande(K(te), 'Gastos', '<small>' + esc(K(te / div)) + ' ' + cada + '</small>' + (hayPrev ? delta(te, pe, true) : '')) +
      grande(K(res), 'Lo que quedó', '<small>' + (ti ? pct(res, ti) + '% de lo que entra' : '—') + '</small>' + (hayPrev ? delta(res, pi - pe) : ''), res < 0 ? 'neg' : 'pos') +
      grande(K(lab), 'Sueldos', '<small>' + (ti ? pct(lab, ti) + '% de los ingresos' : 'sueldos y aguinaldos') + '</small>' + (hayPrev ? delta(lab, pl, true) : '')) +
      '</div>' + datos('En números', ['Concepto', periodo, y0], [['Ingresos', M(ti), M(pi)], ['Gastos', M(te), M(pe)], ['Lo que quedó', M(res), M(pi - pe)], ['Sueldos', M(lab), M(pl)]]) + '</section>';

    // 2. Curvas de ingresos y gastos contra el período anterior
    const fila = (n, a, p) => labels.map((m, i) => [m, M(a[i] || 0), M(p[i] || 0)]);
    const compara = hayPrev && prev.n === b.n;
    h += '<div class="sx-2">' +
      '<section class="sheet sx">' + tituloSec('ingreso', '<b>' + esc(K(ti)) + '</b> de ingresos', '(' + esc(cada) + ')', leyenda([[periodo, C1], ...(compara ? [[y0, 'var(--muted)']] : [])])) +
      curva(b.ingMes, compara ? prev.ingMes : null, labels, st.mon, { color: C1, nombre: 'Ingresos', nombrePrev: y0 }) + datos('Ingresos ' + cada, ['Período', periodo, y0], fila('Ingresos', b.ingMes, prev.ingMes)) + '</section>' +
      '<section class="sheet sx">' + tituloSec('gasto', '<b>' + esc(K(te)) + '</b> de gastos', '(' + esc(cada) + ')', leyenda([[periodo, C2], ...(compara ? [[y0, 'var(--muted)']] : [])])) +
      curva(b.egMes, compara ? prev.egMes : null, labels, st.mon, { color: C2, nombre: 'Gastos', nombrePrev: y0 }) + datos('Gastos ' + cada, ['Período', periodo, y0], fila('Gastos', b.egMes, prev.egMes)) + '</section></div>';

    // 3. De dónde viene la plata: abonos vs. proyectos y por servicio
    const ab = sum(b.aboMes), pr = sum(b.proMes);
    const serv = top(agrupar(b.ing, v => limpiaSub(v.subcuenta), v => v.ingreso), 8);
    h += '<section class="sheet sx">' + tituloSec('dona', 'De dónde viene la plata') +
      '<div class="sx-panel sx-split"><div><p class="sx-lead">Lo recurrente (Redes y Ads) sostiene <b>' + pct(ab, ab + pr) + '%</b> de los ingresos de ' + esc(periodo) + '.</p>' +
      barras(serv, C1, K, { tituloDatos: 'Ingresos por servicio' }) + '</div>' +
      dona([['Redes y Ads', ab], ['Proyectos', pr]], [C1, C3], M, [pct(ab, ab + pr) + '%', 'recurrente']) + '</div>' +
      datos('Redes y proyectos', ['Período', 'Redes y Ads', 'Proyectos', 'Total'], b.aboMes.map((v, i) => [labels[i], M(v), M(b.proMes[i]), M(v + b.proMes[i])])) + '</section>';

    // 4. Clientes: tabla con logo, como un ranking
    const cl = agrupar(b.ing, v => v.cliente || v.contraparte || 'Sin cliente', v => v.ingreso), totCl = sum(cl.map(r => r[1]));
    const mesesDe = n => new Set(b.ing.filter(v => (v.cliente || v.contraparte || 'Sin cliente') === n).map(v => v.fecha.slice(0, 7))).size;
    const ultimoDe = n => b.ing.filter(v => (v.cliente || v.contraparte || 'Sin cliente') === n).map(v => v.fecha).sort().pop();
    const logo = n => { const c = S.C.find(x => x.nombre === n); return ctx.av ? ctx.av(n, c && c.avatar, 'sq') : ''; };
    const verCl = st.clTodos ? cl : cl.slice(0, 8);
    h += '<section class="sheet sx">' + tituloSec('ranking', 'Clientes que más facturaron', '(' + esc(periodo) + ')') +
      (cl.length ? '<div class="tbl sx-tbl"><table><thead><tr><th>Cliente</th><th class="r">Ingresó</th><th class="r">% del total</th><th class="r">Meses con pagos</th><th class="r">Último pago</th></tr></thead><tbody>' +
        verCl.map(([n, v]) => '<tr><td><span class="sx-cl">' + logo(n) + '<b>' + esc(n) + '</b></span></td><td class="r"><b class="sx-big">' + esc(K(v)) + '</b></td><td class="r">' + pct(v, totCl) + '%</td><td class="r">' + mesesDe(n) + '</td><td class="r muted">' + esc(ctx.fmt(ultimoDe(n))) + '</td></tr>').join('') + '</tbody></table></div>' +
        (cl.length > 8 ? '<div class="sx-more"><button class="btn sm" data-act="stClTodos">' + (st.clTodos ? 'Ver menos' : 'Ver los ' + cl.length + ' clientes') + '</button></div>' : '') : emptyBox('Sin ingresos de clientes', '')) + '</section>';

    // 5. En qué se va la plata y proveedores
    h += '<div class="sx-2">' +
      '<section class="sheet sx">' + tituloSec('gasto', 'En qué se va la plata') + '<div class="sx-panel">' + barras(top(agrupar(b.eg, v => v.subcuenta || v.cuenta, v => v.egreso), 9), C2, K, { tituloDatos: 'En qué se va la plata' }) + '</div></section>' +
      '<section class="sheet sx">' + tituloSec('pagos', 'Proveedores') + '<div class="sx-panel">' + barras(top(agrupar(b.eg.filter(v => v.cuenta === 'Proveedores'), v => v.contraparte || v.subcuenta, v => v.egreso), 8), C2, K, { tituloDatos: 'Proveedores' }) + '</div></section></div>';

    // 6. Operación hoy (todas las monedas)
    const porCobrar = {}, vencido = {}; AD.F.forEach(f => { if (f.saldo > 0.009) { add(porCobrar, f.moneda, f.saldo); if (k.estadoFactura(f) === 'Vencida') add(vencido, f.moneda, f.saldo); } });
    const ab2 = S.A.filter(a => a.estado === 'Activo'), est = {}; S.P.filter(p => !['Entregado', 'Cancelado'].includes(p.estado)).forEach(p => { est[p.estado] = (est[p.estado] || 0) + 1; });
    const totP = sum(Object.values(est)), nVenc = AD.F.filter(f => k.estadoFactura(f) === 'Vencida').length;
    const plataN = acc => { const e = Object.entries(acc).filter(([, v]) => Math.abs(v) > 0.004); return e.length ? e.map(([c, v]) => compact(v, c)).join(' · ') : compact(0, 'ARS'); };
    h += '<section class="sheet sx">' + tituloSec('operacion', 'Operación hoy') +
      '<div class="sx-ns">' +
      grande(String(S.C.filter(c => c.estado === 'Activo').length), 'Clientes activos', '<small>' + ab2.filter(a => a.tipo === 'Redes').length + ' con redes · ' + ab2.filter(a => a.tipo === 'Ads').length + ' con Ads</small>') +
      grande(String(totP), 'Proyectos abiertos', '<small>' + S.P.filter(p => p.estado === 'Entregado' && enRango(p.entregaReal || p.entrega || '', r)).length + ' entregados en ' + esc(periodo) + '</small>') +
      grande(plataN(porCobrar), 'Por cobrar', '<small>en facturas hechas</small>', Object.keys(porCobrar).length > 1 ? 'chico' : '') +
      grande(plataN(vencido), 'Vencido', '<small>' + nVenc + (nVenc === 1 ? ' factura' : ' facturas') + '</small>', (Object.keys(vencido).length ? 'neg' : '') + (Object.keys(vencido).length > 1 ? ' chico' : '')) + '</div>' +
      (totP ? '<div class="sx-panel"><p class="sx-lead">Proyectos abiertos por estado</p>' + '<div class="bl">' + Object.entries(est).sort((a, c) => c[1] - a[1]).map(([e, n]) => '<div class="bl-r"><div class="bl-t"><span class="bl-dot" style="--c:var(' + ctx.stVar(e) + ')"></span><span class="bl-l">' + esc(e) + '</span><span class="bl-v">' + n + (n === 1 ? ' proyecto' : ' proyectos') + '</span></div><span class="bl-tr" style="--c:var(' + ctx.stVar(e) + ')"><i class="top" style="width:' + (n / Math.max(...Object.values(est)) * 100).toFixed(1) + '%"></i></span></div>').join('') + '</div></div>' : '') +
      datos('Operación hoy', ['Indicador', 'Valor'], [['Clientes activos', S.C.filter(c => c.estado === 'Activo').length], ['Proyectos abiertos', totP], ['Por cobrar', plataN(porCobrar)], ['Vencido', plataN(vencido)], ...Object.entries(est).map(([e, n]) => ['Proyectos ' + e.toLowerCase(), n])]) + '</section>';
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
  // Período compartido por Estadísticas y Rentabilidad.
  document.addEventListener('change', e => {
    const t = e.target; if (!t.dataset || !t.dataset.per) return;
    const p = AD.per; p[t.dataset.per] = t.value;
    if (t.dataset.per === 'k' && t.value === 'rango' && !(p.d && p.h)) { const r = rango({ k: '3m' }, hoy()); p.d = r.desde; p.h = r.hasta; }
    AD.HR = null; ctx.render();
  });

  return { view: vStats, actions: { stMon: t => { AD.st.mon = t.dataset.v; ctx.render(); }, stClTodos: () => { AD.st.clTodos = !AD.st.clTodos; ctx.render(); } } };
}
