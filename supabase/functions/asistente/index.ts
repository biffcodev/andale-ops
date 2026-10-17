// Asistente de àndale: Google Drive (lee las facturas y ordena sus nombres) + IA (Claude) para tareas de administración.
// Solo administradores. El resumen mensual lo dispara pg_cron con un secreto propio (ver 0008_asistente_cron.sql).
// verify_jwt está apagado a propósito: la función valida al usuario (rpc yo → admin) o el secreto de pg_cron.
//
// Secretos (Supabase → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY        clave de la API de Anthropic (cuenta de àndale)
//   GOOGLE_SERVICE_ACCOUNT   JSON completo de la cuenta de servicio de Google (lee las facturas y ordena sus nombres)
//   IA_MODEL                 opcional, default claude-sonnet-5-5
//   RESEND_API_KEY / EMAIL_FROM   los mismos de `enviar-email`, para el resumen mensual
//
// Acciones (POST { accion, ... }):
//   estado · drive_sync · drive_descargar · drive_renombrar · leer_factura · conciliar · imputar · propuesta · cierre · cierre_email · cron_cierre
import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2.45.4';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
class Aviso extends Error { status: number; constructor(m: string, s = 400) { super(m); this.status = s; } }

const MODEL = () => Deno.env.get('IA_MODEL') || 'claude-sonnet-5-5';
// Tareas cortas con el modelo rápido; leer facturas, el banco y redactar propuestas siguen con el más preciso.
const RAPIDAS = ['cierre', 'imputar'];
const modeloDe = (accion: string) => RAPIDAS.includes(accion) ? (Deno.env.get('IA_MODEL_RAPIDO') || 'claude-haiku-5-5') : MODEL();
const APP_URL = 'https://andale-ops.vercel.app';
const hoyAR = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Argentina/Cordoba' });
const mesAR = () => hoyAR().slice(0, 7);
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const mesTxt = (m: string) => MESES[+m.slice(5, 7) - 1] + ' ' + m.slice(0, 4);
const num = (v: unknown) => (v === null || v === undefined || v === '' ? 0 : Number(v));
const chk = <T>(r: { data: T; error: any }): T => { if (r.error) throw new Error(r.error.message); return r.data; };

// Cuentas cargadas desde la app (Configuración → Integraciones, cifradas en Vault). Si no hay, se usan los secretos de Supabase.
const credCache: Record<string, { v: any; t: number }> = {};
async function cred(n: string) {
  const c = credCache[n]; if (c && Date.now() - c.t < 60_000) return c.v;
  let v: any = null;
  try { const svc = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } }); const { data } = await svc.rpc('cred_leer', { n }); if (data) v = JSON.parse(data); } catch { v = null; }
  credCache[n] = { v, t: Date.now() }; return v;
}

function encodeBase64(u: Uint8Array) { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); }

type Ctx = { sb: SupabaseClient; personaId: string | null };

/* ================= IA ================= */
async function claude(ctx: Ctx, accion: string, o: { system: string; content: unknown[]; tool: Record<string, unknown>; maxTokens?: number }) {
  const cfgIA = await cred('anthropic');
  const key = (cfgIA && cfgIA.key) || Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) throw new Aviso('La IA no está configurada. Conectala en Configuración → Integraciones → Mr. Piggy.', 503);
  const modelo = RAPIDAS.includes(accion) ? ((cfgIA && cfgIA.modelo_rapido) || modeloDe(accion)) : ((cfgIA && cfgIA.modelo) || modeloDe(accion));
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    // Sin tool_choice forzado: los modelos nuevos no lo aceptan. Se pide por instrucción y hay plan B con JSON en texto.
    body: JSON.stringify({
      model: modelo, max_tokens: o.maxTokens || 4096,
      system: o.system + '\n\nRespondé únicamente llamando una vez a la herramienta ' + o.tool.name + ', sin texto antes ni después.',
      messages: [{ role: 'user', content: o.content }],
      tools: [o.tool],
    }),
  });
  const out = await res.json().catch(() => ({}));
  const err = res.ok ? null : (out?.error?.message || 'La API respondió ' + res.status);
  await ctx.sb.from('ia_log').insert({ persona_id: ctx.personaId, accion, modelo, tokens_in: out?.usage?.input_tokens || 0, tokens_out: out?.usage?.output_tokens || 0, ok: !err, error: err });
  if (err) throw new Aviso('IA: ' + err, 502);
  const tu = (out.content || []).find((c: any) => c.type === 'tool_use' && c.name === o.tool.name);
  let input: any = tu ? tu.input : null;
  if (!input) { // plan B: JSON escrito como texto
    const txt = (out.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
    const m = txt.match(/\{[\s\S]*\}/);
    if (m) { try { input = JSON.parse(m[0]); } catch { input = null; } }
  }
  if (!input || typeof input !== 'object') throw new Aviso('La IA no devolvió un resultado utilizable. Probá de nuevo.', 502);
  if (out.stop_reason === 'max_tokens') input._cortado = true;
  return input;
}
const pdfBlock = (b64: string) => ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } });
const imgBlock = (b64: string, mime: string) => ({ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } });
const fileBlock = (b64: string, mime: string) => (mime.startsWith('image/') ? imgBlock(b64, mime) : pdfBlock(b64));

