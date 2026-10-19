// Capa de datos: Supabase <-> modelo de la interfaz.
// La interfaz trabaja con nombres (cliente, alias de personas); la base con ids.
import { createClient } from '@supabase/supabase-js';

const SB_URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const configured = Boolean(SB_URL && KEY);
export const sb = configured ? createClient(SB_URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;

const T = {
  proyecto:     { table: 'proyectos',      join: ['proyecto_responsables', 'proyecto_id'] },
  abono:        { table: 'abonos',         join: ['abono_responsables', 'abono_id'] },
  cliente:      { table: 'clientes',       join: ['cliente_responsables', 'cliente_id'] },
  persona:      { table: 'personas' },
  comunicacion: { table: 'comunicaciones' },
};

// ui key -> [columna, transformación]
const FIELDS = {
  proyecto: { cliente: ['cliente_id', 'cliente'], proyecto: ['nombre'], tipo: ['tipo'], estado: ['estado'], fechaInicio: ['fecha_inicio', 'date'], entrega: ['entrega', 'date'], entregaReal: ['entrega_real', 'date'], entregables: ['entregables'], drive: ['drive'], slides: ['slides'], canva: ['canva'], notas: ['notas'], etapas: ['etapas', 'json'], prioridad: ['prioridad'] },
  abono: { cliente: ['cliente_id', 'cliente'], tipo: ['tipo'], plan: ['plan'], desde: ['desde', 'month'], hasta: ['hasta', 'month'], estado: ['estado'], notas: ['notas'], redes: ['redes', 'arr'] },
  cliente: { nombre: ['nombre'], desde: ['desde', 'month'], estado: ['estado'], estadoManual: ['estado_manual', 'bool'], servicio: ['servicio'], plan: ['plan'], contacto: ['contacto'], email: ['email'], tel: ['tel'], telFijo: ['tel_fijo', 'col'], web: ['web'], redes: ['redes', 'obj'], carpeta: ['carpeta'], notas: ['notas'] },
  persona: { persona: ['alias'], nombre: ['nombre'], puesto: ['puesto'], email: ['email', 'nullable'], tel: ['tel'], rol: ['rol'], activo: ['activo', 'bool'], notas: ['notas'] },
  comunicacion: { tema: ['tema', 'cTxt'], equipo: ['equipo', 'cPers'], emailId: ['email_id', 'cUuid'], fecha: ['fecha', 'date'], cliente: ['cliente_id', 'cliente'], canal: ['canal'], conQuien: ['con_quien'], resumen: ['resumen'], acuerdo: ['acuerdo'], proximo: ['proximo'], fechaProximo: ['fecha_proximo', 'date'], hecho: ['hecho', 'bool'], responsable: ['responsable_id', 'persona'] },
};

const idx = { clienteId: new Map(), clienteName: new Map(), personaId: new Map(), personaAlias: new Map() };
const month = d => (d ? String(d).slice(0, 7) : '');

/** Columnas nuevas que puede no tener todavía la base (hasta correr su SQL). */
export const cols = { contactoAvisos: true, charlaTema: true, comentContactos: true, clienteRedes: true, contactoFijo: true, piezaAds: true, abonoRol: true, piezaContenido: true, abonoRedes: true, piezaExtraCobro: true, piezaVersiones: true, piezaFuentes: true, piezaLista: true };
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
    else if (t === 'arr') { if (!cols.abonoRedes) continue; val = Array.isArray(v) ? v.filter(Boolean) : []; } // redes que se gestionan (SQL 0032)
    else if (t === 'obj') { if (!cols.clienteRedes) continue; val = v && typeof v === 'object' && !Array.isArray(v) ? v : {}; }
    else if (t === 'col') { if (!cols.clienteRedes) continue; val = v ?? ''; }
    else if (t === 'nullable') val = v ? String(v).trim().toLowerCase() : null;
    else if (t === 'cliente') { val = idx.clienteId.get(v) || null; if (v && !val) throw friendly({ message: 'El cliente "' + v + '" no existe.' }); }
    else if (t === 'persona') val = v ? (idx.personaId.get(v) || null) : null;
    else if (t === 'cTxt') { if (!cols.charlaTema) continue; val = v ?? ''; }   // tema de la charla (SQL 0041)
    else if (t === 'cPers') { if (!cols.charlaTema) continue; val = (Array.isArray(v) ? v : []).map(a => idx.personaId.get(a)).filter(Boolean); }
    else if (t === 'cUuid') val = v || null;
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
  // Contactos (migración 0015): si la tabla todavía no existe, K queda en null y la app usa los campos del cliente.
  const kq = tolerante(sb.from('contactos').select('*').order('orden').limit(5000));
  // Tablas de la migración 0016: si todavía no existen, la app sigue con lo anterior (tareas en proyectos.etapas).
  const tq = tolerante(sb.from('tareas').select('*').order('orden').limit(20000));
  const fq = tolerante(sb.from('flujos').select('*'));
  const nq = tolerante(sb.from('notificaciones').select('*').order('created_at', { ascending: false }).limit(80));
  const desde = new Date(); desde.setMonth(desde.getMonth() - 7); desde.setDate(1);
  const rmq = tolerante(sb.from('redes_meses').select('*').gte('mes', desde.toISOString().slice(0, 10)).order('mes'));
  const pdq = tolerante(sb.from('pedidos').select('*').order('created_at', { ascending: false }).limit(2000));
  const bfq = tolerante(sb.from('briefs').select('*').order('respondido_at', { ascending: false }).limit(500));
  const enq = tolerante(sb.from('entregas').select('*').order('orden').limit(3000));
  const siq = tolerante(sb.from('sitios').select('*').limit(1000));
  const res = await Promise.all(names.map(n => sb.from(n).select('*').limit(5000)));
  const [krows, trows, frows, nrows, rmrows, pdrows, bfrows, enrows, sirows] = await Promise.all([kq, tq, fq, nq, rmq, pdq, bfq, enq, siq]);
  if (krows && krows.length) cols.contactoFijo = 'tel_fijo' in krows[0];
  if (krows && krows.length) cols.contactoAvisos = 'avisos' in krows[0];
  const d = {}; names.forEach((n, i) => { d[n] = check(res[i]) || []; });

  idx.clienteId.clear(); idx.clienteName.clear(); idx.personaId.clear(); idx.personaAlias.clear();
  d.personas.forEach(p => { idx.personaId.set(p.alias, p.id); idx.personaAlias.set(p.id, p.alias); });
  d.clientes.forEach(c => { idx.clienteId.set(c.nombre, c.id); idx.clienteName.set(c.id, c.nombre); });
  if (d.clientes.length) cols.clienteRedes = 'redes' in d.clientes[0];
  if (d.comunicaciones.length) cols.charlaTema = 'tema' in d.comunicaciones[0];
  if (d.abonos.length) cols.abonoRedes = 'redes' in d.abonos[0];
  const respOf = (rows, key) => { const m = new Map(); rows.forEach(r => { const a = idx.personaAlias.get(r.persona_id); if (!a) return; if (!m.has(r[key])) m.set(r[key], []); m.get(r[key]).push(a); }); return m; };
  const rp = respOf(d.proyecto_responsables, 'proyecto_id'), ra = respOf(d.abono_responsables, 'abono_id'), rc = respOf(d.cliente_responsables, 'cliente_id');
  // Rol de cada persona en cada cuenta (SQL 0029): { abonoId: { alias: rol } }
  if (d.abono_responsables.length) cols.abonoRol = 'rol' in d.abono_responsables[0];
  const rolA = new Map(); d.abono_responsables.forEach(r => { const a = idx.personaAlias.get(r.persona_id); if (!a || !r.rol) return; if (!rolA.has(r.abono_id)) rolA.set(r.abono_id, {}); rolA.get(r.abono_id)[a] = r.rol; });
  const cname = id => idx.clienteName.get(id) || '(cliente sin acceso)';
  const tks = new Map();
  if (trows) trows.forEach(t => { if (!tks.has(t.proyecto_id)) tks.set(t.proyecto_id, []); tks.get(t.proyecto_id).push(tareaUI(t)); });
  const meta = r => ({ creado: r.created_at, actualizado: r.updated_at });

  return {
    E: d.personas.map(p => ({ _id: p.id, persona: p.alias, nombre: p.nombre, puesto: p.puesto, email: p.email || '', tel: p.tel, rol: p.rol, activo: p.activo, notas: p.notas, avatar: p.avatar_url || '', prefs: p.prefs || {}, ...meta(p) })),
    C: d.clientes.map(c => ({ _id: c.id, nombre: c.nombre, desde: month(c.desde), estado: c.estado, estadoManual: !!c.estado_manual, servicio: c.servicio, plan: c.plan, contacto: c.contacto, email: c.email, tel: c.tel, telFijo: c.tel_fijo || '', web: c.web, redes: (c.redes && typeof c.redes === 'object' && !Array.isArray(c.redes)) ? c.redes : {}, carpeta: c.carpeta, notas: c.notas, avatar: c.avatar_url || '', marca: 'marca' in c ? (c.marca || {}) : undefined, responsables: rc.get(c.id) || [], ...meta(c) })),
    A: d.abonos.map(a => ({ _id: a.id, cliente: cname(a.cliente_id), tipo: a.tipo, plan: a.plan, desde: month(a.desde), hasta: month(a.hasta), estado: a.estado, notas: a.notas, redes: Array.isArray(a.redes) ? a.redes : [], responsables: ra.get(a.id) || [], roles: rolA.get(a.id) || {}, ...meta(a) })),
    P: d.proyectos.map(p => ({ _id: p.id, cliente: cname(p.cliente_id), proyecto: p.nombre, tipo: p.tipo, estado: p.estado, fechaInicio: p.fecha_inicio || '', entrega: p.entrega || '', entregaReal: p.entrega_real || '', entregables: p.entregables, drive: p.drive, slides: p.slides, canva: p.canva, notas: p.notas, etapas: trows ? (tks.get(p.id) || []) : (Array.isArray(p.etapas) ? p.etapas : []), etapaActual: p.etapa_actual || '', prioridad: p.prioridad || '', responsables: rp.get(p.id) || [], ...meta(p) })),
    M: d.comunicaciones.map(m => ({ _id: m.id, tema: m.tema || '', equipo: (m.equipo || []).map(x => idx.personaAlias.get(x)).filter(Boolean), emailId: m.email_id || null, fecha: m.fecha || '', cliente: cname(m.cliente_id), canal: m.canal, conQuien: m.con_quien, resumen: m.resumen, acuerdo: m.acuerdo, proximo: m.proximo, fechaProximo: m.fecha_proximo || '', hecho: m.hecho, responsable: idx.personaAlias.get(m.responsable_id) || '', ...meta(m) })),
    L: Object.fromEntries(d.listas.map(l => [l.clave, l.valores])),
 T: !!trows,
    RM: rmrows ? rmrows.filter(m => idx.clienteName.has(m.cliente_id)).map(mesUI) : null,
    PD: pdrows ? pdrows.filter(x => idx.clienteName.has(x.cliente_id)).map(pedidoUI) : null,
    BF: bfrows ? bfrows.map(briefUI) : null,
    EN: enrows ? enrows.map(entregaUI) : null,
    SI: sirows ? sirows.map(sitioUI) : null,
    FL: frows ? Object.fromEntries(frows.map(f => [f.tipo, { etapas: Array.isArray(f.etapas) ? f.etapas : [], reglas: f.reglas || {} }])) : null,
    N: nrows ? nrows.map(n => ({ _id: n.id, tipo: n.tipo, titulo: n.titulo, cuerpo: n.cuerpo, link: n.link, leida: n.leida, actor: idx.personaAlias.get(n.actor_id) || '', creado: n.created_at })) : null,
    K: krows ? krows.filter(k => idx.clienteName.has(k.cliente_id)).map(k => ({ _id: k.id, cliente: cname(k.cliente_id), nombre: k.nombre || '', rol: k.rol || '', email: k.email || '', tel: k.tel || '', telFijo: k.tel_fijo || '', principal: !!k.principal, cobros: !!k.cobros, avisos: k.avisos !== false, portal: !!k.portal, portalUltimo: k.portal_ultimo || null, notas: k.notas || '', orden: k.orden || 0 })) : null,
  };
}

