// Envíos programados de resúmenes de cuenta (con confirmación de un administrador).
// Corre cada 10 minutos (pg_cron, secreto `avisos_cron`) solo si hay algo que hacer:
//  · Falta un día y nadie confirmó → avisa a los administradores (campanita + mail) para que lo revisen.
//  · Llegó la hora y nadie confirmó → no manda nada, lo marca "Vencido" y avisa.
//  · Llegó la hora y está confirmado → manda cada mail tal cual quedó al confirmar. Si el resumen cambió después, ese no sale.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const APP = 'https://andale-ops.vercel.app/';
const TZ = 'America/Argentina/Cordoba';
const hoyAR = () => new Date().toLocaleDateString('sv-SE', { timeZone: TZ });
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mesTxt = (iso: string) => MESES[Number(String(iso).slice(5, 7)) - 1] + ' ' + String(iso).slice(0, 4);
const cuandoTxt = (iso: string) => { const d = new Date(iso); return d.toLocaleDateString('es-AR', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }) + ' a las ' + d.toLocaleTimeString('es-AR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }); };
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

const credCache: Record<string, { v: any; t: number }> = {};
async function cred(svc: any, n: string) {
  const c = credCache[n]; if (c && Date.now() - c.t < 60_000) return c.v;
  let v: any = null;
  try { const { data } = await svc.rpc('cred_leer', { n }); if (data) v = JSON.parse(data); } catch { v = null; }
  credCache[n] = { v, t: Date.now() }; return v;
}
// Seguimiento (igual que enviar-email): píxel para saber si lo abrió y links firmados para los clics.
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

async function admins(svc: any) {
  const { data } = await svc.from('personas').select('id, email').eq('rol', 'admin').eq('activo', true);
  return (data || []) as { id: string; email: string | null }[];
}
async function correo(svc: any) {
  const cfg = await cred(svc, 'email');
  const key = (cfg && cfg.key) || Deno.env.get('RESEND_API_KEY');
  const from = (cfg && cfg.from) || Deno.env.get('EMAIL_FROM') || 'àndale <administracion@weareandale.com>';
  const replyTo = (cfg && cfg.reply_to) || Deno.env.get('EMAIL_REPLY_TO') || ((from.match(/<([^>]+)>/) || [, from])[1]) || 'administracion@weareandale.com';
  const enviar = (o: Record<string, unknown>) => fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(o) });
  return { key, from, replyTo, enviar };
}
// Aviso a los administradores: campanita + un mail corto (el mail no depende de las preferencias: esto pide una decisión).
async function avisar(svc: any, titulo: string, cuerpo: string, conMail: boolean) {
  const ads = await admins(svc);
  if (ads.length) await svc.from('notificaciones').insert(ads.map(a => ({ persona_id: a.id, tipo: 'facturar', titulo: titulo.slice(0, 200), cuerpo: cuerpo.slice(0, 600), link: '#cobros' })));
  if (!conMail) return;
  const c = await correo(svc); if (!c.key) return;
  const para = ads.map(a => String(a.email || '').toLowerCase()).filter(e => EMAIL_RE.test(e)); if (!para.length) return;
  const html = '<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.55;color:#1E1E1E;max-width:520px">' +
    '<p style="font-size:18px;font-weight:700;margin:0 0 10px">' + esc(titulo) + '</p><p style="margin:0 0 18px">' + esc(cuerpo).replace(/\n/g, '<br>') + '</p>' +
    '<p style="margin:0"><a href="' + APP + '#cobros" style="display:inline-block;background:#1CB0F6;color:#fff;text-decoration:none;font-weight:700;padding:10px 18px;border-radius:999px">Revisar en la app</a></p></div>';
  try { await c.enviar({ from: c.from, to: para, subject: titulo, html, text: titulo + '\n\n' + cuerpo + '\n\n' + APP + '#cobros' }); } catch (_) { /* la campanita ya quedó */ }
}

