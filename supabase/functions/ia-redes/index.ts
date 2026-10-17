// Mr. Piggy arma el contenido de redes: el plan del mes (qué pieza, qué día, qué va en el diseño) y los copys.
// Aparte de `ia` para poder ajustar las reglas de escritura sin tocar la función grande. Equipo y admins.
// verify_jwt apagado: se valida el usuario con rpc('yo'). Misma cuenta de IA que `ia`, con el modelo preciso (escribe mejor).
// POST { modo: 'redes_ideas' | 'redes_copys' | 'redes_agenda' | 'redes_contenido' | 'redes_revision' | 'redes_investigar', texto, contexto }
//   redes_ideas → { piezas: [{ formato, fecha, tema, contenido }] }   (los copys se escriben después, en tandas)
//   redes_copys → texto = JSON [{ id, formato, fecha, tema, contenido, copy_actual }] → { piezas: [{ id, copy, hashtags, contenido? }] }
//   redes_agenda → contexto con la cuenta, las piezas a ubicar y las que ya tienen lugar → { criterio, horarios: [{ formato, dias, hora }], piezas: [{ id, fecha, hora, motivo }] }
//   redes_contenido → texto = JSON [{ id, formato, tema, contenido_actual, copy }] → { piezas: [{ id, contenido }] }
//   redes_revision → texto = JSON [{ id, formato, fecha, hora, tema, contenido, copy, hashtags }] (+ contexto.todas, contexto.general)
//                    → { resumen?, observaciones?, piezas: [{ id, nota, comentarios, copy?, hashtags?, contenido? }] }
//   redes_investigar → busca en la web (herramienta web_search de Anthropic) fechas del mes y novedades del rubro
//                    → { fechas: [{ fecha, nombre, tipo, idea, fuente }], novedades: [{ titulo, resumen, idea, fuente, fecha }] }
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
const hoyAR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Cordoba' });
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const BASE = 'Sos Mr. Piggy, community manager senior de àndale, una agencia de branding y redes de Córdoba, Argentina. ' +
  'Escribís como la MARCA del cliente, no como la agencia. La ficha de marca (MARCA) es la regla: tono, trato (vos, tú o usted), emojis, palabras que usa, pilares, público y lo que nunca dice ni hace. ' +
  'Los copys_aprobados y los ejemplos de la ficha muestran cómo suena: tomá el tono, no copies sus frases. Las frases de "palabras que usa" son recursos para usar de vez en cuando, no un cierre fijo: variá los llamados a la acción entre piezas. ' +
  'No inventes precios, promociones, stock, plazos ni datos que no te pasen. Si no hay ficha, escribí neutro y sin inventar datos de la marca. ' +
  'Usá solo datos de la marca que estén en la ficha, las notas o el brief (vos no navegás la web). Lo que en la ficha figura como pendiente ("completar con…", "no se informó", "a definir") NO es un dato: no inventes aniversarios, años de trayectoria, lanzamientos, eventos, sucursales ni fechas propias de la marca. Si una idea necesita un dato que no tenés, elegí otra.';

const REGLAS_FORMATO = 'QUÉ VA EN CADA FORMATO (campo contenido, para quien diseña o graba):\n' +
  '- Carruseles: una línea por slide, "Slide 1: …", 5 a 8 slides. La 1 es el gancho (promesa clara), las del medio desarrollan un punto cada una, la última cierra con el llamado a la acción. Texto corto por slide (lo que va escrito en la placa).\n' +
  '- Posts: "Título: …" (lo que va grande en la placa, máx. 8 palabras), "Bajada: …" (opcional, una línea) y "Imagen: …" (qué se ve: foto, producto, situación).\n' +
  '- Reels: "Gancho (0-3 s): …", luego las escenas numeradas con lo que se ve y el texto en pantalla, y "Audio: …" (voz en off, tendencia o música, en una línea).\n' +
  '- Historias: "Texto: …" (lo que va escrito en la historia, corto y con la voz de la marca, con emoji si la marca usa) y, si suma, "Sticker: …" (encuesta con sus 2 opciones, pregunta, cuenta regresiva, link o "Mencioná a…").\n' +
  '- Otros formatos: describí en 2-4 líneas qué se ve y qué texto lleva.\n' +
  'FORMA (para que se entienda a primera vista): cada elemento en su propia línea, con su etiqueta y dos puntos ("Slide 1: …", "Título: …", "Imagen: …"). Los detalles de un elemento van debajo, cada uno en su línea empezando con "→ ". Dejá una línea en blanco entre bloques (entre slides, escenas o elementos). Nada de párrafos largos.';

