const CACHE = 'factupro-v1';
const FILES = [
  '/',
  '/factupro/',
  '/factupro/facturas.html',
  '/factupro/style.css',
  '/factupro/app.js',
  '/factupro/gastos.html',
  '/factupro/gastos.js',
  '/factupro/manifest.json',
  '/factupro/icon-192.png',
  '/factupro/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(response => response || fetch(e.request))
  );
});