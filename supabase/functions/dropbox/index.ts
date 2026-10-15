// Dropbox de la agencia: crea las carpetas de cada mes de redes y de las entregas, da links para subir el arte
// directo desde el navegador, cuenta lo que hay en cada carpeta y devuelve miniaturas (también para el portal del cliente).
// verify_jwt apagado: se valida el usuario (equipo con rpc('yo'); clientes con portal_archivos).
// POST { accion: 'carpeta_mes' | 'subida' | 'subir' | 'contar' | 'miniaturas' | 'link' | 'portal', ... }
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
class Aviso extends Error { status: number; constructor(m: string, s = 400) { super(m); this.status = s; } }
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const FORMATOS_DEF = ['Reels', 'Posts', 'Historias', 'Carruseles'];
const IMG = /\.(jpe?g|png|gif|webp|tiff?|bmp|heic)$/i;
const limpio = (s: string) => String(s || '').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim() || 'Sin nombre';
// Los encabezados de Dropbox van en ASCII: los acentos se escapan.
const argHdr = (o: unknown) => JSON.stringify(o).replace(/[\u007f-\uffff]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

let tokenCache: { t: string; exp: number; raiz: string; root: string | null; key: string } | null = null;
async function conexion(svc: any) {
  const { data } = await svc.rpc('cred_leer', { n: 'dropbox' });
  const v = data ? JSON.parse(data) : null;
  if (!v || !v.refresh_token) throw new Aviso('Dropbox no está conectado. Conectalo en Configuración → Integraciones → Dropbox.', 503);
  if (tokenCache && tokenCache.key === v.refresh_token && tokenCache.exp > Date.now() + 60_000) return tokenCache;
  const r = await fetch('https://api.dropboxapi.com/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: v.refresh_token, client_id: v.app_key, client_secret: v.app_secret }) });
  const o = await r.json().catch(() => ({}));
  if (!r.ok || !o.access_token) throw new Aviso('Dropbox rechazó la conexión (' + (o.error_description || o.error || r.status) + '). Volvé a conectarlo en Integraciones.', 502);
  // Carpetas del equipo (Dropbox Business): se trabaja desde la raíz del equipo.
  let root: string | null = null;
  try {
    const a = await fetch('https://api.dropboxapi.com/2/users/get_current_account', { method: 'POST', headers: { Authorization: 'Bearer ' + o.access_token } });
    const ao = await a.json(); if (ao.root_info && ao.root_info.root_namespace_id !== ao.root_info.home_namespace_id) root = ao.root_info.root_namespace_id;
  } catch { root = null; }
  tokenCache = { t: o.access_token, exp: Date.now() + (o.expires_in || 14000) * 1000, raiz: v.raiz || '/', root, key: v.refresh_token };
  return tokenCache;
}
function hdrs(cx: any, extra: Record<string, string> = {}) {
  const h: Record<string, string> = { Authorization: 'Bearer ' + cx.t, ...extra };
  if (cx.root) h['Dropbox-API-Path-Root'] = JSON.stringify({ '.tag': 'root', root: cx.root });
  return h;
}
async function rpc(cx: any, ruta: string, body: unknown) {
  const r = await fetch('https://api.dropboxapi.com/2/' + ruta, { method: 'POST', headers: hdrs(cx, { 'Content-Type': 'application/json' }), body: JSON.stringify(body) });
  const o = await r.json().catch(() => ({}));
  if (!r.ok) { const e: any = new Aviso('Dropbox: ' + (o.error_summary || r.status), 502); e.dbx = o; throw e; }
  return o;
}
const unir = (...p: string[]) => ('/' + p.map(x => String(x || '').replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/')).replace(/\/+/g, '/');
async function asegurarCarpetas(cx: any, rutas: string[]) {
  for (const p of rutas) {
    try { await rpc(cx, 'files/create_folder_v2', { path: p, autorename: false }); }
    catch (e: any) { if (!/conflict/.test(JSON.stringify(e.dbx || ''))) throw e; }
  }
}
async function cfgLeer(svc: any): Promise<string[]> { const { data } = await svc.from('listas').select('valores').eq('clave', 'integraciones_cfg').maybeSingle(); return (data && data.valores) || []; }
const cfgVal = (cfg: string[], k: string, def: string) => { const x = cfg.find(y => y.startsWith('dropbox.' + k + '=')); return x ? x.slice(('dropbox.' + k + '=').length) : def; };
function rutaMes(cx: any, cfg: string[], cliente: string, mes: string) {
  const [y, m] = mes.split('-'); const mi = +m - 1;
  const mesTxt = cfgVal(cfg, 'mes', '{mm} {Mes}').replace('{mm}', m).replace('{Mes}', MESES[mi]).replace('{mes}', MESES[mi].toLowerCase());
  const rel = cfgVal(cfg, 'patron_redes', '{cliente}/RRSS/{año}/{mes}').replace('{cliente}', limpio(cliente)).replace(/\{a(ñ|n)o\}/, y).replace('{mes}', limpio(mesTxt)).replace('{mm}', m).replace('{Mes}', MESES[mi]);
  return unir(cx.raiz, rel);
}
function rutaProyecto(cx: any, cfg: string[], cliente: string, proyecto: string) {
  const rel = cfgVal(cfg, 'patron_proyectos', '{cliente}/Proyectos/{proyecto}/Entregas').replace('{cliente}', limpio(cliente)).replace('{proyecto}', limpio(proyecto)).replace(/\{a(ñ|n)o\}/, String(new Date().getFullYear()));
  return unir(cx.raiz, rel);
}
async function formatos(svc: any) { const { data } = await svc.from('listas').select('valores').eq('clave', 'formatosRedes').maybeSingle(); return (data && data.valores && data.valores.length ? data.valores : FORMATOS_DEF) as string[]; }
const dentro = (cx: any, p: string) => String(p || '').toLowerCase().startsWith((cx.raiz === '/' ? '/' : cx.raiz.toLowerCase() + '/')) || cx.raiz === '/';

async function miniaturas(cx: any, paths: string[]) {
  const imgs = paths.filter(p => IMG.test(p)).slice(0, 25);
  const out: Record<string, string> = {};
  if (imgs.length) {
    const r = await rpc(cx, 'files/get_thumbnail_batch', { entries: imgs.map(p => ({ path: p, format: 'jpeg', size: 'w480h320', mode: 'fitone_bestfit' })) });
    (r.entries || []).forEach((e: any, i: number) => { if (e['.tag'] === 'success' && e.thumbnail) out[imgs[i]] = 'data:image/jpeg;base64,' + e.thumbnail; });
  }
  return out;
}
async function links(cx: any, paths: string[]) {
  const out: Record<string, string> = {};
  for (const p of paths.slice(0, 80)) { try { const r = await rpc(cx, 'files/get_temporary_link', { path: p }); out[p] = r.link; } catch { /* archivo movido o borrado */ } }
  return out;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  let b: any; try { b = await req.json(); } catch { return json({ error: 'Pedido inválido' }, 400); }
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const sb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

    // Portal: el cliente solo ve los archivos de piezas y entregas que le mostramos.
    if (b.accion === 'portal') {
      // Varias piezas o entregas de una vez: { items: [{ entidad, id }] }. Cada una se valida con portal_archivos.
      const items = (Array.isArray(b.items) ? b.items : [{ entidad: b.entidad, id: b.id }]).slice(0, 40);
      const cx = await conexion(svc);
      const out: Record<string, any> = {}, todos: string[] = [];
      for (const it of items) {
        const { data: arch, error } = await sb.rpc('portal_archivos', { p_entidad: it.entidad, p_id: it.id });
        if (error) continue;
        const paths = (arch || []).map((a: any) => a.path).filter(Boolean);
        out[it.id] = { archivos: (arch || []).map((a: any) => ({ path: a.path, nombre: a.nombre || String(a.path).split('/').pop() })) };
        todos.push(...paths);
      }
      const mins: Record<string, string> = {};
      for (let i = 0; i < todos.length; i += 25) Object.assign(mins, await miniaturas(cx, todos.slice(i, i + 25)));
      const lks = await links(cx, todos);
      for (const k of Object.keys(out)) out[k].archivos = out[k].archivos.map((a: any) => ({ ...a, miniatura: mins[a.path] || '', link: lks[a.path] || '' }));
      return json({ items: out });
    }

    const { data: yoData } = await sb.rpc('yo');
    const yo = Array.isArray(yoData) ? yoData[0] : yoData;
    if (!yo) return json({ error: 'No autorizado' }, 403);
    const cx = await conexion(svc);
    const cfg = await cfgLeer(svc);

    switch (b.accion) {
      case 'carpeta_mes': {
        const { data: m } = await sb.from('redes_meses').select('id, mes, cliente_id, clientes(nombre)').eq('id', b.mes_id).maybeSingle();
        if (!m) throw new Aviso('Ese mes no existe o no tenés acceso.', 404);
        const base = rutaMes(cx, cfg, (m as any).clientes?.nombre || 'Cliente', String(m.mes).slice(0, 7));
        const fs = await formatos(svc);
        await asegurarCarpetas(cx, [base, ...fs.map(f => unir(base, limpio(f)))]);
        const web = 'https://www.dropbox.com/home' + base.split('/').map(encodeURIComponent).join('/');
        await sb.from('redes_meses').update({ carpeta: base, carpeta_url: web }).eq('id', m.id);
        return json({ ok: true, carpeta: base, carpeta_url: web });
      }
      case 'subida': case 'subir': {
        let carpeta = '';
        if (b.destino === 'pieza') {
          const { data: p } = await sb.from('piezas').select('id, formato, mes_id, redes_meses(id, carpeta, mes, clientes(nombre))').eq('id', b.id).maybeSingle();
          if (!p) throw new Aviso('Esa pieza no existe o no tenés acceso.', 404);
          const m: any = (p as any).redes_meses;
          let base = m.carpeta;
          if (!base) { base = rutaMes(cx, cfg, m.clientes?.nombre || 'Cliente', String(m.mes).slice(0, 7)); await asegurarCarpetas(cx, [base]); await sb.from('redes_meses').update({ carpeta: base, carpeta_url: 'https://www.dropbox.com/home' + base.split('/').map(encodeURIComponent).join('/') }).eq('id', m.id); }
          carpeta = unir(base, limpio(p.formato || 'Otros'));
        } else if (b.destino === 'entrega') {
          const { data: e } = await sb.from('entregas').select('id, titulo, proyectos(nombre, clientes(nombre))').eq('id', b.id).maybeSingle();
          if (!e) throw new Aviso('Esa entrega no existe o no tenés acceso.', 404);
          const pr: any = (e as any).proyectos;
          carpeta = unir(rutaProyecto(cx, cfg, pr?.clientes?.nombre || 'Cliente', pr?.nombre || 'Proyecto'), limpio(e.titulo || 'Entrega'));
        } else throw new Aviso('Destino inválido');
        await asegurarCarpetas(cx, [carpeta]);
        const path = unir(carpeta, limpio(String(b.nombre || 'archivo')));
        if (b.accion === 'subida') {
          const r = await rpc(cx, 'files/get_temporary_upload_link', { commit_info: { path, mode: 'add', autorename: true, mute: true }, duration: 3600 });
          return json({ link: r.link, path });
        }
        // Subida chica por el servidor (si el navegador no puede subir directo).
        const bin = Uint8Array.from(atob(String(b.base64 || '')), c => c.charCodeAt(0));
        if (!bin.length || bin.length > 6_000_000) throw new Aviso('El archivo es muy grande para subirlo así (máx. 6 MB).');
        const r = await fetch('https://content.dropboxapi.com/2/files/upload', { method: 'POST', headers: hdrs(cx, { 'Content-Type': 'application/octet-stream', 'Dropbox-API-Arg': argHdr({ path, mode: 'add', autorename: true, mute: true }) }), body: bin });
        const o = await r.json().catch(() => ({}));
        if (!r.ok) throw new Aviso('Dropbox: ' + (o.error_summary || r.status), 502);
        return json({ path: o.path_display || path, tam: o.size || bin.length });
      }
      case 'contar': {
        const { data: m } = await sb.from('redes_meses').select('id, carpeta').eq('id', b.mes_id).maybeSingle();
        if (!m || !m.carpeta) return json({ conteo: {}, sin_carpeta: true });
        const fs = await formatos(svc), conteo: Record<string, number> = {};
        for (const f of fs) {
          try {
            let r = await rpc(cx, 'files/list_folder', { path: unir(m.carpeta, limpio(f)), limit: 2000 });
            let n = (r.entries || []).filter((e: any) => e['.tag'] === 'file' && !/^[._]/.test(e.name)).length;
            while (r.has_more) { r = await rpc(cx, 'files/list_folder/continue', { cursor: r.cursor }); n += (r.entries || []).filter((e: any) => e['.tag'] === 'file' && !/^[._]/.test(e.name)).length; }
            conteo[f] = n;
          } catch { conteo[f] = 0; }
        }
        await sb.from('redes_meses').update({ conteo, conteo_at: new Date().toISOString() }).eq('id', m.id);
        return json({ conteo });
      }
      case 'miniaturas': {
        const paths = (Array.isArray(b.paths) ? b.paths : []).map(String).filter((p: string) => dentro(cx, p));
        return json({ miniaturas: await miniaturas(cx, paths) });
      }
      case 'link': {
        const p = String(b.path || ''); if (!dentro(cx, p)) throw new Aviso('Ese archivo no está en la carpeta de clientes.');
        return json({ link: (await links(cx, [p]))[p] || null });
      }
      default: return json({ error: 'Acción desconocida' }, 400);
    }
  } catch (e) {
    console.error(b && b.accion, e);
    return json({ error: (e as Error).message || 'Error inesperado' }, e instanceof Aviso ? e.status : 500);
  }
});
