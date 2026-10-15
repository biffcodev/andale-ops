// Entregas por rondas y ficha del sitio web, dentro de cada proyecto.
// - Entregas: el equipo arma una ronda (o la entrega final) con descripción, links y archivos en Dropbox;
//   al mandarla, el cliente la ve en el portal y la aprueba o pide cambios. Las respuestas vuelven acá.
// - Sitio web: links de prueba y publicado, etapa y lo que falta (qué le toca al cliente y qué a àndale).
//   Nunca se guardan contraseñas: solo una nota de dónde están los accesos (gestor de contraseñas).
import { ICON } from './iconos.js';
import { confirmar } from './dialogo.js';

const ETAPAS_WEB = ['Diseño', 'Desarrollo', 'Revisión', 'Publicado', 'Mantenimiento'];
const CHECK_WEB = [
  ['Textos de cada sección', 'cliente'], ['Fotos e imágenes', 'cliente'], ['Logo y marca en alta', 'cliente'], ['Acceso al dominio y hosting', 'cliente'], ['Aprobación del diseño', 'cliente'],
  ['Maquetación', 'andale'], ['Versión mobile revisada', 'andale'], ['Formularios y mails probados', 'andale'], ['SEO básico y analytics', 'andale'], ['Publicación', 'andale'],
];
const EST = { Borrador: '--s-empezar', Enviada: '--s-revision', Cambios: '--s-cancelado', Aprobada: '--s-entregado' };
const VER = { Borrador: 'Borrador', Enviada: 'Con el cliente', Cambios: 'Pidió cambios', Aprobada: 'Aprobada' };

