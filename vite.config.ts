import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `--mode offline` inlines everything into one index.html that opens straight from disk.
export default defineConfig(({ mode }) => ({
  // Relative base so the build works on GitHub Pages sub-paths.
  base: './',
  plugins: [react(), tailwindcss(), ...(mode === 'offline' ? [viteSingleFile()] : [])],
  build: { chunkSizeWarningLimit: 1600, ...(mode === 'offline' ? { outDir: 'dist-offline' } : {}) },
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
}));
