// Mr. Piggy, la IA de àndale para el día a día: la barra "Decile a àndale", el resumen de un cliente y cargar una charla desde un texto.
// La app manda el contexto que ya tiene cargado (lo que ese usuario puede ver) y acá solo se arma el pedido a Claude.
// Equipo y admins. verify_jwt apagado: se valida el usuario con rpc('yo').
//
// Secretos: ANTHROPIC_API_KEY (el mismo del asistente) · IA_MODEL_RAPIDO opcional (default claude-haiku-5-5, el más rápido)
// POST { modo: 'comando' | 'cliente' | 'charla' | 'tareas' | 'mail' | 'texto' | 'redes_ideas' | 'redes_copys' | 'redes_chat' | 'informe_redes' | 'rentabilidad' | 'presupuesto' | 'brief', texto?, contexto, tarea?, imagenes? }
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

async function claude(sb: SupabaseClient, personaId: string | null, accion: string, o: { system: string; texto: string; tool: Record<string, unknown>; maxTokens?: number; imagenes?: { tipo: string; base64: string }[] }) {
  const cfg = await cred('anthropic');
  const key = (cfg && cfg.key) || Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Aviso('La IA no está configurada todavía. Conectala en Configuración → Integraciones → Mr. Piggy.', 503);
  const modelo = (cfg && cfg.modelo_rapido) || MODEL();
  const pedir = (max: number) => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({
      model: modelo, max_tokens: max,
      system: o.system + '\n\nRespondé únicamente llamando una vez a la herramienta ' + o.tool.name + ', sin texto antes ni después.',
      messages: [{ role: 'user', content: [...(o.imagenes || []).map(im => ({ type: 'image', source: { type: 'base64', media_type: im.tipo, data: im.base64 } })), { type: 'text', text: o.texto }] }],
      tools: [o.tool], tool_choice: { type: 'tool', name: o.tool.name },
    }),
  });
  let max = o.maxTokens || 2000;
  let res = await pedir(max);
  let out = await res.json().catch(() => ({}));
  // Si la respuesta se cortó por largo, se pide de nuevo con más espacio (una vez).
  if (res.ok && out && out.stop_reason === 'max_tokens') { max = Math.min(8000, max * 2); res = await pedir(max); out = await res.json().catch(() => ({})); }
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
        etapa: { type: 'string', description: 'si el contexto trae etapas del flujo, el nombre exacto de la etapa a la que pertenece; si no, vacío' },
      } } },
    },
  },
};
const SYS_TAREAS = QUIENES + ' Armás la lista de tareas de un proyecto de la agencia (branding, web, packaging, diseño, audiovisual). Entre 5 y 12 tareas, en el orden en que se hacen, concretas y realistas para un estudio chico: brief, investigación, propuestas, presentación al cliente, ajustes, entrega de archivos, etc. según el tipo. ' +
  'No repitas las tareas existentes. Si hay tareas modelo para el tipo, usalas de base. Si hay etapas del flujo, ubicá cada tarea en su etapa y respetá ese orden. Asigná responsable solo si es obvio por el puesto o porque es responsable del proyecto. Repartí fechas entre el inicio y la entrega, sin fines de semana.';

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
  detalle: 'Con estos datos escribí el detalle de un gasto o ingreso para la planilla de la agencia. Una sola línea, de 3 a 12 palabras, concreta (qué fue y de qué mes o para qué clientes si se sabe). No repitas el monto ni la fecha completa. Si hay ejemplos, copiá su estilo y abreviaturas. Si ya escribieron algo, mejoralo sin cambiar lo que dice.',
  concepto: 'Con estos datos escribí el concepto de una factura a un cliente. Una línea clara y formal, del estilo "Servicio de gestión de redes sociales - octubre 2026" o "Diseño de identidad de marca - 2.ª cuota". Si hay conceptos anteriores, mantené su formato. Sin montos.',
};
const SYS_TEXTO = QUIENES + ' Te pasan un texto y una tarea. Devolvé solo el texto final, sin comillas ni comentarios.';

