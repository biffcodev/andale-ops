// Automatizaciones: reglas listas para prender o apagar desde la app (botón ⚡ Automatizar).
// Corre todos los días a la mañana (pg_cron, secreto `avisos_cron`) y hace solo lo que esté prendido.
// Un admin (o alguien del equipo, salvo cobros) puede correr una regla en el momento para probarla.
// POST { accion: 'correr' } (cron) | { accion: 'probar', clave } (app)
// La regla de tickets (asignar responsable) no pasa por acá: la aplica la base al crear el ticket.
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
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const sumarDias = (iso: string, n: number) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const difDias = (a: string, b: string) => Math.round((new Date(a + 'T12:00:00Z').getTime() - new Date(b + 'T12:00:00Z').getTime()) / 86400_000);
const mesSig = (iso: string) => { const [y, m] = iso.split('-').map(Number); return m === 12 ? (y + 1) + '-01-01' : y + '-' + String(m + 1).padStart(2, '0') + '-01'; };
const diasDelMes = (iso: string) => { const [y, m] = iso.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate(); };
const norm = (s: string) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const plata = (n: number, mon: string) => (mon === 'USD' ? 'US$ ' : mon === 'EUR' ? '€ ' : mon === 'GBP' ? '£ ' : '$ ') + Math.round(n).toLocaleString('es-AR');
const num = (v: unknown, def: number, min: number, max: number) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def; };

const credCache: Record<string, { v: any; t: number }> = {};
async function cred(svc: any, n: string) {
  const c = credCache[n]; if (c && Date.now() - c.t < 60_000) return c.v;
  let v: any = null;
  try { const { data } = await svc.rpc('cred_leer', { n }); if (data) v = JSON.parse(data); } catch { v = null; }
  credCache[n] = { v, t: Date.now() }; return v;
}
async function admins(svc: any) {
  const { data } = await svc.from('personas').select('id').eq('rol', 'admin').eq('activo', true);
  return (data || []).map((p: any) => p.id);
}
async function avisar(svc: any, personas: string[], tipo: string, titulo: string, cuerpo: string, link: string) {
  const rows = [...new Set(personas.filter(Boolean))].map(persona_id => ({ persona_id, tipo, titulo: titulo.slice(0, 200), cuerpo: cuerpo.slice(0, 600), link }));
  if (rows.length) await svc.from('notificaciones').insert(rows);
  return rows.length;
}

