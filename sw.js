// Chromara service worker: the shell installs for offline play; everything else
// is fetched from the network first and kept as a fallback copy. Bump the cache
// name whenever the shipped files change so old copies are dropped.
const CACHE = 'chromara-la-mancha-8';
const SHELL = ['./', './index.html', './manifest.webmanifest', './mobile.css', './chromara-cuaderno.ttf', './chromara-rotulo.ttf',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png',
  './data.js', './music.js', './music_cues.js', './music_fallback.js', './sfx_samples.js', './sfx.js', './audio.js', './font.js', './sprites.js', './world_art.js',
  './rinse.js', './field.js', './scene.js', './gui.js', './battle.js', './attacks.js', './combat.js', './battle_ui.js', './settings.js', './mobile.js', './chapter_art.js', './chapters.js', './game.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(fetch(e.request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return response;
  }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html'))));
});