/* ---------- Redes: ideas, copys, chat del cliente ---------- */
const PIEZA_PROPS = {
  formato: { type: 'string', description: 'uno de los formatos que te pasan, exacto' },
  fecha: { type: 'string', description: 'AAAA-MM-DD dentro del mes' },
  tema: { type: 'string', description: 'de qué trata la pieza, en una línea concreta' },
  copy: { type: 'string', description: 'texto del posteo; vacío para historias si no hace falta' },
  hashtags: { type: 'string', description: '3 a 8 hashtags separados por espacio, o vacío' },
};
const TOOL_IDEAS = { name: 'proponer_piezas', description: 'Piezas propuestas para el mes.', input_schema: { type: 'object', required: ['piezas'], properties: {
  piezas: { type: 'array', items: { type: 'object', required: ['formato', 'tema'], properties: PIEZA_PROPS } } } } };
const SYS_IDEAS = QUIENES + ' Sos community manager de la agencia. Proponés el contenido de un mes de redes para un cliente: temas concretos, variados y propios de su rubro, aprovechando fechas especiales de Argentina que tengan sentido para la marca. ' +
  'Respetá la cantidad por formato que te piden, repartí las fechas en el mes (sin amontonar), no repitas lo que ya está cargado ni lo del mes anterior. Copys breves, tono de la marca, con llamado a la acción cuando corresponda. No inventes precios, promociones ni datos que no te pasen.';
const TOOL_COPYS = { name: 'escribir_copys', description: 'Copys para las piezas.', input_schema: { type: 'object', required: ['piezas'], properties: {
  piezas: { type: 'array', items: { type: 'object', required: ['id', 'copy'], properties: { id: { type: 'string' }, copy: { type: 'string' }, hashtags: { type: 'string' } } } } } } };
const SYS_COPYS = QUIENES + ' Escribís copys de redes para las piezas que te pasan (cada una con su id y su tema). Tono de la marca, claros, con emoji solo si va con la marca, llamado a la acción cuando sirve. Devolvé el mismo id. No inventes precios ni promociones.';
const TOOL_CHATRED = { name: 'repartir_chat', description: 'Lo que pidió el cliente, pieza por pieza.', input_schema: { type: 'object', required: ['cambios'], properties: {
  cambios: { type: 'array', items: { type: 'object', required: ['id', 'accion'], properties: { id: { type: 'string', description: 'id exacto de la pieza' }, accion: { type: 'string', enum: ['aprobada', 'cambios', 'nota'] }, detalle: { type: 'string', description: 'qué pidió, en una o dos líneas' } } } },
  nuevas: { type: 'array', description: 'piezas nuevas que pidió el cliente', items: { type: 'object', required: ['formato', 'tema'], properties: PIEZA_PROPS } },
  resumen: { type: 'string', description: 'resumen en una línea de la respuesta del cliente' } } } };
const SYS_CHATRED = QUIENES + ' Te pegan un chat (WhatsApp o mail) donde el cliente opina sobre las piezas de redes del mes. Relacioná cada comentario con la pieza correcta (por fecha, formato o tema) y decí si la aprueba, pide cambios o solo es una nota. Si pide algo nuevo, ponelo en nuevas. No inventes: si no se puede saber a qué pieza se refiere, no la incluyas.';

/* ---------- Informe mensual de redes ---------- */
const TOOL_INFORME = { name: 'informe_redes', description: 'Informe mensual para el cliente.', input_schema: { type: 'object', required: ['metricas', 'texto'], properties: {
  metricas: { type: 'array', description: 'las métricas principales que aparecen en los datos (4 a 8)', items: { type: 'object', required: ['nombre', 'valor'], properties: {
    nombre: { type: 'string', description: 'Alcance, Visualizaciones, Interacciones, Seguidores nuevos, Clics al perfil, etc.' }, valor: { type: 'number' },
    anterior: { type: 'number', description: 'valor del mes anterior si está en los datos' }, red: { type: 'string', description: 'Instagram, Facebook, etc.' } } } },
  destacadas: { type: 'array', description: 'las 1 a 3 publicaciones que mejor funcionaron', items: { type: 'object', required: ['titulo', 'por_que'], properties: { titulo: { type: 'string' }, por_que: { type: 'string' } } } },
  texto: { type: 'string', description: 'resumen para el cliente en 2 o 3 párrafos cortos: cómo fue el mes, qué funcionó y por qué. Cercano y claro, sin tecnicismos.' },
  recomendaciones: { type: 'array', items: { type: 'string' }, description: '2 a 4 cosas concretas para probar el mes que viene' } } } };
