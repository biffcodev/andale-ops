// Envía un email de àndale por Resend. Solo para administradores de la app.
// Registra el envío en `emails` y, si el envío salió bien y es para un cliente, la gestión en `gestiones`.
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
const TIPOS = ['Resumen de cuenta', 'Factura enviada', 'Recordatorio de pago', 'Aviso de aumento', 'Otro'];
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const lista = (v: unknown) => (Array.isArray(v) ? v : String(v || '').split(/[,;\s]+/)).map(x => String(x).trim().toLowerCase()).filter(Boolean);
const hoyAR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Cordoba' });

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    auth: { persistSession: false },
  });
  const { data: yoData } = await sb.rpc('yo');
  const yo = Array.isArray(yoData) ? yoData[0] : yoData;
  if (!yo || yo.rol !== 'admin') return json({ error: 'Solo los administradores pueden enviar emails.' }, 403);

  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) return json({ error: 'Falta configurar RESEND_API_KEY en los secretos de la función.' }, 500);

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

  const from = Deno.env.get('EMAIL_FROM') || 'àndale <administracion@weareandale.com>';
  const replyTo = Deno.env.get('EMAIL_REPLY_TO') || 'administracion@weareandale.com';
  const copia = b.copia === false ? [] : [replyTo];

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to: para, cc: cc.length ? cc : undefined, bcc: copia.length ? copia : undefined, reply_to: replyTo, subject: asunto, html: b.html, text: b.texto || undefined, attachments: adjuntos.length ? adjuntos : undefined }),
  });
  const out = await res.json().catch(() => ({}));
  const ok = res.ok && out && out.id;
  const error = ok ? null : (out && (out.message || out.error)) || ('Resend respondió ' + res.status);

  const { data: log } = await sb.from('emails').insert({
    persona_id: yo.id, cliente_id: b.cliente_id || null, factura_id: b.factura_id || null, tipo, periodo: b.periodo || null,
    para, cc, asunto, adjuntos: adjuntos.map((a: any) => a.filename), estado: ok ? 'Enviado' : 'Error', proveedor_id: ok ? out.id : null, error,
  }).select('id').single();

  if (ok && b.cliente_id && b.registrar !== false) {
    await sb.from('gestiones').insert({
      cliente_id: b.cliente_id, factura_id: b.factura_id || null, periodo: b.periodo || null, tipo, fecha: hoyAR(), canal: 'Email',
      nota: 'Enviado a ' + para.join(', ') + (b.nota ? ' · ' + b.nota : ''), persona_id: yo.id, email_id: log ? log.id : null,
    });
  }
  return ok ? json({ ok: true, id: out.id, email_id: log && log.id }) : json({ error: 'No se pudo enviar: ' + error }, 502);
});
