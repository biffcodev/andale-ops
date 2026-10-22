// La pieza adentro de un celular, como se ve en la app de cada red: Instagram (post, carrusel, reel, historia, perfil y feed),
// Facebook, LinkedIn y TikTok. Sin arte cargado se ve una tapa con el color del formato y el tema.
// Lo usa el portal del cliente (Revisar de a una y Así queda el feed).
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
const barraEstado = (oscura) => '<div class="cel-sb' + (oscura ? ' osc' : '') + '"><b>9:41</b><span class="cel-isla"></span><span class="cel-sbi"><i></i><i></i><i></i><em></em></span></div>';
const cuando = z => z.fecha ? new Date(z.fecha + 'T12:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long' }) : '';

// Una pieza en una red
function pantalla(z, c, red, artes, fc) {
  const tipo = tipoDe(z), u = usuario(c.nombre);
  if (tipo === 'historia') {
    return barraEstado(true) + '<div class="cel-story">' + fondoCompleto(z, artes, fc) + '<div class="cel-st-top"><div class="cel-prog"><i></i></div><div class="cel-st-h">' + avatar(c, 'sm') + '<b>' + esc(red === 'facebook' ? c.nombre : u) + '</b><span>2 h</span><span class="cel-sp"></span>' + IC.mas + '</div></div>' +
      '<div class="cel-st-bot"><span class="cel-st-in">Enviar mensaje</span>' + IC.heart + IC.enviar + '</div></div>';
  }
  if (tipo === 'reel' || red === 'tiktok') {
    const t = textoPost(z, 90);
    return barraEstado(true) + '<div class="cel-reel">' + fondoCompleto(z, artes, fc) + '<div class="cel-rl-top"><b>' + (red === 'tiktok' ? 'Siguiendo &nbsp; <u>Para ti</u>' : red === 'facebook' ? 'Reels' : 'Reels') + '</b>' + IC.camara + '</div>' +
      '<div class="cel-rl-side"><span>' + IC.heart + '<small>2,4 mil</small></span><span>' + IC.coment + '<small>86</small></span><span>' + (red === 'tiktok' ? IC.guardar + '<small>312</small></span><span>' + IC.compartir : IC.enviar) + '<small>' + (red === 'tiktok' ? '95' : '140') + '</small></span><span>' + IC.mas + '</span></div>' +
      '<div class="cel-rl-bot"><div class="cel-rl-u">' + avatar(c, 'sm') + '<b>' + esc(red === 'facebook' ? c.nombre : u) + '</b>' + (red === 'tiktok' ? '' : '<span class="cel-seguir">Seguir</span>') + '</div><p>' + t.html + '</p><span class="cel-rl-audio">' + IC.musica + ' Audio original · ' + esc(u) + '</span></div></div>' + navInferior(red, true);
  }
  const t = textoPost(z, red === 'linkedin' ? 210 : 125);
  if (red === 'facebook') {
    return barraEstado() + '<div class="cel-app"><div class="cel-top fb"><b class="cel-fb-logo">facebook</b><span class="cel-sp"></span><span class="cel-ib">' + IC.sumar + '</span><span class="cel-ib">' + IC.buscar + '</span><span class="cel-ib">' + IC.coment + '</span></div>' +
      '<div class="cel-scroll"><article class="cel-fb">' + '<header>' + avatar(c) + '<span><b>' + esc(c.nombre) + '</b><small>' + esc(cuando(z) || 'Ahora') + ' · ' + IC.globo + '</small></span><span class="cel-sp"></span>' + IC.mas + '</header>' +
      '<p class="cel-txt">' + t.html + (t.corto ? ' <span class="cel-mas">Ver más</span>' : '') + '</p>' + medio(z, artes, fc, '1/1') +
      '<div class="cel-fb-r"><span><i class="cel-reac"></i> 128</span><span>14 comentarios · 6 veces compartido</span></div><div class="cel-fb-a"><span>' + IC.like + ' Me gusta</span><span>' + IC.coment + ' Comentar</span><span>' + IC.compartir + ' Compartir</span></div></article></div></div>' + navInferior('facebook');
  }
  if (red === 'linkedin') {
    return barraEstado() + '<div class="cel-app"><div class="cel-top li">' + avatar({ nombre: 'Yo' }, 'xs') + '<span class="cel-li-q">' + IC.buscar + ' Buscar</span>' + IC.coment + '</div>' +
      '<div class="cel-scroll li"><article class="cel-li">' + '<header>' + avatar(c, 'sq') + '<span><b>' + esc(c.nombre) + '</b><small>1.248 seguidores</small><small>' + esc(cuando(z) || 'Ahora') + ' · ' + IC.globo + '</small></span><span class="cel-sp"></span><b class="cel-li-seg">+ Seguir</b></header>' +
      '<p class="cel-txt">' + t.html + (t.corto ? ' <span class="cel-mas">…más</span>' : '') + '</p>' + medio(z, artes, fc, '1.91/1') +
      '<div class="cel-fb-r"><span><i class="cel-reac li"></i> 64</span><span>9 comentarios · 3 reposts</span></div><div class="cel-fb-a li"><span>' + IC.like + ' Recomendar</span><span>' + IC.coment + ' Comentar</span><span>' + IC.repost + ' Compartir</span><span>' + IC.enviar + ' Enviar</span></div></article></div></div>' + navInferior('linkedin');
  }
  // Instagram: post o carrusel en el inicio
  return barraEstado() + '<div class="cel-app"><div class="cel-top"><b class="cel-ig-logo">Instagram</b><span class="cel-sp"></span>' + IC.heart + IC.enviar + '</div>' +
    '<div class="cel-scroll"><article class="cel-ig">' + igPost(z, c, artes, fc, t) + '</article></div></div>' + navInferior('instagram');
}
function igPost(z, c, artes, fc, t) {
  const u = usuario(c.nombre);
  return '<header>' + avatar(c, 'ring') + '<b>' + esc(u) + '</b><span class="cel-sp"></span>' + IC.mas + '</header>' + medio(z, artes, fc, '4/5') +
    '<div class="cel-ig-a">' + IC.heart + IC.coment + IC.enviar + '<span class="cel-sp"></span>' + IC.guardar + '</div>' +
    '<p class="cel-ig-l"><b>1.024 Me gusta</b></p><p class="cel-txt"><b>' + esc(u) + '</b> ' + t.html + (t.corto ? ' <span class="cel-mas">más</span>' : '') + '</p>' +
    '<p class="cel-ig-c">Ver los 23 comentarios</p><p class="cel-ig-f">' + esc(cuando(z) || 'Hoy') + '</p>';
}
function navInferior(red, oscura) {
  const ic = red === 'linkedin' ? [IC.casa, IC.persona, IC.sumar, IC.campana, IC.grilla] : red === 'facebook' ? [IC.casa, IC.reels, IC.persona, IC.campana, IC.menu] : red === 'tiktok' ? [IC.casa, IC.buscar, IC.sumar, IC.coment, IC.persona] : [IC.casa, IC.buscar, IC.sumar, IC.reels, IC.persona];
  return '<nav class="cel-nav' + (oscura ? ' osc' : '') + '">' + ic.map(i => '<span>' + i + '</span>').join('') + '</nav>';
}
// El celular con la pieza, y arriba el selector de red
export function celularPieza(z, c, artes, o = {}) {
  const rs = redesPieza(z), red = rs.includes(o.red) ? o.red : rs[0], fc = o.fc || '#888';
  const tabs = rs.length > 1 ? '<div class="cel-redes" role="group" aria-label="Ver en">' + rs.map(k => '<button data-act="celRed" data-id="' + esc(z.id) + '" data-r="' + k + '"' + (k === red ? ' aria-pressed="true" class="on"' : '') + '>' + esc((REDES_CEL.find(x => x[0] === k) || [k, k])[1]) + '</button>').join('') + '</div>' : '<div class="cel-redes uno"><span>Así se ve en ' + esc((REDES_CEL.find(x => x[0] === red) || [red, red])[1]) + '</span></div>';
  return '<div class="cel-w">' + tabs + '<div class="cel red-' + red + ' t-' + tipoDe(z) + '"><div class="cel-scr">' + pantalla(z, c, red, artes, fc) + '</div></div></div>';
}
// Así queda el perfil de Instagram (grilla) o el inicio (scroll), adentro del celular
export function celularPerfil(c, piezas, artesDe, fcDe, o = {}) {
  const u = usuario(c.nombre), hist = piezas.filter(z => tipoDe(z) === 'historia'), pubs = piezas.filter(z => tipoDe(z) !== 'historia');
  const tile = z => { const a = (artesDe(z.id) || []).find(x => x.miniatura); return '<button class="cel-t" data-act="pzVer" data-id="' + esc(z.id) + '">' + (a ? '<img src="' + esc(a.miniatura) + '" alt="">' : '<span class="cel-ph" style="--fc:' + fcDe(z) + '"><b>' + esc(z.formato) + '</b><span>' + esc(z.tema || '') + '</span></span>') + (tipoDe(z) === 'reel' ? '<i class="cel-t-i">' + IC.reels + '</i>' : (artesDe(z.id) || []).length > 1 ? '<i class="cel-t-i">▣</i>' : '') + (o.estado ? o.estado(z) : '') + '</button>'; };
  const cuerpo = o.modo === 'scroll'
    ? '<div class="cel-scroll">' + (hist.length ? '<div class="cel-hl">' + hist.map(z => '<button data-act="pzVer" data-id="' + esc(z.id) + '">' + avatar(c, 'ring lg') + '<small>' + esc((z.fecha || '').slice(8, 10) + '/' + (z.fecha || '').slice(5, 7)) + '</small></button>').join('') + '</div>' : '') +
      pubs.map(z => '<article class="cel-ig" data-act="pzVer" data-id="' + esc(z.id) + '">' + igPost(z, c, artesDe(z.id), fcDe(z), textoPost(z, 125)) + '</article>').join('') + '</div>'
    : '<div class="cel-scroll"><div class="cel-pf"><div class="cel-pf-h">' + avatar(c, 'ring xl') + '<div class="cel-pf-n"><b>' + esc(c.nombre) + '</b><div><span><b>' + pubs.length + '</b>publicaciones</span><span><b>2.418</b>seguidores</span><span><b>312</b>seguidos</span></div></div></div>' +
      '<p class="cel-pf-bio">' + esc(o.bio || '') + '</p><div class="cel-pf-bt"><span>Seguir</span><span>Mensaje</span></div>' +
      (hist.length ? '<div class="cel-hl">' + hist.slice(0, 8).map(z => '<button data-act="pzVer" data-id="' + esc(z.id) + '">' + avatar(c, 'ring lg') + '<small>' + esc((z.fecha || '').slice(8, 10) + '/' + (z.fecha || '').slice(5, 7)) + '</small></button>').join('') + '</div>' : '') +
      '<div class="cel-pf-tabs"><span class="on">' + IC.grilla + '</span><span>' + IC.reels + '</span><span>' + IC.persona + '</span></div><div class="cel-grid">' + pubs.map(tile).join('') + '</div></div></div>';
  return '<div class="cel-w"><div class="cel red-instagram"><div class="cel-scr">' + barraEstado() + '<div class="cel-app"><div class="cel-top">' + (o.modo === 'scroll' ? '<b class="cel-ig-logo">Instagram</b><span class="cel-sp"></span>' + IC.heart + IC.enviar : '<b>' + esc(u) + '</b><span class="cel-sp"></span>' + IC.sumar + IC.menu) + '</div>' + cuerpo + '</div>' + navInferior('instagram') + '</div></div></div>';
}

