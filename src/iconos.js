// Íconos de la barra lateral: trazo de 1.7, 20×20, heredan el color del texto.
const s = d => '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
export const ICON = {
  inicio: s('<path d="M3.5 10.5 12 4l8.5 6.5"/><path d="M5.5 9v10.5h13V9"/><path d="M10 19.5v-5h4v5"/>'),
  proyectos: s('<path d="M3.5 7.5a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>'),
  abonos: s('<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20v-4h-4"/>'),
  mis: s('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5"/>'),
  clientes: s('<circle cx="9" cy="8.5" r="3.2"/><path d="M3 19.5c.7-3.2 3-5 6-5s5.3 1.8 6 5"/><path d="M15.5 5.6a3.2 3.2 0 0 1 0 5.8"/><path d="M17.5 14.7c1.8.6 3 2.2 3.5 4.8"/>'),
  comunicaciones: s('<path d="M4 5.5h16v10H9l-5 4z"/><path d="M8 9.5h8M8 12.5h5"/>'),
  equipo: s('<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3.5v3M16 3.5v3"/><circle cx="12" cy="11.5" r="2.3"/><path d="M8 17c.6-1.7 2.1-2.6 4-2.6s3.4.9 4 2.6"/>'),
  listas: s('<path d="M9 6.5h11M9 12h11M9 17.5h11"/><circle cx="5" cy="6.5" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="17.5" r="1"/>'),
  asistente: s('<path d="M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
  estadisticas: s('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  cierre: s('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/><path d="m9 14.5 2 2 4-4"/>'),
  facturas: s('<path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 11.5h6M9 15h3"/>'),
  precios: s('<path d="M3.5 12.5 11.5 4.5h8v8l-8 8z"/><circle cx="15.5" cy="8.5" r="1.4"/>'),
  caja: s('<path d="M4 7.5h14.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2H17"/><path d="M16 13.5h2"/>'),
  pagos: s('<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>'),
  propuestas: s('<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/><path d="M9 12.5h6M9 16h4"/>'),
  ajustes: s('<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"/>'),
  rentabilidad: s('<path d="M3.5 17.5 9 12l4 4 7.5-8"/><path d="M15 8h5.5v5.5"/>'),
  integraciones: s('<rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><path d="M17 13.5v7M13.5 17h7"/>'),
};
ICON.redes = s('<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17" cy="7" r=".9" fill="currentColor"/>');
ICON.tickets = s('<path d="M3.5 8.5V6.5a1.5 1.5 0 0 1 1.5-1.5h14a1.5 1.5 0 0 1 1.5 1.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-2a2.5 2.5 0 0 0 0-5z"/><path d="M9.5 5v14" stroke-dasharray="2 2"/>');
ICON.briefs = s('<path d="M7 4.5h10a1.5 1.5 0 0 1 1.5 1.5v14H5.5V6A1.5 1.5 0 0 1 7 4.5z"/><path d="M9 3.5h6v3H9z"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4"/>');
ICON.cobros = ICON.facturas; ICON.gastos = ICON.caja; ICON.numeros = ICON.estadisticas;

// Íconos de uso general (mismo trazo que la barra lateral). Se usan en encabezados, botones, menús y avisos.
Object.assign(ICON, {
  ingreso: s('<path d="M12 4v11"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4.5 19.5h15"/>'),
  gasto: s('<path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M4.5 19.5h15"/>'),
  resultado: s('<path d="M4 19.5h16"/><path d="M6 16l4-5 3 3 5-7"/><circle cx="18" cy="7" r="1.3"/>'),
  sueldos: s('<circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-3 2.8-4.8 5.5-4.8 1.3 0 2.5.4 3.4 1.1"/><path d="M17.5 12.5v7M15.5 14.2c0-.8.9-1.4 2-1.4s2 .6 2 1.4-.9 1.2-2 1.4-2 .6-2 1.4.9 1.4 2 1.4 2-.6 2-1.4"/>'),
  operacion: s('<path d="M3 12h4l2.5-6 5 12 2.5-6h4"/>'),
  dona: s('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/><path d="M12 4v4.5M19.6 9.8l-4.3 1.2"/>'),
  barras: s('<path d="M4 6.5h9M4 12h14M4 17.5h6"/>'),
  ranking: s('<path d="M8 20v-6M12 20V8M16 20v-9"/><path d="M4 20h16"/><path d="m10.5 5 1.5-1.5L13.5 5"/>'),
  alerta: s('<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4.5"/><circle cx="12" cy="17" r=".6" fill="currentColor"/>'),
  descargar: s('<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>'),
  imprimir: s('<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>'),
  pdf: s('<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/><path d="M8.5 16.5v-3.5h1.2a1.1 1.1 0 0 1 0 2.2H8.5M12.5 16.5v-3.5h.8a1.75 1.75 0 0 1 0 3.5z"/>'),
  excel: s('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M4 9.5h16M4 15h16M10 9.5V20"/>'),
  csv: s('<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/><path d="M9 12.5h6M9 15.5h6M9 18h3"/>'),
  compartir: s('<circle cx="18" cy="5.5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="18.5" r="2.5"/><path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4"/>'),
  buscar: s('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.5 4.5"/>'),
  ia: s('<path d="M12 3.5l1.8 4.7 4.7 1.8-4.7 1.8L12 16.5l-1.8-4.7L5.5 10l4.7-1.8z"/><path d="M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>'),
  mail: s('<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4 7 8 6 8-6"/>'),
  clip: s('<path d="m20 11.5-7.6 7.6a4.6 4.6 0 0 1-6.5-6.5l8.2-8.2a3 3 0 0 1 4.3 4.3l-8.2 8.2a1.5 1.5 0 0 1-2.1-2.1l7.4-7.4"/>'),
  candado: s('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
  doc: s('<path d="M6 3.5h8l4 4v13H6z"/><path d="M14 3.5v4h4"/><path d="M9 12.5h6M9 16h4"/>'),
  calendario: s('<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/>'),
  charla: s('<path d="M4 5.5h16v10H9l-5 4z"/>'),
  externo: s('<path d="M14 4.5h5.5V10"/><path d="M19.5 4.5 11 13"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>'),
  check: s('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  reloj: s('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  banco: s('<path d="M3.5 9.5 12 4.5l8.5 5"/><path d="M5.5 10v7.5M9.5 10v7.5M14.5 10v7.5M18.5 10v7.5M3.5 20h17"/>'),
  drive: s('<path d="M8.5 4h7l5 8.5-3.5 6h-10L3.5 12.5z"/><path d="M8.5 4l5 8.5h7M3.5 12.5h10L10 18.5"/>'),
  tarea: s('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'),
  etapa: s('<path d="M4 12h13"/><path d="m13 7.5 4.5 4.5-4.5 4.5"/><path d="M20 5v14"/>'),
  arroba: s('<circle cx="12" cy="12" r="3.5"/><path d="M15.5 12v1.5a2.5 2.5 0 0 0 5 0V12a8.5 8.5 0 1 0-3.5 6.9"/>'),
  estrella: s('<path d="m12 4 2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>'),
  plata: s('<circle cx="12" cy="12" r="8.5"/><path d="M14.8 9.3c-.4-1-1.5-1.6-2.8-1.6-1.6 0-2.8.8-2.8 2s1.2 1.7 2.8 2 2.8.8 2.8 2-1.2 2-2.8 2c-1.3 0-2.5-.6-2.9-1.7M12 6v1.7M12 16.3V18"/>'),
});
// Ícono suelto con tamaño propio.
export const ic = (k, px) => (ICON[k] || '').replace(/width="18" height="18"/, px ? 'width="' + px + '" height="' + px + '"' : 'width="18" height="18"');

// Emojis heredados → ícono de línea, para que todo hable el mismo idioma visual.
const EMOJI = { '✨': 'ia', '✉': 'mail', '📄': 'doc', '📎': 'clip', '🔒': 'candado', '📅': 'calendario', '💬': 'charla', '⚠': 'alerta', '↗': 'externo' };
const RX = /(✨|✉️?|📄|📎|🔒|📅|💬|⚠️?|↗)/;
const NO = new Set(['OPTION', 'TEXTAREA', 'TITLE', 'SCRIPT', 'STYLE', 'INPUT']);
function cambiar(nodo) {
  const w = document.createTreeWalker(nodo, NodeFilter.SHOW_TEXT, { acceptNode: t => RX.test(t.nodeValue) && t.parentNode && !NO.has(t.parentNode.nodeName) && !t.parentNode.closest('[contenteditable],select,svg') ? 1 : 3 });
  const ts = []; while (w.nextNode()) ts.push(w.currentNode);
  ts.forEach(t => {
    const partes = t.nodeValue.split(RX), f = document.createDocumentFragment();
    partes.forEach((p, i) => {
      if (i % 2) { const sp = document.createElement('span'); sp.className = 'ici' + (p.startsWith('↗') ? ' ext' : ''); sp.setAttribute('aria-hidden', 'true'); sp.innerHTML = ICON[EMOJI[p.replace(/️/g, '')]] || ''; f.appendChild(sp); }
      else if (p) f.appendChild(document.createTextNode(i && partes[i - 1] ? p.replace(/^ /, '') : p));
    });
    t.parentNode.replaceChild(f, t);
  });
}
export function iconizar(raiz) {
  const r = raiz || document.body; if (!r || typeof document === 'undefined') return;
  cambiar(r);
  new MutationObserver(ms => { for (const m of ms) { if (m.type === 'characterData') { if (RX.test(m.target.nodeValue) && m.target.parentNode) cambiar(m.target.parentNode); } else m.addedNodes.forEach(n => { if (n.nodeType === 1) cambiar(n); else if (n.nodeType === 3 && RX.test(n.nodeValue) && n.parentNode) cambiar(n.parentNode); }); } })
    .observe(r, { childList: true, subtree: true, characterData: true });
}