/* ================= Google Drive ================= */
const b64url = (s: string | Uint8Array) => (typeof s === 'string' ? btoa(unescape(encodeURIComponent(s))) : encodeBase64(s)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
async function cuentaServicio() {
  const c = await cred('google'); if (c && c.service_account) { try { return JSON.parse(c.service_account); } catch { /* sigue con el secreto */ } }
  const raw = Deno.env.get('GOOGLE_SERVICE_ACCOUNT'); if (!raw) return null;
  try { const t = raw.trim(); return JSON.parse(t.startsWith('{') ? t : atob(t)); } catch { throw new Aviso('GOOGLE_SERVICE_ACCOUNT no es un JSON válido. Pegá el archivo .json completo.', 500); }
}
let tokenCache: { t: string; exp: number; cuenta: string } | null = null;
async function googleToken() {
  const sa = await cuentaServicio(); if (!sa) throw new Aviso('Drive no está configurado. Conectalo en Configuración → Integraciones → Google Drive.', 503);
  if (tokenCache && tokenCache.exp > Date.now() + 60_000 && tokenCache.cuenta === sa.client_email) return tokenCache.t;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' })) + '.' + b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/drive', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const der = Uint8Array.from(atob(String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)));
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + unsigned + '.' + b64url(sig) });
  const out = await res.json().catch(() => ({}));
  if (!res.ok || !out.access_token) throw new Aviso('Google rechazó la cuenta de servicio: ' + (out.error_description || out.error || res.status), 502);
  tokenCache = { t: out.access_token, exp: Date.now() + (out.expires_in || 3600) * 1000, cuenta: sa.client_email };
  return tokenCache.t;
}
async function gdrive(path: string) {
  const res = await fetch('https://www.googleapis.com/drive/v3/' + path, { headers: { Authorization: 'Bearer ' + await googleToken() } });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const m = e?.error?.message || String(res.status);
    if (res.status === 404) throw new Aviso(path.startsWith('files/') && !path.startsWith('files?') ? 'Drive: el archivo ya no está (se borró o se movió fuera de la carpeta). Si se borró, se recupera desde la papelera de Drive.' : 'Drive: no se encontró la carpeta. ¿La compartiste con la cuenta de servicio?', 404);
    throw new Aviso('Drive: ' + m, 502);
  }
  return res;
}
// Renombrar un archivo (pide permiso de Editor sobre la carpeta; con Lector, Drive lo rechaza).
async function renombrar(fileId: string, nombre: string) {
  const res = await fetch('https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?supportsAllDrives=true&fields=id,name', { method: 'PATCH', headers: { Authorization: 'Bearer ' + await googleToken(), 'Content-Type': 'application/json' }, body: JSON.stringify({ name: nombre }) });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    if (res.status === 404) throw new Aviso('Drive: el archivo ya no está (se borró o se movió fuera de la carpeta). Si se borró, se recupera desde la papelera de Drive.', 404);
    if (res.status === 403) throw new Aviso('Para ordenar los nombres en Drive, compartí la carpeta con la cuenta de servicio como Editor (ahora es Lector).', 403);
    throw new Aviso('Drive: ' + (e?.error?.message || res.status), 502);
  }
  return await res.json();
}
const FOLDER = 'application/vnd.google-apps.folder';
const LEIBLES = (f: any) => f.mimeType === 'application/pdf' || /\.pdf$/i.test(f.name) || /^image\/(png|jpe?g|webp)$/.test(f.mimeType);
async function listarCarpeta(root: string) {
  const files: any[] = []; const queue = [{ id: root, path: '', depth: 0 }]; let carpetas = 0;
  while (queue.length && files.length < 3000) {
    const f = queue.shift()!; let pageToken = '';
    do {
      const q = encodeURIComponent(`'${f.id}' in parents and trashed = false`);
      const r = await (await gdrive(`files?q=${q}&pageSize=1000&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=nextPageToken,files(id,name,mimeType,size,modifiedTime,webViewLink)` + (pageToken ? '&pageToken=' + pageToken : ''))).json();
      for (const x of r.files || []) {
        if (x.mimeType === FOLDER) { carpetas++; if (f.depth < 5) queue.push({ id: x.id, path: f.path ? f.path + ' / ' + x.name : x.name, depth: f.depth + 1 }); }
        else if (LEIBLES(x)) files.push({ ...x, path: f.path });
      }
      pageToken = r.nextPageToken || '';
    } while (pageToken);
  }
  return { files, carpetas };
}
async function descargar(fileId: string) {
  const res = await gdrive(`files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`);
  const buf = new Uint8Array(await res.arrayBuffer());
  if (buf.length > 9_000_000) throw new Aviso('El archivo pesa más de 9 MB.');
  return { base64: encodeBase64(buf), mime: res.headers.get('content-type') || 'application/pdf', bytes: buf.length };
}

// Nombre de descarga de ARCA: CUITEMISOR_TIPO_PTOVTA_NUMERO.pdf  (011 = Factura C)
const TIPOS_ARCA: Record<string, string> = { '001': 'Factura A', '002': 'Nota de débito A', '003': 'Nota de crédito A', '006': 'Factura B', '007': 'Nota de débito B', '008': 'Nota de crédito B', '011': 'Factura C', '012': 'Nota de débito C', '013': 'Nota de crédito C', '019': 'Factura E', '051': 'Factura M' };
function parseNombre(nombre: string) {
  const m = nombre.match(/(\d{11})_(\d{3})_(\d{4,5})_(\d{8})/);
  if (!m) return {};
  return { emisor_cuit: m[1], tipo: TIPOS_ARCA[m[2]] || 'Comprobante ' + m[2], punto_venta: m[3].padStart(5, '0'), numero: m[4], numero_completo: m[3].padStart(5, '0') + '-' + m[4], fuente: 'nombre' };
}

async function ajuste(sb: SupabaseClient, clave: string) { const { data } = await sb.from('ajustes').select('valor').eq('clave', clave).maybeSingle(); return (data && data.valor) || {}; }

const NO_ESTA = 'No está más en la carpeta de Drive.';
async function driveSync(ctx: Ctx) {
  const cfg = await ajuste(ctx.sb, 'drive');
  if (!cfg.carpeta) throw new Aviso('Falta indicar la carpeta de facturas de Drive (Configuración → Ajustes).');
  const { files, carpetas } = await listarCarpeta(cfg.carpeta);
  const ya = new Set<string>(), previos: any[] = []; let from = 0;
  for (; ;) { const rows = chk(await ctx.sb.from('drive_archivos').select('id,file_id,error,estado').range(from, from + 999)) as any[]; rows.forEach(r => { ya.add(r.file_id); previos.push(r); }); if (rows.length < 1000) break; from += 1000; }
  // Los que ya no están en la carpeta (borrados o movidos): se marcan; si vuelven, se desmarcan. La factura de la app no se toca.
  // Si la lista quedó cortada por el tope (3000), no se marca nada como faltante.
  const enDrive = new Set(files.map(f => f.id)), completa = files.length < 3000;
  const faltan = completa ? previos.filter(r => !enDrive.has(r.file_id) && r.estado !== 'Ignorado') : [], volvieron = previos.filter(r => enDrive.has(r.file_id) && String(r.error || '').startsWith(NO_ESTA));
  for (const r of faltan) if (!String(r.error || '').startsWith(NO_ESTA)) await ctx.sb.from('drive_archivos').update({ error: NO_ESTA + ' Si se borró, se recupera desde la papelera de Drive (30 días).' }).eq('id', r.id);
  for (const r of volvieron) await ctx.sb.from('drive_archivos').update({ error: null }).eq('id', r.id);
  const nuevos = files.filter(f => !ya.has(f.id)).map(f => ({ file_id: f.id, nombre: f.name, mime: f.mimeType, carpeta: f.path, link: f.webViewLink || 'https://drive.google.com/file/d/' + f.id + '/view', tamano: f.size ? Number(f.size) : null, modificado: f.modifiedTime || null, datos: parseNombre(f.name) }));
  for (let i = 0; i < nuevos.length; i += 300) chk(await ctx.sb.from('drive_archivos').insert(nuevos.slice(i, i + 300)));
  await ctx.sb.from('ajustes').update({ valor: { ...cfg, ultima_sync: new Date().toISOString(), archivos: files.length } }).eq('clave', 'drive');
  return { nuevos: nuevos.length, total: files.length, carpetas, faltan: faltan.length };
}

/* ================= Leer comprobantes ================= */
const SYS_FACTURA = 'Extraés datos de comprobantes: facturas electrónicas argentinas de ARCA (ex AFIP), notas de crédito, recibos e invoices del exterior. ' +
  'Usá solo lo que está escrito en el documento. Fechas en formato AAAA-MM-DD. Montos como número con punto decimal y sin separador de miles. ' +
  'El emisor es quien emite (arriba, con su CUIT y punto de venta); el receptor es el cliente. Si un dato no aparece, devolvé null. Respondé solo con la herramienta.';
