const CACHE_NAME = "my-pwa-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/manifest.json",
  "/src/main.jsx",
  "/src/App.jsx",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Instalación → cachea el App Shell y los assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  console.log("Service Worker: Instalado");
});

// Activación → limpia cachés viejas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  console.log("Service Worker: Activado");
});

// Fetch → Cache-first
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
