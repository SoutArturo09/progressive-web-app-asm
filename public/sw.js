// public/sw.js - VERSIÓN CORREGIDA
console.log('🎯 SERVICE WORKER CARGADO - Con todas las funcionalidades');

const DB_NAME = 'myPWA-db';
const STORE_NAME = 'tasks';
const CACHE_NAME = 'app-cache-v1';

// ---------------------
// 1️⃣ Instalación MEJORADA: cachea archivos con manejo de errores
// ---------------------
self.addEventListener('install', (event) => {
  console.log('📥 SW instalándose...');
  
  // Solo archivos que definitivamente existen
  const CACHE_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
  ];

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🗂️ Cache abierto, agregando archivos...');
        // Agregar archivos uno por uno con manejo de errores
        return Promise.all(
          CACHE_FILES.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`⚠️ No se pudo cachear ${url}:`, err.message);
              return null; // Continuar aunque falle uno
            });
          })
        );
      })
      .then(() => {
        console.log('✅ Instalación completada (errores ignorados)');
        return self.skipWaiting(); // ⚠️ Importante: activar inmediatamente
      })
      .catch(err => {
        console.error('❌ Error en instalación:', err);
        return self.skipWaiting(); // ⚠️ Skipear incluso si hay error
      })
  );
});

// ---------------------
// 2️⃣ Activación MEJORADA
// ---------------------
self.addEventListener('activate', (event) => {
  console.log('🚀 SW activado y tomando control...');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Limpiar caches antiguos si los hay
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
});

// ---------------------
// 3️⃣ Fetch MEJORADO
// ---------------------
self.addEventListener('fetch', (event) => {
  // No cachear llamadas a la API
  if (event.request.url.includes('/api/')) {
    return;
  }
  
  // Solo cachear requests GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Si está en cache, devolverlo
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // Si no está en cache, hacer fetch y cachear
        return fetch(event.request)
          .then(response => {
            // Solo cachear responses válidas
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clonar la response para cachear
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.log('🌐 Offline - No se pudo fetch:', event.request.url);
            // Podrías devolver una página offline genérica aquí
          });
      })
  );
});

// ---------------------
// 4️⃣ Background Sync - SIMPLIFICADO
// ---------------------
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    console.log('[SW] Sincronizando tareas...');
    event.waitUntil(
      syncTasks().catch(err => {
        console.error('[SW] Error en sync:', err);
      })
    );
  }
});

async function syncTasks() {
  console.log('[SW] ⏳ Iniciando sincronización...');
  // Por ahora solo log, luego implementas la lógica completa
  return Promise.resolve();
}

// ---------------------
// 5️⃣ Push Notifications - FUNCIONAL (ya funciona)
// ---------------------
self.addEventListener('push', (event) => {
  console.log('🔔🔔🔔 EVENTO PUSH RECIBIDO', event);
  
  if (!event.data) {
    console.log('❌ Evento push sin datos');
    return;
  }

  let data;
  try {
    data = event.data.json();
    console.log('📦 Datos parseados:', data);
  } catch (err) {
    console.error('❌ Error parseando datos:', err);
    data = {
      title: 'Notificación',
      body: 'Tienes una nueva actualización'
    };
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    tag: 'pwa-notification',
    data: {
      url: self.location.origin
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
      .then(() => console.log('✅✅✅ NOTIFICACIÓN MOSTRADA EXITOSAMENTE'))
      .catch(err => console.error('❌ Error mostrando notificación:', err))
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notificación clickeada');
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ type: 'window' })
      .then(clients => {
        const client = clients.find(c => c.url === self.location.origin);
        if (client) return client.focus();
        return self.clients.openWindow(self.location.origin);
      })
  );
});

// ---------------------
// 6️⃣ Manejo de mensajes
// ---------------------
self.addEventListener('message', (event) => {
  console.log('📨 Mensaje recibido del cliente:', event.data);
  
  if (event.data && event.data.type === 'hello') {
    event.ports[0]?.postMessage({ 
      status: 'ok', 
      message: '¡Service Worker funcionando perfectamente!' 
    });
  }
});