const SYS_INFORME = QUIENES + ' Armás el informe mensual de redes para un cliente a partir de los datos exportados de Meta (CSV, números pegados o capturas) y lo que se publicó. ' +
  'Usá solo números que estén en los datos: si una métrica no está, no la pongas. Compará con el mes anterior solo si está el dato. Explicá en lenguaje simple, sin prometer resultados.';

/* ---------- Rentabilidad y presupuesto ---------- */
const TOOL_RENTA = { name: 'analisis_rentabilidad', description: 'Lectura de la rentabilidad.', input_schema: { type: 'object', required: ['resumen', 'alertas'], properties: {
  resumen: { type: 'string', description: '2 o 3 frases sobre cómo viene la agencia en margen y horas' },
  alertas: { type: 'array', items: { type: 'object', required: ['cliente', 'problema', 'sugerencia'], properties: { cliente: { type: 'string' }, problema: { type: 'string' }, sugerencia: { type: 'string' } } } },
  oportunidades: { type: 'array', items: { type: 'string' } } } } };
const SYS_RENTA = QUIENES + ' Analizás la rentabilidad por cliente de la agencia: lo que cobra cada uno, las horas que se le dedicaron (aproximadas, cargadas por el equipo), el costo de esas horas y las piezas extra fuera de plan. ' +
  'Marcá clientes con margen bajo o negativo, con horas que vienen subiendo, o con extras seguidos (posible ajuste de precio o de alcance). Sé concreto y prudente: las horas son aproximadas. No inventes números.';
const TOOL_PRESU = { name: 'estimar_presupuesto', description: 'Estimación de horas y precio.', input_schema: { type: 'object', required: ['horas', 'explicacion'], properties: {
  horas: { type: 'number' }, horas_min: { type: 'number' }, horas_max: { type: 'number' }, precio_sugerido: { type: 'number' }, moneda: { type: 'string' },
  explicacion: { type: 'string', description: 'en 2 o 3 frases: en qué proyectos parecidos te basaste y por qué' } } } };
const SYS_PRESU = QUIENES + ' Ayudás a presupuestar un trabajo nuevo usando lo que tardaron proyectos parecidos de la agencia (horas reales cargadas) y el valor hora. Si hay pocos datos, decilo y dá un rango más amplio. No inventes proyectos.';

/* ---------- Brief del cliente (Tally) ---------- */
const TOOL_BRIEF = { name: 'leer_brief', description: 'Lo importante del brief.', input_schema: { type: 'object', required: ['resumen'], properties: {
  resumen: { type: 'string', description: 'qué necesita el cliente, en 3 a 5 líneas' },
  objetivos: { type: 'array', items: { type: 'string' } }, publico: { type: 'string' }, tono: { type: 'string' },
  entregables: { type: 'array', items: { type: 'string' } }, referencias: { type: 'array', items: { type: 'string' } },
  dudas: { type: 'array', items: { type: 'string' }, description: 'lo que falta aclarar con el cliente antes de arrancar' } } } };
