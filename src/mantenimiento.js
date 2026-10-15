// Ajustes → mantenimiento (solo admins):
// - Copia de seguridad de todo (JSON para guardar, Excel para mirar).
// - Empezar de cero: borra clientes, proyectos, plata y redes de prueba; deja equipo, opciones, flujos, cuentas, sueldos y conexiones.
// - Carga inicial guiada: qué falta cargar para arrancar en limpio, con acceso directo a cada lugar.
// - Errores de la app: lo que falló en el navegador de alguien, para poder arreglarlo.
import { ICON } from './iconos.js';

export function initMantenimiento(ctx, k) {
  const { S, esc, toast, $, emptyBox, thisMonth } = ctx;
  const { AD, data } = k;
  AD.mt = { prog: '', copia: false, errores: null, cargandoErr: false, verErr: false };
  const hoy = () => new Date().toISOString().slice(0, 10);
  const bajar = (blob, nombre) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000); };

  function pasos() {
    const act = S.C.filter(c => c.estado === 'Activo'), conCobros = act.filter(c => (S.K || []).some(x => x.cliente === c.nombre && x.cobros && x.email));
    const abAct = S.A.filter(a => a.estado === 'Activo'), conPrecio = abAct.filter(a => k.precioEn(a._id, thisMonth()));
    const saldoIni = new Set(AD.MV.filter(v => v.cuenta === 'Saldo Inicial').map(v => v.caja_id));
    const planes = Object.keys(S.L || {}).filter(x => x.startsWith('plan:')).length;
    const ch = AD.AJ && AD.AJ.rentabilidad && AD.AJ.rentabilidad.costo_hora, st = AD.as && AD.as.estado;
    const portal = (S.K || []).filter(x => x.portal).length;
    return [
      ['equipo', 'Equipo con email y rol', S.E.filter(e => e.activo !== false).length > 1, S.E.filter(e => e.activo !== false).length + ' personas', 'equipo'],
      ['integraciones', 'Conexiones (IA, Drive, email, Slack, Dropbox, Tally)', !!(st && st.ia && st.drive && st.email), st ? [st.ia ? 'IA ✓' : 'IA falta', st.drive ? 'Drive ✓' : 'Drive falta', st.email ? 'Email ✓' : 'Email falta'].join(' · ') + ' · el resto en Integraciones' : 'revisalas en Integraciones', 'integraciones'],
      ['listas', 'Flujos de trabajo y planes de redes', (S.FL || []).length > 0 && planes > 0, ((S.FL || []).length ? (S.FL || []).length + ' flujos guardados' : 'flujos sugeridos sin revisar') + ' · ' + planes + ' planes con piezas', 'listas'],
      ['cajas', 'Cuentas de banco con su saldo inicial', AD.CJ.length > 0 && AD.CJ.every(c => saldoIni.has(c.id)), AD.CJ.length + ' cuentas · ' + AD.CJ.filter(c => saldoIni.has(c.id)).length + ' con saldo inicial', 'gastos'],
      ['pagos', 'Sueldos, honorarios y proveedores', AD.CO.length > 0, AD.CO.length + ' cargados', 'pagos'],
      ['clientes', 'Clientes activos (con logo)', act.length > 0, act.length + ' activos · ' + act.filter(c => c.avatar).length + ' con logo', 'clientes'],
      ['contactos', 'Contacto que recibe cobros en cada cliente', act.length > 0 && conCobros.length === act.length, conCobros.length + ' de ' + act.length + ' clientes activos', 'clientes'],
      ['abonos', 'Abonos con su precio vigente', abAct.length > 0 && conPrecio.length === abAct.length, conPrecio.length + ' de ' + abAct.length + ' abonos activos', 'abonos'],
      ['rent', 'Costo de la hora del equipo', !!ch, ch ? 'cargado' : 'se usa el estimado con sueldos', 'numeros'],
      ['portal', 'Clientes en el portal', portal > 0, portal + ' contactos con acceso', 'clientes'],
    ];
  }

  function html() {
    const ps = pasos(), listos = ps.filter(p => p[2]).length, mt = AD.mt;
    let h = '<section class="sheet sx" id="mt-carga"><div class="sx-h"><span class="sx-i">' + ICON.tarea + '</span><h2>Carga inicial <span class="sx-sub">(' + listos + ' de ' + ps.length + ' listos)</span></h2></div>' +
      '<div class="sx-panel"><div class="mt-pasos">' + ps.map(([key, l, ok, sub, v]) => '<button class="mt-paso' + (ok ? ' ok' : '') + '" data-act="go" data-view="' + esc(v) + '"><span class="mt-c">' + (ok ? ICON.check : '') + '</span><span class="mt-t"><b>' + esc(l) + '</b><small>' + esc(sub) + '</small></span><span class="mt-ir">Ir →</span></button>').join('') + '</div></div></section>';
    h += '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.descargar + '</span><h2>Copia de seguridad</h2></div><div class="sx-panel mt-b">' +
      '<p class="sx-lead">Baja <b>todo</b> lo que hay en la base: clientes, proyectos, tareas, plata, redes y configuración. Guardala en un lugar seguro: tiene datos de clientes y de facturación.</p>' +
      '<div class="toolbar"><button class="btn primary" data-act="mtCopia" data-f="json"' + (mt.prog ? ' disabled' : '') + '>' + ICON.descargar + 'Descargar copia (JSON)</button><button class="btn" data-act="mtCopia" data-f="xlsx"' + (mt.prog ? ' disabled' : '') + '>' + ICON.excel + 'En Excel, para mirarla</button>' + (mt.prog ? '<span class="muted">' + esc(mt.prog) + '</span>' : mt.copia ? '<span class="pzst" style="--c:var(--s-entregado)">Copia descargada</span>' : '') + '</div></div></section>';
    h += '<section class="sheet sx mt-reset"><div class="sx-h"><span class="sx-i" style="--c1:var(--crit)">' + ICON.alerta + '</span><h2>Empezar de cero</h2></div><div class="sx-panel mt-b">' +
      '<p class="sx-lead"><b>Se borra:</b> clientes, contactos, abonos, proyectos, tareas, charlas, presupuestos, resúmenes, facturas, gastos e ingresos, sueldos pagados, redes, tickets, briefs e informes.<br><b>Queda:</b> el equipo, las opciones y flujos, el plan de cuentas, las cuentas de banco, las personas y sueldos que se pagan, los ajustes y las conexiones.</p>' +
      '<p class="sx-lead">No se puede deshacer. Primero descargá la copia.</p>' +
      '<div class="toolbar"><label class="chk"><input type="checkbox" id="mt-tengo"' + (mt.copia ? ' checked' : '') + '> Ya tengo la copia guardada</label><input class="in" id="mt-conf" placeholder="Escribí BORRAR TODO" autocomplete="off" aria-label="Confirmación"><button class="btn danger" data-act="mtReset">Borrar los datos de prueba</button></div></div></section>';
    h += '<section class="sheet sx"><div class="sx-h"><span class="sx-i">' + ICON.alerta + '</span><h2>Errores de la app</h2><div class="sx-der">' + (mt.verErr && (mt.errores || []).length ? '<button class="btn sm ghost" data-act="mtErrBorrar">Borrar todos</button>' : '') + '<button class="btn sm" data-act="mtErr">' + (mt.verErr ? 'Actualizar' : 'Ver') + '</button></div></div>' +
      (mt.verErr ? (mt.errores == null ? '<div class="sx-panel"><p class="sx-lead" style="margin:0">' + (mt.cargandoErr ? 'Cargando…' : 'No se pudieron leer (¿corrió el SQL 0016?).') + '</p></div>' : mt.errores.length ? '<div class="tbl"><table><thead><tr><th>Cuándo</th><th>Quién</th><th>Qué pasó</th><th>Dónde</th></tr></thead><tbody>' + mt.errores.map(e => '<tr><td class="mono">' + esc(String(e.created_at).slice(0, 16).replace('T', ' ')) + '</td><td>' + esc(e.quien || '—') + '</td><td><b>' + esc(e.mensaje) + '</b>' + (e.detalle ? '<details><summary class="muted">detalle</summary><pre class="mt-pre">' + esc(e.detalle) + '</pre></details>' : '') + '</td><td class="muted">' + esc(String(e.url || '').replace(/^https?:\/\/[^/]+/, '')) + '</td></tr>').join('') + '</tbody></table></div>' : emptyBox('Sin errores', 'Cuando algo falla en la app de alguien queda registrado acá.'))
        : '<div class="sx-panel"><p class="sx-lead" style="margin:0">Cuando algo falla en la app de alguien del equipo queda registrado acá, con qué estaba haciendo.</p></div>') + '</section>';
    return h;
  }

  async function copia(fmt) {
    const mt = AD.mt;
    try {
      const d = await data.backup((i, n, t) => { mt.prog = 'Juntando ' + t + ' (' + i + ' de ' + n + ')…'; const el = document.querySelector('.mt-b .muted'); if (el) el.textContent = mt.prog; else ctx.render(); });
      if (fmt === 'json') bajar(new Blob([JSON.stringify({ app: 'àndale Operaciones', fecha: new Date().toISOString(), tablas: d }, null, 1)], { type: 'application/json' }), 'andale-copia-' + hoy() + '.json');
      else {
        const XLSX = await import('xlsx'); const wb = XLSX.utils.book_new();
        Object.entries(d).forEach(([t, rows]) => { if (!Array.isArray(rows) || !rows.length) return; const plano = rows.map(r => Object.fromEntries(Object.entries(r).map(([kk, v]) => [kk, v && typeof v === 'object' ? JSON.stringify(v) : v]))); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(plano), t.slice(0, 31)); });
        XLSX.writeFile(wb, 'andale-copia-' + hoy() + '.xlsx');
      }
      mt.copia = true; toast('Copia descargada: ' + Object.values(d).reduce((a, r) => a + (Array.isArray(r) ? r.length : 0), 0) + ' registros');
    } catch (e) { toast('No se pudo armar la copia: ' + e.message); }
    mt.prog = ''; ctx.render();
  }
  const actions = {
    mtCopia: t => copia(t.dataset.f),
    mtReset: async () => {
      const conf = (($('#mt-conf') || {}).value || '').trim();
      if (!($('#mt-tengo') || {}).checked) { toast('Primero descargá la copia y marcá que la tenés guardada'); return; }
      if (conf !== 'BORRAR TODO') { toast('Escribí BORRAR TODO, en mayúsculas, para confirmar'); return; }
      if (!window.confirm('Última confirmación: se borran todos los clientes, proyectos, plata y redes. ¿Seguimos?')) return;
      try { const r = await data.resetDatos(conf); toast('Listo: se borraron ' + (r && r.borrados) + ' registros. Empezá por la carga inicial.'); await ctx.reload(); setTimeout(() => { const el = document.getElementById('mt-carga'); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 200); }
      catch (e) { toast(e.message); }
    },
    mtErr: async () => { const mt = AD.mt; mt.verErr = true; mt.cargandoErr = true; ctx.render(); mt.errores = await data.errores(); mt.cargandoErr = false; ctx.render(); },
    mtErrBorrar: async () => { if (!window.confirm('¿Borrar la lista de errores?')) return; try { await data.erroresBorrar(); AD.mt.errores = []; ctx.render(); } catch (e) { toast(e.message); } },
  };
  return { html, actions };
}
