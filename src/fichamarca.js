// Ficha de marca y voz de cada cliente: qué hace, a quién le habla, cómo habla, qué evita y de qué publica.
// Es el contexto que usa Mr. Piggy para proponer contenido, escribir copys y armar informes con la voz de la marca.
// Se puede completar a mano o pedirle a Mr. Piggy que la arme con el brief, las notas y los copys ya aprobados.
import { ICON } from './iconos.js';
import { initKit, kitDeTexto } from './kitmarca.js';

export const CAMPOS_MARCA = [
  { k: 'rubro', l: 'Qué hace la marca', rows: 2, ph: 'Ej.: hamburguesería de barrio en Córdoba, con delivery propio y local en Nueva Córdoba' },
  { k: 'publico', l: 'A quién le habla', rows: 2, ph: 'Ej.: jóvenes de 20 a 35, estudiantes y oficinistas, que piden de noche' },
  { k: 'tono', l: 'Cómo habla', rows: 3, ph: 'Ej.: cercano, canchero y con humor; frases cortas; nunca solemne' },
  { k: 'trato', l: 'Trato', tipo: 'select', opts: ['', 'Vos', 'Tú', 'Usted'] },
  { k: 'emojis', l: 'Emojis', tipo: 'select', opts: ['', 'Sí, con ganas', 'Pocos y puntuales', 'No usa'] },
  { k: 'espaciado', l: 'Espacio entre bloques del copy', tipo: 'select', opts: ['', 'Una línea en blanco', 'Dos líneas en blanco', 'Línea invisible (para que Instagram no junte los párrafos)'] },
  { k: 'palabras_si', l: 'Palabras y frases que usa', rows: 2, ph: 'Ej.: “la burga”, “posta”, “te esperamos”' },
  { k: 'palabras_no', l: 'Lo que nunca dice ni hace', rows: 2, ph: 'Ej.: no habla de precios, no usa “gourmet”, no hace chistes de política' },
  { k: 'pilares', l: 'Pilares de contenido (uno por renglón)', rows: 4, ph: 'Producto\nDetrás de escena\nComunidad y clientes\nPromos y fechas' },
  { k: 'hashtags', l: 'Hashtags de marca', rows: 1, ph: '#wannaburga #burgacordoba' },
  { k: 'fechas', l: 'Fechas importantes', rows: 2, ph: 'Aniversario 12/3, Día de la hamburguesa 28/5, temporada alta en verano' },
  { k: 'referencias', l: 'Referencias y competencia', rows: 2, ph: 'Cuentas que les gustan o con las que compiten' },
  { k: 'ejemplos', l: 'Copys que suenan a la marca', rows: 4, ph: 'Pegá 2 o 3 copys que les hayan encantado' },
  { k: 'colores', l: 'Colores (uno por renglón)', rows: 3, ph: 'Rojo burga #E30613 · principal\nCrema #F4EBDD · fondos' },
  { k: 'tipografias', l: 'Tipografías', rows: 2, ph: 'Títulos: Druk Wide Bold\nTextos: Inter Regular' },
  { k: 'visual', l: 'Estilo visual y uso del logo', rows: 3, ph: 'Fotos con luz cálida y producto en primer plano; logo siempre sobre fondo liso, nunca deformado' },
];
// Documentos que Mr. Piggy puede leer para completar la ficha
const MB = 1024 * 1024, PDF_MAX = 18 * MB, PDF_PAGS = 100;
const ACEPTA = '.pdf,.docx,.txt,.md,.csv,image/png,image/jpeg,image/webp';
const leer = (f, como) => new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => mal(r.error); r[como](f); });
const comoTexto = f => (f.text ? f.text() : leer(f, 'readAsText'));
const comoBuf = f => (f.arrayBuffer ? f.arrayBuffer() : leer(f, 'readAsArrayBuffer'));
const b64 = blob => new Promise((ok, mal) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1] || ''); r.onerror = () => mal(r.error); r.readAsDataURL(blob); });
// Texto de un .docx: se abre el zip y se lee word/document.xml (sin librerías).
async function textoDocx(buf) {
  const dv = new DataView(buf), u8 = new Uint8Array(buf);
  let eocd = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 66000); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('El .docx no se pudo abrir');
  let p = dv.getUint32(eocd + 16, true); const n = dv.getUint16(eocd + 10, true), dec = new TextDecoder();
  for (let k = 0; k < n; k++) {
    const metodo = dv.getUint16(p + 10, true), tam = dv.getUint32(p + 20, true), ln = dv.getUint16(p + 28, true), le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const nombre = dec.decode(u8.subarray(p + 46, p + 46 + ln));
    if (nombre === 'word/document.xml') {
      const ini = off + 30 + dv.getUint16(off + 26, true) + dv.getUint16(off + 28, true), raw = u8.subarray(ini, ini + tam);
      const xml = metodo === 0 ? dec.decode(raw) : await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
      return xml.replace(/<w:tab\/>/g, '\t').replace(/<\/w:p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
    }
    p += 46 + ln + le + lc;
  }
  throw new Error('El .docx no tiene texto');
}
// Un PDF muy pesado o muy largo se recorta a las primeras páginas que entran (y se avisa).
async function pdfQueEntra(file) {
  const buf = await comoBuf(file);
  let doc = null; try { const { PDFDocument } = await import('pdf-lib'); doc = await PDFDocument.load(buf, { ignoreEncryption: true }); } catch (e) { doc = null; }
  const total = doc ? doc.getPageCount() : 0;
  if (file.size <= PDF_MAX && (!doc || total <= PDF_PAGS)) return { base64: await b64(file), aviso: '' };
  if (!doc) throw new Error(file.name + ' pesa ' + Math.round(file.size / MB) + ' MB y no lo pude achicar. Exportalo más liviano (máx. 18 MB).');
  const { PDFDocument } = await import('pdf-lib');
  let k = Math.min(PDF_PAGS, total), bytes = null;
  for (let i = 0; i < 6 && k >= 1; i++) {
    const nd = await PDFDocument.create(); (await nd.copyPages(doc, Array.from({ length: k }, (_, j) => j))).forEach(pg => nd.addPage(pg));
    bytes = await nd.save(); if (bytes.length <= PDF_MAX) break;
    k = Math.floor(k * PDF_MAX / bytes.length * 0.9); bytes = null;
  }
  if (!bytes) throw new Error(file.name + ' es muy pesado para leerlo. Exportalo más liviano (máx. 18 MB).');
  return { base64: await b64(new Blob([bytes], { type: 'application/pdf' })), aviso: 'De ' + file.name + ' leí las primeras ' + k + ' de ' + total + ' páginas (el archivo es muy pesado o muy largo).' };
}
export async function leerArchivos(files) {
  const out = { documentos: [], textos: [], imagenes: [], nombres: [], avisos: [] };
  for (const f of files) {
    const nom = f.name || 'documento', ext = (nom.split('.').pop() || '').toLowerCase();
    try {
      if (ext === 'pdf' || f.type === 'application/pdf') {
        if (out.documentos.length >= 3) { out.avisos.push(nom + ': hasta 3 PDF por vez.'); continue; }
        const r = await pdfQueEntra(f); out.documentos.push({ nombre: nom, base64: r.base64 }); if (r.aviso) out.avisos.push(r.aviso);
      } else if (ext === 'docx') out.textos.push({ nombre: nom, texto: await textoDocx(await comoBuf(f)) });
      else if (['txt', 'md', 'csv'].includes(ext) || /^text\//.test(f.type)) out.textos.push({ nombre: nom, texto: String(await comoTexto(f)).slice(0, 60000) });
      else if (/^image\/(png|jpeg|webp)$/.test(f.type)) { if (f.size > 3.6 * MB) { out.avisos.push(nom + ' es muy pesada (máx. 3,5 MB por imagen).'); continue; } out.imagenes.push({ tipo: f.type, base64: await b64(f) }); }
      else { out.avisos.push(nom + ': ese formato no lo leo. Usá PDF, Word (.docx), texto o imágenes.'); continue; }
      out.nombres.push(nom);
    } catch (e) { out.avisos.push(e.message); }
  }
  if (out.documentos.reduce((a, d) => a + d.base64.length, 0) > 26 * MB) throw new Error('Entre todos los PDF pasan el máximo. Subí de a uno.');
  return out;
}
const lleno = m => m && CAMPOS_MARCA.some(f => String(m[f.k] || '').trim());
// Lo visual (colores, tipografías, uso) se carga en el kit de marca; acá queda la parte conceptual.
const VISUALES = ['colores', 'tipografias', 'visual'];
const VOZ = CAMPOS_MARCA.filter(f => !VISUALES.includes(f.k));

export function initFichaMarca(ctx) {
  const { S, esc, toast, data, render, emptyBox, isStaff } = ctx;
  const st = { busy: false, fuentes: null, nota: '', borr: null };
  const KIT = initKit(ctx);

  function html(c) {
    if (c.marca === undefined) return voz(c);
    return KIT.html(c) + voz(c);
  }
  function voz(c) {
    const m = c.marca || {}, can = isStaff();
    if (c.marca === undefined) return '<section class="sheet">' + emptyBox('Falta un paso en la base de datos', 'Para guardar la ficha de marca hay que correr el SQL 0018 en Supabase.') + '</section>';
    const piggy = '<button class="btn sm" data-act="fmIA" data-id="' + esc(c._id) + '"' + (st.busy ? ' disabled' : '') + '>' + ICON.ia + (st.busy ? (st.busy === 'doc' ? 'Leyendo los documentos…' : 'Leyendo brief y copys…') : lleno(m) ? 'Actualizar con Mr. Piggy' : 'Que la arme Mr. Piggy') + '</button>' +
      '<label class="btn sm' + (st.busy ? ' disabled' : '') + '" title="Brandbook, manual de marca, presentación o cualquier documento: Mr. Piggy lo lee y completa la ficha">' + ICON.doc + 'Desde un documento<input type="file" hidden multiple accept="' + ACEPTA + '" data-fmdoc="' + esc(c._id) + '"' + (st.busy ? ' disabled' : '') + '></label>';
    if (!lleno(m)) return '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.marca + '</span><h2>Marca y voz</h2></div><div class="sx-panel fm-vacio">' +
      '<p class="sx-lead"><b>Sin ficha, Mr. Piggy escribe genérico.</b> Con esto propone contenido del rubro, escribe copys con la voz de ' + esc(c.nombre) + ' y respeta lo que la marca no hace.</p>' +
      (can ? '<div class="toolbar">' + piggy + '<button class="btn sm ghost" data-act="fmEditar" data-id="' + esc(c._id) + '">Completar a mano</button></div><p class="muted" style="margin:0;font-size:13px">Mr. Piggy usa el brief de Tally, las notas del cliente y los copys ya aprobados. Si tienen brandbook o manual de marca, subilo con “Desde un documento” (PDF, Word, texto o imágenes) y lo lee entero. Después la revisás.</p>' : '') + '</div></section>';
    const item = (l, v, cls) => v ? '<div class="fm-i' + (cls ? ' ' + cls : '') + '"><span>' + esc(l) + '</span><p>' + esc(v) + '</p></div>' : '';
    const chips = (v) => String(v || '').split('\n').map(x => x.trim()).filter(Boolean);
    return '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.marca + '</span><h2>Marca y voz</h2>' + (can ? '<div class="sx-der toolbar">' + piggy + '<button class="btn sm primary" data-act="fmEditar" data-id="' + esc(c._id) + '">Editar</button></div>' : '') + '</div>' +
      '<div class="fm-g">' + item('Qué hace', m.rubro, 'w2') + item('A quién le habla', m.publico, 'w2') + item('Cómo habla', m.tono, 'w2') +
      '<div class="fm-i"><span>Trato y emojis</span><p>' + esc([m.trato, m.emojis].filter(Boolean).join(' · ') || '—') + '</p></div>' +
      (chips(m.pilares).length ? '<div class="fm-i"><span>Pilares de contenido</span><div class="fm-chips">' + chips(m.pilares).map(x => '<b>' + esc(x) + '</b>').join('') + '</div></div>' : '') +
      item('Usa', m.palabras_si) + item('Nunca', m.palabras_no) + item('Hashtags', m.hashtags) + item('Fechas importantes', m.fechas) + item('Referencias', m.referencias) +
      (m.ejemplos ? '<div class="fm-i w2"><span>Copys que suenan a la marca</span><p class="fm-ej">' + esc(m.ejemplos) + '</p></div>' : '') +
      ((m.fuentes || []).length ? '<p class="fm-fuentes">' + ICON.doc + 'Leído de: ' + esc(m.fuentes.map(f => f.nombre).join(', ')) + '</p>' : '') + '</div></section>';
  }
  function editar(c, borrador) {
    const m = borrador || c.marca || {};
    S.form = null; S.fmf = c._id; st.borr = borrador || null;
    const campo = f => VISUALES.includes(f.k) ? '' : '<div class="field' + (f.tipo === 'select' ? '' : ' full') + '"><label for="fm-' + f.k + '">' + esc(f.l) + '</label>' +
      (f.tipo === 'select' ? '<select id="fm-' + f.k + '">' + f.opts.map(o => '<option value="' + esc(o) + '"' + ((m[f.k] || '') === o ? ' selected' : '') + '>' + esc(o || '—') + '</option>').join('') + '</select>'
        : f.rows > 1 ? '<textarea id="fm-' + f.k + '" rows="' + f.rows + '" placeholder="' + esc(f.ph || '') + '">' + esc(m[f.k] || '') + '</textarea>' : '<input id="fm-' + f.k + '" value="' + esc(m[f.k] || '') + '" placeholder="' + esc(f.ph || '') + '">') + '</div>';
    document.getElementById('panel').innerHTML = '<form id="fmform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(c.nombre) + '</span><h2 id="panel-title">Marca y voz</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><p class="formnote full">' + (borrador ? '<b>Esto lo armó Mr. Piggy' + (st.fuentes && st.fuentes.length ? ' leyendo ' + esc(st.fuentes.join(', ')) : '') + ':</b> revisalo, corregí lo que haga falta y guardá.' + (st.nota ? '<br>' + esc(st.nota) : '') : 'Lo que pongas acá lo usa Mr. Piggy cada vez que propone contenido o escribe para esta marca. No hace falta completar todo.') + '</p>' + CAMPOS_MARCA.map(campo).join('') + '</div>' +
      '<div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary" id="fmsave">Guardar</button></span></div></form>';
    document.getElementById('panel').hidden = false; document.getElementById('scrim').hidden = false;
  }
  async function guardar() {
    const c = S.C.find(x => x._id === S.fmf); if (!c) return;
    // Se guarda todo lo que ya tenía (kit, horarios…) más lo del formulario; lo que Mr. Piggy leyó de colores y tipografías completa el kit si está vacío.
    const m = { ...(st.borr || c.marca || {}) }; VOZ.forEach(f => { const el = document.getElementById('fm-' + f.k); if (el) m[f.k] = el.value.trim(); });
    if (st.borr) m.kit = kitDeTexto(m);
    m.actualizado = new Date().toISOString().slice(0, 10);
    if (c.marca && c.marca.horarios) m.horarios = c.marca.horarios; // los horarios de la cuenta (Redes → Fechas y horarios con Mr. Piggy)
    if (c.marca && c.marca.kit && !st.borr) m.kit = c.marca.kit;
    const prev = (c.marca && c.marca.fuentes) || [], nuevas = (st.fuentes || []).map(nombre => ({ nombre, fecha: m.actualizado }));
    m.fuentes = [...prev.filter(f => !nuevas.some(n => n.nombre === f.nombre)), ...nuevas].slice(-12);
    const b = document.getElementById('fmsave'); if (b) { b.disabled = true; b.textContent = 'Guardando…'; }
    try { await data.marcaGuardar(c._id, m); c.marca = m; st.fuentes = null; st.nota = ''; st.borr = null; ctx.closeForm(); toast('Ficha de marca guardada'); render(); }
    catch (e) { toast(/marca/.test(e.message) ? 'Falta correr el SQL 0018 en Supabase' : e.message); if (b) { b.disabled = false; b.textContent = 'Guardar'; } }
  }
  // Mr. Piggy arma (o actualiza) la ficha con lo que hay: brief, notas, servicios y copys aprobados.
  async function conIA(c, archivos) {
    let docs = null;
    st.busy = archivos ? 'doc' : true; st.fuentes = null; st.nota = ''; render();
    if (archivos) {
      try { docs = await leerArchivos(archivos); } catch (e) { toast(e.message); st.busy = false; render(); return; }
      if (!docs.nombres.length) { toast(docs.avisos.join(' ') || 'No pude leer esos archivos'); st.busy = false; render(); return; }
      toast('Mr. Piggy está leyendo ' + docs.nombres.join(', ') + '… puede tardar un minuto');
    }
    try {
      const briefs = (S.BF || []).filter(b => b.cliente === c.nombre).slice(0, 3).map(b => ({ tipo: b.tipo, fecha: b.respondido, respuestas: (b.respuestas || []).slice(0, 60) }));
      const meses = (S.RM || []).filter(x => x.cliente === c.nombre).map(x => x._id);
      let copys = [];
      try { copys = (await data.piezasDe(meses)).filter(z => z.copy && ['Aprobada', 'Programada', 'Publicada'].includes(z.estado)).slice(-25).map(z => ({ formato: z.formato, tema: z.tema, copy: z.copy, hashtags: z.hashtags })); } catch (e) { copys = []; }
      const r = await data.ia({ modo: 'marca', contexto: { cliente: c.nombre, web_o_instagram: c.web || '', notas: c.notas || '', servicios: S.A.filter(a => a.cliente === c.nombre && a.estado === 'Activo').map(a => a.tipo + (a.plan ? ' ' + a.plan : '')),
        proyectos: S.P.filter(p => p.cliente === c.nombre).slice(0, 8).map(p => p.proyecto + ' (' + (p.tipo || '') + ')'), briefs, copys_aprobados: copys, ficha_actual: c.marca || {} },
        ...(docs ? { documentos: docs.documentos, textos: docs.textos, imagenes: docs.imagenes } : {}) });
      if (docs) { st.fuentes = docs.nombres; st.nota = [r.leido, ...docs.avisos].filter(Boolean).join(' '); }
      const m = { ...(c.marca || {}) }; CAMPOS_MARCA.forEach(f => { const v = r[f.k]; if (v != null && String(v).trim()) m[f.k] = Array.isArray(v) ? v.join('\n') : String(v).trim(); });
      if (!docs && !briefs.length && !copys.length && !c.notas) toast('Ojo: no hay brief, notas ni copys aprobados de ' + c.nombre + '. Revisá bien lo que propone.');
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
  document.addEventListener('change', e => {
    const t = e.target; if (!t || !t.dataset || !t.dataset.fmdoc) return;
    const c = S.C.find(x => x._id === t.dataset.fmdoc), fs = [...(t.files || [])]; t.value = '';
    if (c && fs.length && !st.busy) conIA(c, fs);
  });
  return { html, acts: { ...acts, ...KIT.acts }, contexto, lleno };
}
