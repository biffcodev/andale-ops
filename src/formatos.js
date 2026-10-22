// Color de cada formato de Redes (Reels violeta, Historias rosa, Carruseles verde, Posts azul…). Lo usan la app y el portal.
const FMT_COLOR = [[/reel/i, '#8b5cf6'], [/histori|stor/i, '#e0598b'], [/carrus/i, '#14a07a'], [/post/i, '#2f7de1'], [/tiktok/i, '#0f9fb5'], [/video|youtube/i, '#d9822b']];
const FMT_OTROS = ['#b5893b', '#6b7fd7', '#c2569b', '#3f9a5f'];
export const fmtColor = f => { const x = FMT_COLOR.find(([re]) => re.test(f || '')); if (x) return x[1]; let h = 0; for (const c of String(f || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return FMT_OTROS[h % FMT_OTROS.length]; };
