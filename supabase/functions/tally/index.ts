// Briefs de Tally: recibe cada respuesta por webhook y la guarda en `briefs`, atada al cliente y al proyecto.
// Además, para las socias: lista los formularios, marca qué tipo de brief es cada uno, crea el webhook y trae respuestas viejas.
// verify_jwt apagado: Tally no manda usuario. El webhook se valida con la firma (Tally-Signature) o el encabezado propio.
// POST (Tally) · POST { accion: 'formularios' | 'tipo' | 'conectar' | 'sincronizar', form_id?, tipo? } (app)
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
class Aviso extends Error { status: number; constructor(m: string, s = 400) { super(m); this.status = s; } }
const API = 'https://api.tally.so';
const FN_URL = () => Deno.env.get('SUPABASE_URL')!.replace(/\/$/, '') + '/functions/v1/tally';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const norm = (s: unknown) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const EMAIL_RE = /[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+/;

async function cred(svc: any, n: string) {
  try { const { data } = await svc.rpc('cred_leer', { n }); return data ? JSON.parse(data) : null; } catch { return null; }
}
async function tallyGet(key: string, path: string) {
  const r = await fetch(API + path, { headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', 'tally-version': '2025-02-01' } });
  const o = await r.json().catch(() => ({}));
  if (!r.ok) throw new Aviso('Tally: ' + (o.message || o.error || r.status), 502);
  return o;
}
// Configuración en listas 'integraciones_cfg': 'tally.form.<id>=<tipo>' y 'tally.hook.<id>=<webhookId>'.
async function cfgLeer(svc: any): Promise<string[]> { const { data } = await svc.from('listas').select('valores').eq('clave', 'integraciones_cfg').maybeSingle(); return (data && data.valores) || []; }
async function cfgPoner(svc: any, k: string, v: string) {
  const cfg = (await cfgLeer(svc)).filter(x => !x.startsWith(k + '='));
  if (v) cfg.push(k + '=' + v);
  await svc.from('listas').upsert({ clave: 'integraciones_cfg', valores: cfg, updated_at: new Date().toISOString() });
}
const cfgVal = (cfg: string[], k: string) => { const x = cfg.find(y => y.startsWith(k + '=')); return x ? x.slice(k.length + 1) : ''; };

// Texto legible de una respuesta (opciones, archivos, matrices).
function valorTxt(v: any, opciones?: any[]): string {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(x => opciones && typeof x === 'string' ? ((opciones.find(o => o.id === x) || {}).text || x) : valorTxt(x)).filter(Boolean).join(', ');
  if (typeof v === 'object') { if (v.url) return (v.name || 'archivo') + ': ' + v.url; return Object.entries(v).map(([k, x]) => k + ': ' + valorTxt(x)).join(' · '); }
  return String(v);
}

// Busca el cliente: primero los campos ocultos que pone la app en el link, después email y nombre de la empresa.
async function asignar(svc: any, ocultos: Record<string, string>, resp: { pregunta: string; respuesta: string; tipo?: string }[]) {
  let cliente_id: string | null = null, proyecto_id: string | null = null;
  if (UUID.test(ocultos.proyecto || '')) { const { data } = await svc.from('proyectos').select('id, cliente_id').eq('id', ocultos.proyecto).maybeSingle(); if (data) { proyecto_id = data.id; cliente_id = data.cliente_id; } }
  if (!cliente_id && UUID.test(ocultos.cliente || '')) { const { data } = await svc.from('clientes').select('id').eq('id', ocultos.cliente).maybeSingle(); if (data) cliente_id = data.id; }
  const emails = resp.map(r => (r.respuesta.match(EMAIL_RE) || [])[0]).filter(Boolean).map(e => e!.toLowerCase());
  const empresaR = resp.find(r => /empresa|marca|negocio|emprendimiento|raz[oó]n social|nombre comercial|proyecto/i.test(r.pregunta) && r.respuesta.length < 80);
  const nombreR = resp.find(r => /nombre/i.test(r.pregunta) && !/empresa|marca|negocio|comercial/i.test(r.pregunta) && r.respuesta.length < 80);
  if (!cliente_id && emails.length) {
    const { data: ks } = await svc.from('contactos').select('cliente_id, email').in('email', emails);
    if (ks && ks.length) cliente_id = ks[0].cliente_id;
    if (!cliente_id) { const { data: cs } = await svc.from('clientes').select('id, email'); const c = (cs || []).find((x: any) => emails.some(e => norm(x.email).includes(e))); if (c) cliente_id = c.id; }
  }
  if (!cliente_id && empresaR) {
    const { data: cs } = await svc.from('clientes').select('id, nombre'); const e = norm(empresaR.respuesta);
    const c = (cs || []).find((x: any) => norm(x.nombre) === e) || (cs || []).find((x: any) => e.length > 3 && (norm(x.nombre).includes(e) || e.includes(norm(x.nombre))));
    if (c) cliente_id = c.id;
  }
  return { cliente_id, proyecto_id, email: emails[0] || '', empresa: empresaR ? empresaR.respuesta : '', nombre: nombreR ? nombreR.respuesta : '' };
}

async function guardarBrief(svc: any, b: { form_id: string; form_nombre: string; tipo: string; submission_id: string; respondido_at: string; respuestas: any[]; ocultos: Record<string, string>; pdf_url?: string; preview_url?: string }) {
  const { data: ya } = await svc.from('briefs').select('id').eq('submission_id', b.submission_id).maybeSingle();
  if (ya) return { nuevo: false, sin_cliente: false };
  const a = await asignar(svc, b.ocultos, b.respuestas);
  const { data: ins, error } = await svc.from('briefs').insert({ cliente_id: a.cliente_id, proyecto_id: a.proyecto_id, tipo: b.tipo, form_id: b.form_id, form_nombre: b.form_nombre, submission_id: b.submission_id,
    respondido_at: b.respondido_at, respuestas: b.respuestas, email: a.email, empresa: a.empresa, nombre: a.nombre, pdf_url: b.pdf_url || '', preview_url: b.preview_url || '' }).select('id').single();
  if (error) { if (/duplicate/i.test(error.message)) return { nuevo: false, sin_cliente: false }; throw error; }
  // Aviso a los responsables del cliente (o a las socias si no se sabe de quién es).
  let cn = a.empresa || a.nombre || 'un cliente nuevo';
  let quienes: string[] = [];
  if (a.cliente_id) {
    const { data: c } = await svc.from('clientes').select('nombre').eq('id', a.cliente_id).maybeSingle(); if (c) cn = c.nombre;
    const { data: rs } = await svc.from('cliente_responsables').select('persona_id').eq('cliente_id', a.cliente_id); quienes = (rs || []).map((r: any) => r.persona_id);
  }
  if (!quienes.length) { const { data: ad } = await svc.from('personas').select('id').eq('rol', 'admin').eq('activo', true); quienes = (ad || []).map((r: any) => r.id); }
  if (quienes.length) await svc.from('notificaciones').insert(quienes.map(p => ({ persona_id: p, tipo: 'cliente', titulo: 'Brief nuevo' + (b.tipo ? ' de ' + b.tipo : '') + ': ' + cn, cuerpo: a.cliente_id ? 'Ya está en la ficha del cliente.' : 'No se pudo saber de qué cliente es: asignalo desde Briefs.', link: '#briefs?b=' + ins.id })));
  return { nuevo: true, sin_cliente: !a.cliente_id };
}

// Firma de Tally: HMAC-SHA256 en base64 del cuerpo.
async function firmaOk(raw: string, header: string, secreto: string) {
  if (!header || !secreto) return false;
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(secreto), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const f = async (s: string) => btoa(String.fromCharCode(...new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(s)))));
  if (header === await f(raw)) return true;
  try { return header === await f(JSON.stringify(JSON.parse(raw))); } catch { return false; }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  const raw = await req.text();
  let b: any = {}; try { b = JSON.parse(raw); } catch { return json({ error: 'Pedido inválido' }, 400); }
  const url = Deno.env.get('SUPABASE_URL')!;
  const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  try {
    // ---------- Webhook de Tally ----------
    if (b.eventType) {
      const c = await cred(svc, 'tally');
      const okHdr = c && c.firma && req.headers.get('x-andale-tally') === c.firma;
      if (!okHdr && !(c && await firmaOk(raw, req.headers.get('tally-signature') || '', c.firma))) return json({ error: 'Firma inválida' }, 401);
      if (b.eventType !== 'FORM_RESPONSE' || !b.data) return json({ ok: true, ignorado: b.eventType });
      const d = b.data, ocultos: Record<string, string> = {}, respuestas: any[] = [];
      for (const f of d.fields || []) {
        if (f.type === 'HIDDEN_FIELDS') { ocultos[norm(f.label)] = String(f.value ?? ''); continue; }
        if (f.type === 'CALCULATED_FIELDS') continue;
        const v = valorTxt(f.value, f.options);
        if (v) respuestas.push({ pregunta: String(f.label || '').trim(), respuesta: v, tipo: f.type });
      }
      const cfg = await cfgLeer(svc);
      const r = await guardarBrief(svc, { form_id: d.formId, form_nombre: d.formName || '', tipo: cfgVal(cfg, 'tally.form.' + d.formId), submission_id: d.submissionId || d.responseId, respondido_at: d.createdAt || new Date().toISOString(),
        respuestas, ocultos, pdf_url: d.pdfUrl || '', preview_url: d.previewUrl || '' });
      return json({ ok: true, ...r });
    }

    // ---------- Pedidos desde la app ----------
    const sb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
    const { data: yoData } = await sb.rpc('yo');
    const yo = Array.isArray(yoData) ? yoData[0] : yoData;
    if (!yo || !['admin', 'equipo'].includes(yo.rol)) return json({ error: 'No autorizado' }, 403);
    const c = await cred(svc, 'tally');
    if (!c || !c.key) throw new Aviso('Tally no está conectado. Conectalo en Configuración → Integraciones → Tally.');
    const cfg = await cfgLeer(svc);
    const soloAdmin = () => { if (yo.rol !== 'admin') throw new Aviso('Solo las socias pueden cambiar esto.', 403); };

    switch (b.accion) {
      case 'formularios': {
        soloAdmin();
        const o = await tallyGet(c.key, '/forms?limit=200');
        const items = Array.isArray(o) ? o : (o.items || []);
        let hooks: any[] = [];
        try { const h = await tallyGet(c.key, '/webhooks?limit=200'); hooks = Array.isArray(h) ? h : (h.items || h.webhooks || []); } catch { hooks = []; }
        return json({ formularios: items.map((f: any) => ({ id: f.id, nombre: f.name || 'Sin nombre', respuestas: f.numberOfSubmissions || 0, estado: f.status === 'PUBLISHED' ? 'publicado' : String(f.status || '').toLowerCase(),
          tipo: cfgVal(cfg, 'tally.form.' + f.id), conectado: hooks.some((w: any) => w.formId === f.id && String(w.url || '').startsWith(FN_URL()) && w.isEnabled !== false) || !!cfgVal(cfg, 'tally.hook.' + f.id) })) });
      }
      case 'tipo': {
        soloAdmin();
        if (!/^[A-Za-z0-9]+$/.test(String(b.form_id || ''))) throw new Aviso('Formulario inválido');
        await cfgPoner(svc, 'tally.form.' + b.form_id, String(b.tipo || '').slice(0, 30));
        return json({ ok: true });
      }
      case 'conectar': {
        soloAdmin();
        const id = String(b.form_id || ''); if (!/^[A-Za-z0-9]+$/.test(id)) throw new Aviso('Formulario inválido');
        if (b.tipo) await cfgPoner(svc, 'tally.form.' + id, String(b.tipo).slice(0, 30));
        const r = await fetch(API + '/webhooks', { method: 'POST', headers: { Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ formId: id, url: FN_URL(), eventTypes: ['FORM_RESPONSE'], signingSecret: c.firma, httpHeaders: [{ name: 'x-andale-tally', value: c.firma }] }) });
        const o = await r.json().catch(() => ({}));
        if (!r.ok) throw new Aviso('Tally no dejó crear el webhook: ' + (o.message || o.error || r.status), 502);
        await cfgPoner(svc, 'tally.hook.' + id, String(o.id || 'ok'));
        return json({ ok: true });
      }
      case 'sincronizar': {
        const forms = cfg.filter(x => x.startsWith('tally.form.')).map(x => { const [k, v] = [x.slice(11, x.indexOf('=')), x.slice(x.indexOf('=') + 1)]; return { id: k, tipo: v }; }).filter(f => f.tipo);
        if (!forms.length) throw new Aviso('Marcá primero qué formularios son briefs (Branding, Web o Redes).');
        const desde = new Date(Date.now() - 183 * 86400_000).toISOString();
        let nuevos = 0, sin = 0;
        for (const f of forms) {
          let nombre = '';
          try { const fo = await tallyGet(c.key, '/forms/' + f.id); nombre = fo.name || ''; } catch { nombre = ''; }
          for (let page = 1; page <= 10; page++) {
            const o = await tallyGet(c.key, '/forms/' + f.id + '/submissions?filter=completed&limit=100&page=' + page + '&startDate=' + encodeURIComponent(desde));
            const qs = new Map((o.questions || []).map((q: any) => [q.id, q]));
            for (const s of o.submissions || []) {
              const ocultos: Record<string, string> = {}, respuestas: any[] = [];
              for (const r of s.responses || []) {
                const q: any = qs.get(r.questionId) || {};
                if (q.type === 'HIDDEN_FIELDS') {
                  if (r.answer && typeof r.answer === 'object' && !Array.isArray(r.answer)) Object.entries(r.answer).forEach(([k, v]) => { ocultos[norm(k)] = String(v ?? ''); });
                  else ocultos[norm(q.title || (q.fields && q.fields[0] && q.fields[0].title))] = String(r.answer ?? '');
                  continue;
                }
                if (q.type === 'CALCULATED_FIELDS') continue;
                const v = r.formattedAnswer || valorTxt(r.answer);
                if (v) respuestas.push({ pregunta: String(q.title || '').trim(), respuesta: v, tipo: q.type });
              }
              const g = await guardarBrief(svc, { form_id: f.id, form_nombre: nombre, tipo: f.tipo, submission_id: s.id, respondido_at: s.submittedAt, respuestas, ocultos, pdf_url: s.pdfUrl, preview_url: s.previewUrl });
              if (g.nuevo) { nuevos++; if (g.sin_cliente) sin++; }
            }
            if (!o.hasMore) break;
          }
        }
        return json({ ok: true, nuevos, sin_cliente: sin });
      }
      default: return json({ error: 'Acción desconocida' }, 400);
    }
  } catch (e) {
    console.error(b && (b.accion || b.eventType), e);
    return json({ error: (e as Error).message || 'Error inesperado' }, e instanceof Aviso ? e.status : 500);
  }
});
