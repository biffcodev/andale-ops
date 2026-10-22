// Ayuda: botón con signo de pregunta junto a la campanita. Abre los videotutoriales del rol,
// los links para mandar a clientes y proveedores, los atajos de teclado y las novedades de la app.
import { ICON } from './iconos.js';

// Páginas de videotutoriales (publicadas aparte). Si cambian de dirección, se cambian acá.
export const TUTORIALES = {
  admin: { url: 'https://claude.ai/artifact/GT4RBKdvnWvLWxVUcsGyko', t: 'Videotutoriales de administración' },
  equipo: { url: 'https://claude.ai/artifact/Lci3Dd5246f3kcqjx9Wd2u', t: 'Videotutoriales del equipo' },
  externo: { url: 'https://claude.ai/artifact/Fs7fEjUBBNDaWATStk9s6Y', t: 'Videotutoriales para proveedores' },
  cliente: { url: 'https://claude.ai/artifact/CqPAmSMz6ipUxgPasD3TaC', t: 'Videotutoriales del portal' },
};

// Lo nuevo de la app, lo más reciente primero. roles: a quién le interesa (vacío = a todos).
export const NOVEDADES = [
  { f: '2026-10-21', t: 'Proyectos en el portal del cliente', d: 'El cliente ve en qué estamos (la hoja de ruta con lo hecho, lo de ahora y lo que sigue), las fechas y lo que le toca a él. En cada tarea elegís si la ve, si la hace el cliente (la tilda desde el portal y te llega el aviso) o si es interna.', roles: ['admin', 'equipo'] },
  { f: '2026-10-21', t: 'Los estados se llaman igual en todos lados', d: 'Idea · En diseño · Lista para mandar · Con el cliente · Cambios pedidos · Aprobada · Programada · Publicada. Cada uno con su color, en la planilla, la lista, el tablero, el calendario y la pieza. Al lado del estado está el paso que sigue (Pasar a diseño, Está lista, Aprobó, Mandar de nuevo, Ya la programé).', roles: ['admin', 'equipo', 'externo'] },
  { f: '2026-10-17', t: 'Configuración ordenada', d: 'Seis pantallas por tema: Facturación, Mails, Trabajo y Redes, Integraciones, Automatizaciones y Datos de la app.', roles: ['admin'] },
  { f: '2026-10-17', t: 'Facturas en Drive', d: 'Se nombran solas como CLIENTE-MES-AÑO.pdf, se detectan duplicados y se avisa si alguien borra un PDF. Copia de respaldo opcional.', roles: ['admin'] },
  { f: '2026-10-19', t: 'Cuánto cuesta cada cliente', d: 'En Estadísticas → Qué deja cada cliente: valor hora de cada persona (con su sueldo), el tiempo que lleva cada cliente (tiempos estándar por formato o las horas reales si se cargan), costo directo, costo completo y cuánto cuesta cada pieza.', roles: ['admin'] },
  { f: '2026-10-18', t: 'Más simple en el celular', d: 'Abajo tenés Inicio, Trabajo, Redes, + Cargar y Más. Inicio arranca por lo que te toca; los números van de a dos, las tablas se leen como lista y los gráficos entran en la pantalla.', roles: ['admin', 'equipo', 'externo'] },
  { f: '2026-10-18', t: 'Conversaciones del cliente', d: 'En la ficha, una sola línea de tiempo con las charlas, los mails que le mandamos y lo que escribió en el portal. Los mails ya no se anotan solos como charla; si el cliente responde, tocá el mail → “El cliente respondió”.', roles: ['admin', 'equipo'] },
  { f: '2026-10-18', t: '@ a contactos del cliente', d: 'En los comentarios que ve el cliente podés mencionar a una persona del cliente: le llega un mail con lo que le escribiste y lo ve en su portal.', roles: ['admin', 'equipo'] },
  { f: '2026-10-18', t: 'Lo que vuelve del cliente', d: 'Cuando un cliente pide cambios o comenta una pieza, le llega el aviso a todo el equipo de la cuenta, y en Mis trabajos aparece cada pieza con lo que pidió.', roles: ['admin', 'equipo', 'externo'] },
  { f: '2026-10-18', t: 'Redes más simple', d: 'Cada pieza avanza sola (Idea · En diseño · Lista para mandar). El mes se manda entero al cliente y lo que vuelve se maneja de a una, con la bandeja de Pedidos de clientes.', roles: ['admin', 'equipo', 'externo'] },
  { f: '2026-10-17', t: 'Tablero de Redes', d: 'Una vista nueva para ver las piezas por etapa y moverlas arrastrándolas.', roles: ['admin', 'equipo', 'externo'] },
  { f: '2026-10-17', t: 'Mr. Piggy arma el plan más rápido', d: 'Propone el mes por tandas, separa Efemérides y noticias de Días y horarios, y corrige la redacción.', roles: ['admin', 'equipo'] },
  { f: '2026-10-17', t: 'Cambiar una pieza por otra idea', d: 'Si una idea no va, se reemplaza desde la pieza. Las fuentes son de primer nivel y podés descartar sitios.', roles: ['admin', 'equipo'] },
  { f: '2026-10-17', t: 'Cuentas y claves', d: 'En Integraciones están todas las cuentas que usa la app, de quién es cada una, el modelo de Mr. Piggy y cuánto lleva gastado.', roles: ['admin'] },
  { f: '2026-10-17', t: 'Atajos y ayudas', d: 'Atajos de teclado (tocá ? para verlos) y una ayuda al dejar el mouse sobre los botones.', roles: ['admin', 'equipo'] },
  { f: '2026-10-17', t: 'Seleccionar todos', d: 'Donde hay varias opciones para tildar, un botón tilda o destilda todas.', roles: ['admin', 'equipo', 'externo'] },
  { f: '2026-10-16', t: 'Firma y contactos', d: 'Cada mail lleva la firma que elijas, y los contactos tienen botones para mail, WhatsApp y llamar.', roles: ['admin', 'equipo'] },
  { f: '2026-10-16', t: 'Proveedores y resúmenes', d: 'Lo acordado con cada proveedor por proyecto, pagos a cuenta y envío programado de los resúmenes de cuenta.', roles: ['admin'] },
];