async function mandar(svc: any, env: any) {
  const c = await correo(svc);
  if (!c.key) { await svc.from('envios_programados').update({ estado: 'Con errores', resultado: { error: 'El email no está conectado' } }).eq('id', env.id); return; }
  // Se toma el envío de forma atómica: si otra corrida ya lo tomó, esta no hace nada (nunca sale dos veces).
  const { data: tomado } = await svc.from('envios_programados').update({ estado: 'Enviando' }).eq('id', env.id).eq('estado', 'Confirmado').select('id');
  if (!tomado || !tomado.length) return;
  const { data: items } = await svc.from('envios_items').select('*').eq('envio_id', env.id).eq('estado', 'Pendiente');
  const ids = (items || []).map((i: any) => i.resumen_id).filter(Boolean);
  const { data: rs } = ids.length ? await svc.from('resumenes').select('id, updated_at, estado, cliente_id, periodo').in('id', ids) : { data: [] };
  const rMap = new Map((rs || []).map((r: any) => [r.id, r]));
  let ok = 0; const cambiaron: string[] = [], errores: string[] = [], ya: string[] = [];
  const { data: cls } = await svc.from('clientes').select('id, nombre');
  const nom = new Map((cls || []).map((x: any) => [x.id, x.nombre]));
  for (const it of items || []) {
    const r = rMap.get(it.resumen_id), quien = nom.get(it.cliente_id) || 'un cliente';
    if (!r) { await svc.from('envios_items').update({ estado: 'Error', error: 'El resumen ya no existe' }).eq('id', it.id); errores.push(quien + ': el resumen ya no existe'); continue; }
    if (r.estado === 'Enviado') { await svc.from('envios_items').update({ estado: 'Ya enviado' }).eq('id', it.id); ya.push(quien); continue; }
    if (String(r.updated_at) !== String(it.huella)) { await svc.from('envios_items').update({ estado: 'Cambió' }).eq('id', it.id); cambiaron.push(quien); continue; }
    const para = (it.para || []).filter((e: string) => EMAIL_RE.test(e));
    if (!para.length) { await svc.from('envios_items').update({ estado: 'Error', error: 'Sin email de cobros' }).eq('id', it.id); errores.push(quien + ': sin email'); continue; }
    const eid = crypto.randomUUID(), tr = await rastrear(String(it.html), eid);
    const adj = it.pdf_base64 ? [{ filename: it.pdf_nombre || 'resumen.pdf', content: it.pdf_base64 }] : undefined;
    let res: Response | null = null, out: any = {};
    try { res = await c.enviar({ from: c.from, to: para, reply_to: c.replyTo, subject: it.asunto, html: tr.html, text: it.texto || undefined, attachments: adj }); if (res.status === 429) { await new Promise(r => setTimeout(r, 1200)); res = await c.enviar({ from: c.from, to: para, reply_to: c.replyTo, subject: it.asunto, html: tr.html, text: it.texto || undefined, attachments: adj }); } out = await res.json().catch(() => ({})); } catch (e) { out = { message: String(e) }; }
    const bien = !!(res && res.ok && out && out.id), error = bien ? null : (out && (out.message || out.error)) || ('Resend respondió ' + (res ? res.status : '?'));
    if (bien && env.copia) { try { await c.enviar({ from: c.from, to: [c.replyTo], reply_to: c.replyTo, subject: it.asunto, html: it.html, text: it.texto || undefined, attachments: adj }); } catch (_) { /* la copia es un extra */ } }
    const fila = { id: eid, persona_id: env.confirmado_por, cliente_id: it.cliente_id, tipo: 'Resumen de cuenta', periodo: env.periodo, para, cc: [], asunto: it.asunto, adjuntos: adj ? [adj[0].filename] : [], estado: bien ? 'Enviado' : 'Error', proveedor_id: bien ? out.id : null, error, texto: it.texto || '' };
    let { error: eLog } = await svc.from('emails').insert({ ...fila, links: tr.links });
    if (eLog) { const { texto: _t, ...sinTexto } = fila; ({ error: eLog } = await svc.from('emails').insert({ ...sinTexto, links: tr.links })); if (eLog) await svc.from('emails').insert(sinTexto); }
    if (bien) {
      await svc.from('resumenes').update({ estado: 'Enviado', enviado_el: hoyAR() }).eq('id', r.id);
      await svc.from('gestiones').insert({ cliente_id: it.cliente_id, periodo: env.periodo, tipo: 'Resumen de cuenta', fecha: hoyAR(), canal: 'Email', nota: 'Envío programado · a ' + para.join(', '), persona_id: env.confirmado_por, email_id: eid });
      await svc.from('envios_items').update({ estado: 'Enviado', email_id: eid, enviado_at: new Date().toISOString(), html: '', pdf_base64: '' }).eq('id', it.id);
      ok++;
    } else { await svc.from('envios_items').update({ estado: 'Error', error }).eq('id', it.id); errores.push(quien + ': ' + error); }
    await new Promise(r => setTimeout(r, 600)); // Resend: máx. 2 por segundo
  }
  const fin = errores.length || cambiaron.length ? 'Con errores' : 'Enviado';
  await svc.from('envios_programados').update({ estado: fin, enviado_at: new Date().toISOString(), resultado: { ok, cambiaron, errores, ya } }).eq('id', env.id);
  const partes = [ok + (ok === 1 ? ' resumen enviado' : ' resúmenes enviados')];
  if (cambiaron.length) partes.push('No salieron porque se cambiaron después de confirmar: ' + cambiaron.join(', ') + '. Revisalos y mandalos desde Cobros.');
  if (errores.length) partes.push('Con error: ' + errores.join(' · '));
  if (ya.length) partes.push('Ya estaban enviados: ' + ya.join(', '));
  await avisar(svc, 'Resúmenes de ' + mesTxt(env.periodo) + ': ' + (fin === 'Enviado' ? 'listo' : 'revisar'), partes.join('\n'), fin !== 'Enviado');
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  const sec = req.headers.get('x-cron-secret') || '';
  const { data: okCron } = sec ? await svc.rpc('avisos_cron_ok', { s: sec }) : { data: false };
  if (!okCron) {
    // Un admin también puede pedir que corra ahora (por ejemplo, después de confirmar algo cuya hora ya pasó).
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
    const { data: yoData } = await sb.rpc('yo'); const yo = Array.isArray(yoData) ? yoData[0] : yoData;
    if (!yo || yo.rol !== 'admin') return json({ error: 'No autorizado' }, 401);
  }
  const ahora = Date.now(), hechos: string[] = [];
  const { data: envs } = await svc.from('envios_programados').select('*').in('estado', ['Esperando confirmación', 'Confirmado']).order('enviar_el');
  for (const e of envs || []) {
    const t = new Date(e.enviar_el).getTime(), n = (e.resumen_ids || []).length;
    if (e.estado === 'Esperando confirmación' && t <= ahora) {
      await svc.from('envios_programados').update({ estado: 'Vencido' }).eq('id', e.id);
      await avisar(svc, 'No se mandaron los resúmenes de ' + mesTxt(e.periodo), 'Estaban programados para el ' + cuandoTxt(e.enviar_el) + ', pero nadie confirmó el envío, así que no salió nada. Podés mandarlos ahora o programarlos de nuevo desde Cobros del mes.', true);
      hechos.push('vencido ' + e.id); continue;
    }
    if (e.estado === 'Esperando confirmación' && !e.avisado_at && t - 86_400_000 <= ahora) {
      await svc.from('envios_programados').update({ avisado_at: new Date().toISOString() }).eq('id', e.id);
      await avisar(svc, 'Confirmá el envío de los resúmenes de ' + mesTxt(e.periodo), n + (n === 1 ? ' resumen está programado' : ' resúmenes están programados') + ' para el ' + cuandoTxt(e.enviar_el) + '. Revisalos en Cobros del mes y tocá «Confirmar envío». Sin tu confirmación no se manda nada.', true);
      hechos.push('avisado ' + e.id); continue;
    }
    if (e.estado === 'Confirmado' && t <= ahora) { await mandar(svc, e); hechos.push('enviado ' + e.id); }
  }
  return json({ ok: true, hechos });
});
