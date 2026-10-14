// Capa de datos: Supabase <-> modelo de la interfaz.
// La interfaz trabaja con nombres (cliente, alias de personas); la base con ids.
import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(URL && KEY);
export const sb = configured ? createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

const T = {
  proyecto:     { table: 'proyectos',      join: ['proyecto_responsables', 'proyecto_id'] },
  abono:        { table: 'abonos',         join: ['abono_responsables', 'abono_id'] },
  cliente:      { table: 'clientes',       join: ['cliente_responsables', 'cliente_id'] },
  persona:      { table: 'personas' },
  comunicacion: { table: 'comunicaciones' },
};

// ui key -> [columna, transformación]
const FIELDS = {
  proyecto: { cliente: ['cliente_id', 'cliente'], proyecto: ['nombre'], tipo: ['tipo'], estado: ['estado'], fechaInicio: ['fecha_inicio', 'date'], entrega: ['entrega', 'date'], entregaReal: ['entrega_real', 'date'], entregables: ['entregables'], drive: ['drive'], slides: ['slides'], canva: ['canva'], notas: ['notas'], etapas: ['etapas', 'json'] },
  abono: { cliente: ['cliente_id', 'cliente'], tipo: ['tipo'], plan: ['plan'], desde: ['desde', 'month'], hasta: ['hasta', 'month'], estado: ['estado'], notas: ['notas'] },
  cliente: { nombre: ['nombre'], estado: ['estado'], estadoManual: ['estado_manual', 'bool'], servicio: ['servicio'], plan: ['plan'], contacto: ['contacto'], email: ['email'], tel: ['tel'], web: ['web'], carpeta: ['carpeta'], notas: ['notas'] },
  persona: { persona: ['alias'], nombre: ['nombre'], puesto: ['puesto'], email: ['email', 'nullable'], tel: ['tel'], rol: ['rol'], activo: ['activo', 'bool'], notas: ['notas'] },
  comunicacion: { fecha: ['fecha', 'date'], cliente: ['cliente_id', 'cliente'], canal: ['canal'], conQuien: ['con_quien'], resumen: ['resumen'], acuerdo: ['acuerdo'], proximo: ['proximo'], fechaProximo: ['fecha_proximo', 'date'], hecho: ['hecho', 'bool'], responsable: ['responsable_id', 'persona'] },
};

const idx = { clienteId: new Map(), clienteName: new Map(), personaId: new Map(), personaAlias: new Map() };
const month = d => (d ? String(d).slice(0, 7) : '');

function toRow(kind, ui) {
  const row = {};
  for (const [k, v] of Object.entries(ui)) {
    const spec = FIELDS[kind][k]; if (!spec) continue;
    const [col, t] = spec;
    let val = v;
    if (t === 'date') val = v ? v : null;
    else if (t === 'month') val = v ? (/^\d{4}-\d{2}$/.test(v) ? v + '-01' : v) : null;
    else if (t === 'bool') val = !!v;
    else if (t === 'json') val = Array.isArray(v) ? v : [];
    else if (t === 'nullable') val = v ? String(v).trim().toLowerCase() : null;
    else if (t === 'cliente') { val = idx.clienteId.get(v) || null; if (v && !val) throw friendly({ message: 'El cliente "' + v + '" no existe.' }); }
    else if (t === 'persona') val = v ? (idx.personaId.get(v) || null) : null;
    else val = v ?? '';
    row[col] = val;
  }
  return row;
}

export function friendly(err) {
  const m = (err && (err.message || err.error_description)) || String(err || '');
  const code = err && err.code;
  let msg = m;
  if (code === '42501' || /row-level security|permission denied/i.test(m)) msg = 'No tenés permiso para hacer esto.';
  else if (code === '23505' || /duplicate key/i.test(m)) msg = 'Ya existe un registro con ese nombre.';
  else if (code === '23503') msg = 'No se puede borrar: tiene datos asociados.';
  else if (/Failed to fetch|NetworkError/i.test(m)) msg = 'Sin conexión. Revisá internet y probá de nuevo.';
  const e = new Error(msg); e.code = code; e.denied = msg.startsWith('No tenés permiso'); return e;
}
const check = r => { if (r.error) { const e = friendly(r.error); e.raw = r.error.code + ' ' + r.error.message; throw e; } return r.data; };

