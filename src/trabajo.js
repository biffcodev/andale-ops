// Flujos de trabajo por tipo de proyecto: etapas, tareas modelo (con responsable y días) y automatizaciones.
// Las automatizaciones corren en la base (cuando se cierran las tareas de una etapa pasa a la siguiente).

// Flujos sugeridos para arrancar (se pueden editar en Opciones → Flujos).
export const FLUJOS_SUGERIDOS = {
  Branding: [
    { n: 'Brief', estado: 'Por empezar', tareas: [{ n: 'Reunión de brief', dias: 2 }, { n: 'Investigación y referencias', dias: 4 }] },
    { n: 'Diseño', estado: 'En curso', tareas: [{ n: 'Bocetos', dias: 5 }, { n: 'Armar rutas de identidad', dias: 8 }] },
    { n: 'Revisión interna', estado: 'En curso', tareas: [{ n: 'Revisión de dirección de arte', dias: 1 }] },
    { n: 'Cliente', estado: 'En revisión', tareas: [{ n: 'Presentación al cliente', dias: 2 }] },
    { n: 'Ajustes', estado: 'En curso', tareas: [{ n: 'Ajustes pedidos por el cliente', dias: 4 }] },
    { n: 'Entrega', estado: 'En curso', tareas: [{ n: 'Manual de marca', dias: 5 }, { n: 'Archivos finales', dias: 2 }] },
  ],
  Packaging: [
    { n: 'Brief', estado: 'Por empezar', tareas: [{ n: 'Reunión de brief y medidas', dias: 2 }] },
    { n: 'Diseño', estado: 'En curso', tareas: [{ n: 'Concepto', dias: 4 }, { n: 'Desarrollo de las piezas', dias: 6 }] },
    { n: 'Revisión interna', estado: 'En curso', tareas: [{ n: 'Revisión de dirección de arte', dias: 1 }] },
    { n: 'Cliente', estado: 'En revisión', tareas: [{ n: 'Presentación al cliente', dias: 2 }] },
    { n: 'Ajustes', estado: 'En curso', tareas: [{ n: 'Ajustes pedidos por el cliente', dias: 3 }] },
    { n: 'Originales', estado: 'En curso', tareas: [{ n: 'Artes finales para imprenta', dias: 3 }, { n: 'Prueba de color', dias: 3 }] },
  ],
  Web: [
    { n: 'Brief', estado: 'Por empezar', tareas: [{ n: 'Reunión de brief y mapa del sitio', dias: 3 }] },
    { n: 'Contenidos', estado: 'En curso', tareas: [{ n: 'Recibir textos y fotos del cliente', dias: 7 }] },
    { n: 'Diseño', estado: 'En curso', tareas: [{ n: 'Diseño de páginas', dias: 7 }] },
    { n: 'Revisión interna', estado: 'En curso', tareas: [{ n: 'Revisión de dirección de arte', dias: 1 }] },
    { n: 'Cliente', estado: 'En revisión', tareas: [{ n: 'Presentación del diseño al cliente', dias: 3 }] },
    { n: 'Desarrollo', estado: 'En curso', tareas: [{ n: 'Maquetación', dias: 7 }, { n: 'Carga de contenidos', dias: 4 }] },
    { n: 'Pruebas', estado: 'En revisión', tareas: [{ n: 'Revisión en celular y navegadores', dias: 2 }, { n: 'Velocidad y SEO básico', dias: 2 }] },
    { n: 'Publicación', estado: 'En curso', tareas: [{ n: 'Dominio y publicación', dias: 2 }] },
  ],
  Diseño: [
    { n: 'Brief', estado: 'Por empezar', tareas: [{ n: 'Brief', dias: 1 }] },
    { n: 'Diseño', estado: 'En curso', tareas: [{ n: 'Diseño', dias: 4 }] },
    { n: 'Revisión interna', estado: 'En curso', tareas: [{ n: 'Revisión de dirección de arte', dias: 1 }] },
    { n: 'Cliente', estado: 'En revisión', tareas: [{ n: 'Envío al cliente', dias: 2 }] },
    { n: 'Ajustes', estado: 'En curso', tareas: [{ n: 'Ajustes', dias: 2 }] },
    { n: 'Entrega', estado: 'En curso', tareas: [{ n: 'Archivos finales', dias: 1 }] },
  ],
  Audiovisual: [
    { n: 'Preproducción', estado: 'Por empezar', tareas: [{ n: 'Guion', dias: 3 }, { n: 'Plan de rodaje', dias: 3 }] },
    { n: 'Producción', estado: 'En curso', tareas: [{ n: 'Rodaje', dias: 5 }] },
    { n: 'Edición', estado: 'En curso', tareas: [{ n: 'Edición', dias: 5 }, { n: 'Color y sonido', dias: 2 }] },
    { n: 'Revisión interna', estado: 'En curso', tareas: [{ n: 'Revisión de dirección de arte', dias: 1 }] },
    { n: 'Cliente', estado: 'En revisión', tareas: [{ n: 'Envío al cliente', dias: 2 }] },
    { n: 'Ajustes', estado: 'En curso', tareas: [{ n: 'Ajustes', dias: 3 }] },
    { n: 'Entrega', estado: 'En curso', tareas: [{ n: 'Exportar y entregar', dias: 1 }] },
  ],
};
const REGLAS = [
  ['avanzar', 'Pasar sola a la etapa siguiente', 'Cuando se cierran todas las tareas de una etapa, se activa la siguiente: sus tareas toman fecha (según los días) y a cada responsable le llega el aviso.'],
  ['estado', 'Cambiar el estado del proyecto según la etapa', 'Por ejemplo, al llegar a “Cliente” el proyecto pasa a “En revisión”.'],
  ['aviso_facturar', 'Avisar a administración para facturar', 'Cuando se cierran todas las tareas, los administradores reciben “Listo para facturar”.'],
];

