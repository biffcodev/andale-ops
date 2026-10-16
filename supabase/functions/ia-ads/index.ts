// Mr. Piggy lee el mail mensual del proveedor de Ads y saca los números para el informe del cliente.
// Equipo y admins. verify_jwt apagado: se valida el usuario con rpc('yo'). Misma cuenta de IA que la función `ia`.
// POST { texto: el mail, contexto: { cliente, mes, plataformas, mes_anterior } }
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const hoyAR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Cordoba' });

const TOOL = { name: 'resultados_ads', description: 'Resultados de la pauta del mes, para el informe del cliente.', input_schema: { type: 'object', required: ['resultados'], properties: {
  plataforma: { type: 'string', description: 'Meta, Google, TikTok, LinkedIn… (la que figure; si son varias, separadas por " + ")' },
  moneda: { type: 'string', description: 'ARS, USD… (ARS si dice $ sin aclarar)' },
  inversion: { type: 'number', description: 'lo invertido en el mes, número sin formato' },
  inversion_anterior: { type: 'number', description: 'solo si el mail trae el número del período anterior' },
  resultado: { type: 'string', description: 'qué se mide como resultado principal: Conversaciones iniciadas, Mensajes, Clics, Compras, Leads…' },
  resultados: { type: 'number', description: 'cantidad del resultado principal' },
  resultados_anterior: { type: 'number', description: 'solo si el mail trae el número del período anterior' },
  costo: { type: 'number', description: 'costo por resultado; si no figura pero hay inversión y resultados, calculalo' },
  costo_anterior: { type: 'number', description: 'solo si el mail trae el número del período anterior' },
  otras: { type: 'array', description: 'otras métricas con número que aparezcan (alcance, impresiones, CTR, clics…)', items: { type: 'object', required: ['nombre', 'valor'], properties: { nombre: { type: 'string' }, valor: { type: 'number' } } } },
  segmentos: { type: 'array', description: 'resultados por segmento, campaña o público si los hay', items: { type: 'object', required: ['nombre'], properties: { nombre: { type: 'string' }, resultados: { type: 'number' }, costo: { type: 'number', description: 'costo por resultado del segmento' } } } },
  texto: { type: 'string', description: 'para el cliente, 2 a 4 frases: cómo le fue a la pauta, qué se cambió y qué sigue. Claro, sin tecnicismos, sin pedidos internos ni saludos.' },
  pedidos: { type: 'array', items: { type: 'string' }, description: 'lo que el proveedor le pide a la agencia o al cliente (feedback, reunión, material). Vacío si nada.' } } } };
const SYS = 'Sos Mr. Piggy, el asistente de àndale, una agencia de branding y redes de Córdoba, Argentina. Hablás en español rioplatense, con vos, claro y sin tecnicismos. ' +
  'Te pegan el mail mensual del proveedor de Ads de la agencia con los resultados de la pauta de un cliente. Sacá los números tal cual están (sin inventar ni redondear: "$170.271,86" es 170271.86) y escribí un texto breve para el informe del cliente. ' +
  'No inventes comparaciones con el mes anterior: si el mail dice que subió o bajó pero no da el número anterior, dejá vacío el campo _anterior y contalo en el texto. ' +
  '\n\nRespondé únicamente llamando una vez a la herramienta resultados_ads, sin texto antes ni después.';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  let b: any; try { b = await req.json(); } catch { return json({ error: 'Pedido inválido' }, 400); }
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
  const { data: yoData } = await sb.rpc('yo'); const yo = Array.isArray(yoData) ? yoData[0] : yoData;
  if (!yo || !['admin', 'equipo'].includes(yo.rol)) return json({ error: 'Solo el equipo puede usar la IA.' }, 403);
  const texto = String(b.texto || '').slice(0, 20_000);
  if (!texto.trim()) return json({ error: 'Pegá el mail del proveedor de Ads.' }, 400);
  const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  let cfg: any = null; try { const { data } = await svc.rpc('cred_leer', { n: 'anthropic' }); if (data) cfg = JSON.parse(data); } catch { cfg = null; }
  const key = (cfg && cfg.key) || Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return json({ error: 'La IA no está configurada todavía. Conectala en Configuración → Integraciones → Mr. Piggy.' }, 503);
  const modelo = (cfg && cfg.modelo_rapido) || Deno.env.get('IA_MODEL_RAPIDO') || 'claude-haiku-5-5';
  const res = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: modelo, max_tokens: 2500, system: SYS, tools: [TOOL], tool_choice: { type: 'tool', name: TOOL.name },
      messages: [{ role: 'user', content: 'HOY: ' + hoyAR() + '\n\nCLIENTE Y MES:\n' + JSON.stringify(b.contexto ?? {}).slice(0, 20_000) + '\n\nMAIL DEL PROVEEDOR:\n' + texto }] }) });
  const out = await res.json().catch(() => ({}));
  const err = res.ok ? null : (out?.error?.message || 'La API respondió ' + res.status);
  try { await sb.from('ia_log').insert({ persona_id: yo.id, accion: 'ads_mail', modelo, tokens_in: out?.usage?.input_tokens || 0, tokens_out: out?.usage?.output_tokens || 0, ok: !err, error: err }); } catch { /* el registro no frena */ }
  if (err) return json({ error: 'IA: ' + err }, 502);
  const tu = (out.content || []).find((c: any) => c.type === 'tool_use' && c.name === TOOL.name);
  if (!tu || !tu.input) return json({ error: 'La IA no devolvió algo utilizable. Probá de nuevo.' }, 502);
  return json(tu.input);
});
