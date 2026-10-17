// Asistente: qué falta para cerrar el mes, facturas de Google Drive leídas con IA,
// conciliación de extractos bancarios y reparto de pagos a proveedores. La IA propone; un admin confirma.
import { mesFactura } from './mesfactura.js';
import { nombreArchivoFactura, extDe } from './normaliza.js';
import { gastoIA, usd as usdIA } from './iacosto.js';
import * as data from './data.js';

const soloDig = s => String(s || '').replace(/\D/g, '');
export const carpetaId = s => { s = String(s || '').trim(); const m = s.match(/folders\/([\w-]{10,})/) || s.match(/[?&]id=([\w-]{10,})/); return m ? m[1] : (/^[\w-]{10,}$/.test(s) ? s : ''); };
function leerArchivo(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onerror = () => rej(new Error('No se pudo leer el archivo'));
    r.onload = () => { const s = String(r.result || ''); res(s.slice(s.indexOf(',') + 1)); };
    r.readAsDataURL(file);
  });
}
const leerTexto = file => new Promise((res, rej) => { const r = new FileReader(); r.onerror = () => rej(new Error('No se pudo leer el archivo')); r.onload = () => res(String(r.result || '')); r.readAsText(file); });
const b64Bytes = b64 => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

export function initAsistente(ctx, k) {
  const { S, esc, opt, pill, fmt, monthLabel, thisMonth, addMonth, today, cmp, norm, emptyBox, toast, $ } = ctx;
  const { AD, money, parseMonto, r2, add, multi, lock, cap, openPanel } = k;
  AD.as = { mes: thisMonth(), estado: null, estadoBusy: false, brief: null, briefBusy: false, conc: null, concBusy: false, driveBusy: '', df: 'pendientes', concCaja: '' };
  const eq = () => k.equipo;
  const cfgDrive = () => (AD.AJ && AD.AJ.drive) || {};
  const cfgEmisores = () => (AD.AJ && AD.AJ.emisores) || {};
  const cfgAsist = () => (AD.AJ && AD.AJ.asistente) || {};
  // Solo para mostrar: los estados guardados no cambian.
  const VER_DA = { Nuevo: 'Sin leer', 'Leído': 'Lista para cargar', Vinculado: 'Cargada', Ignorado: 'Descartada', Error: 'No se pudo leer' };
  const verConf = c => c === 'alta' ? '✓' : c ? 'Revisar' : '';
  const verTipo = t => t === 'Invoice' ? 'Factura al exterior' : t;

  async function cargarEstado(force) {
    if (AD.as.estadoBusy || (AD.as.estado && !force)) return;
    AD.as.estadoBusy = true;
    try { AD.as.estado = await data.asistente({ accion: 'estado' }); }
    catch (err) { AD.as.estado = { ia: false, drive: false, error: err.message }; }
    AD.as.estadoBusy = false; if (['asistente', 'ajustes', 'cobros', 'gastos'].includes(S.view)) ctx.render();
  }

  /* ---------- checklist del cierre ---------- */
  function provSinImputar(anio) {
    const imp = new Map(); AD.IMP.forEach(x => imp.set(x.movimiento_id, (imp.get(x.movimiento_id) || 0) + x.monto));
    return AD.MV.filter(v => (v.fecha || '').startsWith(anio) && v.cuenta === 'Proveedores' && v.egreso > 0 && v.egreso - (imp.get(v.id) || 0) > 0.009).sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
  }
  function checklist(m) {
    // Antes del mes en que arrancamos con la app no se pide nada de ese mes (resúmenes, precios, sueldos); solo lo que ya está cargado y vence.
    if (k.antesDeArrancar && k.antesDeArrancar(m)) return { periodo: m, clientes: 0, sinPrecio: [], sinArmar: [], borradores: [], sinComp: [], vencidas: AD.F.filter(f => k.estadoFactura(f) === 'Vencida'), aumentos: [], liqFalt: [], liqPend: [], sinImp: [], drive: AD.DA.filter(d => d.estado === 'Nuevo' || d.estado === 'Leído'), cuotas: [] };
    const cl = k.clientesDelMes(m), resM = AD.R.filter(r => r.periodo === m);
    const pf = AD.PF.filter(c => c.periodo === m);
    return {
      periodo: m, clientes: cl.length,
      sinPrecio: S.A.filter(a => k.abonoEnMes(a, m) && !k.precioEn(a._id, m)),
      sinArmar: cl.filter(c => !resM.some(r => r.cliente === c) && k.sugerencias(c, m).length),
      borradores: resM.filter(r => r.estado !== 'Enviado'),
      sinComp: resM.filter(r => r.estado === 'Enviado' && !AD.F.some(f => f.cliente === r.cliente && f.periodo === m)),
      vencidas: AD.F.filter(f => k.estadoFactura(f) === 'Vencida'),
      aumentos: AD.PR.filter(p => p.desde > m && !p.aviso_enviado),
      liqFalt: eq().faltantes(m), liqPend: eq().liqMes(m).filter(l => !l.movimiento_id),
      sinImp: provSinImputar(m.slice(0, 4)),
      drive: AD.DA.filter(d => d.estado === 'Nuevo' || d.estado === 'Leído'),
      cuotas: pf,
    };
  }
  const pendientesCount = () => { const c = checklist(thisMonth()); return [c.sinPrecio, c.sinArmar, c.borradores, c.vencidas, c.liqPend.length ? [1] : c.liqFalt].filter(x => x.length).length; };
  function checklistJSON(c) { // lo que viaja a la IA: nombres y montos, sin datos bancarios
    const nom = c.sinPrecio.map(a => a.cliente + ' (' + a.tipo + ')');
    return {
      periodo: c.periodo, hoy: today(), clientes_del_mes: c.clientes, abonos_sin_precio: nom, resumenes_sin_armar: c.sinArmar, resumenes_sin_enviar: c.borradores.map(r => r.cliente),
      sin_comprobante: c.sinComp.map(r => r.cliente), facturas_vencidas: c.vencidas.map(f => ({ cliente: f.cliente, comprobante: f.tipo + ' ' + (f.numero || 's/n'), saldo: f.saldo, moneda: f.moneda, vencio: f.vencimiento })),
      aumentos_sin_avisar: c.aumentos.length, liquidacion: { sin_generar: c.liqFalt.length, items_pendientes: c.liqPend.length, total_pendiente: multi(c.liqPend.reduce((a, l) => add(a, l.moneda, l.monto), {})) },
      pagos_sin_imputar: c.sinImp.length, drive_sin_vincular: c.drive.length, cuotas_de_proyectos: c.cuotas.length,
    };
  }

  /* ---------- Drive: reconocer cliente, emisor y comprobante ---------- */
  const nombreMes = p => monthLabel(p).replace(' de ', ' ');
  const mesDe = (d, cliente, archivo) => mesFactura(d, cliente, archivo, { R: AD.R || [], F: AD.F || [] });
  function matchArchivo(da) {
    const d = da.datos || {};
    const em = cfgEmisores(); const emisor = Object.keys(em).find(x => soloDig(em[x] && em[x].cuit) && soloDig(em[x].cuit) === soloDig(d.emisor_cuit)) || '';
    let cliente = '';
    if (d.receptor_cuit) for (const [n, ca] of AD.CA) if (soloDig(ca.cuit) && soloDig(ca.cuit) === soloDig(d.receptor_cuit)) cliente = n;
    if (!cliente && d.receptor_nombre) {
      const r = norm(d.receptor_nombre).replace(/\b(s\.?a\.?s?|s\.?r\.?l\.?|srl|sa|sas)\b\.?/g, '').trim();
      const hit = [...AD.CA].find(([, ca]) => ca.razon_social && norm(ca.razon_social).includes(r)) || [];
      cliente = hit[0] || (S.C.find(c => { const n = norm(c.nombre); return n.length > 2 && (r.includes(n) || n.includes(r)); }) || {}).nombre || '';
    }
    const numero = d.numero_completo || '';
    const nDig = soloDig(d.numero).replace(/^0+/, '');
    const existente = numero ? AD.F.find(f => f.numero && (f.numero === numero || (nDig && soloDig(f.numero).replace(/^0+/, '').endsWith(nDig) && (!emisor || f.emisor === emisor) && Math.abs(f.monto - (d.total || 0)) < 1))) : null;
    const mes = mesDe(d, cliente, da.nombre), periodo = mes.periodo;
    const tipo = /invoice/i.test(d.tipo || '') ? 'Invoice' : /^factura/i.test(d.tipo || '') ? 'Factura ARCA' : 'Otro';
    return { emisor, cliente, existente, periodo, mesPor: mes.por, mesSeguro: mes.seguro, tipo, nota: /cr[eé]dito/i.test(d.tipo || '') };
  }
  function presetDesde(da) {
    const d = da.datos || {}, mt = matchArchivo(da);
    return { mesPor: mt.mesPor, mesSeguro: mt.mesSeguro, cliente: mt.cliente, tipo: mt.tipo, emisor: mt.emisor, numero: d.numero_completo || '', periodo: /^\d{4}-\d{2}$/.test(mt.periodo) ? mt.periodo : thisMonth(), fecha: d.fecha || today(), vencimiento: d.vencimiento || '', moneda: d.moneda || 'ARS', monto: d.total ?? '', concepto: (mt.cliente && /^\d{4}-\d{2}$/.test(mt.periodo) && k.conceptoDe ? k.conceptoDe(mt.cliente, mt.periodo) : '') || d.concepto || '', link_pdf: da.link || '', notas: d.cae ? 'CAE ' + d.cae : '' };
  }
  async function aprender(da, v) { // si confirmaron emisor o cliente, guardar los CUIT para la próxima
    const d = (da && da.datos) || {};
    try {
      const em = { ...cfgEmisores() };
      if (v.emisor && d.emisor_cuit && !soloDig(em[v.emisor] && em[v.emisor].cuit)) { em[v.emisor] = { ...(em[v.emisor] || {}), cuit: soloDig(d.emisor_cuit) }; await data.upsert('ajustes', { clave: 'emisores', valor: em }, 'clave'); }
      const ca = k.cadm(v.cliente);
      if (v.cliente && d.receptor_cuit && !soloDig(ca.cuit)) await data.upsert('clientes_admin', { cliente_id: data.ids.cliente(v.cliente), cuit: soloDig(d.receptor_cuit), razon_social: ca.razon_social || d.receptor_nombre || '', updated_at: new Date().toISOString() }, 'cliente_id');
    } catch (e) { /* aprender es opcional */ }
  }
  // Después de cargar una factura de Drive, se le manda al cliente (si está activado en Ajustes → Drive).
  async function mandarAlCliente(fid, cliente, periodo, da, f0) {
    if (!k.cierre.envioAutoDrive()) return null;
    const f = f0 || { id: fid };
    try { const r = await k.cierre.enviarFacturaDrive({ f, cliente, periodo, da }); return r; }
    catch (e) { return { ok: false, motivo: cliente + ': ' + e.message }; }
  }
  // Deja el archivo de Drive con el nombre de siempre: CLIENTE-MES-AÑO.pdf
  async function ordenarNombre(da, cliente, periodo, tipo) {
    const nom = nombreArchivoFactura(cliente, periodo, { tipo, ext: extDe(da.nombre), usados: AD.DA.filter(x => x.id !== da.id).map(x => x.nombre) });
    if (!nom || nom === da.nombre) return null;
    try { await data.asistente({ accion: 'drive_renombrar', archivo_id: da.id, nombre: nom }); da.nombre = nom; return { ok: true, nombre: nom }; }
    catch (e) { return { ok: false, motivo: e.message }; }
  }
  // Lo que no sigue el formato: archivos de Drive ya unidos a una factura y conceptos de facturas
  function porOrdenar() {
    const usados = AD.DA.map(x => x.nombre), archivos = [], conceptos = [];
    AD.DA.filter(d => d.factura_id).forEach(d => {
      const f = AD.F.find(x => x.id === d.factura_id); if (!f || !f.periodo) return;
      const nom = nombreArchivoFactura(f.cliente, String(f.periodo).slice(0, 7), { tipo: f.tipo, ext: extDe(d.nombre), usados: usados.filter(n => n !== d.nombre) });
      if (nom && nom !== d.nombre) { archivos.push({ d, nom }); usados.push(nom); }
    });
    if (k.conceptoDe) AD.F.forEach(f => { if (!f.periodo || !f.cliente) return; const c = k.conceptoDe(f.cliente, String(f.periodo).slice(0, 7)); if (c && c !== (f.concepto || '')) conceptos.push({ f, c }); });
    return { archivos, conceptos };
  }
  function ordenarTodo() {
    const { archivos, conceptos } = porOrdenar();
    if (!archivos.length && !conceptos.length) { toast('Ya está todo con el formato de siempre'); return; }
    const fila = (a, b) => '<div class="row" style="cursor:default"><span class="t"><span style="text-decoration:line-through;color:var(--muted)">' + esc(a || '(vacío)') + '</span><b>' + esc(b) + '</b></span></div>';
    openPanel({
      title: 'Ordenar nombres y conceptos', eyebrow: 'Facturas', saveLabel: 'Ordenar', busyLabel: 'Ordenando…',
      intro: 'Archivos: <b>CLIENTE-MES-AÑO.pdf</b>. Conceptos: <b>servicios · Mes Año</b>. Así queda todo igual, venga como venga.',
      values: {}, fields: [],
      extra: (archivos.length ? '<div class="field full"><span class="lbl">' + archivos.length + ' archivos en Drive</span><div class="rows" style="border:1px solid var(--line);border-radius:8px;max-height:220px;overflow:auto">' + archivos.slice(0, 60).map(x => fila(x.d.nombre, x.nom)).join('') + '</div></div>' : '') +
        (conceptos.length ? '<div class="field full"><span class="lbl">' + conceptos.length + ' conceptos de facturas</span><div class="rows" style="border:1px solid var(--line);border-radius:8px;max-height:220px;overflow:auto">' + conceptos.slice(0, 60).map(x => fila(x.f.concepto, x.c)).join('') + '</div></div>' : ''),
      onSave: async () => {
        let n = 0, aviso = '';
        for (const x of archivos) { try { await data.asistente({ accion: 'drive_renombrar', archivo_id: x.d.id, nombre: x.nom }); x.d.nombre = x.nom; n++; } catch (e) { aviso = e.message; break; } }
        for (const x of conceptos) { await data.upd('facturas', x.f.id, { concepto: x.c }); x.f.concepto = x.c; n++; }
        toast(aviso ? aviso : n + ' cambios hechos');
      },
    });
  }
  function crearDesdeDrive(id) {
    const da = AD.DA.find(x => x.id === id); if (!da) return;
    k.formFactura(null, presetDesde(da), { archivo: da, onSaved: async (fid, v) => {
      await data.upd('drive_archivos', da.id, { factura_id: fid }); await aprender(da, v);
      const rn = await ordenarNombre(da, v.cliente, v.periodo, v.tipo); if (rn && !rn.ok) setTimeout(() => toast(rn.motivo), 2200);
      const r = await mandarAlCliente(fid, v.cliente, v.periodo, da, { id: fid, tipo: v.tipo, numero: v.numero, fecha: v.fecha, vencimiento: v.vencimiento, monto: v.monto, moneda: v.moneda, link_pdf: v.link_pdf });
      if (r) setTimeout(() => toast(r.ok ? 'Factura enviada a ' + r.para : 'No se mandó: ' + r.motivo), 900);
    } });
  }
  function vincularDrive(id) {
    const da = AD.DA.find(x => x.id === id); if (!da) return;
    const mt = matchArchivo(da), d = da.datos || {};
    const libres = AD.F.filter(f => !AD.DA.some(x => x.factura_id === f.id)).sort((a, b) => (mt.cliente && b.cliente === mt.cliente) - (mt.cliente && a.cliente === mt.cliente) || (b.fecha || '').localeCompare(a.fecha || ''));
    openPanel({
      title: da.nombre, eyebrow: 'Unir a una factura cargada', saveLabel: 'Unir',
      intro: 'La IA leyó: ' + esc([d.tipo, d.numero_completo, d.receptor_nombre, d.total != null ? money(d.total, d.moneda) : ''].filter(Boolean).join(' · ') || 'sin datos'),
      values: { factura: mt.existente ? mt.existente.id : '', link: true },
      fields: [
        { k: 'factura', label: 'Factura', type: 'select', req: 1, full: 1, html: v => opt('', 'Elegí', v) + libres.slice(0, 300).map(f => opt(f.id, f.cliente + ' · ' + verTipo(f.tipo) + ' ' + (f.numero || 'sin número') + ' · ' + money(f.monto, f.moneda) + ' · ' + fmt(f.fecha), v)).join('') },
        { k: 'link', label: 'Poner este PDF como link de la factura', type: 'check' },
      ],
      onSave: async v => { await data.upd('drive_archivos', da.id, { factura_id: v.factura }); if (v.link) await data.upd('facturas', v.factura, { link_pdf: da.link }); toast('Unida a la factura'); },
    });
  }
  async function leerArchivos(ids) {
    const lote = 3; let ok = 0, mal = 0;
    for (let i = 0; i < ids.length; i += lote) {
      AD.as.driveBusy = 'Leyendo ' + Math.min(i + lote, ids.length) + ' de ' + ids.length + '…'; ctx.render();
      try { const r = await data.asistente({ accion: 'leer_factura', archivo_ids: ids.slice(i, i + lote) }); (r.resultados || []).forEach(x => (x.ok ? ok++ : mal++)); }
      catch (err) { AD.as.driveBusy = ''; toast(err.message); await ctx.reload(); return; }
    }
    AD.as.driveBusy = ''; toast(ok + ' leídos' + (mal ? ' · ' + mal + ' no se pudieron leer' : '')); await ctx.reload();
  }
  // Resúmenes que faltan: se arman con lo que corresponde a cada cliente en el mes (abonos, cuotas, pautas).
  function filasArmar(m) {
    const cl = checklist(m).sinArmar;
    return cl.map(c => { const sug = k.sugerencias(c, m), items = sug.map(s => ({ inc: true, origen: s.origen, ref: s.ref, concepto: s.concepto, monto: parseMonto(s.monto) })); return { cliente_id: data.ids.cliente(c), periodo: m + '-01', moneda: (sug[0] && sug[0].moneda) || k.cadm(c).moneda || 'ARS', items, total: r2(items.reduce((a, i) => a + (i.monto || 0), 0)), nota: '', estado: 'Borrador' }; }).filter(r => r.cliente_id);
  }
  const listosDrive = () => AD.DA.filter(d => d.estado === 'Leído').map(d => ({ d, mt: matchArchivo(d), p: presetDesde(d) })).filter(x => x.mt.cliente && !x.mt.existente && !x.mt.nota && x.p.monto && x.p.fecha && x.mt.mesSeguro && x.d.datos.es_comprobante !== false);
  async function cargarDeDrive(x) {
    const p = x.p, f = await data.ins('facturas', { cliente_id: data.ids.cliente(p.cliente), tipo: p.tipo, emisor: p.emisor || '', numero: p.numero, periodo: p.periodo ? p.periodo + '-01' : null, fecha: p.fecha, vencimiento: p.vencimiento || null, moneda: p.moneda, monto: p.monto, concepto: p.concepto, link_pdf: p.link_pdf, notas: p.notas });
    await data.upd('drive_archivos', x.d.id, { factura_id: f.id }); await aprender(x.d, p);
    await ordenarNombre(x.d, p.cliente, p.periodo, p.tipo);
    return mandarAlCliente(f.id, p.cliente, p.periodo, x.d, f);
  }
  async function crearTodos() {
    const listos = listosDrive();
    if (!listos.length) { toast('No hay facturas con cliente reconocido para cargar solas'); return; }
    openPanel({
      title: 'Cargar ' + listos.length + ' facturas', eyebrow: 'Desde Drive', saveLabel: 'Cargar', busyLabel: 'Cargando…',
      intro: 'Facturas leídas, con cliente reconocido y que todavía no están cargadas. Revisá y destildá lo que no corresponda.' + (k.cierre.envioAutoDrive() ? '<br><b>Al cargarlas, a cada cliente le llega su factura por email con el PDF.</b> (Se cambia en Ajustes → Drive.)' : ''),
      values: {}, fields: [],
      extra: '<div class="field full"><div class="rows" data-todos="asct" style="border:1px solid var(--line);border-radius:8px">' + listos.map((x, i) => '<label class="row" style="cursor:pointer"><input type="checkbox" data-asct="' + i + '" checked><span class="t"><b>' + esc(x.p.cliente) + ' · ' + esc(verTipo(x.p.tipo) + ' ' + (x.p.numero || 'sin número')) + '</b><span>' + esc([fmt(x.p.fecha), x.p.emisor ? 'factura ' + x.p.emisor : 'no se sabe quién factura', x.p.periodo ? 'mes ' + fmt(x.p.periodo) : ''].join(' · ')) + '</span></span><span class="money">' + money(x.p.monto, x.p.moneda) + '</span></label>').join('') + '</div></div>',
      onSave: async () => {
        let n = 0, env = 0; const mal = [];
        for (const [i, x] of listos.entries()) {
          if (!($('[data-asct="' + i + '"]') || {}).checked) continue;
          const r = await cargarDeDrive(x); n++; if (r && r.ok) env++; else if (r) mal.push(r.motivo);
        }
        toast(n + ' facturas cargadas' + (env ? ' · ' + env + ' enviadas a los clientes' : '') + (mal.length ? ' · sin enviar: ' + mal.join('; ') : ''));
      },
    });
  }

  /* ---------- Conciliación bancaria ---------- */
  async function analizarExtracto() {
    const file = AD.as.file, cajaId = AD.as.concCaja || ($('#as-caja') || {}).value;
    if (!cajaId) { toast('Elegí de qué cuenta es el resumen'); return; }
    if (!file) { toast('Elegí el archivo del resumen'); return; }
    if (file.size > 9e6) { toast('El archivo pesa más de 9 MB'); return; }
    AD.as.concCaja = cajaId; AD.as.concBusy = true; ctx.render();
    try {
      const nombre = file.name, ext = (nombre.split('.').pop() || '').toLowerCase();
      const payload = { accion: 'conciliar', caja_id: cajaId, nombre };
      if (ext === 'pdf' || /^image\//.test(file.type)) payload.archivo = { nombre, mime: file.type || 'application/pdf', base64: await leerArchivo(file) };
      else if (ext === 'xlsx' || ext === 'xls') {
        const XLSX = await import('xlsx'); const wb = XLSX.read(b64Bytes(await leerArchivo(file)), { type: 'array', cellDates: true });
        payload.texto = wb.SheetNames.map(n => '# ' + n + '\n' + XLSX.utils.sheet_to_csv(wb.Sheets[n], { dateNF: 'yyyy-mm-dd' })).join('\n\n');
      } else payload.texto = await leerTexto(file);
      const r = await data.asistente(payload);
      const movs = (r.movimientos || []).map(x => {
        const dupLocal = AD.MV.some(v => v.moneda === r.caja.moneda && Math.abs((x.sentido === 'ingreso' ? v.ingreso : v.egreso) - x.monto) < 0.01 && Math.abs((new Date(v.fecha) - new Date(x.fecha)) / 864e5) <= 3);
        const dup = !!x.duplicado || dupLocal;
        return { ...x, dup, sel: !dup && x.confianza !== 'baja' };
      });
      AD.as.conc = { ...r, movimientos: movs }; AD.as.file = null;
      if (r._cortado) toast('El resumen es largo: la IA llegó hasta donde pudo. Subí el resto aparte.');
    } catch (err) { toast(err.message); }
    AD.as.concBusy = false; ctx.render();
  }
  function concHtml() {
    const c = AD.as.conc; if (!c) return '';
    const cuentas = [...new Set(AD.PC.map(p => p.cuenta))].sort(cmp);
    const n = c.movimientos.filter(x => x.sel).length;
    const rows = c.movimientos.map((x, i) => {
      const f = x.factura_id ? AD.F.find(y => y.id === x.factura_id) : null;
      return '<tr' + (x.sel ? '' : ' style="opacity:.55"') + '><td><input type="checkbox" aria-label="Incluir" data-cc="' + i + '" data-cck="sel"' + (x.sel ? ' checked' : '') + '></td>' +
        '<td><input class="in" type="date" data-cc="' + i + '" data-cck="fecha" value="' + esc(x.fecha) + '" style="width:140px"></td>' +
        '<td><input class="in" list="dl-as-partes" data-cc="' + i + '" data-cck="contraparte" value="' + esc(x.contraparte) + '" style="min-width:150px"><span class="sub">' + esc((x.descripcion_banco || '').slice(0, 80)) + '</span></td>' +
        '<td><select class="in" data-cc="' + i + '" data-cck="cuenta">' + cuentas.map(cu => opt(cu, cu, x.cuenta)).join('') + (cuentas.includes(x.cuenta) ? '' : opt(x.cuenta, x.cuenta + ' (?)', x.cuenta)) + '</select><input class="in" list="dl-as-sub" data-cc="' + i + '" data-cck="subcuenta" value="' + esc(x.subcuenta) + '" style="margin-top:4px"></td>' +
        '<td><input class="in" data-cc="' + i + '" data-cck="detalle" value="' + esc(x.detalle) + '" style="min-width:160px">' + (f ? '<span class="sub">cobro de ' + esc(verTipo(f.tipo) + ' ' + (f.numero || 'sin número')) + '</span>' : '') + '</td>' +
        '<td class="r"><span class="money" style="color:var(' + (x.sentido === 'ingreso' ? '--money' : '--fg') + ')">' + (x.sentido === 'ingreso' ? '+' : '−') + esc(money(x.monto, c.caja.moneda)) + '</span></td>' +
        '<td><div class="tags">' + (x.dup ? '<span class="tag" style="color:var(--crit)">¿ya cargado?</span>' : '') + '<span class="tag">' + esc(verConf(x.confianza)) + '</span></div>' + (x.nota ? '<span class="sub">' + esc(x.nota) + '</span>' : '') + '</td></tr>';
    }).join('');
    const partes = [...new Set([...S.C.map(x => x.nombre), ...AD.CO.map(x => x.nombre), ...AD.MV.map(v => v.contraparte).filter(Boolean)])].sort(cmp);
    const subs = [...new Set(AD.PC.map(p => p.subcuenta).filter(Boolean))].sort(cmp);
    return '<div class="sheet-b" style="border-top:1px solid var(--line);display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;align-items:center"><span><b>' + c.movimientos.length + ' gastos e ingresos</b> encontrados para ' + esc(c.caja.nombre) + (c.periodo ? ' · ' + esc(c.periodo) : '') + (c.saldo_final != null ? ' · al final del resumen había ' + esc(money(c.saldo_final, c.caja.moneda)) : '') + '</span><span class="toolbar"><button class="btn ghost sm" data-act="asConcX">Descartar</button><button class="btn primary sm" data-act="asConcOk" id="as-conc-ok">Cargar ' + n + ' en Gastos e ingresos</button></span></div>' +
      '<div class="tbl" data-todos="cc"><table><thead><tr><th></th><th>Fecha</th><th>Quién</th><th>Categoría</th><th>Detalle</th><th class="r">Monto</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<datalist id="dl-as-partes">' + partes.map(s => '<option value="' + esc(s) + '">').join('') + '</datalist><datalist id="dl-as-sub">' + subs.map(s => '<option value="' + esc(s) + '">').join('') + '</datalist>';
  }
  async function cargarConciliacion() {
    const c = AD.as.conc; if (!c) return;
    const sel = c.movimientos.filter(x => x.sel); if (!sel.length) { toast('No hay nada tildado'); return; }
    const rows = sel.map(x => {
      const cli = S.C.find(y => norm(y.nombre) === norm(x.contraparte)) || (x.cliente ? S.C.find(y => norm(y.nombre) === norm(x.cliente)) : null);
      const co = eq().colabPorNombre(x.contraparte) || (x.colaborador ? eq().colabPorNombre(x.colaborador) : null);
      const fac = x.sentido === 'ingreso' && x.factura_id && AD.F.some(f => f.id === x.factura_id) ? x.factura_id : null;
      return { fecha: x.fecha, cuenta: x.cuenta, subcuenta: x.subcuenta || '', contraparte: x.contraparte || '', cliente_id: cli ? cli._id : null, colaborador_id: co ? co.id : null, persona_id: co ? co.persona_id || null : null, detalle: x.detalle || '', ingreso: x.sentido === 'ingreso' ? r2(x.monto) : 0, egreso: x.sentido === 'egreso' ? r2(x.monto) : 0, moneda: c.caja.moneda, caja_id: c.caja.id, factura_id: fac };
    });
    try { await data.insMany('movimientos', rows); toast(rows.length + ' cargados en Gastos e ingresos'); AD.as.conc = null; await ctx.reload(); }
    catch (err) { toast(err.message); }
  }

  /* ---------- Repartir pagos con IA ---------- */
  async function repartirTodos(lista) {
    const movs = (lista || provSinImputar(AD.as.mes.slice(0, 4))).slice(0, 20);
    if (!movs.length) { toast('No hay pagos a proveedores sin asignar'); return; }
    toast('La IA está leyendo ' + movs.length + ' pagos…');
    let r; try { r = await data.asistente({ accion: 'imputar', movimiento_ids: movs.map(v => v.id) }); } catch (err) { toast(err.message); return; }
    const reps = (r.repartos || []).map(x => ({ ...x, mov: movs.find(v => v.id === x.movimiento_id) })).filter(x => x.mov);
    openPanel({
      title: 'Repartir pagos a proveedores', eyebrow: 'Propuesta de la IA', saveLabel: 'Guardar repartos', busyLabel: 'Guardando…',
      intro: 'Cada pago queda asignado al cliente que corresponde, para ver cuánto deja cada uno. Destildá lo que no te convenza; después se puede corregir desde Gastos e ingresos.',
      values: {}, fields: [],
      extra: '<div class="field full"><div class="rows" data-todos="asrp" style="border:1px solid var(--line);border-radius:8px">' + reps.map((x, i) => '<label class="row" style="cursor:pointer;align-items:start"><input type="checkbox" data-asrp="' + i + '"' + (x.partes.length && x.confianza !== 'baja' ? ' checked' : '') + (x.partes.length ? '' : ' disabled') + ' style="margin-top:4px"><span class="t"><b>' + esc(x.mov.contraparte + ' · ' + fmt(x.mov.fecha)) + ' · <span class="money">' + money(x.mov.egreso, x.mov.moneda) + '</span></b><span>' + esc(x.mov.detalle || '') + '</span>' +
        (x.partes.length ? '<span class="tags" style="margin-top:4px">' + x.partes.map(p => '<span class="tag">' + esc(p.descripcion) + ' · ' + esc(money(p.monto, x.mov.moneda)) + '</span>').join('') + '</span>' : '') + (x.nota ? '<span class="sub">' + esc(x.nota) + '</span>' : '') + '</span><span class="tag">' + esc(verConf(x.confianza)) + '</span></label>').join('') + '</div></div>',
      onSave: async () => {
        let n = 0;
        for (const [i, x] of reps.entries()) {
          if (!($('[data-asrp="' + i + '"]') || {}).checked || !x.partes.length) continue;
          await data.del('imputaciones', x.movimiento_id, 'movimiento_id');
          await data.insMany('imputaciones', x.partes.map(p => ({ movimiento_id: x.movimiento_id, abono_id: p.destino.startsWith('a:') ? p.destino.slice(2) : null, proyecto_id: p.destino.startsWith('p:') ? p.destino.slice(2) : null, monto: p.monto })));
          n++;
        }
        toast(n + ' pagos repartidos');
      },
    });
  }
  async function sugerirReparto() { // dentro del formulario de movimiento
    const v = { fecha: ($('#af-fecha') || {}).value, contraparte: ($('#af-contraparte') || {}).value, detalle: ($('#af-detalle') || {}).value, egreso: parseMonto(($('#af-monto') || {}).value), moneda: ($('#af-moneda') || {}).value, subcuenta: ($('#af-subcuenta') || {}).value, cuenta: ($('#af-cuenta') || {}).value };
    if (!v.egreso) { toast('Poné el monto primero'); return; }
    const btn = $('#imp-ia'); if (btn) { btn.disabled = true; btn.textContent = 'Pensando…'; }
    try {
      const r = await data.asistente({ accion: 'imputar', borrador: v });
      const x = (r.repartos || [])[0];
      if (!x || !x.partes.length) toast((x && x.nota) || 'La IA no pudo identificar a qué clientes corresponde');
      else { AD.impDraft = x.partes.map(p => ({ dest: p.destino, monto: String(p.monto) })); k.renderImp(); toast('Reparto sugerido' + (x.nota ? ': ' + x.nota : '')); }
    } catch (err) { toast(err.message); }
    if (btn) { btn.disabled = false; btn.textContent = '✨ Sugerir reparto'; }
  }
  async function leerPdfEnFormulario(file) { // en el alta de comprobante
    if (!file) return;
    const btn = $('#ff-ia-lbl'); if (btn) btn.textContent = 'Leyendo…';
    try {
      const b64 = await leerArchivo(file);
      const r = await data.asistente({ accion: 'leer_factura', pdf: { nombre: file.name, mime: file.type || 'application/pdf', base64: b64 } });
      llenarFormFactura(presetDesde({ datos: r.datos, link: ($('#af-link_pdf') || {}).value || '' }), r.datos);
      toast(r.datos && r.datos.confianza === 'baja' ? 'Leído, pero revisá los datos: la IA no está segura' : 'Datos completados desde el PDF');
    } catch (err) { toast(err.message); }
    if (btn) btn.textContent = '✨ Leer PDF';
  }
  function llenarFormFactura(p, datos) {
    const set = (kk, v) => { const el = $('#af-' + kk); if (el && v !== undefined && v !== null && v !== '') el.value = v; };
    ['cliente', 'tipo', 'emisor', 'numero', 'periodo', 'fecha', 'vencimiento', 'moneda', 'monto', 'concepto', 'link_pdf', 'notas'].forEach(kk => set(kk, kk === 'monto' && p.monto !== '' ? String(p.monto).replace('.', ',') : p[kk]));
    if (AD.form) AD.form.archivoDatos = datos || null;
  }
  function desdeDriveEnFormulario(id) {
    const da = AD.DA.find(x => x.id === id); if (!da) return;
    if (da.estado === 'Nuevo' || !da.datos.total) { toast('Ese archivo todavía no se leyó: tocá “Leer” en Facturas en Drive.'); }
    llenarFormFactura(presetDesde(da), da.datos);
    if (AD.form) AD.form.archivo = da;
  }

  /* ---------- Vista ---------- */
  const dot = (ok, n) => ok ? '<span class="days" style="color:var(--ok);min-width:26px">✓</span>' : '<span class="days pend" style="min-width:26px">' + (n || '!') + '</span>';
  function item(ok, n, titulo, sub, btn) { return '<div class="row" style="cursor:default;grid-template-columns:34px minmax(0,1fr) auto">' + dot(ok, n) + '<span class="t"><b style="white-space:normal">' + titulo + '</b>' + (sub ? '<span>' + sub + '</span>' : '') + '</span><span class="toolbar">' + (ok ? '' : btn || '') + '</span></div>'; }
  const pl = (n, uno, varios) => n + ' ' + (n === 1 ? uno : varios);
  const lista = (arr, n = 5) => esc(arr.slice(0, n).join(', ') + (arr.length > n ? ' y ' + (arr.length - n) + ' más' : ''));
  // Lo que falta para cerrar el mes: solo se muestra lo pendiente; lo que está al día queda en una línea.
  function pendientesHtml(m) {
    if (!AD.as.estado && !AD.as.estadoBusy) setTimeout(() => cargarEstado(), 0);
    AD.as.mes = m;
    const st = AD.as.estado || {}, c = checklist(m), b = AD.as.brief;
    const its = [
      [!c.sinPrecio.length, c.sinPrecio.length, pl(c.sinPrecio.length, 'abono sin precio', 'abonos sin precio'), lista(c.sinPrecio.map(a => a.cliente + ' (' + a.tipo + ')')), '<button class="btn sm" data-act="go" data-view="precios">Cargar precios</button>'],
      [!c.sinArmar.length, c.sinArmar.length, pl(c.sinArmar.length, 'resumen sin preparar', 'resúmenes sin preparar'), lista(c.sinArmar), '<button class="btn sm" data-act="asArmar">Prepararlos</button>'],
      [!c.borradores.length, c.borradores.length, pl(c.borradores.length, 'resumen preparado sin enviar', 'resúmenes preparados sin enviar'), lista(c.borradores.map(r => r.cliente)), '<button class="btn sm" data-act="asMailRes">Enviarlos por email</button>'],
      [!c.sinComp.length, c.sinComp.length, pl(c.sinComp.length, 'cliente', 'clientes') + ' con resumen enviado y sin factura', lista(c.sinComp.map(r => r.cliente)) + (c.drive.length ? ' · hay ' + pl(c.drive.length, 'factura', 'facturas') + ' en Drive sin cargar' : ''), '<button class="btn sm" data-act="tab" data-hub="cobros" data-t="drive">Ver facturas en Drive</button>'],
      [!c.vencidas.length, c.vencidas.length, pl(c.vencidas.length, 'factura vencida', 'facturas vencidas') + ' sin cobrar', c.vencidas.length ? esc(multi(c.vencidas.reduce((a, f) => add(a, f.moneda, f.saldo), {}))) + ' · ' + lista([...new Set(c.vencidas.map(f => f.cliente))]) : '', '<button class="btn sm" data-act="asRecs">Mandar recordatorios</button>'],
      [!c.aumentos.length, c.aumentos.length, pl(c.aumentos.length, 'aumento cargado', 'aumentos cargados') + ' sin avisar al cliente', '', '<button class="btn sm" data-act="aAvisos">Avisar por email</button>'],
      [!c.liqFalt.length && !c.liqPend.length, c.liqFalt.length + c.liqPend.length, 'Sueldos y proveedores: ' + [c.liqFalt.length ? pl(c.liqFalt.length, 'pago sin calcular', 'pagos sin calcular') : '', c.liqPend.length ? pl(c.liqPend.length, 'pago pendiente', 'pagos pendientes') : ''].filter(Boolean).join(' y '), c.liqPend.length ? esc(multi(c.liqPend.reduce((a, l) => add(a, l.moneda, l.monto), {}))) : '', '<button class="btn sm" data-act="go" data-view="pagos">Ir a Sueldos</button>'],
      [!c.sinImp.length, c.sinImp.length, pl(c.sinImp.length, 'gasto de proveedores', 'gastos de proveedores') + ' sin asignar a un cliente', 'Así se ve cuánto deja cada cliente', '<button class="btn sm" data-act="asImpAll"' + (st.ia ? '' : ' disabled title="Falta conectar la IA"') + '>✨ Asignar con IA</button>'],
    ];
    const pend = its.filter(x => !x[0]), okN = its.length - pend.length;
    let h = '<section class="sheet"><div class="sheet-h"><h2>' + (pend.length ? 'Para cerrar ' + esc(monthLabel(m)) : '✓ ' + esc(cap(monthLabel(m))) + ' está al día') + '</h2><span class="toolbar">' +
      (pend.length ? '<button class="btn sm" data-act="asBrief"' + (AD.as.briefBusy ? ' disabled' : '') + '>' + (AD.as.briefBusy ? 'Pensando…' : '¿Por dónde empiezo?') + '</button><button class="btn sm primary" data-act="asCierre">Hacer el cierre en un clic</button>' : '') + '</span></div>' +
      (AD.as.ultimoCierre && AD.as.ultimoCierre.m === m ? '<div class="sheet-b" style="border-bottom:1px solid var(--line);display:grid;gap:4px"><b>Cierre de las ' + esc(AD.as.ultimoCierre.cuando) + '</b>' + AD.as.ultimoCierre.hecho.map(x => '<span>✓ ' + esc(x) + '</span>').join('') + AD.as.ultimoCierre.errores.map(x => '<span style="color:var(--crit)">✗ ' + esc(x) + '</span>').join('') + '</div>' : '') +
      (b ? '<div class="sheet-b" style="border-bottom:1px solid var(--line);display:grid;gap:8px;background:color-mix(in srgb,var(--accent) 6%,var(--surface))"><b style="font-family:var(--f-display);font-size:19px">' + esc(b.titular) + '</b><ul style="margin:0;padding-left:18px;display:grid;gap:4px">' + (b.puntos || []).map(p => '<li>' + (p.prioridad === 'alta' ? '<b style="color:var(--crit)">Urgente:</b> ' : '') + esc(p.texto) + '</li>').join('') + '</ul></div>' : '') +
      (pend.length ? '<div class="rows">' + pend.map(([ok, n, t, sub, btn]) => item(ok, n, t, sub, btn)).join('') + '</div>' : '') +
      '<div class="count">' + (okN ? '✓ ' + pl(okN, 'cosa al día', 'cosas al día') : '') + (c.cuotas.length ? (okN ? ' · ' : '') + 'Este mes se cobran ' + pl(c.cuotas.length, 'cuota', 'cuotas') + ' de proyectos.' : '') + '</div></section>';
    if (!(st.ia && st.drive) && AD.as.estado) h += '<section class="callout"><p>Falta conectar ' + [st.ia ? '' : 'la IA', st.drive ? '' : 'Google Drive'].filter(Boolean).join(' y ') + '. Los pasos están en Configuración → Ajustes.</p><button class="btn" data-act="go" data-view="ajustes">Ir a Ajustes</button></section>';
    return h;
  }
  function vAsistente() { return pendientesHtml(AD.as.mes); }

  /* ---------- Cierre en un clic ---------- */
  function abrirCierre() {
    const m = AD.as.mes = AD.mes || AD.as.mes, c = checklist(m), st = AD.as.estado || {}, cfg = cfgDrive();
    const B = k.cierre, bRes = () => B.bulkResumenes(m), bRec = B.bulkRecordatorios(), bAv = B.bulkAvisos();
    const sinMail = it => it.filter(x => !x.para).map(x => x.label);
    const resAhora = (bRes() || { items: [] }).items, conRes = resAhora.filter(x => x.para).length + c.sinArmar.length;
    const pasos = [
      st.drive && cfg.carpeta ? { k: 'drive', label: 'Buscar facturas nuevas en Drive, leerlas y cargar las que reconozca' + (k.cierre.envioAutoDrive() ? ' (y mandárselas a cada cliente)' : ''), sub: 'Las que no reconozca quedan en “Facturas en Drive” para mirarlas.' } : null,
      c.sinArmar.length ? { k: 'armar', label: 'Preparar ' + pl(c.sinArmar.length, 'resumen que falta', 'resúmenes que faltan'), sub: lista(c.sinArmar) + (c.sinPrecio.length ? ' · ojo: ' + pl(c.sinPrecio.length, 'abono no tiene', 'abonos no tienen') + ' precio y saldría sin monto' : '') } : null,
      conRes ? { k: 'enviar', label: 'Mandar por email ' + pl(conRes, 'resumen', 'resúmenes') + ' con el PDF', sub: sinMail(resAhora).length ? 'Sin email (no se mandan): ' + sinMail(resAhora).join(', ') : 'Cada uno con su resumen adjunto y una copia para vos.' } : null,
      bRec && bRec.items.length ? { k: 'recs', label: 'Mandar recordatorio de pago a ' + pl(bRec.items.filter(x => x.para).length, 'cliente', 'clientes'), sub: bRec.items.map(x => x.label + ' (' + x.sub.split(' · ')[0] + ')').join(', ') } : null,
      bAv && bAv.items.length ? { k: 'avisos', label: 'Avisar ' + pl(bAv.items.filter(x => x.para).length, 'aumento', 'aumentos') + ' de precio', sub: bAv.items.map(x => x.label).join(', ') } : null,
    ].filter(Boolean);
    if (!pasos.length) { toast('No hay nada pendiente para el cierre de ' + monthLabel(m)); return; }
    openPanel({
      title: 'Cierre de ' + monthLabel(m), eyebrow: '✨ En un clic', saveLabel: 'Hacer el cierre', busyLabel: 'Haciendo el cierre…',
      intro: 'Esto es lo que voy a hacer, en este orden. Destildá lo que no quieras. Los emails salen desde administracion@weareandale.com.',
      values: {}, fields: [],
      extra: '<div class="field full"><div class="rows" data-todos="cp" style="border:1px solid var(--line);border-radius:10px">' + pasos.map((p, i) => '<label class="row" style="cursor:pointer;grid-template-columns:24px 22px minmax(0,1fr)"><input type="checkbox" data-cp="' + p.k + '" checked><span class="muted">' + (i + 1) + '</span><span class="t"><b style="white-space:normal">' + esc(p.label) + '</b><span style="white-space:normal">' + esc(p.sub || '') + '</span></span></label>').join('') + '</div></div><p class="formnote" id="cierre-prog" style="grid-column:1/-1" aria-live="polite"></p>',
      onSave: async () => {
        const v = Object.fromEntries(pasos.map(p => [p.k, !!($('[data-cp="' + p.k + '"]') || {}).checked]));
        if (!Object.values(v).some(Boolean)) throw new Error('Tildá al menos un paso');
        const prog = t => { const el = $('#cierre-prog'); if (el) el.textContent = t; }, hecho = [], errores = [];
        const correr = async (label, fn) => { prog(label + '…'); try { const r = await fn(); if (r) hecho.push(r); } catch (e) { errores.push(label + ': ' + e.message); } await ctx.reload(); };
        if (v.drive) await correr('Revisando Drive', async () => {
          await data.asistente({ accion: 'drive_sync' }); await ctx.reload();
          const ids = AD.DA.filter(d => d.estado === 'Nuevo' || d.estado === 'Error').map(d => d.id).slice(0, 30);
          for (let i = 0; i < ids.length; i += 3) { prog('Leyendo facturas de Drive (' + Math.min(i + 3, ids.length) + ' de ' + ids.length + ')…'); await data.asistente({ accion: 'leer_factura', archivo_ids: ids.slice(i, i + 3) }); }
          await ctx.reload(); const ls = listosDrive(); let env = 0;
          for (const x of ls) { const r = await cargarDeDrive(x); if (r && r.ok) env++; else if (r) errores.push('Factura de Drive sin enviar: ' + r.motivo); }
          return ls.length ? pl(ls.length, 'factura cargada', 'facturas cargadas') + ' desde Drive' + (env ? ' (' + env + ' enviadas a los clientes)' : '') : 'Drive al día';
        });
        if (v.armar) await correr('Preparando resúmenes', async () => { const rows = filasArmar(m); if (rows.length) await data.insMany('resumenes', rows); return pl(rows.length, 'resumen preparado', 'resúmenes preparados'); });
        const mandar = async (o, que) => { if (!o) return ''; const r = await B.enviarDirecto(o, (n, t) => prog(que + ' (' + n + ' de ' + t + ')…')); if (r.fails.length) errores.push(...r.fails); return r.ok ? r.ok + ' ' + que.toLowerCase().replace('mandando ', '') : ''; };
        if (v.enviar) await correr('Mandando resúmenes', () => mandar(bRes(), 'Mandando resúmenes'));
        if (v.recs) await correr('Mandando recordatorios', () => mandar(B.bulkRecordatorios(), 'Mandando recordatorios'));
        if (v.avisos) await correr('Avisando aumentos', () => mandar(B.bulkAvisos(), 'Avisando aumentos'));
        AD.as.ultimoCierre = { m, hecho, errores, cuando: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) };
        toast(errores.length ? 'Cierre hecho con ' + pl(errores.length, 'problema', 'problemas') + ': mirá el detalle arriba.' : '✓ Cierre de ' + monthLabel(m) + ' hecho');
      },
    });
  }
  function driveView() {
    if (!AD.as.estado && !AD.as.estadoBusy) setTimeout(() => cargarEstado(), 0);
    return '<div class="head"><div>' + lock + '<h1>Facturas en Drive</h1><p>Las facturas que hacen en ARCA y guardan en la carpeta de Drive. La IA las lee y las carga; vos confirmás.</p></div></div>' + driveHtml(AD.as.estado || {});
  }
  function bancoView() {
    if (!AD.as.estado && !AD.as.estadoBusy) setTimeout(() => cargarEstado(), 0);
    return '<div class="head"><div>' + lock + '<h1>Resumen del banco</h1><p>Subí el resumen (PDF, Excel o CSV) y la IA arma los gastos e ingresos con su categoría. Revisás y confirmás.</p></div></div>' + concSection(AD.as.estado || {});
  }
  const driveCount = () => (AD.DA || []).filter(d => d.estado === 'Nuevo' || d.estado === 'Leído').length;
  // Fecha y hora en la zona de quien mira (lo guardado viene en UTC)
  const horaLocal = iso => { const d = new Date(iso); return isNaN(d) ? '' : fmt(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')) + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  function driveHtml(st) {
    const cfg = cfgDrive(), df = AD.as.df;
    let inner;
    if (!st.drive) inner = '<div class="sheet-b"><p class="muted" style="margin:0">' + (AD.as.estadoBusy || !AD.as.estado ? 'Revisando la conexión…' : 'Drive todavía no está conectado. Los pasos están en Ajustes.') + '</p></div>';
    else if (!cfg.carpeta || AD.as.cambiarCarpeta) inner = '<div class="sheet-b"><p style="margin:0 0 10px">Compartí la carpeta de facturas con <b>' + esc(st.drive_email) + '</b> <button class="btn ghost sm" data-act="asCopy" data-v="' + esc(st.drive_email) + '">Copiar</button> (permiso de lector) y pegá el link acá.</p><div class="toolbar"><input class="in" id="as-carpeta" value="' + esc(AD.as.cambiarCarpeta ? (cfg.carpeta_url || '') : '') + '" placeholder="https://drive.google.com/drive/folders/…" style="flex:1;min-width:260px"><button class="btn primary" data-act="asCarpeta">Guardar</button>' + (AD.as.cambiarCarpeta ? '<button class="btn ghost" data-act="asCarpetaCambiar" data-v="0">Cancelar</button>' : '') + '</div></div>';
    else {
      const filtro = { pendientes: d => d.estado === 'Nuevo' || d.estado === 'Leído' || d.estado === 'Error', vinculados: d => d.estado === 'Vinculado', ignorados: d => d.estado === 'Ignorado', todos: () => true }[df];
      const ls = AD.DA.filter(filtro);
      const nuevos = AD.DA.filter(d => d.estado === 'Nuevo' || d.estado === 'Error').length, leidos = AD.DA.filter(d => d.estado === 'Leído').length;
      const rows = ls.slice(0, 120).map(d => {
        const x = d.datos || {}, mt = d.estado === 'Leído' || d.estado === 'Nuevo' ? matchArchivo(d) : null, f = d.factura_id ? AD.F.find(y => y.id === d.factura_id) : null;
        const desc = [x.tipo, x.numero_completo, x.receptor_nombre, x.total != null ? money(x.total, x.moneda) : '', x.fecha ? fmt(x.fecha) : ''].filter(Boolean).join(' · ');
        const reco = mt ? [mt.cliente ? 'cliente: <b>' + esc(mt.cliente) + '</b>' : (d.estado === 'Leído' ? '<span style="color:var(--warn)">cliente sin reconocer</span>' : ''), mt.emisor ? 'factura ' + esc(mt.emisor) : '', mt.periodo ? (mt.mesSeguro ? 'mes: <b>' + esc(nombreMes(mt.periodo)) + '</b>' : '<span style="color:var(--warn)" title="Sale de ' + esc(mt.mesPor) + '">mes: ' + esc(nombreMes(mt.periodo)) + ', revisalo</span>') : '', mt.existente ? '<span style="color:var(--warn)">ya está cargada como ' + esc(verTipo(mt.existente.tipo) + ' ' + mt.existente.numero) + '</span>' : ''].filter(Boolean).join(' · ') : '';
        const btns = d.estado === 'Nuevo' || d.estado === 'Error' ? '<button class="btn sm" data-act="asLeer" data-id="' + esc(d.id) + '"' + (st.ia ? '' : ' disabled') + '>Leer</button>' :
          d.estado === 'Leído' ? (mt.existente ? '<button class="btn sm primary" data-act="asVinc" data-id="' + esc(d.id) + '">Unir a una factura cargada</button>' : '<button class="btn sm primary" data-act="asCrear" data-id="' + esc(d.id) + '">Cargar factura</button><button class="btn ghost sm" data-act="asVinc" data-id="' + esc(d.id) + '">Unir a una factura cargada</button>') :
          d.estado === 'Vinculado' && f ? '<button class="btn ghost sm" data-act="aFactura" data-id="' + esc(f.id) + '">Ver factura</button><button class="btn ghost sm" data-act="asDesv" data-id="' + esc(d.id) + '">Separar</button>' : '';
        return '<div class="row" style="cursor:default"><span class="d">' + (d.modificado ? fmt(String(d.modificado).slice(0, 10)) : '') + '</span><span class="t"><b><a href="' + esc(d.link) + '" target="_blank" rel="noopener">' + esc(d.nombre) + '</a></b><span>' + esc(d.carpeta || '') + (desc ? ' · ' + esc(desc) : '') + '</span>' + (reco ? '<span class="as-reco" style="margin-top:2px">' + reco + '</span>' : '') + (d.error ? '<span style="color:var(--crit)">' + esc(d.error) + '</span>' : '') + '</span><span class="toolbar">' + pill(VER_DA[d.estado] || d.estado, { Nuevo: '--s-empezar', 'Leído': '--s-revision', Vinculado: '--s-entregado', Ignorado: '--muted', Error: '--crit' }[d.estado]) + btns + (d.estado !== 'Ignorado' && d.estado !== 'Vinculado' ? '<button class="btn ghost sm" data-act="asIgn" data-id="' + esc(d.id) + '" aria-label="Descartar">✕</button>' : d.estado === 'Ignorado' ? '<button class="btn ghost sm" data-act="asRest" data-id="' + esc(d.id) + '">Restaurar</button>' : '') + '</span></div>';
      }).join('');
      inner = '<div class="sheet-b" style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;border-bottom:1px solid var(--line)"><span class="muted"><a href="' + esc(cfg.carpeta_url || 'https://drive.google.com/drive/folders/' + cfg.carpeta) + '" target="_blank" rel="noopener">Carpeta de facturas</a> <button class="btn link" data-act="asCarpetaCambiar" data-v="1" title="Usar otra carpeta de Drive">Cambiar</button>' + (cfg.ultima_sync ? ' · revisada ' + esc(horaLocal(cfg.ultima_sync)) : '') + ' · ' + AD.DA.length + (AD.DA.length === 1 ? ' archivo' : ' archivos') + '</span>' +
        '<span class="toolbar">' + (AD.as.driveBusy ? '<span class="muted">' + esc(AD.as.driveBusy) + '</span>' : '<label class="chk as-auto" title="Cuando cargás una factura desde Drive, al cliente le llega por email con el PDF"><input type="checkbox" data-act="asAuto"' + (k.cierre.envioAutoDrive() ? ' checked' : '') + '> Mandarlas solas al cliente</label>' + (() => { const o = porOrdenar(), n = o.archivos.length + o.conceptos.length; return n ? '<button class="btn sm" data-act="asOrdenar" title="Deja los nombres de los archivos y los conceptos con el formato de siempre">Ordenar nombres (' + n + ')</button>' : ''; })() + '<button class="btn sm" data-act="asSync">Buscar nuevos</button>' + (nuevos ? '<button class="btn sm primary" data-act="asLeerTodo"' + (st.ia ? '' : ' disabled title="Falta configurar la IA"') + '>✨ Leer ' + nuevos + ' con IA</button>' : '') + (leidos ? '<button class="btn sm primary" data-act="asCrearTodos">Cargar todas las reconocidas</button>' : '')) + '</span></div>' +
        '<div class="sheet-b" style="border-bottom:1px solid var(--line)"><div class="seg" role="group" aria-label="Filtro">' + [['pendientes', 'Por revisar'], ['vinculados', 'Cargadas'], ['ignorados', 'Descartadas'], ['todos', 'Todas']].map(([kk, l]) => '<button data-act="asDf" data-v="' + kk + '" aria-pressed="' + (df === kk) + '">' + l + '</button>').join('') + '</div></div>' +
        (rows ? '<div class="rows">' + rows + '</div>' + (ls.length > 120 ? '<div class="count">Mostrando 120 de ' + ls.length + '</div>' : '') : emptyBox(AD.DA.length ? 'Nada en este filtro' : 'Todavía no se revisó la carpeta', AD.DA.length ? '' : 'Tocá “Buscar nuevos”.'));
    }
    return '<section class="sheet" id="as-drive"><div class="sheet-h"><h2>Facturas en Drive</h2><span class="muted">solo lectura · PDFs de ARCA y facturas al exterior</span></div>' + inner + '</section>';
  }
  function concSection(st) {
    const cjs = AD.CJ.filter(x => x.activa);
    return '<section class="sheet" id="as-conc"><div class="sheet-h"><h2>Resumen del banco</h2><span class="muted">Galicia, Payoneer, Wilobank…</span></div>' +
      '<div class="sheet-b"><p class="muted" style="margin:0 0 10px">Subí el resumen (PDF, Excel o CSV). La IA arma los gastos e ingresos con su categoría, reconoce clientes, equipo y proveedores, y marca los cobros de facturas y lo que ya está cargado.</p>' +
      '<div class="toolbar"><select class="in" id="as-caja" aria-label="Cuenta">' + opt('', '¿De qué cuenta es el resumen?', AD.as.concCaja) + cjs.map(x => opt(x.id, x.nombre + ' (' + x.moneda + ')', AD.as.concCaja)).join('') + '</select><label class="btn" style="cursor:pointer">📄 Elegir resumen<input type="file" id="as-file" accept=".pdf,.csv,.txt,.xlsx,.xls,image/*" hidden></label><span class="muted" style="max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(AD.as.file ? AD.as.file.name : 'Ningún archivo elegido') + '</span><button class="btn primary" data-act="asConc"' + (AD.as.concBusy || !st.ia ? ' disabled' : '') + '>' + (AD.as.concBusy ? 'Analizando… (puede tardar un minuto)' : '✨ Leer el resumen con IA') + '</button></div></div>' + concHtml() + '</section>';
  }
  function configHtml(st) {
    const em = cfgEmisores(), cfg = cfgDrive(), ok = v => v ? '<b style="color:var(--ok)">✓ conectado</b>' : '<b style="color:var(--crit)">sin configurar</b>';
    const usos = AD.IL || [], tin = usos.reduce((a, x) => a + (x.tokens_in || 0), 0), tout = usos.reduce((a, x) => a + (x.tokens_out || 0), 0);
    const pasosIA = '<ol style="margin:6px 0 0;padding-left:18px;display:grid;gap:3px"><li>Entrá a console.anthropic.com con una cuenta de àndale y cargá crédito (Billing).</li><li>API keys → Create key.</li><li>Supabase → Edge Functions → Secrets → agregá <code>ANTHROPIC_API_KEY</code> con esa clave.</li></ol>';
    const pasosDrive = '<ol style="margin:6px 0 0;padding-left:18px;display:grid;gap:3px"><li>console.cloud.google.com → proyecto nuevo “andale-ops”.</li><li>APIs y servicios → Biblioteca → habilitá <b>Google Drive API</b>.</li><li>IAM → Cuentas de servicio → Crear (sin roles) → Claves → Agregar clave → JSON.</li><li>Integraciones → Cuentas y claves → Google Drive → pegá el contenido completo del .json.</li><li>En Drive, compartí la carpeta de facturas con el email de la cuenta de servicio, como Lector.</li></ol>';
    return '<section class="sheet" id="as-config"><div class="sheet-h"><h2>IA, Drive y resumen por email</h2><span class="muted">IA ' + (st.ia ? '✓' : '✗') + ' · Drive ' + (st.drive ? '✓' : '✗') + '</span></div><div class="sheet-b" style="display:grid;gap:16px">' +
      (st.error ? '<p style="margin:0;color:var(--crit)">' + esc(st.error) + '</p>' : '') +
      '<div><b>IA (Claude)</b> · ' + ok(st.ia) + (st.ia ? '<div class="muted" style="margin-top:4px">Este mes: ' + usos.length + ' consultas · ' + usdIA(gastoIA(usos).usd) + ' estimados.</div>' : '<div class="muted" style="margin-top:4px">Para conectarla, mirá Configuración técnica, abajo.</div>') + '</div>' +
      '<div><b>Google Drive</b> · ' + ok(st.drive) + (st.drive_email ? '<div style="margin-top:4px">Email para compartir carpetas de Drive: <code>' + esc(st.drive_email) + '</code> <button class="btn ghost sm" data-act="asCopy" data-v="' + esc(st.drive_email) + '">Copiar</button></div>' : '') + (st.drive_error ? '<div style="color:var(--crit)">' + esc(st.drive_error) + '</div>' : '') + (st.drive ? '' : '<div class="muted" style="margin-top:4px">Para conectarlo, mirá Configuración técnica, abajo.</div>') +
      '<div class="toolbar" style="margin-top:8px"><input class="in" id="as-carpeta2" value="' + esc(cfg.carpeta_url || '') + '" placeholder="Link de la carpeta de facturas" style="flex:1;min-width:260px"><button class="btn sm" data-act="asCarpeta" data-from="as-carpeta2">Guardar carpeta de facturas</button></div>' +
      '<div class="toolbar" style="margin-top:8px"><input class="in" id="as-carpeta3" value="' + esc(cfg.carpeta_propuestas_url || '') + '" placeholder="Link de la carpeta de propuestas anteriores (opcional)" style="flex:1;min-width:260px"><button class="btn sm" data-act="asCarpeta" data-from="as-carpeta3" data-k="propuestas">Guardar carpeta de propuestas</button></div><span class="muted" style="display:block;font-size:13px;margin-top:6px">La IA toma de ahí hasta 3 propuestas viejas (Google Docs o PDF) como referencia de estilo y precios. Compartila también con el email de arriba.</span></div>' +
      '<div><b>CUIT de quien factura</b><div class="muted" style="margin:2px 0 6px">Para reconocer quién hizo cada factura. Se completa solo la primera vez que confirmás quién factura.</div><div class="toolbar">' + k.EMISORES.map(e => '<label class="field" style="gap:2px"><span class="lbl">' + esc(e) + '</span><input class="in" id="as-cuit-' + esc(e) + '" value="' + esc((em[e] || {}).cuit || '') + '" inputmode="numeric" placeholder="20-12345678-9" style="width:170px"></label>').join('') + '<button class="btn sm" data-act="asCuits" style="align-self:end">Guardar</button></div></div>' +
      '<div><b>Resumen por email</b><div class="muted" style="margin:2px 0 6px">Los días 1 y 8 de cada mes, a las 9, el asistente les manda a los admins qué falta para cerrar.</div><div class="toolbar"><label class="chk"><input type="checkbox" data-asemail="1"' + (cfgAsist().email_activo !== false ? ' checked' : '') + '> Activado</label><button class="btn sm" data-act="asEmailYa">Mandarme uno ahora</button></div></div>' +
      '<p class="muted" style="margin:0;font-size:13px">Los PDFs y resúmenes del banco que lee la IA se envían a la API de Anthropic solo para procesarlos; no se usan para entrenar modelos. Nada se guarda en la app sin que lo confirmen.</p>' +
      '<details><summary style="cursor:pointer">Configuración técnica</summary><div class="muted" style="margin-top:8px;display:grid;gap:10px">' +
      (st.modelo ? '<div>Modelo de IA: ' + esc(st.modelo) + '</div>' : '') +
      (st.ia ? '<div>Este mes: ' + new Intl.NumberFormat('es-AR').format(tin) + ' tokens de entrada y ' + new Intl.NumberFormat('es-AR').format(tout) + ' de salida, unos <b>' + usdIA(gastoIA(usos).usd) + '</b> estimados. El detalle y el modelo de Redes están en Integraciones → Mr. Piggy; el gasto real, en console.anthropic.com.</div>' : '<div><b>Conectar la IA</b>' + pasosIA + '</div>') +
      (st.drive ? '' : '<div><b>Conectar Google Drive</b>' + pasosDrive + '</div>') +
      '</div></details>' +
      '</div></section>';
  }

  /* ---------- acciones ---------- */
  const actions = {
    asMes: t => { const n = +t.dataset.d; AD.as.mes = n ? addMonth(AD.as.mes, n) : thisMonth(); AD.as.brief = null; ctx.render(); },
    asScroll: t => { const el = document.getElementById(t.dataset.to); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); },
    asBrief: async () => {
      AD.as.briefBusy = true; ctx.render();
      try { AD.as.brief = await data.asistente({ accion: 'cierre', periodo: AD.as.mes, checklist: checklistJSON(checklist(AD.as.mes)) }); }
      catch (err) { toast(err.message); }
      AD.as.briefBusy = false; ctx.render();
    },
    asArmar: async () => {
      const rows = filasArmar(AD.as.mes);
      try { await data.insMany('resumenes', rows); toast(rows.length + ' resúmenes preparados. Revisalos en Cobros del mes.'); await ctx.reload(); } catch (err) { toast(err.message); }
    },
    asMailRes: () => k.mail.resumenes(AD.as.mes),
    asCierre: () => abrirCierre(),
    asRecs: () => k.mail.recordatorios(),
    asImpAll: () => repartirTodos(),
    asDf: t => { AD.as.df = t.dataset.v; ctx.render(); },
    asSync: async () => {
      AD.as.driveBusy = 'Revisando la carpeta…'; ctx.render();
      try { const r = await data.asistente({ accion: 'drive_sync' }); toast(r.nuevos ? r.nuevos + ' archivos nuevos (de ' + r.total + ')' : 'No hay archivos nuevos (' + r.total + ' en total)'); }
      catch (err) { toast(err.message); }
      AD.as.driveBusy = ''; await ctx.reload();
    },
    asLeer: t => leerArchivos([t.dataset.id]),
    asLeerTodo: () => leerArchivos(AD.DA.filter(d => d.estado === 'Nuevo' || d.estado === 'Error').map(d => d.id).slice(0, 60)),
    asCrear: t => crearDesdeDrive(t.dataset.id),
    asCrearTodos: () => crearTodos(),
    asOrdenar: () => ordenarTodo(),
    asVinc: t => vincularDrive(t.dataset.id),
    asDesv: async t => { try { await data.upd('drive_archivos', t.dataset.id, { factura_id: null }); await ctx.reload(); } catch (err) { toast(err.message); } },
    asIgn: async t => { try { await data.upd('drive_archivos', t.dataset.id, { estado: 'Ignorado' }); await ctx.reload(); } catch (err) { toast(err.message); } },
    asRest: async t => { const d = AD.DA.find(x => x.id === t.dataset.id); try { await data.upd('drive_archivos', t.dataset.id, { estado: d && d.datos && d.datos.total != null ? 'Leído' : 'Nuevo' }); await ctx.reload(); } catch (err) { toast(err.message); } },
    asAuto: async t => {
      const on = t.checked;
      try { await data.upsert('ajustes', { clave: 'drive', valor: { ...cfgDrive(), enviar_auto: on } }, 'clave'); toast(on ? 'Las facturas que cargues desde Drive se mandan solas al cliente' : 'Listo: las facturas de Drive ya no se mandan solas'); await ctx.reload(); }
      catch (err) { toast(err.message); t.checked = !on; }
    },
    asCarpetaCambiar: t => { AD.as.cambiarCarpeta = t.dataset.v === '1'; ctx.render(); },
    asCarpeta: async t => {
      const raw = ($('#' + (t.dataset.from || 'as-carpeta')) || {}).value || '', id = carpetaId(raw);
      if (!id) { toast('No reconozco ese link. Copiá el de la carpeta desde la barra del navegador.'); return; }
      const url = raw.startsWith('http') ? raw : 'https://drive.google.com/drive/folders/' + id;
      const v = t.dataset.k === 'propuestas' ? { carpeta_propuestas: id, carpeta_propuestas_url: url } : { carpeta: id, carpeta_url: url };
      try { await data.upsert('ajustes', { clave: 'drive', valor: { ...cfgDrive(), ...v } }, 'clave'); AD.as.cambiarCarpeta = false; toast('Carpeta guardada. Tocá «Buscar nuevos» para revisarla.'); await ctx.reload(); }
      catch (err) { toast(err.message); }
    },
    asCuits: async () => {
      const em = { ...cfgEmisores() }; k.EMISORES.forEach(e => { em[e] = { ...(em[e] || {}), cuit: soloDig(($('#as-cuit-' + e) || {}).value) }; });
      try { await data.upsert('ajustes', { clave: 'emisores', valor: em }, 'clave'); toast('CUIT guardados'); await ctx.reload(); } catch (err) { toast(err.message); }
    },
    asEmailOn: async t => { try { await data.upsert('ajustes', { clave: 'asistente', valor: { ...cfgAsist(), email_activo: t.checked } }, 'clave'); toast(t.checked ? 'Resumen por email activado' : 'Resumen por email desactivado'); await ctx.reload(); } catch (err) { toast(err.message); } },
    asEmailYa: async () => {
      const yo = (S.E.find(e => e.persona === S.me.alias) || {}).email; if (!yo) { toast('Tu usuario no tiene email cargado'); return; }
      toast('Armando el resumen…');
      try { await data.asistente({ accion: 'cierre_email', periodo: AD.as.mes, solo_yo: yo }); toast('Enviado a ' + yo); await ctx.reload(); } catch (err) { toast(err.message); }
    },
    asCopy: t => ctx.copyText(t.dataset.v),
    asConc: () => analizarExtracto(),
    asConcX: () => { AD.as.conc = null; ctx.render(); },
    asConcOk: () => cargarConciliacion(),
    aImpIA: () => sugerirReparto(),
    aImpIAvarios: () => repartirTodos(),
    aFfDrive: t => desdeDriveEnFormulario(($('#ff-drive') || {}).value),
  };
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.id === 'as-file') { AD.as.file = (t.files && t.files[0]) || null; ctx.render(); return; }
    if (t.id === 'as-caja') { AD.as.concCaja = t.value; return; }
    if (t.id === 'ff-ia' && t.files && t.files[0]) { leerPdfEnFormulario(t.files[0]); t.value = ''; return; }
    if (t.id === 'ff-drive' && t.value) { desdeDriveEnFormulario(t.value); return; }
    if (t.dataset && t.dataset.cc !== undefined && AD.as.conc) {
      const x = AD.as.conc.movimientos[+t.dataset.cc]; if (!x) return;
      x[t.dataset.cck] = t.type === 'checkbox' ? t.checked : t.value;
      if (t.type === 'checkbox') ctx.render();
    }
  });
  document.addEventListener('change', e => { if (e.target.dataset && e.target.dataset.asemail) actions.asEmailOn(e.target); });
  document.addEventListener('input', e => { const t = e.target; if (t.dataset && t.dataset.cc !== undefined && t.type !== 'checkbox' && AD.as.conc) { const x = AD.as.conc.movimientos[+t.dataset.cc]; if (x) x[t.dataset.cck] = t.value; } });

  function vAjustes() {
    if (!AD.as.estado && !AD.as.estadoBusy) setTimeout(() => cargarEstado(), 0);
    return '<div class="head"><div><h1>Ajustes</h1><p>Conexiones con la IA y Drive, datos de facturación y el resumen mensual por email.</p></div></div>' + configHtml(AD.as.estado || {});
  }

  return { actions, view: vAsistente, pendientesHtml, driveView, bancoView, driveCount, ajustes: vAjustes, count: pendientesCount, presetDesde, aprender, b64Bytes };
}
