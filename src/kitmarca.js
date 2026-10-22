// Kit de marca de cada cliente (lo visual, como el brand kit de Canva): logos, colores, tipografías, imágenes y links.
// Vive en clientes.marca.kit; los archivos van al bucket "marcas" (SQL 0044). Los colores y tipografías también se
// guardan como texto en la ficha (marca.colores / marca.tipografias) para que Mr. Piggy los tenga en cuenta.
import { ICON } from './iconos.js';
import { manualHTML, MANUAL_CSS, cargarFuentesManual } from './manual-vista.js';

const uid = () => Math.random().toString(36).slice(2, 9);
const ROLES_COLOR = ['Principal', 'Secundario', 'Acento', 'Fondo', 'Texto'];
const ROLES_TIPO = ['Títulos', 'Subtítulos', 'Textos', 'Destacados'];
const PESOS = [['300', 'Light'], ['400', 'Regular'], ['500', 'Medium'], ['600', 'Semibold'], ['700', 'Bold'], ['800', 'Extrabold'], ['900', 'Black']];
const FONDOS = ['claro', 'oscuro', 'marca'];
const esImg = (tipo, url) => /^image\//.test(tipo || '') || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url || '');
const ext = u => ((String(u || '').split('?')[0].match(/\.([a-z0-9]{2,5})$/i) || [])[1] || '').toUpperCase();
const hexOk = h => /^#[0-9a-f]{6}$/i.test(h || '');
const normHex = h => { let x = String(h || '').trim(); if (!x.startsWith('#')) x = '#' + x; if (/^#[0-9a-f]{3}$/i.test(x)) x = '#' + x.slice(1).split('').map(c => c + c).join(''); return x.toUpperCase(); };
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const claro = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.45; };
const bajar = (url, n) => url + (url.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(n || '');

// Lo que Mr. Piggy leyó del manual (texto) pasado a colores y tipografías del kit, si el kit todavía no los tiene.
export function kitDeTexto(m) {
  const kit = { logos: [], colores: [], tipos: [], recursos: [], links: [], ...(m.kit || {}) };
  if (!kit.colores.length && m.colores) {
    String(m.colores).split('\n').forEach(l => { const hx = (l.match(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/i) || [])[0]; if (!hx) return;
      const resto = l.replace(hx, '').replace(/[·:()-]+/g, ' ').trim(), rol = ROLES_COLOR.find(r => new RegExp(r, 'i').test(resto)) || '';
      kit.colores.push({ id: 'c' + kit.colores.length, hex: normHex(hx), n: resto.replace(new RegExp(rol, 'i'), '').replace(/\s+/g, ' ').trim() || normHex(hx), rol }); });
  }
  if (!kit.tipos.length && m.tipografias) {
    String(m.tipografias).split('\n').map(l => l.trim()).filter(Boolean).forEach(l => { const mm = l.match(/^([^:]{2,20}):\s*(.+)$/), txt = mm ? mm[2] : l;
      const peso = (PESOS.filter(p => p[1] !== 'Black').find(([, n]) => new RegExp('\\b' + n + '\\b', 'i').test(txt)) || [])[0] || '';
      kit.tipos.push({ id: 't' + kit.tipos.length, rol: mm ? mm[1].trim() : '', familia: txt.replace(/\b(Light|Regular|Medium|Semibold|Bold|Extrabold)\b/gi, '').replace(/\s+/g, ' ').trim(), peso }); });
  }
  return kit;
}
// Texto para Mr. Piggy, armado desde el kit
const coloresTxt = k => (k.colores || []).map(c => [c.n, c.hex, c.rol ? '· ' + c.rol.toLowerCase() : ''].filter(Boolean).join(' ')).join('\n');
const tiposTxt = k => (k.tipos || []).map(t => (t.rol ? t.rol + ': ' : '') + t.familia + (t.peso ? ' ' + ((PESOS.find(p => p[0] === t.peso) || [])[1] || t.peso) : '')).join('\n');

export function initKit(ctx) {
  const { S, esc, toast, data, render, isStaff } = ctx;
  const st = { cargadas: new Set(), subiendo: '' };
  const cli = id => S.C.find(x => x._id === id);
  // Si la ficha ya tenía colores o tipografías escritos (a mano o por Mr. Piggy), el kit arranca con esos.
  const kitDe = c => kitDeTexto(c.marca || {});

  async function guardar(c, kit, extra) {
    const m = { ...(c.marca || {}), kit, ...(extra || {}) };
    if (kit.colores.length) m.colores = coloresTxt(kit);
    if (kit.tipos.length) m.tipografias = tiposTxt(kit);
    await data.marcaGuardar(c._id, m); c.marca = m; render();
  }
  // Tipografías: las subidas se cargan del archivo; las otras se piden a Google Fonts (si no está, se ve con la de sistema).
  function cargarFuentes(kit) {
    kit.tipos.forEach(t => {
      const k = t.url || t.familia; if (!k || st.cargadas.has(k)) return; st.cargadas.add(k);
      if (t.url && window.FontFace) new FontFace('km-' + t.id, 'url(' + t.url + ')').load().then(f => { document.fonts.add(f); }, () => {});
      else if (t.familia) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(t.familia).replace(/%20/g, '+') + ':wght@300;400;500;600;700;800;900&display=swap'; document.head.appendChild(l); }
    });
  }
  const fam = t => (t.url ? "'km-" + t.id + "', " : '') + "'" + String(t.familia || '').replace(/'/g, '') + "', system-ui, sans-serif";

  const urlManual = man => location.origin + '/m/' + man.slug;
  function manualEstado(c) {
    const man = (c.marca || {}).manual || {};
    if (!man.publicado || !man.slug) return '';
    return '<div class="km-pub"><span class="km-pub-d"></span><span>' + (man.version === 'simple' ? 'Guía de marca' : 'Manual de marca') + ' publicado: <a href="' + esc(urlManual(man)) + '" target="_blank" rel="noopener">' + esc(urlManual(man).replace(/^https?:\/\//, '')) + '</a></span><button class="btn ghost sm" data-act="kmCopiar" data-v="' + esc(urlManual(man)) + '">' + ICON.copiar + 'Copiar link</button></div>';
  }
  function html(c) {
    const kit = kitDe(c), can = isStaff(), id = esc(c._id), m = c.marca || {};
    cargarFuentes(kit);
    const sube = (k, txt, acc) => can ? '<label class="btn sm km-add' + (st.subiendo === k ? ' disabled' : '') + '">' + ICON.sumar + (st.subiendo === k ? 'Subiendo…' : txt) + '<input type="file" hidden multiple accept="' + acc + '" data-kitup="' + k + '" data-id="' + id + '"></label>' : '';
    const btn = (act, txt, extra) => can ? '<button class="btn sm km-add" data-act="' + act + '" data-id="' + id + '"' + (extra || '') + '>' + ICON.sumar + txt + '</button>' : '';
    const acc = (k, x, dl) => '<span class="km-acc">' + (dl ? '<a class="btn ghost sm" href="' + esc(bajar(x.url, x.n)) + '" title="Descargar" aria-label="Descargar">' + ICON.descargar + '</a>' : '') +
      (can ? '<button class="btn ghost sm" data-act="kmEditar" data-k="' + k + '" data-i="' + esc(x.id) + '" data-id="' + id + '" title="Editar" aria-label="Editar">' + ICON.editar + '</button>' : '') + '</span>';
    const sec = (t, sub, add, body) => '<div class="km-s"><div class="km-sh"><h3>' + t + '</h3>' + (sub ? '<span class="muted">' + sub + '</span>' : '') + '<span class="km-sp"></span>' + add + '</div>' + body + '</div>';
    const vacio = t => '<p class="km-v">' + t + '</p>';

    const logos = kit.logos.length ? '<div class="km-logos">' + kit.logos.map(x => '<div class="km-logo"><div class="km-lf f-' + esc(x.fondo || 'claro') + '"' + (x.fondo === 'marca' && kit.colores[0] ? ' style="--km:' + esc(kit.colores[0].hex) + '"' : '') + '>' +
      (esImg(x.tipo, x.url) ? '<img src="' + esc(x.url) + '" alt="' + esc(x.n) + '" loading="lazy">' : '<span class="km-ext">' + esc(ext(x.url) || 'ARCHIVO') + '</span>') +
      (can ? '<button class="km-fbtn" data-act="kmFondo" data-i="' + esc(x.id) + '" data-id="' + id + '" title="Cambiar el fondo" aria-label="Cambiar el fondo">◐</button>' : '') + '</div>' +
      '<div class="km-cap"><b>' + esc(x.n) + '</b>' + acc('logos', x, true) + '</div></div>').join('') + '</div>' : vacio('Subí el logo principal y sus versiones: isotipo, negativo, monocromo…');

    const cols = kit.colores.length ? '<div class="km-cols">' + kit.colores.map(x => { const h = hexOk(x.hex) ? x.hex : '#999999', [r, g, b] = rgb(h);
      return '<div class="km-col"><button class="km-sw' + (claro(h) ? ' cl' : '') + '" style="background:' + esc(h) + '" data-act="kmCopiar" data-v="' + esc(h) + '" title="Copiar ' + esc(h) + '">' + (x.rol ? '<i>' + esc(x.rol) + '</i>' : '') + '<span>Copiar</span></button>' +
        '<div class="km-cap"><span><b>' + esc(x.n || h) + '</b><small>' + esc(h) + ' · RGB ' + r + ' ' + g + ' ' + b + '</small></span>' + acc('colores', x) + '</div></div>'; }).join('') + '</div>' : vacio('Cargá la paleta: el color principal, los secundarios, el de fondo y el de texto.');

    const tipos = kit.tipos.length ? '<div class="km-tipos">' + kit.tipos.map(x => '<div class="km-tipo"><span class="km-rol">' + esc(x.rol || 'Tipografía') + '</span>' +
      '<div class="km-aa" style="font-family:' + esc(fam(x)) + ';font-weight:' + esc(x.peso || '400') + '">Aa</div>' +
      '<p class="km-pan" style="font-family:' + esc(fam(x)) + ';font-weight:' + esc(x.peso || '400') + '">' + esc(c.nombre) + ' · ABCDEFGHIJKLMNÑ abcdefghijklmnñ 0123456789</p>' +
      '<div class="km-cap"><span><b>' + esc(x.familia) + '</b><small>' + esc((PESOS.find(p => p[0] === x.peso) || [])[1] || 'Regular') + (x.url ? ' · archivo cargado' : '') + '</small></span>' + acc('tipos', x, !!x.url) + '</div></div>').join('') + '</div>' : vacio('Sumá las tipografías de títulos y de textos. Si no es de Google Fonts, subí el archivo para verla y descargarla.');

    const recursos = kit.recursos.length ? '<div class="km-recs">' + kit.recursos.map(x => '<div class="km-rec"><div class="km-rf">' + (esImg(x.tipo, x.url) ? '<img src="' + esc(x.url) + '" alt="' + esc(x.n) + '" loading="lazy">' : '<span class="km-ext">' + esc(ext(x.url) || 'ARCHIVO') + '</span>') + '</div><div class="km-cap"><b>' + esc(x.n) + '</b>' + acc('recursos', x, true) + '</div></div>').join('') + '</div>' : vacio('Fotos de producto, texturas, íconos, patrones, plantillas o el manual en PDF.');

    const links = kit.links.length ? '<div class="km-links">' + kit.links.map(x => '<span class="km-link"><a class="btn sm" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.n) + ' ' + ICON.externo + '</a>' + (can ? '<button class="btn ghost sm" data-act="kmEditar" data-k="links" data-i="' + esc(x.id) + '" data-id="' + id + '" aria-label="Editar">' + ICON.editar + '</button>' : '') + '</span>').join('') + '</div>' : vacio('El manual, la carpeta del Drive, el kit de Canva o el archivo de Figma.');

    const uso = m.visual ? '<p class="km-uso">' + esc(m.visual) + '</p>' : vacio('Cómo se usa el logo, qué fondos van, cómo son las fotos…');

    return '<section class="sheet sx km"><div class="sx-h"><span class="sx-i">' + ICON.marca + '</span><h2>Kit de marca</h2>' +
      (can ? '<div class="sx-der toolbar"><label class="btn sm" title="Mr. Piggy lee el manual de marca y completa colores, tipografías y la ficha">' + ICON.ia + 'Completar desde el manual<input type="file" hidden multiple accept=".pdf,.docx,.txt,.md,image/png,image/jpeg,image/webp" data-fmdoc="' + id + '"></label>' +
        '<button class="btn sm" data-act="kmPrevia" data-id="' + id + '">' + ICON.ojo + 'Ver el manual</button><button class="btn sm primary" data-act="kmManual" data-id="' + id + '">' + ICON.compartir + 'Manual online</button></div>' : '') + '</div>' +
      manualEstado(c) +
      sec('Logos', '', sube('logos', 'Subir logos', 'image/*,.svg,.pdf,.ai,.eps'), logos) +
      sec('Colores', 'Tocá un color para copiar el código', btn('kmNuevo', 'Color', ' data-k="colores"'), cols) +
      sec('Tipografías', '', btn('kmNuevo', 'Tipografía', ' data-k="tipos"'), tipos) +
      sec('Imágenes y archivos', '', sube('recursos', 'Subir', 'image/*,.svg,.pdf,.ai,.eps,.psd,.zip,.mp4,.mov'), recursos) +
      sec('Links', '', btn('kmNuevo', 'Link', ' data-k="links"'), links) +
      sec('Cómo se usa', '', can ? '<button class="btn sm km-add" data-act="kmUso" data-id="' + id + '">' + ICON.editar + (m.visual ? 'Editar' : 'Escribir') + '</button>' : '', uso) +
      '</section>';
  }

  // Panel para cargar o editar un color, una tipografía, un link o el nombre de un logo o archivo.
  function panel(c, k, i) {
    const kit = kitDe(c), x = i ? (kit[k] || []).find(y => y.id === i) : null, nuevo = !x;
    S.form = null; st.edit = { cid: c._id, k, i };
    const radios = (name, opts, val) => '<div class="seg km-seg" role="radiogroup">' + opts.map(o => '<label><input type="radio" name="' + name + '" value="' + esc(o) + '"' + ((val || '') === o ? ' checked' : '') + '><span>' + esc(o || 'Sin rol') + '</span></label>').join('') + '</div>';
    let campos = '', titulo = '';
    if (k === 'colores') { const h = x && hexOk(x.hex) ? x.hex : '#FC4855'; titulo = nuevo ? 'Nuevo color' : 'Color';
      campos = '<div class="field full"><label for="km-hex">Color</label><div class="km-hexr"><input type="color" id="km-pick" value="' + esc(h.toLowerCase()) + '" aria-label="Elegir color"><input id="km-hex" value="' + esc(h) + '" placeholder="#FC4855" maxlength="7"></div></div>' +
        '<div class="field full"><label for="km-n">Nombre</label><input id="km-n" value="' + esc((x && x.n) || '') + '" placeholder="Ej.: Rojo burga"></div>' +
        '<div class="field full"><span class="lbl">Para qué se usa</span>' + radios('km-rol', ['', ...ROLES_COLOR], x && x.rol) + '</div>' +
        '<div class="field full"><label for="km-pms">Pantone (opcional)</label><input id="km-pms" value="' + esc((x && x.pantone) || '') + '" placeholder="Ej.: 185 C"><span class="hint">HEX, RGB y CMYK se calculan solos.</span></div>'; }
    else if (k === 'tipos') { titulo = nuevo ? 'Nueva tipografía' : 'Tipografía';
      campos = '<div class="field full"><label for="km-fam">Familia</label><input id="km-fam" value="' + esc((x && x.familia) || '') + '" placeholder="Ej.: Montserrat"><span class="hint">Si es de Google Fonts se ve sola. Si no, subí el archivo (.ttf, .otf, .woff).</span></div>' +
        '<div class="field full"><span class="lbl">Para qué se usa</span>' + radios('km-rol', ['', ...ROLES_TIPO], x && x.rol) + '</div>' +
        '<div class="field full"><span class="lbl">Peso</span>' + radios('km-peso', PESOS.map(p => p[1]), (PESOS.find(p => p[0] === ((x && x.peso) || '400')) || [])[1]) + '</div>' +
        '<div class="field full"><label for="km-file">Archivo de la tipografía' + (x && x.url ? ' (ya hay uno; subí otro para reemplazarlo)' : '') + '</label><input type="file" id="km-file" accept=".ttf,.otf,.woff,.woff2"></div>'; }
    else if (k === 'links') { titulo = nuevo ? 'Nuevo link' : 'Link';
      campos = '<div class="field full"><label for="km-n">Nombre</label><input id="km-n" value="' + esc((x && x.n) || '') + '" placeholder="Ej.: Manual de marca, Kit en Canva, Carpeta del Drive"></div>' +
        '<div class="field full"><label for="km-url">Link</label><input id="km-url" type="url" value="' + esc((x && x.url) || '') + '" placeholder="https://"></div>'; }
    else { titulo = k === 'logos' ? 'Logo' : 'Archivo';
      campos = '<div class="field full"><label for="km-n">Nombre</label><input id="km-n" value="' + esc((x && x.n) || '') + '" placeholder="' + (k === 'logos' ? 'Ej.: Principal, Isotipo, Negativo' : 'Ej.: Textura de fondo') + '"></div>'; }
    document.getElementById('panel').innerHTML = '<form id="kmform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(c.nombre) + ' · Kit de marca</span><h2 id="panel-title">' + titulo + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b">' + campos + '</div><div class="panel-f"><span>' + (nuevo ? '' : '<button type="button" class="btn ghost danger" data-act="kmBorrar">Borrar</button>') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary" id="kmsave">' + (nuevo ? 'Agregar' : 'Guardar') + '</button></span></div></form>';
    document.getElementById('panel').hidden = false; document.getElementById('scrim').hidden = false;
    setTimeout(() => { const f = document.querySelector('#kmform input:not([type=radio]):not([type=color])'); if (f && nuevo) f.focus(); }, 30);
  }
  function panelUso(c) {
    S.form = null; st.edit = { cid: c._id, k: 'uso' };
    document.getElementById('panel').innerHTML = '<form id="kmform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(c.nombre) + ' · Kit de marca</span><h2 id="panel-title">Cómo se usa</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><div class="field full"><label for="km-uso">Uso del logo y estilo visual</label><textarea id="km-uso" rows="8" placeholder="Ej.: Logo siempre sobre fondo liso, nunca deformado ni con sombra. Área de respeto: la altura de la “a”. Fotos con luz cálida y producto en primer plano.">' + esc((c.marca || {}).visual || '') + '</textarea><span class="hint">Mr. Piggy también lo tiene en cuenta cuando propone contenido.</span></div></div>' +
      '<div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary" id="kmsave">Guardar</button></span></div></form>';
    document.getElementById('panel').hidden = false; document.getElementById('scrim').hidden = false;
  }
  // Manual online: versión, textos que solo están en el manual, y publicarlo con un link.
  function panelManual(c) {
    const man = (c.marca || {}).manual || {};
    S.form = null; st.edit = { cid: c._id, k: 'manual' };
    const radio = (name, opts, val) => '<div class="seg km-seg km-seg2" role="radiogroup">' + opts.map(([v, l, d]) => '<label><input type="radio" name="' + name + '" value="' + v + '"' + (val === v ? ' checked' : '') + '><span><b>' + l + '</b>' + (d ? '<small>' + d + '</small>' : '') + '</span></label>').join('') + '</div>';
    document.getElementById('panel').innerHTML = '<form id="kmform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(c.nombre) + '</span><h2 id="panel-title">Manual online</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><p class="formnote full">Una página con el logo, los colores, las tipografías y las descargas de la marca, armada con el kit y la ficha. La ve cualquiera que tenga el link, sin entrar a nada.</p>' +
      '<div class="field full"><span class="lbl">Versión</span>' + radio('km-ver', [['completo', 'Manual completo', 'La marca la hicimos nosotros: esencia, logo con sus reglas, color, tipografía, imágenes, voz y descargas.'], ['simple', 'Guía simple', 'Con lo que nos pasó el cliente: logo, color, tipografía, estilo y descargas.']], man.version || 'completo') + '</div>' +
      '<div class="field full km-sc"><label for="km-intro">Esencia (abre el manual completo)</label><textarea id="km-intro" rows="4" placeholder="En dos o tres frases: qué es la marca, qué la mueve y cómo quiere que la recuerden.">' + esc(man.intro || '') + '</textarea></div>' +
      '<div class="field km-sc"><label for="km-resp">Área de respeto del logo</label><input id="km-resp" value="' + esc(man.respeto || '') + '" placeholder="Ej.: la altura de la “a” alrededor"></div>' +
      '<div class="field km-sc"><label for="km-min">Tamaño mínimo</label><input id="km-min" value="' + esc(man.minimo || '') + '" placeholder="Ej.: 24 px de alto / 10 mm"></div>' +
      '<div class="field full km-sc"><label for="km-no">Lo que no se hace con el logo (uno por renglón)</label><textarea id="km-no" rows="4" placeholder="No deformarlo\nNo cambiarle los colores\nNo ponerlo sobre fotos sin contraste\nNo agregarle sombras ni efectos">' + esc(man.no || '') + '</textarea></div>' +
      '<div class="field full"><span class="lbl">¿Se puede ver?</span>' + radio('km-pub', [['no', 'Sin publicar', 'Solo lo ves vos con “Ver el manual”.'], ['si', 'Publicado', 'Cualquiera con el link lo ve.']], man.publicado ? 'si' : 'no') + '</div>' +
      (man.slug ? '<p class="formnote full">Link: <b>' + esc(urlManual(man)) + '</b></p>' : '') + '</div>' +
      '<div class="panel-f"><span><button type="button" class="btn ghost" data-act="kmPrevia" data-id="' + esc(c._id) + '">' + ICON.ojo + 'Vista previa</button></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary" id="kmsave">Guardar</button></span></div></form>';
    document.getElementById('panel').hidden = false; document.getElementById('scrim').hidden = false;
  }
  const slugDe = n => String(n || 'marca').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) + '-' + Math.random().toString(36).slice(2, 7);
  // Vista previa adentro de la app (lo mismo que ve la gente con el link)
  function previa(c) {
    if (!document.getElementById('mm-css')) { const st2 = document.createElement('style'); st2.id = 'mm-css'; st2.textContent = MANUAL_CSS; document.head.appendChild(st2); }
    const d = { nombre: c.nombre, avatar: c.avatar || '', marca: c.marca || {} };
    cargarFuentesManual(kitDeTexto(d.marca));
    let o = document.getElementById('mm-prev'); if (!o) { o = document.createElement('div'); o.id = 'mm-prev'; document.body.appendChild(o); }
    o.innerHTML = '<div class="mm-prev-b"><span>Vista previa del ' + (((c.marca || {}).manual || {}).version === 'simple' ? 'la guía' : 'manual') + ' de ' + esc(c.nombre) + '</span><button class="btn sm" data-act="kmPreviaCerrar">Cerrar</button></div><div class="mm-prev-c">' + manualHTML(d) + '</div>';
    o.hidden = false; document.body.style.overflow = 'hidden';
  }
  async function guardarPanel() {
    const e = st.edit, c = e && cli(e.cid); if (!c) return;
    const kit = kitDe(c), arr = [...(kit[e.k] || [])], i = e.i ? arr.findIndex(y => y.id === e.i) : -1, x = i >= 0 ? { ...arr[i] } : { id: uid() };
    const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; }, r = n => (document.querySelector('input[name="' + n + '"]:checked') || {}).value || '';
    const b = document.getElementById('kmsave'); const listo = () => { if (b) { b.disabled = false; b.textContent = 'Guardar'; } };
    if (b) { b.disabled = true; b.textContent = 'Guardando…'; }
    try {
      if (e.k === 'uso') { await guardar(c, kit, { visual: v('km-uso') }); ctx.closeForm(); toast('Guardado'); return; }
      if (e.k === 'manual') {
        const prev = (c.marca || {}).manual || {}, pub = r('km-pub') === 'si';
        const man = { ...prev, version: r('km-ver') || 'completo', intro: v('km-intro'), respeto: v('km-resp'), minimo: v('km-min'), no: (document.getElementById('km-no') || {}).value || '', publicado: pub, slug: prev.slug || slugDe(c.nombre) };
        await guardar(c, kit, { manual: man }); ctx.closeForm();
        if (pub) { try { await navigator.clipboard.writeText(urlManual(man)); toast('Manual publicado. Copié el link.'); } catch (er) { toast('Manual publicado'); } } else toast('Guardado');
        return;
      }
      if (e.k === 'colores') { const h = normHex(v('km-hex')); if (!hexOk(h)) { toast('Poné el color como #RRGGBB'); listo(); return; } Object.assign(x, { hex: h, n: v('km-n'), rol: r('km-rol'), pantone: v('km-pms') }); }
      else if (e.k === 'tipos') {
        const f = (document.getElementById('km-file') || {}).files || [];
        if (!v('km-fam') && !f.length) { toast('Escribí la familia o subí el archivo'); listo(); return; }
        Object.assign(x, { familia: v('km-fam') || String(f[0].name).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), rol: r('km-rol'), peso: (PESOS.find(p => p[1] === r('km-peso')) || ['400'])[0] });
        if (f.length) { const old = x.path, up = await data.kitSubir(c._id, 'tipografias', f[0]); x.path = up.path; x.url = up.url; x.n = f[0].name; if (old) data.kitBorrar([old]); }
      }
      else if (e.k === 'links') { let u = v('km-url'); if (!u) { toast('Pegá el link'); listo(); return; } if (!/^https?:\/\//i.test(u)) u = 'https://' + u; Object.assign(x, { n: v('km-n') || u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0], url: u }); }
      else x.n = v('km-n') || x.n;
      if (i >= 0) arr[i] = x; else arr.push(x);
      await guardar(c, { ...kit, [e.k]: arr }); ctx.closeForm(); toast(i >= 0 ? 'Guardado' : 'Agregado');
    } catch (er) { toast(er.message); listo(); }
  }
  async function borrar() {
    const e = st.edit, c = e && cli(e.cid); if (!c) return;
    const kit = kitDe(c), x = (kit[e.k] || []).find(y => y.id === e.i); if (!x) return;
    if (ctx.confirmar && !await ctx.confirmar('Se borra «' + (x.n || x.familia || x.hex) + '» del kit de ' + c.nombre + '.', { titulo: '¿Borrar del kit?', ok: 'Borrar', tipo: 'peligro' })) return;
    try { await guardar(c, { ...kit, [e.k]: kit[e.k].filter(y => y.id !== e.i) }); if (x.path) data.kitBorrar([x.path]); ctx.closeForm(); toast('Borrado'); } catch (er) { toast(er.message); }
  }
  async function subir(c, k, files) {
    const kit = kitDe(c), nuevos = []; st.subiendo = k; render();
    for (const f of files) {
      if (f.size > 50 * 1024 * 1024) { toast(f.name + ' pesa más de 50 MB'); continue; }
      try { const up = await data.kitSubir(c._id, k, f); nuevos.push({ id: uid(), n: String(f.name).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), path: up.path, url: up.url, tipo: f.type || '', ...(k === 'logos' ? { fondo: 'claro' } : {}) }); }
      catch (er) { toast(er.message); break; }
    }
    st.subiendo = '';
    if (nuevos.length) { try { await guardar(c, { ...kit, [k]: [...kit[k], ...nuevos] }); toast(nuevos.length === 1 ? 'Subido' : nuevos.length + ' archivos subidos'); } catch (er) { toast(er.message); data.kitBorrar(nuevos.map(n => n.path)); } }
    else render();
  }

  const acts = {
    kmNuevo: t => { const c = cli(t.dataset.id); if (c) panel(c, t.dataset.k); },
    kmEditar: t => { const c = cli(t.dataset.id); if (c) panel(c, t.dataset.k, t.dataset.i); },
    kmUso: t => { const c = cli(t.dataset.id); if (c) panelUso(c); },
    kmManual: t => { const c = cli(t.dataset.id); if (c) panelManual(c); },
    kmPrevia: t => { const c = cli(t.dataset.id); if (c) previa(c); },
    kmPreviaCerrar: () => { const o = document.getElementById('mm-prev'); if (o) { o.hidden = true; o.innerHTML = ''; } document.body.style.overflow = ''; },
    kmBorrar: () => borrar(),
    kmCopiar: async t => { try { await navigator.clipboard.writeText(t.dataset.v); toast(t.dataset.v + ' copiado'); } catch (e) { toast(t.dataset.v); } },
    kmFondo: async t => { const c = cli(t.dataset.id); if (!c) return; const kit = kitDe(c); const logos = kit.logos.map(x => x.id === t.dataset.i ? { ...x, fondo: FONDOS[(FONDOS.indexOf(x.fondo || 'claro') + 1) % FONDOS.length] } : x); try { await guardar(c, { ...kit, logos }); } catch (e) { toast(e.message); } },
  };
  document.addEventListener('submit', e => { if (e.target.id === 'kmform') { e.preventDefault(); guardarPanel(); } });
  document.addEventListener('input', e => {
    const t = e.target; if (!t) return;
    if (t.id === 'km-pick') { const h = document.getElementById('km-hex'); if (h) h.value = t.value.toUpperCase(); }
    else if (t.id === 'km-hex') { const h = normHex(t.value), p = document.getElementById('km-pick'); if (p && hexOk(h)) p.value = h.toLowerCase(); }
  });
  document.addEventListener('change', e => {
    const t = e.target; if (!t || !t.dataset || !t.dataset.kitup) return;
    const c = cli(t.dataset.id), fs = [...(t.files || [])]; t.value = '';
    if (c && fs.length && !st.subiendo) subir(c, t.dataset.kitup, fs);
  });
  return { html, acts };
}
