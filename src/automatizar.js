// ⚡ Automatizar: reglas listas para prender o apagar, una vez y listo.
// Cada pantalla tiene su botón con las reglas que le tocan; en Ajustes están todas juntas.
// Las corre la función "automatizar" todos los días a las 8:15 (la de tickets es al instante, en la base).
import { ICON } from './iconos.js';

export const REGLAS = [
  { clave: 'redes_arrancar', p: 'redes', t: 'Arrancar el mes siguiente solo',
    que: 'Arma el mes que viene de cada cliente con Redes activo: copia el plan y crea las piezas fijas. Los que ya estaban arrancados no se tocan.',
    cuando: c => 'El día ' + (c.dia || 20) + ' de cada mes, a las 8:15',
    campos: [{ k: 'dia', l: 'Qué día del mes', tipo: 'num', def: 20, min: 1, max: 28 }] },
  { clave: 'redes_recordar', p: 'redes', t: 'Recordarle al cliente lo que tiene para aprobar',
    que: 'Si un cliente tiene piezas esperando su aprobación, le llega un mail corto con el link a su portal. Va solo a los contactos con portal, y no más de uno cada tantos días.',
    cuando: c => 'Todos los días, si hace ' + (c.dias || 3) + ' días o más que se le mandó',
    campos: [{ k: 'dias', l: 'Después de cuántos días', tipo: 'num', def: 3, min: 1, max: 15 }] },
  { clave: 'tickets_asignar', p: 'tickets', t: 'Asignar los tickets nuevos',
    que: 'Cuando entra un ticket sin responsable, se lo asigna a quien lleva ese cliente. Si nadie lo lleva, a la persona que elijas. Esa persona recibe el aviso.',
    cuando: () => 'Al instante, apenas entra el ticket',
    campos: [{ k: 'modo', l: 'A quién', tipo: 'select', def: 'cliente', opts: [['cliente', 'A quien lleva el cliente'], ['siempre', 'Siempre a la misma persona']] }, { k: 'persona_id', l: 'Si nadie lo lleva', tipo: 'persona' }] },
  { clave: 'cobros_vencidas', p: 'cobros', admin: true, t: 'Avisarme las facturas vencidas',
    que: 'A las socias les llega un aviso (en la app y por Slack) con las facturas vencidas para reclamar. Al cliente no se le escribe solo: el recordatorio sale en un clic desde Cobros, para que revisen antes qué se manda.',
    cuando: c => 'A los ' + (c.dias || 5) + ' días de vencida, y después una vez por semana',
    campos: [{ k: 'dias', l: 'A cuántos días de vencida', tipo: 'num', def: 5, min: 1, max: 60 }] },
  { clave: 'proyectos_atrasados', p: 'proyectos', t: 'Avisar cuando un proyecto se atrasa',
    que: 'El día después de la fecha de entrega pactada, si el proyecto sigue abierto, les llega un aviso a sus responsables (o a las socias si no tiene).',
    cuando: () => 'Todos los días a las 8:15', campos: [] },
];

