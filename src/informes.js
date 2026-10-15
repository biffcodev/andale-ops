// Informe mensual de redes, dentro de cada mes de un cliente (pestaña "Informe").
// 1) Se pega lo que exporta Meta (CSV o números) o se suben capturas de las estadísticas.
// 2) Mr. Piggy arma métricas, lo que mejor funcionó, un texto para el cliente y recomendaciones (solo con datos que estén).
// 3) El equipo corrige, publica en el portal y avisa al cliente.
// Cuando haya conexión directa con Meta, el paso 1 se reemplaza por la API; el resto queda igual.
import { ICON } from './iconos.js';
import { informeVista } from './informe-vista.js';
import { confirmar } from './dialogo.js';

const IMG_MAX = 1600;

export function initInformes(ctx) {
  const { S, esc, toast, data, render, emptyBox, monthLabel, addMonth, isStaff } = ctx;
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  const st = { lista: new Map(), cargando: new Set(), rehacer: new Set(), archivos: new Map(), busy: false };

  async function cargar(cliente, forzar) {
    if (st.cargando.has(cliente) || (!forzar && st.lista.has(cliente))) return;
    st.cargando.add(cliente);
    try { st.lista.set(cliente, await data.informesDe(cliente)); } catch (e) { st.lista.set(cliente, []); toast(e.message); }
    st.cargando.delete(cliente); render();
  }
  const delMes = m => (st.lista.get(m.cliente) || []).find(i => i.mes === m.mes);
  const anterior = m => (st.lista.get(m.cliente) || []).find(i => i.mes === addMonth(m.mes, -1));
  const num = v => (v === '' || v == null || isNaN(+v)) ? null : +v;
  const fmtN = v => v == null ? '—' : Number(v).toLocaleString('es-AR', { maximumFractionDigits: 2 });

  /* ---------- Vista ---------- */
  function html(m, ps) {
    if (!st.lista.has(m.cliente)) { setTimeout(() => cargar(m.cliente), 0); return '<section class="sheet">' + emptyBox('Cargando informe…', '') + '</section>'; }
    const inf = delMes(m);
    if (!inf || st.rehacer.has(m._id)) return armarHtml(m, ps, inf);
    return editorHtml(m, inf);
  }
  function armarHtml(m, ps, inf) {
    const arch = st.archivos.get(m._id) || [], pub = (ps || []).filter(z => ['Programada', 'Publicada', 'Aprobada'].includes(z.estado)).length;
    return '<section class="sheet inf-armar"><div class="sheet-h"><div><h2>Informe de ' + esc(monthLabel(m.mes)) + '</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Mr. Piggy lo arma con los números de Meta y lo que se publicó (' + pub + ' piezas). Después lo revisás y lo publicás en el portal.</p></div>' +
      (inf ? '<button class="btn ghost sm" data-act="infCancelar" data-id="' + esc(m._id) + '">Volver al informe</button>' : '') + '</div>' +
      '<div class="sheet-b inf-pasos">' +
      '<ol class="inf-ol"><li>En Meta Business Suite → <b>Estadísticas</b>, elegí el mes y tocá <b>Exportar</b> (CSV). También sirven capturas de pantalla.</li><li>Subí los archivos o pegá los números acá abajo.</li><li>Revisá lo que arma Mr. Piggy y publicalo.</li></ol>' +
      '<label class="inf-drop" for="inf-f-' + esc(m._id) + '">' + ICON.descargar.replace('<svg', '<svg style="transform:rotate(180deg)"') + '<b>Subir CSV, Excel o capturas</b><span>Hasta 6 imágenes y los archivos que necesites</span><input type="file" id="inf-f-' + esc(m._id) + '" data-infup="' + esc(m._id) + '" multiple accept=".csv,.txt,.xlsx,.xls,image/*" hidden></label>' +
      (arch.length ? '<div class="inf-arch">' + arch.map((a, i) => '<span class="en-a">' + (a.tipo === 'img' ? ICON.doc : ICON.excel) + esc(a.nombre) + '<button class="btn ghost sm" data-act="infQuitar" data-id="' + esc(m._id) + '" data-i="' + i + '" aria-label="Quitar">✕</button></span>').join('') + '</div>' : '') +
      '<div class="field full"><label for="inf-t-' + esc(m._id) + '">O pegá los números (opcional)</label><textarea id="inf-t-' + esc(m._id) + '" rows="5" placeholder="Ej.: Alcance 18.450 (mes anterior 14.200) · Seguidores nuevos 110 · Interacciones 1.240 · El reel de la fábrica tuvo 6.000 reproducciones"></textarea></div>' +
      '<div class="toolbar"><button class="btn primary" data-act="infArmar" data-id="' + esc(m._id) + '"' + (st.busy ? ' disabled' : '') + '>' + ICON.ia + (st.busy ? 'Armando… (puede tardar un minuto)' : 'Armar el informe con Mr. Piggy') + '</button><button class="btn ghost" data-act="infVacio" data-id="' + esc(m._id) + '">Escribirlo a mano</button></div>' +
      '</div></section>';
  }
  function editorHtml(m, inf) {
    const d = inf.datos || {}, met = d.metricas || [], dst = d.destacadas || [], rec = d.recomendaciones || [], id = esc(inf._id), can = isStaff();
    const pub = inf.estado === 'Publicado';
    const fila = (x, i) => '<tr><td><input class="in sm" data-im="nombre" data-i="' + i + '" value="' + esc(x.nombre) + '" placeholder="Alcance"></td><td><input class="in sm" data-im="red" data-i="' + i + '" value="' + esc(x.red || '') + '" placeholder="Instagram"></td><td class="r"><input class="in sm r" type="number" step="any" data-im="valor" data-i="' + i + '" value="' + esc(x.valor ?? '') + '"></td><td class="r"><input class="in sm r" type="number" step="any" data-im="anterior" data-i="' + i + '" value="' + esc(x.anterior ?? '') + '"></td><td><button type="button" class="btn ghost sm" data-act="infMetDel" data-i="' + i + '" aria-label="Quitar">✕</button></td></tr>';
    const dfila = (x, i) => '<div class="inf-dst"><input class="in sm" data-id2="titulo" data-i="' + i + '" value="' + esc(x.titulo) + '" placeholder="Qué publicación"><input class="in sm" data-id2="por_que" data-i="' + i + '" value="' + esc(x.por_que) + '" placeholder="Por qué funcionó"><button type="button" class="btn ghost sm" data-act="infDstDel" data-i="' + i + '" aria-label="Quitar">✕</button></div>';
    return '<div class="inf" data-inf="' + id + '" data-mes="' + esc(m._id) + '">' +
      '<div class="inf-bar"><span class="pzst" style="--c:var(' + (pub ? '--s-entregado' : '--s-empezar') + ')">' + (pub ? 'Publicado en el portal' + (inf.publicadoAt ? ' el ' + esc(ctx.fmt(String(inf.publicadoAt).slice(0, 10))) : '') : 'Borrador') + '</span>' +
      (inf.enviadoAt ? '<span class="muted" style="font-size:13px">Avisado el ' + esc(ctx.fmt(String(inf.enviadoAt).slice(0, 10))) + '</span>' : '') +
      (pub && ctx.segDe ? (() => { const ev = (ctx.segDe(m.cliente) || []).filter(e => e.ref === inf._id), vio = ev.filter(e => e.tipo === 'portal_vio').length, bajo = ev.filter(e => e.tipo === 'pdf_descargado').length;
        return '<span class="seg-ps">' + (vio ? '<span class="seg-p on">' + ICON.ojo + 'Lo vio ' + vio + (vio === 1 ? ' vez' : ' veces') + '</span>' : '<span class="seg-p no">Todavía no lo vio</span>') + (bajo ? '<span class="seg-p pdf">' + ICON.descargar + 'Bajó el PDF' + (bajo > 1 ? ' ×' + bajo : '') + '</span>' : '') + '</span>'; })() : '') +
      (can ? '<span class="toolbar"><button class="btn sm ghost" data-act="infRehacer" data-id="' + esc(m._id) + '">' + ICON.ia + 'Volver a armar</button><button class="btn sm" data-act="infGuardar">Guardar cambios</button>' +
        (pub ? '<button class="btn sm" data-act="infAvisar">Avisar al cliente</button><button class="btn sm ghost" data-act="infPublicar" data-v="0">Despublicar</button>' : '<button class="btn sm primary" data-act="infPublicar" data-v="1">Publicar en el portal</button>') + '</span>' : '') + '</div>' +
      '<section class="inf-prev"><p class="inf-prev-h">Así lo ve el cliente en su portal' + (pub ? '' : ' (cuando lo publiques)') + '</p>' + vista(m, inf) + '</section>' +
      (can ? '<section class="sheet"><div class="sheet-h"><div><h2>Métricas</h2><p class="muted" style="margin:4px 0 0;font-size:13px">“Mes anterior” es opcional: si está, el cliente ve cuánto subió o bajó.</p></div></div><div class="tbl"><table class="inf-met"><thead><tr><th>Métrica</th><th>Red</th><th class="r">Este mes</th><th class="r">Mes anterior</th><th></th></tr></thead><tbody>' + met.map(fila).join('') + '</tbody></table></div><div class="sheet-b"><button type="button" class="btn sm ghost" data-act="infMetAdd">+ Agregar métrica</button></div></section>' +
        '<section class="sheet"><div class="sheet-h"><h2>Texto para el cliente</h2></div><div class="sheet-b"><div class="field full"><textarea id="inf-texto" rows="8" placeholder="Cómo fue el mes, qué funcionó y por qué.">' + esc(inf.texto) + '</textarea></div>' +
        '<div class="field full"><span class="lbl">Lo que mejor funcionó</span><div class="inf-dsts">' + dst.map(dfila).join('') + '</div><button type="button" class="btn sm ghost" data-act="infDstAdd" style="justify-self:start">+ Agregar</button></div>' +
        '<div class="field full"><label for="inf-rec">Para el mes que viene (una por renglón)</label><textarea id="inf-rec" rows="4">' + esc(rec.join('\n')) + '</textarea></div>' +
        '<div class="toolbar"><button class="btn primary" data-act="infGuardar">Guardar cambios</button><button class="btn ghost danger" data-act="infBorrar">Borrar informe</button></div></div></section>' : '') + '</div>';
  }
  // Vista del cliente (la misma que en el portal), con el botón para bajar el PDF.
  function vista(m, inf) {
    return informeVista({ inf, cliente: m.cliente, mesLabel: monthLabel(m.mes), piezas: ctx.piezas ? ctx.piezas(m._id) : null,
      descargar: '<button type="button" class="btn" data-act="infPdf" data-id="' + esc(m._id) + '">' + ICON.descargar + 'Descargar PDF</button>' });
  }

  /* ---------- Archivos y armado ---------- */
  const leerTexto = f => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = no; r.readAsText(f); });
  async function imagen(f) {
    const url = URL.createObjectURL(f);
    try {
      const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
      const k = Math.min(1, IMG_MAX / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      return c.toDataURL('image/jpeg', 0.85).split(',')[1];
    } finally { URL.revokeObjectURL(url); }
  }
  async function sumarArchivos(input) {
    const id = input.dataset.infup, arr = st.archivos.get(id) || [], fs = [...input.files]; input.value = '';
    for (const f of fs) {
      try {
        if (/^image\//.test(f.type)) { if (arr.filter(a => a.tipo === 'img').length >= 6) { toast('Hasta 6 capturas por informe'); continue; } arr.push({ tipo: 'img', nombre: f.name, base64: await imagen(f) }); }
        else if (/\.(xlsx|xls)$/i.test(f.name)) { const XLSX = await import('xlsx'); const wb = XLSX.read(await f.arrayBuffer()); arr.push({ tipo: 'txt', nombre: f.name, texto: wb.SheetNames.map(n => '# ' + n + '\n' + XLSX.utils.sheet_to_csv(wb.Sheets[n])).join('\n\n').slice(0, 60000) }); }
        else arr.push({ tipo: 'txt', nombre: f.name, texto: (await leerTexto(f)).slice(0, 60000) });
      } catch (e) { toast(f.name + ': no se pudo leer'); }
    }
    st.archivos.set(id, arr); render();
  }
  async function armar(m, ps) {
    const arr = st.archivos.get(m._id) || [], pegado = ((document.getElementById('inf-t-' + m._id) || {}).value || '').trim();
    const texto = [pegado, ...arr.filter(a => a.tipo === 'txt').map(a => '## ' + a.nombre + '\n' + a.texto)].filter(Boolean).join('\n\n');
    const imgs = arr.filter(a => a.tipo === 'img').map(a => ({ tipo: 'image/jpeg', base64: a.base64 }));
    if (!texto && !imgs.length) { toast('Subí el CSV o capturas de Meta, o pegá los números'); return; }
    const prev = anterior(m), inf = delMes(m);
    const contexto = { cliente: m.cliente, ...(ctx.marcaCtx ? ctx.marcaCtx(m.cliente, ps) : {}), mes: monthLabel(m.mes), plan: m.plan, publicado: (ps || []).filter(z => ['Programada', 'Publicada', 'Aprobada'].includes(z.estado)).map(z => ({ fecha: z.fecha, formato: z.formato, tema: z.tema })),
      metricas_mes_anterior: prev ? (prev.datos.metricas || []) : null };
    st.busy = true; render();
    try {
      const r = await data.ia({ modo: 'informe_redes', texto, contexto, imagenes: imgs });
      const met = (r.metricas || []).map(x => { const pa = prev && (prev.datos.metricas || []).find(y => y.nombre.toLowerCase() === String(x.nombre).toLowerCase() && (y.red || '') === (x.red || '')); return { nombre: x.nombre, red: x.red || '', valor: num(x.valor), anterior: num(x.anterior) ?? (pa ? pa.valor : null) }; });
      await data.informeGuardar(inf ? inf._id : null, { datos: { metricas: met, destacadas: r.destacadas || [], recomendaciones: r.recomendaciones || [] }, texto: r.texto || '', estado: inf ? inf.estado : 'Borrador' }, m.cliente, m.mes);
      st.rehacer.delete(m._id); st.archivos.delete(m._id);
      toast('Listo: revisalo y publicalo cuando esté'); await cargar(m.cliente, true);
    } catch (e) { toast(e.message); }
    st.busy = false; render();
  }

  /* ---------- Edición ---------- */
  function leer(box) {
    const met = [...box.querySelectorAll('.inf-met tbody tr')].map(tr => { const g = k => tr.querySelector('[data-im="' + k + '"]').value.trim(); return { nombre: g('nombre'), red: g('red'), valor: num(g('valor')), anterior: num(g('anterior')) }; }).filter(x => x.nombre);
    const dst = [...box.querySelectorAll('.inf-dst')].map(r => ({ titulo: r.querySelector('[data-id2="titulo"]').value.trim(), por_que: r.querySelector('[data-id2="por_que"]').value.trim() })).filter(x => x.titulo);
    const rec = ((box.querySelector('#inf-rec') || {}).value || '').split('\n').map(x => x.replace(/^[-•\d.)\s]+/, '').trim()).filter(Boolean);
    return { datos: { metricas: met, destacadas: dst, recomendaciones: rec }, texto: ((box.querySelector('#inf-texto') || {}).value || '').trim() };
  }
  const caja = t => t.closest('[data-inf]');
  const mesDeCaja = b => (S.RM || []).find(x => x._id === b.dataset.mes);
  const infDeCaja = b => { const m = mesDeCaja(b); return m && delMes(m); };
  async function guardar(b, extra, msg) {
    const m = mesDeCaja(b), inf = infDeCaja(b); if (!m || !inf) return;
    try { await data.informeGuardar(inf._id, { ...leer(b), ...(extra || {}) }, m.cliente, m.mes); toast(msg || 'Guardado'); await cargar(m.cliente, true); }
    catch (e) { toast(e.message); }
  }
  // Agregar o quitar filas sin perder lo que ya se escribió: se guarda el borrador en memoria y se vuelve a dibujar.
  function editarLocal(b, fn) { const inf = infDeCaja(b); if (!inf) return; const v = leer(b); fn(v); inf.datos = v.datos; inf.texto = v.texto; render(); }

  const acts = {
    infUp: () => {},
    infQuitar: t => { const arr = st.archivos.get(t.dataset.id) || []; arr.splice(+t.dataset.i, 1); render(); },
    infArmar: t => { const m = (S.RM || []).find(x => x._id === t.dataset.id); if (m) armar(m, ctx.piezas(m._id)); },
    infVacio: async t => { const m = (S.RM || []).find(x => x._id === t.dataset.id); if (!m) return; try { await data.informeGuardar(null, { datos: { metricas: [{ nombre: 'Alcance', red: 'Instagram', valor: null, anterior: null }], destacadas: [], recomendaciones: [] }, texto: '', estado: 'Borrador' }, m.cliente, m.mes); st.rehacer.delete(m._id); await cargar(m.cliente, true); } catch (e) { toast(e.message); } },
    infRehacer: t => { st.rehacer.add(t.dataset.id); render(); },
    infCancelar: t => { st.rehacer.delete(t.dataset.id); render(); },
    infGuardar: t => guardar(caja(t)),
    infPublicar: t => { const on = t.dataset.v === '1'; guardar(caja(t), on ? { estado: 'Publicado', publicadoAt: new Date().toISOString() } : { estado: 'Borrador' }, on ? 'Publicado: el cliente ya lo ve en su portal' : 'Lo sacaste del portal'); },
    infAvisar: async t => {
      const b = caja(t), m = mesDeCaja(b), inf = infDeCaja(b); if (!m || !inf || !ctx.avisarCliente) return;
      const ok = await ctx.avisarCliente(m.cliente, 'informe', { mes: m.mes });
      if (ok) { try { await data.informeGuardar(inf._id, { enviadoAt: new Date().toISOString() }); await cargar(m.cliente, true); } catch (e) { /* el aviso salió igual */ } }
    },
    infPdf: async t => {
      const m = (S.RM || []).find(x => x._id === t.dataset.id), b = document.querySelector('[data-inf][data-mes="' + (m && m._id) + '"]'), inf = m && delMes(m); if (!inf) return;
      const datos = b ? leer(b) : inf; const txt = t.innerHTML; t.disabled = true; t.textContent = 'Preparando…';
      try {
        const { informeDoc, abrirPdf } = await import('./docs.js');
        const bytes = await informeDoc({ cliente: m.cliente, mesLabel: monthLabel(m.mes), inf: { datos: datos.datos, texto: datos.texto }, piezas: ctx.piezas ? ctx.piezas(m._id) : null, cfg: ctx.cfgMarca ? ctx.cfgMarca() : null });
        abrirPdf(bytes, 'Informe de redes ' + monthLabel(m.mes) + ' ' + m.cliente);
      } catch (e) { toast('No se pudo armar el PDF: ' + e.message); }
      t.disabled = false; t.innerHTML = txt;
    },
    infBorrar: async t => { const b = caja(t), m = mesDeCaja(b), inf = infDeCaja(b); if (!inf || !await confirmar('¿Borrar el informe de ' + monthLabel(m.mes) + '?')) return; try { await data.informeDel(inf._id); toast('Borrado'); await cargar(m.cliente, true); } catch (e) { toast(e.message); } },
    infMetAdd: t => editarLocal(caja(t), v => v.datos.metricas.push({ nombre: ' ', red: '', valor: null, anterior: null })),
    infMetDel: t => editarLocal(caja(t), v => v.datos.metricas.splice(+t.dataset.i, 1)),
    infDstAdd: t => editarLocal(caja(t), v => v.datos.destacadas.push({ titulo: ' ', por_que: '' })),
    infDstDel: t => editarLocal(caja(t), v => v.datos.destacadas.splice(+t.dataset.i, 1)),
  };
  document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.infup) sumarArchivos(e.target); });
  return { html, acts, invalidar: cliente => st.lista.delete(cliente) };
}
