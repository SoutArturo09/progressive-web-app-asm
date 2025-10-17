import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react()
    // ⚠️ ELIMINADO completamente VitePWA para evitar interferencias
  ],
  build: {
    outDir: 'dist',
  },
  publicDir: 'public',
  base: '/',
});