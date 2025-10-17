// public/sw.js - VERSIÓN MEJORADA PARA NETLIFY
console.log('🎯 SERVICE WORKER CARGADO - Con todas las funcionalidades');

const CACHE_NAME = 'app-cache-v1';
const IS_PRODUCTION = self.location.hostname.includes('netlify.app');

// ---------------------
// 1️⃣ Instalación MEJORADA para producción
// ---------------------
self.addEventListener('install', (event) => {
  console.log('📥 SW instalándose...', IS_PRODUCTION ? 'PRODUCCIÓN' : 'DESARROLLO');
  
  // Archivos críticos para cache
  const CACHE_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
  ];

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('🗂️ Cache abierto, agregando archivos...');
        return Promise.allSettled(
          CACHE_FILES.map(url => cache.add(url).catch(err => {
            console.warn(`⚠️ No cachear ${url}:`, err.message);
          }))
        );
      })
      .then(() => {
        console.log('✅ Instalación completada - Forzando activación');
        return self.skipWaiting(); // ⚠️ CRÍTICO: Activar inmediatamente
      })
  );
});

// ---------------------
// 2️⃣ Activación MEJORADA - LIMPIAR WORKBOX
// ---------------------
self.addEventListener('activate', (event) => {
  console.log('🚀 SW activado - Limpiando caches antiguos...');
  
  event.waitUntil(
    Promise.all([
      // ⚠️ CRÍTICO: Claim clients inmediatamente
      self.clients.claim().then(() => {
        console.log('✅ Clients claim exitoso');
      }),
      
      // ⚠️ LIMPIAR TODOS los caches que no sean el nuestro
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // ELIMINAR workbox y cualquier cache que no sea el nuestro
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ ELIMINANDO CACHE:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ]).then(() => {
      console.log('✅ Activación completada - Cache limpio');
      
      // ⚠️ FORZAR que todos los clients usen este SW
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({ type: 'SW_ACTIVATED', cache: CACHE_NAME });
        });
      });
    })
  );
});

// ---------------------
// 3️⃣ Fetch - MEJORADO
// ---------------------
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // No cachear APIs
  if (url.pathname.includes('/api/')) {
    return;
  }
  
  // Solo cachear GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Devolver cache si existe
        if (cachedResponse) {
          return cachedResponse;
        }

        // Hacer fetch y cachear
        return fetch(event.request)
          .then(response => {
            // Verificar response válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Cachear la respuesta
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.log('🌐 Offline - No fetch:', event.request.url);
            // Podrías devolver una página offline aquí
          });
      })
  );
});

// --------------------- 
// 4️⃣ Push Notifications - MÁS ROBUSTO
// ---------------------
self.addEventListener('push', (event) => {
  console.log('🔔🔔🔔 PUSH RECIBIDO - Origen:', self.location.origin);
  
  if (!event.data) {
    console.log('❌ Push sin datos');
    return;
  }

  let data;
  try {
    data = event.data.json();
    console.log('📦 Datos push:', data);
  } catch (err) {
    console.error('❌ Error parseando push:', err);
    data = {
      title: 'Notificación',
      body: 'Nueva actualización disponible'
    };
  }

  const options = {
    body: data.body || 'Tienes una nueva actualización',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    tag: 'pwa-notification',
    requireInteraction: true, // ⚠️ IMPORTANTE: Mantener visible
    actions: [
      {
        action: 'open',
        title: 'Abrir app'
      }
    ],
    data: {
      url: data.url || self.location.origin,
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notificación', options)
      .then(() => {
        console.log('✅✅✅ NOTIFICACIÓN MOSTRADA - Netlify');
        // Confirmar al servidor que se mostró (opcional)
        return fetch(`${self.location.origin}/api/notification-displayed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: data.title, displayed: true })
        }).catch(err => console.log('⚠️ No se pudo confirmar notificación'));
      })
      .catch(err => {
        console.error('❌ ERROR mostrando notificación:', err);
        // Reintentar con notificación más simple
        return self.registration.showNotification('Notificación', {
          body: 'Tienes una nueva actualización',
          icon: '/icons/icon-192.png'
        });
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notificación clickeada - Netlify');
  event.notification.close();
  
  event.waitUntil(
    self.clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    })
      .then(clients => {
        // Buscar cualquier client abierto
        const client = clients.find(c => 
          c.url.startsWith(self.location.origin)
        );
        
        if (client) {
          console.log('✅ Client encontrado, enfocando...');
          return client.focus();
        } else {
          console.log('🔄 Abriendo nueva ventana...');
          return self.clients.openWindow(self.location.origin);
        }
      })
  );
});

// ---------------------
// 5️⃣ Background Sync - MEJORADO
// ---------------------
self.addEventListener('sync', (event) => {
  console.log('🔄 SYNC EVENT:', event.tag);
  
  if (event.tag === 'sync-tasks') {
    event.waitUntil(
      syncPendingTasks()
        .then(() => console.log('✅ Sync completado'))
        .catch(err => console.error('❌ Error en sync:', err))
    );
  }
});

async function syncPendingTasks() {
  console.log('🔄 Sincronizando tareas pendientes...');
  
  try {
    // Aquí va tu lógica de sincronización
    const response = await fetch('/api/sync-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.ok) {
      console.log('✅ Tareas sincronizadas exitosamente');
    } else {
      throw new Error('Error en sync');
    }
  } catch (error) {
    console.error('❌ Error sincronizando tareas:', error);
    throw error;
  }
}

// ---------------------
// 6️⃣ Manejo de mensajes
// ---------------------
self.addEventListener('message', (event) => {
  console.log('📨 Mensaje del cliente:', event.data);
  
  if (event.data && event.data.type === 'hello') {
    event.ports[0]?.postMessage({ 
      status: 'ok', 
      message: 'SW funcionando en Netlify!',
      cache: CACHE_NAME
    });
  }
  
  if (event.data && event.data.type === 'CHECK_SW') {
    event.ports[0]?.postMessage({
      status: 'active',
      controlling: !!self.clients && self.clients instanceof Clients,
      origin: self.location.origin
    });
  }
});