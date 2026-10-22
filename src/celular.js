// La pieza como se arma en cada red, con sus proporciones reales (post 4:5, reel e historia 9:16, grilla del perfil 3:4)
// y los logos de verdad: Instagram (post, carrusel, reel, historia, perfil y feed), Facebook, LinkedIn y TikTok.
// Sin marco de celular: la pieza tal cual la ve la gente. Sin arte cargado se ve una tapa con el color del formato.
// Lo usan el portal del cliente (Revisar de a una y Así queda el feed) y la sección Redes del manual de marca.
import { logoRed } from './redes-logos.js';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const S = (d, w = 24) => '<svg viewBox="0 0 24 24" width="' + w + '" height="' + w + '" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
const IC = {
  heart: S('<path d="M12 20s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.4a4.4 4.4 0 0 1 7.5 2.5C19.5 15.4 12 20 12 20z"/>'),
  coment: S('<path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3.5 20l1.2-4.1A8.5 8.5 0 1 1 20.5 11.5z"/>'),
  enviar: S('<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4z"/>'),
  guardar: S('<path d="M6 3.5h12v17l-6-4-6 4z"/>'),
  mas: S('<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>'),
  casa: S('<path d="M3.5 10.5 12 4l8.5 6.5V20h-5.5v-6h-6v6H3.5z"/>'),
  buscar: S('<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>'),
  sumar: S('<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8v8M8 12h8"/>'),
  reels: S('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M3.5 8.5h17M9 3.5l3 5M15 3.5l3 5"/><path d="m10.5 12 4 2.3-4 2.3z" fill="currentColor"/>'),
  like: S('<path d="M7 10.5v9H4v-9zM7 10.5l4-7c1.4 0 2.4 1.2 2.1 2.6L12.5 9.5h5.6a2 2 0 0 1 2 2.3l-1.1 6.2a2 2 0 0 1-2 1.7H7"/>'),
  compartir: S('<path d="M14 5l6 6-6 6"/><path d="M20 11H10a6 6 0 0 0-6 6v1"/>'),
  repost: S('<path d="m17 3 3 3-3 3"/><path d="M4 11V9a3 3 0 0 1 3-3h13"/><path d="m7 21-3-3 3-3"/><path d="M20 13v2a3 3 0 0 1-3 3H4"/>'),
  musica: S('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>', 14),
  camara: S('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  menu: S('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  campana: S('<path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z"/><path d="M10 20a2.2 2.2 0 0 0 4 0"/>'),
  globo: S('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17"/>', 12),
  grilla: S('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16"/>', 22),
  persona: S('<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>'),
  car: S('<rect x="7" y="3.5" width="13.5" height="13.5" rx="2"/><path d="M4 7v11.5A2.5 2.5 0 0 0 6.5 21H17"/>', 18),
};
export const REDES_CEL = [['instagram', 'Instagram'], ['facebook', 'Facebook'], ['linkedin', 'LinkedIn'], ['tiktok', 'TikTok']];
// Las redes de la pieza (en el orden de REDES_CEL); si no tiene, Instagram.
export function redesPieza(z) {
  const t = String(z.red || '').toLowerCase(), rs = REDES_CEL.filter(([k]) => t.includes(k)).map(([k]) => k);
  return rs.length ? rs : ['instagram'];
}
const tipoDe = z => /histori|stor/i.test(z.formato) ? 'historia' : /reel|tiktok|video/i.test(z.formato) ? 'reel' : /carrus/i.test(z.formato) ? 'carrusel' : 'post';
const usuario = n => String(n || 'marca').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9._]+/g, '');
const avatar = (c, cls) => '<span class="cel-av' + (cls ? ' ' + cls : '') + '">' + (c.avatar ? '<img src="' + esc(c.avatar) + '" alt="">' : esc(String(c.nombre || '?').slice(0, 2).toUpperCase())) + '</span>';
const hashtags = t => esc(t).replace(/(#[\wÀ-ÿ]+)/g, '<span class="cel-tag">$1</span>');
const textoPost = (z, max) => { const t = String(z.copy || z.tema || '').trim(), corto = t.length > max; return { corto, html: hashtags(corto ? t.slice(0, max).replace(/\s+\S*$/, '') + '…' : t) + (z.hashtags ? ' ' + hashtags(z.hashtags) : '') }; };
const esVideo = a => /\.(mp4|mov|m4v|webm)$/i.test((a && (a.path || a.link)) || '');

// El arte de la pieza (o la tapa de color si todavía no hay)
function medio(z, artes, fc, ratio) {
  const vs = (artes || []).filter(a => a.miniatura || a.link);
  const uno = a => esVideo(a) && a.link ? '<video src="' + esc(a.link) + '" playsinline muted loop autoplay preload="metadata"' + (a.miniatura ? ' poster="' + esc(a.miniatura) + '"' : '') + '></video>' : '<img src="' + esc(a.miniatura || a.link) + '" alt="">';
  if (!vs.length) return '<div class="cel-ph" style="--fc:' + fc + ';aspect-ratio:' + ratio + '"><b>' + esc(z.formato) + '</b><span>' + esc(z.tema || '') + '</span><small>Todavía sin arte</small></div>';
  if (vs.length === 1) return '<div class="cel-m" style="aspect-ratio:' + ratio + '">' + uno(vs[0]) + '</div>';
  return '<div class="cel-car" style="aspect-ratio:' + ratio + '"><div class="cel-car-in">' + vs.map(a => '<div>' + uno(a) + '</div>').join('') + '</div><span class="cel-car-n">1/' + vs.length + '</span></div><div class="cel-dots">' + vs.map((_, i) => '<i' + (i === 0 ? ' class="on"' : '') + '></i>').join('') + '</div>';
}
function fondoCompleto(z, artes, fc) {
  const a = (artes || []).find(x => x.miniatura || x.link);
  if (!a) return '<div class="cel-full cel-ph" style="--fc:' + fc + '"><b>' + esc(z.formato) + '</b><span>' + esc(z.tema || '') + '</span><small>Todavía sin arte</small></div>';
  return '<div class="cel-full">' + (esVideo(a) && a.link ? '<video src="' + esc(a.link) + '" playsinline muted loop autoplay' + (a.miniatura ? ' poster="' + esc(a.miniatura) + '"' : '') + '></video>' : '<img src="' + esc(a.miniatura || a.link) + '" alt="">') + '</div>';
}
const cuando = z => z.fecha ? new Date(z.fecha + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : '';
const marcaRed = red => '<span class="cel-red" title="' + esc(red) + '">' + logoRed(red, 16) + '</span>';

// Una pieza en una red, armada como la muestra la app
function pantalla(z, c, red, artes, fc) {
  const tipo = tipoDe(z), u = usuario(c.nombre);
  if (tipo === 'historia') {
    return '<div class="cel-story">' + fondoCompleto(z, artes, fc) + '<div class="cel-st-top"><div class="cel-prog"><i></i></div><div class="cel-st-h">' + avatar(c, 'sm') + '<b>' + esc(red === 'facebook' ? c.nombre : u) + '</b><span>2 h</span><span class="cel-sp"></span>' + IC.mas + '</div></div>' +
      '<div class="cel-st-bot"><span class="cel-st-in">Enviar mensaje</span>' + IC.heart + IC.enviar + '</div></div>';
  }
  if (tipo === 'reel' || red === 'tiktok') {
    const t = textoPost(z, 90), tt = red === 'tiktok';
    return '<div class="cel-reel' + (tt ? ' tt' : '') + '">' + fondoCompleto(z, artes, fc) + '<div class="cel-rl-top">' + (tt ? '<span class="cel-sp"></span><b>Siguiendo</b><b class="on">Para ti</b><span class="cel-sp"></span>' + IC.buscar : '<b>Reels</b><span class="cel-sp"></span>' + IC.camara) + '</div>' +
      '<div class="cel-rl-side">' + (tt ? '<span class="cel-tt-av">' + avatar(c) + '<i>+</i></span>' : '') + '<span>' + IC.heart + '<small>2,4 mil</small></span><span>' + IC.coment + '<small>86</small></span><span>' + (tt ? IC.guardar + '<small>312</small></span><span>' + IC.compartir : IC.enviar) + '<small>' + (tt ? '95' : '140') + '</small></span>' + (tt ? '<span class="cel-disco">' + avatar(c, 'sm') + '</span>' : '<span>' + IC.mas + '</span>') + '</div>' +
      '<div class="cel-rl-bot"><div class="cel-rl-u">' + (tt ? '<b>' + esc(c.nombre) + '</b>' : avatar(c, 'sm') + '<b>' + esc(red === 'facebook' ? c.nombre : u) + '</b><span class="cel-seguir">Seguir</span>') + '</div><p>' + t.html + '</p><span class="cel-rl-audio">' + IC.musica + ' ' + (tt ? 'sonido original - ' + esc(c.nombre) : 'Audio original · ' + esc(u)) + '</span></div></div>';
  }
  const t = textoPost(z, red === 'linkedin' ? 210 : 125);
  if (red === 'facebook') {
    return '<article class="cel-fb"><header>' + avatar(c) + '<span><b>' + esc(c.nombre) + '</b><small>' + esc(cuando(z) || 'Ahora') + ' · ' + IC.globo + '</small></span><span class="cel-sp"></span>' + IC.mas + '</header>' +
      '<p class="cel-txt">' + t.html + (t.corto ? ' <span class="cel-mas">Ver más</span>' : '') + '</p>' + medio(z, artes, fc, '4/5') +
      '<div class="cel-fb-r"><span><i class="cel-reac"></i> 128</span><span>14 comentarios · 6 veces compartido</span></div><div class="cel-fb-a"><span>' + IC.like + ' Me gusta</span><span>' + IC.coment + ' Comentar</span><span>' + IC.compartir + ' Compartir</span></div></article>';
  }
  if (red === 'linkedin') {
    return '<article class="cel-li"><header>' + avatar(c, 'sq') + '<span><b>' + esc(c.nombre) + '</b><small>1.248 seguidores</small><small>' + esc(cuando(z) || 'Ahora') + ' · ' + IC.globo + '</small></span><span class="cel-sp"></span><b class="cel-li-seg">+ Seguir</b></header>' +
      '<p class="cel-txt">' + t.html + (t.corto ? ' <span class="cel-mas">…más</span>' : '') + '</p>' + medio(z, artes, fc, '4/5') +
      '<div class="cel-fb-r"><span><i class="cel-reac li"></i> 64</span><span>9 comentarios · 3 reposts</span></div><div class="cel-fb-a li"><span>' + IC.like + ' Recomendar</span><span>' + IC.coment + ' Comentar</span><span>' + IC.repost + ' Compartir</span><span>' + IC.enviar + ' Enviar</span></div></article>';
  }
  return '<article class="cel-ig">' + igPost(z, c, artes, fc, t) + '</article>';
}
function igPost(z, c, artes, fc, t) {
  const u = usuario(c.nombre);
  return '<header>' + avatar(c, 'ring') + '<b>' + esc(u) + '</b><span class="cel-sp"></span>' + IC.mas + '</header>' + medio(z, artes, fc, '4/5') +
    '<div class="cel-ig-a">' + IC.heart + IC.coment + IC.enviar + '<span class="cel-sp"></span>' + IC.guardar + '</div>' +
    '<p class="cel-ig-l"><b>1.024 Me gusta</b></p><p class="cel-txt"><b>' + esc(u) + '</b> ' + t.html + (t.corto ? ' <span class="cel-mas">más</span>' : '') + '</p>' +
    '<p class="cel-ig-c">Ver los 23 comentarios</p><p class="cel-ig-f">' + esc(cuando(z) || 'Hoy') + '</p>';
}
// Botones para elegir la red, con su logo
export const tabsRedes = (rs, red, attrs) => '<div class="cel-redes" role="group" aria-label="Ver en">' + rs.map(k => '<button type="button" ' + attrs(k) + (k === red ? ' aria-pressed="true" class="on"' : ' aria-pressed="false"') + '>' + logoRed(k, 16) + '<span>' + esc((REDES_CEL.find(x => x[0] === k) || [k, k])[1]) + '</span></button>').join('') + '</div>';
// La pieza y arriba el selector de red
export function celularPieza(z, c, artes, o = {}) {
  const rs = redesPieza(z), red = rs.includes(o.red) ? o.red : rs[0], fc = o.fc || '#888', tipo = tipoDe(z);
  const tabs = rs.length > 1 ? tabsRedes(rs, red, k => 'data-act="celRed" data-id="' + esc(z.id) + '" data-r="' + k + '"') : '<div class="cel-redes uno">' + logoRed(red, 16) + '<span>Así se ve en ' + esc((REDES_CEL.find(x => x[0] === red) || [red, red])[1]) + '</span></div>';
  return '<div class="cel-w">' + tabs + '<div class="cel red-' + red + ' t-' + (red === 'tiktok' && tipo !== 'historia' ? 'reel' : tipo) + '">' + pantalla(z, c, red, artes, fc) + '</div></div>';
}
// Así queda el perfil de Instagram (grilla 3:4) o el inicio (las publicaciones una abajo de la otra)
export function celularPerfil(c, piezas, artesDe, fcDe, o = {}) {
  const u = usuario(c.nombre), hist = piezas.filter(z => tipoDe(z) === 'historia'), pubs = piezas.filter(z => tipoDe(z) !== 'historia');
  const est = z => o.estado ? o.estado(z) : '';
  const tile = z => { const a = (artesDe(z.id) || []).find(x => x.miniatura); return '<button class="cel-t" data-act="pzVer" data-id="' + esc(z.id) + '">' + (a ? '<img src="' + esc(a.miniatura) + '" alt="">' : '<span class="cel-ph" style="--fc:' + fcDe(z) + '"><b>' + esc(z.formato) + '</b><span>' + esc(z.tema || '') + '</span></span>') + (tipoDe(z) === 'reel' ? '<i class="cel-t-i">' + IC.reels + '</i>' : tipoDe(z) === 'carrusel' ? '<i class="cel-t-i">' + IC.car + '</i>' : '') + est(z) + '</button>'; };
  const hl = hist.length ? '<div class="cel-hl">' + hist.slice(0, 10).map(z => '<button data-act="pzVer" data-id="' + esc(z.id) + '">' + avatar(c, 'ring lg') + '<small>' + esc((z.fecha || '').slice(8, 10) + '/' + (z.fecha || '').slice(5, 7)) + '</small></button>').join('') + '</div>' : '';
  if (o.modo === 'scroll') return '<div class="cel-w cel-feed">' + (hl ? '<div class="cel red-instagram cel-hl-c">' + hl + '</div>' : '') +
    pubs.map(z => '<div class="cel red-instagram" data-act="pzVer" data-id="' + esc(z.id) + '"><article class="cel-ig">' + igPost(z, c, artesDe(z.id), fcDe(z), textoPost(z, 125)) + '</article>' + est(z) + '</div>').join('') + '</div>';
  return '<div class="cel-w"><div class="cel red-instagram cel-perfil"><div class="cel-top">' + marcaRed('instagram') + '<b>' + esc(u) + '</b><span class="cel-sp"></span>' + IC.sumar + IC.menu + '</div>' +
    perfilIG(c, pubs.length, o.bio) + hl + '<div class="cel-pf-tabs"><span class="on">' + IC.grilla + '</span><span>' + IC.reels + '</span><span>' + IC.persona + '</span></div><div class="cel-grid">' + pubs.map(tile).join('') + '</div></div></div>';
}
const perfilIG = (c, n, bio) => '<div class="cel-pf"><div class="cel-pf-h">' + avatar(c, 'ring xl') + '<div class="cel-pf-n"><b>' + esc(c.nombre) + '</b><div><span><b>' + n + '</b>publicaciones</span><span><b>2.418</b>seguidores</span><span><b>312</b>seguidos</span></div></div></div>' +
  '<p class="cel-pf-bio">' + esc(bio || '') + '</p><div class="cel-pf-bt"><span>Seguir</span><span>Mensaje</span></div></div>';

// Para el manual: el perfil de la marca en cada red, con su foto, su portada y las plantillas como publicaciones.
// o = { perfil, portada, posts: [url], historias: [url], bio }
export function perfilRed(c0, red, o = {}) {
  const c = { ...c0, avatar: o.perfil || c0.avatar }, u = usuario(c.nombre), posts = o.posts || [];
  const port = (ratio, txt) => '<div class="cel-cover" style="aspect-ratio:' + ratio + '">' + (o.portada ? '<img src="' + esc(o.portada) + '" alt="">' : '<span>' + esc(txt) + '</span>') + '</div>';
  const grid = (ratio, n) => '<div class="cel-grid" style="--r:' + ratio + '">' + (posts.length ? posts : []).concat(Array(Math.max(0, n - posts.length)).fill('')).slice(0, Math.max(n, posts.length)).map(p => '<span class="cel-t">' + (p ? '<img src="' + esc(p) + '" alt="">' : '') + '</span>').join('') + '</div>';
  let h = '';
  if (red === 'instagram') h = '<div class="cel-top">' + marcaRed(red) + '<b>' + esc(u) + '</b><span class="cel-sp"></span>' + IC.sumar + IC.menu + '</div>' + perfilIG(c, posts.length, o.bio) +
    (o.historias && o.historias.length ? '<div class="cel-hl">' + o.historias.slice(0, 5).map(x => '<span>' + avatar({ ...c, avatar: x }, 'ring lg') + '<small>Destacada</small></span>').join('') + '</div>' : '') + '<div class="cel-pf-tabs"><span class="on">' + IC.grilla + '</span><span>' + IC.reels + '</span><span>' + IC.persona + '</span></div>' + grid('3/4', 6);
  else if (red === 'tiktok') h = '<div class="cel-top c">' + marcaRed(red) + '<b>' + esc(c.nombre) + '</b></div><div class="cel-tt-p">' + avatar(c, 'xl') + '<b>@' + esc(u) + '</b><div><span><b>312</b>Siguiendo</span><span><b>8.240</b>Seguidores</span><span><b>96 mil</b>Me gusta</span></div><span class="cel-tt-bt">Seguir</span><p>' + esc(o.bio || '') + '</p></div>' + grid('3/4', 6);
  else if (red === 'facebook') h = '<div class="cel-top">' + marcaRed(red) + '<b>' + esc(c.nombre) + '</b><span class="cel-sp"></span>' + IC.buscar + '</div>' + port('820/312', 'Portada de Facebook') + '<div class="cel-pf-fb">' + avatar(c, 'xl') + '<b>' + esc(c.nombre) + '</b><small>2,4 mil Me gusta · 2,6 mil seguidores</small><p>' + esc(o.bio || '') + '</p><div class="cel-pf-bt"><span>' + IC.like + ' Me gusta</span><span>' + IC.coment + ' Mensaje</span></div></div>' +
    (posts[0] ? pantalla({ formato: 'Post', copy: o.copy || '' }, c, 'facebook', [{ miniatura: posts[0] }], '#888') : '');
  else if (red === 'linkedin') h = '<div class="cel-top">' + marcaRed(red) + '<b>' + esc(c.nombre) + '</b></div>' + port('1128/191', 'Portada de LinkedIn') + '<div class="cel-pf-li">' + avatar(c, 'sq xl') + '<b>' + esc(c.nombre) + '</b><p>' + esc(o.bio || '') + '</p><small>1.248 seguidores</small><div class="cel-pf-bt"><span>+ Seguir</span><span>Mensaje</span></div></div>' +
    (posts[0] ? pantalla({ formato: 'Post', copy: o.copy || '' }, c, 'linkedin', [{ miniatura: posts[0] }], '#888') : '');
  else if (red === 'youtube') h = '<div class="cel-top">' + marcaRed(red) + '<b>' + esc(c.nombre) + '</b></div>' + port('2560/423', 'Banner de YouTube') + '<div class="cel-pf-yt">' + avatar(c, 'xl') + '<div><b>' + esc(c.nombre) + '</b><small>@' + esc(u) + ' · 1,2 k suscriptores</small></div></div><div class="cel-pf-bt one"><span>Suscribirse</span></div>' + grid('16/9', 2);
  else h = '<div class="cel-top">' + marcaRed(red) + '<b>' + esc(c.nombre) + '</b></div>' + port('3/1', 'Encabezado') + '<div class="cel-pf-fb x">' + avatar(c, 'xl') + '<b>' + esc(c.nombre) + '</b><small>@' + esc(u) + '</small><p>' + esc(o.bio || '') + '</p></div>';
  return '<div class="cel red-' + red + ' cel-perfil">' + h + '</div>';
}
// Para el manual: una plantilla puesta como publicación o historia de esa red
export function plantillaRed(c, red, url, tipo, copy) {
  const z = { formato: tipo === 'historia' ? 'Historia' : 'Post', copy: copy || '' };
  const t = red === 'tiktok' && tipo !== 'historia' ? 'reel' : tipoDe(z);
  return '<div class="cel red-' + red + ' t-' + t + '">' + pantalla(z, c, red, [{ miniatura: url }], '#888') + '</div>';
}

export const CEL_CSS = `
.cel-w{display:flex;flex-direction:column;align-items:center;gap:14px;padding:22px 16px}
.cel-redes{display:flex;flex-wrap:wrap;justify-content:center;gap:4px;background:color-mix(in srgb,var(--fg,#141414) 6%,var(--surface,#fff));border-radius:99px;padding:4px}
.cel-redes button{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:7px;font:600 13px Inter,system-ui,sans-serif;padding:7px 14px;border-radius:99px;color:var(--muted,#666)}
.cel-redes button:focus-visible{outline:2px solid #0095f6}
.cel-redes button.on{background:var(--surface,#fff);color:var(--fg,#141414);box-shadow:var(--elev,0 1px 3px rgba(0,0,0,.12))}
.cel-redes .lr{flex:none}
.cel-redes.uno{background:none;display:inline-flex;align-items:center;gap:7px;font-size:12.5px;color:var(--muted,#666)}
/* La pieza: sin marco, con la proporción de la red */
.cel{position:relative;width:390px;max-width:100%;background:#fff;color:#0c0c0e;border-radius:14px;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,.06),0 18px 40px -22px rgba(0,0,0,.35);font:14px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif;isolation:isolate;text-align:left}
.cel.t-reel,.cel.t-historia{width:340px;height:604px;flex:none;background:#000}
.cel-red{display:inline-grid;place-items:center;flex:none}
.cel-top{display:flex;align-items:center;gap:10px;padding:12px 14px 8px}
.cel-top b{font-size:16px}
.cel-top.c{justify-content:center}
.cel-top svg{width:22px;height:22px}.cel-top .lr{width:20px;height:20px}
.cel-sp{flex:1}
.cel-av{flex:none;width:34px;height:34px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#ddd;font-size:11px;font-weight:700;color:#333}
.cel-av img{width:100%;height:100%;object-fit:cover}
.cel-av.ring{box-shadow:0 0 0 2px #fff,0 0 0 4px #d62976}
.cel-av.sm{width:30px;height:30px}.cel-av.xs{width:28px;height:28px}.cel-av.lg{width:62px;height:62px}.cel-av.xl{width:84px;height:84px}
.cel-av.sq{border-radius:8px;width:46px;height:46px}.cel-av.sq.xl{width:76px;height:76px;border-radius:10px}
.cel-ig header,.cel-fb header,.cel-li header{display:flex;align-items:center;gap:10px;padding:10px 12px}
.cel-ig header b{font-size:13.5px}
.cel-m,.cel-car{position:relative;width:100%;overflow:hidden;background:#eee}
.cel-m img,.cel-m video,.cel-car img,.cel-car video{width:100%;height:100%;object-fit:cover;display:block}
.cel-car-in{display:flex;height:100%;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none}
.cel-car-in::-webkit-scrollbar{display:none}
.cel-car-in > div{flex:0 0 100%;scroll-snap-align:start}
.cel-car-n{position:absolute;top:10px;right:10px;background:rgba(0,0,0,.6);color:#fff;font-size:12px;padding:3px 8px;border-radius:99px}
.cel-dots{display:flex;justify-content:center;gap:4px;margin-top:-26px;position:relative;height:26px;align-items:center}
.cel-dots i{width:6px;height:6px;border-radius:50%;background:#c8c8c8}.cel-dots i.on{background:#0095f6}
.cel-ph{position:relative;width:100%;display:flex;flex-direction:column;justify-content:center;gap:8px;padding:22px;background:linear-gradient(150deg,color-mix(in srgb,var(--fc) 92%,#fff),color-mix(in srgb,var(--fc) 70%,#000));color:#fff;overflow:hidden}
.cel-ph b{font-size:11px;letter-spacing:.12em;text-transform:uppercase;opacity:.85}
.cel-ph span{font-size:21px;font-weight:800;line-height:1.12;letter-spacing:-.01em}
.cel-ph small{font-size:11px;opacity:.7}
.cel-ph::after{content:"";position:absolute;right:-30%;bottom:-30%;width:80%;aspect-ratio:1;border-radius:50%;background:rgba(255,255,255,.12)}
.cel-ig-a{display:flex;gap:14px;padding:10px 12px 4px}
.cel-ig-a svg{width:24px;height:24px}
.cel-ig-l,.cel-txt,.cel-ig-c,.cel-ig-f{margin:0;padding:2px 12px;font-size:13.5px}
.cel-txt{white-space:pre-line;overflow-wrap:anywhere}
.cel-ig-c{color:#737373}.cel-ig-f{color:#737373;font-size:11.5px;padding-bottom:14px}
.cel-tag{color:#00376b}
.red-facebook .cel-tag,.red-linkedin .cel-tag{color:#0a66c2;font-weight:600}
.cel-mas{color:#737373}
.cel-fb header span b,.cel-li header span b{display:block;font-size:14px}
.cel-fb header small,.cel-li header small{display:flex;align-items:center;gap:4px;color:#65676b;font-size:12px}
.cel-fb .cel-txt,.cel-li .cel-txt{padding:2px 12px 10px;font-size:14.5px}
.cel-fb-r{display:flex;justify-content:space-between;padding:8px 12px;color:#65676b;font-size:12.5px}
.cel-reac{display:inline-block;width:16px;height:16px;border-radius:50%;background:#0866ff;vertical-align:-3px;margin-right:2px;box-shadow:12px 0 0 -1px #f33e58}
.cel-reac.li{background:#0a66c2;box-shadow:12px 0 0 -1px #44712e}
.cel-fb-a{display:flex;justify-content:space-around;border-top:1px solid #e4e6eb;margin:0 12px;padding:6px 0 10px;color:#65676b;font-size:12.5px;font-weight:600}
.cel-fb-a span{display:flex;align-items:center;gap:5px}.cel-fb-a svg{width:18px;height:18px}
.cel-fb-a.li{font-size:11.5px}.cel-fb-a.li span{flex-direction:column;gap:2px}
.cel-li-seg{color:#0a66c2;font-size:14px}
/* Reels, TikTok e historias: 9:16 */
.cel-reel,.cel-story{position:absolute;inset:0;background:#000;color:#fff;display:flex;flex-direction:column}
.cel-full{position:absolute;inset:0}
.cel-full img,.cel-full video{width:100%;height:100%;object-fit:cover}
.cel-full.cel-ph{justify-content:center;padding:40px 26px}
.cel-full.cel-ph span{font-size:28px}
.cel-rl-top{position:relative;z-index:2;display:flex;align-items:center;gap:14px;padding:16px 16px 0;text-shadow:0 1px 2px rgba(0,0,0,.4)}
.cel-rl-top b{font-size:18px;font-weight:700}
.tt .cel-rl-top b{font-size:15.5px;opacity:.7}.tt .cel-rl-top b.on{opacity:1;border-bottom:2px solid #fff;padding-bottom:3px}
.cel-rl-side{position:absolute;right:10px;bottom:96px;z-index:2;display:grid;gap:16px;justify-items:center}
.cel-rl-side span{display:grid;justify-items:center;gap:2px}.cel-rl-side svg{width:27px;height:27px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))}
.cel-rl-side small{font-size:11.5px;font-weight:600}
.cel-tt-av{position:relative;margin-bottom:6px}.cel-tt-av .cel-av{width:44px;height:44px;box-shadow:0 0 0 1.5px #fff}.cel-tt-av i{position:absolute;bottom:-8px;left:50%;transform:translateX(-50%);width:18px;height:18px;border-radius:50%;background:#fe2c55;color:#fff;font-style:normal;font-weight:700;display:grid;place-items:center;font-size:14px;line-height:1}
.cel-disco .cel-av{border:6px solid #222;width:40px;height:40px;animation:celGira 5s linear infinite}
@keyframes celGira{to{transform:rotate(360deg)}}
.cel-rl-bot{position:absolute;left:0;right:58px;bottom:18px;z-index:2;padding:0 14px;text-shadow:0 1px 2px rgba(0,0,0,.5)}
.cel-rl-bot::before{content:"";position:absolute;inset:-80px -60px -30px -20px;background:linear-gradient(transparent,rgba(0,0,0,.55));z-index:-1}
.cel-rl-u{display:flex;align-items:center;gap:8px;font-size:14px}
.cel-seguir{border:1px solid rgba(255,255,255,.7);border-radius:8px;padding:2px 9px;font-size:12.5px;font-weight:600}
.cel-rl-bot p{margin:8px 0 6px;font-size:13.5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cel-rl-bot .cel-tag{color:#fff;font-weight:600}
.cel-rl-audio{display:flex;align-items:center;gap:5px;font-size:12.5px}
.cel-st-top{position:relative;z-index:2;padding:12px 10px 0}
.cel-prog{height:2.5px;border-radius:2px;background:rgba(255,255,255,.35);overflow:hidden}.cel-prog i{display:block;height:100%;width:0;background:#fff;animation:celProg 6s linear infinite}
@keyframes celProg{to{width:100%}}
.cel-st-h{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13.5px;text-shadow:0 1px 2px rgba(0,0,0,.4)}
.cel-st-h span:not(.cel-sp):not(.cel-av){opacity:.75}
.cel-st-bot{position:absolute;left:0;right:0;bottom:16px;z-index:2;display:flex;align-items:center;gap:14px;padding:0 14px}
.cel-st-in{flex:1;border:1px solid rgba(255,255,255,.6);border-radius:99px;padding:10px 16px;font-size:13.5px}
/* Perfiles */
.cel-perfil{padding-bottom:2px}
.cel-pf-h{display:flex;align-items:center;gap:14px;padding:6px 14px 10px}
.cel-pf-h .cel-av.xl{width:78px;height:78px}
.cel-pf-n{flex:1;min-width:0}
.cel-pf-n > b{display:block;font-size:14px;margin-bottom:6px}
.cel-pf-n div{display:flex;justify-content:space-between;gap:6px}.cel-pf-n span{display:grid;font-size:11px;color:#333;text-align:center}.cel-pf-n span b{font-size:15px}
.cel-pf-bio{margin:0;padding:0 16px 10px;font-size:13px;white-space:pre-line}
.cel-pf-bt{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 16px 12px}
.cel-pf-bt.one{grid-template-columns:1fr}
.cel-pf-bt span{display:flex;align-items:center;justify-content:center;gap:6px;background:#efefef;border-radius:8px;padding:7px;font-weight:600;font-size:13px}.cel-pf-bt span:first-child{background:#0095f6;color:#fff}
.cel-pf-bt svg{width:16px;height:16px}
.red-facebook .cel-pf-bt span:first-child{background:#0866ff}.red-linkedin .cel-pf-bt span:first-child{background:#0a66c2;border-radius:99px}.red-linkedin .cel-pf-bt span{border-radius:99px}
.red-youtube .cel-pf-bt span{background:#0f0f0f;color:#fff;border-radius:99px}
.cel-hl{display:flex;gap:14px;overflow-x:auto;padding:4px 14px 14px;scrollbar-width:none}
.cel-hl > *{all:unset;cursor:pointer;display:grid;justify-items:center;gap:5px}.cel-hl small{font-size:11.5px}
.cel-pf-tabs{display:flex;justify-content:space-around;border-top:1px solid #efefef}
.cel-pf-tabs span{padding:10px 0;flex:1;display:grid;place-items:center;color:#999}.cel-pf-tabs span.on{color:#000;border-bottom:1.5px solid #000}
.cel-pf-tabs svg{width:22px;height:22px}
.cel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
.red-youtube .cel-grid{grid-template-columns:1fr;gap:10px;padding:0 12px 12px}
.cel-t{all:unset;cursor:pointer;position:relative;aspect-ratio:var(--r,3/4);overflow:hidden;background:#f0f0f0;display:block}
.red-youtube .cel-t{border-radius:12px}
.cel-t img{width:100%;height:100%;object-fit:cover;display:block}
.cel-t .cel-ph{height:100%;padding:10px;gap:4px}.cel-t .cel-ph span{font-size:12.5px}.cel-t .cel-ph b{font-size:9px}.cel-t .cel-ph::after{display:none}
.cel-t-i{position:absolute;top:6px;right:6px;color:#fff;font-style:normal;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}.cel-t-i svg{width:18px;height:18px}
.cel-cover{width:100%;background:#e9e9ec;display:grid;place-items:center;overflow:hidden;color:#888;font-size:12px}
.cel-cover img{width:100%;height:100%;object-fit:cover;display:block}
.cel-pf-fb{display:grid;justify-items:start;padding:0 16px 6px;margin-top:-46px;position:relative}
.cel-pf-fb .cel-av{box-shadow:0 0 0 4px #fff}
.cel-pf-fb b{font-size:21px;margin-top:8px}.cel-pf-fb small{color:#65676b;font-size:13px}.cel-pf-fb p{margin:6px 0 10px;font-size:13.5px}
.cel-pf-fb .cel-pf-bt{padding:0;width:100%}
.cel-pf-fb.x{padding-bottom:16px}.cel-pf-fb.x b{font-size:19px}
.cel-pf-li{display:grid;justify-items:start;padding:0 16px 8px;margin-top:-38px;position:relative}
.cel-pf-li .cel-av{box-shadow:0 0 0 3px #fff;background:#fff}
.cel-pf-li b{font-size:19px;margin-top:8px}.cel-pf-li p{margin:2px 0 4px;font-size:13.5px}.cel-pf-li small{color:#666;font-size:12.5px;margin-bottom:10px}
.cel-pf-li .cel-pf-bt{padding:0;width:100%}
.cel-pf-yt{display:flex;align-items:center;gap:12px;padding:14px 16px 10px}.cel-pf-yt div{display:grid}.cel-pf-yt b{font-size:19px}.cel-pf-yt small{color:#606060;font-size:12.5px}
.cel-pf-yt .cel-av.xl{width:64px;height:64px}
.cel-tt-p{display:grid;justify-items:center;gap:6px;padding:8px 16px 14px;text-align:center}
.cel-tt-p > b{font-size:15px}.cel-tt-p div{display:flex;gap:22px}.cel-tt-p div span{display:grid;font-size:12px;color:#666}.cel-tt-p div b{font-size:16px;color:#000}
.cel-tt-bt{background:#fe2c55;color:#fff;font-weight:600;border-radius:4px;padding:9px 48px;font-size:14px}
.cel-tt-p p{margin:0;font-size:13px}
.cel-perfil > .cel-fb,.cel-perfil > .cel-li{border-top:8px solid #f0f2f5}
/* Feed (inicio): una publicación abajo de la otra */
.cel-feed > .cel{cursor:pointer}
.cel-hl-c{padding-top:12px}
@media (max-width:720px){
  .cel-w{padding:10px 0}
  .cel{width:100%}
  .cel.t-reel,.cel.t-historia{width:min(100%,340px);height:auto;aspect-ratio:9/16}
}
`;