const REGLAS_COPY = 'CÓMO SE ESCRIBE UN COPY (el texto que acompaña la publicación):\n' +
  '- Primera línea: un gancho que frene el scroll (pregunta, dato, problema del público o promesa), de 4 a 10 palabras.\n' +
  '- Después 2 o 3 párrafos cortos, de 1 o 2 frases cada uno, SEPARADOS POR UNA LÍNEA EN BLANCO (\\n\\n) para que el texto respire. Nunca un bloque de texto corrido. Antes y después de una lista también va una línea en blanco. Si ESPACIO ENTRE BLOQUES dice dos líneas, dejá dos líneas en blanco entre bloques.\n' +
  '- Si hay pasos, consejos o beneficios, van en líneas sueltas que empiezan con un emoji o con "→" o "✔️" (según el uso de emojis de la marca).\n' +
  '- Cierre: un llamado a la acción concreto y distinto en cada pieza (escribinos, guardalo, compartilo con quien…, comentá, pasá por…).\n' +
  '- Largo: Posts y Carruseles 350 a 700 caracteres; Reels 200 a 450; Historias: vacío (lo escrito va en contenido).\n' +
  '- Emojis según la ficha: "Sí, con ganas" → 4 a 7, integrados al texto; "Pocos y puntuales" → 2 o 3 por copy, al inicio de un párrafo, de una línea de lista o junto al llamado a la acción (nunca en medio de una palabra ni varios seguidos); "No usa" → ninguno. Sin ficha: 1 o 2. Elegí emojis que tengan que ver con el tema (🔧🧱🚚📦 para obra y entregas, por ejemplo), no caritas genéricas.\n' +
  '- Sin hashtags dentro del copy, sin mayúsculas sostenidas, sin exclamaciones de más.\n' +
  '- Cada pieza dice en qué redes se publica (redes): el mismo copy se replica en todas, así que tiene que funcionar en cada una. Si va también a LinkedIn: sin "link en bio" ni jerga de Instagram, tono un poco más profesional; si va a TikTok, más corto.\n' +
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
  'No repitas temas de lo ya cargado ni del mes anterior. ' +
  'Si el contexto trae fechas_y_novedades (buscadas en la web y elegidas por el equipo), son tu fuente de fechas especiales: usá las que le sirvan a la marca en su fecha exacta y aprovechá las novedades para piezas útiles; fuera de esa lista no uses otras fechas especiales salvo feriados nacionales de los que estés seguro. Sin esa lista, mejor no uses fechas especiales que no sean feriados nacionales seguros.\n\n' + REGLAS_FORMATO +
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

const TOOL_AGENDA = { name: 'agenda_del_mes', description: 'Cuándo publicar cada pieza y los horarios de la cuenta.', input_schema: { type: 'object', required: ['criterio', 'horarios', 'piezas'], properties: {
  criterio: { type: 'string', description: '2 a 4 frases para el equipo: por qué estos días y horarios para esta cuenta (público, rubro, contenido). Aclará si es una estimación sin datos de rendimiento.' },
  horarios: { type: 'array', description: 'un horario recomendado por formato para esta cuenta', items: { type: 'object', required: ['formato', 'hora'], properties: {
    formato: { type: 'string', description: 'uno de los formatos, exacto' }, dias: { type: 'string', description: 'días que más le convienen, corto: "mar a jue", "lun, mié y vie"' }, hora: { type: 'string', description: 'HH:MM, 24 h, hora de Argentina' } } } },
  piezas: { type: 'array', items: { type: 'object', required: ['id', 'fecha', 'hora'], properties: {
    id: { type: 'string', description: 'id exacto de la pieza' }, fecha: { type: 'string', description: 'AAAA-MM-DD dentro del mes' }, hora: { type: 'string', description: 'HH:MM, 24 h' },
    motivo: { type: 'string', description: 'por qué ese día, en 4 a 12 palabras' } } } } } } };
