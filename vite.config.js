import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
const r = p => fileURLToPath(new URL(p, import.meta.url));
// Dos páginas: la app (index.html) y la propuesta pública para clientes (p.html, servida en /p/<token>).
export default defineConfig({ build: { rollupOptions: { input: { main: r('./index.html'), p: r('./p.html') } } } });
