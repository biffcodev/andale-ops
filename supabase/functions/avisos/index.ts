// Avisos fuera de la app: reenvía a Slack (mensaje directo a cada persona) los avisos nuevos
// y, de lunes a viernes a la mañana, le manda a cada uno su resumen del día (por Slack o, si no hay Slack, por email).
// La disparan la base (al crear avisos) y pg_cron, con el secreto `avisos_cron`. Un admin puede pedir una prueba.
// POST { accion: 'cola' | 'diario' | 'probar' }
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const APP = 'https://andale-ops.vercel.app/';
const hoyAR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Cordoba' });
const esc = (s: string) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const credCache: Record<string, { v: any; t: number }> = {};
async function cred(svc: any, n: string) {
  const c = credCache[n]; if (c && Date.now() - c.t < 60_000) return c.v;
  let v: any = null;
  try { const { data } = await svc.rpc('cred_leer', { n }); if (data) v = JSON.parse(data); } catch { v = null; }
  credCache[n] = { v, t: Date.now() }; return v;
}

// Slack: busca a la persona por email y le escribe por mensaje directo.
const idsSlack = new Map<string, string | null>();
async function slackId(token: string, email: string) {
  const k = email.toLowerCase(); if (idsSlack.has(k)) return idsSlack.get(k);
  const r = await fetch('https://slack.com/api/users.lookupByEmail?email=' + encodeURIComponent(k), { headers: { Authorization: 'Bearer ' + token } });
  const o = await r.json().catch(() => ({}));
  const id = o.ok && o.user ? o.user.id : null; idsSlack.set(k, id); return id;
}
async function slackDM(token: string, canal: string, texto: string, link?: string, boton?: string) {
  const blocks: any[] = [{ type: 'section', text: { type: 'mrkdwn', text: texto } }];
  if (link) blocks.push({ type: 'actions', elements: [{ type: 'button', text: { type: 'plain_text', text: boton || 'Abrir en àndale' }, url: APP + link.replace(/^\//, '') }] });
  const r = await fetch('https://slack.com/api/chat.postMessage', { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ channel: canal, text: texto.replace(/[*_]/g, ''), blocks, unfurl_links: false }) });
  const o = await r.json().catch(() => ({}));
  if (!o.ok) throw new Error(o.error || 'Slack ' + r.status);
}

// Preferencias de cada persona (Mi perfil): Slack por tipo de aviso, horario y resumen diario.
async function prefsDe(svc: any) {
  const { data } = await svc.from('personas').select('id, prefs');
  return new Map((data || []).map((p: any) => [p.id, p.prefs || {}]));
}
const enHorario = () => { const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Argentina/Cordoba' })); const h = d.getHours(), wd = d.getDay(); return wd >= 1 && wd <= 5 && h >= 9 && h < 19; };

async function cola(svc: any) {
  const sl = await cred(svc, 'slack');
  const prefs = await prefsDe(svc);
  // Quien pidió "Slack solo en horario de trabajo" no recibe fuera de horario: sus avisos esperan a la próxima vuelta.
  const silencio = enHorario() ? [] : [...prefs.entries()].filter(([, p]: any) => p.horario).map(([id]) => id);
  // Se "toman" los avisos pendientes de una vez, así dos disparos juntos no mandan duplicados.
  let q = svc.from('notificaciones').update({ slack: sl ? 'enviada' : 'omitida' }).eq('slack', 'pendiente').gte('created_at', new Date(Date.now() - 86400_000).toISOString());
  if (silencio.length) q = q.not('persona_id', 'in', '(' + silencio.join(',') + ')');
  const { data: rows } = await q.select('id, persona_id, tipo, titulo, cuerpo, link');
  // Tickets nuevos y respuestas de clientes también van al canal general, si hay uno configurado (una vez cada uno).
  if (sl && sl.canal && rows) {
    const vistos = new Set<string>();
    for (const r of rows.filter((x: any) => ['pedido', 'cliente'].includes(x.tipo))) {
      const k = r.titulo + '|' + r.link; if (vistos.has(k)) continue; vistos.add(k);
      try { await slackDM(sl.token, sl.canal, '*' + r.titulo + '*' + (r.cuerpo ? '\n' + r.cuerpo : ''), r.link); } catch (e) { console.error('canal', e); }
    }
  }
  if (!sl || !rows || !rows.length) return { enviados: 0, omitidos: rows ? rows.length : 0 };
  const ids = [...new Set(rows.map((r: any) => r.persona_id))];
  const { data: ps } = await svc.from('personas').select('id, email').in('id', ids);
  const mail = new Map((ps || []).map((p: any) => [p.id, p.email]));
  let ok = 0; const fallidos: string[] = [];
  const omitidos: string[] = [];
  for (const r of rows) {
    if (((prefs.get(r.persona_id) || {}) as any).slack?.[r.tipo] === false) { omitidos.push(r.id); continue; }
    try {
      const em = mail.get(r.persona_id); const uid = em ? await slackId(sl.token, em) : null;
      if (!uid) { fallidos.push(r.id); continue; }
      await slackDM(sl.token, uid, '*' + r.titulo + '*' + (r.cuerpo ? '\n' + r.cuerpo : ''), r.link);
      ok++;
    } catch { fallidos.push(r.id); }
  }
  if (fallidos.length) await svc.from('notificaciones').update({ slack: 'error' }).in('id', fallidos);
  if (omitidos.length) await svc.from('notificaciones').update({ slack: 'omitida' }).in('id', omitidos);
  return { enviados: ok, sin_slack: fallidos.length };
}

// Resumen del día de cada persona: tareas para hoy y atrasadas, tickets abiertos y avisos sin leer.
async function diario(svc: any, soloPersona?: string) {
  const hoy = hoyAR();
  const sl = await cred(svc, 'slack'), em = await cred(svc, 'email');
  const emailKey = (em && em.key) || Deno.env.get('RESEND_API_KEY');
  const from = (em && em.from) || Deno.env.get('EMAIL_FROM') || 'àndale <administracion@weareandale.com>';
  let q = svc.from('personas').select('id, alias, nombre, email, rol, prefs').eq('activo', true).not('email', 'is', null);
  if (soloPersona) q = q.eq('id', soloPersona);
  const { data: ps } = await q;
  const enSemana = new Date(Date.now() + 6 * 86400_000).toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Cordoba' });
  const { data: tks } = await svc.from('tareas').select('titulo, fecha, responsable_id, proyecto_id, proyectos!inner(nombre, estado, clientes(nombre))').eq('hecha', false).not('responsable_id', 'is', null).not('fecha', 'is', null).lte('fecha', enSemana);
  const { data: peds } = await svc.from('pedidos').select('numero, titulo, responsable_id, estado, para_cuando, clientes(nombre)').in('estado', ['Nuevo', 'En curso']).not('responsable_id', 'is', null);
  const { data: nots } = await svc.from('notificaciones').select('persona_id').eq('leida', false);
  let enviados = 0;
  for (const p of ps || []) {
    const pr = p.prefs || {};
    if (pr.diario === false && !soloPersona) continue;
    const mias = (tks || []).filter((t: any) => t.responsable_id === p.id && !['Entregado', 'Cancelado'].includes(t.proyectos?.estado));
    const atras = mias.filter((t: any) => t.fecha < hoy), deHoy = mias.filter((t: any) => t.fecha === hoy), prox = mias.filter((t: any) => t.fecha > hoy);
    const pm = (peds || []).filter((x: any) => x.responsable_id === p.id);
    const sinLeer = (nots || []).filter((x: any) => x.persona_id === p.id).length;
    if (!atras.length && !deHoy.length && !prox.length && !pm.length && !sinLeer && !soloPersona) continue;
    const linea = (t: any) => '• ' + t.titulo + ' — ' + (t.proyectos?.nombre || '') + (t.proyectos?.clientes?.nombre ? ' (' + t.proyectos.clientes.nombre + ')' : '') + (t.fecha && t.fecha !== hoy ? ' · ' + t.fecha.slice(8, 10) + '/' + t.fecha.slice(5, 7) : '');
    const partes: string[] = [];
    if (atras.length) partes.push('*Atrasadas (' + atras.length + ')*\n' + atras.slice(0, 10).map(linea).join('\n'));
    if (deHoy.length) partes.push('*Para hoy (' + deHoy.length + ')*\n' + deHoy.slice(0, 10).map(linea).join('\n'));
    if (prox.length) partes.push('*Esta semana (' + prox.length + ')*\n' + prox.slice(0, 8).map(linea).join('\n'));
    if (pm.length) partes.push('*Tickets abiertos (' + pm.length + ')*\n' + pm.slice(0, 8).map((x: any) => '• #' + x.numero + ' ' + x.titulo + (x.clientes?.nombre ? ' (' + x.clientes.nombre + ')' : '')).join('\n'));
    if (sinLeer) partes.push('Tenés ' + sinLeer + ' aviso' + (sinLeer > 1 ? 's' : '') + ' sin leer en la app.');
    const nombre = (p.nombre || p.alias || '').split(' ')[0];
    const texto = 'Buen día, ' + nombre + ' 🐷\n\n' + (partes.length ? partes.join('\n\n') : 'Hoy no tenés nada vencido ni para hoy. ¡Buen día!');
    try {
      const uid = sl && pr.diario_canal !== 'mail' ? await slackId(sl.token, p.email) : null;
      if (uid) { await slackDM(sl.token, uid, texto, '#mis', 'Ver mis trabajos'); enviados++; continue; }
      if (emailKey && pr.diario_canal !== 'slack') {
        const html = '<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.55;color:#17181F;max-width:560px">' +
          esc(texto).replace(/\*([^*]+)\*/g, '<b>$1</b>').replace(/\n/g, '<br>') + '<p style="margin-top:22px"><a href="' + APP + '#mis" style="background:#FF4655;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600">Ver mis trabajos</a></p></div>';
        const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + emailKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from, to: [p.email], subject: 'Tu día en àndale · ' + hoy.slice(8, 10) + '/' + hoy.slice(5, 7), html, text: texto.replace(/\*/g, '') }) });
        if (r.ok) enviados++;
      }
    } catch (e) { console.error('diario', p.alias, e); }
  }
  return { enviados };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  let b: any = {}; try { b = await req.json(); } catch { b = {}; }
  const url = Deno.env.get('SUPABASE_URL')!;
  const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  try {
    const sec = req.headers.get('x-cron-secret') || '';
    const { data: okCron } = sec ? await svc.rpc('avisos_cron_ok', { s: sec }) : { data: false };
    if (okCron) {
      if (b.accion === 'cola') return json(await cola(svc));
      if (b.accion === 'diario') return json(await diario(svc));
      return json({ error: 'Acción desconocida' }, 400);
    }
    // Prueba pedida desde la app por un admin: le manda su propio resumen.
    const sb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
    const { data: yoData } = await sb.rpc('yo');
    const yo = Array.isArray(yoData) ? yoData[0] : yoData;
    // Alta en el portal: el equipo habilita a un contacto y se le crea el usuario (solo a ese email).
    // Así el registro libre de Supabase puede quedar cerrado: nadie más puede crearse una cuenta.
    if (b.accion === 'portal_alta') {
      if (!yo || !['admin', 'equipo'].includes(yo.rol)) return json({ error: 'No autorizado' }, 403);
      const { data: k } = await sb.from('contactos').select('id, email, portal').eq('id', String(b.contacto_id || '')).maybeSingle();
      if (!k || !k.portal || !k.email) return json({ error: 'Ese contacto no tiene el portal habilitado o no tiene email.' }, 400);
      const email = String(k.email).trim().toLowerCase();
      const { error } = await svc.auth.admin.createUser({ email, email_confirm: true });
      if (error && !/already|registered|exists/i.test(error.message)) return json({ error: 'No se pudo dar de alta: ' + error.message }, 500);
      return json({ ok: true, nuevo: !error });
    }
    if (!yo || yo.rol !== 'admin') return json({ error: 'No autorizado' }, 403);
    if (b.accion === 'probar') { const r = await diario(svc, yo.id); return json({ ok: r.enviados > 0, detalle: r.enviados ? 'Listo: te llegó tu resumen (por Slack o por mail).' : 'No se pudo mandar: revisá que tu email de Equipo sea el mismo que usás en Slack, o que el email esté conectado.' }); }
    if (b.accion === 'cola') return json(await cola(svc));
    return json({ error: 'Acción desconocida' }, 400);
  } catch (e) {
    console.error(b && b.accion, e);
    return json({ error: (e as Error).message || 'Error inesperado' }, 500);
  }
});
