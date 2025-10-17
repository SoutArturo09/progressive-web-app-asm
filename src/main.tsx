import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// ---------------------
// Registro MANUAL del Service Worker - VERSIÓN NETLIFY
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

              // 🔍 EJECUTAR VERIFICACIÓN
              setTimeout(() => {
                checkNetlifySW();
              }, 1000);
            }
          });
        }
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
// VERIFICACIÓN ESPECÍFICA PARA NETLIFY
// ---------------------
const checkNetlifySW = async () => {
  console.log('🔍 INICIANDO VERIFICACIÓN NETLIFY SW...');
  
  if ('serviceWorker' in navigator) {
    console.log('📍 Ubicación actual:', window.location.origin);
    console.log('🌐 Entorno:', import.meta.env.MODE);
    
    // Verificar si el SW se está descargando
    try {
      const swResponse = await fetch('/sw.js');
      console.log('📦 SW HTTP Status:', swResponse.status);
    } catch (err) {
      console.error('❌ No se puede cargar sw.js:', err);
    }

    // Verificar si hay SW registrado
    const registrations = await navigator.serviceWorker.getRegistrations();
    console.log('📋 SW Registrations encontradas:', registrations.length);
    
    if (registrations.length === 0) {
      console.log('❌ NO hay Service Workers registrados');
      return;
    }
    
    registrations.forEach((reg, idx) => {
      console.log(`SW ${idx}:`, {
        scope: reg.scope,
        active: reg.active?.state,
        scriptURL: reg.active?.scriptURL
      });
    });

    // Verificar si está controlando
    if (navigator.serviceWorker.controller) {
      console.log('✅ SW está CONTROlando la página');
      console.log('🔗 SW Controller scriptURL:', navigator.serviceWorker.controller.scriptURL);
      
      const isOurSW = navigator.serviceWorker.controller.scriptURL.includes('/sw.js');
      console.log('🎯 ¿Es nuestro SW?', isOurSW);
      
    } else {
      console.log('❌ SW NO está controlando la página');
    }

    // Verificar cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('🗂️ Caches disponibles:', cacheNames);
      
      const ourCacheExists = cacheNames.includes('app-cache-v1');
      console.log('🎯 ¿Nuestro cache existe?', ourCacheExists);
    }
  }
};

// Verificación después de carga
setTimeout(checkNetlifySW, 2000);
setTimeout(checkNetlifySW, 5000);

// ---------------------
// Render principal
// ---------------------
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);