// ---------------------------------------------------------------------------
// 1 · Redes: arrancar el mes siguiente (el día que elijan, con el plan y las piezas fijas)
// ---------------------------------------------------------------------------
async function redesArrancar(svc: any, cfg: any, forzar: boolean, ultima: string | null) {
  const hoy = hoyAR(), dia = num(cfg.dia, 20, 1, 28);
  const yaEsteMes = ultima && ultima.slice(0, 7) === hoy.slice(0, 7);
  if (!forzar && (Number(hoy.slice(8, 10)) < dia || yaEsteMes)) return null; // no le toca hoy
  const actual = hoy.slice(0, 7) + '-01', sig = mesSig(actual);
  const { data: abs } = await svc.from('abonos').select('id, cliente_id, plan, abono_responsables(persona_id)').eq('tipo', 'Redes').eq('estado', 'Activo');
  const { data: hechos } = await svc.from('redes_meses').select('cliente_id').eq('mes', sig);
  const ya = new Set((hechos || []).map((m: any) => m.cliente_id));
  const { data: listas } = await svc.from('listas').select('clave, valores').like('clave', 'plan:%');
  const planes = new Map((listas || []).map((l: any) => [l.clave.slice(5), l.valores || []]));
  const planDe = (p: string) => { const o: Record<string, number> = {}; (planes.get(p) || []).forEach((x: string) => { const [f, n] = String(x).split('='); if (f && +n > 0) o[f] = +n; }); return o; };
  let creados = 0, piezas = 0; const errores: string[] = [];
  const vistos = new Set<string>();
  for (const a of abs || []) {
    if (ya.has(a.cliente_id) || vistos.has(a.cliente_id)) continue; vistos.add(a.cliente_id);
    try {
      const { data: base } = await svc.from('redes_meses').select('id, plan, responsable_id').eq('cliente_id', a.cliente_id).eq('mes', actual).maybeSingle();
      const plan = base && base.plan && Object.keys(base.plan).length ? base.plan : planDe(a.plan || '');
      const resp = (base && base.responsable_id) || ((a.abono_responsables || [])[0] || {}).persona_id || null;
      const { data: m, error } = await svc.from('redes_meses').insert({ cliente_id: a.cliente_id, abono_id: a.id, mes: sig, estado: 'Planificación', plan, responsable_id: resp }).select('id').single();
      if (error) { if (!/duplicate|unique/i.test(error.message)) errores.push(error.message); continue; }
      creados++;
      if (base) { // las piezas fijas (las que se repiten un día de la semana) se crean solas, como al arrancar a mano
        const { data: bp } = await svc.from('piezas').select('formato, red, tema, hashtags, hora, fijo, responsable_id').eq('mes_id', base.id).neq('fijo', '');
        const k = new Set<string>(), nuevas: any[] = [];
        for (const z of bp || []) {
          const kk = z.fijo + '|' + z.formato + '|' + norm(z.tema); if (k.has(kk)) continue; k.add(kk);
          const dow = DIAS.indexOf(z.fijo); if (dow < 0) continue;
          for (let d = 1; d <= diasDelMes(sig); d++) {
            const f = sig.slice(0, 8) + String(d).padStart(2, '0');
            if (new Date(f + 'T12:00:00Z').getUTCDay() === dow) nuevas.push({ mes_id: m.id, cliente_id: a.cliente_id, formato: z.formato, red: z.red, tema: z.tema, hashtags: z.hashtags, hora: z.hora, fecha: f, fijo: z.fijo, responsable_id: z.responsable_id, estado: 'Idea', orden: nuevas.length });
          }
        }
        if (nuevas.length) { const { error: e2 } = await svc.from('piezas').insert(nuevas); if (!e2) piezas += nuevas.length; }
      }
    } catch (e) { errores.push((e as Error).message); }
  }
  const nombreMes = MESES[Number(sig.slice(5, 7)) - 1];
  if (creados) await avisar(svc, await admins(svc), 'cliente', 'Redes: arrancó ' + nombreMes + ' para ' + creados + ' cliente' + (creados > 1 ? 's' : ''), 'Con el plan de cada uno' + (piezas ? ' y ' + piezas + ' piezas fijas' : '') + '. Si alguno no iba, se borra desde el mes.', '#redes');
  return (creados ? 'Arrancó ' + nombreMes + ' para ' + creados + ' cliente' + (creados > 1 ? 's' : '') + (piezas ? ' (' + piezas + ' piezas fijas)' : '') : 'Todos los clientes ya tenían ' + nombreMes + ' arrancado') + (errores.length ? ' · ' + errores.length + ' con error: ' + errores[0] : '');
}

