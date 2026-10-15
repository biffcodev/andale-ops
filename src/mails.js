// Mails libres a clientes (fuera de cobranza y documentos): novedades, pedir material, coordinar, avisos.
// Los puede mandar todo el equipo. Salen con el nombre de quien escribe y las respuestas le llegan a esa persona.
// Mr. Piggy ayuda a redactar, mejorar, acortar o pasar al inglés.
import * as E from './emails.js';

// Datos de marca para el pie cuando no hay acceso a Ajustes (equipo): sin datos bancarios.
const MARCA_DEF = {
  contacto: [['hello@weareandale.com', 'mailto:hello@weareandale.com'], ['+54 9 351 705 3527', 'https://wa.me/5493517053527'], ['weareandale.com', 'https://weareandale.com/']],
  redes: [['instagram', 'https://instagram.com/weareandale']],
};

const PLANTILLAS = [
  ['', 'En blanco', '', 'Hola {nombre}, ¿cómo estás?\n\n'],
  ['novedades', 'Novedades', 'Novedades de tu cuenta', 'Hola {nombre}, ¿cómo estás?\n\nTe escribimos para contarte cómo venimos con '],
  ['material', 'Pedir material o accesos', 'Necesitamos un material para avanzar', 'Hola {nombre}, ¿cómo estás?\n\nPara avanzar con lo que estamos haciendo necesitaríamos que nos mandes:\n\n• \n\nSi te resulta más fácil, podés subirlo directo a la carpeta compartida. ¡Gracias!'],
  ['reunion', 'Coordinar una reunión', '¿Nos juntamos?', 'Hola {nombre}, ¿cómo estás?\n\nNos gustaría juntarnos para charlar sobre . ¿Qué día y horario te queda cómodo esta semana o la próxima? Puede ser por videollamada o en persona.\n\n¡Quedamos atentos!'],
  ['vacaciones', 'Aviso de vacaciones o feriado', 'Aviso: días sin actividad', 'Hola {nombre}, ¿cómo estás?\n\nTe avisamos con tiempo que entre el  y el  el estudio va a estar cerrado. Dejamos todo programado para que tu cuenta siga funcionando con normalidad y, ante cualquier urgencia, nos podés escribir por WhatsApp.\n\n¡Gracias!'],
  ['gracias', 'Agradecer', '¡Gracias!', 'Hola {nombre}, ¿cómo estás?\n\nQueríamos agradecerte por '],
];

