import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// ---------------------
// Registro MANUAL del Service Worker - CORREGIDO
// ---------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      console.log('🔄 Iniciando registro manual del Service Worker...');
      
      // Limpiar SWs antiguos primero
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (let registration of registrations) {
        await registration.unregister();
        console.log('🗑️ SW antiguo desregistrado:', registration.scope);
      }

      // ✅ Registrar desde la carpeta public
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('✅ Service Worker registrado correctamente:', registration);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            console.log('🔄 Estado del SW:', newWorker.state);
            if (newWorker.state === 'activated') {
              console.log('🎉 Service Worker ACTIVADO Y LISTO');
              
              // Verificar que puede recibir mensajes
              newWorker.postMessage({ 
                type: 'hello', 
                message: 'Service Worker activado correctamente' 
              });
            }
          });
        }
      });

      // Escuchar mensajes del SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('📨 Mensaje del SW:', event.data);
      });

      // Manejar errores del SW
      registration.addEventListener('error', (event: Event) => {
        console.error('❌ Error en el Service Worker:', event);
      });

    } catch (error) {
      console.error('❌ Error registrando Service Worker:', error);
    }
  });
} else {
  console.log('❌ Service Workers no soportados en este navegador');
}

// ---------------------
// Render principal
// ---------------------
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);