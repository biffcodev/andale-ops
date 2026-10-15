// Envía un email de àndale por Resend.
// Administradores: todos los tipos. Equipo: solo 'Mensaje' (mails libres a clientes: novedades, pedidos, coordinación).
// Registra el envío en `emails`; si es para un cliente, la gestión en `gestiones` (cobranza) o una charla en `comunicaciones` (mensajes).
//
// Secretos (Supabase → Edge Functions → Secrets):
//   RESEND_API_KEY   (obligatorio)
//   EMAIL_FROM       (opcional, default "àndale <administracion@weareandale.com>")
//   EMAIL_REPLY_TO   (opcional, default "administracion@weareandale.com")
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const TIPOS = ['Resumen de cuenta', 'Factura enviada', 'Recordatorio de pago', 'Aviso de aumento', 'Invoice', 'Mensaje', 'Otro'];
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const lista = (v: unknown) => (Array.isArray(v) ? v : String(v || '').split(/[,;\s]+/)).map(x => String(x).trim().toLowerCase()).filter(Boolean);
// Seguimiento: imagen invisible para saber si se abrió y links que pasan por /seguimiento para saber si hicieron clic.
// Cada link lleva su destino firmado, así la redirección funciona siempre y solo a links que salieron en el mail.
async function firma(t: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(t))).slice(0, 12)].map(x => x.toString(16).padStart(2, '0')).join('');
}
async function rastrear(html: string, eid: string) {
  const base = Deno.env.get('SUPABASE_URL') + '/functions/v1/seguimiento?e=' + eid;
  const links: string[] = [], vistos = new Map<string, string>();
  for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/gi)) {
    const raw = m[1]; if (vistos.has(raw) || links.length >= 40) continue;
    const u = raw.replace(/&amp;/g, '&'); links.push(u);
    vistos.set(raw, base + '&amp;l=' + (links.length - 1) + '&amp;u=' + encodeURIComponent(u) + '&amp;s=' + await firma(eid + '|' + u));
  }
  const out = html.replace(/href="(https?:\/\/[^"]+)"/gi, (all, raw) => vistos.has(raw) ? 'href="' + vistos.get(raw) + '"' : all);
  const px = '<img src="' + base + '" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0" />';
  return { html: /<\/body>/i.test(out) ? out.replace(/<\/body>/i, px + '</body>') : out + px, links };
}
const hoyAR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Cordoba' });

