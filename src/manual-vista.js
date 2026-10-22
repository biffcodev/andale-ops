// Manual de marca online (en la línea de brand.linkedin.com, discord.com/branding, deezerbrand.com).
// Todo con los colores y las tipografías de la marca: portada en movimiento, secciones que aparecen suave al bajar,
// logo con fondos y área de respeto, versiones, colores que se copian, tipografías para probar (sin saltos),
// imágenes, aplicaciones (íconos, papelería, redes, videos, plantillas), voz y descargas.
// Dos versiones: "completo" (la marca la hicimos nosotros) y "simple" (guía con lo que nos pasó el cliente).
// Lo usan la página pública /m/<link>, "Ver como cliente" desde la app y la pestaña Tu marca del portal (embed).
import { kitDeTexto, CATS, catDe, formatos, redDe, usoDe, REDES_KIT, esVF } from './kitmarca.js';
import { perfilRed, plantillaRed, tabsRedes, CEL_CSS } from './celular.js';
import { nombreRed } from './redes-logos.js';
import { activarVisor } from './visor.js';
import { fondosAuto } from './fondo.js';
import { LOGO } from './marca.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hexOk = h => /^#[0-9a-f]{6}$/i.test(h || '');
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const sobre = h => lum(h) > 0.42 ? '#141414' : '#ffffff';
const cmyk = h => { const [r, g, b] = rgb(h).map(v => v / 255), k = 1 - Math.max(r, g, b); if (k >= 1) return '0 0 0 100'; return [r, g, b].map(v => Math.round((1 - v - k) / (1 - k) * 100)).concat(Math.round(k * 100)).join(' '); };
const esImg = (tipo, url) => /^image\//.test(tipo || '') || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url || '');
const esVid = (tipo, url) => /^video\//.test(tipo || '') || /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url || '');
const ext = u => ((String(u || '').split('?')[0].match(/\.([a-z0-9]{2,5})$/i) || [])[1] || '').toUpperCase();
// Descargas por formato: si hay uno solo, el botón de bajar; si hay varios, un chip por formato (los editables con borde).
const fmtN = (x, f) => String(x.n || x.familia || 'archivo').replace(/\s*\(ejemplo\)/i, '') + '.' + f.fmt.toLowerCase();
const fLink = (x, f, cls, inner, lbl) => '<a class="' + cls + '" ' + (f.link ? 'href="' + esc(f.url) + '" target="_blank" rel="noopener"' : dlAttr(f.url, fmtN(x, f))) + ' title="' + (f.link ? 'Abrir en ' : 'Descargar ') + esc(f.fmt) + (f.ed ? ' (editable)' : '') + '"' + (lbl ? ' aria-label="' + esc(lbl) + '"' : '') + '>' + inner + '</a>';
const bajarX = x => { const fs = formatos(x); return fs.length > 1 ? '<span class="mm-fxs">' + fs.map(f => fLink(x, f, 'mm-fx' + (f.ed ? ' ed' : ''), esc(f.fmt))).join('') + '</span>' : fs[0] ? fLink(x, fs[0], 'mm-dl', I.dl, 'Descargar ' + (x.n || '')) : ''; };
const dlAttr = (url, n) => /\/storage\/v1\/object\/public\//.test(url) ? 'href="' + esc(url + (url.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(n || '')) + '"' : 'href="' + esc(url) + '" download="' + esc(n || '') + '"';
const PESO = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
const S = (d, w = 18) => '<svg viewBox="0 0 24 24" width="' + w + '" height="' + w + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const I = {
  dl: S('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>', 16),
  ext: S('<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5 11 13"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>', 15),
  abajo: S('<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>', 22),
  copia: S('<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>', 14),
  play: S('<path d="m8 5 11 7-11 7z" fill="currentColor"/>', 22),
  zoom: S('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2M11 8.5v5M8.5 11h5"/>', 17),
};
const USO_N = { perfil: 'Foto de perfil', portada: 'Portada', post: 'Plantilla de post', historia: 'Plantilla de historia o reel' };
const MEDIDAS = {
  instagram: [['Foto de perfil', '320 × 320 px'], ['Post y carrusel', '1080 × 1350 px (4:5)'], ['Historia y reel', '1080 × 1920 px (9:16)']],
  facebook: [['Foto de perfil', '320 × 320 px'], ['Portada', '851 × 315 px'], ['Post', '1080 × 1350 px'], ['Historia', '1080 × 1920 px']],
  linkedin: [['Logo', '400 × 400 px'], ['Portada de página', '1128 × 191 px'], ['Post', '1080 × 1350 px']],
  tiktok: [['Foto de perfil', '200 × 200 px'], ['Video', '1080 × 1920 px (9:16)']],
  youtube: [['Foto de perfil', '800 × 800 px'], ['Banner', '2560 × 1440 px (zona segura 1546 × 423)'], ['Miniatura', '1280 × 720 px']],
  x: [['Foto de perfil', '400 × 400 px'], ['Encabezado', '1500 × 500 px'], ['Imagen en post', '1600 × 900 px']],
};
const TAREAS = [['Poner el logo sobre una foto o una pieza', 'PNG (tiene fondo transparente)'], ['La web', 'SVG para el logo; WebP o PNG para imágenes'], ['Publicar en redes', 'PNG o JPG; las plantillas, en Canva o Figma'], ['Imprimir: tarjetas, carteles, packaging', 'PDF, AI o EPS. Que la imprenta confirme el formato y la medida'], ['Encargar o editar piezas nuevas', 'Los editables (AI, PSD, Figma, Canva) y las tipografías'], ['Presentaciones y documentos', 'El PNG del logo y la tipografía instalada']];
const FMT_DESC = { SVG: 'Vectorial: se agranda sin perder calidad. Ideal para la web.', PNG: 'Con fondo transparente. Para poner encima de otra imagen.', 'JPG/JPEG': 'Imagen terminada, con fondo. Para compartir y vistas previas.', WEBP: 'Liviana, pensada para la web.', PDF: 'Para ver, compartir e imprimir.', AI: 'El original de Illustrator. Para quien diseña o produce.', EPS: 'Vectorial para imprentas y talleres.', PSD: 'El original de Photoshop.', 'INDD/IDML': 'El original de InDesign.', 'FIG/FIGMA': 'Archivo de Figma, editable.', CANVA: 'Plantilla editable en Canva.', 'TTF/OTF': 'Tipografía para instalar en la compu.', 'WOFF/WOFF2': 'Tipografía para usar en la web.', ZIP: 'Paquete: se descomprime y adentro están los archivos.', 'MP4/MOV': 'Video.', 'PPTX/KEY': 'Presentación editable.', 'DOCX': 'Documento editable.' };
const lineas = v => String(v || '').split('\n').map(x => x.replace(/^[-•·*]\s*/, '').trim()).filter(Boolean);
function decimos(v) {
  const t = String(v || ''), frases = [...t.matchAll(/[“"«]([^”"»]{3,120})[”"»]/g)].map(m => m[1].trim());
  const resto = t.replace(/[“"«][^”"»]*[”"»]/g, ' ').split(/[\n,;]+|\.\s+/).map(x => x.replace(/[."]+$/, '').trim()).filter(x => x && x.length < 40);
  return { palabras: [...new Set(resto)].slice(0, 18), frases: frases.slice(0, 8) };
}
const oraciones = v => { const ls = lineas(v); return (ls.length > 1 ? ls : String(v || '').split(/(?<=[.!?])\s+/)).map(x => x.trim()).filter(x => x.length > 2).slice(0, 8); };
const MAL = ['transform:scaleX(1.45) scaleY(.8)', 'filter:hue-rotate(150deg) saturate(1.5)', 'transform:rotate(-12deg)', 'filter:drop-shadow(5px 6px 0 rgba(0,0,0,.45))', 'opacity:.3', 'filter:blur(1.4px)', 'transform:skewX(-16deg)'];
// Marca un elemento para que aparezca al bajar (agrega la clase al propio elemento, así no rompe grillas ni alturas)
function rv(html, delay) {
  return String(html).replace(/^<([a-z0-9]+)([^>]*)>/i, (all, tag, attrs) => {
    let a = /\sclass="/.test(attrs) ? attrs.replace(/\sclass="/, ' class="rv ') : attrs + ' class="rv"';
    if (delay) a = /\sstyle="/.test(a) ? a.replace(/\sstyle="/, ' style="--d:' + delay + 'ms;') : a + ' style="--d:' + delay + 'ms"';
    return '<' + tag + a + '>';
  });
}

