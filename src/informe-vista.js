// Informe mensual de redes tal como lo ve el cliente: la misma vista en la app (vista previa) y en el portal.
// Encabezado de color, números grandes en tarjetas de color suave, gráfico de "este mes vs. el anterior",
// reparto por red, lo que se publicó por formato, el texto, lo que mejor funcionó y lo que viene. Sin bordes.
export const PALETA = ['#1CB0F6', '#FF9600', '#56CB01', '#CE82FF', '#FFC800', '#1899D6', '#9BE0FF', '#8A93A3'];
export const PUBLICADA = ['Programada', 'Publicada', 'Aprobada'];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtN = v => v == null || v === '' || isNaN(+v) ? '—' : Number(v).toLocaleString('es-AR', { maximumFractionDigits: 2 });
// Número para tarjetas y etiquetas, siempre completo (nada de "mil", k ni M): 18.450, 1.250.000, 3,5.
export const corto = v => {
  if (v == null || isNaN(+v)) return '—'; const n = +v, a = Math.abs(n);
  return n.toLocaleString('es-AR', { maximumFractionDigits: a >= 100 ? 0 : 2 });
};
export const variacion = x => (x && x.anterior && x.valor != null && +x.anterior !== 0) ? Math.round((x.valor / x.anterior - 1) * 100) : null;
// Reparto por red: la métrica (p. ej. Alcance) que aparece en dos o más redes.
export function porRed(met) {
  const g = new Map(); (met || []).forEach(x => { if (!x.red || x.valor == null) return; const k = String(x.nombre).trim().toLowerCase(); (g.get(k) || g.set(k, []).get(k)).push(x); });
  const cand = [...g.values()].filter(a => a.length >= 2).sort((a, b) => b.reduce((s, x) => s + +x.valor, 0) - a.reduce((s, x) => s + +x.valor, 0));
  return cand.length ? { nombre: cand[0][0].nombre, filas: cand[0].map(x => ({ red: x.red, valor: +x.valor })) } : null;
}
export function porFormato(piezas) {
  const o = {}; (piezas || []).filter(z => PUBLICADA.includes(z.estado)).forEach(z => { const f = z.formato || 'Otro'; o[f] = (o[f] || 0) + 1; });
  return Object.entries(o).sort((a, b) => b[1] - a[1]);
}

function dona(filas) {
  const tot = filas.reduce((s, f) => s + f.valor, 0) || 1, R = 58, r = 40, cx = 64, cy = 64;
  let a0 = -Math.PI / 2, h = '';
  filas.forEach((f, i) => {
    const a1 = a0 + f.valor / tot * Math.PI * 2, big = a1 - a0 > Math.PI ? 1 : 0;
    const p = (rr, a) => (cx + rr * Math.cos(a)).toFixed(2) + ' ' + (cy + rr * Math.sin(a)).toFixed(2);
    h += filas.length === 1 ? '<circle cx="64" cy="64" r="44" fill="none" stroke="' + PALETA[i] + '" stroke-width="20"/>'
      : '<path d="M' + p(R, a0) + ' A' + R + ' ' + R + ' 0 ' + big + ' 1 ' + p(R, a1) + ' L' + p(r, a1) + ' A' + r + ' ' + r + ' 0 ' + big + ' 0 ' + p(r, a0) + 'Z" fill="' + PALETA[i % PALETA.length] + '"/>';
    a0 = a1;
  });
  return '<svg viewBox="0 0 128 128" width="128" height="128" role="img" aria-label="Reparto por red">' + h + '<text x="64" y="62" text-anchor="middle" class="ir-dn-b"' + (corto(tot).length > 7 ? ' style="font-size:' + Math.max(10, 15 - (corto(tot).length - 7) * 1.2).toFixed(1) + 'px"' : '') + '>' + esc(corto(tot)) + '</text><text x="64" y="78" text-anchor="middle" class="ir-dn-s">en total</text></svg>';
}

