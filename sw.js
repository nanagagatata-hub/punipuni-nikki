'use strict';
// アプリ本体をキャッシュし、オフラインでも起動できるようにする。
// ファイルを変更したら VERSION を必ず上げること（上げないと端末に古い版が残る）。
const VERSION = 'v1.0.0';
const CACHE = 'punipuni-' + VERSION;
const ASSETS = [
  './', './index.html', './css/style.css', './js/app.js', './js/data.js', './js/rules.js', './js/state.js', './js/art.js', './js/sound.js',
  './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('punipuni-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  // 同一オリジンのGETのみ扱う（外部通信はしない方針）
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req)));
});
