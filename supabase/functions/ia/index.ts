// Mr. Piggy, la IA de àndale para el día a día: la barra "Decile a àndale", el resumen de un cliente y cargar una charla desde un texto.
// La app manda el contexto que ya tiene cargado (lo que ese usuario puede ver) y acá solo se arma el pedido a Claude.
// Equipo y admins. verify_jwt apagado: se valida el usuario con rpc('yo').
//
// Secretos: ANTHROPIC_API_KEY (el mismo del asistente) · IA_MODEL_RAPIDO opcional (default claude-haiku-5-5, el más rápido)
// POST { modo: 'comando' | 'cliente' | 'charla' | 'tareas' | 'mail' | 'texto', texto?, contexto, tarea? }
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
class Aviso extends Error { status: number; constructor(m: string, s = 400) { super(m); this.status = s; } }
const MODEL = () => Deno.env.get('IA_MODEL_RAPIDO') || 'claude-haiku-5-5';
const hoyAR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Cordoba' });
const diaAR = () => new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Cordoba', weekday: 'long' });

// Cuentas cargadas desde la app (Configuración → Integraciones, cifradas en Vault). Si no hay, se usan los secretos de Supabase.
const credCache: Record<string, { v: any; t: number }> = {};
async function cred(n: string) {
  const c = credCache[n]; if (c && Date.now() - c.t < 60_000) return c.v;
  let v: any = null;
  try { const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } }); const { data } = await svc.rpc('cred_leer', { n }); if (data) v = JSON.parse(data); } catch { v = null; }
  credCache[n] = { v, t: Date.now() }; return v;
}

async function claude(sb: SupabaseClient, personaId: string | null, accion: string, o: { system: string; texto: string; tool: Record<string, unknown>; maxTokens?: number }) {
  const cfg = await cred('anthropic');
  const key = (cfg && cfg.key) || Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Aviso('La IA no está configurada todavía. Conectala en Configuración → Integraciones → Mr. Piggy.', 503);
  const modelo = (cfg && cfg.modelo_rapido) || MODEL();
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: modelo, max_tokens: o.maxTokens || 2000,
      system: o.system + '\n\nRespondé únicamente llamando una vez a la herramienta ' + o.tool.name + ', sin texto antes ni después.',
      messages: [{ role: 'user', content: [{ type: 'text', text: o.texto }] }],
      tools: [o.tool],
    }),
  });
  const out = await res.json().catch(() => ({}));
  const err = res.ok ? null : (out?.error?.message || 'La API respondió ' + res.status);
  // El registro de uso no demora la respuesta.
  const log = sb.from('ia_log').insert({ persona_id: personaId, accion, modelo, tokens_in: out?.usage?.input_tokens || 0, tokens_out: out?.usage?.output_tokens || 0, ok: !err, error: err }).then(() => {}, () => {});
  const er = (globalThis as any).EdgeRuntime; if (er && er.waitUntil) er.waitUntil(log); else await log;
  if (err) throw new Aviso('IA: ' + err, 502);
  const tu = (out.content || []).find((c: any) => c.type === 'tool_use' && c.name === o.tool.name);
  let input: any = tu ? tu.input : null;
  if (!input) {
    const txt = (out.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) { try { input = JSON.parse(m[0]); } catch { input = null; } }
  }
  if (!input || typeof input !== 'object') throw new Aviso('La IA no devolvió algo utilizable. Probá de nuevo.', 502);
  return input;
}

const QUIENES = 'Sos Mr. Piggy, el chanchito con alas del isologo de àndale y su asistente. àndale es una agencia de branding y redes de Córdoba, Argentina. Las socias son Fer y Jime. Hablás en español rioplatense, con vos, directo, cálido y sin jerga contable ni técnica.';
const ctxTxt = (c: unknown) => JSON.stringify(c ?? {}).slice(0, 90_000);