/* ---------- Redes: meses y piezas ---------- */
export function mesUI(m) {
  return { _id: m.id, cliente: idx.clienteName.get(m.cliente_id) || '', clienteId: m.cliente_id, abonoId: m.abono_id, mes: String(m.mes || '').slice(0, 7), estado: m.estado, resp: idx.personaAlias.get(m.responsable_id) || '',
    plan: m.plan || {}, carpeta: m.carpeta || '', carpetaUrl: m.carpeta_url || '', conteo: m.conteo || {}, conteoAt: m.conteo_at, notas: m.notas || '', visible: !!m.visible_cliente,
    enviadoAt: m.enviado_at, aprobadoAt: m.aprobado_at, aprobadoPor: m.aprobado_por || '', horas: m.horas == null ? '' : +m.horas, investigacion: m.investigacion || null };
}
const MES_COLS = { estado: 'estado', plan: 'plan', carpeta: 'carpeta', carpetaUrl: 'carpeta_url', notas: 'notas', visible: 'visible_cliente', enviadoAt: 'enviado_at', aprobadoAt: 'aprobado_at', aprobadoPor: 'aprobado_por' };
function mesRow(u) {
  const r = {};
  for (const [k, c] of Object.entries(MES_COLS)) if (k in u) r[c] = u[k];
  if ('resp' in u) r.responsable_id = u.resp ? (idx.personaId.get(u.resp) || null) : null;
  if ('horas' in u) r.horas = u.horas === '' || u.horas == null ? null : +u.horas;
  return r;
}
export async function mesCrear(u) {
  const r = check(await sb.from('redes_meses').insert({ cliente_id: idx.clienteId.get(u.cliente), abono_id: u.abonoId || null, mes: u.mes + '-01', ...mesRow(u) }).select().single());
  return mesUI(r);
}
export async function mesUpd(id, u) { check(await sb.from('redes_meses').update(mesRow(u)).eq('id', id)); }
// Fechas y novedades del mes (SQL 0033). Sin la columna devuelve false y la app las guarda solo en la sesión.
export async function mesInvestigacion(id, inv) {
  const { error } = await sb.from('redes_meses').update({ investigacion: inv }).eq('id', id);
  if (error) { if (/investigacion/.test(error.message || '')) return false; throw friendly(error); }
  return true;
}
export async function mesDel(id) { check(await sb.from('redes_meses').delete().eq('id', id)); }
export function piezaUI(z) {
  return { _id: z.id, mesId: z.mes_id, formato: z.formato || '', red: z.red || '', fecha: z.fecha || '', hora: z.hora ? String(z.hora).slice(0, 5) : '', tema: z.tema || '', copy: z.copy || '', hashtags: z.hashtags || '', contenido: z.contenido || '', extraCobro: z.extra_cobro || '', versiones: Array.isArray(z.versiones) ? z.versiones : [], fuentes: Array.isArray(z.fuentes) ? z.fuentes : [],
    estado: z.estado, extra: !!z.extra, ads: z.ads || '', fijo: z.fijo || '', resp: idx.personaAlias.get(z.responsable_id) || '', arte: Array.isArray(z.arte) ? z.arte : [], orden: z.orden || 0,
    horas: z.horas == null ? '' : +z.horas, respuesta: z.respuesta_cliente || '', respondida: z.respondida_at, creado: z.created_at, lista: !!z.lista };
}
function piezaRow(u) {
  const r = {};
  ['formato', 'red', 'tema', 'copy', 'hashtags', 'estado', 'extra', 'fijo', 'arte', 'orden'].forEach(k => { if (k in u) r[k] = u[k]; });
  if ('contenido' in u && cols.piezaContenido) r.contenido = u.contenido || '';
  if ('lista' in u && cols.piezaLista) r.lista = !!u.lista; // lista dentro de la etapa del mes (SQL 0036)
  if ('fuentes' in u && cols.piezaFuentes) r.fuentes = Array.isArray(u.fuentes) ? u.fuentes.slice(0, 8) : []; // de dónde salió el dato (SQL 0034)
  if ('versiones' in u && cols.piezaVersiones) r.versiones = Array.isArray(u.versiones) ? u.versiones.slice(0, 10) : []; // lo anterior a los cambios de Mr. Piggy (SQL 0033)
  if ('extraCobro' in u && cols.piezaExtraCobro) r.extra_cobro = ['si', 'no'].includes(u.extraCobro) ? u.extraCobro : ''; // pieza extra: '' según la cuenta · si · no (SQL 0032) // lo que va en la pieza: slides, texto de la placa, guion (SQL 0031)
  if ('ads' in u && cols.piezaAds) r.ads = u.ads || ''; // '' = del plan · 'tambien' = del plan y también se pauta · 'solo' = solo para Ads (SQL 0028)
  if ('fecha' in u) r.fecha = u.fecha || null;
  if ('hora' in u) r.hora = u.hora || null;
  if ('resp' in u) r.responsable_id = u.resp ? (idx.personaId.get(u.resp) || null) : null;
  if ('horas' in u) r.horas = u.horas === '' || u.horas == null ? null : +u.horas;
  if ('respuesta' in u) r.respuesta_cliente = u.respuesta;
  return r;
}
export async function piezasDe(mesIds) {
  const ids = Array.isArray(mesIds) ? mesIds : [mesIds]; if (!ids.length) return [];
  const rows = check(await sb.from('piezas').select('*').in('mes_id', ids).order('fecha', { nullsFirst: false }).order('orden').limit(10000)) || [];
  if (rows.length) { cols.piezaAds = 'ads' in rows[0]; cols.piezaContenido = 'contenido' in rows[0]; cols.piezaExtraCobro = 'extra_cobro' in rows[0]; cols.piezaVersiones = 'versiones' in rows[0]; cols.piezaFuentes = 'fuentes' in rows[0]; cols.piezaLista = 'lista' in rows[0]; }
  return rows.map(piezaUI);
}
// Si falta correr un SQL (0031 contenido, 0032 extra_cobro), la pieza se guarda igual sin ese campo.
function sinColumna(err) {
  const m = (err && err.message) || '';
  if (cols.piezaContenido && /contenido/.test(m)) { cols.piezaContenido = false; return true; }
  if (cols.piezaExtraCobro && /extra_cobro/.test(m)) { cols.piezaExtraCobro = false; return true; }
  if (cols.piezaVersiones && /versiones/.test(m)) { cols.piezaVersiones = false; return true; }
  if (cols.piezaFuentes && /fuentes/.test(m)) { cols.piezaFuentes = false; return true; }
  if (cols.piezaLista && /lista/.test(m)) { cols.piezaLista = false; return true; }
  return false;
}
export async function piezasIns(mes, lista) {
  if (!lista.length) return [];
  const fila = () => lista.map((u, i) => ({ mes_id: mes._id, cliente_id: mes.clienteId || idx.clienteId.get(mes.cliente), estado: 'Idea', orden: i, ...piezaRow(u) }));
  let res = await sb.from('piezas').insert(fila()).select();
  // Sin la columna "contenido" (falta el SQL 0031) se guarda igual, sin ese campo.
  for (let i = 0; i < 6 && res.error && sinColumna(res.error); i++) res = await sb.from('piezas').insert(fila()).select();
  return (check(res) || []).map(piezaUI);
}
export async function piezasUpd(ids, u) {
  let r = piezaRow(u); if (!Object.keys(r).length || !ids.length) return;
  let res = await sb.from('piezas').update(r).in('id', ids);
  for (let i = 0; i < 6 && res.error && sinColumna(res.error); i++) { r = piezaRow(u); if (!Object.keys(r).length) return; res = await sb.from('piezas').update(r).in('id', ids); }
  check(res);
}
export async function piezasDel(ids) { if (ids.length) check(await sb.from('piezas').delete().in('id', ids)); }

