// Ficha de marca y voz de cada cliente: qué hace, a quién le habla, cómo habla, qué evita y de qué publica.
// Es el contexto que usa Mr. Piggy para proponer contenido, escribir copys y armar informes con la voz de la marca.
// Se puede completar a mano o pedirle a Mr. Piggy que la arme con el brief, las notas y los copys ya aprobados.
import { ICON } from './iconos.js';

export const CAMPOS_MARCA = [
  { k: 'rubro', l: 'Qué hace la marca', rows: 2, ph: 'Ej.: hamburguesería de barrio en Córdoba, con delivery propio y local en Nueva Córdoba' },
  { k: 'publico', l: 'A quién le habla', rows: 2, ph: 'Ej.: jóvenes de 20 a 35, estudiantes y oficinistas, que piden de noche' },
  { k: 'tono', l: 'Cómo habla', rows: 3, ph: 'Ej.: cercano, canchero y con humor; frases cortas; nunca solemne' },
  { k: 'trato', l: 'Trato', tipo: 'select', opts: ['', 'Vos', 'Tú', 'Usted'] },
  { k: 'emojis', l: 'Emojis', tipo: 'select', opts: ['', 'Sí, con ganas', 'Pocos y puntuales', 'No usa'] },
  { k: 'palabras_si', l: 'Palabras y frases que usa', rows: 2, ph: 'Ej.: “la burga”, “posta”, “te esperamos”' },
  { k: 'palabras_no', l: 'Lo que nunca dice ni hace', rows: 2, ph: 'Ej.: no habla de precios, no usa “gourmet”, no hace chistes de política' },
  { k: 'pilares', l: 'Pilares de contenido (uno por renglón)', rows: 4, ph: 'Producto\nDetrás de escena\nComunidad y clientes\nPromos y fechas' },
  { k: 'hashtags', l: 'Hashtags de marca', rows: 1, ph: '#wannaburga #burgacordoba' },
  { k: 'fechas', l: 'Fechas importantes', rows: 2, ph: 'Aniversario 12/3, Día de la hamburguesa 28/5, temporada alta en verano' },
  { k: 'referencias', l: 'Referencias y competencia', rows: 2, ph: 'Cuentas que les gustan o con las que compiten' },
  { k: 'ejemplos', l: 'Copys que suenan a la marca', rows: 4, ph: 'Pegá 2 o 3 copys que les hayan encantado' },
];
const lleno = m => m && CAMPOS_MARCA.some(f => String(m[f.k] || '').trim());

