// ¿De qué mes es una factura? àndale factura a fin de mes por el mes siguiente, pero si se atrasa
// la factura sale a principio del mismo mes. En orden de confianza:
// 1) el resumen de cuenta que factura (mismo cliente y monto, de ese mes o uno vecino, sin factura todavía);
// 2) el período facturado del PDF, si está cargado de verdad (no es solo el día de la factura);
// 3) el mes que nombra el detalle o el archivo ("Fee OCT", "APROMAX-OCT-2026");
// 4) la fecha: del 20 en adelante, el mes siguiente; antes, el mismo mes. Este caso queda para revisar.
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ABR = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
const ym = (y, m) => { const d = new Date(y, m - 1, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); };
const suma = (p, n) => { const [y, m] = p.split('-').map(Number); return ym(y, m + n); };
const nombre = p => MESES[+p.slice(5, 7) - 1] + ' ' + p.slice(0, 4);
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const RE = /(?:^|[^a-z])(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sep|set|oct|nov|dic)(?![a-z])/g;

export function mesFactura(d, cliente, archivo, { R = [], F = [] } = {}) {
  d = d || {};
  const f = String(d.fecha || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return { periodo: '', por: '', seguro: false };
  const fm = f.slice(0, 7), dia = +f.slice(8, 10), tot = +d.total || 0;
  if (cliente && tot) {
    const cand = R.filter(r => r.cliente === cliente && [fm, suma(fm, 1), suma(fm, -1)].includes(r.periodo) && (!r.moneda || !d.moneda || r.moneda === d.moneda) &&
      Math.abs((+r.total || 0) - tot) <= Math.max(1, tot * 0.005) &&
      !F.some(x => x.cliente === cliente && x.periodo && String(x.periodo).slice(0, 7) === r.periodo && !/cr[eé]dito/i.test(x.tipo || '')));
    if (cand.length === 1) return { periodo: cand[0].periodo, por: 'el resumen de cuenta de ' + nombre(cand[0].periodo) + ' (mismo monto)', seguro: true };
    if (cand.length > 1) { const pref = dia >= 20 ? suma(fm, 1) : fm, c = cand.find(r => r.periodo === pref) || cand[0]; return { periodo: c.periodo, por: 'hay ' + cand.length + ' resúmenes con el mismo monto sin factura; se tomó el de ' + nombre(c.periodo), seguro: false }; }
  }
  const pd = String(d.periodo_desde || '').slice(0, 10), ph = String(d.periodo_hasta || '').slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(pd) && (pd !== f || (ph && ph !== pd))) return { periodo: pd.slice(0, 7), por: 'el período facturado del PDF', seguro: true };
  const meses = [...new Set([...norm([d.concepto, archivo].filter(Boolean).join(' ')).matchAll(RE)].map(x => ABR[x[1].slice(0, 3)]))];
  if (meses.length === 1) {
    const y = +f.slice(0, 4), base = y * 12 + +f.slice(5, 7);
    const dist = p => Math.abs(+p.slice(0, 4) * 12 + +p.slice(5, 7) - base);
    const p = [ym(y - 1, meses[0]), ym(y, meses[0]), ym(y + 1, meses[0])].sort((a, b) => dist(a) - dist(b))[0];
    if (dist(p) <= 2) return { periodo: p, por: 'el mes que figura en el detalle', seguro: true };
  }
  if (dia >= 20) return { periodo: suma(fm, 1), por: 'la fecha: emitida a fin de mes, se toma el mes siguiente', seguro: false };
  return { periodo: fm, por: 'la fecha: emitida a principio de mes, se toma ese mismo mes', seguro: false };
}