/* ---------- Registro de horas (el reloj de arriba) ---------- */
const horaUI = x => ({ _id: x.id, fecha: x.fecha, persona: idx.personaAlias.get(x.persona_id) || '', personaId: x.persona_id, cliente: idx.clienteName.get(x.cliente_id) || '', clienteId: x.cliente_id,
  proyectoId: x.proyecto_id, abonoId: x.abono_id, pedidoId: x.pedido_id, minutos: +x.minutos || 0, nota: x.nota || '', creado: x.created_at });
// Lo mío de un día. null si todavía no se corrió el SQL 0017.
export async function horasDia(personaId, fecha) {
  const r = await tolerante(sb.from('horas').select('*').eq('persona_id', personaId).eq('fecha', fecha).order('created_at'));
  return r ? r.map(horaUI) : null;
}
export async function horasCargar(filas) {
  const rows = filas.map(f => ({ fecha: f.fecha, cliente_id: f.cliente ? (idx.clienteId.get(f.cliente) || null) : null, proyecto_id: f.proyectoId || null, abono_id: f.abonoId || null, pedido_id: f.pedidoId || null, minutos: Math.round(f.minutos), nota: String(f.nota || '').slice(0, 1000) }));
  if (rows.length) check(await sb.from('horas').insert(rows));
}
export async function horaBorrar(id) { check(await sb.from('horas').delete().eq('id', id)); }
// Minutos por ticket (para la columna de Tickets).
export async function horasPorPedido() {
  const r = await tolerante(sb.from('horas').select('pedido_id, minutos').not('pedido_id', 'is', null).limit(20000));
  if (!r) return null; const m = new Map(); r.forEach(x => m.set(x.pedido_id, (m.get(x.pedido_id) || 0) + (+x.minutos || 0))); return m;
}

