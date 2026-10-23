import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5202,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 5202,
    strictPort: true,
  },
  build: {
    chunkSizeWarningLimit: 700,
  },
});