const TOOL_FACTURA = {
  name: 'registrar_comprobante',
  description: 'Registra los datos leídos del comprobante.',
  input_schema: {
    type: 'object',
    properties: {
      es_comprobante: { type: 'boolean', description: 'false si el archivo no es una factura, nota, recibo ni invoice' },
      tipo: { type: 'string', enum: ['Factura A', 'Factura B', 'Factura C', 'Factura E', 'Nota de crédito', 'Nota de débito', 'Recibo', 'Invoice', 'Otro'] },
      punto_venta: { type: ['string', 'null'] },
      numero: { type: ['string', 'null'], description: 'número del comprobante sin punto de venta' },
      fecha: { type: ['string', 'null'], description: 'fecha de emisión' },
      vencimiento: { type: ['string', 'null'], description: 'vencimiento para el pago' },
      emisor_nombre: { type: ['string', 'null'] }, emisor_cuit: { type: ['string', 'null'], description: '11 dígitos, sin guiones' },
      receptor_nombre: { type: ['string', 'null'] }, receptor_cuit: { type: ['string', 'null'], description: '11 dígitos, sin guiones' },
      receptor_condicion_iva: { type: ['string', 'null'] },
      concepto: { type: ['string', 'null'], description: 'descripción breve de lo facturado' },
      periodo_desde: { type: ['string', 'null'] }, periodo_hasta: { type: ['string', 'null'] },
      moneda: { type: 'string', enum: ['ARS', 'USD', 'EUR', 'GBP'] },
      total: { type: ['number', 'null'] },
      cae: { type: ['string', 'null'] },
      confianza: { type: 'string', enum: ['alta', 'media', 'baja'] },
      observaciones: { type: ['string', 'null'] },
    },
    required: ['es_comprobante', 'tipo', 'moneda', 'total', 'fecha', 'confianza'],
  },
};
const soloDigitos = (s: unknown) => String(s || '').replace(/\D/g, '');
function normalizarFactura(d: any) {
  const out = { ...d };
  out.emisor_cuit = soloDigitos(d.emisor_cuit) || null; out.receptor_cuit = soloDigitos(d.receptor_cuit) || null;
  if (d.punto_venta && d.numero) out.numero_completo = soloDigitos(d.punto_venta).padStart(5, '0') + '-' + soloDigitos(d.numero).padStart(8, '0');
  else if (d.numero) out.numero_completo = String(d.numero);
  return out;
}
async function leerFactura(ctx: Ctx, b: any) {
  if (b.pdf && b.pdf.base64) { // archivo subido desde la app (no se guarda)
    const d = await claude(ctx, 'leer_factura', { system: SYS_FACTURA, tool: TOOL_FACTURA, content: [fileBlock(b.pdf.base64, b.pdf.mime || 'application/pdf'), { type: 'text', text: 'Archivo: ' + (b.pdf.nombre || 'comprobante.pdf') }] });
    return { datos: normalizarFactura(d) };
  }
  const ids: string[] = (Array.isArray(b.archivo_ids) ? b.archivo_ids : []).slice(0, 4);
  if (!ids.length) throw new Aviso('No hay archivos para leer.');
  const rows = chk(await ctx.sb.from('drive_archivos').select('*').in('id', ids)) as any[];
  const res: any[] = [];
  for (const r of rows) {
    try {
      const f = await descargar(r.file_id);
      const d = await claude(ctx, 'leer_factura', { system: SYS_FACTURA, tool: TOOL_FACTURA, content: [fileBlock(f.base64, f.mime.startsWith('image/') ? f.mime : 'application/pdf'), { type: 'text', text: 'Archivo: ' + r.nombre + (r.carpeta ? ' · carpeta: ' + r.carpeta : '') }] });
      const datos = { ...(r.datos || {}), ...normalizarFactura(d), fuente: 'ia', leido_el: new Date().toISOString() };
      chk(await ctx.sb.from('drive_archivos').update({ datos, estado: d.es_comprobante === false ? 'Ignorado' : (r.factura_id ? 'Vinculado' : 'Leído'), error: null }).eq('id', r.id));
      res.push({ id: r.id, ok: true, datos });
    } catch (e) {
      const m = (e as Error).message;
      await ctx.sb.from('drive_archivos').update({ estado: 'Error', error: m }).eq('id', r.id);
      res.push({ id: r.id, ok: false, error: m });
      if (e instanceof Aviso && e.status === 503) throw e; // falta configuración: cortar
    }
  }
  return { resultados: res };
}