/* ---------- Barra "Decile a àndale" ---------- */
const ACCIONES = ['gasto_ingreso', 'charla', 'proyecto', 'presupuesto', 'recordatorio', 'mail', 'abrir'];
const TOOL_COMANDO = {
  name: 'resolver',
  description: 'Responde la pregunta o deja preparada una acción para que la persona la revise y la guarde.',
  input_schema: {
    type: 'object', required: ['tipo', 'texto'],
    properties: {
      tipo: { type: 'string', enum: ['respuesta', 'accion'], description: 'respuesta: solo contestar. accion: dejar un formulario listo para confirmar.' },
      texto: { type: 'string', description: 'Lo que ve la persona. Si es respuesta: corta (máximo 5 líneas), con números concretos y en viñetas si son varios. Si es acción: una línea con lo que vas a dejar listo.' },
      accion: {
        type: 'object', description: 'Solo si tipo = accion.',
        properties: {
          tipo: { type: 'string', enum: ACCIONES },
          sentido: { type: 'string', enum: ['gasto', 'ingreso'], description: 'gasto_ingreso' },
          fecha: { type: 'string', description: 'AAAA-MM-DD' },
          monto: { type: 'number' },
          moneda: { type: 'string', enum: ['ARS', 'USD', 'EUR', 'GBP'] },
          asunto: { type: 'string', description: 'mail: asunto' },
          mensaje: { type: 'string', description: 'mail: el cuerpo del mail ya redactado, en el tono de àndale' },
          quien: { type: 'string', description: 'gasto_ingreso: a quién se le pagó o quién pagó (como figura en la lista de quiénes)' },
          detalle: { type: 'string' },
          categoria: { type: 'string', description: 'gasto_ingreso: categoría exacta de la lista' },
          subcategoria: { type: 'string', description: 'gasto_ingreso: detalle de la categoría exacto de la lista' },
          cuenta_id: { type: 'string', description: 'gasto_ingreso: id de la cuenta de banco o efectivo si se menciona' },
          cliente: { type: 'string', description: 'nombre exacto del cliente de la lista (para charla, proyecto, presupuesto, recordatorio, abrir; en gasto_ingreso, el cliente al que se le asigna el gasto)' },
          canal: { type: 'string', description: 'charla: Reunión, Llamada, WhatsApp, Email u otro de la lista' },
          con_quien: { type: 'string' },
          resumen: { type: 'string', description: 'charla: qué se habló' },
          acuerdo: { type: 'string' },
          proximo: { type: 'string', description: 'charla: próximo paso' },
          fecha_proximo: { type: 'string', description: 'AAAA-MM-DD' },
          responsable: { type: 'string', description: 'alias de la persona del equipo' },
          nombre: { type: 'string', description: 'proyecto: nombre del proyecto; presupuesto: título' },
          tipo_trabajo: { type: 'string', description: 'proyecto/presupuesto: tipo de la lista (Branding, Web, Diseño…)' },
          entrega: { type: 'string', description: 'proyecto: fecha de entrega AAAA-MM-DD' },
          clase: { type: 'string', enum: ['Propuesta', 'Presupuesto'] },
          brief: { type: 'string', description: 'presupuesto: lo que pidió el cliente, para que la IA lo redacte después' },
          vista: { type: 'string', enum: ['inicio', 'proyectos', 'abonos', 'mis', 'clientes', 'propuestas', 'comunicaciones', 'cobros', 'facturas', 'gastos', 'pagos', 'numeros', 'rentabilidad', 'precios', 'integraciones'], description: 'abrir: pantalla' },
        },
      },
    },
  },
};
const SYS_COMANDO = QUIENES + ' Vivís en la app interna de operaciones. Te escriben pedidos cortos. Tenés el contexto (JSON) con clientes, abonos, proyectos, facturas pendientes, gastos recientes, personas y listas. ' +
  'Si es una pregunta, contestala SOLO con datos del contexto (sumá y compará vos; si algo no está, decilo). Si pide cargar, anotar, crear, armar o mandar algo, devolvé una acción con los datos que puedas completar; la persona la revisa antes de guardar, nunca se guarda sola. ' +
  'Acciones: gasto_ingreso (cargar un gasto o un ingreso de plata), charla (anotar una reunión, llamada o mensaje con un cliente y el próximo paso), proyecto (nuevo trabajo puntual), presupuesto (nuevo presupuesto o propuesta), recordatorio (recordarle a un cliente que pague), mail (escribirle un mail a un cliente que no sea de cobranza: novedades, pedir material, coordinar; dejá asunto y mensaje redactados), abrir (ir a una pantalla o a la ficha de un cliente). ' +
  'Para gasto_ingreso elegí categoría y detalle mirando cómo se cargó antes a esa misma persona o empresa (patrones); "50 mil" = 50000, "1,2 palo" = 1200000, "lucas" = miles; moneda ARS salvo que diga dólares/USD, euros/EUR o libras/GBP. Fechas relativas ("ayer", "el viernes") convertilas a AAAA-MM-DD. ' +
  'Usá nombres de clientes y personas exactamente como figuran en el contexto (aceptá apodos o abreviaturas y elegí el más parecido). Si es ambiguo, hacé una respuesta con la duda en una línea.';