export function initEntregas(ctx) {
  const { S, esc, opt, toast, data, render, $, fmt, isStaff, emptyBox, hil, closeForm } = ctx;
  const de = p => (S.EN || []).filter(e => e.proyectoId === p._id).sort((a, b) => (a.orden - b.orden) || String(a.creado).localeCompare(String(b.creado)));
  const sitioDe = p => (S.SI || []).find(x => x.proyectoId === p._id);
  const linksTxt = ls => (ls || []).map(l => (l.nombre ? l.nombre + ' | ' : '') + l.url).join('\n');
  const parseLinks = t => String(t || '').split('\n').map(l => l.trim()).filter(Boolean).map(l => { const i = l.lastIndexOf('|'); const url = (i >= 0 ? l.slice(i + 1) : l).trim(), nombre = i >= 0 ? l.slice(0, i).trim() : ''; return /^https?:\/\//i.test(url) ? { nombre, url } : null; }).filter(Boolean);

  /* ---------- Entregas ---------- */
  function entregasHtml(p) {
    if (!Array.isArray(S.EN)) return '<section class="sheet">' + emptyBox('Falta actualizar la base', 'Corré el SQL 0016 para usar entregas.') + '</section>';
    const es = de(p), staff = isStaff();
    const pend = es.filter(e => e.estado === 'Enviada').length, cam = es.filter(e => e.estado === 'Cambios').length;
    let h = '<section class="sheet"><div class="sheet-h"><div><h2>Entregas al cliente</h2><p class="muted" style="margin:4px 0 0;font-size:13px">Cada ronda se manda al portal: el cliente la ve, la aprueba o pide cambios.' + (pend ? ' · ' + pend + ' esperando respuesta' : '') + (cam ? ' · <b style="color:var(--crit)">' + cam + ' con cambios pedidos</b>' : '') + '</p></div>' +
      (staff ? '<span class="toolbar"><button class="btn sm" data-act="enNueva" data-id="' + esc(p._id) + '" data-tipo="Ronda">+ Ronda</button><button class="btn sm primary" data-act="enNueva" data-id="' + esc(p._id) + '" data-tipo="Entrega final">+ Entrega final</button></span>' : '') + '</div>';
    if (!es.length) return h + emptyBox('Todavía no hay entregas', 'Armá la primera ronda con lo que vas a mostrar: descripción, links (Figma, Drive, preview) y archivos.') + '</section>';
    h += '<div class="en-list">' + es.map((e, i) => '<article class="en"><div class="en-h"><span class="en-n">' + (e.tipo === 'Entrega final' ? ICON.check : 'R' + (es.slice(0, i + 1).filter(x => x.tipo === 'Ronda').length)) + '</span><div class="en-t"><b>' + esc(e.titulo || e.tipo) + '</b><span class="muted">' + esc(e.tipo) + (e.enviadaAt ? ' · enviada el ' + esc(fmt(String(e.enviadaAt).slice(0, 10))) : '') + (e.respondidaAt ? ' · respondió el ' + esc(fmt(String(e.respondidaAt).slice(0, 10))) : '') + '</span></div>' +
      '<span class="pzst" style="--c:var(' + EST[e.estado] + ')">' + esc(VER[e.estado] || e.estado) + '</span></div>' +
      (e.descripcion ? '<p class="en-d">' + esc(e.descripcion) + '</p>' : '') +
      ((e.links || []).length || (e.archivos || []).length ? '<div class="en-f">' + (e.links || []).map(l => '<a class="btn sm" href="' + esc(l.url) + '" target="_blank" rel="noopener">' + esc(l.nombre || l.url.replace(/^https?:\/\//, '').slice(0, 40)) + ' ↗</a>').join('') + (e.archivos || []).map(a => '<span class="en-a">' + ICON.clip + esc(a.nombre || String(a.path).split('/').pop()) + '</span>').join('') + '</div>' : '') +
      (e.respuesta ? '<p class="en-r' + (e.estado === 'Cambios' ? ' cam' : '') + '"><b>' + esc(e.aprobadoPor || 'El cliente') + ':</b> ' + esc(e.respuesta) + '</p>' : e.estado === 'Aprobada' ? '<p class="en-r ok"><b>Aprobada' + (e.aprobadoPor ? ' por ' + esc(e.aprobadoPor) : '') + '</b></p>' : '') +
      (staff ? '<div class="toolbar en-acc">' + (e.estado !== 'Aprobada' ? '<button class="btn sm' + (e.estado === 'Enviada' ? '' : ' primary') + '" data-act="enMandar" data-id="' + esc(e._id) + '">' + (e.estado === 'Enviada' ? 'Volver a avisar' : e.estado === 'Cambios' ? 'Mandar la corrección' : 'Mandar al cliente') + '</button>' : '') +
        '<label class="btn sm ghost" style="cursor:pointer">' + ICON.clip + 'Subir archivos<input type="file" multiple hidden data-enup="' + esc(e._id) + '"></label><button class="btn sm ghost" data-act="enEditar" data-id="' + esc(e._id) + '">Editar</button></div>' : '') +
      '<details class="en-hilo"><summary>Comentarios</summary>' + hil().html('entrega', e._id, { cliente: p.cliente, proyectoId: p._id, publico: true, compacto: true, vacio: 'Lo que se hable de esta entrega, con el cliente o entre el equipo.' }) + '</details></article>').join('') + '</div>';
    return h + '</section>';
  }
  function formEntrega(p, e, tipo) {
    S.form = null;
    const v = e || { tipo: tipo || 'Ronda', titulo: (tipo === 'Entrega final' ? 'Entrega final' : 'Ronda ' + (de(p).filter(x => x.tipo === 'Ronda').length + 1)), descripcion: '', links: [] };
    $('#panel').innerHTML = '<form id="enform" novalidate style="display:contents"><div class="panel-h"><div><span class="eyebrow">' + esc(p.cliente + ' · ' + p.proyecto) + '</span><h2 id="panel-title">' + (e ? 'Editar entrega' : 'Nueva entrega') + '</h2></div><button type="button" class="btn ghost" data-act="close" aria-label="Cerrar">✕</button></div><div class="panel-b">' +
      '<div class="field"><label for="en-tipo">Tipo</label><select id="en-tipo">' + ['Ronda', 'Entrega final'].map(t => opt(t, t, v.tipo)).join('') + '</select></div>' +
      '<div class="field"><label for="en-titulo">Título</label><input id="en-titulo" value="' + esc(v.titulo) + '" placeholder="Ej.: Ronda 1 · propuestas de logo"></div>' +
      '<div class="field full"><label for="en-desc">Qué le mostramos (lo lee el cliente)</label><textarea id="en-desc" rows="5" placeholder="Contale qué hay en esta ronda y qué necesitás que mire o decida.">' + esc(v.descripcion) + '</textarea></div>' +
      '<div class="field full"><label for="en-links">Links</label><textarea id="en-links" rows="3" placeholder="Un link por renglón. Con nombre: Presentación | https://…">' + esc(linksTxt(v.links)) + '</textarea><span class="hint">Figma, Drive, preview de la web, presentación. Los archivos se suben a Dropbox desde la entrega.</span></div>' +
      '</div><div class="panel-f"><span>' + (e && e.estado === 'Borrador' ? '<button type="button" class="btn ghost danger" data-act="enBorrar" data-id="' + esc(e._id) + '">Eliminar</button>' : '') + '</span><span style="display:flex;gap:8px"><button type="button" class="btn" data-act="close">Cancelar</button><button class="btn primary" id="ensave">Guardar</button></span></div></form>';
    $('#panel').hidden = false; $('#scrim').hidden = false;
    S.enf = { p, id: e ? e._id : null };
    setTimeout(() => { const t = $('#en-desc'); if (t) t.focus(); }, 30);
  }
  async function guardarEntrega() {
    const f = S.enf; if (!f) return;
    const g = id => (($('#' + id) || {}).value || '').trim();
    const u = { tipo: g('en-tipo'), titulo: g('en-titulo'), descripcion: g('en-desc'), links: parseLinks(g('en-links')) };
    if (!u.titulo) u.titulo = u.tipo;
    const b = $('#ensave'); if (b) { b.disabled = true; b.textContent = 'Guardando…'; }
    try { if (!f.id) u.orden = de(f.p).length; await data.entregaGuardar(f.id, u, f.p); closeForm(); toast('Entrega guardada'); await ctx.reload(); }
    catch (e) { toast(e.message); if (b) { b.disabled = false; b.textContent = 'Guardar'; } }
  }
  async function subir(input) {
    const id = input.dataset.enup, files = [...input.files]; input.value = '';
    const e = (S.EN || []).find(x => x._id === id); if (!e || !files.length) return;
    const nuevos = [];
    for (const f of files) {
      toast('Subiendo ' + f.name + '…');
      try {
        let path;
        try {
          const r = await data.dropbox({ accion: 'subida', destino: 'entrega', id, nombre: f.name });
          const up = await fetch(r.link, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: f });
          if (!up.ok) throw new Error('Dropbox no aceptó el archivo (' + up.status + ')');
          const meta = await up.json().catch(() => ({})); path = meta.path_display || r.path;
        } catch (e1) {
          if (f.size > 6e6) throw e1;
          const b64 = await new Promise((ok, no) => { const fr = new FileReader(); fr.onload = () => ok(String(fr.result).split(',')[1]); fr.onerror = no; fr.readAsDataURL(f); });
          path = (await data.dropbox({ accion: 'subir', destino: 'entrega', id, nombre: f.name, base64: b64 })).path;
        }
        nuevos.push({ path, nombre: f.name, tipo: f.type, tam: f.size });
      } catch (err) { toast(f.name + ': ' + err.message); }
    }
    if (!nuevos.length) return;
    try { await data.entregaGuardar(id, { archivos: [...(e.archivos || []), ...nuevos] }); toast(nuevos.length === 1 ? 'Archivo subido' : nuevos.length + ' archivos subidos'); await ctx.reload(); }
    catch (err) { toast(err.message); }
  }

  /* ---------- Sitio web ---------- */
  function sitioHtml(p) {
    if (!Array.isArray(S.SI)) return '<section class="sheet">' + emptyBox('Falta actualizar la base', 'Corré el SQL 0016 para usar la ficha del sitio.') + '</section>';
    const s = sitioDe(p), staff = isStaff();
    if (!s) return '<section class="sheet">' + emptyBox('Todavía no hay ficha del sitio', 'Links de prueba y publicado, en qué etapa está y lo que falta (lo del cliente y lo nuestro). El cliente la ve en su portal.') + (staff ? '<div style="display:flex;justify-content:center;padding:0 0 22px"><button class="btn primary" data-act="siCrear" data-id="' + esc(p._id) + '">Armar la ficha del sitio</button></div>' : '') + '</section>';
    const cl = s.checklist || [], hechos = cl.filter(x => x.ok).length, dis = staff ? '' : ' disabled';
    const fila = (x, i) => '<div class="si-r"><input type="checkbox" data-sik="ok" data-i="' + i + '"' + (x.ok ? ' checked' : '') + dis + ' aria-label="Hecho"><input class="in" data-sik="n" data-i="' + i + '" value="' + esc(x.n) + '"' + dis + ' aria-label="Qué falta"><select class="in" data-sik="de" data-i="' + i + '"' + dis + ' aria-label="A quién le toca">' + opt('cliente', 'Le toca al cliente', x.de) + opt('andale', 'Lo hace àndale', x.de === 'cliente' ? '' : 'andale') + '</select>' + (staff ? '<button type="button" class="btn ghost sm" data-act="siDel" data-i="' + i + '" aria-label="Quitar">✕</button>' : '') + '</div>';
    return '<section class="sheet" data-si="' + esc(s._id) + '"><div class="sheet-h"><div><h2>Sitio web</h2><p class="muted" style="margin:4px 0 0;font-size:13px">' + hechos + ' de ' + cl.length + ' listos · ' + (s.visible ? 'el cliente lo ve en su portal' : 'oculto para el cliente') + '</p></div>' +
      '<span class="toolbar">' + (s.preview ? '<a class="btn sm" href="' + esc(s.preview) + '" target="_blank" rel="noopener">Prueba ↗</a>' : '') + (s.prod ? '<a class="btn sm" href="' + esc(s.prod) + '" target="_blank" rel="noopener">Publicado ↗</a>' : '') + '</span></div>' +
      '<div class="sheet-b si-g">' +
      '<div class="field"><label for="si-pre">Link de prueba (preview)</label><input id="si-pre" type="url" value="' + esc(s.preview) + '" placeholder="https://…"' + dis + '></div>' +
      '<div class="field"><label for="si-prod">Link publicado</label><input id="si-prod" type="url" value="' + esc(s.prod) + '" placeholder="https://…"' + dis + '></div>' +
      '<div class="field"><label for="si-et">Etapa</label><select id="si-et"' + dis + '>' + opt('', '—', s.etapa) + ETAPAS_WEB.map(e => opt(e, e, s.etapa)).join('') + '</select></div>' +
      '<label class="chk" style="align-self:end"><input type="checkbox" id="si-vis"' + (s.visible ? ' checked' : '') + dis + '> Visible en el portal del cliente</label>' +
      '<div class="field full"><label for="si-acc">Dónde están los accesos</label><input id="si-acc" value="' + esc(s.accesos) + '" placeholder="Ej.: en 1Password, bóveda Clientes → ' + esc(p.cliente) + '"' + dis + '><span class="hint">' + ICON.candado + ' Nunca pegues contraseñas acá: solo dónde encontrarlas. El cliente ve este texto.</span></div>' +
      '<div class="field full"><span class="lbl">Lo que falta</span><div class="si-l">' + cl.map(fila).join('') + '</div>' + (staff ? '<button type="button" class="btn sm ghost" data-act="siAdd" style="justify-self:start">+ Agregar</button>' : '') + '</div>' +
      '<div class="field full"><label for="si-notas">Notas internas (no las ve el cliente)</label><textarea id="si-notas" rows="2"' + dis + '>' + esc(s.notas) + '</textarea></div>' +
      (staff ? '<div class="toolbar full"><button class="btn primary" data-act="siGuardar">Guardar ficha</button></div>' : '') + '</div></section>';
  }
  function leerSitio(sec) {
    const g = id => (sec.querySelector('#' + id) || {}).value || '';
    const cl = [...sec.querySelectorAll('.si-r')].map(r => ({ ok: r.querySelector('[data-sik="ok"]').checked, n: r.querySelector('[data-sik="n"]').value.trim(), de: r.querySelector('[data-sik="de"]').value })).filter(x => x.n);
    return { preview: g('si-pre').trim(), prod: g('si-prod').trim(), etapa: g('si-et'), visible: !!(sec.querySelector('#si-vis') || {}).checked, accesos: g('si-acc').trim(), notas: g('si-notas').trim(), checklist: cl };
  }
  const proyDe = id => S.P.find(x => x._id === id);
  const acts = {
    enNueva: t => { const p = proyDe(t.dataset.id); if (p) formEntrega(p, null, t.dataset.tipo); },
    enEditar: t => { const e = (S.EN || []).find(x => x._id === t.dataset.id); const p = e && proyDe(e.proyectoId); if (p) formEntrega(p, e); },
    enBorrar: async t => { if (!await confirmar('¿Borrar esta entrega?')) return; try { await data.entregaDel(t.dataset.id); closeForm(); toast('Borrada'); await ctx.reload(); } catch (e) { toast(e.message); } },
    enMandar: async t => {
      const e = (S.EN || []).find(x => x._id === t.dataset.id), p = e && proyDe(e.proyectoId); if (!p) return;
      if (!e.descripcion && !(e.links || []).length && !(e.archivos || []).length) { toast('La entrega está vacía: agregale una descripción, links o archivos.'); return; }
      if (!await confirmar('“' + (e.titulo || e.tipo) + '” se publica en el portal de ' + p.cliente + ' para que la apruebe o pida cambios. ¿Seguimos?')) return;
      try { await data.entregaGuardar(e._id, { estado: 'Enviada', enviadaAt: new Date().toISOString() }); toast('Listo: ' + p.cliente + ' ya la ve en el portal'); await ctx.reload(); if (ctx.avisarCliente) ctx.avisarCliente(p.cliente, 'entrega', { titulo: e.titulo || e.tipo, proyecto: p.proyecto }); }
      catch (err) { toast(err.message); }
    },
    siCrear: async t => { const p = proyDe(t.dataset.id); if (!p) return; try { await data.sitioGuardar(null, { checklist: CHECK_WEB.map(([n, d]) => ({ n, de: d, ok: false })), visible: true }, p); await ctx.reload(); } catch (e) { toast(e.message); } },
    siAdd: t => { const l = t.closest('section').querySelector('.si-l'); const d = document.createElement('div'); d.innerHTML = '<div class="si-r"><input type="checkbox" data-sik="ok" aria-label="Hecho"><input class="in" data-sik="n" placeholder="Qué falta" aria-label="Qué falta"><select class="in" data-sik="de" aria-label="A quién le toca">' + opt('cliente', 'Le toca al cliente', 'cliente') + opt('andale', 'Lo hace àndale', '') + '</select><button type="button" class="btn ghost sm" data-act="siDel" aria-label="Quitar">✕</button></div>'; const r = d.firstChild; l.appendChild(r); r.querySelector('[data-sik="n"]').focus(); },
    siDel: t => { const r = t.closest('.si-r'); if (r) r.remove(); },
    siGuardar: async t => {
      const sec = t.closest('section[data-si]'), s = (S.SI || []).find(x => x._id === sec.dataset.si), p = s && proyDe(s.proyectoId); if (!p) return;
      const u = leerSitio(sec);
      if (/contraseñ|password|clave\s*[:=]|pass\s*[:=]/i.test(u.accesos + ' ' + u.notas) && !await confirmar('Parece que hay una contraseña escrita. Acá solo va dónde están los accesos (por ejemplo, el gestor de contraseñas). ¿Guardar igual?')) return;
      t.disabled = true; try { await data.sitioGuardar(s._id, u, p); toast('Ficha guardada'); await ctx.reload(); } catch (e) { toast(e.message); t.disabled = false; }
    },
  };
  document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.enup) subir(e.target); });
  document.addEventListener('submit', e => { if (e.target.id === 'enform') { e.preventDefault(); guardarEntrega(); } });
  const cuenta = p => { const es = de(p); return { n: es.length, pend: es.filter(e => e.estado === 'Cambios').length }; };
  return { entregasHtml, sitioHtml, acts, cuenta, tieneSitio: p => !!sitioDe(p) };
}
