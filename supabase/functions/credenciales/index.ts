// Cuentas y claves de las integraciones, cargadas desde la app (Configuración → Integraciones). Solo administradores.
// Se guardan cifradas en Supabase Vault (ver 0014_credenciales.sql). Al navegador nunca vuelve una clave: solo la cuenta y los últimos caracteres.
// Si una integración no tiene nada cargado acá, las funciones siguen usando los secretos de Supabase de siempre.
// POST { accion: 'estado' | 'guardar' | 'probar' | 'borrar', nombre?, datos? }
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
class Aviso extends Error { status: number; constructor(m: string, s = 400) { super(m); this.status = s; } }
const NOMBRES = ['anthropic', 'google', 'email', 'whatsapp', 'slack', 'dropbox', 'tally'];
const pista = (s: string) => s ? '…' + String(s).slice(-4) : '';
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const ENV: Record<string, () => boolean> = {
  anthropic: () => !!Deno.env.get('ANTHROPIC_API_KEY'),
  google: () => !!Deno.env.get('GOOGLE_SERVICE_ACCOUNT'),
  email: () => !!Deno.env.get('RESEND_API_KEY'),
  whatsapp: () => false,
  slack: () => false,
  dropbox: () => false,
  tally: () => false,
};
// Dropbox: se conecta con la app key/secret y el código que da Dropbox al autorizar (sin redirección).
async function dropboxCodigo(d: Record<string, any>) {
  const s = (k: string) => String(d[k] ?? '').trim();
  if (!s('app_key') || !s('app_secret')) throw new Aviso('Faltan la App key y el App secret (los ves en dropbox.com/developers → tu app → Settings).');
  if (!s('codigo')) throw new Aviso('Falta el código de autorización: tocá “Autorizar en Dropbox”, aceptá y pegá acá el código que te muestra.');
  const r = await fetch('https://api.dropboxapi.com/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'authorization_code', code: s('codigo'), client_id: s('app_key'), client_secret: s('app_secret') }) });
  const o = await r.json().catch(() => ({}));
  if (!r.ok || !o.refresh_token) throw new Aviso('Dropbox no aceptó el código (' + (o.error_description || o.error || r.status) + '). Los códigos duran unos minutos y sirven una sola vez: pedí uno nuevo.');
  let raiz = s('raiz') || '/'; if (!raiz.startsWith('/')) raiz = '/' + raiz; raiz = raiz.replace(/\/+$/, '') || '/';
  return { app_key: s('app_key'), app_secret: s('app_secret'), refresh_token: o.refresh_token, raiz };
}
async function dropboxToken(v: any) {
  const r = await fetch('https://api.dropboxapi.com/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: v.refresh_token, client_id: v.app_key, client_secret: v.app_secret }) });
  const o = await r.json().catch(() => ({}));
  if (!r.ok || !o.access_token) throw new Error('Dropbox: ' + (o.error_description || o.error || r.status));
  return o.access_token as string;
}

// Normaliza y valida lo que se carga; devuelve { valor, cuenta, pista }.
function preparar(n: string, d: Record<string, any>) {
  const s = (k: string) => String(d[k] ?? '').trim();
  if (n === 'anthropic') {
    if (!/^sk-ant-/.test(s('key'))) throw new Aviso('La clave de Anthropic empieza con “sk-ant-”. Copiala de console.anthropic.com → API Keys.');
    return { valor: { key: s('key'), modelo: s('modelo'), modelo_rapido: s('modelo_rapido') }, cuenta: s('cuenta') || 'Cuenta de Anthropic', pista: pista(s('key')) };
  }
  if (n === 'google') {
    let sa: any; try { const t = s('service_account'); sa = JSON.parse(t.startsWith('{') ? t : atob(t)); } catch { throw new Aviso('Pegá el contenido completo del archivo .json de la cuenta de servicio.'); }
    if (!sa.client_email || !sa.private_key) throw new Aviso('Ese JSON no es de una cuenta de servicio (falta client_email o private_key).');
    return { valor: { service_account: JSON.stringify(sa) }, cuenta: sa.client_email, pista: sa.project_id || '' };
  }
  if (n === 'email') {
    if (!/^re_/.test(s('key'))) throw new Aviso('La clave de Resend empieza con “re_”. Copiala de resend.com → API Keys.');
    const from = s('from'), m = from.match(/<([^>]+)>/), dir = m ? m[1] : from;
    if (!EMAIL_RE.test(dir)) throw new Aviso('El remitente tiene que ser un email, por ejemplo: àndale <administracion@weareandale.com>');
    if (s('reply_to') && !EMAIL_RE.test(s('reply_to'))) throw new Aviso('El email de respuesta no es válido.');
    return { valor: { key: s('key'), from, reply_to: s('reply_to') }, cuenta: from, pista: pista(s('key')) };
  }
  if (n === 'whatsapp') {
    if (!s('token') || !/^\d{6,}$/.test(s('phone_id'))) throw new Aviso('Faltan el token y el Phone number ID (son números, los ves en Meta → WhatsApp → Configuración de la API).');
    return { valor: { token: s('token'), phone_id: s('phone_id'), waba_id: s('waba_id'), numero: s('numero') }, cuenta: s('numero') || 'Número ' + s('phone_id'), pista: pista(s('token')) };
  }
  if (n === 'slack') {
    if (!/^xoxb-/.test(s('token'))) throw new Aviso('El token del bot de Slack empieza con “xoxb-”. Lo ves en api.slack.com/apps → tu app → OAuth & Permissions.');
    return { valor: { token: s('token'), canal: s('canal').replace(/^#/, '') }, cuenta: 'Slack', pista: pista(s('token')) };
  }
  if (n === 'tally') {
    if (!/^tly-/.test(s('key'))) throw new Aviso('La clave de Tally empieza con “tly-”. Creala en tally.so → Settings → API keys.');
    const firma = s('firma') || Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
    return { valor: { key: s('key'), firma }, cuenta: 'Tally', pista: pista(s('key')) };
  }
  throw new Aviso('Integración desconocida');
}

// Prueba la conexión de verdad contra cada servicio.
async function probar(n: string, v: any): Promise<{ ok: boolean; detalle: string }> {
  try {
    if (n === 'anthropic') {
      const r = await fetch('https://api.anthropic.com/v1/models?limit=1', { headers: { 'x-api-key': v.key, 'anthropic-version': '2023-06-01' } });
      const o = await r.json().catch(() => ({}));
      return r.ok ? { ok: true, detalle: 'La clave funciona.' } : { ok: false, detalle: o?.error?.message || 'Anthropic respondió ' + r.status };
    }
    if (n === 'google') {
      const sa = JSON.parse(v.service_account);
      const b64url = (s: string | Uint8Array) => (typeof s === 'string' ? btoa(unescape(encodeURIComponent(s))) : btoa(String.fromCharCode(...s))).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
      const now = Math.floor(Date.now() / 1000);
      const unsigned = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/drive.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 600 }));
      const der = Uint8Array.from(atob(String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
      const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
      const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));
      const t = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + unsigned + '.' + b64url(sig) });
      const to = await t.json().catch(() => ({}));
      if (!t.ok || !to.access_token) return { ok: false, detalle: 'Google rechazó la cuenta: ' + (to.error_description || to.error || t.status) };
      const f = await fetch('https://www.googleapis.com/drive/v3/files?pageSize=50&fields=files(id)&q=trashed%3Dfalse', { headers: { Authorization: 'Bearer ' + to.access_token } });
      const fo = await f.json().catch(() => ({}));
      if (!f.ok) return { ok: false, detalle: 'Drive: ' + (fo?.error?.message || f.status) };
      const n2 = (fo.files || []).length;
      return { ok: true, detalle: n2 ? 'Conectada. Ve ' + (n2 >= 50 ? 'más de 50' : n2) + ' archivos compartidos.' : 'Conectada, pero todavía no le compartieron ninguna carpeta. Compartí la carpeta de administración con ' + sa.client_email + '.' };
    }
    if (n === 'email') {
      const r = await fetch('https://api.resend.com/domains', { headers: { Authorization: 'Bearer ' + v.key } });
      const o = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, detalle: o?.message || 'Resend respondió ' + r.status };
      const doms = (o.data || []).map((x: any) => x.name + (x.status === 'verified' ? '' : ' (sin verificar)'));
      const dir = (v.from.match(/<([^>]+)>/) || [, v.from])[1], dom = String(dir).split('@')[1];
      const ok = (o.data || []).some((x: any) => x.name === dom && x.status === 'verified');
      return { ok, detalle: ok ? 'Lista para enviar desde ' + dom + '.' : 'La clave funciona, pero el dominio ' + dom + ' no está verificado en esa cuenta' + (doms.length ? ' (tiene: ' + doms.join(', ') + ').' : '.') };
    }
    if (n === 'whatsapp') {
      const r = await fetch('https://graph.facebook.com/v23.0/' + encodeURIComponent(v.phone_id) + '?fields=display_phone_number,verified_name,quality_rating', { headers: { Authorization: 'Bearer ' + v.token } });
      const o = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, detalle: 'Meta: ' + (o?.error?.message || r.status) };
      return { ok: true, detalle: 'Conectado: ' + (o.display_phone_number || '') + (o.verified_name ? ' · ' + o.verified_name : '') + (o.quality_rating ? ' · calidad ' + o.quality_rating : '') };
    }
    if (n === 'slack') {
      const r = await fetch('https://slack.com/api/auth.test', { method: 'POST', headers: { Authorization: 'Bearer ' + v.token } });
      const o = await r.json().catch(() => ({}));
      if (!o.ok) return { ok: false, detalle: 'Slack: ' + (o.error || r.status) };
      let extra = '';
      const sc = (r.headers.get('x-oauth-scopes') || '').split(',').map((x: string) => x.trim());
      const faltan = ['chat:write', 'users:read', 'users:read.email'].filter(x => !sc.includes(x));
      if (sc.length > 1 && faltan.length) return { ok: false, detalle: 'Conectado a ' + o.team + ', pero al bot le faltan permisos: ' + faltan.join(', ') + '. Agregalos en OAuth & Permissions y reinstalá la app.' };
      if (v.canal) extra = ' · avisos generales en #' + v.canal;
      return { ok: true, detalle: 'Conectado a ' + o.team + ' como ' + o.user + extra + '.' };
    }
    if (n === 'dropbox') {
      const t = await dropboxToken(v);
      const r = await fetch('https://api.dropboxapi.com/2/users/get_current_account', { method: 'POST', headers: { Authorization: 'Bearer ' + t } });
      const o = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, detalle: 'Dropbox: ' + (o.error_summary || r.status) };
      const equipo = o.root_info && o.root_info.root_namespace_id !== o.root_info.home_namespace_id;
      return { ok: true, detalle: 'Conectado como ' + (o.name && o.name.display_name) + ' (' + o.email + ')' + (equipo ? ' · carpetas del equipo' : '') + ' · carpeta base ' + v.raiz + '.' };
    }
    if (n === 'tally') {
      const r = await fetch('https://api.tally.so/users/me', { headers: { Authorization: 'Bearer ' + v.key } });
      const o = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, detalle: 'Tally: ' + (o.message || r.status) };
      return { ok: true, detalle: 'Conectado como ' + (o.fullName || o.firstName || o.email || 'usuario de Tally') + '.' };
    }
  } catch (e) { return { ok: false, detalle: (e as Error).message }; }
  return { ok: false, detalle: 'Sin prueba para esta integración.' };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  let b: any; try { b = await req.json(); } catch { return json({ error: 'Pedido inválido' }, 400); }
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const sb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
    const { data: yoData } = await sb.rpc('yo');
    const yo = Array.isArray(yoData) ? yoData[0] : yoData;
    if (!yo || yo.rol !== 'admin') return json({ error: 'Solo las socias pueden ver y cambiar las cuentas conectadas.' }, 403);
    const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const n = String(b.nombre || '');
    if (b.accion !== 'estado' && !NOMBRES.includes(n)) throw new Aviso('Integración desconocida');

    switch (b.accion) {
      case 'estado': {
        const { data, error } = await svc.rpc('cred_estado');
        const filas = error ? [] : (data || []);
        return json({ listo: !error, error: error ? 'Falta correr 0014_credenciales.sql en Supabase.' : null, cuentas: Object.fromEntries(NOMBRES.map(k => [k, { ...(filas.find((f: any) => f.nombre === k) || {}), secreto_viejo: ENV[k]() }])) });
      }
      case 'guardar': {
        let p: { valor: any; cuenta: string; pista: string };
        if (n === 'dropbox') { const v = await dropboxCodigo(b.datos || {}); p = { valor: v, cuenta: 'Dropbox', pista: '' }; }
        else if (n === 'tally') {
          // Conserva la firma de los webhooks si ya existía (así no se rompen los que ya están creados).
          const { data: prev } = await svc.rpc('cred_leer', { n });
          const pv = prev ? JSON.parse(prev) : null;
          p = preparar(n, { ...(b.datos || {}), firma: pv && pv.firma });
        } else p = preparar(n, b.datos || {});
        const pr = await probar(n, p.valor);
        if (!pr.ok && !b.forzar) return json({ ok: false, guardado: false, detalle: pr.detalle });
        const { error } = await svc.rpc('cred_guardar', { n, v: JSON.stringify(p.valor), p_cuenta: p.cuenta, p_pista: p.pista, p_por: yo.id });
        if (error) throw new Aviso(/function|does not exist/i.test(error.message) ? 'Falta correr 0014_credenciales.sql en Supabase.' : error.message, 500);
        await svc.rpc('cred_probado', { n, p_ok: pr.ok, p_detalle: pr.detalle });
        return json({ ok: pr.ok, guardado: true, detalle: pr.detalle, cuenta: p.cuenta });
      }
      case 'probar': {
        const { data } = await svc.rpc('cred_leer', { n });
        let v: any = data ? JSON.parse(data) : null;
        if (!v) {
          // Sin nada cargado en la app: probar lo que está en los secretos de Supabase.
          if (n === 'anthropic' && Deno.env.get('ANTHROPIC_API_KEY')) v = { key: Deno.env.get('ANTHROPIC_API_KEY') };
          if (n === 'google' && Deno.env.get('GOOGLE_SERVICE_ACCOUNT')) { const t = Deno.env.get('GOOGLE_SERVICE_ACCOUNT')!.trim(); v = { service_account: t.startsWith('{') ? t : atob(t) }; }
          if (n === 'email' && Deno.env.get('RESEND_API_KEY')) v = { key: Deno.env.get('RESEND_API_KEY'), from: Deno.env.get('EMAIL_FROM') || 'àndale <administracion@weareandale.com>' };
        }
        if (!v) return json({ ok: false, detalle: 'No hay nada conectado todavía.' });
        const pr = await probar(n, v);
        if (data) await svc.rpc('cred_probado', { n, p_ok: pr.ok, p_detalle: pr.detalle });
        return json(pr);
      }
      case 'borrar': {
        await svc.rpc('cred_borrar', { n });
        return json({ ok: true });
      }
      default: return json({ error: 'Acción desconocida' }, 400);
    }
  } catch (e) {
    console.error(b && b.accion, e);
    return json({ error: (e as Error).message || 'Error inesperado' }, e instanceof Aviso ? e.status : 500);
  }
});
