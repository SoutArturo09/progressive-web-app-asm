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
                forceSWControl();
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
// FORZAR CONTROL DEL SW
// ---------------------
const forceSWControl = async () => {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    console.log('✅ SW ya está controlando la página');
    return;
  }

  console.log('🔄 Forzando control del SW...');
  
  // Esperar a que el SW esté listo
  const registration = await navigator.serviceWorker.ready;
  
  // Forzar claim de clients
  if (registration.active) {
    console.log('🎯 Activando control inmediato...');
    
    // Enviar mensaje al SW para que se active
    registration.active.postMessage({ type: 'CLAIM_CLIENTS' });
    
    // Recargar para que tome control (solo si es necesario)
    if (!navigator.serviceWorker.controller) {
      console.log('🔄 Recargando para activar SW...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  }
};

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
      console.log('📦 SW Content-Type:', swResponse.headers.get('content-type'));
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
        waiting: reg.waiting?.state,
        installing: reg.installing?.state,
        scriptURL: reg.active?.scriptURL || reg.installing?.scriptURL
      });
    });

    // Verificar si está controlando
    if (navigator.serviceWorker.controller) {
      console.log('✅ SW está CONTROlando la página');
      console.log('🔧 SW Controller state:', navigator.serviceWorker.controller.state);
      console.log('🔗 SW Controller scriptURL:', navigator.serviceWorker.controller.scriptURL);
      
      // Verificar que es NUESTRO SW y no el de workbox
      const isOurSW = navigator.serviceWorker.controller.scriptURL.includes('/sw.js');
      console.log('🎯 ¿Es nuestro SW?', isOurSW);
      
    } else {
      console.log('❌ SW NO está controlando la página');
      console.log('💡 Solución: Recargar la página o forzar claim');
    }

    // Verificar cache
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      console.log('🗂️ Caches disponibles:', cacheNames);
      
      // Verificar si nuestro cache existe
      const ourCacheExists = cacheNames.includes('app-cache-v1');
      console.log('🎯 ¿Nuestro cache existe?', ourCacheExists);
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

  // Intentar forzar el control del SW
  setTimeout(forceSWControl, 2000);
});

// ---------------------
// Render principal
// ---------------------
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);