// Fuentes: las subidas por archivo y las de Google Fonts (variables cuando se puede, así el peso cambia suave).
export function cargarFuentesManual(kit) {
  (kit.tipos || []).forEach(t => {
    if (t.url && window.FontFace) { new FontFace('mm-' + t.id, 'url(' + t.url + ')', esVF(t) ? { weight: '100 900' } : {}).load().then(f => document.fonts.add(f), () => {}); return; }
    if (!t.familia || document.querySelector('link[data-mmf="' + t.familia + '"]')) return;
    const base = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(t.familia).replace(/%20/g, '+');
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.mmf = t.familia; l.href = base + ':wght@100..900&display=swap';
    l.onerror = () => { l.href = base + ':wght@300;400;500;600;700;800;900&display=swap'; l.onerror = null; };
    document.head.appendChild(l);
  });
}
const fam = t => t ? (t.url ? "'mm-" + t.id + "', " : '') + "'" + String(t.familia || '').replace(/'/g, '') + "', " : '';

export function manualHTML(d, o = {}) {
  const m = d.marca || {}, kit = kitDeTexto(m), man = m.manual || {}, completo = (o.version || d.version) ? (o.version || d.version) === 'completo' : man.version !== 'simple', embed = !!o.embed;
  const cols = kit.colores.filter(c => hexOk(c.hex));
  const pri = (cols.find(c => /principal/i.test(c.rol)) || cols[0] || { hex: '#141414' }).hex, po = sobre(pri);
  const tinta = (cols.find(c => /texto/i.test(c.rol)) || {}).hex || '#141414', fondo = (cols.find(c => /fondo/i.test(c.rol)) || {}).hex || '#f4f2ee';
  const sec = (cols.find(c => /secundario|acento/i.test(c.rol) && c.hex !== pri) || {}).hex || pri;
  const tit = kit.tipos.find(t => /t[ií]tulo/i.test(t.rol)) || kit.tipos[0], txt = kit.tipos.find(t => /texto/i.test(t.rol)) || kit.tipos[1] || tit;
  const vars = '--mm-p:' + pri + ';--mm-po:' + po + ';--mm-s:' + sec + ';--mm-ink:' + tinta + ';--mm-bg2:' + fondo + ';--mm-fh:' + fam(tit) + 'system-ui,sans-serif;--mm-fb:' + fam(txt) + 'system-ui,sans-serif;--mm-wh:' + ((tit && tit.peso) || 800);
  const imgL = kit.logos.filter(l => esImg(l.tipo, l.url));
  const logoPara = bg => imgL.find(l => (l.fondo || 'claro') === bg) || (bg === 'marca' ? imgL.find(l => l.fondo === 'oscuro') : bg === 'oscuro' ? imgL.find(l => l.fondo === 'marca') : null) || imgL[0];
  const heroLogo = po === '#ffffff' ? (imgL.find(l => l.fondo === 'marca') || imgL.find(l => l.fondo === 'oscuro')) : (imgL.find(l => l.fondo === 'marca') || imgL.find(l => (l.fondo || 'claro') === 'claro'));
  const tituloDoc = completo ? 'Manual de marca' : 'Guía de marca';
  const card = (k, v) => '<div class="mm-card"><span class="mm-k">' + k + '</span><p>' + esc(v) + '</p></div>';
  const recs = kit.recursos.map(r => ({ ...r, cat: catDe(r) }));
  const secs = []; // [id, título, html, parte]
  const ver = (x, k) => (esImg(x.tipo, x.url) || esVid(x.tipo, x.url)) ? ' data-visor="' + esc(x.url) + '" data-n="' + esc(x.n || '') + '" data-vk="' + (k || ({ iconos: 'icono', fotos: 'foto', texturas: 'foto', mockups: 'foto' })[x.cat] || 'doc') + '"' : '';

  // ── Estrategia: esencia y voz primero
  if (completo) {
    const items = [['Punto de partida', man.punto], ['Propósito', man.proposito], ['Misión', man.mision], ['Visión', man.vision], ['Posicionamiento', man.posicionamiento], ['Narrativa', man.narrativa], ['La promesa', man.promesa], ['Territorio', man.territorio], ['Para quién', man.publico || m.publico], ['Qué hacemos', man.punto || man.proposito ? '' : m.rubro]].filter(x => x[1]);
    const par = t => lineas(t).map(x => { const [a, ...b] = x.split(':'); return [a.trim(), b.join(':').trim()]; });
    const rasgos = par(man.rasgos), valores = par(man.valores);
    const tarjetas = xs => '<div class="mm-rasgos">' + xs.map(([a, b], i) => rv('<div class="mm-rasgo"><b>' + esc(a) + '</b>' + (b ? '<p>' + esc(b) + '</p>' : '') + '</div>', (i % 4) * 80)).join('') + '</div>';
    if (man.intro || items.length || man.personalidad || rasgos.length || valores.length || man.manifiesto || man.concepto) secs.push(['esencia', 'Esencia',
      (man.concepto ? rv('<div class="mm-concepto"><span class="mm-k">Concepto</span><p>' + esc(man.concepto) + '</p></div>') : '') +
      (man.intro ? rv('<p class="mm-big">' + esc(man.intro) + '</p>') : '') +
      (items.length ? '<div class="mm-est">' + items.map(([t, v], i) => rv('<div class="mm-est-i"><span class="mm-est-n">' + String(i + 1).padStart(2, '0') + '</span><h3>' + esc(t) + '</h3><p>' + esc(v) + '</p></div>', (i % 2) * 90)).join('') + '</div>' : '') +
      (man.personalidad || rasgos.length ? '<h3 class="mm-h3 rv">Personalidad</h3>' + (man.personalidad ? rv('<p class="mm-big sm">' + esc(man.personalidad) + '</p>') : '') +
        (rasgos.length ? tarjetas(rasgos) : '') : '') +
      (valores.length ? '<h3 class="mm-h3 rv">Valores</h3>' + tarjetas(valores) : '') +
      (man.manifiesto ? rv('<div class="mm-manif"><span class="mm-k">Manifiesto</span><p>' + esc(man.manifiesto) + '</p></div>') : ''), 'Estrategia']);
  }
  if (completo && (m.tono || m.palabras_si || m.palabras_no || m.ejemplos)) {
    const ds = decimos(m.palabras_si), no = oraciones(m.palabras_no), pil = lineas(m.pilares).map(x => { const [a, ...b] = x.split(':'); return [a.trim(), b.join(':').trim()]; });
    const ej = lineas(m.ejemplos).slice(0, 3), av = d.avatar ? '<img src="' + esc(d.avatar) + '" alt="">' : '<i>' + esc(String(d.nombre || '?').slice(0, 2)) + '</i>';
    const tags = String(m.hashtags || '').match(/#[\wÀ-ÿ]+/g) || [];
    secs.push(['voz', 'Voz', (m.tono ? rv('<p class="mm-big sm">' + esc(m.tono) + '</p>') : '') +
      ([m.trato, m.emojis].filter(Boolean).length ? rv('<div class="mm-facts">' + (m.trato ? '<span><b>Tratamos de</b>' + esc(m.trato.toLowerCase()) + '</span>' : '') + (m.emojis ? '<span><b>Emojis</b>' + esc(m.emojis.toLowerCase()) + '</span>' : '') + '</div>') : '') +
      ((ds.palabras.length || ds.frases.length || no.length) ? '<div class="mm-row2 mm-sino">' +
        ((ds.palabras.length || ds.frases.length) ? rv('<div class="si"><span class="mm-k">Decimos</span>' + (ds.palabras.length ? '<div class="mm-pills">' + ds.palabras.map(x => '<span>' + esc(x) + '</span>').join('') + '</div>' : '') + (ds.frases.length ? '<ul class="mm-frases">' + ds.frases.map(x => '<li>“' + esc(x) + '”</li>').join('') + '</ul>' : '') + '</div>') : '') +
        (no.length ? rv('<div class="no"><span class="mm-k">No decimos ni hacemos</span><ul>' + no.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>', 120) : '') + '</div>' : '') +
      (pil.length ? '<h3 class="mm-h3 rv">De qué hablamos</h3><div class="mm-pil">' + pil.map(([a, b], i) => rv('<div class="mm-pil-i"><span>' + String(i + 1).padStart(2, '0') + '</span><b>' + esc(a) + '</b>' + (b ? '<p>' + esc(b) + '</p>' : '') + '</div>', (i % 3) * 70)).join('') + '</div>' : '') +
      (ej.length ? '<h3 class="mm-h3 rv">Así suena</h3><div class="mm-posts">' + ej.map((x, i) => rv('<div class="mm-post"><div class="mm-post-h">' + av + '<b>' + esc(String(d.nombre || '').toLowerCase().replace(/\s+/g, '')) + '</b></div><div class="mm-post-i" aria-hidden="true"><span>' + esc(String(d.nombre || '')) + '</span></div><p>' + esc(x) + (tags.length ? ' <em>' + esc(tags.slice(0, 3).join(' ')) + '</em>' : '') + '</p></div>', i * 100)).join('') + '</div>' : ''), 'Estrategia']);
  }

  // ── Identidad visual
  if (kit.logos.length) {
    const stage = imgL.length ? '<div class="mm-stage" data-bg="claro"><div class="mm-stage-bgs" role="group" aria-label="Fondo">' + [['claro', 'Claro'], ['oscuro', 'Oscuro'], ['marca', 'Color']].map(([k, l], i) => '<button data-mmbg="' + k + '"' + (i === 0 ? ' class="on"' : '') + '>' + l + '</button>').join('') + (man.respeto ? '<button data-mmresp class="mm-resp-b">Área de respeto</button>' : '') + '</div>' +
      '<div class="mm-stage-in">' + ['claro', 'oscuro', 'marca'].map(k => '<img class="mm-sl" data-for="' + k + '" src="' + esc(logoPara(k).url) + '" alt="' + esc(d.nombre) + '">').join('') + '<span class="mm-safe" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div></div>' : '';
    const specs = [man.respeto ? ['Área de respeto', man.respeto] : null, man.minimo ? ['Tamaño mínimo', man.minimo] : null].filter(Boolean);
    const nos = lineas(man.no), base = logoPara('claro');
    // Sobre cada fondo: el logo que corresponde arriba de cada color de la marca
    const fondosL = imgL.length ? [...cols.map(c => ({ hex: c.hex, n: c.n || c.hex })), ...(cols.some(c => lum(c.hex) > .9) ? [] : [{ hex: '#ffffff', n: 'Blanco' }])].slice(0, 6) : [];
    const logoSobre = hex => lum(hex) > .42 ? (imgL.find(l => (l.fondo || 'claro') === 'claro') || imgL[0]) : (imgL.find(l => l.fondo === 'marca') || imgL.find(l => l.fondo === 'oscuro') || imgL[0]);
    secs.push(['logo', 'Logo', (stage ? rv(stage) : '') +
      (specs.length ? '<div class="mm-specs n' + specs.length + '">' + specs.map(([k, v], i) => rv(card(k, v), i * 100)).join('') + '</div>' : '') +
      '<h3 class="mm-h3 rv">Versiones</h3><div class="mm-logos" data-visor-grupo>' + kit.logos.map((l, i) => rv('<figure class="mm-logo"><div class="mm-lf f-' + esc(l.fondo || 'claro') + '"' + ver(l, 'logo') + '>' + (esImg(l.tipo, l.url) ? '<img src="' + esc(l.url) + '" alt="' + esc(l.n) + '" loading="lazy">' : '<span class="mm-ext">' + esc(ext(l.url) || 'ARCHIVO') + '</span>') + '</div><figcaption><b>' + esc(l.n) + '</b>' + bajarX(l) + '</figcaption></figure>', (i % 4) * 80)).join('') + '</div>' +
      (fondosL.length > 1 ? '<h3 class="mm-h3 rv">Sobre cada fondo</h3><div class="mm-fondos">' + fondosL.map((f, i) => rv('<div class="mm-fondo" style="background:' + esc(f.hex) + ';color:' + sobre(f.hex) + '"><img src="' + esc(logoSobre(f.hex).url) + '" alt="" loading="lazy"><span>' + esc(f.n) + '</span></div>', (i % 3) * 70)).join('') + '</div>' : '') +
      (nos.length ? '<h3 class="mm-h3 rv">Lo que no hacemos con el logo</h3><div class="mm-nos">' + nos.map((x, i) => rv('<div class="mm-no">' + (base ? '<div class="mm-no-v"><img src="' + esc(base.url) + '" alt="" style="' + MAL[i % MAL.length] + '"><span class="mm-x" aria-hidden="true"></span></div>' : '') + '<p>' + esc(x) + '</p></div>', (i % 3) * 80)).join('') + '</div>' : ''), 'Identidad visual']);
  }
  if (cols.length) {
    const peso = c => /principal/i.test(c.rol) ? 3 : /fondo|texto/i.test(c.rol) ? 1.3 : 1.8;
    secs.push(['color', 'Color', rv('<div class="mm-bars">' + cols.map(c => '<button class="mm-bar-c" style="--c:' + esc(c.hex) + ';--co:' + sobre(c.hex) + ';--g:' + peso(c) + '" data-copiar="' + esc(c.hex) + '" aria-label="Copiar ' + esc(c.hex) + '"><span class="mm-bar-r">' + esc(c.rol || '') + '</span><span class="mm-bar-n">' + esc(c.n || c.hex) + '</span><span class="mm-bar-h">' + esc(c.hex) + I.copia + '</span></button>').join('') + '</div>') +
      '<div class="mm-cols">' + cols.map((c, i) => { const [r, g, b] = rgb(c.hex);
        return rv('<div class="mm-col"><div class="mm-col-h"><i style="background:' + esc(c.hex) + '"></i><span><b>' + esc(c.n || c.hex) + '</b>' + (c.rol ? '<small>' + esc(c.rol) + '</small>' : '') + '</span></div><dl>' +
          [['HEX', c.hex], ['RGB', r + ' ' + g + ' ' + b], ['CMYK', cmyk(c.hex)], c.pantone ? ['Pantone', c.pantone] : null].filter(Boolean).map(([k, v]) => '<button data-copiar="' + esc(v) + '"><dt>' + k + '</dt><dd>' + esc(v) + '</dd></button>').join('') + '</dl></div>', (i % 4) * 60); }).join('') + '</div>', 'Identidad visual']);
  }
  const gfLink = t => 'https://fonts.google.com/specimen/' + esc(String(t.familia || '').replace(/ /g, '+'));
  if (kit.tipos.length) {
    // Las familias, con su alfabeto como texto corrido; la jerarquía de textos (título, subtítulo, bajada, texto, nota,
    // etiqueta) armada con las tipografías de la marca; y un probador.
    const ff = t => esc(fam(t)) + 'system-ui,sans-serif', wDe = (t, i) => +(t.peso || (i === 0 ? 800 : 400));
    const familias = '<div class="mm-fams n' + Math.min(kit.tipos.length, 2) + '">' + kit.tipos.map((t, i) => { const w = wDe(t, i), fs = formatos(t);
      return rv('<article class="mm-fam" style="--tf:' + ff(t) + ';--tw:' + w + '"><div class="mm-fam-h"><span class="mm-fam-aa" aria-hidden="true">Aa</span><span class="mm-fam-n"><span class="mm-k">' + esc(t.rol || 'Tipografía') + '</span><b>' + esc(t.familia) + '</b><small>' + esc(PESO[w] || 'Regular') + (fs.length ? ' · archivo propio' : ' · Google Fonts') + '</small></span></div>' +
        '<p class="mm-abc" aria-label="Alfabeto de ' + esc(t.familia) + '">ABCDEFGHIJKLMNÑOPQRSTUVWXYZ<br>abcdefghijklmnñopqrstuvwxyz<br>0123456789 ¿?¡! &amp; @ % $ ( )</p>' +
        (t.url && !esVF(t) ? '' : '<div class="mm-pesos">' + [300, 400, 500, 600, 700, 800, 900].map(p => '<span style="font-weight:' + p + '"' + (p === w ? ' class="on"' : '') + '>' + PESO[p] + '</span>').join('') + '</div>') +
        '<div class="mm-fam-dl">' + (fs.length ? bajarX({ ...t, n: t.familia }) : '<a class="mm-btn" href="' + gfLink(t) + '" target="_blank" rel="noopener">' + I.dl + 'Bajar de Google Fonts</a>') + '</div></article>', i * 100); }).join('') + '</div>';
    const T = tit, X = txt || tit, wT = wDe(T, 0), wX = txt && txt !== tit ? wDe(txt, 1) : 400;
    const frase = String(man.intro || m.rubro || '').replace(/\s*\(texto de ejemplo\)\s*/i, ' ').split(/(?<=[.!?])\s/)[0].trim();
    const NIV = [
      ['Título', 'Para lo más importante de cada pieza', T, wT, 56, 1.05, '-.03em', esc(man.concepto || d.nombre)],
      ['Subtítulo', 'Ordena lo que sigue', T, Math.min(wT, 800), 32, 1.15, '-.015em', 'Lo que necesitás saber, en pocas palabras'],
      ['Bajada', 'Amplía el título; una o dos líneas', X, Math.max(wX, 500) === wX ? wX : 500, 21, 1.45, '-.005em', esc(frase || 'Una frase que acompaña al título y cuenta un poco más.')],
      ['Texto', 'Párrafos y textos largos', X, wX, 16, 1.6, '0', 'Este es el texto de todos los días: descripciones, posteos, mails y documentos. Va en un tamaño cómodo, con aire entre líneas, para que se lea sin esfuerzo en pantalla y en papel.'],
      ['Nota', 'Epígrafes, aclaraciones y letra chica', X, wX, 13, 1.5, '0', 'Foto: entrega en obra. Precios válidos hasta agotar stock.'],
      ['Etiqueta', 'Botones, categorías y datos', X, Math.max(wX, 700), 12, 1.2, '.12em', 'VER MÁS · NOVEDADES'],
    ];
    const jer = '<h3 class="mm-h3 rv">Jerarquía de textos</h3><div class="mm-jer">' + NIV.map(([n, u, t, w, px, lh, ls, ej], i) => rv('<div class="mm-jer-r"><div class="mm-jer-m"><b>' + n + '</b><span>' + u + '</span><small>' + esc(t ? t.familia : '') + ' · ' + esc(PESO[w] || w) + '<br>' + px + ' px · ' + Math.round(px * .75) + ' pt · interlineado ' + lh + '</small></div>' +
      '<p class="mm-jer-e' + (n === 'Nota' ? ' soft' : '') + '" style="font-family:' + ff(t) + ';font-weight:' + w + ';--px:' + px + 'px;line-height:' + lh + ';letter-spacing:' + ls + '">' + ej + '</p></div>', (i % 3) * 60)).join('') + '</div>' +
      rv('<p class="mm-jer-nota">En celular, los títulos bajan un escalón (título 40 px, subtítulo 26 px); el texto nunca baja de 16 px. En impresos, el texto va entre 9 y 11 pt según la pieza.</p>');
    const tester = rv('<div class="mm-tipo mm-tester" style="--tf:' + ff(kit.tipos[0]) + ';--tw:' + wDe(kit.tipos[0], 0) + '"><div class="mm-tst-h"><span class="mm-k">Escribí arriba y cambiá el tamaño</span>' + (kit.tipos.length > 1 ? '<span class="mm-tst-f" role="group" aria-label="Tipografía">' + kit.tipos.map((t, i) => '<button data-mmtf="' + ff(t) + '" data-mmtw="' + wDe(t, i) + '"' + (i === 0 ? ' class="on"' : '') + '>' + esc(t.familia) + '</button>').join('') + '</span>' : '') + '</div>' +
      '<div class="mm-try" contenteditable="true" spellcheck="false" data-mmout aria-label="Escribí para probar la tipografía">' + esc(d.nombre) + ', escribí acá lo que quieras</div>' +
      '<div class="mm-ctrl"><label>Tamaño<input type="range" min="16" max="96" value="44" data-mmsize></label>' + (kit.tipos.some(t => !t.url) ? '<label>Peso<input type="range" min="300" max="900" step="1" value="' + wDe(kit.tipos[0], 0) + '" data-mmw></label>' : '') + '</div></div>');
    secs.push(['tipografia', 'Tipografía', familias + jer + '<h3 class="mm-h3 rv">Probala</h3>' + tester, 'Identidad visual']);
  }
  const fotos = recs.filter(r => ['fotos', 'texturas'].includes(r.cat) && esImg(r.tipo, r.url)), graf = recs.filter(r => r.cat === 'graficos');
  if (fotos.length || graf.length || m.visual) secs.push(['imagenes', completo ? 'Imágenes y estilo' : 'Estilo', (m.visual ? rv('<p class="mm-big sm">' + esc(m.visual) + '</p>') : '') +
    (fotos.length ? '<div class="mm-imgs" data-visor-grupo>' + fotos.map((r, i) => rv('<figure class="mm-img"' + ver(r) + '><img src="' + esc(r.url) + '" alt="' + esc(r.n) + '" loading="lazy"></figure>', (i % 3) * 90)).join('') + '</div>' : '') +
    (graf.length ? '<h3 class="mm-h3 rv">Ilustraciones y stickers</h3>' + appGrid('graficos', graf) : ''), 'Identidad visual']);

  // ── Aplicaciones (se amplían antes de bajar)
  const apps = CATS.filter(([k]) => !['fotos', 'texturas', 'otros', 'redes', 'plantillas', 'graficos'].includes(k)).map(([k, l]) => [k, l, recs.filter(r => r.cat === k)]).filter(x => x[2].length);
  if (apps.length) secs.push(['aplicaciones', 'Aplicaciones', apps.map(([k, l, xs]) => '<div class="mm-app"><h3 class="mm-h3 rv">' + esc(l) + '</h3>' + appGrid(k, xs) + '</div>').join(''), 'Aplicaciones']);
  function appGrid(k, xs) {
    return '<div class="mm-app-g g-' + k + '" data-visor-grupo>' + xs.map((r, i) => rv('<figure class="mm-ap">' +
      (esVid(r.tipo, r.url) ? '<div class="mm-ap-m vid"><video src="' + esc(r.url) + '" controls playsinline preload="metadata"></video></div>' : esImg(r.tipo, r.url) ? '<div class="mm-ap-m"' + ver(r) + ' data-autobg="' + esc(r.url) + '"><img src="' + esc(r.url) + '" alt="' + esc(r.n) + '" loading="lazy"><span class="mm-zoom" aria-hidden="true">' + I.zoom + '</span></div>' : '<div class="mm-ap-m doc"><span>' + esc(ext(r.url) || 'ARCHIVO') + '</span></div>') +
      '<figcaption><b>' + esc(r.n) + '</b>' + bajarX(r) + '</figcaption></figure>', (i % 4) * 70)).join('') + '</div>';
  }

  // ── Redes: el perfil en cada red (foto y portada) y las plantillas puestas como publicación o historia
  const rs = recs.filter(r => r.cat === 'redes' || r.cat === 'plantillas');
  if (rs.length) {
    const genericos = rs.some(r => !redDe(r)), marcadas = [...new Set(rs.map(redDe).filter(Boolean))];
    const redes = REDES_KIT.filter(k => marcadas.includes(k) || (genericos && ['instagram', 'facebook'].includes(k)));
    const iso = imgL.find(l => /iso|s[ií]mbolo|icono/i.test(l.n)) || imgL[0];
    const de = (red, uso) => rs.filter(r => (redDe(r) === red || !redDe(r)) && usoDe(r) === uso && esImg(r.tipo, r.url)).sort((a, b) => (redDe(b) === red) - (redDe(a) === red));
    const copy = lineas(m.ejemplos)[0] || '', bio = (man.intro || m.rubro || '').split(/(?<=[.!?])\s/)[0];
    const tabla = (red) => (MEDIDAS[red] || []).map(([a, b]) => '<div><dt>' + a + '</dt><dd>' + b + '</dd></div>').join('');
    const panes = redes.map((red, ri) => {
      const perfil = de(red, 'perfil')[0], portada = de(red, 'portada')[0], posts = de(red, 'post'), hist = de(red, 'historia');
      const grid = [...posts.map(r => r.url), ...fotos.map(r => r.url)].slice(0, 9);
      const mios = rs.filter(r => redDe(r) === red || !redDe(r));
      const fila = r => '<div class="mm-rf"><span class="mm-rf-i"' + ver(r) + '>' + (esImg(r.tipo, r.url) ? '<img src="' + esc(r.url) + '" alt="" loading="lazy">' : '') + '</span><span class="mm-rf-n"><b>' + esc(r.n) + '</b><small>' + esc(USO_N[usoDe(r)] || 'Archivo') + (redDe(r) ? '' : ' · para todas las redes') + '</small></span>' + bajarX(r) + '</div>';
      return '<div class="mm-red" data-mmpane="red:' + red + '"' + (ri ? ' hidden' : '') + '>' +
        '<div class="mm-red-v">' + '<div class="mm-red-c"><span class="mm-k">Perfil</span>' + perfilRed({ nombre: d.nombre, avatar: (perfil || iso || {}).url }, red, { portada: portada && portada.url, posts: grid, historias: hist.map(r => r.url), bio, copy }) + '</div>' +
          (posts[0] && !['facebook', 'linkedin'].includes(red) ? '<div class="mm-red-c"><span class="mm-k">Publicación</span>' + plantillaRed({ nombre: d.nombre, avatar: (perfil || iso || {}).url }, red, posts[0].url, 'post', copy) + '</div>' : '') +
          (hist[0] ? '<div class="mm-red-c"><span class="mm-k">' + (red === 'tiktok' ? 'Video' : 'Historia') + '</span>' + plantillaRed({ nombre: d.nombre, avatar: (perfil || iso || {}).url }, red, hist[0].url, 'historia', copy) + '</div>' : '') + '</div>' +
        '<div class="mm-red-l"><div class="mm-red-f" data-visor-grupo><span class="mm-k">Archivos para ' + esc(nombreRed(red)) + '</span>' + mios.map(fila).join('') + '</div>' +
          (MEDIDAS[red] ? '<div class="mm-med"><span class="mm-k">Medidas recomendadas</span><dl>' + tabla(red) + '</dl><small>Son de referencia: las redes las cambian cada tanto.</small></div>' : '') + '</div></div>';
    }).join('');
    secs.push(['redes', 'Redes sociales', rv('<div class="mm-red-tabs">' + tabsRedes(redes, redes[0], k => 'data-mmtab="red" data-v="' + k + '"') + '</div>') + panes, 'Aplicaciones']);
  }

  // ── Descargas: con una guía corta de qué formato usar
  const todas = [...kit.logos, ...kit.tipos, ...recs], hay = new Set(todas.flatMap(x => formatos(x).map(f => f.fmt)));
  const guia = '<div class="mm-guia">' + rv('<div><span class="mm-k">¿Qué bajo para…?</span><dl>' + TAREAS.map(([a, b]) => '<div><dt>' + a + '</dt><dd>' + b + '</dd></div>').join('') + '</dl></div>') +
    (hay.size ? rv('<div><span class="mm-k">Qué es cada formato</span><dl>' + Object.entries(FMT_DESC).filter(([k]) => k.split('/').some(x => hay.has(x))).map(([a, b]) => '<div><dt>' + a.replace('/', ' / ') + '</dt><dd>' + b + '</dd></div>').join('') + '</dl></div>', 120) : '') + '</div>';
  const fila = (x, i) => { const fs = formatos(x), ico = '<span class="mm-fi' + (x.fondo ? ' f-' + esc(x.fondo) : '') + '">' + (esImg(x.tipo, x.url) ? '<img src="' + esc(x.url) + '" alt="" loading="lazy">' : x.familia ? '<b style="font-family:' + esc(fam(x)) + 'system-ui">Aa</b>' : esc((fs[0] || {}).fmt || '·')) + '</span>';
    if (!fs.length && x.familia) return rv('<a class="mm-file" href="' + gfLink(x) + '" target="_blank" rel="noopener">' + ico + '<span class="mm-fn"><b>' + esc(x.familia) + '</b><small>Google Fonts</small></span>' + I.ext + '</a>', (i % 4) * 50);
    return rv(fs.length > 1 ? '<div class="mm-file multi">' + ico + '<span class="mm-fn"><b>' + esc(x.n || x.familia) + '</b>' + bajarX(x) + '</span></div>'
      : fs[0] ? fLink(x, fs[0], 'mm-file', ico + '<span class="mm-fn"><b>' + esc(x.n || x.familia) + '</b><small>' + esc(fs[0].fmt) + '</small></span>' + I.dl) : '', (i % 4) * 50); };
  const grupos = [['Logos', kit.logos], ['Tipografías', kit.tipos.map(t => ({ ...t, n: t.familia }))], ...CATS.map(([k, l]) => [l, recs.filter(r => r.cat === k)])].filter(g => g[1].length);
  if (grupos.length || kit.links.length) secs.push(['descargas', 'Descargas', guia + grupos.map(([l, xs]) => '<div class="mm-dg"><span class="mm-k rv">' + esc(l) + '</span><div class="mm-files">' + xs.map(fila).join('') + '</div></div>').join('') +
    (kit.links.length ? rv('<div class="mm-links">' + kit.links.map(x => '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.n) + I.ext + '</a>').join('') + '</div>') : ''), 'Archivos']);

  const nav = secs.map(([id, t]) => '<a href="#' + id + '" data-mmnav="' + id + '">' + esc(t) + '</a>').join('');
  return '<div class="mm' + (embed ? ' embed' : '') + '" style="' + esc(vars) + '">' + (embed ? '' : '<div class="mm-prog" aria-hidden="true"><i></i></div>' +
    '<header class="mm-top"><a class="mm-marca" href="#top">' + (d.avatar ? '<img src="' + esc(d.avatar) + '" alt="">' : '') + '<b>' + esc(d.nombre) + '</b><span>' + tituloDoc + '</span></a><nav>' + nav + '</nav></header>') +
    '<section class="mm-hero" id="top">' +
    '<div class="mm-hero-in">' + (heroLogo ? '<img class="mm-hl" src="' + esc(heroLogo.url) + '" alt="' + esc(d.nombre) + '">' : '<p class="mm-hn">' + esc(d.nombre) + '</p>') +
    '<h1 class="mm-ht" aria-label="' + tituloDoc + '">' + tituloDoc.split(' ').map((w, i) => '<span class="mm-w" style="--i:' + i + '"><span>' + esc(w) + '</span></span>').join(' ') + '</h1>' +
    (man.intro ? '<p class="mm-hs">' + esc(man.intro.replace(/\s*\(texto de ejemplo\)\s*/i, ' ').split(/(?<=[.!?])\s/)[0].trim()) + '</p>' : '') + '</div></section>' +
    (embed && secs.length ? '<nav class="mm-enav">' + nav + '</nav>' : '') +
    secs.map(([id, t, h, parte], i) => '<section class="mm-s' + (i % 2 ? ' alt' : '') + '" id="' + id + '"><div class="mm-in"><div class="mm-sh rv"><span>' + String(i + 1).padStart(2, '0') + (parte && (!secs[i - 1] || secs[i - 1][3] !== parte) ? '<em>' + esc(parte) + '</em>' : '') + '</span><h2>' + esc(t) + '</h2></div>' + h + '</div></section>').join('') +
    (secs.length ? '' : '<section class="mm-s"><div class="mm-in"><p class="mm-big sm">Este manual todavía no tiene contenido.</p></div></section>') +
    '<footer class="mm-pie"><div class="mm-in"><p class="mm-pie-t rv">' + esc(d.nombre) + '</p><div class="mm-pie-b"><span>' + (completo ? 'Marca diseñada por' : 'Guía preparada por') + '</span><a href="https://weareandale.com" target="_blank" rel="noopener" class="mm-andale" aria-label="àndale">' + LOGO + '</a></div></div></footer>' +
    '<div class="mm-toast" role="status" aria-live="polite"></div></div>';
}

// Interacción: aparecer al bajar, menú activo, progreso, fondos del logo, área de respeto, probar tipografía y copiar.
export function activarManual(root, scroller) {
  const mm = root.querySelector('.mm'); if (!mm) return;
  const sc = scroller || window, scEl = scroller || document.documentElement;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rvs = mm.querySelectorAll('.rv');
  if (reduce || !('IntersectionObserver' in window)) rvs.forEach(x => x.classList.add('in'));
  else { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: scroller || null, rootMargin: '0px 0px -6% 0px', threshold: 0.05 }); rvs.forEach(x => io.observe(x)); }
  requestAnimationFrame(() => requestAnimationFrame(() => mm.classList.add('listo')));
  const bar = mm.querySelector('.mm-prog i'), top = mm.querySelector('.mm-top'), hero = mm.querySelector('.mm-hero'), links = [...mm.querySelectorAll('[data-mmnav]')];
  const secs = [...new Set(links.map(a => a.dataset.mmnav))].map(id => mm.querySelector('#' + id)).filter(Boolean);
  let tick = false;
  const onScroll = () => {
    if (tick) return; tick = true;
    requestAnimationFrame(() => {
      tick = false;
      const y = scroller ? scroller.scrollTop : window.scrollY, h = scEl.scrollHeight - (scroller ? scroller.clientHeight : window.innerHeight);
      if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
      if (top && hero) top.classList.toggle('solido', y > hero.offsetHeight - 80);
      let act = ''; secs.forEach(s => { if (s.offsetTop - 140 <= y) act = s.id; });
      links.forEach(a => a.classList.toggle('on', a.dataset.mmnav === act));
      if (hero && !reduce) hero.style.setProperty('--py', Math.min(y, 1000) + 'px');
    });
  };
  sc.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const toast = t => { const el = mm.querySelector('.mm-toast'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 1500); };
  activarVisor(mm); fondosAuto(mm);
  mm.addEventListener('click', async e => {
    const tb = e.target.closest('[data-mmtab]'); if (tb) { const g = tb.dataset.mmtab, v = tb.dataset.v; mm.querySelectorAll('[data-mmtab="' + g + '"]').forEach(b => { const on = b === tb; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); }); mm.querySelectorAll('[data-mmpane^="' + g + ':"]').forEach(p => { p.hidden = p.dataset.mmpane !== g + ':' + v; }); return; }
    const c = e.target.closest('[data-copiar]'); if (c) { try { await navigator.clipboard.writeText(c.dataset.copiar); toast('Copiado ' + c.dataset.copiar); } catch (er) { toast(c.dataset.copiar); } c.classList.add('ok'); setTimeout(() => c.classList.remove('ok'), 700); return; }
    const tf = e.target.closest('[data-mmtf]'); if (tf) { const card = tf.closest('.mm-tipo'); card.style.setProperty('--tf', tf.dataset.mmtf); card.style.setProperty('--tw', tf.dataset.mmtw); card.querySelectorAll('[data-mmtf]').forEach(x => x.classList.toggle('on', x === tf)); const w = card.querySelector('[data-mmw]'); if (w) w.value = tf.dataset.mmtw; return; }
    const b = e.target.closest('[data-mmbg]'); if (b) { const st = b.closest('.mm-stage'); st.dataset.bg = b.dataset.mmbg; st.querySelectorAll('[data-mmbg]').forEach(x => x.classList.toggle('on', x === b)); return; }
    const r = e.target.closest('[data-mmresp]'); if (r) { const st = r.closest('.mm-stage'); st.classList.toggle('resp'); r.classList.toggle('on'); return; }
    const a = e.target.closest('a[href^="#"]'); if (a) { const t = mm.querySelector(a.getAttribute('href')); if (t) { e.preventDefault(); const y0 = scroller ? 0 : window.scrollY; const y = t.getBoundingClientRect().top + y0 + (scroller ? scroller.scrollTop - scroller.getBoundingClientRect().top : 0) - (top && !scroller ? 64 : 12); sc.scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' }); } }
  });
  mm.addEventListener('input', e => {
    const t = e.target, card = t.closest('.mm-tipo'); if (!card) return;
    if (t.matches('[data-mmw]')) card.style.setProperty('--tw', t.value);
    if (t.matches('[data-mmsize]')) card.style.setProperty('--ts', t.value + 'px');
  });
  mm.querySelectorAll('.mm-tipo').forEach(c => { const s = c.querySelector('[data-mmsize]'); if (s) c.style.setProperty('--ts', s.value + 'px'); });
}

export const MANUAL_CSS = CEL_CSS + `
.mm{--mm-soft:color-mix(in srgb,var(--mm-ink) 60%,transparent);--mm-line:color-mix(in srgb,var(--mm-ink) 11%,transparent);--mm-card:color-mix(in srgb,#fff 82%,var(--mm-bg2));--ease:cubic-bezier(.22,.8,.24,1);font-family:var(--mm-fb);color:var(--mm-ink);background:#fff;min-height:100vh;overflow-x:clip;-webkit-font-smoothing:antialiased}
.mm.embed{min-height:0;border-radius:24px;overflow:hidden}
.mm *{box-sizing:border-box}
.mm-in{max-width:1180px;margin:0 auto;padding:0 40px;position:relative}
.mm-k{display:block;font-family:var(--mm-fb);font-size:11.5px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--mm-soft);margin-bottom:10px}
.mm button,.mm input{font-family:var(--mm-fb)}
/* Barra superior y progreso */
.mm-prog{position:fixed;top:0;left:0;right:0;height:3px;z-index:30;pointer-events:none}
.mm-prog i{display:block;height:100%;background:var(--mm-s);transform-origin:0 0;transform:scaleX(0)}
.mm-top{position:fixed;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;gap:20px;padding:14px 40px;color:var(--mm-po);transition:background .5s var(--ease),color .5s,box-shadow .5s,padding .5s var(--ease)}
.mm-top.solido{background:color-mix(in srgb,#fff 88%,transparent);backdrop-filter:blur(18px) saturate(1.4);-webkit-backdrop-filter:blur(18px) saturate(1.4);color:var(--mm-ink);box-shadow:0 1px 0 var(--mm-line);padding:10px 40px}
.mm-marca{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;flex:none}
.mm-marca img{width:30px;height:30px;border-radius:9px;object-fit:cover}
.mm-marca b{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:17px;letter-spacing:-.01em}
.mm-marca span{opacity:.7;font-size:13px}
.mm-top nav,.mm-enav{display:flex;gap:2px;overflow-x:auto;scrollbar-width:none}
.mm-top nav{margin-left:auto}
.mm-top nav::-webkit-scrollbar,.mm-enav::-webkit-scrollbar{display:none}
.mm-top nav a,.mm-enav a{color:inherit;opacity:.75;text-decoration:none;font-size:14px;font-weight:500;padding:8px 14px;border-radius:99px;white-space:nowrap;transition:opacity .3s,background .3s}
.mm-top nav a:hover,.mm-enav a:hover{opacity:1}
.mm-top nav a.on{opacity:1;background:color-mix(in srgb,currentColor 12%,transparent)}
.mm-enav{position:sticky;top:0;z-index:5;background:color-mix(in srgb,#fff 90%,transparent);backdrop-filter:blur(12px);padding:10px 24px;border-bottom:1px solid var(--mm-line)}
/* Portada */
.mm-hero{position:relative;min-height:100vh;min-height:100svh;background:var(--mm-p);color:var(--mm-po);display:flex;flex-direction:column;justify-content:center;overflow:hidden;isolation:isolate}
.mm.embed .mm-hero{min-height:420px}
.mm-orbs{position:absolute;inset:0;z-index:-1;pointer-events:none}
.mm-orbs i{position:absolute;border-radius:50%;background:radial-gradient(circle at 35% 35%,color-mix(in srgb,var(--c) 70%,#fff),var(--c) 60%);opacity:.38;filter:blur(2px);animation:mmFloat 22s ease-in-out infinite alternate;animation-delay:calc(var(--i) * -7s)}
.mm-orbs i:nth-child(1){width:52vmax;height:52vmax;right:-18vmax;top:-20vmax;opacity:.22;filter:blur(40px)}
.mm-orbs i:nth-child(2){width:22vmax;height:22vmax;right:8vw;bottom:14vh;opacity:1;filter:none;background:var(--c);box-shadow:inset -2.4vmax -2.4vmax 5vmax rgba(0,0,0,.14)}
.mm-orbs i:nth-child(3){width:9vmax;height:9vmax;right:30vw;top:18vh;opacity:1;filter:none;background:var(--c)}
@keyframes mmFloat{0%{transform:translate3d(0,0,0) rotate(0)}50%{transform:translate3d(-2vw,3vh,0) rotate(8deg)}100%{transform:translate3d(1.5vw,-2vh,0) rotate(-6deg)}}
.mm-hero-in{width:100%;max-width:1180px;margin:0 auto;padding:140px 40px 110px;transform:translate3d(0,calc(var(--py,0px) * .18),0);opacity:calc(1 - var(--py,0px) / 900)}
.mm-hl{display:block;max-width:min(360px,64vw);max-height:120px;object-fit:contain;object-position:left center;opacity:0;transform:translateY(20px);transition:opacity 1.1s var(--ease),transform 1.1s var(--ease)}
.mm-hn{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:30px;margin:0;opacity:0;transition:opacity 1s}
.mm-ht{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(42px,6.4vw,96px);line-height:.98;letter-spacing:-.03em;margin:48px 0 0}
.mm-w{display:inline-block;overflow:hidden;vertical-align:top;padding:0 .08em .08em 0;margin-right:-.08em}
.mm-w > span{display:inline-block;transform:translateY(110%);transition:transform 1.2s var(--ease);transition-delay:calc(250ms + var(--i) * 130ms)}
.mm-hs{max-width:560px;font-size:clamp(18px,1.7vw,22px);line-height:1.45;margin:30px 0 0;opacity:0;transform:translateY(14px);transition:opacity 1.2s var(--ease) .7s,transform 1.2s var(--ease) .7s}
.mm.listo .mm-hl,.mm.listo .mm-hn{opacity:1;transform:none}.mm.listo .mm-hs{opacity:.88;transform:none}
.mm.listo .mm-w > span{transform:none}
.mm-down{position:absolute;left:40px;bottom:84px;color:inherit;width:48px;height:48px;border-radius:50%;display:grid;place-items:center;border:1.5px solid color-mix(in srgb,currentColor 35%,transparent);animation:mmBob 2.6s ease-in-out infinite;transition:background .3s}
.mm-down:hover{background:color-mix(in srgb,currentColor 12%,transparent)}
@keyframes mmBob{0%,100%{transform:translateY(0)}50%{transform:translateY(7px)}}
.mm-marq{position:absolute;left:0;right:0;bottom:0;padding:16px 0;border-top:1px solid color-mix(in srgb,currentColor 20%,transparent);overflow:hidden;white-space:nowrap;font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:15px;letter-spacing:.06em;text-transform:uppercase}
.mm-marq > div{display:inline-flex;animation:mmMarq 60s linear infinite}
.mm-marq span{white-space:pre}
@keyframes mmMarq{to{transform:translateX(-50%)}}
/* Secciones */
.mm-s{position:relative;padding:130px 0;scroll-margin-top:60px;overflow:hidden}
.mm-s.alt{background:var(--mm-bg2)}
.mm-s.alt::before{content:"";position:absolute;width:44vmax;height:44vmax;border-radius:50%;right:-16vmax;top:-12vmax;background:radial-gradient(circle,color-mix(in srgb,var(--mm-p) 10%,transparent),transparent 65%);pointer-events:none}
.mm-sh{margin-bottom:60px}
.mm-sh span{display:inline-flex;align-items:center;gap:10px;font-family:var(--mm-fb);font-size:13px;font-weight:700;letter-spacing:.14em;color:var(--mm-p);margin-bottom:14px}
.mm-sh span::after{content:"";width:40px;height:2px;border-radius:2px;background:currentColor;transform:scaleX(0);transform-origin:0;transition:transform 1s var(--ease) .3s}
.mm-sh.in span::after{transform:none}
.mm-sh h2{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(46px,7.2vw,100px);letter-spacing:-.035em;line-height:.95;margin:0;padding:0 .06em .06em 0}
.mm-h3{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(22px,2.4vw,30px);letter-spacing:-.015em;margin:80px 0 24px}
.mm-big{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(28px,3.6vw,50px);line-height:1.1;letter-spacing:-.022em;margin:0 0 56px;max-width:960px}
.mm-big.sm{font-family:var(--mm-fb);font-weight:400;font-size:clamp(20px,2.1vw,27px);line-height:1.42;letter-spacing:-.008em;white-space:pre-line;max-width:900px}
.mm-row2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;align-items:stretch}
.mm-card{background:var(--mm-card);border-radius:24px;padding:28px 30px;box-shadow:0 1px 0 var(--mm-line)}
.mm-s.alt .mm-card{background:#fff}
.mm-card p{margin:0;font-size:17px;line-height:1.55}
/* Aparecer al bajar: suave, sin mover el diseño */
.rv{opacity:0;transform:translate3d(0,28px,0);transition:opacity 1s var(--ease),transform 1.1s var(--ease);transition-delay:var(--d,0ms)}
.rv.in{opacity:1;transform:none}
.mm-sh.rv{transform:none;opacity:1}
.mm-sh.rv h2{clip-path:inset(0 100% -10% 0);transition:clip-path 1.3s var(--ease) .1s}
.mm-sh.rv.in h2{clip-path:inset(-10% -10% -20% 0)}
/* Logo */
.mm-stage{position:relative;border-radius:32px;overflow:hidden;background:#f3f2ef;transition:background .7s var(--ease);margin-bottom:20px}
.mm-stage[data-bg="oscuro"]{background:#111}.mm-stage[data-bg="marca"]{background:var(--mm-p)}
.mm-stage-bgs{position:absolute;top:20px;left:20px;z-index:2;display:flex;gap:4px;background:rgba(255,255,255,.78);backdrop-filter:blur(10px);border-radius:99px;padding:4px;flex-wrap:wrap}
.mm-stage-bgs button{all:unset;cursor:pointer;font:600 13px var(--mm-fb);color:#222;padding:8px 14px;border-radius:99px;transition:background .3s,color .3s}
.mm-stage-bgs button.on{background:#141414;color:#fff}
.mm-stage-bgs .mm-resp-b{margin-left:2px}
.mm-stage-in{position:relative;height:clamp(300px,52vh,480px);display:grid;place-items:center}
.mm-sl{grid-area:1/1;max-width:min(520px,64%);max-height:40%;object-fit:contain;opacity:0;transform:scale(.97);transition:opacity .6s var(--ease),transform .9s var(--ease)}
.mm-stage[data-bg="claro"] .mm-sl[data-for="claro"],.mm-stage[data-bg="oscuro"] .mm-sl[data-for="oscuro"],.mm-stage[data-bg="marca"] .mm-sl[data-for="marca"]{opacity:1;transform:none}
.mm-safe{position:absolute;inset:24% 12%;border:1.5px dashed currentColor;color:var(--mm-p);border-radius:6px;opacity:0;transform:scale(1.06);transition:opacity .5s,transform .8s var(--ease);pointer-events:none}
.mm-stage[data-bg="marca"] .mm-safe{color:var(--mm-po)}.mm-stage[data-bg="oscuro"] .mm-safe{color:#fff}
.mm-stage.resp .mm-safe{opacity:.9;transform:none}
.mm-safe i{position:absolute;width:12px;height:12px;border:2px solid currentColor;border-radius:3px;background:inherit}
.mm-safe i:nth-child(1){left:-7px;top:-7px}.mm-safe i:nth-child(2){right:-7px;top:-7px}.mm-safe i:nth-child(3){left:-7px;bottom:-7px}.mm-safe i:nth-child(4){right:-7px;bottom:-7px}
.mm-specs{display:grid;gap:20px;grid-template-columns:repeat(2,minmax(0,1fr))}
.mm-specs.n1{grid-template-columns:1fr}
.mm-logos{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:18px;align-items:start}
.mm-logo{margin:0;min-width:0}
.mm-lf{aspect-ratio:4/3;border-radius:22px;display:flex;align-items:center;justify-content:center;padding:12%;overflow:hidden;transition:transform .6s var(--ease),box-shadow .6s var(--ease)}
.mm-logo:hover .mm-lf{transform:translateY(-4px);box-shadow:0 26px 40px -30px rgba(0,0,0,.5)}
.mm-lf.f-claro{background:#fff;box-shadow:inset 0 0 0 1px var(--mm-line)}.mm-lf.f-oscuro{background:#111}.mm-lf.f-marca{background:var(--mm-p)}
.mm-s:not(.alt) .mm-lf.f-claro{background:#f3f2ef;box-shadow:none}
.mm-lf img{display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain}
.mm-ext{font-weight:800;letter-spacing:.08em;color:#9a9aa0}
.mm-logo figcaption,.mm-ap figcaption{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 4px 0;font-size:15px;min-height:52px}
.mm-logo figcaption b,.mm-ap figcaption b{font-weight:600;line-height:1.3;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.mm-dl{flex:none;display:inline-grid;place-items:center;width:38px;height:38px;border-radius:50%;border:1px solid var(--mm-line);color:var(--mm-ink);text-decoration:none;transition:background .3s,color .3s,border-color .3s,transform .3s var(--ease)}
.mm-dl:hover{background:var(--mm-p);color:var(--mm-po);border-color:var(--mm-p);transform:translateY(-2px)}
.mm-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:99px;border:1px solid var(--mm-line);color:var(--mm-ink);text-decoration:none;font:600 14px var(--mm-fb);transition:background .3s,color .3s,border-color .3s}
.mm-btn:hover{background:var(--mm-ink);color:#fff;border-color:var(--mm-ink)}
.mm-nos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.mm-no{background:var(--mm-card);border-radius:22px;overflow:hidden;display:flex;flex-direction:column}
.mm-s.alt .mm-no{background:#fff}
.mm-no-v{position:relative;aspect-ratio:16/9;display:grid;place-items:center;padding:24px;background:color-mix(in srgb,var(--mm-ink) 4%,transparent);overflow:hidden}
.mm-no-v img{max-width:62%;max-height:56%;object-fit:contain}
.mm-x{position:absolute;inset:0}
.mm-x::before,.mm-x::after{content:"";position:absolute;left:50%;top:50%;width:58%;height:3px;background:#E5484D;border-radius:3px;transform:translate(-50%,-50%) rotate(-18deg) scaleX(0);transition:transform .8s var(--ease) .4s}
.mm-x::after{transform:translate(-50%,-50%) rotate(18deg) scaleX(0);transition-delay:.55s}
.rv.in .mm-x::before{transform:translate(-50%,-50%) rotate(-18deg) scaleX(1)}.rv.in .mm-x::after{transform:translate(-50%,-50%) rotate(18deg) scaleX(1)}
.mm-no p{margin:0;padding:18px 20px 20px;font-size:15.5px;line-height:1.4;flex:1}
/* Color */
.mm-bars{display:flex;gap:10px;height:clamp(320px,52vh,440px)}
.mm-bar-c{all:unset;box-sizing:border-box;cursor:pointer;flex:var(--g) 1 0;min-width:0;background:var(--c);color:var(--co);border-radius:26px;padding:24px;display:flex;flex-direction:column;transition:flex-grow .9s var(--ease),transform .4s var(--ease);box-shadow:inset 0 0 0 1px rgba(0,0,0,.06);overflow:hidden}
.mm-bars:hover .mm-bar-c{flex-grow:calc(var(--g) * .75)}
.mm-bars .mm-bar-c:hover{flex-grow:calc(var(--g) * 2)}
.mm-bar-c.ok{transform:scale(.98)}
.mm-bar-r{font:700 11px var(--mm-fb);letter-spacing:.14em;text-transform:uppercase;opacity:.75}
.mm-bar-n{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(18px,2vw,28px);line-height:1.05;margin-top:8px;letter-spacing:-.015em;overflow-wrap:anywhere}
.mm-bar-h{margin-top:auto;display:flex;align-items:center;gap:7px;font:600 14px var(--mm-fb);font-variant-numeric:tabular-nums;white-space:nowrap}
.mm-bar-h svg{opacity:0;transform:translateX(-4px);transition:opacity .3s,transform .3s}.mm-bar-c:hover .mm-bar-h svg{opacity:1;transform:none}
.mm-cols{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;margin-top:20px;align-items:stretch}
.mm-col{background:var(--mm-card);border-radius:22px;padding:18px;display:flex;flex-direction:column;gap:10px}
.mm-s.alt .mm-col{background:#fff}
.mm-col-h{display:flex;align-items:center;gap:12px}
.mm-col-h i{flex:none;width:48px;height:48px;border-radius:14px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.mm-col-h span{display:grid;min-width:0}.mm-col-h b{font-size:16px}.mm-col-h small{color:var(--mm-soft);font-size:12.5px}
.mm-col dl{margin:0;display:grid;gap:2px}
.mm-col dl button{all:unset;cursor:pointer;display:flex;justify-content:space-between;gap:10px;padding:7px 9px;border-radius:9px;font:500 13.5px var(--mm-fb);font-variant-numeric:tabular-nums;transition:background .25s}
.mm-col dl button:hover,.mm-col dl button.ok{background:color-mix(in srgb,var(--mm-p) 10%,transparent)}
.mm-col dt{color:var(--mm-soft);font-weight:600}.mm-col dd{margin:0}
/* Tipografía: medidas fijas, así cambiar el peso o el tamaño no mueve nada */
.mm-tipo{background:var(--mm-card);border-radius:28px;padding:32px;margin-bottom:22px}
.mm-s.alt .mm-tipo{background:#fff}
.mm-tipo-h{display:grid;grid-template-columns:1fr auto;align-items:end;gap:2px 16px;margin-bottom:24px}
.mm-tipo-h .mm-k{grid-column:1/-1;margin:0 0 4px}
.mm-tipo-h h3{margin:0;font-family:var(--tf);font-weight:var(--tw);font-size:clamp(30px,3.4vw,46px);letter-spacing:-.02em;line-height:1.05;transition:font-weight .25s linear}
.mm-tipo-h small{grid-column:1;color:var(--mm-soft);font-size:14px}
.mm-tipo-h .mm-btn{grid-column:2;grid-row:2/4;align-self:center}
.mm-tipo-b{display:grid;grid-template-columns:clamp(200px,24vw,300px) minmax(0,1fr);gap:28px;align-items:start}
.mm-aa{width:100%;aspect-ratio:1;border-radius:22px;background:var(--mm-p);color:var(--mm-po);display:grid;place-items:center;overflow:hidden;font-family:var(--tf);font-weight:var(--tw);transition:font-weight .25s linear}
.mm-aa span{font-size:clamp(80px,9vw,130px);line-height:1;letter-spacing:-.03em}
.mm-glyphs{display:grid;grid-template-columns:repeat(11,minmax(0,1fr));grid-auto-rows:1fr;gap:4px;font-family:var(--tf);font-weight:var(--tw);font-size:clamp(16px,1.8vw,24px);transition:font-weight .25s linear;align-content:center}
.mm-glyphs span{display:grid;place-items:center;aspect-ratio:1;border-radius:10px;transition:background .3s,color .3s}
.mm-glyphs span:hover{background:var(--mm-p);color:var(--mm-po)}
.mm-pesos{display:flex;gap:6px 20px;flex-wrap:wrap;margin:24px 0 0;padding:18px 0 0;border-top:1px solid var(--mm-line);font-family:var(--tf);font-size:20px}
.mm-pesos span{color:var(--mm-ink)}
.mm-test{margin-top:24px;border-top:1px solid var(--mm-line);padding-top:20px}
.mm-try{font-family:var(--tf);font-weight:var(--tw);font-size:var(--ts,48px);line-height:1.12;letter-spacing:-.015em;height:2.4em;overflow:hidden;outline:none;transition:font-weight .25s linear,font-size .25s var(--ease);overflow-wrap:anywhere;border-radius:12px;padding:0 6px;margin:0 -6px}
.mm-try:focus{background:color-mix(in srgb,var(--mm-p) 6%,transparent)}
.mm-ctrl{display:flex;gap:10px 28px;align-items:center;flex-wrap:wrap;margin-top:12px}
.mm-ctrl .mm-k{margin:0;flex:1}
.mm-ctrl label{display:flex;gap:10px;align-items:center;font:600 13px var(--mm-fb);color:var(--mm-soft)}
.mm-ctrl input[type=range]{-webkit-appearance:none;appearance:none;width:150px;height:4px;border-radius:4px;background:color-mix(in srgb,var(--mm-ink) 14%,transparent);outline:none}
.mm-ctrl input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--mm-p);border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer}
.mm-ctrl input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:var(--mm-p);border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer}
/* Imágenes: mosaico con las proporciones de cada imagen */
.mm-imgs{columns:3 260px;column-gap:16px}
.mm-img{margin:0 0 16px;break-inside:avoid;border-radius:22px;overflow:hidden;background:#eee}
.mm-img img{width:100%;height:auto;display:block;transition:transform 1.4s var(--ease)}
.mm-img:hover img{transform:scale(1.04)}
/* Aplicaciones */
.mm-app + .mm-app .mm-h3{margin-top:64px}
.mm-app .mm-h3{margin-top:0}
.mm-app-g{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;align-items:start}
.mm-app-g.g-iconos{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))}
.mm-app-g.g-redes,.mm-app-g.g-videos{grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
.mm-ap{margin:0;min-width:0}
.mm-ap-m{border-radius:20px;overflow:hidden;background:var(--mm-card);aspect-ratio:4/3;display:flex;align-items:center;justify-content:center;transition:transform .6s var(--ease),box-shadow .6s var(--ease)}
.mm-s.alt .mm-ap-m{background:#fff}
.mm-ap:hover .mm-ap-m{transform:translateY(-4px);box-shadow:0 26px 40px -30px rgba(0,0,0,.45)}
.mm-ap-m img{max-width:100%;max-height:100%;object-fit:contain;display:block}
.g-iconos .mm-ap-m{aspect-ratio:1;padding:22%}
.g-papeleria .mm-ap-m{padding:8%}
.mm-app-g.g-mockups{grid-template-columns:repeat(auto-fill,minmax(min(100%,380px),1fr))}
.g-mockups .mm-ap-m{aspect-ratio:3/2;background:#e9e9e4}
.g-mockups .mm-ap-m img{width:100%;height:100%;max-width:none;max-height:none;object-fit:cover}
.g-papeleria .mm-ap-m img{box-shadow:0 20px 30px -18px rgba(0,0,0,.35);border-radius:4px}
.g-redes,.g-plantillas{align-items:end}
.g-redes .mm-ap-m,.g-plantillas .mm-ap-m{aspect-ratio:auto;background:none!important;box-shadow:none}
.g-redes .mm-ap-m img{width:100%;height:auto;border-radius:20px}
.g-redes .mm-ap.perfil .mm-ap-m{justify-content:flex-start}
.g-redes .mm-ap.perfil .mm-ap-m img{width:min(180px,60%);border-radius:50%;box-shadow:0 0 0 4px #fff,0 0 0 6px color-mix(in srgb,var(--mm-p) 60%,transparent)}
.g-plantillas .mm-ap-m img{max-height:420px;width:auto;border-radius:14px;box-shadow:0 24px 40px -26px rgba(0,0,0,.45)}
.mm-ap-m.vid{aspect-ratio:16/9;background:#111}.mm-ap-m video{width:100%;height:100%;object-fit:cover}
.mm-ap-m.doc span{font-weight:800;letter-spacing:.08em;color:var(--mm-soft)}
/* Voz */
.mm-facts{display:flex;flex-wrap:wrap;gap:10px;margin:-28px 0 36px}
.mm-facts span{background:#fff;border-radius:99px;padding:10px 18px;font-size:15px;box-shadow:0 1px 0 var(--mm-line)}
.mm-facts b{color:var(--mm-soft);font-weight:600;margin-right:6px}
.mm-sino > div{border-radius:26px;padding:30px 32px}
.mm-sino .si{background:color-mix(in srgb,var(--mm-p) 9%,#fff)}
.mm-sino .no{background:#fff;box-shadow:inset 0 0 0 1px var(--mm-line)}
.mm-pills{display:flex;flex-wrap:wrap;gap:8px}
.mm-pills span{background:#fff;border-radius:99px;padding:8px 15px;font-weight:600;font-size:14.5px}
.mm-frases{list-style:none;padding:0;margin:22px 0 0;display:grid;gap:10px}
.mm-frases li{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(18px,1.7vw,22px);letter-spacing:-.01em;line-height:1.2}
.mm-sino .no ul{margin:0;padding:0;list-style:none;display:grid;gap:14px;font-size:16px;line-height:1.5}
.mm-sino .no li{position:relative;padding-left:26px}
.mm-sino .no li::before{content:"";position:absolute;left:2px;top:.62em;width:12px;height:2px;background:var(--mm-soft);border-radius:2px}
.mm-pil{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.mm-pil-i{background:#fff;border-radius:22px;padding:24px 26px;box-shadow:0 1px 0 var(--mm-line);transition:transform .5s var(--ease)}
.mm-s:not(.alt) .mm-pil-i{background:var(--mm-card)}
.mm-pil-i:hover{transform:translateY(-4px)}
.mm-pil-i span{font-family:var(--mm-fh);font-weight:var(--mm-wh);color:var(--mm-p);font-size:15px}
.mm-pil-i b{display:block;font-size:18px;margin:8px 0 6px;line-height:1.25}
.mm-pil-i p{margin:0;color:var(--mm-soft);font-size:14.5px;line-height:1.45}
.mm-posts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;align-items:start}
.mm-post{background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 1px 0 var(--mm-line),0 30px 50px -40px rgba(0,0,0,.45)}
.mm-post-h{display:flex;align-items:center;gap:10px;padding:12px 14px;font:600 14px var(--mm-fb)}
.mm-post-h img,.mm-post-h i{width:30px;height:30px;border-radius:50%;object-fit:cover;background:var(--mm-p);color:var(--mm-po);display:grid;place-items:center;font-style:normal;font-size:11px}
.mm-post-i{aspect-ratio:4/5;background:var(--mm-p);color:var(--mm-po);display:grid;place-items:center;font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:32px;letter-spacing:-.02em;position:relative;overflow:hidden}
.mm-post-i::before{content:"";position:absolute;width:62%;aspect-ratio:1;border-radius:50%;background:color-mix(in srgb,var(--mm-s) 55%,transparent);right:-14%;bottom:-12%;animation:mmFloat 14s ease-in-out infinite alternate}
.mm-post-i span{position:relative}
.mm-post p{margin:0;padding:14px 16px 18px;font-size:14.5px;line-height:1.5}
.mm-post em{font-style:normal;color:color-mix(in srgb,var(--mm-p) 80%,#000)}
/* Descargas */
.mm-dg + .mm-dg{margin-top:30px}
.mm-files{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px}
.mm-file{display:flex;align-items:center;gap:14px;background:#fff;border-radius:18px;padding:10px 16px 10px 10px;color:inherit;text-decoration:none;box-shadow:0 1px 0 var(--mm-line);transition:transform .45s var(--ease),box-shadow .45s}
.mm-s:not(.alt) .mm-file{background:var(--mm-card);box-shadow:none}
.mm-file:hover{transform:translateY(-3px);box-shadow:0 20px 30px -24px rgba(0,0,0,.45)}
.mm-fn{display:grid;min-width:0;flex:1}
.mm-file b{font-size:15px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mm-file small{color:var(--mm-soft);font-size:12.5px}
.mm-fi{flex:none;width:54px;height:54px;border-radius:12px;background:color-mix(in srgb,var(--mm-ink) 5%,transparent);display:grid;place-items:center;font-size:10.5px;font-weight:800;letter-spacing:.04em;overflow:hidden;padding:7px}
.mm-fi img{max-width:100%;max-height:100%;object-fit:contain}
.mm-file.multi:hover{transform:none;box-shadow:0 1px 0 var(--mm-line)}
.mm-file.multi .mm-fxs{justify-content:flex-start;margin-top:6px}
.mm-fxs{display:flex;flex-wrap:wrap;gap:5px;justify-content:flex-end}
.mm-fx{font:700 11px/1 var(--mm-fb);letter-spacing:.05em;padding:7px 10px;border-radius:99px;background:color-mix(in srgb,var(--mm-ink) 7%,transparent);color:var(--mm-ink);text-decoration:none;transition:background .3s,color .3s,transform .3s var(--ease)}
.mm-fx.ed{background:transparent;box-shadow:inset 0 0 0 1px var(--mm-line)}
.mm-fx:hover{background:var(--mm-p);color:var(--mm-po);box-shadow:none;transform:translateY(-1px)}
.mm-fi.f-oscuro{background:#111}.mm-fi.f-marca{background:var(--mm-p)}
.mm-links{display:flex;flex-wrap:wrap;gap:10px;margin-top:30px}
.mm-links a{display:inline-flex;align-items:center;gap:8px;background:var(--mm-ink);color:#fff;text-decoration:none;border-radius:99px;padding:14px 22px;font:600 15px var(--mm-fb);transition:transform .4s var(--ease),background .4s,color .4s}
.mm-links a:hover{transform:translateY(-2px);background:var(--mm-p);color:var(--mm-po)}
/* Pie */
.mm-pie{background:var(--mm-ink);color:#fff;padding:100px 0 60px;overflow:hidden}
.mm-pie-t{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(64px,13vw,200px);line-height:.88;letter-spacing:-.045em;margin:0 0 60px;color:var(--mm-p);padding:0 .06em .08em 0}
.mm-pie-b{display:flex;align-items:center;gap:14px;font:14px var(--mm-fb);color:rgba(255,255,255,.6)}
.mm-andale{display:block;width:92px;color:#fff}.mm-andale svg{display:block;width:100%;height:auto}
.mm-toast{position:fixed;left:50%;bottom:28px;z-index:40;transform:translate(-50%,20px);opacity:0;background:var(--mm-ink);color:#fff;font:600 14px var(--mm-fb);padding:12px 20px;border-radius:99px;transition:opacity .3s,transform .5s var(--ease);pointer-events:none}
.mm-toast.on{opacity:1;transform:translate(-50%,0)}
@media (max-width:1000px){.mm-logos{grid-template-columns:repeat(2,minmax(0,1fr))}.mm-nos,.mm-pil{grid-template-columns:repeat(2,minmax(0,1fr))}.mm-posts{grid-template-columns:1fr 1fr}.mm-glyphs{grid-template-columns:repeat(8,minmax(0,1fr))}}
@media (max-width:760px){
  .mm-in{padding:0 20px}.mm-top,.mm-top.solido{padding:10px 16px;gap:10px}.mm-marca span{display:none}.mm-top nav a{padding:7px 10px;font-size:13px}
  .mm-hero-in{padding:110px 20px 80px}.mm-ht{margin-top:30px}.mm-down{left:20px}.mm-s{padding:84px 0}.mm-sh{margin-bottom:38px}
  .mm-specs,.mm-nos,.mm-pil,.mm-posts{grid-template-columns:1fr}.mm-bars{flex-direction:column;height:auto}.mm-bar-c{min-height:96px;flex:none!important}
  .mm-tipo{padding:22px}.mm-tipo-b{grid-template-columns:1fr}.mm-aa{aspect-ratio:2/1}.mm-glyphs{grid-template-columns:repeat(7,minmax(0,1fr))}
  .mm-tipo-h{grid-template-columns:1fr}.mm-tipo-h .mm-btn{grid-column:1;grid-row:auto;justify-self:start;margin-top:10px}
  .mm-ctrl input[type=range]{width:120px}.mm-imgs{columns:2 140px;column-gap:10px}.mm-img{margin-bottom:10px;border-radius:16px}
  .mm-stage-bgs{top:12px;left:12px}.mm-stage-in{height:44vh}
}
@media (prefers-reduced-motion:reduce){.mm *,.mm *::before,.mm *::after{animation:none!important;transition:none!important}.mm .rv{opacity:1;transform:none}.mm-sh.rv h2{clip-path:none}.mm-w > span{transform:none}.mm-hl,.mm-hs,.mm-hn{opacity:1;transform:none}.mm-hero-in{transform:none;opacity:1}}
@media print{.mm-top,.mm-prog,.mm-down,.mm-marq,.mm-orbs,.mm-test,.mm-stage-bgs,.mm-toast,.mm-enav{display:none}.mm .rv{opacity:1;transform:none}.mm-sh.rv h2{clip-path:none}.mm-hero{min-height:auto;padding:60px 0}.mm-hero-in{transform:none;opacity:1}.mm-s{break-inside:avoid-page;padding:48px 0}.mm-hero,.mm-bar-c,.mm-lf,.mm-col i,.mm-s.alt,.mm-aa{-webkit-print-color-adjust:exact;print-color-adjust:exact}}

/* Parte del manual junto al número */
.mm-sh span em{font-style:normal;color:var(--mm-soft);letter-spacing:.14em;text-transform:uppercase;font-size:11.5px}
/* Esencia */
.mm-concepto{margin:0 0 70px}
.mm-concepto p{margin:0;font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(40px,7vw,104px);line-height:.95;letter-spacing:-.035em;color:var(--mm-p);padding-bottom:.06em}
.mm-est{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:56px 64px;margin-top:10px}
.mm-est-i{display:grid;grid-template-columns:auto 1fr;column-gap:18px;align-content:start;border-top:1px solid var(--mm-line);padding-top:22px}
.mm-est-n{grid-row:span 2;font:700 13px var(--mm-fb);letter-spacing:.1em;color:var(--mm-p);padding-top:6px}
.mm-est-i h3{margin:0 0 10px;font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(22px,2.2vw,28px);letter-spacing:-.015em;line-height:1.1}
.mm-est-i p{margin:0;font-size:16.5px;line-height:1.6;white-space:pre-line;color:color-mix(in srgb,var(--mm-ink) 85%,transparent)}
.mm-rasgos{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:16px}
.mm-rasgo{background:var(--mm-card);border-radius:24px;padding:28px 26px 26px;transition:transform .5s var(--ease),background .5s}
.mm-s.alt .mm-rasgo{background:#fff}
.mm-rasgo:hover{transform:translateY(-4px)}
.mm-rasgo b{display:block;font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(24px,2.4vw,32px);letter-spacing:-.02em;text-transform:uppercase;color:var(--mm-p);margin-bottom:12px;line-height:1}
.mm-rasgo p{margin:0;font-size:15px;line-height:1.55}
.mm-manif{margin-top:90px;background:var(--mm-p);color:var(--mm-po);border-radius:32px;padding:clamp(36px,6vw,80px)}
.mm-manif .mm-k{color:inherit;opacity:.7}
.mm-manif p{margin:0;font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(22px,2.6vw,36px);line-height:1.25;letter-spacing:-.015em;white-space:pre-line;max-width:900px}
/* Logo sobre cada fondo */
.mm-fondos{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px}
.mm-fondo{position:relative;aspect-ratio:4/3;border-radius:20px;display:grid;place-items:center;padding:34px 30px;box-shadow:inset 0 0 0 1px var(--mm-line)}
.mm-fondo img{max-width:78%;max-height:62%;object-fit:contain}
.mm-fondo span{position:absolute;left:16px;bottom:12px;font-size:12px;font-weight:600;opacity:.75}
/* Aplicaciones: ver en grande */
.mm-ap-m{position:relative}
.mm-zoom{position:absolute;right:12px;top:12px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.92);color:#111;display:grid;place-items:center;opacity:0;transform:scale(.85);transition:opacity .3s,transform .3s var(--ease);box-shadow:0 4px 14px rgba(0,0,0,.15)}
.mm-ap-m:hover .mm-zoom{opacity:1;transform:none}
@media (hover:none){.mm-zoom{opacity:1;transform:none}}
.mm-tipo-dl .mm-fxs{justify-content:flex-start}
/* Redes */
.mm-red-tabs{display:flex;justify-content:flex-start;margin-bottom:34px}
.mm-red-tabs .cel-redes{--fg:var(--mm-ink);--surface:#fff;--muted:var(--mm-soft);background:color-mix(in srgb,var(--mm-ink) 7%,transparent);justify-content:flex-start}
.mm-red-tabs .cel-redes button{font-family:var(--mm-fb);font-size:14px;padding:9px 16px}
.mm-red{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:40px;align-items:start}
.mm-red[hidden]{display:none}
.mm-red-v{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start}
.mm-red-c{display:grid;gap:10px;flex:0 1 auto;min-width:0}
.mm-red-c .cel{width:330px;box-shadow:0 0 0 1px var(--mm-line),0 30px 60px -36px rgba(0,0,0,.45)}
.mm-red-c .cel.t-reel,.mm-red-c .cel.t-historia{width:300px;height:533px}
.mm-red-l{display:grid;gap:22px;position:sticky;top:90px}
.mm-red-f{display:grid;gap:8px}
.mm-rf{display:flex;align-items:center;gap:12px;background:var(--mm-card);border-radius:16px;padding:8px 12px 8px 8px}
.mm-s.alt .mm-rf{background:#fff}
.mm-rf-i{flex:none;width:52px;height:52px;border-radius:10px;overflow:hidden;background:color-mix(in srgb,var(--mm-ink) 6%,transparent)}
.mm-rf-i img{width:100%;height:100%;object-fit:cover}
.mm-rf-n{display:grid;flex:1;min-width:0}
.mm-rf-n b{font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mm-rf-n small{font-size:12px;color:var(--mm-soft)}
.mm-rf .mm-fxs{flex:none;max-width:120px}
.mm-rf .mm-dl{width:34px;height:34px}
.mm-med dl{margin:0;display:grid;gap:0}
.mm-med dl div{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--mm-line);font-size:13.5px}
.mm-med dt{color:var(--mm-soft)}.mm-med dd{margin:0;font-weight:600;text-align:right;font-variant-numeric:tabular-nums}
.mm-med small{display:block;margin-top:8px;font-size:12px;color:var(--mm-soft)}
/* Descargas: qué bajar */
.mm-guia{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px;margin-bottom:64px}
.mm-guia > div{background:var(--mm-card);border-radius:24px;padding:26px 28px}
.mm-s.alt .mm-guia > div{background:#fff}
.mm-guia dl{margin:0}
.mm-guia dl div{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);gap:14px;padding:11px 0;border-bottom:1px solid var(--mm-line);font-size:14px;line-height:1.45}
.mm-guia dl div:last-child{border-bottom:0}
.mm-guia dt{font-weight:600}.mm-guia dd{margin:0;color:color-mix(in srgb,var(--mm-ink) 75%,transparent)}
.mm-fi b{font-size:22px;font-weight:600}
@media (max-width:980px){.mm-red{grid-template-columns:1fr}.mm-red-l{position:static}}
@media (max-width:720px){.mm-est{grid-template-columns:1fr;gap:36px}.mm-red-c .cel{width:min(330px,100%)}.mm-red-c .cel.t-reel,.mm-red-c .cel.t-historia{width:min(300px,100%);height:auto;aspect-ratio:9/16}.mm-guia dl div{grid-template-columns:1fr;gap:2px}.mm-red-v{justify-content:center}}
.mm-logo figcaption:has(.mm-fxs),.mm-ap figcaption:has(.mm-fxs){flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:8px}
.mm-logo figcaption:has(.mm-fxs) .mm-fxs,.mm-ap figcaption:has(.mm-fxs) .mm-fxs{justify-content:flex-start}
@media (max-width:720px){.mm-red-tabs .cel-redes{flex-wrap:nowrap;overflow-x:auto;max-width:100%;scrollbar-width:none;border-radius:16px}.mm-red-tabs .cel-redes button{flex:none}}
.mm-fams{display:grid;gap:18px}
.mm-fams.n2{grid-template-columns:repeat(2,minmax(0,1fr))}
.mm-fam{background:var(--mm-card);border-radius:28px;padding:30px 32px;display:grid;gap:22px;align-content:start}
.mm-s.alt .mm-fam{background:#fff}
.mm-fam-h{display:flex;align-items:center;gap:20px}
.mm-fam-aa{flex:none;width:92px;height:92px;border-radius:22px;background:var(--mm-p);color:var(--mm-po);display:grid;place-items:center;font-family:var(--tf);font-weight:var(--tw);font-size:46px;letter-spacing:-.03em;line-height:1}
.mm-fam-n{display:grid;min-width:0}
.mm-fam-n .mm-k{margin:0 0 2px}
.mm-fam-n b{font-family:var(--tf);font-weight:var(--tw);font-size:clamp(28px,3vw,40px);line-height:1.05;letter-spacing:-.02em;padding-bottom:.06em}
.mm-fam-n small{color:var(--mm-soft);font-size:13.5px}
.mm-abc{margin:0;font-family:var(--tf);font-weight:var(--tw);font-size:clamp(18px,1.7vw,23px);line-height:1.5;letter-spacing:.04em;overflow-wrap:anywhere}
.mm-fam .mm-pesos{margin:0;padding:16px 0 0;font-size:15px;gap:4px 16px}
.mm-pesos span{color:var(--mm-soft)}.mm-pesos span.on{color:var(--mm-ink)}
.mm-fam-dl{display:flex}
.mm-jer{background:#fff;border-radius:28px;box-shadow:0 0 0 1px var(--mm-line);padding:8px 32px}
.mm-jer-r{display:grid;grid-template-columns:220px minmax(0,1fr);gap:28px;align-items:baseline;padding:24px 0;border-bottom:1px solid var(--mm-line)}
.mm-jer-r:last-child{border-bottom:0}
.mm-jer-m{display:grid;gap:2px;align-self:start}
.mm-jer-m b{font-size:15px;font-weight:700}
.mm-jer-m span{font-size:13px;color:var(--mm-ink)}
.mm-jer-m small{font-size:12px;color:var(--mm-soft);line-height:1.5;margin-top:4px;font-variant-numeric:tabular-nums}
.mm-jer-e{margin:0;font-size:var(--px);color:var(--mm-ink);overflow-wrap:anywhere;max-width:760px}
.mm-jer-e.soft{color:var(--mm-soft)}
.mm-jer-nota{margin:16px 4px 0;font-size:13.5px;color:var(--mm-soft);max-width:760px}
.mm-tester{margin-bottom:0}
.mm-tst-h{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:10px}
.mm-tst-h .mm-k{margin:0}
.mm-tst-f{display:inline-flex;gap:4px;background:color-mix(in srgb,var(--mm-ink) 6%,transparent);border-radius:99px;padding:4px}
.mm-tst-f button{all:unset;cursor:pointer;font:600 13.5px var(--mm-fb);padding:7px 14px;border-radius:99px;color:var(--mm-soft)}
.mm-tst-f button.on{background:#fff;color:var(--mm-ink);box-shadow:0 1px 3px rgba(0,0,0,.1)}
.mm-tester .mm-try{min-height:1.3em;height:auto;max-height:3.6em}
@media (max-width:820px){.mm-fams.n2{grid-template-columns:1fr}.mm-jer{padding:4px 20px}.mm-jer-r{grid-template-columns:1fr;gap:10px;padding:20px 0}.mm-jer-e{font-size:min(var(--px),calc(var(--px) * .72 + 4px))}.mm-fam{padding:24px}.mm-fam-aa{width:72px;height:72px;font-size:36px}}
.mm-ap-m.bg-osc{background:#141414}.mm-ap-m.bg-cla{background:#fff}
`;
