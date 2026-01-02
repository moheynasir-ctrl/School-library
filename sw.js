const CACHE_NAME = 'nahda-cache-v1';
const ASSETS = ['/', '/index.html', '/styles.css', '/app.js', '/manifest.json', '/logo-192.svg'];
self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE_NAME).then(c=>c.addAll(ASSETS)));
});
self.addEventListener('fetch', e=>{
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