const SYS_AGENDA = 'Sos Mr. Piggy, community manager senior de àndale, una agencia de redes de Córdoba, Argentina. Decidís cuándo publicar cada pieza del mes de un cliente en Instagram y Facebook. ' +
  'Pensá en el público de la cuenta (cuándo está en el celular: antes de trabajar, al mediodía, a la salida, a la noche), el rubro (si le venden a profesionales o comercios, priorizá días hábiles y horario laboral; si es consumo o gastronomía, tardes, noches y fines de semana cerca del momento de consumo) y el contenido de cada pieza (una promo o un lanzamiento va antes del fin de semana o de la fecha a la que apunta; un consejo, cuando el público tiene tiempo de leerlo; una fecha especial, ese día o el anterior). ' +
  'Si te pasan resultados de informes anteriores, usalos y decilo en el criterio; si no hay, aclará que es una estimación por rubro y público, sin datos de rendimiento de la cuenta. ' +
  'Reglas: todas las fechas dentro del mes; posts, carruseles y reels en días distintos entre sí y repartidos en todo el mes (no amontones al principio); no más de 2 historias por día; respetá las piezas que ya tienen lugar (OCUPADAS) y no les cambies nada; ' +
  'si una pieza nombra una fecha especial, ubicala para esa fecha; no uses feriados de los que no estés seguro. Horarios en punto o y media, hora de Argentina. ' +
  '\n\nRespondé únicamente llamando una vez a la herramienta agenda_del_mes, sin texto antes ni después.';

const TOOL_CONT = { name: 'escribir_contenido', description: 'Lo que va en cada pieza.', input_schema: { type: 'object', required: ['piezas'], properties: {
  piezas: { type: 'array', items: { type: 'object', required: ['id', 'contenido'], properties: { id: { type: 'string' }, contenido: { type: 'string', description: 'con saltos de línea, según el formato' } } } } } } };
const SYS_CONT = BASE + '\n\nEscribís (o mejorás, si ya hay algo en contenido_actual) lo que va en cada pieza para quien diseña o graba. Respetá el tema; si hay copy, que lo que va en la pieza y el copy se complementen sin repetirse.\n\n' + REGLAS_FORMATO +
  '\n\nRespondé únicamente llamando una vez a la herramienta escribir_contenido, sin texto antes ni después.';

const TOOL_REV = { name: 'revisar_piezas', description: 'Revisión del contenido del mes.', input_schema: { type: 'object', required: ['piezas'], properties: {
  resumen: { type: 'string', description: 'solo si te piden la mirada general: 2 a 4 frases sobre el mes completo' },
  observaciones: { type: 'array', items: { type: 'string' }, description: 'solo si te piden la mirada general: puntos concretos del mes (balance de formatos y pilares, fechas amontonadas o vacías, temas repetidos, llamados a la acción repetidos, fechas especiales que faltan). Máx. 6.' },
  piezas: { type: 'array', items: { type: 'object', required: ['id', 'nota', 'comentarios'], properties: {
    id: { type: 'string' },
    nota: { type: 'string', enum: ['bien', 'mejorar', 'rehacer'] },
    comentarios: { type: 'array', items: { type: 'string' }, description: '1 a 3 observaciones concretas y breves (qué está mal y por qué); si está bien, qué funciona' },
    copy: { type: 'string', description: 'solo si la nota es mejorar o rehacer y el copy lo necesita: el copy corregido completo, con las reglas' },
    hashtags: { type: 'string', description: 'solo si hay que cambiarlos' },
    contenido: { type: 'string', description: 'solo si lo que va en la pieza falta o hay que corregirlo' },
  } } } } } };
const SYS_REV = BASE + '\n\nRevisás piezas ya cargadas de un mes de redes, como lo haría la directora de cuentas antes de mandarlas al cliente. Para cada pieza: ¿respeta la ficha de marca (tono, trato, emojis, lo que nunca dice)? ¿el copy tiene gancho, párrafos separados y un llamado a la acción? ¿el largo va con el formato? ¿los hashtags están bien? ¿lo que va en la pieza está claro para quien diseña? ¿el tema y la fecha tienen sentido? ¿el copy funciona en todas las redes donde se replica (campo redes)? ¿afirma algo de la marca (aniversario, años, lanzamiento, promo, evento) que no esté en la ficha ni en las notas? Si es así, es "rehacer" y decilo en el comentario. ' +
  'Sé exigente pero justo: "bien" si está para mandar; "mejorar" si con ajustes queda; "rehacer" si no sirve. Cuando corregís, devolvé el texto completo listo para usar, no instrucciones.\n\n' + REGLAS_COPY + '\n\n' + REGLAS_FORMATO +
  '\n\nRespondé únicamente llamando una vez a la herramienta revisar_piezas, sin texto antes ni después.';