/* ================= Conciliar extracto bancario ================= */
async function todos(sb: SupabaseClient, table: string, cols = '*', build?: (q: any) => any) {
  const out: any[] = [];
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(cols); if (build) q = build(q);
    const rows = chk(await q.range(from, from + 999)) as any[]; out.push(...rows); if (rows.length < 1000) break;
  }
  return out;
}
async function conciliar(ctx: Ctx, b: any) {
  const { sb } = ctx;
  if (!b.caja_id) throw new Aviso('Elegí la caja o cuenta del extracto.');
  const caja = chk(await sb.from('cajas').select('*').eq('id', b.caja_id).single()) as any;
  const [plan, movs, clientes, cadm, facs, colabs] = await Promise.all([
    todos(sb, 'plan_cuentas', 'cuenta,subcuenta'),
    todos(sb, 'movimientos', 'fecha,cuenta,subcuenta,contraparte,detalle,ingreso,egreso,moneda,caja_id', q => q.order('fecha', { ascending: false })),
    todos(sb, 'clientes', 'id,nombre,estado'),
    todos(sb, 'clientes_admin', 'cliente_id,razon_social,cuit'),
    todos(sb, 'facturas_saldo', 'id,cliente_id,tipo,numero,periodo,monto,saldo,moneda', q => q.gt('saldo', 0.009)),
    todos(sb, 'colaboradores', 'nombre,tipo,rubro,cuit,otros_nombres,activo'),
  ]);
  const cn = new Map(clientes.map((c: any) => [c.id, c.nombre]));
  // Patrones: cómo se cargó cada contraparte antes
  const pat = new Map<string, { n: number; cuenta: string; subcuenta: string; detalle: string }>();
  for (const m of movs) { const k = (m.contraparte || '').trim(); if (!k) continue; const p = pat.get(k); if (p) p.n++; else pat.set(k, { n: 1, cuenta: m.cuenta, subcuenta: m.subcuenta, detalle: m.detalle }); }
  const patrones = [...pat.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 90).map(([k, p]) => `${k} → ${p.cuenta} / ${p.subcuenta} (ej.: ${String(p.detalle || '').slice(0, 60)})`);
  const recientes = movs.filter((m: any) => m.caja_id === caja.id).slice(0, 80).map((m: any) => `${m.fecha} ${m.ingreso ? '+' + m.ingreso : '-' + m.egreso} ${m.contraparte} · ${m.detalle}`.slice(0, 140));
  const contexto = [
    `Caja: ${caja.nombre} (${caja.moneda}). Hoy: ${hoyAR()}.`,
    'PLAN DE CUENTAS (usá exactamente estas cuenta / subcuenta):\n' + plan.map((p: any) => `${p.cuenta} / ${p.subcuenta}`).join('\n'),
    'CÓMO SE CARGARON ANTES LAS CONTRAPARTES MÁS FRECUENTES:\n' + patrones.join('\n'),
    'CLIENTES ACTIVOS (nombre · razón social · CUIT):\n' + clientes.filter((c: any) => c.estado !== 'Inactivo').map((c: any) => { const a: any = cadm.find((x: any) => x.cliente_id === c.id) || {}; return [c.nombre, a.razon_social, a.cuit].filter(Boolean).join(' · '); }).join('\n'),
    'FACTURAS CON SALDO PENDIENTE (id · cliente · comprobante · saldo):\n' + (facs.map((f: any) => `${f.id} · ${cn.get(f.cliente_id)} · ${f.tipo} ${f.numero || 's/n'} · ${f.moneda} ${f.saldo}${f.periodo ? ' · ' + String(f.periodo).slice(0, 7) : ''}`).join('\n') || '(ninguna)'),
    'EQUIPO Y PROVEEDORES (nombre · tipo · rubro · CUIT · otros nombres):\n' + colabs.filter((c: any) => c.activo).map((c: any) => [c.nombre, c.tipo, c.rubro, c.cuit, (c.otros_nombres || []).join('/')].filter(Boolean).join(' · ')).join('\n'),
    'ÚLTIMOS MOVIMIENTOS YA CARGADOS EN ESTA CAJA (para marcar duplicados):\n' + (recientes.join('\n') || '(ninguno)'),
  ].join('\n\n');
  const sys = 'Sos el asistente contable de àndale, una agencia de branding y redes de Córdoba, Argentina. Convertís un extracto bancario en movimientos de caja. ' +
    'Reglas: un movimiento por línea del extracto; monto siempre positivo con su sentido (ingreso o egreso); usá solo cuentas/subcuentas del plan; ' +
    'los cobros de clientes van en Ventas en Pesos / Ventas en USD con la subcuenta del servicio (S.Redes sociales por defecto); si un ingreso coincide con el saldo de una factura pendiente del mismo cliente, poné su factura_id; ' +
    'sueldos a Costo Laboral, pagos a proveedores a Proveedores con su subcuenta; impuestos, comisiones e IVA bancario agrupalos por día si son muchos y van a Gs Bancarios o Gastos Varios; ' +
    'transferencias entre cuentas propias y compra/venta de divisas a sus cuentas de divisas; si una línea ya figura en los últimos movimientos cargados (misma fecha cercana y mismo monto), marcala duplicado. ' +
    'contraparte: el nombre como se usa en la caja (cliente o proveedor), no la razón social del banco. detalle: corto, en el estilo de la caja. Si no estás seguro, confianza baja y explicalo en nota.';
  const content: any[] = [];
  if (b.archivo && b.archivo.base64) content.push(fileBlock(b.archivo.base64, b.archivo.mime || 'application/pdf'));
  else if (b.texto) content.push({ type: 'text', text: 'EXTRACTO (' + (b.nombre || 'archivo') + '):\n' + String(b.texto).slice(0, 180_000) });
  else throw new Aviso('Subí el extracto (PDF, CSV o Excel).');
  content.push({ type: 'text', text: contexto });
  const tool = {
    name: 'proponer_movimientos', description: 'Movimientos de caja propuestos a partir del extracto.',
    input_schema: {
      type: 'object', required: ['movimientos'],
      properties: {
        periodo: { type: ['string', 'null'], description: 'período que cubre el extracto' },
        saldo_final: { type: ['number', 'null'] },
        movimientos: {
          type: 'array', items: {
            type: 'object', required: ['fecha', 'monto', 'sentido', 'cuenta', 'subcuenta', 'contraparte', 'detalle', 'confianza'],
            properties: {
              fecha: { type: 'string' }, descripcion_banco: { type: 'string' }, monto: { type: 'number' }, sentido: { type: 'string', enum: ['ingreso', 'egreso'] },
              cuenta: { type: 'string' }, subcuenta: { type: 'string' }, contraparte: { type: 'string' }, detalle: { type: 'string' },
              cliente: { type: ['string', 'null'] }, factura_id: { type: ['string', 'null'] }, colaborador: { type: ['string', 'null'] },
              duplicado: { type: 'boolean' }, confianza: { type: 'string', enum: ['alta', 'media', 'baja'] }, nota: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
  };
  const r = await claude(ctx, 'conciliar', { system: sys, content, tool, maxTokens: 20000 });
  const facIds = new Set(facs.map((f: any) => f.id));
  (r.movimientos || []).forEach((m: any) => { if (m.factura_id && !facIds.has(m.factura_id)) m.factura_id = null; m.monto = Math.abs(num(m.monto)); });
  return { ...r, caja: { id: caja.id, nombre: caja.nombre, moneda: caja.moneda } };
}

/* ================= Repartir pagos a proveedores ================= */
async function imputar(ctx: Ctx, b: any) {
  const { sb } = ctx;
  const ids: string[] = (Array.isArray(b.movimiento_ids) ? b.movimiento_ids : []).slice(0, 20);
  const bor = b.borrador && num(b.borrador.egreso) > 0 ? { id: 'borrador', fecha: String(b.borrador.fecha || hoyAR()), cuenta: String(b.borrador.cuenta || ''), subcuenta: String(b.borrador.subcuenta || ''), contraparte: String(b.borrador.contraparte || ''), detalle: String(b.borrador.detalle || ''), egreso: num(b.borrador.egreso), moneda: String(b.borrador.moneda || 'ARS') } : null;
  if (!ids.length && !bor) throw new Aviso('No hay pagos para repartir.');
  const movs = bor ? [bor] : chk(await sb.from('movimientos').select('id,fecha,cuenta,subcuenta,contraparte,detalle,egreso,moneda').in('id', ids)) as any[];
  const contrapartes = [...new Set(movs.map(m => m.contraparte).filter(Boolean))];
  const [clientes, abonos, proys, imps, hist] = await Promise.all([
    todos(sb, 'clientes', 'id,nombre'), todos(sb, 'abonos', 'id,cliente_id,tipo,plan,estado,desde,hasta'), todos(sb, 'proyectos', 'id,cliente_id,nombre,tipo,estado'),
    todos(sb, 'imputaciones', 'movimiento_id,abono_id,proyecto_id,monto'),
    contrapartes.length ? todos(sb, 'movimientos', 'id,fecha,contraparte,detalle,egreso', q => q.in('contraparte', contrapartes).order('fecha', { ascending: false })) : Promise.resolve([]),
  ]);
  const cn = new Map(clientes.map((c: any) => [c.id, c.nombre]));
  const dest = new Map<string, string>();
  abonos.filter((a: any) => a.estado !== 'Baja' || a.hasta).forEach((a: any) => dest.set('a:' + a.id, `${cn.get(a.cliente_id)} · abono ${a.tipo}${a.plan ? ' ' + a.plan : ''}${a.estado !== 'Activo' ? ' (' + a.estado + ')' : ''}`));
  proys.filter((p: any) => p.estado !== 'Cancelado').forEach((p: any) => dest.set('p:' + p.id, `${cn.get(p.cliente_id)} · proyecto ${p.nombre}${p.tipo ? ' (' + p.tipo + ')' : ''} · ${p.estado}`));
  const ejemplos = hist.filter((h: any) => !ids.includes(h.id) && imps.some((i: any) => i.movimiento_id === h.id)).slice(0, 12).map((h: any) => {
    const ps = imps.filter((i: any) => i.movimiento_id === h.id).map((i: any) => (dest.get(i.abono_id ? 'a:' + i.abono_id : 'p:' + i.proyecto_id) || '?') + ' = ' + i.monto);
    return `${h.fecha} ${h.contraparte} "${h.detalle}" ${h.egreso} → ${ps.join('; ')}`;
  });
  const sys = 'Sos el asistente de administración de àndale (agencia de branding y redes). Repartís pagos a proveedores entre los abonos y proyectos de los clientes para calcular el margen. ' +
    'El detalle suele nombrar a los clientes abreviados (ej.: "ADS SEP: P4 / Cultu / Pasta Fusion / CSZ"); identificá cada uno en la lista de destinos (abreviaturas, iniciales, nombres parciales). ' +
    'Un pago de Ads va a los abonos de Ads; uno de web, fotos o diseño, al proyecto o abono que corresponda. Si hay repartos anteriores del mismo proveedor con los mismos clientes, respetá sus proporciones; si no, repartí en partes iguales. ' +
    'La suma de las partes debe ser igual al monto del pago (redondeá a 2 decimales y ajustá la última parte). Si no podés identificar a nadie, devolvé partes vacías y explicalo en nota. Usá solo ids de la lista.';
  const content = [{ type: 'text', text:
    'PAGOS A REPARTIR:\n' + movs.map(m => `${m.id} · ${m.fecha} · ${m.contraparte} · ${m.subcuenta} · "${m.detalle}" · ${m.moneda} ${m.egreso}`).join('\n') +
    '\n\nDESTINOS POSIBLES (id · descripción):\n' + [...dest.entries()].map(([k, v]) => k + ' · ' + v).join('\n') +
    '\n\nREPARTOS ANTERIORES DE ESTOS PROVEEDORES:\n' + (ejemplos.join('\n') || '(ninguno)') }];
  const tool = {
    name: 'proponer_repartos', description: 'Reparto propuesto de cada pago.',
    input_schema: { type: 'object', required: ['repartos'], properties: { repartos: { type: 'array', items: { type: 'object', required: ['movimiento_id', 'partes', 'confianza'], properties: {
      movimiento_id: { type: 'string' }, confianza: { type: 'string', enum: ['alta', 'media', 'baja'] }, nota: { type: ['string', 'null'] },
      partes: { type: 'array', items: { type: 'object', required: ['destino', 'monto'], properties: { destino: { type: 'string', description: 'id del destino, ej. a:… o p:…' }, monto: { type: 'number' } } } },
    } } } } },
  };
  const r = await claude(ctx, 'imputar', { system: sys, content, tool, maxTokens: 6000 });
  (r.repartos || []).forEach((x: any) => { x.partes = (x.partes || []).filter((p: any) => dest.has(p.destino) && num(p.monto) > 0).map((p: any) => ({ destino: p.destino, monto: Math.round(num(p.monto) * 100) / 100, descripcion: dest.get(p.destino) })); });
  return r;
}

/* ================= Asistente del cierre ================= */
async function checklistServidor(sb: SupabaseClient, m: string) {
  const ini = m + '-01', hoy = hoyAR();
  const [clientes, abonos, precios, pf, res, facs, liq, drive, provs, imps, gest] = await Promise.all([
    todos(sb, 'clientes', 'id,nombre'), todos(sb, 'abonos', 'id,cliente_id,tipo,estado,desde,hasta'), todos(sb, 'precios_abono', 'abono_id,desde,monto,moneda,aviso_enviado'),
    todos(sb, 'proyecto_facturacion', 'proyecto_id,periodo'), todos(sb, 'resumenes', 'cliente_id,periodo,estado'), todos(sb, 'facturas_saldo', 'cliente_id,numero,tipo,saldo,moneda,vencimiento,periodo'),
    todos(sb, 'liquidaciones', 'colaborador_id,monto,moneda,movimiento_id', q => q.eq('periodo', ini)), todos(sb, 'drive_archivos', 'estado'),
    todos(sb, 'movimientos', 'id,egreso,moneda', q => q.eq('cuenta', 'Proveedores').gte('fecha', m.slice(0, 4) + '-01-01')), todos(sb, 'imputaciones', 'movimiento_id,monto'),
    todos(sb, 'gestiones', 'cliente_id,tipo,fecha', q => q.eq('tipo', 'Recordatorio de pago')),
  ]);
  const cn = new Map(clientes.map((c: any) => [c.id, c.nombre]));
  const mm = (d: any) => (d ? String(d).slice(0, 7) : '');
  const enMes = (a: any) => (!a.desde || mm(a.desde) <= m) && (!a.hasta || mm(a.hasta) >= m) && (a.estado === 'Activo' || (a.estado === 'Baja' && a.hasta));
  const precio = (id: string) => precios.filter((p: any) => p.abono_id === id && mm(p.desde) <= m).sort((a: any, b: any) => String(b.desde).localeCompare(a.desde))[0];
  const activos = abonos.filter(enMes);
  const sinPrecio = activos.filter((a: any) => !precio(a.id)).map((a: any) => cn.get(a.cliente_id) + ' (' + a.tipo + ')');
  const delMes = new Set<string>(activos.map((a: any) => a.cliente_id));
  const proyCli = new Map((await todos(sb, 'proyectos', 'id,cliente_id')).map((p: any) => [p.id, p.cliente_id]));
  pf.filter((c: any) => mm(c.periodo) === m).forEach((c: any) => { const cid = proyCli.get(c.proyecto_id); if (cid) delMes.add(cid as string); });
  const resM = res.filter((r: any) => mm(r.periodo) === m);
  const sinResumen = [...delMes].filter(id => !resM.some((r: any) => r.cliente_id === id)).map(id => cn.get(id));
  const borradores = resM.filter((r: any) => r.estado !== 'Enviado').map((r: any) => cn.get(r.cliente_id));
  const enviadosSinComp = resM.filter((r: any) => r.estado === 'Enviado' && !facs.some((f: any) => f.cliente_id === r.cliente_id && mm(f.periodo) === m)).map((r: any) => cn.get(r.cliente_id));
  const hace7 = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
  const vencidas = facs.filter((f: any) => num(f.saldo) > 0.009 && f.vencimiento && f.vencimiento < hoy).map((f: any) => ({ cliente: cn.get(f.cliente_id), comprobante: f.tipo + ' ' + (f.numero || 's/n'), saldo: num(f.saldo), moneda: f.moneda, vencio: f.vencimiento, recordado: gest.some((g: any) => g.cliente_id === f.cliente_id && g.fecha >= hace7) }));
  const aumentos = precios.filter((p: any) => mm(p.desde) > m && !p.aviso_enviado).length;
  const liqPend = liq.filter((l: any) => !l.movimiento_id);
  const impPor = new Map<string, number>(); imps.forEach((i: any) => impPor.set(i.movimiento_id, (impPor.get(i.movimiento_id) || 0) + num(i.monto)));
  const sinImputar = provs.filter((v: any) => num(v.egreso) - (impPor.get(v.id) || 0) > 0.009).length;
  return {
    periodo: m, hoy, clientes_del_mes: delMes.size,
    abonos_sin_precio: sinPrecio, resumenes_sin_armar: sinResumen, resumenes_sin_enviar: borradores, sin_comprobante: enviadosSinComp,
    facturas_vencidas: vencidas, aumentos_sin_avisar: aumentos,
    liquidacion: { items_pendientes: liqPend.length, total_pendiente: liqPend.reduce((a: number, l: any) => a + num(l.monto), 0), generada: liq.length > 0 },
    drive_sin_vincular: drive.filter((d: any) => d.estado === 'Nuevo' || d.estado === 'Leído').length,
    pagos_sin_imputar: sinImputar,
  };
}
const TOOL_BRIEF = {
  name: 'briefing', description: 'Resumen del estado del cierre para los socios.',
  input_schema: { type: 'object', required: ['titular', 'puntos'], properties: {
    titular: { type: 'string', description: 'una oración: cómo viene el mes' },
    puntos: { type: 'array', items: { type: 'object', required: ['texto', 'prioridad'], properties: { texto: { type: 'string' }, prioridad: { type: 'string', enum: ['alta', 'media', 'baja'] } } } },
  } },
};
const SYS_BRIEF = 'Sos el asistente de administración de àndale, agencia de branding y redes de Córdoba. Escribís para Fer y Jime, las socias, en español rioplatense, tuteo, directo y sin relleno. Los montos van siempre completos, con punto de miles ($ 730.000), nunca abreviados con K, k, mil ni M. ' +
  'A partir del checklist del cierre de mes, armá un titular y entre 3 y 7 puntos accionables ordenados por prioridad (primero lo que cuesta plata o vence). Nombrá clientes concretos y montos cuando los haya. No inventes datos.';
async function briefing(ctx: Ctx, checklist: unknown) {
  return claude(ctx, 'cierre', { system: SYS_BRIEF, tool: TOOL_BRIEF, maxTokens: 1500, content: [{ type: 'text', text: 'CHECKLIST (JSON):\n' + JSON.stringify(checklist).slice(0, 60_000) }] });
}
function puntosBasicos(c: any) {
  const p: any[] = [];
  if (c.abonos_sin_precio.length) p.push({ prioridad: 'alta', texto: c.abonos_sin_precio.length + ' abonos sin precio: ' + c.abonos_sin_precio.slice(0, 6).join(', ') });
  if (c.resumenes_sin_armar.length) p.push({ prioridad: 'alta', texto: c.resumenes_sin_armar.length + ' resúmenes sin armar.' });
  if (c.resumenes_sin_enviar.length) p.push({ prioridad: 'alta', texto: c.resumenes_sin_enviar.length + ' resúmenes en borrador sin enviar.' });
  if (c.facturas_vencidas.length) p.push({ prioridad: 'alta', texto: c.facturas_vencidas.length + ' comprobantes vencidos con saldo: ' + c.facturas_vencidas.slice(0, 5).map((f: any) => f.cliente).join(', ') });
  if (c.sin_comprobante.length) p.push({ prioridad: 'media', texto: c.sin_comprobante.length + ' clientes con resumen enviado y sin comprobante.' });
  if (c.liquidacion.items_pendientes) p.push({ prioridad: 'media', texto: c.liquidacion.items_pendientes + ' pagos de sueldos u honorarios pendientes.' });
  if (c.aumentos_sin_avisar) p.push({ prioridad: 'media', texto: c.aumentos_sin_avisar + ' aumentos cargados sin avisar.' });
  if (c.drive_sin_vincular) p.push({ prioridad: 'baja', texto: c.drive_sin_vincular + ' archivos de Drive sin vincular a un comprobante.' });
  if (c.pagos_sin_imputar) p.push({ prioridad: 'baja', texto: c.pagos_sin_imputar + ' pagos a proveedores sin imputar.' });
  return p;
}
const escH = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]!));
function emailCierre(m: string, b: { titular: string; puntos: any[] }) {
  const color: Record<string, string> = { alta: '#FC4855', media: '#E8A33D', baja: '#9A9A9A' };
  const li = b.puntos.map(p => `<tr><td style="padding:10px 0;border-top:1px solid #EEE;vertical-align:top;width:14px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color[p.prioridad] || '#999'};margin-top:7px"></span></td><td style="padding:10px 0 10px 10px;border-top:1px solid #EEE;font:15px/1.5 Inter,Arial,sans-serif;color:#1A1A1A">${escH(p.texto)}</td></tr>`).join('');
  const html = `<!doctype html><html><body style="margin:0;background:#FFFFFF"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 24px"><table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td><img src="${APP_URL}/marca/email-logo.png" alt="àndale" width="96" style="display:block;border:0"></td></tr>
<tr><td style="padding-top:28px;font:600 12px/1 Inter,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#FC4855">Asistente · cierre de ${escH(mesTxt(m))}</td></tr>
<tr><td style="padding-top:10px;font:700 26px/1.2 Arial,sans-serif;color:#1A1A1A">${escH(b.titular)}</td></tr>
<tr><td style="padding-top:18px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${li}</table></td></tr>
<tr><td style="padding-top:24px"><a href="${APP_URL}/#asistente" style="display:inline-block;background:#1A1A1A;color:#FFFFFF;text-decoration:none;font:600 14px/1 Inter,Arial,sans-serif;padding:14px 20px;border-radius:999px">Abrir el asistente</a></td></tr>
<tr><td style="padding-top:28px;font:12px/1.5 Inter,Arial,sans-serif;color:#9A9A9A">Lo manda la app de operaciones de àndale. Se desactiva en Configuración → Ajustes.</td></tr>
</table></td></tr></table></body></html>`;
  const texto = 'Asistente · cierre de ' + mesTxt(m) + '\n\n' + b.titular + '\n\n' + b.puntos.map(p => '• ' + p.texto).join('\n') + '\n\n' + APP_URL + '/#asistente';
  return { html, texto };
}
async function enviarCierre(ctx: Ctx, m: string, soloA?: string[]) {
  const c = await checklistServidor(ctx.sb, m);
  let b: any;
  try { b = await briefing(ctx, c); } catch (e) { if (!(e instanceof Aviso)) throw e; b = { titular: 'Así viene el cierre de ' + mesTxt(m), puntos: puntosBasicos(c) }; }
  if (!b.puntos || !b.puntos.length) b.puntos = [{ prioridad: 'baja', texto: 'No hay pendientes: el mes está al día.' }];
  const admins = chk(await ctx.sb.from('personas').select('email').eq('rol', 'admin').eq('activo', true).not('email', 'is', null)) as any[];
  const mails = admins.map(a => String(a.email).toLowerCase()).filter(Boolean);
  const para = soloA && soloA.length ? soloA.map(x => String(x).toLowerCase()).filter(x => mails.includes(x)) : mails;
  if (!para.length) throw new Aviso('No hay administradores con email cargado.');
  const cfgMail = await cred('email');
  const key = (cfgMail && cfgMail.key) || Deno.env.get('RESEND_API_KEY'); if (!key) throw new Aviso('El email no está conectado (Configuración → Integraciones → Email).', 503);
  const { html, texto } = emailCierre(m, b);
  const asunto = 'Cierre de ' + mesTxt(m) + ' · ' + b.titular.slice(0, 70);
  const res = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: (cfgMail && cfgMail.from) || Deno.env.get('EMAIL_FROM') || 'àndale <administracion@weareandale.com>', to: para, subject: asunto, html, text: texto }) });
  const out = await res.json().catch(() => ({}));
  await ctx.sb.from('emails').insert({ persona_id: ctx.personaId, tipo: 'Otro', periodo: m + '-01', para, cc: [], asunto, adjuntos: [], estado: res.ok ? 'Enviado' : 'Error', proveedor_id: out?.id || null, error: res.ok ? null : (out?.message || String(res.status)) });
  if (!res.ok) throw new Aviso('No se pudo enviar el resumen: ' + (out?.message || res.status), 502);
  return { ok: true, para, briefing: b };
}