/* ---------- Resumen de un cliente ---------- */
const TOOL_CLIENTE = {
  name: 'resumen_cliente', description: 'Cómo está el cliente hoy.',
  input_schema: {
    type: 'object', required: ['estado', 'titular', 'puntos'],
    properties: {
      estado: { type: 'string', enum: ['bien', 'atencion', 'problema'] },
      titular: { type: 'string', description: 'una oración' },
      puntos: { type: 'array', items: { type: 'string' }, description: '3 a 6 puntos concretos: trabajos en curso, plata (qué debe, qué se le facturó), última charla, lo que está trabado' },
      proximos: { type: 'array', items: { type: 'string' }, description: '1 a 3 próximos pasos sugeridos' },
    },
  },
};
const SYS_CLIENTE = QUIENES + ' Te paso todo lo que la app sabe de un cliente (JSON). Armá un resumen para las socias: cómo está la relación, qué trabajos hay, cuánta plata se le facturó y cuánto debe, qué se habló la última vez y qué falta. ' +
  'Solo datos del contexto, con montos y fechas concretas. estado: bien si no hay deuda vencida ni entregas atrasadas; atencion si hay algo pendiente; problema si hay deuda vencida importante o entregas muy atrasadas.';

/* ---------- Charla desde un texto (WhatsApp, notas, mail) ---------- */
const TOOL_CHARLA = {
  name: 'registrar_charla', description: 'Datos de la charla para guardar en Seguimiento.',
  input_schema: {
    type: 'object', required: ['resumen'],
    properties: {
      cliente: { type: 'string', description: 'nombre exacto de la lista, si se puede deducir' },
      fecha: { type: 'string', description: 'AAAA-MM-DD de la charla (la del último mensaje si es un chat)' },
      canal: { type: 'string' }, con_quien: { type: 'string' },
      resumen: { type: 'string', description: '2 a 4 oraciones con lo importante' },
      acuerdo: { type: 'string', description: 'qué quedó acordado (vacío si nada)' },
      proximo: { type: 'string', description: 'próximo paso concreto (vacío si nada)' },
      fecha_proximo: { type: 'string', description: 'AAAA-MM-DD si se menciona o se deduce' },
      responsable: { type: 'string', description: 'alias de la persona del equipo que tiene que hacer el próximo paso' },
    },
  },
};
const SYS_CHARLA = QUIENES + ' Te pegan un chat de WhatsApp, notas de una reunión o un mail con un cliente. Sacá lo importante para registrarlo: resumen, acuerdo, próximo paso con fecha y responsable. No inventes; si algo no está, dejalo vacío.';

/* ---------- Tareas de un proyecto ---------- */
const TOOL_TAREAS = {
  name: 'armar_tareas', description: 'Lista de tareas para el proyecto.',
  input_schema: {
    type: 'object', required: ['tareas'],
    properties: {
      tareas: { type: 'array', items: { type: 'object', required: ['titulo'], properties: {
        titulo: { type: 'string', description: 'tarea concreta, empieza con verbo, máximo 8 palabras' },
        responsable: { type: 'string', description: 'alias exacto de alguien del equipo o vacío' },
        fecha: { type: 'string', description: 'AAAA-MM-DD, repartidas entre el inicio y la entrega (si no hay entrega, en las próximas semanas); vacío si no tiene sentido' },
      } } },
    },
  },
};
const SYS_TAREAS = QUIENES + ' Armás la lista de tareas de un proyecto de la agencia (branding, web, packaging, diseño, audiovisual). Entre 5 y 12 tareas, en el orden en que se hacen, concretas y realistas para un estudio chico: brief, investigación, propuestas, presentación al cliente, ajustes, entrega de archivos, etc. según el tipo. ' +
  'No repitas las tareas existentes. Si hay tareas modelo para el tipo, usalas de base. Asigná responsable solo si es obvio por el puesto o porque es responsable del proyecto. Repartí fechas entre el inicio y la entrega, sin fines de semana.';

/* ---------- Mail libre a un cliente ---------- */
const TOOL_MAIL = {
  name: 'redactar_mail', description: 'Mail listo para revisar.',
  input_schema: { type: 'object', required: ['asunto', 'mensaje'], properties: {
    asunto: { type: 'string', description: 'corto, sin mayúsculas innecesarias' },
    mensaje: { type: 'string', description: 'cuerpo del mail: saludo con el nombre del contacto, 1 a 3 párrafos cortos separados por línea en blanco, cierre. Sin firma (la agrega la app).' },
  } },
};
const SYS_MAIL = QUIENES + ' Redactás mails de la agencia a sus clientes que NO son de cobranza: novedades, pedir material o accesos, coordinar una reunión, avisar vacaciones, presentar una idea, agradecer. ' +
  'Tono àndale: cercano, claro, profesional, con vos (o usted/tú/inglés si el cliente es del exterior o si te lo piden). Breve. No inventes datos, fechas ni montos que no estén en lo que te pasan.';