const TOOL_INV = { name: 'fechas_y_novedades', description: 'Lo que encontraste en la web para el mes, con su fuente.', input_schema: { type: 'object', required: ['fechas', 'novedades'], properties: {
  fechas: { type: 'array', items: { type: 'object', required: ['fecha', 'nombre', 'tipo'], properties: {
    fecha: { type: 'string', description: 'AAAA-MM-DD exacta, dentro del mes a planificar' }, nombre: { type: 'string' },
    tipo: { type: 'string', enum: ['nacional', 'internacional', 'rubro', 'comercial', 'local'] },
    idea: { type: 'string', description: 'en una frase, cómo la podría usar esta marca' }, fuente: { type: 'string', description: 'URL donde lo confirmaste' } } } },
  novedades: { type: 'array', items: { type: 'object', required: ['titulo', 'resumen'], properties: {
    titulo: { type: 'string' }, resumen: { type: 'string', description: '1 o 2 frases' }, idea: { type: 'string', description: 'cómo convertirlo en contenido útil para el público de la marca' },
    fuente: { type: 'string', description: 'URL' }, fecha: { type: 'string', description: 'fecha de la nota, si figura' } } } } } } };
const SYS_INV = 'Sos Mr. Piggy, community manager senior de àndale, una agencia de redes de Córdoba, Argentina. Investigás en la web para planificar el mes de redes de un cliente. Buscá y confirmá con fuentes: ' +
  '1) Fechas que caen DENTRO del mes a planificar: feriados y fechas patrias de Argentina, días internacionales, días del rubro, de sus oficios o de su público (por ejemplo, para construcción: Día del Albañil, Día del Arquitecto), y fechas comerciales (Hot Sale, CyberMonday, Black Friday, Día del Padre o de la Madre si caen ese mes). Verificá la fecha exacta de ESE año (las móviles cambian) y no incluyas fechas de otros meses. ' +
  '2) Novedades recientes (últimos 2 meses) del rubro en Argentina, y de su ciudad si se sabe, que le sirvan al público de la marca: tendencias, cambios de normativa o de precios de referencia, consejos de temporada, datos útiles. Nada de política partidaria ni noticias policiales o trágicas. ' +
  'Solo lo que encontraste, con su URL; no inventes. Priorizá lo que tiene sentido para ESTA marca: hasta 12 fechas y 6 novedades. Cuando termines, llamá una vez a fechas_y_novedades.';

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
  const MODOS = ['redes_ideas', 'redes_copys', 'redes_agenda', 'redes_contenido', 'redes_revision', 'redes_investigar'];
  const modo = MODOS.includes(b.modo) ? b.modo : 'redes_ideas';
  const texto = String(b.texto || '').slice(0, 40_000), ctx = b.contexto ?? {};
  const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  let cfg: any = null; try { const { data } = await svc.rpc('cred_leer', { n: 'anthropic' }); if (data) cfg = JSON.parse(data); } catch { cfg = null; }
  const key = (cfg && cfg.key) || Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return json({ error: 'La IA no está configurada todavía. Conectala en Configuración → Integraciones → Mr. Piggy.' }, 503);
  const modelo = (cfg && cfg.modelo) || Deno.env.get('IA_MODEL') || 'claude-sonnet-5-5';
  const [tool, system] = ({ redes_copys: [TOOL_COPYS, SYS_COPYS], redes_agenda: [TOOL_AGENDA, SYS_AGENDA], redes_contenido: [TOOL_CONT, SYS_CONT], redes_revision: [TOOL_REV, SYS_REV], redes_investigar: [TOOL_INV, SYS_INV], redes_ideas: [TOOL_PLAN, SYS_PLAN] } as Record<string, [any, string]>)[modo];
  const marca = ctx && ctx.marca ? ctx.marca : null;
  const cab = 'HOY: ' + hoyAR() + (ctx.mes ? '\nMES A PLANIFICAR: ' + mesTxt(ctx.mes) + '. Todas las fechas van dentro de ese mes.' : '') +
    '\nEMOJIS DE LA MARCA: ' + ((marca && marca.emojis) || 'sin dato (usá 1 o 2)') + (marca && marca.hashtags ? '\nHASHTAGS PROPIOS: ' + marca.hashtags : '') + (marca && marca.espaciado ? '\nESPACIO ENTRE BLOQUES: ' + marca.espaciado : '');
  const user = modo === 'redes_investigar' ? cab + '\n\nCLIENTE:\n' + JSON.stringify(ctx).slice(0, 20_000)
    : modo === 'redes_agenda' ? cab + '\n\nCUENTA, MES Y PIEZAS:\n' + JSON.stringify(ctx).slice(0, 60_000) + (texto ? '\n\nPEDIDO:\n' + texto : '')
    : modo === 'redes_revision' ? cab + '\n\nCLIENTE Y MES:\n' + JSON.stringify(ctx).slice(0, 60_000) + '\n\n' + (ctx.general ? 'Además de cada pieza, dame la mirada general del mes (resumen y observaciones) mirando "todas".' : 'No hace falta la mirada general: solo cada pieza.') + (ctx.pedido ? '\n\nPEDIDO DEL EQUIPO (es la prioridad de esta revisión; si dice qué piezas o formatos mirar, revisá y devolvé solo esas): ' + String(ctx.pedido) : '') + '\n\nPIEZAS A REVISAR:\n' + texto
    : modo === 'redes_contenido' ? cab + '\n\nCLIENTE:\n' + JSON.stringify(ctx).slice(0, 60_000) + '\n\nPIEZAS:\n' + texto
    : modo === 'redes_copys' ? cab + '\n\nCLIENTE:\n' + JSON.stringify(ctx).slice(0, 60_000) + '\n\nPIEZAS:\n' + texto
    : cab + '\n\nCLIENTE Y MES:\n' + JSON.stringify(ctx).slice(0, 60_000) + '\n\nPEDIDO:\n' + (texto || 'Proponé el contenido que falta del mes.');
  // Algunos modelos no aceptan forzar la herramienta (tool_choice "tool"): en ese caso se pide con "auto" y la instrucción de usarla.
  // Investigar usa además la búsqueda web de Anthropic (hay que tenerla habilitada en la consola de Anthropic).
  const web = modo === 'redes_investigar';
  let forzar = !web, msgs: any[] = [{ role: 'user', content: user }];
  const herramientas = web ? [{ type: 'web_search_20250305', name: 'web_search', max_uses: 8, user_location: { type: 'approximate', country: 'AR', region: 'Córdoba', city: 'Córdoba', timezone: 'America/Argentina/Cordoba' } }, tool] : [tool];
  const pedir = (max: number) => fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: modelo, max_tokens: max, system, tools: herramientas, tool_choice: forzar ? { type: 'tool', name: tool.name } : { type: 'auto' }, messages: msgs }) });
  let max = ({ redes_copys: 4000, redes_agenda: 6000, redes_contenido: 3000, redes_revision: 8000, redes_investigar: 8000 } as Record<string, number>)[modo] || 8000;
  let res = await pedir(max), out: any = await res.json().catch(() => ({}));
  if (!res.ok && /tool_choice/i.test(out?.error?.message || '')) { forzar = false; res = await pedir(max); out = await res.json().catch(() => ({})); }
  // Búsquedas largas: la API puede pausar el turno; se sigue desde donde quedó (hasta 3 veces).
  for (let i = 0; i < 3 && res.ok && out && out.stop_reason === 'pause_turn'; i++) { msgs = [{ role: 'user', content: user }, { role: 'assistant', content: out.content }]; res = await pedir(max); out = await res.json().catch(() => ({})); }
  if (res.ok && out && out.stop_reason === 'max_tokens' && !web) { max = 16000; res = await pedir(max); out = await res.json().catch(() => ({})); }
  const err = res.ok ? null : (out?.error?.message || 'La API respondió ' + res.status);
  if (web && err && /web_search|web search/i.test(err)) return json({ error: 'La búsqueda web no está habilitada en la cuenta de Anthropic: activala en la configuración de la organización en console.anthropic.com y probá de nuevo.' }, 502);
  try { await sb.from('ia_log').insert({ persona_id: yo.id, accion: modo, modelo, tokens_in: out?.usage?.input_tokens || 0, tokens_out: out?.usage?.output_tokens || 0, ok: !err, error: err }); } catch { /* el registro no frena */ }
  if (err) return json({ error: 'IA: ' + err }, 502);
  const tu = (out.content || []).find((c: any) => c.type === 'tool_use' && c.name === tool.name);
  let input: any = tu ? tu.input : null;
  if (!input) { // sin herramienta: se busca el JSON en el texto
    const txt = (out.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
    const m = txt.match(/\{[\s\S]*\}/); if (m) { try { input = JSON.parse(m[0]); } catch { input = null; } }
  }
  if (!input || typeof input !== 'object') return json({ error: 'La IA no devolvió algo utilizable. Probá de nuevo.' }, 502);
  return json(input);
});