/* ---------- Horas del año (para saber cuánto deja cada cliente de verdad) ---------- */
// Tareas vienen con los proyectos; acá van piezas, meses de redes y tickets. Tolerante: si falta una tabla, viene vacía.
export const horasAnio = y => horasRango(y + '-01-01', y + '-12-31');
// Horas de un período (desde y hasta, inclusive).
export async function horasRango(desde, hasta) {
  const d = desde, hd = new Date(hasta + 'T12:00:00Z'); hd.setUTCDate(hd.getUTCDate() + 1); const h = hd.toISOString().slice(0, 10), cn = id => idx.clienteName.get(id) || '';
  const [pz, rm, pd, hh] = await Promise.all([
    tolerante(sb.from('piezas').select('cliente_id, horas, extra').gte('created_at', d).lt('created_at', h).limit(50000)),
    tolerante(sb.from('redes_meses').select('cliente_id, horas, mes').gte('mes', d).lt('mes', h)),
    tolerante(sb.from('pedidos').select('cliente_id, horas, cobro, created_at').gte('created_at', d).lt('created_at', h)),
    tolerante(sb.from('horas').select('cliente_id, proyecto_id, abono_id, pedido_id, persona_id, minutos, fecha').gte('fecha', d).lt('fecha', h).limit(50000)),
  ]);
  return { y: desde + '|' + hasta,
    piezas: (pz || []).map(x => ({ cliente: cn(x.cliente_id), horas: +x.horas || 0, extra: !!x.extra })),
    meses: (rm || []).map(x => ({ cliente: cn(x.cliente_id), horas: +x.horas || 0, mes: String(x.mes).slice(0, 7) })),
    pedidos: (pd || []).map(x => ({ cliente: cn(x.cliente_id), horas: +x.horas || 0, cobro: x.cobro })),
    registro: (hh || []).map(x => ({ cliente: cn(x.cliente_id), proyectoId: x.proyecto_id, abonoId: x.abono_id, pedidoId: x.pedido_id, persona: idx.personaAlias.get(x.persona_id) || '', horas: (+x.minutos || 0) / 60, fecha: x.fecha })) };
}

export async function perfilGuardar(u) { const { error } = await sb.rpc('mi_perfil_guardar', { p_nombre: u.nombre || '', p_puesto: u.puesto || '', p_tel: u.tel || '', p_prefs: u.prefs || {} }); if (error) throw new Error(error.message); }
export async function marcaGuardar(id, marca) { check(await sb.from('clientes').update({ marca }).eq('id', id)); }

/* ---------- Informes de redes ---------- */
export function informeUI(x) {
  return { _id: x.id, cliente: idx.clienteName.get(x.cliente_id) || '', clienteId: x.cliente_id, mes: String(x.mes || '').slice(0, 7), datos: x.datos || {}, texto: x.texto || '', estado: x.estado, publicadoAt: x.publicado_at, enviadoAt: x.enviado_at, actualizado: x.updated_at };
}
// Los del cliente, del más nuevo al más viejo (para comparar con el mes anterior).
export async function informesDe(cliente) {
  const cid = idx.clienteId.get(cliente); if (!cid) return [];
  return (check(await sb.from('informes_redes').select('*').eq('cliente_id', cid).order('mes', { ascending: false }).limit(24)) || []).map(informeUI);
}
export async function informeGuardar(id, u, cliente, mes) {
  const r = {};
  ['datos', 'texto', 'estado'].forEach(k => { if (k in u) r[k] = u[k]; });
  if ('publicadoAt' in u) r.publicado_at = u.publicadoAt;
  if ('enviadoAt' in u) r.enviado_at = u.enviadoAt;
  if (id) { check(await sb.from('informes_redes').update(r).eq('id', id)); return id; }
  return check(await sb.from('informes_redes').upsert({ cliente_id: idx.clienteId.get(cliente), mes: mes + '-01', ...r }, { onConflict: 'cliente_id,mes' }).select('id').single()).id;
}
// Seguimiento de un cliente: mails abiertos y clics, visitas al portal, PDFs vistos o bajados, presupuestos abiertos.
/** Mails que se le mandaron a un cliente desde la app (los admins ven todos; el equipo, sus mensajes). null = no se pudo leer. */
export async function mailsCliente(cliente) {
  const cid = idx.clienteId.get(cliente); if (!cid) return [];
  const { data, error } = await sb.from('emails').select('*').eq('cliente_id', cid).order('created_at', { ascending: false }).limit(200);
  if (error) { if (/42501|permission/i.test(error.code + ' ' + error.message)) return []; throw new Error(error.message); }
  return data || [];
}
export async function seguimientoDe(cliente) {
  const cid = idx.clienteId.get(cliente); if (!cid) return [];
  const { data, error } = await sb.from('seguimiento').select('id, created_at, tipo, ref, detalle, quien, email_id').eq('cliente_id', cid).order('created_at', { ascending: false }).limit(300);
  if (error) { if (/PGRST205|42P01|does not exist|Could not find/i.test(error.code + ' ' + error.message)) return null; throw new Error(error.message); }
  return data || [];
}
export async function informeDel(id) { check(await sb.from('informes_redes').delete().eq('id', id)); }

