// Fondo automático para imágenes con transparencia (logos, íconos, PNG y SVG): si la imagen es clara va sobre negro,
// si es oscura sobre blanco. Se mira la imagen chiquita en un canvas (con caché). Si no se puede leer, no se toca nada.
const cache = new Map();
export function tonoImagen(url) {
  if (!url) return Promise.resolve(null);
  if (cache.has(url)) return cache.get(url);
  const p = new Promise(res => {
    const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async';
    im.onload = () => {
      try {
        const n = 48, c = document.createElement('canvas'); c.width = n; c.height = n;
        const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(im, 0, 0, n, n);
        const d = x.getImageData(0, 0, n, n).data; let s = 0, w = 0, tr = 0;
        for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255; if (a < 0.1) { tr++; continue; } s += (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255 * a; w += a; }
        res(w ? { lum: s / w, transp: tr / (n * n) } : null);
      } catch (e) { res(null); }
    };
    im.onerror = () => res(null);
    im.src = url;
  });
  cache.set(url, p); return p;
}
// 'oscuro' (va sobre negro), 'claro' (va sobre blanco) o '' si no tiene transparencia o no se pudo leer
export async function fondoPara(url) {
  const r = await tonoImagen(url);
  if (!r || r.transp < 0.02) return '';
  return r.lum > 0.62 ? 'oscuro' : 'claro';
}
// Marca con bg-osc / bg-cla los elementos [data-autobg="url"] que todavía no se miraron
export function fondosAuto(root) {
  (root || document).querySelectorAll('[data-autobg]:not([data-bgok])').forEach(el => {
    el.dataset.bgok = '1';
    fondoPara(el.dataset.autobg).then(f => { if (f) el.classList.add(f === 'oscuro' ? 'bg-osc' : 'bg-cla'); });
  });
}
