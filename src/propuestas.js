// Propuestas y presupuestos: borrador con IA, PDF, link privado para el cliente y conversión en proyecto. Solo admins.
import * as data from './data.js';
import * as E from './emails.js';
import './propuesta.css';
import { propuestaHTML, totalDe, subtotal, PLANES, venceEl } from './propuesta-vista.js';
import { confirmar } from './dialogo.js';

const ESTADOS = ['Borrador', 'Enviada', 'Aceptada', 'Rechazada', 'Vencida'];
const EST_COLOR = { Borrador: '--s-empezar', Enviada: '--s-curso', Aceptada: '--s-entregado', Rechazada: '--s-cancelado', Vencida: '--s-revision' };
const lineas = v => (Array.isArray(v) ? v : String(v || '').split('\n')).map(x => String(x).trim()).filter(Boolean);
// Presupuesto: mismo circuito (link, PDF, aceptar, pasar a proyecto) pero es el detalle de precios, sin la pieza narrativa.
const esPre = d => !!d && d.clase === 'Presupuesto';
const palabra = d => esPre(d) ? 'presupuesto' : 'propuesta';
const Palabra = d => esPre(d) ? 'Presupuesto' : 'Propuesta';
const la = d => esPre(d) ? 'el presupuesto' : 'la propuesta';
const estadoTxt = (e, d) => esPre(d) ? ({ Enviada: 'Enviado', Aceptada: 'Aceptado', Rechazada: 'Rechazado', Vencida: 'Vencido' }[e] || e) : e;
const token = () => { const a = new Uint8Array(24); crypto.getRandomValues(a); return [...a].map(b => b.toString(16).padStart(2, '0')).join(''); };

