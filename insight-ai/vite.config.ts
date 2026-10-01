import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// Relative base so the static build works from any path (Vercel, file share, sub-folder).
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // One self-contained bundle (~165 kB gzipped) suits an offline executive asset better than lazy chunks.
  build: { chunkSizeWarningLimit: 700 },
});