/* ================= Propuestas: redactar y sugerir precio ================= */
const PLANES = ['Contado', '50/50', '3 cuotas', '4 cuotas', '6 cuotas', 'Personalizado'];
async function referenciasDrive(cfg: any, tipo: string, cliente: string) {
  if (!cfg.carpeta_propuestas || !(await cuentaServicio())) return { bloques: [] as any[], nombres: [] as string[] };
  const { files } = await listarCarpeta(cfg.carpeta_propuestas).catch(() => ({ files: [] as any[] }));
  const docs = await (async () => { // también Google Docs (listarCarpeta solo trae PDFs)
    try {
      const q = encodeURIComponent(`'${cfg.carpeta_propuestas}' in parents and trashed = false and mimeType = 'application/vnd.google-apps.document'`);
      const r = await (await gdrive(`files?q=${q}&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name,mimeType,modifiedTime)`)).json();
      return r.files || [];
    } catch { return []; }
  })();
  const pal = [tipo, cliente].join(' ').toLowerCase().split(/\W+/).filter(w => w.length > 3);
  const score = (f: any) => pal.filter(w => f.name.toLowerCase().includes(w)).length * 1e13 + Date.parse(f.modifiedTime || 0);
  const elegidos = [...files.filter((f: any) => f.mimeType === 'application/pdf'), ...docs].sort((a: any, b: any) => score(b) - score(a)).slice(0, 3);
  const bloques: any[] = [], nombres: string[] = [];
  for (const f of elegidos) {
    try {
      if (f.mimeType === 'application/vnd.google-apps.document') {
        const t = await (await gdrive(`files/${f.id}/export?mimeType=text/plain`)).text();
        bloques.push({ type: 'text', text: 'PROPUESTA ANTERIOR DE REFERENCIA (' + f.name + '):\n' + t.slice(0, 12000) });
      } else {
        const d = await descargar(f.id); if (d.bytes > 4_000_000) continue;
        bloques.push(pdfBlock(d.base64), { type: 'text', text: '(Arriba: propuesta anterior de referencia, ' + f.name + ')' });
      }
      nombres.push(f.name);
    } catch { /* sigue con las demás */ }
  }
  return { bloques, nombres };
}
async function propuestaIA(ctx: Ctx, b: any) {
  const { sb } = ctx;
  const tipo = String(b.tipo || ''), cliente = String(b.cliente || ''), moneda = String(b.moneda || 'ARS');
  if (!String(b.brief || '').trim() && !String(b.titulo || '').trim()) throw new Aviso('Escribí el brief o al menos el título para que la IA tenga de dónde partir.');
  const [clientes, proys, pfz, imps, props, listas, cfgDrive] = await Promise.all([
    todos(sb, 'clientes', 'id,nombre'), todos(sb, 'proyectos', 'id,cliente_id,nombre,tipo,estado,fecha_inicio,entrega,entrega_real,created_at'),
    todos(sb, 'proyecto_finanzas', 'proyecto_id,presupuesto,moneda,plan_pago'), todos(sb, 'imputaciones', 'proyecto_id,monto'),
    todos(sb, 'propuestas', 'id,numero,titulo,tipo,estado,total,moneda,items,fecha'), todos(sb, 'listas', 'clave,valores'), ajuste(sb, 'drive'),
  ]);
  const cn = new Map(clientes.map((c: any) => [c.id, c.nombre]));
  const costo = new Map<string, number>(); imps.forEach((i: any) => { if (i.proyecto_id) costo.set(i.proyecto_id, (costo.get(i.proyecto_id) || 0) + num(i.monto)); });
  const sem = (a: string, z: string) => a && z ? Math.max(1, Math.round((Date.parse(z) - Date.parse(a)) / 6048e5)) : null;
  const similares = proys.map((p: any) => ({ p, f: pfz.find((x: any) => x.proyecto_id === p.id) })).filter((x: any) => x.f && x.f.presupuesto)
    .sort((a: any, z: any) => (z.p.tipo === tipo ? 1 : 0) - (a.p.tipo === tipo ? 1 : 0) || String(z.p.created_at).localeCompare(a.p.created_at)).slice(0, 15)
    .map(({ p, f }: any) => `${cn.get(p.cliente_id)} · ${p.nombre} (${p.tipo}) · ${f.moneda} ${f.presupuesto} · ${f.plan_pago} · ${String(p.created_at).slice(0, 7)}` + (sem(p.fecha_inicio, p.entrega_real || p.entrega) ? ' · ' + sem(p.fecha_inicio, p.entrega_real || p.entrega) + ' semanas' : '') + (costo.get(p.id) ? ' · costos de proveedores ' + costo.get(p.id) : '') + ' · ' + p.estado);
  const previas = props.filter((x: any) => x.id !== b.id && x.total).sort((a: any, z: any) => String(z.fecha).localeCompare(a.fecha)).slice(0, 12)
    .map((x: any) => `${x.numero} · ${x.titulo} (${x.tipo}) · ${x.moneda} ${x.total} · ${x.estado} · ${String(x.fecha).slice(0, 7)} · ítems: ` + (x.items || []).map((i: any) => i.concepto + ' ' + i.monto).join('; '));
  const plantilla = (listas.find((l: any) => l.clave === 'etapas:' + tipo) || {}).valores || [];
  const refs = await referenciasDrive(cfgDrive, tipo, cliente);
  const sys = 'Sos el director de cuentas de àndale, agencia de branding y comunicación de Córdoba, Argentina. Redactás propuestas comerciales que el cliente va a leer: ' +
    'español rioplatense con vos, cálido, claro y concreto; frases cortas; nada de clichés de marketing ni promesas vacías; no inventes datos del cliente que no estén en el brief. ' +
    'Estructura: intro (2 a 4 oraciones que muestren que entendimos el problema), objetivo, alcance (viñetas), etapas con semanas estimadas, entregables, qué no incluye, inversión por ítems, forma de pago y condiciones. ' +
    'Para el precio usá como referencia los proyectos y propuestas anteriores de àndale: mismo tipo y alcance parecido; si son de meses anteriores y en pesos, ajustá por inflación (Argentina) y decilo en la justificación. ' +
    'Si hay propuestas anteriores de referencia, imitá su estructura, tono y nivel de detalle. Montos en ' + moneda + ', redondeados. La justificación del precio es interna (no la ve el cliente).';
  const ctxTxt = [
    'TÍTULO: ' + (b.titulo || '(a definir)') + '\nTIPO: ' + (tipo || '(a definir)') + '\nCLIENTE: ' + (cliente || '(prospecto)') + '\nMONEDA: ' + moneda + '\nHOY: ' + hoyAR(),
    'BRIEF Y NOTAS:\n' + String(b.brief || '').slice(0, 20000),
    'ETAPAS HABITUALES PARA ' + (tipo || 'este tipo') + ': ' + (plantilla.join(' → ') || '(sin plantilla)'),
    'PROYECTOS ANTERIORES CON PRESUPUESTO (cliente · proyecto · monto · plan · fecha · duración · costos · estado):\n' + (similares.join('\n') || '(ninguno cargado)'),
    'PROPUESTAS ANTERIORES:\n' + (previas.join('\n') || '(ninguna)'),
  ].join('\n\n');
  const tool = {
    name: 'redactar_propuesta', description: 'Propuesta lista para revisar.',
    input_schema: { type: 'object', required: ['titulo', 'intro', 'objetivo', 'alcance', 'etapas', 'entregables', 'items', 'plan_pago', 'justificacion_precio'], properties: {
      titulo: { type: 'string' }, intro: { type: 'string' }, objetivo: { type: 'string' },
      alcance: { type: 'array', items: { type: 'string' } },
      etapas: { type: 'array', items: { type: 'object', required: ['nombre'], properties: { nombre: { type: 'string' }, semanas: { type: ['number', 'null'] }, detalle: { type: 'string' } } } },
      entregables: { type: 'array', items: { type: 'string' } }, no_incluye: { type: 'array', items: { type: 'string' } },
      items: { type: 'array', items: { type: 'object', required: ['concepto', 'monto'], properties: { concepto: { type: 'string' }, detalle: { type: 'string' }, monto: { type: 'number' } } } },
      plan_pago: { type: 'string', enum: PLANES }, validez_dias: { type: ['number', 'null'] }, condiciones: { type: 'string' },
      justificacion_precio: { type: 'string', description: 'interna: en qué proyectos o propuestas te basaste y cómo ajustaste' },
    } },
  };
  const r = await claude(ctx, 'propuesta', { system: sys, tool, maxTokens: 6000, content: [...refs.bloques, { type: 'text', text: ctxTxt }] });
  return { ...r, referencias: { proyectos: similares.length, propuestas: previas.length, drive: refs.nombres } };
}

