// Mr. Piggy arma el contenido de redes: el plan del mes (qué pieza, qué día, qué va en el diseño) y los copys.
// Aparte de `ia` para poder ajustar las reglas de escritura sin tocar la función grande. Equipo y admins.
// verify_jwt apagado: se valida el usuario con rpc('yo'). Misma cuenta de IA que `ia`, con el modelo preciso (escribe mejor).
// POST { modo: 'redes_ideas' | 'redes_copys', texto, contexto }
//   redes_ideas → { piezas: [{ formato, fecha, tema, contenido }] }   (los copys se escriben después, en tandas)
//   redes_copys → texto = JSON [{ id, formato, fecha, tema, contenido, copy_actual }] → { piezas: [{ id, copy, hashtags, contenido? }] }
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const hoyAR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Cordoba' });
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const BASE = 'Sos Mr. Piggy, community manager senior de àndale, una agencia de branding y redes de Córdoba, Argentina. ' +
  'Escribís como la MARCA del cliente, no como la agencia. La ficha de marca (MARCA) es la regla: tono, trato (vos, tú o usted), emojis, palabras que usa, pilares, público y lo que nunca dice ni hace. ' +
  'Los copys_aprobados y los ejemplos de la ficha muestran cómo suena: tomá el tono, no copies sus frases. Las frases de "palabras que usa" son recursos para usar de vez en cuando, no un cierre fijo: variá los llamados a la acción entre piezas. ' +
  'No inventes precios, promociones, stock, plazos ni datos que no te pasen. Si no hay ficha, escribí neutro y sin inventar datos de la marca.';

const REGLAS_FORMATO = 'QUÉ VA EN CADA FORMATO (campo contenido, para quien diseña o graba):\n' +
  '- Carruseles: una línea por slide, "Slide 1: …", 5 a 8 slides. La 1 es el gancho (promesa clara), las del medio desarrollan un punto cada una, la última cierra con el llamado a la acción. Texto corto por slide (lo que va escrito en la placa).\n' +
  '- Posts: "Título: …" (lo que va grande en la placa, máx. 8 palabras), "Bajada: …" (opcional, una línea) y "Imagen: …" (qué se ve: foto, producto, situación).\n' +
  '- Reels: "Gancho (0-3 s): …", luego las escenas numeradas con lo que se ve y el texto en pantalla, y "Audio: …" (voz en off, tendencia o música, en una línea).\n' +
  '- Historias: "Texto: …" (lo que va escrito en la historia, corto y con la voz de la marca, con emoji si la marca usa) y, si suma, "Sticker: …" (encuesta con sus 2 opciones, pregunta, cuenta regresiva, link o "Mencioná a…").\n' +
  '- Otros formatos: describí en 2-4 líneas qué se ve y qué texto lleva.';

const REGLAS_COPY = 'CÓMO SE ESCRIBE UN COPY (el texto que acompaña la publicación):\n' +
  '- Primera línea: un gancho que frene el scroll (pregunta, dato, problema del público o promesa), de 4 a 10 palabras.\n' +
  '- Después 2 o 3 párrafos cortos, de 1 o 2 frases cada uno, SEPARADOS POR UNA LÍNEA EN BLANCO (\\n\\n). Nunca un bloque de texto corrido.\n' +
  '- Si hay pasos, consejos o beneficios, van en líneas sueltas que empiezan con un emoji o con "→" o "✔️" (según el uso de emojis de la marca).\n' +
  '- Cierre: un llamado a la acción concreto y distinto en cada pieza (escribinos, guardalo, compartilo con quien…, comentá, pasá por…).\n' +
  '- Largo: Posts y Carruseles 350 a 700 caracteres; Reels 200 a 450; Historias: vacío (lo escrito va en contenido).\n' +
  '- Emojis según la ficha: "Sí, con ganas" → 4 a 7, integrados al texto; "Pocos y puntuales" → 2 o 3 por copy, al inicio de un párrafo, de una línea de lista o junto al llamado a la acción (nunca en medio de una palabra ni varios seguidos); "No usa" → ninguno. Sin ficha: 1 o 2. Elegí emojis que tengan que ver con el tema (🔧🧱🚚📦 para obra y entregas, por ejemplo), no caritas genéricas.\n' +
  '- Sin hashtags dentro del copy, sin mayúsculas sostenidas, sin exclamaciones de más.\n' +
  'HASHTAGS (campo aparte): 6 a 10, separados por un espacio. Primero los propios de la marca que figuren en la ficha; después de tema, rubro y público. De ubicación solo si la ficha o las notas dicen dónde está la marca. Sin repetir, sin tildes raras ni espacios dentro.';

const TOOL_PLAN = { name: 'plan_del_mes', description: 'Piezas del mes con su fecha y lo que va en cada una.', input_schema: { type: 'object', required: ['piezas'], properties: {
  piezas: { type: 'array', items: { type: 'object', required: ['formato', 'fecha', 'tema', 'contenido'], properties: {
    formato: { type: 'string', description: 'uno de los formatos que te pasan, exacto' },
    fecha: { type: 'string', description: 'AAAA-MM-DD, dentro del MES A PLANIFICAR' },
    tema: { type: 'string', description: 'título corto de la pieza, de 3 a 10 palabras (no una explicación)' },
    contenido: { type: 'string', description: 'lo que va en la pieza según su formato, con saltos de línea' },
  } } } } } };
