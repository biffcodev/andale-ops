// Seguimiento de mails: apertura (imagen invisible) y clics (redirección).
//   GET /seguimiento?e=<id del mail>            → registra "abrió el mail" y devuelve un GIF transparente de 1×1
//   GET /seguimiento?e=<id del mail>&l=<n>      → registra "hizo clic" y redirige al link n.º n guardado en ese mail
// Solo redirige a links que salieron en ese mail (no sirve para mandar a nadie a otro lado).
// Es pública (verify_jwt false): el cliente abre el mail sin estar logueado.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const GIF = Uint8Array.from(atob('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'), c => c.charCodeAt(0));
const NOCACHE = { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0', Pragma: 'no-cache', Expires: '0' };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Escáneres de seguridad que "hacen clic" solos antes que la persona: no cuentan como clic.
const ROBOT = /bot|crawler|spider|preview|scanner|barracuda|proofpoint|mimecast|safelinks|curl|python|wget|go-http|headless/i;
const gif = () => new Response(GIF, { headers: { 'Content-Type': 'image/gif', 'Content-Length': String(GIF.length), ...NOCACHE } });
const ir = (u: string) => new Response(null, { status: 302, headers: { Location: u, ...NOCACHE } });
async function firma(t: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(t))).slice(0, 12)].map(x => x.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async req => {
  const q = new URL(req.url).searchParams, e = q.get('e') || '', l = q.get('l'), uu = q.get('u') || '', sg = q.get('s') || '';
  const ua = (req.headers.get('user-agent') || '').slice(0, 200);
  const clic = l != null && l !== '';
  if (!UUID.test(e)) return clic ? ir('https://weareandale.com/') : gif();
  // El destino firmado manda: redirige aunque no se pueda registrar el clic.
  let dest = '';
  if (clic && /^https?:\/\//i.test(uu) && sg && sg === await firma(e + '|' + uu)) dest = uu;
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
    const { data: m } = await sb.from('emails').select('id, cliente_id, para').eq('id', e).maybeSingle();
    if (clic && !dest && m) { const { data: x } = await sb.from('emails').select('links').eq('id', e).maybeSingle(); const ls = x && Array.isArray(x.links) ? x.links : [], i = Number(l); if (Number.isInteger(i) && i >= 0 && i < ls.length && /^https?:\/\//i.test(String(ls[i]))) dest = String(ls[i]); }
    if (m) {
      const quien = (m.para || []).join(', ').slice(0, 200);
      if (clic) { if (!ROBOT.test(ua)) await sb.from('seguimiento').insert({ tipo: 'mail_click', email_id: m.id, cliente_id: m.cliente_id, ref: dest.slice(0, 200), quien, ua }); }
      else await sb.from('seguimiento').insert({ tipo: 'mail_abierto', email_id: m.id, cliente_id: m.cliente_id, quien, ua });
    }
  } catch (_) { /* el seguimiento nunca rompe el mail */ }
  return clic ? ir(dest || 'https://weareandale.com/') : gif();
});
