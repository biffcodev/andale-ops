// Firma de los mails de cada persona: saludo, nombre y apellido, cargo, teléfono, email y foto.
// Se arma con los datos del perfil y lo que cada uno ajuste en "Mi perfil → Firma de los mails".
export function firmaDe(S, alias) {
  const yo = alias || (S.me && S.me.alias);
  const e = (S.E || []).find(x => x.persona === yo || x._id === (S.me && !alias ? S.me.id : '')) || {};
  const f = (e.prefs && e.prefs.firma) || {};
  const val = (k, def) => (f[k] != null && String(f[k]).trim() !== '' ? String(f[k]).trim() : def || '');
  return {
    saludo: '',
    nombre: val('nombre', e.nombre || yo || 'Equipo àndale'),
    cargo: val('cargo', e.puesto),
    tel: val('tel', e.tel),
    email: val('email', e.email),
    foto: f.foto === false ? '' : (e.avatar || ''),
    marca: 'àndale',
  };
}
export function firmaTexto(f) {
  if (!f || typeof f !== 'object') return f || '';
  return [f.saludo, f.nombre, [f.cargo, f.marca].filter(Boolean).join(' · '), [f.tel, f.email].filter(Boolean).join(' · ')].filter(x => x && String(x).trim()).join('\n');
}

// Quién firma cada mail. Se configura en Opciones (lista "firmas"): uno para los de cobranza y otro para el resto.
// Valores: el alias de una persona, '__yo' (quien lo manda) o '__no' (sin firma). En cada mail se puede cambiar.
export const FIRMA_YO = '__yo', FIRMA_NO = '__no';
export const COBRANZA = ['Resumen de cuenta', 'Factura enviada', 'Recordatorio de pago', 'Aviso de aumento', 'Invoice'];
export function firmaConfig(S) {
  const o = { cobranza: FIRMA_YO, otros: FIRMA_YO };
  ((S.L && S.L.firmas) || []).forEach(x => { const i = String(x).indexOf('='); if (i > 0) o[x.slice(0, i)] = x.slice(i + 1); });
  return o;
}
export const firmantes = S => (S.E || []).filter(e => e.activo !== false && e.persona && e.rol !== 'externo').sort((a, b) => String(a.persona).localeCompare(String(b.persona)));
// '' = sin firma; si no, el alias de quien firma.
export function firmanteDe(S, tipo) {
  const c = firmaConfig(S), v = COBRANZA.includes(tipo) ? c.cobranza : c.otros, yo = (S.me && S.me.alias) || '';
  if (v === FIRMA_NO) return '';
  if (v === FIRMA_YO || !firmantes(S).some(e => e.persona === v)) return yo;
  return v;
}
export function firmaSelect(id, S, actual, esc) {
  const op = (v, l) => '<option value="' + esc(v) + '"' + (v === actual ? ' selected' : '') + '>' + esc(l) + '</option>';
  const yo = (S.me && S.me.alias) || '';
  return '<select id="' + id + '" data-firmante="1">' + firmantes(S).map(e => op(e.persona, (e.nombre || e.persona) + (e.puesto ? ' · ' + e.puesto : '') + (e.persona === yo ? ' (vos)' : ''))).join('') + op('', 'Sin firma') + '</select>';
}
export const personaIdDe = (S, alias) => ((S.E || []).find(e => e.persona === alias) || {})._id || null;