/* ---------- Tickets, briefs, entregas y sitios ---------- */
export function pedidoUI(x) {
  return { _id: x.id, numero: x.numero, cliente: idx.clienteName.get(x.cliente_id) || '', autor: x.autor_nombre || '', origen: x.origen, titulo: x.titulo, detalle: x.detalle || '', paraCuando: x.para_cuando || '',
    prio: x.prioridad || '', estado: x.estado, resp: idx.personaAlias.get(x.responsable_id) || '', horas: x.horas == null ? '' : +x.horas, cobro: x.cobro, monto: x.monto == null ? '' : +x.monto, moneda: x.moneda || 'ARS',
    facturado: !!x.facturado, respuesta: x.respuesta || '', proyectoId: x.proyecto_id, creado: x.created_at, cerrado: x.cerrado_at, deCliente: !!x.contacto_id };
}
function pedidoRow(u) {
  const r = {};
  ['origen', 'titulo', 'detalle', 'estado', 'cobro', 'moneda', 'facturado', 'respuesta'].forEach(k => { if (k in u) r[k] = u[k]; });
  if ('cliente' in u) r.cliente_id = idx.clienteId.get(u.cliente) || null;
  if ('paraCuando' in u) r.para_cuando = u.paraCuando || null;
  if ('prio' in u) r.prioridad = u.prio || '';
  if ('resp' in u) r.responsable_id = u.resp ? (idx.personaId.get(u.resp) || null) : null;
  if ('horas' in u) r.horas = u.horas === '' || u.horas == null ? null : +u.horas;
  if ('monto' in u) r.monto = u.monto === '' || u.monto == null ? null : +u.monto;
  if ('proyectoId' in u) r.proyecto_id = u.proyectoId || null;
  return r;
}
export async function pedidoGuardar(id, u) {
  if (id) { check(await sb.from('pedidos').update(pedidoRow(u)).eq('id', id)); return id; }
  return check(await sb.from('pedidos').insert({ origen: 'equipo', ...pedidoRow(u) }).select('id').single()).id;
}
export async function pedidosUpd(ids, u) { if (ids.length) check(await sb.from('pedidos').update(pedidoRow(u)).in('id', ids)); }
export async function pedidoDel(id) { check(await sb.from('pedidos').delete().eq('id', id)); }
export function briefUI(b) {
  return { _id: b.id, cliente: idx.clienteName.get(b.cliente_id) || '', proyectoId: b.proyecto_id, tipo: b.tipo || '', form: b.form_nombre || '', formId: b.form_id, respondido: b.respondido_at || b.created_at,
    respuestas: Array.isArray(b.respuestas) ? b.respuestas : [], email: b.email || '', empresa: b.empresa || '', nombre: b.nombre || '', pdf: b.pdf_url || '', preview: b.preview_url || '', resumen: b.resumen || null, estado: b.estado };
}
export async function briefUpd(id, u) {
  const r = {};
  if ('cliente' in u) r.cliente_id = u.cliente ? (idx.clienteId.get(u.cliente) || null) : null;
  if ('proyectoId' in u) r.proyecto_id = u.proyectoId || null;
  ['tipo', 'estado', 'resumen'].forEach(k => { if (k in u) r[k] = u[k]; });
  check(await sb.from('briefs').update(r).eq('id', id));
}
export function entregaUI(e) {
  return { _id: e.id, proyectoId: e.proyecto_id, cliente: idx.clienteName.get(e.cliente_id) || '', tipo: e.tipo, titulo: e.titulo || '', descripcion: e.descripcion || '', links: Array.isArray(e.links) ? e.links : [],
    archivos: Array.isArray(e.archivos) ? e.archivos : [], estado: e.estado, enviadaAt: e.enviada_at, respondidaAt: e.respondida_at, aprobadoPor: e.aprobado_por || '', respuesta: e.respuesta || '', orden: e.orden || 0, creado: e.created_at };
}
export async function entregaGuardar(id, u, proyecto) {
  const r = {};
  ['tipo', 'titulo', 'descripcion', 'links', 'archivos', 'estado', 'orden'].forEach(k => { if (k in u) r[k] = u[k]; });
  if ('enviadaAt' in u) r.enviada_at = u.enviadaAt;
  if (id) { check(await sb.from('entregas').update(r).eq('id', id)); return id; }
  return check(await sb.from('entregas').insert({ proyecto_id: proyecto._id, cliente_id: idx.clienteId.get(proyecto.cliente), ...r }).select('id').single()).id;
}
export async function entregaDel(id) { check(await sb.from('entregas').delete().eq('id', id)); }
export function sitioUI(x) { return { _id: x.id, proyectoId: x.proyecto_id, preview: x.url_preview || '', prod: x.url_prod || '', etapa: x.etapa || '', checklist: Array.isArray(x.checklist) ? x.checklist : [], accesos: x.accesos || '', notas: x.notas || '', visible: x.visible_cliente !== false }; }
export async function sitioGuardar(id, u, proyecto) {
  const r = { url_preview: u.preview || '', url_prod: u.prod || '', etapa: u.etapa || '', checklist: u.checklist || [], accesos: u.accesos || '', notas: u.notas || '', visible_cliente: u.visible !== false };
  if (id) { check(await sb.from('sitios').update(r).eq('id', id)); return id; }
  return check(await sb.from('sitios').insert({ proyecto_id: proyecto._id, cliente_id: idx.clienteId.get(proyecto.cliente), ...r }).select('id').single()).id;
}

function tolerante(q) { return q.then(r => (r.error ? null : r.data || []), () => null); }
// Tarea en la forma que usa la interfaz (la misma que tenían en proyectos.etapas, más id, etapa, horas y plazo).
function tareaUI(t) {
  return { _id: t.id, n: t.titulo, ok: !!t.hecha, est: t.en_curso ? 'curso' : '', resp: idx.personaAlias.get(t.responsable_id) || '', fecha: t.fecha || '', prio: t.prioridad || '', nota: t.nota || '',
    etapa: t.etapa || '', horas: t.horas == null ? '' : +t.horas, plazo: t.plazo_dias == null ? '' : t.plazo_dias, hechaPor: idx.personaAlias.get(t.hecha_por) || '', hechaAt: t.hecha_at || '' };
}
const tareaRow = x => ({ titulo: String(x.n || '').slice(0, 300), hecha: !!x.ok, en_curso: !x.ok && x.est === 'curso', responsable_id: x.resp ? (idx.personaId.get(x.resp) || null) : null,
  fecha: x.fecha || null, prioridad: x.prio || '', nota: x.nota || '', etapa: x.etapa || '', horas: x.horas === '' || x.horas == null ? null : +x.horas, plazo_dias: x.plazo === '' || x.plazo == null ? null : Math.round(+x.plazo) });