export function initFichaMarca(ctx) {
  const { S, esc, toast, data, render, emptyBox, isStaff } = ctx;
  const st = { busy: false };

  function html(c) {
    const m = c.marca || {}, can = isStaff();
    if (c.marca === undefined) return '<section class="sheet">' + emptyBox('Falta un paso en la base de datos', 'Para guardar la ficha de marca hay que correr el SQL 0018 en Supabase.') + '</section>';
    const piggy = '<button class="btn sm" data-act="fmIA" data-id="' + esc(c._id) + '"' + (st.busy ? ' disabled' : '') + '>' + ICON.ia + (st.busy ? 'Leyendo brief y copys…' : lleno(m) ? 'Actualizar con Mr. Piggy' : 'Que la arme Mr. Piggy') + '</button>';
    if (!lleno(m)) return '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.marca + '</span><h2>Marca y voz</h2></div><div class="sx-panel fm-vacio">' +
      '<p class="sx-lead"><b>Sin ficha, Mr. Piggy escribe genérico.</b> Con esto propone contenido del rubro, escribe copys con la voz de ' + esc(c.nombre) + ' y respeta lo que la marca no hace.</p>' +
      (can ? '<div class="toolbar">' + piggy + '<button class="btn sm ghost" data-act="fmEditar" data-id="' + esc(c._id) + '">Completar a mano</button></div><p class="muted" style="margin:0;font-size:13px">Mr. Piggy usa el brief de Tally, las notas del cliente y los copys ya aprobados. Después la revisás.</p>' : '') + '</div></section>';
    const item = (l, v, cls) => v ? '<div class="fm-i' + (cls ? ' ' + cls : '') + '"><span>' + esc(l) + '</span><p>' + esc(v) + '</p></div>' : '';
    const chips = (v) => String(v || '').split('\n').map(x => x.trim()).filter(Boolean);
    return '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.marca + '</span><h2>Marca y voz</h2>' + (can ? '<div class="sx-der toolbar">' + piggy + '<button class="btn sm primary" data-act="fmEditar" data-id="' + esc(c._id) + '">Editar</button></div>' : '') + '</div>' +
      '<div class="fm-g">' + item('Qué hace', m.rubro, 'w2') + item('A quién le habla', m.publico, 'w2') + item('Cómo habla', m.tono, 'w2') +
      '<div class="fm-i"><span>Trato y emojis</span><p>' + esc([m.trato, m.emojis].filter(Boolean).join(' · ') || '—') + '</p></div>' +
      (chips(m.pilares).length ? '<div class="fm-i"><span>Pilares de contenido</span><div class="fm-chips">' + chips(m.pilares).map(x => '<b>' + esc(x) + '</b>').join('') + '</div></div>' : '') +
      item('Usa', m.palabras_si) + item('Nunca', m.palabras_no) + item('Hashtags', m.hashtags) + item('Fechas importantes', m.fechas) + item('Referencias', m.referencias) +
      (m.ejemplos ? '<div class="fm-i w2"><span>Copys que suenan a la marca</span><p class="fm-ej">' + esc(m.ejemplos) + '</p></div>' : '') + '</div></section>';
  }
  function editar(c, borrador) {
    const m = borrador || c.marca || {};
    S.form = null; S.fmf = c._id;
    const campo = f => '<div class="field' + (f.tipo === 'select' ? '' : ' full') + '"><label for="fm-' + f.k + '">' + esc(f.l) + '</label>' +
      (f.tipo === 'select' ? '<select id="fm-' + f.k + '">' + f.opts.map(o => '<option value="' + esc(o) + '"' + ((m[f.k] || '') === o ? ' selected' : '') + '>' + esc(o || '—') + '</option>').join('') + '</select>'
        : f.rows > 1 ? '<textarea id="fm-' + f.k + '" rows="' + f.rows + '" placeholder="' + esc(f.ph || '') + '">' + esc(m[f.k] || '') + '</textarea>' : '<input id="fm-' + f.k + '" value="' + esc(m[f.k] || '') + '" placeholder="' + esc(f.ph || '') + '">') + '</div>';
    document.getElementById('panel').innerHTML = '<form id="fmform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(c.nombre) + '</span><h2 id="panel-title">Marca y voz</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><p class="formnote full">' + (borrador ? '<b>Esto lo armó Mr. Piggy:</b> revisalo, corregí lo que haga falta y guardá.' : 'Lo que pongas acá lo usa Mr. Piggy cada vez que propone contenido o escribe para esta marca. No hace falta completar todo.') + '</p>' + CAMPOS_MARCA.map(campo).join('') + '</div>' +
      '<div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary" id="fmsave">Guardar</button></span></div></form>';
    document.getElementById('panel').hidden = false; document.getElementById('scrim').hidden = false;
  }
  async function guardar() {
    const c = S.C.find(x => x._id === S.fmf); if (!c) return;
    const m = {}; CAMPOS_MARCA.forEach(f => { const el = document.getElementById('fm-' + f.k); if (el) m[f.k] = el.value.trim(); });
    m.actualizado = new Date().toISOString().slice(0, 10);
    const b = document.getElementById('fmsave'); if (b) { b.disabled = true; b.textContent = 'Guardando…'; }
    try { await data.marcaGuardar(c._id, m); c.marca = m; ctx.closeForm(); toast('Ficha de marca guardada'); render(); }
    catch (e) { toast(/marca/.test(e.message) ? 'Falta correr el SQL 0018 en Supabase' : e.message); if (b) { b.disabled = false; b.textContent = 'Guardar'; } }
  }
  // Mr. Piggy arma (o actualiza) la ficha con lo que hay: brief, notas, servicios y copys aprobados.
  async function conIA(c) {
    st.busy = true; render();
    try {
      const briefs = (S.BF || []).filter(b => b.cliente === c.nombre).slice(0, 3).map(b => ({ tipo: b.tipo, fecha: b.respondido, respuestas: (b.respuestas || []).slice(0, 60) }));
      const meses = (S.RM || []).filter(x => x.cliente === c.nombre).map(x => x._id);
      let copys = [];
      try { copys = (await data.piezasDe(meses)).filter(z => z.copy && ['Aprobada', 'Programada', 'Publicada'].includes(z.estado)).slice(-25).map(z => ({ formato: z.formato, tema: z.tema, copy: z.copy, hashtags: z.hashtags })); } catch (e) { copys = []; }
      const r = await data.ia({ modo: 'marca', contexto: { cliente: c.nombre, web_o_instagram: c.web || '', notas: c.notas || '', servicios: S.A.filter(a => a.cliente === c.nombre && a.estado === 'Activo').map(a => a.tipo + (a.plan ? ' ' + a.plan : '')),
        proyectos: S.P.filter(p => p.cliente === c.nombre).slice(0, 8).map(p => p.proyecto + ' (' + (p.tipo || '') + ')'), briefs, copys_aprobados: copys, ficha_actual: c.marca || {} } });
      const m = { ...(c.marca || {}) }; CAMPOS_MARCA.forEach(f => { const v = r[f.k]; if (v != null && String(v).trim()) m[f.k] = Array.isArray(v) ? v.join('\n') : String(v).trim(); });
      if (!briefs.length && !copys.length && !c.notas) toast('Ojo: no hay brief, notas ni copys aprobados de ' + c.nombre + '. Revisá bien lo que propone.');
      st.busy = false; render(); editar(c, m); return; // se guarda recién cuando la revisás
    } catch (e) { toast(e.message); }
    st.busy = false; render();
  }
  // Para Mr. Piggy en redes, informes y mails: la ficha, más algunos copys aprobados como ejemplo de voz.
  function contexto(cliente, piezasCargadas) {
    const c = S.C.find(x => x.nombre === cliente) || {};
    const ej = (piezasCargadas || []).filter(z => z.copy && ['Aprobada', 'Programada', 'Publicada'].includes(z.estado)).slice(-10).map(z => z.copy);
    return { marca: lleno(c.marca) ? c.marca : null, copys_aprobados: ej, aviso: lleno(c.marca) ? '' : 'Este cliente no tiene ficha de marca: escribí neutro, sin inventar datos de la marca.' };
  }
  const acts = {
    fmEditar: t => { const c = S.C.find(x => x._id === t.dataset.id); if (c) editar(c); },
    fmIA: t => { const c = S.C.find(x => x._id === t.dataset.id); if (c && !st.busy) conIA(c); },
  };
  document.addEventListener('submit', e => { if (e.target.id === 'fmform') { e.preventDefault(); guardar(); } });
  return { html, acts, contexto, lleno };
}
