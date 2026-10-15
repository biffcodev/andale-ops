import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
const r = p => fileURLToPath(new URL(p, import.meta.url));
// Tres páginas: la app (index.html), la propuesta pública (p.html, en /p/<token>) y el portal de clientes (portal.html, en /portal).
export default defineConfig({ build: { rollupOptions: { input: { main: r('./index.html'), p: r('./p.html'), portal: r('./portal.html') } } } });
