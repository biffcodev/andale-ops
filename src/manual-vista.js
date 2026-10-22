// Manual de marca online (en la línea de brand.linkedin.com, discord.com/branding, deezerbrand.com).
// Todo con los colores y las tipografías de la marca: portada en movimiento, secciones que aparecen suave al bajar,
// logo con fondos y área de respeto, versiones, colores que se copian, tipografías para probar (sin saltos),
// imágenes, aplicaciones (íconos, papelería, redes, videos, plantillas), voz y descargas.
// Dos versiones: "completo" (la marca la hicimos nosotros) y "simple" (guía con lo que nos pasó el cliente).
// Lo usan la página pública /m/<link>, "Ver como cliente" desde la app y la pestaña Tu marca del portal (embed).
import { kitDeTexto, CATS, catDe } from './kitmarca.js';
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
const dlAttr = (url, n) => /\/storage\/v1\/object\/public\//.test(url) ? 'href="' + esc(url + (url.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(n || '')) + '"' : 'href="' + esc(url) + '" download="' + esc(n || '') + '"';
const PESO = { 100: 'Thin', 200: 'Extralight', 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
const S = (d, w = 18) => '<svg viewBox="0 0 24 24" width="' + w + '" height="' + w + '" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const I = {
  dl: S('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>', 16),
  ext: S('<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5 11 13"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>', 15),
  abajo: S('<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>', 22),
  copia: S('<rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>', 14),
  play: S('<path d="m8 5 11 7-11 7z" fill="currentColor"/>', 22),
};
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
    if (t.url && window.FontFace) { new FontFace('mm-' + t.id, 'url(' + t.url + ')').load().then(f => document.fonts.add(f), () => {}); return; }
    if (!t.familia || document.querySelector('link[data-mmf="' + t.familia + '"]')) return;
    const base = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(t.familia).replace(/%20/g, '+');
    const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.mmf = t.familia; l.href = base + ':wght@100..900&display=swap';
    l.onerror = () => { l.href = base + ':wght@300;400;500;600;700;800;900&display=swap'; l.onerror = null; };
    document.head.appendChild(l);
  });
}
const fam = t => t ? (t.url ? "'mm-" + t.id + "', " : '') + "'" + String(t.familia || '').replace(/'/g, '') + "', " : '';

export function manualHTML(d, o = {}) {
  const m = d.marca || {}, kit = kitDeTexto(m), man = m.manual || {}, completo = man.version !== 'simple', embed = !!o.embed;
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
  const secs = [];

  if (completo && (man.intro || m.rubro || m.publico)) {
    secs.push(['esencia', 'Esencia', (man.intro ? rv('<p class="mm-big">' + esc(man.intro) + '</p>') : '') +
      '<div class="mm-row2">' + (m.rubro ? rv(card('Qué hacemos', m.rubro)) : '') + (m.publico ? rv(card('Para quién', m.publico), 120) : '') + '</div>']);
  }
  if (kit.logos.length) {
    const stage = imgL.length ? '<div class="mm-stage" data-bg="claro"><div class="mm-stage-bgs" role="group" aria-label="Fondo">' + [['claro', 'Claro'], ['oscuro', 'Oscuro'], ['marca', 'Color']].map(([k, l], i) => '<button data-mmbg="' + k + '"' + (i === 0 ? ' class="on"' : '') + '>' + l + '</button>').join('') + (man.respeto ? '<button data-mmresp class="mm-resp-b">Área de respeto</button>' : '') + '</div>' +
      '<div class="mm-stage-in">' + ['claro', 'oscuro', 'marca'].map(k => '<img class="mm-sl" data-for="' + k + '" src="' + esc(logoPara(k).url) + '" alt="' + esc(d.nombre) + '">').join('') + '<span class="mm-safe" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div></div>' : '';
    const specs = [man.respeto ? ['Área de respeto', man.respeto] : null, man.minimo ? ['Tamaño mínimo', man.minimo] : null].filter(Boolean);
    const nos = lineas(man.no), base = logoPara('claro');
    secs.push(['logo', 'Logo', (stage ? rv(stage) : '') +
      (specs.length ? '<div class="mm-specs n' + specs.length + '">' + specs.map(([k, v], i) => rv(card(k, v), i * 100)).join('') + '</div>' : '') +
      '<h3 class="mm-h3 rv">Versiones</h3><div class="mm-logos">' + kit.logos.map((l, i) => rv('<figure class="mm-logo"><div class="mm-lf f-' + esc(l.fondo || 'claro') + '">' + (esImg(l.tipo, l.url) ? '<img src="' + esc(l.url) + '" alt="' + esc(l.n) + '" loading="lazy">' : '<span class="mm-ext">' + esc(ext(l.url) || 'ARCHIVO') + '</span>') + '</div><figcaption><b>' + esc(l.n) + '</b><a class="mm-dl" ' + dlAttr(l.url, l.n) + ' aria-label="Descargar ' + esc(l.n) + '">' + I.dl + '</a></figcaption></figure>', (i % 4) * 80)).join('') + '</div>' +
      (nos.length ? '<h3 class="mm-h3 rv">Lo que no hacemos con el logo</h3><div class="mm-nos">' + nos.map((x, i) => rv('<div class="mm-no">' + (base ? '<div class="mm-no-v"><img src="' + esc(base.url) + '" alt="" style="' + MAL[i % MAL.length] + '"><span class="mm-x" aria-hidden="true"></span></div>' : '') + '<p>' + esc(x) + '</p></div>', (i % 3) * 80)).join('') + '</div>' : '')]);
  }
  if (cols.length) {
    const peso = c => /principal/i.test(c.rol) ? 3 : /fondo|texto/i.test(c.rol) ? 1.3 : 1.8;
    secs.push(['color', 'Color', rv('<div class="mm-bars">' + cols.map(c => '<button class="mm-bar-c" style="--c:' + esc(c.hex) + ';--co:' + sobre(c.hex) + ';--g:' + peso(c) + '" data-copiar="' + esc(c.hex) + '" aria-label="Copiar ' + esc(c.hex) + '"><span class="mm-bar-r">' + esc(c.rol || '') + '</span><span class="mm-bar-n">' + esc(c.n || c.hex) + '</span><span class="mm-bar-h">' + esc(c.hex) + I.copia + '</span></button>').join('') + '</div>') +
      '<div class="mm-cols">' + cols.map((c, i) => { const [r, g, b] = rgb(c.hex);
        return rv('<div class="mm-col"><div class="mm-col-h"><i style="background:' + esc(c.hex) + '"></i><span><b>' + esc(c.n || c.hex) + '</b>' + (c.rol ? '<small>' + esc(c.rol) + '</small>' : '') + '</span></div><dl>' +
          [['HEX', c.hex], ['RGB', r + ' ' + g + ' ' + b], ['CMYK', cmyk(c.hex)], c.pantone ? ['Pantone', c.pantone] : null].filter(Boolean).map(([k, v]) => '<button data-copiar="' + esc(v) + '"><dt>' + k + '</dt><dd>' + esc(v) + '</dd></button>').join('') + '</dl></div>', (i % 4) * 60); }).join('') + '</div>']);
  }
  if (kit.tipos.length) {
    secs.push(['tipografia', 'Tipografía', kit.tipos.map((t, i) => {
      const w = +(t.peso || (i === 0 ? 800 : 400)), f = esc(fam(t)) + 'system-ui,sans-serif', ejemplo = i === 0 ? d.nombre : 'Así se lee un texto de la marca, claro y cercano.';
      return rv('<article class="mm-tipo" style="--tf:' + f + ';--tw:' + w + '">' +
        '<header class="mm-tipo-h"><span class="mm-k">' + esc(t.rol || 'Tipografía') + '</span><h3>' + esc(t.familia) + '</h3><small>' + esc(PESO[w] || 'Regular') + '</small>' +
        (t.url ? '<a class="mm-btn" ' + dlAttr(t.url, t.n || t.familia) + '>' + I.dl + 'Descargar</a>' : '<a class="mm-btn" href="https://fonts.google.com/specimen/' + esc(String(t.familia || '').replace(/ /g, '+')) + '" target="_blank" rel="noopener">' + I.ext + 'Google Fonts</a>') + '</header>' +
        '<div class="mm-tipo-b"><div class="mm-aa" aria-hidden="true"><span>Aa</span></div><div class="mm-glyphs" aria-hidden="true">' + 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyz0123456789&@?!'.split('').map(ch => '<span>' + esc(ch) + '</span>').join('') + '</div></div>' +
        (t.url ? '' : '<div class="mm-pesos">' + [300, 400, 500, 600, 700, 800, 900].map(p => '<span style="font-weight:' + p + '">' + PESO[p] + '</span>').join('') + '</div>') +
        '<div class="mm-test"><div class="mm-try" contenteditable="true" spellcheck="false" data-mmout aria-label="Escribí para probar la tipografía">' + esc(ejemplo) + '</div>' +
        '<div class="mm-ctrl"><span class="mm-k">Probala: escribí arriba</span><label>Tamaño<input type="range" min="24" max="96" value="' + (i === 0 ? 64 : 34) + '" data-mmsize></label>' + (t.url ? '' : '<label>Peso<input type="range" min="300" max="900" step="1" value="' + w + '" data-mmw></label>') + '</div></div></article>', 0);
    }).join('')]);
  }
  const fotos = recs.filter(r => ['fotos', 'texturas'].includes(r.cat) && esImg(r.tipo, r.url));
  if (fotos.length || m.visual) secs.push(['imagenes', completo ? 'Imágenes y estilo' : 'Estilo', (m.visual ? rv('<p class="mm-big sm">' + esc(m.visual) + '</p>') : '') +
    (fotos.length ? '<div class="mm-imgs">' + fotos.map((r, i) => rv('<figure class="mm-img"><img src="' + esc(r.url) + '" alt="' + esc(r.n) + '" loading="lazy"></figure>', (i % 3) * 90)).join('') + '</div>' : '')]);
  // Aplicaciones: la marca puesta en uso, por tipo
  const apps = CATS.filter(([k]) => !['fotos', 'texturas', 'otros'].includes(k)).map(([k, l]) => [k, l, recs.filter(r => r.cat === k)]).filter(x => x[2].length);
  if (apps.length) secs.push(['aplicaciones', 'Aplicaciones', apps.map(([k, l, xs]) => '<div class="mm-app"><h3 class="mm-h3 rv">' + esc(l) + '</h3><div class="mm-app-g g-' + k + '">' + xs.map((r, i) => rv('<figure class="mm-ap' + (/perfil|avatar/i.test(r.n) ? ' perfil' : '') + '">' +
    (esVid(r.tipo, r.url) ? '<div class="mm-ap-m vid"><video src="' + esc(r.url) + '" controls playsinline preload="metadata"></video></div>' : esImg(r.tipo, r.url) ? '<div class="mm-ap-m"><img src="' + esc(r.url) + '" alt="' + esc(r.n) + '" loading="lazy"></div>' : '<div class="mm-ap-m doc"><span>' + esc(ext(r.url) || 'ARCHIVO') + '</span></div>') +
    '<figcaption><b>' + esc(r.n) + '</b><a class="mm-dl" ' + dlAttr(r.url, r.n) + ' aria-label="Descargar ' + esc(r.n) + '">' + I.dl + '</a></figcaption></figure>', (i % 4) * 70)).join('') + '</div></div>').join('')]);
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
      (ej.length ? '<h3 class="mm-h3 rv">Así suena</h3><div class="mm-posts">' + ej.map((x, i) => rv('<div class="mm-post"><div class="mm-post-h">' + av + '<b>' + esc(String(d.nombre || '').toLowerCase().replace(/\s+/g, '')) + '</b></div><div class="mm-post-i" aria-hidden="true"><span>' + esc(String(d.nombre || '')) + '</span></div><p>' + esc(x) + (tags.length ? ' <em>' + esc(tags.slice(0, 3).join(' ')) + '</em>' : '') + '</p></div>', i * 100)).join('') + '</div>' : '')]);
  }
  const grupos = [['Logos', kit.logos.map(x => ({ ...x }))], ['Tipografías', kit.tipos.filter(t => t.url).map(t => ({ ...t, n: t.n || t.familia }))], ...CATS.map(([k, l]) => [l, recs.filter(r => r.cat === k)])].filter(g => g[1].length);
  if (grupos.length || kit.links.length) secs.push(['descargas', 'Descargas', grupos.map(([l, xs]) => '<div class="mm-dg"><span class="mm-k rv">' + esc(l) + '</span><div class="mm-files">' + xs.map((x, i) => rv('<a class="mm-file" ' + dlAttr(x.url, x.n) + '><span class="mm-fi' + (x.fondo ? ' f-' + esc(x.fondo) : '') + '">' + (esImg(x.tipo, x.url) ? '<img src="' + esc(x.url) + '" alt="" loading="lazy">' : esc(ext(x.url) || '·')) + '</span><span class="mm-fn"><b>' + esc(x.n) + '</b><small>' + esc(ext(x.url) || 'Archivo') + '</small></span>' + I.dl + '</a>', (i % 4) * 50)).join('') + '</div></div>').join('') +
    (kit.links.length ? rv('<div class="mm-links">' + kit.links.map(x => '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.n) + I.ext + '</a>').join('') + '</div>') : '')]);

  const marq = (d.nombre + '  ✦  ' + tituloDoc + '  ✦  ').repeat(6);
  const nav = secs.map(([id, t]) => '<a href="#' + id + '" data-mmnav="' + id + '">' + esc(t) + '</a>').join('');
  const orbes = [pri, sec, ...cols.filter(c => !/fondo|texto/i.test(c.rol)).map(c => c.hex)].slice(0, 3);
  return '<div class="mm' + (embed ? ' embed' : '') + '" style="' + esc(vars) + '">' + (embed ? '' : '<div class="mm-prog" aria-hidden="true"><i></i></div>' +
    '<header class="mm-top"><a class="mm-marca" href="#top">' + (d.avatar ? '<img src="' + esc(d.avatar) + '" alt="">' : '') + '<b>' + esc(d.nombre) + '</b><span>' + tituloDoc + '</span></a><nav>' + nav + '</nav></header>') +
    '<section class="mm-hero" id="top"><div class="mm-orbs" aria-hidden="true">' + orbes.map((c, i) => '<i style="--c:' + esc(c) + ';--i:' + i + '"></i>').join('') + '</div>' +
    '<div class="mm-hero-in">' + (heroLogo ? '<img class="mm-hl" src="' + esc(heroLogo.url) + '" alt="' + esc(d.nombre) + '">' : '<p class="mm-hn">' + esc(d.nombre) + '</p>') +
    '<h1 class="mm-ht" aria-label="' + tituloDoc + '">' + tituloDoc.split(' ').map((w, i) => '<span class="mm-w" style="--i:' + i + '"><span>' + esc(w) + '</span></span>').join(' ') + '</h1>' +
    (man.intro && completo ? '<p class="mm-hs">' + esc(man.intro.split(/(?<=[.!?])\s/)[0]) + '</p>' : '') + '</div>' +
    (embed ? '' : '<a class="mm-down" href="#' + (secs[0] ? secs[0][0] : 'top') + '" aria-label="Bajar">' + I.abajo + '</a>') +
    '<div class="mm-marq" aria-hidden="true"><div><span>' + esc(marq) + '</span><span>' + esc(marq) + '</span></div></div></section>' +
    (embed && secs.length ? '<nav class="mm-enav">' + nav + '</nav>' : '') +
    secs.map(([id, t, h], i) => '<section class="mm-s' + (i % 2 ? ' alt' : '') + '" id="' + id + '"><div class="mm-in"><div class="mm-sh rv"><span>' + String(i + 1).padStart(2, '0') + '</span><h2>' + esc(t) + '</h2></div>' + h + '</div></section>').join('') +
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
  mm.addEventListener('click', async e => {
    const c = e.target.closest('[data-copiar]'); if (c) { try { await navigator.clipboard.writeText(c.dataset.copiar); toast('Copiado ' + c.dataset.copiar); } catch (er) { toast(c.dataset.copiar); } c.classList.add('ok'); setTimeout(() => c.classList.remove('ok'), 700); return; }
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

export const MANUAL_CSS = `
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
.mm-hero{position:relative;min-height:100svh;background:var(--mm-p);color:var(--mm-po);display:flex;flex-direction:column;justify-content:center;overflow:hidden;isolation:isolate}
.mm.embed .mm-hero{min-height:560px}
.mm-orbs{position:absolute;inset:0;z-index:-1;pointer-events:none}
.mm-orbs i{position:absolute;border-radius:50%;background:radial-gradient(circle at 35% 35%,color-mix(in srgb,var(--c) 70%,#fff),var(--c) 60%);opacity:.38;filter:blur(2px);animation:mmFloat 22s ease-in-out infinite alternate;animation-delay:calc(var(--i) * -7s)}
.mm-orbs i:nth-child(1){width:52vmax;height:52vmax;right:-18vmax;top:-20vmax;opacity:.22;filter:blur(40px)}
.mm-orbs i:nth-child(2){width:22vmax;height:22vmax;right:8vw;bottom:14vh;opacity:1;filter:none;background:var(--c);box-shadow:inset -2.4vmax -2.4vmax 5vmax rgba(0,0,0,.14)}
.mm-orbs i:nth-child(3){width:9vmax;height:9vmax;right:30vw;top:18vh;opacity:1;filter:none;background:var(--c)}
@keyframes mmFloat{0%{transform:translate3d(0,0,0) rotate(0)}50%{transform:translate3d(-2vw,3vh,0) rotate(8deg)}100%{transform:translate3d(1.5vw,-2vh,0) rotate(-6deg)}}
.mm-hero-in{width:100%;max-width:1180px;margin:0 auto;padding:130px 40px 170px;transform:translate3d(0,calc(var(--py,0px) * .18),0);opacity:calc(1 - var(--py,0px) / 900)}
.mm-hl{display:block;max-width:min(440px,70vw);max-height:150px;object-fit:contain;object-position:left center;opacity:0;transform:translateY(20px);transition:opacity 1.1s var(--ease),transform 1.1s var(--ease)}
.mm-hn{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:30px;margin:0;opacity:0;transition:opacity 1s}
.mm-ht{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(54px,10.5vw,158px);line-height:.92;letter-spacing:-.035em;margin:44px 0 0;max-width:12ch}
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
  .mm-hero-in{padding:110px 20px 160px}.mm-ht{margin-top:30px}.mm-down{left:20px}.mm-s{padding:84px 0}.mm-sh{margin-bottom:38px}
  .mm-specs,.mm-nos,.mm-pil,.mm-posts{grid-template-columns:1fr}.mm-bars{flex-direction:column;height:auto}.mm-bar-c{min-height:96px;flex:none!important}
  .mm-tipo{padding:22px}.mm-tipo-b{grid-template-columns:1fr}.mm-aa{aspect-ratio:2/1}.mm-glyphs{grid-template-columns:repeat(7,minmax(0,1fr))}
  .mm-tipo-h{grid-template-columns:1fr}.mm-tipo-h .mm-btn{grid-column:1;grid-row:auto;justify-self:start;margin-top:10px}
  .mm-ctrl input[type=range]{width:120px}.mm-imgs{columns:2 140px;column-gap:10px}.mm-img{margin-bottom:10px;border-radius:16px}
  .mm-stage-bgs{top:12px;left:12px}.mm-stage-in{height:44vh}
}
@media (prefers-reduced-motion:reduce){.mm *,.mm *::before,.mm *::after{animation:none!important;transition:none!important}.mm .rv{opacity:1;transform:none}.mm-sh.rv h2{clip-path:none}.mm-w > span{transform:none}.mm-hl,.mm-hs,.mm-hn{opacity:1;transform:none}.mm-hero-in{transform:none;opacity:1}}
@media print{.mm-top,.mm-prog,.mm-down,.mm-marq,.mm-orbs,.mm-test,.mm-stage-bgs,.mm-toast,.mm-enav{display:none}.mm .rv{opacity:1;transform:none}.mm-sh.rv h2{clip-path:none}.mm-hero{min-height:auto;padding:60px 0}.mm-hero-in{transform:none;opacity:1}.mm-s{break-inside:avoid-page;padding:48px 0}.mm-hero,.mm-bar-c,.mm-lf,.mm-col i,.mm-s.alt,.mm-aa{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;