/* ================= Servidor ================= */
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Método no permitido' }, 405);
  let b: any; try { b = await req.json(); } catch { return json({ error: 'Pedido inválido' }, 400); }
  const url = Deno.env.get('SUPABASE_URL')!;
  try {
    // Disparo programado (pg_cron): secreto guardado en Vault, sin usuario.
    if (b.accion === 'cron_cierre') {
      const svc = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
      const { data: ok } = await svc.rpc('asistente_cron_ok', { s: req.headers.get('x-cron-secret') || '' });
      if (!ok) return json({ error: 'No autorizado' }, 401);
      const cfg = await ajuste(svc, 'asistente');
      if (cfg.email_activo === false) return json({ ok: true, omitido: 'desactivado' });
      return json(await enviarCierre({ sb: svc, personaId: null }, mesAR()));
    }
    const sb = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } }, auth: { persistSession: false } });
    const { data: yoData } = await sb.rpc('yo');
    const yo = Array.isArray(yoData) ? yoData[0] : yoData;
    if (!yo || yo.rol !== 'admin') return json({ error: 'Solo los administradores pueden usar el asistente.' }, 403);
    const ctx: Ctx = { sb, personaId: yo.id };
    switch (b.accion) {
      case 'estado': {
        const [ci, cm] = [await cred('anthropic'), await cred('email')];
        const ia = !!((ci && ci.key) || Deno.env.get('ANTHROPIC_API_KEY')), email = !!((cm && cm.key) || Deno.env.get('RESEND_API_KEY')), modelo = (ci && ci.modelo) || MODEL();
        let sa = null; try { sa = await cuentaServicio(); } catch (e) { return json({ ia, drive: false, drive_error: (e as Error).message, modelo, email }); }
        return json({ ia, drive: !!sa, drive_email: sa ? sa.client_email : null, modelo, email });
      }
      case 'drive_sync': return json(await driveSync(ctx));
      case 'drive_descargar': {
        const r = chk(await sb.from('drive_archivos').select('file_id,nombre').eq('id', b.archivo_id).single()) as any;
        const f = await descargar(r.file_id);
        return json({ nombre: r.nombre, mime: f.mime, base64: f.base64 });
      }
      case 'drive_renombrar': {
        const nombre = String(b.nombre || '').trim();
        if (!/^[\w .,()&+-]{3,180}\.(pdf|png|jpe?g|webp)$/i.test(nombre)) throw new Aviso('Nombre de archivo no válido: ' + nombre);
        const r = chk(await sb.from('drive_archivos').select('file_id,nombre').eq('id', b.archivo_id).single()) as any;
        if (r.nombre === nombre) return json({ ok: true, nombre, igual: true });
        await renombrar(r.file_id, nombre);
        chk(await sb.from('drive_archivos').update({ nombre }).eq('id', b.archivo_id));
        return json({ ok: true, nombre, antes: r.nombre });
      }
      case 'leer_factura': return json(await leerFactura(ctx, b));
      case 'conciliar': return json(await conciliar(ctx, b));
      case 'imputar': return json(await imputar(ctx, b));
      case 'propuesta': return json(await propuestaIA(ctx, b));
      case 'cierre': {
        const m = /^\d{4}-\d{2}$/.test(b.periodo || '') ? b.periodo : mesAR();
        const c = b.checklist || await checklistServidor(sb, m);
        return json(await briefing(ctx, c));
      }
      case 'cierre_email': return json(await enviarCierre(ctx, /^\d{4}-\d{2}$/.test(b.periodo || '') ? b.periodo : mesAR(), b.solo_yo ? [b.solo_yo] : undefined));
      default: return json({ error: 'Acción desconocida' }, 400);
    }
  } catch (e) {
    const st = e instanceof Aviso ? e.status : 500;
    console.error(b && b.accion, e);
    return json({ error: (e as Error).message || 'Error inesperado' }, st);
  }
});