// ---------------------------------------------------------------------------
// 2 · Redes: recordarle al cliente que tiene piezas para aprobar (mail con link al portal)
// ---------------------------------------------------------------------------
async function redesRecordar(svc: any, cfg: any) {
  const dias = num(cfg.dias, 3, 1, 15), hoy = hoyAR();
  const em = await cred(svc, 'email'); const key = (em && em.key) || Deno.env.get('RESEND_API_KEY');
  if (!key) return 'No hay email conectado: no se mandó nada';
  const from = (em && em.from) || Deno.env.get('EMAIL_FROM') || 'àndale <administracion@weareandale.com>';
  const replyTo = (em && em.reply_to) || Deno.env.get('EMAIL_REPLY_TO') || 'administracion@weareandale.com';
  const { data: ms } = await svc.from('redes_meses').select('id, cliente_id, mes, enviado_at, clientes(nombre)').eq('visible_cliente', true).neq('estado', 'Cerrado').not('enviado_at', 'is', null);
  let enviados = 0;
  for (const m of ms || []) {
    if (difDias(hoy, String(m.enviado_at).slice(0, 10)) < dias) continue;
    const { count } = await svc.from('piezas').select('id', { count: 'exact', head: true }).eq('mes_id', m.id).eq('estado', 'Para el cliente');
    if (!count) continue;
    const desde = new Date(Date.now() - dias * 86400_000).toISOString();
    const { count: ya } = await svc.from('emails').select('id', { count: 'exact', head: true }).eq('cliente_id', m.cliente_id).eq('periodo', m.mes).like('asunto', 'Piezas para aprobar%').gte('created_at', desde);
    if (ya) continue;
    const { data: ks } = await svc.from('contactos').select('nombre, email').eq('cliente_id', m.cliente_id).eq('portal', true).not('email', 'is', null);
    const para = (ks || []).map((k: any) => String(k.email).trim().toLowerCase()).filter((x: string) => /@/.test(x));
    if (!para.length) continue;
    const nombre = ((ks || [])[0]?.nombre || '').split(' ')[0];
    const mesTxt = MESES[Number(String(m.mes).slice(5, 7)) - 1];
    const asunto = 'Piezas para aprobar · ' + (m.clientes?.nombre || '') + ' · ' + mesTxt;
    const texto = 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nTenés ' + count + (count > 1 ? ' piezas' : ' pieza') + ' de ' + mesTxt + ' esperando tu aprobación. Las podés ver, aprobar o pedir cambios desde tu portal.\n\n¡Gracias!';
    const html = '<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;color:#17181F;max-width:560px">' + esc(texto).replace(/\n/g, '<br>') +
      '<p style="margin:24px 0"><a href="' + APP + 'portal" style="background:#FF4655;color:#fff;padding:11px 18px;border-radius:8px;text-decoration:none;font-weight:600">Ver las piezas</a></p><p style="color:#6B6E7B;font-size:13px">àndale · branding y comunicación</p></div>';
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: para, reply_to: replyTo, subject: asunto, html, text: texto }) });
    const o = await r.json().catch(() => ({}));
    await svc.from('emails').insert({ cliente_id: m.cliente_id, tipo: 'Mensaje', periodo: m.mes, para, asunto, cc: [], adjuntos: [], estado: r.ok ? 'Enviado' : 'Error', proveedor_id: o.id || null, error: r.ok ? null : String(o.message || r.status) });
    if (r.ok) enviados++;
  }
  return enviados ? 'Recordatorio a ' + enviados + ' cliente' + (enviados > 1 ? 's' : '') : 'Nadie tenía piezas esperando hace más de ' + dias + ' días';
}

// ---------------------------------------------------------------------------
// 3 · Cobros: avisar a las socias qué facturas vencidas hay para reclamar (no le escribe al cliente solo)
// ---------------------------------------------------------------------------
async function cobrosVencidas(svc: any, cfg: any) {
  const dias = num(cfg.dias, 5, 1, 60), hoy = hoyAR();
  const { data: fs } = await svc.from('facturas_saldo').select('id, numero, moneda, saldo, vencimiento, clientes(nombre)').gt('saldo', 0.5).not('vencimiento', 'is', null).lt('vencimiento', hoy);
  // Se avisa el día que cumple los N días de vencida y después una vez por semana, para no repetir todos los días.
  const hoyToca = (fs || []).filter((f: any) => { const d = difDias(hoy, f.vencimiento); return d >= dias && (d - dias) % 7 === 0; });
  if (!hoyToca.length) return 'Nada nuevo para reclamar';
  const cuerpo = hoyToca.slice(0, 8).map((f: any) => (f.clientes?.nombre || '—') + ' ' + plata(+f.saldo, f.moneda) + ' (hace ' + difDias(hoy, f.vencimiento) + ' días)').join(' · ') + (hoyToca.length > 8 ? ' y ' + (hoyToca.length - 8) + ' más' : '');
  await avisar(svc, await admins(svc), 'facturar', hoyToca.length + (hoyToca.length > 1 ? ' facturas vencidas' : ' factura vencida') + ' para reclamar', cuerpo + '. Desde Cobros se mandan los recordatorios en un clic.', '#cobros');
  return 'Aviso de ' + hoyToca.length + (hoyToca.length > 1 ? ' facturas' : ' factura');
}

