// Manual de marca online (como brand.linkedin.com o discord.com/branding), armado con el kit y la ficha de voz.
// Dos versiones: "completo" (la marca la hicimos nosotros: esencia, logo con sus reglas, color, tipografía, imágenes, voz y descargas)
// y "simple" (resumen con lo que nos pasó el cliente: logo, color, tipografía y descargas).
// Lo usan la página pública /m/<link> y la vista previa de la app.
import { kitDeTexto } from './kitmarca.js';
import { LOGO } from './marca.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const hexOk = h => /^#[0-9a-f]{6}$/i.test(h || '');
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const lum = h => { const [r, g, b] = rgb(h).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const sobre = h => lum(h) > 0.45 ? '#141414' : '#ffffff';
const cmyk = h => { const [r, g, b] = rgb(h).map(v => v / 255), k = 1 - Math.max(r, g, b); if (k >= 1) return '0 0 0 100'; return [r, g, b].map(v => Math.round((1 - v - k) / (1 - k) * 100)).concat(Math.round(k * 100)).join(' '); };
const lineas = v => String(v || '').split('\n').map(x => x.replace(/^[-•·*]\s*/, '').trim()).filter(Boolean);
const esImg = (tipo, url) => /^image\//.test(tipo || '') || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(url || '');
const ext = u => ((String(u || '').split('?')[0].match(/\.([a-z0-9]{2,5})$/i) || [])[1] || '').toUpperCase();
const bajar = (url, n) => url + (url.includes('?') ? '&' : '?') + 'download=' + encodeURIComponent(n || '');
const PESO = { 300: 'Light', 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extrabold', 900: 'Black' };
const ICO_DL = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>';
const ICO_EXT = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 4.5h5.5V10"/><path d="M19.5 4.5 11 13"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/></svg>';

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
  const pri = (cols.find(c => /principal/i.test(c.rol)) || cols[0] || { hex: '#141414' }).hex;
  const tit = kit.tipos.find(t => /t[ií]tulo/i.test(t.rol)) || kit.tipos[0], txt = kit.tipos.find(t => /texto/i.test(t.rol)) || kit.tipos[1] || tit;
  const vars = '--mm-p:' + pri + ';--mm-po:' + sobre(pri) + ';--mm-fh:' + fam(tit) + 'Inter,system-ui,sans-serif;--mm-fb:' + fam(txt) + 'Inter,system-ui,sans-serif;--mm-wh:' + ((tit && tit.peso) || 700);
  const heroLogo = kit.logos.find(l => esImg(l.tipo, l.url) && (l.fondo === 'marca' || (sobre(pri) === '#ffffff' && l.fondo === 'oscuro') || (sobre(pri) !== '#ffffff' && (l.fondo || 'claro') === 'claro')));
  const dl = (x, n) => '<a class="mm-dl" href="' + esc(bajar(x.url, n || x.n)) + '">' + ICO_DL + 'Descargar</a>';
  const secs = [];
  // 01 · Esencia (solo en el manual completo)
  const intro = man.intro || '';
  if (completo && (intro || m.rubro || m.publico)) secs.push(['esencia', 'Esencia', (intro ? '<p class="mm-lead">' + esc(intro) + '</p>' : '') +
    '<div class="mm-2">' + (m.rubro ? '<div><h4>Qué hacemos</h4><p>' + esc(m.rubro) + '</p></div>' : '') + (m.publico ? '<div><h4>Para quién</h4><p>' + esc(m.publico) + '</p></div>' : '') + '</div>']);
  // Logo
  if (kit.logos.length) {
    const reglas = [man.respeto ? ['Área de respeto', man.respeto] : null, man.minimo ? ['Tamaño mínimo', man.minimo] : null].filter(Boolean);
    const nos = lineas(man.no);
    secs.push(['logo', 'Logo', '<div class="mm-logos">' + kit.logos.map(l => '<figure class="mm-logo"><div class="mm-lf f-' + esc(l.fondo || 'claro') + '">' + (esImg(l.tipo, l.url) ? '<img src="' + esc(l.url) + '" alt="' + esc(l.n) + '">' : '<span class="mm-ext">' + esc(ext(l.url) || 'ARCHIVO') + '</span>') + '</div><figcaption><b>' + esc(l.n) + '</b>' + dl(l) + '</figcaption></figure>').join('') + '</div>' +
      (reglas.length ? '<div class="mm-2 mm-reglas">' + reglas.map(([t, v]) => '<div><h4>' + t + '</h4><p>' + esc(v) + '</p></div>').join('') + '</div>' : '') +
      (nos.length ? '<h4 class="mm-h4">Lo que no hacemos con el logo</h4><ul class="mm-no">' + nos.map(x => '<li><i>✕</i>' + esc(x) + '</li>').join('') + '</ul>' : '')]);
  }
  // Color
  if (cols.length) secs.push(['color', 'Color', '<div class="mm-cols">' + cols.map((c, i) => { const [r, g, b] = rgb(c.hex);
    return '<button class="mm-col' + (i === 0 ? ' big' : '') + '" style="background:' + esc(c.hex) + ';color:' + sobre(c.hex) + '" data-copiar="' + esc(c.hex) + '" title="Copiar ' + esc(c.hex) + '"><span class="mm-cr">' + esc(c.rol || '') + '</span><span class="mm-cn">' + esc(c.n || c.hex) + '</span>' +
      '<span class="mm-cv"><b>HEX</b> ' + esc(c.hex) + '<br><b>RGB</b> ' + r + ' ' + g + ' ' + b + '<br><b>CMYK</b> ' + cmyk(c.hex) + (c.pantone ? '<br><b>Pantone</b> ' + esc(c.pantone) : '') + '</span></button>'; }).join('') + '</div><p class="mm-nota">Tocá un color para copiar el código.</p>']);
  // Tipografía
  if (kit.tipos.length) secs.push(['tipografia', 'Tipografía', kit.tipos.map(t => '<div class="mm-tipo" style="font-family:' + esc(fam(t)) + 'Inter,system-ui,sans-serif"><div class="mm-ti"><span class="mm-cr">' + esc(t.rol || 'Tipografía') + '</span><b>' + esc(t.familia) + '</b><small>' + esc(PESO[t.peso] || 'Regular') + '</small>' +
    (t.url ? dl(t, t.n || t.familia) : '<a class="mm-dl" href="https://fonts.google.com/specimen/' + esc(String(t.familia || '').replace(/ /g, '+')) + '" target="_blank" rel="noopener">' + ICO_EXT + 'Google Fonts</a>') + '</div>' +
    '<div class="mm-spec" style="font-weight:' + esc(t.peso || 400) + '"><div class="mm-aa">Aa</div><p class="mm-abc">ABCDEFGHIJKLMNÑOPQRSTUVWXYZ<br>abcdefghijklmnñopqrstuvwxyz<br>0123456789 ¿?¡!@#&amp;$%</p></div></div>').join('') +
    (tit && txt && tit !== txt ? '<div class="mm-jer"><p class="mm-jt">' + esc(d.nombre) + ': una línea de título</p><p class="mm-jp">Y así se ve un texto corrido de la marca, con la tipografía de lectura. Sirve para posteos, web, presentaciones y piezas impresas.</p></div>' : '')]);
  // Imágenes y estilo
  const imgs = kit.recursos.filter(r => esImg(r.tipo, r.url));
  if (imgs.length || m.visual) secs.push(['imagenes', completo ? 'Imágenes y estilo' : 'Estilo', (m.visual ? '<p class="mm-lead sm">' + esc(m.visual) + '</p>' : '') + (imgs.length ? '<div class="mm-imgs">' + imgs.map(r => '<figure><img src="' + esc(r.url) + '" alt="' + esc(r.n) + '" loading="lazy"></figure>').join('') + '</div>' : '')]);
  // Voz (completo)
  if (completo && (m.tono || m.palabras_si || m.palabras_no)) {
    const si = lineas(String(m.palabras_si || '').replace(/[,;]\s*/g, '\n')), no = lineas(String(m.palabras_no || '').replace(/[,;]\s*/g, '\n')), pil = lineas(m.pilares), ej = String(m.ejemplos || '').split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).slice(0, 3);
    secs.push(['voz', 'Voz', (m.tono ? '<p class="mm-lead sm">' + esc(m.tono) + '</p>' : '') + ([m.trato, m.emojis].filter(Boolean).length ? '<p class="mm-meta">' + esc([m.trato ? 'Tratamos de ' + m.trato.toLowerCase() : '', m.emojis ? 'Emojis: ' + m.emojis.toLowerCase() : ''].filter(Boolean).join(' · ')) + '</p>' : '') +
      ((si.length || no.length) ? '<div class="mm-2 mm-sino">' + (si.length ? '<div class="si"><h4>Decimos</h4><ul>' + si.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '') + (no.length ? '<div class="no"><h4>No decimos ni hacemos</h4><ul>' + no.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '') + '</div>' : '') +
      (pil.length ? '<h4 class="mm-h4">De qué hablamos</h4><div class="mm-pil">' + pil.map(x => '<span>' + esc(x) + '</span>').join('') + '</div>' : '') +
      (ej.length ? '<h4 class="mm-h4">Así suena</h4><div class="mm-ej">' + ej.map(x => '<blockquote>' + esc(x).replace(/\n/g, '<br>') + '</blockquote>').join('') + '</div>' : '') +
      (m.hashtags ? '<p class="mm-meta">' + esc(m.hashtags) + '</p>' : '')]);
  }
  // Descargas
  const archivos = [...kit.logos.map(x => ['Logo', x]), ...kit.tipos.filter(t => t.url).map(t => ['Tipografía', { ...t, n: t.n || t.familia }]), ...kit.recursos.map(x => ['Archivo', x])];
  if (archivos.length || kit.links.length) secs.push(['descargas', 'Descargas', (archivos.length ? '<div class="mm-files">' + archivos.map(([k, x]) => '<a class="mm-file" href="' + esc(bajar(x.url, x.n)) + '"><span class="mm-fi">' + esc(ext(x.url) || '·') + '</span><span><b>' + esc(x.n) + '</b><small>' + k + '</small></span>' + ICO_DL + '</a>').join('') + '</div>' : '') +
    (kit.links.length ? '<div class="mm-links">' + kit.links.map(x => '<a href="' + esc(x.url) + '" target="_blank" rel="noopener">' + esc(x.n) + ICO_EXT + '</a>').join('') + '</div>' : '')]);

  const nav = secs.map(([id, t]) => '<a href="#' + id + '">' + esc(t) + '</a>').join('');
  return '<div class="mm" style="' + esc(vars) + '"><header class="mm-bar"><a class="mm-marca" href="#top">' + (d.avatar ? '<img src="' + esc(d.avatar) + '" alt="">' : '') + '<b>' + esc(d.nombre) + '</b><span>' + (completo ? 'Manual de marca' : 'Guía de marca') + '</span></a><nav>' + nav + '</nav></header>' +
    '<section class="mm-hero" id="top"><div class="mm-in">' + (heroLogo ? '<img class="mm-hl" src="' + esc(heroLogo.url) + '" alt="' + esc(d.nombre) + '">' : '<h1>' + esc(d.nombre) + '</h1>') +
    '<p>' + (completo ? 'Manual de marca' : 'Guía de marca') + '</p>' + (cols.length > 1 ? '<div class="mm-strip">' + cols.map(c => '<i style="background:' + esc(c.hex) + '"></i>').join('') + '</div>' : '') + '</div></section>' +
    secs.map(([id, t, h], i) => '<section class="mm-s" id="' + id + '"><div class="mm-in"><div class="mm-sh"><span>' + String(i + 1).padStart(2, '0') + '</span><h2>' + esc(t) + '</h2></div>' + h + '</div></section>').join('') +
    (secs.length ? '' : '<section class="mm-s"><div class="mm-in"><p class="mm-lead sm">Este manual todavía no tiene contenido.</p></div></section>') +
    '<footer class="mm-pie"><div class="mm-in"><span>' + (completo ? 'Marca diseñada por' : 'Guía preparada por') + '</span><a href="https://weareandale.com" target="_blank" rel="noopener" class="mm-andale">' + LOGO + '</a></div></footer></div>';
}