// Guarda solo lo que cambió (así dos personas tocando tareas distintas del mismo proyecto no se pisan).
export async function tareasSync(pid, prev, next) {
  const antes = new Map((prev || []).filter(x => x && x._id).map((x, i) => [x._id, { x, i: (prev || []).indexOf(x) }]));
  const quedan = new Set(next.filter(x => x._id).map(x => x._id));
  const borrar = [...antes.keys()].filter(id => !quedan.has(id));
  if (borrar.length) check(await sb.from('tareas').delete().in('id', borrar));
  const nuevas = [], nuevasRef = [];
  for (let i = 0; i < next.length; i++) {
    const x = next[i], row = { ...tareaRow(x), orden: i };
    if (!x._id) { nuevas.push({ ...row, proyecto_id: pid }); nuevasRef.push(x); continue; }
    const a = antes.get(x._id), ra = a ? { ...tareaRow(a.x), orden: a.i } : null;
    const patch = {}; for (const k of Object.keys(row)) if (!ra || JSON.stringify(row[k]) !== JSON.stringify(ra[k])) patch[k] = row[k];
    if (Object.keys(patch).length) check(await sb.from('tareas').update(patch).eq('id', x._id));
  }
  if (nuevas.length) { const ins = check(await sb.from('tareas').insert(nuevas).select('id')) || []; ins.forEach((r, j) => { if (nuevasRef[j]) nuevasRef[j]._id = r.id; }); }
}
export async function tareaPatch(id, x) { check(await sb.from('tareas').update(tareaRow(x)).eq('id', id)); }
export async function guardarFlujo(tipo, f) { check(await sb.from('flujos').upsert({ tipo, etapas: f.etapas || [], reglas: f.reglas || {} })); }
// Comentarios y avisos
export async function comentarios(entidad, id) {
  const rows = check(await sb.from('comentarios').select('*').eq('entidad', entidad).eq('entidad_id', id).order('created_at').limit(500)) || [];
  return rows.map(comUI);
}
export function comUI(c) { return { _id: c.id, entidad: c.entidad, entidadId: c.entidad_id, autor: idx.personaAlias.get(c.autor_id) || c.autor_nombre || '', autorId: c.autor_id, deCliente: !!c.autor_contacto_id, texto: c.texto, interno: c.interno, creado: c.created_at, editado: c.editado_at, contactos: c.menciones_contactos || [], pedido: !!c.pedido, resuelto: c.resuelto_at || null, resueltoPor: idx.personaAlias.get(c.resuelto_por) || '' }; }
// Pedidos de cambio de los clientes (comentarios con pedido = true). null si falta el SQL 0039.
export const sinPrefijo = t => String(t || '').replace(/^Pidió cambios:\s*/i, '').replace(/^Anotamos tu pedido:\s*/i, '');
export async function pedidosAbiertos() {
  const rows = await tolerante(sb.from('comentarios').select('*').eq('pedido', true).is('resuelto_at', null).order('created_at').limit(400));
  return rows ? rows.map(c => ({ ...comUI(c), cliente: idx.clienteName.get(c.cliente_id) || '' })) : null;
}
export async function piezasPorId(ids) { if (!ids.length) return []; const rows = await tolerante(sb.from('piezas').select('*').in('id', ids)); return (rows || []).map(piezaUI); }
export async function pedidoResolver(id, hecho = true) { check(await sb.rpc('pedido_resolver', { p_id: id, p_hecho: hecho })); }
export async function comentar(row) {
  const fila = () => ({ entidad: row.entidad, entidad_id: row.id, cliente_id: row.clienteId ? (idx.clienteId.get(row.clienteId) || row.clienteId) : null, proyecto_id: row.proyectoId || null, texto: row.texto, menciones: (row.menciones || []).map(a => idx.personaId.get(a)).filter(Boolean), interno: row.interno !== false, ...(row.pedido ? { pedido: true } : {}), ...((row.contactos || []).length && cols.comentContactos ? { menciones_contactos: row.contactos } : {}) });
  let res = await sb.from('comentarios').insert(fila()).select().single();
  // Sin la columna de menciones a contactos (falta el SQL 0041) se guarda igual; el mail al contacto sale de todos modos.
  if (res.error && cols.comentContactos && /menciones_contactos/.test(res.error.message || '')) { cols.comentContactos = false; res = await sb.from('comentarios').insert(fila()).select().single(); }
  return comUI(check(res));
}
// Lo que escribieron los contactos de un cliente desde el portal (comentarios, aprobaciones y pedidos de cambio).
export async function comentariosDeCliente(cliente) {
  const id = idx.clienteId.get(cliente); if (!id) return [];
  const rows = check(await sb.from('comentarios').select('*').eq('cliente_id', id).not('autor_contacto_id', 'is', null).order('created_at', { ascending: false }).limit(150)) || [];
  return rows.map(c => ({ ...comUI(c), proyectoId: c.proyecto_id }));
}
export async function borrarComentario(id) { check(await sb.from('comentarios').delete().eq('id', id)); }
export async function leerAvisos(ids) { if (ids.length) check(await sb.from('notificaciones').update({ leida: true }).in('id', ids)); }
export async function avisos() { return tolerante(sb.from('notificaciones').select('*').order('created_at', { ascending: false }).limit(80)).then(rows => rows ? rows.map(n => ({ _id: n.id, tipo: n.tipo, titulo: n.titulo, cuerpo: n.cuerpo, link: n.link, leida: n.leida, actor: idx.personaAlias.get(n.actor_id) || '', creado: n.created_at })) : null); }
/* ---------- Mantenimiento (solo admins): copia de seguridad, borrar datos de prueba, errores ---------- */
export const TABLAS_BACKUP = ['personas', 'listas', 'ajustes', 'plan_cuentas', 'cajas', 'colaboradores', 'lotes_aumento', 'remuneraciones', 'conceptos_fijos', 'flujos',
  'clientes', 'clientes_admin', 'contactos', 'cliente_responsables', 'abonos', 'abono_responsables', 'abono_finanzas', 'precios_abono',
  'proyectos', 'proyecto_responsables', 'proyecto_finanzas', 'proyecto_facturacion', 'tareas', 'comunicaciones', 'propuestas',
  'resumenes', 'facturas', 'movimientos', 'imputaciones', 'liquidaciones', 'comprobantes_pago', 'gestiones', 'drive_archivos', 'emails',
  'redes_meses', 'piezas', 'entregas', 'sitios', 'pedidos', 'briefs', 'informes_redes', 'comentarios', 'horas'];