// ---------------------------------------------------------------------------
// 4 · Proyectos: avisar a los responsables el día que un proyecto se pasa de la fecha de entrega
// ---------------------------------------------------------------------------
async function proyectosAtrasados(svc: any) {
  const ayer = sumarDias(hoyAR(), -1);
  const { data: ps } = await svc.from('proyectos').select('id, nombre, estado, clientes(nombre), proyecto_responsables(persona_id)').eq('entrega', ayer).is('entrega_real', null).not('estado', 'in', '("Entregado","Cancelado","Pausado")');
  if (!ps || !ps.length) return 'Ningún proyecto se atrasó hoy';
  const adm = await admins(svc);
  for (const p of ps) {
    const rs = (p.proyecto_responsables || []).map((r: any) => r.persona_id);
    await avisar(svc, rs.length ? rs : adm, 'etapa', 'Se pasó la entrega: ' + p.nombre, (p.clientes?.nombre || '') + ' · la fecha pactada era ayer. Actualizá la fecha o avisale al cliente.', '#proyectos/' + p.id);
  }
  return ps.length + (ps.length > 1 ? ' proyectos atrasados avisados' : ' proyecto atrasado avisado');
}

const REGLAS: Record<string, { fn: (svc: any, cfg: any, forzar: boolean, ultima: string | null) => Promise<string | null>; admin?: boolean }> = {
  redes_arrancar: { fn: redesArrancar },
  redes_recordar: { fn: (s, c) => redesRecordar(s, c) },
  cobros_vencidas: { fn: (s, c) => cobrosVencidas(s, c), admin: true },
  proyectos_atrasados: { fn: s => proyectosAtrasados(s) },
};

async function correr(svc: any, clave: string, forzar: boolean) {
  const { data: a } = await svc.from('automatizaciones').select('clave, activa, config, ultima_corrida').eq('clave', clave).maybeSingle();
  const regla = REGLAS[clave]; if (!regla) return { clave, resultado: 'Regla desconocida' };
  let resultado: string | null;
  try { resultado = await regla.fn(svc, (a && a.config) || {}, forzar, a ? a.ultima_corrida : null); }
  catch (e) { resultado = 'Error: ' + ((e as Error).message || e); }
  if (resultado === null) return { clave, resultado: 'No le tocaba hoy' };
  await svc.from('automatizaciones').upsert({ clave, activa: a ? a.activa : false, config: (a && a.config) || {}, ultima_corrida: new Date().toISOString(), ultimo_resultado: resultado.slice(0, 300) }, { onConflict: 'clave' });
  return { clave, resultado };
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
      if (b.accion !== 'correr') return json({ error: 'Acción desconocida' }, 400);
      const { data: activas } = await svc.from('automatizaciones').select('clave').eq('activa', true);
      const out = [];
      for (const a of activas || []) if (REGLAS[a.clave]) out.push(await correr(svc, a.clave, false));
      return json({ ok: true, corridas: out });
    }
    const sb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
    const { data: yoData } = await sb.rpc('yo');
    const yo = Array.isArray(yoData) ? yoData[0] : yoData;
    if (b.accion !== 'probar') return json({ error: 'Acción desconocida' }, 400);
    const regla = REGLAS[String(b.clave || '')];
    if (!regla) return json({ error: 'Esa automatización no existe' }, 400);
    if (!yo || !(yo.rol === 'admin' || (!regla.admin && yo.rol === 'equipo'))) return json({ error: 'No autorizado' }, 403);
    return json({ ok: true, ...(await correr(svc, String(b.clave), true)) });
  } catch (e) {
    console.error(b && b.accion, e);
    return json({ error: (e as Error).message || 'Error inesperado' }, 500);
  }
});
