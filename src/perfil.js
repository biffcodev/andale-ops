// Mi perfil: se abre tocando tu foto abajo a la izquierda.
// Tus datos (nombre, puesto, teléfono, foto), qué avisos querés y por dónde, el resumen diario, el tema y salir.
// Las preferencias de avisos se respetan en la base (un aviso apagado ni se crea) y en Slack / mail.
import { ICON } from './iconos.js';

export const TIPOS_AVISO = [
  ['tarea', 'Te asignan una tarea', 'tarea'],
  ['etapa', 'Un proyecto tuyo pasa de etapa', 'etapa'],
  ['mencion', 'Te mencionan con @', 'arroba'],
  ['comentario', 'Comentan en algo tuyo', 'charla'],
  ['cliente', 'Un cliente aprueba, pide cambios o manda un brief', 'estrella'],
  ['pedido', 'Entra un ticket o te lo asignan', 'tickets'],
  ['facturar', 'Un proyecto queda listo para facturar', 'plata'],
];
const TEMAS = [['auto', 'Como el sistema'], ['light', 'Claro'], ['dark', 'Oscuro']];
export function aplicarTema(t) { const r = document.documentElement; if (t === 'light' || t === 'dark') r.dataset.theme = t; else delete r.dataset.theme; }
export function temaGuardado() { try { return localStorage.getItem('tema') || 'auto'; } catch (e) { return 'auto'; } }

export function initPerfil(ctx) {
  const { S, esc, toast, data, $, avEditable, closeForm, ROLES } = ctx;
  const yo = () => S.E.find(e => e._id === (S.me && S.me.id)) || {};

  function abrir() {
    const e = yo(), pr = e.prefs || {}, av = pr.avisos || {}, sl = pr.slack || {}, tema = temaGuardado();
    S.form = null;
    const fila = ([k, l, ic]) => '<div class="mp-av"><span class="mp-avi">' + (ICON[ic] || '') + '</span><span class="mp-avl">' + esc(l) + '</span>' +
      '<label class="sw" title="Avisarme en la app"><input type="checkbox" data-pfa="' + k + '"' + (av[k] === false ? '' : ' checked') + '><span></span></label>' +
      '<label class="sw sm" title="También por Slack"><input type="checkbox" data-pfs="' + k + '"' + (sl[k] === false ? '' : ' checked') + (av[k] === false ? ' disabled' : '') + '><span></span></label></div>';
    $('#panel').innerHTML = '<form id="pfform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">Tu perfil</span><h2 id="panel-title">' + esc(e.nombre || (S.me && S.me.alias) || '') + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b">' +
      '<div class="mp-yo full">' + avEditable('persona', S.me.id, S.me.alias, e.avatar, 'xl', true) + '<div><b>' + esc(S.me.alias) + '</b><span>' + esc((ROLES && ROLES[S.me.rol]) || S.me.rol) + '</span><span class="muted">Entrás con ' + esc(e.email || '') + '</span><small class="muted">Tocá la foto para cambiarla.</small></div></div>' +
      '<div class="field full"><label for="pf-nombre">Nombre completo</label><input id="pf-nombre" value="' + esc(e.nombre || '') + '"></div>' +
      '<div class="field"><label for="pf-puesto">Puesto</label><input id="pf-puesto" value="' + esc(e.puesto || '') + '" placeholder="Ej.: Diseñadora, Cuentas"></div>' +
      '<div class="field"><label for="pf-tel">Teléfono / WhatsApp</label><input id="pf-tel" type="tel" value="' + esc(e.tel || '') + '"></div>' +
      '<div class="field full"><span class="lbl">Avisos</span><div class="mp-avs"><div class="mp-av mp-avh"><span></span><span></span><span>App</span><span>Slack</span></div>' + TIPOS_AVISO.map(fila).join('') + '</div></div>' +
      '<label class="chk full mp-hor"><input type="checkbox" id="pf-horario"' + (pr.horario ? ' checked' : '') + '> <span>Slack solo en horario de trabajo <span class="muted">· de lunes a viernes de 9 a 19; lo de afuera te llega a la mañana</span></span></label>' +
      '<div class="field"><label for="pf-diario">Resumen del día</label><select id="pf-diario"><option value="si"' + (pr.diario === false ? '' : ' selected') + '>Sí, a las 8:30</option><option value="no"' + (pr.diario === false ? ' selected' : '') + '>No, gracias</option></select></div>' +
      '<div class="field"><label for="pf-canal">Por dónde</label><select id="pf-canal">' + [['auto', 'Slack (o mail si no hay Slack)'], ['slack', 'Solo Slack'], ['mail', 'Solo mail']].map(([v, l]) => '<option value="' + v + '"' + ((pr.diario_canal || 'auto') === v ? ' selected' : '') + '>' + l + '</option>').join('') + '</select></div>' +
      '<div class="field full"><span class="lbl">Tema</span><div class="seg" role="group" aria-label="Tema">' + TEMAS.map(([v, l]) => '<button type="button" data-act="pfTema" data-v="' + v + '" aria-pressed="' + (tema === v) + '">' + l + '</button>').join('') + '</div></div>' +
      '</div><div class="panel-f"><span><button type="button" class="btn ghost" data-act="logout">' + ICON.salir + 'Salir</button></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary" id="pfsave">Guardar</button></span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false;
  }
  async function guardar() {
    const e = yo(), g = id => (($('#' + id) || {}).value || '').trim();
    const avisos = {}, slack = {};
    document.querySelectorAll('[data-pfa]').forEach(i => { if (!i.checked) avisos[i.dataset.pfa] = false; });
    document.querySelectorAll('[data-pfs]').forEach(i => { if (!i.checked) slack[i.dataset.pfs] = false; });
    const prefs = { ...(e.prefs || {}), avisos, slack, horario: !!($('#pf-horario') || {}).checked, diario: g('pf-diario') !== 'no', diario_canal: g('pf-canal') || 'auto' };
    const b = $('#pfsave'); if (b) { b.disabled = true; b.textContent = 'Guardando…'; }
    try {
      await data.perfilGuardar({ nombre: g('pf-nombre'), puesto: g('pf-puesto'), tel: g('pf-tel'), prefs });
      Object.assign(e, { nombre: g('pf-nombre') || e.nombre, puesto: g('pf-puesto'), tel: g('pf-tel'), prefs });
      closeForm(); toast('Perfil guardado'); ctx.render();
    } catch (err) { toast(/mi_perfil|function/.test(err.message) ? 'Falta correr el SQL 0018 en Supabase' : err.message); if (b) { b.disabled = false; b.textContent = 'Guardar'; } }
  }
  const acts = {
    perfil: () => abrir(),
    pfTema: t => { try { localStorage.setItem('tema', t.dataset.v); } catch (e) { /* sin storage */ } aplicarTema(t.dataset.v); document.querySelectorAll('[data-act="pfTema"]').forEach(x => x.setAttribute('aria-pressed', String(x === t))); },
  };
  document.addEventListener('submit', e => { if (e.target.id === 'pfform') { e.preventDefault(); guardar(); } });
  document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.pfa) { const s = document.querySelector('[data-pfs="' + t.dataset.pfa + '"]'); if (s) { s.disabled = !t.checked; if (!t.checked) s.checked = false; } } });
  return { acts, abrir };
}