// Plata con su moneda, siempre completa
export const plata = (v, mon) => v == null || isNaN(+v) ? '—' : (mon && mon !== 'ARS' ? mon + ' ' : '$ ') + Number(v).toLocaleString('es-AR', { maximumFractionDigits: Math.abs(+v) >= 1000 ? 0 : 2 });
const varPct = (v, a) => (a && v != null && +a !== 0) ? Math.round((v / a - 1) * 100) : null;
// Resultados de la pauta: inversión, resultado principal y costo por resultado (bajar el costo es bueno).
export function adsDatos(a) {
  if (!a || (a.inversion == null && a.resultados == null)) return null;
  const kp = [
    { l: 'Inversión', v: a.inversion, t: plata(a.inversion, a.moneda), d: varPct(a.inversion, a.inversion_anterior), bueno: null, ant: a.inversion_anterior != null ? plata(a.inversion_anterior, a.moneda) : '' },
    { l: a.resultado || 'Resultados', v: a.resultados, t: corto(a.resultados), d: varPct(a.resultados, a.resultados_anterior), bueno: 1, ant: a.resultados_anterior != null ? corto(a.resultados_anterior) : '' },
    { l: 'Costo por ' + ({ conversaciones: 'conversación', mensajes: 'mensaje', clics: 'clic', leads: 'contacto', contactos: 'contacto', compras: 'compra', seguidores: 'seguidor', ventas: 'venta' }[String(a.resultado || '').toLowerCase().split(/\s+/)[0]] || 'resultado'), v: a.costo, t: plata(a.costo, a.moneda), d: varPct(a.costo, a.costo_anterior), bueno: -1, ant: a.costo_anterior != null ? plata(a.costo_anterior, a.moneda) : '' },
  ].filter(k => k.v != null);
  const segs = (a.segmentos || []).filter(x => x && x.nombre && String(x.nombre).trim());
  return { kp, segs, plat: a.plataforma || 'Ads', texto: a.texto || '', moneda: a.moneda };
}
function adsVista(a) {
  const x = adsDatos(a); if (!x) return '';
  let h = '<section class="ir-ads"><h3>Publicidad en ' + esc(x.plat) + '</h3><div class="ir-kpis" style="--cols:' + x.kp.length + '">' + x.kp.map((k, i) => {
    const c = ['#FF9600', '#1CB0F6', '#56CB01'][i % 3], cls = k.d == null || k.bueno == null ? 'eq' : (k.d * k.bueno > 0 ? 'up' : k.d * k.bueno < 0 ? 'down' : 'eq');
    return '<div class="ir-kpi" style="--c:' + c + '"><span class="ir-kl">' + esc(k.l) + '</span><b>' + esc(k.t) + '</b>' + (k.d != null ? '<span class="ir-d ' + cls + '">' + (k.d > 0 ? '▲ ' : k.d < 0 ? '▼ ' : '') + Math.abs(k.d) + '%<small> vs. ' + esc(k.ant) + '</small></span>' : '') + '</div>';
  }).join('') + '</div>';
  if (x.segs.length) {
    const mx = Math.max(...x.segs.map(s => +s.resultados || 0)) || 1;
    h += '<div class="ir-card ir-segs"><h3>Por segmento</h3>' + x.segs.map((s, i) => '<div class="ir-fb"><span>' + esc(s.nombre) + '</span><div class="ir-bar"><i style="width:' + Math.max(3, (+s.resultados || 0) / mx * 100).toFixed(1) + '%;background:' + PALETA[(i + 1) % PALETA.length] + '"></i><span>' + esc(corto(s.resultados)) + (s.costo != null ? ' · ' + esc(plata(s.costo, x.moneda)) + ' c/u' : '') + '</span></div></div>').join('') + '</div>';
  }
  if (x.texto) h += '<p class="ir-ads-t">' + esc(x.texto) + '</p>';
  return h + '</section>';
}