export async function backup(onProg) {
  const out = {};
  for (const [i, t] of TABLAS_BACKUP.entries()) {
    if (onProg) onProg(i + 1, TABLAS_BACKUP.length, t);
    const rows = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await sb.from(t).select('*').range(from, from + 999);
      if (error) { if (!rows.length) out[t] = { error: error.message }; break; }
      rows.push(...(data || [])); if (!data || data.length < 1000) break;
    }
    if (!out[t]) out[t] = rows;
  }
  return out;
}
// Restaurar una copia: tabla por tabla, en el mismo orden de la copia (primero lo que otros usan), de a 400 registros.
export async function restaurar(tablas, onProg) {
  const res = [], lista = TABLAS_BACKUP.filter(t => Array.isArray(tablas[t]) && tablas[t].length);
  for (const [i, t] of lista.entries()) {
    const rows = tablas[t]; let n = 0, err = '';
    for (let k = 0; k < rows.length; k += 400) {
      if (onProg) onProg(i + 1, lista.length, t, k, rows.length);
      const { data, error } = await sb.rpc('restaurar_tabla', { p_tabla: t, p_filas: rows.slice(k, k + 400) });
      if (error) { err = /restaurar_tabla|function/.test(error.message) && /not find|does not exist|schema cache/i.test(error.message) ? 'Falta correr el SQL 0019 en Supabase' : error.message; break; }
      n += data || 0;
    }
    res.push({ tabla: t, total: rows.length, n, error: err });
    if (err === 'Falta correr el SQL 0019 en Supabase') break;
  }
  return res;
}
export async function resetDatos(confirmacion) { const { data, error } = await sb.rpc('reset_datos', { confirmacion }); if (error) throw new Error(error.message); return data; }
export async function errores() { return tolerante(sb.from('errores').select('*').order('created_at', { ascending: false }).limit(200)).then(r => r ? r.map(x => ({ ...x, quien: idx.personaAlias.get(x.persona_id) || '' })) : null); }
export async function erroresBorrar() { check(await sb.from('errores').delete().not('id', 'is', null)); }
export async function logError(e) { try { await sb.from('errores').insert({ mensaje: String(e.mensaje || '').slice(0, 1900), detalle: String(e.detalle || '').slice(0, 7900), url: String(e.url || '').slice(0, 500), version: String(e.version || '') }); } catch (_) { /* nada */ } }

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
  // Si todavía no se corrió el SQL 0022, el cliente se guarda igual sin "Cliente desde".
  if (kind === 'cliente' && 'desde' in row && clienteSinDesde) delete row.desde;
  try { return await guardar(kind, id, ui, row, prevResp); }
  catch (e) {
    if (kind === 'cliente' && 'desde' in row && /desde/.test(e.message || '')) { clienteSinDesde = true; delete row.desde; return guardar(kind, id, ui, row, prevResp); }
    if (kind === 'abono' && 'redes' in row && /redes/.test((e.raw || e.message || ''))) { cols.abonoRedes = false; delete row.redes; return guardar(kind, id, ui, row, prevResp); }
    if (kind === 'comunicacion' && 'tema' in row && /tema|equipo/.test((e.raw || e.message || ''))) { cols.charlaTema = false; delete row.tema; delete row.equipo; return guardar(kind, id, ui, row, prevResp); }
    throw e;
  }
}
let clienteSinDesde = false;
async function guardar(kind, id, ui, row, prevResp) {
  let rid = id;
  if (id) check(await sb.from(T[kind].table).update(row).eq('id', id));
  else rid = check(await sb.from(T[kind].table).insert(row).select('id').single()).id;
  if ('responsables' in ui && JSON.stringify([...(ui.responsables || [])].sort()) !== JSON.stringify([...(prevResp || [])].sort())) await syncResp(kind, rid, ui.responsables, id ? prevResp : []);
  if (kind === 'abono' && ui.roles) await syncRoles(rid, ui.roles, ui.rolesPrev || {});
  return rid;
}
// Rol de cada persona en la cuenta (solo lo que cambió). Sin el SQL 0029 se guarda igual, sin roles.
export async function syncRoles(abonoId, roles, prev) {
  if (!cols.abonoRol) return;
  for (const [alias, rol] of Object.entries(roles)) {
    if ((prev[alias] || '') === (rol || '')) continue;
    const pid = idx.personaId.get(alias); if (!pid) continue;
    const { error } = await sb.from('abono_responsables').update({ rol: rol || '' }).eq('abono_id', abonoId).eq('persona_id', pid);
    if (error) { if (/rol/.test(error.message || '')) { cols.abonoRol = false; return; } throw new Error(error.message); }
  }
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
  const [ca, pr, pf, rs, fs, cj, pc, mv, gs, aj, em, pfz, abf, imp, co, rm, cf, lq, da, il, prop, seg, la, ep, ei, cxp, ctp] = await Promise.all([
    all('clientes_admin'), all('precios_abono'), all('proyecto_facturacion'), all('resumenes'), all('facturas_saldo'),
    all('cajas', q => q.order('orden')), all('plan_cuentas'), all('movimientos', q => q.order('fecha', { ascending: false })), all('gestiones'), all('ajustes'), all('emails', q => q.order('created_at', { ascending: false })), all('proyecto_finanzas'), all('abono_finanzas'), all('imputaciones'),
    opcional(all('colaboradores', q => q.order('nombre'))), opcional(all('remuneraciones')), opcional(all('conceptos_fijos')), opcional(all('liquidaciones')), opcional(all('drive_archivos', q => q.order('modificado', { ascending: false, nullsFirst: false }))),
    opcional(all('ia_log', q => q.gte('created_at', desdeMes.toISOString()))),
    opcional(all('propuestas', q => q.order('fecha', { ascending: false }))),
    opcional(all('seguimiento', q => q.not('email_id', 'is', null))),
    opcional(all('lotes_aumento', q => q.order('created_at', { ascending: false }))),
    opcional(all('envios_programados', q => q.order('enviar_el', { ascending: false }))),
    opcional(all('envios_items', q => q.select('id, envio_id, resumen_id, cliente_id, para, estado, error, huella'))),
    opcional(all('costos_acordados', q => q.order('created_at'))),
    opcional(all('contactos_proveedor', q => q.order('orden').order('created_at'))),
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
    // Seguimiento de cada mail: { abierto: n, primera, ultima, clics }
    SEGM: seg.reduce((m, r) => { const x = m.get(r.email_id) || { abierto: 0, clics: 0, primera: null, ultima: null }; if (r.tipo === 'mail_abierto') { x.abierto++; if (!x.primera || r.created_at < x.primera) x.primera = r.created_at; if (!x.ultima || r.created_at > x.ultima) x.ultima = r.created_at; } else x.clics++; m.set(r.email_id, x); return m; }, new Map()),
    PFZ: new Map(pfz.map(r => [r.proyecto_id, { ...r, presupuesto: num(r.presupuesto), inicio_cobro: month(r.inicio_cobro) }])),
    ABF: new Map(abf.map(r => [r.abono_id, { ...r, inversion: num(r.inversion) }])),
    IMP: imp.map(r => ({ ...r, monto: num(r.monto) || 0 })),
    CO: co.map(r => ({ ...r, persona: idx.personaAlias.get(r.persona_id) || '' })),
    RM: rm.map(r => ({ ...r, desde: month(r.desde), monto: num(r.monto), monto_anterior: num(r.monto_anterior), pct: num(r.pct), lote_id: r.lote_id || null })),
    LA: la.map(r => ({ ...r, desde: month(r.desde), valor: num(r.valor) })),
    EP: ep.map(r => ({ ...r, periodo: month(r.periodo) })),
    EI: ei,
    CXP: cxp.map(r => ({ ...r, monto: num(r.monto) || 0 })),
    CTP: ctp.map(r => ({ ...r, persona: idx.personaAlias.get(r.persona_id) || '' })),
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
/** Corre ya los envíos programados (los que estén confirmados y con la hora cumplida). */
export async function enviosCorrer() { const { data, error } = await sb.functions.invoke('envios', { body: { accion: 'correr' } }); if (error) throw new Error(error.message); return data; }
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
export async function ia(payload) {
  const { data, error } = await sb.functions.invoke(payload && payload.modo === 'ads_mail' ? 'ia-ads' : payload && /^redes_(ideas|copys|agenda|contenido|revision|investigar)$/.test(payload.modo || '') ? 'ia-redes' : 'ia', { body: payload });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch (e) { }
    if (/Failed to send a request|fetch/i.test(msg)) msg = 'No me pude conectar con la IA. Revisá tu conexión y probá de nuevo.';
    throw new Error(msg);
  }
  if (data && data.error) throw new Error(data.error);
  return data;
}
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
  if (kind === 'persona') check(await sb.rpc('avatar_persona', { pid: id, url }));
  else check(await sb.from('clientes').update({ avatar_url: url }).eq('id', id));
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
export async function rpc(fn, args) { return check(await sb.rpc(fn, args)); }
export async function sendLink(email) { check(await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin, shouldCreateUser: true } })); }
export async function logout() { await sb.auth.signOut(); }
export function onAuth(fn) { sb.auth.onAuthStateChange((ev, s) => fn(ev, s)); }

