// Nombres y conceptos de facturas siempre iguales, vengan como vengan.
// Archivo: CLIENTE-MES-AÑO.pdf (mayúsculas, sin tildes, mes de tres letras). Ej: APROMAX-OCT-2026.pdf
// Concepto: servicios + mes y año. Ej: "Redes y Ads · Octubre 2026".
const MES3 = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const sinTildes = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
export const slugCliente = c => sinTildes(c).toUpperCase().replace(/&/g, ' Y ').replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'CLIENTE';
const okMes = p => /^\d{4}-\d{2}/.test(String(p || ''));
export const mesAnio = p => okMes(p) ? MESES[+String(p).slice(5, 7) - 1] + ' ' + String(p).slice(0, 4) : '';

// usados: nombres que ya existen (para no repetir; se agrega -2, -3…)
export function nombreArchivoFactura(cliente, periodo, { tipo = '', ext = 'pdf', usados = [] } = {}) {
  if (!cliente || !okMes(periodo)) return '';
  const p = String(periodo);
  const base = slugCliente(cliente) + '-' + MES3[+p.slice(5, 7) - 1] + '-' + p.slice(0, 4) + (/cr[eé]dito/i.test(tipo) ? '-NC' : '');
  const e = String(ext || 'pdf').toLowerCase().replace(/^\./, '').replace('jpeg', 'jpg');
  const set = new Set(usados.map(x => String(x || '').toUpperCase()));
  let n = 1, nom = base + '.' + e;
  while (set.has(nom.toUpperCase())) nom = base + '-' + (++n) + '.' + e;
  return nom;
}
export const extDe = nombre => (String(nombre || '').match(/\.([a-z0-9]{2,4})$/i) || [, 'pdf'])[1].toLowerCase();

// servicios: lista de nombres ('Redes', 'Ads', un proyecto…). Sin servicios devuelve ''.
export function conceptoFactura(servicios, periodo) {
  const s = [...new Set((servicios || []).map(x => String(x || '').trim()).filter(Boolean))];
  if (!s.length) return '';
  const lista = s.length === 1 ? s[0] : s.slice(0, -1).join(', ') + ' y ' + s[s.length - 1];
  return lista + (okMes(periodo) ? ' · ' + mesAnio(periodo) : '');
}
