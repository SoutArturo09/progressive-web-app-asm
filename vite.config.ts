import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// ✅ Ya no necesitas importar React explícitamente para JSX moderno
// import * as React from 'react';  <-- esto ya no es necesario si tu tsconfig tiene "jsx": "react-jsx"

const isDev = process.env.NODE_ENV === 'development';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      srcDir: 'src',
      filename: 'sw.js',           // tu SW personalizado
      registerType: 'autoUpdate',
      injectRegister: 'inline',    // fuerza registro en dev
      devOptions: {
        enabled: true,             // registra SW en dev
        type: 'module',            // usa module type en dev
      },
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
        // No cache de API en dev
        runtimeCaching: isDev
          ? []
          : [
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