// ---------- Tiempo real ----------
// Cambios en vivo. Avisos y comentarios no recargan todo: van a su propio manejador.
const LIVE_APARTE = new Set(['notificaciones', 'comentarios', 'errores', 'piezas']);
export function live(onChange, onStatus, onAparte) {
  let t;
  return sb.channel('ops').on('postgres_changes', { event: '*', schema: 'public' }, ev => {
    if (ev && LIVE_APARTE.has(ev.table)) { if (onAparte) onAparte(ev.table, ev); return; }
    clearTimeout(t); t = setTimeout(onChange, 350);
  }).subscribe(s => onStatus && onStatus(s));
}

// Cuentas de las integraciones (solo admins). Las claves van al servidor y nunca vuelven: solo cuenta y últimos caracteres.
export async function credenciales(payload) {
  const { data, error } = await sb.functions.invoke('credenciales', { body: payload });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch (e) { }
    if (/Failed to send a request|fetch/i.test(msg)) msg = 'No se pudo conectar con el servidor. Revisá tu conexión.';
    throw new Error(msg);
  }
  if (data && data.error) throw new Error(data.error);
  return data;
}

// Edge Functions nuevas (0016): avisos (Slack y resumen diario), dropbox (carpetas, subidas, miniaturas) y tally (briefs).
async function invocar(fn, payload, sinConexion) {
  const { data, error } = await sb.functions.invoke(fn, { body: payload });
  if (error) {
    let msg = error.message;
    try { const j = await error.context.json(); if (j && j.error) msg = j.error; } catch (e) { }
    if (/Failed to send a request|fetch/i.test(msg)) msg = sinConexion || 'No se pudo conectar con el servidor. Revisá tu conexión.';
    throw new Error(msg);
  }
  if (data && data.error) throw new Error(data.error);
  return data;
}
export const avisosFn = payload => invocar('avisos', payload);
// Avisa a personas del equipo (campanita y Slack). Devuelve false si falta el SQL 0035.
// Uso de la IA desde una fecha (para estimar el gasto). Solo admins pueden leer el registro.
export async function iaUsos(desde) {
  const { data, error } = await sb.from('ia_log').select('accion, modelo, tokens_in, tokens_out, ok, created_at').gte('created_at', desde).limit(20000);
  if (error) throw friendly(error); return data || [];
}
export async function avisarEquipo(alias, tipo, titulo, cuerpo, link) {
  const ids = [...new Set((alias || []).map(a => idx.personaId.get(a)).filter(Boolean))]; if (!ids.length) return 0;
  const { data, error } = await sb.rpc('avisar_equipo', { p_personas: ids, p_tipo: tipo || '', p_titulo: titulo || '', p_cuerpo: cuerpo || '', p_link: link || '' });
  if (error) { if (/avisar_equipo|function/i.test(error.message || '')) return false; throw friendly(error); }
  return data || 0;
}
// Automatizaciones (0018): reglas prendidas/apagadas y su configuración. null = falta el SQL.
export async function autoLista() {
  const { data, error } = await sb.from('automatizaciones').select('clave, activa, config, ultima_corrida, ultimo_resultado');
  if (error) { if (/automatizaciones|relation|schema cache/i.test(error.message)) return null; throw new Error(error.message); }
  return data || [];
}
export async function autoGuardar(clave, activa, config) { check(await sb.from('automatizaciones').upsert({ clave, activa: !!activa, config: config || {} }, { onConflict: 'clave' })); }
export const autoProbar = clave => invocar('automatizar', { accion: 'probar', clave }, 'No se pudo correr la automatización.');
export const dropbox = payload => invocar('dropbox', payload, 'No se pudo conectar con Dropbox. Revisá tu conexión.');
export const tally = payload => invocar('tally', payload, 'No se pudo conectar con Tally. Revisá tu conexión.');
