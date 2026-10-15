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
