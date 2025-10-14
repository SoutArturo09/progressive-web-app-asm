// sw.js
/// <reference lib="webworker" />
import { openDB } from 'idb';

const DB_NAME = 'myPWA-db';
const STORE_NAME = 'tasks';
const CACHE_NAME = 'app-cache-v1';
const OFFLINE_URL = '/offline.html';

// ---------------------
// 1️⃣ Crear o abrir la base de datos IndexedDB
// ---------------------
async function openDatabase() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    },
  });
}

// ---------------------
// 2️⃣ Instalación: cachea archivos básicos
// ---------------------
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  
  const CACHE_FILES = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico',
    OFFLINE_URL,
    '/icons/icon-192.png',
    '/icons/icon-512.png',
  ];

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(CACHE_FILES)
    )
  );
});


// ---------------------
// 3️⃣ Activación
// ---------------------
self.addEventListener('activate', (event) => {
  console.log('[SW] Activado y listo para controlar la app.');
  event.waitUntil(self.clients.claim());
});

// ---------------------
// 4️⃣ Interceptar requests (modo offline)
// ---------------------
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return (
        cachedResponse ||
        fetch(event.request).catch(() => caches.match(OFFLINE_URL))
      );
    })
  );
});

// ---------------------
// 5️⃣ Background Sync: sincronizar tareas pendientes
// ---------------------
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    console.log('[SW] Sincronizando tareas...');
    event.waitUntil(syncTasks());
  }
});

// ---------------------
// 🔹 Función que envía al servidor las tareas no sincronizadas
// ---------------------
async function syncTasks() {
  const db = await openDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const allTasks = await store.getAll();

  const pending = allTasks.filter((t) => !t.synced);
  if (pending.length === 0) {
    console.log('[SW] No hay tareas pendientes.');
    return;
  }

  for (const task of pending) {
    try {
      console.log('[SW] Intentando subir:', task);
      const res = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(task),
      });

      if (res.ok) {
        task.synced = true;
        await store.put(task);
        console.log('[SW] ✅ Tarea sincronizada:', task.text);
        // opcional: notifica al client
        const clientsList = await self.clients.matchAll({ includeUncontrolled: true });
        clientsList.forEach(c => c.postMessage({ type: 'task-synced', id: task.id }));
      } else {
        const body = await res.text().catch(()=> '');
        console.warn('[SW] Server returned not ok:', res.status, body);
        // No marcar como synced; se reintentará en futuro sync
      }
    } catch (err) {
      console.error('[SW] ❌ Error al sincronizar tarea:', err);
      // no marcar como synced para reintentar luego
    }
  }
  await tx.done;
}

