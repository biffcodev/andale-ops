// Manual de marca online (en la línea de brand.linkedin.com, discord.com/branding, deezerbrand.com):
// portada a pantalla completa con la marca en movimiento, secciones que aparecen al bajar, logo con fondos y área de respeto,
// colores que se expanden y se copian, tipografías que se prueban escribiendo, voz con ejemplos y descargas.
// Dos versiones: "completo" (la marca la hicimos nosotros) y "simple" (guía con lo que nos pasó el cliente).
// Lo usan la página pública /m/<link> y "Ver como cliente" desde la app.
import { kitDeTexto } from './kitmarca.js';
import { LOGO } from './marca.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hexOk = h => /^#[0-9a-f]{6}$/i.test(h || '');
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const sobre = h => lum(h) > 0.42 ? '#141414' : '#ffffff';
const cmyk = h => { const [r, g, b] = rgb(h).map(v => v / 255), k = 1 - Math.max(r, g, b); if (k >= 1) return '0 0 0 100'; return [r, g, b].map(v => Math.round((1 - v - k) / (1 - k) * 100)).concat(Math.round(k * 100)).join(' '); };
const esImg = (tipo, url) => /^image\//.test(tipo || '') || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url || '');
const ext = u => ((String(u || '').split('?')[0].match(/\.([a-z0-9]{2,5})$/i) || [])[1] || '').toUpperCase();
// Descargar: los de Supabase con ?download=; los propios del sitio con el atributo download.
const dlAttr = (url, n) => /\/storage\/v1\/object\/public\//.test(url) ? 'href="' + esc(url + (url.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(n || '')) + '"' : 'href="' + esc(url) + '" download="' + esc(n || '') + '"';
const PESO = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
const I = {
  dl: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>',
  ext: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4.5h5.5V10"/><path d="M19.5 4.5 11 13"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg>',
  abajo: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="m6 13 6 6 6-6"/></svg>',
  copia: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></svg>',
};
const lineas = v => String(v || '').split('\n').map(x => x.replace(/^[-•·*]\s*/, '').trim()).filter(Boolean);
// "Palabras que usa": las palabras sueltas como etiquetas y las frases entre comillas como frases.
function decimos(v) {
  const t = String(v || ''), frases = [...t.matchAll(/[“"«]([^”"»]{3,120})[”"»]/g)].map(m => m[1].trim());
  const resto = t.replace(/[“"«][^”"»]*[”"»]/g, ' ').split(/[\n,;]+|\.\s+/).map(x => x.replace(/[."]+$/, '').trim()).filter(x => x && x.length < 40);
  return { palabras: [...new Set(resto)].slice(0, 18), frases: frases.slice(0, 8) };
}
// "Lo que nunca dice": una oración por punto (o un renglón por punto, si vino en lista)
const oraciones = v => { const ls = lineas(v); return (ls.length > 1 ? ls : String(v || '').split(/(?<=[.!?])\s+/)).map(x => x.trim()).filter(x => x.length > 2).slice(0, 8); };
// Para mostrar lo que no se hace con el logo, cada regla se ilustra con el logo "mal usado".
const MAL = ['transform:scaleX(1.55) scaleY(.8)', 'filter:hue-rotate(150deg) saturate(1.6)', 'transform:rotate(-14deg)', 'filter:drop-shadow(6px 8px 0 rgba(0,0,0,.55))', 'opacity:.35', 'filter:blur(1.4px)', 'transform:skewX(-18deg)'];

// Fuentes del manual: las subidas por archivo y las de Google Fonts.
export function cargarFuentesManual(kit) {
  (kit.tipos || []).forEach(t => {
    if (t.url && window.FontFace) new FontFace('mm-' + t.id, 'url(' + t.url + ')').load().then(f => document.fonts.add(f), () => {});
    else if (t.familia && !document.querySelector('link[data-mmf="' + t.familia + '"]')) { const l = document.createElement('link'); l.rel = 'stylesheet'; l.dataset.mmf = t.familia; l.href = 'https://fonts.googleapis.com/css2?family=' + encodeURIComponent(t.familia).replace(/%20/g, '+') + ':wght@300;400;500;600;700;800;900&display=swap'; document.head.appendChild(l); }
  });
}
const fam = t => t ? (t.url ? "'mm-" + t.id + "', " : '') + "'" + String(t.familia || '').replace(/'/g, '') + "', " : '';

export function manualHTML(d) {
  const m = d.marca || {}, kit = kitDeTexto(m), man = m.manual || {}, completo = man.version !== 'simple';
  const cols = kit.colores.filter(c => hexOk(c.hex));
  const priC = cols.find(c => /principal/i.test(c.rol)) || cols[0] || { hex: '#141414', n: '' }, pri = priC.hex, po = sobre(pri);
  const tinta = (cols.find(c => /texto/i.test(c.rol)) || {}).hex || '#141414', fondo = (cols.find(c => /fondo/i.test(c.rol)) || {}).hex || '#f6f5f2';
  const tit = kit.tipos.find(t => /t[ií]tulo/i.test(t.rol)) || kit.tipos[0], txt = kit.tipos.find(t => /texto/i.test(t.rol)) || kit.tipos[1] || tit;
  const vars = '--mm-p:' + pri + ';--mm-po:' + po + ';--mm-ink:' + tinta + ';--mm-bg2:' + fondo + ';--mm-fh:' + fam(tit) + 'Inter,system-ui,sans-serif;--mm-fb:' + fam(txt) + 'Inter,system-ui,sans-serif;--mm-wh:' + ((tit && tit.peso) || 800);
  const imgL = kit.logos.filter(l => esImg(l.tipo, l.url));
  const logoPara = bg => imgL.find(l => (l.fondo || 'claro') === bg) || (bg === 'marca' ? imgL.find(l => l.fondo === 'oscuro') : bg === 'oscuro' ? imgL.find(l => l.fondo === 'marca') : null) || imgL[0];
  const heroLogo = po === '#ffffff' ? (imgL.find(l => l.fondo === 'marca') || imgL.find(l => l.fondo === 'oscuro')) : (imgL.find(l => l.fondo === 'marca') || imgL.find(l => (l.fondo || 'claro') === 'claro'));
  const tituloDoc = completo ? 'Manual de marca' : 'Guía de marca';
  const rv = (h, cls, delay) => '<div class="rv' + (cls ? ' ' + cls : '') + '"' + (delay ? ' style="--d:' + delay + 'ms"' : '') + '>' + h + '</div>';
  const secs = [];

  // Esencia
  if (completo && (man.intro || m.rubro || m.publico)) {
    secs.push(['esencia', 'Esencia', (man.intro ? rv('<p class="mm-big">' + esc(man.intro) + '</p>') : '') +
      '<div class="mm-duo">' + (m.rubro ? rv('<div class="mm-card"><span class="mm-k">Qué hacemos</span><p>' + esc(m.rubro) + '</p></div>', '', 0) : '') + (m.publico ? rv('<div class="mm-card"><span class="mm-k">Para quién</span><p>' + esc(m.publico) + '</p></div>', '', 120) : '') + '</div>']);
  }
  // Logo
  if (kit.logos.length) {
    const stage = imgL.length ? '<div class="mm-stage" data-bg="' + esc(logoPara('claro') === imgL[0] ? 'claro' : 'claro') + '">' +
      '<div class="mm-stage-bgs" role="group" aria-label="Fondo">' + [['claro', 'Claro'], ['oscuro', 'Oscuro'], ['marca', 'Color']].map(([k, l], i) => '<button data-mmbg="' + k + '"' + (i === 0 ? ' class="on"' : '') + '>' + l + '</button>').join('') + (man.respeto ? '<button data-mmresp class="mm-resp-b">Área de respeto</button>' : '') + '</div>' +
      '<div class="mm-stage-in">' + ['claro', 'oscuro', 'marca'].map(k => '<img class="mm-sl" data-for="' + k + '" src="' + esc(logoPara(k).url) + '" alt="' + esc(d.nombre) + '">').join('') + '<span class="mm-safe" aria-hidden="true"><i></i><i></i><i></i><i></i></span></div>' +
      (man.respeto ? '<p class="mm-stage-n">' + esc(man.respeto) + '</p>' : '') + '</div>' : '';
    const variantes = '<div class="mm-logos">' + kit.logos.map((l, i) => rv('<figure class="mm-logo"><div class="mm-lf f-' + esc(l.fondo || 'claro') + '">' + (esImg(l.tipo, l.url) ? '<img src="' + esc(l.url) + '" alt="' + esc(l.n) + '" loading="lazy">' : '<span class="mm-ext">' + esc(ext(l.url) || 'ARCHIVO') + '</span>') + '</div><figcaption><b>' + esc(l.n) + '</b><a class="mm-dl" ' + dlAttr(l.url, l.n) + '>' + I.dl + '</a></figcaption></figure>', '', i * 80)).join('') + '</div>';
    const reglas = [man.minimo ? ['Tamaño mínimo', man.minimo] : null].filter(Boolean);
    const nos = lineas(man.no), base = logoPara('claro');
    secs.push(['logo', 'Logo', (stage ? rv(stage) : '') + variantes +
      (reglas.length ? '<div class="mm-duo">' + reglas.map(([t, v]) => rv('<div class="mm-card"><span class="mm-k">' + t + '</span><p>' + esc(v) + '</p></div>')).join('') + '</div>' : '') +
      (nos.length ? '<h3 class="mm-h3 rv">Lo que no hacemos con el logo</h3><div class="mm-nos">' + nos.map((x, i) => rv('<div class="mm-no">' + (base ? '<div class="mm-no-v"><img src="' + esc(base.url) + '" alt="" style="' + MAL[i % MAL.length] + '"><span class="mm-x" aria-hidden="true"></span></div>' : '') + '<p>' + esc(x) + '</p></div>', '', i * 70)).join('') + '</div>' : '')]);
  }
  // Color
  if (cols.length) {
    const peso = c => /principal/i.test(c.rol) ? 3 : /fondo|texto/i.test(c.rol) ? 1.4 : 1.8;
    secs.push(['color', 'Color', rv('<div class="mm-bars">' + cols.map(c => '<button class="mm-bar-c" style="--c:' + esc(c.hex) + ';--co:' + sobre(c.hex) + ';--g:' + peso(c) + '" data-copiar="' + esc(c.hex) + '" title="Copiar ' + esc(c.hex) + '"><span class="mm-bar-r">' + esc(c.rol || '') + '</span><span class="mm-bar-n">' + esc(c.n || c.hex) + '</span><span class="mm-bar-h">' + esc(c.hex) + ' ' + I.copia + '</span></button>').join('') + '</div>') +
      '<div class="mm-cols">' + cols.map((c, i) => { const [r, g, b] = rgb(c.hex);
        return rv('<div class="mm-col"><i style="background:' + esc(c.hex) + '"></i><div><b>' + esc(c.n || c.hex) + '</b>' + (c.rol ? '<span class="mm-k">' + esc(c.rol) + '</span>' : '') + '</div><dl>' +
          [['HEX', c.hex], ['RGB', r + ' ' + g + ' ' + b], ['CMYK', cmyk(c.hex)], c.pantone ? ['Pantone', c.pantone] : null].filter(Boolean).map(([k, v]) => '<button data-copiar="' + esc(v) + '"><dt>' + k + '</dt><dd>' + esc(v) + '</dd></button>').join('') + '</dl></div>', '', i * 60); }).join('') + '</div>']);
  }
  // Tipografía
  if (kit.tipos.length) {
    secs.push(['tipografia', 'Tipografía', kit.tipos.map((t, i) => { const w = t.peso || (i === 0 ? 800 : 400);
      return rv('<div class="mm-tipo" style="--tf:' + esc(fam(t)) + 'Inter,system-ui,sans-serif;--tw:' + esc(w) + '"><div class="mm-tipo-i"><span class="mm-k">' + esc(t.rol || 'Tipografía') + '</span><b>' + esc(t.familia) + '</b><small>' + esc(PESO[w] || 'Regular') + '</small>' +
        (t.url ? '<a class="mm-dl txt" ' + dlAttr(t.url, t.n || t.familia) + '>' + I.dl + 'Descargar</a>' : '<a class="mm-dl txt" href="https://fonts.google.com/specimen/' + esc(String(t.familia || '').replace(/ /g, '+')) + '" target="_blank" rel="noopener">' + I.ext + 'Google Fonts</a>') + '</div>' +
        '<div class="mm-tipo-s"><div class="mm-aa" aria-hidden="true">Aa</div><div class="mm-glyphs" aria-hidden="true">' + 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZabcdefghijklmnñopqrstuvwxyz0123456789&@¿?¡!'.split('').map(ch => '<span>' + esc(ch) + '</span>').join('') + '</div></div>' +
        '<div class="mm-tester"><input type="text" value="' + esc(i === 0 ? d.nombre : 'Escribí acá para probar la tipografía') + '" aria-label="Probá la tipografía" data-mmtest><label>Peso<input type="range" min="300" max="900" step="100" value="' + esc(w) + '" data-mmw aria-label="Peso"></label></div>' +
        '<p class="mm-try" data-mmout>' + esc(i === 0 ? d.nombre : 'Escribí acá para probar la tipografía') + '</p></div>', '', 0); }).join('')]);
  }
  // Imágenes y estilo
  const imgs = kit.recursos.filter(r => esImg(r.tipo, r.url));
  if (imgs.length || m.visual) secs.push(['imagenes', completo ? 'Imágenes y estilo' : 'Estilo', (m.visual ? rv('<p class="mm-big sm">' + esc(m.visual) + '</p>') : '') +
    (imgs.length ? '<div class="mm-imgs">' + imgs.map((r, i) => rv('<figure class="mm-img' + (i % 5 === 0 ? ' w' : '') + '"><img src="' + esc(r.url) + '" alt="' + esc(r.n) + '" loading="lazy"></figure>', '', (i % 4) * 80)).join('') + '</div>' : '')]);
  // Voz
  if (completo && (m.tono || m.palabras_si || m.palabras_no || m.ejemplos)) {
    const ds = decimos(m.palabras_si), no = oraciones(m.palabras_no), pil = lineas(m.pilares).map(x => { const [a, ...b] = x.split(':'); return [a.trim(), b.join(':').trim()]; });
    const ej = lineas(m.ejemplos).slice(0, 3), av = d.avatar ? '<img src="' + esc(d.avatar) + '" alt="">' : '<i>' + esc(String(d.nombre || '?').slice(0, 2)) + '</i>';
    const tags = String(m.hashtags || '').match(/#[\wÀ-ÿ]+/g) || [];
    secs.push(['voz', 'Voz', (m.tono ? rv('<p class="mm-big sm">' + esc(m.tono) + '</p>') : '') +
      ([m.trato, m.emojis].filter(Boolean).length ? rv('<div class="mm-facts">' + (m.trato ? '<span><b>Tratamos de</b> ' + esc(m.trato.toLowerCase()) + '</span>' : '') + (m.emojis ? '<span><b>Emojis</b> ' + esc(m.emojis.toLowerCase()) + '</span>' : '') + '</div>') : '') +
      ((ds.palabras.length || ds.frases.length || no.length) ? '<div class="mm-duo mm-sino">' +
        ((ds.palabras.length || ds.frases.length) ? rv('<div class="si"><span class="mm-k">Decimos</span>' + (ds.palabras.length ? '<div class="mm-pills">' + ds.palabras.map(x => '<span>' + esc(x) + '</span>').join('') + '</div>' : '') + (ds.frases.length ? '<ul class="mm-frases">' + ds.frases.map(x => '<li>“' + esc(x) + '”</li>').join('') + '</ul>' : '') + '</div>') : '') +
        (no.length ? rv('<div class="no"><span class="mm-k">No decimos ni hacemos</span><ul>' + no.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>', '', 120) : '') + '</div>' : '') +
      (pil.length ? '<h3 class="mm-h3 rv">De qué hablamos</h3><div class="mm-pil">' + pil.map(([a, b], i) => rv('<div><span>' + String(i + 1).padStart(2, '0') + '</span><b>' + esc(a) + '</b>' + (b ? '<p>' + esc(b) + '</p>' : '') + '</div>', '', i * 60)).join('') + '</div>' : '') +
      (ej.length ? '<h3 class="mm-h3 rv">Así suena</h3><div class="mm-posts">' + ej.map((x, i) => rv('<div class="mm-post"><div class="mm-post-h">' + av + '<b>' + esc(String(d.nombre || '').toLowerCase().replace(/\s+/g, '')) + '</b></div><div class="mm-post-i" aria-hidden="true"><span>' + esc(String(d.nombre || '')) + '</span></div><p>' + esc(x) + (tags.length ? ' <em>' + esc(tags.slice(0, 3).join(' ')) + '</em>' : '') + '</p></div>', '', i * 100)).join('') + '</div>' : '')]);
  }
  // Descargas
  const archivos = [...kit.logos.map(x => ['Logo', x]), ...kit.tipos.filter(t => t.url).map(t => ['Tipografía', { ...t, n: t.n || t.familia }]), ...kit.recursos.map(x => ['Archivo', x])];
  if (archivos.length || kit.links.length) secs.push(['descargas', 'Descargas', (archivos.length ? '<div class="mm-files">' + archivos.map(([k, x], i) => rv('<a class="mm-file" ' + dlAttr(x.url, x.n) + '><span class="mm-fi' + (k === 'Logo' ? ' f-' + esc(x.fondo || 'claro') : '') + '">' + (esImg(x.tipo, x.url) ? '<img src="' + esc(x.url) + '" alt="" loading="lazy">' : esc(ext(x.url) || '·')) + '</span><span><b>' + esc(x.n) + '</b><small>' + k + (ext(x.url) ? ' · ' + ext(x.url) : '') + '</small></span>' + I.dl + '</a>', '', (i % 6) * 50)).join('') + '</div>' : '') +
    (kit.links.length ? rv('<div class="mm-links">' + kit.links.map(x => '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.n) + I.ext + '</a>').join('') + '</div>') : '')]);

  const marq = (d.nombre + ' · ' + tituloDoc + ' · ').repeat(6);
  const nav = secs.map(([id, t]) => '<a href="#' + id + '" data-mmnav="' + id + '">' + esc(t) + '</a>').join('');
  return '<div class="mm" style="' + esc(vars) + '"><div class="mm-prog" aria-hidden="true"><i></i></div>' +
    '<header class="mm-top"><a class="mm-marca" href="#top">' + (d.avatar ? '<img src="' + esc(d.avatar) + '" alt="">' : '') + '<b>' + esc(d.nombre) + '</b><span>' + tituloDoc + '</span></a><nav>' + nav + '</nav></header>' +
    '<section class="mm-hero" id="top"><div class="mm-blobs" aria-hidden="true">' + (cols.length ? cols : [{ hex: pri }]).slice(0, 4).map((c, i) => '<i style="--c:' + esc(c.hex) + ';--i:' + i + '"></i>').join('') + '</div>' +
    '<div class="mm-hero-in">' + (heroLogo ? '<img class="mm-hl" src="' + esc(heroLogo.url) + '" alt="' + esc(d.nombre) + '">' : '<p class="mm-hn">' + esc(d.nombre) + '</p>') +
    '<h1 class="mm-ht" aria-label="' + tituloDoc + '">' + tituloDoc.split(' ').map((w, i) => '<span style="--i:' + i + '"><span>' + esc(w) + '</span></span>').join(' ') + '</h1>' +
    (man.intro && completo ? '<p class="mm-hs">' + esc(man.intro.split(/(?<=[.!?])\s/)[0]) + '</p>' : '') + '</div>' +
    '<a class="mm-down" href="#' + (secs[0] ? secs[0][0] : 'top') + '" aria-label="Bajar">' + I.abajo + '</a>' +
    '<div class="mm-marq" aria-hidden="true"><div><span>' + esc(marq) + '</span><span>' + esc(marq) + '</span></div></div></section>' +
    secs.map(([id, t, h], i) => '<section class="mm-s' + (i % 2 ? ' alt' : '') + '" id="' + id + '"><div class="mm-in"><div class="mm-sh rv"><span>' + String(i + 1).padStart(2, '0') + '</span><h2>' + esc(t) + '</h2></div>' + h + '</div></section>').join('') +
    (secs.length ? '' : '<section class="mm-s"><div class="mm-in"><p class="mm-big sm">Este manual todavía no tiene contenido.</p></div></section>') +
    '<footer class="mm-pie"><div class="mm-in"><p class="mm-pie-t rv">' + esc(d.nombre) + '</p><div class="mm-pie-b"><span>' + (completo ? 'Marca diseñada por' : 'Guía preparada por') + '</span><a href="https://weareandale.com" target="_blank" rel="noopener" class="mm-andale" aria-label="àndale">' + LOGO + '</a></div></div></footer>' +
    '<div class="mm-toast" role="status" aria-live="polite"></div></div>';
}

// Interacción: aparecer al bajar, menú activo, barra de progreso, fondos del logo, área de respeto, probar tipografía y copiar.
export function activarManual(root, scroller) {
  const mm = root.querySelector('.mm'); if (!mm) return;
  const sc = scroller || window, scEl = scroller || document.documentElement;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rvs = mm.querySelectorAll('.rv');
  if (reduce || !('IntersectionObserver' in window)) rvs.forEach(x => x.classList.add('in'));
  else { const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { root: scroller || null, rootMargin: '0px 0px -8% 0px', threshold: 0.08 }); rvs.forEach(x => io.observe(x)); }
  requestAnimationFrame(() => mm.classList.add('listo'));
  const bar = mm.querySelector('.mm-prog i'), top = mm.querySelector('.mm-top'), hero = mm.querySelector('.mm-hero'), links = [...mm.querySelectorAll('[data-mmnav]')], secs = links.map(a => mm.querySelector('#' + a.dataset.mmnav)).filter(Boolean);
  const onScroll = () => {
    const y = scroller ? scroller.scrollTop : window.scrollY, h = scEl.scrollHeight - (scroller ? scroller.clientHeight : window.innerHeight);
    if (bar) bar.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
    if (top && hero) top.classList.toggle('solido', y > hero.offsetHeight - 70);
    let act = ''; secs.forEach(s => { if (s.offsetTop - 120 <= y) act = s.id; });
    links.forEach(a => a.classList.toggle('on', a.dataset.mmnav === act));
    if (hero && !reduce) hero.style.setProperty('--py', Math.min(y, 900) * 0.25 + 'px');
  };
  sc.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  const toast = t => { const el = mm.querySelector('.mm-toast'); if (!el) return; el.textContent = t; el.classList.add('on'); clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove('on'), 1500); };
  mm.addEventListener('click', async e => {
    const c = e.target.closest('[data-copiar]'); if (c) { try { await navigator.clipboard.writeText(c.dataset.copiar); toast('Copiado ' + c.dataset.copiar); } catch (er) { toast(c.dataset.copiar); } return; }
    const b = e.target.closest('[data-mmbg]'); if (b) { const st = b.closest('.mm-stage'); st.dataset.bg = b.dataset.mmbg; st.querySelectorAll('[data-mmbg]').forEach(x => x.classList.toggle('on', x === b)); return; }
    const r = e.target.closest('[data-mmresp]'); if (r) { const st = r.closest('.mm-stage'); st.classList.toggle('resp'); r.classList.toggle('on'); return; }
    const a = e.target.closest('a[href^="#"]'); if (a && scroller) { const t = mm.querySelector(a.getAttribute('href')); if (t) { e.preventDefault(); scroller.scrollTo({ top: t.offsetTop - 56, behavior: reduce ? 'auto' : 'smooth' }); } }
  });
  mm.addEventListener('input', e => {
    const t = e.target, card = t.closest('.mm-tipo'); if (!card) return;
    if (t.matches('[data-mmtest]')) card.querySelector('[data-mmout]').textContent = t.value || ' ';
    if (t.matches('[data-mmw]')) card.style.setProperty('--tw', t.value);
  });
}

export const MANUAL_CSS = `
.mm{--mm-soft:color-mix(in srgb,var(--mm-ink) 62%,#fff);--mm-line:color-mix(in srgb,var(--mm-ink) 12%,#fff);--ease:cubic-bezier(.2,.7,.2,1);font-family:var(--mm-fb);color:var(--mm-ink);background:#fff;min-height:100vh;overflow-x:clip}
.mm *{box-sizing:border-box}
.mm-in{max-width:1180px;margin:0 auto;padding:0 32px}
.mm-k{display:block;font-family:Inter,system-ui,sans-serif;font-size:11.5px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--mm-soft);margin-bottom:8px}
/* Progreso y barra superior */
.mm-prog{position:fixed;top:0;left:0;right:0;height:3px;z-index:30;pointer-events:none}
.mm-prog i{display:block;height:100%;background:var(--mm-po);transform-origin:0 0;transform:scaleX(0);mix-blend-mode:difference}
.mm-top{position:fixed;top:0;left:0;right:0;z-index:20;display:flex;align-items:center;gap:20px;padding:14px 32px;color:var(--mm-po);transition:background .35s var(--ease),color .35s,box-shadow .35s}
.mm-top.solido{background:rgba(255,255,255,.86);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);color:var(--mm-ink);box-shadow:0 1px 0 var(--mm-line)}
.mm-marca{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;flex:none}
.mm-marca img{width:30px;height:30px;border-radius:9px;object-fit:cover}
.mm-marca b{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:16px;letter-spacing:-.01em}
.mm-marca span{opacity:.7;font-size:13px}
.mm-top nav{display:flex;gap:2px;overflow-x:auto;margin-left:auto;scrollbar-width:none}
.mm-top nav::-webkit-scrollbar{display:none}
.mm-top nav a{color:inherit;opacity:.72;text-decoration:none;font-size:14px;font-weight:500;padding:7px 12px;border-radius:99px;white-space:nowrap;transition:opacity .2s,background .2s}
.mm-top nav a:hover{opacity:1}
.mm-top nav a.on{opacity:1;background:color-mix(in srgb,currentColor 12%,transparent)}
/* Portada */
.mm-hero{position:relative;min-height:100svh;background:var(--mm-p);color:var(--mm-po);display:grid;align-items:center;overflow:hidden;isolation:isolate}
.mm-blobs{position:absolute;inset:-20%;z-index:-1;filter:blur(60px);opacity:.75;transform:translateY(calc(var(--py,0px) * -1))}
.mm-blobs i{position:absolute;width:46vmax;height:46vmax;border-radius:50%;background:var(--c);mix-blend-mode:screen;opacity:.55;animation:mmBlob 18s ease-in-out infinite alternate;animation-delay:calc(var(--i) * -4s)}
.mm-blobs i:nth-child(1){left:-6%;top:8%;mix-blend-mode:normal;opacity:.35}.mm-blobs i:nth-child(2){right:-10%;top:-10%}.mm-blobs i:nth-child(3){left:30%;bottom:-24%}.mm-blobs i:nth-child(4){right:6%;bottom:4%;width:30vmax;height:30vmax}
@keyframes mmBlob{0%{transform:translate(0,0) scale(1)}50%{transform:translate(6%,-8%) scale(1.12)}100%{transform:translate(-8%,6%) scale(.92)}}
.mm-hero-in{max-width:1180px;width:100%;margin:0 auto;padding:120px 32px 160px;transform:translateY(calc(var(--py,0px) * .4))}
.mm-hl{display:block;max-width:min(460px,72vw);max-height:180px;object-fit:contain;object-position:left;opacity:0;transform:translateY(24px);transition:opacity .9s var(--ease),transform .9s var(--ease)}
.mm-hn{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:28px;margin:0;opacity:0;transition:opacity .9s}
.mm-ht{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(56px,11vw,168px);line-height:.9;letter-spacing:-.045em;margin:48px 0 0}
.mm-ht > span{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.06em}
.mm-ht > span > span{display:inline-block;transform:translateY(105%);transition:transform 1.1s var(--ease);transition-delay:calc(200ms + var(--i) * 120ms)}
.mm-hs{max-width:620px;font-size:clamp(18px,1.8vw,22px);line-height:1.45;margin:28px 0 0;opacity:0;transform:translateY(16px);transition:opacity 1s var(--ease) .6s,transform 1s var(--ease) .6s}
.mm.listo .mm-hl,.mm.listo .mm-hn,.mm.listo .mm-hs{opacity:1;transform:none}.mm.listo .mm-hs{opacity:.85}
.mm.listo .mm-ht > span > span{transform:none}
.mm-down{position:absolute;left:50%;bottom:86px;translate:-50% 0;color:inherit;width:46px;height:46px;border-radius:50%;display:grid;place-items:center;border:1.5px solid color-mix(in srgb,currentColor 40%,transparent);animation:mmBounce 2.2s ease-in-out infinite}
@keyframes mmBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(8px)}}
.mm-marq{position:absolute;left:0;right:0;bottom:0;padding:14px 0;border-top:1px solid color-mix(in srgb,currentColor 22%,transparent);overflow:hidden;white-space:nowrap;font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:15px;letter-spacing:.02em;text-transform:uppercase}
.mm-marq > div{display:inline-flex;animation:mmMarq 40s linear infinite}
.mm-marq span{padding-right:0}
@keyframes mmMarq{to{transform:translateX(-50%)}}
/* Secciones */
.mm-s{padding:120px 0;scroll-margin-top:60px}
.mm-s.alt{background:var(--mm-bg2)}
.mm-sh{display:flex;align-items:flex-start;gap:18px;margin-bottom:56px}
.mm-sh span{font-family:var(--mm-fh);color:var(--mm-p);font-weight:var(--mm-wh);font-size:20px;font-variant-numeric:tabular-nums;padding-top:.5em}
.mm-sh h2{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(46px,7.5vw,104px);letter-spacing:-.04em;line-height:.92;margin:0}
.mm-h3{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(24px,2.6vw,32px);letter-spacing:-.02em;margin:72px 0 22px}
.mm-big{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(28px,3.8vw,52px);line-height:1.08;letter-spacing:-.025em;margin:0 0 56px;max-width:1000px}
.mm-big.sm{font-family:var(--mm-fb);font-weight:400;font-size:clamp(20px,2.2vw,28px);line-height:1.38;letter-spacing:-.01em;white-space:pre-line}
.mm-duo{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:20px}
.mm-card{background:#fff;border-radius:22px;padding:28px 30px;box-shadow:0 1px 0 var(--mm-line),0 20px 40px -30px rgba(0,0,0,.25);height:100%}
.mm-s:not(.alt) .mm-card{background:var(--mm-bg2);box-shadow:none}
.mm-card p{margin:0;font-size:17px;line-height:1.55}
/* Aparecer al bajar */
.rv{opacity:0;transform:translateY(34px);transition:opacity .9s var(--ease),transform .9s var(--ease);transition-delay:var(--d,0ms)}
.rv.in{opacity:1;transform:none}
.mm-sh.rv h2{clip-path:inset(0 100% 0 0);transition:clip-path 1.1s var(--ease) .1s}
.mm-sh.rv.in h2{clip-path:inset(0 0 0 0)}
/* Logo: escenario con fondos y área de respeto */
.mm-stage{position:relative;border-radius:28px;overflow:hidden;background:#f3f2ef;transition:background .6s var(--ease);margin-bottom:22px}
.mm-stage[data-bg="oscuro"]{background:#121212}.mm-stage[data-bg="marca"]{background:var(--mm-p)}
.mm-stage-bgs{position:absolute;top:18px;left:18px;z-index:2;display:flex;gap:4px;background:rgba(255,255,255,.75);backdrop-filter:blur(8px);border-radius:99px;padding:4px;flex-wrap:wrap}
.mm-stage-bgs button{all:unset;cursor:pointer;font:600 13px Inter,system-ui,sans-serif;color:#222;padding:7px 13px;border-radius:99px;transition:background .2s}
.mm-stage-bgs button.on{background:#141414;color:#fff}
.mm-stage-bgs .mm-resp-b{margin-left:4px;border-left:1px solid rgba(0,0,0,.12);border-radius:0 99px 99px 0}
.mm-stage-in{position:relative;height:min(62vh,520px);display:grid;place-items:center}
.mm-sl{grid-area:1/1;max-width:min(560px,70%);max-height:46%;object-fit:contain;opacity:0;transform:scale(.96);transition:opacity .5s var(--ease),transform .7s var(--ease)}
.mm-stage[data-bg="claro"] .mm-sl[data-for="claro"],.mm-stage[data-bg="oscuro"] .mm-sl[data-for="oscuro"],.mm-stage[data-bg="marca"] .mm-sl[data-for="marca"]{opacity:1;transform:none}
.mm-safe{position:absolute;inset:27% 14%;border:1.5px dashed currentColor;color:var(--mm-p);border-radius:6px;opacity:0;transform:scale(1.08);transition:opacity .4s,transform .6s var(--ease);pointer-events:none}
.mm-stage[data-bg="marca"] .mm-safe{color:var(--mm-po)}.mm-stage[data-bg="oscuro"] .mm-safe{color:#fff}
.mm-stage.resp .mm-safe{opacity:.9;transform:none}
.mm-safe i{position:absolute;width:14px;height:14px;border:2px solid currentColor;border-radius:3px}
.mm-safe i:nth-child(1){left:-8px;top:-8px}.mm-safe i:nth-child(2){right:-8px;top:-8px}.mm-safe i:nth-child(3){left:-8px;bottom:-8px}.mm-safe i:nth-child(4){right:-8px;bottom:-8px}
.mm-stage-n{position:absolute;left:18px;bottom:16px;margin:0;font:500 13px Inter,system-ui,sans-serif;color:#555;background:rgba(255,255,255,.8);padding:6px 12px;border-radius:99px;opacity:0;transition:opacity .4s}
.mm-stage.resp .mm-stage-n{opacity:1}
.mm-logos{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:18px}
.mm-logo{margin:0}
.mm-lf{aspect-ratio:4/3;border-radius:20px;display:grid;place-items:center;padding:34px;transition:transform .5s var(--ease),box-shadow .5s}
.mm-logo:hover .mm-lf{transform:translateY(-4px);box-shadow:0 24px 40px -28px rgba(0,0,0,.45)}
.mm-lf.f-claro{background:#f3f2ef}.mm-lf.f-oscuro{background:#121212}.mm-lf.f-marca{background:var(--mm-p)}
.mm-s.alt .mm-lf.f-claro{background:#fff}
.mm-lf img{max-width:100%;max-height:100%;object-fit:contain}
.mm-ext{font-weight:800;letter-spacing:.08em;color:#9a9aa0}
.mm-logo figcaption{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 4px 0;font-size:15px}
.mm-dl{display:inline-grid;place-items:center;width:36px;height:36px;border-radius:50%;border:1px solid var(--mm-line);color:var(--mm-ink);text-decoration:none;transition:background .2s,color .2s,border-color .2s}
.mm-dl:hover{background:var(--mm-ink);color:#fff;border-color:var(--mm-ink)}
.mm-dl.txt{display:inline-flex;width:auto;height:auto;gap:7px;padding:8px 14px;border-radius:99px;font:600 13.5px Inter,system-ui,sans-serif}
.mm-nos{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px}
.mm-no{background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 1px 0 var(--mm-line)}
.mm-s:not(.alt) .mm-no{background:var(--mm-bg2)}
.mm-no-v{position:relative;aspect-ratio:16/10;display:grid;place-items:center;padding:28px;background:#f3f2ef;overflow:hidden}
.mm-no-v img{max-width:70%;max-height:70%;object-fit:contain}
.mm-x{position:absolute;inset:0}
.mm-x::before,.mm-x::after{content:"";position:absolute;left:50%;top:50%;width:62%;height:3px;background:#E5484D;border-radius:3px;transform:translate(-50%,-50%) rotate(-20deg) scaleX(0);transition:transform .6s var(--ease) .3s}
.mm-x::after{transform:translate(-50%,-50%) rotate(20deg) scaleX(0);transition-delay:.45s}
.rv.in .mm-x::before{transform:translate(-50%,-50%) rotate(-20deg) scaleX(1)}.rv.in .mm-x::after{transform:translate(-50%,-50%) rotate(20deg) scaleX(1)}
.mm-no p{margin:0;padding:16px 18px 18px;font-size:15.5px;line-height:1.4}
/* Color */
.mm-bars{display:flex;gap:10px;height:min(56vh,460px)}
.mm-bar-c{all:unset;box-sizing:border-box;cursor:pointer;flex:var(--g) 1 0;min-width:0;background:var(--c);color:var(--co);border-radius:24px;padding:22px;display:flex;flex-direction:column;transition:flex-grow .7s var(--ease),transform .3s;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06);overflow:hidden}
.mm-bars:hover .mm-bar-c{flex-grow:calc(var(--g) * .7)}
.mm-bars .mm-bar-c:hover{flex-grow:calc(var(--g) * 2.2)}
.mm-bar-r{font:700 11px Inter,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;opacity:.75}
.mm-bar-n{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(18px,2.2vw,30px);line-height:1.05;margin-top:6px;letter-spacing:-.02em}
.mm-bar-h{margin-top:auto;display:flex;align-items:center;gap:6px;font:600 14px Inter,system-ui,sans-serif;font-variant-numeric:tabular-nums;white-space:nowrap}
.mm-bar-h svg{opacity:0;transition:opacity .2s}.mm-bar-c:hover .mm-bar-h svg{opacity:1}
.mm-cols{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px;margin-top:22px}
.mm-col{background:#fff;border-radius:20px;padding:18px;display:grid;grid-template-columns:52px 1fr;gap:4px 14px;align-items:center;box-shadow:0 1px 0 var(--mm-line)}
.mm-s:not(.alt) .mm-col{background:var(--mm-bg2);box-shadow:none}
.mm-col > i{width:52px;height:52px;border-radius:14px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)}
.mm-col b{font-size:16px}.mm-col .mm-k{margin:2px 0 0}
.mm-col dl{grid-column:1/-1;margin:8px 0 0;display:grid;gap:2px}
.mm-col dl button{all:unset;cursor:pointer;display:flex;justify-content:space-between;gap:10px;padding:6px 8px;border-radius:8px;font:500 13.5px Inter,system-ui,sans-serif;font-variant-numeric:tabular-nums}
.mm-col dl button:hover{background:color-mix(in srgb,var(--mm-ink) 6%,transparent)}
.mm-col dt{color:var(--mm-soft);font-weight:600}.mm-col dd{margin:0}
/* Tipografía */
.mm-tipo{display:grid;grid-template-columns:240px 1fr;gap:12px 48px;padding:48px 0;border-top:1px solid var(--mm-line)}
.mm-tipo:first-of-type{border-top:0;padding-top:0}
.mm-tipo-i{display:flex;flex-direction:column;align-items:flex-start;gap:4px;font-family:Inter,system-ui,sans-serif}
.mm-tipo-i b{font-size:24px;letter-spacing:-.01em}.mm-tipo-i small{color:var(--mm-soft);margin-bottom:14px}
.mm-tipo-s{display:grid;grid-template-columns:auto 1fr;gap:36px;align-items:center;font-family:var(--tf);font-weight:var(--tw);min-width:0}
.mm-aa{font-size:clamp(110px,15vw,220px);line-height:.85;letter-spacing:-.04em;transition:font-weight .3s}
.mm-glyphs{display:grid;grid-template-columns:repeat(auto-fill,minmax(38px,1fr));gap:4px;font-size:24px}
.mm-glyphs span{display:grid;place-items:center;aspect-ratio:1;border-radius:10px;transition:background .2s,color .2s,transform .2s}
.mm-glyphs span:hover{background:var(--mm-p);color:var(--mm-po);transform:scale(1.25)}
.mm-tester{grid-column:2;display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:22px}
.mm-tester input[type=text]{flex:1;min-width:200px;border:1px solid var(--mm-line);border-radius:99px;padding:11px 18px;font:15px Inter,system-ui,sans-serif;background:#fff;color:var(--mm-ink)}
.mm-tester input[type=text]:focus{outline:none;border-color:var(--mm-p);box-shadow:0 0 0 4px color-mix(in srgb,var(--mm-p) 18%,transparent)}
.mm-tester label{display:flex;gap:10px;align-items:center;font:600 13px Inter,system-ui,sans-serif;color:var(--mm-soft)}
.mm-tester input[type=range]{accent-color:var(--mm-p);width:150px}
.mm-try{grid-column:2;margin:12px 0 0;font-family:var(--tf);font-weight:var(--tw);font-size:clamp(34px,5vw,72px);line-height:1.02;letter-spacing:-.02em;word-break:break-word;transition:font-weight .3s}
/* Imágenes */
.mm-imgs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-auto-rows:220px;gap:14px}
.mm-img{margin:0;border-radius:20px;overflow:hidden;background:#eee}
.mm-img.w{grid-column:span 2;grid-row:span 2}
.mm-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform 1.2s var(--ease)}
.mm-img:hover img{transform:scale(1.06)}
/* Voz */
.mm-facts{display:flex;flex-wrap:wrap;gap:10px;margin:-30px 0 34px}
.mm-facts span{background:#fff;border-radius:99px;padding:9px 16px;font-size:15px;box-shadow:0 1px 0 var(--mm-line)}
.mm-facts b{color:var(--mm-soft);font-weight:600;margin-right:4px}
.mm-sino > div > div{height:100%;border-radius:22px;padding:28px 30px}
.mm-sino .si{background:color-mix(in srgb,#2e9d4f 9%,#fff)}
.mm-sino .no{background:color-mix(in srgb,#E5484D 8%,#fff)}
.mm-pills{display:flex;flex-wrap:wrap;gap:8px}
.mm-pills span{background:#fff;border-radius:99px;padding:7px 14px;font-weight:600;font-size:14.5px}
.mm-frases{list-style:none;padding:0;margin:18px 0 0;display:grid;gap:8px}
.mm-frases li{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(18px,1.8vw,22px);letter-spacing:-.01em}
.mm-sino .no ul{margin:0;padding-left:20px;display:grid;gap:10px;font-size:16px;line-height:1.5}
.mm-pil{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.mm-pil > div > div{height:100%;background:#fff;border-radius:20px;padding:22px 24px;box-shadow:0 1px 0 var(--mm-line);transition:transform .4s var(--ease)}
.mm-pil > div > div:hover{transform:translateY(-4px)}
.mm-pil span{font-family:var(--mm-fh);font-weight:var(--mm-wh);color:var(--mm-p);font-size:15px}
.mm-pil b{display:block;font-size:18px;margin:6px 0 4px}
.mm-pil p{margin:0;color:var(--mm-soft);font-size:14.5px;line-height:1.45}
.mm-posts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
.mm-post{background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 1px 0 var(--mm-line),0 24px 40px -32px rgba(0,0,0,.35)}
.mm-post-h{display:flex;align-items:center;gap:10px;padding:12px 14px;font:600 14px Inter,system-ui,sans-serif}
.mm-post-h img,.mm-post-h i{width:30px;height:30px;border-radius:50%;object-fit:cover;background:var(--mm-p);color:var(--mm-po);display:grid;place-items:center;font-style:normal;font-size:11px}
.mm-post-i{aspect-ratio:1;background:var(--mm-p);color:var(--mm-po);display:grid;place-items:center;font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:30px;letter-spacing:-.02em;position:relative;overflow:hidden}
.mm-post-i::before{content:"";position:absolute;width:70%;aspect-ratio:1;border-radius:50%;border:2px solid color-mix(in srgb,var(--mm-po) 30%,transparent);animation:mmPulse 4s ease-in-out infinite}
@keyframes mmPulse{50%{transform:scale(1.12);opacity:.5}}
.mm-post p{margin:0;padding:14px 16px 18px;font-size:14.5px;line-height:1.5}
.mm-post em{font-style:normal;color:color-mix(in srgb,var(--mm-p) 80%,#000)}
/* Descargas */
.mm-files{display:grid;grid-template-columns:repeat(auto-fill,minmax(270px,1fr));gap:12px}
.mm-file{display:flex;align-items:center;gap:14px;background:#fff;border-radius:18px;padding:12px 16px 12px 12px;color:inherit;text-decoration:none;box-shadow:0 1px 0 var(--mm-line);transition:transform .35s var(--ease),box-shadow .35s}
.mm-s:not(.alt) .mm-file{background:var(--mm-bg2);box-shadow:none}
.mm-file:hover{transform:translateY(-3px);box-shadow:0 18px 30px -24px rgba(0,0,0,.45)}
.mm-file > span:nth-child(2){display:grid;min-width:0;flex:1}
.mm-file b{font-size:15px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mm-file small{color:var(--mm-soft);font-size:12.5px}
.mm-fi{flex:none;width:52px;height:52px;border-radius:12px;background:#f3f2ef;display:grid;place-items:center;font-size:10.5px;font-weight:800;letter-spacing:.04em;overflow:hidden;padding:6px}
.mm-fi img{max-width:100%;max-height:100%;object-fit:contain}
.mm-fi.f-oscuro{background:#121212}.mm-fi.f-marca{background:var(--mm-p)}
.mm-links{display:flex;flex-wrap:wrap;gap:10px;margin-top:22px}
.mm-links a{display:inline-flex;align-items:center;gap:8px;background:var(--mm-ink);color:#fff;text-decoration:none;border-radius:99px;padding:13px 22px;font:600 15px Inter,system-ui,sans-serif;transition:transform .3s var(--ease),background .3s}
.mm-links a:hover{transform:translateY(-2px);background:var(--mm-p);color:var(--mm-po)}
/* Pie */
.mm-pie{background:var(--mm-ink);color:#fff;padding:90px 0 56px;overflow:hidden}
.mm-pie-t{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(64px,14vw,220px);line-height:.85;letter-spacing:-.05em;margin:0 0 56px;color:var(--mm-p)}
.mm-pie-b{display:flex;align-items:center;gap:14px;font:14px Inter,system-ui,sans-serif;color:rgba(255,255,255,.65)}
.mm-andale{display:block;width:92px;color:#fff}
.mm-andale svg{display:block;width:100%;height:auto}
.mm-toast{position:fixed;left:50%;bottom:28px;z-index:40;transform:translate(-50%,20px);opacity:0;background:#141414;color:#fff;font:600 14px Inter,system-ui,sans-serif;padding:11px 18px;border-radius:99px;transition:opacity .25s,transform .35s var(--ease);pointer-events:none}
.mm-toast.on{opacity:1;transform:translate(-50%,0)}
@media (max-width:900px){.mm-posts{grid-template-columns:1fr 1fr}.mm-imgs{grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:180px}}
@media (max-width:760px){
  .mm-in{padding:0 20px}.mm-top{padding:10px 16px;gap:10px}.mm-marca span{display:none}.mm-top nav a{padding:6px 9px;font-size:13px}
  .mm-hero-in{padding:110px 20px 150px}.mm-ht{margin-top:32px}.mm-s{padding:80px 0}.mm-sh{margin-bottom:36px;gap:10px}
  .mm-duo{grid-template-columns:1fr}.mm-bars{flex-direction:column;height:auto}.mm-bar-c{min-height:92px;flex:none!important}
  .mm-tipo{grid-template-columns:1fr;gap:10px}.mm-tipo-s{grid-template-columns:1fr;gap:12px}.mm-tester,.mm-try{grid-column:1}.mm-glyphs{grid-template-columns:repeat(8,1fr);font-size:19px}
  .mm-posts{grid-template-columns:1fr}.mm-logos{grid-template-columns:1fr 1fr}.mm-lf{padding:20px}.mm-stage-in{height:46vh}
}
@media (prefers-reduced-motion:reduce){.mm *,.mm *::before,.mm *::after{animation:none!important;transition:none!important}.mm .rv{opacity:1;transform:none}.mm-ht > span > span{transform:none}.mm-hl,.mm-hs,.mm-hn{opacity:1;transform:none}}
@media print{.mm-top,.mm-prog,.mm-down,.mm-marq,.mm-blobs,.mm-tester,.mm-stage-bgs,.mm-toast{display:none}.mm .rv{opacity:1;transform:none}.mm-hero{min-height:auto;padding:60px 0}.mm-s{break-inside:avoid-page;padding:48px 0}.mm-hero,.mm-bar-c,.mm-lf,.mm-col i,.mm-s.alt{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;