// ---------- Lectura ----------
export async function loadAll() {
  const names = ['personas', 'clientes', 'cliente_responsables', 'abonos', 'abono_responsables', 'proyectos', 'proyecto_responsables', 'comunicaciones', 'listas'];
  const res = await Promise.all(names.map(n => sb.from(n).select('*').limit(5000)));
  const d = {}; names.forEach((n, i) => { d[n] = check(res[i]) || []; });

  idx.clienteId.clear(); idx.clienteName.clear(); idx.personaId.clear(); idx.personaAlias.clear();
  d.personas.forEach(p => { idx.personaId.set(p.alias, p.id); idx.personaAlias.set(p.id, p.alias); });
  d.clientes.forEach(c => { idx.clienteId.set(c.nombre, c.id); idx.clienteName.set(c.id, c.nombre); });
  const respOf = (rows, key) => { const m = new Map(); rows.forEach(r => { const a = idx.personaAlias.get(r.persona_id); if (!a) return; if (!m.has(r[key])) m.set(r[key], []); m.get(r[key]).push(a); }); return m; };
  const rp = respOf(d.proyecto_responsables, 'proyecto_id'), ra = respOf(d.abono_responsables, 'abono_id'), rc = respOf(d.cliente_responsables, 'cliente_id');
  const cname = id => idx.clienteName.get(id) || '(cliente sin acceso)';
  const meta = r => ({ creado: r.created_at, actualizado: r.updated_at });

  return {
    E: d.personas.map(p => ({ _id: p.id, persona: p.alias, nombre: p.nombre, puesto: p.puesto, email: p.email || '', tel: p.tel, rol: p.rol, activo: p.activo, notas: p.notas, avatar: p.avatar_url || '', ...meta(p) })),
    C: d.clientes.map(c => ({ _id: c.id, nombre: c.nombre, estado: c.estado, estadoManual: !!c.estado_manual, servicio: c.servicio, plan: c.plan, contacto: c.contacto, email: c.email, tel: c.tel, web: c.web, carpeta: c.carpeta, notas: c.notas, avatar: c.avatar_url || '', responsables: rc.get(c.id) || [], ...meta(c) })),
    A: d.abonos.map(a => ({ _id: a.id, cliente: cname(a.cliente_id), tipo: a.tipo, plan: a.plan, desde: month(a.desde), hasta: month(a.hasta), estado: a.estado, notas: a.notas, responsables: ra.get(a.id) || [], ...meta(a) })),
    P: d.proyectos.map(p => ({ _id: p.id, cliente: cname(p.cliente_id), proyecto: p.nombre, tipo: p.tipo, estado: p.estado, fechaInicio: p.fecha_inicio || '', entrega: p.entrega || '', entregaReal: p.entrega_real || '', entregables: p.entregables, drive: p.drive, slides: p.slides, canva: p.canva, notas: p.notas, etapas: Array.isArray(p.etapas) ? p.etapas : [], responsables: rp.get(p.id) || [], ...meta(p) })),
    M: d.comunicaciones.map(m => ({ _id: m.id, fecha: m.fecha || '', cliente: cname(m.cliente_id), canal: m.canal, conQuien: m.con_quien, resumen: m.resumen, acuerdo: m.acuerdo, proximo: m.proximo, fechaProximo: m.fecha_proximo || '', hecho: m.hecho, responsable: idx.personaAlias.get(m.responsable_id) || '', ...meta(m) })),
    L: Object.fromEntries(d.listas.map(l => [l.clave, l.valores])),
  };
}

// ---------- Escritura ----------
async function syncResp(kind, id, aliases, prev) {
  const spec = T[kind].join; if (!spec || !Array.isArray(aliases)) return;
  const [table, key] = spec;
  const want = new Set(aliases.map(a => idx.personaId.get(a)).filter(Boolean));
  const had = new Set((prev || []).map(a => idx.personaId.get(a)).filter(Boolean));
  const add = [...want].filter(x => !had.has(x)), del = [...had].filter(x => !want.has(x));
  if (add.length) check(await sb.from(table).insert(add.map(p => ({ [key]: id, persona_id: p }))));
  if (del.length) check(await sb.from(table).delete().eq(key, id).in('persona_id', del));
}

export async function save(kind, id, ui, prevResp) {
  const row = toRow(kind, ui);
  let rid = id;
  if (id) check(await sb.from(T[kind].table).update(row).eq('id', id));
  else rid = check(await sb.from(T[kind].table).insert(row).select('id').single()).id;
  if ('responsables' in ui && JSON.stringify([...(ui.responsables || [])].sort()) !== JSON.stringify([...(prevResp || [])].sort())) await syncResp(kind, rid, ui.responsables, id ? prevResp : []);
  return rid;
}
export async function update(kind, id, patch, prevResp) {
  const { responsables, ...rest } = patch;
  if (Object.keys(rest).length) check(await sb.from(T[kind].table).update(toRow(kind, rest)).eq('id', id));
  if (responsables) await syncResp(kind, id, responsables, prevResp);
}
export async function remove(kind, id) { check(await sb.from(T[kind].table).delete().eq('id', id)); }
export async function saveLista(clave, valores) { check(await sb.from('listas').upsert({ clave, valores, updated_at: new Date().toISOString() })); }

