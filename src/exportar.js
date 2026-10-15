// Descargas: toda vista o sección con datos se puede bajar en Excel, CSV o PDF, o imprimir.
// - Arriba (barra superior): toda la vista.
// - En cada sección con tabla: solo esa sección (botón de descarga en su encabezado).
// Los gráficos llevan su tabla de datos oculta (.sr-only), así también se descargan.
// El PDF sale del diálogo de impresión del navegador ("Guardar como PDF"), con el encabezado y pie de àndale.
import { ICON } from './iconos.js';

const limpio = s => String(s || '').replace(/\s+/g, ' ').trim();
const nombreArchivo = s => limpio(s).replace(/[\\/?*[\]:"<>|]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'àndale';
// "$ 1.234,50" → 1234.5 · "61%" → 0.61 · lo demás queda como texto.
function celda(txt) {
  const t = limpio(txt).replace(/−/g, '-');
  const pc = t.match(/^(-?\d{1,3}(?:\.\d{3})*(?:,\d+)?|-?\d+(?:,\d+)?)\s?%$/);
  if (pc) return { v: parseFloat(pc[1].replace(/\./g, '').replace(',', '.')) / 100, z: '0%' };
  const m = t.match(/^(-?)\s*(?:US\$|\$|€|£|ARS|USD|EUR|GBP)?\s*(-?)(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)$/);
  if (m && !/^0\d/.test(m[3])) { const n = parseFloat(m[3].replace(/\./g, '').replace(',', '.')) * (m[1] || m[2] ? -1 : 1); return { v: n, z: /,\d/.test(m[3]) || /[$€£]/.test(t) ? '#,##0.00' : '0' }; }
  return { v: t };
}
// Tabla → filas de texto (sin botones, casillas ni menús).
function filas(t) {
  const c = t.cloneNode(true);
  c.querySelectorAll('select').forEach(sel => { const o = sel.options[sel.selectedIndex]; sel.replaceWith(document.createTextNode(o ? o.textContent : '')); });
  c.querySelectorAll('input').forEach(i => { if (i.type === 'checkbox') i.replaceWith(document.createTextNode(i.checked ? 'Sí' : '')); else i.replaceWith(document.createTextNode(i.value || '')); });
  c.querySelectorAll('th.sel, td.sel, caption, .sr-skip').forEach(x => x.remove());
  c.querySelectorAll('details').forEach(d => { const sm = d.querySelector('summary'); d.replaceWith(document.createTextNode(sm ? sm.textContent : '')); });
  c.querySelectorAll('button:not(.link)').forEach(b => b.remove());
  c.querySelectorAll('.sub, small').forEach(s => s.prepend(document.createTextNode(' · ')));
  return [...c.querySelectorAll('tr')].map(tr => [...tr.children].map(td => limpio(td.textContent))).filter(r => r.some(Boolean));
}
function tablasDe(scope) {
  return [...scope.querySelectorAll('table')].filter(t => !t.closest('#printwrap thead, #printwrap tfoot')).map((t, i) => {
    const sh = t.closest('.sheet'), h = t.dataset.titulo || (t.querySelector('caption') || {}).textContent || (sh && (sh.querySelector('.sheet-h h2, .sx-h h2') || {}).textContent) || '';
    return { titulo: limpio(h) || 'Tabla ' + (i + 1), filas: filas(t) };
  }).filter(x => x.filas.length);
}

export function initExportar({ $, toast, titulo }) {
  const bajar = (blob, nombre) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };
  const alcance = el => { const s = el && el.closest('.sheet[data-dl]'); return s || $('#view'); };
  const nombreDe = (scope, ext) => nombreArchivo(scope.id === 'view' ? titulo() : titulo() + ' - ' + ((scope.querySelector('.sheet-h h2, .sx-h h2') || {}).textContent || '')) + ' · àndale.' + ext;

  async function excel(scope) {
    const ts = tablasDe(scope); if (!ts.length) { toast('Acá no hay datos para descargar'); return; }
    try {
      const XLSX = await import('xlsx'); const wb = XLSX.utils.book_new(), usados = new Set();
      ts.forEach((t, i) => {
        const aoa = t.filas.map((r, ri) => r.map(v => ri === 0 ? v : celda(v).v));
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        t.filas.forEach((r, ri) => { if (!ri) return; r.forEach((v, ci) => { const c = celda(v); if (c.z) { const ref = XLSX.utils.encode_cell({ r: ri, c: ci }); if (ws[ref]) ws[ref].z = c.z; } }); });
        ws['!cols'] = (t.filas[0] || []).map((_, ci) => ({ wch: Math.min(48, Math.max(8, ...t.filas.map(r => String(r[ci] || '').length + 2))) }));
        let n = t.titulo.replace(/[\\/?*[\]:]/g, ' ').slice(0, 28).trim() || 'Hoja ' + (i + 1);
        while (usados.has(n)) n = n.slice(0, 24) + ' ' + (i + 1); usados.add(n);
        XLSX.utils.book_append_sheet(wb, ws, n);
      });
      XLSX.writeFile(wb, nombreDe(scope, 'xlsx'));
      toast('Excel descargado');
    } catch (e) { toast('No se pudo armar el Excel: ' + e.message); }
  }
  function csv(scope) {
    const ts = tablasDe(scope); if (!ts.length) { toast('Acá no hay datos para descargar'); return; }
    // Separador ";" (Excel en español lo abre en columnas); con varias tablas, una debajo de la otra con su título.
    const q = v => /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    const txt = ts.map(t => (ts.length > 1 ? q(t.titulo) + '\r\n' : '') + t.filas.map(r => r.map(q).join(';')).join('\r\n')).join('\r\n\r\n');
    bajar(new Blob(['﻿' + txt], { type: 'text/csv;charset=utf-8' }), nombreDe(scope, 'csv'));
    toast('CSV descargado');
  }
  // Imprimir (o PDF) solo una sección: se marca el camino hasta ella y el resto se oculta al imprimir.
  function imprimir(scope, pdf) {
    const solo = scope.id !== 'view', marcados = [];
    if (solo) { scope.classList.add('pr-este'); let p = scope.parentElement; while (p && p.id !== 'view') { p.classList.add('pr-camino'); marcados.push(p); p = p.parentElement; } document.body.classList.add('print-solo'); }
    const t0 = document.title; document.title = nombreDe(scope, 'pdf').replace(/\.pdf$/, '');
    if (pdf) toast('En el diálogo, elegí “Guardar como PDF” como destino');
    const fin = () => { document.title = t0; scope.classList.remove('pr-este'); marcados.forEach(m => m.classList.remove('pr-camino')); document.body.classList.remove('print-solo'); window.removeEventListener('afterprint', fin); };
    window.addEventListener('afterprint', fin);
    setTimeout(() => window.print(), pdf ? 350 : 0);
  }
  const hayDatos = scope => !!scope.querySelector('table');
  const menu = (cls, conDatos) => '<details class="share dl ' + cls + '"><summary class="btn ghost sm" title="Descargar o imprimir" aria-label="Descargar o imprimir">' + ICON.descargar + '<span>Descargar</span></summary><div class="menu-pop">' +
    (conDatos ? '<button class="btn ghost sm" data-act="dlExcel">' + ICON.excel + 'Excel (.xlsx)</button><button class="btn ghost sm" data-act="dlCsv">' + ICON.csv + 'CSV</button>' : '') +
    '<button class="btn ghost sm" data-act="dlPdf">' + ICON.pdf + 'PDF</button><button class="btn ghost sm" data-act="dlPrint">' + ICON.imprimir + 'Imprimir</button></div></details>';
  // Botón de descarga en cada sección con datos (idempotente: se puede llamar en cada render).
  function decorar(root) {
    (root || $('#view') || document.createElement('div')).querySelectorAll('.sheet').forEach(sh => {
      if (sh.dataset.dl || sh.closest('#panel') || !sh.querySelector('table')) return;
      const h = sh.querySelector(':scope > .sheet-h, :scope > .sx-h'); if (!h) return;
      sh.dataset.dl = '1';
      const w = document.createElement('span'); w.className = 'dl-w'; w.innerHTML = menu('sec', true); h.appendChild(w);
    });
  }
  let pend = 0;
  function observar() { const v = $('#view'); if (!v) return; new MutationObserver(() => { if (pend) return; pend = requestAnimationFrame(() => { pend = 0; decorar(v); }); }).observe(v, { childList: true, subtree: true }); }
  const cerrar = t => { const d = t.closest('details'); if (d) d.open = false; };
  const actions = {
    dlExcel: t => { cerrar(t); excel(alcance(t)); },
    dlCsv: t => { cerrar(t); csv(alcance(t)); },
    dlPdf: t => { cerrar(t); imprimir(alcance(t), true); },
    dlPrint: t => { cerrar(t); imprimir(alcance(t), false); },
  };
  return { menuVista: () => menu('vista', hayDatos($('#view'))), decorar, observar, actions, excel, csv };
}
