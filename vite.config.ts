import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // ---------------------
      // Configuración PWA
      // ---------------------
      srcDir: 'src',        // Carpeta donde está tu sw.ts
      filename: 'sw.ts',    // Nombre del SW generado
      registerType: 'autoUpdate', // Auto-update del SW
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Mi PWA App',
        short_name: 'MiApp',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0078ff',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        // Cache dinámico para tu API
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/localhost:3000\/api\/.*$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
            },
          },
        ],
      },
    }),
  ],
});