// ---------- Administración (solo admin; la base no devuelve nada a otros roles) ----------
export const ids = { cliente: n => idx.clienteId.get(n) || null, clienteName: id => idx.clienteName.get(id) || '', persona: a => (a ? idx.personaId.get(a) || null : null), alias: id => idx.personaAlias.get(id) || '' };
async function all(table, build) {
  const out = []; const step = 1000;
  for (let from = 0; ; from += step) {
    let q = sb.from(table).select('*'); if (build) q = build(q);
    const rows = check(await q.range(from, from + step - 1)) || [];
    out.push(...rows); if (rows.length < step) break;
  }
  return out;
}
// Tablas nuevas (migración 0007): si todavía no existen, la app sigue andando sin esos módulos.
const opcional = p => p.catch(e => { if (/PGRST205|42P01|Could not find the table|does not exist/i.test((e && (e.raw || e.code + ' ' + e.message)) || '')) return []; throw e; });
const num = v => (v === null || v === undefined || v === '' ? null : Number(v));
export async function loadAdmin() {
  const desdeMes = new Date(); desdeMes.setDate(1); desdeMes.setHours(0, 0, 0, 0);
  const [ca, pr, pf, rs, fs, cj, pc, mv, gs, aj, em, pfz, abf, imp, co, rm, cf, lq, da, il, prop] = await Promise.all([
    all('clientes_admin'), all('precios_abono'), all('proyecto_facturacion'), all('resumenes'), all('facturas_saldo'),
    all('cajas', q => q.order('orden')), all('plan_cuentas'), all('movimientos', q => q.order('fecha', { ascending: false })), all('gestiones'), all('ajustes'), all('emails', q => q.order('created_at', { ascending: false })), all('proyecto_finanzas'), all('abono_finanzas'), all('imputaciones'),
    opcional(all('colaboradores', q => q.order('nombre'))), opcional(all('remuneraciones')), opcional(all('conceptos_fijos')), opcional(all('liquidaciones')), opcional(all('drive_archivos', q => q.order('modificado', { ascending: false, nullsFirst: false }))),
    opcional(all('ia_log', q => q.gte('created_at', desdeMes.toISOString()))),
    opcional(all('propuestas', q => q.order('fecha', { ascending: false }))),
  ]);
  const cn = id => idx.clienteName.get(id) || '';
  return {
    CA: new Map(ca.map(r => [cn(r.cliente_id), r])),
    PR: pr.map(r => ({ ...r, desde: month(r.desde), monto: num(r.monto) })),
    PF: pf.map(r => ({ ...r, periodo: month(r.periodo), monto: num(r.monto) })),
    R: rs.map(r => ({ ...r, cliente: cn(r.cliente_id), periodo: month(r.periodo), total: num(r.total) || 0, items: Array.isArray(r.items) ? r.items : [] })),
    F: fs.map(r => ({ ...r, cliente: cn(r.cliente_id), periodo: month(r.periodo), monto: num(r.monto) || 0, cobrado: num(r.cobrado) || 0, saldo: num(r.saldo) || 0 })),
    CJ: cj.map(r => ({ ...r, saldo_inicial: num(r.saldo_inicial) || 0 })),
    PC: pc,
    MV: mv.map(r => ({ ...r, cliente: cn(r.cliente_id), persona: idx.personaAlias.get(r.persona_id) || '', ingreso: num(r.ingreso) || 0, egreso: num(r.egreso) || 0 })),
    AJ: Object.fromEntries(aj.map(r => [r.clave, r.valor])),
    EM: em,
    PFZ: new Map(pfz.map(r => [r.proyecto_id, { ...r, presupuesto: num(r.presupuesto), inicio_cobro: month(r.inicio_cobro) }])),
    ABF: new Map(abf.map(r => [r.abono_id, { ...r, inversion: num(r.inversion) }])),
    IMP: imp.map(r => ({ ...r, monto: num(r.monto) || 0 })),
    CO: co.map(r => ({ ...r, persona: idx.personaAlias.get(r.persona_id) || '' })),
    RM: rm.map(r => ({ ...r, desde: month(r.desde), monto: num(r.monto) })),
    CF: cf.map(r => ({ ...r, desde: month(r.desde), hasta: month(r.hasta), monto: num(r.monto) })),
    LQ: lq.map(r => ({ ...r, periodo: month(r.periodo), monto: num(r.monto) })),
    DA: da.map(r => ({ ...r, datos: r.datos || {} })),
    IL: il,
    PROP: prop.map(r => ({ ...r, total: num(r.total) || 0, descuento: num(r.descuento) || 0 })),
    G: gs.map(r => ({ ...r, cliente: cn(r.cliente_id), periodo: month(r.periodo), persona: idx.personaAlias.get(r.persona_id) || '' })),
  };
}
export async function ins(table, row) { return check(await sb.from(table).insert(row).select().single()); }
export async function insMany(table, rows) { if (rows.length) check(await sb.from(table).insert(rows)); }
export async function upd(table, id, patch, key = 'id') { check(await sb.from(table).update(patch).eq(key, id)); }
export async function del(table, id, key = 'id') { check(await sb.from(table).delete().eq(key, id)); }
export async function upsert(table, row, onConflict) { check(await sb.from(table).upsert(row, onConflict ? { onConflict } : undefined)); }