export function initPropuestas(ctx, k) {
  const { S, esc, opt, optsFrom, pill, fmt, thisMonth, today, cmp, emptyBox, toast, $ } = ctx;
  const { AD, money, parseMonto, r2, add, multi, cap } = k;
  AD.pz = { sel: null, d: null, f: 'abiertas', c: 'todo', ia: null, busy: false, dirty: false };
  const linkDe = p => p && p.token ? location.origin + '/p/' + p.token : '';
  const estilo = () => ((AD.AJ && AD.AJ.documentos) || {}).estilo || 'editorial';
  const clienteDe = p => p.cliente_id ? data.ids.clienteName(p.cliente_id) : '';
  const nombreDe = p => clienteDe(p) || p.prospecto || 'Sin cliente';
  const efectivo = p => p.estado === 'Enviada' && p.fecha && venceEl(p) < today() ? 'Vencida' : p.estado;

  /* ---------- lista ---------- */
  function vLista() {
    const y = thisMonth().slice(0, 4), L = AD.PROP || [];
    const env = L.filter(p => efectivo(p) === 'Enviada'), acA = L.filter(p => p.estado === 'Aceptada' && String(p.fecha).startsWith(y)), reA = L.filter(p => p.estado === 'Rechazada' && String(p.fecha).startsWith(y));
    const sinVer = env.filter(p => !p.vista_el).length, tasa = acA.length + reA.length ? Math.round(acA.length / (acA.length + reA.length) * 100) : null;
    const sum = xs => multi(xs.reduce((a, p) => add(a, p.moneda, Number(p.total) || 0), {}));
    const F = { abiertas: p => ['Borrador', 'Enviada', 'Vencida'].includes(efectivo(p)), aceptadas: p => p.estado === 'Aceptada', rechazadas: p => p.estado === 'Rechazada', todas: () => true }[AD.pz.f];
    const C = AD.pz.c === 'todo' ? () => true : p => (p.clase || 'Propuesta') === AD.pz.c;
    const ls = L.filter(F).filter(C).sort((a, b) => String(b.fecha).localeCompare(a.fecha) || String(b.numero).localeCompare(a.numero));
    let h = '<div class="head"><div><h1>Propuestas y presupuestos</h1><p>La <b>propuesta</b> cuenta el proyecto (contexto, alcance, etapas e inversión); el <b>presupuesto</b> es el detalle de precios y condiciones. La IA ayuda con los dos y el cliente los acepta con un link.</p></div><div class="toolbar"><button class="btn" data-act="pzNueva" data-clase="Presupuesto">+ Presupuesto</button><button class="btn primary" data-act="pzNueva" data-clase="Propuesta">+ Propuesta</button></div></div>';
    h += '<section class="kpis">' +
      '<div class="kpi"><span class="eyebrow">Esperando respuesta</span><b>' + env.length + '</b><span>' + esc(env.length ? sum(env) : 'nada enviado') + '</span></div>' +
      '<div class="kpi ' + (sinVer ? 'warn' : '') + '"><span class="eyebrow">Sin abrir</span><b>' + sinVer + '</b><span>enviadas que el cliente todavía no vio</span></div>' +
      '<div class="kpi"><span class="eyebrow">Aceptadas en ' + y + '</span><b>' + acA.length + '</b><span>' + esc(acA.length ? sum(acA) : '—') + '</span></div>' +
      '<div class="kpi"><span class="eyebrow">Tasa de aceptación</span><b>' + (tasa == null ? '—' : tasa + '%') + '</b><span>' + (acA.length + reA.length) + ' respondidas en ' + y + '</span></div></section>';
    h += '<div class="toolbar"><div class="seg" role="group" aria-label="Documento">' + [['todo', 'Todo'], ['Propuesta', 'Propuestas'], ['Presupuesto', 'Presupuestos']].map(([kk, l]) => '<button data-act="pzC" data-v="' + kk + '" aria-pressed="' + (AD.pz.c === kk) + '">' + l + '</button>').join('') + '</div>' +
      '<div class="seg" role="group" aria-label="Estado">' + [['abiertas', 'En curso'], ['aceptadas', 'Aceptados'], ['rechazadas', 'Rechazados'], ['todas', 'Todos']].map(([kk, l]) => '<button data-act="pzF" data-v="' + kk + '" aria-pressed="' + (AD.pz.f === kk) + '">' + l + '</button>').join('') + '</div></div>';
    if (!ls.length) return h + '<section class="sheet">' + emptyBox(L.length ? 'Nada en este filtro' : 'Todavía no hay propuestas ni presupuestos', L.length ? '' : '“+ Presupuesto” para pasar precios rápido; “+ Propuesta” para la pieza completa con la IA.') + '</section>';
    return h + '<section class="sheet"><div class="tbl"><table><thead><tr><th>Número</th><th>Para</th><th>Documento</th><th class="r">Total</th><th>Estado</th><th>Fecha</th></tr></thead><tbody>' +
      ls.map(p => { const ef = efectivo(p), r = p.respuesta || {};
        return '<tr class="click" data-act="pzAbrir" data-id="' + esc(p.id) + '"><td class="mono">' + esc(p.numero || '—') + '</td><td class="name">' + esc(nombreDe(p)) + (p.cliente_id ? '' : ' <span class="tag">prospecto</span>') + '</td>' +
          '<td>' + esc(p.titulo || 'Sin título') + '<span class="sub">' + esc([Palabra(p), p.tipo].filter(Boolean).join(' · ')) + '</span></td><td class="r"><span class="money">' + money(Number(p.total) || 0, p.moneda) + '</span></td>' +
          '<td>' + pill(estadoTxt(ef, p), EST_COLOR[ef]) + (p.vista_el ? '<span class="sub">visto ' + fmt(String(p.vista_el).slice(0, 10)) + '</span>' : ef === 'Enviada' ? '<span class="sub">sin abrir</span>' : '') + (r.accion === 'Consulta' && p.estado === 'Enviada' ? '<span class="sub" style="color:var(--warn)">Consulta: ' + esc(String(r.comentario || '').slice(0, 60)) + '</span>' : '') + '</td>' +
          '<td class="mono">' + fmt(String(p.fecha).slice(0, 10)) + '</td></tr>'; }).join('') + '</tbody></table></div><div class="count">' + ls.length + (ls.length === 1 ? ' documento' : ' documentos') + '</div></section>';
  }

  /* ---------- editor ---------- */
  function nueva(preset = {}) {
    return { id: null, numero: '', clase: preset.clase || 'Propuesta', cliente: preset.cliente || '', prospecto: '', contacto: '', email: '', titulo: preset.titulo || '', tipo: preset.tipo || '', estado: 'Borrador', fecha: today(), validez_dias: 15, moneda: 'ARS',
      items: [{ concepto: '', detalle: '', monto: '' }], descuento: 0, plan_pago: '50/50', contenido: { intro: '', objetivo: '', alcance: '', etapas: [], entregables: '', no_incluye: '', condiciones: '' }, brief: preset.brief || '', notas: '', token: null, respuesta: null, proyecto_id: null };
  }
  function desdeFila(p) {
    const c = p.contenido || {};
    return { ...p, clase: p.clase || 'Propuesta', cliente: clienteDe(p), items: (p.items || []).map(i => ({ concepto: i.concepto || '', detalle: i.detalle || '', monto: i.monto == null ? '' : String(i.monto) })),
      contenido: { intro: c.intro || '', objetivo: c.objetivo || '', alcance: lineas(c.alcance).join('\n'), etapas: (c.etapas || []).map(e => ({ nombre: e.nombre || '', semanas: e.semanas == null ? '' : String(e.semanas), detalle: e.detalle || '' })), entregables: lineas(c.entregables).join('\n'), no_incluye: lineas(c.no_incluye).join('\n'), condiciones: c.condiciones || '' } };
  }
  // la versión "limpia" que se guarda, se muestra y se imprime
  function limpia(d) {
    const items = d.items.filter(i => i.concepto.trim() || parseMonto(i.monto)).map(i => ({ concepto: i.concepto.trim(), detalle: i.detalle.trim(), monto: parseMonto(i.monto) || 0 }));
    const c = d.contenido;
    const out = { ...d, items, descuento: parseMonto(d.descuento) || 0, validez_dias: parseInt(d.validez_dias, 10) || 15,
      contenido: { intro: c.intro.trim(), objetivo: c.objetivo.trim(), alcance: lineas(c.alcance), etapas: c.etapas.filter(e => e.nombre.trim()).map(e => ({ nombre: e.nombre.trim(), semanas: parseMonto(e.semanas) || null, detalle: e.detalle.trim() })), entregables: lineas(c.entregables), no_incluye: lineas(c.no_incluye), condiciones: c.condiciones.trim() } };
    out.total = r2(totalDe(out)); out.cliente = d.cliente || ''; return out;
  }
  const preview = () => propuestaHTML({ ...limpia(AD.pz.d), cliente: AD.pz.d.cliente || AD.pz.d.prospecto, numero: AD.pz.d.numero || (esPre(AD.pz.d) ? 'nuevo' : 'nueva') }, k.cfgMarca());
  const tA = (id, key, val, rows, ph, attr) => '<textarea class="in" id="' + id + '" ' + attr + '="' + key + '" rows="' + rows + '" placeholder="' + esc(ph || '') + '">' + esc(val) + '</textarea>';
  function vEditor() {
    const d = AD.pz.d, c = d.contenido, nuevo = !d.id, ia = AD.pz.ia, r = d.respuesta || {};
    const tipos = (S.L.tipos || []).filter(t => !['Redes', 'Ads'].includes(t));
    const etHtml = c.etapas.map((e, i) => '<div class="pz-row et"><input class="in" placeholder="Etapa" data-pze="' + i + '" data-pzk="nombre" value="' + esc(e.nombre) + '"><input class="in" placeholder="Semanas" inputmode="decimal" data-pze="' + i + '" data-pzk="semanas" value="' + esc(e.semanas) + '"><input class="in" placeholder="Qué pasa en esta etapa" data-pze="' + i + '" data-pzk="detalle" value="' + esc(e.detalle) + '"><button class="btn ghost sm" data-act="pzEtDel" data-i="' + i + '" aria-label="Quitar etapa">✕</button></div>').join('');
    const itHtml = d.items.map((it, i) => '<div class="pz-row it"><input class="in" placeholder="Concepto" data-pzi="' + i + '" data-pzk="concepto" value="' + esc(it.concepto) + '"><input class="in" placeholder="Detalle (opcional)" data-pzi="' + i + '" data-pzk="detalle" value="' + esc(it.detalle) + '"><input class="in" placeholder="Monto" inputmode="decimal" style="text-align:right" data-pzi="' + i + '" data-pzk="monto" value="' + esc(it.monto) + '"><button class="btn ghost sm" data-act="pzItDel" data-i="' + i + '" aria-label="Quitar línea">✕</button></div>').join('');
    const ef = d.id ? efectivo(d) : 'Borrador';
    const pre = esPre(d);
    let h = '<button class="btn ghost sm" data-act="pzVolver" style="justify-self:start">← Propuestas y presupuestos</button>' +
      '<div class="head"><div><span class="eyebrow">' + esc(Palabra(d) + ' · ' + (d.numero || (pre ? 'nuevo' : 'nueva'))) + '</span><h1 style="margin-top:4px">' + esc(d.titulo || Palabra(d) + ' sin título') + '</h1><p style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px">' + pill(estadoTxt(ef, d), EST_COLOR[ef]) + (d.vista_el ? '<span class="muted">El cliente lo abrió el ' + fmt(String(d.vista_el).slice(0, 10)) + '</span>' : '') + (d.proyecto_id ? '<button class="btn link" data-act="pver" data-id="' + esc(d.proyecto_id) + '">Ver proyecto →</button>' : '') + '</p></div>' +
      '<div class="toolbar"><button class="btn" data-act="pzPdf">Ver PDF</button>' + (d.id ? '<button class="btn" data-act="pzMail">Enviar por email</button><button class="btn" data-act="pzLink">Copiar link para el cliente</button><button class="btn" data-act="pzWa">WhatsApp</button>' : '') + '<button class="btn primary" data-act="pzGuardar">' + (AD.pz.dirty || nuevo ? 'Guardar' : 'Guardado ✓') + '</button></div></div>';
    if (r.accion) h += '<section class="callout" style="border-left-color:var(' + (r.accion === 'Aceptada' ? '--s-entregado' : r.accion === 'Rechazada' ? '--crit-c' : '--warn') + ')"><p><b>' + esc(r.nombre || 'El cliente') + (r.accion === 'Aceptada' ? ' aceptó ' + la(d) : r.accion === 'Rechazada' ? (pre ? ' lo rechazó' : ' la rechazó') : ' dejó una consulta') + '</b>' + (r.fecha ? ' el ' + fmt(String(r.fecha).slice(0, 10)) : '') + (r.comentario ? ': “' + esc(r.comentario) + '”' : '.') + '</p>' + (d.estado === 'Aceptada' && !d.proyecto_id ? '<button class="btn primary" data-act="pzProyecto">Convertir en proyecto</button>' : '') + '</section>';
    else if (d.estado === 'Aceptada' && !d.proyecto_id) h += '<section class="callout"><p>' + (pre ? 'Presupuesto aceptado. Pasalo a proyecto: se crea con el monto y las cuotas.' : 'Propuesta aceptada. Pasala a proyecto: se crea con sus etapas, el presupuesto y las cuotas.') + '</p><button class="btn primary" data-act="pzProyecto">Convertir en proyecto</button></section>';
    h += '<div class="pz-grid"><div class="stack">' +
      '<section class="sheet"><div class="sheet-h"><h2>Para quién</h2></div><div class="sheet-b pz-form">' +
      '<label class="field"><span class="lbl">Cliente</span><select class="in" data-pz="cliente">' + opt('', '— Prospecto (todavía no es cliente) —', d.cliente) + [...S.C].sort((a, b) => cmp(a.nombre, b.nombre)).map(x => opt(x.nombre, x.nombre, d.cliente)).join('') + '</select></label>' +
      (d.cliente ? '' : '<label class="field"><span class="lbl">Nombre del prospecto</span><input class="in" data-pz="prospecto" value="' + esc(d.prospecto) + '" placeholder="Empresa o marca"></label>') +
      '<label class="field"><span class="lbl">Contacto</span><input class="in" data-pz="contacto" value="' + esc(d.contacto) + '" placeholder="Nombre de quien la recibe"></label>' +
      '<label class="field"><span class="lbl">Email</span><input class="in" type="email" data-pz="email" value="' + esc(d.email) + '" placeholder="Para enviarla"></label>' +
      '<label class="field full"><span class="lbl">Título</span><input class="in" data-pz="titulo" value="' + esc(d.titulo) + '" placeholder="' + (pre ? 'Sesión de fotos de producto' : 'Identidad de marca para…') + '"></label>' +
      '<label class="field"><span class="lbl">Tipo</span><select class="in" data-pz="tipo">' + optsFrom(tipos, d.tipo, '—') + '</select></label>' +
      '<label class="field"><span class="lbl">Moneda</span><select class="in" data-pz="moneda">' + optsFrom(k.MONEDAS, d.moneda) + '</select></label>' +
      '<label class="field"><span class="lbl">Fecha</span><input class="in" type="date" data-pz="fecha" value="' + esc(String(d.fecha || '').slice(0, 10)) + '"></label>' +
      '<label class="field"><span class="lbl">Válida por (días)</span><input class="in" inputmode="numeric" data-pz="validez_dias" value="' + esc(d.validez_dias) + '"></label></div></section>' +
      '';
    const secBrief = '<section class="sheet pz-ia"><div class="sheet-h"><h2>' + (pre ? 'Para la IA <small class="muted" style="font-weight:500">· opcional</small>' : 'Brief') + '</h2><span class="toolbar">' + (d.cliente ? '<button class="btn ghost sm" data-act="pzNotas">Traer las charlas con el cliente</button>' : '') + '<button class="btn primary sm" data-act="pzIA"' + (AD.pz.busy ? ' disabled' : '') + '>' + (AD.pz.busy ? (pre ? 'Calculando…' : 'Redactando…') : (pre ? '✨ Sugerir precios con IA' : '✨ Redactar con IA')) + '</button></span></div><div class="sheet-b">' +
      tA('pz-brief', 'brief', d.brief, pre ? 3 : 5, pre ? 'Qué hay que cotizar: cantidades, plazos, lo que pidió el cliente…' : 'Qué necesita el cliente, qué se habló en la reunión, presupuesto que mencionó, plazos, referencias…', 'data-pz') +
      '<span class="hint">' + (pre ? 'La IA arma los ítems y sugiere precios mirando proyectos, propuestas y presupuestos anteriores. Solo cambia el detalle y la forma de pago.' : 'La IA usa este brief, los proyectos y propuestas anteriores con su precio' + (((AD.AJ && AD.AJ.drive) || {}).carpeta_propuestas ? ' y propuestas viejas de Drive' : '') + '. Reemplaza el contenido y la inversión: revisalos antes de enviar.') + '</span>' +
      (ia ? '<div class="pz-just"><b>Cómo llegó al precio</b> (interno)<p>' + esc(ia.justificacion_precio || '') + '</p><span class="muted">Usó ' + ia.referencias.proyectos + ' proyectos, ' + ia.referencias.propuestas + ' propuestas y presupuestos' + (ia.referencias.drive.length ? ' y ' + esc(ia.referencias.drive.join(', ')) : '') + '.</span></div>' : '') + '</div></section>';
    const secPre = '<section class="sheet"><div class="sheet-h"><h2>Descripción y condiciones</h2></div><div class="sheet-b pz-form one">' +
      '<label class="field"><span class="lbl">Descripción <small>· opcional</small></span>' + tA('pz-intro', 'intro', c.intro, 2, 'Qué incluye este presupuesto, en una o dos líneas', 'data-pzc') + '</label>' +
      '<label class="field"><span class="lbl">Condiciones</span>' + tA('pz-con', 'condiciones', c.condiciones, 3, 'Plazos de entrega, instancias de cambios, qué no incluye…', 'data-pzc') + '</label></div></section>';
    const secCont = '<section class="sheet"><div class="sheet-h"><h2>Contenido</h2></div><div class="sheet-b pz-form one">' +
      '<label class="field"><span class="lbl">Introducción</span>' + tA('pz-intro', 'intro', c.intro, 3, 'Qué entendimos del cliente y qué proponemos', 'data-pzc') + '</label>' +
      '<label class="field"><span class="lbl">Objetivo</span>' + tA('pz-obj', 'objetivo', c.objetivo, 2, '', 'data-pzc') + '</label>' +
      '<label class="field"><span class="lbl">Alcance <small>· uno por línea</small></span>' + tA('pz-alc', 'alcance', c.alcance, 4, '', 'data-pzc') + '</label>' +
      '<div class="field"><span class="lbl" style="display:flex;justify-content:space-between;align-items:center">Etapas' + (d.tipo && (S.L['etapas:' + d.tipo] || []).length ? '<button class="btn ghost sm" data-act="pzEtTpl">Usar las etapas de ' + esc(d.tipo) + '</button>' : '') + '</span><div class="pz-rows">' + etHtml + '</div><button class="btn sm" data-act="pzEtAdd" style="justify-self:start">+ Etapa</button></div>' +
      '<label class="field"><span class="lbl">Entregables <small>· uno por línea</small></span>' + tA('pz-ent', 'entregables', c.entregables, 3, '', 'data-pzc') + '</label>' +
      '<label class="field"><span class="lbl">No incluye <small>· uno por línea</small></span>' + tA('pz-noi', 'no_incluye', c.no_incluye, 2, '', 'data-pzc') + '</label>' +
      '<label class="field"><span class="lbl">Condiciones</span>' + tA('pz-con', 'condiciones', c.condiciones, 2, 'Instancias de ajustes, plazos, propiedad de los archivos…', 'data-pzc') + '</label></div></section>';
    const secInv = '<section class="sheet"><div class="sheet-h"><h2>' + (pre ? 'Detalle' : 'Inversión') + '</h2><b class="money" id="pz-total">' + money(totalDe(limpia(d)), d.moneda) + '</b></div><div class="sheet-b" style="display:grid;gap:10px"><div class="pz-rows">' + itHtml + '</div><button class="btn sm" data-act="pzItAdd" style="justify-self:start">+ Agregar línea</button>' +
      '<div class="pz-form"><label class="field"><span class="lbl">Descuento</span><input class="in" inputmode="decimal" data-pz="descuento" value="' + esc(d.descuento || '') + '" placeholder="0"></label><label class="field"><span class="lbl">Forma de pago</span><select class="in" data-pz="plan_pago">' + optsFrom(PLANES, d.plan_pago) + '</select></label></div></div></section>';
    h += pre ? secInv + secPre + secBrief : secBrief + secCont + secInv;
    h += '<section class="sheet"><div class="sheet-h"><h2>Notas internas</h2><span class="muted">no las ve el cliente</span></div><div class="sheet-b">' + tA('pz-notas', 'notas', d.notas, 2, '', 'data-pz') + '</div></section>' +
      (d.id ? '<section class="sheet"><div class="sheet-h"><h2>Estado</h2></div><div class="sheet-b toolbar">' + ['Borrador', 'Enviada', 'Aceptada', 'Rechazada'].map(e => '<button class="btn sm' + (d.estado === e ? ' primary' : '') + '" data-act="pzEstado" data-v="' + e + '">' + estadoTxt(e, d) + '</button>').join('') + '<span style="flex:1"></span><button class="btn ghost sm" data-act="pzClase">' + (pre ? 'Ampliar a propuesta' : 'Pasar a presupuesto') + '</button><button class="btn ghost sm" data-act="pzDuplicar">Duplicar</button><button class="btn ghost sm danger" data-act="pzBorrar">Eliminar</button></div></section>' : '') +
      '</div><div class="pz-side"><div class="pz-prev" id="pz-prev">' + preview() + '</div></div></div>';
    return h;
  }
  function vPropuestas() { return AD.pz.sel ? vEditor() : vLista(); }

  /* ---------- guardar y acciones ---------- */
  async function siguienteNumero() {
    const pf = esPre(AD.pz.d) ? 'PRE-' : 'P-', y = thisMonth().slice(0, 4), n = (AD.PROP || []).filter(p => String(p.numero).startsWith(pf + y)).map(p => parseInt(String(p.numero).split('-')[2], 10) || 0);
    return pf + y + '-' + String((n.length ? Math.max(...n) : 0) + 1).padStart(3, '0');
  }
  async function guardar(extra = {}, silencio) {
    const d = AD.pz.d, l = limpia(d);
    if (!d.titulo.trim()) { toast('Poné un título'); $('[data-pz="titulo"]') && $('[data-pz="titulo"]').focus(); return null; }
    const row = { ...(d.numero ? { numero: d.numero } : {}), clase: d.clase || 'Propuesta', cliente_id: d.cliente ? data.ids.cliente(d.cliente) : null, prospecto: d.cliente ? '' : d.prospecto.trim(), contacto: d.contacto.trim(), email: d.email.trim(), titulo: d.titulo.trim(), tipo: d.tipo, estado: d.estado,
      fecha: d.fecha || today(), validez_dias: l.validez_dias, moneda: d.moneda, items: l.items, descuento: l.descuento, total: l.total, plan_pago: d.plan_pago, contenido: l.contenido, brief: d.brief, notas: d.notas, token: d.token || null, ...extra };
    try {
      if (d.id) await data.upd('propuestas', d.id, row); else { const r = await data.ins('propuestas', { ...row, persona_id: data.ids.persona(S.me.alias) }); d.id = r.id; d.numero = r.numero || await siguienteNumero(); }
      Object.assign(d, extra); AD.pz.sel = d.id; AD.pz.dirty = false;
      if (!silencio) toast(Palabra(d) + (esPre(d) ? ' guardado' : ' guardada'));
      await ctx.reload(); return d;
    } catch (err) { toast(err.message); return null; }
  }
  async function asegurarLink() { // el cliente solo ve propuestas enviadas
    const d = AD.pz.d; const extra = {};
    if (!d.token) extra.token = token();
    if (d.estado === 'Borrador') extra.estado = 'Enviada';
    if (AD.pz.dirty || Object.keys(extra).length) { if (!await guardar(extra, true)) return null; if (extra.estado) toast('Quedó como ' + estadoTxt('Enviada', d)); }
    return linkDe(AD.pz.d);
  }
  async function pdf() {
    const { propuestaDoc, bytesBase64 } = await import('./docs.js');
    const l = limpia(AD.pz.d), cl = AD.pz.d.cliente, bytes = await propuestaDoc({ ...l, email: AD.pz.d.email, cliente: cl || AD.pz.d.prospecto, datos_cliente: cl ? k.datosClienteDoc(cl) : {}, emisor: cl ? (k.cadm(cl).emisor_default || '') : '' }, { ...k.cfgDocs(), estilo: estilo() });
    return { bytes, base64: bytesBase64(bytes), nombre: Palabra(AD.pz.d) + ' ' + (AD.pz.d.numero || '') + ' ' + (AD.pz.d.cliente || AD.pz.d.prospecto || '') + '.pdf' };
  }
  async function convertir() {
    const d = AD.pz.d, l = limpia(d);
    try {
      let cliente = d.cliente;
      if (!cliente) {
        cliente = (d.prospecto || '').trim(); if (!cliente) { toast('Falta el nombre del cliente'); return; }
        if (!S.C.some(c => c.nombre === cliente)) { await data.save('cliente', null, { nombre: cliente, estado: 'Proyectos', contacto: d.contacto, email: d.email, servicio: d.tipo }); await ctx.reload(); }
      }
      const pid = await data.save('proyecto', null, { cliente, proyecto: d.titulo, tipo: d.tipo || 'Otro', estado: 'Por empezar', fechaInicio: today(), entregables: l.contenido.entregables.join('\n'), notas: 'Desde ' + la(d) + ' ' + d.numero + '.', etapas: l.contenido.etapas.map(e => ({ n: e.nombre, ok: false })) });
      await data.upsert('proyecto_finanzas', { proyecto_id: pid, presupuesto: l.total, moneda: d.moneda, plan_pago: d.plan_pago === 'Personalizado' ? 'Personalizado' : d.plan_pago, inicio_cobro: thisMonth() + '-01', notas: Palabra(d) + ' ' + d.numero, updated_at: new Date().toISOString() }, 'proyecto_id');
      const cs = k.cuotasPlan(d.plan_pago, l.total, thisMonth());
      if (cs.length) await data.insMany('proyecto_facturacion', cs.map(c => ({ proyecto_id: pid, periodo: c.periodo + '-01', concepto: c.concepto, monto: c.monto, moneda: d.moneda })));
      await data.upd('propuestas', d.id, { proyecto_id: pid, cliente_id: data.ids.cliente(cliente) || null, estado: 'Aceptada' });
      toast('Proyecto creado' + (l.contenido.etapas.length ? ' con ' + l.contenido.etapas.length + ' etapas' : '') + (cs.length ? (l.contenido.etapas.length ? ' y ' : ' con ') + cs.length + ' cuotas' : ''));
      AD.pz.sel = null; AD.pz.d = null; await ctx.reload(); location.hash = '#proyectos/' + pid;
    } catch (err) { toast(err.message); }
  }
  const refrescar = () => { const pv = $('#pz-prev'); if (pv) pv.innerHTML = preview(); const t = $('#pz-total'); if (t) t.textContent = money(totalDe(limpia(AD.pz.d)), AD.pz.d.moneda); const g = $('[data-act="pzGuardar"]'); if (g) g.textContent = 'Guardar'; };
  let prevT;

  const actions = {
    pzNueva: t => { AD.pz.d = nueva({ clase: (t && t.dataset.clase) || 'Propuesta', ...(t && t.dataset.preset ? JSON.parse(t.dataset.preset) : {}) }); AD.pz.sel = 'nuevo'; AD.pz.ia = null; AD.pz.dirty = true; ctx.render(); window.scrollTo(0, 0); },
    pzAbrir: t => { const p = (AD.PROP || []).find(x => x.id === t.dataset.id); if (!p) return; AD.pz.d = desdeFila(p); AD.pz.sel = p.id; AD.pz.ia = null; AD.pz.dirty = false; ctx.render(); window.scrollTo(0, 0); },
    pzVolver: async () => { if (AD.pz.dirty && !await confirmar('Hay cambios sin guardar. ¿Salir igual?')) return; AD.pz.sel = null; AD.pz.d = null; ctx.render(); },
    pzF: t => { AD.pz.f = t.dataset.v; ctx.render(); },
    pzC: t => { AD.pz.c = t.dataset.v; ctx.render(); },
    pzClase: () => { const d = AD.pz.d; d.clase = esPre(d) ? 'Propuesta' : 'Presupuesto'; AD.pz.dirty = true; toast('Ahora es ' + (esPre(d) ? 'un presupuesto' : 'una propuesta') + '. Guardá para confirmar; el número no cambia.'); ctx.render(); },
    pzGuardar: () => guardar(),
    pzEtAdd: () => { AD.pz.d.contenido.etapas.push({ nombre: '', semanas: '', detalle: '' }); AD.pz.dirty = true; ctx.render(); },
    pzEtDel: t => { AD.pz.d.contenido.etapas.splice(+t.dataset.i, 1); AD.pz.dirty = true; ctx.render(); },
    pzEtTpl: () => { AD.pz.d.contenido.etapas = (S.L['etapas:' + AD.pz.d.tipo] || []).map(n => ({ nombre: n, semanas: '', detalle: '' })); AD.pz.dirty = true; ctx.render(); },
    pzItAdd: () => { AD.pz.d.items.push({ concepto: '', detalle: '', monto: '' }); AD.pz.dirty = true; ctx.render(); },
    pzItDel: t => { AD.pz.d.items.splice(+t.dataset.i, 1); AD.pz.dirty = true; ctx.render(); },
    pzNotas: () => {
      const d = AD.pz.d, ms = S.M.filter(m => m.cliente === d.cliente).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 4);
      if (!ms.length) { toast('No hay charlas anotadas con ' + d.cliente); return; }
      d.brief = (d.brief ? d.brief.trim() + '\n\n' : '') + ms.map(m => '[' + (m.fecha || '') + ' · ' + (m.canal || '') + '] ' + [m.resumen, m.acuerdo && 'Acuerdo: ' + m.acuerdo].filter(Boolean).join(' ')).join('\n');
      AD.pz.dirty = true; ctx.render();
    },
    pzIA: async () => {
      const d = AD.pz.d; AD.pz.busy = true; ctx.render();
      try {
        const r = await data.asistente({ accion: 'propuesta', clase: d.clase, id: d.id, brief: d.brief, titulo: d.titulo, tipo: d.tipo, cliente: d.cliente || d.prospecto, moneda: d.moneda });
        if (!d.titulo.trim() && r.titulo) d.titulo = r.titulo;
        if (esPre(d)) { if (!d.contenido.condiciones.trim() && r.condiciones) d.contenido.condiciones = r.condiciones; }
        else d.contenido = { intro: r.intro || '', objetivo: r.objetivo || '', alcance: (r.alcance || []).join('\n'), etapas: (r.etapas || []).map(e => ({ nombre: e.nombre || '', semanas: e.semanas == null ? '' : String(e.semanas), detalle: e.detalle || '' })), entregables: (r.entregables || []).join('\n'), no_incluye: (r.no_incluye || []).join('\n'), condiciones: r.condiciones || '' };
        if ((r.items || []).length) d.items = r.items.map(i => ({ concepto: i.concepto || '', detalle: i.detalle || '', monto: String(i.monto ?? '') }));
        if (PLANES.includes(r.plan_pago)) d.plan_pago = r.plan_pago; if (r.validez_dias) d.validez_dias = r.validez_dias;
        AD.pz.ia = { justificacion_precio: r.justificacion_precio, referencias: r.referencias || { proyectos: 0, propuestas: 0, drive: [] } }; AD.pz.dirty = true;
        toast(esPre(d) ? 'Precios sugeridos. Revisalos antes de enviar.' : 'Borrador listo. Revisalo antes de enviar.');
      } catch (err) { toast(err.message); }
      AD.pz.busy = false; ctx.render();
    },
    pzPdf: async () => { const w = window.open('', '_blank'); try { const { abrirPdf } = await import('./docs.js'); const p = await pdf(); abrirPdf(p.bytes, p.nombre.replace(/\.pdf$/, ''), w); } catch (err) { if (w) w.close(); toast(err.message); } },
    pzLink: async () => { const u = await asegurarLink(); if (u) ctx.copyText(u); },
    pzWa: async () => { const u = await asegurarLink(); if (!u) return; const d = AD.pz.d; window.open('https://wa.me/?text=' + encodeURIComponent('Hola' + (d.contacto ? ' ' + d.contacto.split(' ')[0] : '') + ', te compartimos ' + la(d) + ' "' + d.titulo + '". ' + (esPre(d) ? 'Lo' : 'La') + ' podés ver, descargar y aceptar acá: ' + u), '_blank', 'noopener'); },
    pzMail: async () => {
      const u = await asegurarLink(); if (!u) return; const d = AD.pz.d;
      toast('Preparando el PDF…'); let adj = [];
      try { adj = [await pdf()]; } catch (e) { /* sale sin adjunto */ }
      const nombre = (d.contacto || '').split(' ')[0];
      const P = Palabra(d), lo = esPre(d) ? 'lo' : 'la';
      k.openComposer({ titulo: 'Enviar ' + palabra(d), eyebrow: d.numero + ' · ' + (d.cliente || d.prospecto), tipo: 'Otro', cliente: d.cliente || null,
        para: d.email || (d.cliente ? k.mailsDe(d.cliente) : ''), asunto: P + ' · ' + d.titulo, adjuntos: adj,
        mensaje: 'Hola' + (nombre ? ' ' + nombre : '') + ', ¿cómo estás?\n\nTe compartimos ' + la(d) + ' para ' + d.titulo + '. En el link ' + lo + ' podés ver completo, descargar' + lo + ' y aceptar' + lo + '; también va adjunto en PDF.\n\nCualquier duda, respondé este mail y lo charlamos.',
        build: v => E.libreEmail({ cfg: k.cfgMarca(), contacto: d.contacto, cuenta: d.cliente || d.prospecto, titulo: d.titulo, mensaje: v.mensaje, botonUrl: u, botonTexto: 'Ver ' + la(d), firma: k.firma(), asunto: v.asunto }),
      });
    },
    pzEstado: async t => { AD.pz.d.estado = t.dataset.v; await guardar({ estado: t.dataset.v }); },
    pzProyecto: () => convertir(),
    pzDuplicar: () => { const d = AD.pz.d; AD.pz.d = { ...JSON.parse(JSON.stringify(d)), id: null, numero: '', estado: 'Borrador', token: null, respuesta: null, vista_el: null, proyecto_id: null, fecha: today(), titulo: d.titulo + ' (copia)' }; AD.pz.sel = 'nuevo'; AD.pz.dirty = true; ctx.render(); },
    pzBorrar: async () => { const d0 = AD.pz.d; if (!await confirmar('¿Eliminar ' + la(d0) + ' ' + (d0.numero || '') + '? El link deja de funcionar.')) return; try { await data.del('propuestas', d0.id); AD.pz.sel = null; AD.pz.d = null; toast(Palabra(d0) + (esPre(d0) ? ' eliminado' : ' eliminada')); await ctx.reload(); } catch (err) { toast(err.message); } },
  };
  const tocar = (t, rerender) => {
    const d = AD.pz.d; if (!d) return false;
    if (t.dataset.pz !== undefined) { d[t.dataset.pz] = t.value; if (rerender) { ctx.render(); return true; } }
    else if (t.dataset.pzc !== undefined) d.contenido[t.dataset.pzc] = t.value;
    else if (t.dataset.pzi !== undefined) d.items[+t.dataset.pzi][t.dataset.pzk] = t.value;
    else if (t.dataset.pze !== undefined) d.contenido.etapas[+t.dataset.pze][t.dataset.pzk] = t.value;
    else return false;
    AD.pz.dirty = true; clearTimeout(prevT); prevT = setTimeout(refrescar, 200); return true;
  };
  document.addEventListener('input', e => { if (e.target.tagName !== 'SELECT') tocar(e.target); });
  document.addEventListener('change', e => { if (e.target.tagName === 'SELECT') tocar(e.target, ['cliente', 'tipo'].includes(e.target.dataset.pz)); });
  window.addEventListener('beforeunload', e => { if (AD.pz.dirty && AD.pz.sel) { e.preventDefault(); e.returnValue = ''; } });

  return { view: vPropuestas, actions, reset: () => { AD.pz.sel = null; AD.pz.d = null; } };
}
