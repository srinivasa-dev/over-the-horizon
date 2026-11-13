/**
 * Over The Horizon - Progressive Web App Service Worker
 * Cache-First offline play support for static 3D assets, audio synthesis, and scripts.
 */

const CACHE_NAME = 'oth-v2.5.12';

const STATIC_ASSETS = [
  './',
  './index.html',
  './planets.html',
  './modes.html',
  './about.html',
  './styles/main.css',
  './manifest.json',
  './favicon.svg',
  './favicon.png',
  './favicon.ico',
  './apple-touch-icon.png',
  './libs/three.module.js',
  './libs/three/addons/OrbitControls.js',
  './src/js/app.js',
  './src/js/arcade_engine.js',
  './src/js/audio.js',
  './src/js/hud.js',
  './src/js/icons.js',
  './src/js/models.js',
  './src/js/physics.js',
  './src/js/planet.js',
  './src/js/postprocessing.js',
  './src/js/presence.js',
  './src/js/settings.js',
  './src/js/weather.js',
  './assets/og-cover.png',
  './assets/logo.png',
  './assets/previews/map_oakhaven.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Bypass WebSocket presence gateway and cross-origin external APIs
  if (url.protocol === 'ws:' || url.protocol === 'wss:' || event.request.method !== 'GET') {
    return;
  }

  // Network-First for presence checks; Cache-First for static game assets
  if (url.pathname.includes('/presence') || url.hostname.includes('workers.dev')) {
    event.respondWith(
      fetch(event.request).catch(() => new Response(JSON.stringify({ count: 1 }), {
        headers: { 'Content-Type': 'application/json' }
      }))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached version while fetching fresh in background (stale-while-revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Offline fallback to root index
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
