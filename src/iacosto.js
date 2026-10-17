// Cuánto cuesta Mr. Piggy: precios de la API de Anthropic (US$ por millón de tokens, entrada / salida) y la cuenta
// estimada a partir del registro de uso (ia_log). Es una estimación: el gasto real se ve en console.anthropic.com.
// Precios de platform.claude.com/docs/en/about-claude/pricing (octubre de 2026).
export const MODELOS_IA = [
  { id: 'claude-sonnet-5-5', n: 'Sonnet 5.5', in: 2, out: 10, nota: 'Equilibrio calidad y precio (recomendado)' },
  { id: 'claude-opus-5-5', n: 'Opus 5.5', in: 4, out: 20, nota: 'Mejor redacción · cuesta el doble que Sonnet' },
  { id: 'claude-fable-5-1', n: 'Fable 5.1', in: 10, out: 50, nota: 'El más potente · cuesta 5 veces Sonnet' },
];
const PRECIOS = { 'claude-haiku-5-5': [0.1, 0.5], 'claude-sonnet-5': [2, 10], 'claude-opus-5': [5, 25], 'claude-sonnet-4-6': [3, 15], 'claude-sonnet-4-5': [3, 15], 'claude-haiku-4-5': [1, 5], 'claude-fable-5': [10, 50] };
MODELOS_IA.forEach(m => { PRECIOS[m.id] = [m.in, m.out]; });
export const MODELO_REDES_DEF = 'claude-sonnet-5-5';
const BUSQUEDA = 0.01; // US$ por búsqueda web; "Efemérides y noticias" hace hasta 5
export const nombreModelo = id => (MODELOS_IA.find(m => m.id === id) || {}).n || (id || '').replace(/^claude-/, '');
export function precioDe(id) {
  if (PRECIOS[id]) return PRECIOS[id];
  const k = Object.keys(PRECIOS).filter(p => (id || '').startsWith(p)).sort((a, b) => b.length - a.length)[0];
  return k ? PRECIOS[k] : null;
}
// rows: [{ modelo, accion, tokens_in, tokens_out }] → { usd, consultas, porModelo: [{ modelo, n, usd }], busquedas, sinPrecio }
export function gastoIA(rows) {
  const por = new Map(); let usd = 0, busquedas = 0, sinPrecio = 0;
  (rows || []).forEach(r => {
    // Haiku 5.5 cobra más cuando el pedido pasa los 100 mil tokens (pasa con la búsqueda web)
    const p = /^claude-haiku-5-5/.test(r.modelo || '') && (+r.tokens_in || 0) > 100_000 ? [0.5, 2.5] : precioDe(r.modelo), c = p ? ((+r.tokens_in || 0) * p[0] + (+r.tokens_out || 0) * p[1]) / 1e6 : 0;
    if (!p) sinPrecio++;
    const b = r.accion === 'redes_investigar' && r.ok !== false ? 5 * BUSQUEDA : 0; busquedas += b;
    const e = por.get(r.modelo) || { modelo: r.modelo, n: 0, usd: 0 }; e.n++; e.usd += c + b; por.set(r.modelo, e); usd += c + b;
  });
  return { usd, consultas: (rows || []).length, porModelo: [...por.values()].sort((a, b) => b.usd - a.usd), busquedas, sinPrecio };
}
export const usd = n => 'US$ ' + (n < 10 ? n.toFixed(2) : Math.round(n)).toString().replace('.', ',');