export function initTrabajo(ctx) {
  const { S, esc, opt, toast, data, render, isStaff, personas } = ctx;
  const ed = { tipo: null, f: null }; // flujo en edición

  const tiposProyecto = () => (S.L.tipos || []).filter(t => !(S.L.tiposAbono || ['Redes', 'Ads']).includes(t));
  const flujo = tipo => (S.FL && S.FL[tipo]) || null;
  const etapasFlujo = tipo => { const f = flujo(tipo); return f ? f.etapas.map(e => e.n).filter(Boolean) : []; };
  const reglas = tipo => Object.assign({ avanzar: true, estado: true, aviso_facturar: true }, (flujo(tipo) || {}).reglas || {});
  const addDays = (d, n) => { const x = new Date((d || new Date().toISOString().slice(0, 10)) + 'T12:00'); x.setDate(x.getDate() + (+n || 0)); return x.toISOString().slice(0, 10); };

  /** Tareas modelo de un tipo: con flujo, por etapa (las de la primera etapa ya con fecha); si no, la lista vieja de nombres. */
  function plantillaTareas(tipo, inicio) {
    const f = flujo(tipo);
    if (f && f.etapas.length) {
      const prim = (f.etapas.find(e => (e.tareas || []).length) || {}).n;
      return f.etapas.flatMap(e => (e.tareas || []).filter(t => t.n).map(t => ({ n: t.n, ok: false, etapa: e.n, resp: personas().includes(t.resp) ? t.resp : '', plazo: t.dias === '' || t.dias == null ? '' : +t.dias, fecha: e.n === prim && t.dias !== '' && t.dias != null ? addDays(inicio, t.dias) : '' })));
    }
    return (S.L['etapas:' + tipo] || []).map(n => ({ n, ok: false }));
  }

  /* ---------- Editor de flujos (Opciones) ---------- */
  function abrirEditor(tipo) {
    const f = flujo(tipo);
    ed.tipo = tipo;
    ed.f = JSON.parse(JSON.stringify(f ? { etapas: f.etapas, reglas: reglas(tipo) } : { etapas: [], reglas: reglas(tipo) }));
    if (!ed.f.etapas.length) {
      const viejas = S.L['etapas:' + tipo] || [];
      ed.f.etapas = FLUJOS_SUGERIDOS[tipo] ? JSON.parse(JSON.stringify(FLUJOS_SUGERIDOS[tipo])) : viejas.length ? [{ n: 'Trabajo', estado: 'En curso', tareas: viejas.map(n => ({ n, dias: '' })) }] : [{ n: 'Brief', estado: 'Por empezar', tareas: [] }, { n: 'Producción', estado: 'En curso', tareas: [] }, { n: 'Entrega', estado: '', tareas: [] }];
      ed.nuevo = true;
    } else ed.nuevo = false;
    render();
    setTimeout(() => { const el = document.getElementById('fl-ed'); if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }, 30);
  }
  function editorHtml() {
    const f = ed.f, ps = personas(), est = S.L.estadosProyecto || [];
    const etapa = (e, i) => '<div class="fl-et"><div class="fl-et-h"><span class="fl-n">' + (i + 1) + '</span><input class="in" value="' + esc(e.n) + '" data-fl="n" data-i="' + i + '" aria-label="Nombre de la etapa" placeholder="Etapa">' +
      '<label class="fl-est">Estado del proyecto <select class="in" data-fl="estado" data-i="' + i + '">' + opt('', 'No cambiar', e.estado || '') + est.map(x => opt(x, x, e.estado || '')).join('') + '</select></label>' +
      '<span class="fl-mv"><button type="button" class="btn ghost sm" data-act="flMv" data-i="' + i + '" data-d="-1" aria-label="Subir etapa"' + (i ? '' : ' disabled') + '>↑</button><button type="button" class="btn ghost sm" data-act="flMv" data-i="' + i + '" data-d="1" aria-label="Bajar etapa"' + (i < f.etapas.length - 1 ? '' : ' disabled') + '>↓</button><button type="button" class="btn ghost sm danger" data-act="flDelEt" data-i="' + i + '" aria-label="Borrar etapa">✕</button></span></div>' +
      '<div class="fl-tks">' + (e.tareas || []).map((t, j) => '<div class="fl-tk"><input class="in" value="' + esc(t.n) + '" data-fl="tn" data-i="' + i + '" data-j="' + j + '" aria-label="Tarea" placeholder="Tarea">' +
        '<select class="in" data-fl="tr" data-i="' + i + '" data-j="' + j + '" aria-label="Responsable">' + opt('', 'Sin asignar', t.resp || '') + [...new Set([...ps, t.resp].filter(Boolean))].map(a => opt(a, a, t.resp || '')).join('') + '</select>' +
        '<label class="fl-d"><input class="in" type="number" min="0" max="365" value="' + esc(t.dias ?? '') + '" data-fl="td" data-i="' + i + '" data-j="' + j + '" aria-label="Días"> días</label>' +
        '<button type="button" class="btn ghost sm" data-act="flDelTk" data-i="' + i + '" data-j="' + j + '" aria-label="Borrar tarea">✕</button></div>').join('') +
      '<button type="button" class="btn ghost sm" data-act="flAddTk" data-i="' + i + '">+ Tarea</button></div></div>';
    return '<section class="sheet fl-ed" id="fl-ed"><div class="sheet-h"><div><h2>Flujo de ' + esc(ed.tipo) + '</h2><p class="muted" style="margin:4px 0 0;font-size:13px">' + (ed.nuevo ? 'Es una propuesta: ajustala y guardala. ' : '') + 'Los días cuentan desde que arranca cada etapa. Cambiarlo no modifica los proyectos que ya existen.</p></div><span class="toolbar"><button class="btn" data-act="flCancel">Cancelar</button><button class="btn primary" data-act="flGuardar">Guardar flujo</button></span></div>' +
      '<div class="sheet-b"><div class="fl-ets">' + f.etapas.map(etapa).join('<div class="fl-arrow" aria-hidden="true">↓</div>') + '</div><button type="button" class="btn sm" data-act="flAddEt" style="margin-top:12px">+ Etapa</button>' +
      '<h3 style="margin:22px 0 8px">Automatizaciones</h3><div class="fl-reglas">' + REGLAS.map(([k, l, d]) => '<label class="chk full"><input type="checkbox" data-flr="' + k + '"' + (f.reglas[k] !== false ? ' checked' : '') + '> <span><b>' + esc(l) + '</b><span class="muted"> · ' + esc(d) + '</span></span></label>').join('') + '</div></div></section>';
  }
  function flujosHtml() {
    const ts = tiposProyecto();
    const card = t => {
      const f = flujo(t), es = f ? f.etapas : [];
      return '<button class="fl-card" data-act="flEditar" data-tipo="' + esc(t) + '"' + (isStaff() ? '' : ' disabled') + '><b>' + esc(t) + '</b>' +
        (es.length ? '<span class="fl-chips">' + es.map(e => '<i>' + esc(e.n) + '</i>').join('<span aria-hidden="true">›</span>') + '</span><small>' + es.reduce((a, e) => a + (e.tareas || []).length, 0) + ' tareas modelo</small>'
          : '<small class="muted">' + (FLUJOS_SUGERIDOS[t] ? 'Sin flujo · hay uno sugerido' : 'Sin flujo') + '</small>') + '</button>';
    };
    if (S.FL === null || S.FL === undefined) return '<section class="sheet"><div class="sheet-b"><p class="muted" style="margin:0">Para usar flujos con etapas y automatizaciones, corré la migración 0016 en Supabase.</p></div></section>';
    return '<h2 style="margin:8px 0 0">Flujos de trabajo</h2><p class="muted" style="margin:0">Etapas y tareas modelo de cada tipo de proyecto. Cuando se cierran las tareas de una etapa, el proyecto pasa solo a la siguiente y avisa a quien le toca.</p>' +
      '<div class="fl-cards">' + ts.map(card).join('') + '</div>' + (ed.tipo ? editorHtml() : '');
  }
  function leerCampo(t) {
    const f = ed.f; if (!f) return;
    const i = +t.dataset.i, j = +t.dataset.j, k = t.dataset.fl;
    if (k === 'n') f.etapas[i].n = t.value.trim();
    else if (k === 'estado') f.etapas[i].estado = t.value;
    else if (k === 'tn') f.etapas[i].tareas[j].n = t.value.trim();
    else if (k === 'tr') f.etapas[i].tareas[j].resp = t.value;
    else if (k === 'td') f.etapas[i].tareas[j].dias = t.value === '' ? '' : Math.max(0, Math.round(+t.value));
  }
  document.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.fl) leerCampo(t); });
  document.addEventListener('change', e => { const t = e.target; if (t.dataset && t.dataset.fl) leerCampo(t); if (t.dataset && t.dataset.flr && ed.f) ed.f.reglas[t.dataset.flr] = t.checked; });

  async function guardar() {
    const f = ed.f; if (!f) return;
    const etapas = f.etapas.map(e => ({ n: (e.n || '').trim(), estado: e.estado || '', tareas: (e.tareas || []).filter(t => (t.n || '').trim()).map(t => ({ n: t.n.trim(), resp: t.resp || '', dias: t.dias === '' || t.dias == null ? '' : +t.dias })) })).filter(e => e.n);
    const nombres = etapas.map(e => e.n.toLowerCase());
    if (new Set(nombres).size !== nombres.length) { toast('Hay dos etapas con el mismo nombre'); return; }
    try { await data.guardarFlujo(ed.tipo, { etapas, reglas: f.reglas }); S.FL = { ...(S.FL || {}), [ed.tipo]: { etapas, reglas: f.reglas } }; toast('Flujo de ' + ed.tipo + ' guardado'); ed.tipo = null; ed.f = null; render(); }
    catch (err) { toast(err.message); }
  }
  const acts = {
    flEditar: t => abrirEditor(t.dataset.tipo),
    flCancel: () => { ed.tipo = null; ed.f = null; render(); },
    flGuardar: () => guardar(),
    flAddEt: () => { ed.f.etapas.push({ n: '', estado: '', tareas: [] }); render(); },
    flDelEt: t => { ed.f.etapas.splice(+t.dataset.i, 1); render(); },
    flMv: t => { const i = +t.dataset.i, j = i + +t.dataset.d, a = ed.f.etapas; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; render(); },
    flAddTk: t => { ed.f.etapas[+t.dataset.i].tareas.push({ n: '', resp: '', dias: '' }); render(); const ins = document.querySelectorAll('[data-fl="tn"][data-i="' + t.dataset.i + '"]'); if (ins.length) ins[ins.length - 1].focus(); },
    flDelTk: t => { ed.f.etapas[+t.dataset.i].tareas.splice(+t.dataset.j, 1); render(); },
  };
  return { plantillaTareas, etapasFlujo, flujo, reglas, flujosHtml, acts, editando: () => !!ed.tipo };
}