// ---------- Sesión ----------
/** Envía un email por la Edge Function `enviar-email` (Resend). Solo admins. */
export async function sendEmail(payload) {
  const { data, error } = await sb.functions.invoke('enviar-email', { body: payload });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch (e) { }
    if (/Failed to send a request|fetch/i.test(msg)) msg = 'No se pudo conectar con el servicio de emails. Revisá tu conexión.';
    throw new Error(msg);
  }
  if (data && data.error) throw new Error(data.error);
  return data;
}
/** Llama a la Edge Function `asistente` (Drive + IA). Solo admins. */
export async function asistente(payload) {
  const { data, error } = await sb.functions.invoke('asistente', { body: payload });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch (e) { }
    if (/Failed to send a request|fetch/i.test(msg)) msg = 'No se pudo conectar con el asistente. Revisá tu conexión o que la función esté publicada.';
    throw new Error(msg);
  }
  if (data && data.error) throw new Error(data.error);
  return data;
}
/** Sube una foto de perfil (achicada a 320 px) y la guarda en la persona o el cliente. */
export async function subirAvatar(kind, id, file, propia) {
  if (!/^image\/(png|jpe?g|webp)$/.test(file.type)) throw new Error('Usá una imagen JPG, PNG o WebP.');
  const blob = await achicar(file, 320);
  const path = (kind === 'cliente' ? 'clientes/' : 'personas/') + id + '.webp';
  const up = await sb.storage.from('avatares').upload(path, blob, { upsert: true, contentType: 'image/webp', cacheControl: '3600' });
  if (up.error) throw friendly(up.error);
  const url = sb.storage.from('avatares').getPublicUrl(path).data.publicUrl + '?v=' + Date.now();
  if (kind === 'persona' && propia) check(await sb.rpc('mi_avatar', { url }));
  else check(await sb.from(kind === 'cliente' ? 'clientes' : 'personas').update({ avatar_url: url }).eq('id', id));
  return url;
}
function achicar(file, max) {
  return new Promise((res, rej) => {
    const img = new Image(); const u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), w = Math.round(img.width * k), h = Math.round(img.height * k);
      const s = Math.min(w, h), cv = document.createElement('canvas'); cv.width = cv.height = s; // recorte cuadrado centrado
      cv.getContext('2d').drawImage(img, (img.width - s / k) / 2, (img.height - s / k) / 2, s / k, s / k, 0, 0, s, s);
      URL.revokeObjectURL(u); cv.toBlob(b => b ? res(b) : rej(new Error('No se pudo procesar la imagen')), 'image/webp', 0.86);
    };
    img.onerror = () => rej(new Error('No se pudo leer la imagen')); img.src = u;
  });
}
export async function session() { return (await sb.auth.getSession()).data.session; }
export async function yo() { const d = check(await sb.rpc('yo')); return d && d[0] ? d[0] : null; }
export async function sendLink(email) { check(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin, shouldCreateUser: true } })); }
export async function logout() { await sb.auth.signOut(); }
export function onAuth(fn) { sb.auth.onAuthStateChange((ev, s) => fn(ev, s)); }

// ---------- Tiempo real ----------
export function live(onChange, onStatus) {
  let t;
  return sb.channel('ops').on('postgres_changes', { event: '*', schema: 'public' }, () => { clearTimeout(t); t = setTimeout(onChange, 350); })
    .subscribe(s => onStatus && onStatus(s));
}
