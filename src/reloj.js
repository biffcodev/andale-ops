// Reloj de la barra de arriba: "¿En qué estuviste trabajando?"
// Cada persona anota cliente, proyecto / abono / ticket (opcional) y el tiempo, todo con desplegables.
// La nota es opcional (se abre con "+ Nota"). Con "+ Agregar otro trabajo" se cargan varios de una.
// Lo cargado alimenta "Qué deja cada cliente" (horas × costo de la hora) y la columna de horas de Tickets.
import { ICON } from './iconos.js';

const TIEMPOS = [15, 30, 45, 60, 75, 90, 120, 150, 180, 210, 240, 300, 360, 420, 480];
export const tiempoTxt = min => { const h = Math.floor(min / 60), m = Math.round(min % 60); return h ? h + ' h' + (m ? ' ' + m : '') : m + ' min'; };
const INTERNO = '__interno';

export function initReloj(ctx) {
  const { S, esc, opt, toast, data, $, today, cmp } = ctx;
  const st = { abierto: false, fecha: today(), filas: [], cargado: null, ok: null, guardando: false, ultimoMin: 60 };
  try { st.ultimoMin = +localStorage.getItem('relojMin') || 60; } catch (e) { /* sin storage */ }

  const fila = (cliente, dest) => ({ cliente: cliente || '', dest: dest || '', min: st.ultimoMin, nota: '', notaOn: false });
  // Lo que se está mirando sugiere el cliente y el proyecto/abono.
  function sugerida() {
    if (S.view === 'proyectos' && S.pficha) { const p = S.P.find(x => x._id === S.pficha); if (p) return fila(p.cliente, 'p:' + p._id); }
    if (S.view === 'redes' && S.rmFicha) { const m = (S.RM || []).find(x => x._id === S.rmFicha); if (m) { const a = S.A.find(x => x.cliente === m.cliente && x.tipo === 'Redes' && x.estado === 'Activo'); return fila(m.cliente, a ? 'a:' + a._id : ''); } }
    if (S.view === 'clientes' && S.ficha) return fila(S.ficha, '');
    return fila('', '');
  }
  const total = () => (st.cargado || []).reduce((a, x) => a + x.minutos, 0);
  async function cargarDia() {
    if (!S.me) return;
    const r = await data.horasDia(S.me.id, st.fecha);
    st.ok = r !== null; st.cargado = r || [];
    pintarBoton(); if (st.abierto) pintar();
  }
  function pintarBoton() {
    const b = $('#treloj'); if (!b) return;
    b.hidden = st.ok === false;
    const t = st.fecha === today() ? total() : null;
    b.querySelector('.tr-t').textContent = t ? tiempoTxt(t) : '';
    b.classList.toggle('con', !!t);
  }
  const misClientes = () => {
    const mios = new Set();
    const yo = S.me && S.me.alias;
    S.P.forEach(p => { if ((p.responsables || []).includes(yo) && !['Entregado', 'Cancelado'].includes(p.estado)) mios.add(p.cliente); });
    S.A.forEach(a => { if ((a.responsables || []).includes(yo) && a.estado === 'Activo') mios.add(a.cliente); });
    return mios;
  };
  function opcionesCliente(v) {
    const act = S.C.filter(c => c.estado === 'Activo' || c.nombre === v).map(c => c.nombre).sort(cmp), mios = misClientes();
    const a = act.filter(c => mios.has(c)), b = act.filter(c => !mios.has(c));
    return opt('', '¿Para qué cliente?', v) + (a.length ? '<optgroup label="Tus clientes">' + a.map(c => opt(c, c, v)).join('') + '</optgroup>' : '') +
      '<optgroup label="' + (a.length ? 'Otros clientes' : 'Clientes') + '">' + b.map(c => opt(c, c, v)).join('') + '</optgroup>' +
      '<optgroup label="Sin cliente">' + opt(INTERNO, 'Interno de àndale', v) + '</optgroup>';
  }
  function opcionesDestino(cliente, v) {
    if (!cliente || cliente === INTERNO) return opt('', cliente === INTERNO ? 'Gestión, reuniones, propuestas…' : '—', '');
    const ps = S.P.filter(p => p.cliente === cliente && (!['Entregado', 'Cancelado'].includes(p.estado) || 'p:' + p._id === v));
    const as = S.A.filter(a => a.cliente === cliente && (a.estado === 'Activo' || 'a:' + a._id === v));
    const ts = (S.PD || []).filter(t => t.cliente === cliente && (!['Hecho', 'Descartado'].includes(t.estado) || 't:' + t._id === v));
    return opt('', 'General del cliente', v) +
      (ps.length ? '<optgroup label="Proyectos">' + ps.map(p => opt('p:' + p._id, p.proyecto, v)).join('') + '</optgroup>' : '') +
      (as.length ? '<optgroup label="Abonos">' + as.map(a => opt('a:' + a._id, a.tipo === 'Redes' ? 'Redes' + (a.plan ? ' · plan ' + a.plan : '') : a.tipo, v)).join('') + '</optgroup>' : '') +
      (ts.length ? '<optgroup label="Tickets">' + ts.map(t => opt('t:' + t._id, '#' + t.numero + ' ' + t.titulo, v)).join('') + '</optgroup>' : '');
  }
  const nombreDestino = x => {
    if (x.proyectoId) { const p = S.P.find(y => y._id === x.proyectoId); return p ? p.proyecto : 'Proyecto'; }
    if (x.abonoId) { const a = S.A.find(y => y._id === x.abonoId); return a ? (a.tipo === 'Redes' ? 'Redes' : a.tipo) : 'Abono'; }
    if (x.pedidoId) { const t = (S.PD || []).find(y => y._id === x.pedidoId); return t ? 'Ticket #' + t.numero : 'Ticket'; }
    return '';
  };
  function diaTxt(f) {
    const d = new Date(f + 'T12:00'), hoy = today(), y = new Date(hoy + 'T12:00'); y.setDate(y.getDate() - 1); const ayer = y.toISOString().slice(0, 10);
    const base = d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'short' });
    return f === hoy ? 'Hoy, ' + base : f === ayer ? 'Ayer, ' + base : base.charAt(0).toUpperCase() + base.slice(1);
  }
  function pintar() {
    const box = $('#trelojpop'); if (!box) return;
    if (st.ok === false) { box.innerHTML = '<div class="rl-vacio">Para cargar horas falta correr el SQL 0017 en Supabase.</div>'; return; }
    const hechos = st.cargado || [];
    box.innerHTML = '<div class="rl-h"><b>¿En qué estuviste trabajando?</b><span class="rl-dia"><button class="btn ghost sm" data-act="rlDia" data-d="-1" aria-label="Día anterior">‹</button><span>' + esc(diaTxt(st.fecha)) + '</span><button class="btn ghost sm" data-act="rlDia" data-d="1" aria-label="Día siguiente"' + (st.fecha >= today() ? ' disabled' : '') + '>›</button></span></div>' +
      '<div class="rl-filas">' + st.filas.map((f, i) => '<div class="rl-f" data-i="' + i + '">' +
        '<select class="in" data-rl="cliente" data-i="' + i + '" aria-label="Cliente">' + opcionesCliente(f.cliente) + '</select>' +
        '<select class="in" data-rl="dest" data-i="' + i + '" aria-label="Proyecto, abono o ticket"' + (f.cliente && f.cliente !== INTERNO ? '' : ' disabled') + '>' + opcionesDestino(f.cliente, f.dest) + '</select>' +
        '<div class="rl-l"><select class="in" data-rl="min" data-i="' + i + '" aria-label="Tiempo">' + TIEMPOS.map(m => opt(String(m), tiempoTxt(m), String(f.min))).join('') + '</select>' +
        (f.notaOn ? '' : '<button class="btn ghost sm rl-nb" data-act="rlNota" data-i="' + i + '">+ Nota</button>') +
        (st.filas.length > 1 ? '<button class="btn ghost sm rl-x" data-act="rlQuitar" data-i="' + i + '" aria-label="Quitar">✕</button>' : '') + '</div>' +
        (f.notaOn ? '<input class="in rl-nota" data-rl="nota" data-i="' + i + '" value="' + esc(f.nota) + '" placeholder="Nota (opcional)" maxlength="300">' : '') + '</div>').join('') + '</div>' +
      '<div class="rl-acc"><button class="btn ghost sm" data-act="rlOtra">+ Agregar otro trabajo</button><button class="btn primary sm" data-act="rlGuardar"' + (st.guardando ? ' disabled' : '') + '>' + (st.guardando ? 'Guardando…' : 'Guardar') + '</button></div>' +
      (hechos.length ? '<div class="rl-hechos"><div class="rl-ht"><span>Cargado ' + (st.fecha === today() ? 'hoy' : 'ese día') + '</span><b>' + esc(tiempoTxt(total())) + '</b></div>' +
        hechos.map(x => '<div class="rl-hi"><span class="rl-hn"><b>' + esc(x.cliente || 'Interno de àndale') + '</b>' + (nombreDestino(x) ? ' · ' + esc(nombreDestino(x)) : '') + (x.nota ? '<small>' + esc(x.nota) + '</small>' : '') + '</span><span class="rl-hm">' + esc(tiempoTxt(x.minutos)) + '</span><button class="btn ghost sm" data-act="rlBorrar" data-id="' + esc(x._id) + '" aria-label="Borrar">✕</button></div>').join('') + '</div>' : '');
  }
  function abrir() {
    st.abierto = true; st.filas = [sugerida()];
    $('#trelojpop').hidden = false; $('#treloj').setAttribute('aria-expanded', 'true');
    pintar(); cargarDia();
    setTimeout(() => { const s = document.querySelector('#trelojpop select[data-rl="cliente"]'); if (s && !s.value) s.focus(); }, 30);
  }
  function cerrar() { st.abierto = false; const p = $('#trelojpop'); if (p) p.hidden = true; const b = $('#treloj'); if (b) b.setAttribute('aria-expanded', 'false'); }
  async function guardar() {
    const listas = st.filas.filter(f => f.cliente && f.min);
    if (!listas.length) { toast('Elegí el cliente (o “Interno de àndale”)'); return; }
    const filas = listas.map(f => { const [t, id] = (f.dest || ':').split(':'); return { fecha: st.fecha, cliente: f.cliente === INTERNO ? '' : f.cliente, proyectoId: t === 'p' ? id : null, abonoId: t === 'a' ? id : null, pedidoId: t === 't' ? id : null, minutos: +f.min, nota: f.notaOn ? f.nota.trim() : '' }; });
    st.guardando = true; pintar();
    try {
      await data.horasCargar(filas);
      st.ultimoMin = +listas[listas.length - 1].min; try { localStorage.setItem('relojMin', String(st.ultimoMin)); } catch (e) { /* sin storage */ }
      toast('Anotado: ' + tiempoTxt(filas.reduce((a, f) => a + f.minutos, 0)));
      st.filas = [fila('', '')]; window.dispatchEvent(new Event('horas-cargadas'));
      await cargarDia();
    } catch (e) { toast(e.message); }
    st.guardando = false; pintar();
  }
  const acts = {
    rlAbrir: () => { if (st.abierto) cerrar(); else abrir(); },
    rlOtra: () => { const u = st.filas[st.filas.length - 1]; st.filas.push(fila(u ? u.cliente : '', '')); pintar(); },
    rlQuitar: t => { st.filas.splice(+t.dataset.i, 1); pintar(); },
    rlNota: t => { st.filas[+t.dataset.i].notaOn = true; pintar(); const n = document.querySelector('#trelojpop [data-rl="nota"][data-i="' + t.dataset.i + '"]'); if (n) n.focus(); },
    rlGuardar: () => guardar(),
    rlBorrar: async t => { try { await data.horaBorrar(t.dataset.id); window.dispatchEvent(new Event('horas-cargadas')); await cargarDia(); } catch (e) { toast(e.message); } },
    rlDia: t => { const d = new Date(st.fecha + 'T12:00'); d.setDate(d.getDate() + +t.dataset.d); const f = d.toISOString().slice(0, 10); if (f > today()) return; st.fecha = f; pintar(); cargarDia(); },
  };
  document.addEventListener('change', e => {
    const t = e.target; if (!t.dataset || !t.dataset.rl || t.dataset.rl === 'nota') return;
    const f = st.filas[+t.dataset.i]; if (!f) return;
    f[t.dataset.rl] = t.value;
    if (t.dataset.rl === 'cliente') { f.dest = ''; pintar(); const d = document.querySelector('#trelojpop select[data-rl="dest"][data-i="' + t.dataset.i + '"]'); if (d && !d.disabled) d.focus(); }
  });
  document.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.rl === 'nota') { const f = st.filas[+t.dataset.i]; if (f) f.nota = t.value; } });
  document.addEventListener('click', e => { if (!st.abierto) return; if (e.target.closest && (e.target.closest('#trelojpop') || e.target.closest('#treloj'))) return; if (!document.body.contains(e.target)) return; cerrar(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && st.abierto) cerrar(); if (e.key === 'Enter' && st.abierto && e.target.closest && e.target.closest('#trelojpop') && e.target.tagName === 'INPUT') { e.preventDefault(); guardar(); } });
  return { acts, iniciar: () => { st.fecha = today(); cargarDia(); }, ICON };
}