export const CEL_CSS = `
.cel-w{display:grid;justify-items:center;gap:12px;padding:22px 16px}
.cel-redes{display:flex;gap:4px;background:color-mix(in srgb,var(--fg) 6%,var(--surface));border-radius:99px;padding:4px}
.cel-redes button{all:unset;cursor:pointer;font:600 13px Inter,system-ui,sans-serif;padding:7px 14px;border-radius:99px;color:var(--muted)}
.cel-redes button.on{background:var(--surface);color:var(--fg);box-shadow:var(--elev)}
.cel-redes.uno{background:none;font-size:12.5px;color:var(--muted)}
.cel{width:340px;max-width:100%;border-radius:50px;background:#0c0c0e;padding:11px;box-shadow:0 0 0 2px #2a2a2e,0 40px 80px -30px rgba(0,0,0,.55),inset 0 0 2px rgba(255,255,255,.2)}
.cel-scr{position:relative;height:690px;border-radius:40px;overflow:hidden;background:#fff;color:#0c0c0e;display:flex;flex-direction:column;font:14px/1.35 -apple-system,BlinkMacSystemFont,"Segoe UI",Inter,system-ui,sans-serif;isolation:isolate}
.cel-sb{flex:none;position:relative;z-index:3;height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 26px 0 30px;font-size:14.5px}
.cel-sb.osc{position:absolute;left:0;right:0;top:0;color:#fff}
.cel-isla{position:absolute;left:50%;top:10px;width:96px;height:27px;border-radius:20px;background:#000;transform:translateX(-50%)}
.cel-sbi{display:flex;align-items:flex-end;gap:2px}
.cel-sbi i{width:3px;background:currentColor;border-radius:1px}.cel-sbi i:nth-child(1){height:5px}.cel-sbi i:nth-child(2){height:7px}.cel-sbi i:nth-child(3){height:9px}
.cel-sbi em{width:22px;height:10px;border-radius:3px;border:1.5px solid currentColor;margin-left:6px;position:relative;background:linear-gradient(90deg,currentColor 70%,transparent 70%);background-clip:content-box;padding:1px}
.cel-app{flex:1;min-height:0;display:flex;flex-direction:column}
.cel-top{flex:none;display:flex;align-items:center;gap:16px;padding:6px 14px 8px}
.cel-top b{font-size:17px}
.cel-ig-logo{font-family:"Brush Script MT","Segoe Script",cursive;font-size:26px!important;font-weight:400}
.cel-fb-logo{color:#0866ff;font-size:25px!important;letter-spacing:-.04em;font-weight:800}
.cel-ib{width:34px;height:34px;border-radius:50%;background:#eef0f3;display:grid;place-items:center}.cel-ib svg{width:19px;height:19px}
.cel-top.li{gap:10px}.cel-li-q{flex:1;display:flex;align-items:center;gap:6px;background:#edf3f8;border-radius:6px;padding:7px 10px;color:#666;font-size:13.5px}.cel-li-q svg{width:16px;height:16px}
.cel-sp{flex:1}
.cel-scroll{flex:1;min-height:0;overflow-y:auto;scrollbar-width:none}
.cel-scroll::-webkit-scrollbar{display:none}
.cel-scroll.li{background:#f4f2ee}
.cel-av{flex:none;width:34px;height:34px;border-radius:50%;overflow:hidden;display:grid;place-items:center;background:#ddd;font-size:11px;font-weight:700;color:#333}
.cel-av img{width:100%;height:100%;object-fit:cover}
.cel-av.ring{box-shadow:0 0 0 2px #fff,0 0 0 4px #d62976}
.cel-av.sm{width:30px;height:30px}.cel-av.xs{width:28px;height:28px}.cel-av.lg{width:62px;height:62px}.cel-av.xl{width:84px;height:84px}
.cel-av.sq{border-radius:8px;width:46px;height:46px}
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
.cel-li{background:#fff;margin:8px 0}
.cel-li-seg{color:#0a66c2;font-size:14px}
/* Reels, TikTok e historias: a pantalla completa */
.cel-reel,.cel-story{position:absolute;inset:0;background:#000;color:#fff;display:flex;flex-direction:column}
.cel-full{position:absolute;inset:0}
.cel-full img,.cel-full video{width:100%;height:100%;object-fit:cover}
.cel-full.cel-ph{justify-content:center;padding:40px 26px}
.cel-full.cel-ph span{font-size:28px}
.cel-rl-top{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:52px 16px 0}
.cel-rl-top b{font-size:18px;font-weight:700}.cel-rl-top u{text-decoration:none;border-bottom:2px solid #fff;padding-bottom:3px}
.cel-rl-side{position:absolute;right:10px;bottom:120px;z-index:2;display:grid;gap:16px;justify-items:center}
.cel-rl-side span{display:grid;justify-items:center;gap:2px}.cel-rl-side svg{width:27px;height:27px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))}
.cel-rl-side small{font-size:11.5px;font-weight:600}
.cel-rl-bot{position:absolute;left:0;right:58px;bottom:62px;z-index:2;padding:0 14px;text-shadow:0 1px 2px rgba(0,0,0,.5)}
.cel-rl-bot::before{content:"";position:absolute;inset:-80px -60px -70px -20px;background:linear-gradient(transparent,rgba(0,0,0,.55));z-index:-1}
.cel-rl-u{display:flex;align-items:center;gap:8px;font-size:14px}
.cel-seguir{border:1px solid rgba(255,255,255,.7);border-radius:8px;padding:2px 9px;font-size:12.5px;font-weight:600}
.cel-rl-bot p{margin:8px 0 6px;font-size:13.5px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.cel-rl-bot .cel-tag{color:#fff;font-weight:600}
.cel-rl-audio{display:flex;align-items:center;gap:5px;font-size:12.5px}
.cel-st-top{position:relative;z-index:2;padding:48px 10px 0}
.cel-prog{height:2.5px;border-radius:2px;background:rgba(255,255,255,.35);overflow:hidden}.cel-prog i{display:block;height:100%;width:0;background:#fff;animation:celProg 6s linear infinite}
@keyframes celProg{to{width:100%}}
.cel-st-h{display:flex;align-items:center;gap:8px;margin-top:10px;font-size:13.5px;text-shadow:0 1px 2px rgba(0,0,0,.4)}
.cel-st-h span:not(.cel-sp):not(.cel-av){opacity:.75}
.cel-st-bot{position:absolute;left:0;right:0;bottom:22px;z-index:2;display:flex;align-items:center;gap:14px;padding:0 14px}
.cel-st-in{flex:1;border:1px solid rgba(255,255,255,.6);border-radius:99px;padding:10px 16px;font-size:13.5px}
.cel-nav{flex:none;display:flex;justify-content:space-around;align-items:center;padding:10px 6px 22px;border-top:1px solid #efefef;background:#fff}
.cel-nav.osc{position:absolute;left:0;right:0;bottom:0;z-index:3;background:#000;color:#fff;border-top-color:#222}
.cel-nav svg{width:25px;height:25px}
/* Perfil de Instagram */
.cel-pf-h{display:flex;align-items:center;gap:14px;padding:6px 14px 10px}
.cel-pf-h .cel-av.xl{width:74px;height:74px}
.cel-pf-n{flex:1;min-width:0}
.cel-pf-n > b{display:block;font-size:14px;margin-bottom:6px}
.cel-pf-n div{display:flex;justify-content:space-between;gap:6px}.cel-pf-n span{display:grid;font-size:11px;color:#333;text-align:center}.cel-pf-n span b{font-size:15px}
.cel-pf-bio{margin:0;padding:0 16px 10px;font-size:13px;white-space:pre-line}
.cel-pf-bt{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 16px 12px}
.cel-pf-bt span{background:#efefef;border-radius:8px;text-align:center;padding:7px;font-weight:600;font-size:13px}.cel-pf-bt span:first-child{background:#0095f6;color:#fff}
.cel-hl{display:flex;gap:14px;overflow-x:auto;padding:4px 14px 14px;scrollbar-width:none}
.cel-hl button{all:unset;cursor:pointer;display:grid;justify-items:center;gap:5px}.cel-hl small{font-size:11.5px}
.cel-pf-tabs{display:flex;justify-content:space-around;border-top:1px solid #efefef}
.cel-pf-tabs span{padding:10px 0;flex:1;display:grid;place-items:center;color:#999}.cel-pf-tabs span.on{color:#000;border-bottom:1.5px solid #000}
.cel-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px}
.cel-t{all:unset;cursor:pointer;position:relative;aspect-ratio:3/4;overflow:hidden;background:#eee}
.cel-t img{width:100%;height:100%;object-fit:cover;display:block}
.cel-t .cel-ph{height:100%;padding:10px;gap:4px}.cel-t .cel-ph span{font-size:12.5px}.cel-t .cel-ph b{font-size:9px}.cel-t .cel-ph::after{display:none}
.cel-t-i{position:absolute;top:6px;right:6px;color:#fff;font-style:normal;filter:drop-shadow(0 1px 2px rgba(0,0,0,.5))}.cel-t-i svg{width:18px;height:18px}
.cel-scroll .cel-ig{cursor:pointer;border-bottom:1px solid #efefef}
@media (max-width:720px){
  .cel-w{padding:10px 0}
  .cel{width:100%;border-radius:34px;padding:8px}
  .cel-scr{height:min(78vh,700px);border-radius:28px}
}
`;