/** o = { inf, cliente, mesLabel, piezas, descargar: html del botón, editable } */
export function informeVista(o) {
  const inf = o.inf || {}, d = inf.datos || {}, met = (d.metricas || []).filter(x => x && x.nombre && String(x.nombre).trim());
  const dst = (d.destacadas || []).filter(x => x && x.titulo && String(x.titulo).trim()), rec = (d.recomendaciones || []).filter(Boolean);
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  let h = '<article class="ir">';
  // Encabezado
  const subidas = met.filter(x => (variacion(x) || 0) > 0).length, conAnt = met.filter(x => variacion(x) != null).length;
  h += '<header class="ir-hero"><div class="ir-hero-t"><span class="ir-eb">Informe de redes</span><h2>' + esc(cap(o.mesLabel || '')) + '</h2><p>' + esc(o.cliente || '') + '</p>' +
    (conAnt ? '<span class="ir-hero-pill">' + subidas + ' de ' + conAnt + ' métricas crecieron contra el mes anterior</span>' : '') + '</div>' +
    (o.descargar ? '<div class="ir-hero-a">' + o.descargar + '</div>' : '') + '</header>';
  // Números
  if (met.length) {
    const n = met.length, cols = n <= 4 ? n : n <= 6 ? 3 : 4;
    h += '<section class="ir-kpis" style="--cols:' + cols + '">' + met.map((x, i) => {
      const v = variacion(x), c = PALETA[i % PALETA.length];
      return '<div class="ir-kpi" style="--c:' + c + '"><span class="ir-kl">' + esc(x.nombre) + (x.red ? '<i>' + esc(x.red) + '</i>' : '') + '</span><b title="' + esc(fmtN(x.valor)) + '">' + esc(corto(x.valor)) + '</b>' +
        (v != null ? '<span class="ir-d ' + (v > 0 ? 'up' : v < 0 ? 'down' : 'eq') + '">' + (v > 0 ? '▲ ' : v < 0 ? '▼ ' : '') + Math.abs(v) + '%<small> vs. ' + esc(corto(x.anterior)) + '</small></span>' : '<span class="ir-d nada">primer mes medido</span>') + '</div>';
    }).join('') + '</section>';
  } else h += '<p class="ir-vacio">Todavía no hay métricas cargadas.</p>';
  // Gráficos
  const comp = met.filter(x => x.anterior != null && x.anterior !== '' && x.valor != null);
  const red = porRed(met), fmts = porFormato(o.piezas);
  if (comp.length || red || fmts.length) {
    h += '<section class="ir-graf">';
    if (comp.length) {
      h += '<div class="ir-card ir-comp"><h3>Este mes vs. el anterior</h3><div class="ir-ley"><span><i style="background:var(--ir-prev)"></i>Mes anterior</span><span><i style="background:linear-gradient(90deg,#1CB0F6 0 33%,#FF9600 33% 66%,#56CB01 66%)"></i>Este mes</span></div>' +
        comp.map((x, i) => {
          const mx = Math.max(+x.valor, +x.anterior) || 1, v = variacion(x), c = PALETA[met.indexOf(x) % PALETA.length];
          return '<div class="ir-cb"><div class="ir-cb-h"><span>' + esc(x.nombre) + (x.red ? ' <i>· ' + esc(x.red) + '</i>' : '') + '</span>' + (v != null ? '<b class="' + (v >= 0 ? 'up' : 'down') + '">' + (v > 0 ? '+' : '') + v + '%</b>' : '') + '</div>' +
            '<div class="ir-bar prev"><i style="width:' + Math.max(2, x.anterior / mx * 100).toFixed(1) + '%"></i><span>' + esc(corto(x.anterior)) + '</span></div>' +
            '<div class="ir-bar"><i style="width:' + Math.max(2, x.valor / mx * 100).toFixed(1) + '%;background:' + c + '"></i><span>' + esc(corto(x.valor)) + '</span></div></div>';
        }).join('') + '</div>';
    }
    if (red || fmts.length) {
      h += '<div class="ir-col">';
      if (red) {
        const tot = red.filas.reduce((s, f) => s + f.valor, 0) || 1;
        h += '<div class="ir-card ir-red"><h3>' + esc(red.nombre) + ' por red</h3><div class="ir-dn">' + dona(red.filas) + '<ul>' + red.filas.map((f, i) => '<li><i style="background:' + PALETA[i % PALETA.length] + '"></i>' + esc(f.red) + '<b>' + Math.round(f.valor / tot * 100) + '%</b></li>').join('') + '</ul></div></div>';
      }
      if (fmts.length) {
        const mx = Math.max(...fmts.map(f => f[1])), tot = fmts.reduce((s, f) => s + f[1], 0);
        h += '<div class="ir-card ir-fmt"><h3>Lo que publicamos <span>' + tot + ' piezas</span></h3>' + fmts.map(([f, n], i) => '<div class="ir-fb"><span>' + esc(f) + '</span><div class="ir-bar"><i style="width:' + (n / mx * 100).toFixed(1) + '%;background:' + PALETA[(i + 3) % PALETA.length] + '"></i><span>' + n + '</span></div></div>').join('') + '</div>';
      }
      h += '</div>';
    }
    h += '</section>';
  }
  // Publicidad (Ads)
  h += adsVista(d.ads);
  // Texto
  if (inf.texto) h += '<section class="ir-txt"><h3>Cómo fue el mes</h3>' + esc(inf.texto).split(/\n\s*\n/).map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('') + '</section>';
  if (dst.length) h += '<section class="ir-dst"><h3>Lo que mejor funcionó</h3><div class="ir-dst-g">' + dst.map((x, i) => '<div class="ir-dc" style="--c:' + PALETA[(i * 3 + 1) % PALETA.length] + '"><span class="ir-dn-n">' + (i + 1) + '</span><b>' + esc(x.titulo) + '</b>' + (x.por_que ? '<p>' + esc(x.por_que) + '</p>' : '') + '</div>').join('') + '</div></section>';
  if (rec.length) h += '<section class="ir-rec"><h3>Para el mes que viene</h3><ul>' + rec.map((x, i) => '<li style="--c:' + PALETA[(i + 2) % PALETA.length] + '"><span aria-hidden="true">→</span>' + esc(x) + '</li>').join('') + '</ul></section>';
  // Tabla para lectores de pantalla
  h += '<table class="sr-only"><caption>Métricas</caption><thead><tr><th>Métrica</th><th>Red</th><th>Este mes</th><th>Mes anterior</th></tr></thead><tbody>' + met.map(x => '<tr><td>' + esc(x.nombre) + '</td><td>' + esc(x.red || '') + '</td><td>' + esc(fmtN(x.valor)) + '</td><td>' + esc(fmtN(x.anterior)) + '</td></tr>').join('') + '</tbody></table>';
  return h + '</article>';
}
