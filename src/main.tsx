import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// ---------------------
// Registro del Service Worker con Vite PWA
// ---------------------
import { registerSW } from 'virtual:pwa-register';

const updateSW = registerSW({
  onOfflineReady() {
    console.log('✅ Tu app ya está lista para usar offline');
  },
  onNeedRefresh() {
    console.log('⚡ Nueva versión disponible. Actualiza la app');
  },
});

navigator.serviceWorker?.addEventListener('message', (ev) => {
  if (ev.data?.type === 'task-synced') {
    console.log('Client: tarea sincronizada desde SW, id=', ev.data.id);
    // opcional: recarga la lista o muestra toast
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

// ---------------------
// Opcional: Forzar update manual desde UI
// ---------------------
// export async function updateServiceWorker() {
//   await updateSW?.();
// }