export function initMails(ctx) {
  const { S, data, esc, opt, toast, $ } = ctx;
  const st = { clientes: [], busy: false, sel: new Set(), modo: 'principal' };
  const cli = n => S.C.find(c => c.nombre === n) || {};
  const pnom = s => String(s || '').split(/[,/]/)[0].trim().split(' ')[0];
  // Contactos del cliente con email (dueña, marketing, administración…). Sin tabla de contactos, el email del cliente.
  const conMail = n => {
    const ks = ctx.contactos ? ctx.contactos(n) : [];
    if (ks.length) return ks.flatMap(k => String(k.email || '').split(/[,;\s]+/).filter(Boolean).map(e => ({ ...k, email: e.toLowerCase() })));
    return String(cli(n).email || '').split(/[,;\s]+/).filter(Boolean).map((e, i) => ({ nombre: i ? '' : cli(n).contacto || '', rol: '', email: e.toLowerCase(), principal: !i, cobros: true }));
  };
  const lista = v => String(v || '').split(/[,;\s]+/).map(x => x.trim().toLowerCase()).filter(Boolean);
  // A quién le llega el mail de cada cliente y con qué nombre se saluda.
  function destino(n) {
    const ks = conMail(n);
    let elegidos;
    if (st.clientes.length === 1) elegidos = ks.filter(k => st.sel.has(k.email));
    else if (st.modo === 'todos') elegidos = ks;
    else if (st.modo === 'cobros') { elegidos = ks.filter(k => k.cobros); if (!elegidos.length) elegidos = ks.filter(k => k.principal).slice(0, 1); }
    else elegidos = (ks.filter(k => k.principal).length ? ks.filter(k => k.principal) : ks).slice(0, 1);
    const extra = st.clientes.length === 1 ? lista(val('otros')).filter(e => !elegidos.some(k => k.email === e)) : [];
    const noms = [...new Set(elegidos.map(k => pnom(k.nombre)).filter(x => x && !/^administraci/i.test(x)))];
    return { para: [...new Set([...elegidos.map(k => k.email), ...extra])], nombre: noms.length === 1 ? noms[0] : noms.length === 2 ? noms.join(' y ') : '' };
  }
  const nombreDe = n => (n ? destino(n).nombre : '');
  const mailDe = n => destino(n).para.join(', ');
  const firma = () => 'Saludos,\n' + (((S.me && (S.me.nombre || S.me.alias)) || '').split(' ')[0] || 'Equipo') + '\nàndale';
  const marca = () => (ctx.marca && ctx.marca()) || MARCA_DEF;
  const personal = (t, n) => String(t || '').replace(/\{nombre\}/g, nombreDe(n) || '').replace(/Hola ,/g, 'Hola,');
  const val = id => (($('#ml-' + id) || {}).value || '').trim();

  function build(n) {
    const v = { asunto: val('asunto'), titulo: val('titulo'), mensaje: ($('#ml-mensaje') || {}).value || '', url: val('url'), boton: val('boton') };
    return E.libreEmail({ cfg: marca(), cuenta: n || 'àndale', titulo: v.titulo, mensaje: personal(v.mensaje, n), botonUrl: /^https?:\/\//.test(v.url) ? v.url : '', botonTexto: v.boton || 'Ver más', firma: firma(), asunto: v.asunto || (v.titulo ? v.titulo + ' · àndale' : '') });
  }
  function preview() {
    const f = $('#ml-prev'); if (!f) return;
    const b = build(st.clientes[0]);
    f.srcdoc = b.html;
  }
  function porDefecto(n, para) {
    const ks = conMail(n), quiero = lista(para), pri = ks.filter(k => k.principal);
    st.sel = new Set((quiero.length ? ks.filter(k => quiero.includes(k.email)) : (pri.length ? pri : ks.slice(0, 1))).map(k => k.email)); st.selDe = n;
  }
  function chips() {
    const el = $('#ml-cls'); if (!el) return;
    if (st.clientes.length === 1 && st.selDe !== st.clientes[0]) porDefecto(st.clientes[0]);
    const uno = st.clientes.length === 1;
    el.innerHTML = st.clientes.map(n => { const sin = !conMail(n).length; return '<span class="mlchip' + (sin ? ' sin' : '') + '">' + esc(n) + (sin ? ' · sin email' : (!uno && destino(n).para.length > 1 ? ' · ' + destino(n).para.length + ' personas' : '')) + '<button type="button" data-act="mlQuitar" data-n="' + esc(n) + '" aria-label="Quitar ' + esc(n) + '">✕</button></span>'; }).join('') || '<span class="muted">Elegí al menos un cliente.</span>';
    const para = $('#ml-para-w'), modo = $('#ml-modo-w');
    if (para) {
      para.hidden = !uno;
      const box = $('#ml-ks');
      if (uno && box) {
        const ks = conMail(st.clientes[0]);
        box.innerHTML = ks.length ? ks.map(k => '<label class="mlk"><input type="checkbox" data-mlk="' + esc(k.email) + '"' + (st.sel.has(k.email) ? ' checked' : '') + '><div class="mlk-t"><div class="mlk-n"><strong>' + esc(k.nombre || k.email.split('@')[0]) + '</strong>' + (k.rol ? '<em>' + esc(k.rol) + '</em>' : '') + (k.principal ? '<i class="ctag pri">Principal</i>' : '') + (k.cobros ? '<i class="ctag cob">Cobros</i>' : '') + '</div><div class="mlk-e">' + esc(k.email) + '</div></div></label>').join('') : '<span class="muted">Este cliente no tiene contactos con email. Escribilo abajo' + (ctx.contactos ? ' o sumalo en la ficha' : '') + '.</span>';
      }
    }
    if (modo) modo.hidden = uno || !st.clientes.length;
    const n = $('#ml-n'); if (n) n.textContent = st.clientes.length > 1 ? 'Se manda un mail separado a cada cliente, con el nombre de su contacto en el saludo.' : '';
    const sv = $('#ml-send'); if (sv) sv.textContent = st.clientes.length > 1 ? 'Enviar ' + st.clientes.length + ' mails' : 'Enviar';
    preview();
  }

  function open(o = {}) {
    st.clientes = (o.clientes || []).filter(n => S.C.some(c => c.nombre === n));
    st.modo = 'principal'; st.sel = new Set(); st.selDe = null;
    if (st.clientes.length === 1) porDefecto(st.clientes[0], o.para);
    const p = $('#panel');
    const pl = PLANTILLAS.map(([k, l]) => opt(k, l, '')).join('');
    p.innerHTML = '<form id="mlform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">Mail a clientes</span><h2 id="panel-title">Escribir un mail</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div>' +
      '<div class="panel-b">' +
      '<p class="formnote full">Para novedades, pedidos de material, coordinar o avisar algo. Sale a tu nombre desde la casilla de àndale y las respuestas te llegan a vos. Queda anotado en las charlas del cliente.</p>' +
      '<div class="field full"><span class="lbl">Para</span><div id="ml-cls" class="mlchips"></div><select class="in" id="ml-add" aria-label="Agregar cliente" style="margin-top:8px">' + opt('', '+ Agregar cliente', '') + opt('__activos', 'Todos los clientes activos', '') + S.C.slice().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')).map(c => opt(c.nombre, c.nombre + (conMail(c.nombre).length ? '' : ' (sin email)'), '')).join('') + '</select><span class="hint" id="ml-n"></span></div>' +
      '<div class="field full" id="ml-para-w" hidden><span class="lbl">A quiénes</span><div id="ml-ks" class="mlks"></div><input id="ml-otros" class="in" style="margin-top:8px" placeholder="Otros emails (opcional, separados por coma)" autocomplete="off"></div>' +
      '<div class="field full" id="ml-modo-w" hidden><label for="ml-modo">A quién de cada cliente</label><select id="ml-modo">' + opt('principal', 'Al contacto principal', 'principal') + opt('todos', 'A todos sus contactos', 'principal') + opt('cobros', 'A los que reciben resúmenes y facturas', 'principal') + '</select></div>' +
      '<div class="field full iabox"><span class="lbl"><span class="pig" aria-hidden="true">' + (ctx.ISO || '') + '</span> Contale a Mr. Piggy qué querés decir</span><textarea id="ml-idea" rows="2" placeholder="Ej.: pedile a Juan el logo en vector y las fotos del local para la web, que lo necesitamos antes del viernes"></textarea><div class="toolbar"><button type="button" class="btn sm primary" data-act="mlIA">Redactar el mail</button></div></div>' +
      '<div class="field"><label for="ml-tpl">Plantilla</label><select id="ml-tpl">' + pl + '</select></div>' +
      '<div class="field"><label for="ml-asunto">Asunto</label><input id="ml-asunto" value="' + esc(o.asunto || '') + '"></div>' +
      '<div class="field full"><label for="ml-mensaje">Mensaje</label><textarea id="ml-mensaje" rows="9">' + esc(o.mensaje || 'Hola {nombre}, ¿cómo estás?\n\n') + '</textarea>' +
      '<span class="hint">{nombre} se reemplaza por el nombre de quien lo recibe (si son dos, “Laura y Juan”; si son más, queda “Hola,”). La firma va sola.</span>' +
      '<div class="toolbar" style="margin-top:6px"><span class="muted" style="font-size:13px">Mr. Piggy:</span><button type="button" class="btn ghost sm" data-act="mlTxt" data-t="mejorar">Mejorar</button><button type="button" class="btn ghost sm" data-act="mlTxt" data-t="corto">Más corto</button><button type="button" class="btn ghost sm" data-act="mlTxt" data-t="formal">Más formal</button><button type="button" class="btn ghost sm" data-act="mlTxt" data-t="ingles">En inglés</button></div></div>' +
      '<details class="mas full"><summary>Título grande, botón y copia</summary><div class="mas-b">' +
      '<div class="field full"><label for="ml-titulo">Título (opcional)</label><input id="ml-titulo" placeholder="Ej.: Ya está tu nueva web"></div>' +
      '<div class="field"><label for="ml-url">Link del botón (opcional)</label><input id="ml-url" type="url" placeholder="https://…"></div>' +
      '<div class="field"><label for="ml-boton">Texto del botón</label><input id="ml-boton" placeholder="Ver más"></div>' +
      '<div class="field full"><label for="ml-cc">CC</label><input id="ml-cc" placeholder="Opcional"></div>' +
      '<label class="chk full"><input type="checkbox" id="ml-copia" checked> Mandarme una copia</label></div></details>' +
      '<div class="field full"><span class="lbl">Vista previa</span><iframe id="ml-prev" title="Vista previa del mail" style="width:100%;height:520px;border:1px solid var(--line);border-radius:8px;background:#f1f1f1"></iframe></div>' +
      '</div><div class="panel-f"><span class="muted" style="font-size:13px">Sale como ' + esc((S.me && (S.me.nombre || S.me.alias)) || '') + ' · àndale</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button type="submit" class="btn primary" id="ml-send">Enviar</button></span></div></form>';
    p.hidden = false; $('#scrim').hidden = false;
    chips();
  }

  async function ia(btn) {
    const idea = val('idea'); if (!idea) { toast('Escribí en una línea qué querés decir'); $('#ml-idea').focus(); return; }
    const n = st.clientes[0];
    btn.disabled = true; const t0 = btn.textContent; btn.innerHTML = '<span class="ia-dots"><i></i><i></i><i></i></span> Redactando…';
    try {
      const c = cli(n);
      const r = await data.ia({ modo: 'mail', texto: idea, contexto: { cliente: n || '', contacto: nombreDe(n), varios_clientes: st.clientes.length > 1, servicios: (ctx.servicios ? ctx.servicios(n) : ''), quien_escribe: S.me && (S.me.nombre || S.me.alias), ultimas_charlas: S.M.filter(m => m.cliente === n).slice(-3).map(m => ({ fecha: m.fecha, resumen: m.resumen })), notas_cliente: c.notas || '' } });
      if (r.asunto) $('#ml-asunto').value = r.asunto;
      if (r.mensaje) $('#ml-mensaje').value = st.clientes.length > 1 && nombreDe(n) ? r.mensaje.replace(new RegExp('\\b' + nombreDe(n) + '\\b', 'g'), '{nombre}') : r.mensaje;
      preview(); toast('Listo. Revisalo antes de mandar.');
    } catch (e) { toast(e.message); }
    btn.disabled = false; btn.textContent = t0;
  }
  async function texto(btn) {
    const ta = $('#ml-mensaje'); if (!ta.value.trim()) return;
    btn.disabled = true; const t0 = btn.textContent; btn.textContent = '…';
    try { const r = await data.ia({ modo: 'texto', tarea: btn.dataset.t, texto: ta.value }); if (r.texto) { ta.value = r.texto; preview(); } }
    catch (e) { toast(e.message); }
    btn.disabled = false; btn.textContent = t0;
  }
  async function send() {
    if (st.busy) return;
    if (!st.clientes.length) { toast('Elegí a qué cliente mandarlo'); return; }
    if (!val('asunto')) { toast('Falta el asunto'); $('#ml-asunto').focus(); return; }
    if (!(($('#ml-mensaje') || {}).value || '').trim()) { toast('Falta el mensaje'); return; }
    const uno = st.clientes.length === 1;
    const malos = lista(val('otros')).filter(e => !/^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(e));
    if (uno && malos.length) { toast('Email inválido: ' + malos.join(', ')); $('#ml-otros').focus(); return; }
    const destinos = st.clientes.map(n => ({ n, para: mailDe(n) }));
    const sin = destinos.filter(d => !d.para);
    if (uno && sin.length) { toast('Elegí a quién mandarlo o escribí un email'); return; }
    st.busy = true; const btn = $('#ml-send'); btn.disabled = true;
    let ok = 0; const errs = [];
    for (const d of destinos.filter(x => x.para)) {
      btn.textContent = 'Enviando ' + (ok + errs.length + 1) + ' de ' + (destinos.length - sin.length) + '…';
      const b = build(d.n);
      try {
        await data.sendEmail({ tipo: 'Mensaje', cliente_id: data.ids.cliente(d.n) || null, para: d.para, cc: val('cc'), asunto: b.asunto, html: b.html, texto: b.texto, copia: $('#ml-copia') ? $('#ml-copia').checked : true });
        ok++;
      } catch (e) { errs.push(d.n + ': ' + e.message); }
    }
    st.busy = false;
    if (!errs.length) { ctx.closeForm(); toast(ok === 1 ? 'Mail enviado' : ok + ' mails enviados' + (sin.length ? ' · ' + sin.length + ' clientes sin email' : '')); await ctx.reload(); return; }
    btn.disabled = false; btn.textContent = 'Reintentar';
    toast((ok ? ok + ' enviados. ' : '') + 'No salieron: ' + errs.join(' · '));
  }

  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'ml-add' && t.value) {
      const add = t.value === '__activos' ? S.C.filter(c => c.estado === 'Activo').map(c => c.nombre) : [t.value];
      add.forEach(n => { if (!st.clientes.includes(n)) st.clientes.push(n); });
      t.value = ''; chips(); return;
    }
    if (t.dataset && t.dataset.mlk) { if (t.checked) st.sel.add(t.dataset.mlk); else st.sel.delete(t.dataset.mlk); preview(); return; }
    if (t.id === 'ml-modo') { st.modo = t.value; chips(); return; }
    if (t.id === 'ml-tpl') { const x = PLANTILLAS.find(p => p[0] === t.value); if (x) { if (x[2]) $('#ml-asunto').value = x[2]; $('#ml-mensaje').value = x[3]; preview(); } return; }
  });
  document.addEventListener('input', e => {
    const t = e.target; if (!t.id || !t.id.startsWith('ml-') || t.id === 'ml-idea') return;
    clearTimeout(st.tm); st.tm = setTimeout(preview, 250);
  });
  document.addEventListener('submit', e => { if (e.target.id === 'mlform') { e.preventDefault(); e.stopImmediatePropagation(); send(); } }, true);

  return {
    open,
    acts: {
      mlQuitar: t => { st.clientes = st.clientes.filter(n => n !== t.dataset.n); chips(); },
      mlIA: t => ia(t),
      mlTxt: t => texto(t),
      mail: t => open({ para: t.dataset.para || '', clientes: t.dataset.cliente ? [t.dataset.cliente] : [...S.csel].map(id => (S.C.find(c => c._id === id) || {}).nombre).filter(Boolean) }),
    },
  };
}