const SYS_PLAN = BASE + '\n\nArmás el plan de un mes de redes: qué publicar, qué día y qué va en cada pieza. Temas concretos y variados, repartidos entre los pilares de la marca, propios de su rubro y su público. ' +
  'Usá solo fechas especiales de Argentina que caigan DENTRO del mes a planificar y que tengan sentido para la marca (no fuerces efemérides). ' +
  'Respetá EXACTAMENTE la cantidad por formato que te piden: contalas antes de responder. Repartí las fechas en todo el mes, sin amontonar: posts, carruseles y reels en días distintos; las historias pueden compartir día con otra pieza pero no más de 2 historias por día. ' +
  'No repitas temas de lo ya cargado ni del mes anterior.\n\n' + REGLAS_FORMATO +
  '\n\nRespondé únicamente llamando una vez a la herramienta plan_del_mes, sin texto antes ni después.';

const TOOL_COPYS = { name: 'escribir_copys', description: 'Copys y hashtags de cada pieza.', input_schema: { type: 'object', required: ['piezas'], properties: {
  piezas: { type: 'array', items: { type: 'object', required: ['id', 'copy', 'hashtags'], properties: {
    id: { type: 'string', description: 'el id exacto que te pasan' },
    copy: { type: 'string', description: 'el copy con saltos de línea reales; vacío para Historias' },
    hashtags: { type: 'string', description: '6 a 10 hashtags separados por espacio; vacío para Historias' },
    contenido: { type: 'string', description: 'solo si la pieza no trae contenido: lo que va en la pieza según su formato' },
  } } } } } };
const SYS_COPYS = BASE + '\n\nEscribís los copys de las piezas que te pasan (cada una con su id, formato, tema y lo que va en la pieza). El copy acompaña a la pieza: no repite el texto de la placa palabra por palabra, lo amplía y le da contexto. ' +
  'Si la pieza ya tiene un copy (copy_actual), mejoralo con estas reglas sin cambiarle el sentido.\n\n' + REGLAS_COPY + '\n\n' + REGLAS_FORMATO +
  '\n\nRespondé únicamente llamando una vez a la herramienta escribir_copys, sin texto antes ni después.';

function mesTxt(mes: string) {
  const [y, m] = String(mes || '').split('-').map(Number); if (!y || !m) return '';
  const ult = new Date(y, m, 0).getDate();
  return MESES[m - 1] + ' de ' + y + ' (del ' + y + '-' + String(m).padStart(2, '0') + '-01 al ' + y + '-' + String(m).padStart(2, '0') + '-' + ult + ')';
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  let b: any; try { b = await req.json(); } catch { return json({ error: 'Pedido inválido' }, 400); }
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
  const { data: yoData } = await sb.rpc('yo'); const yo = Array.isArray(yoData) ? yoData[0] : yoData;
  if (!yo || !['admin', 'equipo'].includes(yo.rol)) return json({ error: 'Solo el equipo puede usar la IA.' }, 403);
  const modo = b.modo === 'redes_copys' ? 'redes_copys' : 'redes_ideas';
  const texto = String(b.texto || '').slice(0, 40_000), ctx = b.contexto ?? {};
  const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  let cfg: any = null; try { const { data } = await svc.rpc('cred_leer', { n: 'anthropic' }); if (data) cfg = JSON.parse(data); } catch { cfg = null; }
  const key = (cfg && cfg.key) || Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return json({ error: 'La IA no está configurada todavía. Conectala en Configuración → Integraciones → Mr. Piggy.' }, 503);
  const modelo = (cfg && cfg.modelo) || Deno.env.get('IA_MODEL') || 'claude-sonnet-5-5';
  const tool = modo === 'redes_copys' ? TOOL_COPYS : TOOL_PLAN, system = modo === 'redes_copys' ? SYS_COPYS : SYS_PLAN;
  const marca = ctx && ctx.marca ? ctx.marca : null;
  const cab = 'HOY: ' + hoyAR() + (ctx.mes ? '\nMES A PLANIFICAR: ' + mesTxt(ctx.mes) + '. Todas las fechas van dentro de ese mes.' : '') +
    '\nEMOJIS DE LA MARCA: ' + ((marca && marca.emojis) || 'sin dato (usá 1 o 2)') + (marca && marca.hashtags ? '\nHASHTAGS PROPIOS: ' + marca.hashtags : '');
  const user = modo === 'redes_copys' ? cab + '\n\nCLIENTE:\n' + JSON.stringify(ctx).slice(0, 60_000) + '\n\nPIEZAS:\n' + texto
    : cab + '\n\nCLIENTE Y MES:\n' + JSON.stringify(ctx).slice(0, 60_000) + '\n\nPEDIDO:\n' + (texto || 'Proponé el contenido que falta del mes.');
  const pedir = (max: number) => fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: modelo, max_tokens: max, system, tools: [tool], tool_choice: { type: 'tool', name: tool.name }, messages: [{ role: 'user', content: user }] }) });
  let max = modo === 'redes_copys' ? 4000 : 8000;
  let res = await pedir(max), out: any = await res.json().catch(() => ({}));
  if (res.ok && out && out.stop_reason === 'max_tokens') { max = 16000; res = await pedir(max); out = await res.json().catch(() => ({})); }
  const err = res.ok ? null : (out?.error?.message || 'La API respondió ' + res.status);
  try { await sb.from('ia_log').insert({ persona_id: yo.id, accion: modo, modelo, tokens_in: out?.usage?.input_tokens || 0, tokens_out: out?.usage?.output_tokens || 0, ok: !err, error: err }); } catch { /* el registro no frena */ }
  if (err) return json({ error: 'IA: ' + err }, 502);
  const tu = (out.content || []).find((c: any) => c.type === 'tool_use' && c.name === tool.name);
  if (!tu || !tu.input) return json({ error: 'La IA no devolvió algo utilizable. Probá de nuevo.' }, 502);
  return json(tu.input);
});
