import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// ---------------------
// Registro del Service Worker con Vite PWA
// ---------------------
import { registerSW } from 'virtual:pwa-register';

registerSW({
  onOfflineReady() {
    console.log('✅ Tu app ya está lista para usar offline');
  },
  onNeedRefresh() {
    console.log('⚡ Nueva versión disponible. Actualiza la app');
  },
});

// ---------------------
// Escucha mensajes desde el SW
// ---------------------
navigator.serviceWorker?.addEventListener('message', (ev) => {
  if (ev.data?.type === 'task-synced') {
    console.log('Client: tarea sincronizada desde SW, id=', ev.data.id);
  }
});

// ---------------------
// Render principal
// ---------------------
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
