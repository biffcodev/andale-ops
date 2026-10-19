// Costo por cliente: valor hora de cada persona (de Sueldos), tiempo que lleva cada cliente (tiempos estándar por formato
// y gestión mensual; si alguien carga horas reales, mandan esas), gastos directos asignados y una parte de los gastos generales.
// Muestra costo directo, costo completo, margen y cuánto cuesta en promedio cada pieza. Solo administradores.
import * as data from './data.js';

const FORMATOS_DEF = { Historias: { dis: 20, cue: 10 }, Posts: { dis: 60, cue: 20 }, Carruseles: { dis: 120, cue: 25 }, Reels: { dis: 180, cue: 30 } };
const OTRO_DEF = { dis: 60, cue: 20 };
const GENERALES_DEF = ['Gastos Fijos', 'Gastos Varios', 'Gs Bancarios', 'Seguros'];

export function initCostos(ctx, k) {
  const { S, esc, fmt, monthLabel, thisMonth, addMonth, cmp, emptyBox, toast, $ } = ctx;
  const { AD, money, r2, precioEn, abonoEnMes, costosDe, movDe, cap } = k;
  AD.ct = AD.ct || { mes: thisMonth(), hr: null, cargando: false, abierto: false };

  /* ---------- Supuestos (Ajustes → costos) ---------- */
  const cfg = () => {
    const c = (AD.AJ && AD.AJ.costos) || {};
    return { productivo: c.productivo || 75, horasDia: c.horasDia || 8, horasPersona: c.horasPersona || {}, formatos: { ...FORMATOS_DEF, ...(c.formatos || {}) },
      gestion: { cuentas: c.gestion && c.gestion.cuentas != null ? c.gestion.cuentas : 240, direccion: c.gestion && c.gestion.direccion != null ? c.gestion.direccion : 120 },
      generales: c.generales || GENERALES_DEF };
  };
  async function guardarCfg(parche) {
    const v = { ...((AD.AJ && AD.AJ.costos) || {}), ...parche };
    await data.upsert('ajustes', { clave: 'costos', valor: v }, 'clave');
    AD.AJ.costos = v;
  }
  const tiempoFmt = f => { const c = cfg(); const key = Object.keys(c.formatos).find(x => x.toLowerCase() === String(f || '').toLowerCase()); return key ? c.formatos[key] : OTRO_DEF; };

  /* ---------- Valor hora de cada persona ---------- */
  const habiles = m => { const [y, mo] = m.split('-').map(Number); let n = 0; for (let d = new Date(Date.UTC(y, mo - 1, 1)); d.getUTCMonth() === mo - 1; d.setUTCDate(d.getUTCDate() + 1)) { const w = d.getUTCDay(); if (w && w < 6) n++; } return n; };
  const enMes = (desde, hasta, m) => (!desde || desde <= m) && (!hasta || hasta >= m);
  function remVig(cid, m) { // la vigente de cada concepto; si todavía no hay ninguna (se cargaron desde un mes futuro), la primera que haya
    const out = {}, rs = AD.RM.filter(r => r.colaborador_id === cid);
    rs.filter(r => r.desde <= m).forEach(r => { if (!out[r.concepto] || r.desde > out[r.concepto].desde) out[r.concepto] = r; });
    let futuro = false;
    if (!Object.keys(out).length) rs.forEach(r => { if (!out[r.concepto] || r.desde < out[r.concepto].desde) { out[r.concepto] = r; futuro = true; } });
    return { rs: Object.values(out), futuro };
  }
  function persona(c, m) {
    const { rs, futuro } = remVig(c.id, m), ex = AD.CF.filter(x => x.colaborador_id === c.id && enMes(x.desde, x.hasta, m));
    let costo = 0, otras = false;
    [...rs, ...ex].forEach(x => { if ((x.moneda || 'ARS') === 'ARS') costo += +x.monto || 0; else otras = true; });
    const sueldo = rs.filter(x => x.concepto === 'Sueldo' && (x.moneda || 'ARS') === 'ARS').reduce((a, x) => a + (+x.monto || 0), 0);
    if (c.aguinaldo) costo += sueldo / 12;
    const C = cfg(), horas = +C.horasPersona[c.persona] || Math.round(C.horasDia * habiles(m) * C.productivo / 100);
    return { alias: c.persona || c.nombre, nombre: c.nombre, tipo: c.tipo, costo: r2(costo), horas, vh: horas ? Math.round(costo / horas) : 0, futuro, otras };
  }
  const equipoMes = m => AD.CO.filter(c => c.activo && c.tipo !== 'Proveedor' && enMes(c.ingreso ? c.ingreso.slice(0, 7) : '', c.egreso ? c.egreso.slice(0, 7) : '', m)).map(c => persona(c, m));

  /* ---------- Tiempo de cada cliente en el mes ---------- */
  // Equipo de la cuenta: alias -> rol (de los abonos de Redes/Ads activos ese mes).
  function equipoCuenta(cliente, m) {
    const eq = new Map();
    S.A.filter(a => a.cliente === cliente && (a.tipo === 'Redes' || a.tipo === 'Ads') && abonoEnMes(a, m)).sort((x, y) => (x.tipo === 'Redes' ? 0 : 1) - (y.tipo === 'Redes' ? 0 : 1))
      .forEach(a => (a.responsables || []).forEach(al => { if (!eq.has(al)) eq.set(al, (a.roles || {})[al] || ''); }));
    return eq;
  }
  const conRol = (eq, re) => [...eq].filter(([, r]) => re.test(r || '')).map(([a]) => a);
  function calcular(m) {
    const red = ctx.red && ctx.red(), gente = equipoMes(m), vh = new Map(gente.map(g => [g.alias, g.vh]));
    const clientes = new Map(), faltan = [];
    const cli = c => { if (!clientes.has(c)) clientes.set(c, { cliente: c, est: new Map(), real: new Map(), piezas: [], porFmt: new Map(), sinAsignar: 0 }); return clientes.get(c); };
    const sumar = (mapa, al, min) => mapa.set(al, (mapa.get(al) || 0) + min);
    // Clientes con servicio mensual ese mes
    S.A.filter(a => abonoEnMes(a, m)).forEach(a => cli(a.cliente));
    // Redes: piezas del mes (tiempo estándar por formato) + gestión mensual de la cuenta
    (S.RM || []).filter(x => x.mes === m).forEach(mes => {
      const ps = red ? red.piezas(mes._id) : null; if (!ps) { faltan.push(mes._id); return; }
      const f = cli(mes.cliente), eq = equipoCuenta(mes.cliente, m), dis = conRol(eq, /diseñ/i), cue = conRol(eq, /cuenta/i);
      ps.forEach(z => {
        const t = tiempoFmt(z.formato), quien = z.resp && eq.has(z.resp) ? [z.resp] : dis;
        const pz = { formato: z.formato || 'Otro', min: [] };
        if (quien.length) quien.forEach(al => { sumar(f.est, al, t.dis / quien.length); pz.min.push([al, t.dis / quien.length]); }); else f.sinAsignar += t.dis;
        if (cue.length) cue.forEach(al => { sumar(f.est, al, t.cue / cue.length); pz.min.push([al, t.cue / cue.length]); }); else f.sinAsignar += t.cue;
        f.piezas.push(pz);
      });
    });
    const C = cfg();
    clientes.forEach((f, c) => {
      const eq = equipoCuenta(c, m); if (!eq.size) return;
      const cue = conRol(eq, /cuenta/i), dir = conRol(eq, /direcci/i);
      cue.forEach(al => sumar(f.est, al, C.gestion.cuentas / cue.length));
      dir.forEach(al => sumar(f.est, al, C.gestion.direccion / dir.length));
    });
    // Horas reales (reloj): por persona y cliente reemplazan lo estimado
    const hr = AD.ct.hr && AD.ct.hr.m === m ? AD.ct.hr.registro : [];
    hr.forEach(r => { if (r.cliente && r.persona) sumar(cli(r.cliente).real, r.persona, r.horas * 60); });
    // Generales: promedio de los últimos 3 meses cerrados (más estable que el mes en curso)
    const meses3 = [addMonth(m, -1), addMonth(m, -2), addMonth(m, -3)], imputado = id => AD.IMP.filter(x => x.movimiento_id === id).reduce((a, x) => a + x.monto, 0);
    const movsG = AD.MV.filter(v => v.egreso > 0 && v.moneda === 'ARS' && meses3.includes((v.fecha || '').slice(0, 7)) && C.generales.includes(v.cuenta));
    const generales = r2(movsG.reduce((a, v) => a + Math.max(0, v.egreso - imputado(v.id)), 0) / 3);
    // Resultado por cliente
    const R = { desde: m + '-01', hasta: m + '-' + String(new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).getUTCDate()).padStart(2, '0') };
    let minAsig = 0; const usoPersona = new Map();
    const filas = [...clientes.values()].map(f => {
      const tiempo = new Map(f.est); f.real.forEach((min, al) => tiempo.set(al, min)); // lo real manda
      const det = [...tiempo].map(([al, min]) => ({ al, min, real: f.real.has(al), costo: min / 60 * (vh.get(al) || 0), sinVh: !vh.has(al) }));
      const min = det.reduce((a, d) => a + d.min, 0); minAsig += min; det.forEach(d => usoPersona.set(d.al, (usoPersona.get(d.al) || 0) + d.min));
      const equipo = det.reduce((a, d) => a + d.costo, 0);
      const abs = S.A.filter(a => a.cliente === f.cliente && abonoEnMes(a, m));
      const ingreso = abs.reduce((a, x) => { const p = precioEn(x._id, m); return a + (p && (p.moneda || 'ARS') === 'ARS' ? +p.monto || 0 : 0); }, 0);
      const ingOtras = abs.some(x => { const p = precioEn(x._id, m); return p && (p.moneda || 'ARS') !== 'ARS'; });
      const directos = [...abs.map(a => costosDe('abono', a._id, R)), ...S.P.filter(p => p.cliente === f.cliente).map(p => costosDe('proyecto', p._id, R))].reduce((a, acc) => a + (acc.ARS || 0), 0);
      // Costo de las piezas (sin la gestión mensual) y por formato
      const costoPz = z => z.min.reduce((a, [al, mn]) => a + (f.real.has(al) ? 0 : mn / 60 * (vh.get(al) || 0)), 0);
      const porFmt = new Map(); f.piezas.forEach(z => { const g = porFmt.get(z.formato) || { n: 0, costo: 0 }; g.n++; g.costo += costoPz(z); porFmt.set(z.formato, g); });
      return { ...f, det: det.sort((a, b) => b.costo - a.costo), min, equipo: r2(equipo), ingreso, ingOtras, directos: r2(directos), porFmt, nPz: f.piezas.length };
    }).filter(f => f.min || f.ingreso || f.directos);
    const costoEquipo = gente.reduce((a, g) => a + g.costo, 0), asignado = filas.reduce((a, f) => a + f.equipo, 0);
    const libre = Math.max(0, costoEquipo - asignado), estructura = generales;
    // Los gastos generales se reparten según lo que cobra cada cliente (si nadie tiene precio cargado, según el tiempo).
    // El tiempo del equipo que no está en ningún cliente no se carga a los clientes: se muestra aparte, porque si es alto
    // es que faltan meses o equipos cargados (o hay capacidad libre), y cargarlo inflaría el costo de los que sí están.
    const ingTot = filas.reduce((a, f) => a + f.ingreso, 0);
    filas.forEach(f => {
      f.directo = r2(f.equipo + f.directos);
      f.parte = ingTot ? r2(estructura * f.ingreso / ingTot) : minAsig ? r2(estructura * f.min / minAsig) : 0;
      f.completo = r2(f.directo + f.parte);
      f.margenD = r2(f.ingreso - f.directo); f.margenC = r2(f.ingreso - f.completo);
      f.pctC = f.ingreso ? Math.round(f.margenC / f.ingreso * 100) : null;
      f.porPieza = f.nPz ? r2(f.equipo / f.nPz) : null; // incluye la gestión de la cuenta repartida en las piezas
    });
    filas.sort((a, b) => (a.pctC ?? 999) - (b.pctC ?? 999) || cmp(a.cliente, b.cliente));
    return { m, gente: gente.map(g => ({ ...g, usoMin: usoPersona.get(g.alias) || 0 })), filas, generales, movsG, costoEquipo, asignado, libre, estructura, faltan, hayReal: hr.length > 0 };
  }

  /* ---------- Vista ---------- */
  const M = v => money(Math.round(v || 0), 'ARS');
  const H = min => { const h = min / 60; return (h >= 10 ? Math.round(h) : Math.round(h * 10) / 10).toLocaleString('es-AR') + ' h'; };
  function vista() {
    const m = AD.ct.mes;
    if ((!AD.ct.hr || AD.ct.hr.m !== m) && !AD.ct.cargando) {
      AD.ct.cargando = true; const fin = new Date(Date.UTC(+m.slice(0, 4), +m.slice(5, 7), 0)).toISOString().slice(0, 10);
      data.horasRango(m + '-01', fin).then(r => { AD.ct.hr = { m, registro: r.registro || [] }; }, () => { AD.ct.hr = { m, registro: [] }; }).finally(() => { AD.ct.cargando = false; ctx.render(); });
    }
    const X = calcular(m);
    if (X.faltan.length && ctx.red && !AD.ct.pidiendo) { AD.ct.pidiendo = true; ctx.red().cargar(X.faltan).finally(() => { AD.ct.pidiendo = false; ctx.render(); }); }
    const C = cfg(), totMin = X.gente.reduce((a, g) => a + g.horas * 60, 0), usado = X.gente.reduce((a, g) => a + g.usoMin, 0);
    let h = '<section class="sheet sx ct"><div class="sx-h"><span class="sx-i">' + (k.ICON && k.ICON.plata || '') + '</span><h2>Cuánto cuesta cada cliente <span class="sx-sub">(' + esc(cap(monthLabel(m))) + ', en pesos)</span></h2>' +
      '<div class="sx-der ct-mes"><button class="btn ghost sm" data-act="ctMes" data-d="-1" aria-label="Mes anterior">←</button><button class="btn ghost sm" data-act="ctMes" data-d="0">Este mes</button><button class="btn ghost sm" data-act="ctMes" data-d="1" aria-label="Mes siguiente">→</button></div></div>' +
      '<div class="sx-ns"><div class="sx-n"><b>' + esc(M(X.costoEquipo)) + '</b><span>Costo del equipo</span><small>' + X.gente.length + ' personas · sueldos del mes</small></div>' +
      '<div class="sx-n"><b>' + esc(totMin ? Math.round(usado / totMin * 100) : 0) + '%</b><span>Del tiempo, en clientes</span><small>' + esc(H(usado)) + ' de ' + esc(H(totMin)) + ' productivas</small></div>' +
      '<div class="sx-n"><b>' + esc(M(X.generales)) + '</b><span>Gastos generales</span><small>promedio de los últimos 3 meses</small></div>' +
      '<div class="sx-n"><b>' + esc(M(X.libre)) + '</b><span>Equipo sin cliente</span><small>tiempo libre o interno, no se carga a los clientes</small></div></div>' +
      (totMin && usado / totMin < 0.5 ? '<p class="sx-lead ct-nota ct-aviso">Solo el ' + Math.round(usado / totMin * 100) + '% del tiempo del equipo aparece en algún cliente. Lo más probable es que falten meses de Redes armados o personas asignadas en las cuentas (Redes → Clientes y planes). Mientras tanto, el costo de cada cliente sale más bajo de lo real.</p>' : '') +
      (X.hayReal ? '' : '<p class="sx-lead ct-nota">El tiempo es <b>estimado</b> con los tiempos estándar de abajo (nadie cargó horas este mes). Cuando alguien carga horas con el reloj, las de esa persona en ese cliente reemplazan la estimación.</p>');
    if (!X.filas.length) h += emptyBox('Sin clientes con servicio este mes', 'Cuando haya abonos activos y meses de Redes armados, acá aparece cuánto cuesta cada uno.');
    else h += '<div class="tbl"><table class="ct-t"><thead><tr><th>Cliente</th><th class="r">Cobra</th><th class="r">Tiempo</th><th class="r">Costo directo</th><th class="r">Costo completo</th><th class="r">Queda</th><th class="r">Por pieza</th></tr></thead><tbody>' +
      X.filas.map(f => '<tr class="click" data-act="ctVer" data-c="' + esc(f.cliente) + '"><td class="name">' + (ctx.av ? '<span class="sx-cl">' + ctx.av(f.cliente, (S.C.find(x => x.nombre === f.cliente) || {}).avatar, 'sq') + '<b>' + esc(f.cliente) + '</b></span>' : esc(f.cliente)) + '</td>' +
        '<td class="r money">' + (f.ingreso ? esc(M(f.ingreso)) : '<span class="muted">—</span>') + (f.ingOtras ? '<span class="sub">+ en otra moneda</span>' : '') + '</td>' +
        '<td class="r">' + esc(H(f.min)) + (f.real.size ? '<span class="sub">con horas reales</span>' : '') + '</td>' +
        '<td class="r money">' + esc(M(f.directo)) + '</td><td class="r money">' + esc(M(f.completo)) + '</td>' +
        '<td class="r"><b class="money' + (f.margenC < 0 ? ' neg' : '') + '">' + esc(M(f.margenC)) + '</b>' + (f.pctC != null ? '<span class="sub">' + f.pctC + '%</span>' : '') + '</td>' +
        '<td class="r money">' + (f.porPieza != null ? esc(M(f.porPieza)) + '<span class="sub">' + f.nPz + ' piezas</span>' : '<span class="muted">—</span>') + '</td></tr>').join('') + '</tbody></table></div>';
    h += '</section>';
    // Equipo: valor hora
    h += '<section class="sheet sx"><div class="sx-h"><h2>Valor hora de cada persona</h2></div><div class="tbl"><table class="ct-eq"><thead><tr><th>Persona</th><th class="r">Cuesta por mes</th><th class="r">Horas productivas</th><th class="r">Valor hora</th><th class="r">Ocupación</th></tr></thead><tbody>' +
      X.gente.map(g => '<tr><td class="name"><b>' + esc(g.alias) + '</b><span class="sub">' + esc(g.tipo || '') + (g.futuro ? ' · usa el sueldo cargado desde un mes posterior' : '') + (g.otras ? ' · parte en otra moneda (no suma)' : '') + '</span></td>' +
        '<td class="r money">' + esc(M(g.costo)) + '</td><td class="r"><input class="in sm ct-h" type="number" min="1" step="1" data-cth="' + esc(g.alias) + '" value="' + esc(String(g.horas)) + '" aria-label="Horas productivas de ' + esc(g.alias) + '"></td>' +
        '<td class="r money"><b>' + esc(M(g.vh)) + '</b></td><td class="r">' + (g.horas ? Math.round(g.usoMin / 60 / g.horas * 100) + '%' : '—') + '<span class="sub">' + esc(H(g.usoMin)) + ' en clientes</span></td></tr>').join('') +
      '</tbody></table></div><p class="sx-lead ct-nota">Valor hora = lo que cuesta por mes (sueldo, extras fijos y aguinaldo ÷ 12) ÷ horas productivas. Por defecto: ' + C.horasDia + ' h × días hábiles × ' + C.productivo + '% (lo que queda para clientes después de reuniones internas, administración y pausas). Cambiá las horas de cada persona si trabaja otra jornada.</p></section>';
    // Supuestos
    h += '<section class="sheet sx"><details class="ct-sup"' + (AD.ct.abierto ? ' open' : '') + '><summary><h2>Tiempos estándar y supuestos</h2><span class="muted">cuánto lleva cada formato, la gestión de una cuenta y qué gastos son generales</span></summary>' +
      '<div class="ct-supb"><div class="ct-fmts"><div class="ct-fh"><span>Formato</span><span>Diseño (min)</span><span>Cuentas: copy y programar (min)</span></div>' +
      Object.entries(C.formatos).map(([f, t]) => '<div class="ct-fr"><b>' + esc(f) + '</b><input class="in sm" type="number" min="0" step="5" data-ctf="' + esc(f) + '" data-k="dis" value="' + t.dis + '"><input class="in sm" type="number" min="0" step="5" data-ctf="' + esc(f) + '" data-k="cue" value="' + t.cue + '"></div>').join('') + '</div>' +
      '<div class="ct-g"><label>Gestión mensual de cada cuenta · Cuentas (min)<input class="in sm" type="number" min="0" step="15" data-ctg="cuentas" value="' + C.gestion.cuentas + '"></label><label>Dirección (min)<input class="in sm" type="number" min="0" step="15" data-ctg="direccion" value="' + C.gestion.direccion + '"></label>' +
      '<label>Horas por día<input class="in sm" type="number" min="1" max="12" step="0.5" data-ctp="horasDia" value="' + C.horasDia + '"></label><label>% productivo<input class="in sm" type="number" min="10" max="100" step="5" data-ctp="productivo" value="' + C.productivo + '"></label></div>' +
      '<p class="ct-lbl">Gastos generales (se reparten entre los clientes según lo que cobra cada uno)</p><div class="opciones inline">' + [...new Set(AD.PC.map(p => p.cuenta))].filter(c => !/^(Venta|Ingreso|Saldo|Costo Laboral)/.test(c)).sort(cmp).map(c => '<label class="opcion"><input type="checkbox" data-ctgen="' + esc(c) + '"' + (C.generales.includes(c) ? ' checked' : '') + '><span>' + esc(c) + '</span></label>').join('') + '</div>' +
      '<p class="sx-lead ct-nota">Las piezas se reparten entre las personas de la cuenta según su rol (Diseño y Cuentas); si la pieza tiene a alguien elegido, es de esa persona. La gestión mensual va a Cuentas y Dirección. Los proyectos solo suman tiempo si se cargan horas.</p></div></details></section>';
    return h;
  }
  function detalle(c) {
    const X = calcular(AD.ct.mes), f = X.filas.find(x => x.cliente === c); if (!f) return;
    const fila = (l, v, cls) => '<div class="ct-dr' + (cls ? ' ' + cls : '') + '"><span>' + l + '</span><b>' + v + '</b></div>';
    $('#panel').innerHTML = '<div class="panel-h"><div><span class="eyebrow">Costo · ' + esc(cap(monthLabel(AD.ct.mes))) + '</span><h2 id="panel-title">' + esc(c) + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b ct-det"><div class="full ct-dl">' + fila('Cobra por mes', esc(M(f.ingreso))) + fila('Tiempo del equipo (' + esc(H(f.min)) + ')', esc(M(f.equipo))) + fila('Gastos directos (proveedores, pauta…)', esc(M(f.directos))) +
        fila('Costo directo', esc(M(f.directo)), 'tot') + fila('Parte de los gastos generales', esc(M(f.parte))) + fila('Costo completo', esc(M(f.completo)), 'tot') +
        fila('Queda', '<span class="' + (f.margenC < 0 ? 'neg' : '') + '">' + esc(M(f.margenC)) + (f.pctC != null ? ' · ' + f.pctC + '%' : '') + '</span>', 'tot') + '</div>' +
      '<div class="full"><h3 class="ct-h3">Quién trabaja y cuánto</h3>' + f.det.map(d => fila(esc(d.al) + ' · ' + esc(H(d.min)) + (d.real ? ' <span class="pzst" style="--c:var(--s-entregado)">real</span>' : ' <span class="muted">estimado</span>') + (d.sinVh ? ' <span class="muted">(sin sueldo cargado)</span>' : ''), esc(M(d.costo)))).join('') + (f.sinAsignar ? '<p class="muted">' + esc(H(f.sinAsignar)) + ' de piezas sin nadie con ese rol en la cuenta: no suman costo.</p>' : '') + '</div>' +
      (f.nPz ? '<div class="full"><h3 class="ct-h3">Piezas del mes</h3>' + fila(f.nPz + ' piezas · promedio por pieza (con la gestión de la cuenta)', esc(M(f.porPieza))) +
        [...f.porFmt].map(([fm, g]) => fila(esc(fm) + ' · ' + g.n, 'cada una ' + esc(M(g.costo / g.n)))).join('') + '<p class="muted">Por formato es solo el tiempo de hacerla (diseño, copy y programación), sin la gestión mensual.</p></div>' : '') +
      '</div><div class="panel-f"><span></span><button type="button" class="btn" data-act="close">Cerrar</button></div>';
    $('#panel').hidden = false; $('#scrim').hidden = false;
  }

  /* ---------- Acciones ---------- */
  const actions = {
    ctMes: t => { const d = +t.dataset.d; AD.ct.mes = d ? addMonth(AD.ct.mes, d) : thisMonth(); ctx.render(); },
    ctVer: t => detalle(t.dataset.c),
  };
  document.addEventListener('toggle', e => { if (e.target && e.target.classList && e.target.classList.contains('ct-sup')) AD.ct.abierto = e.target.open; }, true);
  document.addEventListener('change', async e => {
    const t = e.target; if (!t.dataset) return;
    try {
      const C = cfg();
      if (t.dataset.cth) { await guardarCfg({ horasPersona: { ...C.horasPersona, [t.dataset.cth]: Math.max(1, +t.value || 0) } }); }
      else if (t.dataset.ctf) { const f = t.dataset.ctf; await guardarCfg({ formatos: { ...C.formatos, [f]: { ...C.formatos[f], [t.dataset.k]: Math.max(0, +t.value || 0) } } }); }
      else if (t.dataset.ctg) { await guardarCfg({ gestion: { ...C.gestion, [t.dataset.ctg]: Math.max(0, +t.value || 0) } }); }
      else if (t.dataset.ctp) { await guardarCfg({ [t.dataset.ctp]: Math.max(0, +t.value || 0) }); }
      else if (t.dataset.ctgen) { const s = new Set(C.generales); if (t.checked) s.add(t.dataset.ctgen); else s.delete(t.dataset.ctgen); await guardarCfg({ generales: [...s] }); }
      else return;
      toast('Guardado'); ctx.render();
    } catch (er) { toast(er.message); }
  });
  return { vista, actions, calcular };
}
