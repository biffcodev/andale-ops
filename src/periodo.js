// Período para los números: este mes, mes pasado, últimos 3, 6 o 12 meses, este año, un año puntual o fechas a elección.
// Devuelve el rango, el período anterior del mismo largo (para comparar) y cómo agrupar (por mes, o por semana si es corto).
const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESL = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const PRESETS = [['mes', 'Este mes'], ['mesant', 'Mes pasado'], ['3m', 'Últimos 3 meses'], ['6m', 'Últimos 6 meses'], ['12m', 'Últimos 12 meses'], ['anio', 'Este año'], ['anioant', 'Año pasado']];

const iso = d => d.toISOString().slice(0, 10);
const D = s => new Date(s + 'T12:00:00Z');
const masDias = (s, n) => { const d = D(s); d.setUTCDate(d.getUTCDate() + n); return iso(d); };
const masMeses = (s, n) => { const [y, m, dd] = s.split('-').map(Number); const ult = new Date(Date.UTC(y, m - 1 + n + 1, 0)).getUTCDate(); return iso(new Date(Date.UTC(y, m - 1 + n, Math.min(dd, ult), 12))); };
const finDeMes = s => { const [y, m] = s.split('-').map(Number); return iso(new Date(Date.UTC(y, m, 0, 12))); };
const dias = (a, b) => Math.round((D(b) - D(a)) / 864e5) + 1;
const fmtC = s => s.slice(8, 10) + '/' + s.slice(5, 7);
const fmtL = s => +s.slice(8, 10) + ' de ' + MESL[+s.slice(5, 7) - 1] + (s.slice(0, 4) !== new Date().toISOString().slice(0, 4) ? ' de ' + s.slice(0, 4) : '');

// p = { k: 'anio' | 'mes' | … | 'y:2025' | 'rango', d?: 'AAAA-MM-DD', h?: 'AAAA-MM-DD' }; hoy = 'AAAA-MM-DD'
export function rango(p, hoy) {
  const k = (p && p.k) || 'anio', y = hoy.slice(0, 4), m1 = hoy.slice(0, 8) + '01';
  let desde, hasta, label, meses = 0;
  if (k === 'mes') { desde = m1; hasta = hoy; label = 'este mes'; meses = 1; }
  else if (k === 'mesant') { desde = masMeses(m1, -1); hasta = finDeMes(desde); label = MESL[+desde.slice(5, 7) - 1] + (desde.slice(0, 4) !== y ? ' de ' + desde.slice(0, 4) : ''); meses = 1; }
  else if (k === '3m' || k === '6m' || k === '12m') { meses = +k.replace('m', ''); desde = masMeses(m1, -(meses - 1)); hasta = hoy; label = 'los últimos ' + meses + ' meses'; }
  else if (k === 'anioant') { desde = (+y - 1) + '-01-01'; hasta = (+y - 1) + '-12-31'; label = String(+y - 1); }
  else if (k.startsWith('y:')) { const yy = k.slice(2); desde = yy + '-01-01'; hasta = yy === y ? hoy : yy + '-12-31'; label = yy; }
  else if (k === 'rango' && p.d && p.h && p.d <= p.h) { desde = p.d; hasta = p.h; label = 'del ' + fmtL(desde) + ' al ' + fmtL(hasta); }
  else { desde = y + '-01-01'; hasta = hoy; label = y; }
  if (k === 'anio' || k === 'anioant' || k.startsWith('y:')) meses = 12;
  // Período anterior: si es por meses, los mismos meses corridos para atrás (este año → el anterior a la misma fecha); si no, los mismos días.
  let pd, ph;
  if (k === 'anio' || k.startsWith('y:') || k === 'anioant') { pd = masMeses(desde, -12); ph = masMeses(hasta, -12); }
  else if (meses) { pd = masMeses(desde, -meses); ph = k === 'mesant' ? finDeMes(pd) : masMeses(hasta, -meses); }
  else { const n = dias(desde, hasta); ph = masDias(desde, -1); pd = masDias(ph, -(n - 1)); }
  const porSemana = dias(desde, hasta) <= 62;
  const grupos = (a, b) => {
    const out = [];
    if (porSemana) { for (let s = a; s <= b; s = masDias(s, 7)) { const e = masDias(s, 6) > b ? b : masDias(s, 6); out.push({ d: s, h: e, l: fmtC(s) }); } }
    else { for (let s = a; s <= b; s = masMeses(s.slice(0, 8) + '01', 1)) { const e = finDeMes(s) > b ? b : finDeMes(s); out.push({ d: s, h: e, l: MES[+s.slice(5, 7) - 1] + (a.slice(0, 4) !== b.slice(0, 4) ? ' ' + s.slice(2, 4) : '') }); } }
    return out;
  };
  const prevLabel = (k === 'anio' || k.startsWith('y:')) ? String(+desde.slice(0, 4) - 1) + (k === 'anio' ? ' a la misma fecha' : '') : k === 'anioant' ? String(+y - 2)
    : k === 'mes' ? MESL[+pd.slice(5, 7) - 1] + ' al ' + +ph.slice(8, 10) : k === 'mesant' ? MESL[+pd.slice(5, 7) - 1] : meses ? 'los ' + meses + ' meses anteriores' : 'los ' + dias(desde, hasta) + ' días anteriores';
  return { k, desde, hasta, label, porSemana, grupos: grupos(desde, hasta), prev: { desde: pd, hasta: ph, label: prevLabel, grupos: grupos(pd, ph) }, dias: dias(desde, hasta), meses: meses || Math.max(1, Math.round(dias(desde, hasta) / 30.4)) };
}
export const enRango = (fecha, r) => !!fecha && fecha.slice(0, 10) >= r.desde && fecha.slice(0, 10) <= r.hasta;

// Selector: un desplegable con los períodos y los años con datos; con "Elegir fechas" aparecen dos fechas.
export function selector(p, anios, esc, hoy) {
  const k = (p && p.k) || 'anio', y = hoy.slice(0, 4);
  const ops = [...PRESETS, ...anios.filter(a => a !== y && a !== String(+y - 1)).map(a => ['y:' + a, a]), ['rango', 'Elegir fechas…']];
  return '<div class="per">' + '<select class="in" data-per="k" aria-label="Período">' + ops.map(([v, l]) => '<option value="' + v + '"' + (v === k ? ' selected' : '') + '>' + esc(l) + '</option>').join('') + '</select>' +
    (k === 'rango' ? '<input class="in" type="date" data-per="d" aria-label="Desde" value="' + esc((p && p.d) || '') + '" max="' + hoy + '"><span class="muted">a</span><input class="in" type="date" data-per="h" aria-label="Hasta" value="' + esc((p && p.h) || '') + '" max="' + hoy + '">' : '') + '</div>';
}