export const MANUAL_CSS = `
.mm{--mm-ink:#141414;--mm-soft:#5c5c63;--mm-line:#e6e6e9;font-family:var(--mm-fb);color:var(--mm-ink);background:#fff;min-height:100vh}
.mm *{box-sizing:border-box}
.mm-in{max-width:1080px;margin:0 auto;padding:0 28px}
.mm-bar{position:sticky;top:0;z-index:5;display:flex;align-items:center;gap:20px;padding:12px 28px;background:rgba(255,255,255,.92);backdrop-filter:blur(10px);border-bottom:1px solid var(--mm-line)}
.mm-marca{display:flex;align-items:center;gap:10px;color:inherit;text-decoration:none;flex:none}
.mm-marca img{width:30px;height:30px;border-radius:8px;object-fit:cover}
.mm-marca b{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:16px}
.mm-marca span{color:var(--mm-soft);font-size:13px}
.mm-bar nav{display:flex;gap:4px;overflow-x:auto;margin-left:auto;scrollbar-width:none}
.mm-bar nav::-webkit-scrollbar{display:none}
.mm-bar nav a{color:var(--mm-soft);text-decoration:none;font-size:14px;font-weight:500;padding:6px 10px;border-radius:8px;white-space:nowrap}
.mm-bar nav a:hover{color:var(--mm-ink);background:#f3f3f5}
.mm-hero{background:var(--mm-p);color:var(--mm-po);padding:110px 0 90px}
.mm-hero h1{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(48px,9vw,120px);line-height:.95;letter-spacing:-.03em;margin:0}
.mm-hl{display:block;max-width:min(520px,80%);max-height:220px;object-fit:contain}
.mm-hero p{margin:22px 0 0;font-size:20px;opacity:.85}
.mm-strip{display:flex;height:14px;border-radius:99px;overflow:hidden;margin-top:40px;max-width:420px;box-shadow:0 0 0 2px rgba(255,255,255,.25)}
.mm-strip i{flex:1}
.mm-s{padding:84px 0;border-bottom:1px solid var(--mm-line);scroll-margin-top:56px}
.mm-sh{display:flex;align-items:baseline;gap:16px;margin-bottom:34px}
.mm-sh span{font-family:var(--mm-fh);color:var(--mm-p);font-weight:700;font-size:18px;font-variant-numeric:tabular-nums}
.mm-sh h2{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(34px,5vw,56px);letter-spacing:-.02em;line-height:1;margin:0}
.mm-lead{font-size:clamp(20px,2.4vw,28px);line-height:1.35;margin:0 0 30px;max-width:820px;letter-spacing:-.01em}
.mm-lead.sm{font-size:clamp(17px,1.8vw,21px);color:#2a2a2e;white-space:pre-line}
.mm h4{margin:0 0 6px;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--mm-soft)}
.mm-h4{margin:34px 0 12px!important}
.mm-2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px 48px}
.mm-2 p{margin:0;font-size:16px;line-height:1.55;white-space:pre-line}
.mm-meta{color:var(--mm-soft);margin:6px 0 0}
.mm-nota{color:var(--mm-soft);font-size:13px;margin:12px 0 0}
.mm-dl{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--mm-ink);text-decoration:none;border:1px solid var(--mm-line);border-radius:99px;padding:5px 11px;white-space:nowrap}
.mm-dl:hover{border-color:var(--mm-ink)}
.mm-logos{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:20px}
.mm-logo{margin:0}
.mm-lf{aspect-ratio:16/10;border-radius:16px;display:grid;place-items:center;padding:40px}
.mm-lf.f-claro{background:#f4f4f2}.mm-lf.f-oscuro{background:#141414}.mm-lf.f-marca{background:var(--mm-p)}
.mm-lf img{max-width:100%;max-height:100%;object-fit:contain}
.mm-ext{font-weight:800;letter-spacing:.06em;color:#9a9aa0}
.mm-logo figcaption{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 2px 0}
.mm-reglas{margin-top:34px}
.mm-no{list-style:none;padding:0;margin:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:10px}
.mm-no li{display:flex;gap:10px;align-items:flex-start;background:#fbf3f3;border-radius:12px;padding:12px 14px;font-size:15px;line-height:1.4}
.mm-no i{font-style:normal;color:#d33;font-weight:800}
.mm-cols{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}
.mm-col{all:unset;box-sizing:border-box;cursor:pointer;display:flex;flex-direction:column;border-radius:16px;padding:18px;min-height:220px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.06);transition:transform .15s}
.mm-col:hover{transform:translateY(-2px)}
.mm-col.big{grid-column:span 2;min-height:300px}
.mm-cr{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;opacity:.8}
.mm-cn{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:24px;line-height:1.1;margin-top:6px}
.mm-cv{margin-top:auto;font-size:13px;line-height:1.6;font-variant-numeric:tabular-nums;opacity:.92}
.mm-cv b{font-weight:700;opacity:.7;display:inline-block;min-width:58px}
.mm-tipo{display:grid;grid-template-columns:220px 1fr;gap:28px;padding:26px 0;border-top:1px solid var(--mm-line)}
.mm-tipo:first-of-type{border-top:0;padding-top:0}
.mm-ti{display:flex;flex-direction:column;align-items:flex-start;gap:4px;font-family:Inter,system-ui,sans-serif}
.mm-ti b{font-size:20px}.mm-ti small{color:var(--mm-soft);margin-bottom:8px}
.mm-spec{display:flex;gap:28px;align-items:flex-start;min-width:0}
.mm-aa{font-size:clamp(80px,12vw,150px);line-height:.9;letter-spacing:-.02em}
.mm-abc{margin:6px 0 0;font-size:clamp(17px,2vw,22px);line-height:1.5;word-break:break-word}
.mm-jer{margin-top:34px;background:#f7f7f8;border-radius:16px;padding:30px 32px}
.mm-jt{font-family:var(--mm-fh);font-weight:var(--mm-wh);font-size:clamp(26px,3.4vw,40px);line-height:1.1;margin:0 0 12px;letter-spacing:-.01em}
.mm-jp{margin:0;font-size:17px;line-height:1.6;max-width:640px}
.mm-imgs{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}
.mm-imgs figure{margin:0;aspect-ratio:1;border-radius:14px;overflow:hidden;background:#f3f3f5}
.mm-imgs img{width:100%;height:100%;object-fit:cover;display:block}
.mm-sino .si{background:#f1f8ef;border-radius:16px;padding:20px 22px}
.mm-sino .no{background:#fbf3f3;border-radius:16px;padding:20px 22px}
.mm-sino ul{margin:6px 0 0;padding-left:18px;line-height:1.7}
.mm-pil{display:flex;flex-wrap:wrap;gap:8px}
.mm-pil span{background:color-mix(in srgb,var(--mm-p) 12%,#fff);border-radius:99px;padding:8px 14px;font-weight:600}
.mm-ej{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px}
.mm-ej blockquote{margin:0;background:#f7f7f8;border-radius:14px;padding:18px 20px;font-size:15px;line-height:1.55}
.mm-files{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px}
.mm-file{display:flex;align-items:center;gap:12px;border:1px solid var(--mm-line);border-radius:14px;padding:12px 14px;color:inherit;text-decoration:none}
.mm-file:hover{border-color:var(--mm-ink)}
.mm-file > span:nth-child(2){display:grid;min-width:0;flex:1}
.mm-file b{font-size:14.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mm-file small{color:var(--mm-soft);font-size:12.5px}
.mm-fi{flex:none;width:42px;height:42px;border-radius:10px;background:color-mix(in srgb,var(--mm-p) 14%,#fff);display:grid;place-items:center;font-size:10.5px;font-weight:800;letter-spacing:.04em}
.mm-links{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
.mm-links a{display:inline-flex;align-items:center;gap:8px;background:var(--mm-ink);color:#fff;text-decoration:none;border-radius:99px;padding:10px 18px;font-weight:600;font-size:14.5px}
.mm-pie{padding:56px 0 64px;color:var(--mm-soft);font-family:Inter,system-ui,sans-serif}
.mm-pie .mm-in{display:flex;align-items:center;gap:12px;font-size:14px}
.mm-andale{display:block;width:84px;color:var(--mm-ink)}
.mm-andale svg{display:block;width:100%;height:auto}
@media (max-width:760px){
  .mm-in{padding:0 18px}.mm-bar{padding:10px 16px;gap:10px}.mm-marca span{display:none}
  .mm-hero{padding:70px 0 56px}.mm-s{padding:56px 0}.mm-sh{margin-bottom:22px}
  .mm-2{grid-template-columns:1fr}.mm-cols{grid-template-columns:repeat(2,minmax(0,1fr))}.mm-col{min-height:170px}.mm-col.big{min-height:220px}
  .mm-cv b{min-width:42px}.mm-cv{font-size:12px}
  .mm-tipo{grid-template-columns:1fr;gap:12px}.mm-spec{flex-direction:column;gap:6px}.mm-logos{grid-template-columns:1fr}
}
@media print{.mm-bar{position:static}.mm-s{break-inside:avoid-page;padding:40px 0}.mm-hero{-webkit-print-color-adjust:exact;print-color-adjust:exact}.mm-col,.mm-lf{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;
