import { ICON } from './iconos.js';
// Conversación pegada al trabajo: comentarios con @menciones en proyectos, tareas, meses de redes, piezas,
// entregas, pedidos y sitios. Y la campanita de avisos (asignaciones, menciones, etapas, clientes).
const ENT_CLIENTE = new Set(['mes', 'pieza', 'entrega', 'sitio', 'pedido', 'proyecto']);

export function initHilos(ctx) {
  const { S, esc, toast, data, $, av, fotoDe, personas, go, abrirLink } = ctx;
  const confirmar = ctx.confirmar || (async () => true);
  const cache = new Map();   // 'entidad:id' -> [comentarios]
  const cargando = new Set();
  const borr = new Map();    // borradores por hilo
  const opts = new Map();    // opciones de cada hilo pintado

  const key = (e, id) => e + ':' + id;
  const cuando = iso => {
    if (!iso) return '';
    const d = new Date(iso), s = (Date.now() - d) / 1000;
    if (s < 60) return 'recién'; if (s < 3600) return 'hace ' + Math.floor(s / 60) + ' min'; if (s < 86400) return 'hace ' + Math.floor(s / 3600) + ' h';
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };
  // Resalta @Alias en el texto (solo personas del equipo).
  function textoHtml(t) {
    let h = esc(t);
    const ps = personas().sort((a, b) => b.length - a.length);
    ps.forEach(a => { h = h.replace(new RegExp('@' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'g'), '<b class="men">@' + esc(a) + '</b>'); });
    h = h.replace(/(^|[\s(])@([A-Za-zÁÉÍÓÚÑáéíóúñü]{2,})/g, (all, pre, n) => pre + '<b class="men cli">@' + n + '</b>');
    return h.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  }
  const menciones = t => personas().filter(a => new RegExp('@' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(t));
  // Contactos del cliente que se pueden @mencionar (solo en comentarios que ve el cliente). Se mencionan por el nombre de pila;
  // si se repite o coincide con alguien del equipo, por el nombre completo sin espacios.
  const reEsc = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  function contactosHilo(cliente) {
    const ks = ctx.contactosDe ? ctx.contactosDe(cliente) : [], eq = new Set(personas().map(a => a.toLowerCase()));
    const pila = k => (k.nombre || '').trim().split(/\s+/)[0];
    return ks.map(k => { const p = pila(k), rep = ks.filter(x => pila(x).toLowerCase() === p.toLowerCase()).length > 1 || eq.has(p.toLowerCase()); return { ...k, tok: rep ? (k.nombre || '').replace(/\s+/g, '') : p }; }).filter(k => k.tok);
  }
  const contactosEn = (t, cliente) => contactosHilo(cliente).filter(k => new RegExp('@' + reEsc(k.tok) + '(?![\\wáéíóúñü])', 'i').test(t));

  function lista(k) {
    const cs = cache.get(k); const o = opts.get(k) || {};
    if (!cs) return '<p class="muted hl-vacio">Cargando…</p>';
    if (!cs.length) return '<p class="muted hl-vacio">' + esc(o.vacio || 'Todavía no hay comentarios. Escribí acá lo que haya que saber; con @ mencionás a alguien y le llega el aviso.') + '</p>';
    return cs.map(c => '<div class="hl-c' + (c.deCliente ? ' cli' : '') + (c.interno ? '' : ' pub') + '">' + av(c.autor || '?', c.deCliente ? '' : fotoDe(c.autor), '') +
      '<div class="hl-b"><div class="hl-m"><b>' + esc(c.autor || 'Alguien') + '</b>' + (c.deCliente ? '<span class="ctag cli">Cliente</span>' : '') + (!c.interno && !c.deCliente ? '<span class="ctag vis" title="Lo ve el cliente en el portal">Visible al cliente</span>' : '') + '<span class="muted">' + esc(cuando(c.creado)) + '</span>' +
      (S.me && c.autorId === S.me.id ? '<button class="btn ghost sm hl-del" data-act="hlDel" data-k="' + esc(k) + '" data-id="' + esc(c._id) + '" aria-label="Borrar comentario">✕</button>' : '') + '</div>' +
      '<div class="hl-t">' + textoHtml(c.texto) + '</div></div></div>').join('');
  }
  function pintar(k) {
    document.querySelectorAll('[data-hilo="' + CSS.escape(k) + '"] .hl-lista').forEach(el => { el.innerHTML = lista(k); el.scrollTop = el.scrollHeight; });
    document.querySelectorAll('[data-hilo-n="' + CSS.escape(k) + '"]').forEach(el => { const n = (cache.get(k) || []).length; el.textContent = n ? String(n) : ''; });
  }
  async function cargar(entidad, id, forzar) {
    const k = key(entidad, id);
    if (cargando.has(k) || (cache.has(k) && !forzar)) return;
    cargando.add(k);
    try { cache.set(k, await data.comentarios(entidad, id)); } catch (e) { cache.set(k, []); }
    cargando.delete(k); pintar(k);
  }
  /**
   * Hilo de comentarios. o: { cliente (nombre), proyectoId, titulo, publico (permite marcar visible al cliente), compacto }
   */
  function html(entidad, id, o = {}) {
    if (!id) return '';
    if (S.sinHilos) return '';
    const k = key(entidad, id);
    opts.set(k, o);
    if (!cache.has(k)) setTimeout(() => cargar(entidad, id), 0);
    const ps = personas().filter(a => !S.me || a !== S.me.alias);
    const pub = o.publico && ENT_CLIENTE.has(entidad);
    return '<section class="hilo' + (o.compacto ? ' compacto' : '') + '" data-hilo="' + esc(k) + '">' + (o.titulo === false ? '' : '<div class="hl-h"><h3>' + esc(o.titulo || 'Conversación') + '</h3></div>') +
      '<div class="hl-lista">' + lista(k) + '</div>' +
      '<div class="hl-f" data-hlform="' + esc(k) + '" data-entidad="' + esc(entidad) + '" data-id="' + esc(id) + '"><textarea class="in" name="t" id="hlt-' + esc(k.replace(/[^a-z0-9]/gi, '')) + '" rows="2" placeholder="Escribí un comentario… (@ para mencionar)" aria-label="Comentario">' + esc(borr.get(k) || '') + '</textarea>' +
      '<div class="hl-fb"><span class="hl-men">' + ps.slice(0, 8).map(a => '<button type="button" class="hl-chip" data-act="hlMen" data-a="' + esc(a) + '">@' + esc(a) + '</button>').join('') +
      (pub ? contactosHilo(o.cliente).slice(0, 6).map(k => '<button type="button" class="hl-chip cli" data-act="hlMen" data-a="' + esc(k.tok) + '" title="' + esc((k.nombre || '') + ' · ' + o.cliente + ' (le llega un mail y lo ve en su portal)') + '">@' + esc(k.tok) + '</button>').join('') : '') + '</span>' +
      (pub ? '<label class="chk hl-pub"><input type="checkbox" name="pub"> Visible al cliente</label>' : '') + '<button type="button" class="btn sm primary" data-act="hlEnviar">Comentar</button></div></div></section>';
  }
  async function enviar(f) {
    const k = f.dataset.hlform, o = opts.get(k) || {};
    if (f.dataset.busy) return; f.dataset.busy = '1';
    const ta = f.querySelector('textarea'), t = ta.value.trim(); if (!t) { delete f.dataset.busy; return; }
    const pubEl = f.querySelector('[name="pub"]'), ks = pubEl ? contactosEn(t, o.cliente) : [];
    // Si mencionás a alguien del cliente, el comentario lo ve el cliente y a esa persona le llega un mail.
    const sinMail = ks.filter(x => x.avisos === false), conMail = ks.filter(x => x.avisos !== false);
    if (ks.length && !await confirmar((conMail.length ? 'A ' + conMail.map(x => x.nombre + ' (' + x.email + ')').join(', ') + ' le llega un aviso por mail con este comentario y lo ve en su portal' + (conMail.some(x => !x.portal) ? ' (le damos acceso, entra con su email)' : '') + '. ' : '') + (sinMail.length ? sinMail.map(x => x.nombre).join(', ') + ' no recibe avisos por mail: lo va a ver cuando entre al portal.' : ''), { titulo: '¿Le avisamos a ' + ks.map(x => x.tok).join(', ') + '?', ok: 'Comentar y avisar', tipo: 'mail' })) { delete f.dataset.busy; return; }
    if (ks.length && pubEl) pubEl.checked = true;
    const btn = f.querySelector('button.primary'); btn.disabled = true;
    try {
      const c = await data.comentar({ entidad: f.dataset.entidad, id: f.dataset.id, clienteId: o.cliente || null, proyectoId: o.proyectoId || null, texto: t, menciones: menciones(t), contactos: ks.map(x => x._id).filter(Boolean), interno: !(pubEl || {}).checked });
      const arr = cache.get(k) || []; if (!arr.some(x => x._id === c._id)) arr.push(c); cache.set(k, arr);
      ta.value = ''; borr.delete(k); pintar(k);
      const m = menciones(t), quien = [...m, ...ks.map(x => x.tok)];
      if (ks.length && ctx.mencionarContactos) await ctx.mencionarContactos(o.cliente, ks, { texto: t, entidad: f.dataset.entidad });
      if (quien.length) toast('Le llega el aviso a ' + quien.join(', '));
    } catch (e) { toast(e.message); }
    btn.disabled = false; delete f.dataset.busy;
  }
  // El cuadro de comentario no es un <form> (puede vivir dentro de otro formulario, como el de la tarea).
  document.addEventListener('keydown', e => { const t = e.target, f = t.closest && t.closest('[data-hlform]'); if (f && e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); enviar(f); } });
  document.addEventListener('input', e => { const t = e.target, f = t.closest && t.closest('[data-hlform]'); if (f && t.tagName === 'TEXTAREA') borr.set(f.dataset.hlform, t.value); });

  /* ---------- Avisos ---------- */
  const noLeidos = () => (S.N || []).filter(n => !n.leida).length;
  const ICO = { tarea: ICON.tarea, etapa: ICON.etapa, mencion: ICON.arroba, comentario: ICON.charla, cliente: ICON.estrella, pedido: ICON.tickets, facturar: ICON.plata };
  function campana() {
    const b = $('#tbell'); if (!b) return;
    if (!Array.isArray(S.N)) { b.hidden = true; return; }
    b.hidden = false;
    const n = noLeidos();
    b.querySelector('.tb-n').textContent = n ? (n > 9 ? '9+' : String(n)) : '';
    b.classList.toggle('on', n > 0);
  }
  function panel() {
    const ns = S.N || [];
    const box = $('#tbellpop'); if (!box) return;
    box.innerHTML = '<div class="nt-h"><b>Avisos</b>' + (noLeidos() ? '<button class="btn ghost sm" data-act="ntTodos">Marcar todo como leído</button>' : '') + '</div>' +
      (ns.length ? '<div class="nt-l">' + ns.slice(0, 40).map(n => '<button class="nt' + (n.leida ? '' : ' nuevo') + '" data-act="ntIr" data-id="' + esc(n._id) + '"><span class="nt-i">' + (ICO[n.tipo] || '•') + '</span><span class="nt-t"><b>' + esc(n.titulo) + '</b>' + (n.cuerpo ? '<span>' + esc(n.cuerpo) + '</span>' : '') + '<small>' + esc(cuando(n.creado)) + (n.actor ? ' · ' + esc(n.actor) : '') + '</small></span></button>').join('') + '</div>'
        : '<p class="muted" style="padding:14px 16px;margin:0">No tenés avisos. Te llegan cuando te asignan algo, te mencionan, avanza una etapa o escribe un cliente.</p>');
  }
  async function marcar(ids) {
    ids = ids.filter(Boolean); if (!ids.length) return;
    (S.N || []).forEach(n => { if (ids.includes(n._id)) n.leida = true; });
    campana(); panel();
    try { await data.leerAvisos(ids); } catch (e) { /* se reintenta con la próxima carga */ }
  }
  async function refrescar() { const n = await data.avisos(); if (n) { S.N = n; campana(); if (!$('#tbellpop').hidden) panel(); } }
  // Cambio en vivo de avisos o comentarios.
  function enVivo(tabla, ev) {
    if (tabla === 'notificaciones') {
      // Un aviso que se juntó con otro (el cliente aprobó o pidió varias cosas seguidas) llega como cambio: también se muestra.
      const prev = ev && ev.new && (S.N || []).find(n => n._id === ev.new.id);
      const nuevo = ev && ev.new && !ev.new.leida && (ev.eventType === 'INSERT' || (ev.eventType === 'UPDATE' && prev && prev.creado !== ev.new.created_at));
      refrescar();
      if (nuevo) toast('🔔 ' + (ev.new.titulo || 'Tenés un aviso nuevo'));
    }
    if (tabla === 'comentarios' && ev) {
      const r = ev.new && ev.new.id ? ev.new : ev.old; if (!r) return;
      const k = r.entidad ? key(r.entidad, r.entidad_id) : [...cache.keys()].find(x => (cache.get(x) || []).some(c => c._id === r.id));
      if (!k || !cache.has(k)) return;
      const arr = cache.get(k);
      if (ev.eventType === 'DELETE') cache.set(k, arr.filter(c => c._id !== r.id));
      else if (!arr.some(c => c._id === r.id)) arr.push(data.comUI(r));
      pintar(k);
    }
  }
  document.addEventListener('click', e => {
    const pop = $('#tbellpop'); if (!pop) return;
    if (e.target.closest('#tbell')) { pop.hidden = !pop.hidden; if (!pop.hidden) panel(); return; }
    if (!e.target.closest('#tbellpop')) pop.hidden = true;
  });

  const acts = {
    hlEnviar: t => enviar(t.closest('[data-hlform]')),
    hlMen: t => { const f = t.closest('[data-hlform]'), ta = f && f.querySelector('textarea'); if (!ta) return; const pre = ta.value && !/\s$/.test(ta.value) ? ' ' : ''; ta.value += pre + '@' + t.dataset.a + ' '; borr.set(f.dataset.hlform, ta.value); ta.focus(); },
    hlDel: async t => { const k = t.dataset.k, id = t.dataset.id; try { await data.borrarComentario(id); cache.set(k, (cache.get(k) || []).filter(c => c._id !== id)); pintar(k); } catch (e) { toast(e.message); } },
    ntTodos: () => marcar((S.N || []).filter(n => !n.leida).map(n => n._id)),
    ntIr: t => { const n = (S.N || []).find(x => x._id === t.dataset.id); if (!n) return; marcar([n._id]); $('#tbellpop').hidden = true; if (n.link) abrirLink(n.link); else if (n.tipo === 'pedido') go('pedidos'); },
  };
  return { html, cargar, campana, panel, enVivo, refrescar, acts, menciones };
}
