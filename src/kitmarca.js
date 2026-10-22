// Kit de marca de cada cliente (lo visual, como el brand kit de Canva): logos, colores, tipografías, imágenes y links.
// Vive en clientes.marca.kit; los archivos van al bucket "marcas" (SQL 0044). Los colores y tipografías también se
// guardan como texto en la ficha (marca.colores / marca.tipografias) para que Mr. Piggy los tenga en cuenta.
import { ICON } from './iconos.js';
import { logoRed, REDES } from './redes-logos.js';
import { activarVisor } from './visor.js';
import { fondosAuto, fondoPara } from './fondo.js';
import { perfilRed, CEL_CSS } from './celular.js';

const uid = () => Math.random().toString(36).slice(2, 9);
const ROLES_COLOR = ['Principal', 'Secundario', 'Acento', 'Fondo', 'Texto'];
// Categorías de los archivos del kit (las aplicaciones de la marca)
export const CATS = [['fotos', 'Fotos'], ['iconos', 'Íconos'], ['papeleria', 'Papelería y documentos'], ['redes', 'Perfiles y portadas de redes'], ['videos', 'Videos'], ['plantillas', 'Plantillas'], ['texturas', 'Patrones y texturas'], ['graficos', 'Ilustraciones y stickers'], ['otros', 'Otros']];
// Redes: a qué red va cada perfil, portada o plantilla, y para qué se usa
export const REDES_KIT = ['instagram', 'facebook', 'linkedin', 'tiktok', 'youtube', 'x'];
export const redDe = x => x.red || (REDES_KIT.find(k => new RegExp(k === 'x' ? '\\b(twitter|x)\\b' : k, 'i').test(x.n || '')) || '');
export const usoDe = x => x.uso || (/perfil|avatar/i.test(x.n || '') ? 'perfil' : /portada|cover|banner|header|encabezado/i.test(x.n || '') ? 'portada' : /histori|story|reel/i.test(x.n || '') ? 'historia' : catDe(x) === 'plantillas' ? 'post' : '');
const USOS = [['perfil', 'Foto de perfil'], ['portada', 'Portada'], ['post', 'Post'], ['historia', 'Historia o reel']];
export const catDe = r => r.cat || (/^video\//.test(r.tipo || '') || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(r.url || '') ? 'videos' : /^image\//.test(r.tipo || '') || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(r.url || '') ? 'fotos' : 'otros');
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
// Cada logo o archivo puede venir en varios formatos (SVG, PNG, PDF y los editables: AI, PSD, INDD, Figma, Canva…).
// x.archivos = [{ id, url, path, tipo, nombre, peso, link }]; x.url/x.path/x.tipo es el que se usa de vista previa.
const EDIT = /^(AI|PSD|INDD|IDML|FIG|FIGMA|CANVA|EPS|SKETCH|XD|DOCX?|PPTX?|KEY|AEP|PRPROJ|CDR|AFDESIGN|ZIP)$/;
const hostFmt = u => /canva\./i.test(u) ? 'CANVA' : /figma\./i.test(u) ? 'FIGMA' : /drive\.google|docs\.google/i.test(u) ? 'DRIVE' : 'LINK';
export const fmtDe = f => f.link ? hostFmt(f.url) : ext(f.nombre) || ext(f.url) || String((f.tipo || '').split('/')[1] || 'archivo').toUpperCase().slice(0, 5);
export function formatos(x) {
  const fs = x.archivos && x.archivos.length ? x.archivos : x.url ? [{ id: 'p', url: x.url, path: x.path, tipo: x.tipo }] : [];
  return fs.map(f => { const fmt = fmtDe(f); return { ...f, fmt, ed: EDIT.test(fmt) || !!f.link }; }).sort((a, b) => a.ed - b.ed);
}
export const bajarFmt = (x, f) => f.link ? f.url : bajar(f.url, String(x.n || 'archivo').replace(/\s*\(ejemplo\)/i, '') + '.' + f.fmt.toLowerCase());
const pesoTxt = n => !n ? '' : n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + ' KB' : (n / 1024 / 1024).toFixed(1).replace('.', ',') + ' MB';
const PREF = ['SVG', 'PNG', 'WEBP', 'JPG', 'JPEG', 'GIF', 'MP4', 'MOV', 'WEBM'];
const previaDe = fs => [...fs].filter(f => !f.link && (esImg(f.tipo, f.nombre || f.url) || /^video\//.test(f.tipo || ''))).sort((a, b) => (PREF.indexOf(fmtDe(a)) + 99) % 99 - (PREF.indexOf(fmtDe(b)) + 99) % 99)[0] || fs.find(f => !f.link) || fs[0];
// Google Fonts: la lista (familia, categoría, pesos) se baja una sola vez cuando se abre el buscador.
let GF = null; const gfLista = () => GF || (GF = fetch('/google-fonts.json').then(r => r.json()).catch(() => []));
const GF_POP = ['Inter', 'Montserrat', 'Poppins', 'Roboto', 'Open Sans', 'Lato', 'DM Sans', 'Archivo', 'Work Sans', 'Manrope', 'Plus Jakarta Sans', 'Outfit', 'Space Grotesk', 'Raleway', 'Nunito', 'Playfair Display', 'Lora', 'Fraunces', 'Cormorant Garamond', 'Libre Baskerville', 'Bebas Neue', 'Oswald', 'Archivo Black', 'Syne'];
const GF_CATS = [['', 'Todas'], ['sans', 'Sans'], ['serif', 'Serif'], ['display', 'Display'], ['hand', 'Manuscritas'], ['mono', 'Mono']];
const sinTilde = t => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const lindo = nm => String(nm).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();

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

  // Dos versiones del manual: la guía (pública, para cualquiera) y el manual completo (para el cliente: lo ve en su portal
  // y tiene su propio link para compartir si quiere). Los manuales viejos con version 'completo' cuentan como completo.
  const urlManual = man => location.origin + '/m/' + man.slug;
  const urlCompleto = man => location.origin + '/m/' + man.slug_c;
  const conCompleto = man => man.completo !== undefined ? !!man.completo : man.version !== 'simple' && !!(man.publicado || man.intro);
  function manualEstado(c) {
    const man = (c.marca || {}).manual || {}, fila = (t, u) => '<div class="km-pub"><span class="km-pub-d"></span><span>' + t + ': <a href="' + esc(u) + '" target="_blank" rel="noopener">' + esc(u.replace(/^https?:\/\//, '')) + '</a></span><button class="btn ghost sm" data-act="kmCopiar" data-v="' + esc(u) + '">' + ICON.copiar + 'Copiar link</button></div>';
    return (man.publicado && man.slug ? fila('Guía de marca pública', urlManual(man)) : '') + (conCompleto(man) && man.slug_c ? fila('Manual completo (para el cliente)', urlCompleto(man)) : '');
  }
  function html(c) {
    const kit = kitDe(c), can = isStaff(), id = esc(c._id), m = c.marca || {};
    cargarFuentes(kit);
    const sube = (k, txt, acc) => can ? '<label class="btn sm km-add' + (st.subiendo === k ? ' disabled' : '') + '">' + ICON.sumar + (st.subiendo === k ? 'Subiendo…' : txt) + '<input type="file" hidden multiple accept="' + acc + '" data-kitup="' + k + '" data-id="' + id + '"></label>' : '';
    const btn = (act, txt, extra) => can ? '<button class="btn sm km-add" data-act="' + act + '" data-id="' + id + '"' + (extra || '') + '>' + ICON.sumar + txt + '</button>' : '';
    const acc = (k, x, dl) => '<span class="km-acc">' + (dl ? '<a class="btn ghost sm" href="' + esc(bajar(x.url, x.n)) + '" title="Descargar" aria-label="Descargar">' + ICON.descargar + '</a>' : '') +
      (can ? '<button class="btn ghost sm" data-act="kmEditar" data-k="' + k + '" data-i="' + esc(x.id) + '" data-id="' + id + '" title="Editar" aria-label="Editar">' + ICON.editar + '</button>' : '') + '</span>';
    const sec = (t, sub, add, body) => '<div class="km-s"><div class="km-sh"><div class="km-sht"><h3>' + t + '</h3>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + add + '</div>' + body + '</div>';
    // Los formatos de cada pieza: cada chip baja (o abre) ese archivo. Los editables van con borde.
    const chips = x => '<span class="km-fxs">' + formatos(x).map(f => '<a class="km-fx' + (f.ed ? ' ed' : '') + '" href="' + esc(bajarFmt(x, f)) + '"' + (f.link ? ' target="_blank" rel="noopener"' : '') + ' title="' + (f.link ? 'Abrir en ' : 'Descargar ') + esc(f.fmt) + (f.ed ? ' · editable' : '') + '">' + esc(f.fmt) + '</a>').join('') + '</span>';
    const editar = (k, x) => can ? '<button class="km-ed" data-act="kmEditar" data-k="' + k + '" data-i="' + esc(x.id) + '" data-id="' + id + '" title="Editar y sumar formatos" aria-label="Editar ' + esc(x.n) + '">' + ICON.editar + '</button>' : '';
    const media = x => /^video\//.test(x.tipo || '') || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(x.url || '') ? '<video src="' + esc(x.url) + '" muted playsinline preload="metadata"></video>' : esImg(x.tipo, x.url) ? '<img src="' + esc(x.url) + '" alt="' + esc(x.n) + '" loading="lazy">' : '<span class="km-ext">' + esc((formatos(x)[0] || {}).fmt || 'ARCHIVO') + '</span>';
    const pie = x => '<figcaption><b title="' + esc(x.n) + '">' + esc(x.n) + '</b>' + chips(x) + '</figcaption>';
    const KIND = { iconos: 'icono', fotos: 'foto', texturas: 'foto', videos: 'foto' };
    const verGrande = (x, k) => (esImg(x.tipo, x.url) || /^video\//.test(x.tipo || '')) ? ' data-visor="' + esc(x.url) + '" data-n="' + esc(x.n) + '" data-vk="' + (k || KIND[catDe(x)] || 'doc') + '"' : '';
    const autoBg = x => esImg(x.tipo, x.url) && !['fotos', 'texturas'].includes(catDe(x)) ? ' data-autobg="' + esc(x.url) + '"' : '';
    setTimeout(() => fondosAuto(document), 0);
    const redB = x => { if (!['redes', 'plantillas'].includes(catDe(x))) return ''; const r = redDe(x), u = usoDe(x); return '<span class="km-redb">' + (r ? logoRed(r, 14) : '<i>Todas</i>') + (u ? '<i>' + esc((USOS.find(y => y[0] === u) || [])[1] || '') + '</i>' : '') + '</span>'; };
    const vacio = t => '<p class="km-v">' + t + '</p>';

    const logos = kit.logos.length ? '<div class="km-logos" data-visor-grupo>' + kit.logos.map(x => '<figure class="km-t km-logo"><div class="km-lf f-' + esc(x.fondo || 'claro') + '"' + (x.fondo === 'marca' && kit.colores[0] ? ' style="--km:' + esc(kit.colores[0].hex) + '"' : '') + verGrande(x, 'logo') + '>' + media(x) +
      (can ? '<button class="km-fbtn" data-act="kmFondo" data-i="' + esc(x.id) + '" data-id="' + id + '" title="Cambiar el fondo" aria-label="Cambiar el fondo">◐</button>' : '') + editar('logos', x) + '</div>' + pie(x) + '</figure>').join('') + '</div>' : vacio('Subí el logo principal y sus versiones: horizontal, vertical, isotipo, negativo, monocromo. Si subís el mismo logo en SVG, PNG y AI juntos, queda uno solo con sus tres formatos.');

    const cols = kit.colores.length ? '<div class="km-cols">' + kit.colores.map(x => { const h = hexOk(x.hex) ? x.hex : '#999999', [r, g, b] = rgb(h);
      return '<div class="km-col"><button class="km-sw' + (claro(h) ? ' cl' : '') + '" style="background:' + esc(h) + '" data-act="kmCopiar" data-v="' + esc(h) + '" title="Copiar ' + esc(h) + '">' + (x.rol ? '<i>' + esc(x.rol) + '</i>' : '') + '<span>Copiar</span></button>' +
        '<div class="km-cap"><span><b>' + esc(x.n || h) + '</b><small>' + esc(h) + ' · RGB ' + r + ' ' + g + ' ' + b + '</small></span>' + acc('colores', x) + '</div></div>'; }).join('') + '</div>' : vacio('Cargá la paleta: el color principal, los secundarios, el de fondo y el de texto.');

    const tipos = kit.tipos.length ? '<div class="km-tipos">' + kit.tipos.map(x => '<div class="km-tipo"><span class="km-rol">' + esc(x.rol || 'Tipografía') + '</span>' +
      '<div class="km-aa" style="font-family:' + esc(fam(x)) + ';font-weight:' + esc(x.peso || '400') + '">Aa</div>' +
      '<p class="km-pan" style="font-family:' + esc(fam(x)) + ';font-weight:' + esc(x.peso || '400') + '">' + esc(c.nombre) + ' · ABCDEFGHIJKLMNÑ abcdefghijklmnñ 0123456789</p>' +
      '<div class="km-cap"><span><b>' + esc(x.familia) + '</b><small>' + esc((PESOS.find(p => p[0] === x.peso) || [])[1] || 'Regular') + (x.url ? ' · archivo cargado' : ' · Google Fonts') + '</small></span>' + acc('tipos', x, false) + '</div>' +
      (formatos(x).length ? chips(x) : '<span class="km-fxs"><a class="km-fx ed" href="https://fonts.google.com/specimen/' + esc(String(x.familia || '').replace(/ /g, '+')) + '" target="_blank" rel="noopener" title="Ver y bajar de Google Fonts">GOOGLE FONTS ↗</a></span>') + '</div>').join('') + '</div>' : vacio('Sumá las tipografías de títulos y de textos. Si no es de Google Fonts, subí el archivo para verla y descargarla.');

    // Aplicaciones y archivos, agrupados por tipo (fotos, íconos, papelería, redes, videos…); cada tipo con su botón para subir.
    const ACC = {}; // cualquier archivo: también los editables (AI, PSD, INDD, FIG…)
    const subeCat = (k, txt, cls) => can ? '<label class="' + cls + (st.subiendo === 'recursos:' + k ? ' disabled' : '') + '">' + ICON.sumar + esc(st.subiendo === 'recursos:' + k ? 'Subiendo…' : txt) + '<input type="file" hidden multiple' + (ACC[k] ? ' accept="' + ACC[k] + '"' : '') + ' data-kitup="recursos" data-cat="' + k + '" data-id="' + id + '"></label>' : '';
    const recC = kit.recursos.map(x => ({ ...x, cat: catDe(x) }));
    const recursosG = CATS.map(([k, l]) => [k, l, recC.filter(x => x.cat === k)]).filter(g => g[2].length);
    const grilla = (k, xs) => '<div class="km-recs c-' + k + '" data-visor-grupo>' + xs.map(x => '<figure class="km-t km-rec"><div class="km-rf"' + verGrande(x) + autoBg(x) + '>' + media(x) + redB(x) + editar('recursos', x) + '</div>' + pie(x) + '</figure>').join('') + '</div>';
    // Perfiles, portadas y plantillas: se eligen por red (con su logo) y al lado se ve cómo queda el perfil en esa red.
    const redesEnKit = () => { const rs = recC.filter(x => x.cat === 'redes' || x.cat === 'plantillas'), marcadas = [...new Set(rs.map(redDe).filter(Boolean))];
      return { rs, redes: REDES_KIT.filter(r => marcadas.includes(r) || (rs.some(x => !redDe(x)) && ['instagram', 'facebook'].includes(r))) }; };
    const redesBloque = (k, xs) => {
      const { rs, redes } = redesEnKit(); if (!redes.length) return grilla(k, xs);
      const sel = redes.includes(st.red) ? st.red : st.red === '' ? '' : redes[0];
      const vis = sel ? xs.filter(x => !redDe(x) || redDe(x) === sel) : xs;
      const chips = '<div class="km-redsel" role="group" aria-label="Ver por red">' + [['', 'Todas']].concat(redes.map(r => [r, (REDES.find(y => y[0] === r) || [r, r])[1]])).map(([r, l]) => '<button type="button" data-act="kmRed" data-r="' + r + '"' + (r === sel ? ' class="on" aria-pressed="true"' : ' aria-pressed="false"') + '>' + (r ? logoRed(r, 15) : '') + esc(l) + '</button>').join('') + '</div>';
      if (k !== 'redes' || !sel) return chips + grilla(k, vis);
      const de = uso => rs.filter(x => (redDe(x) === sel || !redDe(x)) && usoDe(x) === uso && esImg(x.tipo, x.url)).sort((a, b) => (redDe(b) === sel) - (redDe(a) === sel));
      const iso = kit.logos.find(l => /iso|s[ií]mbolo/i.test(l.n || '')) || kit.logos[0];
      const perfil = (de('perfil')[0] || iso || {}).url, portada = (de('portada')[0] || {}).url;
      const posts = de('post').map(x => x.url).concat(recC.filter(x => x.cat === 'fotos' && esImg(x.tipo, x.url)).map(x => x.url)).slice(0, 6);
      return chips + '<div class="km-red-w">' + grilla(k, vis) + '<div class="km-red-p"><span class="km-red-pt">Así se ve en ' + esc((REDES.find(y => y[0] === sel) || [sel, sel])[1]) + '</span>' + perfilRed({ nombre: c.nombre, avatar: perfil }, sel, { portada, posts, historias: de('historia').map(x => x.url), bio: (m.rubro || '').slice(0, 120) }) + '</div></div>';
    };
    const faltan = CATS.filter(([k]) => !recursosG.some(g => g[0] === k));
    const recursos = (recursosG.length ? recursosG.map(([k, l, xs]) => '<div class="km-grp"><div class="km-gh"><h4>' + esc(l) + '</h4><span class="km-n">' + xs.length + '</span><span class="km-sp"></span>' + subeCat(k, 'Subir', 'btn ghost sm km-up') + '</div>' +
        (k === 'redes' || k === 'plantillas' ? redesBloque(k, xs) : grilla(k, xs)) + '</div>').join('') : vacio('Subí cada cosa en su tipo. Si tenés la misma pieza en varios formatos (por ejemplo tarjeta.pdf, tarjeta.png y tarjeta.ai), subilos juntos y quedan como una sola con sus formatos.')) +
      (can && faltan.length ? '<div class="km-mas"><span>' + (recursosG.length ? 'Sumar otro tipo' : 'Subir') + '</span>' + faltan.map(([k, l]) => subeCat(k, l, 'km-cat-b')).join('') + '</div>' : '');

    const links = kit.links.length ? '<div class="km-links">' + kit.links.map(x => '<span class="km-link"><a class="btn sm" href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.n) + ' ' + ICON.externo + '</a>' + (can ? '<button class="btn ghost sm" data-act="kmEditar" data-k="links" data-i="' + esc(x.id) + '" data-id="' + id + '" aria-label="Editar">' + ICON.editar + '</button>' : '') + '</span>').join('') + '</div>' : vacio('El manual, la carpeta del Drive, el kit de Canva o el archivo de Figma.');

    const uso = m.visual ? '<p class="km-uso">' + esc(m.visual) + '</p>' : vacio('Cómo se usa el logo, qué fondos van, cómo son las fotos…');

    return '<section class="sheet sx km"><div class="sx-h"><span class="sx-i">' + ICON.marca + '</span><h2>Kit de marca</h2>' + (kit.demo ? '<span class="km-demo" title="Logos, colores e imágenes de ejemplo para ver cómo queda el manual">Contenido de ejemplo</span>' : '') +
      (can ? '<div class="sx-der toolbar"><label class="btn sm" title="Mr. Piggy lee el manual de marca y completa colores, tipografías y la ficha">' + ICON.ia + 'Completar desde el manual<input type="file" hidden multiple accept=".pdf,.docx,.txt,.md,image/png,image/jpeg,image/webp" data-fmdoc="' + id + '"></label>' +
        '<button class="btn sm" data-act="kmPrevia" data-id="' + id + '">' + ICON.ojo + 'Ver como cliente</button><button class="btn sm primary" data-act="kmManual" data-id="' + id + '">' + ICON.compartir + 'Manual online</button></div>' : '') + '</div>' +
      manualEstado(c) +
      sec('Logos', 'Versiones (principal, vertical, isotipo, negativo…) y sus formatos', sube('logos', 'Subir logos', ''), logos) +
      sec('Colores', 'Tocá un color para copiar el código', btn('kmNuevo', 'Color', ' data-k="colores"'), cols) +
      sec('Tipografías', '', btn('kmNuevo', 'Tipografía', ' data-k="tipos"'), tipos) +
      sec('Aplicaciones y archivos', 'Cada pieza con todos sus formatos: para usar, para imprimir y los editables', '', recursos) +
      sec('Links', '', btn('kmNuevo', 'Link', ' data-k="links"'), links) +
      sec('Cómo se usa', '', can ? '<button class="btn sm km-add" data-act="kmUso" data-id="' + id + '">' + ICON.editar + (m.visual ? 'Editar' : 'Escribir') + '</button>' : '', uso) +
      '</section>';
  }

  // Panel para cargar o editar un color, una tipografía, un link o el nombre de un logo o archivo.
  function panel(c, k, i) {
    const kit = kitDe(c), x = i ? (kit[k] || []).find(y => y.id === i) : null, nuevo = !x;
    S.form = null; st.edit = { cid: c._id, k, i };
    const radios = (name, opts, val) => '<div class="seg km-seg" role="radiogroup">' + opts.map(o => '<label><input type="radio" name="' + name + '" value="' + esc(o) + '"' + ((val || '') === o ? ' checked' : '') + '><span>' + esc(o || 'Sin rol') + '</span></label>').join('') + '</div>';
    const radiosV = (name, opts, val, ic) => '<div class="seg km-seg" role="radiogroup">' + opts.map(([v, l]) => '<label><input type="radio" name="' + name + '" value="' + esc(v) + '"' + ((val || '') === v ? ' checked' : '') + '><span>' + (ic ? ic(v) : '') + esc(l) + '</span></label>').join('') + '</div>';
    const fmtCampo = (x, lbl) => {
      const fs = x ? formatos(x) : [], prev = x && (fs.find(f => f.url === x.url) || {}).id;
      const fila = f => '<div class="km-fr"><span class="km-fx' + (f.ed ? ' ed' : '') + '">' + esc(f.fmt) + '</span><span class="km-fn"><b>' + esc(f.link ? f.url.replace(/^https?:\/\/(www\.)?/, '') : f.nombre || (x.n + '.' + f.fmt.toLowerCase())) + '</b><small>' + [f.ed ? 'Editable' : f.fmt === 'PDF' ? 'Para imprimir' : 'Para usar', pesoTxt(f.peso)].filter(Boolean).join(' · ') + '</small></span>' +
        (!f.link && (esImg(f.tipo, f.nombre || f.url) || /^video\//.test(f.tipo || '')) && fs.length > 1 ? '<label class="km-pv" title="Usar de vista previa"><input type="radio" name="km-prev" value="' + esc(f.id) + '"' + (f.id === prev ? ' checked' : '') + '><span>Vista previa</span></label>' : '') +
        '<a class="btn ghost sm" href="' + esc(bajarFmt(x, f)) + '"' + (f.link ? ' target="_blank" rel="noopener"' : '') + ' aria-label="' + (f.link ? 'Abrir' : 'Descargar') + '">' + (f.link ? ICON.externo : ICON.descargar) + '</a>' +
        (fs.length > 1 ? '<button type="button" class="btn ghost sm" data-act="kmFmtQuitar" data-f="' + esc(f.id) + '" aria-label="Quitar este formato" title="Quitar este formato">✕</button>' : '') + '</div>';
      return '<div class="field full"><span class="lbl">' + lbl + ' <span class="muted">' + fs.length + '</span></span><div class="km-fl">' + fs.map(fila).join('') + '</div>' +
        '<div class="km-fadd"><label class="btn sm' + (st.subiendo === 'fmt' ? ' disabled' : '') + '">' + ICON.sumar + (st.subiendo === 'fmt' ? 'Subiendo…' : 'Sumar archivos') + '<input type="file" hidden multiple data-kmfmt="1"></label>' +
        '<span class="km-flink"><input id="km-flink" type="url" placeholder="Link de Canva, Figma o Drive"><button type="button" class="btn sm" data-act="kmFmtLink">Agregar</button></span></div>' +
        '<span class="hint">' + (k === 'tipos' ? 'Los archivos de la familia (.ttf, .otf, .woff o un .zip). ' : 'Para usar: SVG o PNG. Para imprimir: PDF. Editables: AI, PSD, INDD, Figma o Canva. ') + 'Se guardan apenas los subís.</span></div>';
    };
    let campos = '', titulo = '';
    if (k === 'colores') { const h = x && hexOk(x.hex) ? x.hex : '#FC4855'; titulo = nuevo ? 'Nuevo color' : 'Color';
      campos = '<div class="field full"><label for="km-hex">Color</label><div class="km-hexr"><input type="color" id="km-pick" value="' + esc(h.toLowerCase()) + '" aria-label="Elegir color"><input id="km-hex" value="' + esc(h) + '" placeholder="#FC4855" maxlength="7"></div></div>' +
        '<div class="field full"><label for="km-n">Nombre</label><input id="km-n" value="' + esc((x && x.n) || '') + '" placeholder="Ej.: Rojo burga"></div>' +
        '<div class="field full"><span class="lbl">Para qué se usa</span>' + radios('km-rol', ['', ...ROLES_COLOR], x && x.rol) + '</div>' +
        '<div class="field full"><label for="km-pms">Pantone (opcional)</label><input id="km-pms" value="' + esc((x && x.pantone) || '') + '" placeholder="Ej.: 185 C"><span class="hint">HEX, RGB y CMYK se calculan solos.</span></div>'; }
    else if (k === 'tipos') { titulo = nuevo ? 'Nueva tipografía' : 'Tipografía';
      campos = '<div class="field full km-gfw"><label for="km-fam">Familia</label><input id="km-fam" autocomplete="off" value="' + esc((x && x.familia) || '') + '" placeholder="Buscá en Google Fonts: Montserrat, Inter, Playfair…">' +
        '<div class="km-gf-cats" role="group" aria-label="Estilo">' + GF_CATS.map(([v, l], i) => '<button type="button" data-act="kmGfCat" data-v="' + v + '"' + (i === 0 ? ' class="on"' : '') + '>' + l + '</button>').join('') + '</div><div id="km-gf" class="km-gf" role="listbox" aria-label="Fuentes de Google Fonts"></div>' +
        '<span class="hint">Elegila de Google Fonts y se carga sola. Si no está ahí, escribí el nombre y subí los archivos.</span></div>' +
        '<div class="field full"><span class="lbl">Para qué se usa</span>' + radios('km-rol', ['', ...ROLES_TIPO], x && x.rol) + '</div>' +
        '<div class="field full"><span class="lbl">Peso</span>' + radios('km-peso', PESOS.map(p => p[1]), (PESOS.find(p => p[0] === ((x && x.peso) || '400')) || [])[1]) + '</div>' +
        (x && formatos(x).length ? fmtCampo(x, 'Archivos de la tipografía') : '<div class="field full"><label for="km-file">Archivos de la tipografía (opcional)</label><input type="file" id="km-file" multiple accept=".ttf,.otf,.woff,.woff2,.zip"><span class="hint">.ttf, .otf, .woff o el .zip con toda la familia. Así se puede descargar desde el manual.</span></div>'); }
    else if (k === 'links') { titulo = nuevo ? 'Nuevo link' : 'Link';
      campos = '<div class="field full"><label for="km-n">Nombre</label><input id="km-n" value="' + esc((x && x.n) || '') + '" placeholder="Ej.: Manual de marca, Kit en Canva, Carpeta del Drive"></div>' +
        '<div class="field full"><label for="km-url">Link</label><input id="km-url" type="url" value="' + esc((x && x.url) || '') + '" placeholder="https://"></div>'; }
    else { titulo = k === 'logos' ? 'Logo' : 'Archivo';
      campos = '<div class="field full"><label for="km-n">Nombre</label><input id="km-n" value="' + esc((x && x.n) || '') + '" placeholder="' + (k === 'logos' ? 'Ej.: Principal, Horizontal, Vertical, Isotipo, Negativo' : 'Ej.: Tarjeta personal, Portada de Facebook') + '"></div>' +
        (k === 'recursos' ? '<div class="field full"><span class="lbl">Tipo</span>' + radios('km-cat', CATS.map(c => c[1]), (CATS.find(c => c[0] === catDe(x || {})) || CATS[0])[1]) + '</div>' : '') +
        (k === 'recursos' && x && ['redes', 'plantillas'].includes(catDe(x)) ? '<div class="field full"><span class="lbl">Red</span>' + radiosV('km-red', [['', 'Todas'], ...REDES_KIT.map(r => [r, (REDES.find(y => y[0] === r) || [r, r])[1]])], redDe(x), r => r ? logoRed(r, 15) : '') + '</div>' +
          '<div class="field full"><span class="lbl">Se usa como</span>' + radiosV('km-uso', [['', 'Sin definir'], ...USOS], usoDe(x)) + '</div>' : '') +
        (x ? fmtCampo(x, 'Formatos') : ''); }
    document.getElementById('panel').innerHTML = '<form id="kmform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(c.nombre) + ' · Kit de marca</span><h2 id="panel-title">' + titulo + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b">' + campos + '</div><div class="panel-f"><span>' + (nuevo ? '' : '<button type="button" class="btn ghost" data-act="kmBorrar">' + ICON.borrar + 'Borrar</button>') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary" id="kmsave">' + (nuevo ? 'Agregar' : 'Guardar') + '</button></span></div></form>';
    document.getElementById('panel').hidden = false; document.getElementById('scrim').hidden = false;
    setTimeout(() => { const f = document.querySelector('#kmform input:not([type=radio]):not([type=color])'); if (f && nuevo) f.focus(); }, 30);
    if (k === 'tipos') { st.gfCat = ''; gfBuscar().then(async () => { st.gfLista = await gfLista(); if (x && x.familia) gfPesos(x.familia); }); }
  }
  function panelUso(c) {
    S.form = null; st.edit = { cid: c._id, k: 'uso' };
    document.getElementById('panel').innerHTML = '<form id="kmform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(c.nombre) + ' · Kit de marca</span><h2 id="panel-title">Cómo se usa</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><div class="field full"><label for="km-uso">Uso del logo y estilo visual</label><textarea id="km-uso" rows="8" placeholder="Ej.: Logo siempre sobre fondo liso, nunca deformado ni con sombra. Área de respeto: la altura de la “a”. Fotos con luz cálida y producto en primer plano.">' + esc((c.marca || {}).visual || '') + '</textarea><span class="hint">Mr. Piggy también lo tiene en cuenta cuando propone contenido.</span></div></div>' +
      '<div class="panel-f"><span></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary" id="kmsave">Guardar</button></span></div></form>';
    document.getElementById('panel').hidden = false; document.getElementById('scrim').hidden = false;
  }
  // Manual online: versión, textos que solo están en el manual, y publicarlo con un link.
  const ESTRATEGIA = [
    ['concepto', 'Concepto', 'La idea que ordena todo, en pocas palabras. Ej.: Very cordobés', 2],
    ['punto', 'Punto de partida', 'De dónde viene la marca: su origen y qué faltaba ordenar.'],
    ['proposito', 'Propósito', 'Para qué existe, más allá de lo que vende.'],
    ['posicionamiento', 'Posicionamiento', 'Dónde se para frente a las otras opciones.'],
    ['promesa', 'La promesa', 'Lo que la gente puede esperar siempre.', 2],
    ['territorio', 'Territorio', 'El mundo del que habla y en el que se mueve.'],
    ['publico', 'Para quién', 'Quiénes son, qué buscan, qué preguntan antes de comprar.'],
    ['personalidad', 'Personalidad', 'Si la marca fuera una persona, ¿cómo sería?'],
    ['rasgos', 'Rasgos (uno por renglón: Nombre: descripción)', 'Cercana: habla como habla la gente.\nConfiable: lo de ayer y lo de mañana responden al mismo criterio.', 4],
    ['manifiesto', 'Manifiesto', 'El texto que la define, con su tono.', 6],
  ];
  function panelManual(c) {
    const man = (c.marca || {}).manual || {};
    S.form = null; st.edit = { cid: c._id, k: 'manual' };
    const radio = (name, opts, val) => '<div class="seg km-seg km-seg2" role="radiogroup">' + opts.map(([v, l, d]) => '<label><input type="radio" name="' + name + '" value="' + v + '"' + (val === v ? ' checked' : '') + '><span><b>' + l + '</b>' + (d ? '<small>' + d + '</small>' : '') + '</span></label>').join('') + '</div>';
    document.getElementById('panel').innerHTML = '<form id="kmform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(c.nombre) + '</span><h2 id="panel-title">Manual online</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b"><p class="formnote full">Dos versiones armadas con el kit y la ficha. La <b>guía</b> es pública: logo, color, tipografía, aplicaciones y descargas, para cualquiera (imprentas, proveedores, medios). El <b>manual completo</b> suma la estrategia y la voz: lo ve el cliente en su portal y tiene su propio link, por si lo quiere compartir.</p>' +
      '<div class="field full"><span class="lbl">Guía de marca (pública)</span>' + radio('km-pub', [['no', 'Sin publicar', 'Solo la ves vos con “Ver”.'], ['si', 'Publicada', 'Cualquiera con el link la ve, sin entrar a nada.']], man.publicado ? 'si' : 'no') + (man.slug ? '<span class="hint">' + esc(urlManual(man)) + '</span>' : '') + '</div>' +
      '<div class="field full"><span class="lbl">Manual completo (para el cliente)</span>' + radio('km-comp', [['no', 'No', 'La marca no la hicimos nosotros: solo la guía.'], ['si', 'Sí', 'Lo ve en su portal, en Tu marca, con su link para compartir.']], conCompleto(man) ? 'si' : 'no') + (man.slug_c ? '<span class="hint">' + esc(urlCompleto(man)) + '</span>' : '') + '</div>' +
      '<div class="field full km-est"><h3 class="km-ph">Estrategia <span class="muted">va al principio del manual completo</span></h3></div>' +
      '<div class="field full km-sc"><label for="km-intro">Esencia en dos o tres frases (abre la portada)</label><textarea id="km-intro" rows="4" placeholder="En dos o tres frases: qué es la marca, qué la mueve y cómo quiere que la recuerden.">' + esc(man.intro || '') + '</textarea></div>' +
      ESTRATEGIA.map(([k, l, ph, rows]) => '<div class="field full km-est"><label for="km-e-' + k + '">' + l + '</label><textarea id="km-e-' + k + '" rows="' + (rows || 3) + '" placeholder="' + esc(ph) + '">' + esc(man[k] || '') + '</textarea></div>').join('') +
      '<div class="field full"><h3 class="km-ph">Logo</h3></div>' +
      '<div class="field km-sc"><label for="km-resp">Área de respeto del logo</label><input id="km-resp" value="' + esc(man.respeto || '') + '" placeholder="Ej.: la altura de la “a” alrededor"></div>' +
      '<div class="field km-sc"><label for="km-min">Tamaño mínimo</label><input id="km-min" value="' + esc(man.minimo || '') + '" placeholder="Ej.: 24 px de alto / 10 mm"></div>' +
      '<div class="field full km-sc"><label for="km-no">Lo que no se hace con el logo (uno por renglón)</label><textarea id="km-no" rows="4" placeholder="No deformarlo\nNo cambiarle los colores\nNo ponerlo sobre fotos sin contraste\nNo agregarle sombras ni efectos">' + esc(man.no || '') + '</textarea></div>' +
      '</div>' +
      '<div class="panel-f"><span style="display:flex;gap:4px"><button type="button" class="btn ghost" data-act="kmPrevia" data-v="simple" data-id="' + esc(c._id) + '">' + ICON.ojo + 'Ver guía</button><button type="button" class="btn ghost" data-act="kmPrevia" data-v="completo" data-id="' + esc(c._id) + '">' + ICON.ojo + 'Ver completo</button></span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary" id="kmsave">Guardar</button></span></div></form>';
    document.getElementById('panel').hidden = false; document.getElementById('scrim').hidden = false;
  }
  const slugDe = n => String(n || 'marca').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) + '-' + Math.random().toString(36).slice(2, 7);
  // Ver como cliente: se abre el manual en otra pestaña, igual que lo ve la gente. Si todavía no está publicado,
  // la pestaña lee los datos que deja la app en este navegador (/m/previa) y avisa que es una vista previa.
  function verComoCliente(c, ver) {
    const man = (c.marca || {}).manual || {}, v = ver || (conCompleto(man) ? 'completo' : 'simple');
    if (v === 'simple' && man.publicado && man.slug) { window.open(urlManual(man), '_blank', 'noopener'); return; }
    if (v === 'completo' && conCompleto(man) && man.slug_c) { window.open(urlCompleto(man), '_blank', 'noopener'); return; }
    try { localStorage.setItem('mm-previa', JSON.stringify({ nombre: c.nombre, avatar: c.avatar || '', marca: c.marca || {}, version: v })); } catch (e) { toast('No se pudo abrir la vista previa en este navegador'); return; }
    window.open('/m/previa', '_blank');
  }
  async function guardarPanel() {
    const e = st.edit, c = e && cli(e.cid); if (!c) return;
    const kit = kitDe(c), arr = Array.isArray(kit[e.k]) ? [...kit[e.k]] : [], i = e.i ? arr.findIndex(y => y.id === e.i) : -1, x = i >= 0 ? { ...arr[i] } : { id: uid() };
    const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; }, r = n => (document.querySelector('input[name="' + n + '"]:checked') || {}).value || '';
    const b = document.getElementById('kmsave'); const listo = () => { if (b) { b.disabled = false; b.textContent = 'Guardar'; } };
    if (b) { b.disabled = true; b.textContent = 'Guardando…'; }
    try {
      if (e.k === 'uso') { await guardar(c, kit, { visual: v('km-uso') }); ctx.closeForm(); toast('Guardado'); return; }
      if (e.k === 'manual') {
        const prev = (c.marca || {}).manual || {}, pub = r('km-pub') === 'si', comp = r('km-comp') === 'si';
        const man = { ...prev, ...Object.fromEntries(ESTRATEGIA.map(([k]) => [k, (document.getElementById('km-e-' + k) || {}).value || ''])), intro: v('km-intro'), respeto: v('km-resp'), minimo: v('km-min'), no: (document.getElementById('km-no') || {}).value || '',
          publicado: pub, completo: comp, version: comp ? 'completo' : 'simple', slug: prev.slug || slugDe(c.nombre), slug_c: prev.slug_c || (comp ? slugDe(c.nombre) + '-c' : undefined) };
        await guardar(c, kit, { manual: man }); ctx.closeForm();
        if (pub && !prev.publicado) { try { await navigator.clipboard.writeText(urlManual(man)); toast('Guía publicada. Copié el link.'); } catch (er) { toast('Guía publicada'); } } else toast(comp && !conCompleto(prev) ? 'Guardado. El cliente ya ve el manual completo en su portal.' : 'Guardado');
        return;
      }
      if (e.k === 'colores') { const h = normHex(v('km-hex')); if (!hexOk(h)) { toast('Poné el color como #RRGGBB'); listo(); return; } Object.assign(x, { hex: h, n: v('km-n'), rol: r('km-rol'), pantone: v('km-pms') }); }
      else if (e.k === 'tipos') {
        const f = (document.getElementById('km-file') || {}).files || [];
        if (!v('km-fam') && !f.length) { toast('Escribí la familia o subí el archivo'); listo(); return; }
        Object.assign(x, { familia: v('km-fam') || String(f[0].name).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '), rol: r('km-rol'), peso: (PESOS.find(p => p[1] === r('km-peso')) || ['400'])[0] });
        if (f.length) { x.archivos = [...(x.archivos || [])];
          for (const fl of f) { const up = await data.kitSubir(c._id, 'tipografias', fl); x.archivos.push({ id: uid(), url: up.url, path: up.path, tipo: fl.type || '', nombre: fl.name, peso: fl.size }); }
          const pv = x.archivos.find(y => /\.(ttf|otf|woff2?)$/i.test(y.nombre || '')) || x.archivos[0]; Object.assign(x, { url: pv.url, path: pv.path, n: pv.nombre }); }
        x.google = !!(st.gfSet && st.gfSet.has(x.familia));
      }
      else if (e.k === 'links') { let u = v('km-url'); if (!u) { toast('Pegá el link'); listo(); return; } if (!/^https?:\/\//i.test(u)) u = 'https://' + u; Object.assign(x, { n: v('km-n') || u.replace(/^https?:\/\/(www\.)?/, '').split('/')[0], url: u }); }
      else { x.n = v('km-n') || x.n; if (e.k === 'recursos') { const cl = r('km-cat'); x.cat = (CATS.find(c => c[1] === cl) || [catDe(x)])[0];
          if (document.querySelector('input[name="km-red"]')) { x.red = r('km-red'); x.uso = r('km-uso'); } }
        const pv = r('km-prev'), f = pv && (x.archivos || []).find(y => y.id === pv); if (f) Object.assign(x, { url: f.url, path: f.path, tipo: f.tipo || '' }); }
      if (i >= 0) arr[i] = x; else arr.push(x);
      await guardar(c, { ...kit, [e.k]: arr }); ctx.closeForm(); toast(i >= 0 ? 'Guardado' : 'Agregado');
    } catch (er) { toast(er.message); listo(); }
  }
  async function borrar() {
    const e = st.edit, c = e && cli(e.cid); if (!c) return;
    const kit = kitDe(c), x = (kit[e.k] || []).find(y => y.id === e.i); if (!x) return;
    if (ctx.confirmar && !await ctx.confirmar('Se borra «' + (x.n || x.familia || x.hex) + '» del kit de ' + c.nombre + '.', { titulo: '¿Borrar del kit?', ok: 'Borrar', tipo: 'peligro' })) return;
    try { await guardar(c, { ...kit, [e.k]: kit[e.k].filter(y => y.id !== e.i) }); data.kitBorrar([...new Set([x.path, ...(x.archivos || []).map(f => f.path)])]); ctx.closeForm(); toast('Borrado'); } catch (er) { toast(er.message); }
  }
  // Archivos con el mismo nombre (tarjeta.svg, tarjeta.pdf, tarjeta.ai) quedan como una sola pieza con varios formatos.
  async function subir(c, k, files, cat) {
    const kit = kitDe(c), nuevos = [], subidos = []; st.subiendo = k + (cat ? ':' + cat : ''); render();
    const grupos = new Map(); files.forEach(f => { const b = lindo(f.name).toLowerCase(); grupos.set(b, [...(grupos.get(b) || []), f]); });
    try {
      for (const fs of grupos.values()) {
        const archivos = [];
        for (const f of fs) {
          if (f.size > 50 * 1024 * 1024) { toast(f.name + ' pesa más de 50 MB'); continue; }
          const up = await data.kitSubir(c._id, cat || k, f); subidos.push(up.path);
          archivos.push({ id: uid(), url: up.url, path: up.path, tipo: f.type || '', nombre: f.name, peso: f.size });
        }
        if (!archivos.length) continue;
        const pv = previaDe(archivos);
        // Un logo claro (blanco, negativo) arranca sobre fondo oscuro para que se vea
        const fondo = k === 'logos' ? ((await fondoPara(pv.url)) === 'oscuro' ? 'oscuro' : 'claro') : '';
        nuevos.push({ id: uid(), n: lindo(fs[0].name), url: pv.url, path: pv.path, tipo: pv.tipo, archivos, ...(fondo ? { fondo } : {}), ...(cat ? { cat } : {}) });
      }
    } catch (er) { toast(er.message); }
    st.subiendo = '';
    if (nuevos.length) { try { await guardar(c, { ...kit, [k]: [...kit[k], ...nuevos] }); toast(nuevos.length === 1 ? 'Subido' : nuevos.length + ' piezas subidas'); } catch (er) { toast(er.message); data.kitBorrar(subidos); } }
    else render();
  }
  // Formatos de una pieza (desde el panel): se suben y se guardan al momento.
  async function formatosCambiar(fn) {
    const e = st.edit, c = e && cli(e.cid); if (!c) return;
    const kit = kitDe(c), arr = Array.isArray(kit[e.k]) ? [...kit[e.k]] : [], i = arr.findIndex(y => y.id === e.i); if (i < 0) return;
    const nombre = (document.getElementById('km-n') || {}).value, cat = (document.querySelector('input[name="km-cat"]:checked') || {}).value;
    const x = { ...arr[i] }; x.archivos = (x.archivos && x.archivos.length ? x.archivos : formatos(x).map(f => ({ id: uid(), url: f.url, path: f.path, tipo: f.tipo || '', nombre: lindo(x.n).replace(/\s*\(ejemplo\)/i, '') + '.' + f.fmt.toLowerCase() }))).map(f => ({ ...f }));
    const quitar = await fn(x); if (quitar === false) return;
    if (e.k === 'tipos') { const pv = x.archivos.find(f => /\.(ttf|otf|woff2?)$/i.test(f.nombre || f.url)); if (pv) Object.assign(x, { url: pv.url, path: pv.path }); else { delete x.url; delete x.path; } }
    else if (!x.archivos.some(f => f.url === x.url)) { const pv = previaDe(x.archivos); if (pv) Object.assign(x, { url: pv.url, path: pv.path, tipo: pv.tipo || '' }); }
    arr[i] = x;
    try { await guardar(c, { ...kit, [e.k]: arr }); if (quitar && quitar.length) data.kitBorrar(quitar); } catch (er) { toast(er.message); }
    panel(c, e.k, e.i);
    const n = document.getElementById('km-n'); if (n && nombre != null) n.value = nombre;
    if (cat) { const r = document.querySelector('input[name="km-cat"][value="' + cat.replace(/"/g, '') + '"]'); if (r) r.checked = true; }
  }
  const fmtSubir = fs => formatosCambiar(async x => {
    st.subiendo = 'fmt'; const n = document.querySelector('[data-kmfmt]'); if (n) n.parentElement.classList.add('disabled');
    const c = cli(st.edit.cid);
    try { for (const f of fs) { if (f.size > 50 * 1024 * 1024) { toast(f.name + ' pesa más de 50 MB'); continue; } const up = await data.kitSubir(c._id, st.edit.k === 'logos' ? 'logos' : st.edit.k === 'tipos' ? 'tipografias' : catDe(x), f); x.archivos.push({ id: uid(), url: up.url, path: up.path, tipo: f.type || '', nombre: f.name, peso: f.size }); } }
    catch (er) { toast(er.message); }
    st.subiendo = ''; toast(fs.length === 1 ? 'Formato sumado' : 'Formatos sumados'); return [];
  });

  // Buscador de Google Fonts en el panel de tipografía
  async function gfBuscar() {
    const box = document.getElementById('km-gf'), inp = document.getElementById('km-fam'); if (!box || !inp) return;
    const lista = await gfLista(); st.gfSet = new Set(lista.map(f => f[0]));
    const q = sinTilde(inp.value.trim()), cat = st.gfCat || '';
    let xs = lista.filter(f => (!cat || f[1] === cat) && (!q || sinTilde(f[0]).includes(q)));
    if (!q) { const pop = GF_POP.map(n => xs.find(f => f[0] === n)).filter(Boolean); xs = [...pop, ...xs.filter(f => !GF_POP.includes(f[0]))]; }
    else { const sc = f => sinTilde(f[0]).indexOf(q) * 10 - (GF_POP.includes(f[0]) ? 25 : 0) + f[0].length / 10; xs.sort((a, b) => sc(a) - sc(b)); }
    xs = xs.slice(0, 24);
    if (!xs.length) { box.innerHTML = '<p class="km-gf-v">No está en Google Fonts. Dejá el nombre y subí los archivos abajo.</p>'; return; }
    const txt = [...new Set(xs.map(f => f[0]).join('').split(''))].join('');
    const href = 'https://fonts.googleapis.com/css2?' + xs.map(f => 'family=' + encodeURIComponent(f[0]).replace(/%20/g, '+')).join('&') + '&text=' + encodeURIComponent(txt) + '&display=swap';
    if (!document.querySelector('link[data-gfp="' + href + '"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.dataset.gfp = href; document.head.appendChild(l); }
    const CAT = { sans: 'Sans', serif: 'Serif', display: 'Display', hand: 'Manuscrita', mono: 'Mono' };
    box.innerHTML = xs.map(f => '<button type="button" class="km-gf-i' + (inp.value.trim() === f[0] ? ' on' : '') + '" data-act="kmGf" data-f="' + esc(f[0]) + '" role="option"><span style="font-family:\'' + esc(f[0]) + '\',system-ui">' + esc(f[0]) + '</span><small>' + esc(CAT[f[1]] || '') + ' · ' + (f[3] ? 'variable' : f[2].split(',').length + (f[2].split(',').length === 1 ? ' peso' : ' pesos')) + '</small></button>').join('');
  }
  function gfPesos(fam) {
    const f = (st.gfLista || []).find(y => y[0] === fam); if (!f) return;
    const ws = f[3] ? null : f[2].split(',');
    document.querySelectorAll('input[name="km-peso"]').forEach(i => { const p = (PESOS.find(y => y[1] === i.value) || [])[0]; const no = ws && !ws.includes(p); i.disabled = !!no; i.parentElement.classList.toggle('off', !!no); });
    const cur = document.querySelector('input[name="km-peso"]:checked'); if (cur && cur.disabled) { const ok = [...document.querySelectorAll('input[name="km-peso"]')].find(i => !i.disabled); if (ok) ok.checked = true; }
  }
  const acts = {
    kmNuevo: t => { const c = cli(t.dataset.id); if (c) panel(c, t.dataset.k); },
    kmEditar: t => { const c = cli(t.dataset.id); if (c) panel(c, t.dataset.k, t.dataset.i); },
    kmUso: t => { const c = cli(t.dataset.id); if (c) panelUso(c); },
    kmManual: t => { const c = cli(t.dataset.id); if (c) panelManual(c); },
    kmPrevia: t => { const c = cli(t.dataset.id); if (c) verComoCliente(c, t.dataset.v); },
    kmBorrar: () => borrar(),
    kmRed: t => { st.red = t.dataset.r; render(); },
    kmGf: async t => { const inp = document.getElementById('km-fam'); if (!inp) return; inp.value = t.dataset.f; st.gfLista = await gfLista(); gfPesos(t.dataset.f); document.querySelectorAll('.km-gf-i').forEach(b => b.classList.toggle('on', b === t)); },
    kmGfCat: t => { st.gfCat = t.dataset.v; document.querySelectorAll('[data-act="kmGfCat"]').forEach(b => b.classList.toggle('on', b === t)); gfBuscar(); },
    kmFmtQuitar: t => formatosCambiar(async x => { const f = x.archivos.find(y => y.id === t.dataset.f); if (!f) return false;
      if (ctx.confirmar && !await ctx.confirmar('Se quita el formato ' + fmtDe(f) + ' de «' + x.n + '».', { titulo: '¿Quitar este formato?', ok: 'Quitar' })) return false;
      x.archivos = x.archivos.filter(y => y.id !== f.id); return f.path ? [f.path] : []; }),
    kmFmtLink: () => formatosCambiar(async x => { const el = document.getElementById('km-flink'); let u = el ? el.value.trim() : ''; if (!u) { toast('Pegá el link'); return false; } if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
      x.archivos.push({ id: uid(), url: u, link: true }); toast('Link sumado'); return []; }),
    kmCopiar: async t => { try { await navigator.clipboard.writeText(t.dataset.v); toast(t.dataset.v + ' copiado'); } catch (e) { toast(t.dataset.v); } },
    kmFondo: async t => { const c = cli(t.dataset.id); if (!c) return; const kit = kitDe(c); const logos = kit.logos.map(x => x.id === t.dataset.i ? { ...x, fondo: FONDOS[(FONDOS.indexOf(x.fondo || 'claro') + 1) % FONDOS.length] } : x); try { await guardar(c, { ...kit, logos }); } catch (e) { toast(e.message); } },
  };
  document.addEventListener('submit', e => { if (e.target.id === 'kmform') { e.preventDefault(); guardarPanel(); } });
  document.addEventListener('input', e => {
    const t = e.target; if (!t) return;
    if (t.id === 'km-fam') { clearTimeout(st.gfT); st.gfT = setTimeout(gfBuscar, 140); return; }
    if (t.id === 'km-pick') { const h = document.getElementById('km-hex'); if (h) h.value = t.value.toUpperCase(); }
    else if (t.id === 'km-hex') { const h = normHex(t.value), p = document.getElementById('km-pick'); if (p && hexOk(h)) p.value = h.toLowerCase(); }
  });
  document.addEventListener('change', e => {
    const t = e.target; if (t && t.dataset && t.dataset.kmfmt) { const fs = [...(t.files || [])]; t.value = ''; if (fs.length && !st.subiendo) fmtSubir(fs); return; }
    if (!t || !t.dataset || !t.dataset.kitup) return;
    const c = cli(t.dataset.id), fs = [...(t.files || [])]; t.value = '';
    if (c && fs.length && !st.subiendo) subir(c, t.dataset.kitup, fs, t.dataset.cat || '');
  });
  activarVisor(document.body);
  if (typeof document !== 'undefined' && !document.getElementById('cel-css')) { const x = document.createElement('style'); x.id = 'cel-css'; x.textContent = CEL_CSS; document.head.appendChild(x); }
  return { html, acts };
}