const ICO = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8 1c0 1.7-2.4 2.2-2.4 3.6"/><path d="M12 17.2v.1"/></svg>';
const PLAY = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="3"/><path d="m10.5 9.5 4 2.5-4 2.5z" fill="currentColor"/></svg>';
const KEY = 'ayuda.visto';
const leer = () => { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } };
const guardar = v => { try { localStorage.setItem(KEY, v); } catch (e) { /* sin almacenamiento: el punto vuelve a aparecer */ } };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fecha = f => { const [, m, d] = f.split('-'); return +d + '/' + +m; };

// ctx: { rol, toast }
export function initAyuda(ctx) {
  const w = document.querySelector('.tbellw'); if (!w) return;
  let b = document.getElementById('thelp'), pop = document.getElementById('thelppop');
  if (!b) {
    b = document.createElement('button'); b.className = 'btn ghost sm thelp'; b.id = 'thelp'; b.type = 'button';
    b.setAttribute('aria-label', 'Ayuda'); b.title = 'Ayuda: videotutoriales, atajos y novedades'; b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false');
    b.innerHTML = ICO + '<span class="th-dot" hidden></span>';
    pop = document.createElement('div'); pop.className = 'thelppop'; pop.id = 'thelppop'; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Ayuda'); pop.hidden = true;
    const bell = document.getElementById('tbell');
    w.insertBefore(b, bell || null); w.insertBefore(pop, bell || null);
  }
  const rol = ctx.rol || 'equipo', staff = rol === 'admin' || rol === 'equipo';
  const nov = NOVEDADES.filter(n => !n.roles || n.roles.includes(rol));
  const ultima = nov.length ? nov[0].f : '';
  const punto = () => { const d = b.querySelector('.th-dot'); if (d) d.hidden = !(ultima && leer() < ultima); };
  punto();
  const tuto = TUTORIALES[rol] || TUTORIALES.equipo;
  const copiar = (k, t) => '<div class="hp-i hp-c"><span class="hp-ic">' + ICON.enlace + '</span><span class="hp-t"><b>' + esc(t) + '</b><small>' + (k === 'cliente' ? 'Para mandarle a un cliente cuando le das acceso al portal.' : 'Para mandarle a alguien de afuera cuando empieza a trabajar con nosotros.') + '</small></span>' +
    '<button type="button" class="btn ghost sm" data-hp="copiar" data-k="' + k + '" title="Copiar el link">' + ICON.copiar + '<span>Copiar</span></button></div>';
  function pintar() {
    const visto = leer();
    pop.innerHTML = '<div class="hp-h"><b>Ayuda</b></div>' +
      '<a class="hp-i" href="' + esc(tuto.url) + '" target="_blank" rel="noopener"><span class="hp-ic">' + PLAY + '</span><span class="hp-t"><b>' + esc(tuto.t) + '</b><small>Cada parte de la app en videos cortos, con voz y subtítulos.</small></span><span class="hp-go">' + ICON.externo + '</span></a>' +
      (staff ? copiar('cliente', 'Videotutoriales para clientes') : '') +
      (rol === 'admin' ? copiar('externo', 'Videotutoriales para proveedores') : '') +
      (staff ? '<button type="button" class="hp-i" data-hp="atajos"><span class="hp-ic hp-k">⌨</span><span class="hp-t"><b>Atajos de teclado</b><small>Buscar, crear, cambiar de vista y moverte sin el mouse.</small></span><kbd>?</kbd></button>' : '') +
      (nov.length ? '<div class="hp-n"><div class="hp-nh">Novedades</div>' + nov.map(n => '<div class="hp-nv' + (n.f > visto ? ' nuevo' : '') + '"><span class="hp-f">' + fecha(n.f) + '</span><span><b>' + esc(n.t) + '</b><span>' + esc(n.d) + '</span></span></div>').join('') + '</div>' : '');
  }
  function abrir(si) {
    pop.hidden = !si; b.setAttribute('aria-expanded', si ? 'true' : 'false');
    if (si) { pintar(); const bell = document.getElementById('tbellpop'); if (bell) bell.hidden = true; if (ultima) { guardar(ultima); punto(); } }
  }
  if (!w.dataset.ayuda) {
    w.dataset.ayuda = '1';
    document.addEventListener('click', async e => {
      if (e.target.closest('#thelp')) { abrir(pop.hidden); return; }
      const c = e.target.closest('#thelppop [data-hp]');
      if (c && c.dataset.hp === 'copiar') {
        const u = (TUTORIALES[c.dataset.k] || {}).url || '';
        try { await navigator.clipboard.writeText(u); if (ctx.toast) ctx.toast('Link copiado'); } catch (er) { window.prompt('Copiá el link', u); }
        return;
      }
      if (c && c.dataset.hp === 'atajos') { abrir(false); if (ctx.atajos) ctx.atajos(); return; }
      if (e.target.closest('#thelppop a')) { abrir(false); return; }
      if (!e.target.closest('#thelppop')) abrir(false);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !pop.hidden) abrir(false); });
  }
}
