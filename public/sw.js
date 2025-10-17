// public/sw.js - VERSIÓN LIMPIA PARA NUEVO NETLIFY
console.log('🎯 SW CARGADO - Nuevo Netlify');

const CACHE_NAME = 'pwa-cache-v1';

// Instalación
self.addEventListener('install', (event) => {
  console.log('📥 SW instalándose...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(['/', '/index.html', '/manifest.json']))
      .then(() => self.skipWaiting())
  );
});

// Activación
self.addEventListener('activate', (event) => {
  console.log('🚀 SW activado - Tomando control');
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then(keys => 
        Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
      )
    ])
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  console.log('🔔 PUSH RECIBIDO');
  
  if (!event.data) return;
  
  const data = event.data.json();
  console.log('📦 Datos:', data);

  event.waitUntil(
    self.registration.showNotification(data.title || 'Notificación', {
      body: data.body || 'Nueva actualización',
      icon: '/icons/icon-192.png',
      tag: 'pwa-notification'
    }).then(() => console.log('✅ Notificación mostrada'))
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({type: 'window'})
      .then(clients => {
        const client = clients.find(c => c.url === self.location.origin);
        return client ? client.focus() : self.clients.openWindow(self.location.origin);
      })
  );
});

// Fetch
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return;
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});