const SYS_BRIEF = QUIENES + ' Leés el brief que completó un cliente en un formulario y sacás lo importante para el equipo: qué quiere, para quién, tono, entregables, referencias y qué falta preguntar. No inventes nada que no esté en las respuestas.';

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
        const r = await claude(sb, yo.id, 'comando', { system: SYS_COMANDO, tool: TOOL_COMANDO, maxTokens: 2000, texto: hoy + '\n\nCONTEXTO:\n' + ctxTxt(b.contexto) + '\n\nPEDIDO:\n' + texto });
        if (r.tipo === 'accion' && (!r.accion || !ACCIONES.includes(r.accion.tipo))) r.tipo = 'respuesta';
        return json(r);
      }
      case 'cliente': return json(await claude(sb, yo.id, 'cliente', { system: SYS_CLIENTE, tool: TOOL_CLIENTE, maxTokens: 1800, texto: hoy + '\n\nCLIENTE:\n' + ctxTxt(b.contexto) }));
      case 'charla': {
        if (!texto.trim()) throw new Aviso('Pegá el chat o las notas.');
        return json(await claude(sb, yo.id, 'charla', { system: SYS_CHARLA, tool: TOOL_CHARLA, maxTokens: 1500, texto: hoy + '\n\nCONTEXTO:\n' + ctxTxt(b.contexto) + '\n\nTEXTO:\n' + texto }));
      }
      case 'tareas': return json(await claude(sb, yo.id, 'tareas', { system: SYS_TAREAS, tool: TOOL_TAREAS, maxTokens: 3000, texto: hoy + '\n\nEQUIPO Y MODELOS:\n' + ctxTxt(b.contexto) + '\n\nPROYECTO:\n' + texto }));
      case 'mail': {
        if (!texto.trim()) throw new Aviso('Contale a Mr. Piggy qué querés decir.');
        return json(await claude(sb, yo.id, 'mail', { system: SYS_MAIL, tool: TOOL_MAIL, maxTokens: 2000, texto: hoy + '\n\nCLIENTE Y CONTEXTO:\n' + ctxTxt(b.contexto) + '\n\nQUÉ QUIERE DECIR:\n' + texto }));
      }
      case 'texto': {
        if (!texto.trim()) throw new Aviso('No hay texto para trabajar.');
        const t = TAREAS_TEXTO[b.tarea] || TAREAS_TEXTO.mejorar;
        return json(await claude(sb, yo.id, 'texto', { system: SYS_TEXTO, tool: TOOL_TEXTO, maxTokens: 2500, texto: 'TAREA: ' + t + '\n\nTEXTO:\n' + texto }));
      }
      case 'redes_ideas': return json(await claude(sb, yo.id, 'redes_ideas', { system: SYS_IDEAS, tool: TOOL_IDEAS, maxTokens: 6000, texto: hoy + '\n\nCLIENTE Y MES:\n' + ctxTxt(b.contexto) + '\n\nPEDIDO:\n' + (texto || 'Proponé el contenido que falta del mes.') }));
      case 'redes_copys': return json(await claude(sb, yo.id, 'redes_copys', { system: SYS_COPYS, tool: TOOL_COPYS, maxTokens: 5000, texto: hoy + '\n\nCLIENTE:\n' + ctxTxt(b.contexto) + '\n\nPIEZAS:\n' + texto }));
      case 'redes_chat': {
        if (!texto.trim()) throw new Aviso('Pegá el chat del cliente.');
        return json(await claude(sb, yo.id, 'redes_chat', { system: SYS_CHATRED, tool: TOOL_CHATRED, maxTokens: 3000, texto: hoy + '\n\nPIEZAS DEL MES:\n' + ctxTxt(b.contexto) + '\n\nCHAT:\n' + texto }));
      }
      case 'informe_redes': {
        const imgs = (Array.isArray(b.imagenes) ? b.imagenes : []).slice(0, 6).filter((i: any) => i && /^image\/(png|jpeg|webp|gif)$/.test(i.tipo) && typeof i.base64 === 'string' && i.base64.length < 5_000_000);
        if (!texto.trim() && !imgs.length) throw new Aviso('Pegá los datos del mes o subí las capturas.');
        return json(await claude(sb, yo.id, 'informe_redes', { system: SYS_INFORME, tool: TOOL_INFORME, maxTokens: 3000, imagenes: imgs, texto: hoy + '\n\nCLIENTE Y MES:\n' + ctxTxt(b.contexto) + '\n\nDATOS:\n' + (texto || '(en las capturas)') }));
      }
      case 'rentabilidad': return json(await claude(sb, yo.id, 'rentabilidad', { system: SYS_RENTA, tool: TOOL_RENTA, maxTokens: 2500, texto: hoy + '\n\nDATOS:\n' + ctxTxt(b.contexto) }));
      case 'presupuesto': return json(await claude(sb, yo.id, 'presupuesto', { system: SYS_PRESU, tool: TOOL_PRESU, maxTokens: 1500, texto: hoy + '\n\nHISTORIAL Y VALOR HORA:\n' + ctxTxt(b.contexto) + '\n\nTRABAJO NUEVO:\n' + texto }));
      case 'brief': {
        if (!texto.trim()) throw new Aviso('El brief está vacío.');
        return json(await claude(sb, yo.id, 'brief', { system: SYS_BRIEF, tool: TOOL_BRIEF, maxTokens: 2000, texto: hoy + '\n\nCLIENTE:\n' + ctxTxt(b.contexto) + '\n\nRESPUESTAS:\n' + texto }));
      }
      default: return json({ error: 'Modo desconocido' }, 400);
    }
  } catch (e) {
    console.error(b && b.modo, e);
    return json({ error: (e as Error).message || 'Error inesperado' }, e instanceof Aviso ? e.status : 500);
  }
});
