// Mr. Piggy (el chanchito del isologo) es la IA de àndale: una caja donde se escribe como en un chat. La IA contesta preguntas con los datos de la app
// o deja listo el formulario que corresponde (gasto, charla, proyecto, presupuesto…) para revisar y guardar.
// También: resumen de un cliente y cargar una charla pegando el WhatsApp. Nada se guarda sin confirmar.
import * as data from './data.js';
import { ISO } from './marca.js';
const PIG = '<span class="pig" aria-hidden="true">' + ISO + '</span>';

export function initIA(ctx) {
  const { S, esc, toast, $, openForm, go, render, isAdmin, isStaff, getADM, today, openMail } = ctx;
  const st = { abierto: false, busy: false, hist: [], txt: '' };
  const SUG = () => isAdmin()
    ? ['¿Quién nos debe plata?', 'Cargá un gasto de 50 mil de Meta Ads para Apromax', 'Escribile a Lomo Loco pidiendo las fotos del local para la web', 'Armá un presupuesto de fotos de producto para Pasta Fusión', '¿Qué tareas vencen esta semana?']
    : ['¿Qué tengo que hacer esta semana?', 'Escribile a Lomo Loco pidiendo las fotos del local para la web', 'Anotá que hablé con Lomo Loco: quieren 2 posteos más por semana', '¿Qué proyectos están atrasados?'];

  const serviciosTxt = n => [...new Set([...S.A.filter(a => a.cliente === n).map(a => a.tipo + (a.estado === 'Activo' ? ' (vigente)' : '')), ...S.P.filter(p => p.cliente === n && p.tipo).map(p => p.tipo)])].join(', ');
  /* ---------- contexto que se le manda (lo que este usuario ya puede ver) ---------- */
  function contexto() {
    const abiertos = S.P.filter(p => !['Entregado', 'Cancelado', 'Finalizado'].includes(p.estado));
    const c = {
      clientes: S.C.map(x => ({ nombre: x.nombre, estado: x.estado, contacto: x.contacto || '', servicios: serviciosTxt(x.nombre) })),
      equipo: S.E.filter(e => e.activo !== false).map(e => ({ alias: e.persona, nombre: e.nombre || '', puesto: e.puesto || '' })),
      abonos: S.A.filter(a => a.estado !== 'Baja').map(a => ({ cliente: a.cliente, tipo: a.tipo, plan: a.plan || '', estado: a.estado, responsables: a.responsables || [] })),
      proyectos_abiertos: abiertos.map(p => ({ cliente: p.cliente, nombre: p.proyecto, tipo: p.tipo || '', estado: p.estado, prioridad: p.prioridad || '', entrega: p.entrega || '', responsables: p.responsables || [],
        tareas_pendientes: (p.etapas || []).filter(x => !x.ok).slice(0, 15).map(x => ({ tarea: x.n, quien: x.resp || '', fecha: x.fecha || '' })) })),
      proximos_pasos_con_clientes: S.M.filter(m => m.proximo && !m.hecho).map(m => ({ cliente: m.cliente, paso: m.proximo, fecha: m.fechaProximo || '', responsable: m.responsable || '' })),
      ultimas_charlas: [...S.M].sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 12).map(m => ({ fecha: m.fecha, cliente: m.cliente, canal: m.canal || '', resumen: (m.resumen || '').slice(0, 220), acuerdo: (m.acuerdo || '').slice(0, 160) })),
      listas: { tipos_de_proyecto: S.L.tipos || [], canales: S.L.canales || [] },
    };
    const ADM = getADM();
    if (isAdmin() && ADM && ADM.contexto) { try { c.plata = ADM.contexto(); } catch (e) { /* sin datos de plata */ } }
    return c;
  }

  /* ---------- texto de la IA → HTML simple (negritas, viñetas, saltos) ---------- */
  function md(t) {
    const lines = esc(t || '').split('\n'); let out = '', ul = false;
    for (const l of lines) {
      const li = l.match(/^\s*[-•*]\s+(.*)/);
      if (li) { if (!ul) { out += '<ul>'; ul = true; } out += '<li>' + li[1] + '</li>'; continue; }
      if (ul) { out += '</ul>'; ul = false; }
      if (l.trim()) out += '<p>' + l + '</p>';
    }
    if (ul) out += '</ul>';
    return out.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  }

  /* ---------- acciones: abren el formulario ya completo ---------- */
  const QUE = { gasto_ingreso: a => (a.sentido === 'ingreso' ? 'Ingreso' : 'Gasto') + (a.monto ? ' de ' + ({ USD: 'US$ ', EUR: '€ ', GBP: '£ ' }[a.moneda] || '$ ') + Number(a.monto).toLocaleString('es-AR') : '') + (a.quien ? ' · ' + a.quien : ''),
    charla: a => 'Charla con ' + (a.cliente || 'un cliente'), proyecto: a => 'Proyecto ' + (a.nombre || '') + (a.cliente ? ' · ' + a.cliente : ''),
    presupuesto: a => (a.clase === 'Propuesta' ? 'Propuesta' : 'Presupuesto') + (a.nombre ? ' · ' + a.nombre : '') + (a.cliente ? ' para ' + a.cliente : ''),
    recordatorio: a => 'Recordatorio de pago a ' + (a.cliente || ''), mail: a => 'Mail a ' + (a.cliente || 'un cliente') + (a.asunto ? ': ' + a.asunto : ''), abrir: a => 'Ir a ' + (a.cliente || a.vista || '') };
  const BOTON = { gasto_ingreso: 'Revisar y cargar', charla: 'Revisar y anotar', proyecto: 'Revisar y crear', presupuesto: 'Abrir el presupuesto', recordatorio: 'Ir a mandarlo', mail: 'Revisar y mandar', abrir: 'Ir' };
  const clienteExacto = n => { if (!n) return ''; const k = String(n).toLowerCase(); const c = S.C.find(x => x.nombre.toLowerCase() === k) || S.C.find(x => x.nombre.toLowerCase().includes(k) || k.includes(x.nombre.toLowerCase())); return c ? c.nombre : ''; };
  const personaExacta = n => { if (!n) return ''; const k = String(n).toLowerCase(); const e = S.E.find(x => (x.persona || '').toLowerCase() === k) || S.E.find(x => (x.nombre || '').toLowerCase().includes(k)); return e ? e.persona : ''; };
  function ejecutar(a) {
    const ADM = getADM(); cerrar();
    const cliente = clienteExacto(a.cliente);
    switch (a.tipo) {
      case 'gasto_ingreso': {
        if (!ADM) { toast('Solo las socias cargan gastos e ingresos.'); return; }
        const preset = { tipo: a.sentido === 'ingreso' ? 'Ingreso' : 'Egreso' };
        if (a.fecha) preset.fecha = a.fecha; if (a.monto) preset.monto = String(a.monto).replace('.', ','); if (a.moneda) preset.moneda = a.moneda;
        if (a.quien) preset.contraparte = a.quien; if (a.detalle) preset.detalle = a.detalle;
        if (a.categoria) preset.cuenta = a.categoria; if (a.subcategoria) preset.subcuenta = a.subcategoria; if (a.cuenta_id) preset.caja = a.cuenta_id;
        if (cliente && a.sentido !== 'ingreso' && a.monto) { const ab = S.A.find(x => x.cliente === cliente && x.estado === 'Activo'); const pr = S.P.find(x => x.cliente === cliente && !['Entregado', 'Cancelado'].includes(x.estado)); const dest = ab ? 'a:' + ab._id : pr ? 'p:' + pr._id : ''; if (dest) preset.imp = [{ dest, monto: String(a.monto) }]; }
        go('gastos'); ADM.abrir.movimiento(preset); return;
      }
      case 'charla':
        openForm('comunicacion', null, { fecha: a.fecha || today(), cliente, canal: a.canal || '', conQuien: a.con_quien || '', resumen: a.resumen || '', acuerdo: a.acuerdo || '', proximo: a.proximo || '', fechaProximo: a.fecha_proximo || '', responsable: personaExacta(a.responsable) || (S.me && S.me.alias) || '' });
        return;
      case 'proyecto':
        openForm('proyecto', null, { cliente, proyecto: a.nombre || '', tipo: a.tipo_trabajo || '', entrega: a.entrega || '', responsables: S.me ? [S.me.alias] : [] });
        return;
      case 'presupuesto':
        if (!ADM) { toast('Los presupuestos los arman las socias.'); return; }
        go('propuestas'); ADM.abrir.propuesta({ clase: a.clase || 'Presupuesto', cliente, titulo: a.nombre || '', tipo: a.tipo_trabajo || '', brief: a.brief || '' }); return;
      case 'recordatorio':
        if (!ADM) { toast('Los recordatorios los mandan las socias.'); return; }
        if (!cliente) { go('cobros'); return; }
        go('cobros'); ADM.abrir.cuenta(cliente); toast('Abajo, en “Avisos de cobro”, tocá Recordatorio.'); return;
      case 'mail':
        if (openMail) openMail({ clientes: cliente ? [cliente] : [], asunto: a.asunto || '', mensaje: a.mensaje || '' });
        return;
      case 'abrir':
        if (cliente) { go('clientes'); S.ficha = cliente; render(); return; }
        if (a.vista) go(a.vista); return;
    }
  }

  /* ---------- la caja ---------- */
  function pintar() {
    const box = $('#ia .ia-box'); if (!box) return;
    const sug = SUG();
    box.innerHTML = '<div class="ia-h"><h2 id="ia-t">' + PIG + 'Mr. Piggy</h2><button class="btn ghost sm" data-act="iaCerrar" aria-label="Cerrar">✕</button></div>' +
      '<form class="ia-f" id="ia-form"><textarea id="ia-in" rows="2" placeholder="Preguntale o pedile lo que necesites. Ej.: cargá un gasto de 50 mil de Meta para Apromax">' + esc(st.txt) + '</textarea>' +
      '<button class="btn primary" type="submit"' + (st.busy ? ' disabled' : '') + '>Enviar</button></form>' +
      '<div class="ia-hist">' + (st.hist.length ? st.hist.map((h, i) => '<div class="ia-q">' + esc(h.q) + '</div>' + (h.err ? '<div class="ia-a err">' + PIG + '<div class="ia-a-b">' + esc(h.err) + '</div></div>' :
        '<div class="ia-a">' + PIG + '<div class="ia-a-b">' + (h.r.pensando ? '<span class="ia-dots" aria-label="Pensando"><i></i><i></i><i></i></span>' : md(h.r.texto)) + (h.r.tipo === 'accion' && h.r.accion ? '<div class="ia-acc"><span>' + esc((QUE[h.r.accion.tipo] || (() => ''))(h.r.accion)) + '</span><button class="btn primary sm" data-act="iaAccion" data-i="' + i + '">' + esc(BOTON[h.r.accion.tipo] || 'Abrir') + ' →</button></div>' : '') + '</div></div>')).join('') :
        '<div class="ia-sug"><span class="muted">Probá con:</span>' + sug.map(x => '<button class="chip" data-act="iaChip" data-t="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>') + '</div>' +
      '<p class="ia-pie">Mr. Piggy usa los datos de la app. Lo que te deja listo lo revisás y lo guardás vos.</p>';
    const ta = $('#ia-in'); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
  }
  function abrir(texto) { st.abierto = true; if (texto != null) st.txt = texto; $('#ia').hidden = false; document.body.classList.add('ia-on'); pintar(); }
  function cerrar() { st.abierto = false; $('#ia').hidden = true; document.body.classList.remove('ia-on'); }
  async function enviar() {
    const t = (($('#ia-in') || {}).value || '').trim(); if (!t || st.busy) return;
    st.busy = true; st.txt = ''; st.hist.push({ q: t, r: { tipo: 'respuesta', texto: '', pensando: true } }); pintar();
    const h = st.hist[st.hist.length - 1];
    try { h.r = await data.ia({ modo: 'comando', texto: t, contexto: contexto() }); }
    catch (e) { h.err = e.message; }
    st.busy = false; if (st.hist.length > 6) st.hist.shift(); if (st.abierto) pintar();
  }

  /* ---------- resumen de un cliente (ficha) ---------- */
  const resumenes = {};
  function contextoCliente(nombre) {
    const ctx = contexto(), base = {
      cliente: S.C.find(c => c.nombre === nombre) || { nombre },
      abonos: ctx.abonos.filter(a => a.cliente === nombre),
      proyectos: S.P.filter(p => p.cliente === nombre).map(p => ({ nombre: p.proyecto, tipo: p.tipo, estado: p.estado, entrega: p.entrega || '', entrego: p.entregaReal || '' })),
      charlas: S.M.filter(m => m.cliente === nombre).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || '')).slice(0, 12).map(m => ({ fecha: m.fecha, canal: m.canal, resumen: m.resumen, acuerdo: m.acuerdo, proximo: m.proximo, fecha_proximo: m.fechaProximo, hecho: !!m.hecho })),
    };
    if (ctx.plata) {
      const p = ctx.plata;
      base.plata = { facturas_sin_cobrar: p.facturas_sin_cobrar.filter(f => f.cliente === nombre), este_mes: p.cobros_del_mes.filter(f => f.cliente === nombre), precios: p.precios_de_abonos.filter(f => f.cliente === nombre),
        pagos_recibidos: p.gastos_e_ingresos_recientes.filter(v => v.quien === nombre && v.tipo === 'ingreso').slice(0, 10) };
    }
    return base;
  }
  function fichaHtml(nombre) {
    const r = resumenes[nombre];
    const COL = { bien: '--s-entregado', atencion: '--warn', problema: '--crit' }, TXT = { bien: 'Todo bien', atencion: 'Atención', problema: 'Ojo' };
    let h = '<section class="sheet iacard"><div class="sheet-h"><h2>' + PIG + 'Cómo está ' + esc(nombre) + '</h2><span class="toolbar"><button class="btn sm" data-act="iaCliente" data-cliente="' + esc(nombre) + '"' + (r && r.busy ? ' disabled' : '') + '>' + (r && r.busy ? 'Mr. Piggy está leyendo…' : r && r.ok ? 'Actualizar' : 'Preguntarle a Mr. Piggy') + '</button></span></div>';
    if (r && r.ok) h += '<div class="sheet-b"><p class="ia-tit"><span class="pill" style="--c:var(' + (COL[r.ok.estado] || '--muted') + ')">' + esc(TXT[r.ok.estado] || '') + '</span> <b>' + esc(r.ok.titular) + '</b></p><ul class="ia-ul">' + (r.ok.puntos || []).map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' + ((r.ok.proximos || []).length ? '<p class="muted" style="margin:10px 0 4px">Próximos pasos sugeridos</p><ul class="ia-ul">' + r.ok.proximos.map(p => '<li>' + esc(p) + '</li>').join('') + '</ul>' : '') + '</div>';
    else if (r && r.err) h += '<div class="sheet-b"><p class="muted" style="margin:0">' + esc(r.err) + '</p></div>';
    else h += '<div class="sheet-b"><p class="muted" style="margin:0">Trabajos, plata, última charla y lo que falta, en un párrafo.</p></div>';
    return h + '</section>';
  }

  /* ---------- charla desde WhatsApp (en el formulario de Seguimiento) ---------- */
  async function charlaDesdeTexto() {
    const ta = $('#ia-chat'), btn = $('#ia-chat-btn'); const t = ta && ta.value.trim(); if (!t) { toast('Pegá el chat o tus notas'); return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Mr. Piggy está leyendo…'; }
    try {
      const r = await data.ia({ modo: 'charla', texto: t, contexto: { clientes: S.C.map(c => c.nombre), equipo: S.E.map(e => e.persona), canales: S.L.canales || [], cliente_elegido: ($('#f-cliente') || {}).value || '' } });
      const set = (id, v) => { const el = $('#f-' + id); if (el && v) el.value = v; };
      set('cliente', clienteExacto(r.cliente)); set('fecha', r.fecha); set('canal', r.canal); set('conQuien', r.con_quien); set('resumen', r.resumen); set('acuerdo', r.acuerdo); set('proximo', r.proximo); set('fechaProximo', r.fecha_proximo); set('responsable', personaExacta(r.responsable));
      toast('Listo: revisalo y guardá.');
    } catch (e) { toast(e.message); }
    if (btn) { btn.disabled = false; btn.textContent = 'Que lo complete Mr. Piggy'; }
  }

  const actions = {
    iaAbrir: () => abrir(),
    iaCerrar: () => cerrar(),
    iaChip: t => { abrir(t.dataset.t); enviar(); },
    iaAccion: t => { const h = st.hist[+t.dataset.i]; if (h && h.r && h.r.accion) ejecutar(h.r.accion); },
    iaCliente: async t => {
      const n = t.dataset.cliente; resumenes[n] = { busy: true }; render();
      try { resumenes[n] = { ok: await data.ia({ modo: 'cliente', contexto: contextoCliente(n) }) }; } catch (e) { resumenes[n] = { err: e.message }; }
      render();
    },
    iaChat: () => charlaDesdeTexto(),
    iaInicio: () => { const el = $('#ia-home'); abrir(el ? el.value : ''); if (el && el.value.trim()) enviar(); },
  };
  document.addEventListener('submit', e => { if (e.target.id === 'ia-form') { e.preventDefault(); enviar(); } });
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k' && S.me && isStaff()) { e.preventDefault(); st.abierto ? cerrar() : abrir(); }
    else if (e.key === 'Escape' && st.abierto) cerrar();
    else if (e.key === 'Enter' && !e.shiftKey && e.target && e.target.id === 'ia-in') { e.preventDefault(); enviar(); }
    else if (e.key === 'Enter' && e.target && e.target.id === 'ia-home') { e.preventDefault(); actions.iaInicio(); }
  });
  document.addEventListener('click', e => { if (e.target && e.target.id === 'ia') cerrar(); });

  // Caja grande en Inicio
  const inicioHtml = () => '<section class="iahome"><span class="iahome-i">' + PIG + '</span><input id="ia-home" placeholder="Preguntale a Mr. Piggy: ¿quién nos debe?, anotá una charla, cargá un gasto…" aria-label="Preguntale a Mr. Piggy"><button class="btn primary" data-act="iaInicio">Preguntar</button></section>';
  // Caja para pegar el chat dentro del formulario de Seguimiento
  const charlaHtml = () => '<div class="field full iabox"><span class="lbl">¿Lo hablaron por WhatsApp o tenés notas? Pegalo y Mr. Piggy completa todo</span><textarea id="ia-chat" rows="3" placeholder="Pegá acá el chat o tus notas de la reunión"></textarea><div class="toolbar"><button type="button" class="btn sm primary" id="ia-chat-btn" data-act="iaChat">Que lo complete Mr. Piggy</button></div></div>';

  return { actions, fichaHtml, inicioHtml, charlaHtml, abrir };
}
