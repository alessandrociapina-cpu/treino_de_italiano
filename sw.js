// Service worker: funciona offline guardando o app em cache.
// Ao alterar arquivos do app, aumente a versão para forçar a atualização.
const VERSION = 'parliamo-v15';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/style.css',
  './js/app.js',
  './js/ui.js',
  './js/quiz.js',
  './js/storage.js',
  './js/data/helpers.js',
  './js/data/curriculum.js',
  './js/data/capitolo1.js',
  './js/data/capitolo2.js',
  './js/data/capitolo3.js',
  './js/data/capitolo4.js',
  './js/data/capitolo5.js',
  './js/data/capitolo6.js',
  './js/data/capitolo7.js',
  './js/data/capitolo8.js',
  './js/data/capitolo9.js',
  './js/data/capitolo10.js',
  './js/data/capitolo11.js',
  './js/data/capitolo12.js',
  './js/data/capitolo13.js',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Fontes do Google: cache em tempo de execução (stale-while-revalidate).
  if (url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith(
      caches.open(`${VERSION}-fonts`).then(async (cache) => {
        const hit = await cache.match(request);
        const net = fetch(request).then((res) => { if (res.ok || res.type === 'opaque') cache.put(request, res.clone()); return res; }).catch(() => hit);
        return hit || net;
      }),
    );
    return;
  }

  if (url.origin !== location.origin) return;

  // App: rede primeiro (para receber atualizações), cache como reserva offline.
  e.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) caches.open(VERSION).then((c) => c.put(request, res.clone()));
        return res;
      })
      .catch(() => caches.match(request, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html'))),
  );
});
