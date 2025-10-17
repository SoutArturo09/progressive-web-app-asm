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

              // 🔍 EJECUTAR VERIFICACIÓN DESPUÉS DE ACTIVARSE
              setTimeout(() => {
                checkNetlifySW();
              }, 1000);
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
// VERIFICACIÓN ESPECÍFICA PARA NETLIFY
// ---------------------
const checkNetlifySW = async () => {
  console.log('🔍 INICIANDO VERIFICACIÓN NETLIFY SW...');
  
  if ('serviceWorker' in navigator) {
    console.log('📍 Ubicación actual:', window.location.origin);
    console.log('🌐 Entorno:', import.meta.env.MODE);
    
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
        waiting: reg.waiting?.state,
        installing: reg.installing?.state
      });
    });

    // Verificar si está controlando
    if (navigator.serviceWorker.controller) {
      console.log('✅ SW está CONTROlando la página');
      console.log('🔧 SW Controller state:', navigator.serviceWorker.controller.state);
      console.log('🔗 SW Controller scriptURL:', navigator.serviceWorker.controller.scriptURL);
      
      // Verificar el SW activo
      const registration = await navigator.serviceWorker.ready;
      console.log('🎯 SW Ready - active:', registration.active?.state);
      
    } else {
      console.log('❌ SW NO está controlando la página - ESTE PODRÍA SER EL PROBLEMA');
      console.log('💡 Posibles causas:');
      console.log('   - SW no está en la raíz del dominio');
      console.log('   - SW no se está descargando correctamente');
      console.log('   - Hay errores en el SW que previenen la activación');
    }

    // Verificar cache
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        console.log('🗂️ Caches disponibles:', cacheNames);
      });
    }
  } else {
    console.log('❌ Service Workers no soportados');
  }
};

// ---------------------
// VERIFICACIÓN ADICIONAL DESPUÉS DE CARGA COMPLETA
// ---------------------
window.addEventListener('load', () => {
  // Verificación inicial
  setTimeout(checkNetlifySW, 1000);
  
  // Verificación adicional por si tarda más
  setTimeout(checkNetlifySW, 5000);
});

// ---------------------
// Render principal
// ---------------------
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);