/* ---------- Mejorar, acortar o traducir un texto ---------- */
const TOOL_TEXTO = {
  name: 'texto_listo', description: 'El texto final.',
  input_schema: { type: 'object', required: ['texto'], properties: { texto: { type: 'string' } } },
};
const TAREAS_TEXTO: Record<string, string> = {
  mejorar: 'Mejorá la redacción: más claro y prolijo, mismo contenido, mismo idioma, tono àndale.',
  corto: 'Hacelo más corto y directo, sin perder nada importante.',
  ingles: 'Traducilo al inglés de negocios, natural (para un cliente del exterior). Si es un concepto de factura, que sea una descripción breve de servicio.',
  formal: 'Hacelo un poco más formal, sin perder calidez.',
};
const SYS_TEXTO = QUIENES + ' Te pasan un texto y una tarea. Devolvé solo el texto final, sin comillas ni comentarios.';

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  let b: any; try { b = await req.json(); } catch { return json({ error: 'Pedido inválido' }, 400); }
  try {
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
    const { data: yoData } = await sb.rpc('yo');
    const yo = Array.isArray(yoData) ? yoData[0] : yoData;
    if (!yo || !['admin', 'equipo'].includes(yo.rol)) return json({ error: 'Solo el equipo puede usar la IA.' }, 403);
    const hoy = 'HOY: ' + hoyAR() + ' (' + diaAR() + '). QUIEN ESCRIBE: ' + (yo.alias || yo.nombre || '') + ' (' + yo.rol + ').';
    const texto = String(b.texto || '').slice(0, 20_000);
    switch (b.modo) {
      case 'comando': {
        if (!texto.trim()) throw new Aviso('Escribí qué necesitás.');
        const r = await claude(sb, yo.id, 'comando', { system: SYS_COMANDO, tool: TOOL_COMANDO, maxTokens: 900, texto: hoy + '\n\nCONTEXTO:\n' + ctxTxt(b.contexto) + '\n\nPEDIDO:\n' + texto });
        if (r.tipo === 'accion' && (!r.accion || !ACCIONES.includes(r.accion.tipo))) r.tipo = 'respuesta';
        return json(r);
      }
      case 'cliente': return json(await claude(sb, yo.id, 'cliente', { system: SYS_CLIENTE, tool: TOOL_CLIENTE, maxTokens: 800, texto: hoy + '\n\nCLIENTE:\n' + ctxTxt(b.contexto) }));
      case 'charla': {
        if (!texto.trim()) throw new Aviso('Pegá el chat o las notas.');
        return json(await claude(sb, yo.id, 'charla', { system: SYS_CHARLA, tool: TOOL_CHARLA, maxTokens: 700, texto: hoy + '\n\nCONTEXTO:\n' + ctxTxt(b.contexto) + '\n\nTEXTO:\n' + texto }));
      }
      case 'tareas': return json(await claude(sb, yo.id, 'tareas', { system: SYS_TAREAS, tool: TOOL_TAREAS, maxTokens: 900, texto: hoy + '\n\nEQUIPO Y MODELOS:\n' + ctxTxt(b.contexto) + '\n\nPROYECTO:\n' + texto }));
      case 'mail': {
        if (!texto.trim()) throw new Aviso('Contale a Mr. Piggy qué querés decir.');
        return json(await claude(sb, yo.id, 'mail', { system: SYS_MAIL, tool: TOOL_MAIL, maxTokens: 900, texto: hoy + '\n\nCLIENTE Y CONTEXTO:\n' + ctxTxt(b.contexto) + '\n\nQUÉ QUIERE DECIR:\n' + texto }));
      }
      case 'texto': {
        if (!texto.trim()) throw new Aviso('No hay texto para trabajar.');
        const t = TAREAS_TEXTO[b.tarea] || TAREAS_TEXTO.mejorar;
        return json(await claude(sb, yo.id, 'texto', { system: SYS_TEXTO, tool: TOOL_TEXTO, maxTokens: 1200, texto: 'TAREA: ' + t + '\n\nTEXTO:\n' + texto }));
      }
      default: return json({ error: 'Modo desconocido' }, 400);
    }
  } catch (e) {
    console.error(b && b.modo, e);
    return json({ error: (e as Error).message || 'Error inesperado' }, e instanceof Aviso ? e.status : 500);
  }
});