export function initAutomatizar(ctx) {
  const { S, esc, opt, toast, data, $, isAdmin, isStaff } = ctx;
  const st = { lista: undefined, cargando: false, probando: '', pantalla: null };
  const de = clave => (st.lista || []).find(a => a.clave === clave) || { clave, activa: false, config: {} };
  const reglas = p => REGLAS.filter(r => (!p || r.p === p) && (!r.admin || isAdmin()));
  async function cargar(forzar) {
    if (st.cargando || (st.lista !== undefined && !forzar)) return;
    st.cargando = true;
    try { st.lista = await data.autoLista(); } catch (e) { st.lista = []; toast(e.message); }
    st.cargando = false;
    if (st.pantalla) pintar(); ctx.render();
  }
  // El botón de cada pantalla: dice cuántas reglas tiene prendidas.
  function boton(p) {
    if (!isStaff() || !reglas(p).length) return '';
    if (st.lista === undefined) setTimeout(() => cargar(), 0);
    const n = reglas(p).filter(r => de(r.clave).activa).length;
    return '<button class="btn ico-b auto-b' + (n ? ' on' : '') + '" data-act="autoAbrir" data-p="' + esc(p) + '" title="' + (n ? n + ' automática' + (n > 1 ? 's' : '') + ' prendida' + (n > 1 ? 's' : '') : 'Automatizar') + '" aria-label="' + (n ? 'Automatizar: ' + n + ' prendida' + (n > 1 ? 's' : '') : 'Automatizar') + '">' + ICON.rayo + (n ? '<span class="ico-n">' + n + '</span>' : '') + '</button>';
  }
  const fecha = iso => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }); };
  function tarjeta(r) {
    const a = de(r.clave), c = { ...Object.fromEntries(r.campos.map(f => [f.k, f.def])), ...(a.config || {}) };
    const campo = f => {
      const id = 'au-' + r.clave + '-' + f.k, attrs = ' id="' + id + '" data-auc="' + esc(r.clave) + '" data-k="' + f.k + '"';
      if (f.k === 'persona_id' && c.modo === 'siempre') f = { ...f, l: 'A quién' };
      const ctl = f.tipo === 'num' ? '<input class="in" type="number" inputmode="numeric" min="' + f.min + '" max="' + f.max + '" value="' + esc(c[f.k] ?? f.def) + '"' + attrs + '>'
        : f.tipo === 'select' ? '<select class="in"' + attrs + '>' + f.opts.map(([v, l]) => opt(v, l, c[f.k] || f.def)).join('') + '</select>'
          : '<select class="in"' + attrs + '>' + opt('', 'Nadie (queda sin asignar)', c[f.k] || '') + S.E.filter(e => e.activo !== false && e.rol !== 'externo').map(e => opt(e._id, e.persona || e.nombre, c[f.k] || '')).join('') + '</select>';
      return '<label class="au-f" for="' + id + '"><span>' + esc(f.l) + '</span>' + ctl + '</label>';
    };
    return '<div class="au-r' + (a.activa ? ' on' : '') + '"><div class="au-h"><span class="au-i">' + ICON.rayo + '</span><div class="au-t"><b>' + esc(r.t) + '</b><span>' + esc(r.cuando(c)) + '</span></div>' +
      '<label class="sw" title="' + (a.activa ? 'Apagar' : 'Prender') + '"><input type="checkbox" data-aut="' + esc(r.clave) + '"' + (a.activa ? ' checked' : '') + ' aria-label="' + esc(r.t) + '"><span></span></label></div>' +
      '<p class="au-q">' + esc(r.que) + '</p>' +
      (r.campos.length ? '<div class="au-fs">' + r.campos.map(campo).join('') + '</div>' : '') +
      '<div class="au-pie"><span class="muted">' + (a.ultima_corrida ? 'Última vez ' + esc(fecha(a.ultima_corrida)) + (a.ultimo_resultado ? ': ' + esc(a.ultimo_resultado) : '') : a.activa ? 'Todavía no corrió' : 'Apagada') + '</span>' +
      (r.clave === 'tickets_asignar' ? '' : '<button type="button" class="btn ghost sm" data-act="autoProbar" data-c="' + esc(r.clave) + '"' + (st.probando ? ' disabled' : '') + ' title="Lo hace ahora, de verdad">' + (st.probando === r.clave ? 'Corriendo…' : 'Correr ahora') + '</button>') + '</div></div>';
  }
  function cuerpo(p) {
    if (st.lista === undefined) return '<p class="muted">Cargando…</p>';
    if (st.lista === null) return '<div class="empty"><b>Falta un paso en la base de datos</b><span>Para usar las automatizaciones hay que correr el SQL 0018 en Supabase.</span></div>';
    return '<div class="au-l">' + reglas(p).map(tarjeta).join('') + '</div>';
  }
  function pintar() {
    const p = st.pantalla; if (!p || $('#panel').hidden) return;
    const b = $('#au-b'); if (b) b.innerHTML = cuerpo(p === 'todas' ? null : p);
  }
  function abrir(p) {
    st.pantalla = p; S.form = null;
    $('#panel').innerHTML = '<div class="panel-h"><div><span class="eyebrow">Se hacen solas</span><h2 id="panel-title">Automatizar</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b au-pb"><p class="formnote">Prendé lo que quieras que pase solo. Se configura una vez y listo; lo podés apagar cuando quieras.</p><div id="au-b">' + cuerpo(p === 'todas' ? null : p) + '</div></div>' +
      '<div class="panel-f"><span>' + (p !== 'todas' ? '<button type="button" class="btn link sm" data-act="go" data-view="ajustes" data-tab="auto">Ver todas</button>' : '') + '</span><button type="button" class="btn primary" data-act="close">Listo</button></div>';
    $('#panel').hidden = false; $('#scrim').hidden = false;
    cargar();
  }
  async function guardar(clave, cambios) {
    const a = de(clave), nuevo = { ...a, ...cambios, config: { ...(a.config || {}), ...(cambios.config || {}) } };
    if (!st.lista) st.lista = [];
    const i = st.lista.findIndex(x => x.clave === clave); if (i >= 0) st.lista[i] = nuevo; else st.lista.push(nuevo);
    try { await data.autoGuardar(clave, nuevo.activa, nuevo.config); }
    catch (e) { toast(/automatizaciones/.test(e.message) ? 'Falta correr el SQL 0018 en Supabase' : e.message); await cargar(true); return; }
    pintar(); ctx.render();
  }
  document.addEventListener('change', e => {
    const t = e.target; if (!t.dataset) return;
    if (t.dataset.aut) { const r = REGLAS.find(x => x.clave === t.dataset.aut); guardar(t.dataset.aut, { activa: t.checked }).then(() => toast((t.checked ? 'Prendida: ' : 'Apagada: ') + (r ? r.t.toLowerCase() : ''))); return; }
    if (t.dataset.auc) {
      const r = REGLAS.find(x => x.clave === t.dataset.auc), f = r && r.campos.find(x => x.k === t.dataset.k); if (!f) return;
      let v = t.value; if (f.tipo === 'num') { v = Math.min(f.max, Math.max(f.min, Math.round(+v || f.def))); t.value = v; }
      guardar(r.clave, { config: { [f.k]: v } }).then(() => toast('Guardado'));
    }
  });
  const acts = {
    autoAbrir: t => abrir(t.dataset.p),
    autoProbar: async t => {
      const c = t.dataset.c; if (st.probando) return;
      st.probando = c; pintar();
      try { const r = await data.autoProbar(c); toast(r.resultado || 'Listo'); await cargar(true); }
      catch (e) { toast(e.message); }
      st.probando = ''; pintar();
    },
  };
  // Para Ajustes: todas las reglas en una pestaña.
  function vista() {
    if (st.lista === undefined) setTimeout(() => cargar(), 0);
    return '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.rayo + '</span><h2>Automatizaciones</h2></div><div class="sx-panel"><p class="sx-lead">Lo que se hace solo. También las encontrás con el botón <b>Automatizar</b> en Redes, Tickets, Cobros y Proyectos.</p>' + cuerpo(null) + '</div></section>';
  }
  return { boton, abrir, acts, vista, cargar };
}
