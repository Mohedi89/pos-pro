// ============================================================
//  POS Pro — Service Worker
//  Cache tout le contenu pour fonctionner HORS LIGNE
// ============================================================

var CACHE_NAME = 'pos-pro-v1';
var OFFLINE_FILES = [
  './',
  './index.html',
  './manifest.json',
  'https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// Installation — mise en cache des fichiers essentiels
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      console.log('SW: Mise en cache des fichiers...');
      return cache.addAll(OFFLINE_FILES).catch(function(err) {
        console.log('SW: Certains fichiers non cachés (normal):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation — nettoyage des anciens caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

// Interception des requêtes — Cache First strategy
self.addEventListener('fetch', function(event) {
  // Ignorer les requêtes non-GET
  if(event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if(cached) {
        // Retourner le cache ET mettre à jour en arrière-plan
        var fetchPromise = fetch(event.request).then(function(response) {
          if(response && response.status === 200) {
            var clone = response.clone();
            caches.open(CACHE_NAME).then(function(cache) {
              cache.put(event.request, clone);
            });
          }
          return response;
        }).catch(function() { return cached; });
        return cached;
      }
      // Pas en cache — fetch réseau
      return fetch(event.request).then(function(response) {
        if(!response || response.status !== 200) return response;
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(event.request, clone);
        });
        return response;
      }).catch(function() {
        // Offline et pas en cache
        return new Response(
          '<h2 style="font-family:Arial;color:#f87171;padding:20px">Hors ligne — ressource non disponible</h2>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      });
    })
  );
});

// Message depuis la page principale
self.addEventListener('message', function(event) {
  if(event.data === 'skipWaiting') self.skipWaiting();
});