// Cuentas cargadas desde la app (Configuración → Integraciones, cifradas en Vault). Si no hay, se usan los secretos de Supabase.
const credCache: Record<string, { v: any; t: number }> = {};
async function cred(n: string) {
  const c = credCache[n]; if (c && Date.now() - c.t < 60_000) return c.v;
  let v: any = null;
  try { const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } }); const { data } = await svc.rpc('cred_leer', { n }); if (data) v = JSON.parse(data); } catch { v = null; }
  credCache[n] = { v, t: Date.now() }; return v;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    auth: { persistSession: false },
  });
  const { data: yoData } = await sb.rpc('yo');
  const yo = Array.isArray(yoData) ? yoData[0] : yoData;
  if (!yo || !['admin', 'equipo'].includes(yo.rol)) return json({ error: 'No tenés permiso para enviar emails.' }, 403);

  const cfgMail = await cred('email');
  const key = (cfgMail && cfgMail.key) || Deno.env.get('RESEND_API_KEY');
  if (!key) return json({ error: 'El email no está conectado. Conectalo en Configuración → Integraciones → Email.' }, 500);

  let b: Record<string, any>;
  try { b = await req.json(); } catch { return json({ error: 'Pedido inválido' }, 400); }
  const para = lista(b.para), cc = lista(b.cc);
  const malos = [...para, ...cc].filter(e => !EMAIL_RE.test(e));
  if (!para.length) return json({ error: 'Falta el destinatario.' }, 400);
  if (malos.length) return json({ error: 'Email inválido: ' + malos.join(', ') }, 400);
  if (para.length + cc.length > 20) return json({ error: 'Demasiados destinatarios (máx. 20).' }, 400);
  const asunto = String(b.asunto || '').trim();
  if (!asunto || !b.html) return json({ error: 'Faltan el asunto o el contenido.' }, 400);
  const adjuntos = (Array.isArray(b.adjuntos) ? b.adjuntos : []).slice(0, 5)
    .filter((a: any) => a && a.nombre && a.base64).map((a: any) => ({ filename: String(a.nombre), content: String(a.base64) }));
  if (adjuntos.reduce((s: number, a: any) => s + a.content.length, 0) > 14_000_000) return json({ error: 'Los adjuntos superan el máximo (10 MB).' }, 400);
  const tipo = TIPOS.includes(b.tipo) ? b.tipo : 'Otro';
  if (yo.rol !== 'admin' && tipo !== 'Mensaje') return json({ error: 'Solo los administradores pueden enviar mails de cobranza y documentos.' }, 403);
  // El registro lo hace la función (el equipo no tiene acceso directo a la tabla de emails).
  const adm = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

  let from = (cfgMail && cfgMail.from) || Deno.env.get('EMAIL_FROM') || 'àndale <administracion@weareandale.com>';
  let replyTo = (cfgMail && cfgMail.reply_to) || Deno.env.get('EMAIL_REPLY_TO') || ((from.match(/<([^>]+)>/) || [, from])[1]) || 'administracion@weareandale.com';
  if (tipo === 'Mensaje') {
    // Sale con el nombre de quien escribe y las respuestas le llegan a esa persona.
    const { data: p } = await adm.from('personas').select('alias, nombre, email').eq('id', yo.id).maybeSingle();
    const dir = (from.match(/<([^>]+)>/) || [, from])[1];
    const nombre = String((p && (p.nombre || p.alias)) || yo.alias || '').replace(/[<>"]/g, '').trim();
    if (nombre) from = nombre + ' · àndale <' + dir + '>';
    if (p && p.email && EMAIL_RE.test(p.email)) replyTo = p.email;
  }
  const copia = b.copia === false ? [] : [replyTo];
  const eid = crypto.randomUUID(), tr = await rastrear(String(b.html), eid);
  const enviar = (o: Record<string, unknown>) => fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(o) });

  // Al cliente va con seguimiento; la copia para àndale sale aparte y sin seguimiento, así abrirla no cuenta como "lo abrió el cliente".
  const res = await enviar({ from, to: para, cc: cc.length ? cc : undefined, reply_to: replyTo, subject: asunto, html: tr.html, text: b.texto || undefined, attachments: adjuntos.length ? adjuntos : undefined });
  const out = await res.json().catch(() => ({}));
  const ok = res.ok && out && out.id;
  const error = ok ? null : (out && (out.message || out.error)) || ('Resend respondió ' + res.status);
  if (ok && copia.length) {
    const c = { from, to: copia, reply_to: replyTo, subject: asunto, html: b.html, text: b.texto || undefined, attachments: adjuntos.length ? adjuntos : undefined };
    try { let r2 = await enviar(c); if (r2.status === 429) { await new Promise(r => setTimeout(r, 1100)); r2 = await enviar(c); } } catch (_) { /* la copia es un extra */ }
  }

  const fila = { id: eid, persona_id: yo.id, cliente_id: b.cliente_id || null, factura_id: b.factura_id || null, tipo, periodo: b.periodo || null,
    para, cc, asunto, adjuntos: adjuntos.map((a: any) => a.filename), estado: ok ? 'Enviado' : 'Error', proveedor_id: ok ? out.id : null, error };
  let { data: log, error: eLog } = await adm.from('emails').insert({ ...fila, links: tr.links }).select('id').single();
  if (eLog) ({ data: log } = await adm.from('emails').insert(fila).select('id').single()); // sin la columna links (falta el SQL 0020)

  if (ok && b.cliente_id && b.registrar !== false && tipo === 'Mensaje') {
    await adm.from('comunicaciones').insert({
      cliente_id: b.cliente_id, fecha: hoyAR(), canal: 'Email', con_quien: para.join(', '), resumen: 'Mail: ' + asunto + (b.nota ? ' · ' + String(b.nota).slice(0, 400) : ''),
      acuerdo: '', proximo: '', hecho: true, responsable_id: yo.id,
    });
  } else if (ok && b.cliente_id && b.registrar !== false) {
    await sb.from('gestiones').insert({
      cliente_id: b.cliente_id, factura_id: b.factura_id || null, periodo: b.periodo || null, tipo, fecha: hoyAR(), canal: 'Email',
      nota: 'Enviado a ' + para.join(', ') + (b.nota ? ' · ' + b.nota : ''), persona_id: yo.id, email_id: log ? log.id : null,
    });
  }
  return ok ? json({ ok: true, id: out.id, email_id: log && log.id }) : json({ error: 'No se pudo enviar: ' + error }, 502);
});
